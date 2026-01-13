const userStr = localStorage.getItem('usuario');
if (!userStr) window.location.href = 'login.html';
const MI_ID = JSON.parse(userStr).miembro_id;

document.addEventListener('DOMContentLoaded', () => {
    cargarMisEventos();
    buscarEventos();
});

async function cargarMisEventos() {
    const res = await fetch(`/eventos/${MI_ID}/mis-eventos`);
    const data = await res.json();
    const container = document.getElementById('lista-mis-eventos');
    container.innerHTML = data.length ? '' : '<p class="text-center text-muted">No tienes eventos agendados.</p>';
    
    data.forEach(e => {
        const fecha = new Date(e.fecha_hora_evento).toLocaleString();
        container.innerHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-1 text-primary">${e.nombre_evento}</h5>
                    <small class="text-muted"><i class="far fa-clock"></i> ${fecha} | 📍 ${e.lugar}</small>
                    <p class="mb-1 small">${e.descripcion || ''}</p>
                </div>
                <button class="btn btn-outline-danger btn-sm" onclick="cancelar('${e.nombre_evento}')">Cancelar Asistencia</button>
            </div>`;
    });
}

async function buscarEventos() {
    const txt = document.getElementById('busqueda-evento').value;
    const res = await fetch(`/eventos/buscar?id=${MI_ID}&busqueda=${txt}`);
    const data = await res.json();
    const container = document.getElementById('lista-busqueda-eventos');
    container.innerHTML = data.length ? '' : '<p class="text-center text-muted">No hay eventos disponibles.</p>';

    data.forEach(e => {
        const fecha = new Date(e.fecha_hora_evento).toLocaleString();
        container.innerHTML += `
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="fw-bold">${e.nombre_evento}</h6>
                        <small class="text-muted">${fecha}</small>
                        <p class="small mt-2">${e.descripcion || ''}</p>
                        <button class="btn btn-primary btn-sm w-100" onclick="asistir('${e.nombre_evento}')">Asistir</button>
                    </div>
                </div>
            </div>`;
    });
}

async function asistir(nombre) {
    await fetch('/eventos/asistir', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ nombre_evento: nombre, miembro_id: MI_ID })
    });
    alert('Asistencia confirmada'); cargarMisEventos(); buscarEventos();
}

async function cancelar(nombre) {
    if(!confirm('¿Cancelar asistencia?')) return;
    await fetch('/eventos/cancelar', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ nombre_evento: nombre, miembro_id: MI_ID })
    });
    cargarMisEventos(); buscarEventos();
}

// --- NUEVAS FUNCIONES PARA CREAR EVENTO ---

function abrirCrearEvento() {
    new bootstrap.Modal(document.getElementById('modalCrearEvento')).show();
}

document.getElementById('form-crear-evento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
        nombre_evento: document.getElementById('e-nombre').value,
        descripcion: document.getElementById('e-desc').value,
        lugar: document.getElementById('e-lugar').value,
        fecha_hora_evento: document.getElementById('e-fecha').value,
        organizador_id: MI_ID // El miembro logueado es el organizador
    };

    const res = await fetch('/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        alert('Evento creado exitosamente');
        location.reload(); // Recargar para ver el nuevo evento en "Mi Agenda"
    } else {
        const err = await res.json();
        alert('Error: ' + err.error);
    }
});