let paginaActual = 1;
let ordenColumna = 'nombre_evento';
let ordenDireccion = 'ASC';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado - Iniciando Eventos...");
    cargarEventos();
    cargarOrganizadores();
    document.getElementById('input-busqueda').addEventListener('input', () => cargarEventos(1));
});

// 1. Cargar la Tabla (Réplica de Grupos)
async function cargarEventos(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;
    const selectOrden = document.getElementById('select-orden').value;
    
    if(selectOrden !== ordenColumna) ordenColumna = selectOrden;

    try {
        const url = `/eventos?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`;
        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById('tabla-eventos');
        tbody.innerHTML = '';

        data.datos.forEach(e => {
            const nombreSafe = e.nombre_evento.replace(/'/g, "\\'");
            const fechaStr = new Date(e.fecha_hora_evento).toLocaleString('es-VE');

            tbody.innerHTML += `
                <tr>
                    <td>
                        <a href="javascript:void(0)" class="text-decoration-none fw-bold text-primary" 
                           onclick="verMiembros('${nombreSafe}')" title="Ver asistentes">
                            ${e.nombre_evento} 👥
                        </a>
                    </td>
                    <td><small>${e.descripcion || 'Sin descripción'}</small></td>
                    <td><small>${fechaStr}</small></td>
                    <td>${e.lugar}</td>
                    <td><small>${e.nombres ? e.nombres + ' ' + e.apellidos : 'Desconocido'}</small></td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" onclick="abrirEditar('${nombreSafe}')">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarEvento('${nombreSafe}')">🗑️</button>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) { 
        console.error("Error cargando eventos:", error); 
    }
}

// 2. Ver Asistentes (Réplica de verMiembros en Grupos)
async function verMiembros(nombreEvento) {
    try {
        const modalEl = document.getElementById('modalMiembros');
        document.getElementById('titulo-evento-miembros').innerText = nombreEvento;
        const tbody = document.getElementById('lista-miembros-evento');
        const msgVacio = document.getElementById('sin-miembros');
        
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-primary">Cargando datos...</td></tr>';
        
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const res = await fetch(`/eventos/${encodeURIComponent(nombreEvento)}/participantes`);
        const asistentes = await res.json();

        tbody.innerHTML = '';
        if (asistentes.length === 0) {
            msgVacio.classList.remove('d-none');
        } else {
            msgVacio.classList.add('d-none');
            asistentes.forEach(a => {
                tbody.innerHTML += `
                    <tr>
                        <td><div class="fw-bold">${a.nombres} ${a.apellidos}</div></td>
                        <td><small class="text-muted">${a.correo}</small></td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// 3. Crear Registro
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombre_evento: document.getElementById('reg-nombre').value,
        descripcion: document.getElementById('reg-descripcion').value,
        lugar: document.getElementById('reg-lugar').value,
        fecha_hora_evento: document.getElementById('reg-fecha').value,
        organizador_id: document.getElementById('reg-creador').value
    };

    const res = await fetch('/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalRegistro')).hide();
        alert('✅ Evento creado');
        cargarEventos(1);
        e.target.reset();
    } else {
        const err = await res.json();
        alert('❌ Error: ' + err.error);
    }
});

// 4. Editar
async function abrirEditar(nombreEvento) {
    try {
        const url = `/eventos?busqueda=${encodeURIComponent(nombreEvento)}`;
        const res = await fetch(url);
        const data = await res.json();
        const e = data.datos[0]; 

        document.getElementById('edit-id-original').value = e.nombre_evento;
        document.getElementById('edit-nombre').value = e.nombre_evento;
        document.getElementById('edit-descripcion').value = e.descripcion;
        document.getElementById('edit-lugar').value = e.lugar;
        
        const d = new Date(e.fecha_hora_evento);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        document.getElementById('edit-fecha').value = d.toISOString().slice(0, 16);

        new bootstrap.Modal(document.getElementById('modalEdicion')).show();
    } catch (error) { alert("Error al cargar datos"); }
}

document.getElementById('form-edicion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idOriginal = document.getElementById('edit-id-original').value;
    const payload = {
        nombre_evento: idOriginal, // No cambia segun tu logica de grupos
        descripcion: document.getElementById('edit-descripcion').value,
        lugar: document.getElementById('edit-lugar').value,
        fecha_hora_evento: document.getElementById('edit-fecha').value
    };

    const res = await fetch(`/eventos/${encodeURIComponent(idOriginal)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalEdicion')).hide();
        alert('✅ Actualizado');
        cargarEventos(paginaActual);
    }
});

async function eliminarEvento(nombre) {
    if (confirm(`¿Eliminar evento "${nombre}"?`)) {
        await fetch(`/eventos/${encodeURIComponent(nombre)}`, { method: 'DELETE' });
        cargarEventos(paginaActual);
    }
}

// 5. Utilidades
function ordenar(col) {
    if (ordenColumna === col) {
        ordenDireccion = ordenDireccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenColumna = col;
        ordenDireccion = 'ASC';
    }
    cargarEventos(1);
}

function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    nav.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `<li class="page-item ${i === actual ? 'active' : ''}"><button class="page-link" onclick="cargarEventos(${i})">${i}</button></li>`;
    }
}

async function cargarOrganizadores() {
    const res = await fetch('/eventos/organizadores');
    const orgs = await res.json();
    const select = document.getElementById('reg-creador');
    select.innerHTML = '<option value="">-- Seleccionar Organizador --</option>';
    orgs.forEach(o => {
        select.innerHTML += `<option value="${o.miembro_id}">${o.nombres} ${o.apellidos}</option>`;
    });
}

function abrirModalRegistro() {
    new bootstrap.Modal(document.getElementById('modalRegistro')).show();
}

window.verMiembros = verMiembros;
window.abrirEditar = abrirEditar;
window.eliminarEvento = eliminarEvento;
window.cargarEventos = cargarEventos;
window.abrirModalRegistro = abrirModalRegistro;
window.ordenar = ordenar;