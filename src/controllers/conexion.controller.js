const pool = require('../config/db');

// 1. Obtener LISTA DE TODOS LOS MIEMBROS con su TIPO REAL
const getAllMiembros = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '' } = req.query;
        const limite = 10;
        const offset = (pagina - 1) * limite;

        // Filtro de búsqueda
        const whereClause = `WHERE m.nombres ILIKE $1 OR m.apellidos ILIKE $1 OR m.correo ILIKE $1`;
        
        // CONSULTA MEJORADA:
        // Usamos LEFT JOIN para verificar si el miembro existe en las sub-tablas
        // y un CASE para determinar el texto del tipo.
        const query = `
            SELECT 
                m.miembro_id, 
                m.nombres, 
                m.apellidos, 
                m.correo,
                CASE 
                    WHEN p.miembro_id IS NOT NULL THEN 'Profesor'
                    WHEN e.miembro_id IS NOT NULL THEN 'Estudiante'
                    WHEN eg.miembro_id IS NOT NULL THEN 'Egresado'
                    ELSE 'Miembro'
                END AS tipo_miembro
            FROM miembro m
            LEFT JOIN profesor p ON m.miembro_id = p.miembro_id
            LEFT JOIN estudiante e ON m.miembro_id = e.miembro_id
            LEFT JOIN egresado eg ON m.miembro_id = eg.miembro_id
            ${whereClause}
            ORDER BY m.nombres ASC
            LIMIT $2 OFFSET $3
        `;

        const countQuery = `SELECT COUNT(*) FROM miembro m ${whereClause}`;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);
        const countRes = await pool.query(countQuery, [`%${busqueda}%`]);

        res.json({
            datos: rows,
            totalPaginas: Math.ceil(parseInt(countRes.rows[0].count) / limite),
            paginaActual: parseInt(pagina)
        });
    } catch (err) {
        console.error("Error en getAllMiembros:", err);
        res.status(500).json({ error: "Error al cargar miembros: " + err.message });
    }
};

// 2. Ver Amigos (Sin cambios, funciona bien)
const getAmigosDeMiembro = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.nombres, m.apellidos, m.correo, 
                   s.fecha_solicitud AS fecha_conexion, 
                   s.estado_conexion AS estatus
            FROM seconecta s
            JOIN miembro m ON (
                CASE 
                    WHEN s.miembro_solicitante_id = $1 THEN s.miembro_solicitado_id = m.miembro_id
                    WHEN s.miembro_solicitado_id = $1 THEN s.miembro_solicitante_id = m.miembro_id
                END
            )
            WHERE (s.miembro_solicitante_id = $1 OR s.miembro_solicitado_id = $1)
            AND s.estado_conexion = 'Aceptada'
        `;
        const { rows } = await pool.query(query, [parseInt(id)]);
        res.json(rows);
    } catch (err) {
        console.error("Error en getAmigos:", err);
        res.status(500).json({ error: err.message });
    }
};

// 3. Ver Conversaciones (Sin cambios)
const getConversacionesDeMiembro = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT DISTINCT c.conversacion_id, 
                   c.titulo_chat AS titulo, 
                   c.fecha_inicio AS fecha_creacion,
                   creador.nombres || ' ' || creador.apellidos AS creador
            FROM conversacion c
            JOIN miembro creador ON c.miembro_creador_id = creador.miembro_id
            LEFT JOIN mensaje m ON c.conversacion_id = m.conversacion_id
            WHERE c.miembro_creador_id = $1 OR m.miembro_id = $1
            ORDER BY c.fecha_inicio DESC
        `;
        const { rows } = await pool.query(query, [parseInt(id)]);
        res.json(rows);
    } catch (err) {
        console.error("Error en getConversaciones:", err);
        res.status(500).json({ error: err.message });
    }
};

// 4. Ver Mensajes (Sin cambios)
const getMensajes = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.texto_mensaje AS contenido, 
                   m.fecha_hora_envio AS fecha_envio, 
                   u.nombres, u.apellidos
            FROM mensaje m
            JOIN miembro u ON m.miembro_id = u.miembro_id
            WHERE m.conversacion_id = $1
            ORDER BY m.fecha_hora_envio ASC
        `;
        const { rows } = await pool.query(query, [parseInt(id)]);
        res.json(rows);
    } catch (err) {
        console.error("Error en getMensajes:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    getAllMiembros, 
    getAmigosDeMiembro, 
    getConversacionesDeMiembro, 
    getMensajes 
};