document.addEventListener('DOMContentLoaded', () => {
    cargarOfertas();
});

// 1. Cargar Ofertas (GET)
async function cargarOfertas() {
    const contenedor = document.getElementById('lista-ofertas');
    
    // Spinner de carga (Estilo Bootstrap)
    contenedor.innerHTML = '<div class="col-12 text-center mt-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando ofertas...</p></div>';

    try {
        // Usamos ruta relativa igual que en estudiantes.js
        const res = await fetch('/empleos'); 
        
        if (!res.ok) {
            throw new Error(`Error del servidor: ${res.status}`);
        }

        const ofertas = await res.json();
        
        // Limpiar el contenedor
        contenedor.innerHTML = '';

        if (ofertas.length === 0) {
            contenedor.innerHTML = '<div class="col-12 text-center text-muted p-5"><h4>📭 No hay ofertas laborales disponibles por el momento.</h4></div>';
            return;
        }

        ofertas.forEach(oferta => {
            // Lógica visual para etiquetas (Badges)
            const badgeClass = oferta.tipo_origen === 'Empresa Externa' ? 'bg-warning text-dark' : 'bg-primary';
            const origenTexto = oferta.origen || 'Entidad Privada';
            
            // Formatear fecha
            const fecha = new Date(oferta.fecha_creacion).toLocaleDateString('es-ES', { 
                year: 'numeric', month: 'long', day: 'numeric' 
            });

            // Cortar descripción si es muy larga
            const descripcionCorta = oferta.descripcion_texto 
                ? (oferta.descripcion_texto.length > 100 ? oferta.descripcion_texto.substring(0, 100) + '...' : oferta.descripcion_texto) 
                : 'Sin descripción';

            const cardHTML = `
                <div class="col-md-6 col-lg-4">
                    <div class="card card-empleo h-100 shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge ${badgeClass}">${origenTexto}</span>
                                <small class="text-muted" style="font-size: 0.8rem;">${fecha}</small>
                            </div>
                            
                            <h5 class="card-title fw-bold text-dark">${oferta.titulo_cargo}</h5>
                            <h6 class="card-subtitle mb-3 text-muted">
                                <i class="fas fa-briefcase me-1"></i> ${oferta.tipo_contrato || 'N/A'}
                            </h6>
                            
                            <p class="card-text small text-secondary">${descripcionCorta}</p>
                            
                            <hr class="my-2">
                            
                            <p class="card-text small mb-0">
                                <strong class="text-dark">Requisitos:</strong> 
                                <span class="text-muted">${oferta.requisitos || 'No especificados'}</span>
                            </p>
                        </div>
                        <div class="card-footer bg-white border-0 pb-3 pt-0">
                            <button class="btn btn-outline-primary w-100 btn-sm fw-bold" onclick="alert('Funcionalidad de postulación pendiente')">
                                Ver Detalles / Postularse
                            </button>
                        </div>
                    </div>
                </div>
            `;
            contenedor.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Error al cargar ofertas:", error);
        contenedor.innerHTML = `
            <div class="col-12 text-center mt-5">
                <div class="alert alert-danger shadow-sm" role="alert">
                    <h4 class="alert-heading"><i class="fas fa-exclamation-triangle"></i> Error al cargar datos</h4>
                    <p>No se pudo conectar con el servidor para obtener las ofertas.</p>
                    <hr>
                    <p class="mb-0 small">${error.message}</p>
                </div>
            </div>
        `;
    }
}

// 2. Funciones del Modal (Bootstrap 5)
function abrirModalPublicar() {
    new bootstrap.Modal(document.getElementById('modalPublicar')).show();
}

function toggleOrigen() {
    const esEmpresa = document.getElementById('opt-empresa').checked;
    const label = document.getElementById('lbl-entidad');
    const input = document.getElementById('pub-entidad');
    const help = document.getElementById('help-entidad');

    if (esEmpresa) {
        label.innerText = 'RIF de la Organización';
        input.placeholder = 'Ej: J-123456789';
        help.innerText = 'La empresa debe tener estatus "Aprobada".';
    } else {
        label.innerText = 'Nombre de la Dependencia';
        input.placeholder = 'Ej: Escuela de Ingeniería Informática';
        help.innerText = 'Debe coincidir con una dependencia registrada en el sistema.';
    }
}

// 3. Procesar Publicación (POST)
document.getElementById('form-empleo').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Recolectar datos del formulario
    const payload = {
        miembro_id: document.getElementById('pub-miembro-id').value, // ID simulado
        titulo: document.getElementById('pub-titulo').value,
        contrato: document.getElementById('pub-contrato').value,
        descripcion: document.getElementById('pub-descripcion').value,
        requisitos: document.getElementById('pub-requisitos').value,
        tipo_entidad: document.getElementById('opt-empresa').checked ? 'empresa' : 'dependencia',
        nombre_entidad: document.getElementById('pub-entidad').value
    };

    try {
        const res = await fetch('/empleos/publicar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            // Cerrar modal
            const modalEl = document.getElementById('modalPublicar');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();

            // Mensaje de éxito
            alert('✅ Oferta publicada correctamente');
            
            // Limpiar formulario y recargar
            e.target.reset();
            cargarOfertas(); 
        } else {
            alert('❌ Error al publicar: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor');
    }
});