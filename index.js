// MOTOR COMPLETO

const terminal = document.getElementById("terminal");
const input = document.getElementById("input");
const panel = document.getElementById("panel");
const panelBtn = document.getElementById("panelBtn");
const closePanel = document.getElementById("closePanel");
const panelContent = document.getElementById("panelContent");

// ESTADO GLOBAL
let state = JSON.parse(localStorage.getItem("timbito_state")) || {
    history:[],
    variables:{},
    loops:{},
    pins:{},
    stats:{}
};

let buildingLoop = null;
let buildingIf = null;

// ===== UTIL =====
function save(){
    localStorage.setItem("timbito_state", JSON.stringify(state));
}

function print(text,type="system"){
    const div=document.createElement("div");
    div.className="line "+type;
    div.textContent=text;
    terminal.appendChild(div);
    terminal.scrollTop=terminal.scrollHeight;
    state.history.push(text);
    save();
}

state.history.forEach(t=>print(t));

// ===== INPUT =====
input.addEventListener("keydown", async (e)=>{
    if(e.key==="Enter"){
        let cmd=input.value.trim();
        if(!cmd.startsWith("$")) cmd="$"+cmd;

        print(cmd,"user");
        input.value="";

        state.stats[cmd]=(state.stats[cmd]||0)+1;

        await ejecutar(cmd);
    }
});

// ===== PARSER =====
function evaluarExp(exp){
    exp = exp.replace(/variable\.leer\("(.*?)"\)/g,(m,p)=>state.variables[p] ?? 0);
    try{
        return Function(`return (${exp})`)();
    }catch{
        return 0;
    }
}

// ===== MOTOR DE EJECUCIÓN =====
async function ejecutar(cmd){

    // ===== AYUDA =====
    if(cmd==="$ayuda"){
        print("Comandos principales:", "info");
        print("clear, historial, variables, loops, if, delay");
        return;
    }

    // ===== CLEAR =====
    if(cmd==="$clear"){
        terminal.innerHTML="";
        return;
    }

    // ===== HISTORIAL =====
    if(cmd==="$historial"){
        Object.entries(state.stats).forEach(([k,v])=>{
            print(k+" -> "+v);
        });
        return;
    }

    // ===== VARIABLES =====
    if(cmd.startsWith("$variable.crear")){
        let n=cmd.match(/\((.*?)\)/)[1].replace(/"/g,"");
        state.variables[n]=0;
        print("variable "+n+" creada");
        save();
        return;
    }

    if(cmd.startsWith("$variable.edit")){
        let [n,val]=cmd.match(/\((.*?)\)/)[1].split(",");
        n=n.replace(/"/g,"");
        state.variables[n]=evaluarExp(val);
        print(n+" = "+state.variables[n]);
        save();
        return;
    }

    if(cmd.startsWith("$variable.leer")){
        let n=cmd.match(/\((.*?)\)/)[1].replace(/"/g,"");
        print(state.variables[n] ?? "undefined");
        return;
    }

    // ===== PINES (SIMULADOS) =====
    if(cmd.startsWith("$crear.pin")){
        let [type,p]=cmd.match(/\.(.*?)\((.*?)\)/).slice(1);
        state.pins[p]={type,value:0};
        print("pin "+p+" "+type);
        save();
        return;
    }

    if(cmd.startsWith("$escribir.pin")){
        let [p,v]=cmd.match(/\((.*?)\)/)[1].split(",");
        if(state.pins[p]){
            state.pins[p].value=parseInt(v);
            print("pin "+p+" = "+v);
        }else print("pin no existe","error");
        return;
    }

    if(cmd.startsWith("$leer.pin")){
        let p=cmd.match(/\((.*?)\)/)[1];
        print(state.pins[p]?.value ?? "null");
        return;
    }

    // ===== LOOP CREACIÓN =====
    if(cmd.startsWith("$loop.") && cmd.endsWith("()")){
        let name=cmd.match(/\$loop\.(.*?)\(\)/)[1];
        buildingLoop={name,body:[]};
        print("creando loop: "+name);
        return;
    }

    if(cmd==="$loop.final()"){
        if(buildingLoop){
            state.loops[buildingLoop.name]=buildingLoop;
            print("loop guardado");
            runLoop(buildingLoop.name);
            buildingLoop=null;
            save();
        }
        return;
    }

    if(buildingLoop){
        buildingLoop.body.push(cmd);
        return;
    }

    // ===== DELAY =====
    if(cmd.startsWith("$delay")){
        let t=parseInt(cmd.match(/\((.*?)\)/)[1]);
        await new Promise(r=>setTimeout(r,t));
        return;
    }

    // ===== LOOP RUN =====
    function runLoop(name){
        let loop=state.loops[name];
        if(!loop) return;

        loop.running=true;

        (async function(){
            while(loop.running){
                for(let c of loop.body){
                    await ejecutarBloque(c, loop);
                }
            }
        })();
    }

    // ===== BLOQUE =====
    async function ejecutarBloque(c, loop){

        // IF DETECCIÓN
        if(typeof c==="object" && c.type==="if"){
            let cond=evaluarExp(c.cond);
            let actions = cond ? c.then : c.else;

            for(let a of actions){
                await ejecutarBloque(a,loop);
            }
            return;
        }

        // IF BUILD
        if(c.startsWith("$if(")){
            let cond=c.match(/\((.*?)\)/)[1];
            buildingIf={type:"if",cond,then:[],else:[],mode:"then"};
            return;
        }

        if(c==="$else" && buildingIf){
            buildingIf.mode="else";
            return;
        }

        if(c==="$if.final()" && buildingIf){
            loop.body.push(buildingIf);
            buildingIf=null;
            return;
        }

        if(buildingIf){
            if(buildingIf.mode==="then") buildingIf.then.push(c);
            else buildingIf.else.push(c);
            return;
        }

        // NORMAL
        await ejecutar(c);
    }

    print("comando no reconocido","error");
}

// ===== PANEL =====
panelBtn.onclick=()=>{
    panel.classList.remove("hidden");
    renderPanel();
};

closePanel.onclick=()=>{
    panel.classList.add("hidden");
};

function renderPanel(){
    panelContent.innerHTML="";
    panelContent.innerHTML+=`<h4>Pins</h4><pre>${JSON.stringify(state.pins,null,2)}</pre>`;
    panelContent.innerHTML+=`<h4>Variables</h4><pre>${JSON.stringify(state.variables,null,2)}</pre>`;
    panelContent.innerHTML+=`<h4>Loops</h4><pre>${JSON.stringify(state.loops,null,2)}</pre>`;
}