const pool = require("../config/db.js");

// 1. Obtener Recomendaciones
const getRecomendaciones = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.clave_publicacion,
                p.fecha_creacion,
                p.descripcion_texto,
                r.titulo_recomendacion AS titulo,
                CASE 
                    WHEN rc.clave_rec_culinaria IS NOT NULL THEN 'Culinaria'
                    WHEN ra.clave_rec_artistica IS NOT NULL THEN 'Artistica'
                    WHEN rac.clave_rec_academica IS NOT NULL THEN 'Academica'
                    ELSE 'General'
                END AS categoria,
                COALESCE(rc.ubicacion_local, rac.enlace_externo, ra.plataforma, '#') AS ubicacion_enlace,
                0 AS puntuacion,
                m.nombres || ' ' || m.apellidos AS autor
            FROM recomendacion r
            JOIN publicacion p ON r.clave_recomendacion = p.clave_publicacion
            JOIN miembro m ON p.clave_miembro_creador = m.miembro_id
            LEFT JOIN rec_culinaria rc ON r.clave_recomendacion = rc.clave_rec_culinaria
            LEFT JOIN rec_artistica ra ON r.clave_recomendacion = ra.clave_rec_artistica
            LEFT JOIN rec_academica rac ON r.clave_recomendacion = rac.clave_rec_academica
            WHERE p.estado = 'Activo'
            ORDER BY p.fecha_creacion DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error("Error obteniendo recomendaciones:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 2. Publicar Recomendación
const publicarRecomendacion = async (req, res) => {
    const { miembro_id, titulo, descripcion, categoria, ubicacion, puntuacion } = req.body;

    try {
        const query = `CALL public.sp_publicar_recomendacion($1, $2, $3, $4, $5, $6)`;
        const values = [
            parseInt(miembro_id), 
            titulo, 
            descripcion, 
            categoria, 
            ubicacion,
            parseInt(puntuacion || 0) // Enviar 0 si no viene puntuación
        ];

        await pool.query(query, values);
        res.status(201).json({ message: "Recomendación publicada exitosamente" });

    } catch (err) {
        console.error("Error publicando recomendación:", err.message);
        res.status(500).json({ error: "Error al publicar: " + err.message });
    }
};

module.exports = { getRecomendaciones, publicarRecomendacion };