/* Joogle Musicx: DJ deck (EQ, filter, tempo, cues, loops, waveform, visualiser, MIDI learn) + app start */
'use strict';
const Deck = (() => {
  let mounted = false, taps = [], learning = null, midi = null, ledT;
  const peaksBusy = new Set();
  const PADS = ['#4285f4', '#ea4335', '#fbbc05', '#34a853'];
  const cur = () => T(Player.curId());
  const effBpm = t => t && t.bpm ? t.bpm * Player.rate() : 0;
  const MIDI_ACTIONS = [
    ['play', 'Play / pause', 'btn'], ['cue', 'Cue', 'btn'], ['prev', 'Previous track', 'btn'], ['next', 'Next track', 'btn'],
    ['hc0', 'Hot cue 1', 'btn'], ['hc1', 'Hot cue 2', 'btn'], ['hc2', 'Hot cue 3', 'btn'], ['hc3', 'Hot cue 4', 'btn'],
    ['loop4', '4 beat loop', 'btn'], ['loopExit', 'Exit loop', 'btn'], ['tap', 'Tap BPM', 'btn'], ['shuffle', 'Shuffle', 'btn'],
    ['volume', 'Volume', 'abs'], ['tempo', 'Tempo fader', 'abs'], ['low', 'EQ low', 'abs'], ['mid', 'EQ mid', 'abs'],
    ['high', 'EQ high', 'abs'], ['filter', 'Filter', 'abs'], ['jog', 'Jog wheel', 'rel']
  ];

  /* ----- Markup ----- */
  function fader(id, label, min, max, step, val, cls = '') {
    return `<div class="fader ${cls}"><output id="o_${id}"></output><input type="range" id="f_${id}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${label}" title="Double-click to reset"><label for="f_${id}">${label}</label></div>`;
  }
  function html() {
    const d = S.dj;
    return `<div class="greet" style="margin-bottom:18px"><div><h1 class="h1">DJ deck</h1><div class="sub">EQ, filter, tempo, hot cues, loops and automix. Map your DDJ-400 below with MIDI learn.</div></div></div>
    <div class="dj">
      <div class="wave-wrap" id="waveWrap" title="Click to jump"><canvas id="wave"></canvas><div class="wave-note" id="waveNote"></div></div>
      <div class="panel">
        <h3>Deck <span id="loopState" class="sub" style="text-transform:none;letter-spacing:0"></span></h3>
        <div class="deck">
          <div class="platter" id="platter" title="Drag to scrub"><span class="mark"></span><div id="platArt"></div></div>
          <div class="deck-info" style="min-width:0">
            <div class="dt" id="dkTitle">Nothing loaded</div><div class="da" id="dkArtist">Pick a song from your library</div>
            <div class="readouts">
              <div class="ro"><b id="roBpm">---</b><span>BPM</span></div>
              <div class="ro"><b id="roTempo">0.00%</b><span>Tempo</span></div>
              <div class="ro"><b id="roKey">--</b><span>Key</span></div>
              <div class="ro"><b id="roRemain">-0:00</b><span>Remaining</span></div>
            </div>
            <div class="transport">
              <button class="djbtn big cue" id="dkCue" title="Cue (C)">CUE</button>
              <button class="djbtn big play" id="dkPlay" title="Play / pause (Space)">${ic('play')}</button>
              <button class="djbtn" id="nudgeDn" title="Hold to slow down">−</button>
              <button class="djbtn" id="nudgeUp" title="Hold to speed up">+</button>
              <button class="djbtn" id="dkTap" title="Tap along to set BPM (T)">TAP</button>
            </div>
          </div>
        </div>
        <div class="pads" id="pads"></div>
        <div class="loops">
          <button class="djbtn" data-loop="in" title="Set loop start">IN</button>
          <button class="djbtn" data-loop="out" title="Set loop end and start looping">OUT</button>
          ${[1, 2, 4, 8, 16].map(n => `<button class="djbtn" data-beats="${n}" title="${n} beat loop">${n}</button>`).join('')}
          <button class="djbtn" data-loop="exit" title="Exit loop">EXIT</button>
        </div>
      </div>
      <div class="panel">
        <h3>Mixer <button class="pill ghost" style="height:30px;font-size:12px;padding:0 12px" id="mixReset">Reset</button></h3>
        <div class="mixer">
          ${fader('high', 'High', -1, 1, .01, d.high, 'f-high')}${fader('mid', 'Mid', -1, 1, .01, d.mid, 'f-mid')}${fader('low', 'Low', -1, 1, .01, d.low, 'f-low')}
          ${fader('filter', 'Filter', -1, 1, .01, d.filter, 'f-filter')}${fader('tempo', 'Tempo', -1, 1, .001, d.tempo / d.range)}${fader('vol', 'Vol', 0, 1, .01, S.volume)}
        </div>
        <div class="mix-opts"><span class="lbl">Tempo range</span>${[8, 16, 50].map(r => `<button class="chip ${d.range === r ? 'on' : ''}" data-range="${r}">±${r}%</button>`).join('')}
          <button class="chip ${d.keylock ? 'on' : ''}" id="keylock" title="Keep pitch when changing tempo">Key lock</button></div>
        <div class="mix-opts"><span class="lbl">Automix crossfade</span>${[0, 2, 4, 6, 8, 12].map(s => `<button class="chip ${d.xfade === s ? 'on' : ''}" data-xf="${s}">${s ? s + 's' : 'Off'}</button>`).join('')}</div>
      </div>
      <div class="panel full"><h3>Visualiser</h3><div class="viz"><canvas id="viz"></canvas><div class="wave-note" id="vizNote">Press play to start the visualiser</div></div></div>
      <div class="panel full" id="midiPanel"></div>
      <div class="panel full"><h3>Using this with Mixxx and your DDJ-400</h3><ul class="tips">
        <li><b>One app at a time on Windows.</b> Windows MIDI drivers usually let only one program use the DDJ-400. Close Mixxx (or disable the controller in Mixxx preferences) before connecting it here, and the reverse.</li>
        <li><b>MIDI learn.</b> Press Connect, click Learn next to an action, then press the button or move the knob on your controller. Mappings are saved in this browser.</li>
        <li><b>Taking playlists to Mixxx.</b> Open a playlist, choose More, then Export .m3u. Save it in the folder that holds the original files and import it from Mixxx's Playlists sidebar.</li>
        <li><b>Hot cues and BPM</b> are saved per song. Tap T on the beat four or more times to set BPM, which unlocks beat loops.</li>
      </ul></div>
    </div>`;
  }
  function renderMidi() {
    const p = $('#midiPanel'); if (!p) return;
    const inputs = midi ? [...midi.inputs.values()] : [];
    const keyFor = a => Object.keys(S.midiMap).find(k => S.midiMap[k] === a);
    p.innerHTML = `<h3><span style="display:flex;align-items:center;gap:8px"><span class="midi-led ${inputs.length ? 'on' : ''}" id="midiLed"></span>MIDI controller</span>
      <span style="display:flex;gap:6px">${midi ? '' : `<button class="pill primary" style="height:32px;font-size:13px" id="midiConnect">${ic('midi')}Connect</button>`}
      <button class="pill ghost" style="height:32px;font-size:12px;padding:0 12px" id="midiFlip">${S.dj.tempoInvert ? 'Tempo flipped' : 'Flip tempo'}</button>
      <button class="pill ghost" style="height:32px;font-size:12px;padding:0 12px" id="midiClear">Clear mappings</button></span></h3>
      <div class="sub" style="margin-bottom:12px;font-size:13px">${midi ? (inputs.length ? 'Connected: ' + inputs.map(i => esc(i.name)).join(', ') : 'No MIDI devices found. Plug in the controller, and make sure Mixxx is closed.') : 'Connect to use your controller with this deck.'}</div>
      <div class="midi-list">${MIDI_ACTIONS.map(([a, l]) => { const k = keyFor(a); return `<div class="midi-item ${learning === a ? 'learning' : ''}"><span>${l}<br><code>${k ? k.replace(/:/g, ' ') : 'not mapped'}</code></span><button data-learn="${a}">${learning === a ? 'Waiting…' : 'Learn'}</button></div>`; }).join('')}</div>`;
    const c = $('#midiConnect'); if (c) c.onclick = connectMidi;
    $('#midiClear').onclick = () => { S.midiMap = {}; saveSettings(); renderMidi(); };
    $('#midiFlip').onclick = () => { S.dj.tempoInvert = !S.dj.tempoInvert; saveSettings(); renderMidi(); };
    $$('[data-learn]', p).forEach(b => b.onclick = () => { if (!midi) { connectMidi(); } learning = learning === b.dataset.learn ? null : b.dataset.learn; renderMidi(); });
  }

  /* ----- Mount / bind ----- */
  function mount() {
    mounted = true;
    const d = S.dj;
    const bindF = (id, fn, reset) => {
      const el = $('#f_' + id);
      const go = () => { fn(+el.value); out(id); };
      el.addEventListener('input', go);
      el.addEventListener('dblclick', () => { el.value = reset; go(); });
      out(id);
    };
    ['low', 'mid', 'high', 'filter'].forEach(k => bindF(k, v => { d[k] = Math.abs(v) < .03 ? 0 : v; Player.applyDJ(); saveSettings(); }, 0));
    bindF('tempo', v => setTempo(v * d.range, true), 0);
    bindF('vol', v => Player.setVolume(v), .8);
    $('#mixReset').onclick = () => { Object.assign(d, { low: 0, mid: 0, high: 0, filter: 0, tempo: 0 }); Player.applyDJ(); syncFaders(); saveSettings(); };
    $$('[data-range]').forEach(b => b.onclick = () => { d.range = +b.dataset.range; d.tempo = clamp(d.tempo, -d.range, d.range); Player.applyDJ(); $$('[data-range]').forEach(x => x.classList.toggle('on', x === b)); syncFaders(); saveSettings(); });
    $$('[data-xf]').forEach(b => b.onclick = () => { d.xfade = +b.dataset.xf; $$('[data-xf]').forEach(x => x.classList.toggle('on', x === b)); saveSettings(); toast(d.xfade ? `Songs will crossfade over ${d.xfade}s` : 'Crossfade off', 1600); });
    $('#keylock').onclick = e => { d.keylock = !d.keylock; e.currentTarget.classList.toggle('on', d.keylock); Player.applyDJ(); saveSettings(); };
    $('#dkCue').onclick = cue; $('#dkPlay').onclick = () => Player.toggle(); $('#dkTap').onclick = tap;
    const hold = (el, v) => {
      const on = e => { e.preventDefault(); Player.setNudge(v); el.classList.add('on'); };
      const off = () => { Player.setNudge(0); el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, off));
    };
    hold($('#nudgeDn'), -.04); hold($('#nudgeUp'), .04);
    $$('[data-beats]').forEach(b => b.onclick = () => beatLoop(+b.dataset.beats));
    $$('[data-loop]').forEach(b => b.onclick = () => ({ in: loopIn, out: loopOut, exit: loopExit })[b.dataset.loop]());
    $('#pads').addEventListener('click', e => { const p = e.target.closest('.pad'); if (!p) return; const i = +p.dataset.pad; (e.shiftKey || e.target.closest('[data-clr]')) ? clearCue(i) : hotCue(i); });
    $('#pads').addEventListener('contextmenu', e => { const p = e.target.closest('.pad'); if (p) { e.preventDefault(); clearCue(+p.dataset.pad); } });
    $('#waveWrap').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); Player.seek((e.clientX - r.left) / r.width * Player.duration()); });
    // platter scrub
    const pl = $('#platter'); let lastA = null;
    const ang = e => { const r = pl.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI; };
    pl.addEventListener('pointerdown', e => { pl.setPointerCapture(e.pointerId); lastA = ang(e); pl.style.cursor = 'grabbing'; });
    pl.addEventListener('pointermove', e => { if (lastA === null) return; const a = ang(e); let da = a - lastA; if (da > 180) da -= 360; if (da < -180) da += 360; lastA = a; Player.seek(Player.time() + da / 360 * 1.8); });
    pl.addEventListener('pointerup', () => { lastA = null; pl.style.cursor = ''; });
    renderMidi(); refresh(); syncFaders();
  }
  function unmount() { mounted = false; }
  function out(id) {
    const el = $('#f_' + id), o = $('#o_' + id); if (!el || !o) return;
    const v = +el.value;
    o.textContent = id === 'tempo' ? (S.dj.tempo >= 0 ? '+' : '') + S.dj.tempo.toFixed(1) : id === 'vol' ? Math.round(v * 100) : id === 'filter' ? (v === 0 ? 'off' : v < 0 ? 'LP' : 'HP') : (v < 0 ? Math.round(v * 26) : '+' + Math.round(v * 6)) + 'dB';
  }
  function syncFaders() {
    if (!mounted) return;
    const d = S.dj, set = (id, v) => { const el = $('#f_' + id); if (el) { el.value = v; out(id); } };
    set('low', d.low); set('mid', d.mid); set('high', d.high); set('filter', d.filter); set('tempo', d.tempo / d.range); set('vol', S.volume);
    readouts();
  }

  /* ----- Deck state ----- */
  function refresh() {
    if (!mounted) return;
    const t = cur();
    $('#platArt').innerHTML = artHTML(t);
    $('#dkTitle').textContent = t ? t.title : 'Nothing loaded';
    $('#dkArtist').textContent = t ? `${t.artist} · ${t.album}` : 'Pick a song from your library';
    $('#pads').innerHTML = [0, 1, 2, 3].map(i => { const c = t?.cues?.[i]; return `<button class="pad ${c != null ? 'set' : ''}" data-pad="${i}" style="--pc:${PADS[i]}" title="${c != null ? 'Jump to cue. Shift-click or right-click to clear' : 'Set hot cue here'}">CUE ${i + 1}<small>${c != null ? fmt(c) : 'empty'}</small></button>`; }).join('');
    readouts(); onState();
    if (t && !t.peaks && !t._noWave) computePeaks(t);
    $('#waveNote').textContent = !t ? 'Load a song to see its waveform' : t.peaks ? '' : t._noWave ? 'Waveform unavailable for this file' : 'Analysing waveform…';
  }
  function readouts() {
    if (!mounted) return;
    const t = cur(), b = effBpm(t);
    $('#roBpm').textContent = b ? b.toFixed(1) : '---';
    $('#roTempo').textContent = (S.dj.tempo >= 0 ? '+' : '') + S.dj.tempo.toFixed(2) + '%';
    $('#roKey').textContent = t?.key || '--';
    const l = Player.loop;
    $('#loopState').textContent = l.on ? `Looping ${fmt(l.a)} to ${fmt(l.b)}` : l.a != null ? `Loop in at ${fmt(l.a)}` : '';
    $$('[data-beats]').forEach(x => x.classList.toggle('on', l.on && b && Math.abs((l.b - l.a) - +x.dataset.beats * 60 / t.bpm) < .01));
  }
  function onState() { if (!mounted) return; const p = Player.playing(); const b = $('#dkPlay'); b.classList.toggle('on', p); b.innerHTML = ic(p ? 'pause' : 'play'); }
  function saveCues(t) { saveTrack(t); refresh(); }
  function hotCue(i) {
    const t = cur(); if (!t) return;
    t.cues = t.cues || [null, null, null, null];
    if (t.cues[i] == null) { t.cues[i] = Math.round(Player.time() * 1000) / 1000; saveCues(t); toast(`Hot cue ${i + 1} set at ${fmt(t.cues[i])}`, 1200); }
    else { Player.seek(t.cues[i]); if (!Player.playing()) Player.toggle(); }
  }
  function clearCue(i) { const t = cur(); if (!t?.cues || t.cues[i] == null) return; t.cues[i] = null; saveCues(t); toast(`Hot cue ${i + 1} cleared`, 1200); }
  function cue() {
    const t = cur(); if (!t) return;
    if (Player.playing()) { Player.el().pause(); Player.seek(t.mainCue || 0); }
    else { t.mainCue = Math.round(Player.time() * 1000) / 1000; saveTrack(t); toast(`Cue set at ${fmt(t.mainCue)}`, 1200); }
  }
  function setTempo(pct, fromFader) {
    S.dj.tempo = Math.round(clamp(pct, -S.dj.range, S.dj.range) * 100) / 100;
    Player.applyDJ(); saveSettings();
    if (!fromFader) syncFaders(); else { out('tempo'); readouts(); }
  }
  const tempoStep = d => { setTempo(S.dj.tempo + d); toast(`Tempo ${(S.dj.tempo >= 0 ? '+' : '') + S.dj.tempo.toFixed(1)}%`, 800); };
  function tap() {
    const t = cur(); if (!t) return;
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now); if (taps.length > 9) taps.shift();
    const b = $('#dkTap'); if (b) { b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 90); }
    if (taps.length >= 4) {
      const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
      t.bpm = Math.round(60000 / avg / Player.rate() * 10) / 10; saveTrack(t); readouts();
    } else toast(`Keep tapping… ${4 - taps.length} more`, 700);
  }
  function beatLoop(n, toggle) {
    const t = cur(), l = Player.loop; if (!t) return;
    if (toggle && l.on) return loopExit();
    if (!t.bpm) return toast('Set the BPM first: tap T on the beat, or edit the song info');
    l.a = Player.time(); l.b = l.a + n * 60 / t.bpm; l.on = true; readouts();
  }
  function loopIn() { const l = Player.loop; l.a = Player.time(); l.on = false; readouts(); }
  function loopOut() { const l = Player.loop, t = Player.time(); if (l.a == null || t <= l.a) return toast('Set loop IN first'); l.b = t; l.on = true; Player.seek(l.a); readouts(); }
  function loopExit() { Player.loop.on = false; readouts(); }

  /* ----- Waveform ----- */
  async function computePeaks(t) {
    if (peaksBusy.has(t.id)) return; peaksBusy.add(t.id);
    try {
      const blob = await getBlob(t.id); if (!blob) return;
      const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const buf = await new C(1, 1, 44100).decodeAudioData(await blob.arrayBuffer());
      const N = 900, chs = [...Array(buf.numberOfChannels).keys()].slice(0, 2).map(c => buf.getChannelData(c));
      const len = chs[0].length, per = Math.floor(len / N), step = Math.max(1, Math.floor(per / 160));
      const peaks = new Array(N); let mx = 0;
      for (let i = 0; i < N; i++) {
        let m = 0; const s = i * per;
        for (let j = s; j < s + per; j += step) for (const ch of chs) { const v = Math.abs(ch[j]); if (v > m) m = v; }
        peaks[i] = m; if (m > mx) mx = m;
      }
      t.peaks = peaks.map(v => Math.round(v / (mx || 1) * 100) / 100);
      saveTrack(t);
    } catch (e) { console.warn('Waveform failed', e); t._noWave = true; const n = $('#waveNote'); if (n && cur() === t) n.textContent = 'Waveform unavailable for this file'; return; }
    finally { peaksBusy.delete(t.id); }
    if (cur() === t) refresh();
  }
  function fit(c) {
    const r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return [c.getContext('2d'), w, h, dpr];
  }
  function drawWave(ct, d) {
    const c = $('#wave'); if (!c) return;
    const [g, w, h, dpr] = fit(c); g.clearRect(0, 0, w, h);
    const t = cur(); if (!t?.peaks || !d) return;
    const P = t.peaks, bw = w / P.length, mid = h / 2, px = ct / d * w, l = Player.loop;
    if (l.a != null) { const a = l.a / d * w, b = (l.on ? l.b : l.a) / d * w; g.fillStyle = l.on ? 'rgba(52,168,83,.22)' : 'rgba(52,168,83,.5)'; g.fillRect(a, 0, Math.max(2 * dpr, b - a), h); }
    for (let i = 0; i < P.length; i++) {
      const x = i * bw, a = P[i] * (mid - 6 * dpr);
      g.fillStyle = x < px ? (i % 2 ? '#8ab4f8' : '#a7c5fa') : (i % 2 ? '#3c4a63' : '#45536d');
      g.fillRect(x, mid - a, Math.max(1, bw - .5), a * 2);
    }
    (t.cues || []).forEach((q, i) => { if (q == null) return; const x = q / d * w; g.fillStyle = PADS[i]; g.fillRect(x - dpr, 0, 2 * dpr, h); g.fillRect(x - dpr, 0, 12 * dpr, 12 * dpr); g.fillStyle = '#111'; g.font = `${9 * dpr}px sans-serif`; g.fillText(i + 1, x + 2 * dpr, 9 * dpr); });
    if (t.mainCue) { const x = t.mainCue / d * w; g.fillStyle = '#fdd663'; g.beginPath(); g.moveTo(x - 6 * dpr, h); g.lineTo(x + 6 * dpr, h); g.lineTo(x, h - 9 * dpr); g.fill(); }
    g.fillStyle = '#fff'; g.fillRect(px - dpr, 0, 2 * dpr, h);
  }
  const vizBuf = new Uint8Array(1024);
  function drawViz() {
    const c = $('#viz'); if (!c) return;
    const [g, w, h] = fit(c); g.clearRect(0, 0, w, h);
    const N = Player.nodes(); $('#vizNote').style.display = N ? 'none' : '';
    if (!N) return;
    N.an.getByteFrequencyData(vizBuf);
    const bars = 72, cols = ['#4285f4', '#ea4335', '#fbbc05', '#34a853'], gap = w / bars;
    for (let i = 0; i < bars; i++) {
      const lo = Math.floor(Math.pow(i / bars, 2.2) * 700) + 1, hi = Math.floor(Math.pow((i + 1) / bars, 2.2) * 700) + 2;
      let m = 0; for (let j = lo; j < hi; j++) m = Math.max(m, vizBuf[j]);
      const bh = Math.max(3, m / 255 * (h - 10));
      g.fillStyle = cols[Math.floor(i / bars * 4)];
      g.globalAlpha = .35 + m / 255 * .65;
      const x = i * gap + gap * .15, bwid = gap * .7;
      g.beginPath(); g.roundRect ? g.roundRect(x, h - bh, bwid, bh, Math.min(4, bwid / 2)) : g.rect(x, h - bh, bwid, bh); g.fill();
    }
    g.globalAlpha = 1;
  }
  function frame(ct, d) {
    if (!mounted) return;
    const pl = $('#platter'); if (pl) pl.style.transform = `rotate(${(ct * 200) % 360}deg)`;
    const r = $('#roRemain'); if (r) r.textContent = '-' + fmt(Math.max(0, (d - ct) / Player.rate()));
    drawWave(ct, d); drawViz();
  }

  /* ----- MIDI ----- */
  async function connectMidi() {
    if (!navigator.requestMIDIAccess) return toast('This browser does not support Web MIDI');
    try {
      midi = await navigator.requestMIDIAccess({ sysex: false });
      const hook = () => { for (const i of midi.inputs.values()) i.onmidimessage = onMidi; renderMidi(); };
      midi.onstatechange = hook; hook();
      toast([...midi.inputs.values()].length ? 'Controller connected' : 'MIDI ready, but no device found');
    } catch (e) { midi = null; toast('MIDI access was blocked. Allow MIDI for this page, and close Mixxx if it is using the controller.', 5000); renderMidi(); }
  }
  function onMidi(e) {
    const [st, d1, d2 = 0] = e.data, type = st & 0xf0, ch = st & 0x0f;
    if (type !== 0x90 && type !== 0x80 && type !== 0xb0) return;
    const kind = type === 0xb0 ? 'cc' : 'note', key = `${kind}:${ch + 1}:${d1}`;
    const press = (type === 0x90 && d2 > 0) || (type === 0xb0 && d2 > 0);
    const led = $('#midiLed'); if (led) { led.classList.add('hit'); clearTimeout(ledT); ledT = setTimeout(() => led.classList.remove('hit'), 80); }
    if (learning) {
      if (kind === 'note' && !press) return;
      Object.keys(S.midiMap).forEach(k => { if (S.midiMap[k] === learning) delete S.midiMap[k]; });
      S.midiMap[key] = learning; const l = MIDI_ACTIONS.find(a => a[0] === learning)[1];
      learning = null; saveSettings(); renderMidi(); toast(`${l} mapped`, 1200); return;
    }
    const act = S.midiMap[key]; if (!act) return;
    const v = d2 / 127, bip = x => { x = x * 2 - 1; return Math.abs(x) < .03 ? 0 : x; };
    const btn = { play: () => Player.toggle(), cue, prev: () => Player.prev(), next: () => Player.next(), loop4: () => beatLoop(4, true), loopExit, tap, shuffle: () => Player.setShuffle(!S.shuffle) };
    if (btn[act]) { if (press) btn[act](); return; }
    if (/^hc\d$/.test(act)) { if (press) hotCue(+act[2]); return; }
    if (act === 'volume') { Player.setVolume(v); syncFaders(); }
    else if (act === 'tempo') setTempo((S.dj.tempoInvert ? -1 : 1) * bip(v) * S.dj.range);
    else if (['low', 'mid', 'high', 'filter'].includes(act)) { S.dj[act] = bip(v); Player.applyDJ(); syncFaders(); saveSettings(); }
    else if (act === 'jog') { const delta = d2 - 64; Player.seek(Player.time() + delta * .03); }
  }

  return { html, mount, unmount, refresh, onState, frame, hotCue, clearCue, cue, tap, tempoStep, beatLoop };
})();

/* ---------- Start ---------- */
(async function init() {
  hydrateIcons();
  loadSettings();
  const ok = await DB.open();
  try {
    ((await DB.all('tracks')) || []).forEach(t => { t.cues = t.cues || [null, null, null, null]; S.tracks.set(t.id, t); });
    S.playlists = ((await DB.all('playlists')) || []).sort((a, b) => a.createdAt - b.createdAt);
  } catch (e) { console.error(e); }
  rebuildArtIndex();
  S.queue = (S.queue || []).filter(id => S.tracks.has(id));
  if (S.origQueue) S.origQueue = S.origQueue.filter(id => S.tracks.has(id));
  S.qi = Math.min(S.qi, S.queue.length - 1);
  Player.applyVolume(); Player.updateModeBtns(); Player.applyDJ();
  if (!location.hash) history.replaceState(null, '', '#/home');
  route();
  if (S.view.name === 'search') $('#q').value = S.view.key || '';
  Player.refreshNow();
  if (S.queue.length && S.qi >= 0) await Player.playIndex(S.qi, { autoplay: false, startAt: S.pos });
  requestAnimationFrame(Player.frame);
  updateStorage();
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) { await navigator.storage.persist(); updateStorage(); } } catch (_) {}
  if (!ok) toast('Storage is blocked here, so songs will not be kept after a reload', 6000);
})();
