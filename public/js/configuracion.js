document.addEventListener('DOMContentLoaded', () => {
    cargarRoles();
    cargarElecciones();
});

// --- LÓGICA DE ROLES ---

async function cargarRoles() {
    const tbody = document.getElementById('tabla-roles');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';

    try {
        const res = await fetch('/admin/roles');
        const roles = await res.json();
        
        tbody.innerHTML = '';
        if(roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay roles definidos.</td></tr>';
            return;
        }

        roles.forEach(r => {
            tbody.innerHTML += `
                <tr>
                    <td>${r.id}</td>
                    <td class="fw-bold">${r.nombre}</td>
                    <td>${r.descripcion}</td>
                    <td><span class="badge bg-success">Activo</span></td>
                </tr>
            `;
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error cargando datos.</td></tr>';
    }
}

document.getElementById('form-rol').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombre: document.getElementById('rol-nombre').value,
        descripcion: document.getElementById('rol-desc').value
    };

    try {
        const res = await fetch('/admin/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert('✅ Nuevo rol creado exitosamente');
            e.target.reset();
            cargarRoles();
        } else {
            alert('Error creando rol');
        }
    } catch (error) { alert('Error de conexión'); }
});

// --- LÓGICA DE ELECCIONES ---

async function cargarElecciones() {
    const tbody = document.getElementById('tabla-elecciones');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';

    try {
        const res = await fetch('/admin/elecciones');
        const lista = await res.json();
        
        tbody.innerHTML = '';
        if(lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay elecciones registradas.</td></tr>';
            return;
        }

        lista.forEach(e => {
            const estadoBadge = e.estado === 'Activo' ? 'bg-success' : 'bg-secondary';
            const btnAccion = e.estado === 'Activo' 
                ? `<button class="btn btn-sm btn-outline-danger" onclick="cerrarEleccion(${e.id})">Cerrar</button>` 
                : '<span class="text-muted small">Finalizado</span>';

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${e.titulo}</td>
                    <td>${e.fecha}</td>
                    <td><span class="badge ${estadoBadge}">${e.estado}</span></td>
                    <td>${btnAccion}</td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
}

document.getElementById('form-eleccion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        titulo: document.getElementById('elec-titulo').value,
        fecha: document.getElementById('elec-fecha').value
    };

    try {
        const res = await fetch('/admin/elecciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert('✅ Convocatoria publicada');
            e.target.reset();
            cargarElecciones();
        }
    } catch (error) { alert('Error de conexión'); }
});

async function cerrarEleccion(id) {
    if(!confirm('¿Seguro que desea cerrar este proceso electoral?')) return;
    
    try {
        await fetch(`/admin/elecciones/${id}/cerrar`, { method: 'PUT' });
        cargarElecciones();
    } catch (error) { alert('Error cerrando elección'); }
}