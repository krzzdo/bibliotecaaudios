// main.js - VERSIÓN CORRECTA PARA DROPDOWN Y BARRA SUPERIOR

// --- 1. CONFIGURACIÓN DE USUARIO (Esto arregla el nombre arriba) ---
const params = new URLSearchParams(window.location.search);
const user = params.get("user");
const headerUsername = document.getElementById("header-username");

// Si hay usuario en la URL, lo ponemos en el título y en la barra
if (user) {
    document.title = `MediaLogger - ${user}`;
    if (headerUsername) headerUsername.textContent = user;
} else {
    // Si no hay usuario, redirigir al login (opcional)
    window.location.href = "/";
}

// --- 2. CONFIGURACIÓN DE ESTADO ---
let audios = []; 
let filterRadio = 'all'; 
let filterDate = null;   

// --- 3. REFERENCIAS DEL HTML (Elementos nuevos) ---
const feedContainer = document.getElementById('feed-container');
const dateInput = document.getElementById('filter-date');
const radioSelect = document.getElementById('radio-filter-select'); // El menú de las 33 radios

// Uploader manual
const uploaderArea = document.getElementById('uploader-area');
const toggleUploaderBtn = document.getElementById('toggle-uploader');
const fileInput = document.getElementById('file-input-u');
const saveManualBtn = document.getElementById('save-manual');

// --- 4. CARGAR DATOS DEL SERVIDOR ---
async function loadAudios() {
  try {
    const res = await fetch('/api/audios');
    audios = await res.json();
    renderFeed();
  } catch (e) { 
    console.error(e);
    if(feedContainer) feedContainer.innerHTML = '<p style="color:var(--muted)">No se pudo conectar al servidor.</p>';
  }
}

// --- 5. RENDERIZAR (DIBUJAR LA LISTA) ---
function renderFeed() {
  if(!feedContainer) return;
  feedContainer.innerHTML = '';

  // Filtrado
  let displayedAudios = audios.filter(item => {
    // A) Filtro de fecha
    if (filterDate && item.date !== filterDate) return false;
    
    // B) Filtro de radio (Usando el valor del SELECT)
    if (filterRadio !== 'all') {
      // Normalizamos para evitar errores de espacios (Radio 1 vs Radio1)
      const r1 = item.radio.replace(/\s+/g, '').toLowerCase().trim();
      const r2 = filterRadio.replace(/\s+/g, '').toLowerCase().trim();
      // Verificamos si coinciden (o si uno contiene al otro para ser más flexible)
      if (!r1.includes(r2) && !r2.includes(r1)) return false;
    }
    return true;
  });

  // Ordenar (Más recientes primero)
  displayedAudios.sort((a, b) => {
    const timeA = (a.date || '') + (a.start || '');
    const timeB = (b.date || '') + (b.start || '');
    return timeB.localeCompare(timeA);
  });

  // Mensaje si no hay nada
  if(displayedAudios.length === 0) {
    feedContainer.innerHTML = '<p style="color:var(--muted); font-style:italic;">No hay audios para mostrar con estos filtros.</p>';
    return;
  }

  // Dibujar cada tarjeta
  displayedAudios.forEach(item => {
    const card = document.createElement('div');
    card.className = 'audio-card'; // Usa el estilo de caja oscura
    card.innerHTML = `
      <div class="card-row">
        <strong>HORARIO:</strong> ${item.start} - ${item.end}
      </div>
      <div class="card-row">
        <strong>RADIO:</strong> ${item.radio}
      </div>
      <div class="card-row">
        <strong>FECHA:</strong> ${formatDateDisplay(item.date)}
      </div>
      <div class="card-row" style="color:#fff; font-size:0.8rem; margin-top:5px;">
        ${item.name}
      </div>
      <audio controls src="${item.url}" preload="none"></audio>
    `;
    feedContainer.appendChild(card);
  });
}

// Helper para fecha bonita
function formatDateDisplay(isoDate){
    if(!isoDate) return '--';
    try {
      const [y, m, d] = isoDate.split('-');
      const dateObj = new Date(y, m - 1, d); 
      return dateObj.toLocaleDateString();
    } catch(e){ return isoDate; }
}

// --- 6. EVENTOS (INTERACCIÓN) ---

// Cambio de Fecha
if(dateInput) {
    dateInput.addEventListener('change', (e) => {
      filterDate = e.target.value || null;
      renderFeed();
    });
}

// Cambio de Radio (EL MENU DESPLEGABLE)
if(radioSelect) {
    radioSelect.addEventListener('change', (e) => {
        filterRadio = e.target.value; // Toma el valor del <option> seleccionado
        renderFeed();
    });
}

// Mostrar/Ocultar Uploader
if(toggleUploaderBtn) {
    toggleUploaderBtn.addEventListener('click', () => {
      uploaderArea.style.display = uploaderArea.style.display === 'none' ? 'block' : 'none';
    });
}

// Guardar Manualmente
if(saveManualBtn) {
    saveManualBtn.addEventListener('click', async () => {
        const files = fileInput.files;
        if(!files.length) return alert("Selecciona un archivo");
        
        // Si está en "Todas las Radios", guardamos como "Radio General", si no, la que esté seleccionada
        const radioDestino = filterRadio === 'all' ? 'Radio General' : filterRadio;
        const today = new Date().toISOString().split('T')[0];
        const timeNow = new Date().toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'});

        for(const f of files){
            const formData = new FormData();
            formData.append('audio', f);
            formData.append('radio', radioDestino);
            formData.append('fecha', today);
            formData.append('start', timeNow);
            
            try {
                await fetch('/upload', { method: 'POST', body: formData });
            } catch(e) { console.error(e); }
        }
        
        fileInput.value = '';
        alert("Audio subido. Actualizando lista...");
        loadAudios();
    });
}

// --- 7. INICIAR ---
(function init(){
    loadAudios();
})();
