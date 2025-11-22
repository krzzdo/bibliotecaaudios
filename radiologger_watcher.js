const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");

const RADIO = "RadioEjemplo";
const CIUDAD = "Santiago";
const WATCH_DIR = "C:\\RadioLogger\\Grabaciones"; // carpeta que usa RadioLogger
const SERVER_URL = "http://localhost:3000/upload";

console.log(`Monitoreando ${WATCH_DIR} para nuevas grabaciones...`);

fs.watch(WATCH_DIR, async (eventType, filename) => {
  if (eventType === "rename" && filename.endsWith(".mp3")) {
    const filePath = path.join(WATCH_DIR, filename);

    // Esperar a que termine de escribirse el archivo
    setTimeout(async () => {
      if (fs.existsSync(filePath)) {
        try {
          console.log(`Subiendo ${filename} al servidor...`);
          const form = new FormData();
          form.append("audio", fs.createReadStream(filePath));
          form.append("radio", RADIO);
          form.append("ciudad", CIUDAD);

          const res = await fetch(SERVER_URL, { method: "POST", body: form });
          const data = await res.json();

          console.log("Subida completada:", data.file.filename);
        } catch (err) {
          console.error("Error al subir:", err.message);
        }
      }
    }, 5000); // espera 5 segundos por seguridad
  }
});

