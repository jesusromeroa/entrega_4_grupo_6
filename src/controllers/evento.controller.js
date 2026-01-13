const pool = require('../config/db');

// --- LEER (READ) ---
const getEventos = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'nombre_evento', dir = 'ASC' } = req.query;
        const limite = 8;
        const offset = (pagina - 1) * limite;

        // Validación estricta del ordenamiento
        // Eliminamos 'tipo_evento' de las columnas permitidas para ordenar
        const columnasValidas = ['nombre_evento', 'fecha_hora_evento', 'lugar'];
        const sortCol = columnasValidas.includes(orden) ? orden : 'nombre_evento';
        const sortDir = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const query = `
            SELECT 
                e.nombre_evento, 
                e.descripcion, 
                e.fecha_hora_evento, 
                e.lugar, 
                'Evento' AS tipo_evento, 
                e.miembro_creador_id,
                m.nombres, 
                m.apellidos
            FROM evento e
            LEFT JOIN miembro m ON e.miembro_creador_id = m.miembro_id
            WHERE (e.nombre_evento ILIKE $1 OR e.descripcion ILIKE $1 OR e.lugar ILIKE $1)
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);
        
        const countQuery = `
            SELECT COUNT(*) FROM evento e
            WHERE (e.nombre_evento ILIKE $1 OR e.descripcion ILIKE $1 OR e.lugar ILIKE $1)
        `;
        const totalRes = await pool.query(countQuery, [`%${busqueda}%`]);
        
        res.json({
            datos: rows,
            totalPaginas: Math.ceil(parseInt(totalRes.rows[0].count) / limite),
            paginaActual: parseInt(pagina)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al cargar eventos." });
    }
};

// --- CREAR (CREATE) ---
const createEvento = async (req, res) => {
    try {
        const { nombre_evento, descripcion, lugar, fecha_hora_evento, organizador_id } = req.body;
        
        await pool.query(
            `INSERT INTO evento (nombre_evento, descripcion, lugar, fecha_hora_evento, miembro_creador_id) 
             VALUES ($1, $2, $3, $4, $5)`,
            [nombre_evento, descripcion, lugar, fecha_hora_evento, organizador_id]
        );
        
        res.json({ message: 'Evento creado exitosamente' });
    } catch (err) {
        // Manejo de error de llave duplicada (nombre evento repetido)
        if(err.code === '23505') {
            return res.status(400).json({ error: 'Ya existe un evento con ese nombre.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// --- ACTUALIZAR (UPDATE) ---
const updateEvento = async (req, res) => {
    const idOriginal = req.params.id; // Nombre actual del evento
    const { nombre_evento, descripcion, lugar, fecha_hora_evento } = req.body;

    try {
        // Permitimos cambiar el nombre_evento (PK) actualizándolo en el WHERE
        await pool.query(
            `UPDATE evento 
             SET nombre_evento = $1, descripcion = $2, lugar = $3, fecha_hora_evento = $4 
             WHERE nombre_evento = $5`,
            [nombre_evento, descripcion, lugar, fecha_hora_evento, idOriginal]
        );
        res.json({ message: 'Evento actualizado correctamente' });
    } catch (err) {
        if(err.code === '23505') {
            return res.status(400).json({ error: 'El nuevo nombre ya está en uso por otro evento.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// --- ELIMINAR (DELETE) ---
const deleteEvento = async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query('DELETE FROM evento WHERE nombre_evento = $1', [id]);
        res.json({ message: 'Evento eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- VER PARTICIPANTES ---
const getParticipantes = async (req, res) => {
    try {
        const idEvento = req.params.id;
        
        // CORRECCIÓN: Usamos la tabla 'asiste_evento'
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, m.correo
            FROM miembro m
            JOIN asiste_evento a ON m.miembro_id = a.miembro_id
            WHERE a.nombre_evento = $1
            ORDER BY m.nombres ASC
        `;
        
        const { rows } = await pool.query(query, [idEvento]);
        res.json(rows);
    } catch (err) {
        console.error("Error participantes:", err);
        res.status(500).json({ error: err.message });
    }
};

const getOrganizadores = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT miembro_id, nombres, apellidos FROM miembro ORDER BY nombres');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    getEventos, 
    createEvento, 
    updateEvento, 
    deleteEvento, 
    getParticipantes,
    getOrganizadores 
};