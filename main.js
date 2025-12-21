// --- Obtener usuario ---
const params = new URLSearchParams(window.location.search);
const user = params.get("user");
if (!user) window.location.href = "/";
document.title = `Biblioteca de audios - ${user}`;

/* ---------- Helpers ---------- */
function formatDateDisplay(isoDate){
  if(!isoDate) return '--';
  try {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString();
  } catch(e){ return isoDate; }
}

/* ---------- UI Referencias ---------- */
const tabs = document.querySelectorAll('.tab');
const cats = document.querySelectorAll('[data-cat]');
const activeNameSpan = document.getElementById('active-name');
const fileInput = document.getElementById('file-input-u');
const prepareMetaBtn = document.getElementById('prepare-meta-btn');
const metaForm = document.getElementById('meta-form');
const saveMeta = document.getElementById('save-meta');
const cancelMeta = document.getElementById('cancel-meta');
// Inputs del formulario
const metaFecha = document.getElementById('meta-fecha');
const metaStart = document.getElementById('meta-start');
const metaEnd = document.getElementById('meta-end');
const metaRadio = document.getElementById('meta-radio');

/* ---------- Estado Global ---------- */
let audios = []; // Se llena desde el servidor
let filterFecha = null;

/* ---------- 1. Cargar datos del Servidor ---------- */
async function loadAudiosFromServer() {
  try {
    const res = await fetch('/api/audios'); // Pide la lista al server
    const data = await res.json();
    audios = data; // Guarda en memoria
    renderAll();   // Dibuja en pantalla
  } catch (error) {
    console.error("Error cargando audios:", error);
  }
}

/* ---------- 2. Renderizado (Mostrar audios) ---------- */
function renderAll(){
  // Limpiar listas
  const lists = {
    Radio1: document.getElementById('list-Radio1'),
    Radio2: document.getElementById('list-Radio2'),
    Radio3: document.getElementById('list-Radio3'),
    Radio4: document.getElementById('list-Radio4'),
    Radio5: document.getElementById('list-Radio5'),
  };
  Object.values(lists).forEach(l=> l && (l.innerHTML = ''));

  // Filtrar
  const filtered = audios.filter(a => {
    if(!filterFecha) return true;
    return a.date === filterFecha;
  });

  // Agrupar por Radio
  const byRadio = {};
  for(const a of filtered){
    const radioKey = a.radio.replace(/\s+/g,''); // "Radio 1" -> "Radio1"
    if(!byRadio[radioKey]) byRadio[radioKey]=[];
    byRadio[radioKey].push(a);
  }

  // Crear HTML
  for(const key in byRadio){
    // Ordenar por hora de inicio
    byRadio[key].sort((x,y) => (x.start || '').localeCompare(y.start || ''));
    
    const listEl = lists[key];
    if(!listEl) continue;

    for(const item of byRadio[key]){
      const node = document.createElement('div');
      node.className = 'audio-item';
      node.innerHTML = `
        <div>
          <strong>${item.start} / ${item.end}</strong>
          <div class="small">${item.radio}</div>
          <div class="small">Fecha: ${formatDateDisplay(item.date)}</div>
          <div class="small">${item.name}</div>
        </div>
        <audio controls src="${item.url}" preload="none"></audio>
      `;
      listEl.appendChild(node);
    }
  }
}

/* ---------- 3. Subir Audio (Manual) ---------- */
saveMeta.addEventListener('click', async () => {
  const files = fileInput.files;
  if(!files.length) return;

  const fecha = metaFecha.value;
  const start = metaStart.value;
  const end = metaEnd.value;
  const radio = metaRadio.value;

  if(!fecha) { alert('Falta la fecha'); return; }

  // Subir archivo por archivo
  for(const file of files){
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('radio', radio);
    formData.append('fecha', fecha);
    formData.append('start', start);
    formData.append('end', end);
    formData.append('name', file.name);

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if(result.ok){
        console.log("Subido OK");
      }
    } catch(err){
      console.error(err);
      alert("Error subiendo archivo");
    }
  }

  // Reset y recargar
  metaForm.style.display = 'none';
  fileInput.value = '';
  await loadAudiosFromServer(); // Recargar lista para ver el nuevo
});

/* ---------- Tabs & UI Logic (Igual que antes) ---------- */
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  const target = t.dataset.target;
  cats.forEach(c => c.id === target ? c.removeAttribute('hidden') : c.setAttribute('hidden',''));
  activeNameSpan.textContent = t.textContent;
  if(metaRadio) metaRadio.value = t.textContent;
}));

prepareMetaBtn.addEventListener('click', () => {
  if(!fileInput.files.length) return alert('Selecciona archivos primero');
  metaFecha.value = new Date().toISOString().split('T')[0];
  metaForm.style.display = 'flex';
});
cancelMeta.addEventListener('click', () => metaForm.style.display = 'none');

// Filtro de Fecha
const inputFecha = document.getElementById('input-fecha');
const btnGuardarFecha = document.getElementById('btn-guardar-fecha');
const btnClearFecha = document.getElementById('btn-clear-fecha');
const fechaActivaSpan = document.getElementById('fecha-activa');

btnGuardarFecha.addEventListener('click', () => {
  filterFecha = inputFecha.value || null;
  fechaActivaSpan.textContent = filterFecha ? formatDateDisplay(filterFecha) : '--';
  renderAll();
});
btnClearFecha.addEventListener('click', () => {
  inputFecha.value = '';
  filterFecha = null;
  fechaActivaSpan.textContent = '--';
  renderAll();
});

/* ---------- Init ---------- */
(function init(){
    loadAudiosFromServer();
})();
