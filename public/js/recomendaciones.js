document.addEventListener('DOMContentLoaded', () => {
    cargarRec();
});

let recGlobal = [];

async function cargarRec() {
    const contenedor = document.getElementById('lista-rec');
    contenedor.innerHTML = '<div class="col-12 text-center mt-5"><div class="spinner-border text-danger"></div></div>';

    try {
        const res = await fetch('/recomendaciones');
        if (!res.ok) throw new Error(`Error ${res.status}`);
        
        recGlobal = await res.json();
        renderizar(recGlobal);

    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger text-center">${error.message}</div>`;
    }
}

function renderizar(lista) {
    const contenedor = document.getElementById('lista-rec');
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = '<div class="col-12 text-center text-muted"><h4>Sé el primero en recomendar algo 🚀</h4></div>';
        return;
    }

    lista.forEach(item => {
        // Generar estrellas visuales
        let estrellasHTML = '';
        for(let i=0; i<5; i++) {
            estrellasHTML += i < item.puntuacion ? '<i class="fas fa-star"></i>' : '<i class="far fa-star text-secondary"></i>';
        }

        // Icono según categoría
        let icono = '📌';
        if(item.categoria === 'Gastronomía') icono = '🍔';
        if(item.categoria === 'Académico') icono = '📚';
        if(item.categoria === 'Cultural') icono = '🎭';

        contenedor.innerHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card card-rec h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="badge bg-light text-dark border">${icono} ${item.categoria}</span>
                            <small class="text-muted">${new Date(item.fecha_creacion).toLocaleDateString()}</small>
                        </div>
                        
                        <h5 class="card-title fw-bold">${item.titulo}</h5>
                        <div class="estrellas mb-3">${estrellasHTML}</div>
                        
                        <p class="card-text text-secondary">"${item.descripcion_texto}"</p>
                        
                        <p class="small text-muted mb-0"><i class="fas fa-map-marker-alt"></i> ${item.ubicacion_enlace || 'Sin ubicación'}</p>
                    </div>
                    <div class="card-footer bg-white border-0">
                        <small class="text-muted">Por: <strong>${item.autor}</strong></small>
                    </div>
                </div>
            </div>
        `;
    });
}

function filtrarRec() {
    const texto = document.getElementById('busqueda').value.toLowerCase();
    const filtrados = recGlobal.filter(r => 
        r.titulo.toLowerCase().includes(texto) || 
        r.categoria.toLowerCase().includes(texto)
    );
    renderizar(filtrados);
}

function abrirModalRec() {
    new bootstrap.Modal(document.getElementById('modalRec')).show();
}

document.getElementById('form-rec').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        miembro_id: document.getElementById('rec-miembro-id').value,
        titulo: document.getElementById('rec-titulo').value,
        categoria: document.getElementById('rec-categoria').value,
        puntuacion: document.getElementById('rec-puntuacion').value,
        ubicacion: document.getElementById('rec-ubicacion').value,
        descripcion: document.getElementById('rec-descripcion').value
    };

    try {
        const res = await fetch('/recomendaciones/publicar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('✅ Recomendación publicada');
            bootstrap.Modal.getInstance(document.getElementById('modalRec')).hide();
            e.target.reset();
            cargarRec();
        } else {
            alert('Error al publicar');
        }
    } catch (error) {
        alert('Error de conexión');
    }
});