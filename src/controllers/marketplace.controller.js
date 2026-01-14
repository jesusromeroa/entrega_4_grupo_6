const pool = require("../config/db.js");

// 1. Obtener productos (con filtros opcionales de categoría)
const getArticulos = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.clave_publicacion,
                p.fecha_creacion,
                p.descripcion_texto,
                am.titulo_articulo,
                am.precio,
                am.nombre_categoria,
                m.nombres || ' ' || m.apellidos AS vendedor
            FROM articulo_mkt am
            JOIN publicacion p ON am.clave_articulo = p.clave_publicacion
            JOIN miembro m ON p.clave_miembro_creador = m.miembro_id
            WHERE p.estado = 'Activo'
            ORDER BY p.fecha_creacion DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error("Error obteniendo marketplace:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 2. Obtener categorías para el select (Para no escribirlas a mano)
const getCategorias = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT nombre_categoria FROM categoria_mkt ORDER BY nombre_categoria');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Publicar Artículo
const publicarArticulo = async (req, res) => {
    const { miembro_id, titulo, descripcion, precio, categoria } = req.body;

    try {
        const query = `CALL public.sp_publicar_articulo($1, $2, $3, $4, $5)`;
        const values = [parseInt(miembro_id), titulo, descripcion, parseFloat(precio), categoria];

        await pool.query(query, values);
        res.status(201).json({ message: "Artículo publicado exitosamente" });

    } catch (err) {
        console.error("Error publicando artículo:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getArticulos, getCategorias, publicarArticulo };