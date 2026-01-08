let paginaActual = 1;
let ordenColumna = 'miembro_id';
let ordenDireccion = 'ASC';

document.addEventListener('DOMContentLoaded', () => {
    cargarMiembros();
    cargarCiudades();
    document.getElementById('input-busqueda').addEventListener('input', () => cargarMiembros(1));
});

async function cargarMiembros(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;
    const selectOrden = document.getElementById('select-orden').value;
    if(selectOrden !== ordenColumna) ordenColumna = selectOrden;

    try {
        const res = await fetch(`/miembros?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`);
        const data = await res.json();
        const tbody = document.getElementById('tabla-miembros');
        tbody.innerHTML = '';

        data.datos.forEach(m => {
            let badgeClass = m.estatus === 'Activo' ? 'bg-success' : (m.estatus === 'Bloqueado' ? 'bg-danger' : 'bg-secondary');
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">#${m.miembro_id}</td>
                    <td>${m.nombres} ${m.apellidos}</td>
                    <td><small>${m.correo}</small></td>
                    <td><span class="badge ${badgeClass}">${m.estatus}</span></td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" onclick="abrirEditar(${m.miembro_id})">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarMiembro(${m.miembro_id})">🗑️</button>
                    </td>
                </tr>
            `;
        });
        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) { console.error(error); }
}

async function cargarCiudades() {
    const res = await fetch('/ciudades');
    const ciudades = await res.json();
    const selects = document.querySelectorAll('.select-ciudades');
    let options = '<option value="">-- Seleccionar Ciudad --</option>';
    ciudades.forEach(c => options += `<option value="${c.nombre_ciudad}">${c.nombre_ciudad}</option>`);
    selects.forEach(s => s.innerHTML = options);
}

function toggleSeccion(id, btn) {
    const div = document.getElementById(id);
    if(div.classList.contains('d-none')){
        div.classList.remove('d-none');
        btn.innerText = "⬆ Ocultar campos opcionales";
    } else {
        div.classList.add('d-none');
        btn.innerText = "⬇ Mostrar campos opcionales (Biografía, Foto, Ciudad)";
    }
}

async function abrirEditar(id) {
    const res = await fetch(`/miembros/${id}`);
    const m = await res.json();
    
    document.getElementById('edit-id').value = m.miembro_id;
    document.getElementById('edit-correo').value = m.correo;
    document.getElementById('edit-nombres').value = m.nombres;
    document.getElementById('edit-apellidos').value = m.apellidos;
    document.getElementById('edit-estatus').value = m.estatus;
    document.getElementById('edit-foto').value = m.foto_perfil_url || '';
    document.getElementById('edit-biografia').value = m.biografia || '';
    document.getElementById('edit-ciudad').value = m.nombre_ciudad || '';

    new bootstrap.Modal(document.getElementById('modalEdicion')).show();
}

document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombres: document.getElementById('reg-nombres').value,
        apellidos: document.getElementById('reg-apellidos').value,
        correo: document.getElementById('reg-correo').value,
        password: document.getElementById('reg-password').value,
        foto_perfil_url: document.getElementById('reg-foto').value,
        biografia: document.getElementById('reg-biografia').value,
        ciudad: document.getElementById('reg-ciudad').value
    };

    const res = await fetch('/miembros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalRegistro')).hide();
        alert('✅ Miembro registrado');
        cargarMiembros();
        e.target.reset();
    }
});

document.getElementById('form-edicion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const payload = {
        nombres: document.getElementById('edit-nombres').value,
        apellidos: document.getElementById('edit-apellidos').value,
        correo: document.getElementById('edit-correo').value,
        estatus: document.getElementById('edit-estatus').value,
        foto_perfil_url: document.getElementById('edit-foto').value,
        biografia: document.getElementById('edit-biografia').value,
        nombre_ciudad: document.getElementById('edit-ciudad').value
    };

    const res = await fetch(`/miembros/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalEdicion')).hide();
        alert('✅ Actualizado con éxito');
        cargarMiembros(paginaActual);
    }
});

// (Funciones de ordenar, cambiarOrden, renderizarPaginacion y eliminar se mantienen iguales)
function ordenar(columna) {
    if (ordenColumna === columna) {
        ordenDireccion = ordenDireccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenColumna = columna;
        ordenDireccion = 'ASC';
    }
    document.getElementById('select-orden').value = columna;
    cargarMiembros(1);
}

function cambiarOrden() {
    ordenColumna = document.getElementById('select-orden').value;
    ordenDireccion = 'ASC';
    cargarMiembros(1);
}

function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    nav.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `<li class="page-item ${i === actual ? 'active' : ''}"><button class="page-link" onclick="cargarMiembros(${i})">${i}</button></li>`;
    }
}

async function eliminarMiembro(id) {
    if (confirm('¿Eliminar miembro definitivamente?')) {
        await fetch(`/miembros/${id}`, { method: 'DELETE' });
        cargarMiembros(paginaActual);
    }
}

function abrirModalRegistro() { new bootstrap.Modal(document.getElementById('modalRegistro')).show(); }