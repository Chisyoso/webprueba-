// CONFIGURACIÓN
const BASE_IP = "192.168.1.7";
const BASE_URL = "http://" + BASE_IP + "/";

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

        // Evita enviar lo mismo muchas veces
        if (comando !== "" && comando !== ultimoComando) {
            fetch(BASE_URL + comando);
            document.getElementById("estado").innerText = "Enviado: " + comando;
            ultimoComando = comando;
        }

        // Cuando vuelve al centro
        if (comando === "" && ultimoComando !== "") {
            fetch(BASE_URL + "STOP"); // opcional si lo usas en Arduino
            document.getElementById("estado").innerText = "Centro (detenido)";
            ultimoComando = "";
        }

    }, 150);
}