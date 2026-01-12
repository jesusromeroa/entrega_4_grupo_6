let paginaActual = 1;
let ordenColumna = 'miembro_id';
let ordenDireccion = 'ASC';

document.addEventListener('DOMContentLoaded', () => {
    cargarProfesores();
    cargarCandidatos();

    // Búsqueda en tiempo real
    document.getElementById('input-busqueda').addEventListener('input', () => {
        cargarProfesores(1);
    });
});

async function cargarProfesores(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;
    const selectOrden = document.getElementById('select-orden').value;
    
    if(selectOrden !== ordenColumna) ordenColumna = selectOrden;

    try {
        const url = `/profesores?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`;
        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById('tabla-profesores');
        tbody.innerHTML = '';

        data.datos.forEach(prof => {
            // Badges con colores distintos para diferenciarlos visualmente
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">#${prof.miembro_id}</td>
                    <td>
                        <div>${prof.nombres} ${prof.apellidos}</div>
                        <small class="text-muted">${prof.correo}</small>
                    </td>
                    <td><span class="badge bg-primary">${prof.escalafon || 'Sin asignar'}</span></td>
                    <td><span class="badge bg-info text-dark">${prof.tipo_contrato || 'Sin asignar'}</span></td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" onclick="abrirEditar(${prof.miembro_id})" title="Editar">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarProfesor(${prof.miembro_id})" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) {
        console.error("Error al cargar profesores:", error);
    }
}

// Cargar miembros disponibles para el select de registro
// public/js/profesores.js

async function cargarCandidatos() {
    try {
        const res = await fetch('/profesores/candidatos');
        const miembros = await res.json();
        const select = document.getElementById('reg-miembro');
        
        select.innerHTML = '<option value="">-- Seleccionar Miembro --</option>';
        
        miembros.forEach(m => {
            // CORRECCIÓN: Ahora mostramos ID y Correo sin errores
            select.innerHTML += `
                <option value="${m.miembro_id}">
                    ${m.nombres} ${m.nombres} (ID: ${m.miembro_id})
                </option>`;
        });
    } catch (error) {
        console.error("Error al cargar candidatos:", error);
    }
}

async function abrirEditar(id) {
    try {
        const res = await fetch(`/profesores/${id}`);
        const prof = await res.json();
        
        document.getElementById('edit-id').value = prof.miembro_id;
        document.getElementById('edit-nombre-display').value = `${prof.nombres} ${prof.apellidos}`;
        document.getElementById('edit-escalafon').value = prof.escalafon;
        document.getElementById('edit-contrato').value = prof.tipo_contrato;

        new bootstrap.Modal(document.getElementById('modalEdicion')).show();
    } catch (error) {
        alert("Error al cargar datos");
    }
}

// Actualizar (PUT)
document.getElementById('form-edicion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const payload = {
        escalafon: document.getElementById('edit-escalafon').value,
        tipo_contrato: document.getElementById('edit-contrato').value
    };

    const res = await fetch(`/profesores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalEdicion')).hide();
        alert('✅ Profesor actualizado');
        cargarProfesores(paginaActual);
    } else {
        alert('❌ Error al actualizar');
    }
});

// Crear (POST)
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        miembro_id: document.getElementById('reg-miembro').value,
        escalafon: document.getElementById('reg-escalafon').value,
        tipo_contrato: document.getElementById('reg-contrato').value
    };

    const res = await fetch('/profesores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalRegistro')).hide();
        alert('✅ Profesor registrado correctamente');
        cargarProfesores(1);
        cargarCandidatos();
        e.target.reset();
    } else {
        const data = await res.json();
        alert('❌ Error: ' + data.error);
    }
});

// Eliminar (DELETE)
async function eliminarProfesor(id) {
    if (confirm('¿Desea quitar el rol de Profesor a este miembro? (El usuario seguirá existiendo en el sistema)')) {
        await fetch(`/profesores/${id}`, { method: 'DELETE' });
        cargarProfesores(paginaActual);
        cargarCandidatos();
    }
}

// Funciones auxiliares (Orden y Paginación)
function ordenar(columna) {
    if (ordenColumna === columna) {
        ordenDireccion = ordenDireccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenColumna = columna;
        ordenDireccion = 'ASC';
    }
    document.getElementById('select-orden').value = columna;
    cargarProfesores(1);
}

function cambiarOrden() {
    ordenColumna = document.getElementById('select-orden').value;
    ordenDireccion = 'ASC';
    cargarProfesores(1);
}

function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    nav.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `
            <li class="page-item ${i === actual ? 'active' : ''}">
                <button class="page-link" onclick="cargarProfesores(${i})">${i}</button>
            </li>
        `;
    }
}

function abrirModalRegistro() {
    new bootstrap.Modal(document.getElementById('modalRegistro')).show();
}