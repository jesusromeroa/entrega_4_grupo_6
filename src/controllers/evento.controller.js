const pool = require('../config/db');

// Obtener eventos con paginación, búsqueda y orden
const getEventos = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'nombre_evento', dir = 'ASC' } = req.query;
        const limite = 8;
        const offset = (pagina - 1) * limite;

        // 1. Validar columnas para evitar inyección o errores
        // NOTA: 'tipo_evento' lo quitamos de aquí porque no es una columna real ordenable
        const columnasValidas = ['nombre_evento', 'fecha_hora_evento', 'lugar'];
        const sortCol = columnasValidas.includes(orden) ? orden : 'nombre_evento';
        const sortDir = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // 2. Construcción del WHERE dinámico
        // Usamos parámetros ($1) para evitar errores de sintaxis
        let whereClause = `WHERE (e.nombre_evento ILIKE $1 OR e.descripcion ILIKE $1)`; 
        // Si 'lugar' existe, lo añadimos a la búsqueda, si no, lo quitamos para asegurar que no falle.
        // Asumo que 'lugar' sí existe por tu código anterior.

        // 3. Consulta SQL
        // IMPORTANTE: 'Evento' AS tipo_evento es la clave para que no falle.
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
            ${whereClause}
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);

        // 4. Consulta de Conteo
        const countQuery = `
            SELECT COUNT(*) FROM evento e
            ${whereClause}
        `;
        const totalRes = await pool.query(countQuery, [`%${busqueda}%`]);
        const totalRegistros = parseInt(totalRes.rows[0].count);

        res.json({
            datos: rows,
            totalPaginas: Math.ceil(totalRegistros / limite),
            paginaActual: parseInt(pagina)
        });

    } catch (err) {
        console.error("Error FATAL en getEventos:", err); // Mira tu terminal negra para ver el error real
        res.status(500).json({ error: "Error interno del servidor: " + err.message });
    }
};

// Obtener lista de organizadores
const getOrganizadores = async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT m.miembro_id, m.nombres, m.apellidos 
            FROM miembro m
            JOIN evento e ON m.miembro_id = e.miembro_creador_id
            ORDER BY m.nombres ASC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getEventos, getOrganizadores };