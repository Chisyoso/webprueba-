// index.js — timbitoOS v3 (motor + FS + editor + loops + if + sugerencias)

// ===== DOM =====
const terminal = document.getElementById("terminal");
const input = document.getElementById("input");
const suggestionsBox = document.getElementById("suggestions");
const panel = document.getElementById("panel");
const panelBtn = document.getElementById("panelBtn");
const closePanel = document.getElementById("closePanel");
const panelContent = document.getElementById("panelContent");

// ===== ESTADO =====
let state = JSON.parse(localStorage.getItem("timbito_state_v3")) || {
  history: [],
  stats: {},
  variables: {},
  pins: {},
  loops: {},   // {name:{body:[], running:false, logs:[], pointer:0}}
  files: {},   // {name:{type:'text'|'loop', lines:[]}}
};

let buildingLoop = null;   // {name, body:[]}
let buildingIf = null;     // {cond, then:[], else:[], mode:'then'}
let activeEditor = null;   // {name, type, cursor}
let runningLoops = {};     // name -> {stop:false}

// ===== UTIL =====
function save(){ localStorage.setItem("timbito_state_v3", JSON.stringify(state)); }

function print(text, type="system"){
  const div = document.createElement("div");
  div.className = "line " + type;
  div.textContent = text;
  terminal.appendChild(div);
  terminal.scrollTop = terminal.scrollHeight;
  state.history.push(text);
  save();
}

function now(){ return new Date().toLocaleTimeString(); }

function logLoop(name, msg){
  const loop = state.loops[name];
  if(!loop) return;
  loop.logs = loop.logs || [];
  loop.logs.push(`[${now()}] ${msg}`);
  if(loop.logs.length > 200) loop.logs.shift();
  save();
}

// cargar historial
state.history.forEach(t => print(t));

// ===== INPUT =====
input.addEventListener("keydown", async (e)=>{
  if(e.key === "Enter"){
    let cmd = input.value.trim();
    if(!cmd) return;

    // auto $
    if(!cmd.startsWith("$")) cmd = "$" + cmd;

    print(cmd, "user");
    state.stats[cmd] = (state.stats[cmd]||0) + 1;

    input.value = "";
    suggestionsBox.textContent = "";

    await ejecutar(cmd);
  }

  // TAB autocomplete
  if(e.key === "Tab"){
    e.preventDefault();
    const s = suggestionsBox.textContent.split(" | ")[0];
    if(s){
      input.value = s.replace(/^\$/,'');
    }
  }
});

// ===== SUGERENCIAS =====
const comandosBase = [
  "$ayuda","$clear","$historial",
  "$variable.crear nombre","$variable.edit nombre valor","$variable.leer nombre","$delet.variable nombre",
  "$crear.pin.entrada pin","$crear.pin.salida pin","$leer.pin pin","$escribir.pin pin valor",
  "$loop.nombre","$loop.final","$loop.init nombre","$loop.stop nombre","$loop.sleep",
  "$archivo.crear nombre","$archivo.abrir nombre","$archivo.guardar","$archivo.cerrar","$delet.archivo nombre",
  "$delay ms"
];

input.addEventListener("input", ()=>{
  const val = input.value.trim();
  if(!val){ suggestionsBox.textContent=""; return; }

  const list = (activeEditor ? [
    "$archivo.guardar","$archivo.cerrar","$linea.add texto","$linea.edit idx texto","$linea.del idx"
  ] : comandosBase).filter(c => c.includes(val));

  if(list.length){
    suggestionsBox.textContent = list.slice(0,5).join(" | ");
  }else{
    const cercano = comandoMasCercano(val, comandosBase);
    suggestionsBox.textContent = cercano ? "Quizás: " + cercano : "";
  }
});

function comandoMasCercano(input, list){
  let best = "", min = Infinity;
  for(const c of list){
    const d = levenshtein(input, c);
    if(d < min){ min = d; best = c; }
  }
  return min <= 8 ? best : null;
}

function levenshtein(a,b){
  const m = Array.from({length:b.length+1}, (_,i)=>[i]);
  for(let j=0;j<=a.length;j++) m[0][j]=j;
  for(let i=1;i<=b.length;i++){
    for(let j=1;j<=a.length;j++){
      m[i][j] = b[i-1]===a[j-1] ? m[i-1][j-1] :
        Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
    }
  }
  return m[b.length][a.length];
}

// ===== PARSER / EVAL =====
function evalExp(exp){
  // variables
  exp = exp.replace(/variable\.leer\s+([a-zA-Z0-9_]+)/g, (_,n)=> (state.variables[n] ?? 0));
  // operadores
  try{
    return Function(`"use strict";return (${exp})`)();
  }catch{
    throw new Error("Error de sintaxis en expresión");
  }
}

// ===== MOTOR =====
async function ejecutar(cmd){

  // ===== EDITOR (archivo/loop) =====
  if(activeEditor){
    // comandos de edición
    if(cmd === "$archivo.guardar"){
      const f = state.files[activeEditor.name];
      if(f.type === "loop"){
        state.loops[activeEditor.name] = {
          body: f.lines.slice(),
          running:false, logs:[]
        };
        print("loop guardado desde editor");
      }else{
        print("archivo guardado");
      }
      save();
      return;
    }

    if(cmd === "$archivo.cerrar"){
      activeEditor = null;
      print("editor cerrado");
      return;
    }

    if(cmd.startsWith("$linea.add ")){
      const text = cmd.replace("$linea.add ","");
      state.files[activeEditor.name].lines.push(text);
      print("línea añadida");
      renderEditor();
      save();
      return;
    }

    if(cmd.startsWith("$linea.edit ")){
      const [, idx, ...rest] = cmd.split(" ");
      const text = rest.join(" ");
      const i = parseInt(idx);
      const f = state.files[activeEditor.name];
      if(!f.lines[i]){ print("índice inválido","error"); return; }
      f.lines[i] = text;
      print("línea editada");
      renderEditor();
      save();
      return;
    }

    if(cmd.startsWith("$linea.del ")){
      const i = parseInt(cmd.split(" ")[1]);
      const f = state.files[activeEditor.name];
      if(!f.lines[i]){ print("índice inválido","error"); return; }
      f.lines.splice(i,1);
      print("línea eliminada");
      renderEditor();
      save();
      return;
    }

    // escribir directo como línea
    state.files[activeEditor.name].lines.push(cmd);
    renderEditor();
    save();
    return;
  }

  // ===== AYUDA =====
  if(cmd === "$ayuda"){
    print("Comandos: clear, historial, variables, pins, loops, archivos, delay", "info");
    print("Ej: variable.crear x | loop.blink | archivo.crear test", "info");
    return;
  }

  // ===== CLEAR =====
  if(cmd === "$clear"){ terminal.innerHTML=""; return; }

  // ===== HISTORIAL =====
  if(cmd === "$historial"){
    Object.entries(state.stats).forEach(([k,v])=> print(`${k} -> ${v}`));
    return;
  }

  // ===== VARIABLES =====
  if(cmd.startsWith("$variable.crear ")){
    const n = cmd.split(" ")[1];
    if(state.variables[n] !== undefined){ print("ya existe","error"); return; }
    state.variables[n] = 0;
    print(`variable ${n} creada`);
    save(); return;
  }

  if(cmd.startsWith("$variable.edit ")){
    const [, n, ...rest] = cmd.split(" ");
    if(state.variables[n] === undefined){ print("no existe","error"); return; }
    try{
      const v = evalExp(rest.join(" "));
      state.variables[n] = v;
      print(`${n} = ${v}`);
      save();
    }catch(e){ print(e.message,"error"); }
    return;
  }

  if(cmd.startsWith("$variable.leer ")){
    const n = cmd.split(" ")[1];
    print(state.variables[n] ?? "undefined");
    return;
  }

  if(cmd.startsWith("$delet.variable ")){
    const n = cmd.split(" ")[1];
    delete state.variables[n];
    print("variable eliminada");
    save(); return;
  }

  // ===== PINES (simulado) =====
  if(cmd.startsWith("$crear.pin.")){
    const [, type, pin] = cmd.match(/\$crear\.pin\.(entrada|salida)\s+(\d+)/) || [];
    if(!pin){ print("sintaxis: crear.pin.(entrada|salida) pin","error"); return; }
    state.pins[pin] = {type, value:0};
    print(`pin ${pin} ${type}`);
    save(); return;
  }

  if(cmd.startsWith("$escribir.pin ")){
    const [, pin, val] = cmd.match(/\$escribir\.pin\s+(\d+)\s+(\d+)/) || [];
    if(!state.pins[pin]){ print("pin no existe","error"); return; }
    state.pins[pin].value = parseInt(val);
    print(`pin ${pin} = ${val}`);
    return;
  }

  if(cmd.startsWith("$leer.pin ")){
    const pin = cmd.split(" ")[1];
    print(state.pins[pin]?.value ?? "null");
    return;
  }

  // ===== ARCHIVOS =====
  if(cmd.startsWith("$archivo.crear ")){
    const n = cmd.split(" ")[1];
    if(state.files[n]){ print("ya existe","error"); return; }
    state.files[n] = {type:"text", lines:[]};
    print("archivo creado");
    save(); return;
  }

  if(cmd.startsWith("$archivo.abrir ")){
    const n = cmd.split(" ")[1];
    if(!state.files[n]){ print("no existe","error"); return; }
    activeEditor = {name:n};
    renderEditor();
    return;
  }

  if(cmd.startsWith("$delet.archivo ")){
    const n = cmd.split(" ")[1];
    delete state.files[n];
    print("archivo eliminado");
    save(); return;
  }

  // ===== LOOPS =====
  if(cmd.startsWith("$loop.") && !cmd.includes(" ")){
    const name = cmd.replace("$loop.","");
    buildingLoop = {name, body:[]};
    print(`modo loop: ${name} (usa $loop.final para guardar)`);
    return;
  }

  if(cmd === "$loop.final"){
    if(!buildingLoop){ print("no hay loop","error"); return; }
    state.loops[buildingLoop.name] = {body: buildingLoop.body.slice(), running:false, logs:[]};
    state.files[buildingLoop.name] = {type:"loop", lines: buildingLoop.body.slice()};
    print("loop guardado");
    buildingLoop = null;
    save(); return;
  }

  if(buildingLoop){
    buildingLoop.body.push(cmd);
    return;
  }

  if(cmd.startsWith("$loop.init ")){
    const n = cmd.split(" ")[1];
    if(!state.loops[n]){ print("no existe","error"); return; }
    startLoop(n);
    return;
  }

  if(cmd.startsWith("$loop.stop ")){
    const n = cmd.split(" ")[1];
    if(runningLoops[n]) runningLoops[n].stop = true;
    if(state.loops[n]) state.loops[n].running = false;
    print("loop detenido");
    save(); return;
  }

  if(cmd === "$loop.sleep"){
    Object.keys(runningLoops).forEach(n => runningLoops[n].stop = true);
    Object.values(state.loops).forEach(l => l.running=false);
    print("loops pausados");
    save(); return;
  }

  // ===== DELAY =====
  if(cmd.startsWith("$delay ")){
    const t = parseInt(cmd.split(" ")[1]);
    await new Promise(r=>setTimeout(r, isNaN(t)?0:t));
    return;
  }

  // ===== IF (SOLO EN LOOP) =====
  if(cmd.startsWith("$if ") && buildingLoop){
    const cond = cmd.replace("$if ","");
    buildingIf = {cond, then:[], else:[], mode:"then"};
    print("if: escribe then/else y termina con $if.final");
    return;
  }

  if(cmd === "$else" && buildingIf){ buildingIf.mode="else"; return; }

  if(cmd === "$if.final" && buildingIf){
    buildingLoop.body.push({type:"if", cond: buildingIf.cond, then: buildingIf.then, else: buildingIf.else});
    buildingIf = null;
    print("if guardado");
    return;
  }

  if(buildingIf){
    if(buildingIf.mode==="then") buildingIf.then.push(cmd);
    else buildingIf.else.push(cmd);
    return;
  }

  print("comando no reconocido","error");
}

// ===== LOOP RUNNER =====
function startLoop(name){
  const loop = state.loops[name];
  if(!loop){ print("loop no existe","error"); return; }
  if(loop.running){ print("ya está corriendo"); return; }

  loop.running = true;
  runningLoops[name] = {stop:false};
  save();

  (async function run(){
    while(!runningLoops[name].stop){
      for(const step of loop.body){
        if(runningLoops[name].stop) break;
        await ejecutarPaso(step, name);
      }
    }
    loop.running = false;
    save();
  })();

  print(`loop ${name} iniciado`);
}

async function ejecutarPaso(step, loopName){
  if(typeof step === "object" && step.type === "if"){
    let ok = false;
    try{ ok = !!evalExp(step.cond); }catch(e){ logLoop(loopName, e.message); }
    const arr = ok ? step.then : step.else;
    for(const s of arr){
      await ejecutarPaso(s, loopName);
    }
    return;
  }

  // delay inline
  if(step.startsWith("$delay ")){
    const t = parseInt(step.split(" ")[1]);
    await new Promise(r=>setTimeout(r, isNaN(t)?0:t));
    logLoop(loopName, `delay ${t}`);
    return;
  }

  // escribir pin
  if(step.startsWith("$escribir.pin ")){
    const [, pin, val] = step.match(/\$escribir\.pin\s+(\d+)\s+(\d+)/) || [];
    if(state.pins[pin]){
      state.pins[pin].value = parseInt(val);
      logLoop(loopName, `pin ${pin}=${val}`);
    }else{
      logLoop(loopName, `error pin ${pin}`);
    }
    return;
  }

  // variable edit dentro de loop
  if(step.startsWith("$variable.edit ")){
    const [, n, ...rest] = step.split(" ");
    try{
      const v = evalExp(rest.join(" "));
      state.variables[n] = v;
      logLoop(loopName, `${n}=${v}`);
      save();
    }catch(e){ logLoop(loopName, e.message); }
    return;
  }

  // fallback: ejecutar normal (no bloqueante)
  await ejecutar(step);
}

// ===== EDITOR RENDER =====
function renderEditor(){
  const f = state.files[activeEditor.name];
  print(`--- editor: ${activeEditor.name} ---`,"info");
  f.lines.forEach((l,i)=> print(`${i}: ${l}`,"info"));
}

// ===== PANEL =====
panelBtn.onclick = ()=>{
  panel.classList.remove("hidden");
  renderPanel();
};

closePanel.onclick = ()=> panel.classList.add("hidden");

function renderPanel(){
  const loopsView = Object.entries(state.loops).map(([n,l])=>{
    const logs = (l.logs||[]).slice(-10).join("\n");
    return `<div>
      <b>${n}</b> [${l.running?"RUN":"STOP"}]
      <button onclick="__startLoop('${n}')">▶</button>
      <button onclick="__stopLoop('${n}')">⏸</button>
      <pre>${logs}</pre>
    </div>`;
  }).join("");

  panelContent.innerHTML = `
    <h4>Pins</h4><pre>${JSON.stringify(state.pins,null,2)}</pre>
    <h4>Variables</h4><pre>${JSON.stringify(state.variables,null,2)}</pre>
    <h4>Loops</h4>${loopsView}
    <h4>Archivos</h4><pre>${JSON.stringify(state.files,null,2)}</pre>
  `;
}

// hooks globales para botones
window.__startLoop = (n)=> startLoop(n);
window.__stopLoop  = (n)=> {
  if(runningLoops[n]) runningLoops[n].stop = true;
  if(state.loops[n]) state.loops[n].running=false;
  save();
  renderPanel();
};