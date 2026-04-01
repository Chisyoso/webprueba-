const BASE_IP = "192.168.1.7";
const BASE_URL = "http://" + BASE_IP + "/";
let ultimoComando = ""; // último comando enviado

// Enviar comando al ESP
function enviar(comando) {
    if(comando && comando !== ultimoComando){
        let img = new Image();
        img.src = BASE_URL + comando; // HTTP GET al ESP
        ultimoComando = comando;
        console.log("Enviado:", comando);
    }
}

// Función para leer joystick (simulado con Gamepad API)
function leerJoystick() {
    const gamepads = navigator.getGamepads();
    if(!gamepads) return;

    const gp = gamepads[0];
    if(!gp) return;

    let comando = "";

    const x = gp.axes[0]; // joystick horizontal
    const y = gp.axes[1]; // joystick vertical
    const deadzone = 0.2; // zona muerta

    if(y < -deadzone) comando = "UP";
    else if(y > deadzone) comando = "DOWN";
    else if(x < -deadzone) comando = "LEFTH";
    else if(x > deadzone) comando = "RIGHT";

    enviar(comando);
}

// Iniciar loop de joystick cada 200 ms
setInterval(leerJoystick, 200);