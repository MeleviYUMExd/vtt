// src/cards.js
import { estado } from "./state.js";
import {
  borrarPersonaje, renombrarPersonaje, ajustarCampo,
  cambiarEstadoPersonaje, asignarDueno
} from "./characters.js";
import { h, toast, traducirError } from "./utils.js";

const TOPE = 15;

function fila(etiqueta, valor) {
  return h("div", { class: "fila-stat" }, h("span", {}, etiqueta), String(valor));
}

async function intentar(fn, aviso) {
  try {
    await fn();
    if (aviso) toast(aviso, "ok");
  } catch (e) {
    toast(traducirError(e), "error");
  }
}

function nombreDe(uid) {
  if (!uid) return "—";
  return estado.jugadores.find((j) => j.uid === uid)?.nombre ?? "—";
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

function ajustar(p, campo, valor, delta) {
  return intentar(() => ajustarCampo(estado.codigo, p.id, campo, valor + delta));
}

function alternarMuerte(p) {
  const nuevo = p.estado === "muerto" ? "vivo" : "muerto";
  const aviso = nuevo === "muerto" ? `${p.nombre} murió.` : `${p.nombre} revivió.`;
  return intentar(
    () => cambiarEstadoPersonaje(estado.codigo, p.id, nuevo, p.meta?.duenoUid ?? null),
    aviso
  );
}

function asignar(p, uid) {
  const aviso = uid ? `${p.nombre} ahora es de ${nombreDe(uid)}.` : `${p.nombre} se quedó sin dueño.`;
  return intentar(() => asignarDueno(estado.codigo, p.id, uid), aviso);
}

function filaFlechas(etiqueta, p, campo, valor, tope) {
  const lm = estado.esLoremaster;
  return h("div", { class: "fila-stat" },
    h("span", {}, etiqueta),
    h("span", { class: "ajuste" },
      lm ? h("button", { class: "btn chico", onclick: () => ajustar(p, campo, valor, -1) }, "-") : null,
      `${valor}/${tope}`,
      lm ? h("button", { class: "btn chico", onclick: () => ajustar(p, campo, valor, 1) }, "+") : null));
}

function filasHabilidades(p) {
  const total = (p.habilidadesMax ?? 1) + (p.habilidadesExtra ?? 0);
  const lista = p.habilidades ?? [];
  const filas = [];
  for (let i = 0; i < total; i++) {
    const hab = lista[i];
    const nivel = hab && hab.nivelActual > 0 ? ` (nivel ${hab.nivelActual})` : "";
    filas.push(fila(`Habilidad ${i + 1}`, hab ? `${hab.nombre || "—"}${nivel}` : "—"));
  }
  return filas;
}

function selectorDueno(p) {
  const actual = p.meta?.duenoUid ?? "";
  const candidatos = estado.jugadores.filter(
    (j) => j.estado === "activo" || j.estado === "pausa"
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
  const mia = !muerto && p.meta?.duenoUid === estado.uid;
  const turno = estado.turnos?.actual === p.id;
  const clases = ["tarjeta", muerto ? "muerta" : "", mia ? "mia" : "", turno ? "turno" : ""].filter(Boolean).join(" ");
  const eraDe = p.meta?.duenoAnterior ? ` (era de ${nombreDe(p.meta.duenoAnterior)})` : "";

  return h("li", { class: clases },
    h("strong", {}, p.nombre),
    filaFlechas("Vida", p, "vidaActual", p.vidaActual, TOPE),
    filaFlechas("Fuerza", p, "stats.fuerza", p.stats.fuerza, TOPE),
    filaFlechas("Magia", p, "magiaActual", p.magiaActual, TOPE),
    filaFlechas("Encanto", p, "stats.encanto", p.stats.encanto, TOPE),
    fila("Raza", p.raza?.nombre || "—"),
    h("div", { class: "titulo-seccion" }, "Habilidades"),
    filaFlechas("Base", p, "habilidadesMax", p.habilidadesMax ?? 1, 3),
    filaFlechas("Extra", p, "habilidadesExtra", p.habilidadesExtra ?? 0, 2),
    ...filasHabilidades(p),
    muerto ? null : filaDueno(p),
    muerto ? h("em", {}, `Muerto${eraDe}`) : null,
    estado.esLoremaster
      ? h("div", { class: "acciones" },
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
