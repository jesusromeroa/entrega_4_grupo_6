let paginaActual = 1;
let ordenColumna = 'nombre_grupo';
let ordenDireccion = 'ASC';

document.addEventListener('DOMContentLoaded', () => {
    cargarGrupos();
    cargarCreadores();
    document.getElementById('input-busqueda').addEventListener('input', () => cargarGrupos(1));
});

async function cargarGrupos(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;
    const selectOrden = document.getElementById('select-orden').value;
    
    if(selectOrden !== ordenColumna) ordenColumna = selectOrden;

    try {
        const url = `/grupos?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`;
        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById('tabla-grupos');
        tbody.innerHTML = '';

        data.datos.forEach(g => {
            let badgeTipo = g.tipo_grupo === 'Publico' ? 'bg-success' : 'bg-secondary';
            let badgeCat = 'bg-primary'; 
            if(g.categoria_grupo === 'Deportivo') badgeCat = 'bg-danger';
            if(g.categoria_grupo === 'Académico') badgeCat = 'bg-info text-dark';

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${g.nombre_grupo}</td>
                    <td><small>${g.descripcion || 'Sin descripción'}</small></td>
                    <td><span class="badge ${badgeCat}">${g.categoria_grupo}</span></td>
                    <td><span class="badge ${badgeTipo}">${g.tipo_grupo}</span></td>
                    <td><small>${g.nombres ? g.nombres + ' ' + g.apellidos : 'Desconocido'}</small></td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" onclick="abrirEditar('${g.nombre_grupo}')">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarGrupo('${g.nombre_grupo}')">🗑️</button>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) { console.error(error); }
}

async function verMiembros(nombreGrupo) {
    try {
        document.getElementById('titulo-grupo-miembros').innerText = nombreGrupo;
        const tbody = document.getElementById('lista-miembros-grupo');
        const msgVacio = document.getElementById('sin-miembros');
        
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Cargando...</td></tr>';
        
        // Codificamos el nombre por si tiene espacios o caracteres especiales
        const url = `/grupos/${encodeURIComponent(nombreGrupo)}/miembros`;
        console.log("Consultando:", url); // Para ver en la consola del navegador

        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`Error del servidor: ${res.status} ${res.statusText}`);
        }

        const miembros = await res.json();
        
        tbody.innerHTML = '';

        if (miembros.length === 0) {
            msgVacio.classList.remove('d-none');
        } else {
            msgVacio.classList.add('d-none');
            miembros.forEach(m => {
                const fecha = new Date(m.fecha_union).toLocaleDateString();
                const rolBadge = m.rol === 'admin' ? 'bg-danger' : 'bg-secondary';

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div class="fw-bold">${m.nombres} ${m.apellidos}</div>
                            <small class="text-muted">${m.correo}</small>
                        </td>
                        <td><span class="badge ${rolBadge}">${m.rol}</span></td>
                        <td>${fecha}</td>
                    </tr>
                `;
            });
        }

        new bootstrap.Modal(document.getElementById('modalMiembros')).show();

    } catch (error) {
        console.error(error);
        alert('❌ Error: ' + error.message + '\n\nRevisa que el servidor esté corriendo y la ruta /grupos configurada en index.js');
    }
}

async function cargarCreadores() {
    try {
        const res = await fetch('/grupos/creadores');
        const miembros = await res.json();
        const select = document.getElementById('reg-creador');
        select.innerHTML = '<option value="">-- Seleccionar Creador --</option>';
        miembros.forEach(m => {
            select.innerHTML += `<option value="${m.miembro_id}">${m.nombres} ${m.apellidos} (${m.correo})</option>`;
        });
    } catch (error) { console.error(error); }
}

async function abrirEditar(nombreGrupo) {
    try {
        // Codificamos el nombre por si tiene espacios o caracteres especiales
        const res = await fetch(`/grupos/${encodeURIComponent(nombreGrupo)}`);
        const g = await res.json();
        
        document.getElementById('edit-id-original').value = g.nombre_grupo;
        document.getElementById('edit-nombre').value = g.nombre_grupo;
        document.getElementById('edit-descripcion').value = g.descripcion;
        document.getElementById('edit-tipo').value = g.tipo_grupo;
        document.getElementById('edit-categoria').value = g.categoria_grupo;

        new bootstrap.Modal(document.getElementById('modalEdicion')).show();
    } catch (error) { alert("Error al cargar datos"); }
}

// POST (Crear)
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombre_grupo: document.getElementById('reg-nombre').value,
        descripcion: document.getElementById('reg-descripcion').value,
        tipo_grupo: document.getElementById('reg-tipo').value,
        categoria_grupo: document.getElementById('reg-categoria').value,
        miembro_creador_id: document.getElementById('reg-creador').value
    };

    const res = await fetch('/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalRegistro')).hide();
        alert('✅ Grupo creado exitosamente');
        cargarGrupos(1);
        e.target.reset();
    } else {
        const err = await res.json();
        alert('❌ Error: ' + err.error);
    }
});

// PUT (Editar)
document.getElementById('form-edicion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idOriginal = document.getElementById('edit-id-original').value;
    const payload = {
        descripcion: document.getElementById('edit-descripcion').value,
        tipo_grupo: document.getElementById('edit-tipo').value,
        categoria_grupo: document.getElementById('edit-categoria').value
    };

    const res = await fetch(`/grupos/${encodeURIComponent(idOriginal)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalEdicion')).hide();
        alert('✅ Grupo actualizado');
        cargarGrupos(paginaActual);
    } else {
        alert('❌ Error al actualizar');
    }
});

// DELETE (Eliminar)
async function eliminarGrupo(nombre) {
    if (confirm(`¿Eliminar permanentemente el grupo "${nombre}"?`)) {
        await fetch(`/grupos/${encodeURIComponent(nombre)}`, { method: 'DELETE' });
        cargarGrupos(paginaActual);
    }
}

// Funciones Auxiliares
function ordenar(columna) {
    if (ordenColumna === columna) {
        ordenDireccion = ordenDireccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenColumna = columna;
        ordenDireccion = 'ASC';
    }
    document.getElementById('select-orden').value = columna;
    cargarGrupos(1);
}

function cambiarOrden() {
    ordenColumna = document.getElementById('select-orden').value;
    ordenDireccion = 'ASC';
    cargarGrupos(1);
}

function renderizarPaginacion(total, actual) {
    const nav = document.getElementById('paginacion');
    if(!nav) return;
    nav.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `<li class="page-item ${i === actual ? 'active' : ''}"><button class="page-link" onclick="cargarGrupos(${i})">${i}</button></li>`;
    }
}

function abrirModalRegistro() {
    new bootstrap.Modal(document.getElementById('modalRegistro')).show();
}