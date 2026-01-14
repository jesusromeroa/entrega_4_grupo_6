--
-- PostgreSQL database dump
--

\restrict fmm5Wkklu24PftkL0BY0DaT7c9jifNfJcivxq5bYwuiFdFb9Zj9hBg2toasiwed

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-01-14 07:49:19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5454 (class 1262 OID 16492)
-- Name: soyucab; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE soyucab WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'Spanish_Spain.1252';


ALTER DATABASE soyucab OWNER TO postgres;

\unrestrict fmm5Wkklu24PftkL0BY0DaT7c9jifNfJcivxq5bYwuiFdFb9Zj9hBg2toasiwed
\connect soyucab
\restrict fmm5Wkklu24PftkL0BY0DaT7c9jifNfJcivxq5bYwuiFdFb9Zj9hBg2toasiwed

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 16493)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- TOC entry 5456 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- TOC entry 338 (class 1255 OID 16598)
-- Name: auto_admin_grupo(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_admin_grupo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO public.se_une_a (nombre_grupo, miembro_id, rol, fecha_union)
    VALUES (NEW.nombre_grupo, NEW.miembro_creador_id, 'admin', NOW());
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_admin_grupo() OWNER TO postgres;

--
-- TOC entry 281 (class 1255 OID 17193)
-- Name: calcular_interacciones_ponderadas(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calcular_interacciones_ponderadas(p_id_publicacion integer) RETURNS TABLE(id_publicacion integer, total_comentarios integer, total_reacciones integer, puntaje_engagement integer, clasificacion_engagement character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_estado_pub varchar;
    v_total_comentarios integer;
    v_total_reacciones integer;
    v_puntaje integer;
    v_clasificacion varchar;
BEGIN
    -- 1. VALIDACIÓN: Verificar existencia y estado de la publicación
    SELECT estado INTO v_estado_pub
    FROM public.publicacion
    WHERE clave_publicacion = p_id_publicacion;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La publicación con ID % no existe.', p_id_publicacion;
    END IF;

    IF v_estado_pub <> 'Activo' THEN
        RAISE EXCEPTION 'La publicación % no está activa (Estado: %), no se puede calcular engagement.', p_id_publicacion, v_estado_pub;
    END IF;

    -- 2. CONTEO: Contar comentarios (solo los no eliminados/Activos)
    SELECT COUNT(*) INTO v_total_comentarios
    FROM public.comentario
    WHERE clave_publicacion = p_id_publicacion
      AND estatus = 'Activo'; -- Ajusta 'Activo' según cómo manejes tus borrados lógicos

    -- 3. CONTEO: Contar reacciones
    SELECT COUNT(*) INTO v_total_reacciones
    FROM public.reaction_publicacion
    WHERE clave_publicacion = p_id_publicacion;

    -- 4. CÁLCULO: Fórmula ponderada
    -- (Comentarios * 2) + (Reacciones * 1)
    v_puntaje := (v_total_comentarios * 2) + (v_total_reacciones * 1);

    -- 5. CLASIFICACIÓN: Rangos predefinidos (Puedes ajustar estos números)
    IF v_puntaje >= 50 THEN
        v_clasificacion := 'Alto';
    ELSIF v_puntaje >= 10 THEN
        v_clasificacion := 'Medio';
    ELSE
        v_clasificacion := 'Bajo';
    END IF;

    -- 6. RETORNO: Asignamos valores a las columnas de salida
    id_publicacion := p_id_publicacion;
    total_comentarios := v_total_comentarios;
    total_reacciones := v_total_reacciones;
    puntaje_engagement := v_puntaje;
    clasificacion_engagement := v_clasificacion;

    RETURN NEXT;
END;
$$;


ALTER FUNCTION public.calcular_interacciones_ponderadas(p_id_publicacion integer) OWNER TO postgres;

--
-- TOC entry 296 (class 1255 OID 16599)
-- Name: fn_agregar_creador_a_conversacion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_agregar_creador_a_conversacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Insertar el creador en la tabla participa_en automáticamente
    INSERT INTO public.participa_en (conversacion_id, miembro_id, fecha_union)
    VALUES (NEW.conversacion_id, NEW.miembro_creador_id, NEW.fecha_inicio);
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_agregar_creador_a_conversacion() OWNER TO postgres;

--
-- TOC entry 339 (class 1255 OID 17194)
-- Name: fn_puede_ver_publicacion(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_puede_ver_publicacion(p_visor_id integer, p_publicacion_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    rec_pub RECORD;       -- Datos de la publicación
    v_estado_visor TEXT;  -- Estado del usuario (Activo/Suspendido)
    v_es_miembro_grupo INT;
    v_estado_org TEXT;
    v_rol_visor TEXT;
BEGIN
    -- 1. Obtener datos básicos de la publicación y del visor
    SELECT * INTO rec_pub FROM PUBLICACION WHERE publicacion_id = p_publicacion_id;
    SELECT estatus INTO v_estado_visor FROM MIEMBRO WHERE miembro_id = p_visor_id;

    -- Si el visor está suspendido globalmente, no ve nada
    IF v_estado_visor IN ('Suspendido', 'Bloqueado') THEN
        RETURN FALSE;
    END IF;

    -- Si el autor bloqueó al visor explícitamente, no ve nada
    PERFORM 1 FROM RELACION_MIEMBRO 
    WHERE miembro_origen_id = rec_pub.miembro_autor_id 
      AND miembro_destino_id = p_visor_id 
      AND tipo_relacion = 'Bloqueado';
      
    IF FOUND THEN RETURN FALSE; END IF;

    -- === LÓGICA SEGÚN TIPO DE PUBLICACIÓN === --
    
    -- CASO A: Publicación en GRUPO PRIVADO
    IF rec_pub.tipo_publicacion = 'Grupo' AND rec_pub.es_grupo_privado = TRUE THEN
        -- Verificar si es miembro activo del grupo
        SELECT 1 INTO v_es_miembro_grupo 
        FROM MIEMBRO_GRUPO 
        WHERE grupo_id = rec_pub.grupo_id 
          AND miembro_id = p_visor_id 
          AND estado_miembro_grupo = 'Activo';
          
        -- Verificar si tiene reporte sancionado en ese grupo
        PERFORM 1 FROM REPORTE 
        WHERE miembro_reportado_id = p_visor_id 
          AND grupo_id = rec_pub.grupo_id 
          AND estado_reporte = 'Sancionado';
          
        IF v_es_miembro_grupo = 1 AND NOT FOUND THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;

    -- CASO B: Publicación en GRUPO PÚBLICO
    ELSIF rec_pub.tipo_publicacion = 'Grupo' AND rec_pub.es_grupo_privado = FALSE THEN
        -- Visible para todos los no bloqueados (ya validado arriba)
        RETURN TRUE;

    -- CASO C: OFERTA DE EMPLEO (Solo Estudiantes/Egresados y Org Aprobada)
    ELSIF rec_pub.tipo_publicacion = 'Oferta Empleo' THEN
        -- Verificar si la Org está aprobada
        SELECT estado_organizacion INTO v_estado_org
        FROM ORGANIZACION_EXTERNA 
        WHERE organizacion_id = rec_pub.organizacion_id;

        IF v_estado_org <> 'Aprobada' THEN RETURN FALSE; END IF;

        -- Verificar si el visor es Estudiante o Egresado
        PERFORM 1 FROM ESTUDIANTE WHERE estudiante_id = p_visor_id;
        IF FOUND THEN RETURN TRUE; END IF;
        
        PERFORM 1 FROM EGRESADO WHERE egresado_id = p_visor_id;
        IF FOUND THEN RETURN TRUE; END IF;

        -- Si es Profesor o Admin, NO ve la oferta (según reglas)
        RETURN FALSE;

    -- CASO D: Publicación PERSONAL (Muro)
    ELSIF rec_pub.tipo_publicacion = 'Personal' THEN
        -- Si es el autor, ve todo
        IF rec_pub.miembro_autor_id = p_visor_id THEN RETURN TRUE; END IF;

        -- Si el alcance es 'Solo yo'
        IF rec_pub.alcance = 'Solo yo' THEN RETURN FALSE; END IF;

        -- Si el alcance es 'Amigos/Conexiones'
        -- Verificamos si existe relación de amistad o seguimiento
        PERFORM 1 FROM RELACION_MIEMBRO 
        WHERE (miembro_origen_id = rec_pub.miembro_autor_id AND miembro_destino_id = p_visor_id)
           OR (miembro_origen_id = p_visor_id AND miembro_destino_id = rec_pub.miembro_autor_id)
           AND tipo_relacion IN ('Amigo', 'Seguidor');
           
        IF FOUND THEN RETURN TRUE; END IF;
        
        RETURN FALSE; -- Si no hay relación, no ve
    END IF;

    -- Por defecto, denegar
    RETURN FALSE;
END;
$$;


ALTER FUNCTION public.fn_puede_ver_publicacion(p_visor_id integer, p_publicacion_id integer) OWNER TO postgres;

--
-- TOC entry 301 (class 1255 OID 17188)
-- Name: fn_tendencia_crecimiento_grupos(character varying, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_tendencia_crecimiento_grupos(p_nombre_grupo character varying, p_fecha_referencia date) RETURNS TABLE(nombre character varying, categoria character varying, nuevos integer, tendencia character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_cat VARCHAR;
    v_count INTEGER;
    v_ind VARCHAR;
BEGIN
    -- A. Buscar Categoría
    -- Usamos COALESCE por si el grupo no tiene categoría
    SELECT categoria_grupo INTO v_cat 
    FROM "grupo" 
    WHERE nombre_grupo = p_nombre_grupo;

    -- B. Contar nuevos miembros (últimos 30 días)
    SELECT COUNT(*)::INTEGER INTO v_count 
    FROM "se_une_a" 
    WHERE nombre_grupo = p_nombre_grupo 
    AND fecha_union >= (p_fecha_referencia - INTERVAL '30 days');

    -- C. Determinar Tendencia
    IF v_count > 0 THEN 
        v_ind := 'En crecimiento'; 
    ELSE 
        v_ind := 'Estable'; 
    END IF;

    -- D. Retornar los datos limpios
    RETURN QUERY SELECT 
        p_nombre_grupo, 
        COALESCE(v_cat, 'Sin Categoría'), 
        v_count, 
        v_ind;
END;
$$;


ALTER FUNCTION public.fn_tendencia_crecimiento_grupos(p_nombre_grupo character varying, p_fecha_referencia date) OWNER TO postgres;

--
-- TOC entry 292 (class 1255 OID 16601)
-- Name: normalizar_ciudad(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalizar_ciudad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.nombre_ciudad := LOWER(NEW.nombre_ciudad);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.normalizar_ciudad() OWNER TO postgres;

--
-- TOC entry 300 (class 1255 OID 16602)
-- Name: normalizar_ciudad_miembro(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalizar_ciudad_miembro() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.nombre_ciudad IS NOT NULL THEN
        NEW.nombre_ciudad := LOWER(NEW.nombre_ciudad);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.normalizar_ciudad_miembro() OWNER TO postgres;

--
-- TOC entry 354 (class 1255 OID 16603)
-- Name: normalizar_estado(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalizar_estado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.nombre_estado := LOWER(NEW.nombre_estado);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.normalizar_estado() OWNER TO postgres;

--
-- TOC entry 326 (class 1255 OID 16604)
-- Name: normalizar_pais(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalizar_pais() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.nombre_pais := LOWER(NEW.nombre_pais);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.normalizar_pais() OWNER TO postgres;

--
-- TOC entry 328 (class 1255 OID 16605)
-- Name: normalizar_tipo_grupo(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalizar_tipo_grupo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Convierte a mayúscula inicial: 'publico' → 'Publico', 'privado' → 'Privado'
    NEW.tipo_grupo := INITCAP(LOWER(NEW.tipo_grupo));
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.normalizar_tipo_grupo() OWNER TO postgres;

--
-- TOC entry 304 (class 1255 OID 16606)
-- Name: set_estudiante_miembro_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_estudiante_miembro_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Solo si no viene miembro_id pero sí viene el correo
    IF NEW.miembro_id IS NULL AND NEW.estudiante_correo IS NOT NULL THEN
        SELECT m.miembro_id
        INTO NEW.miembro_id
        FROM public.miembro m
        WHERE m.correo = NEW.estudiante_correo;

        -- Si no existe ese correo en miembro, lanzar error
        IF NEW.miembro_id IS NULL THEN
            RAISE EXCEPTION 'No existe miembro con correo %', NEW.estudiante_correo;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_estudiante_miembro_id() OWNER TO postgres;

--
-- TOC entry 329 (class 1255 OID 17195)
-- Name: sp_aprobar_organizacion(integer, integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_aprobar_organizacion(IN p_id_admin integer, IN p_id_organizacion integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_es_admin BOOLEAN;
BEGIN
    -- Verificamos si el usuario tiene rol de Administrador (asumiendo un campo booleano o tabla rol)
    SELECT es_administrador INTO v_es_admin 
    FROM MIEMBRO WHERE miembro_id = p_id_admin;

    IF v_es_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Seguridad: Solo un Administrador del Sistema puede aprobar organizaciones.';
    END IF;

    -- Si es admin, procedemos
    UPDATE ORGANIZACION_EXTERNA
    SET estado_organizacion = 'Aprobada'
    WHERE organizacion_id = p_id_organizacion;
    
    RAISE NOTICE 'Organización aprobada exitosamente.';
END;
$$;


ALTER PROCEDURE public.sp_aprobar_organizacion(IN p_id_admin integer, IN p_id_organizacion integer) OWNER TO postgres;

--
-- TOC entry 288 (class 1255 OID 17191)
-- Name: sp_aprobar_organizacion(integer, character varying); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_aprobar_organizacion(IN p_id_admin integer, IN p_rif_organizacion character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_es_admin BOOLEAN;
BEGIN
    -- 1. Verificamos si es admin
    SELECT es_administrador INTO v_es_admin 
    FROM MIEMBRO WHERE miembro_id = p_id_admin;

    IF v_es_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Seguridad: Solo un Administrador del Sistema puede aprobar organizaciones.';
    END IF;

    -- 2. Actualizamos usando el RIF
    UPDATE ORGANIZACION_EXTERNA
    SET status = 'Aprobada'
    WHERE rif = p_rif_organizacion; -- <--- Aquí estaba el problema antes

    IF NOT FOUND THEN
        RAISE NOTICE 'No se encontró ninguna organización con RIF %', p_rif_organizacion;
    ELSE
        RAISE NOTICE 'Organización % aprobada exitosamente.', p_rif_organizacion;
    END IF;
END;
$$;


ALTER PROCEDURE public.sp_aprobar_organizacion(IN p_id_admin integer, IN p_rif_organizacion character varying) OWNER TO postgres;

--
-- TOC entry 286 (class 1255 OID 17318)
-- Name: sp_publicar_alquiler(integer, character varying, text, numeric, character varying, character varying, character varying); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_publicar_alquiler(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_precio numeric, IN p_condiciones character varying, IN p_tipo_inmueble character varying, IN p_nombre_ciudad character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_pub integer;
BEGIN
    INSERT INTO public.publicacion (clave_miembro_creador, descripcion_texto, estado)
    VALUES (p_miembro_id, p_descripcion, 'Activo')
    RETURNING clave_publicacion INTO v_id_pub;

    INSERT INTO public.inmueble_alquiler (
        clave_inmueble, titulo_inmueble, precio_alquiler, condiciones, nombre_tipo, nombre_ciudad
    )
    VALUES (
        v_id_pub, p_titulo, p_precio, p_condiciones, p_tipo_inmueble, p_nombre_ciudad
    );
    
    RAISE NOTICE 'Alquiler publicado con ID: %', v_id_pub;
END;
$$;


ALTER PROCEDURE public.sp_publicar_alquiler(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_precio numeric, IN p_condiciones character varying, IN p_tipo_inmueble character varying, IN p_nombre_ciudad character varying) OWNER TO postgres;

--
-- TOC entry 318 (class 1255 OID 17317)
-- Name: sp_publicar_articulo(integer, character varying, text, numeric, character varying); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_publicar_articulo(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_precio numeric, IN p_categoria character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_pub integer;
BEGIN
    INSERT INTO public.publicacion (clave_miembro_creador, descripcion_texto, estado)
    VALUES (p_miembro_id, p_descripcion, 'Activo')
    RETURNING clave_publicacion INTO v_id_pub;

    INSERT INTO public.articulo_mkt (clave_articulo, titulo_articulo, precio, nombre_categoria)
    VALUES (v_id_pub, p_titulo, p_precio, p_categoria);
    
    RAISE NOTICE 'Artículo publicado con ID: %', v_id_pub;
END;
$$;


ALTER PROCEDURE public.sp_publicar_articulo(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_precio numeric, IN p_categoria character varying) OWNER TO postgres;

--
-- TOC entry 313 (class 1255 OID 17196)
-- Name: sp_publicar_oferta_empleo(integer, text, character varying, character varying, character varying, character varying, character varying); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_publicar_oferta_empleo(IN p_miembro_id integer, IN p_descripcion_publicacion text, IN p_titulo_cargo character varying, IN p_tipo_contrato character varying, IN p_requisitos character varying, IN p_nombre_dependencia character varying, IN p_rif_organizacion character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_nueva_clave_publicacion integer;
BEGIN
    IF (p_nombre_dependencia IS NOT NULL AND p_rif_organizacion IS NOT NULL) THEN
        RAISE EXCEPTION 'Error: Una oferta no puede ser de Dependencia y Organización Externa a la vez.';
    END IF;
    IF (p_nombre_dependencia IS NULL AND p_rif_organizacion IS NULL) THEN
        RAISE EXCEPTION 'Error: Debe especificar el origen de la oferta.';
    END IF;

    INSERT INTO public.publicacion (clave_miembro_creador, descripcion_texto, estado, fecha_creacion)
    VALUES (p_miembro_id, p_descripcion_publicacion, 'Activo', CURRENT_TIMESTAMP)
    RETURNING clave_publicacion INTO v_nueva_clave_publicacion;

    INSERT INTO public.oferta_empleo (
        clave_oferta, titulo_cargo, tipo_contrato, requisitos, nombre_dependencia, rif_organizacion
    )
    VALUES (
        v_nueva_clave_publicacion, p_titulo_cargo, p_tipo_contrato, p_requisitos, p_nombre_dependencia, p_rif_organizacion
    );
    RAISE NOTICE 'Oferta publicada con ID: %', v_nueva_clave_publicacion;
END;
$$;


ALTER PROCEDURE public.sp_publicar_oferta_empleo(IN p_miembro_id integer, IN p_descripcion_publicacion text, IN p_titulo_cargo character varying, IN p_tipo_contrato character varying, IN p_requisitos character varying, IN p_nombre_dependencia character varying, IN p_rif_organizacion character varying) OWNER TO postgres;

--
-- TOC entry 334 (class 1255 OID 17316)
-- Name: sp_publicar_recomendacion(integer, character varying, text, character varying, character varying, integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_publicar_recomendacion(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_categoria character varying, IN p_ubicacion character varying, IN p_puntuacion integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_pub integer;
BEGIN
    INSERT INTO public.publicacion (clave_miembro_creador, descripcion_texto, estado)
    VALUES (p_miembro_id, p_descripcion, 'Activo')
    RETURNING clave_publicacion INTO v_id_pub;

    INSERT INTO public.recomendacion (clave_recomendacion, titulo_recomendacion)
    VALUES (v_id_pub, p_titulo);

    IF p_categoria = 'Culinaria' THEN
        INSERT INTO public.rec_culinaria (clave_rec_culinaria, rango_precio, ubicacion_local)
        VALUES (v_id_pub, 'N/A', p_ubicacion);
    ELSIF p_categoria = 'Artistica' THEN
        INSERT INTO public.rec_artistica (clave_rec_artistica, autor_artista, plataforma)
        VALUES (v_id_pub, 'N/A', p_ubicacion);
    ELSIF p_categoria = 'Academica' THEN
        INSERT INTO public.rec_academica (clave_rec_academica, autor_referencia, enlace_externo)
        VALUES (v_id_pub, 'N/A', p_ubicacion);
    END IF;

    RAISE NOTICE 'Recomendación publicada con ID: %', v_id_pub;
END;
$$;


ALTER PROCEDURE public.sp_publicar_recomendacion(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_categoria character varying, IN p_ubicacion character varying, IN p_puntuacion integer) OWNER TO postgres;

--
-- TOC entry 275 (class 1255 OID 16607)
-- Name: sp_registrar_estudiante(character varying, character varying, character varying, character varying, integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_registrar_estudiante(p_correo character varying, p_password_hash character varying, p_nombres character varying, p_apellidos character varying, p_semestre_actual integer, p_situacion_academica character varying) RETURNS TABLE(estudiante_id integer, mensaje character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_miembro_id INTEGER;
    v_estudiante_id INTEGER;
BEGIN
    BEGIN
        -- PASO 1: Insertar en MIEMBRO
        INSERT INTO public.miembro (
            correo, password_hash, nombres, apellidos, fecha_registro
        )
        VALUES (
            p_correo, p_password_hash, p_nombres, p_apellidos, NOW()
        )
        RETURNING miembro_id INTO v_miembro_id;
        
        -- PASO 2: Insertar en ESTUDIANTE
        INSERT INTO public.estudiante (
            miembro_id, semestre_actual, situacion_academica
        )
        VALUES (
            v_miembro_id, p_semestre_actual, p_situacion_academica
        )
        RETURNING public.estudiante.estudiante_id INTO v_estudiante_id;  -- ← Especificar tabla
        
        -- PASO 3: Retornar éxito
        RETURN QUERY SELECT 
            v_estudiante_id::INTEGER, 
            ('Estudiante registrado exitosamente')::VARCHAR;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            -1::INTEGER, 
            ('Error: ' || SQLERRM)::VARCHAR;
    END;
END;
$$;


ALTER FUNCTION public.sp_registrar_estudiante(p_correo character varying, p_password_hash character varying, p_nombres character varying, p_apellidos character varying, p_semestre_actual integer, p_situacion_academica character varying) OWNER TO postgres;

--
-- TOC entry 323 (class 1255 OID 16608)
-- Name: validar_correo_estudiante(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_correo_estudiante() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_correo VARCHAR(100);
BEGIN
    SELECT correo INTO v_correo
    FROM public.miembro
    WHERE miembro_id = NEW.miembro_id;
    
    IF NOT (v_correo LIKE '%@ucab.edu.ve') THEN
        RAISE EXCEPTION 'El correo del estudiante debe ser @ucab.edu.ve';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_correo_estudiante() OWNER TO postgres;

--
-- TOC entry 273 (class 1255 OID 16609)
-- Name: validar_correo_profesor(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_correo_profesor() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_correo VARCHAR(100);
BEGIN
    SELECT correo INTO v_correo
    FROM public.miembro
    WHERE miembro_id = NEW.miembro_id;
    
    IF NOT (v_correo LIKE '%@ucab.edu.ve') THEN
        RAISE EXCEPTION 'El correo del profesor debe ser @ucab.edu.ve';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_correo_profesor() OWNER TO postgres;

--
-- TOC entry 335 (class 1255 OID 16610)
-- Name: validar_integridad_temporal_evento(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_integridad_temporal_evento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_fecha_creacion TIMESTAMP;
BEGIN
    -- Obtener la fecha_creacion de la publicacion
    SELECT fecha_creacion INTO v_fecha_creacion
    FROM public.publicacion
    WHERE clave_publicacion = NEW.clave_publicacion;
    
    -- Comparar: fecha_hora_evento debe ser POSTERIOR a fecha_creacion
    IF NEW.fecha_hora_evento <= v_fecha_creacion THEN
        RAISE EXCEPTION 'La fecha y hora del evento (%) debe ser posterior a la fecha de creación de la publicación (%)',
            NEW.fecha_hora_evento, v_fecha_creacion;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_integridad_temporal_evento() OWNER TO postgres;

--
-- TOC entry 349 (class 1255 OID 17197)
-- Name: validar_no_auto_reporte(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_no_auto_reporte() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    id_creador_original integer;
BEGIN
    -- Obtenemos el ID del miembro que creó la publicación
    -- Buscamos en la tabla 'publicacion' usando la FK 'clave_publicacion'
    SELECT clave_miembro_creador INTO id_creador_original
    FROM public.publicacion
    WHERE clave_publicacion = NEW.clave_publicacion;

    -- Validamos: Si el que reporta (NEW.miembro_id) es el mismo que creó la publicación
    IF id_creador_original = NEW.miembro_id THEN
        RAISE EXCEPTION 'Integridad de Reporte violada: El miembro % es el autor de la publicación % y no puede autoreportarse.', 
        NEW.miembro_id, NEW.clave_publicacion;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_no_auto_reporte() OWNER TO postgres;

--
-- TOC entry 289 (class 1255 OID 16611)
-- Name: validar_no_solapamiento_est_egr_insert_egr(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_no_solapamiento_est_egr_insert_egr() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.estudiante WHERE miembro_id = NEW.miembro_id) THEN
        RAISE EXCEPTION 'Un miembro no puede ser ESTUDIANTE y EGRESADO al mismo tiempo';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_no_solapamiento_est_egr_insert_egr() OWNER TO postgres;

--
-- TOC entry 331 (class 1255 OID 16612)
-- Name: validar_no_solapamiento_est_egr_insert_est(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_no_solapamiento_est_egr_insert_est() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.egresado WHERE miembro_id = NEW.miembro_id) THEN
        RAISE EXCEPTION 'Un miembro no puede ser ESTUDIANTE y EGRESADO al mismo tiempo';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_no_solapamiento_est_egr_insert_est() OWNER TO postgres;

--
-- TOC entry 340 (class 1255 OID 16613)
-- Name: validar_no_solapamiento_est_prof_insert_est(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_no_solapamiento_est_prof_insert_est() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profesor WHERE miembro_id = NEW.miembro_id) THEN
        RAISE EXCEPTION 'Un miembro no puede ser ESTUDIANTE y PROFESOR al mismo tiempo';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_no_solapamiento_est_prof_insert_est() OWNER TO postgres;

--
-- TOC entry 279 (class 1255 OID 16614)
-- Name: validar_no_solapamiento_est_prof_insert_prof(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_no_solapamiento_est_prof_insert_prof() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.estudiante WHERE miembro_id = NEW.miembro_id) THEN
        RAISE EXCEPTION 'Un miembro no puede ser ESTUDIANTE y PROFESOR al mismo tiempo';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_no_solapamiento_est_prof_insert_prof() OWNER TO postgres;

--
-- TOC entry 302 (class 1255 OID 16615)
-- Name: validar_pertenencia_carrera(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_pertenencia_carrera() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.estudiante WHERE miembro_id = NEW.miembro_id
        UNION
        SELECT 1 FROM public.egresado WHERE miembro_id = NEW.miembro_id
    ) THEN
        RAISE EXCEPTION 'Solo ESTUDIANTE o EGRESADO pueden pertenecer a una CARRERA';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_pertenencia_carrera() OWNER TO postgres;

--
-- TOC entry 330 (class 1255 OID 17198)
-- Name: validar_precio_positivo(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_precio_positivo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Caso 1: Validación para ARTICULO_MKT
    IF TG_TABLE_NAME = 'articulo_mkt' THEN
        IF NEW.precio <= 0 THEN
            RAISE EXCEPTION 'Restricción violada: El precio del artículo debe ser mayor a 0. Valor intentado: %', NEW.precio;
        END IF;
    END IF;

    -- Caso 2: Validación para INMUEBLE_ALQUILER
    IF TG_TABLE_NAME = 'inmueble_alquiler' THEN
        IF NEW.precio_alquiler <= 0 THEN
            RAISE EXCEPTION 'Restricción violada: El precio del alquiler debe ser mayor a 0. Valor intentado: %', NEW.precio_alquiler;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_precio_positivo() OWNER TO postgres;

--
-- TOC entry 316 (class 1255 OID 17199)
-- Name: validar_status_organizacion_oferta(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_status_organizacion_oferta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_status_org character varying;
BEGIN
    -- Solo validamos si hay una organización externa asignada
    IF NEW.rif_organizacion IS NOT NULL THEN
        
        -- CORRECCIÓN: Usamos 'status' en lugar de 'estatus'
        SELECT status INTO v_status_org 
        FROM public.organizacion_externa
        WHERE rif = NEW.rif_organizacion;

        -- Verificamos si NO es aprobada
        IF v_status_org IS NULL OR UPPER(v_status_org) <> 'APROBADA' THEN
            RAISE EXCEPTION 'Restricción violada: La organización externa % no tiene el status Aprobada y no puede publicar ofertas.', NEW.rif_organizacion;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_status_organizacion_oferta() OWNER TO postgres;

--
-- TOC entry 293 (class 1255 OID 17200)
-- Name: validar_tipo_miembro_postulacion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_tipo_miembro_postulacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    es_estudiante boolean;
    es_egresado boolean;
BEGIN
    -- Verificamos si el miembro existe en la tabla ESTUDIANTE
    -- NOTA IMPORTANTE: Buscamos por la columna 'miembro_id' que es la FK
    SELECT EXISTS(
        SELECT 1 FROM public.estudiante WHERE miembro_id = NEW.miembro_id
    ) INTO es_estudiante;

    -- Verificamos si el miembro existe en la tabla EGRESADO
    -- NOTA IMPORTANTE: Buscamos por la columna 'miembro_id' que es la FK
    SELECT EXISTS(
        SELECT 1 FROM public.egresado WHERE miembro_id = NEW.miembro_id
    ) INTO es_egresado;

    -- Lógica: Si NO es estudiante Y TAMPOCO es egresado -> ERROR
    IF NOT es_estudiante AND NOT es_egresado THEN
        RAISE EXCEPTION 'Restricción violada: El miembro % no es Estudiante ni Egresado, por lo que no puede postularse.', NEW.miembro_id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_tipo_miembro_postulacion() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 16616)
-- Name: articulo_mkt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.articulo_mkt (
    clave_articulo integer NOT NULL,
    titulo_articulo character varying(100) NOT NULL,
    precio numeric(10,2) NOT NULL,
    nombre_categoria character varying(100) NOT NULL,
    CONSTRAINT chk_precio_positivo CHECK ((precio > (0)::numeric))
);


ALTER TABLE public.articulo_mkt OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16624)
-- Name: asiste_evento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asiste_evento (
    nombre_evento character varying(200) NOT NULL,
    estado_asistencia character varying(20) DEFAULT 'Interesado'::character varying,
    miembro_id integer NOT NULL
);


ALTER TABLE public.asiste_evento OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16630)
-- Name: carrera; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carrera (
    nombre_carrera character varying(100) NOT NULL
);


ALTER TABLE public.carrera OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16634)
-- Name: categoria_mkt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categoria_mkt (
    nombre_categoria character varying(100) NOT NULL
);


ALTER TABLE public.categoria_mkt OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16638)
-- Name: ciudad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ciudad (
    nombre_ciudad public.citext NOT NULL,
    nombre_estado public.citext NOT NULL,
    nombre_pais public.citext NOT NULL
);


ALTER TABLE public.ciudad OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16646)
-- Name: comenta_clave_comentario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comenta_clave_comentario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.comenta_clave_comentario_seq OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16647)
-- Name: comenta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comenta (
    clave_comentario integer DEFAULT nextval('public.comenta_clave_comentario_seq'::regclass) NOT NULL,
    clave_publicacion integer NOT NULL,
    miembro_id integer NOT NULL,
    contenido text NOT NULL,
    fecha_comentario timestamp without time zone DEFAULT now()
);


ALTER TABLE public.comenta OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 17201)
-- Name: comentario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comentario (
    clave_comentario integer NOT NULL,
    clave_publicacion integer NOT NULL,
    miembro_id integer NOT NULL,
    contenido text,
    estatus character varying(20) DEFAULT 'Activo'::character varying,
    fecha_comentario timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comentario OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 17211)
-- Name: comentario_clave_comentario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comentario_clave_comentario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comentario_clave_comentario_seq OWNER TO postgres;

--
-- TOC entry 5542 (class 0 OID 0)
-- Dependencies: 265
-- Name: comentario_clave_comentario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comentario_clave_comentario_seq OWNED BY public.comentario.clave_comentario;


--
-- TOC entry 227 (class 1259 OID 16658)
-- Name: conversacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversacion (
    conversacion_id integer NOT NULL,
    miembro_creador_id integer NOT NULL,
    fecha_inicio timestamp without time zone DEFAULT now() NOT NULL,
    titulo_chat character varying(100)
);


ALTER TABLE public.conversacion OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16665)
-- Name: conversacion_conversacion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversacion_conversacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversacion_conversacion_id_seq OWNER TO postgres;

--
-- TOC entry 5545 (class 0 OID 0)
-- Dependencies: 228
-- Name: conversacion_conversacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversacion_conversacion_id_seq OWNED BY public.conversacion.conversacion_id;


--
-- TOC entry 229 (class 1259 OID 16666)
-- Name: dependencia_ucab; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dependencia_ucab (
    nombre_dependencia character varying(150) NOT NULL,
    nombre_facultad character varying(100) NOT NULL
);


ALTER TABLE public.dependencia_ucab OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16671)
-- Name: egresado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.egresado (
    egresado_id integer NOT NULL,
    miembro_id integer NOT NULL,
    ano_graduacion integer,
    titulo_obtenido character varying(100)
);


ALTER TABLE public.egresado OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16676)
-- Name: egresado_egresado_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.egresado_egresado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.egresado_egresado_id_seq OWNER TO postgres;

--
-- TOC entry 5549 (class 0 OID 0)
-- Dependencies: 231
-- Name: egresado_egresado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.egresado_egresado_id_seq OWNED BY public.egresado.egresado_id;


--
-- TOC entry 232 (class 1259 OID 16677)
-- Name: estado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estado (
    nombre_estado public.citext NOT NULL,
    nombre_pais public.citext NOT NULL
);


ALTER TABLE public.estado OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16684)
-- Name: estudiante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estudiante (
    estudiante_id integer NOT NULL,
    miembro_id integer NOT NULL,
    semestre_actual integer,
    situacion_academica character varying(20)
);


ALTER TABLE public.estudiante OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16689)
-- Name: estudiante_estudiante_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.estudiante_estudiante_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.estudiante_estudiante_id_seq OWNER TO postgres;

--
-- TOC entry 5553 (class 0 OID 0)
-- Dependencies: 234
-- Name: estudiante_estudiante_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.estudiante_estudiante_id_seq OWNED BY public.estudiante.estudiante_id;


--
-- TOC entry 235 (class 1259 OID 16690)
-- Name: evento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evento (
    nombre_evento character varying(200) NOT NULL,
    descripcion character varying(2000),
    fecha_hora_evento timestamp without time zone NOT NULL,
    lugar character varying(255),
    miembro_creador_id integer,
    clave_publicacion integer
);


ALTER TABLE public.evento OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16697)
-- Name: facultad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facultad (
    nombre_facultad character varying(100) NOT NULL
);


ALTER TABLE public.facultad OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16701)
-- Name: grupo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupo (
    nombre_grupo character varying(100) NOT NULL,
    descripcion character varying(1000),
    tipo_grupo character varying(10) NOT NULL,
    fecha_creacion date NOT NULL,
    miembro_creador_id integer,
    categoria_grupo character varying NOT NULL,
    CONSTRAINT ck_categoria_grupo CHECK (((categoria_grupo)::text = ANY (ARRAY[('Académico'::character varying)::text, ('Deportivo'::character varying)::text, ('Laboral'::character varying)::text, ('De Interés'::character varying)::text, ('Social'::character varying)::text, ('Profesional'::character varying)::text]))),
    CONSTRAINT ck_tipo_grupo CHECK (((tipo_grupo)::text = ANY (ARRAY[('Publico'::character varying)::text, ('Privado'::character varying)::text])))
);


ALTER TABLE public.grupo OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 17212)
-- Name: guarda_favorito; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guarda_favorito (
    miembro_id integer NOT NULL,
    clave_publicacion integer NOT NULL,
    fecha_guardado timestamp without time zone DEFAULT now()
);


ALTER TABLE public.guarda_favorito OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16712)
-- Name: inmueble_alquiler; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inmueble_alquiler (
    clave_inmueble integer NOT NULL,
    titulo_inmueble character varying(100) NOT NULL,
    precio_alquiler numeric(10,2) NOT NULL,
    condiciones character varying(1000),
    nombre_tipo character varying(100) NOT NULL,
    nombre_ciudad public.citext NOT NULL,
    CONSTRAINT chk_precio_alquiler_positivo CHECK ((precio_alquiler > (0)::numeric))
);


ALTER TABLE public.inmueble_alquiler OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16723)
-- Name: mensaje; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mensaje (
    conversacion_id integer NOT NULL,
    numero_mensaje integer NOT NULL,
    miembro_id integer NOT NULL,
    texto_mensaje character varying,
    fecha_hora_envio timestamp without time zone DEFAULT now() NOT NULL,
    estado_mensaje character varying(20)
);


ALTER TABLE public.mensaje OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16733)
-- Name: mensaje_numero_mensaje_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mensaje_numero_mensaje_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mensaje_numero_mensaje_seq OWNER TO postgres;

--
-- TOC entry 5561 (class 0 OID 0)
-- Dependencies: 240
-- Name: mensaje_numero_mensaje_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mensaje_numero_mensaje_seq OWNED BY public.mensaje.numero_mensaje;


--
-- TOC entry 241 (class 1259 OID 16734)
-- Name: miembro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.miembro (
    correo character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    fecha_registro date NOT NULL,
    foto_perfil_url character varying(255),
    biografia character varying(500),
    nombre_ciudad public.citext,
    miembro_id integer NOT NULL,
    estatus character varying(20) DEFAULT 'Activo'::character varying,
    es_administrador boolean DEFAULT false
);


ALTER TABLE public.miembro OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16746)
-- Name: miembro_miembro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.miembro_miembro_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.miembro_miembro_id_seq OWNER TO postgres;

--
-- TOC entry 5564 (class 0 OID 0)
-- Dependencies: 242
-- Name: miembro_miembro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.miembro_miembro_id_seq OWNED BY public.miembro.miembro_id;


--
-- TOC entry 243 (class 1259 OID 16747)
-- Name: miembrocarrera; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.miembrocarrera (
    nombre_carrera character varying(100) NOT NULL,
    miembro_id integer NOT NULL
);


ALTER TABLE public.miembrocarrera OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16752)
-- Name: oferta_empleo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.oferta_empleo (
    clave_oferta integer NOT NULL,
    titulo_cargo character varying(100) NOT NULL,
    tipo_contrato character varying(50),
    requisitos character varying(2000),
    nombre_dependencia character varying(150),
    rif_organizacion character varying(20),
    CONSTRAINT chk_origen_xor CHECK ((((nombre_dependencia IS NOT NULL) AND (rif_organizacion IS NULL)) OR ((nombre_dependencia IS NULL) AND (rif_organizacion IS NOT NULL))))
);


ALTER TABLE public.oferta_empleo OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16760)
-- Name: organizacion_externa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizacion_externa (
    rif character varying(20) NOT NULL,
    nombre_oficial character varying(150) NOT NULL,
    industria character varying(100),
    direccion character varying(255),
    status character varying(20) DEFAULT 'Pendiente'::character varying,
    CONSTRAINT chk_status CHECK (((status)::text = ANY (ARRAY[('Aprobada'::character varying)::text, ('Pendiente'::character varying)::text, ('Rechazada'::character varying)::text])))
);


ALTER TABLE public.organizacion_externa OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16769)
-- Name: pais; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pais (
    nombre_pais public.citext NOT NULL
);


ALTER TABLE public.pais OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16775)
-- Name: participa_en; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.participa_en (
    conversacion_id integer NOT NULL,
    miembro_id integer NOT NULL,
    fecha_union timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.participa_en OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 16782)
-- Name: personal_admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personal_admin (
    personal_id integer NOT NULL,
    miembro_id integer NOT NULL,
    cargo character varying(100),
    dependencia character varying(100)
);


ALTER TABLE public.personal_admin OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 16787)
-- Name: personal_admin_personal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personal_admin_personal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_admin_personal_id_seq OWNER TO postgres;

--
-- TOC entry 5572 (class 0 OID 0)
-- Dependencies: 249
-- Name: personal_admin_personal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personal_admin_personal_id_seq OWNED BY public.personal_admin.personal_id;


--
-- TOC entry 250 (class 1259 OID 16788)
-- Name: post_feed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_feed (
    clave_post integer NOT NULL
);


ALTER TABLE public.post_feed OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 16792)
-- Name: profesor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profesor (
    profesor_id integer NOT NULL,
    miembro_id integer NOT NULL,
    escalafon character varying(50),
    tipo_contrato character varying(50)
);


ALTER TABLE public.profesor OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 16797)
-- Name: profesor_profesor_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profesor_profesor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profesor_profesor_id_seq OWNER TO postgres;

--
-- TOC entry 5576 (class 0 OID 0)
-- Dependencies: 252
-- Name: profesor_profesor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profesor_profesor_id_seq OWNED BY public.profesor.profesor_id;


--
-- TOC entry 253 (class 1259 OID 16798)
-- Name: publicacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publicacion (
    clave_publicacion integer NOT NULL,
    clave_miembro_creador integer NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    descripcion_texto text,
    estado character varying(20) DEFAULT 'Activo'::character varying
);


ALTER TABLE public.publicacion OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 16807)
-- Name: publicacion_clave_publicacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.publicacion_clave_publicacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.publicacion_clave_publicacion_seq OWNER TO postgres;

--
-- TOC entry 5579 (class 0 OID 0)
-- Dependencies: 254
-- Name: publicacion_clave_publicacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.publicacion_clave_publicacion_seq OWNED BY public.publicacion.clave_publicacion;


--
-- TOC entry 255 (class 1259 OID 16808)
-- Name: reacciona; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reacciona (
    clave_publicacion integer NOT NULL,
    miembro_id integer NOT NULL,
    tipo_reaccion character varying(20) DEFAULT 'Me Gusta'::character varying,
    fecha_reaccion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reacciona OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 17218)
-- Name: reaction_publicacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reaction_publicacion (
    clave_reaccion integer NOT NULL,
    clave_publicacion integer NOT NULL,
    miembro_id integer NOT NULL,
    tipo_reaccion character varying(20),
    fecha_reaccion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reaction_publicacion OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 17225)
-- Name: reaction_publicacion_clave_reaccion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reaction_publicacion_clave_reaccion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reaction_publicacion_clave_reaccion_seq OWNER TO postgres;

--
-- TOC entry 5583 (class 0 OID 0)
-- Dependencies: 268
-- Name: reaction_publicacion_clave_reaccion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reaction_publicacion_clave_reaccion_seq OWNED BY public.reaction_publicacion.clave_reaccion;


--
-- TOC entry 256 (class 1259 OID 16815)
-- Name: rec_academica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rec_academica (
    clave_rec_academica integer NOT NULL,
    autor_referencia character varying(100),
    enlace_externo character varying(255)
);


ALTER TABLE public.rec_academica OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 16819)
-- Name: rec_artistica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rec_artistica (
    clave_rec_artistica integer NOT NULL,
    autor_artista character varying(100),
    plataforma character varying(50)
);


ALTER TABLE public.rec_artistica OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 16823)
-- Name: rec_culinaria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rec_culinaria (
    clave_rec_culinaria integer NOT NULL,
    rango_precio character varying(20),
    ubicacion_local character varying(255)
);


ALTER TABLE public.rec_culinaria OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 16827)
-- Name: recomendacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recomendacion (
    clave_recomendacion integer NOT NULL,
    titulo_recomendacion character varying(100) NOT NULL
);


ALTER TABLE public.recomendacion OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 17226)
-- Name: reporta_clave_reporte_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reporta_clave_reporte_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.reporta_clave_reporte_seq OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 17227)
-- Name: reporta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reporta (
    clave_reporte integer DEFAULT nextval('public.reporta_clave_reporte_seq'::regclass) NOT NULL,
    miembro_id integer NOT NULL,
    clave_publicacion integer NOT NULL,
    motivo_reporte character varying(500) NOT NULL,
    fecha_reporte timestamp without time zone DEFAULT now(),
    estatus_reporte character varying(20) DEFAULT 'Pendiente'::character varying
);


ALTER TABLE public.reporta OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 17239)
-- Name: se_postula; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.se_postula (
    miembro_id integer NOT NULL,
    clave_oferta integer NOT NULL,
    fecha_postulacion timestamp without time zone DEFAULT now(),
    estado_postulacion character varying(30) DEFAULT 'Enviada'::character varying,
    mensaje_presentacion text
);


ALTER TABLE public.se_postula OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 16832)
-- Name: se_une_a; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.se_une_a (
    nombre_grupo character varying(100) NOT NULL,
    fecha_union timestamp without time zone DEFAULT now(),
    rol character varying(20) DEFAULT 'miembro'::character varying,
    miembro_id integer NOT NULL
);


ALTER TABLE public.se_une_a OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 16839)
-- Name: seconecta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seconecta (
    fecha_solicitud timestamp without time zone DEFAULT now(),
    estado_conexion character varying(20) DEFAULT 'Pendiente'::character varying,
    miembro_solicitante_id integer NOT NULL,
    miembro_solicitado_id integer NOT NULL
);


ALTER TABLE public.seconecta OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 16846)
-- Name: tipo_inmueble; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tipo_inmueble (
    nombre_tipo character varying(100) NOT NULL
);


ALTER TABLE public.tipo_inmueble OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 16850)
-- Name: valora; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.valora (
    calificacion integer NOT NULL,
    comentario_valoracion character varying(1000),
    fecha_valoracion timestamp without time zone DEFAULT now(),
    miembro_emisor_id integer NOT NULL,
    miembro_receptor_id integer NOT NULL,
    CONSTRAINT ck_rango_calificacion CHECK (((calificacion >= 1) AND (calificacion <= 5))),
    CONSTRAINT ck_valora_no_autovaloracion CHECK ((miembro_emisor_id <> miembro_receptor_id))
);


ALTER TABLE public.valora OWNER TO postgres;

--
-- TOC entry 5069 (class 2604 OID 17248)
-- Name: comentario clave_comentario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentario ALTER COLUMN clave_comentario SET DEFAULT nextval('public.comentario_clave_comentario_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 17249)
-- Name: conversacion conversacion_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversacion ALTER COLUMN conversacion_id SET DEFAULT nextval('public.conversacion_conversacion_id_seq'::regclass);


--
-- TOC entry 5048 (class 2604 OID 17250)
-- Name: egresado egresado_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.egresado ALTER COLUMN egresado_id SET DEFAULT nextval('public.egresado_egresado_id_seq'::regclass);


--
-- TOC entry 5049 (class 2604 OID 17251)
-- Name: estudiante estudiante_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estudiante ALTER COLUMN estudiante_id SET DEFAULT nextval('public.estudiante_estudiante_id_seq'::regclass);


--
-- TOC entry 5050 (class 2604 OID 17252)
-- Name: mensaje numero_mensaje; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensaje ALTER COLUMN numero_mensaje SET DEFAULT nextval('public.mensaje_numero_mensaje_seq'::regclass);


--
-- TOC entry 5052 (class 2604 OID 17253)
-- Name: miembro miembro_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembro ALTER COLUMN miembro_id SET DEFAULT nextval('public.miembro_miembro_id_seq'::regclass);


--
-- TOC entry 5057 (class 2604 OID 17254)
-- Name: personal_admin personal_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_admin ALTER COLUMN personal_id SET DEFAULT nextval('public.personal_admin_personal_id_seq'::regclass);


--
-- TOC entry 5058 (class 2604 OID 17255)
-- Name: profesor profesor_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profesor ALTER COLUMN profesor_id SET DEFAULT nextval('public.profesor_profesor_id_seq'::regclass);


--
-- TOC entry 5059 (class 2604 OID 17256)
-- Name: publicacion clave_publicacion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicacion ALTER COLUMN clave_publicacion SET DEFAULT nextval('public.publicacion_clave_publicacion_seq'::regclass);


--
-- TOC entry 5073 (class 2604 OID 17257)
-- Name: reaction_publicacion clave_reaccion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reaction_publicacion ALTER COLUMN clave_reaccion SET DEFAULT nextval('public.reaction_publicacion_clave_reaccion_seq'::regclass);


--
-- TOC entry 5397 (class 0 OID 16616)
-- Dependencies: 220
-- Data for Name: articulo_mkt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.articulo_mkt (clave_articulo, titulo_articulo, precio, nombre_categoria) FROM stdin;
2	Fundamentos de BD	25.50	Libros
40	telefono	200.00	Libros
\.


--
-- TOC entry 5398 (class 0 OID 16624)
-- Dependencies: 221
-- Data for Name: asiste_evento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asiste_evento (nombre_evento, estado_asistencia, miembro_id) FROM stdin;
graduacion	asiste	1
graduacion	Interesado	6
evento	Interesado	60
\.


--
-- TOC entry 5399 (class 0 OID 16630)
-- Dependencies: 222
-- Data for Name: carrera; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carrera (nombre_carrera) FROM stdin;
ingenieria informatica
\.


--
-- TOC entry 5400 (class 0 OID 16634)
-- Dependencies: 223
-- Data for Name: categoria_mkt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categoria_mkt (nombre_categoria) FROM stdin;
Libros
\.


--
-- TOC entry 5401 (class 0 OID 16638)
-- Dependencies: 224
-- Data for Name: ciudad; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ciudad (nombre_ciudad, nombre_estado, nombre_pais) FROM stdin;
caracas	Dtt Capital	venezuela
new york	new york	estados unidos
\.


--
-- TOC entry 5403 (class 0 OID 16647)
-- Dependencies: 226
-- Data for Name: comenta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comenta (clave_comentario, clave_publicacion, miembro_id, contenido, fecha_comentario) FROM stdin;
\.


--
-- TOC entry 5441 (class 0 OID 17201)
-- Dependencies: 264
-- Data for Name: comentario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comentario (clave_comentario, clave_publicacion, miembro_id, contenido, estatus, fecha_comentario) FROM stdin;
1	101	46	Felicidades!	Activo	2025-12-12 07:54:01.555623
2	101	46	Gran logro	Activo	2025-12-12 07:54:01.555623
3	101	46	Exitos	Activo	2025-12-12 07:54:01.555623
4	101	46	Spam	Eliminado	2025-12-12 07:54:01.555623
\.


--
-- TOC entry 5404 (class 0 OID 16658)
-- Dependencies: 227
-- Data for Name: conversacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversacion (conversacion_id, miembro_creador_id, fecha_inicio, titulo_chat) FROM stdin;
1	3	2025-12-11 19:32:59.968746	prueba
3	10	2025-12-11 19:42:01.737647	estudio de parcial
707359	60	2026-01-13 12:54:53.859225	Chat con maria chacon
289862	60	2026-01-13 12:55:01.973511	Chat con maria chacon
363508	6	2026-01-13 12:55:46.089462	Chat con jesus miembro
376829	60	2026-01-13 12:56:32.591453	Chat con maria chacon
377919	60	2026-01-13 13:07:20.038686	Chat con maria chacon
85847	60	2026-01-13 13:07:25.711323	Chat con maria chacon
338535	6	2026-01-13 13:08:28.164091	Chat con jesus alejandro romero fernandez
818672	6	2026-01-13 13:08:31.248458	Chat con jesus miembro
47327	6	2026-01-13 13:08:39.013181	Chat con jesus miembro
936654	60	2026-01-13 13:09:15.804471	Chat con maria chacon
256523	60	2026-01-13 13:09:38.501167	Chat con maria chacon
\.


--
-- TOC entry 5406 (class 0 OID 16666)
-- Dependencies: 229
-- Data for Name: dependencia_ucab; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dependencia_ucab (nombre_dependencia, nombre_facultad) FROM stdin;
Escuela Informática	Ingeniería
\.


--
-- TOC entry 5407 (class 0 OID 16671)
-- Dependencies: 230
-- Data for Name: egresado; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.egresado (egresado_id, miembro_id, ano_graduacion, titulo_obtenido) FROM stdin;
6	6	2025	comunicación social
\.


--
-- TOC entry 5409 (class 0 OID 16677)
-- Dependencies: 232
-- Data for Name: estado; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estado (nombre_estado, nombre_pais) FROM stdin;
Dtt Capital	venezuela
new york	estados unidos
\.


--
-- TOC entry 5410 (class 0 OID 16684)
-- Dependencies: 233
-- Data for Name: estudiante; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estudiante (estudiante_id, miembro_id, semestre_actual, situacion_academica) FROM stdin;
7	21	3	Activo
20	53	2	Activo
26	55	3	Activo
3	10	2	Activo
27	7	5	Activo
28	60	6	Regular
\.


--
-- TOC entry 5412 (class 0 OID 16690)
-- Dependencies: 235
-- Data for Name: evento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evento (nombre_evento, descripcion, fecha_hora_evento, lugar, miembro_creador_id, clave_publicacion) FROM stdin;
graduacion	\N	2025-12-24 00:00:00	caracas	12	6
dspues	probando	2025-12-18 14:00:00	narnia	6	4
evento	rwgfe	2026-01-02 12:40:00	ewf	60	\N
\.


--
-- TOC entry 5413 (class 0 OID 16697)
-- Dependencies: 236
-- Data for Name: facultad; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.facultad (nombre_facultad) FROM stdin;
Ingeniería
\.


--
-- TOC entry 5414 (class 0 OID 16701)
-- Dependencies: 237
-- Data for Name: grupo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupo (nombre_grupo, descripcion, tipo_grupo, fecha_creacion, miembro_creador_id, categoria_grupo) FROM stdin;
BD	grupo para los alumnos de bd	Publico	2024-07-04	\N	De Interés
estudio	\N	Publico	2020-03-03	8	De Interés
grupo	solo privado	Privado	2026-01-13	60	Social
3543	ewf	Privado	2026-01-13	60	Académico
\.


--
-- TOC entry 5443 (class 0 OID 17212)
-- Dependencies: 266
-- Data for Name: guarda_favorito; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guarda_favorito (miembro_id, clave_publicacion, fecha_guardado) FROM stdin;
\.


--
-- TOC entry 5415 (class 0 OID 16712)
-- Dependencies: 238
-- Data for Name: inmueble_alquiler; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inmueble_alquiler (clave_inmueble, titulo_inmueble, precio_alquiler, condiciones, nombre_tipo, nombre_ciudad) FROM stdin;
41	habitacion en montalban 2 para estudiante	150.00	solo estudiante	Apartamento	caracas
\.


--
-- TOC entry 5416 (class 0 OID 16723)
-- Dependencies: 239
-- Data for Name: mensaje; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mensaje (conversacion_id, numero_mensaje, miembro_id, texto_mensaje, fecha_hora_envio, estado_mensaje) FROM stdin;
1	1	3	Hola, ¿cómo están?	2025-12-11 19:37:27.020032	enviado
1	2	5	Bien, ¿y tú?	2025-12-11 19:37:49.020689	enviado
289862	1	60	prueba	2026-01-13 12:55:06.942135	Enviado
363508	1	6	no funciona	2026-01-13 12:55:56.048929	Enviado
85847	1	60	holaa	2026-01-13 13:07:29.663723	Enviado
47327	1	6	nadaaa	2026-01-13 13:08:45.291682	Enviado
256523	1	60	fewfewf	2026-01-13 13:09:46.38308	Enviado
47327	2	60	ahora si	2026-01-13 13:17:01.902162	Enviado
47327	3	6	que bueno	2026-01-13 13:17:32.597297	Enviado
\.


--
-- TOC entry 5418 (class 0 OID 16734)
-- Dependencies: 241
-- Data for Name: miembro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.miembro (correo, password_hash, nombres, apellidos, fecha_registro, foto_perfil_url, biografia, nombre_ciudad, miembro_id, estatus, es_administrador) FROM stdin;
marlene@ucab.edu.ve	clave	marlene	da silva	2025-12-08	\N	\N	\N	2	Activo	f
cris@ucab.edu.ve	1234	cris	andrade	2025-12-05	\N	profesor de venemergencias	caracas	4	Activo	f
luis@ucab.edu.ve	6478	luis	aparicio	2025-11-27	\N	telecom	caracas	5	Activo	f
maria@ucab.edu.ve	1111	maria	chacon	2025-10-18	\N	mar	caracas	6	Activo	f
juan@ucab.edu.ve	hash	Juan	Pérez	2025-12-11	\N	\N	caracas	7	Activo	f
eduardo@gmil.com	clave	eduardo	diaz	2025-12-11	\N	\N	caracas	8	Activo	f
marleneprofe@ucab.edu.ve	dsfds	marlene	goncalves	2025-10-10	\N	\N	caracas	12	Activo	f
lenovo@ucab.edu.ve	3214	lenovo	sadsaf	2025-10-03	\N	\N	\N	13	Activo	f
luis.torres@ucab.edu.ve	ha789	Luis	Torres Martínez	2025-12-11	\N	\N	\N	21	Activo	f
luz@gmail.com	2234	luz	ewr	2025-05-05	\N	\N	caracas	9	Bloqueado	f
termo@gmail.com	4325435	termo	duran	2025-12-11	\N	\N	caracas	14	Bloqueado	f
valle@ucab.edu.ve	1234	maria	del valle	2025-12-15	\N	\N	caracas	48	Activo	t
m.g@ucab.edu.ve	otro_hash_seguro_abc	Maria	Gomez	2025-12-15	\N	\N	\N	50	Activo	f
pablor@ucab.edu.ve	1234	pablo	rubio	2026-01-07	\N	\N	\N	53	Activo	f
roku@gmail.com	7645	roku	yuk	2026-01-07	\N	\N	\N	54	Activo	f
rejames@ucab.edu.ve	4576	reece	james	2026-01-07	\N	soy futbolista	new york	55	Activo	f
marcador@ucab.edu.ve	dsfd	marcado	rojo	2025-10-03	\N	\N	caracas	10	Activo	f
valentina@ucab.edu.ve	12345	valentina	maciel	2022-06-23	\N	\N	\N	3	Activo	f
verde@ucab.edu.ve	876	verde	sda	2026-01-08	ertret	ryjyrjtry	caracas	58	Activo	f
bando@ucab.edu.ve	1234	prueba	bando	2026-01-13	\N	\N	\N	59	Activo	f
jesus@ucab.edu.ve	1234	jesus alejandro	romero fernandez	2000-11-27		estudiante de ing informatica	caracas	1	Activo	t
jesusmiembro@ucab.edu.ve	1234	jesus	miembro	2026-01-13		Estudiante de ing informatica	Caracas	60	Activo	f
admin@ucab.edu.ve	1234	admin	admin	2026-01-14	\N	\N	\N	62	Activo	t
\.


--
-- TOC entry 5420 (class 0 OID 16747)
-- Dependencies: 243
-- Data for Name: miembrocarrera; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.miembrocarrera (nombre_carrera, miembro_id) FROM stdin;
ingenieria informatica	13
ingenieria informatica	9
\.


--
-- TOC entry 5421 (class 0 OID 16752)
-- Dependencies: 244
-- Data for Name: oferta_empleo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.oferta_empleo (clave_oferta, titulo_cargo, tipo_contrato, requisitos, nombre_dependencia, rif_organizacion) FROM stdin;
1	Pasante QA	\N	\N	Escuela Informática	\N
38	Pasante	\N	\N	\N	J-12345678-9
39	dsf	Tiempo Completo	dsf	\N	J-123456789
\.


--
-- TOC entry 5422 (class 0 OID 16760)
-- Dependencies: 245
-- Data for Name: organizacion_externa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizacion_externa (rif, nombre_oficial, industria, direccion, status) FROM stdin;
J-123456-0	Empresa Tech CA	\N	\N	Aprobada
J-999999-0	Empresa Fantasma SA	\N	\N	Pendiente
J-12345678-9	Empresa Fantasma S.A.	\N	\N	Aprobada
J-998877665	Tech Solutions	Tecnología	Caracas	Aprobada
J-123456789	Empresa Tech CA	\N	\N	Aprobada
\.


--
-- TOC entry 5423 (class 0 OID 16769)
-- Dependencies: 246
-- Data for Name: pais; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pais (nombre_pais) FROM stdin;
venezuela
estados unidos
inglaterra
españa
\.


--
-- TOC entry 5424 (class 0 OID 16775)
-- Dependencies: 247
-- Data for Name: participa_en; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.participa_en (conversacion_id, miembro_id, fecha_union) FROM stdin;
1	3	2025-12-11 19:35:01.227851
1	5	2025-12-11 19:35:08.573838
3	10	2025-12-11 19:42:01.737647
707359	60	2026-01-13 12:54:53.859225
289862	60	2026-01-13 12:55:01.973511
363508	6	2026-01-13 12:55:46.089462
376829	60	2026-01-13 12:56:32.591453
377919	60	2026-01-13 13:07:20.038686
85847	60	2026-01-13 13:07:25.711323
338535	6	2026-01-13 13:08:28.164091
818672	6	2026-01-13 13:08:31.248458
47327	6	2026-01-13 13:08:39.013181
936654	60	2026-01-13 13:09:15.804471
256523	60	2026-01-13 13:09:38.501167
\.


--
-- TOC entry 5425 (class 0 OID 16782)
-- Dependencies: 248
-- Data for Name: personal_admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personal_admin (personal_id, miembro_id, cargo, dependencia) FROM stdin;
1	2	\N	\N
\.


--
-- TOC entry 5427 (class 0 OID 16788)
-- Dependencies: 250
-- Data for Name: post_feed; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_feed (clave_post) FROM stdin;
1
\.


--
-- TOC entry 5428 (class 0 OID 16792)
-- Dependencies: 251
-- Data for Name: profesor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profesor (profesor_id, miembro_id, escalafon, tipo_contrato) FROM stdin;
6	12	Titular	Tiempo Completo
10	59	Asistente	Tiempo Completo
\.


--
-- TOC entry 5430 (class 0 OID 16798)
-- Dependencies: 253
-- Data for Name: publicacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.publicacion (clave_publicacion, clave_miembro_creador, fecha_creacion, descripcion_texto, estado) FROM stdin;
1	5	2025-12-11 04:52:06.265959	Probando la nueva columna clave_publicacion.	Activo
2	5	2025-12-11 04:52:11.168651	Probando la nueva columna clave_publicacion.	Activo
3	1	2025-12-11 05:03:10.019447	¡Hola a todos! Este es mi primer post en el feed.	Activo
4	1	2025-12-11 05:25:02.635999	Oferta de pasantía	Activo
6	1	2025-12-11 05:33:35.515358	Vendo libro de Base de Datos usado	Activo
7	6	2025-12-15 13:13:22.211663	hola prueba	activo
38	6	2025-12-15 13:26:44.580738	hola pueba	Activo
39	3	2026-01-14 07:21:34.751468	dsfds	Activo
40	5	2026-01-14 07:24:33.852124	ewef	Activo
41	6	2026-01-14 07:27:10.384627	con todas las comodidades\n	Activo
44	60	2026-01-14 07:30:41.526019	muy bueno	Activo
\.


--
-- TOC entry 5432 (class 0 OID 16808)
-- Dependencies: 255
-- Data for Name: reacciona; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reacciona (clave_publicacion, miembro_id, tipo_reaccion, fecha_reaccion) FROM stdin;
\.


--
-- TOC entry 5444 (class 0 OID 17218)
-- Dependencies: 267
-- Data for Name: reaction_publicacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reaction_publicacion (clave_reaccion, clave_publicacion, miembro_id, tipo_reaccion, fecha_reaccion) FROM stdin;
1	101	46	Me Gusta	2025-12-12 07:54:01.555623
2	101	46	Me Gusta	2025-12-12 07:54:01.555623
3	101	46	Me Encanta	2025-12-12 07:54:01.555623
4	101	46	Me Divierte	2025-12-12 07:54:01.555623
5	101	46	Me Gusta	2025-12-12 07:54:01.555623
\.


--
-- TOC entry 5433 (class 0 OID 16815)
-- Dependencies: 256
-- Data for Name: rec_academica; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rec_academica (clave_rec_academica, autor_referencia, enlace_externo) FROM stdin;
\.


--
-- TOC entry 5434 (class 0 OID 16819)
-- Dependencies: 257
-- Data for Name: rec_artistica; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rec_artistica (clave_rec_artistica, autor_artista, plataforma) FROM stdin;
\.


--
-- TOC entry 5435 (class 0 OID 16823)
-- Dependencies: 258
-- Data for Name: rec_culinaria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rec_culinaria (clave_rec_culinaria, rango_precio, ubicacion_local) FROM stdin;
\.


--
-- TOC entry 5436 (class 0 OID 16827)
-- Dependencies: 259
-- Data for Name: recomendacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recomendacion (clave_recomendacion, titulo_recomendacion) FROM stdin;
44	el principito
\.


--
-- TOC entry 5447 (class 0 OID 17227)
-- Dependencies: 270
-- Data for Name: reporta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reporta (clave_reporte, miembro_id, clave_publicacion, motivo_reporte, fecha_reporte, estatus_reporte) FROM stdin;
1	39	19	El precio es incorrecto	2025-12-12 07:14:18.062055	Pendiente
2	38	19	Prueba de auto-reporte (debe fallar)	2025-12-12 07:14:18.062055	Pendiente
\.


--
-- TOC entry 5448 (class 0 OID 17239)
-- Dependencies: 271
-- Data for Name: se_postula; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.se_postula (miembro_id, clave_oferta, fecha_postulacion, estado_postulacion, mensaje_presentacion) FROM stdin;
25	100	2025-12-12 06:55:15.19738	Enviada	\N
26	100	2025-12-12 06:55:17.861	Enviada	\N
\.


--
-- TOC entry 5437 (class 0 OID 16832)
-- Dependencies: 260
-- Data for Name: se_une_a; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.se_une_a (nombre_grupo, fecha_union, rol, miembro_id) FROM stdin;
BD	2025-12-10 00:52:28.919769	admin	2
BD	2025-12-10 00:54:58.491499	miembro	1
estudio	2025-12-11 14:42:45.908491	admin	8
estudio	2025-10-15 10:00:00	miembro	2
estudio	2025-10-20 14:30:00	miembro	3
estudio	2025-11-05 09:15:00	miembro	4
estudio	2025-11-10 16:45:00	miembro	5
estudio	2025-11-15 11:00:00	miembro	6
estudio	2025-12-08 13:20:00	miembro	7
estudio	2025-12-09 15:10:00	miembro	9
estudio	2025-12-10 10:50:00	miembro	10
estudio	2026-01-13 00:00:00	Miembro	60
grupo	2026-01-13 11:54:43.044787	admin	60
3543	2026-01-13 12:05:48.4452	Admin	60
\.


--
-- TOC entry 5438 (class 0 OID 16839)
-- Dependencies: 261
-- Data for Name: seconecta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seconecta (fecha_solicitud, estado_conexion, miembro_solicitante_id, miembro_solicitado_id) FROM stdin;
2026-01-12 23:51:23.640798	Aceptada	1	6
2026-01-13 00:00:00	Aceptada	60	6
\.


--
-- TOC entry 5439 (class 0 OID 16846)
-- Dependencies: 262
-- Data for Name: tipo_inmueble; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tipo_inmueble (nombre_tipo) FROM stdin;
Apartamento
\.


--
-- TOC entry 5440 (class 0 OID 16850)
-- Dependencies: 263
-- Data for Name: valora; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.valora (calificacion, comentario_valoracion, fecha_valoracion, miembro_emisor_id, miembro_receptor_id) FROM stdin;
4	bien	2025-12-11 18:09:19.385348	6	9
4	bien	2025-12-11 18:13:16.691816	5	12
\.


--
-- TOC entry 5596 (class 0 OID 0)
-- Dependencies: 225
-- Name: comenta_clave_comentario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comenta_clave_comentario_seq', 1, false);


--
-- TOC entry 5597 (class 0 OID 0)
-- Dependencies: 265
-- Name: comentario_clave_comentario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comentario_clave_comentario_seq', 4, true);


--
-- TOC entry 5598 (class 0 OID 0)
-- Dependencies: 228
-- Name: conversacion_conversacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversacion_conversacion_id_seq', 3, true);


--
-- TOC entry 5599 (class 0 OID 0)
-- Dependencies: 231
-- Name: egresado_egresado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.egresado_egresado_id_seq', 6, true);


--
-- TOC entry 5600 (class 0 OID 0)
-- Dependencies: 234
-- Name: estudiante_estudiante_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.estudiante_estudiante_id_seq', 28, true);


--
-- TOC entry 5601 (class 0 OID 0)
-- Dependencies: 240
-- Name: mensaje_numero_mensaje_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mensaje_numero_mensaje_seq', 2, true);


--
-- TOC entry 5602 (class 0 OID 0)
-- Dependencies: 242
-- Name: miembro_miembro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.miembro_miembro_id_seq', 62, true);


--
-- TOC entry 5603 (class 0 OID 0)
-- Dependencies: 249
-- Name: personal_admin_personal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.personal_admin_personal_id_seq', 1, true);


--
-- TOC entry 5604 (class 0 OID 0)
-- Dependencies: 252
-- Name: profesor_profesor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profesor_profesor_id_seq', 10, true);


--
-- TOC entry 5605 (class 0 OID 0)
-- Dependencies: 254
-- Name: publicacion_clave_publicacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.publicacion_clave_publicacion_seq', 44, true);


--
-- TOC entry 5606 (class 0 OID 0)
-- Dependencies: 268
-- Name: reaction_publicacion_clave_reaccion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reaction_publicacion_clave_reaccion_seq', 5, true);


--
-- TOC entry 5607 (class 0 OID 0)
-- Dependencies: 269
-- Name: reporta_clave_reporte_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reporta_clave_reporte_seq', 2, true);


--
-- TOC entry 5089 (class 2606 OID 16870)
-- Name: articulo_mkt articulo_mkt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articulo_mkt
    ADD CONSTRAINT articulo_mkt_pkey PRIMARY KEY (clave_articulo);


--
-- TOC entry 5095 (class 2606 OID 16872)
-- Name: categoria_mkt categoria_mkt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria_mkt
    ADD CONSTRAINT categoria_mkt_pkey PRIMARY KEY (nombre_categoria);


--
-- TOC entry 5177 (class 2606 OID 17259)
-- Name: comentario comentario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentario
    ADD CONSTRAINT comentario_pkey PRIMARY KEY (clave_comentario);


--
-- TOC entry 5103 (class 2606 OID 16874)
-- Name: conversacion conversacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversacion
    ADD CONSTRAINT conversacion_pkey PRIMARY KEY (conversacion_id);


--
-- TOC entry 5106 (class 2606 OID 16876)
-- Name: dependencia_ucab dependencia_ucab_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependencia_ucab
    ADD CONSTRAINT dependencia_ucab_pkey PRIMARY KEY (nombre_dependencia);


--
-- TOC entry 5122 (class 2606 OID 16878)
-- Name: facultad facultad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facultad
    ADD CONSTRAINT facultad_pkey PRIMARY KEY (nombre_facultad);


--
-- TOC entry 5126 (class 2606 OID 16880)
-- Name: inmueble_alquiler inmueble_alquiler_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inmueble_alquiler
    ADD CONSTRAINT inmueble_alquiler_pkey PRIMARY KEY (clave_inmueble);


--
-- TOC entry 5138 (class 2606 OID 16882)
-- Name: oferta_empleo oferta_empleo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_empleo
    ADD CONSTRAINT oferta_empleo_pkey PRIMARY KEY (clave_oferta);


--
-- TOC entry 5140 (class 2606 OID 16884)
-- Name: organizacion_externa organizacion_externa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizacion_externa
    ADD CONSTRAINT organizacion_externa_pkey PRIMARY KEY (rif);


--
-- TOC entry 5091 (class 2606 OID 16886)
-- Name: asiste_evento pk_asiste_evento; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asiste_evento
    ADD CONSTRAINT pk_asiste_evento PRIMARY KEY (miembro_id, nombre_evento);


--
-- TOC entry 5093 (class 2606 OID 16888)
-- Name: carrera pk_carrera; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrera
    ADD CONSTRAINT pk_carrera PRIMARY KEY (nombre_carrera);


--
-- TOC entry 5097 (class 2606 OID 16890)
-- Name: ciudad pk_ciudad; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudad
    ADD CONSTRAINT pk_ciudad PRIMARY KEY (nombre_ciudad);


--
-- TOC entry 5101 (class 2606 OID 16892)
-- Name: comenta pk_comenta; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comenta
    ADD CONSTRAINT pk_comenta PRIMARY KEY (clave_comentario);


--
-- TOC entry 5108 (class 2606 OID 16894)
-- Name: egresado pk_egresado; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.egresado
    ADD CONSTRAINT pk_egresado PRIMARY KEY (egresado_id);


--
-- TOC entry 5112 (class 2606 OID 16896)
-- Name: estado pk_estado; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estado
    ADD CONSTRAINT pk_estado PRIMARY KEY (nombre_estado, nombre_pais);


--
-- TOC entry 5116 (class 2606 OID 16898)
-- Name: estudiante pk_estudiante; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estudiante
    ADD CONSTRAINT pk_estudiante PRIMARY KEY (estudiante_id);


--
-- TOC entry 5120 (class 2606 OID 16900)
-- Name: evento pk_evento; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT pk_evento PRIMARY KEY (nombre_evento);


--
-- TOC entry 5124 (class 2606 OID 16902)
-- Name: grupo pk_grupo; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT pk_grupo PRIMARY KEY (nombre_grupo);


--
-- TOC entry 5179 (class 2606 OID 17261)
-- Name: guarda_favorito pk_guarda_favorito; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guarda_favorito
    ADD CONSTRAINT pk_guarda_favorito PRIMARY KEY (miembro_id, clave_publicacion);


--
-- TOC entry 5130 (class 2606 OID 16904)
-- Name: mensaje pk_mensaje; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensaje
    ADD CONSTRAINT pk_mensaje PRIMARY KEY (conversacion_id, numero_mensaje);


--
-- TOC entry 5132 (class 2606 OID 16906)
-- Name: miembro pk_miembro; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembro
    ADD CONSTRAINT pk_miembro PRIMARY KEY (miembro_id);


--
-- TOC entry 5136 (class 2606 OID 16908)
-- Name: miembrocarrera pk_miembrocarrera; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembrocarrera
    ADD CONSTRAINT pk_miembrocarrera PRIMARY KEY (miembro_id, nombre_carrera);


--
-- TOC entry 5142 (class 2606 OID 16910)
-- Name: pais pk_pais; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pais
    ADD CONSTRAINT pk_pais PRIMARY KEY (nombre_pais);


--
-- TOC entry 5145 (class 2606 OID 16912)
-- Name: participa_en pk_participa_en; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participa_en
    ADD CONSTRAINT pk_participa_en PRIMARY KEY (conversacion_id, miembro_id);


--
-- TOC entry 5147 (class 2606 OID 16914)
-- Name: personal_admin pk_personal_admin; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_admin
    ADD CONSTRAINT pk_personal_admin PRIMARY KEY (personal_id);


--
-- TOC entry 5153 (class 2606 OID 16916)
-- Name: profesor pk_profesor; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT pk_profesor PRIMARY KEY (profesor_id);


--
-- TOC entry 5159 (class 2606 OID 16918)
-- Name: reacciona pk_reacciona; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reacciona
    ADD CONSTRAINT pk_reacciona PRIMARY KEY (clave_publicacion, miembro_id);


--
-- TOC entry 5183 (class 2606 OID 17263)
-- Name: reporta pk_reporta; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reporta
    ADD CONSTRAINT pk_reporta PRIMARY KEY (clave_reporte);


--
-- TOC entry 5185 (class 2606 OID 17265)
-- Name: se_postula pk_se_postula; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.se_postula
    ADD CONSTRAINT pk_se_postula PRIMARY KEY (miembro_id, clave_oferta);


--
-- TOC entry 5169 (class 2606 OID 16920)
-- Name: se_une_a pk_se_une_a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.se_une_a
    ADD CONSTRAINT pk_se_une_a PRIMARY KEY (nombre_grupo, miembro_id);


--
-- TOC entry 5171 (class 2606 OID 16922)
-- Name: seconecta pk_seconecta; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seconecta
    ADD CONSTRAINT pk_seconecta PRIMARY KEY (miembro_solicitante_id, miembro_solicitado_id);


--
-- TOC entry 5175 (class 2606 OID 16924)
-- Name: valora pk_valora; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.valora
    ADD CONSTRAINT pk_valora PRIMARY KEY (miembro_emisor_id, miembro_receptor_id);


--
-- TOC entry 5151 (class 2606 OID 16926)
-- Name: post_feed post_feed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_feed
    ADD CONSTRAINT post_feed_pkey PRIMARY KEY (clave_post);


--
-- TOC entry 5157 (class 2606 OID 16928)
-- Name: publicacion publicacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicacion
    ADD CONSTRAINT publicacion_pkey PRIMARY KEY (clave_publicacion);


--
-- TOC entry 5181 (class 2606 OID 17267)
-- Name: reaction_publicacion reaction_publicacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reaction_publicacion
    ADD CONSTRAINT reaction_publicacion_pkey PRIMARY KEY (clave_reaccion);


--
-- TOC entry 5161 (class 2606 OID 16930)
-- Name: rec_academica rec_academica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rec_academica
    ADD CONSTRAINT rec_academica_pkey PRIMARY KEY (clave_rec_academica);


--
-- TOC entry 5163 (class 2606 OID 16932)
-- Name: rec_artistica rec_artistica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rec_artistica
    ADD CONSTRAINT rec_artistica_pkey PRIMARY KEY (clave_rec_artistica);


--
-- TOC entry 5165 (class 2606 OID 16934)
-- Name: rec_culinaria rec_culinaria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rec_culinaria
    ADD CONSTRAINT rec_culinaria_pkey PRIMARY KEY (clave_rec_culinaria);


--
-- TOC entry 5167 (class 2606 OID 16936)
-- Name: recomendacion recomendacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recomendacion
    ADD CONSTRAINT recomendacion_pkey PRIMARY KEY (clave_recomendacion);


--
-- TOC entry 5173 (class 2606 OID 16938)
-- Name: tipo_inmueble tipo_inmueble_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipo_inmueble
    ADD CONSTRAINT tipo_inmueble_pkey PRIMARY KEY (nombre_tipo);


--
-- TOC entry 5099 (class 2606 OID 16940)
-- Name: ciudad uk_ciudad_nombre; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudad
    ADD CONSTRAINT uk_ciudad_nombre UNIQUE (nombre_ciudad);


--
-- TOC entry 5110 (class 2606 OID 16942)
-- Name: egresado uk_egresado_miembro; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.egresado
    ADD CONSTRAINT uk_egresado_miembro UNIQUE (miembro_id);


--
-- TOC entry 5114 (class 2606 OID 16944)
-- Name: estado uk_estado_nombre; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estado
    ADD CONSTRAINT uk_estado_nombre UNIQUE (nombre_estado);


--
-- TOC entry 5118 (class 2606 OID 16946)
-- Name: estudiante uk_estudiante_miembro; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estudiante
    ADD CONSTRAINT uk_estudiante_miembro UNIQUE (miembro_id);


--
-- TOC entry 5149 (class 2606 OID 16948)
-- Name: personal_admin uk_personal_admin_miembro; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_admin
    ADD CONSTRAINT uk_personal_admin_miembro UNIQUE (miembro_id);


--
-- TOC entry 5155 (class 2606 OID 16950)
-- Name: profesor uk_profesor_miembro; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT uk_profesor_miembro UNIQUE (miembro_id);


--
-- TOC entry 5134 (class 2606 OID 16952)
-- Name: miembro uq_miembro_correo; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembro
    ADD CONSTRAINT uq_miembro_correo UNIQUE (correo);


--
-- TOC entry 5104 (class 1259 OID 16953)
-- Name: idx_conversacion_miembro_creador; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversacion_miembro_creador ON public.conversacion USING btree (miembro_creador_id);


--
-- TOC entry 5127 (class 1259 OID 16954)
-- Name: idx_mensaje_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mensaje_fecha ON public.mensaje USING btree (fecha_hora_envio);


--
-- TOC entry 5128 (class 1259 OID 16955)
-- Name: idx_mensaje_miembro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mensaje_miembro ON public.mensaje USING btree (miembro_id);


--
-- TOC entry 5143 (class 1259 OID 16956)
-- Name: idx_participa_en_miembro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_participa_en_miembro ON public.participa_en USING btree (miembro_id);


--
-- TOC entry 5240 (class 2620 OID 16957)
-- Name: grupo tg_auto_admin_grupo; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_auto_admin_grupo AFTER INSERT ON public.grupo FOR EACH ROW EXECUTE FUNCTION public.auto_admin_grupo();


--
-- TOC entry 5232 (class 2620 OID 16958)
-- Name: ciudad tg_normalizar_ciudad; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_normalizar_ciudad BEFORE INSERT OR UPDATE ON public.ciudad FOR EACH ROW EXECUTE FUNCTION public.normalizar_ciudad();


--
-- TOC entry 5243 (class 2620 OID 16959)
-- Name: miembro tg_normalizar_ciudad_miembro; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_normalizar_ciudad_miembro BEFORE INSERT ON public.miembro FOR EACH ROW EXECUTE FUNCTION public.normalizar_ciudad_miembro();


--
-- TOC entry 5235 (class 2620 OID 16960)
-- Name: estado tg_normalizar_estado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_normalizar_estado BEFORE INSERT OR UPDATE ON public.estado FOR EACH ROW EXECUTE FUNCTION public.normalizar_estado();


--
-- TOC entry 5246 (class 2620 OID 16961)
-- Name: pais tg_normalizar_pais; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_normalizar_pais BEFORE INSERT OR UPDATE ON public.pais FOR EACH ROW EXECUTE FUNCTION public.normalizar_pais();


--
-- TOC entry 5241 (class 2620 OID 16962)
-- Name: grupo tg_normalizar_tipo_grupo; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_normalizar_tipo_grupo BEFORE INSERT OR UPDATE ON public.grupo FOR EACH ROW EXECUTE FUNCTION public.normalizar_tipo_grupo();


--
-- TOC entry 5236 (class 2620 OID 16963)
-- Name: estudiante tg_validar_correo_estudiante; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_correo_estudiante BEFORE INSERT OR UPDATE ON public.estudiante FOR EACH ROW EXECUTE FUNCTION public.validar_correo_estudiante();


--
-- TOC entry 5247 (class 2620 OID 16964)
-- Name: profesor tg_validar_correo_profesor; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_correo_profesor BEFORE INSERT OR UPDATE ON public.profesor FOR EACH ROW EXECUTE FUNCTION public.validar_correo_profesor();


--
-- TOC entry 5239 (class 2620 OID 16965)
-- Name: evento tg_validar_integridad_temporal_evento; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_integridad_temporal_evento BEFORE INSERT OR UPDATE ON public.evento FOR EACH ROW EXECUTE FUNCTION public.validar_integridad_temporal_evento();


--
-- TOC entry 5234 (class 2620 OID 16966)
-- Name: egresado tg_validar_no_solapamiento_est_egr_insert_egr; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_no_solapamiento_est_egr_insert_egr BEFORE INSERT ON public.egresado FOR EACH ROW EXECUTE FUNCTION public.validar_no_solapamiento_est_egr_insert_egr();


--
-- TOC entry 5237 (class 2620 OID 16967)
-- Name: estudiante tg_validar_no_solapamiento_est_egr_insert_est; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_no_solapamiento_est_egr_insert_est BEFORE INSERT ON public.estudiante FOR EACH ROW EXECUTE FUNCTION public.validar_no_solapamiento_est_egr_insert_est();


--
-- TOC entry 5238 (class 2620 OID 16968)
-- Name: estudiante tg_validar_no_solapamiento_est_prof_insert_est; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_no_solapamiento_est_prof_insert_est BEFORE INSERT ON public.estudiante FOR EACH ROW EXECUTE FUNCTION public.validar_no_solapamiento_est_prof_insert_est();


--
-- TOC entry 5248 (class 2620 OID 16969)
-- Name: profesor tg_validar_no_solapamiento_est_prof_insert_prof; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_no_solapamiento_est_prof_insert_prof BEFORE INSERT ON public.profesor FOR EACH ROW EXECUTE FUNCTION public.validar_no_solapamiento_est_prof_insert_prof();


--
-- TOC entry 5244 (class 2620 OID 16970)
-- Name: miembrocarrera tg_validar_pertenencia_carrera; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_pertenencia_carrera BEFORE INSERT ON public.miembrocarrera FOR EACH ROW EXECUTE FUNCTION public.validar_pertenencia_carrera();


--
-- TOC entry 5242 (class 2620 OID 17268)
-- Name: inmueble_alquiler tg_validar_precio_inmueble; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_precio_inmueble BEFORE INSERT OR UPDATE ON public.inmueble_alquiler FOR EACH ROW EXECUTE FUNCTION public.validar_precio_positivo();


--
-- TOC entry 5231 (class 2620 OID 17269)
-- Name: articulo_mkt tg_validar_precio_mkt; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_precio_mkt BEFORE INSERT OR UPDATE ON public.articulo_mkt FOR EACH ROW EXECUTE FUNCTION public.validar_precio_positivo();


--
-- TOC entry 5245 (class 2620 OID 17270)
-- Name: oferta_empleo tg_validar_status_organizacion_oferta; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_status_organizacion_oferta BEFORE INSERT OR UPDATE OF rif_organizacion ON public.oferta_empleo FOR EACH ROW EXECUTE FUNCTION public.validar_status_organizacion_oferta();


--
-- TOC entry 5249 (class 2620 OID 17271)
-- Name: se_postula tg_validar_tipo_miembro_postulacion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_validar_tipo_miembro_postulacion BEFORE INSERT ON public.se_postula FOR EACH ROW EXECUTE FUNCTION public.validar_tipo_miembro_postulacion();


--
-- TOC entry 5233 (class 2620 OID 16971)
-- Name: conversacion trg_agregar_creador_conversacion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_agregar_creador_conversacion AFTER INSERT ON public.conversacion FOR EACH ROW EXECUTE FUNCTION public.fn_agregar_creador_a_conversacion();


--
-- TOC entry 5219 (class 2606 OID 16972)
-- Name: rec_academica fk_academica_rec; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rec_academica
    ADD CONSTRAINT fk_academica_rec FOREIGN KEY (clave_rec_academica) REFERENCES public.recomendacion(clave_recomendacion) ON DELETE CASCADE;


--
-- TOC entry 5186 (class 2606 OID 16977)
-- Name: articulo_mkt fk_articulo_categoria; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articulo_mkt
    ADD CONSTRAINT fk_articulo_categoria FOREIGN KEY (nombre_categoria) REFERENCES public.categoria_mkt(nombre_categoria) ON DELETE CASCADE;


--
-- TOC entry 5187 (class 2606 OID 16982)
-- Name: articulo_mkt fk_articulo_publicacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articulo_mkt
    ADD CONSTRAINT fk_articulo_publicacion FOREIGN KEY (clave_articulo) REFERENCES public.publicacion(clave_publicacion) ON DELETE CASCADE;


--
-- TOC entry 5220 (class 2606 OID 16987)
-- Name: rec_artistica fk_artistica_rec; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rec_artistica
    ADD CONSTRAINT fk_artistica_rec FOREIGN KEY (clave_rec_artistica) REFERENCES public.recomendacion(clave_recomendacion) ON DELETE CASCADE;


--
-- TOC entry 5188 (class 2606 OID 16992)
-- Name: asiste_evento fk_asiste_evento; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asiste_evento
    ADD CONSTRAINT fk_asiste_evento FOREIGN KEY (nombre_evento) REFERENCES public.evento(nombre_evento) ON DELETE CASCADE;


--
-- TOC entry 5189 (class 2606 OID 16997)
-- Name: asiste_evento fk_asiste_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asiste_evento
    ADD CONSTRAINT fk_asiste_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5190 (class 2606 OID 17002)
-- Name: ciudad fk_ciudad_estado; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudad
    ADD CONSTRAINT fk_ciudad_estado FOREIGN KEY (nombre_estado) REFERENCES public.estado(nombre_estado) ON DELETE CASCADE;


--
-- TOC entry 5191 (class 2606 OID 17007)
-- Name: ciudad fk_ciudad_pais; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudad
    ADD CONSTRAINT fk_ciudad_pais FOREIGN KEY (nombre_pais) REFERENCES public.pais(nombre_pais) ON DELETE CASCADE;


--
-- TOC entry 5192 (class 2606 OID 17012)
-- Name: comenta fk_comenta_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comenta
    ADD CONSTRAINT fk_comenta_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5193 (class 2606 OID 17017)
-- Name: comenta fk_comenta_publicacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comenta
    ADD CONSTRAINT fk_comenta_publicacion FOREIGN KEY (clave_publicacion) REFERENCES public.publicacion(clave_publicacion) ON DELETE CASCADE;


--
-- TOC entry 5194 (class 2606 OID 17022)
-- Name: conversacion fk_conversacion_miembro_creador; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversacion
    ADD CONSTRAINT fk_conversacion_miembro_creador FOREIGN KEY (miembro_creador_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5221 (class 2606 OID 17027)
-- Name: rec_culinaria fk_culinaria_rec; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rec_culinaria
    ADD CONSTRAINT fk_culinaria_rec FOREIGN KEY (clave_rec_culinaria) REFERENCES public.recomendacion(clave_recomendacion) ON DELETE CASCADE;


--
-- TOC entry 5195 (class 2606 OID 17032)
-- Name: dependencia_ucab fk_dep_facultad; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependencia_ucab
    ADD CONSTRAINT fk_dep_facultad FOREIGN KEY (nombre_facultad) REFERENCES public.facultad(nombre_facultad) ON DELETE CASCADE;


--
-- TOC entry 5196 (class 2606 OID 17037)
-- Name: egresado fk_egresado_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.egresado
    ADD CONSTRAINT fk_egresado_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5197 (class 2606 OID 17042)
-- Name: estudiante fk_estudiante_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estudiante
    ADD CONSTRAINT fk_estudiante_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5198 (class 2606 OID 17047)
-- Name: evento fk_evento_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT fk_evento_miembro FOREIGN KEY (miembro_creador_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5199 (class 2606 OID 17052)
-- Name: grupo fk_grupo_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT fk_grupo_miembro FOREIGN KEY (miembro_creador_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5229 (class 2606 OID 17277)
-- Name: guarda_favorito fk_guarda_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guarda_favorito
    ADD CONSTRAINT fk_guarda_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5230 (class 2606 OID 17282)
-- Name: guarda_favorito fk_guarda_publicacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guarda_favorito
    ADD CONSTRAINT fk_guarda_publicacion FOREIGN KEY (clave_publicacion) REFERENCES public.publicacion(clave_publicacion) ON DELETE CASCADE;


--
-- TOC entry 5200 (class 2606 OID 17057)
-- Name: inmueble_alquiler fk_inmueble_ciudad; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inmueble_alquiler
    ADD CONSTRAINT fk_inmueble_ciudad FOREIGN KEY (nombre_ciudad) REFERENCES public.ciudad(nombre_ciudad) ON UPDATE CASCADE;


--
-- TOC entry 5201 (class 2606 OID 17062)
-- Name: inmueble_alquiler fk_inmueble_publicacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inmueble_alquiler
    ADD CONSTRAINT fk_inmueble_publicacion FOREIGN KEY (clave_inmueble) REFERENCES public.publicacion(clave_publicacion) ON DELETE CASCADE;


--
-- TOC entry 5202 (class 2606 OID 17067)
-- Name: inmueble_alquiler fk_inmueble_tipo; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inmueble_alquiler
    ADD CONSTRAINT fk_inmueble_tipo FOREIGN KEY (nombre_tipo) REFERENCES public.tipo_inmueble(nombre_tipo);


--
-- TOC entry 5203 (class 2606 OID 17072)
-- Name: mensaje fk_mensaje_conversacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensaje
    ADD CONSTRAINT fk_mensaje_conversacion FOREIGN KEY (conversacion_id) REFERENCES public.conversacion(conversacion_id) ON DELETE CASCADE;


--
-- TOC entry 5204 (class 2606 OID 17077)
-- Name: mensaje fk_mensaje_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensaje
    ADD CONSTRAINT fk_mensaje_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5205 (class 2606 OID 17082)
-- Name: miembro fk_miembro_ciudad; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembro
    ADD CONSTRAINT fk_miembro_ciudad FOREIGN KEY (nombre_ciudad) REFERENCES public.ciudad(nombre_ciudad) ON DELETE SET NULL;


--
-- TOC entry 5206 (class 2606 OID 17087)
-- Name: miembrocarrera fk_miembrocarrera_carrera; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembrocarrera
    ADD CONSTRAINT fk_miembrocarrera_carrera FOREIGN KEY (nombre_carrera) REFERENCES public.carrera(nombre_carrera) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5207 (class 2606 OID 17092)
-- Name: miembrocarrera fk_miembrocarrera_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembrocarrera
    ADD CONSTRAINT fk_miembrocarrera_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5208 (class 2606 OID 17097)
-- Name: oferta_empleo fk_oferta_dep; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_empleo
    ADD CONSTRAINT fk_oferta_dep FOREIGN KEY (nombre_dependencia) REFERENCES public.dependencia_ucab(nombre_dependencia) ON DELETE CASCADE;


--
-- TOC entry 5209 (class 2606 OID 17102)
-- Name: oferta_empleo fk_oferta_org; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_empleo
    ADD CONSTRAINT fk_oferta_org FOREIGN KEY (rif_organizacion) REFERENCES public.organizacion_externa(rif) ON DELETE CASCADE;


--
-- TOC entry 5210 (class 2606 OID 17107)
-- Name: oferta_empleo fk_oferta_publicacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_empleo
    ADD CONSTRAINT fk_oferta_publicacion FOREIGN KEY (clave_oferta) REFERENCES public.publicacion(clave_publicacion) ON DELETE CASCADE;


--
-- TOC entry 5211 (class 2606 OID 17112)
-- Name: participa_en fk_participa_en_conversacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participa_en
    ADD CONSTRAINT fk_participa_en_conversacion FOREIGN KEY (conversacion_id) REFERENCES public.conversacion(conversacion_id) ON DELETE CASCADE;


--
-- TOC entry 5212 (class 2606 OID 17117)
-- Name: participa_en fk_participa_en_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participa_en
    ADD CONSTRAINT fk_participa_en_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5213 (class 2606 OID 17122)
-- Name: personal_admin fk_personal_admin_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_admin
    ADD CONSTRAINT fk_personal_admin_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5214 (class 2606 OID 17127)
-- Name: post_feed fk_post_publicacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_feed
    ADD CONSTRAINT fk_post_publicacion FOREIGN KEY (clave_post) REFERENCES public.publicacion(clave_publicacion) ON DELETE CASCADE;


--
-- TOC entry 5215 (class 2606 OID 17132)
-- Name: profesor fk_profesor_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT fk_profesor_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5216 (class 2606 OID 17137)
-- Name: publicacion fk_publicacion_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicacion
    ADD CONSTRAINT fk_publicacion_miembro FOREIGN KEY (clave_miembro_creador) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5217 (class 2606 OID 17142)
-- Name: reacciona fk_reacciona_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reacciona
    ADD CONSTRAINT fk_reacciona_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5218 (class 2606 OID 17147)
-- Name: reacciona fk_reacciona_publicacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reacciona
    ADD CONSTRAINT fk_reacciona_publicacion FOREIGN KEY (clave_publicacion) REFERENCES public.publicacion(clave_publicacion) ON DELETE CASCADE;


--
-- TOC entry 5222 (class 2606 OID 17152)
-- Name: recomendacion fk_rec_publicacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recomendacion
    ADD CONSTRAINT fk_rec_publicacion FOREIGN KEY (clave_recomendacion) REFERENCES public.publicacion(clave_publicacion) ON DELETE CASCADE;


--
-- TOC entry 5223 (class 2606 OID 17157)
-- Name: se_une_a fk_se_une_grupo; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.se_une_a
    ADD CONSTRAINT fk_se_une_grupo FOREIGN KEY (nombre_grupo) REFERENCES public.grupo(nombre_grupo) ON DELETE CASCADE;


--
-- TOC entry 5224 (class 2606 OID 17162)
-- Name: se_une_a fk_se_une_miembro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.se_une_a
    ADD CONSTRAINT fk_se_une_miembro FOREIGN KEY (miembro_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5225 (class 2606 OID 17167)
-- Name: seconecta fk_seconecta_solicitado; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seconecta
    ADD CONSTRAINT fk_seconecta_solicitado FOREIGN KEY (miembro_solicitado_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5226 (class 2606 OID 17172)
-- Name: seconecta fk_seconecta_solicitante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seconecta
    ADD CONSTRAINT fk_seconecta_solicitante FOREIGN KEY (miembro_solicitante_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5227 (class 2606 OID 17177)
-- Name: valora fk_valora_emisor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.valora
    ADD CONSTRAINT fk_valora_emisor FOREIGN KEY (miembro_emisor_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5228 (class 2606 OID 17182)
-- Name: valora fk_valora_receptor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.valora
    ADD CONSTRAINT fk_valora_receptor FOREIGN KEY (miembro_receptor_id) REFERENCES public.miembro(miembro_id) ON DELETE CASCADE;


--
-- TOC entry 5455 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO soyucab_app_rol;


--
-- TOC entry 5457 (class 0 OID 0)
-- Dependencies: 348
-- Name: FUNCTION citextin(cstring); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citextin(cstring) TO soyucab_app_rol;


--
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 314
-- Name: FUNCTION citextout(public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citextout(public.citext) TO soyucab_app_rol;


--
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 321
-- Name: FUNCTION citextrecv(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citextrecv(internal) TO soyucab_app_rol;


--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 322
-- Name: FUNCTION citextsend(public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citextsend(public.citext) TO soyucab_app_rol;


--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 346
-- Name: FUNCTION citext(boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext(boolean) TO soyucab_app_rol;


--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 291
-- Name: FUNCTION citext(character); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext(character) TO soyucab_app_rol;


--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 352
-- Name: FUNCTION citext(inet); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext(inet) TO soyucab_app_rol;


--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 338
-- Name: FUNCTION auto_admin_grupo(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_admin_grupo() TO soyucab_app_rol;


--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 281
-- Name: FUNCTION calcular_interacciones_ponderadas(p_id_publicacion integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calcular_interacciones_ponderadas(p_id_publicacion integer) TO soyucab_app_rol;


--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 317
-- Name: FUNCTION citext_cmp(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_cmp(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 312
-- Name: FUNCTION citext_eq(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_eq(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 287
-- Name: FUNCTION citext_ge(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_ge(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 337
-- Name: FUNCTION citext_gt(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_gt(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5470 (class 0 OID 0)
-- Dependencies: 327
-- Name: FUNCTION citext_hash(public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_hash(public.citext) TO soyucab_app_rol;


--
-- TOC entry 5471 (class 0 OID 0)
-- Dependencies: 336
-- Name: FUNCTION citext_hash_extended(public.citext, bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_hash_extended(public.citext, bigint) TO soyucab_app_rol;


--
-- TOC entry 5472 (class 0 OID 0)
-- Dependencies: 282
-- Name: FUNCTION citext_larger(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_larger(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 350
-- Name: FUNCTION citext_le(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_le(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5474 (class 0 OID 0)
-- Dependencies: 278
-- Name: FUNCTION citext_lt(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_lt(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5475 (class 0 OID 0)
-- Dependencies: 272
-- Name: FUNCTION citext_ne(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_ne(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5476 (class 0 OID 0)
-- Dependencies: 306
-- Name: FUNCTION citext_pattern_cmp(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_pattern_cmp(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5477 (class 0 OID 0)
-- Dependencies: 307
-- Name: FUNCTION citext_pattern_ge(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_pattern_ge(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5478 (class 0 OID 0)
-- Dependencies: 284
-- Name: FUNCTION citext_pattern_gt(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_pattern_gt(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5479 (class 0 OID 0)
-- Dependencies: 308
-- Name: FUNCTION citext_pattern_le(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_pattern_le(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5480 (class 0 OID 0)
-- Dependencies: 303
-- Name: FUNCTION citext_pattern_lt(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_pattern_lt(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5481 (class 0 OID 0)
-- Dependencies: 351
-- Name: FUNCTION citext_smaller(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.citext_smaller(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5482 (class 0 OID 0)
-- Dependencies: 296
-- Name: FUNCTION fn_agregar_creador_a_conversacion(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_agregar_creador_a_conversacion() TO soyucab_app_rol;


--
-- TOC entry 5483 (class 0 OID 0)
-- Dependencies: 339
-- Name: FUNCTION fn_puede_ver_publicacion(p_visor_id integer, p_publicacion_id integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_puede_ver_publicacion(p_visor_id integer, p_publicacion_id integer) TO soyucab_app_rol;


--
-- TOC entry 5484 (class 0 OID 0)
-- Dependencies: 301
-- Name: FUNCTION fn_tendencia_crecimiento_grupos(p_nombre_grupo character varying, p_fecha_referencia date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_tendencia_crecimiento_grupos(p_nombre_grupo character varying, p_fecha_referencia date) TO soyucab_app_rol;


--
-- TOC entry 5485 (class 0 OID 0)
-- Dependencies: 292
-- Name: FUNCTION normalizar_ciudad(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalizar_ciudad() TO soyucab_app_rol;


--
-- TOC entry 5486 (class 0 OID 0)
-- Dependencies: 300
-- Name: FUNCTION normalizar_ciudad_miembro(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalizar_ciudad_miembro() TO soyucab_app_rol;


--
-- TOC entry 5487 (class 0 OID 0)
-- Dependencies: 354
-- Name: FUNCTION normalizar_estado(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalizar_estado() TO soyucab_app_rol;


--
-- TOC entry 5488 (class 0 OID 0)
-- Dependencies: 326
-- Name: FUNCTION normalizar_pais(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalizar_pais() TO soyucab_app_rol;


--
-- TOC entry 5489 (class 0 OID 0)
-- Dependencies: 328
-- Name: FUNCTION normalizar_tipo_grupo(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalizar_tipo_grupo() TO soyucab_app_rol;


--
-- TOC entry 5490 (class 0 OID 0)
-- Dependencies: 320
-- Name: FUNCTION regexp_match(string public.citext, pattern public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_match(string public.citext, pattern public.citext) TO soyucab_app_rol;


--
-- TOC entry 5491 (class 0 OID 0)
-- Dependencies: 276
-- Name: FUNCTION regexp_match(string public.citext, pattern public.citext, flags text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_match(string public.citext, pattern public.citext, flags text) TO soyucab_app_rol;


--
-- TOC entry 5492 (class 0 OID 0)
-- Dependencies: 285
-- Name: FUNCTION regexp_matches(string public.citext, pattern public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_matches(string public.citext, pattern public.citext) TO soyucab_app_rol;


--
-- TOC entry 5493 (class 0 OID 0)
-- Dependencies: 344
-- Name: FUNCTION regexp_matches(string public.citext, pattern public.citext, flags text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_matches(string public.citext, pattern public.citext, flags text) TO soyucab_app_rol;


--
-- TOC entry 5494 (class 0 OID 0)
-- Dependencies: 297
-- Name: FUNCTION regexp_replace(string public.citext, pattern public.citext, replacement text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_replace(string public.citext, pattern public.citext, replacement text) TO soyucab_app_rol;


--
-- TOC entry 5495 (class 0 OID 0)
-- Dependencies: 341
-- Name: FUNCTION regexp_replace(string public.citext, pattern public.citext, replacement text, flags text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_replace(string public.citext, pattern public.citext, replacement text, flags text) TO soyucab_app_rol;


--
-- TOC entry 5496 (class 0 OID 0)
-- Dependencies: 274
-- Name: FUNCTION regexp_split_to_array(string public.citext, pattern public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_split_to_array(string public.citext, pattern public.citext) TO soyucab_app_rol;


--
-- TOC entry 5497 (class 0 OID 0)
-- Dependencies: 319
-- Name: FUNCTION regexp_split_to_array(string public.citext, pattern public.citext, flags text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_split_to_array(string public.citext, pattern public.citext, flags text) TO soyucab_app_rol;


--
-- TOC entry 5498 (class 0 OID 0)
-- Dependencies: 277
-- Name: FUNCTION regexp_split_to_table(string public.citext, pattern public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_split_to_table(string public.citext, pattern public.citext) TO soyucab_app_rol;


--
-- TOC entry 5499 (class 0 OID 0)
-- Dependencies: 309
-- Name: FUNCTION regexp_split_to_table(string public.citext, pattern public.citext, flags text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regexp_split_to_table(string public.citext, pattern public.citext, flags text) TO soyucab_app_rol;


--
-- TOC entry 5500 (class 0 OID 0)
-- Dependencies: 299
-- Name: FUNCTION replace(public.citext, public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.replace(public.citext, public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5501 (class 0 OID 0)
-- Dependencies: 304
-- Name: FUNCTION set_estudiante_miembro_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_estudiante_miembro_id() TO soyucab_app_rol;


--
-- TOC entry 5502 (class 0 OID 0)
-- Dependencies: 329
-- Name: PROCEDURE sp_aprobar_organizacion(IN p_id_admin integer, IN p_id_organizacion integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON PROCEDURE public.sp_aprobar_organizacion(IN p_id_admin integer, IN p_id_organizacion integer) TO soyucab_app_rol;


--
-- TOC entry 5503 (class 0 OID 0)
-- Dependencies: 288
-- Name: PROCEDURE sp_aprobar_organizacion(IN p_id_admin integer, IN p_rif_organizacion character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON PROCEDURE public.sp_aprobar_organizacion(IN p_id_admin integer, IN p_rif_organizacion character varying) TO soyucab_app_rol;


--
-- TOC entry 5504 (class 0 OID 0)
-- Dependencies: 286
-- Name: PROCEDURE sp_publicar_alquiler(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_precio numeric, IN p_condiciones character varying, IN p_tipo_inmueble character varying, IN p_nombre_ciudad character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON PROCEDURE public.sp_publicar_alquiler(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_precio numeric, IN p_condiciones character varying, IN p_tipo_inmueble character varying, IN p_nombre_ciudad character varying) TO soyucab_app_rol;


--
-- TOC entry 5505 (class 0 OID 0)
-- Dependencies: 318
-- Name: PROCEDURE sp_publicar_articulo(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_precio numeric, IN p_categoria character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON PROCEDURE public.sp_publicar_articulo(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_precio numeric, IN p_categoria character varying) TO soyucab_app_rol;


--
-- TOC entry 5506 (class 0 OID 0)
-- Dependencies: 313
-- Name: PROCEDURE sp_publicar_oferta_empleo(IN p_miembro_id integer, IN p_descripcion_publicacion text, IN p_titulo_cargo character varying, IN p_tipo_contrato character varying, IN p_requisitos character varying, IN p_nombre_dependencia character varying, IN p_rif_organizacion character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON PROCEDURE public.sp_publicar_oferta_empleo(IN p_miembro_id integer, IN p_descripcion_publicacion text, IN p_titulo_cargo character varying, IN p_tipo_contrato character varying, IN p_requisitos character varying, IN p_nombre_dependencia character varying, IN p_rif_organizacion character varying) TO soyucab_app_rol;


--
-- TOC entry 5507 (class 0 OID 0)
-- Dependencies: 334
-- Name: PROCEDURE sp_publicar_recomendacion(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_categoria character varying, IN p_ubicacion character varying, IN p_puntuacion integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON PROCEDURE public.sp_publicar_recomendacion(IN p_miembro_id integer, IN p_titulo character varying, IN p_descripcion text, IN p_categoria character varying, IN p_ubicacion character varying, IN p_puntuacion integer) TO soyucab_app_rol;


--
-- TOC entry 5508 (class 0 OID 0)
-- Dependencies: 275
-- Name: FUNCTION sp_registrar_estudiante(p_correo character varying, p_password_hash character varying, p_nombres character varying, p_apellidos character varying, p_semestre_actual integer, p_situacion_academica character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sp_registrar_estudiante(p_correo character varying, p_password_hash character varying, p_nombres character varying, p_apellidos character varying, p_semestre_actual integer, p_situacion_academica character varying) TO soyucab_app_rol;


--
-- TOC entry 5509 (class 0 OID 0)
-- Dependencies: 353
-- Name: FUNCTION split_part(public.citext, public.citext, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.split_part(public.citext, public.citext, integer) TO soyucab_app_rol;


--
-- TOC entry 5510 (class 0 OID 0)
-- Dependencies: 343
-- Name: FUNCTION strpos(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strpos(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5511 (class 0 OID 0)
-- Dependencies: 294
-- Name: FUNCTION texticlike(public.citext, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.texticlike(public.citext, text) TO soyucab_app_rol;


--
-- TOC entry 5512 (class 0 OID 0)
-- Dependencies: 311
-- Name: FUNCTION texticlike(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.texticlike(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5513 (class 0 OID 0)
-- Dependencies: 295
-- Name: FUNCTION texticnlike(public.citext, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.texticnlike(public.citext, text) TO soyucab_app_rol;


--
-- TOC entry 5514 (class 0 OID 0)
-- Dependencies: 357
-- Name: FUNCTION texticnlike(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.texticnlike(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5515 (class 0 OID 0)
-- Dependencies: 290
-- Name: FUNCTION texticregexeq(public.citext, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.texticregexeq(public.citext, text) TO soyucab_app_rol;


--
-- TOC entry 5516 (class 0 OID 0)
-- Dependencies: 355
-- Name: FUNCTION texticregexeq(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.texticregexeq(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5517 (class 0 OID 0)
-- Dependencies: 342
-- Name: FUNCTION texticregexne(public.citext, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.texticregexne(public.citext, text) TO soyucab_app_rol;


--
-- TOC entry 5518 (class 0 OID 0)
-- Dependencies: 356
-- Name: FUNCTION texticregexne(public.citext, public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.texticregexne(public.citext, public.citext) TO soyucab_app_rol;


--
-- TOC entry 5519 (class 0 OID 0)
-- Dependencies: 283
-- Name: FUNCTION translate(public.citext, public.citext, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.translate(public.citext, public.citext, text) TO soyucab_app_rol;


--
-- TOC entry 5520 (class 0 OID 0)
-- Dependencies: 323
-- Name: FUNCTION validar_correo_estudiante(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_correo_estudiante() TO soyucab_app_rol;


--
-- TOC entry 5521 (class 0 OID 0)
-- Dependencies: 273
-- Name: FUNCTION validar_correo_profesor(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_correo_profesor() TO soyucab_app_rol;


--
-- TOC entry 5522 (class 0 OID 0)
-- Dependencies: 335
-- Name: FUNCTION validar_integridad_temporal_evento(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_integridad_temporal_evento() TO soyucab_app_rol;


--
-- TOC entry 5523 (class 0 OID 0)
-- Dependencies: 349
-- Name: FUNCTION validar_no_auto_reporte(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_no_auto_reporte() TO soyucab_app_rol;


--
-- TOC entry 5524 (class 0 OID 0)
-- Dependencies: 289
-- Name: FUNCTION validar_no_solapamiento_est_egr_insert_egr(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_no_solapamiento_est_egr_insert_egr() TO soyucab_app_rol;


--
-- TOC entry 5525 (class 0 OID 0)
-- Dependencies: 331
-- Name: FUNCTION validar_no_solapamiento_est_egr_insert_est(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_no_solapamiento_est_egr_insert_est() TO soyucab_app_rol;


--
-- TOC entry 5526 (class 0 OID 0)
-- Dependencies: 340
-- Name: FUNCTION validar_no_solapamiento_est_prof_insert_est(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_no_solapamiento_est_prof_insert_est() TO soyucab_app_rol;


--
-- TOC entry 5527 (class 0 OID 0)
-- Dependencies: 279
-- Name: FUNCTION validar_no_solapamiento_est_prof_insert_prof(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_no_solapamiento_est_prof_insert_prof() TO soyucab_app_rol;


--
-- TOC entry 5528 (class 0 OID 0)
-- Dependencies: 302
-- Name: FUNCTION validar_pertenencia_carrera(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_pertenencia_carrera() TO soyucab_app_rol;


--
-- TOC entry 5529 (class 0 OID 0)
-- Dependencies: 330
-- Name: FUNCTION validar_precio_positivo(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_precio_positivo() TO soyucab_app_rol;


--
-- TOC entry 5530 (class 0 OID 0)
-- Dependencies: 316
-- Name: FUNCTION validar_status_organizacion_oferta(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_status_organizacion_oferta() TO soyucab_app_rol;


--
-- TOC entry 5531 (class 0 OID 0)
-- Dependencies: 293
-- Name: FUNCTION validar_tipo_miembro_postulacion(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validar_tipo_miembro_postulacion() TO soyucab_app_rol;


--
-- TOC entry 5532 (class 0 OID 0)
-- Dependencies: 1102
-- Name: FUNCTION max(public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.max(public.citext) TO soyucab_app_rol;


--
-- TOC entry 5533 (class 0 OID 0)
-- Dependencies: 1103
-- Name: FUNCTION min(public.citext); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.min(public.citext) TO soyucab_app_rol;


--
-- TOC entry 5534 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE articulo_mkt; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.articulo_mkt TO soyucab_app_rol;


--
-- TOC entry 5535 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE asiste_evento; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.asiste_evento TO soyucab_app_rol;


--
-- TOC entry 5536 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE carrera; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.carrera TO soyucab_app_rol;


--
-- TOC entry 5537 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE categoria_mkt; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categoria_mkt TO soyucab_app_rol;


--
-- TOC entry 5538 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE ciudad; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ciudad TO soyucab_app_rol;


--
-- TOC entry 5539 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE comenta_clave_comentario_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.comenta_clave_comentario_seq TO soyucab_app_rol;


--
-- TOC entry 5540 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE comenta; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.comenta TO soyucab_app_rol;


--
-- TOC entry 5541 (class 0 OID 0)
-- Dependencies: 264
-- Name: TABLE comentario; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.comentario TO soyucab_app_rol;


--
-- TOC entry 5543 (class 0 OID 0)
-- Dependencies: 265
-- Name: SEQUENCE comentario_clave_comentario_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.comentario_clave_comentario_seq TO soyucab_app_rol;


--
-- TOC entry 5544 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE conversacion; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.conversacion TO soyucab_app_rol;


--
-- TOC entry 5546 (class 0 OID 0)
-- Dependencies: 228
-- Name: SEQUENCE conversacion_conversacion_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.conversacion_conversacion_id_seq TO soyucab_app_rol;


--
-- TOC entry 5547 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE dependencia_ucab; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dependencia_ucab TO soyucab_app_rol;


--
-- TOC entry 5548 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE egresado; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.egresado TO soyucab_app_rol;


--
-- TOC entry 5550 (class 0 OID 0)
-- Dependencies: 231
-- Name: SEQUENCE egresado_egresado_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.egresado_egresado_id_seq TO soyucab_app_rol;


--
-- TOC entry 5551 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE estado; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.estado TO soyucab_app_rol;


--
-- TOC entry 5552 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE estudiante; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.estudiante TO soyucab_app_rol;


--
-- TOC entry 5554 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE estudiante_estudiante_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.estudiante_estudiante_id_seq TO soyucab_app_rol;


--
-- TOC entry 5555 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE evento; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evento TO soyucab_app_rol;


--
-- TOC entry 5556 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE facultad; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.facultad TO soyucab_app_rol;


--
-- TOC entry 5557 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE grupo; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.grupo TO soyucab_app_rol;


--
-- TOC entry 5558 (class 0 OID 0)
-- Dependencies: 266
-- Name: TABLE guarda_favorito; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.guarda_favorito TO soyucab_app_rol;


--
-- TOC entry 5559 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE inmueble_alquiler; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.inmueble_alquiler TO soyucab_app_rol;


--
-- TOC entry 5560 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE mensaje; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mensaje TO soyucab_app_rol;


--
-- TOC entry 5562 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE mensaje_numero_mensaje_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.mensaje_numero_mensaje_seq TO soyucab_app_rol;


--
-- TOC entry 5563 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE miembro; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.miembro TO soyucab_app_rol;


--
-- TOC entry 5565 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE miembro_miembro_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.miembro_miembro_id_seq TO soyucab_app_rol;


--
-- TOC entry 5566 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE miembrocarrera; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.miembrocarrera TO soyucab_app_rol;


--
-- TOC entry 5567 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE oferta_empleo; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.oferta_empleo TO soyucab_app_rol;


--
-- TOC entry 5568 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE organizacion_externa; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.organizacion_externa TO soyucab_app_rol;


--
-- TOC entry 5569 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE pais; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pais TO soyucab_app_rol;


--
-- TOC entry 5570 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE participa_en; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.participa_en TO soyucab_app_rol;


--
-- TOC entry 5571 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE personal_admin; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.personal_admin TO soyucab_app_rol;


--
-- TOC entry 5573 (class 0 OID 0)
-- Dependencies: 249
-- Name: SEQUENCE personal_admin_personal_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.personal_admin_personal_id_seq TO soyucab_app_rol;


--
-- TOC entry 5574 (class 0 OID 0)
-- Dependencies: 250
-- Name: TABLE post_feed; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.post_feed TO soyucab_app_rol;


--
-- TOC entry 5575 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE profesor; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profesor TO soyucab_app_rol;


--
-- TOC entry 5577 (class 0 OID 0)
-- Dependencies: 252
-- Name: SEQUENCE profesor_profesor_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.profesor_profesor_id_seq TO soyucab_app_rol;


--
-- TOC entry 5578 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE publicacion; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.publicacion TO soyucab_app_rol;


--
-- TOC entry 5580 (class 0 OID 0)
-- Dependencies: 254
-- Name: SEQUENCE publicacion_clave_publicacion_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.publicacion_clave_publicacion_seq TO soyucab_app_rol;


--
-- TOC entry 5581 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE reacciona; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reacciona TO soyucab_app_rol;


--
-- TOC entry 5582 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE reaction_publicacion; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reaction_publicacion TO soyucab_app_rol;


--
-- TOC entry 5584 (class 0 OID 0)
-- Dependencies: 268
-- Name: SEQUENCE reaction_publicacion_clave_reaccion_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.reaction_publicacion_clave_reaccion_seq TO soyucab_app_rol;


--
-- TOC entry 5585 (class 0 OID 0)
-- Dependencies: 256
-- Name: TABLE rec_academica; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rec_academica TO soyucab_app_rol;


--
-- TOC entry 5586 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE rec_artistica; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rec_artistica TO soyucab_app_rol;


--
-- TOC entry 5587 (class 0 OID 0)
-- Dependencies: 258
-- Name: TABLE rec_culinaria; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rec_culinaria TO soyucab_app_rol;


--
-- TOC entry 5588 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE recomendacion; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.recomendacion TO soyucab_app_rol;


--
-- TOC entry 5589 (class 0 OID 0)
-- Dependencies: 269
-- Name: SEQUENCE reporta_clave_reporte_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.reporta_clave_reporte_seq TO soyucab_app_rol;


--
-- TOC entry 5590 (class 0 OID 0)
-- Dependencies: 270
-- Name: TABLE reporta; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reporta TO soyucab_app_rol;


--
-- TOC entry 5591 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE se_postula; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.se_postula TO soyucab_app_rol;


--
-- TOC entry 5592 (class 0 OID 0)
-- Dependencies: 260
-- Name: TABLE se_une_a; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.se_une_a TO soyucab_app_rol;


--
-- TOC entry 5593 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE seconecta; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.seconecta TO soyucab_app_rol;


--
-- TOC entry 5594 (class 0 OID 0)
-- Dependencies: 262
-- Name: TABLE tipo_inmueble; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tipo_inmueble TO soyucab_app_rol;


--
-- TOC entry 5595 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE valora; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.valora TO soyucab_app_rol;


--
-- TOC entry 2331 (class 826 OID 17315)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO soyucab_app_rol;


-- Completed on 2026-01-14 07:49:20

--
-- PostgreSQL database dump complete
--

\unrestrict fmm5Wkklu24PftkL0BY0DaT7c9jifNfJcivxq5bYwuiFdFb9Zj9hBg2toasiwed

