document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    cargarCategorias();
});

let productosGlobal = []; // Para el buscador local

async function cargarProductos() {
    const contenedor = document.getElementById('lista-productos');
    contenedor.innerHTML = '<div class="col-12 text-center mt-5"><div class="spinner-border text-success"></div></div>';

    try {
        const res = await fetch('/marketplace');
        if (!res.ok) throw new Error(`Error ${res.status}`);
        
        productosGlobal = await res.json();
        renderizarProductos(productosGlobal);

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<div class="alert alert-danger text-center">${error.message}</div>`;
    }
}

function renderizarProductos(lista) {
    const contenedor = document.getElementById('lista-productos');
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = '<div class="col-12 text-center text-muted"><h4>No hay artículos disponibles 📦</h4></div>';
        return;
    }

    lista.forEach(prod => {
        const fecha = new Date(prod.fecha_creacion).toLocaleDateString();
        
        contenedor.innerHTML += `
            <div class="col-md-4 col-lg-3">
                <div class="card card-producto h-100 shadow-sm">
                    <div class="card-header bg-transparent d-flex justify-content-between">
                        <span class="badge bg-secondary">${prod.nombre_categoria}</span>
                        <small class="text-muted">${fecha}</small>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title text-dark">${prod.titulo_articulo}</h5>
                        <h3 class="precio-tag">$${prod.precio}</h3>
                        <p class="card-text small text-muted mt-3">${prod.descripcion_texto}</p>
                    </div>
                    <div class="card-footer bg-light">
                        <small class="text-muted">Vendedor: <strong>${prod.vendedor}</strong></small>
                        <button class="btn btn-sm btn-outline-success w-100 mt-2">Contactar</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// Cargar categorías para el Select
async function cargarCategorias() {
    try {
        const res = await fetch('/marketplace/categorias');
        const cats = await res.json();
        const select = document.getElementById('ven-categoria');
        select.innerHTML = '';
        cats.forEach(c => {
            select.innerHTML += `<option value="${c.nombre_categoria}">${c.nombre_categoria}</option>`;
        });
    } catch (error) {
        console.error("Error cargando categorías");
    }
}

// Buscador simple en frontend
function filtrarProductos() {
    const texto = document.getElementById('busqueda').value.toLowerCase();
    const filtrados = productosGlobal.filter(p => 
        p.titulo_articulo.toLowerCase().includes(texto) || 
        p.descripcion_texto.toLowerCase().includes(texto)
    );
    renderizarProductos(filtrados);
}

function abrirModalVenta() {
    new bootstrap.Modal(document.getElementById('modalVenta')).show();
}

// Publicar Artículo
document.getElementById('form-venta').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        miembro_id: document.getElementById('ven-miembro-id').value,
        titulo: document.getElementById('ven-titulo').value,
        precio: document.getElementById('ven-precio').value,
        categoria: document.getElementById('ven-categoria').value,
        descripcion: document.getElementById('ven-descripcion').value
    };

    try {
        const res = await fetch('/marketplace/publicar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('✅ Artículo publicado');
            bootstrap.Modal.getInstance(document.getElementById('modalVenta')).hide();
            e.target.reset();
            cargarProductos();
        } else {
            const err = await res.json();
            alert('❌ Error: ' + err.error);
        }
    } catch (error) {
        alert('Error de conexión');
    }
});