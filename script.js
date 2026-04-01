// CONFIG
const BASE_IP = "192.168.1.7";
const BASE_URL = "http://" + BASE_IP + "/";

let ultimoComando = "";

// ENVÍO sin CORS
function enviar(comando) {
    document.getElementById("esp").src = BASE_URL + comando;
}

function iniciarControl() {

    window.addEventListener("gamepadconnected", () => {
        document.getElementById("estado").innerText = "Control conectado 🎮";
    });

    setInterval(() => {
        const gp = navigator.getGamepads()[0];
        if (!gp) return;

        let x = gp.axes[0]; // -1 a 1
        let y = gp.axes[1]; // -1 a 1

        // 🎮 MOVER PUNTO VISUAL
        let punto = document.getElementById("punto");

        let posX = 80 + (x * 60);
        let posY = 80 + (y * 60);

        punto.style.left = posX + "px";
        punto.style.top = posY + "px";

        // 🧠 DETECTAR DIRECCIÓN
        let comando = "";

        if (y < -0.5) comando = "UP";
        else if (y > 0.5) comando = "DOWN";
        else if (x < -0.5) comando = "LEFTH";
        else if (x > 0.5) comando = "RIGHT";

        function enviar(comando) {
    let img = new Image();
    img.src = BASE_URL + comando;
}

        // 🔄 CENTRO
        if (comando === "" && ultimoComando !== "") {
            enviar("STOP"); // opcional
            document.getElementById("estado").innerText = "Centro";
            ultimoComando = "";
        }

    }, 100);
}