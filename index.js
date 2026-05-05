// index.2

const terminal = document.getElementById("terminal");
const input = document.getElementById("input");
const panel = document.getElementById("panel");
const panelBtn = document.getElementById("panelBtn");
const closePanel = document.getElementById("closePanel");
const panelContent = document.getElementById("panelContent");

// estado persistente
let state = JSON.parse(localStorage.getItem("timbito_state")) || {
    history:[],
    stats:{},
    variables:{},
    loops:{},
    pins:{}
};

let currentLoop = null;
let buildingIf = null;

// guardar
function save(){
    localStorage.setItem("timbito_state", JSON.stringify(state));
}

// print
function print(text,type="system"){
    const div=document.createElement("div");
    div.className="line "+type;
    div.textContent=text;
    terminal.appendChild(div);
    terminal.scrollTop=terminal.scrollHeight;

    state.history.push(text);
    save();
}

// cargar historial
state.history.forEach(t=>print(t));

// ENTER
input.addEventListener("keydown",async(e)=>{
    if(e.key==="Enter"){
        let cmd=input.value.trim();
        if(!cmd.startsWith("$")) cmd="$"+cmd;

        print(cmd,"user");

        state.stats[cmd]=(state.stats[cmd]||0)+1;

        input.value="";
        await ejecutar(cmd);
    }
});

// ejecutar
async function ejecutar(cmd){

    // LOOP CREACIÓN
    if(cmd.startsWith("$loop.") && cmd.endsWith("()")){
        let name=cmd.match(/\$loop\.(.*?)\(\)/)[1];
        currentLoop={name,commands:[]};
        print("modo loop activo: "+name);
        return;
    }

    if(cmd==="$loop.final()"){
        if(currentLoop){
            state.loops[currentLoop.name]=currentLoop;
            print("loop guardado");
            ejecutarLoop(currentLoop);
            currentLoop=null;
            save();
        }
        return;
    }

    if(currentLoop){
        currentLoop.commands.push(cmd);
        return;
    }

    // LOOP EXEC
    function ejecutarLoop(loop){
        loop.running=true;
        async function run(){
            while(loop.running){
                for(let c of loop.commands){
                    await ejecutar(c);
                }
            }
        }
        run();
    }

    // DELAY
    if(cmd.startsWith("$delay(")){
        let t=parseInt(cmd.match(/\((.*?)\)/)[1]);
        await new Promise(r=>setTimeout(r,t));
        return;
    }

    // PIN
    if(cmd.startsWith("$crear.pin.entrada")){
        let p=cmd.match(/\((.*?)\)/)[1];
        state.pins[p]="entrada";
        print("pin "+p+" entrada");
        save();
        return;
    }

    if(cmd.startsWith("$crear.pin.salida")){
        let p=cmd.match(/\((.*?)\)/)[1];
        state.pins[p]="salida";
        print("pin "+p+" salida");
        save();
        return;
    }

    if(cmd.startsWith("$escribir.pin")){
        let [p,v]=cmd.match(/\((.*?)\)/)[1].split(",");
        print("pin "+p+" = "+v);
        return;
    }

    // VARIABLES
    if(cmd.startsWith("$variable.crear")){
        let name=cmd.match(/\((.*?)\)/)[1].replace(/"/g,"");
        state.variables[name]=0;
        print("variable "+name+" creada");
        save();
        return;
    }

    if(cmd.startsWith("$variable.edit")){
        let [n,val]=cmd.match(/\((.*?)\)/)[1].split(",");
        n=n.replace(/"/g,"");
        state.variables[n]=eval(parse(val));
        print("variable "+n+" = "+state.variables[n]);
        save();
        return;
    }

    if(cmd.startsWith("$variable.leer")){
        let n=cmd.match(/\((.*?)\)/)[1].replace(/"/g,"");
        print(state.variables[n] ?? "undefined");
        return;
    }

    if(cmd.startsWith("$delet.variable")){
        let n=cmd.match(/\((.*?)\)/)[1].replace(/"/g,"");
        delete state.variables[n];
        print("variable eliminada");
        save();
        return;
    }

    // IF SOLO EN LOOP
    if(cmd.startsWith("$if(") && currentLoop){
        let cond=cmd.match(/\((.*?)\)/)[1];
        buildingIf={cond,actions:[],elseActions:[]};
        print("modo if");
        return;
    }

    if(cmd==="$else" && buildingIf){
        buildingIf.mode="else";
        return;
    }

    if(cmd==="$if.final()" && buildingIf){
        currentLoop.commands.push(buildingIf);
        buildingIf=null;
        return;
    }

    if(buildingIf){
        if(buildingIf.mode==="else") buildingIf.elseActions.push(cmd);
        else buildingIf.actions.push(cmd);
        return;
    }

    // HISTORIAL
    if(cmd==="$historial"){
        Object.entries(state.stats).forEach(([k,v])=>{
            print(k+" -> "+v);
        });
        return;
    }

    // CLEAR
    if(cmd==="$clear"){
        terminal.innerHTML="";
        return;
    }

    print("comando no reconocido","error");
}

// parse
function parse(exp){
    return exp.replace(/variable\.leer\("(.*?)"\)/g,(m,p)=>state.variables[p]||0);
}

// PANEL
panelBtn.onclick=()=>{
    panel.classList.remove("hidden");
    renderPanel();
};

closePanel.onclick=()=>{
    panel.classList.add("hidden");
};

function renderPanel(){
    panelContent.innerHTML="";
    panelContent.innerHTML+=`<h4>Pins</h4>${JSON.stringify(state.pins)}<br>`;
    panelContent.innerHTML+=`<h4>Loops</h4>${JSON.stringify(state.loops)}<br>`;
    panelContent.innerHTML+=`<h4>Variables</h4>${JSON.stringify(state.variables)}<br>`;
}