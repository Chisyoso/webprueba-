const USUARIO = "ITLB";
const PASSWORD = "ELECTRONICA123";

// CONFIGURACIÓN GLOBAL
const BASE_IP = "192.168.1.7"; // ← SOLO cambias esto
const BASE_URL = "http://" + BASE_IP + "/";

// LOGIN
function login() {
    let user = document.getElementById("usuario").value;
    let pass = document.getElementById("password").value;

    if (user === USUARIO && pass === PASSWORD) {
        localStorage.setItem("sesion", "activa");
        window.location.href = "index.html";
    } else {
        document.getElementById("error").innerText = "Datos incorrectos";
    }
}

// PROTEGER HOME
function protegerPagina() {
    if (localStorage.getItem("sesion") !== "activa") {
        window.location.href = "login.html";
    }
}

// CAMBIO DE SECCIONES (igual que antes)
function mostrarSeccion(id) {
    document.querySelectorAll(".seccion").forEach(sec => {
        sec.classList.add("oculto");
    });

    document.getElementById(id).classList.remove("oculto");
}

// CERRAR SESIÓN
function cerrarSesion() {
    localStorage.removeItem("sesion");
    window.location.href = "login.html";
}

function enviarComando(comando) {
    window.location.href = BASE_URL + comando;
}
let ultimoComando = "";

function iniciarControl() {

    window.addEventListener("gamepadconnected", () => {
        document.getElementById("estado").innerText = "Control conectado 🎮";
    });

    setInterval(() => {
        const gp = navigator.getGamepads()[0];
        if (!gp) return;

        let x = gp.axes[0]; // izquierda-derecha
        let y = gp.axes[1]; // arriba-abajo

        let comando = "";

        if (y < -0.5) comando = "UP";
        else if (y > 0.5) comando = "DOWN";
        else if (x < -0.5) comando = "LEFTH";
        else if (x > 0.5) comando = "RIGHT";

        // SOLO enviar si cambia (evita spam)
        if (comando !== "" && comando !== ultimoComando) {
            fetch(BASE_URL + comando);
            document.getElementById("estado").innerText = "Enviado: " + comando;
            ultimoComando = comando;
        }

        // Si está en centro → no enviar nada
        if (comando === "") {
            ultimoComando = "";
            document.getElementById("estado").innerText = "Centro (sin comando)";
        }

    }, 150);
}

