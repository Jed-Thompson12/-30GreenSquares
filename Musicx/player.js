/* Joogle Musicx: audio engine, transport, player bar, keyboard, media keys */
'use strict';
const Player = (() => {
  const els = [new Audio(), new Audio()];
  els.forEach(a => { a.preload = 'auto'; });
  let cur = 0, ctx = null, gains = [], N = {}, urls = [null, null];
  let curId = null, xfFor = null, xfTimer = null, countedFor = null, seeking = false, nudge = 0;
  const loop = { a: null, b: null, on: false };
  const A = () => els[cur];

  /* ----- Web Audio graph: decks → EQ → filter → master → analyser ----- */
  function ensureCtx() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C();
      const bq = (type, f, q) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; };
      N.low = bq('lowshelf', 220); N.mid = bq('peaking', 1100, .7); N.high = bq('highshelf', 4800);
      N.lp = bq('lowpass', 22000, .7); N.hp = bq('highpass', 10, .7);
      N.master = ctx.createGain(); N.an = ctx.createAnalyser(); N.an.fftSize = 2048; N.an.smoothingTimeConstant = .78;
      els.forEach((el, i) => { const s = ctx.createMediaElementSource(el); const g = ctx.createGain(); g.gain.value = i === cur ? 1 : 0; s.connect(g); g.connect(N.low); gains[i] = g; });
      N.low.connect(N.mid); N.mid.connect(N.high); N.high.connect(N.lp); N.lp.connect(N.hp); N.hp.connect(N.master); N.master.connect(N.an); N.an.connect(ctx.destination);
      applyDJ(); applyVolume();
    } catch (e) { console.warn('Web Audio unavailable', e); ctx = null; }
    return ctx;
  }
  function applyDJ() {
    const d = S.dj;
    els.forEach(applyRate);
    if (!ctx) return;
    const db = v => v < 0 ? v * 26 : v * 6; // DJ-style kill on the way down, +6 dB boost up
    const now = ctx.currentTime, set = (p, v) => p.setTargetAtTime(v, now, .015);
    set(N.low.gain, db(d.low)); set(N.mid.gain, db(d.mid)); set(N.high.gain, db(d.high));
    const f = Math.abs(d.filter) < .03 ? 0 : d.filter;
    set(N.lp.frequency, f < 0 ? 22000 * Math.pow(10, f * 2.3) : 22000);
    set(N.hp.frequency, f > 0 ? 15 * Math.pow(10, f * 2.75) : 10);
    set(N.lp.Q, f < 0 ? 1.4 : .7); set(N.hp.Q, f > 0 ? 1.4 : .7);
  }
  function rate() { return clamp(1 + S.dj.tempo / 100 + nudge, .25, 4); }
  function applyRate(el) {
    el.playbackRate = rate();
    el.preservesPitch = el.webkitPreservesPitch = el.mozPreservesPitch = !!S.dj.keylock;
  }
  function applyVolume() {
    const v = S.muted ? 0 : S.volume, g = v * v;
    if (ctx) { N.master.gain.setTargetAtTime(g, ctx.currentTime, .02); els.forEach(e => e.volume = 1); }
    else els.forEach(e => e.volume = g);
    const b = $('#btnMute'); if (b) b.innerHTML = ic(v === 0 ? 'mute' : v < .5 ? 'volLow' : 'vol');
    const r = $('#vol'); if (r) { r.value = Math.round(S.volume * 100); setRange(r); }
  }
  function setGain(i, v) { if (!ctx || !gains[i]) return; const p = gains[i].gain; p.cancelScheduledValues(ctx.currentTime); p.setValueAtTime(v, ctx.currentTime); }
  function crossfade(from, to) {
    const T0 = ctx.currentTime, d = S.dj.xfade;
    const gf = gains[from].gain, gt = gains[to].gain;
    gf.cancelScheduledValues(T0); gf.setValueAtTime(gf.value, T0); gf.linearRampToValueAtTime(0, T0 + d);
    gt.cancelScheduledValues(T0); gt.setValueAtTime(0, T0); gt.linearRampToValueAtTime(1, T0 + d);
    clearTimeout(xfTimer); const old = els[from];
    xfTimer = setTimeout(() => old.pause(), d * 1000 + 150);
  }

  /* ----- Loading & transport ----- */
  async function playIndex(i, o = {}) {
    const { autoplay = true, startAt = 0, fade = false } = o;
    if (i < 0 || i >= S.queue.length) return;
    const id = S.queue[i], t = T(id);
    const blob = t && await getBlob(id);
    if (!blob) { toast('That audio file is missing'); return; }
    const doFade = fade && S.dj.xfade > 0 && ctx && !A().paused;
    const target = doFade ? 1 - cur : cur, el = els[target];
    if (!doFade) { clearTimeout(xfTimer); els[1 - cur].pause(); setGain(target, 1); setGain(1 - target, 0); }
    if (urls[target]) URL.revokeObjectURL(urls[target]);
    urls[target] = URL.createObjectURL(blob);
    el.src = urls[target]; applyRate(el);
    S.qi = i; curId = id; xfFor = null; countedFor = null; nudge = 0;
    loop.a = loop.b = null; loop.on = false;
    if (startAt > 0) el.addEventListener('loadedmetadata', () => { el.currentTime = Math.min(startAt, Math.max(0, (el.duration || startAt) - 1)); }, { once: true });
    if (doFade) crossfade(cur, target);
    cur = target;
    if (autoplay) {
      ensureCtx();
      try { await el.play(); } catch (e) { console.warn(e); }
      t.lastPlayed = Date.now(); saveTrack(t);
    }
    onTrackChange(); saveSettings();
  }
  function playList(ids, i = 0, forceShuffle = false) {
    ids = ids.filter(id => S.tracks.has(id));
    if (!ids.length) return;
    if (forceShuffle) S.shuffle = true;
    let q = [...ids];
    if (S.shuffle) {
      S.origQueue = [...ids];
      if (forceShuffle) shuffleArr(q);
      else { const first = q.splice(i, 1)[0]; q = [first, ...shuffleArr(q)]; }
      i = 0;
    } else S.origQueue = null;
    S.queue = q; updateModeBtns();
    playIndex(i);
  }
  async function toggle() {
    if (!curId) {
      if (S.queue.length) return playIndex(Math.max(0, S.qi));
      const all = allTracks().map(t => t.id);
      if (all.length) return playList(all, 0, S.shuffle);
      return $('#fileIn').click();
    }
    if (A().paused) { ensureCtx(); try { await A().play(); } catch (e) { console.warn(e); } }
    else els.forEach(e => e.pause());
  }
  function next(o = {}) {
    if (!S.queue.length) return;
    let n = S.qi + 1;
    if (n >= S.queue.length) {
      if (o.auto && S.repeat !== 'all') { A().pause(); A().currentTime = 0; return; }
      n = 0;
    }
    playIndex(n, { fade: !!o.fade });
  }
  function prev() {
    if (A().currentTime > 3 || !S.queue.length) return seek(0);
    if (S.qi > 0) playIndex(S.qi - 1);
    else if (S.repeat === 'all') playIndex(S.queue.length - 1);
    else seek(0);
  }
  function seek(t) { const d = duration(); if (!d) return; A().currentTime = clamp(t, 0, d - .05); }
  const duration = () => (isFinite(A().duration) && A().duration) || T(curId)?.duration || 0;
  function setShuffle(on) {
    S.shuffle = on;
    if (S.queue.length) {
      const id = S.queue[S.qi];
      if (on) {
        S.origQueue = [...S.queue];
        const rest = S.queue.filter((_, i) => i !== S.qi);
        S.queue = id ? [id, ...shuffleArr(rest)] : shuffleArr(rest); S.qi = id ? 0 : -1;
      } else if (S.origQueue) {
        const pool = [...S.queue]; const base = [];
        S.origQueue.forEach(x => { const k = pool.indexOf(x); if (k >= 0) { base.push(x); pool.splice(k, 1); } });
        S.queue = [...base, ...pool]; S.qi = Math.max(0, S.queue.indexOf(id)); S.origQueue = null;
      }
    }
    updateModeBtns(); UI.renderQueue(); NP.render(); saveSettings();
    toast(on ? 'Shuffle on' : 'Shuffle off', 1200);
  }
  function cycleRepeat() {
    S.repeat = { off: 'all', all: 'one', one: 'off' }[S.repeat] || 'off';
    updateModeBtns(); UI.renderQueue(); NP.render(); saveSettings();
    toast({ off: 'Repeat off', all: 'Repeat all', one: 'Repeat this song' }[S.repeat], 1200);
  }
  function setVolume(v) { S.volume = clamp(v, 0, 1); if (S.volume > 0) S.muted = false; applyVolume(); saveSettings(); }
  function toggleMute() { S.muted = !S.muted; applyVolume(); saveSettings(); }

  /* ----- Queue editing ----- */
  function insertAt(ids, pos) {
    ids = ids.filter(id => S.tracks.has(id)); if (!ids.length) return;
    if (!S.queue.length || !curId && S.qi < 0) { playList(ids, 0); return; }
    pos = clamp(pos, 0, S.queue.length);
    S.queue.splice(pos, 0, ...ids);
    if (pos <= S.qi) S.qi += ids.length;
    if (S.origQueue) S.origQueue.push(...ids);
    UI.renderQueue(); saveSettings();
  }
  const addToQueue = ids => insertAt(ids, S.queue.length);
  const playNext = ids => insertAt(ids, S.qi + 1);
  function removeAt(i) {
    if (i === S.qi || i < 0 || i >= S.queue.length) return;
    const [id] = S.queue.splice(i, 1); if (i < S.qi) S.qi--;
    if (S.origQueue) { const k = S.origQueue.indexOf(id); if (k >= 0) S.origQueue.splice(k, 1); }
    UI.renderQueue(); saveSettings();
  }
  function moveQueue(from, to) {
    const old = S.queue, idx = [...old.keys()];
    const [m] = idx.splice(from, 1); if (to > from) to--;
    idx.splice(clamp(to, 0, idx.length), 0, m);
    S.queue = idx.map(k => old[k]); S.qi = idx.indexOf(S.qi);
    UI.renderQueue(); saveSettings();
  }
  function clearQueue() {
    S.queue = curId ? [curId] : []; S.qi = curId ? 0 : -1; S.origQueue = null;
    UI.renderQueue(); saveSettings();
  }
  function onRemoved(set) {
    if (curId && set.has(curId)) { els.forEach(e => { e.pause(); e.removeAttribute('src'); e.load(); }); curId = null; }
    const keep = S.queue[S.qi];
    S.queue = S.queue.filter(id => !set.has(id));
    if (S.origQueue) S.origQueue = S.origQueue.filter(id => !set.has(id));
    S.qi = keep && !set.has(keep) ? S.queue.indexOf(keep) : -1;
    onTrackChange(); saveSettings();
  }

  /* ----- UI sync ----- */
  function updateModeBtns() {
    const sh = $('#btnShuffle'), rp = $('#btnRepeat');
    sh.classList.toggle('on', S.shuffle);
    rp.classList.toggle('on', S.repeat !== 'off');
    rp.innerHTML = ic(S.repeat === 'one' ? 'repeat1' : 'repeat');
    rp.title = { off: 'Repeat is off (R)', all: 'Repeating queue (R)', one: 'Repeating this song (R)' }[S.repeat];
  }
  function onState() {
    const p = !A().paused;
    $('#btnPlay').innerHTML = ic(p ? 'pause' : 'play');
    const np = $('#npPlay'); if (np) np.innerHTML = ic(p ? 'pause' : 'play');
    UI.markPlaying(); Deck.onState();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = curId ? (p ? 'playing' : 'paused') : 'none';
  }
  function refreshNow() {
    const t = T(curId);
    $('#plArt').innerHTML = artHTML(t);
    $('#plTitle').textContent = t ? t.title : 'Nothing playing';
    $('#plArtist').textContent = t ? `${t.artist} · ${t.album}` : (S.tracks.size ? 'Pick a song to start' : 'Upload some songs to get started');
    const f = $('#plFav'); f.classList.toggle('fav-on', !!t?.fav); f.innerHTML = ic(t?.fav ? 'heart' : 'heartO'); f.style.visibility = t ? '' : 'hidden';
    $('#tDur').textContent = fmt(t?.duration);
    document.title = t ? `${t.title} · ${t.artist} | Joogle Musicx` : 'Joogle Musicx';
    NP.render(); Deck.refresh();
    if ('mediaSession' in navigator && t) {
      const u = artURL(t);
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: u ? [{ src: u, sizes: '512x512', type: (t.art || albumArtIdx.get(albumKey(t))?.art)?.type || 'image/jpeg' }] : [] }); } catch (_) {}
    }
  }
  function onTrackChange() { refreshNow(); onState(); UI.renderQueue(); }
  function bindSeek(input) {
    input.addEventListener('pointerdown', () => seeking = true);
    input.addEventListener('input', () => {
      seeking = true; setRange(input);
      const t = input.value / 1000 * duration();
      $('#tCur').textContent = fmt(t); const n = $('#npCur'); if (n) n.textContent = fmt(t);
    });
    input.addEventListener('change', () => { seek(input.value / 1000 * duration()); seeking = false; });
  }

  /* ----- Element events ----- */
  els.forEach(el => {
    el.addEventListener('play', onState); el.addEventListener('pause', onState);
    el.addEventListener('ended', () => {
      if (el !== A()) return;
      if (S.repeat === 'one') { el.currentTime = 0; el.play(); } else next({ auto: true });
    });
    el.addEventListener('loadedmetadata', () => {
      if (el !== A()) return;
      const t = T(curId);
      if (t && isFinite(el.duration) && Math.abs((t.duration || 0) - el.duration) > 1) { t.duration = el.duration; saveTrack(t); }
      $('#tDur').textContent = fmt(duration());
    });
    el.addEventListener('timeupdate', () => {
      if (el !== A() || !curId) return;
      const t = T(curId), ct = el.currentTime, d = duration();
      if (t && countedFor !== curId && ct >= Math.min(30, d * .5)) { countedFor = curId; t.plays = (t.plays || 0) + 1; t.lastPlayed = Date.now(); saveTrack(t); }
      const remain = (d - ct) / rate();
      if (S.dj.xfade > 0 && ctx && S.repeat !== 'one' && !loop.on && xfFor !== curId && d > S.dj.xfade * 2 && remain <= S.dj.xfade && remain > 0 &&
        (S.qi + 1 < S.queue.length || S.repeat === 'all')) { xfFor = curId; next({ auto: true, fade: true }); }
      if ('mediaSession' in navigator && d) try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(ct, d), playbackRate: el.playbackRate }); } catch (_) {}
      S.pos = ct;
      if (Date.now() - (el._saved || 0) > 4000) { el._saved = Date.now(); saveNow(); }
    });
    el.addEventListener('error', () => { if (el === A() && el.src) toast('This file format may not be supported by your browser'); });
  });

  /* ----- Frame loop: seek bars, loops, deck visuals ----- */
  function frame() {
    const el = A(), d = duration(), ct = el.currentTime || 0;
    if (loop.on && loop.b > loop.a && ct >= loop.b) el.currentTime = loop.a;
    if (!seeking) {
      const v = d ? ct / d * 1000 : 0;
      const s = $('#seek'); s.value = v; setRange(s); $('#tCur').textContent = fmt(ct);
      const ns = $('#npSeek'); if (ns) { ns.value = v; setRange(ns); $('#npCur').textContent = fmt(ct); }
      $('#mSeekFill').style.width = (v / 10) + '%';
    }
    Deck.frame(ct, d);
    requestAnimationFrame(frame);
  }

  return {
    els, loop, ensureCtx, applyDJ, applyRate, applyVolume, rate, playIndex, playList, toggle, next, prev, seek, duration,
    setShuffle, cycleRepeat, setVolume, toggleMute, insertAt, addToQueue, playNext, removeAt, moveQueue, clearQueue, onRemoved,
    refreshNow, updateModeBtns, bindSeek, frame,
    curId: () => curId, playing: () => !!curId && !A().paused, time: () => A().currentTime || 0, el: A,
    nodes: () => (ctx ? N : null), ctx: () => ctx,
    setNudge(v) { nudge = v; els.forEach(applyRate); }
  };
})();

/* ---------- Player bar wiring ---------- */
(() => {
  Player.bindSeek($('#seek'));
  const v = $('#vol');
  v.addEventListener('input', () => Player.setVolume(v.value / 100));
  v.addEventListener('wheel', e => { e.preventDefault(); Player.setVolume(S.volume - Math.sign(e.deltaY) * .05); }, { passive: false });
})();

/* ---------- Keyboard shortcuts ---------- */
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' && !['range', 'checkbox', 'button'].includes(e.target.type) || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.key === 'Escape') { closeMenu(); if ($('#overlay').classList.contains('open')) closeModal(); else if (NP.isOpen()) NP.close(); else if ($('#app').classList.contains('q-open')) toggleQueue(false); return; }
  if (typing) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); $('#q').select(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if ($('#overlay').classList.contains('open')) return;
  const k = e.key, K = k.toLowerCase();
  const stop = () => e.preventDefault();
  if (k === ' ' || K === 'k') { stop(); Player.toggle(); }
  else if (k === 'ArrowRight') { stop(); e.shiftKey ? Player.next() : Player.seek(Player.time() + 5); }
  else if (k === 'ArrowLeft') { stop(); e.shiftKey ? Player.prev() : Player.seek(Player.time() - 5); }
  else if (k === 'ArrowUp') { stop(); Player.setVolume(S.volume + .05); }
  else if (k === 'ArrowDown') { stop(); Player.setVolume(S.volume - .05); }
  else if (K === 'n') Player.next();
  else if (K === 'p') Player.prev();
  else if (K === 'm') Player.toggleMute();
  else if (K === 's') Player.setShuffle(!S.shuffle);
  else if (K === 'r') Player.cycleRepeat();
  else if (K === 'l') ACTIONS.favCur();
  else if (K === 'q') toggleQueue();
  else if (K === 'f') NP.isOpen() ? NP.close() : NP.open();
  else if (K === 'd') ACTIONS.dj();
  else if (K === 'u') $('#fileIn').click();
  else if (k === '/') { stop(); $('#q').focus(); }
  else if (k === '?') showHelp();
  else if (K === 'c') Deck.cue();
  else if (K === 't') Deck.tap();
  else if (k === '[') Deck.tempoStep(-.1);
  else if (k === ']') Deck.tempoStep(.1);
  else if (k === '\\') Deck.beatLoop(4, true);
  else if (/^Digit[1-4]$/.test(e.code)) { stop(); const i = +e.code.slice(5) - 1; e.shiftKey ? Deck.clearCue(i) : Deck.hotCue(i); }
});

/* ---------- Media keys ---------- */
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession, h = (a, f) => { try { ms.setActionHandler(a, f); } catch (_) {} };
  h('play', () => Player.toggle()); h('pause', () => Player.toggle());
  h('previoustrack', () => Player.prev()); h('nexttrack', () => Player.next());
  h('seekbackward', d => Player.seek(Player.time() - (d.seekOffset || 10)));
  h('seekforward', d => Player.seek(Player.time() + (d.seekOffset || 10)));
  h('seekto', d => Player.seek(d.seekTime));
}
