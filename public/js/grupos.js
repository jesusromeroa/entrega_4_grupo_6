let paginaActual = 1;
let ordenColumna = 'nombre_grupo';
let ordenDireccion = 'ASC';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado - Iniciando Grupos...");
    cargarGrupos();
    cargarCreadores();
    document.getElementById('input-busqueda').addEventListener('input', () => cargarGrupos(1));
});

// ==========================================
// FUNCIONES GLOBALES (ACCESIBLES DESDE HTML)
// ==========================================

// 1. Cargar la Tabla
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

            // ATENCIÓN: Usamos href="javascript:void(0)" para evitar saltos de página
            // y escapamos el nombre del grupo para evitar errores de comillas
            const nombreSafe = g.nombre_grupo.replace(/'/g, "\\'"); 

            tbody.innerHTML += `
                <tr>
                    <td>
                        <a href="javascript:void(0)" class="text-decoration-none fw-bold text-primary" 
                           onclick="verMiembros('${nombreSafe}')" title="Ver integrantes">
                            ${g.nombre_grupo} 👥
                        </a>
                    </td>
                    <td><small>${g.descripcion || 'Sin descripción'}</small></td>
                    <td><span class="badge ${badgeCat}">${g.categoria_grupo}</span></td>
                    <td><span class="badge ${badgeTipo}">${g.tipo_grupo}</span></td>
                    <td><small>${g.nombres ? g.nombres + ' ' + g.apellidos : 'Desconocido'}</small></td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" onclick="abrirEditar('${nombreSafe}')">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarGrupo('${nombreSafe}')">🗑️</button>
                    </td>
                </tr>
            `;
        });

        renderizarPaginacion(data.totalPaginas, data.paginaActual);
    } catch (error) { 
        console.error("Error cargando grupos:", error); 
    }
}

// 2. Ver Miembros (El Modal)
async function verMiembros(nombreGrupo) {
    console.log("Click detectado en grupo:", nombreGrupo); // <--- DEBUG

    try {
        // Referencia al modal
        const modalEl = document.getElementById('modalMiembros');
        if (!modalEl) {
            alert("Error crítico: No se encuentra el modal en el HTML");
            return;
        }

        // Mostrar título mientras carga
        document.getElementById('titulo-grupo-miembros').innerText = nombreGrupo;
        const tbody = document.getElementById('lista-miembros-grupo');
        const msgVacio = document.getElementById('sin-miembros');
        
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-primary">Cargando datos...</td></tr>';
        
        // Abrir modal inmediatamente para feedback visual
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // Petición al servidor
        const url = `/grupos/${encodeURIComponent(nombreGrupo)}/miembros`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error("Error en la petición al servidor");

        const miembros = await res.json();
        console.log("Miembros recibidos:", miembros); // <--- DEBUG

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
    } catch (error) {
        console.error("Error en verMiembros:", error);
        alert('❌ Ocurrió un error al cargar los miembros. Revisa la consola (F12).');
    }
}

// Hacemos las funciones accesibles globalmente
window.verMiembros = verMiembros;
window.abrirEditar = abrirEditar;
window.eliminarGrupo = eliminarGrupo;
window.cargarGrupos = cargarGrupos;

// ... (Resto de funciones: cargarCreadores, form-registro, etc. pueden ir aquí abajo) ...

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
        alert('✅ Grupo creado');
        cargarGrupos(1);
        e.target.reset();
    } else {
        const err = await res.json();
        alert('❌ Error: ' + err.error);
    }
});

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
        alert('✅ Actualizado');
        cargarGrupos(paginaActual);
    }
});

async function eliminarGrupo(nombre) {
    if (confirm(`¿Eliminar grupo "${nombre}"?`)) {
        await fetch(`/grupos/${encodeURIComponent(nombre)}`, { method: 'DELETE' });
        cargarGrupos(paginaActual);
    }
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
    // Busca el modal por su ID y lo muestra
    const modal = new bootstrap.Modal(document.getElementById('modalRegistro'));
    modal.show();
}

// Hacemos la función visible para el botón HTML
window.abrirModalRegistro = abrirModalRegistro;