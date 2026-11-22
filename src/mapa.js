// src/mapa.js
// Tablero con paneo y zoom. Solo vuelve a dibujar cuando hay cambios.
import { camaraNueva, mover, zoomEnPunto } from "./camara.js";

const cam = camaraNueva();
let canvas = null;
let ctx = null;
let ancho = 0;
let alto = 0;
let dpr = 1;
let sucio = true;
let centrado = false;
let arrastrando = false;
let ultimo = { x: 0, y: 0 };

export function camaraActual() {
  return cam;
}

export function pedirRedibujo() {
  sucio = true;
}

function ajustarTamano() {
  const r = canvas.getBoundingClientRect();
  ancho = Math.round(r.width);
  alto = Math.round(r.height);
  if (ancho === 0 || alto === 0) return;

  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(ancho * dpr);
  canvas.height = Math.round(alto * dpr);

  if (!centrado) {
    cam.x = 500 - ancho / 2 / cam.zoom;
    cam.y = 500 - alto / 2 / cam.zoom;
    centrado = true;
  }
  sucio = true;
}

function cuadricula() {
  const paso = 100;
  const izq = cam.x;
  const arr = cam.y;
  const der = cam.x + ancho / cam.zoom;
  const aba = cam.y + alto / cam.zoom;

  ctx.beginPath();
  for (let x = Math.floor(izq / paso) * paso; x <= der; x += paso) {
    ctx.moveTo(x, arr);
    ctx.lineTo(x, aba);
  }
  for (let y = Math.floor(arr / paso) * paso; y <= aba; y += paso) {
    ctx.moveTo(izq, y);
    ctx.lineTo(der, y);
  }
  ctx.lineWidth = 1 / cam.zoom;
  ctx.strokeStyle = "#232834";
  ctx.stroke();
}

function dibujar() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#101218";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const k = dpr * cam.zoom;
  ctx.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
  cuadricula();
  ctx.lineWidth = 2 / cam.zoom;
  ctx.strokeStyle = "#c9a45c";
  ctx.strokeRect(0, 0, 1000, 1000);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#8b93a5";
  ctx.font = "12px sans-serif";
  ctx.fillText(`zoom ${Math.round(cam.zoom * 100)}%`, 10, alto - 10);
}

function bucle() {
  if (sucio && ancho > 0) {
    sucio = false;
    dibujar();
  }
  requestAnimationFrame(bucle);
}

export function iniciarMapa() {
  if (canvas) return;
  canvas = document.getElementById("mapa");
  ctx = canvas.getContext("2d");

  new ResizeObserver(ajustarTamano).observe(canvas);

  canvas.addEventListener("pointerdown", (ev) => {
    arrastrando = true;
    ultimo = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!arrastrando) return;
    mover(cam, ev.clientX - ultimo.x, ev.clientY - ultimo.y);
    ultimo = { x: ev.clientX, y: ev.clientY };
    sucio = true;
  });
  const soltar = (ev) => {
    arrastrando = false;
    try { canvas.releasePointerCapture(ev.pointerId); } catch { /* ya estaba suelto */ }
  };
  canvas.addEventListener("pointerup", soltar);
  canvas.addEventListener("pointercancel", soltar);

  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomEnPunto(cam, ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * 0.0015));
    sucio = true;
  }, { passive: false });

  ajustarTamano();
  bucle();
}
