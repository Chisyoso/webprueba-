/* timbitoOS v4 - modular listo para GitHub Pages */
(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const escHtml = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const UI = {
    out: $("#output"),
    inp: $("#cmd-input"),
    varList: $("#var-list-ui"),
    pinGrid: $("#pin-grid-ui"),
    loopList: $("#loop-list-ui"),
    dbg: $("#debug-content"),
    espDot: $("#esp-dot"),
    espLabel: $("#esp-label"),
    btnConnect: $("#btn-connect"),
    statIp: $("#stat-ip"),
    statPort: $("#stat-port"),
    statStatus: $("#stat-status"),
    statPing: $("#stat-ping"),
    statCmds: $("#stat-cmds"),
    espHostInput: $("#esp-host-input"),
    espPortInput: $("#esp-port-input"),
    espPresets: $("#esp-presets"),
    modalPreset: $("#modal-preset"),
    modalHost: $("#modal-host"),
    modalPort: $("#modal-port"),
    connectModal: $("#connect-modal"),
    editorOverlay: $("#editor-overlay"),
    editorName: $("#editor-fname"),
    editorArea: $("#editor-area"),
    editorBar: $("#editor-bar"),
    debugOverlay: $("#debug-overlay"),
    debugClose: $("#debug-close"),
    editorRun: $("#editor-run"),
    editorSave: $("#editor-save"),
    editorClose: $("#editor-close"),
    btnShowSketch: $("#btn-show-sketch"),
    btnConnectManual: $("#btn-connect-manual"),
    btnDisconnect: $("#btn-disconnect"),
    btnUsePreset: $("#btn-use-preset"),
    btnSavePreset: $("#btn-save-preset"),
    btnDelPreset: $("#btn-del-preset"),
    modalCancel: $("#modal-cancel"),
    modalConnect: $("#modal-connect"),
  };

  const STORAGE_KEY = "timbitoos.esp.presets.v1";
  const STATE = {
    vars: {},
    pins: {},
    loops: {},
    funcs: {},
    files: {},
    esp: {
      address: "",
      port: 80,
      connected: false,
      ping: null,
      cmdsSent: 0,
    },
    debug: false,
    history: [],
    histIdx: -1,
    currentFile: null,
    sketchVisible: false,
  };

  const log = (msg, cls = "l-ok") => {
    const d = document.createElement("div");
    d.className = cls;
    if (cls === "l-cmd") {
      d.innerHTML = '<span style="color:var(--dim)">❯ </span><span class="hl">' + escHtml(msg) + "</span>";
    } else {
      d.textContent = msg;
    }
    UI.out.appendChild(d);
    UI.out.scrollTop = UI.out.scrollHeight;
  };
  const logErr = m => log("✗ " + m, "l-err");
  const logWarn = m => log("⚠ " + m, "l-warn");
  const logInfo = m => log("ℹ " + m, "l-info");
  const logPrint = m => log(m, "l-print");
  const logSys = m => log(m, "l-sys");
  const logEsp = m => log("📡 " + m, "l-esp");

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const loadPresets = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(arr) ? arr.filter(x => x && x.address) : [];
    } catch {
      return [];
    }
  };
  const savePresets = presets => localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.slice(0, 20)));

  let presets = loadPresets();

  function normalizeAddress(address) {
    return String(address || "").trim();
  }

  function presetLabel(p) {
    return p.name ? `${p.name} — ${p.address}:${p.port || 80}` : `${p.address}:${p.port || 80}`;
  }

  function renderPresets() {
    const options = [
      `<option value="">— elegir —</option>`,
      ...presets.map((p, i) => `<option value="${i}">${escHtml(presetLabel(p))}</option>`)
    ].join("");
    UI.espPresets.innerHTML = options;
    UI.modalPreset.innerHTML = options;
  }

  function getCurrentPresetIndex() {
    const idx = parseInt(UI.espPresets.value, 10);
    return Number.isFinite(idx) ? idx : -1;
  }

  function setManualFields(address = "", port = 80) {
    UI.espHostInput.value = address;
    UI.espPortInput.value = String(port || 80);
    UI.modalHost.value = address;
    UI.modalPort.value = String(port || 80);
  }

  function syncModalFromManual() {
    UI.modalHost.value = UI.espHostInput.value.trim();
    UI.modalPort.value = UI.espPortInput.value || "80";
  }

  function syncManualFromModal() {
    UI.espHostInput.value = UI.modalHost.value.trim();
    UI.espPortInput.value = UI.modalPort.value || "80";
  }

  function setConnectedUI(connected) {
    if (connected) {
      UI.espDot.className = "esp-dot connected";
      UI.espLabel.textContent = STATE.esp.address || "CONECTADO";
      UI.espLabel.className = "ok";
      UI.btnConnect.textContent = "Desconectar";
      UI.btnConnect.className = "connected";
    } else {
      UI.espDot.className = "esp-dot";
      UI.espLabel.textContent = "SIN CONEXIÓN";
      UI.espLabel.className = "";
      UI.btnConnect.textContent = "WiFi ESP32";
      UI.btnConnect.className = "";
    }
  }

  function updateEspUI() {
    UI.statIp.textContent = STATE.esp.address || "—";
    UI.statPort.textContent = STATE.esp.port || 80;
    UI.statStatus.textContent = STATE.esp.connected ? "Conectado" : "Desconectado";
    UI.statStatus.className = "esp-stat-val " + (STATE.esp.connected ? "ok" : "err");
    UI.statPing.textContent = STATE.esp.ping != null ? `${STATE.esp.ping} ms` : "—";
    UI.statCmds.textContent = STATE.esp.cmdsSent;
    setConnectedUI(STATE.esp.connected);
  }

  function updateUI() {
    const vars = Object.entries(STATE.vars);
    UI.varList.innerHTML = vars.length
      ? vars.map(([name, v]) => `
          <div class="var-card">
            <div class="var-type-badge">${escHtml(String(v.type || "number").toUpperCase())}</div>
            <div class="var-info">
              <div class="var-name">${escHtml(name)}</div>
              <div class="var-val">${escHtml(String(v.value))}</div>
            </div>
            <div class="var-del" data-del-var="${escHtml(name)}">🗑</div>
          </div>`).join("")
      : `<div class="empty-state"><div class="empty-icon">📦</div><div>Sin variables</div></div>`;
    $("#var-count-lbl").textContent = String(vars.length);

    const pins = Object.entries(STATE.pins);
    UI.pinGrid.innerHTML = pins.length
      ? pins.map(([num, p]) => `
          <div class="pin-card ${Number(p.value) > 0 ? "on" : ""}" data-toggle-pin="${escHtml(num)}">
            <div class="pin-led"></div>
            <div class="pin-num">PIN ${escHtml(num)}</div>
            <div class="pin-mode-badge">${escHtml(p.mode || "OUTPUT")}</div>
            <div class="pin-val">${escHtml(String(p.value ?? 0))}</div>
          </div>`).join("")
      : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔌</div><div>Sin pines</div></div>`;
    $("#pin-count-lbl").textContent = String(pins.length);

    const loops = Object.entries(STATE.loops);
    UI.loopList.innerHTML = loops.length
      ? loops.map(([name, lp]) => `
          <div class="loop-card ${lp.running ? "running" : ""}">
            <div class="loop-header">
              <div class="loop-indicator"></div>
              <div class="loop-name">${escHtml(name)}</div>
              <div class="loop-lines">${lp.rawLines ? lp.rawLines.length : 0} líneas</div>
              <div class="loop-actions">
                ${lp.running
                  ? `<button class="loop-btn-action stop" data-stop-loop="${escHtml(name)}">⏹</button>`
                  : `<button class="loop-btn-action run" data-run-loop="${escHtml(name)}">▶</button>`}
              </div>
            </div>
            ${lp.rawLines?.length ? `<div class="loop-body-preview">${lp.rawLines.slice(0, 4).map(l => `<div>${escHtml(l)}</div>`).join("")}${lp.rawLines.length > 4 ? `<div style="color:var(--dim2)">... +${lp.rawLines.length - 4} más</div>` : ""}</div>` : ""}
          </div>`).join("")
      : `<div class="empty-state"><div class="empty-icon">🔁</div><div>Sin loops definidos</div></div>`;
    $("#loop-count-lbl").textContent = String(loops.length);

    renderPresets();
    updateEspUI();
  }

  function dbg(info) {
    if (!STATE.debug) return;
    const d = document.createElement("div");
    d.className = "dbg-row";
    d.innerHTML = Object.entries(info).map(([k, v]) => {
      const cls = k === "cond" ? (v ? "dbg-cond-t" : "dbg-cond-f") : (k === "linea" ? "dbg-k" : "dbg-v");
      return `<span class="dbg-k">[${escHtml(k)}]</span> <span class="${cls}">${escHtml(String(v))}</span>`;
    }).join("  ");
    UI.dbg.appendChild(d);
    UI.dbg.scrollTop = UI.dbg.scrollHeight;
  }

  function openDebug() { UI.debugOverlay.classList.add("open"); }
  function closeDebug() { UI.debugOverlay.classList.remove("open"); }

  function openConnectModal() {
    syncModalFromManual();
    UI.connectModal.classList.add("open");
    setTimeout(() => UI.modalHost.focus(), 100);
  }
  function closeConnectModal() { UI.connectModal.classList.remove("open"); }

  async function fetchWithTimeout(url, opts = {}, ms = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...opts, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  async function espSend(nativeCmd) {
    if (!STATE.esp.connected || !STATE.esp.address) {
      logWarn("ESP32 no conectado. Simulando localmente.");
      return null;
    }
    const url = `http://${STATE.esp.address}:${STATE.esp.port}/cmd?c=${encodeURIComponent(nativeCmd)}`;
    const t0 = Date.now();
    try {
      const r = await fetchWithTimeout(url, { method: "GET" }, 3000);
      STATE.esp.ping = Date.now() - t0;
      STATE.esp.cmdsSent++;
      updateEspUI();
      return await r.json();
    } catch (e) {
      STATE.esp.ping = null;
      logEsp("Error: " + e.message);
      updateEspUI();
      return null;
    }
  }

  async function doConnect(address, port) {
    address = normalizeAddress(address);
    port = parseInt(port, 10) || 80;
    if (!address) return logErr("Ingresa la dirección del ESP32");

    STATE.esp.address = address;
    STATE.esp.port = port;
    UI.espDot.className = "esp-dot connecting";
    UI.espLabel.textContent = "Conectando...";
    UI.espLabel.className = "";
    logInfo(`Conectando a ${address}:${port}...`);

    try {
      const t0 = Date.now();
      await fetchWithTimeout(`http://${address}:${port}/ping`, {}, 3500);
      STATE.esp.ping = Date.now() - t0;
      STATE.esp.connected = true;
      logEsp(`Conectado! Latencia: ${STATE.esp.ping}ms`);
    } catch (e) {
      try {
        const t0 = Date.now();
        await fetchWithTimeout(`http://${address}:${port}/cmd?c=ping`, {}, 3000);
        STATE.esp.ping = Date.now() - t0;
        STATE.esp.connected = true;
        logEsp(`Conectado! Latencia: ${STATE.esp.ping}ms`);
      } catch (e2) {
        STATE.esp.connected = false;
        logErr(`No se pudo conectar a ${address}:${port} — ${e2.message}`);
        logWarn("Modo local activo.");
      }
    }
    updateUI();
    closeConnectModal();
  }

  function espDisconnect() {
    STATE.esp.connected = false;
    STATE.esp.ping = null;
    logWarn("ESP32 desconectado.");
    updateUI();
  }

  function parseTimbito(raw) {
    const s = String(raw).trim();
    if (!s.startsWith("$")) return null;
    const pi = s.indexOf("(");
    if (pi === -1) return { name: s.slice(1), args: [] };
    const name = s.slice(1, pi).trim();
    let depth = 0, end = -1;
    for (let i = pi; i < s.length; i++) {
      if (s[i] === "(") depth++;
      if (s[i] === ")") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const inner = end > -1 ? s.slice(pi + 1, end) : s.slice(pi + 1);
    return { name, args: splitArgs(inner) };
  }

  function splitArgs(s) {
    const args = [];
    let cur = "", depth = 0, inQ = false, qChar = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQ) {
        cur += c;
        if (c === qChar) inQ = false;
        continue;
      }
      if (c === '"' || c === "'") { inQ = true; qChar = c; cur += c; continue; }
      if (c === "(") { depth++; cur += c; continue; }
      if (c === ")") { depth--; cur += c; continue; }
      if (c === "," && depth === 0) { args.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    if (cur.trim()) args.push(cur.trim());
    return args;
  }

  function resolveArg(a) {
    const s = String(a).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
    if (s.startsWith("$")) {
      const p = parseTimbito(s);
      if (p && (p.name === "variable.leer" || p.name === "var.leer")) {
        const v = STATE.vars[p.args[0]];
        return v ? v.value : 0;
      }
    }
    if (/[+\-*/%]/.test(s)) {
      try {
        const expr = s.replace(/\$variable\.leer\((\w+)\)/g, (_, n) => {
          const v = STATE.vars[n];
          return v ? v.value : 0;
        });
        return Function('"use strict";return (' + expr + ")")();
      } catch {}
    }
    if (!isNaN(s) && s !== "") return Number(s);
    return s;
  }

  function evalCond(expr) {
    let s = String(expr);
    s = s.replace(/\$variable\.leer\((\w+)\)/g, (_, n) => {
      const v = STATE.vars[n];
      return v !== undefined ? v.value : 0;
    });
    try {
      return !!Function('"use strict";return (' + s + ")")();
    } catch {
      throw new Error("Condición inválida: " + expr);
    }
  }

  async function execCmd(raw, loopRef = null) {
    raw = String(raw).trim();
    if (!raw || raw.startsWith("//")) return;
    if (!raw.startsWith("$")) {
      logWarn("Usa $comando(args) — " + raw.slice(0, 30));
      return;
    }

    const p = parseTimbito(raw);
    if (!p) return logErr("Sintaxis inválida: " + raw);
    const { name, args } = p;
    dbg({ cmd: name, args: args.join(", ") });

    if (name === "variable.crear") {
      const vname = args[0], type = args[1] || "number";
      if (!vname) return logErr("$variable.crear(nombre)");
      if (STATE.vars[vname]) return logWarn(`Variable '${vname}' ya existe`);
      STATE.vars[vname] = { type, value: type === "string" ? "" : 0 };
      log(`✔ var ${vname} [${type}] creada`);
      updateUI(); return;
    }

    if (name === "variable.editar" || name === "variable.edit") {
      const vname = args[0];
      if (!vname) return logErr("$variable.editar(nombre, valor)");
      if (!STATE.vars[vname]) return logErr(`Variable '${vname}' no existe`);
      const raw2 = args.slice(1).join(",");
      STATE.vars[vname].value = resolveArg(raw2);
      updateUI(); return;
    }

    if (name === "variable.leer" || name === "var.leer") {
      const vname = args[0];
      if (!STATE.vars[vname]) return logErr(`Variable '${vname}' no existe`);
      logInfo(`${vname} = ${STATE.vars[vname].value}`);
      return;
    }

    if (name === "variable.borrar" || name === "variable.delete") {
      delete STATE.vars[args[0]];
      log(`✔ variable '${args[0]}' eliminada`);
      updateUI(); return;
    }

    if (name === "variables.listar") {
      const entries = Object.entries(STATE.vars);
      if (!entries.length) return logInfo("Sin variables");
      entries.forEach(([k, v]) => logInfo(`${k} [${v.type}] = ${v.value}`));
      return;
    }

    if (name === "pin.salida" || name === "pin.crear.salida") {
      const num = String(resolveArg(args[0]));
      STATE.pins[num] = { mode: "OUTPUT", value: 0 };
      log(`✔ pin ${num} [OUTPUT] creado`);
      await espSend(`PIN_OUT:${num}`);
      updateUI(); return;
    }

    if (name === "pin.entrada" || name === "pin.crear.entrada") {
      const num = String(resolveArg(args[0]));
      STATE.pins[num] = { mode: "INPUT", value: 0 };
      log(`✔ pin ${num} [INPUT] creado`);
      await espSend(`PIN_IN:${num}`);
      updateUI(); return;
    }

    if (name === "pin.escribir") {
      const num = String(resolveArg(args[0]));
      const val = resolveArg(args[1]);
      if (!STATE.pins[num]) STATE.pins[num] = { mode: "OUTPUT", value: 0 };
      STATE.pins[num].value = val;
      await espSend(`PIN_WRITE:${num}:${val}`);
      updateUI(); return;
    }

    if (name === "pin.leer") {
      const num = String(resolveArg(args[0]));
      const res = await espSend(`PIN_READ:${num}`);
      if (res && res.val !== undefined) {
        STATE.pins[num] = STATE.pins[num] || { mode: "INPUT", value: 0 };
        STATE.pins[num].value = res.val;
        logInfo(`pin ${num} = ${res.val}`);
      } else {
        const v = STATE.pins[num]?.value ?? 0;
        logInfo(`pin ${num} = ${v} (local)`);
      }
      updateUI(); return;
    }

    if (name === "loop.init") {
      const lname = args[0];
      if (!lname) return logErr("$loop.init(nombre)");
      startLoop(lname); return;
    }

    if (name === "loop.stop") {
      const lname = args[0];
      if (!lname) return logErr("$loop.stop(nombre)");
      stopLoop(lname); return;
    }

    if (name === "delay") {
      await wait(Number(resolveArg(args[0])) || 0); return;
    }

    if (name === "print") {
      logPrint("📤 " + args.map(a => resolveArg(a)).join(" "));
      return;
    }

    if (name === "archivo.crear") {
      const fname = args[0];
      if (!fname) return logErr("$archivo.crear(nombre)");
      STATE.files[fname] = STATE.files[fname] || { content: "" };
      log(`✔ archivo '${fname}' creado`);
      return;
    }

    if (name === "archivo.abrir") {
      const fname = args[0];
      if (!fname) return logErr("$archivo.abrir(nombre)");
      openEditor(fname); return;
    }

    if (name === "archivo.ejecutar") {
      const fname = args[0];
      const f = STATE.files[fname];
      if (!f) return logErr(`Archivo '${fname}' no existe`);
      log(`▶ ejecutando '${fname}'...`, "l-info");
      await runScript(f.content); return;
    }

    if (name === "archivo.borrar" || name === "archivo.delete") {
      delete STATE.files[args[0]];
      log("✔ archivo eliminado");
      return;
    }

    if (name === "func.llamar" || name === "func.call") {
      const fname = args[0];
      const fn = STATE.funcs[fname];
      if (!fn) return logErr(`Función '${fname}' no existe`);
      for (const s of fn) await execStep(s, loopRef);
      return;
    }

    if (name === "debug.on") { STATE.debug = true; logInfo("Debugger ON"); openDebug(); return; }
    if (name === "debug.off") { STATE.debug = false; logInfo("Debugger OFF"); return; }
    if (name === "debug.clear") { UI.dbg.innerHTML = ""; return; }

    if (name === "clear" || name === "cls") { UI.out.innerHTML = ""; return; }

    if (name === "reset") {
      Object.values(STATE.loops).forEach(l => l.running = false);
      Object.assign(STATE, { vars: {}, pins: {}, loops: {}, funcs: {}, files: {} });
      logWarn("Sistema reseteado.");
      updateUI(); return;
    }

    if (name === "help") { showHelp(); return; }

    if (name === "esp.send") {
      const cmdRaw = args[0];
      if (!cmdRaw) return logErr("$esp.send(comando)");
      const res = await espSend(cmdRaw);
      logEsp(res ? JSON.stringify(res) : "sin respuesta");
      return;
    }

    if (name === "esp.ping") {
      const t0 = Date.now();
      const res = await espSend("ping");
      logEsp(res ? `pong! ${Date.now() - t0}ms` : "sin respuesta");
      return;
    }

    logErr(`Comando desconocido: $${name}`);
  }

  async function execStep(step, loopRef = null) {
    if (loopRef && !loopRef.running) throw new Error("__STOPPED__");
    if (step.type === "cmd") {
      dbg({ linea: step.cmd });
      await execCmd(step.cmd, loopRef);
      return;
    }
    if (step.type === "if") {
      const cond = evalCond(step.cond);
      dbg({ if: step.cond, result: cond });
      const block = cond ? step.then : step.else;
      for (const s of block) await execStep(s, loopRef);
      return;
    }
    if (step.type === "while") {
      let n = 0;
      while (true) {
        if (loopRef && !loopRef.running) break;
        const cond = evalCond(step.cond);
        dbg({ while: step.cond, result: cond });
        if (!cond) break;
        for (const s of step.body) await execStep(s, loopRef);
        if (++n > 100000) { logErr("while: demasiadas iteraciones"); break; }
      }
    }
  }

  function parseScript(code) {
    const lines = String(code).split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("//"));
    let idx = 0;
    function parseBlock(stopWhen) {
      const body = [];
      while (idx < lines.length) {
        const line = lines[idx];
        if (stopWhen && stopWhen(line)) break;

        if (line.startsWith("$if(") || line.startsWith("$if (")) {
          const cond = extractInner(line);
          idx++;
          const thenB = parseBlock(l => l === "$else" || l === "$if.final" || l === "$endif");
          let elseB = [];
          if (idx < lines.length && (lines[idx] === "$else" || lines[idx].startsWith("$else("))) {
            idx++;
            elseB = parseBlock(l => l === "$if.final" || l === "$endif");
          }
          if (idx < lines.length) idx++;
          body.push({ type: "if", cond, then: thenB, else: elseB });
          continue;
        }

        if (line.startsWith("$while(")) {
          const cond = extractInner(line);
          idx++;
          const wb = parseBlock(l => l === "$endwhile" || l === "$while.final");
          if (idx < lines.length) idx++;
          body.push({ type: "while", cond, body: wb });
          continue;
        }

        body.push({ type: "cmd", cmd: line });
        idx++;
      }
      return body;
    }
    return parseBlock(null);
  }

  function extractInner(line) {
    const pi = line.indexOf("(");
    const pe = line.lastIndexOf(")");
    if (pi < 0) return "";
    return pe > pi ? line.slice(pi + 1, pe) : line.slice(pi + 1);
  }

  async function runScript(code) {
    const lines = String(code).split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("//"));
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      const loopDefMatch = line.match(/^\$loop\.(\w+)\($/);
      if (loopDefMatch) {
        const lname = loopDefMatch[1];
        if (lname !== "init" && lname !== "stop" && lname !== "final") {
          i++;
          const rawLines = [];
          let depth = 0;
          while (i < lines.length) {
            const l = lines[i];
            if (l === ")" && depth === 0) { i++; break; }
            if (l.endsWith("(")) depth++;
            if (l === ")") depth--;
            rawLines.push(l);
            i++;
          }
          const ast = parseScript(rawLines.join("\n"));
          STATE.loops[lname] = { body: ast, rawLines, running: false };
          log(`✔ loop '${lname}' definido (${rawLines.length} líneas)`, "l-ok");
          updateUI();
          continue;
        }
      }

      const funcDefMatch = line.match(/^\$func\.(\w+)\($/);
      if (funcDefMatch) {
        const fname = funcDefMatch[1];
        if (fname !== "call" && fname !== "llamar") {
          i++;
          const funcLines = [];
          while (i < lines.length && lines[i] !== ")") {
            funcLines.push(lines[i]);
            i++;
          }
          if (i < lines.length) i++;
          STATE.funcs[fname] = parseScript(funcLines.join("\n"));
          log(`✔ función '${fname}' definida`, "l-ok");
          continue;
        }
      }

      if (line.startsWith("$if(")) {
        const blockLines = [line];
        i++;
        let depth = 0;
        while (i < lines.length) {
          const l = lines[i];
          if (l.startsWith("$if(")) depth++;
          if (l === "$if.final" || l === "$endif") {
            blockLines.push(l); i++;
            if (depth === 0) break;
            depth--;
            continue;
          }
          blockLines.push(l);
          i++;
        }
        const ast = parseScript(blockLines.join("\n"));
        for (const s of ast) await execStep(s, null);
        continue;
      }

      if (line.startsWith("$while(")) {
        const blockLines = [line];
        i++;
        while (i < lines.length && lines[i] !== "$endwhile" && lines[i] !== "$while.final") {
          blockLines.push(lines[i]);
          i++;
        }
        blockLines.push("$endwhile");
        if (i < lines.length) i++;
        const ast = parseScript(blockLines.join("\n"));
        for (const s of ast) await execStep(s, null);
        continue;
      }

      await execCmd(line, null);
      i++;
    }
    updateUI();
  }

  function startLoop(name) {
    const lp = STATE.loops[name];
    if (!lp) return logErr(`Loop '${name}' no definido. Ábrelo en el editor.`);
    if (lp.running) return logWarn(`Loop '${name}' ya corre`);
    lp.running = true;
    log(`▶ loop '${name}' iniciado`, "l-ok");
    updateUI();
    (async () => {
      try {
        while (lp.running) {
          for (const step of lp.body) {
            if (!lp.running) break;
            await execStep(step, lp);
          }
        }
      } catch (e) {
        if (e.message !== "__STOPPED__") logErr(`Loop '${name}': ${e.message}`);
      }
      lp.running = false;
      logWarn(`⏹ loop '${name}' parado`);
      updateUI();
    })();
  }

  function stopLoop(name) {
    if (!STATE.loops[name]) return logErr(`Loop '${name}' no existe`);
    STATE.loops[name].running = false;
    logWarn(`⏹ loop '${name}' detenido`);
    updateUI();
  }

  function togglePin(num) {
    if (!STATE.pins[num] || STATE.pins[num].mode !== "OUTPUT") return;
    const newVal = Number(STATE.pins[num].value) > 0 ? 0 : 1;
    execCmd(`$pin.escribir(${num}, ${newVal})`);
  }

  let currentFile = null;
  function openEditor(name) {
    if (!STATE.files[name]) STATE.files[name] = { content: "" };
    currentFile = name;
    STATE.currentFile = name;
    UI.editorName.textContent = `📄 ${name}`;
    UI.editorArea.value = STATE.files[name].content;
    UI.editorOverlay.classList.add("open");
    setTimeout(() => UI.editorArea.focus(), 100);
  }

  function editorSave() {
    if (!currentFile) return;
    STATE.files[currentFile].content = UI.editorArea.value;
    log(`✔ '${currentFile}' guardado`, "l-ok");
    UI.editorBar.textContent = "✔ Guardado — " + new Date().toLocaleTimeString();
    updateUI();
  }

  async function editorRun() {
    if (!currentFile) return;
    STATE.files[currentFile].content = UI.editorArea.value;
    editorClose();
    log(`▶ ejecutando '${currentFile}'...`, "l-info");
    await runScript(STATE.files[currentFile].content);
  }

  function editorClose() {
    UI.editorOverlay.classList.remove("open");
    UI.inp.focus();
  }

  function showHelp() {
    const cmds = [
      ["$variable.crear(nombre)", "crear variable"],
      ["$variable.crear(nombre, string)", "crear variable string"],
      ["$variable.editar(nombre, valor)", "asignar valor"],
      ["$variable.leer(nombre)", "leer variable"],
      ["$variable.borrar(nombre)", "eliminar variable"],
      ["$variables.listar()", "listar todas"],
      ["$pin.salida(num)", "crear pin OUTPUT"],
      ["$pin.entrada(num)", "crear pin INPUT"],
      ["$pin.escribir(num, val)", "escribir pin → ESP32"],
      ["$pin.leer(num)", "leer pin ← ESP32"],
      ["$loop.nombre(", "...cuerpo... ) definir loop"],
      ["$loop.init(nombre)", "iniciar loop"],
      ["$loop.stop(nombre)", "detener loop"],
      ["$archivo.crear(nombre)", "crear archivo"],
      ["$archivo.abrir(nombre)", "abrir editor"],
      ["$archivo.ejecutar(nombre)", "ejecutar script"],
      ["$func.nombre(", "...cuerpo... ) definir función"],
      ["$func.llamar(nombre)", "llamar función"],
      ["$if(condicion)", "... $if.final"],
      ["$while(condicion)", "... $endwhile"],
      ["$delay(ms)", "esperar ms"],
      ["$print(valor)", "imprimir"],
      ["$esp.ping()", "ping al ESP32"],
      ["$esp.send(cmd)", "enviar cmd nativo"],
      ["$debug.on() / $debug.off()", "debugger"],
      ["$clear()", "limpiar terminal"],
      ["$reset()", "resetear todo"],
    ];
    log("── COMANDOS timbitoOS v4 ──", "l-info");
    cmds.forEach(([c, d]) => log(`  ${c.padEnd(35)} ${d}`, "l-sys"));
  }

  function showSketch() {
    const sketch = `// timbitoOS v4 — ESP32 Sketch
#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASS";

WebServer server(80);

static void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void sendJson(const String& json) {
  cors();
  server.send(200, "application/json", json);
}

String handleCmd(String cmd) {
  if (cmd == "ping") return "{\\"ok\\":true,\\"pong\\":true}";
  if (cmd.startsWith("PIN_OUT:")) {
    int pin = cmd.substring(8).toInt();
    pinMode(pin, OUTPUT);
    return "{\\"ok\\":true}";
  }
  if (cmd.startsWith("PIN_IN:")) {
    int pin = cmd.substring(7).toInt();
    pinMode(pin, INPUT);
    return "{\\"ok\\":true}";
  }
  if (cmd.startsWith("PIN_WRITE:")) {
    int p1 = cmd.indexOf(':', 10);
    int pin = cmd.substring(10, p1).toInt();
    int val = cmd.substring(p1 + 1).toInt();
    digitalWrite(pin, val);
    return "{\\"ok\\":true,\\"pin\\":" + String(pin) + ",\\"val\\":" + String(val) + "}";
  }
  if (cmd.startsWith("PIN_READ:")) {
    int pin = cmd.substring(9).toInt();
    int val = digitalRead(pin);
    return "{\\"ok\\":true,\\"val\\":" + String(val) + "}";
  }
  return "{\\"ok\\":false,\\"err\\":\\"unknown\\"}";
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(400);
  Serial.println(WiFi.localIP());

  server.on("/ping", HTTP_GET, []() {
    sendJson("{\\"ok\\":true,\\"pong\\":true}");
  });

  server.on("/cmd", HTTP_OPTIONS, []() {
    cors();
    server.send(204);
  });

  server.on("/cmd", HTTP_GET, []() {
    String c = server.arg("c");
    sendJson(handleCmd(c));
  });

  server.begin();
}

void loop() {
  server.handleClient();
}`;
    STATE.files["esp32_sketch.ino"] = { content: sketch };
    openEditor("esp32_sketch.ino");
    log("✔ Sketch cargado.", "l-ok");
  }

  async function sendCmd() {
    const raw = UI.inp.value.trim();
    if (!raw) return;
    STATE.history.unshift(raw);
    STATE.histIdx = -1;
    UI.inp.value = "";
    log(raw, "l-cmd");
    await runScript(raw);
    updateUI();
  }

  function fillCmd(cmd) {
    UI.inp.value = cmd;
    UI.inp.focus();
    const pi = cmd.indexOf("(");
    if (pi > -1) setTimeout(() => UI.inp.setSelectionRange(pi + 1, cmd.indexOf(")") < 0 ? cmd.length : cmd.indexOf(")")), 0);
  }

  function savePresetFromCurrent() {
    const address = normalizeAddress(UI.espHostInput.value);
    const port = parseInt(UI.espPortInput.value, 10) || 80;
    if (!address) return logErr("Escribe una dirección primero");
    const name = prompt("Nombre del preset:", address) || "";
    if (!name.trim()) return;
    presets = presets.filter(p => !(p.address === address && Number(p.port || 80) === port));
    presets.unshift({ name: name.trim(), address, port });
    savePresets(presets);
    renderPresets();
    updateUI();
    log(`✔ preset guardado: ${name.trim()}`);
  }

  function deleteSelectedPreset() {
    const idx = getCurrentPresetIndex();
    if (idx < 0) return;
    presets.splice(idx, 1);
    savePresets(presets);
    renderPresets();
    updateUI();
    log("✔ preset eliminado");
  }

  function useSelectedPreset() {
    const idx = getCurrentPresetIndex();
    if (idx < 0 || !presets[idx]) return;
    const p = presets[idx];
    setManualFields(p.address, p.port);
    logInfo(`Preset listo: ${presetLabel(p)}`);
  }

  function connectFromManual() {
    doConnect(UI.espHostInput.value.trim(), UI.espPortInput.value);
  }

  function connectFromModal() {
    syncManualFromModal();
    doConnect(UI.modalHost.value.trim(), UI.modalPort.value);
  }

  function bindEvents() {
    $$("button.tab").forEach(t => t.addEventListener("click", () => {
      $$("button.tab").forEach(x => x.classList.remove("active"));
      $$(".view").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      $("#" + t.dataset.view).classList.add("active");
    }));

    $("#tabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (!tab) return;
    });

    UI.out.addEventListener("click", e => {
      const del = e.target.closest("[data-del-var]");
      if (del) {
        execCmd(`$variable.borrar(${del.dataset.delVar})`);
      }
    });

    UI.pinGrid.addEventListener("click", e => {
      const card = e.target.closest("[data-toggle-pin]");
      if (card) togglePin(card.dataset.togglePin);
    });

    UI.loopList.addEventListener("click", e => {
      const run = e.target.closest("[data-run-loop]");
      const stop = e.target.closest("[data-stop-loop]");
      if (run) startLoop(run.dataset.runLoop);
      if (stop) stopLoop(stop.dataset.stopLoop);
    });

    $("#quick-cmds").addEventListener("click", e => {
      const btn = e.target.closest("[data-fill]");
      if (btn) fillCmd(btn.dataset.fill);
    });

    $("#btn-send").addEventListener("click", sendCmd);
    UI.inp.addEventListener("keydown", async e => {
      if (e.key === "Enter") { e.preventDefault(); await sendCmd(); return; }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (STATE.histIdx < STATE.history.length - 1) { STATE.histIdx++; UI.inp.value = STATE.history[STATE.histIdx]; }
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (STATE.histIdx > 0) { STATE.histIdx--; UI.inp.value = STATE.history[STATE.histIdx]; }
        else { STATE.histIdx = -1; UI.inp.value = ""; }
      }
    });

    UI.editorArea.addEventListener("keydown", e => {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); editorSave(); }
      if (e.key === "Tab") {
        e.preventDefault();
        const t = e.target, s = t.selectionStart, en = t.selectionEnd;
        t.value = t.value.slice(0, s) + "  " + t.value.slice(en);
        t.selectionStart = t.selectionEnd = s + 2;
      }
    });

    UI.editorRun.addEventListener("click", editorRun);
    UI.editorSave.addEventListener("click", editorSave);
    UI.editorClose.addEventListener("click", editorClose);
    UI.editorOverlay.addEventListener("click", e => { if (e.target === UI.editorOverlay) editorClose(); });

    UI.debugClose.addEventListener("click", closeDebug);

    $("#btn-connect").addEventListener("click", () => {
      if (STATE.esp.connected) espDisconnect();
      else openConnectModal();
    });
    $("[data-open-connect]").addEventListener("click", openConnectModal);

    UI.btnConnectManual.addEventListener("click", connectFromManual);
    UI.btnDisconnect.addEventListener("click", espDisconnect);
    UI.btnUsePreset.addEventListener("click", useSelectedPreset);
    UI.btnSavePreset.addEventListener("click", savePresetFromCurrent);
    UI.btnDelPreset.addEventListener("click", deleteSelectedPreset);
    UI.btnShowSketch.addEventListener("click", showSketch);
    UI.modalCancel.addEventListener("click", closeConnectModal);
    UI.modalConnect.addEventListener("click", connectFromModal);

    UI.modalPreset.addEventListener("change", () => {
      const idx = getCurrentPresetIndex();
      if (idx >= 0 && presets[idx]) {
        UI.modalHost.value = presets[idx].address;
        UI.modalPort.value = presets[idx].port || 80;
      }
    });
    UI.espPresets.addEventListener("change", () => {
      const idx = getCurrentPresetIndex();
      if (idx >= 0 && presets[idx]) {
        setManualFields(presets[idx].address, presets[idx].port || 80);
      }
    });
  }

  function boot() {
    bindEvents();
    renderPresets();
    const first = presets[0];
    if (first) setManualFields(first.address, first.port || 80);

    logSys("timbitoOS v4 arrancando...");
    setTimeout(() => logSys("Parser ✔  Runtime ✔  ESP32 bridge ✔"), 100);
    setTimeout(() => {
      log("Sistema listo.", "l-ok");
      logSys("Escribe $help() para ver todos los comandos.");
      logSys("Ejemplo rápido:");
      logSys("  $variable.crear(x)");
      logSys("  $variable.editar(x, 0)");
      logSys("  $pin.salida(2)");
      logSys("  $pin.escribir(2, 1)");
      updateUI();
      UI.inp.focus();
    }, 200);
  }

  window.openConnectModal = openConnectModal;
  window.closeConnectModal = closeConnectModal;
  window.espConnect = () => doConnect(UI.espHostInput.value.trim(), UI.espPortInput.value);
  window.espDisconnect = espDisconnect;
  window.sendCmd = sendCmd;
  window.fillCmd = fillCmd;
  window.editorSave = editorSave;
  window.editorRun = editorRun;
  window.editorClose = editorClose;
  window.openEditor = openEditor;
  window.showSketch = showSketch;
  window.closeDebug = closeDebug;
  window.execCmd = execCmd;

  boot();
})();
