import { estado } from "./state.js";
import {
  borrarPersonaje, renombrarPersonaje, ajustarActual,
  cambiarEstadoPersonaje, asignarDueno
} from "./characters.js";
import { h, toast, traducirError } from "./utils.js";
import { abrirEdicion } from "./pj-form.js";

const TOPE = 15;

function fila(etiqueta, valor) {
  return h("div", { class: "fila-stat" }, h("span", {}, etiqueta), String(valor));
}

async function intentar(fn) {
  try {
    await fn();
  } catch (e) {
    toast(traducirError(e), "error");
  }
}

function borrar(p) {
  if (!confirm(`¿Borrar a ${p.nombre}?`)) return;
  return intentar(() => borrarPersonaje(estado.codigo, p.id));
}

function renombrar(p) {
  const nuevo = prompt("Nuevo nombre:", p.nombre);
  if (nuevo === null) return;
  return intentar(() => renombrarPersonaje(estado.codigo, p.id, nuevo));
}

function ajustar(p, campo, delta) {
  return intentar(() => ajustarActual(estado.codigo, p.id, campo, p[campo] + delta));
}

function alternarMuerte(p) {
  // TODO 1: cambiar entre "vivo" y "muerto".
}

function asignar(p, uid) {
  // TODO 2: asignar el personaje al jugador indicado.
}

function filaAjustable(etiqueta, p, campo, base) {
  return h("div", { class: "fila-stat" },
    h("span", {}, etiqueta),
    h("span", { class: "base", title: "Tirada inicial" }, `base ${base}`),
    h("span", { class: "ajuste" },
      estado.esLoremaster ? h("button", { class: "btn chico", onclick: () => ajustar(p, campo, -1) }, "-") : null,
      `${p[campo]}/${TOPE}`,
      estado.esLoremaster ? h("button", { class: "btn chico", onclick: () => ajustar(p, campo, 1) }, "+") : null));
}

function nombreDe(uid) {
  if (!uid) return "—";
  return estado.jugadores.find((j) => j.uid === uid)?.nombre ?? "—";
}

function selectorDueno(p) {
  const actual = p.meta?.duenoUid ?? "";
  const candidatos = estado.jugadores.filter(
    (j) => !j.esLoremaster && (j.estado === "activo" || j.estado === "pausa")
  );
  return h("select", { class: "sel-dueno", onchange: (ev) => asignar(p, ev.target.value) },
    h("option", { value: "", selected: actual === "" }, "Sin dueño"),
    candidatos.map((j) => h("option", { value: j.uid, selected: j.uid === actual }, j.nombre)));
}

function filaDueno(p) {
  return h("div", { class: "fila-stat" },
    h("span", {}, "Dueño"),
    estado.esLoremaster ? selectorDueno(p) : h("span", {}, nombreDe(p.meta?.duenoUid)));
}

function crearTarjeta(p) {
  const muerto = p.estado === "muerto";
  const mia = p.meta?.duenoUid === estado.uid;
  const clases = ["tarjeta", muerto ? "muerta" : "", mia ? "mia" : ""].filter(Boolean).join(" ");

  return h("li", { class: clases },
    h("strong", {}, p.nombre),
    filaAjustable("Vida", p, "vidaActual", p.stats.vida),
    fila("Fuerza", `${p.stats.fuerza}/${TOPE}`),
    filaAjustable("Magia", p, "magiaActual", p.stats.magia),
    fila("Encanto", `${p.stats.encanto}/${TOPE}`),
    fila("Raza", p.raza?.nombre || "—"),
    filaDueno(p),
    muerto ? h("em", {}, "Muerto") : null,
    estado.esLoremaster
      ? h("div", { class: "acciones" },
          h("button", { class: "btn chico", onclick: () => abrirEdicion(p) }, "Editar"),
          h("button", { class: "btn chico", onclick: () => renombrar(p) }, "Renombrar"),
          h("button", { class: "btn chico", onclick: () => alternarMuerte(p) }, muerto ? "Revivir" : "Marcar muerto"),
          h("button", { class: "btn chico peligro", onclick: () => borrar(p) }, "Borrar"))
      : null
  );
}

export function pintarPersonajes(lista, contenedor) {
  if (lista.length === 0) {
    contenedor.replaceChildren(h("li", { class: "vacio" }, "Aún no hay personajes"));
    return;
  }

  contenedor.replaceChildren(...lista.map(crearTarjeta));
}