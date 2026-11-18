// Corrige las coordenadas de cada sede usando OpenStreetMap (Nominatim).
// Uso: node scripts/ubicaciones.mjs   (lo corre solo GitHub Actions, ver .github/workflows/ubicaciones.yml)
// Solo toca sedes con "geo": "aprox". Respeta el límite de 1 consulta por segundo de Nominatim.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../cafes.js', import.meta.url);
const raw = readFileSync(FILE, 'utf8');
const start = raw.indexOf('['), end = raw.lastIndexOf(']');
const header = raw.slice(0, start);
const cafes = JSON.parse(raw.slice(start, end + 1));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const km = (a, b) => {
  const R = 6371, t = Math.PI / 180;
  const dLa = (b.lat - a.lat) * t, dLn = (b.lng - a.lng) * t;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const limpiar = (d) => d.replace(/\(.*?\)/g, '').replace(/,?\s*(primer|\d+°?)\s*piso/i, '').trim();

async function buscar(q) {
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar&q=' + encodeURIComponent(q);
  const res = await fetch(url, { headers: { 'User-Agent': 'Filtro-guia-de-cafes/1.0 (GitHub Pages)', 'Accept-Language': 'es' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  return j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null;
}

let ok = 0, fallas = [];
for (const c of cafes) {
  for (const s of c.sedes) {
    if (s.geo !== 'aprox') continue;
    const zona = s.zona === 'CABA' ? 'Ciudad Autónoma de Buenos Aires' : `${s.barrio}, Provincia de Buenos Aires`;
    const consultas = [`${limpiar(s.dir)}, ${zona}, Argentina`, `${c.nombre}, ${s.barrio}, Buenos Aires, Argentina`];
    let hecho = false;
    for (const q of consultas) {
      try {
        const r = await buscar(q);
        await sleep(1100);
        if (r && km(r, s) < 3) {
          s.lat = +r.lat.toFixed(6); s.lng = +r.lng.toFixed(6); s.geo = 'osm';
          ok++; hecho = true; break;
        }
      } catch (e) { await sleep(3000); }
    }
    if (!hecho) fallas.push(`${c.nombre} · ${s.dir}`);
  }
}

const body = cafes.map((c) => JSON.stringify(c)).join(',\n');
writeFileSync(FILE, header + '[\n' + body + '\n];\n');
console.log(`Ubicaciones corregidas: ${ok}`);
if (fallas.length) console.log(`Sin resultado confiable (quedan aproximadas):\n- ${fallas.join('\n- ')}`);
