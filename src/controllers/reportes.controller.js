const pool = require("../config/db.js");

const getDashboardData = async (req, res) => {
    try {
        console.log("📊 Generando reportes ejecutivos...");

        // 1. Usuarios Bloqueados
        const q1 = await pool.query(`
            SELECT correo, nombres, apellidos, estatus 
            FROM "miembro" 
            WHERE estatus IN ('Bloqueado', 'Suspendido')
        `);

        // 2. Tendencias de Grupos
        const q2 = await pool.query(`
            SELECT res.nombre, res.categoria, res.nuevos, res.tendencia
            FROM "grupo" g
            CROSS JOIN LATERAL fn_tendencia_crecimiento_grupos(g.nombre_grupo, CURRENT_DATE) res
            ORDER BY res.nuevos DESC LIMIT 5
        `);

        // 3. Demografía (Cohortes)
        const q3 = await pool.query(`
            WITH Unificacion_Roles AS (
                SELECT 'Estudiante' AS Categoria, m.fecha_registro FROM "estudiante" e JOIN "miembro" m ON e.miembro_id = m.miembro_id
                UNION ALL SELECT 'Profesor' AS Categoria, m.fecha_registro FROM "profesor" p JOIN "miembro" m ON p.miembro_id = m.miembro_id
                UNION ALL SELECT 'Egresado' AS Categoria, m.fecha_registro FROM "egresado" eg JOIN "miembro" m ON eg.miembro_id = m.miembro_id
            ), Metricas AS (
                SELECT Categoria, COUNT(*) as Total, 
                SUM(CASE WHEN fecha_registro >= CURRENT_DATE - 30 THEN 1 ELSE 0 END) as U30 
                FROM Unificacion_Roles GROUP BY ROLLUP(Categoria)
            )
            SELECT COALESCE(Categoria, 'TOTAL MIEMBROS') as categoria, Total as total, U30 as u30,
            ROUND((U30::numeric / NULLIF((Total - U30), 0) * 100), 1) || '%' as crecimiento
            FROM Metricas ORDER BY CASE WHEN Categoria IS NULL THEN 1 ELSE 0 END
        `);

        // 4. Acceso a Bolsa
        const q4 = await pool.query(`
            SELECT 'Estudiante' as rol, m.nombres, m.apellidos, m.correo, ('Semestre: ' || e.semestre_actual) as detalle
            FROM estudiante e JOIN miembro m ON e.miembro_id = m.miembro_id WHERE m.estatus = 'Activo'
            UNION ALL
            SELECT 'Egresado' as rol, m.nombres, m.apellidos, m.correo, ('Graduado: ' || eg.ano_graduacion) as detalle
            FROM egresado eg JOIN miembro m ON eg.miembro_id = m.miembro_id WHERE m.estatus = 'Activo'
            ORDER BY rol, apellidos LIMIT 15
        `);

        // 5. Efectividad Empleos
        const q5 = await pool.query(`
            SELECT oe.titulo_cargo, COALESCE(oe.nombre_dependencia, oe.rif_organizacion) as origen, p.estado,
            COUNT(sp.miembro_id) as total_postulaciones
            FROM oferta_empleo oe
            JOIN publicacion p ON oe.clave_oferta = p.clave_publicacion
            LEFT JOIN se_postula sp ON oe.clave_oferta = sp.clave_oferta
            GROUP BY oe.titulo_cargo, origen, p.estado
            ORDER BY total_postulaciones DESC LIMIT 10
        `);

        // 6. Engagement
        const q6 = await pool.query(`
            SELECT * FROM publicacion p
            CROSS JOIN LATERAL calcular_interacciones_ponderadas(p.clave_publicacion)
            WHERE p.estado = 'Activo'
            ORDER BY puntaje_engagement DESC LIMIT 5
        `);

        // 7. Intereses (SIMULADO - SIN TABLA)
        const q7 = { rows: [
            { nombre_area: 'Desarrollo Web', total_interesados: 45 },
            { nombre_area: 'Inteligencia Artificial', total_interesados: 32 },
            { nombre_area: 'Marketing Digital', total_interesados: 28 },
            { nombre_area: 'Gerencia', total_interesados: 15 },
            { nombre_area: 'Finanzas', total_interesados: 10 }
        ]};

        // 8. Votaciones (SIMULADO - SIN TABLA)
        const q8 = { rows: [
            { titulo: 'Elecciones Centro Estudiantes', votos_totales: 120, estado: 'Cerrado' },
            { titulo: 'Representante Profesoral', votos_totales: 45, estado: 'Activo' },
            { titulo: 'Reforma Reglamento', votos_totales: 80, estado: 'Cerrado' }
        ]};

        // Gráfico Línea
        const q_grafico = await pool.query(`
            SELECT TO_CHAR(fecha_registro, 'YYYY-MM') AS mes, COUNT(*) AS total_nuevos
            FROM miembro WHERE fecha_registro >= NOW() - INTERVAL '6 months'
            GROUP BY mes ORDER BY mes
        `);

        res.json({
            bloqueados: q1.rows,
            tendencias: q2.rows,
            demografia: q3.rows,
            bolsa: q4.rows,
            empleos: q5.rows,
            engagement: q6.rows,
            intereses: q7.rows,
            votaciones: q8.rows,
            grafico_linea: q_grafico.rows 
        });

    } catch (err) {
        console.error("❌ Error en reportes:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getDashboardData };