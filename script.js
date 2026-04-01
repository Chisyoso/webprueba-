// Cambia la IP de tu ESP aquí
const BASE_IP = "192.168.1.7";
const BASE_URL = "http://" + BASE_IP + "/";

let ultimoComando = "";

// Función para enviar comando al ESP
function enviar(comando) {
    if(comando && comando !== ultimoComando){
        let img = new Image();
        img.src = BASE_URL + comando;  // HTTP GET al ESP
        ultimoComando = comando;
        console.log("Enviado:", comando);
        document.getElementById("feedback").innerText = "Comando: " + comando;
        activarBotonVisual(comando);
    }
}

// Feedback visual en los botones
function activarBotonVisual(comando){
    const botones = { "UP":"triangulo", "DOWN":"x", "LEFTH":"cuadrado", "RIGHT":"circulo" };
    for(const id of Object.values(botones)){
        document.getElementById(id).classList.remove("active");
    }
    if(botones[comando]){
        document.getElementById(botones[comando]).classList.add("active");
        setTimeout(() => document.getElementById(botones[comando]).classList.remove("active"), 200);
    }
}

// Gamepad API
window.addEventListener("gamepadconnected", (e) => {
    console.log("Control conectado:", e.gamepad);
    document.getElementById("feedback").innerText = "Control conectado: " + e.gamepad.id;
});

// Loop para leer botones cada 100ms
setInterval(() => {
    const gp = navigator.getGamepads()[0];
    if(!gp) return;

    // Botones PS4: Triángulo 3, X 0, Cuadrado 2, Círculo 1
    if(gp.buttons[3].pressed) enviar("UP");      // Triángulo
    else if(gp.buttons[0].pressed) enviar("DOWN"); // X
    else if(gp.buttons[2].pressed) enviar("LEFTH"); // Cuadrado
    else if(gp.buttons[1].pressed) enviar("RIGHT"); // Círculo
}, 100);