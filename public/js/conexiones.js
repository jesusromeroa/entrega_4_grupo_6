let paginaActual = 1;

document.addEventListener('DOMContentLoaded', () => {
    cargarMiembros();
    document.getElementById('input-busqueda').addEventListener('input', () => cargarMiembros(1));
});

// 1. Cargar Tabla Principal con Colores por Tipo
async function cargarMiembros(pagina = 1) {
    const busqueda = document.getElementById('input-busqueda').value;
    try {
        const res = await fetch(`/conexiones?pagina=${pagina}&busqueda=${busqueda}`);
        const data = await res.json();
        const tbody = document.getElementById('tabla-miembros');
        tbody.innerHTML = '';

        if(data.datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No se encontraron miembros.</td></tr>';
            return;
        }

        data.datos.forEach(m => {
            const nombreSafe = `${m.nombres} ${m.apellidos}`.replace(/'/g, "\\'");
            
            // --- LÓGICA DE COLORES ---
            let badgeClass = 'bg-secondary'; // Por defecto (Gris)
            if (m.tipo_miembro === 'Estudiante') badgeClass = 'bg-primary';       // Azul
            if (m.tipo_miembro === 'Profesor') badgeClass = 'bg-success';         // Verde
            if (m.tipo_miembro === 'Egresado') badgeClass = 'bg-warning text-dark'; // Amarillo
            // ------------------------

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold text-dark">${m.nombres} ${m.apellidos}</td>
                    <td>${m.correo}</td>
                    <td>
                        <span class="badge ${badgeClass} rounded-pill">
                            ${m.tipo_miembro}
                        </span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-info btn-sm btn-action text-white" onclick="verAmigos('${m.miembro_id}', '${nombreSafe}')" title="Ver Conexiones">
                            <i class="fas fa-project-diagram"></i>
                        </button>
                        <button class="btn btn-warning btn-sm btn-action text-white" onclick="verChats('${m.miembro_id}', '${nombreSafe}')" title="Ver Conversaciones">
                            <i class="fas fa-comments"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (e) { console.error(e); }
}

// 2. Ver Amigos (Modal)
async function verAmigos(id, nombre) {
    document.getElementById('lbl-nombre-amigos').innerText = nombre;
    const tbody = document.getElementById('lista-amigos');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-primary">Cargando red de contactos...</td></tr>';
    new bootstrap.Modal(document.getElementById('modalAmigos')).show();

    try {
        const res = await fetch(`/conexiones/${id}/amigos`);
        const amigos = await res.json();
        tbody.innerHTML = '';

        if(amigos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Este usuario no tiene conexiones aceptadas.</td></tr>';
            return;
        }

        amigos.forEach(a => {
            const fecha = new Date(a.fecha_conexion).toLocaleDateString();
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${a.nombres} ${a.apellidos}</td>
                    <td><small>${a.correo}</small></td>
                    <td>${fecha}</td>
                    <td><span class="badge bg-success">Amigos</span></td>
                </tr>`;
        });
    } catch(e) { console.error(e); }
}

// 3. Ver Chats (Modal)
async function verChats(id, nombre) {
    document.getElementById('lbl-nombre-chats').innerText = nombre;
    const lista = document.getElementById('lista-chats');
    lista.innerHTML = '<li class="list-group-item text-center text-primary">Cargando conversaciones...</li>';
    new bootstrap.Modal(document.getElementById('modalChats')).show();

    try {
        const res = await fetch(`/conexiones/${id}/conversaciones`);
        const chats = await res.json();
        lista.innerHTML = '';

        if(chats.length === 0) {
            lista.innerHTML = '<li class="list-group-item text-muted text-center">No hay historial de conversaciones.</li>';
            return;
        }

        chats.forEach(c => {
            const fecha = new Date(c.fecha_creacion).toLocaleDateString();
            lista.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong class="text-primary">${c.titulo || 'Sin título'}</strong><br>
                        <small class="text-muted">Iniciado por: ${c.creador} | ${fecha}</small>
                    </div>
                    <button class="btn btn-sm btn-dark" onclick="verMensajes(${c.conversacion_id})">
                        <i class="fas fa-eye"></i> Leer
                    </button>
                </li>`;
        });
    } catch(e) { console.error(e); }
}

// 4. Ver Mensajes (Sub-Modal)
async function verMensajes(idChat) {
    const container = document.getElementById('contenedor-mensajes');
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div></div>';
    new bootstrap.Modal(document.getElementById('modalMensajes')).show();

    try {
        const res = await fetch(`/conexiones/conversacion/${idChat}/mensajes`);
        const msjs = await res.json();
        container.innerHTML = '';

        if(msjs.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-3">No hay mensajes en este chat.</div>';
            return;
        }

        msjs.forEach(m => {
            const fecha = new Date(m.fecha_envio).toLocaleString();
            container.innerHTML += `
                <div class="card mb-2 border-0 shadow-sm bg-white">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="fw-bold text-primary">${m.nombres} ${m.apellidos}</span>
                            <small class="text-muted" style="font-size: 0.8em;">${fecha}</small>
                        </div>
                        <p class="mb-0 text-dark">${m.contenido}</p>
                    </div>
                </div>`;
        });
    } catch(e) { console.error(e); }
}

function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    if(!nav) return;
    nav.innerHTML = '';
    
    if(total <= 1) return;

    for(let i=1; i<=total; i++) {
        nav.innerHTML += `
            <li class="page-item ${i===actual?'active':''}">
                <button class="page-link" onclick="cargarMiembros(${i})">${i}</button>
            </li>`;
    }
}