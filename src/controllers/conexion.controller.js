const pool = require('../config/db');

// --- SECCIÓN DE CONEXIONES (AMISTADES) ---

// 1. Buscar miembros disponibles para conectar (Excluye a los que ya son amigos o tienen solicitud)
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Enviar una solicitud de conexión (INSERT en seconecta)
const enviarSolicitud = async (req, res) => {
    try {
        const { solicitante_id, solicitado_id } = req.body;
        // Según tu SQL, el estatus inicial es 'Pendiente'
        await pool.query(
            `INSERT INTO seconecta (miembro_solicitante_id, miembro_solicitado_id, estatus, fecha_conexion) 
             VALUES ($1, $2, 'Pendiente', CURRENT_DATE)`,
            [solicitante_id, solicitado_id]
        );
        res.json({ message: 'Solicitud enviada exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Ver mis amigos (Conexiones con estatus 'Aceptada')
const getConexiones = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, m.correo, s.fecha_conexion
            FROM miembro m
            JOIN seconecta s ON (m.miembro_id = s.miembro_solicitante_id OR m.miembro_id = s.miembro_solicitado_id)
            WHERE (s.miembro_solicitante_id = $1 OR s.miembro_solicitado_id = $1)
            AND s.estatus = 'Aceptada' 
            AND m.miembro_id != $1
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Ver solicitudes pendientes recibidas
const getSolicitudesPendientes = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, s.fecha_conexion
            FROM miembro m
            JOIN seconecta s ON m.miembro_id = s.miembro_solicitante_id
            WHERE s.miembro_solicitado_id = $1 AND s.estatus = 'Pendiente'
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Aceptar una solicitud (UPDATE en seconecta)
const aceptarSolicitud = async (req, res) => {
    try {
        const { solicitante_id, solicitado_id } = req.body;
        await pool.query(
            `UPDATE seconecta SET estatus = 'Aceptada', fecha_conexion = CURRENT_DATE 
             WHERE miembro_solicitante_id = $1 AND miembro_solicitado_id = $2`,
            [solicitante_id, solicitado_id]
        );
        res.json({ message: 'Solicitud aceptada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- SECCIÓN DE CONVERSACIONES ---

// 6. Listar conversaciones donde participa el usuario
const getConversaciones = async (req, res) => {
    try {
        const { id } = req.params;
        // Seleccionamos conversaciones creadas por el usuario O donde haya enviado mensajes
        const query = `
            SELECT DISTINCT c.conversacion_id, c.titulo, c.fecha_creacion, 
                   m.nombres AS creador_nombres, m.apellidos AS creador_apellidos
            FROM conversacion c
            JOIN miembro m ON c.miembro_creador_id = m.miembro_id
            LEFT JOIN mensaje msj ON c.conversacion_id = msj.conversacion_id
            WHERE c.miembro_creador_id = $1 OR msj.miembro_emisor_id = $1
            ORDER BY c.fecha_creacion DESC
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 7. Ver el contenido (mensajes) de una conversación específica
const getMensajesDeConversacion = async (req, res) => {
    try {
        const { conversacionId } = req.params;
        const query = `
            SELECT m.contenido, m.fecha_envio, mi.nombres, mi.apellidos
            FROM mensaje m
            JOIN miembro mi ON m.miembro_emisor_id = mi.miembro_id
            WHERE m.conversacion_id = $1
            ORDER BY m.fecha_envio ASC
        `;
        const { rows } = await pool.query(query, [conversacionId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getMiembrosParaConectar,
    enviarSolicitud,
    getConexiones,
    getSolicitudesPendientes,
    aceptarSolicitud,
    getConversaciones,
    getMensajesDeConversacion
};