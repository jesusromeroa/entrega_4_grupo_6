let paginaActual = 1;
let ordenColumna = 'miembro_id';
let ordenDireccion = 'ASC';

document.addEventListener('DOMContentLoaded', () => {
    cargarEstudiantes();
    cargarCandidatos();

    // Escuchar búsqueda en tiempo real
    document.getElementById('input-busqueda').addEventListener('input', () => {
        cargarEstudiantes(1);
    });
});

async function cargarEstudiantes(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;
    const selectOrden = document.getElementById('select-orden').value;
    
    // Si se cambió el select, actualizamos el orden base
    if(selectOrden !== ordenColumna) ordenColumna = selectOrden;

    try {
        const url = `/estudiantes?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`;
        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById('tabla-estudiantes');
        tbody.innerHTML = '';

        data.datos.forEach(est => {
            // Lógica de colores para la situación académica
            let badgeClass = 'bg-secondary';
            if (est.situacion_academica === 'Activo') badgeClass = 'bg-success';
            if (est.situacion_academica === 'Probatorio') badgeClass = 'bg-warning text-dark';
            if (est.situacion_academica === 'Retirado') badgeClass = 'bg-danger';

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">#${est.miembro_id}</td>
                    <td>
                        <div>${est.nombres} ${est.apellidos}</div>
                        <small class="text-muted">${est.correo}</small>
                    </td>
                    <td><span class="badge rounded-pill bg-dark">Semestre ${est.semestre_actual || '?'}</span></td>
                    <td><span class="badge ${badgeClass}">${est.situacion_academica || 'N/A'}</span></td>
                    <td class="text-center">
                        <button class="btn btn-outline-danger btn-sm" onclick="eliminarEstudiante(${est.miembro_id})">
                            🗑️ Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) {
        console.error("Error al cargar estudiantes:", error);
    }
}

// Cambiar orden desde las cabeceras (clic en ↕)
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

// Cambiar orden desde el Select
function cambiarOrden() {
    ordenColumna = document.getElementById('select-orden').value;
    ordenDireccion = 'ASC';
    cargarEstudiantes(1);
}

function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    nav.innerHTML = '';

    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `
            <li class="page-item ${i === actual ? 'active' : ''}">
                <button class="page-link" onclick="cargarEstudiantes(${i})">${i}</button>
            </li>
        `;
    }
}

async function cargarCandidatos() {
    const res = await fetch('/estudiantes/candidatos');
    const miembros = await res.json();
    const select = document.getElementById('reg-miembro');
    select.innerHTML = '<option value="">-- Seleccionar Miembro UCAB --</option>';
    miembros.forEach(m => {
        select.innerHTML += `<option value="${m.miembro_id}">${m.nombres} ${m.apellidos} (${m.correo})</option>`;
    });
}

// Evento de envío de formulario corregido
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
        cargarEstudiantes();
        cargarCandidatos();
        e.target.reset();
    } else {
        alert('❌ Error: ' + data.error);
    }
});

function abrirModalRegistro() {
    new bootstrap.Modal(document.getElementById('modalRegistro')).show();
}

async function eliminarEstudiante(id) {
    if (confirm('¿Seguro que desea quitar este miembro de la lista de estudiantes?')) {
        await fetch(`/estudiantes/${id}`, { method: 'DELETE' });
        cargarEstudiantes(paginaActual);
        cargarCandidatos();
    }
}