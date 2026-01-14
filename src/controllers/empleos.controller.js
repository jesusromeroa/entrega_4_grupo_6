const pool = require("../config/db.js");

// 1. Obtener todas las ofertas activas (Lectura)
const getOfertas = async (req, res) => {
    try {
        // Hacemos JOIN para traer datos de la oferta Y de la publicación padre
        const query = `
            SELECT 
                p.clave_publicacion,
                p.fecha_creacion,
                p.descripcion_texto,
                oe.titulo_cargo,
                oe.tipo_contrato,
                oe.requisitos,
                COALESCE(oe.nombre_dependencia, oe.rif_organizacion) AS origen,
                CASE 
                    WHEN oe.nombre_dependencia IS NOT NULL THEN 'Dependencia UCAB'
                    ELSE 'Empresa Externa'
                END AS tipo_origen
            FROM oferta_empleo oe
            JOIN publicacion p ON oe.clave_oferta = p.clave_publicacion
            WHERE p.estado = 'Activo'
            ORDER BY p.fecha_creacion DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener ofertas" });
    }
};

// 2. Publicar una oferta (Escritura usando el SP)
const publicarOferta = async (req, res) => {
    // Nota: miembro_id debería venir del token de sesión (req.user.id). 
    // Por ahora lo recibimos del body para probar.
    const { 
        miembro_id, 
        titulo, 
        descripcion, 
        contrato, 
        requisitos, 
        tipo_entidad, // 'empresa' o 'dependencia'
        nombre_entidad // El valor del RIF o el Nombre de la dependencia
    } = req.body;

    try {
        let nombre_dependencia = null;
        let rif_organizacion = null;

        // Asignamos según lo que eligió el usuario
        if (tipo_entidad === 'empresa') {
            rif_organizacion = nombre_entidad;
        } else {
            nombre_dependencia = nombre_entidad;
        }

        // Llamada al Stored Procedure
        const query = `
            CALL public.sp_publicar_oferta_empleo($1, $2, $3, $4, $5, $6, $7)
        `;
        
        const values = [
            parseInt(miembro_id),
            descripcion,
            titulo,
            contrato,
            requisitos,
            nombre_dependencia,
            rif_organizacion
        ];

        await pool.query(query, values);

        res.status(201).json({ message: "Oferta publicada exitosamente" });

    } catch (err) {
        console.error("Error publicando oferta:", err.message);
        res.status(500).json({ error: "Error al publicar: " + err.message });
    }
};

module.exports = {
    getOfertas,
    publicarOferta
};