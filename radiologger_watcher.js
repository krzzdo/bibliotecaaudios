import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

// --- CONFIGURACIÓN ---

// 1. La "Carpeta Madre" donde están todas las subcarpetas de las radios
const CARPETA_MADRE = 'C:/GRABACIONES'; 

// 2. URL de tu servidor (Local o Contabo)
const SERVIDOR_URL = 'http://localhost:3000/upload'; 

console.log(`👀 Monitoreando radios en: ${CARPETA_MADRE}`);

// Configurar Chokidar para mirar dentro de todas las subcarpetas
const watcher = chokidar.watch(CARPETA_MADRE, {
  persistent: true,
  ignoreInitial: true, 
  depth: 2, // Mira dentro de las subcarpetas (Nivel 1: Radio, Nivel 2: Archivo)
  awaitWriteFinish: {
    stabilityThreshold: 2000, 
    pollInterval: 100
  }
});

watcher.on('add', async (filePath) => {
  // 1. Filtro de seguridad: Solo audios
  if (!filePath.match(/\.(mp3|aac|wav|ogg|m4a)$/i)) return;

  console.log(`\n🎙️ Nuevo archivo detectado: ${path.basename(filePath)}`);
  
  await procesarYSubir(filePath);
});

async function procesarYSubir(filePath) {
  try {
    const fileName = path.basename(filePath);
    
    // --- PASO A: IDENTIFICAR LA RADIO ---
    // Obtenemos el nombre de la carpeta que contiene el archivo
    // Ej: C:/GRABACIONES_MASTER/RadioDisney/20251022_1400.mp3  -> "RadioDisney"
    const radioName = path.basename(path.dirname(filePath));

    // Si por error el archivo está suelto en la raíz, lo ignoramos o ponemos "General"
    if (path.resolve(path.dirname(filePath)) === path.resolve(CARPETA_MADRE)) {
      console.warn("⚠️ Archivo suelto en la raíz. Se recomienda usar subcarpetas por radio.");
      return; 
    }

    // --- PASO B: IDENTIFICAR FECHA Y HORA (Desde el nombre del archivo) ---
    // RadioLogger suele guardar así: YYYYMMDD_HHMM.mp3 (Ej: 20231027_1400.mp3)
    // Vamos a intentar leer eso.
    let fechaStr, horaStart, horaEnd;
    
    // Regex para buscar patrón: 4 digitos(año) 2(mes) 2(dia) _ 2(hora) 2(min)
    const match = fileName.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);

    if (match) {
        // Tenemos datos exactos del nombre del archivo
        const [_, year, month, day, hour, minute] = match;
        fechaStr = `${year}-${month}-${day}`; // Formato YYYY-MM-DD
        horaStart = `${hour}:${minute}`;      // Formato HH:MM
        
        // Calculamos hora fin (asumiendo grabaciones de 1 hora)
        // Si tus grabaciones son de otro largo, ajusta esto.
        let endHour = parseInt(hour) + 1; 
        let endHStr = endHour < 10 ? `0${endHour}` : `${endHour}`;
        if (endHour === 24) endHStr = "00";
        horaEnd = `${endHStr}:${minute}`;

        console.log(`   📅 Fecha detectada: ${fechaStr}`);
        console.log(`   ⏰ Horario: ${horaStart} - ${horaEnd}`);
    } else {
        // Si el nombre es raro (ej: "prueba.mp3"), usamos la fecha actual del sistema
        console.log("   ⚠️ No se detectó fecha en el nombre. Usando hora actual.");
        const now = new Date();
        fechaStr = now.toISOString().split('T')[0];
        horaStart = now.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
        horaEnd = "--:--";
    }

    // --- PASO C: PREPARAR ENVÍO ---
    const form = new FormData();
    form.append('audio', fs.createReadStream(filePath));
    form.append('radio', radioName); // ¡Aquí va el nombre de la carpeta!
    form.append('fecha', fechaStr);
    form.append('start', horaStart);
    form.append('end', horaEnd);
    form.append('name', fileName);

    // --- PASO D: ENVIAR AL SERVIDOR ---
    console.log(`   📤 Subiendo a la lista de: ${radioName}...`);
    
    const response = await axios.post(SERVIDOR_URL, form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.data.ok) {
      console.log(`   ✅ SUBIDA EXITOSA.`);
    } else {
      console.error(`   ⚠️ ERROR SERVIDOR:`, response.data);
    }

  } catch (error) {
    console.error(`   ❌ ERROR CONEXIÓN: ${error.message}`);
  }
}
