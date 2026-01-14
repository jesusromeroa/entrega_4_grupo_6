const pool = require("../config/db.js");

// ==========================================
// SECCIÓN ADMINISTRADOR Y GENERAL
// ==========================================

// 1. Listar Eventos
const getEventos = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'nombre_evento', dir = 'ASC' } = req.query;
        const limite = 8;
        const offset = (pagina - 1) * limite;

        const columnasValidas = ['nombre_evento', 'fecha_hora_evento', 'lugar'];
        const sortCol = columnasValidas.includes(orden) ? orden : 'nombre_evento';
        const sortDir = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const query = `
            SELECT 
                e.nombre_evento, e.descripcion, e.fecha_hora_evento, e.lugar, 
                'Evento' AS tipo_evento, e.miembro_creador_id,
                m.nombres, m.apellidos
            FROM evento e
            LEFT JOIN miembro m ON e.miembro_creador_id = m.miembro_id
            WHERE (e.nombre_evento ILIKE $1 OR e.descripcion ILIKE $1 OR e.lugar ILIKE $1)
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM evento e WHERE (e.nombre_evento ILIKE $1 OR e.descripcion ILIKE $1)`, 
            [`%${busqueda}%`]
        );
        
        res.json({
            datos: rows,
            totalPaginas: Math.ceil(parseInt(countRes.rows[0].count) / limite),
            paginaActual: parseInt(pagina)
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. Crear Evento (MEJORADO: CON TRANSACCIÓN Y AUTO-ASISTENCIA)
const createEvento = async (req, res) => {
    const client = await pool.connect();
    try {
        const { nombre_evento, descripcion, lugar, fecha_hora_evento, organizador_id } = req.body;
        
        await client.query('BEGIN');

        // Insertar Evento
        await client.query(
            `INSERT INTO evento (nombre_evento, descripcion, lugar, fecha_hora_evento, miembro_creador_id) 
             VALUES ($1, $2, $3, $4, $5)`,
            [nombre_evento, descripcion, lugar, fecha_hora_evento, organizador_id]
        );

        // Auto-inscribir al creador como asistente
        await client.query(
            `INSERT INTO asiste_evento (nombre_evento, miembro_id) VALUES ($1, $2)`,
            [nombre_evento, organizador_id]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Evento creado exitosamente' });

    } catch (err) {
        await client.query('ROLLBACK');
        if(err.code === '23505') return res.status(400).json({ error: 'Ya existe un evento con ese nombre.' });
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// 3. Actualizar Evento
const updateEvento = async (req, res) => {
    const idOriginal = req.params.id;
    const { descripcion, lugar, fecha_hora_evento } = req.body;
    try {
        const result = await pool.query(
            `UPDATE evento SET descripcion = $1, lugar = $2, fecha_hora_evento = $3 WHERE nombre_evento = $4`,
            [descripcion, lugar, fecha_hora_evento, idOriginal]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
        res.json({ message: 'Evento actualizado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. Eliminar Evento
const deleteEvento = async (req, res) => {
    try {
        await pool.query('DELETE FROM evento WHERE nombre_evento = $1', [req.params.id]);
        res.json({ message: 'Evento eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. Ver Participantes (Admin)
const getParticipantes = async (req, res) => {
    try {
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, m.correo
            FROM miembro m
            JOIN asiste_evento a ON m.miembro_id = a.miembro_id
            WHERE a.nombre_evento = $1 ORDER BY m.nombres ASC
        `;
        const { rows } = await pool.query(query, [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 6. Organizadores
const getOrganizadores = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT miembro_id, nombres, apellidos FROM miembro ORDER BY nombres');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// SECCIÓN MIEMBRO
// ==========================================

// 7. Mis eventos
const getMisEventos = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT e.* FROM evento e
            JOIN asiste_evento a ON e.nombre_evento = a.nombre_evento
            WHERE a.miembro_id = $1
            ORDER BY e.fecha_hora_evento ASC
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 8. Eventos Disponibles
const getEventosDisponibles = async (req, res) => {
    try {
        const { id, busqueda = '' } = req.query;
        const query = `
            SELECT * FROM evento 
            WHERE nombre_evento NOT IN (SELECT nombre_evento FROM asiste_evento WHERE miembro_id = $1)
            AND (nombre_evento ILIKE $2 OR descripcion ILIKE $2)
            ORDER BY fecha_hora_evento ASC LIMIT 20
        `;
        const { rows } = await pool.query(query, [id, `%${busqueda}%`]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 9. Asistir
const asistirEvento = async (req, res) => {
    try {
        const { nombre_evento, miembro_id } = req.body;
        await pool.query(
            `INSERT INTO asiste_evento (nombre_evento, miembro_id) VALUES ($1, $2)`,
            [nombre_evento, miembro_id]
        );
        res.json({ message: "Asistencia confirmada" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 10. Cancelar
const cancelarAsistencia = async (req, res) => {
    try {
        const { nombre_evento, miembro_id } = req.body;
        await pool.query(
            `DELETE FROM asiste_evento WHERE nombre_evento = $1 AND miembro_id = $2`,
            [nombre_evento, miembro_id]
        );
        res.json({ message: "Asistencia cancelada" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { 
    getEventos, createEvento, updateEvento, deleteEvento, getParticipantes, getOrganizadores,
    getMisEventos, getEventosDisponibles, asistirEvento, cancelarAsistencia 
};