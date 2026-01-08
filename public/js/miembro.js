// Variables de estado
let paginaActual = 1;
let ordenColumna = 'miembro_id';
let ordenDireccion = 'ASC';

// --- FUNCIONES PRINCIPALES ---

document.addEventListener('DOMContentLoaded', () => {
    cargarMiembros();
    cargarCiudades();
});

async function cargarMiembros(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;

    try {
        // Notar que la URL es relativa, ya no hace falta 'http://localhost:3000' si estamos en el mismo server
        const res = await fetch(`/miembros?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`);
        const data = await res.json();

        const tbody = document.getElementById('tabla-miembros');
        tbody.innerHTML = '';

        data.datos.forEach(miembro => {
            const row = `
                <tr>
                    <td>${miembro.miembro_id}</td>
                    <td>${miembro.nombres}</td>
                    <td>${miembro.apellidos}</td>
                    <td>${miembro.correo}</td>
                    <td>${miembro.estatus || 'Activo'}</td>
                    <td>
                        <button class="btn btn-warning btn-sm me-2" onclick="abrirModalEditar(${miembro.miembro_id})">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarMiembro(${miembro.miembro_id})">🗑️</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        actualizarPaginacion(data.paginaActual, data.totalPaginas);
    } catch (error) {
        console.error('Error cargando miembros:', error);
    }
}

function actualizarPaginacion(actual, total) {
    const paginacion = document.getElementById('paginacion');
    paginacion.innerHTML = '';

    // Botón Anterior
    const prevDisabled = actual === 1 ? 'disabled' : '';
    paginacion.innerHTML += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link" onclick="cargarMiembros(${actual - 1})">Anterior</button>
        </li>
    `;

    // Números
    for (let i = 1; i <= total; i++) {
        const active = i === actual ? 'active' : '';
        paginacion.innerHTML += `
            <li class="page-item ${active}">
                <button class="page-link" onclick="cargarMiembros(${i})">${i}</button>
            </li>
        `;
    }

    // Botón Siguiente
    const nextDisabled = actual === total ? 'disabled' : '';
    paginacion.innerHTML += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link" onclick="cargarMiembros(${actual + 1})">Siguiente</button>
        </li>
    `;
}

async function cargarCiudades() {
    try {
        const res = await fetch('/ciudades');
        const ciudades = await res.json();
        
        const opciones = '<option value="">-- Selecciona --</option>' + 
                         ciudades.map(c => `<option value="${c.nombre_ciudad}">${c.nombre_ciudad}</option>`).join('');

        const selectReg = document.getElementById('reg-ciudad');
        const selectEdit = document.getElementById('edit-ciudad');
        
        if (selectReg) selectReg.innerHTML = opciones;
        if (selectEdit) selectEdit.innerHTML = opciones;

    } catch (error) {
        console.error("Error cargando ciudades:", error);
    }
}

// --- ORDENAMIENTO Y BÚSQUEDA ---

function ordenar(columna) {
    if (ordenColumna === columna) {
        ordenDireccion = ordenDireccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenColumna = columna;
        ordenDireccion = 'ASC';
    }
    cargarMiembros(1);
}

document.getElementById('btn-buscar').addEventListener('click', () => cargarMiembros(1));

// --- CREAR (POST) ---

document.getElementById('form-registro').addEventListener('submit', async function(e) {
    e.preventDefault();
    const datos = {
        nombres: document.getElementById('reg-nombres').value,
        apellidos: document.getElementById('reg-apellidos').value,
        correo: document.getElementById('reg-correo').value,
        password: document.getElementById('reg-password').value,
        foto_perfil_url: document.getElementById('reg-foto').value,
        biografia: document.getElementById('reg-biografia').value,
        ciudad: document.getElementById('reg-ciudad').value
    };

    try {
        const res = await fetch('/miembros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            alert('Miembro creado con éxito');
            document.getElementById('form-registro').reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistro'));
            modal.hide();
            cargarMiembros(1);
        } else {
            alert('Error al registrar');
        }
    } catch (error) {
        console.error(error);
    }
});

// --- EDITAR (PUT) ---

async function abrirModalEditar(id) {
    const res = await fetch(`/miembros/${id}`);
    const miembro = await res.json();

    document.getElementById('edit-id').value = miembro.miembro_id;
    document.getElementById('edit-nombres').value = miembro.nombres;
    document.getElementById('edit-apellidos').value = miembro.apellidos;
    document.getElementById('edit-correo').value = miembro.correo;
    document.getElementById('edit-estatus').value = miembro.estatus;
    document.getElementById('edit-foto').value = miembro.foto_perfil_url || '';
    document.getElementById('edit-biografia').value = miembro.biografia || '';
    document.getElementById('edit-ciudad').value = miembro.nombre_ciudad || '';

    const modal = new bootstrap.Modal(document.getElementById('modalEdicion'));
    modal.show();
}

document.getElementById('form-edicion').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const datos = {
        nombres: document.getElementById('edit-nombres').value,
        apellidos: document.getElementById('edit-apellidos').value,
        correo: document.getElementById('edit-correo').value,
        estatus: document.getElementById('edit-estatus').value,
        foto_perfil_url: document.getElementById('edit-foto').value,
        biografia: document.getElementById('edit-biografia').value,
        nombre_ciudad: document.getElementById('edit-ciudad').value
    };

    try {
        const res = await fetch(`/miembros/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if(res.ok) {
            alert('Actualizado correctamente');
            location.reload(); 
        } else {
            alert('Error actualizando');
        }
    } catch (error) {
        console.error(error);
    }
});

// --- ELIMINAR (DELETE) ---

async function eliminarMiembro(id) {
    if (!confirm("¿Estás seguro de eliminar este miembro?")) return;

    try {
        const res = await fetch(`/miembros/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert("Eliminado correctamente");
            cargarMiembros(paginaActual);
        } else {
            alert("Error eliminando");
        }
    } catch (error) {
        console.error(error);
    }
}

// --- UTILIDADES VISUALES (Mostrar/Ocultar Opcionales) ---

function toggleOpcionales(btnId, divId) {
    const btn = document.getElementById(btnId);
    if(btn) {
        btn.addEventListener('click', function() {
            const seccion = document.getElementById(divId);
            if (seccion.classList.contains('d-none')) {
                seccion.classList.remove('d-none');
                btn.innerText = "⬆ Ocultar campos opcionales";
            } else {
                seccion.classList.add('d-none');
                btn.innerText = "⬇ Mostrar campos opcionales";
            }
        });
    }
}

toggleOpcionales('btn-toggle-opcionales', 'seccion-opcionales');
toggleOpcionales('btn-toggle-edit-opcionales', 'seccion-edit-opcionales');