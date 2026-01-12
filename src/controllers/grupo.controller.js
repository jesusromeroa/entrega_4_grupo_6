const pool = require('../config/db');

// Obtener grupos con paginación, búsqueda y orden
const getGrupos = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'nombre_grupo', dir = 'ASC' } = req.query;
        const limite = 8;
        const offset = (pagina - 1) * limite;

        // Validar columnas (nombre_grupo es la PK)
        const columnasValidas = ['nombre_grupo', 'tipo_grupo', 'categoria_grupo', 'fecha_creacion'];
        const sortCol = columnasValidas.includes(orden) ? orden : 'nombre_grupo';
        const sortDir = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const query = `
            SELECT g.nombre_grupo, g.descripcion, g.tipo_grupo, g.fecha_creacion, g.categoria_grupo,
                   g.miembro_creador_id, m.nombres, m.apellidos, m.correo
            FROM grupo g
            LEFT JOIN miembro m ON g.miembro_creador_id = m.miembro_id
            WHERE g.nombre_grupo ILIKE $1 OR g.descripcion ILIKE $1 OR g.categoria_grupo ILIKE $1
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);

        const countQuery = `
            SELECT COUNT(*) FROM grupo g
            WHERE g.nombre_grupo ILIKE $1 OR g.descripcion ILIKE $1 OR g.categoria_grupo ILIKE $1
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

// Obtener un grupo por Nombre (PK)
const getGrupoById = async (req, res) => {
    const { id } = req.params; // id aquí será el nombre_grupo
    try {
        const query = `SELECT * FROM grupo WHERE nombre_grupo = $1`;
        const { rows } = await pool.query(query, [id]);
        
        if (rows.length === 0) return res.status(404).json({ error: "Grupo no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Crear Grupo
const crearGrupo = async (req, res) => {
    const { nombre_grupo, descripcion, tipo_grupo, categoria_grupo, miembro_creador_id } = req.body;
    try {
        await pool.query(
            `INSERT INTO grupo (nombre_grupo, descripcion, tipo_grupo, categoria_grupo, miembro_creador_id, fecha_creacion) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
            [nombre_grupo, descripcion, tipo_grupo, categoria_grupo, miembro_creador_id]
        );
        res.json({ mensaje: "Grupo creado exitosamente" });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Ya existe un grupo con este nombre" });
        res.status(500).json({ error: err.message });
    }
};

// Actualizar Grupo (El nombre NO se edita porque es PK)
const updateGrupo = async (req, res) => {
    const { id } = req.params; // id es el nombre_grupo original
    const { descripcion, tipo_grupo, categoria_grupo } = req.body;
    try {
        const query = `
            UPDATE grupo 
            SET descripcion = $1, tipo_grupo = $2, categoria_grupo = $3 
            WHERE nombre_grupo = $4
        `;
        const resultado = await pool.query(query, [descripcion, tipo_grupo, categoria_grupo, id]);
        
        if (resultado.rowCount === 0) return res.status(404).json({ error: "Grupo no encontrado" });
        res.json({ mensaje: "Grupo actualizado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar Grupo
const eliminarGrupo = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM grupo WHERE nombre_grupo = $1', [id]);
        res.json({ mensaje: "Grupo eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener lista de posibles creadores (Cualquier miembro)
const getCreadores = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT miembro_id, nombres, apellidos, correo FROM miembro ORDER BY nombres ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ... (código existente anterior se mantiene igual)

// Nueva Función: Obtener miembros de un grupo específico
const getMiembrosGrupo = async (req, res) => {
    const { id } = req.params; // id es el nombre del grupo
    try {
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, m.correo, m.foto_perfil_url,
                   s.fecha_union, s.rol
            FROM se_une_a s
            JOIN miembro m ON s.miembro_id = m.miembro_id
            WHERE s.nombre_grupo = $1
            ORDER BY s.fecha_union DESC
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


module.exports = { 
    getGrupos, 
    getGrupoById, 
    crearGrupo, 
    updateGrupo, 
    eliminarGrupo,
    getCreadores,
    getMiembrosGrupo // <--- ¿Está esto aquí?
};