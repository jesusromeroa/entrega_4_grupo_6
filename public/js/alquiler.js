document.addEventListener('DOMContentLoaded', () => {
    cargarAlquileres();
    cargarDatosFormulario();
});

let alquileresGlobal = [];

// 1. Cargar Alquileres
async function cargarAlquileres() {
    const contenedor = document.getElementById('lista-alquileres');
    contenedor.innerHTML = '<div class="col-12 text-center mt-5"><div class="spinner-border text-warning"></div></div>';

    try {
        const res = await fetch('/alquileres');
        if (!res.ok) throw new Error(`Error ${res.status}`);
        
        alquileresGlobal = await res.json();
        renderizarAlquileres(alquileresGlobal);

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<div class="alert alert-danger text-center">${error.message}</div>`;
    }
}

function renderizarAlquileres(lista) {
    const contenedor = document.getElementById('lista-alquileres');
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = '<div class="col-12 text-center text-muted"><h4>No hay alojamientos disponibles 🏘️</h4></div>';
        return;
    }

    lista.forEach(item => {
        const fecha = new Date(item.fecha_creacion).toLocaleDateString();
        
        contenedor.innerHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card card-alquiler h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-dark">${item.nombre_tipo}</span>
                            <span class="text-muted small"><i class="fas fa-map-marker-alt"></i> ${item.nombre_ciudad}</span>
                        </div>
                        
                        <h5 class="card-title text-dark fw-bold">${item.titulo_inmueble}</h5>
                        <h3 class="precio-mes">$${item.precio_alquiler} <span class="fs-6 text-muted">/mes</span></h3>
                        
                        <p class="card-text small text-secondary mt-3">${item.descripcion_texto}</p>
                        
                        <div class="alert alert-light border p-2 small">
                            <strong><i class="fas fa-info-circle"></i> Condiciones:</strong> ${item.condiciones || 'A convenir'}
                        </div>
                    </div>
                    <div class="card-footer bg-white border-0">
                        <small class="text-muted d-block mb-2">Anfitrión: ${item.anfitrion}</small>
                        <button class="btn btn-outline-warning text-dark w-100 fw-bold">Contactar</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// 2. Cargar Selects del Formulario (Tipos y Ciudades)
async function cargarDatosFormulario() {
    try {
        const res = await fetch('/alquileres/datos-form');
        const data = await res.json();
        
        const selectTipo = document.getElementById('alq-tipo');
        const selectCiudad = document.getElementById('alq-ciudad');

        // Llenar Tipos
        selectTipo.innerHTML = '';
        data.tipos.forEach(t => {
            selectTipo.innerHTML += `<option value="${t.nombre_tipo}">${t.nombre_tipo}</option>`;
        });

        // Llenar Ciudades
        selectCiudad.innerHTML = '';
        data.ciudades.forEach(c => {
            selectCiudad.innerHTML += `<option value="${c.nombre_ciudad}">${c.nombre_ciudad}</option>`;
        });

    } catch (error) {
        console.error("Error cargando formulario:", error);
    }
}

// 3. Filtrar en Frontend
function filtrarAlquileres() {
    const texto = document.getElementById('busqueda').value.toLowerCase();
    const filtrados = alquileresGlobal.filter(a => 
        a.titulo_inmueble.toLowerCase().includes(texto) || 
        a.nombre_ciudad.toLowerCase().includes(texto) ||
        a.nombre_tipo.toLowerCase().includes(texto)
    );
    renderizarAlquileres(filtrados);
}

// 4. Modal y Publicación
function abrirModalAlquiler() {
    new bootstrap.Modal(document.getElementById('modalAlquiler')).show();
}

document.getElementById('form-alquiler').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        miembro_id: document.getElementById('alq-miembro-id').value,
        titulo: document.getElementById('alq-titulo').value,
        precio: document.getElementById('alq-precio').value,
        tipo: document.getElementById('alq-tipo').value,
        ciudad: document.getElementById('alq-ciudad').value,
        condiciones: document.getElementById('alq-condiciones').value,
        descripcion: document.getElementById('alq-descripcion').value
    };

    try {
        const res = await fetch('/alquileres/publicar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('✅ Alojamiento publicado');
            bootstrap.Modal.getInstance(document.getElementById('modalAlquiler')).hide();
            e.target.reset();
            cargarAlquileres();
        } else {
            const err = await res.json();
            alert('❌ Error: ' + err.error);
        }
    } catch (error) {
        alert('Error de conexión');
    }
});