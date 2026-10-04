/* Joogle Musicx: core (icons, utils, storage, tag parsing, state) */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ICONS = {
  play:'M8 5v14l11-7z', pause:'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  next:'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z', prev:'M6 6h2v12H6zm3.5 6l8.5 6V6z',
  shuffle:'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
  repeat:'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  repeat1:'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
  heart:'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  heartO:'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
  queue:'M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z',
  search:'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  upload:'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  folder:'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  home:'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  music:'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
  person:'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  album:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z',
  genre:'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z',
  history:'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  trending:'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  playlist:'M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z',
  list:'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  plus:'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  more:'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  close:'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  vol:'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  volLow:'M7 9v6h4l5 5V4l-5 5H7z',
  mute:'M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z',
  dj:'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  drag:'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  trash:'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  edit:'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  keyboard:'M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z',
  download:'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  down:'M7 10l5 5 5-5z', up:'M7 14l5-5 5 5z',
  queueNext:'M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z',
  library:'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2z',
  expand:'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
  image:'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  midi:'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-5h1.5v-3h1v3H8v5zm6 0h-4v-5h1.5v-3h1v3H14v5zm6 0h-4v-5h1.5v-3h1v3H20v5zm0-10H4V4h16v6z'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;
function hydrateIcons(root = document) { $$('i[data-ic]', root).forEach(el => { el.outerHTML = ic(el.dataset.ic); }); }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => {
  if (!isFinite(t) || t < 0) t = 0; t = Math.floor(t);
  const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};
const fmtLong = t => { const h = Math.floor(t / 3600), m = Math.round((t % 3600) / 60); return h ? `${h} hr ${m} min` : `${m} min`; };
const fmtBytes = b => b > 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const enc = s => encodeURIComponent(s);

/* ---------- IndexedDB ---------- */
const DB = {
  db: null, ok: false, mem: { tracks: new Map(), blobs: new Map(), playlists: new Map() },
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('joogle-musicx', 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          d.createObjectStore('tracks', { keyPath: 'id' });
          d.createObjectStore('blobs');
          d.createObjectStore('playlists', { keyPath: 'id' });
        };
        r.onsuccess = () => { this.db = r.result; this.ok = true; res(true); };
        r.onerror = r.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode), req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  all(store) { return this.ok ? this.tx(store, 'readonly', s => s.getAll()) : Promise.resolve([...this.mem[store].values()]); },
  get(store, k) { return this.ok ? this.tx(store, 'readonly', s => s.get(k)) : Promise.resolve(this.mem[store].get(k)); },
  put(store, v, k) {
    if (!this.ok) { this.mem[store].set(k ?? v.id, v); return Promise.resolve(); }
    return this.tx(store, 'readwrite', s => k !== undefined ? s.put(v, k) : s.put(v));
  },
  del(store, k) { if (!this.ok) { this.mem[store].delete(k); return Promise.resolve(); } return this.tx(store, 'readwrite', s => s.delete(k)); }
};

/* ---------- Tag parsing (ID3v2 + FLAC) ---------- */
const ID3_GENRES = ['Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop','Jazz','Metal','New Age','Oldies','Other','Pop','R&B','Rap','Reggae','Rock','Techno','Industrial','Alternative','Ska','Death Metal','Pranks','Soundtrack','Euro-Techno','Ambient','Trip-Hop','Vocal','Jazz+Funk','Fusion','Trance','Classical','Instrumental','Acid','House','Game','Sound Clip','Gospel','Noise','Alt. Rock','Bass','Soul','Punk','Space','Meditative','Instrumental Pop','Instrumental Rock','Ethnic','Gothic','Darkwave','Techno-Industrial','Electronic','Pop-Folk','Eurodance','Dream','Southern Rock','Comedy','Cult','Gangsta','Top 40','Christian Rap','Pop/Funk','Jungle','Native American','Cabaret','New Wave','Psychedelic','Rave','Showtunes','Trailer','Lo-Fi','Tribal','Acid Punk','Acid Jazz','Polka','Retro','Musical','Rock & Roll','Hard Rock'];
const syncsafe = (b, p) => ((b[p] & 0x7f) << 21) | ((b[p + 1] & 0x7f) << 14) | ((b[p + 2] & 0x7f) << 7) | (b[p + 3] & 0x7f);
function decodeText(bytes, e) {
  try {
    if (e === 0) return new TextDecoder('latin1').decode(bytes);
    if (e === 1) return new TextDecoder(bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-16le').decode(bytes);
    if (e === 2) return new TextDecoder('utf-16be').decode(bytes);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (_) { return ''; }
}
const cleanText = s => (s || '').replace(/^﻿/, '').split('\0').filter(Boolean)[0]?.trim() || '';
function normGenre(g) {
  if (!g) return '';
  g = g.trim();
  const m = g.match(/^\((\d+)\)(.*)$/);
  if (m) return m[2].trim() || ID3_GENRES[+m[1]] || '';
  if (/^\d+$/.test(g)) return ID3_GENRES[+g] || '';
  return g;
}
function parseID3(b, ver, out) {
  let p = 10;
  if (b[5] & 0x40) p += ver === 4 ? syncsafe(b, p) : ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) + 4;
  const idLen = ver === 2 ? 3 : 4, hl = ver === 2 ? 6 : 10;
  const map = { TIT2: 'title', TT2: 'title', TPE1: 'artist', TP1: 'artist', TALB: 'album', TAL: 'album', TCON: 'genre', TCO: 'genre', TPE2: 'albumArtist', TP2: 'albumArtist', TBPM: 'bpm', TBP: 'bpm', TRCK: 'track', TRK: 'track', TYER: 'year', TDRC: 'year', TYE: 'year', TKEY: 'key', TKE: 'key' };
  while (p + hl < b.length) {
    const id = String.fromCharCode(...b.subarray(p, p + idLen));
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break;
    const sz = ver === 2 ? (b[p + 3] << 16) | (b[p + 4] << 8) | b[p + 5]
      : ver === 4 ? syncsafe(b, p + 4) : ((b[p + 4] << 24) >>> 0) + (b[p + 5] << 16) + (b[p + 6] << 8) + b[p + 7];
    const d = b.subarray(p + hl, p + hl + sz);
    p += hl + sz;
    if (!sz) continue;
    if (map[id]) { if (!out[map[id]]) out[map[id]] = cleanText(decodeText(d.subarray(1), d[0])); }
    else if ((id === 'APIC' || id === 'PIC') && !out.art) {
      const e = d[0]; let i = 1, mime = 'image/jpeg';
      if (id === 'PIC') { mime = String.fromCharCode(d[1], d[2], d[3]).toUpperCase() === 'PNG' ? 'image/png' : 'image/jpeg'; i = 4; }
      else { let j = i; while (j < d.length && d[j] !== 0) j++; mime = String.fromCharCode(...d.subarray(i, j)) || 'image/jpeg'; i = j + 1; }
      if (!mime.includes('/')) mime = 'image/' + mime.toLowerCase().replace('jpg', 'jpeg');
      i++;
      if (e === 1 || e === 2) { while (i + 1 < d.length && !(d[i] === 0 && d[i + 1] === 0)) i += 2; i += 2; }
      else { while (i < d.length && d[i] !== 0) i++; i++; }
      if (i < d.length) out.art = new Blob([d.slice(i)], { type: mime });
    }
  }
}
function parseFLAC(b, out) {
  let p = 4, last = false;
  while (!last && p + 4 <= b.length) {
    const h = b[p]; last = !!(h & 0x80);
    const type = h & 0x7f, len = (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3];
    p += 4;
    const d = b.subarray(p, p + len); p += len;
    if (d.length < len) break;
    const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
    if (type === 4) {
      let i = 0; i += 4 + dv.getUint32(i, true);
      const n = dv.getUint32(i, true); i += 4;
      const td = new TextDecoder();
      const m = { TITLE: 'title', ARTIST: 'artist', ALBUM: 'album', GENRE: 'genre', ALBUMARTIST: 'albumArtist', BPM: 'bpm', TRACKNUMBER: 'track', DATE: 'year', INITIALKEY: 'key', KEY: 'key' };
      for (let k = 0; k < n && i + 4 <= d.length; k++) {
        const l = dv.getUint32(i, true); i += 4;
        const s = td.decode(d.subarray(i, i + l)); i += l;
        const eq = s.indexOf('='); const key = m[s.slice(0, eq).toUpperCase()];
        if (key && !out[key]) out[key] = s.slice(eq + 1);
      }
    } else if (type === 6 && !out.art) {
      let i = 4; const ml = dv.getUint32(i); i += 4;
      const mime = new TextDecoder().decode(d.subarray(i, i + ml)); i += ml;
      i += 4 + dv.getUint32(i) + 16;
      const pl = dv.getUint32(i); i += 4;
      out.art = new Blob([d.slice(i, i + pl)], { type: mime || 'image/jpeg' });
    }
  }
}
async function readTags(file) {
  const out = {};
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const size = syncsafe(head, 6);
      parseID3(new Uint8Array(await file.slice(0, 10 + size).arrayBuffer()), head[3], out);
    } else if (String.fromCharCode(...head.subarray(0, 4)) === 'fLaC') {
      parseFLAC(new Uint8Array(await file.slice(0, Math.min(file.size, 24e6)).arrayBuffer()), out);
    }
  } catch (e) { console.warn('Tag read failed', file.name, e); }
  return out;
}
function probeDuration(blob) {
  return new Promise(res => {
    const a = new Audio(), u = URL.createObjectURL(blob);
    let done = false;
    const fin = v => { if (done) return; done = true; URL.revokeObjectURL(u); a.src = ''; res(v); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => fin(isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => fin(0);
    setTimeout(() => fin(0), 10000);
    a.src = u;
  });
}
function parseName(name) {
  let base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  base = base.replace(/^\d{1,3}\s*[-.)]\s*/, '');
  const parts = base.split(/\s+[-–—]\s+/);
  return parts.length >= 2 ? { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() } : { title: base };
}
const AUDIO_RX = /\.(mp3|m4a|aac|flac|wav|ogg|oga|opus|webm|aiff?|alac|wma)$/i;

/* ---------- State ---------- */
const S = {
  tracks: new Map(), playlists: [],
  queue: [], qi: -1, origQueue: null,
  shuffle: false, repeat: 'off', volume: .8, muted: false,
  view: { name: 'home' }, viewList: [], sort: 'added',
  dj: { low: 0, mid: 0, high: 0, filter: 0, tempo: 0, range: 8, keylock: true, xfade: 0 },
  midiMap: {}, pos: 0
};
const LS_KEY = 'joogle-musicx-state';
function loadSettings() {
  try {
    const o = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    ['queue', 'qi', 'origQueue', 'shuffle', 'repeat', 'volume', 'muted', 'midiMap', 'pos', 'sort'].forEach(k => { if (o[k] !== undefined) S[k] = o[k]; });
    if (o.dj) Object.assign(S.dj, o.dj);
  } catch (_) {}
}
function saveNow() {
  try {
    const { queue, qi, origQueue, shuffle, repeat, volume, muted, midiMap, dj, sort } = S;
    localStorage.setItem(LS_KEY, JSON.stringify({ queue, qi, origQueue, shuffle, repeat, volume, muted, midiMap, dj, sort, pos: window.Player ? Player.time() : S.pos }));
  } catch (_) {}
}
const saveSettings = debounce(saveNow, 400);
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
const saveTrack = t => DB.put('tracks', t).catch(e => console.warn(e));
const savePlaylist = p => DB.put('playlists', p).catch(e => console.warn(e));

/* ---------- Library helpers ---------- */
const T = id => S.tracks.get(id);
const allTracks = () => [...S.tracks.values()];
const artCache = new Map();
let albumArtIdx = new Map();
function rebuildArtIndex() {
  albumArtIdx = new Map();
  for (const t of S.tracks.values()) if (t.art) { const k = albumKey(t); if (!albumArtIdx.has(k)) albumArtIdx.set(k, t); }
}
const albumKey = t => (t.album || '') + '\u0001' + (t.albumArtist || t.artist || '');
function artURL(t) {
  if (!t) return null;
  const src = t.art ? t : albumArtIdx.get(albumKey(t));
  if (!src || !src.art) return null;
  if (!artCache.has(src.id)) artCache.set(src.id, URL.createObjectURL(src.art));
  return artCache.get(src.id);
}
function dropArt(id) { if (artCache.has(id)) { URL.revokeObjectURL(artCache.get(id)); artCache.delete(id); } }
function artHTML(t, cls = '', seed) {
  const u = artURL(t);
  if (u) return `<div class="art ${cls}"><img src="${u}" alt="" loading="lazy" draggable="false"></div>`;
  const h = hash(seed || t?.album || t?.title || 'x') % 360;
  return `<div class="art ph ${cls}" style="--h:${h}">${ic(seed && !t ? 'person' : 'music')}</div>`;
}
function groupBy(field) {
  const m = new Map();
  for (const t of S.tracks.values()) {
    const k = field === 'artist' ? (t.artist || 'Unknown artist') : field === 'album' ? albumKey(t) : (t.genre || 'Unknown genre');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(t);
  }
  return m;
}
const sortAlbum = arr => arr.sort((a, b) => (a.disc || 0) - (b.disc || 0) || (a.trackNo || 0) - (b.trackNo || 0) || a.title.localeCompare(b.title));
const totalDur = ids => ids.reduce((s, id) => s + (T(id)?.duration || 0), 0);
