let paginaActual = 1;
let ordenColumna = 'fecha_hora_evento'; // Por defecto ordenamos por fecha
let ordenDireccion = 'DESC'; // Los más recientes primero

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado - Iniciando Eventos...");
    cargarEventos();
    
    // Búsqueda en tiempo real
    document.getElementById('input-busqueda').addEventListener('input', () => cargarEventos(1));
});

// ==========================================
// FUNCIONES GLOBALES
// ==========================================

async function cargarEventos(pagina = 1) {
    paginaActual = pagina;
    const busqueda = document.getElementById('input-busqueda').value;

    // Sincronizar select si se cambió manualmente (opcional)
    // const selectOrden = document.getElementById('select-orden').value;

    try {
        const url = `/eventos?pagina=${pagina}&busqueda=${busqueda}&orden=${ordenColumna}&dir=${ordenDireccion}`;
        const res = await fetch(url);
        
        if(!res.ok) throw new Error("Error en respuesta del servidor");

        const data = await res.json();
        const tbody = document.getElementById('tabla-eventos');
        tbody.innerHTML = '';

        if(data.datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No se encontraron eventos.</td></tr>';
            document.getElementById('paginacion').innerHTML = '';
            return;
        }

        data.datos.forEach(e => {
            // Estilos de badges similares a grupos
            let badgeClass = 'bg-secondary';
            if(e.tipo_evento === 'Conferencia') badgeClass = 'bg-primary';
            if(e.tipo_evento === 'Taller') badgeClass = 'bg-success';
            if(e.tipo_evento === 'Deportivo') badgeClass = 'bg-danger';

            // Formato de fecha seguro
            const fecha = new Date(e.fecha_hora_evento).toLocaleString('es-VE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const organizador = e.nombres ? `${e.nombres} ${e.apellidos}` : 'Desconocido';

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold text-primary">${e.nombre_evento}</td>
                    <td><small class="text-muted text-truncate-2">${e.descripcion || 'Sin descripción'}</small></td>

                    <td>${fecha}</td>
                    <td>${e.lugar}</td>
                    <td><small>${organizador}</small></td>
                </tr>
            `;
        });

        renderizarPaginacion(data.totalPaginas, data.paginaActual);

    } catch (error) {
        console.error("Error cargando eventos:", error);
        document.getElementById('tabla-eventos').innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error de conexión: ${error.message}</td></tr>`;
    }
}

// Función para ordenar al hacer click en encabezados (Igual que en grupos.js)
function ordenar(columna) {
    if (ordenColumna === columna) {
        ordenDireccion = ordenDireccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenColumna = columna;
        ordenDireccion = 'ASC';
    }
    // Actualizar select visualmente
    const select = document.getElementById('select-orden');
    if(select) select.value = columna;
    
    cargarEventos(1);
}

// Función para ordenar desde el select
function cambiarOrdenSelect() {
    ordenColumna = document.getElementById('select-orden').value;
    ordenDireccion = 'ASC'; // Reset a ascendente al cambiar por select
    cargarEventos(1);
}

// Función de Paginación (Reutilizable)
function renderizarPaginacion(totalPaginas, paginaActual) {
    const nav = document.getElementById('paginacion');
    nav.innerHTML = '';
    
    if (totalPaginas <= 1) return;

    // Botón Anterior
    const prevClass = paginaActual === 1 ? 'disabled' : '';
    nav.innerHTML += `
        <li class="page-item ${prevClass}">
            <button class="page-link" onclick="cargarEventos(${paginaActual - 1})">Anterior</button>
        </li>`;

    // Botones Numéricos
    for (let i = 1; i <= totalPaginas; i++) {
        const activeClass = i === paginaActual ? 'active' : '';
        nav.innerHTML += `
            <li class="page-item ${activeClass}">
                <button class="page-link" onclick="cargarEventos(${i})">${i}</button>
            </li>`;
    }

    // Botón Siguiente
    const nextClass = paginaActual === totalPaginas ? 'disabled' : '';
    nav.innerHTML += `
        <li class="page-item ${nextClass}">
            <button class="page-link" onclick="cargarEventos(${paginaActual + 1})">Siguiente</button>
        </li>`;
}

// Exponer funciones al window para el HTML
window.cargarEventos = cargarEventos;
window.ordenar = ordenar;
window.cambiarOrdenSelect = cambiarOrdenSelect;