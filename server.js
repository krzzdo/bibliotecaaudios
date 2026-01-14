import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, "db.json"); // Archivo "Base de Datos"

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Helpers para la "Base de Datos" (db.json) ---
function readDB() {
  if (!fs.existsSync(DB_FILE)) return [];
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data || "[]");
}

function saveToDB(entry) {
  const current = readDB();
  current.push(entry);
  fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2));
}

// ---------------- LOGIN ----------------
// Aquí están tus usuarios reales
const usuarios = {
  "cliente1": { pass: "1234" },
  "cliente2": { pass: "abcd" },
  "MiCasino": { pass: "Mi26Casinologger."},
  "ClienteDemo": { pass: "radio2026" } // Tu perfil de pruebas
};

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));

app.post("/login", (req, res) => {
  const { user, pass } = req.body;
  if (usuarios[user] && usuarios[user].pass === pass) res.json({ ok: true });
  else res.json({ ok: false });
});

app.get("/panel", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ---------------- API DE AUDIOS ----------------

// 1. Configuración de Multer (Almacenamiento físico)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // IMPORTANTE: Obtenemos el nombre de la radio que envía el Watcher
    // Si por alguna razón llega vacío, lo mandamos a "SinClasificar" en lugar de RadioGenerica
    let radioName = req.body.radio ? req.body.radio.trim() : "SinClasificar";
    
    // Ruta: public/audios/Nombre De La Radio/
    const dir = path.join(__dirname, "public", "audios", radioName);
    
    // Crear la carpeta si no existe (recursive: true permite crear carpetas anidadas)
    fs.mkdirSync(dir, { recursive: true });
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Nombre único: MarcaDeTiempo-NombreOriginal (Reemplazamos espacios en el archivo por guiones bajos)
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// 2. Endpoint para SUBIR (Recibe del Watcher)
app.post("/upload", upload.single("audio"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No se recibió archivo de audio" });

  // Recuperamos el nombre de la radio una vez más para asegurar consistencia
  const radioFinal = req.body.radio ? req.body.radio.trim() : "SinClasificar";

  console.log(`📥 Recibiendo audio para: ${radioFinal} | Archivo: ${req.file.filename}`);

  // ... dentro de app.post("/upload", ...)

  // Crear el objeto de metadatos para db.json
  const newAudio = {
    id: Date.now().toString(),
    name: req.body.name || req.file.originalname, 
    radio: radioFinal,
    date: req.body.fecha || new Date().toISOString().split('T')[0], 
    start: req.body.start || "--:--",
    end: req.body.end || "--:--",

    //encodeURIComponent para convertir espacios en %20
    url: `/audios/${encodeURIComponent(radioFinal)}/${encodeURIComponent(req.file.filename)}`
  };

  // Guardar en la "base de datos"
  saveToDB(newAudio);
// ...

  res.json({ ok: true, data: newAudio });
});

// 3. Endpoint para OBTENER la lista (Usado por el Frontend)
app.get("/api/audios", (req, res) => {
  const audios = readDB();
  res.json(audios);
});

// 4. Servir archivos estáticos (Importante para que se escuchen los audios)
app.use(express.static("public"));

// INICIO
app.listen(PORT, () => {
  console.log(`🚀 Servidor MediaLogger activo en http://localhost:${PORT}`);
  console.log(`   Esperando conexiones de 33 Radios...`);
});
