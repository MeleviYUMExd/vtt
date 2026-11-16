import { estado } from "./state.js";
import { borrarPersonaje, renombrarPersonaje } from "./characters.js";
import { h, toast, traducirError } from "./utils.js";

function fila(etiqueta, valor) {
  return h("div", { class: "fila-stat" }, h("span", {}, etiqueta), String(valor));
}

async function borrar(p) {
  if (!confirm(`¿Borrar a ${p.nombre}?`)) return;

  try {
    await borrarPersonaje(estado.codigo, p.id);
  } catch (e) {
    toast(traducirError(e), "error");
  }
}

async function renombrar(p) {
  const nuevo = prompt("Nuevo nombre:", p.nombre);
  if (nuevo === null) return;

  try {
    await renombrarPersonaje(estado.codigo, p.id, nuevo);
  } catch (e) {
    toast(traducirError(e), "error");
  }
}

function crearTarjeta(p) {
  return h("li", { class: "tarjeta" },
    h("strong", {}, p.nombre),
    fila("Vida", `${p.vidaActual}/${p.stats.vida}`),
    fila("Fuerza", p.stats.fuerza),
    fila("Magia", `${p.magiaActual}/${p.stats.magia}`),
    fila("Encanto", p.stats.encanto),
    fila("Raza", p.raza.nombre || "—"),
    p.estado === "muerto" ? h("em", {}, "Muerto") : null,
    estado.esLoremaster
      ? h("div", { class: "acciones" },
          h("button", { class: "btn chico", onclick: () => renombrar(p) }, "Renombrar"),
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