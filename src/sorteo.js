import { entradasDe, CATEGORIAS } from "./compendio.js";
import { girarRuleta, lanzarDados } from "./ruleta.js";
import { sortearPersonaje as flujo, sortearEntrada, sortearHabilidad } from "./sorteo-logica.js";
import { valorDado } from "./ruleta-logica.js";

const deps = {
  entradas: entradasDe,
  girar: girarRuleta,
  dados: lanzarDados,
  pausa: (ms) => new Promise((r) => setTimeout(r, ms)),
  rng: Math.random
};

export const sortearPersonaje = (nombre) => flujo(deps, nombre);

export function girarCategoria(cat) {
  if (cat === "habilidades") return sortearHabilidad(deps, [], "Ruleta de habilidades");
  return sortearEntrada(deps, cat, `Ruleta de ${CATEGORIAS[cat].toLowerCase()}`);
}

export function mostrarTirada(nombre, valor) {
  return lanzarDados(`d20 de ${nombre}`, 20, [valor], []);
}

export async function tirarD20(nombre) {
  const valor = valorDado(1, 20);
  await mostrarTirada(nombre, valor);
  return valor;
}
