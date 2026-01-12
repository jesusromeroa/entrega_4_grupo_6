const pool = require('../config/db');

// Obtener egresados con búsqueda, paginación y ordenamiento
const getEgresados = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'miembro_id', dir = 'ASC' } = req.query;
        const limite = 8; // Manteniendo consistencia de 8 registros
        const offset = (pagina - 1) * limite;

        const columnasValidas = ['miembro_id', 'nombres', 'apellidos', 'ano_graduacion', 'titulo_obtenido'];
        const sortCol = columnasValidas.includes(orden) ? orden : 'miembro_id';
        const sortDir = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const query = `
            SELECT e.egresado_id, e.miembro_id, e.ano_graduacion, e.titulo_obtenido,
                   m.nombres, m.apellidos, m.correo
            FROM egresado e
            JOIN miembro m ON e.miembro_id = m.miembro_id
            WHERE m.nombres ILIKE $1 OR m.apellidos ILIKE $1 OR m.correo ILIKE $1 OR e.titulo_obtenido ILIKE $1
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);

        const countQuery = `
            SELECT COUNT(*) FROM egresado e
            JOIN miembro m ON e.miembro_id = m.miembro_id
            WHERE m.nombres ILIKE $1 OR m.apellidos ILIKE $1 OR m.correo ILIKE $1 OR e.titulo_obtenido ILIKE $1
        `;
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

// Obtener candidatos (Miembros que NO son egresados aún)
const getCandidatos = async (req, res) => {
    try {
        const query = `
            SELECT miembro_id, nombres, apellidos, correo 
            FROM miembro 
            WHERE miembro_id NOT IN (SELECT miembro_id FROM egresado)
            ORDER BY nombres ASC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener un egresado por ID (Para edición)
const getEgresadoById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT e.miembro_id, m.nombres, m.apellidos, e.ano_graduacion, e.titulo_obtenido
            FROM egresado e
            JOIN miembro m ON e.miembro_id = m.miembro_id
            WHERE e.miembro_id = $1
        `;
        const { rows } = await pool.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Egresado no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Registrar Egresado
const crearEgresado = async (req, res) => {
    const { miembro_id, ano_graduacion, titulo_obtenido } = req.body;
    try {
        await pool.query(
            'INSERT INTO egresado (miembro_id, ano_graduacion, titulo_obtenido) VALUES ($1, $2, $3)',
            [miembro_id, ano_graduacion, titulo_obtenido]
        );
        res.json({ mensaje: "Egresado registrado con éxito" });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Este miembro ya es egresado" });
        res.status(500).json({ error: err.message });
    }
};

// Actualizar Egresado
const updateEgresado = async (req, res) => {
    const { id } = req.params;
    const { ano_graduacion, titulo_obtenido } = req.body;
    try {
        const query = `
            UPDATE egresado 
            SET ano_graduacion = $1, titulo_obtenido = $2 
            WHERE miembro_id = $3
            RETURNING *
        `;
        const resultado = await pool.query(query, [ano_graduacion, titulo_obtenido, id]);
        
        if (resultado.rows.length === 0) return res.status(404).json({ error: "Registro no encontrado" });
        res.json({ mensaje: "Datos de egresado actualizados" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar Egresado (Quitar rol)
const eliminarEgresado = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM egresado WHERE miembro_id = $1', [id]);
        res.json({ mensaje: "Rol de egresado eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    getEgresados, 
    getCandidatos, 
    getEgresadoById, 
    crearEgresado, 
    updateEgresado, 
    eliminarEgresado 
};