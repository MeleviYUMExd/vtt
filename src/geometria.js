// src/geometria.js
// Matematica de rectangulos para mover y redimensionar el fondo del mapa.
// Todo esta en coordenadas del mundo. Un rectangulo es { x, y, w, h }.

export const MIN_ANCHO = 50;

export function puntoEnRect(r, p) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function esquinas(r) {
  return {
    nw: { x: r.x, y: r.y },
    ne: { x: r.x + r.w, y: r.y },
    sw: { x: r.x, y: r.y + r.h },
    se: { x: r.x + r.w, y: r.y + r.h }
  };
}

export function esquinaEn(r, p, radio) {
  for (const [nombre, c] of Object.entries(esquinas(r))) {
    if (Math.hypot(p.x - c.x, p.y - c.y) <= radio) return nombre;
  }
  return null;
}

export function moverRect(r, dx, dy) {
  return { ...r, x: r.x + dx, y: r.y + dy };
}

export function redimensionar(r, esquina, p) {
  const opuestas = { nw: "se", ne: "sw", sw: "ne", se: "nw" };
  const ancla = esquinas(r)[opuestas[esquina]];
  const w = Math.max(MIN_ANCHO, Math.abs(p.x - ancla.x));
  const h = w * r.h / r.w;
  const x = esquina.includes("w") ? ancla.x - w : ancla.x;
  const y = esquina.includes("n") ? ancla.y - h : ancla.y;
  return { x, y, w, h };
}
