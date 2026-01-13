// Validar sesión
const userStr = localStorage.getItem('usuario');
if (!userStr) window.location.href = 'login.html';
const usuario = JSON.parse(userStr);
const MI_ID = usuario.miembro_id; // <--- AQUÍ ESTÁ EL CAMBIO IMPORTANTE

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
        tbody.innerHTML += `<tr><td class="fw-bold">${a.nombres} ${a.apellidos}</td><td>${a.correo}</td></tr>`;
    });
}

// --- SOLICITUDES ---
async function cargarSolicitudes() {
    const res = await fetch(`/conexiones/${MI_ID}/pendientes`);
    const data = await res.json();
    const tbody = document.getElementById('lista-solicitudes');
    tbody.innerHTML = data.length ? '' : '<tr><td class="text-center p-3">Sin solicitudes pendientes.</td></tr>';
    data.forEach(s => {
        tbody.innerHTML += `<tr><td>${s.nombres} ${s.apellidos}</td><td class="text-end"><button class="btn btn-success btn-sm" onclick="aceptar(${s.miembro_id})">Aceptar</button></td></tr>`;
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
        tbody.innerHTML += `<tr><td>${m.nombres} ${m.apellidos}</td><td class="text-end"><button class="btn btn-primary btn-sm" onclick="conectar(${m.miembro_id})">Conectar</button></td></tr>`;
    });
}

// --- CHATS ---
async function cargarChats() {
    const res = await fetch(`/conexiones/${MI_ID}/conversaciones`);
    const data = await res.json();
    const tbody = document.getElementById('lista-chats');
    tbody.innerHTML = data.length ? '' : '<tr><td class="text-center p-3">No hay chats.</td></tr>';
    data.forEach(c => {
        tbody.innerHTML += `<tr><td><strong>${c.titulo||'Chat'}</strong><br><small>${c.creador}</small></td><td class="text-end"><button class="btn btn-dark btn-sm" onclick="verMsjs(${c.conversacion_id})">Ver</button></td></tr>`;
    });
}

// --- ACCIONES ---
async function conectar(id) {
    await fetch('/conexiones/solicitar', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({solicitante_id: MI_ID, solicitado_id: id})
    });
    alert('Solicitud enviada');
    buscarNuevos();
}

async function aceptar(id) {
    await fetch('/conexiones/aceptar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({solicitante_id: id, solicitado_id: MI_ID})
    });
    alert('¡Amigo agregado!');
    cargarSolicitudes();
    cargarAmigos();
}

async function verMsjs(id) {
    const box = document.getElementById('contenedor-mensajes');
    box.innerHTML = 'Cargando...';
    new bootstrap.Modal(document.getElementById('modalMensajes')).show();
    
    const res = await fetch(`/conexiones/conversacion/${id}/mensajes`);
    const data = await res.json();
    box.innerHTML = '';
    data.forEach(m => {
        box.innerHTML += `<div class="card mb-2 p-2"><small class="text-primary">${m.nombres}</small><p class="mb-0">${m.contenido}</p></div>`;
    });
}