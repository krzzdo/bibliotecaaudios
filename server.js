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
// Lee la lista de audios
function readDB() {
  if (!fs.existsSync(DB_FILE)) return [];
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data || "[]");
}
// Guarda un nuevo audio en la lista
function saveToDB(entry) {
  const current = readDB();
  current.push(entry);
  fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2));
}

// ---------------- LOGIN ----------------
const usuarios = {
  "cliente1": { pass: "1234" },
  "cliente2": { pass: "abcd" }
};

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));

app.post("/login", (req, res) => {
  const { user, pass } = req.body;
  if (usuarios[user] && usuarios[user].pass === pass) res.json({ ok: true });
  else res.json({ ok: false });
});

app.get("/panel", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ---------------- API DE AUDIOS ----------------

// 1. Configuración de Multer (Donde se guardan los archivos físicos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Si viene de RadioLogger, intentar sacar info del body, si no, genérico
    const radio = req.body.radio || "RadioGenerica";
    const dir = path.join(__dirname, "public", "audios", radio);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Nombre único para evitar conflictos
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// 2. Endpoint para SUBIR (Usado por el index.html y por el script automático)
app.post("/upload", upload.single("audio"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No file" });

  // Crear el objeto de metadatos
  const newAudio = {
    id: Date.now().toString(),
    name: req.body.name || req.file.originalname, // Nombre original
    radio: req.body.radio || "Radio 1",
    date: req.body.fecha || new Date().toISOString().split('T')[0], // YYYY-MM-DD
    start: req.body.start || "--:--",
    end: req.body.end || "--:--",
    // Ruta web para que el HTML lo encuentre: /audios/RadioX/archivo.mp3
    url: `/audios/${req.body.radio || "RadioGenerica"}/${req.file.filename}`
  };

  // Guardar en db.json
  saveToDB(newAudio);

  res.json({ ok: true, data: newAudio });
});

// 3. Endpoint para OBTENER la lista (Esto lo pide el main.js al cargar)
app.get("/api/audios", (req, res) => {
  const audios = readDB();
  res.json(audios);
});

// ESTE VA AL FINAL (Servir archivos estáticos como css, js y los audios subidos)
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(` Servidor listo en http://localhost:${PORT}`);
});
