const pool = require('../config/db');

// 1. OBTENER EVENTOS (GET)
const getEventos = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'fecha_hora_evento' } = req.query;
        const limite = 8;
        const offset = (pagina - 1) * limite;

        const query = `
            SELECT e.nombre_evento, 
                   e.descripcion, 
                   e.fecha_hora_evento, 
                   e.lugar,
                   e.miembro_creador_id,
                   e.clave_publicacion,
                   m.nombres, 
                   m.apellidos
            FROM evento e
            LEFT JOIN miembro m ON e.miembro_creador_id = m.miembro_id
            WHERE e.nombre_evento ILIKE $1 OR e.descripcion ILIKE $1
            ORDER BY e.${orden} DESC
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);

        const countQuery = `SELECT COUNT(*) FROM evento e WHERE e.nombre_evento ILIKE $1`;
        const totalRes = await pool.query(countQuery, [`%${busqueda}%`]);
        const totalRegistros = parseInt(totalRes.rows[0].count);

        res.json({
            datos: rows,
            totalPaginas: Math.ceil(totalRegistros / limite),
            paginaActual: parseInt(pagina)
        });
    } catch (err) {
        console.error("Error al obtener eventos:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 2. OBTENER UN EVENTO POR NOMBRE (GET /:id)
const getEventoById = async (req, res) => {
    const { id } = req.params; // id es nombre_evento
    try {
        const query = `SELECT * FROM evento WHERE nombre_evento = $1`;
        const { rows } = await pool.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. OBTENER ASISTENTES (GET /:id/asistentes)
const getAsistentes = async (req, res) => {
    const { id } = req.params; 
    try {
        const query = `
            SELECT m.nombres, m.apellidos, m.correo, p.rol_evento
            FROM participa_en p
            JOIN miembro m ON p.miembro_id = m.miembro_id
            WHERE p.nombre_evento = $1 
            ORDER BY m.nombres ASC
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. CREAR EVENTO (POST)
const crearEvento = async (req, res) => {
    const { nombre_evento, descripcion, fecha_hora_evento, lugar, miembro_creador_id } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Primero creamos la publicación padre
        const pubQuery = `INSERT INTO publicacion (fecha_hora_publicacion) VALUES (NOW()) RETURNING clave_publicacion`;
        const pubRes = await client.query(pubQuery);
        const clave = pubRes.rows[0].clave_publicacion;

        // Luego creamos el evento hijo
        const eventoQuery = `
            INSERT INTO evento (nombre_evento, descripcion, fecha_hora_evento, lugar, miembro_creador_id, clave_publicacion)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await client.query(eventoQuery, [nombre_evento, descripcion, fecha_hora_evento, lugar, miembro_creador_id, clave]);

        await client.query('COMMIT');
        res.json({ mensaje: "Evento creado exitosamente" });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: "Ya existe un evento con ese nombre" });
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// 5. ACTUALIZAR EVENTO (PUT) - ¡ESTA FALTABA!
const updateEvento = async (req, res) => {
    const { id } = req.params; // El ID es el "nombre_evento" original
    const { descripcion, fecha_hora_evento, lugar } = req.body;

    try {
        // No permitimos cambiar el nombre_evento porque es PK y rompería relaciones
        const query = `
            UPDATE evento 
            SET descripcion = $1, fecha_hora_evento = $2, lugar = $3
            WHERE nombre_evento = $4
        `;
        const result = await pool.query(query, [descripcion, fecha_hora_evento, lugar, id]);

        if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
        
        res.json({ mensaje: "Evento actualizado correctamente" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 6. ELIMINAR EVENTO (DELETE)
const eliminarEvento = async (req, res) => {
    const { id } = req.params; 
    try {
        // Borramos primero el evento
        await pool.query('DELETE FROM evento WHERE nombre_evento = $1', [id]);
        // Nota: La publicación padre quedará en la BD a menos que hagamos un borrado manual, 
        // pero para evitar errores de FK complejas, borramos solo el evento por ahora.
        res.json({ mensaje: "Evento eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 7. OBTENER ORGANIZADORES (GET /organizadores)
const getOrganizadores = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT miembro_id, nombres, apellidos FROM miembro ORDER BY nombres ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// EXPORTAR TODAS LAS FUNCIONES (Asegúrate de que updateEvento esté aquí)
module.exports = { 
    getEventos, 
    getEventoById, 
    getAsistentes, 
    crearEvento, 
    updateEvento, // <--- ESTO FALTABA y causaba el crash
    eliminarEvento, 
    getOrganizadores 
};