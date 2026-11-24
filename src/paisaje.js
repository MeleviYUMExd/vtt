// Fondo pixelado del tablero: cielo con nubes arriba y pasto abajo.
export const PAISAJE = {
  px: 512,
  mundo: 6000,
  y0: -2500,
  horizonte: 560,
  cieloArriba: "#1f4fb0",
  pastoAbajo: "#2c7430"
};

function mulberry32(semilla) {
  let a = semilla | 0;
  return () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mezcla = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const BAYER = [[0, 0.5], [0.75, 0.25]];

function banda(a, b, t, x, y, N) {
  const v = t * N;
  let k = Math.floor(v);
  if (v - k > BAYER[y & 1][x & 1]) k++;
  return mezcla(a, b, Math.min(1, k / N));
}

export function generarPaisaje(semilla = 20261122) {
  const W = PAISAJE.px;
  const H = PAISAJE.px;
  const rng = mulberry32(semilla);
  const datos = new Uint8ClampedArray(W * H * 4);
  const poner = (x, y, c) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    datos[i] = c[0];
    datos[i + 1] = c[1];
    datos[i + 2] = c[2];
    datos[i + 3] = 255;
  };
  const ponerEnvuelto = (x, y, c) => poner(((x % W) + W) % W, y, c);
  const fh = Math.round((PAISAJE.horizonte - PAISAJE.y0) / (PAISAJE.mundo / H));
  const cieloA = rgb(PAISAJE.cieloArriba);
  const cieloB = rgb("#a6dcff");
  const pastoA = rgb("#7ccb45");
  const pastoB = rgb(PAISAJE.pastoAbajo);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      poner(x, y, y < fh
        ? banda(cieloA, cieloB, y / fh, x, y, 10)
        : banda(pastoA, pastoB, (y - fh) / (H - fh), x, y, 8));
    }
  }

  const nube = (cx, cy, ancho) => {
    const n = 4 + Math.floor(rng() * 3);
    const globos = [];
    for (let j = 0; j < n; j++) {
      const r = (ancho / n) * (0.8 + rng() * 0.8);
      globos.push({
        x: cx + (j - (n - 1) / 2) * (ancho / n),
        y: cy - rng() * ancho * 0.12,
        r
      });
    }
    const base = cy + ancho * 0.1;
    for (const dx of [-W, 0, W]) {
      for (let y = Math.floor(cy - ancho * 0.5); y <= base; y++) {
        for (let x = Math.floor(cx - ancho); x <= Math.ceil(cx + ancho); x++) {
          for (const g of globos) {
            if (Math.hypot(x - g.x, y - g.y) <= g.r) {
              const sombra = y > base - Math.max(2, ancho * 0.07);
              ponerEnvuelto(x + dx, y, sombra ? [198, 220, 244] : [255, 255, 255]);
              break;
            }
          }
        }
      }
    }
  };
  for (let i = 0; i < 18; i++) {
    nube(rng() * W, 30 + rng() * (fh - 80), 26 + rng() * 60);
  }

  const colina = (color, altura, f1, f2, fase) => {
    for (let x = 0; x < W; x++) {
      const a = altura + 5 * Math.sin((2 * Math.PI * f1 * x) / W + fase) +
        3 * Math.sin((2 * Math.PI * f2 * x) / W + fase * 2);
      for (let y = fh - Math.round(a); y < fh; y++) poner(x, y, color);
    }
  };
  colina([121, 183, 154], 16, 2, 5, 1);
  colina([79, 154, 65], 9, 3, 8, 2.3);

  const claro = [166, 224, 106];
  const oscuro = [31, 93, 37];
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(rng() * W);
    const y = fh + 3 + Math.floor(rng() * (H - fh - 4));
    const alto = 2 + Math.floor(rng() * 2) + (y > fh + (H - fh) / 2 ? 1 : 0);
    const color = rng() < 0.5 ? claro : oscuro;
    for (let k = 0; k < alto; k++) poner(x, y - k, color);
  }
  const flores = [[255, 255, 255], [255, 230, 107], [247, 168, 200]];
  for (let i = 0; i < 160; i++) {
    poner(
      Math.floor(rng() * W),
      fh + 6 + Math.floor(rng() * (H - fh - 8)),
      flores[Math.floor(rng() * 3)]
    );
  }

  return { ancho: W, alto: H, datos };
}
