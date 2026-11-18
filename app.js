{
  // Link del formulario para sugerir cafés (por ejemplo, un Google Form). Si queda vacío, el botón no se muestra.
  const SUGERIR_URL = '';

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.9 4 7.2 4c2 0 3.5 1.1 4.8 2.8C13.3 5.1 14.8 4 16.8 4c3.3 0 5.6 3.2 4.4 6.6C19.5 15.4 12 20 12 20z"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ZONAS = { CABA: 'Capital', 'Zona norte': 'Zona norte' };

  let cafes = [];
  const state = { barrios: new Set(), zonas: new Set(), tags: new Set(), vista: 'lista', pagina: 'guia', tab: 'pp' };
  let store = { fav: [], fui: [] };
  try { store = Object.assign(store, JSON.parse(localStorage.getItem('filtro:mios') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('filtro:mios', JSON.stringify(store)); } catch (e) {} };
  const has = (k, id) => store[k].includes(id);
  const toggle = (k, id) => {
    store[k] = has(k, id) ? store[k].filter((x) => x !== id) : [...store[k], id];
    save();
    render();
    if (dlg.open && dlg.dataset.id === id) openFicha(id, false);
  };

  // ---------- Tema ----------
  const root = document.documentElement;
  const mq = matchMedia('(prefers-color-scheme: light)');
  const theme = () => root.dataset.theme || (mq.matches ? 'light' : 'dark');
  const syncThemeUi = () => {
    const t = theme();
    $('#tema').setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#1C1410' : '#F6EFE4';
    setTiles();
  };
  $('#tema').addEventListener('click', () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('filtro:tema', next); } catch (e) {}
    syncThemeUi();
  });
  mq.addEventListener('change', syncThemeUi);

  // ---------- Filtros ----------
  const lugarActivo = () => state.barrios.size > 0 || state.zonas.size > 0;
  const sedeCoincide = (s) => state.barrios.has(s.barrio) || state.zonas.has(s.zona);
  const sedesVisibles = (c) => (lugarActivo() ? c.sedes.filter(sedeCoincide) : c.sedes);
  const filtered = () => cafes.filter((c) => {
    if (lugarActivo() && !c.sedes.some(sedeCoincide)) return false;
    for (const t of state.tags) if (!c.tags.includes(t)) return false;
    return true;
  });
  const contar = (fn) => {
    const m = new Map();
    cafes.forEach((c) => new Set(fn(c)).forEach((v) => m.set(v, (m.get(v) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
  };

  // ---------- Buscador de barrios y cafés ----------
  const bInput = $('#b-input'), bList = $('#b-list');
  let bActive = 0;
  const bOptions = () => {
    const q = norm(bInput.value.trim());
    const ok = (v) => !q || norm(v).includes(q);
    const zonas = contar((c) => c.sedes.map((s) => s.zona)).filter(([z]) => !state.zonas.has(z) && ok(ZONAS[z]))
      .map(([z, n]) => ({ tipo: 'zona', v: z, label: `Toda ${ZONAS[z] === 'Capital' ? 'Capital' : 'la zona norte'}`, n }));
    const barrios = contar((c) => c.sedes.map((s) => s.barrio)).filter(([b]) => !state.barrios.has(b) && ok(b))
      .map(([b, n]) => ({ tipo: 'barrio', v: b, label: b, n }));
    const cafesOk = q.length >= 2 ? cafes.filter((c) => norm(c.nombre).includes(q)).slice(0, 6)
      .map((c) => ({ tipo: 'cafe', v: c.id, label: c.nombre, extra: c.sedes[0].barrio })) : [];
    return [...zonas, ...barrios, ...cafesOk];
  };
  const renderChips = () => {
    const chips = [...state.zonas].map((z) => ['z', z, ZONAS[z]]).concat([...state.barrios].map((b) => ['b', b, b]));
    $('#chips').innerHTML = chips.map(([t, v, l]) => `<span class="chip">${esc(l)}<button data-rm="${t}:${esc(v)}" aria-label="Quitar ${esc(l)}">${CLOSE}</button></span>`).join('');
    bInput.placeholder = chips.length ? 'Sumar otro barrio' : 'Buscá un barrio, una zona o un café';
  };
  const openBList = () => {
    const opts = bOptions();
    bActive = Math.min(bActive, Math.max(opts.length - 1, 0));
    let grupo = '';
    bList.innerHTML = opts.length ? opts.map((o, i) => {
      const g = o.tipo === 'zona' ? 'Zonas' : o.tipo === 'barrio' ? 'Barrios' : 'Cafés';
      const head = g !== grupo ? `<li class="grp" role="presentation">${g}</li>` : '';
      grupo = g;
      const right = o.tipo === 'cafe' ? esc(o.extra) : plural(o.n, 'café', 'cafés');
      return `${head}<li role="option" id="bo-${i}" data-i="${i}" aria-selected="${i === bActive}" class="${i === bActive ? 'act' : ''}"><span>${esc(o.label)}</span><span class="n">${right}</span></li>`;
    }).join('') : '<li class="none">No encontramos ese barrio ni ese café todavía</li>';
    bList.hidden = false;
    bInput.setAttribute('aria-expanded', 'true');
    bInput.setAttribute('aria-activedescendant', opts.length ? `bo-${bActive}` : '');
  };
  const closeBList = () => { bList.hidden = true; bInput.setAttribute('aria-expanded', 'false'); };
  const elegir = (o) => {
    bInput.value = ''; bActive = 0; closeBList();
    if (o.tipo === 'cafe') { abrir(o.v); return; }
    (o.tipo === 'zona' ? state.zonas : state.barrios).add(o.v);
    render(); bInput.focus();
  };
  bInput.addEventListener('focus', openBList);
  bInput.addEventListener('click', openBList);
  bInput.addEventListener('input', () => { bActive = 0; openBList(); });
  bInput.addEventListener('keydown', (e) => {
    const opts = bOptions();
    if (e.key === 'ArrowDown') { e.preventDefault(); bActive = Math.min(bActive + 1, opts.length - 1); openBList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); bActive = Math.max(bActive - 1, 0); openBList(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (opts[bActive]) elegir(opts[bActive]); }
    else if (e.key === 'Escape') closeBList();
    else if (e.key === 'Backspace' && !bInput.value) {
      if (state.barrios.size) state.barrios.delete([...state.barrios].pop());
      else if (state.zonas.size) state.zonas.delete([...state.zonas].pop());
      else return;
      render(); openBList();
    }
  });
  bList.addEventListener('mousedown', (e) => { const li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); elegir(bOptions()[+li.dataset.i]); } });
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    const [t, ...v] = b.dataset.rm.split(':');
    (t === 'z' ? state.zonas : state.barrios).delete(v.join(':'));
    render();
  });
  $('#combo').addEventListener('click', (e) => { if (!e.target.closest('[data-rm]')) bInput.focus(); });

  // ---------- Plan ----------
  const planBtn = $('#plan-btn'), planMenu = $('#plan-menu');
  const renderPlan = () => {
    $('#plan-lbl').textContent = state.tags.size === 0 ? 'Plan' : state.tags.size === 1 ? [...state.tags][0] : `Plan · ${state.tags.size}`;
    planBtn.classList.toggle('on', state.tags.size > 0);
    planMenu.innerHTML = contar((c) => c.tags).map(([v, n]) => `
      <label class="opt"><input type="checkbox" value="${esc(v)}"${state.tags.has(v) ? ' checked' : ''}><span class="box" aria-hidden="true"></span><span>${esc(v)}</span><span class="n">${n}</span></label>`).join('')
      + '<div class="menu-foot"><button class="link-btn" data-plan-clear>Limpiar</button><button class="btn main" data-plan-ok>Listo</button></div>';
  };
  const setPlanOpen = (o) => { planMenu.hidden = !o; planBtn.setAttribute('aria-expanded', o); };
  planBtn.addEventListener('click', () => setPlanOpen(planMenu.hidden));
  planMenu.addEventListener('change', (e) => { const v = e.target.value; if (e.target.checked) state.tags.add(v); else state.tags.delete(v); render(); });
  planMenu.addEventListener('click', (e) => {
    if (e.target.closest('[data-plan-clear]')) { state.tags.clear(); render(); }
    if (e.target.closest('[data-plan-ok]')) { setPlanOpen(false); planBtn.focus(); }
  });

  document.addEventListener('click', (e) => {
    const path = e.composedPath();
    if (!path.includes($('#combo'))) closeBList();
    if (!path.includes($('#dd-plan'))) setPlanOpen(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !planMenu.hidden) { setPlanOpen(false); planBtn.focus(); } });

  // ---------- Tarjetas ----------
  const inicial = (n) => n.replace(/^(Café|Cafe|La|El|Las|Los)\s+/i, '').charAt(0);
  const arte = (c, s) => `
    <div class="card-art${c.foto ? ' con-foto' : ''}">
      ${c.foto ? `<img src="${esc(c.foto.src)}" alt="${esc(c.nombre)}" loading="lazy">` : `<span class="ini" aria-hidden="true">${esc(inicial(c.nombre))}</span>`}
      <div class="badges">
        ${c.resena ? `<span class="badge resena">Reseñado por @${esc(c.resena.autor)}</span>` : ''}
        ${has('fui', c.id) ? '<span class="badge fui">Visitado</span>' : ''}
      </div>
      <span class="b">${esc(s.barrio)}</span>
      ${c.foto && c.foto.credito ? `<span class="credito">Foto: ${esc(c.foto.credito)}</span>` : ''}
    </div>`;
  const card = (c) => {
    const vis = sedesVisibles(c), s = vis[0] || c.sedes[0], otras = c.sedes.length - 1;
    return `
    <article class="card" data-id="${c.id}" tabindex="0" aria-label="${esc(c.nombre)}, ${esc(s.barrio)}">
      ${arte(c, s)}
      <div class="card-h">
        <div>
          <h2>${esc(c.nombre)}</h2>
          <p class="dir">${esc(s.dir)}${otras ? ` · +${plural(otras, 'sede', 'sedes')}` : ''}</p>
        </div>
        <button class="heart${has('fav', c.id) ? ' on' : ''}" data-fav="${c.id}" aria-pressed="${has('fav', c.id)}" aria-label="${has('fav', c.id) ? 'Sacar de Por probar' : 'Guardar en Por probar'}">${HEART}</button>
      </div>
      <p class="desc">${esc(c.destacado)}</p>
      ${c.tags.length ? `<div class="tags">${c.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    </article>`;
  };

  const render = () => {
    renderChips();
    renderPlan();
    const pendientes = store.fav.filter((id) => !has('fui', id)).length;
    $('#mis-n').textContent = pendientes;
    $('#mis-n').hidden = !pendientes;
    if (state.pagina === 'mis') renderMis();
    const list = filtered();
    const active = lugarActivo() || state.tags.size;
    $('#count').textContent = `${plural(list.length, 'café', 'cafés')}${active ? ' con estos filtros' : ' en la guía'}`;
    $('#limpiar').hidden = !active;
    $('#vacio').hidden = list.length > 0;
    $('#lista').hidden = state.vista !== 'lista' || !list.length;
    $('#mapa-wrap').hidden = state.vista !== 'mapa';
    if (state.vista === 'lista') $('#lista').innerHTML = list.map(card).join('');
    else drawMap(list);
  };

  const clear = () => { state.barrios.clear(); state.zonas.clear(); state.tags.clear(); render(); };
  $('#limpiar').addEventListener('click', clear);
  $('#vacio-btn').addEventListener('click', clear);

  const onGrid = (el) => {
    el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fav]');
      if (f) { e.stopPropagation(); toggle('fav', f.dataset.fav); return; }
      const c = e.target.closest('.card');
      if (c) abrir(c.dataset.id);
    });
    el.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); abrir(e.target.dataset.id); }
    });
  };
  onGrid($('#mis-lista'));
  $('#lista').addEventListener('click', (e) => {
    const f = e.target.closest('[data-fav]');
    if (f) { e.stopPropagation(); toggle('fav', f.dataset.fav); return; }
    const c = e.target.closest('.card');
    if (c) abrir(c.dataset.id);
  });
  $('#lista').addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); abrir(e.target.dataset.id); }
  });

  // ---------- Vistas ----------
  const setVista = (v, push = true) => {
    state.vista = v;
    $('#v-lista').setAttribute('aria-selected', v === 'lista');
    $('#v-mapa').setAttribute('aria-selected', v === 'mapa');
    if (push) history.replaceState(null, '', v === 'mapa' ? '#mapa' : location.pathname + location.search);
    render();
  };
  $('#v-lista').addEventListener('click', () => setVista('lista'));
  $('#v-mapa').addEventListener('click', () => setVista('mapa'));

  // ---------- Mapa ----------
  let map = null, tiles = null, layer = null;
  const OBELISCO = { lat: -34.6037, lng: -58.3816 };
  const km = (a, b) => {
    const t = Math.PI / 180, x = Math.sin((b.lat - a.lat) * t / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin((b.lng - a.lng) * t / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(x));
  };
  const tileUrl = () => `https://{s}.basemaps.cartocdn.com/${theme() === 'dark' ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`;
  function setTiles() {
    if (!map) return;
    if (tiles) map.removeLayer(tiles);
    tiles = L.tileLayer(tileUrl(), { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(map);
    tiles.bringToBack();
    tiles.once('tileerror', fallbackBase);
  }

  // Si las imágenes del mapa no cargan, mostramos barrios como referencia
  const BARRIOS = [['Palermo', -34.578, -58.425], ['Recoleta', -34.588, -58.395], ['Belgrano', -34.562, -58.452], ['Núñez', -34.545, -58.463],
    ['Coghlan', -34.560, -58.475], ['Saavedra', -34.552, -58.486], ['Colegiales', -34.574, -58.448], ['Chacarita', -34.588, -58.455],
    ['Villa Crespo', -34.599, -58.440], ['Almagro', -34.610, -58.420], ['Caballito', -34.618, -58.440], ['Balvanera', -34.609, -58.401],
    ['Microcentro', -34.603, -58.378], ['Retiro', -34.592, -58.374], ['Puerto Madero', -34.616, -58.362], ['San Telmo', -34.621, -58.373],
    ['Boedo', -34.630, -58.416], ['Parque Patricios', -34.637, -58.400], ['La Boca', -34.635, -58.360], ['Villa Urquiza', -34.573, -58.488],
    ['Villa Devoto', -34.600, -58.512], ['Flores', -34.630, -58.462], ['Villa Ortúzar', -34.581, -58.468], ['Vicente López', -34.527, -58.476],
    ['Olivos', -34.512, -58.492], ['La Lucila', -34.499, -58.480], ['Martínez', -34.492, -58.510], ['San Isidro', -34.472, -58.518],
    ['Munro', -34.529, -58.524], ['Tigre', -34.426, -58.585]];
  let fallbackOn = false;
  function fallbackBase() {
    if (fallbackOn || !map) return;
    fallbackOn = true;
    const lbl = (n, la, ln, cls) => L.marker([la, ln], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'barrio-lbl' + (cls || ''), html: n, iconSize: null }) });
    const g = L.layerGroup(BARRIOS.map(([n, la, ln]) => lbl(n, la, ln)));
    g.addLayer(lbl('Río de la Plata', -34.55, -58.38, ' rio'));
    g.addTo(map);
    $('#mapa-nota').hidden = false;
  }
  function drawMap(list) {
    if (typeof L === 'undefined') { $('#mapa').textContent = 'No se pudo cargar el mapa.'; return; }
    if (!map) {
      map = L.map('mapa', { scrollWheelZoom: false, zoomControl: true }).setView([-34.58, -58.45], 12);
      setTiles();
      layer = L.layerGroup().addTo(map);
      map.on('popupopen', (e) => {
        const b = e.popup.getElement().querySelector('[data-open]');
        if (b) b.onclick = () => { abrir(b.dataset.open); };
      });
    }
    setTimeout(() => map.invalidateSize(), 0);
    layer.clearLayers();
    const dark = theme() === 'dark', puntos = [];
    list.forEach((c) => {
      const fav = has('fav', c.id), fui = has('fui', c.id);
      sedesVisibles(c).forEach((s) => {
        puntos.push(s);
        L.circleMarker([s.lat, s.lng], {
          radius: fav ? 11 : 8, color: '#1C1410', weight: 2, fillOpacity: 1,
          fillColor: fui ? (dark ? '#E8D9C4' : '#6B5A4C') : '#C6F432',
        }).bindPopup(`<div class="pop"><div class="pop-b">${esc(s.barrio)}${fui ? ' · Visitado' : ''}</div><div class="pop-n">${esc(c.nombre)}</div><div class="pop-d">${esc(s.dir)}</div><button class="pill on" data-open="${c.id}">Ver ficha</button></div>`).addTo(layer);
      });
    });
    // Sin filtro de lugar, encuadramos la ciudad y la zona norte cercana (Pilar queda a un zoom de distancia)
    const foco = lugarActivo() ? puntos : puntos.filter((p) => km(p, OBELISCO) < 30);
    const usar = foco.length ? foco : puntos;
    if (usar.length) map.fitBounds(L.latLngBounds(usar.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
  }

  // ---------- Ficha ----------
  const dlg = $('#ficha');
  let fichaPush = false;
  function abrir(id) { fichaPush = true; location.hash = id; }
  const mapsUrl = (c, s) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.nombre}, ${s.dir}, ${s.barrio}, Buenos Aires`)}`;
  function openFicha(id, show = true) {
    const c = cafes.find((x) => x.id === id);
    if (!c) return;
    dlg.dataset.id = id;
    const fav = has('fav', id), fui = has('fui', id);
    const barrios = [...new Set(c.sedes.map((s) => s.barrio))];
    $('#ficha-in').innerHTML = `
      ${c.foto ? `<figure class="f-foto"><img src="${esc(c.foto.src)}" alt="${esc(c.nombre)}">${c.foto.credito ? `<figcaption>Foto: ${c.foto.link ? `<a href="${esc(c.foto.link)}" target="_blank" rel="noopener">${esc(c.foto.credito)}</a>` : esc(c.foto.credito)}</figcaption>` : ''}</figure>` : ''}
      <div class="f-top">
        <div>
          <p class="f-b">${esc(barrios.slice(0, 3).join(' · '))}${barrios.length > 3 ? ' y más' : ''}</p>
          <h2 id="ficha-t">${esc(c.nombre)}</h2>
        </div>
        <button class="cerrar" data-close aria-label="Cerrar">${CLOSE}</button>
      </div>
      <p class="f-desc">${esc(c.destacado)}</p>
      ${c.resena ? `<a class="f-resena" href="${esc(c.resena.link)}" target="_blank" rel="noopener"><span>Reseñado por <strong>@${esc(c.resena.autor)}</strong></span><span aria-hidden="true">→</span></a>` : ''}
      <div class="f-actions">
        <button class="pill${fav && !fui ? ' on' : ''}" data-t="fav" aria-pressed="${fav}"${fui ? ' hidden' : ''}>${fav ? 'En Por probar' : 'Guardar para probar'}</button>
        <button class="pill${fui ? ' on' : ''}" data-t="fui" aria-pressed="${fui}">${fui ? 'Visitado' : 'Marcar como visitado'}</button>
      </div>
      <ul class="f-list">
        <li><span class="k">${c.sedes.length > 1 ? 'Sedes' : 'Dirección'}</span><span class="sedes">${c.sedes.map((s) => `<a href="${mapsUrl(c, s)}" target="_blank" rel="noopener"><span>${esc(s.dir)}</span><span class="sb">${esc(s.barrio)}</span></a>`).join('')}</span></li>
        ${c.horario ? `<li><span class="k">Horario</span><span>${esc(c.horario)}</span></li>` : ''}
        ${c.tags.length ? `<li><span class="k">Ideal para</span><span class="tags">${c.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span></li>` : ''}
        ${c.fuentes && c.fuentes.length ? `<li><span class="k">Mencionado en</span><span class="fuentes">${c.fuentes.map(esc).join(', ')}</span></li>` : ''}
      </ul>
      <div class="f-links">
        <a class="btn main" href="${mapsUrl(c, c.sedes[0])}" target="_blank" rel="noopener">Cómo llegar</a>
        ${c.ig ? `<a class="btn" href="https://instagram.com/${esc(c.ig)}" target="_blank" rel="noopener">@${esc(c.ig)}</a>` : ''}
      </div>`;
    if (show && !dlg.open) dlg.showModal();
  }
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); return; }
    const t = e.target.closest('[data-t]');
    if (t) toggle(t.dataset.t, dlg.dataset.id);
  });
  dlg.addEventListener('close', () => {
    if (location.hash.slice(1) !== dlg.dataset.id) return;
    if (fichaPush) { fichaPush = false; history.back(); }
    else history.replaceState(null, '', state.pagina === 'mis' ? '#mis-cafes' : state.vista === 'mapa' ? '#mapa' : location.pathname + location.search);
  });

  // ---------- Sugerir un café ----------
  document.querySelectorAll('[data-sugerir]').forEach((a) => {
    if (SUGERIR_URL) a.href = SUGERIR_URL;
    else { a.hidden = true; const box = a.closest('.foot-top'); if (box) box.hidden = true; }
  });

  // ---------- Mis cafés ----------
  const MIS_VACIO = {
    pp: ['Tu lista de Por probar está vacía', 'Tocá el corazón de cualquier café de la guía y aparece acá.'],
    vis: ['Todavía no marcaste ningún café', 'Cuando vayas a uno, abrí su ficha y tocá "Marcar como visitado".'],
  };
  function renderMis() {
    const vis = cafes.filter((c) => has('fui', c.id));
    const pp = cafes.filter((c) => has('fav', c.id) && !has('fui', c.id));
    const barrios = new Set(vis.map((c) => c.sedes[0].barrio));
    $('#st-vis').textContent = vis.length;
    $('#st-pp').textContent = pp.length;
    $('#st-bar').textContent = barrios.size;
    $('#prog-bar').style.width = `${cafes.length ? Math.round((vis.length / cafes.length) * 100) : 0}%`;
    $('#prog-t').textContent = `${vis.length} de ${cafes.length} cafés de la guía`;
    $('#tab-pp').textContent = pp.length;
    $('#tab-vis').textContent = vis.length;
    document.querySelectorAll('.mis-tabs [data-tab]').forEach((b) => {
      const on = b.dataset.tab === state.tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on);
    });
    const list = state.tab === 'pp' ? pp : vis;
    $('#mis-lista').innerHTML = list.map(card).join('');
    $('#mis-lista').hidden = !list.length;
    $('#mis-vacio').hidden = list.length > 0;
    $('#mis-vacio-t').textContent = MIS_VACIO[state.tab][0];
    $('#mis-vacio-d').textContent = MIS_VACIO[state.tab][1];
  }
  document.querySelector('.mis-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) { state.tab = b.dataset.tab; renderMis(); }
  });
  let scrollGuia = 0, entroDesdeGuia = false;
  function setPagina(p) {
    if (state.pagina === p) return;
    if (p === 'mis') { scrollGuia = window.scrollY; entroDesdeGuia = true; }
    state.pagina = p;
    $('#guia').hidden = p !== 'guia';
    $('#mis').hidden = p !== 'mis';
    $('#mis-btn').classList.toggle('on', p === 'mis');
    $('#mis-btn').setAttribute('aria-current', p === 'mis' ? 'page' : 'false');
    if (p === 'mis') { renderMis(); window.scrollTo(0, 0); $('#mis-t').focus({ preventScroll: true }); }
    else { render(); window.scrollTo(0, scrollGuia); }
  }
  $('#volver').addEventListener('click', (e) => {
    e.preventDefault();
    if (entroDesdeGuia) history.back();
    else { history.replaceState(null, '', location.pathname + location.search); setPagina('guia'); }
  });
  document.querySelectorAll('#mis-vacio a, .logo').forEach((a) => a.addEventListener('click', (e) => {
    if (state.pagina !== 'mis') return;
    e.preventDefault();
    $('#volver').click();
  }));

  // ---------- Rutas ----------
  const route = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'mis-cafes') { if (dlg.open) dlg.close(); setPagina('mis'); return; }
    if (h && cafes.some((c) => c.id === h)) { openFicha(h); return; }
    if (dlg.open) dlg.close();
    setPagina('guia');
    if (h === 'mapa' && state.vista !== 'mapa') setVista('mapa', false);
  };
  window.addEventListener('hashchange', route);

  // ---------- Inicio ----------
  syncThemeUi();
  if (Array.isArray(window.CAFES)) {
    cafes = window.CAFES.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    render();
    route();
  } else {
    $('#count').textContent = 'No se pudieron cargar los cafés. Recargá la página.';
  }
}
