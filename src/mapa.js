// src/mapa.js
// Tablero con paneo y zoom. Solo vuelve a dibujar cuando hay cambios.
import { camaraNueva, mover, zoomEnPunto, screenToWorld } from "./camara.js";
import { puntoEnRect, esquinaEn, esquinas, moverRect, redimensionar } from "./geometria.js";
import { toast } from "./utils.js";

const cam = camaraNueva();
const CAJA = 1000;
const MOSTRAR_REJILLA = false;
let canvas = null;
let ctx = null;
let ancho = 0;
let alto = 0;
let dpr = 1;
let sucio = true;
let fondo = null;
let urlFondo = "";
let fondoRect = null;
let rectRemoto = null;
let tokens = [];
const imagenes = new Map();
const RADIO_ESQUINA = 14;
let puedeEditar = false;
let seleccionado = false;
let miUid = null;
let soyLM = false;
let tokenSel = null;
let tokenLocal = null;
let alSoltarToken = null;
let alBorrarToken = null;
let esNoche = false;
let accion = null;
let alCambiarFondo = null;
let centrado = false;
let ultimo = { x: 0, y: 0 };
let fondoInicializado = false;
let movimientoUsuario = false;

export function configurarUsuario(uid, esLM) {
  miUid = uid;
  soyLM = esLM;
}

export function onTokenSoltado(fn) {
  alSoltarToken = fn;
}

export function onTokenBorrado(fn) {
  alBorrarToken = fn;
}

export function ponerNoche(si) {
  esNoche = si;
  sucio = true;
}

export function camaraActual() {
  return cam;
}

export function pedirRedibujo() {
  sucio = true;
}

export function permitirEdicion(si) {
  puedeEditar = si;
  if (!si && seleccionado) { seleccionado = false; sucio = true; }
}

function obtenerImagen(url) {
  let e = imagenes.get(url);
  if (e) return e;
  const img = new Image();
  e = { img, listo: false };
  imagenes.set(url, e);
  img.onload = () => { e.listo = true; sucio = true; };
  img.src = url;
  return e;
}

export function ponerTokens(lista) {
  tokens = lista;
  if (tokenLocal) {
    const remoto = lista.find((t) => t.id === tokenLocal.id);
    if (remoto && remoto.x === tokenLocal.x && remoto.y === tokenLocal.y && remoto.tam === tokenLocal.tam) {
      tokenLocal = null;
    }
  }
  if (tokenSel && !lista.some((t) => t.id === tokenSel)) tokenSel = null;
  sucio = true;
}

export function centroVista() {
  return screenToWorld(cam, ancho / 2, alto / 2);
}

export function centrarVista() {
  if (!ancho || !alto) return;
  const rect = fondoRect || { x: 0, y: 0, w: CAJA, h: CAJA };
  cam.zoom = Math.max(0.2, Math.min(ancho / rect.w, alto / rect.h, 4));
  cam.x = rect.x + rect.w / 2 - ancho / 2 / cam.zoom;
  cam.y = rect.y + rect.h / 2 - alto / 2 / cam.zoom;
  centrado = true;
  movimientoUsuario = true;
  sucio = true;
}

function dibujarToken(t) {
  t = tokenVisible(t);
  const r = t.tam / 2;
  const e = obtenerImagen(t.imagenUrl);

  if (e.listo) {
    const lado = Math.min(e.img.width, e.img.height);
    const sx = (e.img.width - lado) / 2;
    const sy = (e.img.height - lado) / 2;
    ctx.drawImage(e.img, sx, sy, lado, lado, t.x - r, t.y - r, t.tam, t.tam);
  } else {
    ctx.fillStyle = "#252a35";
    ctx.fillRect(t.x - r, t.y - r, t.tam, t.tam);
  }

  ctx.lineWidth = 3 / cam.zoom;
  ctx.strokeStyle = "#c9a45c";
  ctx.strokeRect(t.x - r, t.y - r, t.tam, t.tam);

  ctx.save();
  ctx.font = `${14 / cam.zoom}px sans-serif`;
  ctx.fillStyle = "#e8e2d4";
  ctx.textAlign = "center";
  ctx.fillText(t.nombre, t.x, t.y + r + 16 / cam.zoom);
  ctx.restore();
}

function rectPorDefecto(img) {
  const escala = CAJA / Math.max(img.width, img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  return { x: (CAJA - w) / 2, y: (CAJA - h) / 2, w, h };
}

export function ponerRectFondo(r) {
  const valido = r && [r.x, r.y, r.w, r.h].every(Number.isFinite);
  rectRemoto = valido ? r : null;
  const arrastrando = accion && accion.tipo !== "camara";
  if (fondo && !arrastrando) {
    fondoRect = rectRemoto ?? rectPorDefecto(fondo);
    sucio = true;
  }
}

export function alSoltarFondo(fn) {
  alCambiarFondo = fn;
}

function puntoMundo(ev) {
  const r = canvas.getBoundingClientRect();
  return screenToWorld(cam, ev.clientX - r.left, ev.clientY - r.top);
}

const rectToken = (t) => ({ x: t.x - t.tam / 2, y: t.y - t.tam / 2, w: t.tam, h: t.tam });
const puedeEditarToken = (t) => soyLM || t.duenoUid === miUid;

function tokenVisible(t) {
  return tokenLocal && tokenLocal.id === t.id ? { ...t, ...tokenLocal } : t;
}

function tokenEn(p) {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokenVisible(tokens[i]);
    if (puntoEnRect(rectToken(t), p)) return t;
  }
  return undefined;
}

export function ponerFondo(url) {
  const limpia = url || "";
  if (limpia === urlFondo) return;
  urlFondo = limpia;
  seleccionado = false;
  if (!limpia) { fondo = null; fondoRect = null; sucio = true; return; }

  const img = new Image();
  img.onload = () => {
    if (urlFondo === limpia) {
      fondo = img;
      fondoRect = rectRemoto ?? rectPorDefecto(img);
      if (!fondoInicializado && !movimientoUsuario) {
        const rect = fondoRect;
        cam.zoom = Math.max(0.2, Math.min(ancho / rect.w, alto / rect.h, 4));
        cam.x = rect.x + rect.w / 2 - ancho / 2 / cam.zoom;
        cam.y = rect.y + rect.h / 2 - alto / 2 / cam.zoom;
        centrado = true;
      }
      fondoInicializado = true;
      sucio = true;
    }
  };
  img.onerror = () => toast("No se pudo cargar la imagen de fondo.", "error");
  img.src = limpia;
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
    cam.zoom = Math.min(ancho, alto) / 1050;
    cam.x = CAJA / 2 - ancho / 2 / cam.zoom;
    cam.y = CAJA / 2 - alto / 2 / cam.zoom;
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
  if (fondo && fondoRect) {
    ctx.drawImage(fondo, fondoRect.x, fondoRect.y, fondoRect.w, fondoRect.h);
  }
  if (seleccionado && fondoRect) {
    ctx.lineWidth = 2 / cam.zoom;
    ctx.strokeStyle = "#c9a45c";
    ctx.strokeRect(fondoRect.x, fondoRect.y, fondoRect.w, fondoRect.h);

    const t = 12 / cam.zoom;
    ctx.fillStyle = "#c9a45c";
    for (const c of Object.values(esquinas(fondoRect))) {
      ctx.fillRect(c.x - t / 2, c.y - t / 2, t, t);
    }
  }
  if (MOSTRAR_REJILLA) cuadricula();
  for (const t of tokens) dibujarToken(t);

  const sel = tokens.find((t) => t.id === tokenSel);
  if (sel && puedeEditarToken(sel)) {
    const r = rectToken(tokenVisible(sel));
    ctx.lineWidth = 2 / cam.zoom;
    ctx.strokeStyle = "#c9a45c";
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    const lado = 12 / cam.zoom;
    ctx.fillStyle = "#c9a45c";
    for (const c of Object.values(esquinas(r))) {
      ctx.fillRect(c.x - lado / 2, c.y - lado / 2, lado, lado);
    }
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (esNoche) {
    ctx.fillStyle = "rgba(10, 20, 70, 0.35)";
    ctx.fillRect(0, 0, ancho, alto);
  }
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
    const p = puntoMundo(ev);
    accion = { tipo: "camara", cambio: false };
    ultimo = { x: ev.clientX, y: ev.clientY };

    const sel = tokens.find((t) => t.id === tokenSel);
    if (sel && puedeEditarToken(sel)) {
      const esq = esquinaEn(rectToken(tokenVisible(sel)), p, RADIO_ESQUINA / cam.zoom);
      if (esq) {
        accion = { tipo: "tokenEsquina", id: sel.id, esq, inicial: rectToken(tokenVisible(sel)), cambio: false };
        canvas.setPointerCapture(ev.pointerId);
        return;
      }
    }
    const t = tokenEn(p);
    if (t) {
      tokenSel = t.id;
      sucio = true;
      if (puedeEditarToken(t)) {
        accion = { tipo: "tokenMover", id: t.id, desde: p, inicial: rectToken(t), cambio: false };
        canvas.setPointerCapture(ev.pointerId);
        return;
      }
    } else if (tokenSel) {
      tokenSel = null;
      sucio = true;
    }

    if (puedeEditar && seleccionado && fondoRect) {
      const esq = esquinaEn(fondoRect, p, RADIO_ESQUINA / cam.zoom);
      if (esq) {
        accion = { tipo: "esquina", esq, inicial: { ...fondoRect }, cambio: false };
      } else if (puntoEnRect(fondoRect, p)) {
        accion = { tipo: "mover", desde: p, inicial: { ...fondoRect }, cambio: false };
      } else {
        seleccionado = false;
        sucio = true;
      }
    }
    ultimo = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!accion) return;

    if (accion.tipo === "tokenMover") {
      const p = puntoMundo(ev);
      const n = moverRect(accion.inicial, p.x - accion.desde.x, p.y - accion.desde.y);
      tokenLocal = { id: accion.id, x: n.x + n.w / 2, y: n.y + n.h / 2, tam: n.w };
      accion.cambio = n.x !== accion.inicial.x || n.y !== accion.inicial.y;
    } else if (accion.tipo === "tokenEsquina") {
      const n = redimensionar(accion.inicial, accion.esq, puntoMundo(ev));
      const tam = Math.min(n.w, 2000);
      const opuestas = { nw: "se", ne: "sw", sw: "ne", se: "nw" };
      const ancla = esquinas(accion.inicial)[opuestas[accion.esq]];
      const x = accion.esq.includes("w") ? ancla.x - tam : ancla.x;
      const y = accion.esq.includes("n") ? ancla.y - tam : ancla.y;
      tokenLocal = { id: accion.id, x: x + tam / 2, y: y + tam / 2, tam };
      accion.cambio = x !== accion.inicial.x || y !== accion.inicial.y || tam !== accion.inicial.w;
    } else if (accion.tipo === "camara") {
      movimientoUsuario = true;
      mover(cam, ev.clientX - ultimo.x, ev.clientY - ultimo.y);
      ultimo = { x: ev.clientX, y: ev.clientY };
    } else if (accion.tipo === "mover") {
      const p = puntoMundo(ev);
      fondoRect = moverRect(accion.inicial, p.x - accion.desde.x, p.y - accion.desde.y);
      accion.cambio = true;
    } else if (accion.tipo === "esquina") {
      fondoRect = redimensionar(accion.inicial, accion.esq, puntoMundo(ev));
      accion.cambio = true;
    }
    sucio = true;
  });
  const soltar = (ev) => {
    if (accion && accion.tipo.startsWith("token") && accion.cambio && tokenLocal && alSoltarToken) {
      alSoltarToken(tokenLocal.id, { x: tokenLocal.x, y: tokenLocal.y, tam: tokenLocal.tam });
    }
    if (accion && (accion.tipo === "mover" || accion.tipo === "esquina") && accion.cambio && alCambiarFondo) {
      alCambiarFondo({ ...fondoRect });
    }
    accion = null;
    try { canvas.releasePointerCapture(ev.pointerId); } catch { /* ya estaba suelto */ }
  };
  canvas.addEventListener("pointerup", soltar);
  canvas.addEventListener("pointercancel", soltar);

  canvas.addEventListener("dblclick", (ev) => {
    if (puedeEditar && fondoRect && puntoEnRect(fondoRect, puntoMundo(ev))) {
      seleccionado = true;
      sucio = true;
    }
  });

  window.addEventListener("keydown", (ev) => {
    const escribiendo = ["INPUT", "TEXTAREA"].includes(ev.target.tagName);
    if (escribiendo) return;
    if (ev.key === "Escape") {
      tokenSel = null;
      if (seleccionado) seleccionado = false;
      sucio = true;
    }
    if (ev.key === "Delete" && tokenSel) {
      const t = tokens.find((x) => x.id === tokenSel);
      if (t && soyLM && alBorrarToken) alBorrarToken(tokenSel);
      tokenSel = null;
      sucio = true;
    }
  });

  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    movimientoUsuario = true;
    const r = canvas.getBoundingClientRect();
    zoomEnPunto(cam, ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * 0.0015));
    sucio = true;
  }, { passive: false });

  ajustarTamano();
  bucle();
}
