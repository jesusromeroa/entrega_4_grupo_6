const pool = require('../config/db');

// Obtener eventos con paginación
const getEventos = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'fecha_inicio', dir = 'ASC' } = req.query;
        const limite = 8;
        const offset = (pagina - 1) * limite;

        // Asumimos que la PK es 'evento_id' o 'clave_evento'. Ajusta si es necesario.
        const query = `
            SELECT e.evento_id, e.nombre_evento, e.descripcion, e.tipo_evento, 
                   e.fecha_inicio, e.fecha_fin,
                   m.nombres, m.apellidos
            FROM evento e
            LEFT JOIN miembro m ON e.miembro_organizador_id = m.miembro_id
            WHERE e.nombre_evento ILIKE $1 OR e.descripcion ILIKE $1
            ORDER BY ${orden} ${dir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);

        // Contar total
        const countQuery = `SELECT COUNT(*) FROM evento e WHERE e.nombre_evento ILIKE $1`;
        const totalRes = await pool.query(countQuery, [`%${busqueda}%`]);
        const totalRegistros = parseInt(totalRes.rows[0].count);

        res.json({
            datos: rows,
            totalPaginas: Math.ceil(totalRegistros / limite),
            paginaActual: parseInt(pagina)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener un evento por ID
const getEventoById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM evento WHERE evento_id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener ASISTENTES (Quienes confirmaron asistencia)
const getAsistentes = async (req, res) => {
    const { id } = req.params; // ID del evento
    try {
        // Usamos la tabla 'participa_en' que conecta miembro y evento
        const query = `
            SELECT m.nombres, m.apellidos, m.correo, p.rol_evento
            FROM participa_en p
            JOIN miembro m ON p.miembro_id = m.miembro_id
            WHERE p.evento_id = $1
            ORDER BY m.nombres ASC
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Crear Evento
const crearEvento = async (req, res) => {
    const { nombre_evento, descripcion, tipo_evento, fecha_inicio, fecha_fin, organizador_id } = req.body;
    try {
        await pool.query(
            `INSERT INTO evento (nombre_evento, descripcion, tipo_evento, fecha_inicio, fecha_fin, miembro_organizador_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [nombre_evento, descripcion, tipo_evento, fecha_inicio, fecha_fin, organizador_id]
        );
        res.json({ mensaje: "Evento creado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Editar Evento
const updateEvento = async (req, res) => {
    const { id } = req.params;
    const { nombre_evento, descripcion, fecha_inicio, fecha_fin } = req.body;
    try {
        await pool.query(
            `UPDATE evento SET nombre_evento=$1, descripcion=$2, fecha_inicio=$3, fecha_fin=$4 WHERE evento_id=$5`,
            [nombre_evento, descripcion, fecha_inicio, fecha_fin, id]
        );
        res.json({ mensaje: "Evento actualizado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar Evento
const eliminarEvento = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM evento WHERE evento_id = $1', [id]);
        res.json({ mensaje: "Evento eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener Organizadores (Cualquier miembro)
const getOrganizadores = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT miembro_id, nombres, apellidos FROM miembro ORDER BY nombres ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    getEventos, getEventoById, getAsistentes, crearEvento, updateEvento, eliminarEvento, getOrganizadores 
};