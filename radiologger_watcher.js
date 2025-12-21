import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

// --- CONFIGURACIÓN ---
// 1. ¿Dónde guarda los audios RadioLogger?
const CARPETA_A_VIGILAR = 'C:/RadioLogger/Audio'; 

// 2. ¿A dónde enviarlos? (Si estás probando local pon localhost, si ya subiste la web pon tu dominio)
const SERVIDOR_URL = 'http://localhost:3000/upload'; 

console.log(`👀 Vigilante iniciado. Observando: ${CARPETA_A_VIGILAR}`);

// Configurar el vigilante
const watcher = chokidar.watch(CARPETA_A_VIGILAR, {
  persistent: true,
  ignoreInitial: true, // No subir lo que ya existía antes de prender el script
  depth: 2, // Qué tan profundo buscar en subcarpetas
  awaitWriteFinish: {
    stabilityThreshold: 2000, // Esperar 2 seg a que el archivo deje de crecer (RadioLogger termine)
    pollInterval: 100
  }
});

watcher.on('add', async (filePath) => {
  // Ignorar archivos que no sean de audio
  if (!filePath.match(/\.(mp3|aac|wav)$/i)) return;

  console.log(`🎙️ Nuevo archivo detectado: ${path.basename(filePath)}`);
  
  await subirAudio(filePath);
});

async function subirAudio(filePath) {
  try {
    const fileName = path.basename(filePath);
    
    // --- INTELIGENCIA DE NOMBRES ---
    // Intentamos adivinar la radio según la carpeta donde cayó el archivo
    // Ej: C:/RadioLogger/Audio/RadioActiva/20231027_1400.mp3
    // "RadioActiva" sería la carpeta padre.
    const parentFolder = path.basename(path.dirname(filePath));
    const radioName = parentFolder === 'Audio' ? 'Radio General' : parentFolder;

    // --- PREPARAR ENVÍO ---
    const form = new FormData();
    form.append('audio', fs.createReadStream(filePath));
    form.append('radio', radioName);
    
    // Aquí podrías parsear la hora del nombre del archivo si RadioLogger usa un formato fijo
    // Por ahora enviamos la fecha actual como respaldo
    form.append('fecha', new Date().toISOString().split('T')[0]); 
    form.append('start', new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'}));

    // --- ENVIAR AL SERVIDOR ---
    const response = await axios.post(SERVIDOR_URL, form, {
      headers: {
        ...form.getHeaders()
      }
    });

    if (response.data.ok) {
      console.log(`✅ [EXITO] ${fileName} subido correctamente a ${radioName}`);
    } else {
      console.error(`⚠️ [SERVER ERROR] ${fileName}:`, response.data);
    }

  } catch (error) {
    console.error(`❌ [ERROR CONEXIÓN] No se pudo subir ${path.basename(filePath)}`);
    console.error(`   Detalle: ${error.message}`);
  }
}
