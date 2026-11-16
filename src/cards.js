// src/cards.js
import { h } from "./utils.js";

// YA RESUELTA: una fila "Etiqueta ........ valor"
function fila(etiqueta, valor) {
  return h("div", { class: "fila-stat" }, h("span", {}, etiqueta), String(valor));
}

function crearTarjeta(p) {
  return h("li", { class: "tarjeta" },
    h("strong", {}, p.nombre),

    // YA RESUELTA: fila de Vida (actual / máximo)
    fila("Vida", `${p.vidaActual}/${p.stats.vida}`),
    fila("Fuerza", p.stats.fuerza),
    fila("Magia", `${p.magiaActual}/${p.stats.magia}`),
    fila("Encanto", p.stats.encanto),
    fila("Raza", p.raza.nombre || "—"),
    p.estado === "muerto" ? h("em", {}, "Muerto") : null
  );
}

export function pintarPersonajes(lista, contenedor) {
  if (lista.length === 0) {
    contenedor.replaceChildren(h("li", { class: "vacio" }, "Aún no hay personajes"));
    return;
  }

  contenedor.replaceChildren(...lista.map(crearTarjeta));
}