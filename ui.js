/* Joogle Musicx: interface (routing, views, menus, modals, queue panel, import) */
'use strict';
const UI = {};
const CTX = {}; // named id lists that cards/buttons can play from

/* ---------- Small UI helpers ---------- */
function toast(msg, ms = 2600) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), ms);
}
function modal(html, cls = '') {
  const o = $('#overlay');
  o.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  o.classList.add('open'); hydrateIcons(o);
  const f = o.querySelector('input:not([type=file]),select'); if (f) setTimeout(() => f.focus(), 30);
  return o.firstElementChild;
}
function closeModal() { const o = $('#overlay'); o.classList.remove('open'); o.innerHTML = ''; }
$('#overlay').addEventListener('mousedown', e => { if (e.target.id === 'overlay') closeModal(); });
function askText(title, label, value = '', ok = 'Save') {
  return new Promise(res => {
    const m = modal(`<h2>${esc(title)}</h2><label class="field"><span>${esc(label)}</span><input id="askIn" value="${esc(value)}" maxlength="120"></label>
      <div class="acts"><button class="pill ghost" data-x>Cancel</button><button class="pill primary" data-ok>${esc(ok)}</button></div>`);
    const done = v => { closeModal(); res(v); };
    m.querySelector('[data-x]').onclick = () => done(null);
    m.querySelector('[data-ok]').onclick = () => done(m.querySelector('#askIn').value.trim() || null);
    m.querySelector('#askIn').onkeydown = e => { if (e.key === 'Enter') done(e.target.value.trim() || null); };
  });
}
function confirmBox(title, text, ok = 'Delete') {
  return new Promise(res => {
    const m = modal(`<h2>${esc(title)}</h2><p class="sub" style="line-height:1.5">${esc(text)}</p>
      <div class="acts"><button class="pill ghost" data-x>Cancel</button><button class="pill primary" data-ok>${esc(ok)}</button></div>`);
    m.querySelector('[data-x]').onclick = () => { closeModal(); res(false); };
    m.querySelector('[data-ok]').onclick = () => { closeModal(); res(true); };
    m.querySelector('[data-ok]').focus();
  });
}
function openMenu(anchor, items) {
  const m = $('#menu');
  m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : `<button data-mi="${i}" class="${it.danger ? 'danger' : ''}">${ic(it.icon)}${esc(it.label)}</button>`).join('');
  m.classList.add('open');
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
  const w = m.offsetWidth, h = m.offsetHeight;
  let x = r.right - w, y = r.bottom + 4;
  if (x < 8) x = Math.min(r.left, innerWidth - w - 8);
  if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);
  m.style.left = x + 'px'; m.style.top = y + 'px';
  m.onclick = e => { const b = e.target.closest('[data-mi]'); if (!b) return; closeMenu(); items[+b.dataset.mi].fn(); };
}
function closeMenu() { $('#menu').classList.remove('open'); }
document.addEventListener('mousedown', e => { if (!e.target.closest('#menu') && !e.target.closest('[data-act$="Menu"]')) closeMenu(); });
$('#main').addEventListener('scroll', closeMenu, { passive: true });
function setRange(el) { const p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty('--p', p + '%'); }
function download(blob, name) {
  const u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

/* ---------- Routing ---------- */
function go(name, key) {
  const h = '#/' + name + (key != null ? '/' + enc(key) : '');
  if (location.hash === h) route(); else location.hash = h;
}
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const name = parts[0] || 'home', key = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('/')) : null;
  const prev = S.view.name;
  S.view = { name, key };
  if (name !== 'search' && $('#q').value && prev === 'search') $('#q').value = '';
  renderView(); renderSide(); renderMnav();
  if (prev !== name || name !== 'search') $('#main').scrollTop = 0;
}
window.addEventListener('hashchange', route);

/* ---------- Sidebar + mobile nav ---------- */
function renderSide() {
  const { name, key } = S.view;
  const favs = allTracks().filter(t => t.fav).length;
  const it = (href, icn, lbl, active, count = '', cls = '', extra = '') =>
    `<a class="nav-item ${active ? 'active' : ''} ${cls}" href="${href}" title="${esc(lbl)}" ${extra}>${ic(icn)}<span class="lbl">${esc(lbl)}</span>${count !== '' ? `<span class="count">${count}</span>` : ''}</a>`;
  $('#side').innerHTML =
    it('#/home', 'home', 'Home', name === 'home') +
    it('#/songs', 'music', 'Songs', name === 'songs', S.tracks.size) +
    it('#/artists', 'person', 'Artists', name === 'artists' || name === 'artist') +
    it('#/albums', 'album', 'Albums', name === 'albums' || name === 'album') +
    it('#/genres', 'genre', 'Genres', name === 'genres' || name === 'genre') +
    `<div class="nav-h"><span>Your music</span></div>` +
    it('#/favs', 'heart', 'Favourites', name === 'favs', favs) +
    it('#/recent', 'history', 'Recently played', name === 'recent') +
    it('#/most', 'trending', 'Most played', name === 'most') +
    it('#/dj', 'dj', 'DJ deck', name === 'dj') +
    it('#/playlists', 'list', 'Playlists', name === 'playlists') +
    `<div class="nav-h"><span>Playlists</span><button class="iconbtn" data-act="newPlaylist" title="New playlist">${ic('plus')}</button></div>` +
    (S.playlists.length ? S.playlists.map(p => it('#/playlist/' + enc(p.id), 'list', p.name, name === 'playlist' && key === p.id, p.ids.length, 'pl', `data-pl="${p.id}"`)).join('')
      : `<div class="q-empty nav-item pl" style="height:auto;white-space:normal">Create a playlist, then drag songs onto it.</div>`);
}
function renderMnav() {
  const n = S.view.name;
  const b = (v, icn, lbl, act) => `<button class="${act ? 'active' : ''}" onclick="go('${v}')">${ic(icn)}<span>${lbl}</span></button>`;
  $('#mnav').innerHTML = b('home', 'home', 'Home', n === 'home') +
    b('songs', 'library', 'Library', ['songs', 'artists', 'artist', 'albums', 'album', 'genres', 'genre', 'favs', 'recent', 'most'].includes(n)) +
    b('playlists', 'list', 'Playlists', n === 'playlists' || n === 'playlist') +
    b('dj', 'dj', 'DJ', n === 'dj');
}

/* ---------- Building blocks ---------- */
function libTabs() {
  const n = S.view.name;
  const c = (v, l) => `<a class="chip ${n === v ? 'on' : ''}" href="#/${v}">${l}</a>`;
  return `<div class="chips" style="margin-bottom:18px">${c('songs', 'Songs')}${c('artists', 'Artists')}${c('albums', 'Albums')}${c('genres', 'Genres')}${c('favs', 'Favourites')}${c('recent', 'Recent')}${c('most', 'Most played')}</div>`;
}
function playBtns(ctx, ids) {
  CTX[ctx] = ids;
  if (!ids.length) return '';
  return `<button class="pill primary" data-act="playCtx" data-ctx="${ctx}">${ic('play')}Play</button>
    <button class="pill" data-act="shuffleCtx" data-ctx="${ctx}">${ic('shuffle')}Shuffle</button>
    <button class="pill ghost" data-act="queueCtx" data-ctx="${ctx}">${ic('queue')}Add to queue</button>`;
}
function trackTable(ids, o = {}) {
  ids = ids.filter(id => S.tracks.has(id));
  S.viewList = ids;
  if (!ids.length) return `<div class="q-empty">${o.empty || 'No songs here yet.'}</div>`;
  const cur = Player.curId();
  return `<div class="tracks ${Player.playing() ? '' : 'paused'}">
  <div class="thead"><span style="text-align:center">#</span><span>Title</span><span>${o.plays ? 'Plays' : 'Album'}</span><span class="c-genre">Genre</span><span style="text-align:right">Time</span><span></span><span></span></div>
  ${ids.map((id, i) => {
    const t = T(id);
    return `<div class="row ${id === cur ? 'playing' : ''}" data-row="${i}" data-id="${id}" draggable="true">
    <div class="num">${id === cur ? '<span class="eqbars"><i></i><i></i><i></i></span>' : `<span>${o.trackNos && t.trackNo ? t.trackNo : i + 1}</span>`}${ic('play')}</div>
    <div class="ti">${artHTML(t)}<div style="min-width:0"><div class="rt">${esc(t.title)}</div><div class="ra"><a href="#/artist/${enc(t.artist)}" data-stop>${esc(t.artist)}</a>${o.plays ? '' : ''}</div></div></div>
    <div class="cell">${o.plays ? plural(t.plays || 0, 'play') : `<a href="#/album/${enc(albumKey(t))}" data-stop>${esc(t.album)}</a>`}</div>
    <div class="cell c-genre"><a href="#/genre/${enc(t.genre)}" data-stop>${esc(t.genre)}</a></div>
    <div class="dur">${fmt(t.duration)}</div>
    <button class="iconbtn ${t.fav ? 'fav-on' : ''}" data-act="fav" data-id="${id}" title="Favourite">${ic(t.fav ? 'heart' : 'heartO')}</button>
    <button class="iconbtn" data-act="rowMenu" data-id="${id}" data-i="${i}" title="More options">${ic('more')}</button></div>`;
  }).join('')}</div>`;
}
function mosaic(ids, cls = '') {
  const arts = [...new Set(ids.map(id => artURL(T(id))).filter(Boolean))].slice(0, 4);
  if (arts.length === 4) return `<div class="art mosaic ${cls}">${arts.map(u => `<img src="${u}" alt="">`).join('')}</div>`;
  if (arts.length) return `<div class="art ${cls}"><img src="${arts[0]}" alt=""></div>`;
  return `<div class="art ph ${cls}" style="--h:${hash(ids.join()) % 360}">${ic('list')}</div>`;
}
function trackCards(ctx, ids) {
  CTX[ctx] = ids;
  return ids.map((id, i) => { const t = T(id); return `<div class="card" data-act="playCard" data-ctx="${ctx}" data-i="${i}">${artHTML(t)}<div class="t">${esc(t.title)}</div><div class="s">${esc(t.artist)}</div><span class="fab">${ic('play')}</span></div>`; }).join('');
}
function albumCards(groups) {
  return groups.map(([k, ts]) => { const t = ts[0]; CTX['al:' + k] = sortAlbum([...ts]).map(x => x.id);
    return `<div class="card" data-href="#/album/${enc(k)}">${artHTML(t)}<div class="t">${esc(t.album)}</div><div class="s">${esc(t.albumArtist || t.artist)} · ${plural(ts.length, 'song')}</div><button class="fab" data-act="playCtx" data-ctx="${esc('al:' + k)}" title="Play">${ic('play')}</button></div>`; }).join('');
}
function artistCards(groups) {
  return groups.map(([k, ts]) => { const withArt = ts.find(t => artURL(t)) || null; CTX['ar:' + k] = ts.map(x => x.id);
    return `<div class="card round" data-href="#/artist/${enc(k)}">${artHTML(withArt, '', k)}<div class="t">${esc(k)}</div><div class="s">${plural(ts.length, 'song')}</div><button class="fab" data-act="playCtx" data-ctx="${esc('ar:' + k)}" title="Play">${ic('play')}</button></div>`; }).join('');
}
function emptyLibrary() {
  return `<div class="empty" data-act="upload"><div class="big">${ic('music')}</div><h2>Your library is empty</h2>
  <p>Drop audio files anywhere on this page, or upload songs and folders. MP3, FLAC, M4A, WAV and OGG are supported. Everything stays on this device and survives page reloads.</p>
  <div class="row-btns"><button class="pill primary" data-act="upload">${ic('upload')}Upload songs</button><button class="pill" data-act="uploadFolder">${ic('folder')}Upload a folder</button></div></div>`;
}
function hero({ kind, title, meta, art, round, acts }) {
  return `<div class="hero ${round ? 'round' : ''}">${art}<div style="min-width:0"><div class="kind">${kind}</div><h1>${esc(title)}</h1><div class="meta">${meta}</div><div class="acts">${acts}</div></div></div>`;
}

/* ---------- Views ---------- */
const VIEWS = {
  home() {
    const ts = allTracks();
    const head = `<div class="greet"><div><h1 class="h1">${greeting()}, <span>let's play something.</span></h1><div class="sub">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      ${ts.length ? `<div class="acts" style="display:flex;gap:10px">${playBtns('all', ts.map(t => t.id)).split('</button>').slice(0, 2).join('</button>')}</button></div>` : ''}</div>`;
    if (!ts.length) return head + emptyLibrary();
    const artists = groupBy('artist').size, albums = groupBy('album').size;
    const recent = ts.filter(t => t.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 12).map(t => t.id);
    const most = ts.filter(t => t.plays).sort((a, b) => b.plays - a.plays).slice(0, 5).map(t => t.id);
    const added = [...groupBy('album').entries()].sort((a, b) => Math.max(...b[1].map(t => t.addedAt)) - Math.max(...a[1].map(t => t.addedAt))).slice(0, 12);
    const favs = ts.filter(t => t.fav).slice(0, 12).map(t => t.id);
    return head + `<div class="stats">
      <div class="stat" style="--c:var(--blueS)"><b>${ts.length}</b><span>Songs</span></div>
      <div class="stat" style="--c:var(--red)"><b>${artists}</b><span>Artists</span></div>
      <div class="stat" style="--c:var(--yellow)"><b>${albums}</b><span>Albums</span></div>
      <div class="stat" style="--c:var(--green)"><b>${fmtLong(ts.reduce((s, t) => s + (t.duration || 0), 0))}</b><span>Of music</span></div></div>
      ${recent.length ? `<div class="h2">Jump back in <a class="more" href="#/recent">See all</a></div><div class="shelf">${trackCards('recentShelf', recent)}</div>` : ''}
      ${most.length ? `<div class="h2">Your most played <a class="more" href="#/most">See all</a></div>${trackTable(most, { plays: true })}` : ''}
      ${favs.length ? `<div class="h2">Favourites <a class="more" href="#/favs">See all</a></div><div class="shelf">${trackCards('favShelf', favs)}</div>` : ''}
      <div class="h2">Recently added albums <a class="more" href="#/albums">All albums</a></div><div class="shelf">${albumCards(added)}</div>
      ${S.playlists.length ? `<div class="h2">Your playlists</div><div class="shelf">${S.playlists.map(p => `<div class="card" data-href="#/playlist/${enc(p.id)}">${mosaic(p.ids)}<div class="t">${esc(p.name)}</div><div class="s">${plural(p.ids.length, 'song')}</div></div>`).join('')}</div>` : ''}`;
  },
  songs() {
    const ts = allTracks();
    if (!ts.length) return `<h1 class="h1">Songs</h1>${libTabs()}${emptyLibrary()}`;
    const s = S.sort, cmp = {
      added: (a, b) => b.addedAt - a.addedAt, title: (a, b) => a.title.localeCompare(b.title),
      artist: (a, b) => a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album) || (a.trackNo || 0) - (b.trackNo || 0),
      album: (a, b) => a.album.localeCompare(b.album) || (a.trackNo || 0) - (b.trackNo || 0),
      duration: (a, b) => b.duration - a.duration, plays: (a, b) => (b.plays || 0) - (a.plays || 0)
    }[s] || ((a, b) => b.addedAt - a.addedAt);
    const ids = ts.sort(cmp).map(t => t.id);
    return `<h1 class="h1">Songs</h1>${libTabs()}<div class="toolbar">${playBtns('songs', ids)}
      <select class="select" style="margin-left:auto" onchange="S.sort=this.value;saveSettings();renderView()" aria-label="Sort">
      ${[['added', 'Recently added'], ['title', 'Title'], ['artist', 'Artist'], ['album', 'Album'], ['duration', 'Length'], ['plays', 'Play count']].map(([v, l]) => `<option value="${v}" ${v === s ? 'selected' : ''}>Sort: ${l}</option>`).join('')}</select></div>
      <div class="sub" style="margin:4px 0 8px">${plural(ids.length, 'song')} · ${fmtLong(totalDur(ids))}</div>${trackTable(ids)}`;
  },
  artists() {
    const g = [...groupBy('artist').entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return `<h1 class="h1">Artists</h1>${libTabs()}${g.length ? `<div class="grid">${artistCards(g)}</div>` : emptyLibrary()}`;
  },
  artist(k) {
    const ts = allTracks().filter(t => t.artist === k);
    if (!ts.length) return `<h1 class="h1">Artist not found</h1>`;
    const albums = [...groupBy('album').entries()].filter(([, a]) => a.some(t => t.artist === k));
    const ids = ts.sort((a, b) => a.album.localeCompare(b.album) || (a.trackNo || 0) - (b.trackNo || 0)).map(t => t.id);
    return hero({ kind: 'Artist', title: k, round: true, art: artHTML(ts.find(t => artURL(t)), '', k),
      meta: `${plural(ts.length, 'song')} · ${plural(albums.length, 'album')} · ${fmtLong(totalDur(ids))}`, acts: playBtns('artist', ids) }) +
      (albums.length > 1 ? `<div class="h2">Albums</div><div class="shelf">${albumCards(albums)}</div><div class="h2">All songs</div>` : '') + trackTable(ids);
  },
  albums() {
    const g = [...groupBy('album').entries()].sort((a, b) => a[1][0].album.localeCompare(b[1][0].album));
    return `<h1 class="h1">Albums</h1>${libTabs()}${g.length ? `<div class="grid">${albumCards(g)}</div>` : emptyLibrary()}`;
  },
  album(k) {
    const ts = sortAlbum(groupBy('album').get(k) || []);
    if (!ts.length) return `<h1 class="h1">Album not found</h1>`;
    const t = ts[0], ids = ts.map(x => x.id), genres = [...new Set(ts.map(x => x.genre))];
    return hero({ kind: 'Album', title: t.album, art: artHTML(t),
      meta: `<a href="#/artist/${enc(t.albumArtist || t.artist)}">${esc(t.albumArtist || t.artist)}</a>${t.year ? ' · ' + esc(t.year).slice(0, 4) : ''} · ${genres.map(g => `<a href="#/genre/${enc(g)}">${esc(g)}</a>`).join(', ')} · ${plural(ts.length, 'song')} · ${fmtLong(totalDur(ids))}`,
      acts: playBtns('album', ids) + `<button class="pill ghost" data-act="editAlbum" data-key="${esc(k)}">${ic('edit')}Edit album</button>` }) + trackTable(ids, { trackNos: true });
  },
  genres() {
    const g = [...groupBy('genre').entries()].sort((a, b) => b[1].length - a[1].length);
    return `<h1 class="h1">Genres</h1>${libTabs()}${g.length ? `<div class="grid">${g.map(([k, ts]) => `<a class="genre-card" href="#/genre/${enc(k)}" style="--h:${hash(k) % 360}"><b>${esc(k)}</b><span>${plural(ts.length, 'song')} · ${plural(new Set(ts.map(t => t.artist)).size, 'artist')}</span></a>`).join('')}</div>` : emptyLibrary()}`;
  },
  genre(k) {
    const ts = allTracks().filter(t => t.genre === k).sort((a, b) => a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album) || (a.trackNo || 0) - (b.trackNo || 0));
    const ids = ts.map(t => t.id);
    return hero({ kind: 'Genre', title: k, art: `<div class="art ph" style="--h:${hash(k) % 360}">${ic('genre')}</div>`,
      meta: `${plural(ts.length, 'song')} · ${plural(new Set(ts.map(t => t.artist)).size, 'artist')} · ${fmtLong(totalDur(ids))}`, acts: playBtns('genre', ids) }) + trackTable(ids);
  },
  favs() {
    const ids = allTracks().filter(t => t.fav).sort((a, b) => (b.favAt || 0) - (a.favAt || 0)).map(t => t.id);
    return `<h1 class="h1">Favourites</h1>${libTabs()}<div class="toolbar">${playBtns('favs', ids)}</div>${trackTable(ids, { empty: 'Tap the heart on any song (or press L while it plays) to save it here.' })}`;
  },
  recent() {
    const ids = allTracks().filter(t => t.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 100).map(t => t.id);
    return `<h1 class="h1">Recently played</h1>${libTabs()}<div class="toolbar">${playBtns('recent', ids)}</div>${trackTable(ids, { empty: 'Songs you play will show up here.' })}`;
  },
  most() {
    const ids = allTracks().filter(t => t.plays).sort((a, b) => b.plays - a.plays || b.lastPlayed - a.lastPlayed).slice(0, 100).map(t => t.id);
    return `<h1 class="h1">Most played</h1>${libTabs()}<div class="toolbar">${playBtns('most', ids)}</div>${trackTable(ids, { plays: true, empty: 'Play some music and your top tracks will rank here.' })}`;
  },
  playlists() {
    return `<h1 class="h1">Playlists</h1><div class="sub">${plural(S.playlists.length, 'playlist')}</div><div class="grid" style="margin-top:20px">
      <div class="card" data-act="newPlaylist"><div class="art ph" style="--h:210">${ic('plus')}</div><div class="t">New playlist</div><div class="s">Start a fresh mix</div></div>
      ${S.playlists.map(p => `<div class="card" data-href="#/playlist/${enc(p.id)}">${mosaic(p.ids)}<div class="t">${esc(p.name)}</div><div class="s">${plural(p.ids.length, 'song')}</div></div>`).join('')}</div>`;
  },
  playlist(id) {
    const p = S.playlists.find(x => x.id === id);
    if (!p) return `<h1 class="h1">Playlist not found</h1>`;
    const ids = p.ids.filter(i => S.tracks.has(i));
    return hero({ kind: 'Playlist', title: p.name, art: mosaic(ids),
      meta: `${plural(ids.length, 'song')} · ${fmtLong(totalDur(ids))}`,
      acts: playBtns('playlist', ids) + `<button class="pill ghost" data-act="plMenu" data-id="${p.id}">${ic('more')}More</button>` }) +
      trackTable(ids, { empty: 'Add songs from their ⋯ menu, or drag them onto this playlist in the sidebar.' });
  },
  search(q) {
    q = (q || '').trim(); const ql = q.toLowerCase();
    if (!ql) return `<h1 class="h1">Search</h1><div class="sub">Type to search your library.</div>`;
    const words = ql.split(/\s+/);
    const hit = s => { s = (s || '').toLowerCase(); return words.every(w => s.includes(w)); };
    const ts = allTracks().filter(t => hit([t.title, t.artist, t.album, t.genre, t.albumArtist].join(' ')))
      .sort((a, b) => (b.title.toLowerCase().startsWith(ql) - a.title.toLowerCase().startsWith(ql)) || (b.plays || 0) - (a.plays || 0));
    const ar = [...groupBy('artist').entries()].filter(([k]) => hit(k)).slice(0, 12);
    const al = [...groupBy('album').entries()].filter(([, v]) => hit(v[0].album + ' ' + (v[0].albumArtist || v[0].artist))).slice(0, 12);
    const ge = [...groupBy('genre').keys()].filter(hit);
    const pl = S.playlists.filter(p => hit(p.name));
    if (!ts.length && !ar.length && !al.length && !ge.length && !pl.length) return `<h1 class="h1">No results for “${esc(q)}”</h1><div class="sub">Check the spelling or try a different word.</div>`;
    return `<h1 class="h1">Results for “${esc(q)}”</h1>
      ${ge.length || pl.length ? `<div class="chips" style="margin-top:14px">${ge.map(g => `<a class="chip" href="#/genre/${enc(g)}">${ic('genre')}${esc(g)}</a>`).join('')}${pl.map(p => `<a class="chip" href="#/playlist/${enc(p.id)}">${ic('list')}${esc(p.name)}</a>`).join('')}</div>` : ''}
      ${ts.length ? `<div class="h2">Songs <span class="sub" style="font-weight:400;font-size:14px">${ts.length}</span></div>${trackTable(ts.slice(0, 60).map(t => t.id))}` : ''}
      ${ar.length ? `<div class="h2">Artists</div><div class="shelf">${artistCards(ar)}</div>` : ''}
      ${al.length ? `<div class="h2">Albums</div><div class="shelf">${albumCards(al)}</div>` : ''}`;
  },
  dj() { return Deck.html(); }
};
function renderView() {
  const { name, key } = S.view;
  const fn = VIEWS[name] || VIEWS.home;
  const v = $('#view');
  if (name !== 'dj') Deck.unmount();
  v.innerHTML = `<div class="view">${fn(key)}</div>`;
  if (name === 'dj') Deck.mount();
}
UI.renderView = renderView;
UI.markPlaying = () => {
  const cur = Player.curId(), playing = Player.playing();
  $$('.tracks').forEach(t => t.classList.toggle('paused', !playing));
  $$('.row').forEach(r => {
    const on = r.dataset.id === cur, was = r.classList.contains('playing');
    if (on === was) return;
    r.classList.toggle('playing', on);
    const n = r.querySelector('.num');
    n.innerHTML = (on ? '<span class="eqbars"><i></i><i></i><i></i></span>' : `<span>${+r.dataset.row + 1}</span>`) + ic('play');
  });
  $$('.q-item').forEach(q => q.classList.toggle('now', +q.dataset.qi === S.qi));
};

/* ---------- Queue panel ---------- */
UI.renderQueue = function () {
  const el = $('#queue');
  const open = $('#app').classList.contains('q-open');
  $('#btnQueue').classList.toggle('on', open);
  if (!open) return;
  const q = S.queue, qi = S.qi;
  const item = (i, cls = '') => { const t = T(q[i]); if (!t) return '';
    return `<div class="q-item ${cls} ${i === qi ? 'now' : ''}" data-qi="${i}" draggable="${i !== qi}">
      ${i !== qi ? `<span class="drag" title="Drag to reorder">${ic('drag')}</span>` : ''}${artHTML(t)}
      <div class="m"><b>${esc(t.title)}</b><span>${esc(t.artist)} · ${fmt(t.duration)}</span></div>
      ${i !== qi ? `<button class="iconbtn" data-act="qMenu" data-qi="${i}" title="Options">${ic('more')}</button><button class="iconbtn" data-act="qRemove" data-qi="${i}" title="Remove">${ic('close')}</button>` : ''}</div>`; };
  const upNext = []; for (let i = qi + 1; i < q.length; i++) upNext.push(i);
  const earlier = []; for (let i = 0; i < qi; i++) earlier.push(i);
  el.innerHTML = `<div class="q-head"><h3>Queue</h3><div style="display:flex;gap:4px">
      <button class="pill ghost" style="height:32px;font-size:13px;padding:0 12px" data-act="clearQueue">Clear</button>
      <button class="iconbtn sm" data-act="queue" title="Close">${ic('close')}</button></div></div>
    <div class="q-body" id="qBody">
      ${qi >= 0 && q[qi] ? `<div class="q-label">Now playing</div>${item(qi)}` : `<div class="q-empty">Nothing playing. Pick a song to start a queue.</div>`}
      <div class="q-label"><span>Up next</span><span>${upNext.length ? plural(upNext.length, 'song') + ' · ' + fmtLong(upNext.reduce((s, i) => s + (T(q[i])?.duration || 0), 0)) : ''}</span></div>
      ${upNext.length ? upNext.map(i => item(i)).join('') : `<div class="q-empty">${S.repeat === 'all' && earlier.length ? 'Repeat is on, so the queue starts over below.' : 'Add songs with “Add to queue” or drag them here.'}</div>`}
      ${earlier.length ? `<div class="q-label"><span>${S.repeat === 'all' ? 'Then, from the top' : 'Played earlier'}</span></div><div style="opacity:.6">${earlier.map(i => item(i)).join('')}</div>` : ''}
      <div style="height:30px" data-qdrop="end"></div></div>`;
};
function toggleQueue(force) {
  const a = $('#app'); const on = force ?? !a.classList.contains('q-open');
  a.classList.toggle('q-open', on); UI.renderQueue();
}
// queue drag & drop (reorder + drop songs from lists)
let dragQi = null;
$('#queue').addEventListener('dragstart', e => { const it = e.target.closest('.q-item'); if (!it) return; dragQi = +it.dataset.qi; it.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'q'); });
$('#queue').addEventListener('dragend', () => { dragQi = null; $$('.q-item').forEach(x => x.classList.remove('dragging', 'over-top', 'over-bot')); });
$('#queue').addEventListener('dragover', e => {
  if (dragQi === null && !dragTrack) return;
  e.preventDefault();
  $$('.q-item').forEach(x => x.classList.remove('over-top', 'over-bot'));
  const it = e.target.closest('.q-item'); if (!it) return;
  const r = it.getBoundingClientRect(); it.classList.add(e.clientY < r.top + r.height / 2 ? 'over-top' : 'over-bot');
});
$('#queue').addEventListener('drop', e => {
  e.preventDefault();
  const it = e.target.closest('.q-item');
  let to = S.queue.length;
  if (it) { const r = it.getBoundingClientRect(); to = +it.dataset.qi + (e.clientY < r.top + r.height / 2 ? 0 : 1); }
  if (dragQi !== null) Player.moveQueue(dragQi, to);
  else if (dragTrack) { Player.insertAt([dragTrack], Math.max(to, S.qi + 1)); toast('Added to queue'); }
  dragQi = null; dragTrack = null;
});
// drag songs from lists onto sidebar playlists / queue
let dragTrack = null;
document.addEventListener('dragstart', e => { const r = e.target.closest?.('.row'); if (r) { dragTrack = r.dataset.id; e.dataTransfer.setData('text/plain', 'track'); e.dataTransfer.effectAllowed = 'copy'; } });
document.addEventListener('dragend', () => { dragTrack = null; $$('.drop-ok').forEach(x => x.classList.remove('drop-ok')); });
$('#side').addEventListener('dragover', e => { const p = e.target.closest('[data-pl]'); if (p && dragTrack) { e.preventDefault(); $$('.drop-ok').forEach(x => x.classList.remove('drop-ok')); p.classList.add('drop-ok'); } });
$('#side').addEventListener('drop', e => { const p = e.target.closest('[data-pl]'); if (p && dragTrack) { e.preventDefault(); addToPlaylist(p.dataset.pl, [dragTrack]); } dragTrack = null; });

/* ---------- Library operations ---------- */
async function importFiles(files) {
  const list = [...files].filter(f => (f.type || '').startsWith('audio/') || AUDIO_RX.test(f.name));
  if (!list.length) return toast('No audio files found there');
  const box = document.createElement('div'); box.className = 'progress';
  box.innerHTML = `<div id="pTxt">Adding songs…</div><div class="bar"><i id="pBar"></i></div>`;
  document.body.appendChild(box);
  const known = new Set(allTracks().map(t => t.fileName + '|' + t.size));
  let added = 0, skipped = 0;
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    box.querySelector('#pTxt').textContent = `Adding ${i + 1} of ${list.length}: ${f.name}`;
    box.querySelector('#pBar').style.width = (i / list.length * 100) + '%';
    if (known.has(f.name + '|' + f.size)) { skipped++; continue; }
    try {
      const [tags, dur] = await Promise.all([readTags(f), probeDuration(f)]);
      const fn = parseName(f.name);
      const folder = (f.webkitRelativePath || '').split('/').slice(-2, -1)[0];
      const t = {
        id: uid(), title: tags.title || fn.title || f.name, artist: tags.artist || tags.albumArtist || fn.artist || 'Unknown artist',
        albumArtist: tags.albumArtist || '', album: tags.album || folder || 'Unknown album', genre: normGenre(tags.genre) || 'Unknown genre',
        year: (tags.year || '').slice(0, 4), trackNo: parseInt(tags.track) || 0, bpm: Math.round(parseFloat(tags.bpm) * 10) / 10 || 0, key: tags.key || '',
        duration: dur, art: tags.art || null, fileName: f.name, size: f.size, mime: f.type, addedAt: Date.now() + i,
        plays: 0, lastPlayed: 0, fav: false, cues: [null, null, null, null], mainCue: 0
      };
      await DB.put('blobs', f, t.id);
      await DB.put('tracks', t);
      S.tracks.set(t.id, t); known.add(f.name + '|' + f.size); added++;
    } catch (e) { console.error(e); toast('Could not add ' + f.name); if (/quota/i.test(String(e))) { toast('Storage is full'); break; } }
  }
  box.remove();
  rebuildArtIndex(); renderView(); renderSide(); updateStorage();
  toast(`Added ${plural(added, 'song')}${skipped ? ` · ${skipped} already in library` : ''}`);
}
async function removeTracks(ids) {
  for (const id of ids) {
    S.tracks.delete(id); dropArt(id);
    await DB.del('tracks', id); await DB.del('blobs', id);
  }
  const set = new Set(ids);
  for (const p of S.playlists) { const n = p.ids.length; p.ids = p.ids.filter(i => !set.has(i)); if (p.ids.length !== n) savePlaylist(p); }
  Player.onRemoved(set);
  rebuildArtIndex(); renderView(); renderSide(); updateStorage();
}
async function toggleFav(id) {
  const t = T(id); if (!t) return;
  t.fav = !t.fav; t.favAt = Date.now(); saveTrack(t);
  $$(`[data-act="fav"][data-id="${id}"]`).forEach(b => { b.classList.toggle('fav-on', t.fav); b.innerHTML = ic(t.fav ? 'heart' : 'heartO'); });
  Player.refreshNow(); renderSide();
  if (S.view.name === 'favs') renderView();
  toast(t.fav ? 'Added to Favourites' : 'Removed from Favourites', 1600);
}
async function newPlaylist(ids = []) {
  const name = await askText('New playlist', 'Name', `My playlist #${S.playlists.length + 1}`, 'Create');
  if (!name) return null;
  const p = { id: uid(), name, ids: [...ids], createdAt: Date.now() };
  S.playlists.push(p); await savePlaylist(p); renderSide();
  if (['playlists', 'home'].includes(S.view.name)) renderView();
  toast(ids.length ? `Created “${name}” with ${plural(ids.length, 'song')}` : `Created “${name}”`);
  return p;
}
function addToPlaylist(pid, ids) {
  const p = S.playlists.find(x => x.id === pid); if (!p) return;
  const fresh = ids.filter(i => !p.ids.includes(i));
  p.ids.push(...fresh); savePlaylist(p); renderSide();
  if (S.view.name === 'playlist' && S.view.key === pid) renderView();
  toast(fresh.length ? `Added ${fresh.length === 1 ? 'to' : plural(fresh.length, 'song') + ' to'} “${p.name}”` : `Already in “${p.name}”`);
}
function pickPlaylist(ids) {
  const m = modal(`<h2>Add to playlist</h2><div class="pick-list">
    <button data-new>${ic('plus')}<b>New playlist</b></button>
    ${S.playlists.map(p => `<button data-pid="${p.id}">${mosaic(p.ids, '')}<span>${esc(p.name)} <span class="sub">· ${p.ids.length}</span></span></button>`).join('')}</div>
    <div class="acts"><button class="pill ghost" data-x>Cancel</button></div>`);
  $$('.pick-list .art', m).forEach(a => { a.style.cssText += ';width:40px;height:40px;border-radius:8px'; });
  m.querySelector('[data-x]').onclick = closeModal;
  m.querySelector('[data-new]').onclick = () => { closeModal(); newPlaylist(ids); };
  $$('[data-pid]', m).forEach(b => b.onclick = () => { closeModal(); addToPlaylist(b.dataset.pid, ids); });
}
function exportM3U(p) {
  const lines = ['#EXTM3U', '#PLAYLIST:' + p.name];
  p.ids.map(T).filter(Boolean).forEach(t => { lines.push(`#EXTINF:${Math.round(t.duration)},${t.artist} - ${t.title}`); lines.push(t.fileName); });
  download(new Blob([lines.join('\r\n')], { type: 'audio/x-mpegurl' }), p.name.replace(/[\\/:*?"<>|]/g, '_') + '.m3u');
  toast('Exported. Put it in the same folder as the music files, then import it in Mixxx.', 4200);
}
function editTrack(id) {
  const t = T(id); if (!t) return;
  let newArt;
  const m = modal(`<h2>Edit song info</h2>
    <div class="edit-art"><div id="eaPrev">${artHTML(t)}</div><div style="display:flex;gap:8px;flex-wrap:wrap">
      <label class="pill" style="cursor:pointer">${ic('image')}Change artwork<input type="file" accept="image/*" hidden id="eaIn"></label>
      ${t.art ? `<button class="pill ghost" id="eaRm">Remove</button>` : ''}</div></div>
    <label class="field"><span>Title</span><input id="eTitle" value="${esc(t.title)}"></label>
    <div class="two"><label class="field"><span>Artist</span><input id="eArtist" value="${esc(t.artist)}" list="dlArtists"></label>
    <label class="field"><span>Album artist</span><input id="eAA" value="${esc(t.albumArtist)}" list="dlArtists"></label></div>
    <div class="two"><label class="field"><span>Album</span><input id="eAlbum" value="${esc(t.album)}" list="dlAlbums"></label>
    <label class="field"><span>Genre</span><input id="eGenre" value="${esc(t.genre)}" list="dlGenres"></label></div>
    <div class="two"><label class="field"><span>Track number</span><input id="eNo" type="number" min="0" value="${t.trackNo || ''}"></label>
    <label class="field"><span>Year</span><input id="eYear" value="${esc(t.year)}" maxlength="4"></label></div>
    <div class="two"><label class="field"><span>BPM</span><input id="eBpm" type="number" step="0.1" min="0" value="${t.bpm || ''}"></label>
    <label class="field"><span>Key</span><input id="eKey" value="${esc(t.key)}" placeholder="e.g. 8A or Am"></label></div>
    <datalist id="dlArtists">${[...groupBy('artist').keys()].map(k => `<option value="${esc(k)}">`).join('')}</datalist>
    <datalist id="dlAlbums">${[...new Set(allTracks().map(x => x.album))].map(k => `<option value="${esc(k)}">`).join('')}</datalist>
    <datalist id="dlGenres">${[...groupBy('genre').keys(), ...ID3_GENRES.slice(0, 40)].map(k => `<option value="${esc(k)}">`).join('')}</datalist>
    <div class="acts"><button class="pill ghost" data-x>Cancel</button><button class="pill primary" data-ok>Save</button></div>`, 'wide');
  m.querySelector('#eaIn').onchange = e => { const f = e.target.files[0]; if (!f) return; newArt = f; m.querySelector('#eaPrev').innerHTML = `<div class="art"><img src="${URL.createObjectURL(f)}" alt=""></div>`; };
  const rm = m.querySelector('#eaRm'); if (rm) rm.onclick = () => { newArt = null; m.querySelector('#eaPrev').innerHTML = `<div class="art ph" style="--h:200">${ic('music')}</div>`; };
  m.querySelector('[data-x]').onclick = closeModal;
  m.querySelector('[data-ok]').onclick = () => {
    const v = s => m.querySelector(s).value.trim();
    Object.assign(t, { title: v('#eTitle') || t.title, artist: v('#eArtist') || 'Unknown artist', albumArtist: v('#eAA'), album: v('#eAlbum') || 'Unknown album',
      genre: v('#eGenre') || 'Unknown genre', trackNo: parseInt(v('#eNo')) || 0, year: v('#eYear'), bpm: parseFloat(v('#eBpm')) || 0, key: v('#eKey') });
    if (newArt !== undefined) { t.art = newArt ? new Blob([newArt], { type: newArt.type }) : null; dropArt(t.id); }
    saveTrack(t); rebuildArtIndex(); closeModal(); renderView(); Player.refreshNow(); toast('Saved');
  };
}
function editAlbum(key) {
  const ts = groupBy('album').get(key) || []; if (!ts.length) return;
  const t = ts[0]; let newArt;
  const m = modal(`<h2>Edit album</h2><p class="sub" style="margin-bottom:14px">Changes apply to all ${ts.length} songs on this album.</p>
    <div class="edit-art"><div id="eaPrev">${artHTML(t)}</div><label class="pill" style="cursor:pointer">${ic('image')}Change artwork<input type="file" accept="image/*" hidden id="eaIn"></label></div>
    <label class="field"><span>Album</span><input id="eAlbum" value="${esc(t.album)}"></label>
    <div class="two"><label class="field"><span>Album artist</span><input id="eAA" value="${esc(t.albumArtist || t.artist)}"></label>
    <label class="field"><span>Genre</span><input id="eGenre" value="${esc(t.genre)}"></label></div>
    <label class="field"><span>Year</span><input id="eYear" value="${esc(t.year)}" maxlength="4"></label>
    <div class="acts"><button class="pill ghost danger" data-del>${ic('trash')}Delete album</button><span style="flex:1"></span><button class="pill ghost" data-x>Cancel</button><button class="pill primary" data-ok>Save</button></div>`);
  m.querySelector('#eaIn').onchange = e => { const f = e.target.files[0]; if (!f) return; newArt = f; m.querySelector('#eaPrev').innerHTML = `<div class="art"><img src="${URL.createObjectURL(f)}" alt=""></div>`; };
  m.querySelector('[data-x]').onclick = closeModal;
  m.querySelector('[data-del]').onclick = async () => { closeModal(); if (await confirmBox('Delete album?', `This removes ${plural(ts.length, 'song')} from your library on this device.`)) { await removeTracks(ts.map(x => x.id)); go('albums'); } };
  m.querySelector('[data-ok]').onclick = () => {
    const v = s => m.querySelector(s).value.trim();
    const al = v('#eAlbum') || t.album, aa = v('#eAA'), ge = v('#eGenre') || t.genre, yr = v('#eYear');
    ts.forEach(x => { x.album = al; x.albumArtist = aa; x.genre = ge; x.year = yr; if (newArt) { x.art = new Blob([newArt], { type: newArt.type }); dropArt(x.id); } saveTrack(x); });
    rebuildArtIndex(); closeModal(); Player.refreshNow(); toast('Album updated');
    go('album', albumKey(ts[0]));
  };
}
function rowMenu(btn, id) {
  const t = T(id); const inPl = S.view.name === 'playlist' ? S.playlists.find(p => p.id === S.view.key) : null;
  openMenu(btn, [
    { icon: 'queueNext', label: 'Play next', fn: () => { Player.playNext([id]); toast('Playing next'); } },
    { icon: 'queue', label: 'Add to queue', fn: () => { Player.addToQueue([id]); toast('Added to queue'); } },
    { icon: 'playlist', label: 'Add to playlist…', fn: () => pickPlaylist([id]) },
    ...(inPl ? [{ icon: 'close', label: 'Remove from this playlist', fn: () => { inPl.ids = inPl.ids.filter(x => x !== id); savePlaylist(inPl); renderView(); renderSide(); } }] : []),
    '-',
    { icon: 'person', label: 'Go to artist', fn: () => go('artist', t.artist) },
    { icon: 'album', label: 'Go to album', fn: () => go('album', albumKey(t)) },
    { icon: 'edit', label: 'Edit info', fn: () => editTrack(id) },
    { icon: 'download', label: 'Download file', fn: async () => { const b = await getBlob(id); if (b) download(b, t.fileName); } },
    '-',
    { icon: 'trash', label: 'Delete from library', danger: true, fn: async () => { if (await confirmBox('Delete song?', `“${t.title}” will be removed from this device.`)) removeTracks([id]); } }
  ]);
}
function plMenu(btn, pid) {
  const p = S.playlists.find(x => x.id === pid); if (!p) return;
  openMenu(btn, [
    { icon: 'edit', label: 'Rename', fn: async () => { const n = await askText('Rename playlist', 'Name', p.name); if (n) { p.name = n; savePlaylist(p); renderView(); renderSide(); } } },
    { icon: 'download', label: 'Export .m3u (for Mixxx)', fn: () => exportM3U(p) },
    { icon: 'trash', label: 'Delete playlist', danger: true, fn: async () => { if (await confirmBox('Delete playlist?', `“${p.name}” will be deleted. The songs stay in your library.`)) { S.playlists = S.playlists.filter(x => x !== p); await DB.del('playlists', p.id); renderSide(); go('playlists'); } } }
  ]);
}
async function getBlob(id) { try { return await DB.get('blobs', id); } catch (_) { return null; } }
async function updateStorage() {
  let txt = `${plural(S.tracks.size, 'song')}`;
  try {
    if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); txt += ` · ${fmtBytes(e.usage || 0)} stored on this device`; }
    if (navigator.storage?.persisted && await navigator.storage.persisted()) txt += ' · persistent';
  } catch (_) {}
  if (!DB.ok) txt += ' · storage unavailable, songs will not survive a reload';
  $('#storageInfo').textContent = txt;
}

function showHelp() {
  const k = [['Space / K', 'Play or pause'], ['← / →', 'Seek 5 seconds'], ['Shift + ← / →', 'Previous / next song'], ['↑ / ↓', 'Volume'], ['M', 'Mute'],
    ['S', 'Shuffle'], ['R', 'Repeat: off, all, one'], ['L', 'Favourite current song'], ['Q', 'Show queue'], ['F', 'Now playing screen'], ['D', 'DJ deck'],
    ['/ or Ctrl + K', 'Search'], ['1 to 4', 'Hot cues (Shift clears)'], ['C', 'Cue'], ['[ / ]', 'Tempo down / up'], ['T', 'Tap BPM'], ['\\', 'Toggle 4 beat loop'], ['U', 'Upload songs'], ['?', 'This help'], ['Esc', 'Close panels']];
  const m = modal(`<h2>Keyboard shortcuts</h2><div class="keys">${k.map(([a, b]) => `<div><span>${b}</span><kbd>${a}</kbd></div>`).join('')}</div>
    <div class="acts"><button class="pill primary" data-x>Got it</button></div>`, 'wide');
  m.querySelector('[data-x]').onclick = closeModal;
}

/* ---------- Global click handling ---------- */
const ACTIONS = {
  upload: () => $('#fileIn').click(), uploadFolder: () => $('#dirIn').click(), help: showHelp,
  toggle: () => Player.toggle(), next: () => Player.next(), prev: () => Player.prev(),
  shuffle: () => Player.setShuffle(!S.shuffle), repeat: () => Player.cycleRepeat(), mute: () => Player.toggleMute(),
  queue: () => toggleQueue(), dj: () => go(S.view.name === 'dj' ? 'home' : 'dj'),
  favCur: () => { const id = Player.curId(); if (id) toggleFav(id); },
  fav: el => toggleFav(el.dataset.id), rowMenu: el => rowMenu(el, el.dataset.id), plMenu: el => plMenu(el, el.dataset.id),
  newPlaylist: () => newPlaylist(), editAlbum: el => editAlbum(el.dataset.key),
  playCtx: el => Player.playList(CTX[el.dataset.ctx] || [], 0),
  shuffleCtx: el => Player.playList(CTX[el.dataset.ctx] || [], 0, true),
  queueCtx: el => { Player.addToQueue(CTX[el.dataset.ctx] || []); toast(`Added ${plural((CTX[el.dataset.ctx] || []).length, 'song')} to queue`); },
  playCard: el => Player.playList(CTX[el.dataset.ctx] || [], +el.dataset.i),
  openNP: () => NP.open(), closeNP: () => NP.close(),
  clearQueue: () => Player.clearQueue(), qRemove: el => Player.removeAt(+el.dataset.qi),
  qMenu: el => { const i = +el.dataset.qi, id = S.queue[i]; openMenu(el, [
    { icon: 'play', label: 'Play now', fn: () => Player.playIndex(i) },
    { icon: 'queueNext', label: 'Move to play next', fn: () => Player.moveQueue(i, S.qi + 1) },
    { icon: 'up', label: 'Move up', fn: () => Player.moveQueue(i, i - 1) },
    { icon: 'down', label: 'Move down', fn: () => Player.moveQueue(i, i + 2) },
    { icon: 'playlist', label: 'Add to playlist…', fn: () => pickPlaylist([id]) },
    { icon: 'close', label: 'Remove from queue', fn: () => Player.removeAt(i) }]); }
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a && ACTIONS[a.dataset.act]) { e.preventDefault(); e.stopPropagation(); ACTIONS[a.dataset.act](a, e); return; }
  if (e.target.closest('[data-stop]')) return;
  const href = e.target.closest('[data-href]'); if (href) { location.hash = href.dataset.href; return; }
  const row = e.target.closest('.row'); if (row) { Player.playList(S.viewList, +row.dataset.row); return; }
  const q = e.target.closest('.q-item'); if (q && !e.target.closest('button')) Player.playIndex(+q.dataset.qi);
});
document.addEventListener('contextmenu', e => {
  const row = e.target.closest('.row'); if (!row) return;
  e.preventDefault(); rowMenu({ x: e.clientX, y: e.clientY }, row.dataset.id);
});

/* ---------- Search box, upload inputs, drag-drop files ---------- */
const doSearch = debounce(v => {
  if (!v.trim()) { if (S.view.name === 'search') history.back(); return; }
  if (S.view.name === 'search') { history.replaceState(null, '', '#/search/' + enc(v)); S.view.key = v; renderView(); }
  else location.hash = '#/search/' + enc(v);
}, 180);
$('#q').addEventListener('input', e => doSearch(e.target.value));
$('#q').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; e.target.blur(); doSearch(''); } if (e.key === 'Enter') { const r = $('.row'); if (r) r.click(); } });
$('#fileIn').addEventListener('change', e => { importFiles(e.target.files); e.target.value = ''; });
$('#dirIn').addEventListener('change', e => { importFiles(e.target.files); e.target.value = ''; });
let dragDepth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
window.addEventListener('dragenter', e => { if (!hasFiles(e)) return; dragDepth++; $('#drop').classList.add('open'); });
window.addEventListener('dragleave', e => { if (!hasFiles(e)) return; if (--dragDepth <= 0) { dragDepth = 0; $('#drop').classList.remove('open'); } });
window.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
window.addEventListener('drop', async e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragDepth = 0; $('#drop').classList.remove('open');
  const items = [...(e.dataTransfer.items || [])];
  const entries = items.map(i => i.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.some(en => en.isDirectory)) {
    const files = [];
    const walk = en => new Promise(res => {
      if (en.isFile) en.file(f => { files.push(f); res(); }, res);
      else { const rd = en.createReader(); const all = []; const read = () => rd.readEntries(async es => { if (!es.length) { for (const x of all) await walk(x); res(); } else { all.push(...es); read(); } }, res); read(); }
    });
    for (const en of entries) await walk(en);
    importFiles(files);
  } else importFiles(e.dataTransfer.files);
});

/* ---------- Now playing sheet ---------- */
const NP = {
  open() {
    const el = $('#np'); el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); this.render();
  },
  close() { const el = $('#np'); el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); },
  isOpen: () => $('#np').classList.contains('open'),
  render() {
    if (!this.isOpen()) return;
    const t = T(Player.curId());
    const u = t && artURL(t);
    $('#np').innerHTML = `${u ? `<div class="bgart" style="background-image:url('${u}')"></div>` : ''}
      <div class="np-top"><button class="iconbtn" data-act="closeNP" title="Close (Esc)">${ic('expand')}</button>
      <div style="display:flex;gap:4px"><button class="iconbtn" data-act="dj" onclick="NP.close()" title="DJ deck">${ic('dj')}</button><button class="iconbtn" onclick="NP.close();toggleQueue(true)" title="Queue">${ic('queue')}</button></div></div>
      <div class="np-in">${artHTML(t, 'bigart')}
        <div class="nt"><h2>${esc(t?.title || 'Nothing playing')}</h2><p>${t ? `<a href="#/artist/${enc(t.artist)}" onclick="NP.close()">${esc(t.artist)}</a> · <a href="#/album/${enc(albumKey(t))}" onclick="NP.close()">${esc(t.album)}</a>` : 'Pick a song from your library'}</p></div>
        <div class="pl-seek"><span class="t" id="npCur">0:00</span><input type="range" id="npSeek" min="0" max="1000" value="0" aria-label="Seek"><span class="t" id="npDur">${fmt(t?.duration)}</span></div>
        <div class="pl-ctrls">
          <button class="iconbtn ${S.shuffle ? 'on' : ''}" data-act="shuffle">${ic('shuffle')}</button>
          <button class="iconbtn" data-act="prev">${ic('prev')}</button>
          <button class="playbtn" data-act="toggle" id="npPlay">${ic(Player.playing() ? 'pause' : 'play')}</button>
          <button class="iconbtn" data-act="next">${ic('next')}</button>
          <button class="iconbtn ${S.repeat !== 'off' ? 'on' : ''}" data-act="repeat">${ic(S.repeat === 'one' ? 'repeat1' : 'repeat')}</button></div>
        <div class="np-vol">${ic('volLow')}<input type="range" id="npVol" min="0" max="100" value="${Math.round(S.volume * 100)}" aria-label="Volume">${ic('vol')}
          <button class="iconbtn ${t?.fav ? 'fav-on' : ''}" data-act="favCur" style="margin-left:8px">${ic(t?.fav ? 'heart' : 'heartO')}</button></div>
      </div>`;
    const sk = $('#npSeek'), vl = $('#npVol'); setRange(vl);
    Player.bindSeek(sk);
    vl.oninput = () => { Player.setVolume(vl.value / 100); setRange(vl); };
  }
};
