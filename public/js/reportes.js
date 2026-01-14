let datosGlobales = {};
let graficoExpandido = null; // Referencia para destruir gráficos anteriores en modal

document.addEventListener('DOMContentLoaded', () => {
    cargarDashboard();
});

async function cargarDashboard() {
    try {
        const res = await fetch('/reportes/dashboard');
        const data = await res.json();
        datosGlobales = data;

        // Llenar tablas
        llenarTablaDemografia(data.demografia);
        llenarTablaEmpleos(data.empleos);
        llenarTablaEngagement(data.engagement);
        llenarTablaBolsa(data.bolsa);
        llenarTablaBloqueados(data.bloqueados);
        llenarTablaVotaciones(data.votaciones);

        // Renderizar gráficos
        renderizarGraficoCrecimiento('chartCrecimiento', data.grafico_linea);
        renderizarGraficoGrupos('chartGrupos', data.tendencias);
        renderizarGraficoIntereses('chartIntereses', data.intereses);

    } catch (error) {
        console.error("Error cargando reportes:", error);
    }
}

// --- RENDERIZADORES DE GRÁFICOS (REUTILIZABLES) ---

function renderizarGraficoCrecimiento(canvasId, datos) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: datos.map(d => d.mes),
            datasets: [{
                label: 'Nuevos Miembros',
                data: datos.map(d => d.total_nuevos),
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true, tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderizarGraficoGrupos(canvasId, datos) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datos.map(d => d.nombre),
            datasets: [{
                label: 'Nuevos (30d)',
                data: datos.map(d => d.nuevos),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderizarGraficoIntereses(canvasId, datos) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: datos.map(d => d.nombre_area),
            datasets: [{
                data: datos.map(d => d.total_interesados),
                backgroundColor: ['#4BC0C0', '#FF9F40', '#9966FF', '#FF6384', '#36A2EB']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- LLENADO DE TABLAS ---

function llenarTablaDemografia(lista) {
    const tbody = document.getElementById('tabla-demografia');
    tbody.innerHTML = '';
    lista.forEach(item => {
        const rowClass = item.categoria === 'TOTAL MIEMBROS' ? 'table-primary fw-bold' : '';
        tbody.innerHTML += `<tr class="${rowClass}"><td>${item.categoria}</td><td>${item.total}</td><td class="text-success">+${item.u30}</td><td>${item.crecimiento || '0%'}</td></tr>`;
    });
}
function llenarTablaEmpleos(lista) {
    const tbody = document.getElementById('tabla-empleos');
    tbody.innerHTML = '';
    lista.forEach(e => tbody.innerHTML += `<tr><td>${e.titulo_cargo}</td><td class="text-center fw-bold">${e.total_postulaciones}</td><td><small>${e.origen}</small></td></tr>`);
}
function llenarTablaEngagement(lista) {
    const tbody = document.getElementById('tabla-engagement');
    tbody.innerHTML = '';
    lista.forEach(item => {
        let badge = item.clasificacion_engagement === 'Alto' ? '<span class="badge bg-success">Alto</span>' : '<span class="badge bg-secondary">Bajo</span>';
        tbody.innerHTML += `<tr><td title="${item.descripcion_texto}">Pub #${item.id_publicacion}</td><td class="text-center fw-bold">${item.puntaje_engagement}</td><td>${badge}</td></tr>`;
    });
}
function llenarTablaBolsa(lista) {
    const tbody = document.getElementById('tabla-bolsa');
    tbody.innerHTML = '';
    lista.forEach(u => tbody.innerHTML += `<tr><td><span class="badge ${u.rol === 'Estudiante' ? 'bg-primary' : 'bg-secondary'}">${u.rol}</span></td><td>${u.nombres} ${u.apellidos}</td><td><small>${u.detalle}</small></td></tr>`);
}
function llenarTablaBloqueados(lista) {
    const tbody = document.getElementById('tabla-bloqueados');
    tbody.innerHTML = '';
    lista.forEach(u => tbody.innerHTML += `<tr><td>${u.correo}</td><td>${u.nombres}</td><td><span class="badge bg-danger">${u.estatus}</span></td></tr>`);
}
function llenarTablaVotaciones(lista) {
    const tbody = document.getElementById('tabla-votaciones');
    tbody.innerHTML = '';
    lista.forEach(v => tbody.innerHTML += `<tr><td>${v.titulo}</td><td class="text-center fw-bold">${v.votos_totales}</td><td><span class="badge bg-success">${v.estado}</span></td></tr>`);
}

// --- LÓGICA DE EXPANSIÓN (MODAL) ---

function expandirTabla(tablaId, titulo) {
    document.getElementById('modalTitulo').innerText = titulo;
    const contenido = document.getElementById('contenido-expandido');
    
    // Clonamos la tabla completa (desde el contenedor padre para mantener estilos responsive)
    const tablaOriginal = document.getElementById(tablaId).closest('.table-responsive, .card-body');
    contenido.innerHTML = tablaOriginal.innerHTML;
    
    new bootstrap.Modal(document.getElementById('modalExpandir')).show();
}

function expandirGrafico(canvasId, titulo) {
    document.getElementById('modalTitulo').innerText = titulo;
    const contenido = document.getElementById('contenido-expandido');
    
    // Destruir gráfico anterior si existe en el modal
    if (graficoExpandido) {
        graficoExpandido.destroy();
        graficoExpandido = null;
    }

    // Crear un nuevo canvas grande
    contenido.innerHTML = '<div style="height: 450px; width: 100%;"><canvas id="chartExpanded"></canvas></div>';
    
    new bootstrap.Modal(document.getElementById('modalExpandir')).show();

    // Renderizar de nuevo usando los datos globales
    setTimeout(() => {
        if(canvasId === 'chartCrecimiento') graficoExpandido = renderizarGraficoCrecimiento('chartExpanded', datosGlobales.grafico_linea);
        if(canvasId === 'chartGrupos') graficoExpandido = renderizarGraficoGrupos('chartExpanded', datosGlobales.tendencias);
        if(canvasId === 'chartIntereses') graficoExpandido = renderizarGraficoIntereses('chartExpanded', datosGlobales.intereses);
    }, 300); // Pequeño delay para que el modal renderice
}

// --- LÓGICA DE PDF ---

function seleccionarTodos() {
    const checks = document.querySelectorAll('.check-pdf');
    const todosMarcados = Array.from(checks).every(c => c.checked);
    checks.forEach(c => c.checked = !todosMarcados);
}

function generarPDF() {
    const elemento = document.createElement('div');
    elemento.innerHTML = `
        <h1 style="text-align:center; color:#003366; font-family:sans-serif;">Reporte Ejecutivo SoyUCAB</h1>
        <p style="text-align:center; font-family:sans-serif;">Generado el: ${new Date().toLocaleDateString()}</p>
        <hr style="margin-bottom:20px;">
    `;

    const items = document.querySelectorAll('.report-item');
    let count = 0;

    items.forEach(item => {
        if (item.querySelector('.check-pdf').checked) {
            count++;
            const titulo = item.querySelector('.card-header').innerText;
            const cuerpo = item.querySelector('.card-body').innerHTML;

            elemento.innerHTML += `
                <div style="margin-bottom: 30px; page-break-inside: avoid; font-family:sans-serif;">
                    <h3 style="background-color: #f8f9fa; padding: 10px; border-bottom: 2px solid #003366;">${titulo}</h3>
                    <div style="padding: 10px;">${cuerpo}</div>
                </div>
            `;
        }
    });

    if (count === 0) return alert("Selecciona al menos un reporte.");

    const opt = {
        margin: 10,
        filename: 'Reporte_SoyUCAB.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(elemento).save();
}