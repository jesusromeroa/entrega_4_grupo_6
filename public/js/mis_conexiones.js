const userStr = localStorage.getItem('usuario');
if (!userStr) window.location.href = 'login.html';
const usuario = JSON.parse(userStr);
const MI_ID = usuario.miembro_id;
let chatActualId = null; // Para saber en qué chat estamos escribiendo

document.addEventListener('DOMContentLoaded', () => {
    cargarAmigos();
    cargarSolicitudes();
    cargarChats();
});

// --- AMIGOS ---
async function cargarAmigos() {
    const res = await fetch(`/conexiones/${MI_ID}/amigos`);
    const data = await res.json();
    const tbody = document.getElementById('lista-amigos');
    tbody.innerHTML = data.length ? '' : '<tr><td class="text-center p-3">No tienes amigos aún.</td></tr>';
    data.forEach(a => {
        const nombreSafe = `${a.nombres} ${a.apellidos}`;
        tbody.innerHTML += `
            <tr>
                <td>
                    <div class="fw-bold text-primary">${nombreSafe}</div>
                    <small class="text-muted">${a.correo}</small>
                </td>
                <td class="text-end">
                    <button class="btn btn-outline-primary btn-sm" 
                        onclick="iniciarChatDirecto('${a.miembro_id}', '${nombreSafe}')">
                        <i class="fas fa-comment-dots"></i> Chat
                    </button>
                </td>
            </tr>`;
    });
}

// --- SOLICITUDES ---
async function cargarSolicitudes() {
    const res = await fetch(`/conexiones/${MI_ID}/pendientes`);
    const data = await res.json();
    const tbody = document.getElementById('lista-solicitudes');
    tbody.innerHTML = data.length ? '' : '<tr><td class="text-center p-3">Sin solicitudes pendientes.</td></tr>';
    data.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td>${s.nombres} ${s.apellidos}</td>
                <td class="text-end">
                    <button class="btn btn-success btn-sm me-2" onclick="aceptar(${s.miembro_id})">Aceptar</button>
                    <button class="btn btn-danger btn-sm" onclick="rechazar(${s.miembro_id})">Rechazar</button>
                </td>
            </tr>`;
    });
}

// --- CHATS (Historial) ---
async function cargarChats() {
    const res = await fetch(`/conexiones/${MI_ID}/conversaciones`);
    const data = await res.json();
    const tbody = document.getElementById('lista-chats');
    tbody.innerHTML = data.length ? '' : '<tr><td class="text-center p-3">No hay chats recientes.</td></tr>';
    data.forEach(c => {
        const fecha = new Date(c.fecha_creacion).toLocaleDateString();
        tbody.innerHTML += `
            <tr>
                <td>
                    <strong>${c.titulo}</strong><br>
                    <small class="text-muted">Creado por: ${c.creador} el ${fecha}</small>
                </td>
                <td class="text-end">
                    <button class="btn btn-primary btn-sm" onclick="abrirChatExistente(${c.conversacion_id}, '${c.titulo}')">
                        Ver Mensajes
                    </button>
                </td>
            </tr>`;
    });
}

// --- BUSCAR ---
async function buscarNuevos() {
    const txt = document.getElementById('busqueda-global').value;
    const res = await fetch(`/conexiones/buscar?id=${MI_ID}&busqueda=${txt}`);
    const data = await res.json();
    const tbody = document.getElementById('lista-busqueda');
    tbody.innerHTML = data.length ? '' : '<tr><td class="text-center p-3">No se encontraron resultados.</td></tr>';
    data.forEach(m => {
        tbody.innerHTML += `
            <tr>
                <td>${m.nombres} ${m.apellidos}</td>
                <td class="text-end">
                    <button class="btn btn-info btn-sm text-white" onclick="conectar(${m.miembro_id})">Conectar</button>
                </td>
            </tr>`;
    });
}

// --- ACCIONES DE CONEXIÓN ---
async function conectar(id) {
    await fetch('/conexiones/solicitar', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({solicitante_id: MI_ID, solicitado_id: id})
    });
    alert('Solicitud enviada'); buscarNuevos();
}

async function aceptar(id) {
    await fetch('/conexiones/aceptar', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({solicitante_id: id, solicitado_id: MI_ID})
    });
    alert('¡Amigo agregado!'); cargarSolicitudes(); cargarAmigos();
}

async function rechazar(id) {
    if(!confirm("¿Rechazar solicitud?")) return;
    await fetch('/conexiones/rechazar', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({solicitante_id: id, solicitado_id: MI_ID})
    });
    cargarSolicitudes();
}

// --- ACCIONES DE MENSAJERÍA ---

// 1. Abrir chat desde la lista de amigos (Crea uno nuevo o abre el existente)
async function iniciarChatDirecto(amigoId, nombreAmigo) {
    // Para simplificar, creamos una nueva conversación por ahora
    // En un sistema real buscaríamos si ya existe una.
    const res = await fetch('/conexiones/conversacion', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ mi_id: MI_ID, amigo_id: amigoId, nombre_amigo: nombreAmigo })
    });
    const data = await res.json();
    
    // Abrimos el modal con el ID de la conversación creada
    abrirChatExistente(data.conversacion_id, `Chat con ${nombreAmigo}`);
    cargarChats(); // Actualizar lista de fondo
}

// 2. Abrir chat desde el historial
function abrirChatExistente(idConv, titulo) {
    chatActualId = idConv;
    document.getElementById('titulo-chat').innerText = titulo;
    new bootstrap.Modal(document.getElementById('modalChat')).show();
    cargarMensajesChat(idConv);
}

// 3. Cargar mensajes
async function cargarMensajesChat(idConv) {
    const box = document.getElementById('contenedor-mensajes');
    box.innerHTML = '<div class="text-center text-muted">Cargando...</div>';
    
    const res = await fetch(`/conexiones/conversacion/${idConv}/mensajes`);
    const msjs = await res.json();
    
    box.innerHTML = msjs.length ? '' : '<div class="text-center text-muted mt-5">No hay mensajes. ¡Di hola! 👋</div>';
    
    msjs.forEach(m => {
        // Diferenciar mis mensajes de los otros
        const esMio = m.nombres === usuario.nombres; // Comparación simple por nombre (idealmente usar ID)
        const claseAlign = esMio ? 'align-self-end bg-primary text-white' : 'align-self-start bg-white border';
        
        box.innerHTML += `
            <div class="p-2 rounded shadow-sm ${claseAlign}" style="max-width: 75%;">
                <small class="fw-bold d-block" style="font-size: 0.75rem; opacity: 0.8;">${m.nombres}</small>
                <div>${m.contenido}</div>
            </div>`;
    });
    // Scroll al final
    box.scrollTop = box.scrollHeight;
}

// 4. Enviar mensaje
async function enviarMensajeActual() {
    const input = document.getElementById('input-mensaje');
    const texto = input.value.trim();
    if(!texto || !chatActualId) return;

    await fetch('/conexiones/mensaje', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ conversacion_id: chatActualId, miembro_id: MI_ID, texto: texto })
    });
    
    input.value = '';
    cargarMensajesChat(chatActualId); // Recargar para ver el nuevo mensaje
}