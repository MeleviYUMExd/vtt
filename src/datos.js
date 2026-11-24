// Panel Datos con las 4 bases del compendio.
import { h, toast, traducirError } from "./utils.js";
import {
  CATEGORIAS, escucharCompendio, entradasDe, crearEntrada, actualizarEntrada, borrarEntrada
} from "./compendio.js";
import { girarCategoria } from "./sorteo.js";
import { centrarVista } from "./mapa.js";
import { rosaDeLosVientos } from "./rosa.js";

const ORDEN = ["razas", "habilidades", "spawn", "objetos"];

let panel = null;
let cuerpo = null;
let desuscribir = null;
let codigoSala = null;
let miUid = null;
let tab = "razas";
let editando = null;

export function iniciarDatos(contenedor) {
  if (panel) return;
  const menu = h("button", { class: "btn-menu", title: "Datos", onclick: alternar }, "☰");
  const centrar = h("button", { class: "btn-menu btn-centrar", title: "Centrar vista", onclick: () => centrarVista() });
  centrar.innerHTML = rosaDeLosVientos(34);
  cuerpo = h("div", { class: "datos-cuerpo" });
  panel = h("aside", { class: "datos-panel", hidden: true },
    h("header", { class: "datos-cab" },
      h("h2", {}, "Datos"),
      h("button", { class: "btn chico", onclick: alternar }, "✕")),
    cuerpo);
  contenedor.append(menu, centrar, panel);
}

export function conectarDatos(codigo, uid) {
  desconectarDatos();
  codigoSala = codigo;
  miUid = uid;
  desuscribir = escucharCompendio(codigo, () => pintar(true), (e) => toast(traducirError(e), "error"));
}

export function desconectarDatos() {
  if (desuscribir) desuscribir();
  desuscribir = null;
}

function alternar() {
  panel.hidden = !panel.hidden;
  if (!panel.hidden) pintar();
}

function pintar(desdeSnapshot = false) {
  if (!panel || panel.hidden) return;
  if (desdeSnapshot && editando) return;
  const lista = entradasDe(tab);

  cuerpo.replaceChildren(
    h("nav", { class: "datos-tabs" }, ...ORDEN.map((c) =>
      h("button", {
        class: "btn chico" + (c === tab ? " activo" : ""),
        onclick: () => { tab = c; editando = null; pintar(); }
      }, CATEGORIAS[c]))),
    h("div", { class: "datos-barra" },
      h("button", { class: "btn chico primario", disabled: lista.length ? false : "", onclick: () => girar(tab) }, "🎡 Girar ruleta"),
      h("button", { class: "btn chico", onclick: () => { editando = "nuevo"; pintar(); } }, "+ Añadir")),
    editando ? formulario(lista) : null,
    h("ul", { class: "lista datos-lista" },
      ...(lista.length ? lista.map(fila) : [h("li", { class: "vacio" }, "Aún no hay entradas")]))
  );
}

function fila(e) {
  return h("li", { class: "dato" },
    h("div", { class: "dato-info" },
      h("strong", {}, e.nombre),
      e.descripcion ? h("small", {}, e.descripcion) : null,
      e.subOpciones?.length ? h("small", { class: "dato-sub" }, "Ruleta extra: " + e.subOpciones.join(", ")) : null),
    h("span", { class: "acciones" },
      h("button", { class: "btn chico", title: "Editar", onclick: () => { editando = e.id; pintar(); } }, "✎"),
      h("button", { class: "btn chico peligro", title: "Borrar", onclick: () => quitar(e) }, "🗑")));
}

function formulario(lista) {
  const e = editando === "nuevo" ? null : lista.find((x) => x.id === editando);
  const nom = h("input", { maxlength: 40, value: e?.nombre ?? "", placeholder: "Nombre", required: "" });
  const des = h("textarea", { maxlength: 300, rows: 2, placeholder: "Descripción (opcional)" }, e?.descripcion ?? "");
  const subs = tab === "habilidades"
    ? h("textarea", { rows: 4, placeholder: "Una por línea. Si pones opciones, al salir esta habilidad se gira una ruleta extra con ellas (ej. Stand: Star Platinum, Echoes...)" },
        (e?.subOpciones ?? []).join("\n"))
    : null;

  return h("form", {
    class: "datos-form",
    onsubmit: async (ev) => {
      ev.preventDefault();
      const datos = {
        categoria: tab,
        nombre: nom.value,
        descripcion: des.value,
        subOpciones: subs ? subs.value.split("\n") : []
      };
      try {
        if (e) await actualizarEntrada(codigoSala, e.id, datos);
        else await crearEntrada(codigoSala, datos, miUid);
        editando = null;
        pintar();
      } catch (err) { toast(traducirError(err), "error"); }
    }
  },
    h("label", {}, "Nombre", nom),
    h("label", {}, "Descripción", des),
    subs ? h("label", {}, "Ruleta extra (opcional)", subs) : null,
    h("div", { class: "fila" },
      h("button", { type: "submit", class: "btn chico primario" }, "Guardar"),
      h("button", { type: "button", class: "btn chico", onclick: () => { editando = null; pintar(); } }, "Cancelar")));
}

async function quitar(e) {
  if (!confirm(`¿Borrar "${e.nombre}" para todos?`)) return;
  try { await borrarEntrada(codigoSala, e.id); }
  catch (err) { toast(traducirError(err), "error"); }
}

async function girar(cat) {
  try {
    const r = await girarCategoria(cat);
    if (!r) toast("No hay entradas para girar.", "error");
  } catch (err) { toast(traducirError(err), "error"); }
}
