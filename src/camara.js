// src/camara.js
// Matematica de la camara del mapa. Es logica pura (sin DOM).

export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 4;

export function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function camaraNueva() {
  return { x: 0, y: 0, zoom: 1 };
}

export function worldToScreen(cam, wx, wy) {
  return { x: (wx - cam.x) * cam.zoom, y: (wy - cam.y) * cam.zoom };
}

export function screenToWorld(cam, sx, sy) {
  return { x: sx / cam.zoom + cam.x, y: sy / cam.zoom + cam.y };
}

export function mover(cam, dx, dy) {
  cam.x -= dx / cam.zoom;
  cam.y -= dy / cam.zoom;
}

export function limitarCamaraAlMapa(cam, ancho, alto, mapa) {
  const zoomMinimo = Math.max(ZOOM_MIN, ancho / mapa.w, alto / mapa.h);
  cam.zoom = Math.min(ZOOM_MAX, Math.max(cam.zoom, zoomMinimo));

  const vistaAncho = ancho / cam.zoom;
  const vistaAlto = alto / cam.zoom;
  const maxX = mapa.x + mapa.w - vistaAncho;
  const maxY = mapa.y + mapa.h - vistaAlto;
  cam.x = maxX < mapa.x ? mapa.x + (mapa.w - vistaAncho) / 2 : limitar(cam.x, mapa.x, maxX);
  cam.y = maxY < mapa.y ? mapa.y + (mapa.h - vistaAlto) / 2 : limitar(cam.y, mapa.y, maxY);
  return cam;
}

export function zoomEnPunto(cam, sx, sy, factor) {
  const antes = screenToWorld(cam, sx, sy);
  cam.zoom = limitar(cam.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  cam.x = antes.x - sx / cam.zoom;
  cam.y = antes.y - sy / cam.zoom;
}
