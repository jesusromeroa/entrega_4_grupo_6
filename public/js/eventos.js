let paginaActual = 1;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Módulo Eventos Iniciado");
    cargarEventos();
    cargarOrganizadores();
    document.getElementById('input-busqueda').addEventListener('input', () => cargarEventos(1));
});

// --- FUNCIONES GLOBALES ---

async function cargarEventos(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;
    const orden = document.getElementById('select-orden').value;

    try {
        const res = await fetch(`/eventos?pagina=${pagina}&busqueda=${busqueda}&orden=${orden}`);
        
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const data = await res.json();
        const tbody = document.getElementById('tabla-eventos');
        tbody.innerHTML = '';

        data.datos.forEach(e => {
            const fecha = new Date(e.fecha_hora_evento).toLocaleString();
            
            // Escapar comillas simples para evitar romper el HTML
            const nombreSafe = e.nombre_evento.replace(/'/g, "\\'"); 

            tbody.innerHTML += `
                <tr>
                    <td>
                        <a href="javascript:void(0)" class="fw-bold text-primary text-decoration-none"
                           onclick="window.verAsistentes('${nombreSafe}')">
                           📅 ${e.nombre_evento}
                        </a>
                    </td>
                    <td><small>${e.descripcion || ''}</small></td>
                    <td><span class="badge bg-dark">${fecha}</span></td>
                    <td>${e.lugar || 'N/A'}</td>
                    <td>${e.nombres || ''} ${e.apellidos || ''}</td>
                    <td class="text-center">
                        <button class="btn btn-danger btn-sm" onclick="window.eliminarEvento('${nombreSafe}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) { console.error("Error al cargar eventos:", error); }
}

async function verAsistentes(nombreEvento) {
    const modalElement = document.getElementById('modalAsistentes');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    document.getElementById('titulo-evento-asistentes').innerText = nombreEvento;
    const tbody = document.getElementById('lista-asistentes');
    tbody.innerHTML = '<tr><td colspan="2" class="text-center">Cargando...</td></tr>';

    try {
        // IMPORTANTE: encodeURIComponent para manejar espacios en la URL
        const res = await fetch(`/eventos/${encodeURIComponent(nombreEvento)}/asistentes`);
        const lista = await res.json();
        tbody.innerHTML = '';

        if(lista.length === 0) {
            document.getElementById('sin-asistentes').classList.remove('d-none');
        } else {
            document.getElementById('sin-asistentes').classList.add('d-none');
            lista.forEach(p => {
                tbody.innerHTML += `
                    <tr>
                        <td>${p.nombres} ${p.apellidos} <br><small class="text-muted">${p.correo}</small></td>
                        <td><span class="badge bg-info text-dark">${p.rol_evento || 'Asistente'}</span></td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="2" class="text-danger">Error al cargar datos</td></tr>';
    }
}

async function cargarOrganizadores() {
    try {
        const res = await fetch('/eventos/organizadores');
        const orgs = await res.json();
        const select = document.getElementById('reg-creador');
        orgs.forEach(o => select.innerHTML += `<option value="${o.miembro_id}">${o.nombres} ${o.apellidos}</option>`);
    } catch (e) { console.error(e); }
}

function abrirModalRegistro() {
    new bootstrap.Modal(document.getElementById('modalRegistro')).show();
}

document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombre_evento: document.getElementById('reg-nombre').value,
        descripcion: document.getElementById('reg-desc').value,
        fecha_hora_evento: document.getElementById('reg-fecha').value,
        lugar: document.getElementById('reg-lugar').value,
        miembro_creador_id: document.getElementById('reg-creador').value
    };

    const res = await fetch('/eventos', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });

    if(res.ok) {
        alert('✅ Evento Creado');
        bootstrap.Modal.getInstance(document.getElementById('modalRegistro')).hide();
        cargarEventos(1);
        e.target.reset();
    } else {
        const err = await res.json();
        // Si el error es por duplicado (PK)
        alert('Error: ' + (err.error || 'No se pudo crear. Verifica que el nombre no exista ya.'));
    }
});

async function eliminarEvento(nombreEvento) {
    if(confirm(`¿Eliminar evento "${nombreEvento}" permanentemente?`)) {
        // IMPORTANTE: encodeURIComponent
        await fetch(`/eventos/${encodeURIComponent(nombreEvento)}`, { method: 'DELETE' });
        cargarEventos(paginaActual);
    }
}

function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    if(!nav) return;
    nav.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `<li class="page-item ${i === actual ? 'active' : ''}"><button class="page-link" onclick="cargarEventos(${i})">${i}</button></li>`;
    }
}

// EXPORTAR A WINDOW
window.cargarEventos = cargarEventos;
window.verAsistentes = verAsistentes;
window.abrirModalRegistro = abrirModalRegistro;
window.eliminarEvento = eliminarEvento;