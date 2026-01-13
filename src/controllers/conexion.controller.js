const pool = require('../config/db');

// ==========================================
// SECCIÓN ADMINISTRADOR
// ==========================================
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

// ==========================================
// SECCIÓN MIEMBRO - CONEXIONES
// ==========================================

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

const rechazarSolicitud = async (req, res) => {
    try {
        const { solicitante_id, solicitado_id } = req.body;
        await pool.query(
            `DELETE FROM seconecta WHERE miembro_solicitante_id = $1 AND miembro_solicitado_id = $2`,
            [solicitante_id, solicitado_id]
        );
        res.json({ message: 'Rechazada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAmigosDeMiembro = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, m.correo, s.fecha_solicitud AS fecha_conexion
            FROM seconecta s
            JOIN miembro m ON (
                CASE WHEN s.miembro_solicitante_id = $1 THEN s.miembro_solicitado_id = m.miembro_id 
                     WHEN s.miembro_solicitado_id = $1 THEN s.miembro_solicitante_id = m.miembro_id END
            )
            WHERE (s.miembro_solicitante_id = $1 OR s.miembro_solicitado_id = $1) 
            AND s.estado_conexion = 'Aceptada'
        `;
        const { rows } = await pool.query(query, [parseInt(id)]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// SECCIÓN MENSAJERÍA (CORREGIDO PARA EVITAR DUPLICADOS)
// ==========================================

const getConversacionesDeMiembro = async (req, res) => {
    try {
        const { id } = req.params;
        // Busca conversaciones creadas por el usuario O donde haya participado
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

const getMensajes = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT m.texto_mensaje AS contenido, m.fecha_hora_envio AS fecha_envio, u.nombres, u.apellidos
            FROM mensaje m
            JOIN miembro u ON m.miembro_id = u.miembro_id
            WHERE m.conversacion_id = $1
            ORDER BY m.fecha_hora_envio ASC
        `;
        const { rows } = await pool.query(query, [parseInt(id)]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- FUNCIÓN INTELIGENTE: BUSCA HILO O CREA UNO NUEVO ---
const iniciarConversacion = async (req, res) => {
    const client = await pool.connect();
    try {
        const { mi_id, amigo_id, nombre_amigo } = req.body;
        
        // 1. OBTENER MI NOMBRE (Para buscar si el amigo creó el chat con mi nombre)
        const resMiNombre = await client.query('SELECT nombres, apellidos FROM miembro WHERE miembro_id = $1', [mi_id]);
        const miNombreCompleto = `${resMiNombre.rows[0].nombres} ${resMiNombre.rows[0].apellidos}`;

        // 2. BÚSQUEDA TRIPLE PARA ENCONTRAR CHAT EXISTENTE
        // A. Yo lo creé con su nombre.
        // B. Él lo creó con mi nombre.
        // C. Ambos hemos hablado en él (cruce de mensajes).
        const queryBuscar = `
            SELECT conversacion_id FROM conversacion 
            WHERE (miembro_creador_id = $1 AND titulo_chat = $3)
               OR (miembro_creador_id = $2 AND titulo_chat = $4)
            UNION
            SELECT m1.conversacion_id 
            FROM mensaje m1 
            JOIN mensaje m2 ON m1.conversacion_id = m2.conversacion_id 
            WHERE m1.miembro_id = $1 AND m2.miembro_id = $2
            LIMIT 1
        `;

        const tituloEsperadoYo = `Chat con ${nombre_amigo}`;
        const tituloEsperadoEl = `Chat con ${miNombreCompleto}`;

        const existe = await client.query(queryBuscar, [mi_id, amigo_id, tituloEsperadoYo, tituloEsperadoEl]);

        if (existe.rows.length > 0) {
            // ¡ENCONTRADO! Usamos el mismo hilo
            client.release();
            return res.json({ 
                conversacion_id: existe.rows[0].conversacion_id, 
                message: 'Chat existente recuperado' 
            });
        }

        // 3. SI NO EXISTE, CREAR NUEVO
        // Generamos ID seguro (MAX + 1) en lugar de Random para evitar colisiones
        const resId = await client.query('SELECT COALESCE(MAX(conversacion_id), 0) + 1 AS next_id FROM conversacion');
        const nuevoId = resId.rows[0].next_id;
        
        await client.query('BEGIN');
        
        await client.query(
            `INSERT INTO conversacion (conversacion_id, miembro_creador_id, titulo_chat, fecha_inicio)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [nuevoId, mi_id, tituloEsperadoYo]
        );

        await client.query('COMMIT');
        res.json({ conversacion_id: nuevoId, message: 'Chat nuevo iniciado' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error iniciarConversacion:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (client._connected) client.release();
    }
};

const enviarMensaje = async (req, res) => {
    try {
        const { conversacion_id, miembro_id, texto } = req.body;
        
        // Calcular número de mensaje
        const resCount = await pool.query('SELECT COUNT(*) FROM mensaje WHERE conversacion_id = $1', [conversacion_id]);
        const numMensaje = parseInt(resCount.rows[0].count) + 1;

        await pool.query(
            `INSERT INTO mensaje (conversacion_id, numero_mensaje, miembro_id, texto_mensaje, fecha_hora_envio, estado_mensaje)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Enviado')`,
            [conversacion_id, numMensaje, miembro_id, texto]
        );
        res.json({ message: 'Mensaje enviado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { 
    getAllMiembros, getMiembrosParaConectar, enviarSolicitud, getSolicitudes, 
    aceptarSolicitud, rechazarSolicitud, getAmigosDeMiembro, 
    getConversacionesDeMiembro, getMensajes, iniciarConversacion, enviarMensaje
};