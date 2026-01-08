document.addEventListener('DOMContentLoaded', () => {
    cargarEstudiantes();
});

// LISTAR
async function cargarEstudiantes() {
    const res = await fetch('/estudiantes');
    const datos = await res.json();
    const tbody = document.getElementById('tabla-estudiantes');
    tbody.innerHTML = '';

    datos.forEach(est => {
        tbody.innerHTML += `
            <tr>
                <td>${est.estudiante_id}</td>
                <td>${est.nombres} ${est.apellidos}</td>
                <td>${est.semestre_actual || '-'}</td>
                <td><span class="badge bg-info">${est.situacion_academica || 'N/A'}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="abrirEditar(${est.estudiante_id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarEstudiante(${est.estudiante_id})">🗑️</button>
                </td>
            </tr>
        `;
    });
}

// ABRIR REGISTRO (Cargar dropdown)
async function abrirModalRegistro() {
    // 1. Obtener candidatos (Miembros que no son estudiantes)
    const res = await fetch('/estudiantes/candidatos');
    const candidatos = await res.json();
    
    const select = document.getElementById('reg-miembro');
    select.innerHTML = '<option value="">-- Selecciona un Miembro --</option>';
    
    candidatos.forEach(c => {
        select.innerHTML += `<option value="${c.miembro_id}">${c.nombres} ${c.apellidos}</option>`;
    });

    // 2. Mostrar modal
    new bootstrap.Modal(document.getElementById('modalRegistro')).show();
}

// GUARDAR NUEVO
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
        miembro_id: document.getElementById('reg-miembro').value,
        semestre: document.getElementById('reg-semestre').value,
        situacion: document.getElementById('reg-situacion').value
    };

    const res = await fetch('/estudiantes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(datos)
    });

    if(res.ok) {
        alert('Estudiante registrado');
        location.reload();
    } else {
        const err = await res.json();
        alert('Error: ' + err.error);
    }
});

// ABRIR EDICIÓN
async function abrirEditar(id) {
    const res = await fetch(`/estudiantes/${id}`);
    const est = await res.json();

    document.getElementById('edit-id').value = est.estudiante_id;
    document.getElementById('edit-nombre-display').value = `${est.nombres} ${est.apellidos}`; // Solo lectura
    document.getElementById('edit-semestre').value = est.semestre_actual;
    document.getElementById('edit-situacion').value = est.situacion_academica;

    new bootstrap.Modal(document.getElementById('modalEdicion')).show();
}

// GUARDAR EDICIÓN
document.getElementById('form-edicion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const datos = {
        semestre: document.getElementById('edit-semestre').value,
        situacion: document.getElementById('edit-situacion').value
    };

    await fetch(`/estudiantes/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(datos)
    });
    
    location.reload();
});

// ELIMINAR
async function eliminarEstudiante(id) {
    if(!confirm('¿Seguro? El miembro seguirá existiendo, pero ya no será estudiante.')) return;
    
    await fetch(`/estudiantes/${id}`, { method: 'DELETE' });
    cargarEstudiantes();
}
