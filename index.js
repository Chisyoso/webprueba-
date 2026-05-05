const terminal = document.getElementById("terminal");
const input = document.getElementById("input");
const suggestionsBox = document.getElementById("suggestions");

// comandos válidos
const comandos = [
    "$crear.pin.salida()",
    "$crear.pin.entrada()",
    "$leer.pin()",
    "$escribir.pin()"
];

// memoria virtual
let history = JSON.parse(localStorage.getItem("timbito_logs")) || [];

// imprimir en terminal
function print(text, type = "system") {
    const line = document.createElement("div");
    line.classList.add("line", type);
    line.textContent = text;
    terminal.appendChild(line);

    terminal.scrollTop = terminal.scrollHeight;

    history.push(text);
    localStorage.setItem("timbito_logs", JSON.stringify(history));
}

// cargar historial
history.forEach(msg => print(msg));

// detectar ENTER
input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
        const cmd = input.value.trim();
        print("$ " + cmd, "user");

        input.value = "";
        suggestionsBox.textContent = "";

        await ejecutar(cmd);
    }
});

// sugerencias en vivo
input.addEventListener("input", () => {
    const val = input.value;

    if (!val) {
        suggestionsBox.textContent = "";
        return;
    }

    const sugerencias = comandos.filter(c => c.includes(val));

    if (sugerencias.length > 0) {
        suggestionsBox.textContent = "Sugerencias: " + sugerencias.join(" | ");
    } else {
        const cercano = comandoMasCercano(val);
        if (cercano) {
            suggestionsBox.textContent = "Quizás quisiste decir: " + cercano;
        }
    }
});

// algoritmo simple de similitud
function comandoMasCercano(input) {
    let mejor = "";
    let minDist = Infinity;

    comandos.forEach(cmd => {
        const dist = levenshtein(input, cmd);
        if (dist < minDist) {
            minDist = dist;
            mejor = cmd;
        }
    });

    return minDist <= 10 ? mejor : null;
}

// distancia de Levenshtein
function levenshtein(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// ejecución de comandos
async function ejecutar(cmd) {

    if (cmd === "$crear.pin.salida()") {
        print("Configurando salida...");
        await enviarESP("crear_salida");
    }

    else if (cmd === "$crear.pin.entrada()") {
        print("Configurando entrada...");
        await enviarESP("crear_entrada");
    }

    else if (cmd === "$leer.pin()") {
        print("Leyendo...");
        await enviarESP("leer");
    }

    else if (cmd === "$escribir.pin()") {
        print("Encendiendo LED...");
        await enviarESP("escribir");
    }

    else {
        const sugerido = comandoMasCercano(cmd);
        print("Comando no reconocido", "error");

        if (sugerido) {
            print("Sugerencia: " + sugerido, "system");
        }
    }
}

// conexión ESP32
async function enviarESP(accion) {
    try {
        const res = await fetch(`http://192.168.4.1/${accion}`);
        const text = await res.text();
        print("ESP32: " + text);
    } catch {
        print("Error de conexión", "error");
    }
}