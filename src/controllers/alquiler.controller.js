const pool = require("../config/db.js");

// 1. Obtener alquileres
const getAlquileres = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.clave_publicacion,
                p.fecha_creacion,
                p.descripcion_texto,
                ia.titulo_inmueble,
                ia.precio_alquiler,
                ia.condiciones,
                ia.nombre_tipo,
                ia.nombre_ciudad,
                m.nombres || ' ' || m.apellidos AS anfitrion,
                m.correo
            FROM inmueble_alquiler ia
            JOIN publicacion p ON ia.clave_inmueble = p.clave_publicacion
            JOIN miembro m ON p.clave_miembro_creador = m.miembro_id
            WHERE p.estado = 'Activo'
            ORDER BY p.fecha_creacion DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error("Error obteniendo alquileres:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 2. Obtener datos auxiliares (Tipos de inmueble y Ciudades)
const getDatosFormulario = async (req, res) => {
    try {
        const tipos = await pool.query('SELECT nombre_tipo FROM tipo_inmueble ORDER BY nombre_tipo');
        const ciudades = await pool.query('SELECT nombre_ciudad FROM ciudad ORDER BY nombre_ciudad');
        
        res.json({
            tipos: tipos.rows,
            ciudades: ciudades.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Publicar Alquiler
const publicarAlquiler = async (req, res) => {
    const { 
        miembro_id, titulo, descripcion, 
        precio, condiciones, tipo, ciudad 
    } = req.body;

    try {
        const query = `CALL public.sp_publicar_alquiler($1, $2, $3, $4, $5, $6, $7)`;
        const values = [
            parseInt(miembro_id), titulo, descripcion, 
            parseFloat(precio), condiciones, tipo, ciudad
        ];

        await pool.query(query, values);
        res.status(201).json({ message: "Alquiler publicado exitosamente" });

    } catch (err) {
        console.error("Error publicando alquiler:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAlquileres, getDatosFormulario, publicarAlquiler };