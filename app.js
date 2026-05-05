(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const cssEscape = s => window.CSS && CSS.escape ? CSS.escape(String(s)) : String(s).replace(/["\\]/g, '\\$&');

  const STORAGE_KEY = 'timbitoos.v5.state';
  const PRESET_KEY = 'timbitoos.v5.presets';

  const UI = {
    out: $('#output'),
    inp: $('#cmd-input'),
    varList: $('#var-list-ui'),
    pinGrid: $('#pin-grid-ui'),
    loopList: $('#loop-list-ui'),
    espDot: $('#esp-dot'),
    espLabel: $('#esp-label'),
    btnConnect: $('#btn-connect'),
    statIp: $('#stat-ip'),
    statPort: $('#stat-port'),
    statStatus: $('#stat-status'),
    statPing: $('#stat-ping'),
    statCmds: $('#stat-cmds'),
    espHostInput: $('#esp-host-input'),
    espPortInput: $('#esp-port-input'),
    espPresets: $('#esp-presets'),
    modalPreset: $('#modal-preset'),
    modalHost: $('#modal-host'),
    modalPort: $('#modal-port'),
    connectModal: $('#connect-modal'),
    editorOverlay: $('#editor-overlay'),
    editorName: $('#editor-fname'),
    editorArea: $('#editor-area'),
    editorBar: $('#editor-bar'),
    debugOverlay: $('#debug-overlay'),
    debugClose: $('#debug-close'),
    editorRun: $('#editor-run'),
    editorSave: $('#editor-save'),
    editorClose: $('#editor-close'),
    btnShowSketch: $('#btn-show-sketch'),
    btnConnectManual: $('#btn-connect-manual'),
    btnDisconnect: $('#btn-disconnect'),
    btnUsePreset: $('#btn-use-preset'),
    btnSavePreset: $('#btn-save-preset'),
    btnDelPreset: $('#btn-del-preset'),
    modalCancel: $('#modal-cancel'),
    modalConnect: $('#modal-connect'),
    btnAddLoop: $('#btn-add-loop'),
    dbg: $('#debug-content'),
  };

  const STATE = {
    vars: {},
    pins: {},
    loops: {},
    funcs: {},
    files: {},
    presets: [],
    esp: { address: '', port: 80, connected: false, ping: null, cmdsSent: 0 },
    debug: false,
    history: [],
    histIdx: -1,
    currentFile: null,
    activeLoop: null,
  };

  const log = (msg, cls = 'l-ok') => {
    if (!UI.out) return;
    const d = document.createElement('div');
    d.className = cls;
    if (cls === 'l-cmd') d.innerHTML = '<span style="color:var(--dim)">❯ </span><span class="hl">' + escHtml(msg) + '</span>';
    else d.textContent = msg;
    UI.out.appendChild(d);
    UI.out.scrollTop = UI.out.scrollHeight;
  };
  const logErr = m => log('✗ ' + m, 'l-err');
  const logWarn = m => log('⚠ ' + m, 'l-warn');
  const logInfo = m => log('ℹ ' + m, 'l-info');
  const logPrint = m => log(m, 'l-print');
  const logSys = m => log(m, 'l-sys');
  const logEsp = m => log('📡 ' + m, 'l-esp');
  const dbg = info => {
    if (!STATE.debug || !UI.dbg) return;
    const d = document.createElement('div');
    d.className = 'dbg-row';
    d.innerHTML = Object.entries(info).map(([k, v]) => {
      const cls = k === 'cond' ? (v ? 'dbg-cond-t' : 'dbg-cond-f') : (k === 'linea' ? 'dbg-k' : 'dbg-v');
      return `<span class="dbg-k">[${escHtml(k)}]</span> <span class="${cls}">${escHtml(String(v))}</span>`;
    }).join(' ');
    UI.dbg.appendChild(d);
    UI.dbg.scrollTop = UI.dbg.scrollHeight;
  };

  function saveState() {
    try {
      const payload = {
        vars: STATE.vars,
        pins: STATE.pins,
        loops: STATE.loops,
        funcs: STATE.funcs,
        files: STATE.files,
        esp: STATE.esp,
        presets: STATE.presets,
        debug: STATE.debug,
        currentFile: STATE.currentFile,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.assign(STATE, {
        vars: data.vars || {},
        pins: data.pins || {},
        loops: data.loops || {},
        funcs: data.funcs || {},
        files: data.files || {},
        esp: Object.assign(STATE.esp, data.esp || {}),
        presets: Array.isArray(data.presets) ? data.presets : [],
        debug: !!data.debug,
        currentFile: data.currentFile || null,
      });
      Object.entries(STATE.loops).forEach(([_, lp]) => {
        lp.running = false;
        lp.activeIndex = -1;
        lp.paused = !!lp.paused;
        if (!Array.isArray(lp.lines)) {
          if (Array.isArray(lp.rawLines)) lp.lines = lp.rawLines.slice();
          else if (Array.isArray(lp.body)) lp.lines = lp.body.map(step => step && step.cmd ? step.cmd : '').filter(Boolean);
          else lp.lines = [''];
        }
      });
    } catch (_) {}
  }

  function loadPresetsFromStorage() {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) STATE.presets = arr.filter(x => x && x.address);
    } catch (_) {}
  }

  function savePresets() {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(STATE.presets.slice(0, 20)));
    } catch (_) {}
    saveState();
  }

  function normalizeHost(v) {
    return String(v || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/g, '');
  }
  function normalizePort(v) {
    const p = parseInt(v, 10);
    return Number.isFinite(p) ? p : 80;
  }
  function presetLabel(p) {
    return p.name ? `${p.name} — ${p.address}${p.port && p.port !== 80 ? ':' + p.port : ''}` : `${p.address}${p.port && p.port !== 80 ? ':' + p.port : ''}`;
  }

  function renderPresets() {
    if (!UI.espPresets || !UI.modalPreset) return;
    const options = ['<option value="">— elegir —</option>', ...STATE.presets.map((p, i) => `<option value="${i}">${escHtml(presetLabel(p))}</option>`)].join('');
    UI.espPresets.innerHTML = options;
    UI.modalPreset.innerHTML = options;
  }

  function setConnectionUI(connected) {
    if (!UI.espDot || !UI.espLabel || !UI.btnConnect) return;
    if (connected) {
      UI.espDot.className = 'esp-dot connected';
      UI.espLabel.textContent = STATE.esp.address || 'CONECTADO';
      UI.espLabel.className = 'ok';
      UI.btnConnect.textContent = 'Desconectar';
      UI.btnConnect.className = 'connected';
    } else {
      UI.espDot.className = 'esp-dot';
      UI.espLabel.textContent = 'SIN CONEXIÓN';
      UI.espLabel.className = '';
      UI.btnConnect.textContent = 'WiFi ESP32';
      UI.btnConnect.className = '';
    }
  }

  function updateEspUI() {
    if (!UI.statIp) return;
    UI.statIp.textContent = STATE.esp.address || '—';
    UI.statPort.textContent = STATE.esp.port || 80;
    UI.statStatus.textContent = STATE.esp.connected ? 'Conectado' : 'Desconectado';
    UI.statStatus.className = 'esp-stat-val ' + (STATE.esp.connected ? 'ok' : 'err');
    UI.statPing.textContent = STATE.esp.ping != null ? `${STATE.esp.ping} ms` : '—';
    UI.statCmds.textContent = String(STATE.esp.cmdsSent || 0);
    setConnectionUI(STATE.esp.connected);
  }

  function buildBaseUrl() {
    const host = normalizeHost(STATE.esp.address);
    if (!host) return '';
    const port = normalizePort(STATE.esp.port);
    return port === 80 ? `http://${host}` : `http://${host}:${port}`;
  }

  function loopCardHtml(name, lp) {
    const lineCount = Array.isArray(lp.lines) ? lp.lines.length : 0;
    return `
      <div class="loop-card ${lp.running ? 'running' : ''}" data-loop-card="${escHtml(name)}">
        <div class="loop-header">
          <div class="loop-indicator"></div>
          <input class="loop-name" data-loop-name="${escHtml(name)}" value="${escHtml(name)}" placeholder="nombre del loop" />
          <div class="loop-actions">
            <button class="loop-btn-action run" data-loop-run="${escHtml(name)}">ENCENDER</button>
            <button class="loop-btn-action stop" data-loop-stop="${escHtml(name)}">DETENER</button>
            <button class="loop-btn-action off" data-loop-off="${escHtml(name)}">APAGAR</button>
          </div>
        </div>
        <div class="loop-body">
          <div class="loop-lines" data-loop-lines="${escHtml(name)}">
            ${(Array.isArray(lp.lines) ? lp.lines : ['']).map((line, i) => {
              const active = lp.running && Number(lp.activeIndex) === i;
              const style = active ? 'background:rgba(255,221,0,.18);border-color:rgba(255,221,0,.75);color:#fff;box-shadow:0 0 0 1px rgba(255,221,0,.25) inset;' : '';
              return `
              <div class="loop-line-row ${active ? 'active' : ''}" data-loop-line-row="${escHtml(name)}:${i}">
                <div class="loop-line-num">${i + 1}</div>
                <textarea class="loop-line ${active ? 'active' : ''}" style="${style}" data-loop-line="${escHtml(name)}:${i}" placeholder="$comando(args)...">${escHtml(line)}</textarea>
                <button class="line-btn del" data-loop-del-line="${escHtml(name)}:${i}">✕</button>
              </div>`;
            }).join('')}
          </div>
          <div class="loop-footer">
            <button class="line-btn add" data-loop-add-line="${escHtml(name)}">＋ línea</button>
            <button class="line-btn" data-loop-save="${escHtml(name)}">💾 guardar</button>
            <button class="line-btn del" data-loop-delete="${escHtml(name)}">🗑 borrar loop</button>
          </div>
          <div class="loop-body-preview" style="color:var(--dim);font-size:10px">${lineCount} comandos</div>
        </div>
      </div>`;
  }

  function updateUI() {
    if (UI.varList) {
      const vars = Object.entries(STATE.vars);
      UI.varList.innerHTML = vars.length
        ? vars.map(([name, v]) => `
            <div class="var-card">
              <div class="var-type-badge">${escHtml(String(v.type || 'number').toUpperCase())}</div>
              <div class="var-info">
                <div class="var-name">${escHtml(name)}</div>
                <div class="var-val">${escHtml(String(v.value))}</div>
              </div>
              <div class="var-del" data-del-var="${escHtml(name)}">🗑</div>
            </div>`).join('')
        : `<div class="empty-state"><div class="empty-icon">📦</div><div>Sin variables</div></div>`;
      const c = $('#var-count-lbl'); if (c) c.textContent = String(vars.length);
    }

    if (UI.pinGrid) {
      const pins = Object.entries(STATE.pins);
      UI.pinGrid.innerHTML = pins.length
        ? pins.map(([num, p]) => `
            <div class="pin-card ${Number(p.value) > 0 ? 'on' : ''}" data-toggle-pin="${escHtml(num)}">
              <div class="pin-led"></div>
              <div class="pin-num">PIN ${escHtml(num)}</div>
              <div class="pin-mode-badge">${escHtml(p.mode || 'OUTPUT')}</div>
              <div class="pin-val">${escHtml(String(p.value ?? 0))}</div>
            </div>`).join('')
        : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔌</div><div>Sin pines</div></div>`;
      const c = $('#pin-count-lbl'); if (c) c.textContent = String(pins.length);
    }

    if (UI.loopList) {
      const loops = Object.entries(STATE.loops);
      UI.loopList.innerHTML = loops.length
        ? loops.map(([name, lp]) => loopCardHtml(name, lp)).join('')
        : `<div class="empty-state"><div class="empty-icon">🔁</div><div>Sin loops. Crea uno con el botón de arriba</div></div>`;
      const c = $('#loop-count-lbl'); if (c) c.textContent = String(loops.length);
    }

    updateEspUI();
    renderPresets();
    saveState();
  }

  function fetchWithTimeout(url, options = {}, timeout = 3500) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeout);
    return fetch(url, { ...options, signal: ctrl.signal, cache: 'no-store' }).finally(() => clearTimeout(id));
  }

  async function espSend(nativeCmd) {
    const base = buildBaseUrl();
    if (!STATE.esp.connected || !base) return null;
    const url = `${base}/cmd?c=${encodeURIComponent(nativeCmd)}`;
    const t0 = Date.now();
    try {
      const r = await fetchWithTimeout(url, { method: 'GET', mode: 'cors' }, 3000);
      STATE.esp.ping = Date.now() - t0;
      STATE.esp.cmdsSent++;
      updateEspUI();
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { ok: true, raw: text }; }
    } catch (e) {
      STATE.esp.ping = null;
      updateEspUI();
      if (location.protocol === 'https:' && /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(STATE.esp.address)) {
        logErr('GitHub Pages puede bloquear http://IP local.');
      } else {
        logEsp('Error: ' + e.message);
      }
      return null;
    }
  }

  async function doConnect(address, port) {
    address = normalizeHost(address);
    port = normalizePort(port);
    if (!address) return logErr('Ingresa la dirección del ESP');

    STATE.esp.address = address;
    STATE.esp.port = port;
    if (UI.espDot) UI.espDot.className = 'esp-dot connecting';
    if (UI.espLabel) UI.espLabel.textContent = 'Conectando...';
    logInfo(`Conectando a ${address}${port && port !== 80 ? ':' + port : ''}...`);

    try {
      const t0 = Date.now();
      await fetchWithTimeout(`http://${address}${port && port !== 80 ? ':' + port : ''}/ping`, { mode: 'cors' }, 3000);
      STATE.esp.ping = Date.now() - t0;
      STATE.esp.connected = true;
      logEsp(`Conectado! Latencia: ${STATE.esp.ping}ms`);
    } catch (_) {
      try {
        const t0 = Date.now();
        await fetchWithTimeout(`http://${address}${port && port !== 80 ? ':' + port : ''}/cmd?c=ping`, { mode: 'cors' }, 3000);
        STATE.esp.ping = Date.now() - t0;
        STATE.esp.connected = true;
        logEsp(`Conectado! Latencia: ${STATE.esp.ping}ms`);
      } catch (e2) {
        STATE.esp.connected = false;
        STATE.esp.ping = null;
        const extra = location.protocol === 'https:' ? 'GitHub Pages suele bloquear HTTP local.' : '';
        logErr(`No se pudo conectar a ${address}${port && port !== 80 ? ':' + port : ''} — ${e2.message}${extra ? ' ' + extra : ''}`);
      }
    }
    updateUI();
    closeConnectModal();
  }

  function espDisconnect() {
    STATE.esp.connected = false;
    STATE.esp.ping = null;
    logWarn('ESP desconectado.');
    updateUI();
  }

  function parseTimbito(raw) {
    const s = String(raw).trim();
    if (!s.startsWith('$')) return null;
    const pi = s.indexOf('(');
    if (pi === -1) return { name: s.slice(1), args: [] };
    const name = s.slice(1, pi).trim();
    let depth = 0, end = -1;
    for (let i = pi; i < s.length; i++) {
      if (s[i] === '(') depth++;
      if (s[i] === ')') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const inner = end > -1 ? s.slice(pi + 1, end) : s.slice(pi + 1);
    return { name, args: splitArgs(inner) };
  }

  function splitArgs(s) {
    const args = [];
    let cur = '', depth = 0, inQ = false, qChar = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQ) {
        cur += c;
        if (c === qChar) inQ = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inQ = true;
        qChar = c;
        cur += c;
        continue;
      }
      if (c === '(') { depth++; cur += c; continue; }
      if (c === ')') { depth--; cur += c; continue; }
      if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) args.push(cur.trim());
    return args;
  }

  function resolveArg(a) {
    const s = String(a ?? '').trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
    if (s.startsWith('$')) {
      const p = parseTimbito(s);
      if (p && (p.name === 'variable.leer' || p.name === 'var.leer')) {
        const v = STATE.vars[p.args[0]];
        return v ? v.value : 0;
      }
    }
    if (/[+\-*/%]/.test(s)) {
      try {
        const expr = s.replace(/\$variable\.leer\((\w+)\)/g, (_, n) => {
          const v = STATE.vars[n];
          return v ? JSON.stringify(v.value) : '0';
        });
        return Function('"use strict";return (' + expr + ')')();
      } catch (_) {}
    }
    if (!isNaN(s) && s !== '') return Number(s);
    return s;
  }

  function evalCond(expr) {
    let s = String(expr);
    s = s.replace(/\$variable\.leer\((\w+)\)/g, (_, n) => {
      const v = STATE.vars[n];
      return v !== undefined ? JSON.stringify(v.value) : '0';
    });
    try {
      return !!Function('"use strict";return (' + s + ')')();
    } catch (_) {
      throw new Error('Condición inválida: ' + expr);
    }
  }

  function extractInner(line) {
    const pi = line.indexOf('(');
    const pe = line.lastIndexOf(')');
    if (pi < 0) return '';
    return pe > pi ? line.slice(pi + 1, pe) : line.slice(pi + 1);
  }

  function parseScript(code) {
    const lines = String(code).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
    let idx = 0;

    function parseBlock(stopFn) {
      const body = [];
      while (idx < lines.length) {
        const line = lines[idx];
        if (stopFn && stopFn(line)) break;
        if (/^\$if\s*\(/.test(line)) {
          body.push(parseIfChain());
          continue;
        }
        if (/^\$while\s*\(/.test(line)) {
          body.push(parseWhile());
          continue;
        }
        body.push({ type: 'cmd', cmd: line });
        idx++;
      }
      return body;
    }

    function parseIfChain() {
      const branches = [];
      let cond = extractInner(lines[idx]);
      idx++;
      branches.push({ cond, body: parseBlock(l => /^\$elseif\s*\(/.test(l) || l === '$else' || l === '$endif' || l === '$if.final') });
      while (idx < lines.length && /^\$elseif\s*\(/.test(lines[idx])) {
        cond = extractInner(lines[idx]);
        idx++;
        branches.push({ cond, body: parseBlock(l => /^\$elseif\s*\(/.test(l) || l === '$else' || l === '$endif' || l === '$if.final') });
      }
      let elseBody = [];
      if (idx < lines.length && lines[idx] === '$else') {
        idx++;
        elseBody = parseBlock(l => l === '$endif' || l === '$if.final');
      }
      if (idx < lines.length && (lines[idx] === '$endif' || lines[idx] === '$if.final')) idx++;
      return { type: 'ifchain', branches, elseBody };
    }

    function parseWhile() {
      const cond = extractInner(lines[idx]);
      idx++;
      const body = parseBlock(l => l === '$endwhile' || l === '$while.final');
      if (idx < lines.length && (lines[idx] === '$endwhile' || lines[idx] === '$while.final')) idx++;
      return { type: 'while', cond, body };
    }

    return parseBlock(null);
  }

  async function execStep(step, loopRef = null) {
    if (loopRef && !loopRef.running) throw new Error('__STOPPED__');
    if (step.type === 'cmd') {
      dbg({ linea: step.cmd });
      await execCmd(step.cmd, loopRef);
      return;
    }
    if (step.type === 'ifchain') {
      for (const branch of step.branches) {
        const ok = evalCond(branch.cond);
        dbg({ if: branch.cond, result: ok });
        if (ok) {
          for (const s of branch.body) await execStep(s, loopRef);
          return;
        }
      }
      for (const s of step.elseBody) await execStep(s, loopRef);
      return;
    }
    if (step.type === 'while') {
      let n = 0;
      while (true) {
        if (loopRef && !loopRef.running) break;
        const ok = evalCond(step.cond);
        dbg({ while: step.cond, result: ok });
        if (!ok) break;
        for (const s of step.body) await execStep(s, loopRef);
        if (++n > 100000) { logErr('while: demasiadas iteraciones'); break; }
      }
      return;
    }
  }

  async function runScript(code) {
    const lines = String(code).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
    let i = 0;

    function collectBlock(startIndex, endPred) {
      const out = [lines[startIndex]];
      const stack = [];
      for (let j = startIndex + 1; j < lines.length; j++) {
        const l = lines[j];
        if (/^\$if\s*\(/.test(l)) stack.push('if');
        else if (/^\$while\s*\(/.test(l)) stack.push('while');
        else if (/^\$loop\.\w+\($/.test(l)) stack.push('loop');
        else if (/^\$func\.\w+\($/.test(l)) stack.push('func');
        else if (l === '$endif' || l === '$if.final') {
          if (stack.length && stack[stack.length - 1] === 'if') stack.pop();
          else if (stack.length === 0 && endPred(l)) return { block: out, next: j + 1 };
        } else if (l === '$endwhile' || l === '$while.final') {
          if (stack.length && stack[stack.length - 1] === 'while') stack.pop();
          else if (stack.length === 0 && endPred(l)) return { block: out, next: j + 1 };
        } else if (stack.length === 0 && endPred(l)) {
          return { block: out, next: j + 1 };
        }
        out.push(l);
      }
      return { block: out, next: lines.length };
    }

    while (i < lines.length) {
      const line = lines[i];

      const loopDefMatch = line.match(/^\$loop\.(\w+)\($/);
      if (loopDefMatch) {
        const lname = loopDefMatch[1];
        if (!['init', 'stop', 'off', 'borrar', 'crear', 'final'].includes(lname)) {
          i++;
          const rawLines = [];
          let depth = 0;
          while (i < lines.length) {
            const l = lines[i];
            if (l === ')' && depth === 0) { i++; break; }
            if (/^\$loop\.\w+\($/.test(l)) depth++;
            if (l === ')') depth--;
            rawLines.push(l);
            i++;
          }
          STATE.loops[lname] = { lines: rawLines.length ? rawLines : [''], running: false, paused: false, activeIndex: -1 };
          log(`✔ loop '${lname}' definido (${rawLines.length} líneas)`);
          updateUI();
          continue;
        }
      }

      const funcDefMatch = line.match(/^\$func\.(\w+)\($/);
      if (funcDefMatch) {
        const fname = funcDefMatch[1];
        if (fname !== 'call' && fname !== 'llamar') {
          i++;
          const funcLines = [];
          while (i < lines.length && lines[i] !== ')') { funcLines.push(lines[i]); i++; }
          if (i < lines.length) i++;
          STATE.funcs[fname] = parseScript(funcLines.join('\n'));
          log(`✔ función '${fname}' definida`);
          continue;
        }
      }

      if (/^\$if\s*\(/.test(line)) {
        const collected = collectBlock(i, l => l === '$endif' || l === '$if.final');
        const ast = parseScript(collected.block.join('\n'));
        for (const s of ast) await execStep(s, null);
        i = collected.next;
        continue;
      }

      if (/^\$while\s*\(/.test(line)) {
        const collected = collectBlock(i, l => l === '$endwhile' || l === '$while.final');
        const ast = parseScript(collected.block.join('\n'));
        for (const s of ast) await execStep(s, null);
        i = collected.next;
        continue;
      }

      await execCmd(line, null);
      i++;
    }
    updateUI();
  }

  function nextLoopName() {
    let n = 1;
    while (STATE.loops[`loop${n}`]) n++;
    return `loop${n}`;
  }

  function createLoop(name = nextLoopName()) {
    if (STATE.loops[name]) return name;
    STATE.loops[name] = { lines: ['$print(loop)'], running: false, paused: false, activeIndex: -1 };
    updateUI();
    return name;
  }

  function syncLoopName(oldName, newName) {
    newName = String(newName || '').trim();
    oldName = String(oldName || '').trim();
    if (!newName || newName === oldName) return;
    if (STATE.loops[newName]) { logWarn(`Loop '${newName}' ya existe`); return; }
    STATE.loops[newName] = STATE.loops[oldName];
    delete STATE.loops[oldName];
    updateUI();
  }

  function saveLoopFromUI(name) {
    const card = $(`[data-loop-card="${cssEscape(name)}"]`);
    if (!card) return;
    const nameInput = card.querySelector('[data-loop-name]');
    if (!nameInput) return;
    const newName = nameInput.value.trim() || name;
    const lines = [...card.querySelectorAll('[data-loop-line]')].map(el => el.value).filter(v => String(v).trim() !== '');
    if (newName !== name) {
      syncLoopName(name, newName);
      name = newName;
    }
    if (!STATE.loops[name]) return;
    STATE.loops[name].lines = lines.length ? lines : [''];
    STATE.loops[name].activeIndex = -1;
    updateUI();
    log(`✔ loop '${name}' guardado`);
  }

  function addLoopLine(name) {
    const lp = STATE.loops[name];
    if (!lp) return;
    lp.lines = lp.lines || [''];
    lp.lines.push('');
    updateUI();
  }

  function deleteLoopLine(name, idx) {
    const lp = STATE.loops[name];
    if (!lp) return;
    lp.lines.splice(idx, 1);
    if (lp.lines.length === 0) lp.lines = [''];
    updateUI();
  }

  function pauseLoop(name) {
    const lp = STATE.loops[name];
    if (!lp) return;
    lp.paused = true;
    lp.running = false;
    lp.activeIndex = -1;
    updateUI();
    logWarn(`⏸ loop '${name}' detenido`);
  }

  function offLoop(name) {
    const lp = STATE.loops[name];
    if (!lp) return;
    lp.running = false;
    lp.paused = false;
    lp.activeIndex = -1;
    updateUI();
    logWarn(`⏹ loop '${name}' apagado`);
  }

  async function startLoop(name) {
    const lp = STATE.loops[name];
    if (!lp) return logErr(`Loop '${name}' no existe`);
    if (lp.running) return logWarn(`Loop '${name}' ya corre`);
    lp.lines = lp.lines || [''];
    lp.running = true;
    lp.paused = false;
    lp.activeIndex = -1;
    STATE.activeLoop = name;
    updateUI();
    log(`▶ loop '${name}' iniciado`);
    (async () => {
      try {
        while (lp.running) {
          const body = lp.lines.map(line => String(line || '').trim()).filter(Boolean);
          for (let i = 0; i < body.length; i++) {
            if (!lp.running) break;
            lp.activeIndex = i;
            updateUI();
            await execCmd(body[i], lp);
          }
        }
      } catch (e) {
        if (e.message !== '__STOPPED__') logErr(`Loop '${name}': ${e.message}`);
      }
      lp.running = false;
      lp.activeIndex = -1;
      if (STATE.activeLoop === name) STATE.activeLoop = null;
      updateUI();
    })();
  }

  function togglePin(num) {
    if (!STATE.pins[num] || STATE.pins[num].mode !== 'OUTPUT') return;
    const newVal = Number(STATE.pins[num].value) > 0 ? 0 : 1;
    execCmd(`$pin.escribir(${num}, ${newVal})`);
  }

  let currentFile = null;

  function openEditor(name) {
    if (!STATE.files[name]) STATE.files[name] = { content: '' };
    currentFile = name;
    STATE.currentFile = name;
    if (UI.editorName) UI.editorName.textContent = `📄 ${name}`;
    if (UI.editorArea) UI.editorArea.value = STATE.files[name].content;
    if (UI.editorOverlay) UI.editorOverlay.classList.add('open');
    setTimeout(() => UI.editorArea && UI.editorArea.focus(), 100);
  }

  function editorSave() {
    if (!currentFile) return;
    STATE.files[currentFile].content = UI.editorArea.value;
    if (UI.editorBar) UI.editorBar.textContent = '✔ Guardado — ' + new Date().toLocaleTimeString();
    log(`✔ '${currentFile}' guardado`);
    updateUI();
  }

  async function editorRun() {
    if (!currentFile) return;
    STATE.files[currentFile].content = UI.editorArea.value;
    editorClose();
    log(`▶ ejecutando '${currentFile}'...`, 'l-info');
    await runScript(STATE.files[currentFile].content);
  }

  function editorClose() {
    if (UI.editorOverlay) UI.editorOverlay.classList.remove('open');
    if (UI.inp) UI.inp.focus();
  }
  function openDebug() { if (UI.debugOverlay) UI.debugOverlay.classList.add('open'); }
  function closeDebug() { if (UI.debugOverlay) UI.debugOverlay.classList.remove('open'); }
  function openConnectModal() {
    if (!UI.connectModal) return;
    UI.connectModal.classList.add('open');
    setTimeout(() => UI.modalHost && UI.modalHost.focus(), 100);
    syncModalFromManual();
  }
  function closeConnectModal() { if (UI.connectModal) UI.connectModal.classList.remove('open'); }
  function syncModalFromManual() {
    if (UI.modalHost) UI.modalHost.value = UI.espHostInput ? UI.espHostInput.value.trim() : '';
    if (UI.modalPort) UI.modalPort.value = UI.espPortInput ? (UI.espPortInput.value || '80') : '80';
  }
  function syncManualFromModal() {
    if (UI.espHostInput) UI.espHostInput.value = UI.modalHost ? UI.modalHost.value.trim() : '';
    if (UI.espPortInput) UI.espPortInput.value = UI.modalPort ? (UI.modalPort.value || '80') : '80';
  }

  function showHelp() {
    const cmds = [
      ['$variable.crear(nombre)', 'crear variable'],
      ['$variable.editar(nombre, valor)', 'asignar valor'],
      ['$variable.leer(nombre)', 'leer variable'],
      ['$variable.borrar(nombre)', 'eliminar variable'],
      ['$variables.listar()', 'listar'],
      ['$pin.salida(num)', 'pin OUTPUT'],
      ['$pin.entrada(num)', 'pin INPUT'],
      ['$pin.modo(num, OUTPUT|INPUT|INPUT_PULLUP)', 'cambiar modo'],
      ['$pin.escribir(num, val)', 'escribir pin'],
      ['$pin.leer(num)', 'leer pin'],
      ['$loop.crear(nombre)', 'crear loop'],
      ['$loop.init(nombre)', 'encender loop'],
      ['$loop.stop(nombre)', 'detener loop'],
      ['$loop.off(nombre)', 'apagar loop'],
      ['$archivo.crear(nombre)', 'crear archivo'],
      ['$archivo.abrir(nombre)', 'abrir editor'],
      ['$archivo.ejecutar(nombre)', 'ejecutar archivo'],
      ['$delay(ms)', 'esperar'],
      ['$print(valor)', 'imprimir'],
      ['$esp.ping()', 'ping'],
      ['$esp.send(cmd)', 'enviar cmd'],
      ['$debug.on()', 'debugger on'],
      ['$clear()', 'limpiar terminal'],
      ['$reset()', 'reset'],
      ['$if(cond)', '$elseif(cond) $else $endif'],
    ];
    log('── COMANDOS timbitoOS v5 ──', 'l-info');
    cmds.forEach(([c, d]) => log(`  ${c.padEnd(44)} ${d}`, 'l-sys'));
  }

  function showSketch() {
    const sketch = `#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";

ESP8266WebServer server(80);

const int allowedPins[] = {0,1,2,3,4,5,12,13,14,15,16};

void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

bool validPin(int pin) {
  for (int p : allowedPins) if (p == pin) return true;
  return false;
}

void jsonOK(const String& extra = "") {
  cors();
  String j = "{\\"ok\\":true";
  if (extra.length()) j += "," + extra;
  j += "}";
  server.send(200, "application/json", j);
}

void jsonErr(const String& msg) {
  cors();
  server.send(200, "application/json", "{\\"ok\\":false,\\"error\\":\\"" + msg + "\\"}");
}

void handlePing() {
  cors();
  server.send(200, "application/json", "{\\"ok\\":true,\\"pong\\":true}");
}

void handleCmd() {
  if (!server.hasArg("c")) return jsonErr("missing c");
  String cmd = server.arg("c");

  if (cmd == "ping") return jsonOK("\\"pong\\":true");

  if (cmd.startsWith("PIN_OUT:")) {
    int pin = cmd.substring(8).toInt();
    if (!validPin(pin)) return jsonErr("invalid pin");
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
    return jsonOK();
  }

  if (cmd.startsWith("PIN_IN:")) {
    int pin = cmd.substring(7).toInt();
    if (!validPin(pin)) return jsonErr("invalid pin");
    pinMode(pin, INPUT);
    return jsonOK();
  }

  if (cmd.startsWith("PIN_MODE:")) {
    int p1 = cmd.indexOf(':', 9);
    if (p1 < 0) return jsonErr("bad format");
    int pin = cmd.substring(9, p1).toInt();
    String mode = cmd.substring(p1 + 1);
    if (!validPin(pin)) return jsonErr("invalid pin");
    if (mode == "OUTPUT") pinMode(pin, OUTPUT);
    else if (mode == "INPUT") pinMode(pin, INPUT);
    else if (mode == "INPUT_PULLUP") pinMode(pin, INPUT_PULLUP);
    else return jsonErr("bad mode");
    return jsonOK();
  }

  if (cmd.startsWith("PIN_WRITE:")) {
    int p1 = cmd.indexOf(':', 10);
    if (p1 < 0) return jsonErr("bad format");
    int pin = cmd.substring(10, p1).toInt();
    int val = cmd.substring(p1 + 1).toInt();
    if (!validPin(pin)) return jsonErr("invalid pin");
    pinMode(pin, OUTPUT);
    digitalWrite(pin, val ? HIGH : LOW);
    return jsonOK("\\"pin\\":" + String(pin) + ",\\"val\\":" + String(val));
  }

  if (cmd.startsWith("PIN_READ:")) {
    int pin = cmd.substring(9).toInt();
    if (!validPin(pin)) return jsonErr("invalid pin");
    pinMode(pin, INPUT);
    int val = digitalRead(pin);
    return jsonOK("\\"pin\\":" + String(pin) + ",\\"val\\":" + String(val));
  }

  return jsonErr("unknown command");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nConectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  server.on("/ping", HTTP_GET, handlePing);
  server.on("/cmd", HTTP_OPTIONS, []() {
    cors();
    server.send(204);
  });
  server.on("/cmd", HTTP_GET, handleCmd);
  server.begin();
}

void loop() {
  server.handleClient();
}`;
    STATE.files['ESP8266_sketch.ino'] = { content: sketch };
    openEditor('ESP8266_sketch.ino');
    log('✔ Sketch cargado.');
  }

  async function sendCmd() {
    const raw = UI.inp.value.trim();
    if (!raw) return;
    STATE.history.unshift(raw);
    STATE.histIdx = -1;
    UI.inp.value = '';
    log(raw, 'l-cmd');
    await runScript(raw);
    updateUI();
  }

  function fillCmd(cmd) {
    UI.inp.value = cmd;
    UI.inp.focus();
  }

  function addLoop() {
    const name = nextLoopName();
    createLoop(name);
    log(`✔ loop '${name}' creado`);
    updateUI();
  }

  function addLoopLine(name) {
    const lp = STATE.loops[name];
    if (!lp) return;
    lp.lines = lp.lines || [''];
    lp.lines.push('');
    updateUI();
  }

  function deleteLoopLine(name, idx) {
    const lp = STATE.loops[name];
    if (!lp) return;
    lp.lines.splice(idx, 1);
    if (lp.lines.length === 0) lp.lines = [''];
    updateUI();
  }

  function handleLoopInputs() {
    $$('.loop-card').forEach(card => {
      const oldName = card.dataset.loopCard;
      const nameInput = card.querySelector('[data-loop-name]');
      const name = nameInput ? (nameInput.value.trim() || oldName) : oldName;
      const lp = STATE.loops[oldName] || STATE.loops[name];
      if (!lp) return;
      if (oldName !== name && STATE.loops[oldName] && !STATE.loops[name]) {
        STATE.loops[name] = STATE.loops[oldName];
        delete STATE.loops[oldName];
        card.dataset.loopCard = name;
      }
      lp.lines = [...card.querySelectorAll('[data-loop-line]')].map(t => t.value);
    });
    saveState();
  }

  function attachEvents() {
    $$('.tab').forEach(t => t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.remove('active'));
      $$('.view').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const view = $('#' + t.dataset.view);
      if (view) view.classList.add('active');
    }));

    if (UI.inp) {
      UI.inp.addEventListener('keydown', async e => {
        if (e.key === 'Enter') { e.preventDefault(); await sendCmd(); return; }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (STATE.histIdx < STATE.history.length - 1) { STATE.histIdx++; UI.inp.value = STATE.history[STATE.histIdx]; }
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (STATE.histIdx > 0) { STATE.histIdx--; UI.inp.value = STATE.history[STATE.histIdx]; }
          else { STATE.histIdx = -1; UI.inp.value = ''; }
        }
      });
    }

    const quick = $('#quick-cmds');
    if (quick) {
      quick.addEventListener('click', e => {
        const b = e.target.closest('[data-fill]');
        if (!b) return;
        fillCmd(b.dataset.fill);
      });
    }

    document.body.addEventListener('click', async e => {
      const delVar = e.target.closest('[data-del-var]');
      if (delVar) {
        delete STATE.vars[delVar.dataset.delVar];
        log(`✔ variable '${delVar.dataset.delVar}' eliminada`);
        updateUI();
        return;
      }
      const pin = e.target.closest('[data-toggle-pin]');
      if (pin) { togglePin(pin.dataset.togglePin); return; }

      const runLoop = e.target.closest('[data-loop-run]');
      if (runLoop) { saveLoopFromUI(runLoop.dataset.loopRun); await startLoop(runLoop.dataset.loopRun); return; }

      const stopLoopBtn = e.target.closest('[data-loop-stop]');
      if (stopLoopBtn) { saveLoopFromUI(stopLoopBtn.dataset.loopStop); pauseLoop(stopLoopBtn.dataset.loopStop); return; }

      const offLoopBtn = e.target.closest('[data-loop-off]');
      if (offLoopBtn) { saveLoopFromUI(offLoopBtn.dataset.loopOff); offLoop(offLoopBtn.dataset.loopOff); return; }

      const saveLoopBtn = e.target.closest('[data-loop-save]');
      if (saveLoopBtn) { saveLoopFromUI(saveLoopBtn.dataset.loopSave); return; }

      const addLineBtn = e.target.closest('[data-loop-add-line]');
      if (addLineBtn) { addLoopLine(addLineBtn.dataset.loopAddLine); return; }

      const delLineBtn = e.target.closest('[data-loop-del-line]');
      if (delLineBtn) {
        const [name, idx] = delLineBtn.dataset.loopDelLine.split(':');
        deleteLoopLine(name, Number(idx));
        return;
      }

      const deleteLoopBtn = e.target.closest('[data-loop-delete]');
      if (deleteLoopBtn) {
        const name = deleteLoopBtn.dataset.loopDelete;
        delete STATE.loops[name];
        log(`✔ loop '${name}' eliminado`);
        updateUI();
        return;
      }

      if (e.target.id === 'btn-connect' || e.target.closest('[data-open-connect]')) {
        if (STATE.esp.connected) espDisconnect();
        else openConnectModal();
      }
    });

    if (UI.btnConnectManual) UI.btnConnectManual.addEventListener('click', async () => { syncManualFromModal(); await doConnect(UI.espHostInput.value, UI.espPortInput.value); });
    if (UI.btnDisconnect) UI.btnDisconnect.addEventListener('click', espDisconnect);
    if (UI.btnUsePreset) UI.btnUsePreset.addEventListener('click', () => {
      const idx = parseInt(UI.espPresets.value, 10);
      if (!Number.isFinite(idx) || !STATE.presets[idx]) return;
      const p = STATE.presets[idx];
      UI.espHostInput.value = p.address;
      UI.espPortInput.value = p.port || 80;
      UI.modalHost.value = p.address;
      UI.modalPort.value = p.port || 80;
    });
    if (UI.btnSavePreset) UI.btnSavePreset.addEventListener('click', () => {
      const address = normalizeHost(UI.espHostInput.value || UI.modalHost.value);
      const port = normalizePort(UI.espPortInput.value || UI.modalPort.value || 80);
      if (!address) return logErr('Ingresa una dirección');
      const name = prompt('Nombre del preset (opcional):', address) || '';
      const existing = STATE.presets.findIndex(p => p.address === address && Number(p.port || 80) === port);
      const item = { name: name.trim(), address, port };
      if (existing >= 0) STATE.presets[existing] = item;
      else STATE.presets.unshift(item);
      savePresets();
      renderPresets();
      log('✔ dirección guardada');
    });
    if (UI.btnDelPreset) UI.btnDelPreset.addEventListener('click', () => {
      const idx = parseInt(UI.espPresets.value, 10);
      if (!Number.isFinite(idx) || !STATE.presets[idx]) return;
      STATE.presets.splice(idx, 1);
      savePresets();
      renderPresets();
    });
    if (UI.modalConnect) UI.modalConnect.addEventListener('click', async () => {
      syncManualFromModal();
      const idx = parseInt(UI.modalPreset.value, 10);
      if (Number.isFinite(idx) && STATE.presets[idx]) {
        UI.modalHost.value = STATE.presets[idx].address;
        UI.modalPort.value = STATE.presets[idx].port || 80;
        syncManualFromModal();
      }
      await doConnect(UI.modalHost.value, UI.modalPort.value);
    });
    if (UI.modalCancel) UI.modalCancel.addEventListener('click', closeConnectModal);
    if (UI.debugClose) UI.debugClose.addEventListener('click', closeDebug);
    if (UI.btnShowSketch) UI.btnShowSketch.addEventListener('click', showSketch);
    if (UI.editorSave) UI.editorSave.addEventListener('click', editorSave);
    if (UI.editorRun) UI.editorRun.addEventListener('click', editorRun);
    if (UI.editorClose) UI.editorClose.addEventListener('click', editorClose);
    if (UI.btnAddLoop) UI.btnAddLoop.addEventListener('click', addLoop);

    if (UI.editorArea) {
      UI.editorArea.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); editorSave(); }
        if (e.key === 'Tab') {
          e.preventDefault();
          const t = e.target, s = t.selectionStart, en = t.selectionEnd;
          t.value = t.value.slice(0, s) + '  ' + t.value.slice(en);
          t.selectionStart = t.selectionEnd = s + 2;
        }
      });
    }

    document.body.addEventListener('input', e => {
      const loopNameInput = e.target.closest('[data-loop-name]');
      if (loopNameInput) {
        const card = e.target.closest('.loop-card');
        if (card) card.dataset.loopCard = loopNameInput.value.trim() || card.dataset.loopCard;
        saveState();
        return;
      }
      const loopLine = e.target.closest('[data-loop-line]');
      if (loopLine) { saveState(); return; }
      if (e.target === UI.espHostInput || e.target === UI.espPortInput) {
        syncModalFromManual();
        saveState();
      }
    });

    document.body.addEventListener('change', e => {
      const loopNameInput = e.target.closest('[data-loop-name]');
      if (loopNameInput) {
        const card = e.target.closest('.loop-card');
        if (card) card.dataset.loopCard = loopNameInput.value.trim() || card.dataset.loopCard;
        handleLoopInputs();
      }
      const loopLine = e.target.closest('[data-loop-line]');
      if (loopLine) handleLoopInputs();
    });

    document.body.addEventListener('focusout', e => {
      const loopNameInput = e.target.closest('[data-loop-name]');
      if (loopNameInput) {
        const card = loopNameInput.closest('.loop-card');
        if (card) saveLoopFromUI(card.dataset.loopCard);
      }
    });
  }

  function stopAllLoops() {
    Object.values(STATE.loops).forEach(lp => { lp.running = false; lp.paused = false; lp.activeIndex = -1; });
    updateUI();
  }

  async function init() {
    loadState();
    loadPresetsFromStorage();

    if (!Object.keys(STATE.loops).length) {
      STATE.loops.loop1 = { lines: ['$pin.salida(2)', '$pin.escribir(2, 1)', '$delay(500)', '$pin.escribir(2, 0)', '$delay(500)'], running: false, paused: false, activeIndex: -1 };
    }

    renderPresets();
    if (UI.espHostInput) UI.espHostInput.value = STATE.esp.address || '';
    if (UI.espPortInput) UI.espPortInput.value = String(STATE.esp.port || 80);
    if (UI.modalHost) UI.modalHost.value = STATE.esp.address || '';
    if (UI.modalPort) UI.modalPort.value = String(STATE.esp.port || 80);
    if (UI.dbg) UI.dbg.innerHTML = '<span style="color:var(--dim)">Sin datos. Activa con $debug.on()</span>';
    attachEvents();
    updateUI();
    setConnectionUI(STATE.esp.connected);
    if (STATE.currentFile && STATE.files[STATE.currentFile]) openEditor(STATE.currentFile);
    if (STATE.debug) openDebug();
    logSys('timbitoOS v5 listo');
    logSys('Estado guardado en localStorage');
  }

  document.addEventListener('DOMContentLoaded', init);
})();