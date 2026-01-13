const pool = require('../config/db');

// --- FUNCIONES ADMIN (Ya las tienes) ---
const getAllMiembros = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '' } = req.query;
        const limite = 10;
        const offset = (pagina - 1) * limite;
        const clause = `WHERE m.nombres ILIKE $1 OR m.apellidos ILIKE $1 OR m.correo ILIKE $1`;
        
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, m.correo,
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
            ${clause} ORDER BY m.nombres ASC LIMIT $2 OFFSET $3
        `;
        const countQuery = `SELECT COUNT(*) FROM miembro m ${clause}`;
        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);
        const countRes = await pool.query(countQuery, [`%${busqueda}%`]);

        res.json({ datos: rows, totalPaginas: Math.ceil(parseInt(countRes.rows[0].count) / limite), paginaActual: parseInt(pagina) });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- FUNCIONES COMUNES Y DE MIEMBRO (NUEVAS) ---

// 1. Buscar gente nueva para conectar
const getMiembrosParaConectar = async (req, res) => {
    try {
        const { id, busqueda = '' } = req.query;
        const query = `
            SELECT miembro_id, nombres, apellidos, correo 
            FROM miembro 
            WHERE miembro_id != $1 
            AND (nombres ILIKE $2 OR apellidos ILIKE $2 OR correo ILIKE $2)
            AND miembro_id NOT IN (
                SELECT miembro_solicitado_id FROM seconecta WHERE miembro_solicitante_id = $1
                UNION
                SELECT miembro_solicitante_id FROM seconecta WHERE miembro_solicitado_id = $1
            )
            LIMIT 10
        `;
        const { rows } = await pool.query(query, [id, `%${busqueda}%`]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. Enviar Solicitud
const enviarSolicitud = async (req, res) => {
    try {
        const { solicitante_id, solicitado_id } = req.body;
        await pool.query(
            `INSERT INTO seconecta (miembro_solicitante_id, miembro_solicitado_id, estado_conexion, fecha_solicitud) 
             VALUES ($1, $2, 'Pendiente', CURRENT_DATE)`,
            [solicitante_id, solicitado_id]
        );
        res.json({ message: 'Enviada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. Ver Solicitudes Pendientes
const getSolicitudes = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, s.fecha_solicitud
            FROM miembro m
            JOIN seconecta s ON m.miembro_id = s.miembro_solicitante_id
            WHERE s.miembro_solicitado_id = $1 AND s.estado_conexion = 'Pendiente'
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. Aceptar Solicitud
const aceptarSolicitud = async (req, res) => {
    try {
        const { solicitante_id, solicitado_id } = req.body;
        await pool.query(
            `UPDATE seconecta SET estado_conexion = 'Aceptada', fecha_solicitud = CURRENT_DATE 
             WHERE miembro_solicitante_id = $1 AND miembro_solicitado_id = $2`,
            [solicitante_id, solicitado_id]
        );
        res.json({ message: 'Aceptada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. Ver Amigos (Funciona para Admin y Miembro)
const getAmigosDeMiembro = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.nombres, m.apellidos, m.correo, s.fecha_solicitud AS fecha_conexion, s.estado_conexion AS estatus
            FROM seconecta s
            JOIN miembro m ON (CASE WHEN s.miembro_solicitante_id = $1 THEN s.miembro_solicitado_id = m.miembro_id WHEN s.miembro_solicitado_id = $1 THEN s.miembro_solicitante_id = m.miembro_id END)
            WHERE (s.miembro_solicitante_id = $1 OR s.miembro_solicitado_id = $1) AND s.estado_conexion = 'Aceptada'
        `;
        const { rows } = await pool.query(query, [parseInt(id)]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 6. Conversaciones (Funciona para ambos)
const getConversacionesDeMiembro = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT DISTINCT c.conversacion_id, c.titulo_chat AS titulo, c.fecha_inicio AS fecha_creacion,
                   creador.nombres || ' ' || creador.apellidos AS creador
            FROM conversacion c
            JOIN miembro creador ON c.miembro_creador_id = creador.miembro_id
            LEFT JOIN mensaje m ON c.conversacion_id = m.conversacion_id
            WHERE c.miembro_creador_id = $1 OR m.miembro_id = $1
            ORDER BY c.fecha_inicio DESC
        `;
        const { rows } = await pool.query(query, [parseInt(id)]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 7. Mensajes
const getMensajes = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.texto_mensaje AS contenido, m.fecha_hora_envio AS fecha_envio, u.nombres, u.apellidos
            FROM mensaje m
            JOIN miembro u ON m.miembro_id = u.miembro_id
            WHERE m.conversacion_id = $1 ORDER BY m.fecha_hora_envio ASC
        `;
        const { rows } = await pool.query(query, [parseInt(id)]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { 
    getAllMiembros, getMiembrosParaConectar, enviarSolicitud, getSolicitudes, 
    aceptarSolicitud, getAmigosDeMiembro, getConversacionesDeMiembro, getMensajes 
};