const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

//  Configurar Multer (para subir audios)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { radio, ciudad } = req.body;
    const fecha = new Date().toISOString().split("T")[0];
    const dir = path.join(__dirname, "public", "audios", radio, ciudad, fecha);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const hora = new Date().toISOString().replace(/[:.]/g, "-");
    cb(null, `${hora}-${file.originalname}`);
  }
});

const upload = multer({ storage });

//  Endpoint para subir archivos
app.post("/upload", upload.single("audio"), (req, res) => {
  res.json({ message: "Archivo recibido", file: req.file });
});

//  Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
