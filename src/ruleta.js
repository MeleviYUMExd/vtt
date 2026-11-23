// Ruletas y dados animados compartidos por toda la mesa.
import { db, doc, setDoc, onSnapshot, serverTimestamp } from "./firebase.js";
import { h } from "./utils.js";
import { rotacionFinal } from "./ruleta-logica.js";

const DURACION = 4500;
const DURACION_DADOS = 1700;
const VISIBLE_TRAS = 3500;
const COLORES = ["#8e5fd1", "#e08fb5", "#4fb3a2", "#e0b45f", "#6b8fe0", "#d96b6b", "#8fcf7a", "#c78fe0"];
const DOS_PI = 2 * Math.PI;

let codigo = null;
let miUid = null;
let miNombre = "";
let desuscribir = null;
let primera = true;
let ultimoId = null;
let rotActual = 0;
const pendientes = new Map();

let overlay, escena, canvas, ctx, tituloEl, resultadoEl, dadosEl;
let rafId = 0, cerrarTimer = 0, cicloTimer = 0, finTimer = 0;

export function iniciarRuleta() {
  if (overlay) return;
  canvas = h("canvas", { width: 440, height: 440, id: "ruleta-canvas" });
  ctx = canvas.getContext("2d");
  tituloEl = h("h3", { id: "ruleta-titulo" });
  resultadoEl = h("p", { class: "ruleta-resultado" });
  dadosEl = h("div", { class: "dados-fila", hidden: true });
  escena = h("div", { class: "ruleta-escena" }, h("div", { class: "ruleta-puntero" }), canvas);
  overlay = h("div", { id: "ruleta-overlay", hidden: true },
    h("div", { class: "ruleta-caja" },
      tituloEl, escena, dadosEl, resultadoEl,
      h("button", { class: "btn chico", onclick: ocultar }, "Cerrar")));
  document.body.append(overlay);
}

export function conectarRuleta(cod, uid, nombre) {
  desconectarRuleta();
  codigo = cod;
  miUid = uid;
  miNombre = nombre || "";
  primera = true;
  ultimoId = null;
  desuscribir = onSnapshot(doc(db, "salas", cod, "ruletas", "actual"), (d) => {
    if (!d.exists()) { primera = false; return; }
    const data = d.data();
    if (primera) { primera = false; ultimoId = data.id; return; }
    if (data.id === ultimoId) return;
    ultimoId = data.id;
    reproducir(data);
  }, (e) => console.error("ruleta:", e));
}

export function desconectarRuleta() {
  if (desuscribir) desuscribir();
  desuscribir = null;
  codigo = null;
}

function idNuevo() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
}

function enviar(base) {
  return new Promise((resolve, reject) => {
    if (!codigo) throw new Error("No estás conectado a una sala.");
    const id = idNuevo();
    primera = false;
    const datos = {
      id, tipo: "ruleta", titulo: "", opciones: [], resultado: -1,
      caras: 0, valores: [], etiquetas: [],
      ...base,
      giradaPor: miUid, nombreGirador: miNombre.slice(0, 30), ts: serverTimestamp()
    };
    pendientes.set(id, resolve);
    setDoc(doc(db, "salas", codigo, "ruletas", "actual"), datos)
      .catch((e) => { pendientes.delete(id); reject(e); });
  });
}

export function girarRuleta(titulo, opciones, idx) {
  return enviar({
    tipo: "ruleta",
    titulo: String(titulo).slice(0, 80),
    opciones: opciones.map((o) => String(o).slice(0, 40)),
    resultado: idx
  });
}

export function lanzarDados(titulo, caras, valores, etiquetas = []) {
  return enviar({ tipo: "dados", titulo: String(titulo).slice(0, 80), caras, valores, etiquetas });
}

function ocultar() {
  clearTimeout(cerrarTimer);
  overlay.hidden = true;
}

function liberarPendientes(exceptoId) {
  for (const [id, resolver] of pendientes) {
    if (id !== exceptoId) { pendientes.delete(id); resolver(null); }
  }
}

function reproducir(data) {
  cancelAnimationFrame(rafId);
  clearTimeout(cerrarTimer);
  clearInterval(cicloTimer);
  clearTimeout(finTimer);
  liberarPendientes(data.id);

  overlay.hidden = false;
  tituloEl.textContent = data.nombreGirador ? `${data.titulo} · ${data.nombreGirador}` : data.titulo;
  resultadoEl.textContent = "";
  if (data.tipo === "dados") animarDados(data);
  else animarRuleta(data);
}

function terminar(data, texto) {
  resultadoEl.textContent = texto;
  const resolver = pendientes.get(data.id);
  if (resolver) { pendientes.delete(data.id); resolver(data); }
  cerrarTimer = setTimeout(ocultar, VISIBLE_TRAS);
}

function recortar(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function dibujarRueda(opciones, rot) {
  const W = canvas.width, c = W / 2, R = c - 8;
  const n = opciones.length, paso = DOS_PI / n;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(rot);
  for (let i = 0; i < n; i++) {
    const ini = -Math.PI / 2 + i * paso;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, ini, ini + paso);
    ctx.closePath();
    ctx.fillStyle = COLORES[i % COLORES.length];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1b1530";
    ctx.stroke();

    ctx.save();
    ctx.rotate(ini + paso / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${n > 14 ? 11 : 16}px "Almendra", serif`;
    ctx.fillText(recortar(opciones[i], 16), R - 16, 5);
    ctx.restore();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(c, c, 22, 0, DOS_PI);
  ctx.fillStyle = "#f0c868";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#1b1530";
  ctx.stroke();
}

function animarRuleta(data) {
  dadosEl.hidden = true;
  escena.hidden = false;
  const n = data.opciones.length;
  if (!n) return terminar(data, "");

  const desde = rotActual % DOS_PI;
  const hasta = rotacionFinal(n, data.resultado, desde, 5, (Math.random() - 0.5) * 0.6);
  const t0 = performance.now();
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / DURACION);
    const suave = 1 - Math.pow(1 - k, 3);
    rotActual = desde + (hasta - desde) * suave;
    dibujarRueda(data.opciones, rotActual);
    if (k < 1) rafId = requestAnimationFrame(paso);
    else terminar(data, "Resultado: " + data.opciones[data.resultado]);
  };
  rafId = requestAnimationFrame(paso);
}

function numeroAlAzar(caras) {
  return caras >= 20 ? 1 + Math.floor(Math.random() * 20) : Math.floor(Math.random() * 5);
}

function animarDados(data) {
  escena.hidden = true;
  dadosEl.hidden = false;
  const forma = data.caras >= 20 ? "d20" : "d4";
  dadosEl.replaceChildren(...data.valores.map((_, i) =>
    h("div", { class: "dado-caja" },
      h("div", { class: `dado ${forma} rodando` }, h("span", { class: "dado-num" }, "?")),
      data.etiquetas[i] ? h("small", {}, data.etiquetas[i]) : null)));

  const nums = [...dadosEl.querySelectorAll(".dado-num")];
  cicloTimer = setInterval(() => nums.forEach((s) => { s.textContent = numeroAlAzar(data.caras); }), 70);

  finTimer = setTimeout(() => {
    clearInterval(cicloTimer);
    nums.forEach((s, i) => {
      s.textContent = data.valores[i];
      s.parentElement.classList.remove("rodando");
      s.parentElement.classList.add("quieto");
    });
    const texto = data.etiquetas.length
      ? data.etiquetas.map((e, i) => `${e} ${data.valores[i]}`).join(" · ")
      : data.valores.join(" · ");
    terminar(data, texto);
  }, DURACION_DADOS);
}
