let paginaActual = 1;
let ordenColumna = 'miembro_id';
let ordenDireccion = 'ASC';

document.addEventListener('DOMContentLoaded', () => {
    cargarEgresados();
    cargarCandidatos();
    document.getElementById('input-busqueda').addEventListener('input', () => cargarEgresados(1));
});

async function cargarEgresados(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;
    const selectOrden = document.getElementById('select-orden').value;
    
    if(selectOrden !== ordenColumna) ordenColumna = selectOrden;

    try {
        const url = `/egresados?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`;
        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById('tabla-egresados');
        tbody.innerHTML = '';

        data.datos.forEach(e => {
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">#${e.miembro_id}</td>
                    <td>
                        <div>${e.nombres} ${e.apellidos}</div>
                        <small class="text-muted">${e.correo}</small>
                    </td>
                    <td><span class="badge bg-primary">${e.titulo_obtenido}</span></td>
                    <td><span class="badge bg-dark rounded-pill">${e.ano_graduacion}</span></td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" onclick="abrirEditar(${e.miembro_id})" title="Editar">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarEgresado(${e.miembro_id})" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) {
        console.error("Error al cargar egresados:", error);
    }
}

async function cargarCandidatos() {
    try {
        const res = await fetch('/egresados/candidatos');
        const miembros = await res.json();
        const select = document.getElementById('reg-miembro');
        select.innerHTML = '<option value="">-- Seleccionar Miembro --</option>';
        miembros.forEach(m => {
            select.innerHTML += `<option value="${m.miembro_id}">${m.nombres} ${m.apellidos} (${m.correo})</option>`;
        });
    } catch (error) { console.error(error); }
}

async function abrirEditar(id) {
    try {
        const res = await fetch(`/egresados/${id}`);
        const e = await res.json();
        
        document.getElementById('edit-id').value = e.miembro_id;
        document.getElementById('edit-nombre-display').value = `${e.nombres} ${e.apellidos}`;
        document.getElementById('edit-titulo').value = e.titulo_obtenido;
        document.getElementById('edit-ano').value = e.ano_graduacion;

        new bootstrap.Modal(document.getElementById('modalEdicion')).show();
    } catch (error) { alert("Error al cargar datos"); }
}

document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        miembro_id: document.getElementById('reg-miembro').value,
        titulo_obtenido: document.getElementById('reg-titulo').value,
        ano_graduacion: document.getElementById('reg-ano').value
    };

    const res = await fetch('/egresados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalRegistro')).hide();
        alert('✅ Egresado registrado correctamente');
        cargarEgresados(1);
        cargarCandidatos();
        e.target.reset();
    } else {
        const data = await res.json();
        alert('❌ Error: ' + data.error);
    }
});

document.getElementById('form-edicion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const payload = {
        titulo_obtenido: document.getElementById('edit-titulo').value,
        ano_graduacion: document.getElementById('edit-ano').value
    };

    const res = await fetch(`/egresados/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalEdicion')).hide();
        alert('✅ Datos actualizados');
        cargarEgresados(paginaActual);
    } else {
        alert('❌ Error al actualizar');
    }
});

async function eliminarEgresado(id) {
    if (confirm('¿Quitar rol de Egresado a este miembro?')) {
        await fetch(`/egresados/${id}`, { method: 'DELETE' });
        cargarEgresados(paginaActual);
        cargarCandidatos();
    }
}

function ordenar(columna) {
    if (ordenColumna === columna) {
        ordenDireccion = ordenDireccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenColumna = columna;
        ordenDireccion = 'ASC';
    }
    document.getElementById('select-orden').value = columna;
    cargarEgresados(1);
}

function cambiarOrden() {
    ordenColumna = document.getElementById('select-orden').value;
    ordenDireccion = 'ASC';
    cargarEgresados(1);
}

function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    if(!nav) return;
    nav.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `<li class="page-item ${i === actual ? 'active' : ''}"><button class="page-link" onclick="cargarEgresados(${i})">${i}</button></li>`;
    }
}

function abrirModalRegistro() {
    new bootstrap.Modal(document.getElementById('modalRegistro')).show();
}