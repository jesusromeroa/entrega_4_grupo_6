// --- LOGIN (Mismo de antes) ---
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const correo = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                alert(`Bienvenido, ${data.usuario.nombres}`);
                if (data.usuario.es_administrador) window.location.href = '/index.html';
                else window.location.href = '/mi_perfil.html';
            } else {
                alert(data.error);
            }
        } catch (error) { console.error(error); alert('Error de conexión'); }
    });
}

// --- REGISTRO (ACTUALIZADO) ---
const formRegistro = document.getElementById('form-registro');
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipo = document.getElementById('reg-tipo').value;
        
        const payload = {
            nombres: document.getElementById('reg-nombres').value,
            apellidos: document.getElementById('reg-apellidos').value,
            correo: document.getElementById('reg-correo').value,
            password: document.getElementById('reg-pass').value,
            tipo: tipo,
            // Enviamos los datos extra solo si aplica
            semestre: tipo === 'Estudiante' ? document.getElementById('reg-semestre').value : null,
            escalafon: tipo === 'Profesor' ? document.getElementById('reg-escalafon').value : null,
            ano_graduacion: tipo === 'Egresado' ? document.getElementById('reg-ano').value : null
        };

        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                alert('Registro exitoso. Ahora inicia sesión.');
                window.location.href = 'login.html';
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (error) { console.error(error); }
    });
}

function logout() {
    localStorage.removeItem('usuario');
    window.location.href = '/login.html';
}