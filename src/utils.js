export const $ = (sel, raiz = document) => raiz.querySelector(sel);

// Crea elementos DOM sin innerHTML (evita inyección de HTML).
export function h(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of hijos.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}

export const CODIGO_RE = /^[A-Z0-9]{4}$/;
export const normalizarCodigo = (s) =>
  String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
export const limpiarNombre = (s) =>
  String(s || "").replace(/\s+/g, " ").trim().slice(0, 20);

export function toast(msg, tipo = "info", ms = 4000) {
  const t = h("div", { class: `toast ${tipo}` }, msg);
  $("#toasts").append(t);
  setTimeout(() => t.remove(), ms);
}

export function traducirError(e) {
  const m = e?.message || "";
  if (m === "CODIGO_OCUPADO") return "Ese código ya está en uso. Prueba con otro.";
  if (m === "SALA_NO_EXISTE") return "No existe una sala con ese código.";
  if (e?.code === "permission-denied") return "No tienes permiso para hacer eso.";
  if (e?.code === "unavailable") return "Sin conexión con el servidor. Revisa tu internet.";
  return "Algo falló: " + (m || "error desconocido");
}

export function millis(ts) {
  return ts?.toMillis ? ts.toMillis() : Date.now();
}
