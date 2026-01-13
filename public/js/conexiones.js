// Simulación de usuario logueado (ID fijo para pruebas)
const MI_ID = 1; 

document.addEventListener('DOMContentLoaded', () => {
    cargarAmigos();
    cargarSolicitudes();
    cargarConversaciones();
});

// --- PESTAÑA 1: AMIGOS ---
async function cargarAmigos() {
    const res = await fetch(`/conexiones/${MI_ID}/amigos`);
    const data = await res.json();
    const tbody = document.getElementById('lista-amigos');
    tbody.innerHTML = data.length ? '' : '<tr><td colspan="3" class="text-center p-3">No tienes amigos conectados aún.</td></tr>';
    
    data.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">${a.nombres} ${a.apellidos}</td>
                <td>${a.correo}</td>
                <td>${new Date(a.fecha_conexion).toLocaleDateString()}</td>
            </tr>`;
    });
}

// --- PESTAÑA 2: SOLICITUDES ---
async function cargarSolicitudes() {
    const res = await fetch(`/conexiones/${MI_ID}/pendientes`);
    const data = await res.json();
    const tbody = document.getElementById('lista-solicitudes');
    tbody.innerHTML = data.length ? '' : '<tr><td colspan="3" class="text-center p-3">No tienes solicitudes pendientes.</td></tr>';

    data.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold">${s.nombres} ${s.apellidos}</td>
                <td>${new Date(s.fecha_conexion).toLocaleDateString()}</td>
                <td class="text-center">
                    <button class="btn btn-success btn-sm" onclick="aceptarSolicitud(${s.miembro_id})">
                        <i class="fas fa-check"></i> Aceptar
                    </button>
                </td>
            </tr>`;
    });
}

// --- PESTAÑA 3: BUSCAR ---
async function buscarNuevos() {
    const texto = document.getElementById('busqueda-global').value;
    const res = await fetch(`/conexiones/buscar?id=${MI_ID}&busqueda=${texto}`);
    const data = await res.json();
    const tbody = document.getElementById('lista-busqueda');
    tbody.innerHTML = data.length ? '' : '<tr><td colspan="3" class="text-center p-3">No se encontraron miembros.</td></tr>';

    data.forEach(m => {
        tbody.innerHTML += `
            <tr>
                <td>${m.nombres} ${m.apellidos}</td>
                <td>${m.correo}</td>
                <td class="text-center">
                    <button class="btn btn-primary btn-sm" onclick="enviarSolicitud(${m.miembro_id})">
                        <i class="fas fa-user-plus"></i> Conectar
                    </button>
                </td>
            </tr>`;
    });
}

// --- PESTAÑA 4: CONVERSACIONES ---
async function cargarConversaciones() {
    const res = await fetch(`/conexiones/${MI_ID}/conversaciones`);
    const data = await res.json();
    const tbody = document.getElementById('lista-conversaciones');
    tbody.innerHTML = data.length ? '' : '<tr><td colspan="4" class="text-center p-3">No hay conversaciones registradas.</td></tr>';

    data.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold">${c.titulo}</td>
                <td>${c.creador_nombres} ${c.creador_apellidos}</td>
                <td>${new Date(c.fecha_creacion).toLocaleDateString()}</td>
                <td class="text-center">
                    <button class="btn btn-info btn-sm text-white" onclick="verMensajes(${c.conversacion_id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>`;
    });
}

// --- ACCIONES ---
async function enviarSolicitud(idDestino) {
    const res = await fetch('/conexiones/solicitar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ solicitante_id: MI_ID, solicitado_id: idDestino })
    });
    if(res.ok) { alert("Solicitud enviada"); buscarNuevos(); }
}

async function aceptarSolicitud(idSolicitante) {
    const res = await fetch('/conexiones/aceptar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ solicitante_id: idSolicitante, solicitado_id: MI_ID })
    });
    if(res.ok) { alert("¡Ahora son amigos!"); cargarSolicitudes(); cargarAmigos(); }
}

async function verMensajes(idConversacion) {
    const res = await fetch(`/conexiones/conversacion/${idConversacion}`);
    const mensajes = await res.json();
    const container = document.getElementById('contenedor-mensajes');
    
    container.innerHTML = mensajes.length ? '' : '<div class="text-center text-muted">Esta conversación está vacía.</div>';
    
    mensajes.forEach(m => {
        container.innerHTML += `
            <div class="card border-0 shadow-sm mb-2">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between mb-1">
                        <strong class="text-primary">${m.nombres} ${m.apellidos}</strong>
                        <small class="text-muted">${new Date(m.fecha_envio).toLocaleString()}</small>
                    </div>
                    <p class="mb-0 text-dark">${m.contenido}</p>
                </div>
            </div>`;
    });
    
    new bootstrap.Modal(document.getElementById('modalMensajes')).show();
}