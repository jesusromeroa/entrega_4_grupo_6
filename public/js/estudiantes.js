let paginaActual = 1;
let ordenColumna = 'miembro_id';
let ordenDireccion = 'ASC';

document.addEventListener('DOMContentLoaded', () => {
    cargarEstudiantes();
    cargarCandidatos();

    // Buscador en tiempo real
    document.getElementById('input-busqueda').addEventListener('input', () => {
        cargarEstudiantes(1);
    });
});

async function cargarEstudiantes(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;
    const selectOrden = document.getElementById('select-orden').value;
    
    if(selectOrden !== ordenColumna) ordenColumna = selectOrden;

    try {
        const url = `/estudiantes?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`;
        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById('tabla-estudiantes');
        tbody.innerHTML = '';

        data.datos.forEach(est => {
            // Colores dinámicos para los badges de situación
            let badgeClass = 'bg-success';
            if (est.situacion_academica === 'Probatorio') badgeClass = 'bg-warning text-dark';
            if (est.situacion_academica === 'Retirado') badgeClass = 'bg-danger';
            if (est.situacion_academica === 'Tesis') badgeClass = 'bg-info text-dark';

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">#${est.miembro_id}</td>
                    <td>
                        <div>${est.nombres} ${est.apellidos}</div>
                        <small class="text-muted">${est.correo}</small>
                    </td>
                    <td><span class="badge rounded-pill bg-dark">Semestre ${est.semestre_actual || '?'}</span></td>
                    <td><span class="badge ${badgeClass}">${est.situacion_academica || 'Activo'}</span></td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" onclick="abrirEditar(${est.miembro_id})" title="Editar">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarEstudiante(${est.miembro_id})" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) {
        console.error("Error al cargar estudiantes:", error);
    }
}

// Carga miembros que no son estudiantes para el select del modal
async function cargarCandidatos() {
    try {
        const res = await fetch('/estudiantes/candidatos');
        const miembros = await res.json();
        const select = document.getElementById('reg-miembro');
        select.innerHTML = '<option value="">-- Seleccionar Miembro --</option>';
        miembros.forEach(m => {
            select.innerHTML += `<option value="${m.miembro_id}">${m.nombres} ${m.apellidos} (ID: ${m.miembro_id})</option>`;
        });
    } catch (error) {
        console.error("Error al cargar candidatos:", error);
    }
}

// Abrir modal de edición y cargar datos específicos
async function abrirEditar(id) {
    try {
        const res = await fetch(`/estudiantes/${id}`);
        const est = await res.json();
        
        document.getElementById('edit-id').value = est.miembro_id;
        document.getElementById('edit-nombre-display').value = `${est.nombres} ${est.apellidos}`;
        document.getElementById('edit-semestre').value = est.semestre_actual;
        document.getElementById('edit-situacion').value = est.situacion_academica;

        new bootstrap.Modal(document.getElementById('modalEdicion')).show();
    } catch (error) {
        alert("Error al cargar datos del estudiante");
    }
}

// Procesar actualización (PUT)
document.getElementById('form-edicion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const payload = {
        semestre_actual: document.getElementById('edit-semestre').value,
        situacion_academica: document.getElementById('edit-situacion').value
    };

    const res = await fetch(`/estudiantes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalEdicion')).hide();
        alert('✅ Información actualizada con éxito');
        cargarEstudiantes(paginaActual);
    } else {
        alert('❌ Error al actualizar');
    }
});

// Procesar registro (POST)
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        miembro_id: document.getElementById('reg-miembro').value,
        semestre_actual: document.getElementById('reg-semestre').value,
        situacion_academica: document.getElementById('reg-situacion').value
    };

    const res = await fetch('/estudiantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalRegistro')).hide();
        alert('✅ Estudiante registrado correctamente');
        cargarEstudiantes(1);
        cargarCandidatos();
        e.target.reset();
    } else {
        alert('❌ Error: ' + data.error);
    }
});

// Eliminar registro de estudiante (DELETE)
async function eliminarEstudiante(id) {
    if (confirm('¿Seguro que desea eliminar a este estudiante? El miembro seguirá existiendo, pero perderá su estatus estudiantil.')) {
        try {
            await fetch(`/estudiantes/${id}`, { method: 'DELETE' });
            cargarEstudiantes(paginaActual);
            cargarCandidatos();
        } catch (error) {
            alert("Error al eliminar");
        }
    }
}

// Lógica de Paginación
function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    if (!nav) return;
    nav.innerHTML = '';

    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `
            <li class="page-item ${i === actual ? 'active' : ''}">
                <button class="page-link" onclick="cargarEstudiantes(${i})">${i}</button>
            </li>
        `;
    }
}

// Lógica de Ordenamiento
function ordenar(columna) {
    if (ordenColumna === columna) {
        ordenDireccion = ordenDireccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenColumna = columna;
        ordenDireccion = 'ASC';
    }
    document.getElementById('select-orden').value = columna;
    cargarEstudiantes(1);
}

function cambiarOrden() {
    ordenColumna = document.getElementById('select-orden').value;
    ordenDireccion = 'ASC';
    cargarEstudiantes(1);
}

function abrirModalRegistro() {
    new bootstrap.Modal(document.getElementById('modalRegistro')).show();
}