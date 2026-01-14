const pool = require("../config/db.js");

// --- FUNCIONES ADMIN Y GENERALES ---

// Listar grupos
const getGrupos = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'nombre_grupo', dir = 'ASC' } = req.query;
        const limite = 8;
        const offset = (pagina - 1) * limite;

        const columnasValidas = ['nombre_grupo', 'tipo_grupo', 'categoria_grupo', 'fecha_creacion'];
        const sortCol = columnasValidas.includes(orden) ? orden : 'nombre_grupo';
        const sortDir = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const query = `
            SELECT g.nombre_grupo, g.descripcion, g.tipo_grupo, g.fecha_creacion, g.categoria_grupo,
                   g.miembro_creador_id, m.nombres, m.apellidos
            FROM grupo g
            LEFT JOIN miembro m ON g.miembro_creador_id = m.miembro_id
            WHERE g.nombre_grupo ILIKE $1 OR g.descripcion ILIKE $1 OR g.categoria_grupo ILIKE $1
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM grupo WHERE nombre_grupo ILIKE $1 OR descripcion ILIKE $1`, 
            [`%${busqueda}%`]
        );

        res.json({
            datos: rows,
            totalPaginas: Math.ceil(parseInt(countRes.rows[0].count) / limite),
            paginaActual: parseInt(pagina)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getGrupoById = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM grupo WHERE nombre_grupo = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Grupo no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREAR GRUPO (CORREGIDO PARA EVITAR ERROR DE LLAVE DUPLICADA)
const crearGrupo = async (req, res) => {
    const client = await pool.connect();
    try {
        const { nombre_grupo, descripcion, tipo_grupo, categoria_grupo, miembro_creador_id } = req.body;
        
        await client.query('BEGIN');

        // 1. Insertar el Grupo
        await client.query(
            `INSERT INTO grupo (nombre_grupo, descripcion, tipo_grupo, categoria_grupo, miembro_creador_id, fecha_creacion) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
            [nombre_grupo, descripcion, tipo_grupo, categoria_grupo, miembro_creador_id]
        );

        // 2. Unir al creador (Usando ON CONFLICT para manejar el Trigger)
        // Si el trigger ya lo insertó, esto actualiza el rol a 'Admin' para asegurar que tenga permisos
        await client.query(
            `INSERT INTO se_une_a (nombre_grupo, miembro_id, fecha_union, rol) 
             VALUES ($1, $2, CURRENT_DATE, 'Admin')
             ON CONFLICT (nombre_grupo, miembro_id) 
             DO UPDATE SET rol = 'Admin'`,
            [nombre_grupo, miembro_creador_id]
        );

        await client.query('COMMIT');
        res.json({ message: "Grupo creado exitosamente" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error al crear grupo:", err);
        // Error 23505 es violación de unicidad (Nombre de grupo repetido)
        if (err.code === '23505') {
            // Verificamos si el error viene de la tabla grupo o se_une_a para dar el mensaje correcto
            if (err.detail && err.detail.includes('nombre_grupo')) {
                return res.status(400).json({ error: "Ya existe un grupo con ese nombre." });
            }
        }
        res.status(500).json({ error: "Error al crear grupo: " + err.message });
    } finally {
        client.release();
    }
};

const updateGrupo = async (req, res) => {
    const { id } = req.params;
    const { descripcion, tipo_grupo, categoria_grupo } = req.body;
    try {
        const result = await pool.query(
            `UPDATE grupo SET descripcion = $1, tipo_grupo = $2, categoria_grupo = $3 WHERE nombre_grupo = $4`,
            [descripcion, tipo_grupo, categoria_grupo, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Grupo no encontrado" });
        res.json({ message: "Grupo actualizado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const eliminarGrupo = async (req, res) => {
    try {
        await pool.query('DELETE FROM grupo WHERE nombre_grupo = $1', [req.params.id]);
        res.json({ message: "Grupo eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getCreadores = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT miembro_id, nombres, apellidos FROM miembro ORDER BY nombres');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getMiembrosGrupo = async (req, res) => {
    try {
        const query = `
            SELECT m.miembro_id, m.nombres, m.apellidos, s.rol, s.fecha_union
            FROM se_une_a s
            JOIN miembro m ON s.miembro_id = m.miembro_id
            WHERE s.nombre_grupo = $1
        `;
        const { rows } = await pool.query(query, [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- FUNCIONES ESPECÍFICAS DE MIEMBRO ---

const getMisGrupos = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT g.*, s.rol, s.fecha_union 
            FROM grupo g
            JOIN se_une_a s ON g.nombre_grupo = s.nombre_grupo
            WHERE s.miembro_id = $1
        `;
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getGruposDisponibles = async (req, res) => {
    try {
        const { id, busqueda = '' } = req.query;
        const query = `
            SELECT * FROM grupo 
            WHERE nombre_grupo NOT IN (SELECT nombre_grupo FROM se_une_a WHERE miembro_id = $1)
            AND (nombre_grupo ILIKE $2 OR descripcion ILIKE $2)
            LIMIT 20
        `;
        const { rows } = await pool.query(query, [id, `%${busqueda}%`]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const unirseGrupo = async (req, res) => {
    try {
        const { nombre_grupo, miembro_id } = req.body;
        await pool.query(
            `INSERT INTO se_une_a (nombre_grupo, miembro_id, fecha_union, rol) VALUES ($1, $2, CURRENT_DATE, 'Miembro')`,
            [nombre_grupo, miembro_id]
        );
        res.json({ message: "Te has unido al grupo" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const salirGrupo = async (req, res) => {
    try {
        const { nombre_grupo, miembro_id } = req.body;
        await pool.query(
            `DELETE FROM se_une_a WHERE nombre_grupo = $1 AND miembro_id = $2`,
            [nombre_grupo, miembro_id]
        );
        res.json({ message: "Has salido del grupo" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = {
    getGrupos, getGrupoById, crearGrupo, updateGrupo, eliminarGrupo, 
    getCreadores, getMiembrosGrupo, getMisGrupos, getGruposDisponibles, 
    unirseGrupo, salirGrupo
};