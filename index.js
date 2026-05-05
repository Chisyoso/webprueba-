// index.js

const terminal = document.getElementById("terminal");
const input = document.getElementById("input");
const suggestionsBox = document.getElementById("suggestions");
const panel = document.getElementById("panel");
const panelBtn = document.getElementById("panelBtn");
const panelContent = document.getElementById("panelContent");

// estado
let history = [];
let stats = {};
let variables = {};
let loops = {};
let pins = {};
let ifLogs = [];

// comandos
const comandos = [
"$clear",
"$historial",
"$crear.pin.salida()",
"$crear.pin.entrada()",
"$leer.pin()",
"$escribir.pin()",
"$variable.crear()",
"$variable.edit()",
"$delet.variable()",
"$loop.",
"$loop.sleep()",
"$if(){}"
];

// print
function print(text, type="system"){
    const div = document.createElement("div");
    div.className="line "+type;
    div.textContent=text;
    terminal.appendChild(div);
    terminal.scrollTop=terminal.scrollHeight;
    history.push(text);
}

// ejecutar
input.addEventListener("keydown", async (e)=>{
    if(e.key==="Enter"){
        const cmd=input.value.trim();
        print("$ "+cmd,"user");
        count(cmd);
        input.value="";
        await ejecutar(cmd);
    }
});

// contador
function count(cmd){
    stats[cmd]=(stats[cmd]||0)+1;
}

// comandos
async function ejecutar(cmd){

    if(cmd==="$clear"){
        terminal.innerHTML="";
    }

    else if(cmd==="$historial"){
        Object.keys(stats).forEach(k=>{
            print(k+" -> "+stats[k]);
        });
    }

    else if(cmd.startsWith("$variable.crear")){
        let name=cmd.match(/"(.*?)"/)?.[1];
        variables[name]=0;
        print("variable creada: "+name);
    }

    else if(cmd.startsWith("$variable.edit")){
        let data=[...cmd.matchAll(/"(.*?)"/g)].map(x=>x[1]);
        variables[data[0]]=eval(data[1]);
        print("editada "+data[0]);
    }

    else if(cmd.startsWith("$delet.variable")){
        let name=cmd.match(/"(.*?)"/)?.[1];
        delete variables[name];
        print("eliminada "+name);
    }

    else if(cmd.startsWith("$if")){
        try{
            let cond=cmd.match(/\((.*?)\)/)[1];
            let action=cmd.match(/\{(.*?)\}/)[1];
            if(eval(parse(cond))){
                ifLogs.push(action);
                ejecutar(action);
            }
        }catch{print("error if","error")}
    }

    else if(cmd.startsWith("$loop.")){
        let name=cmd.split(".")[1];
        loops[name]={running:true,logs:[]};
        print("loop creado: "+name);
    }

    else if(cmd==="$loop.sleep()"){
        Object.values(loops).forEach(l=>l.running=false);
        print("loops pausados");
    }

    else if(cmd.startsWith("$delet.loop")){
        loops={};
        print("loops eliminados");
    }

    else if(cmd==="$crear.pin.salida()"){
        pins[Object.keys(pins).length]= "salida";
        print("pin salida creado");
    }

    else if(cmd==="$crear.pin.entrada()"){
        pins[Object.keys(pins).length]= "entrada";
        print("pin entrada creado");
    }

    else if(cmd==="$leer.pin()"){
        print("leyendo pin...");
    }

    else if(cmd==="$escribir.pin()"){
        print("escribiendo pin...");
    }

    else{
        print("comando no reconocido","error");
    }
}

// parse operadores C++
function parse(c){
    return c.replace(/\|\|/g,"||")
            .replace(/&&/g,"&&")
            .replace(/==/g,"==");
}

// sugerencias
input.addEventListener("input",()=>{
    const val=input.value;
    let sug=comandos.filter(c=>c.includes(val));
    suggestionsBox.textContent=sug.join(" | ");
});

// panel toggle
panelBtn.onclick=()=>{
    panel.classList.toggle("hidden");
    renderPanel();
};

// render panel
function renderPanel(){
    panelContent.innerHTML="";

    panelContent.innerHTML+=`<h4>Pins</h4>${JSON.stringify(pins)}`;
    panelContent.innerHTML+=`<h4>Loops</h4>${JSON.stringify(loops)}`;
    panelContent.innerHTML+=`<h4>Variables</h4>${JSON.stringify(variables)}`;
    panelContent.innerHTML+=`<h4>If Logs</h4>${JSON.stringify(ifLogs)}`;
}