const userStr = localStorage.getItem('usuario');
if (!userStr) window.location.href = 'login.html';
const MI_ID = JSON.parse(userStr).miembro_id;

document.addEventListener('DOMContentLoaded', () => {
    cargarMisGrupos();
    buscarGrupos();
});

async function cargarMisGrupos() {
    const res = await fetch(`/grupos/${MI_ID}/mis-grupos`);
    const data = await res.json();
    const container = document.getElementById('lista-mis-grupos');
    container.innerHTML = data.length ? '' : '<p class="text-center text-muted">No perteneces a ningún grupo.</p>';
    
    data.forEach(g => {
        container.innerHTML += `
            <div class="col-md-6">
                <div class="card h-100 shadow-sm border-start border-4 border-primary">
                    <div class="card-body">
                        <h5 class="card-title fw-bold">${g.nombre_grupo}</h5>
                        <p class="card-text small text-muted">${g.descripcion || ''}</p>
                        <span class="badge bg-info text-dark">${g.rol}</span>
                        <button class="btn btn-outline-danger btn-sm float-end" onclick="salir('${g.nombre_grupo}')">Salir</button>
                    </div>
                </div>
            </div>`;
    });
}

async function buscarGrupos() {
    const txt = document.getElementById('busqueda-grupo').value;
    const res = await fetch(`/grupos/buscar?id=${MI_ID}&busqueda=${txt}`);
    const data = await res.json();
    const container = document.getElementById('lista-busqueda-grupos');
    container.innerHTML = data.length ? '' : '<p class="text-center text-muted">No se encontraron grupos.</p>';

    data.forEach(g => {
        container.innerHTML += `
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="fw-bold">${g.nombre_grupo}</h6>
                        <span class="badge bg-secondary">${g.categoria_grupo}</span>
                        <p class="small mt-2">${g.descripcion || ''}</p>
                        <button class="btn btn-success btn-sm w-100" onclick="unirse('${g.nombre_grupo}')">Unirse</button>
                    </div>
                </div>
            </div>`;
    });
}

async function unirse(nombre) {
    await fetch('/grupos/unirse', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ nombre_grupo: nombre, miembro_id: MI_ID })
    });
    alert('Te has unido al grupo'); cargarMisGrupos(); buscarGrupos();
}

async function salir(nombre) {
    if(!confirm('¿Salir del grupo?')) return;
    await fetch('/grupos/salir', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ nombre_grupo: nombre, miembro_id: MI_ID })
    });
    cargarMisGrupos(); buscarGrupos();
}

function abrirCrearGrupo() { new bootstrap.Modal(document.getElementById('modalCrearGrupo')).show(); }

document.getElementById('form-crear-grupo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
        nombre_grupo: document.getElementById('g-nombre').value,
        descripcion: document.getElementById('g-desc').value,
        tipo_grupo: document.getElementById('g-tipo').value,
        categoria_grupo: document.getElementById('g-cat').value,
        miembro_creador_id: MI_ID
    };
    const res = await fetch('/grupos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    if(res.ok) { alert('Grupo creado'); location.reload(); }
    else alert('Error al crear');
});