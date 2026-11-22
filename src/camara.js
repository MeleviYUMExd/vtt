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

export function zoomEnPunto(cam, sx, sy, factor) {
  const antes = screenToWorld(cam, sx, sy);
  cam.zoom = limitar(cam.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  cam.x = antes.x - sx / cam.zoom;
  cam.y = antes.y - sy / cam.zoom;
}
