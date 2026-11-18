# Filtro

Guía de cafés de especialidad en Buenos Aires y zona norte: buscador por barrio, zona o nombre, filtro por plan, favoritos, mapa con todas las sedes y ficha de cada café. Modo claro y oscuro.

## Archivos

- `index.html`: estructura de la página
- `styles.css`: estilos y paletas (dark y light)
- `app.js`: filtros, mapa, ficha y favoritos
- `cafes.js`: los datos de los cafés (uno por línea)
- `vendor/`: Leaflet 1.9.4 (mapa)
- `scripts/ubicaciones.mjs` y `.github/workflows/ubicaciones.yml`: corrigen las coordenadas solas

## Publicar en GitHub Pages

1. Creá un repo (por ejemplo `filtro`) y subí todo, incluidas las carpetas `vendor/`, `scripts/` y `.github/`.
2. En el repo, andá a Settings → Pages, elegí la rama `main` y la carpeta `/ (root)`.
3. En un par de minutos queda en `https://TU-USUARIO.github.io/filtro/`.

## Ubicaciones exactas (automático)

Las coordenadas iniciales son aproximadas (`"geo": "aprox"`). Cada vez que subís un cambio a `cafes.js`, GitHub busca la dirección en OpenStreetMap y guarda la ubicación exacta (`"geo": "osm"`). También lo podés correr a mano desde la pestaña **Actions → Corregir ubicaciones → Run workflow**.

- Tarda alrededor de un segundo por sede (es la regla de OpenStreetMap), así que la primera vez son unos tres o cuatro minutos.
- Si una dirección no se encuentra o el resultado queda a más de 3 km de lo esperado, la deja como estaba y la lista en el registro del proceso para que la revises.
- Si en Actions aparece un error de permisos: Settings → Actions → General → Workflow permissions → "Read and write permissions".

## Sumar o editar un café

Cada café es una línea en `cafes.js`:

```json
{"id":"nombre-unico","nombre":"Nombre","destacado":"Una o dos frases.","tags":["Para trabajar"],"ig":"usuario","fuentes":["Time Out"],
 "sedes":[{"dir":"Calle 123","barrio":"Palermo","zona":"CABA","lat":-34.59,"lng":-58.42,"geo":"aprox"}]}
```

- `zona`: `"CABA"` o `"Zona norte"`. En zona norte, `barrio` es la localidad (Olivos, Martínez, San Isidro…).
- `lat` y `lng`: alcanza con una aproximación; con `"geo":"aprox"` el proceso automático la corrige.
- `tags` en uso: Pastelería, Al aire libre, Take away, Más que café, Para trabajar, Premiado, Tostador propio, Filtrados, Kids friendly, Brunch, Vegano / Sin TACC, Pet friendly, Sin laptops. Si inventás uno nuevo, aparece solo en el filtro Plan.
- Opcionales: `ig`, `horario`, `fuentes` (se muestran como "Mencionado en").

### Fotos y reseñas

Con permiso de quien sacó la foto, subí la imagen a la carpeta `fotos/` (ideal 1200 px de ancho, en .jpg o .webp) y sumá al café:

```json
"foto":{"src":"fotos/blu-cafe.jpg","credito":"@majoquinteros","link":"https://instagram.com/p/..."},
"resena":{"autor":"majoquinteros","link":"https://instagram.com/p/..."}
```

- `foto` reemplaza la inicial grande de la tarjeta y aparece arriba de la ficha, con el crédito.
- `resena` agrega el sello "Reseñado por @…" en la tarjeta y un link a la reseña en la ficha.

## Botón "Sugerí un café"

Creá un formulario (por ejemplo en Google Forms) y pegá su link en la primera línea de `app.js`:

```js
const SUGERIR_URL = 'https://forms.gle/...';
```

Mientras quede vacío, el botón no se muestra.
