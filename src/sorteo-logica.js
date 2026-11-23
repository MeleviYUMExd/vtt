// src/sorteo-logica.js
import { indiceAleatorio, valorDado, disponibles, construirHabilidad } from "./ruleta-logica.js";

export const STATS = ["vida", "fuerza", "magia", "encanto"];
const ETIQUETAS = ["Vida", "Fuerza", "Magia", "Encanto"];

export async function sortearEntrada(deps, cat, titulo) {
  const lista = deps.entradas(cat);
  if (!lista.length) return null;
  const idx = indiceAleatorio(lista.length, deps.rng);
  await deps.girar(titulo, lista.map((e) => e.nombre), idx);
  return lista[idx];
}

export async function sortearHabilidad(deps, excluirIds, titulo) {
  const disp = disponibles(deps.entradas("habilidades"), excluirIds);
  if (!disp.length) return null;
  const idx = indiceAleatorio(disp.length, deps.rng);
  await deps.girar(titulo, disp.map((e) => e.nombre), idx);

  const hab = disp[idx];
  const subs = hab.subOpciones ?? [];
  let sub = null;
  if (subs.length) {
    await deps.pausa(1200);
    const j = indiceAleatorio(subs.length, deps.rng);
    await deps.girar(`${hab.nombre}: ¿cuál te toca?`, subs, j);
    sub = subs[j];
  }
  return construirHabilidad(hab, sub);
}

export async function sortearPersonaje(deps, nombre) {
  const valores = STATS.map(() => valorDado(0, 4, deps.rng));
  await deps.dados(`Estadísticas de ${nombre}`, 4, valores, ETIQUETAS);
  const stats = Object.fromEntries(STATS.map((k, i) => [k, valores[i]]));

  await deps.pausa(800);
  const raza = await sortearEntrada(deps, "razas", `Raza de ${nombre}`);

  await deps.pausa(800);
  const spawn = await sortearEntrada(deps, "spawn", `Punto de partida de ${nombre}`);

  await deps.pausa(800);
  const cantIdx = indiceAleatorio(3, deps.rng);
  await deps.girar(`¿Cuántas habilidades tendrá ${nombre}?`, ["1", "2", "3"], cantIdx);
  const habilidadesMax = cantIdx + 1;

  const habilidades = [];
  const usadas = [];
  for (let i = 0; i < habilidadesMax; i++) {
    await deps.pausa(1000);
    const hab = await sortearHabilidad(deps, usadas, `Habilidad ${i + 1} de ${habilidadesMax}`);
    if (!hab) break;
    habilidades.push(hab);
    usadas.push(hab.origenId);
  }

  return {
    stats,
    raza: raza ? { origenId: raza.id, nombre: raza.nombre } : null,
    spawn: spawn ? spawn.nombre : null,
    habilidadesMax,
    habilidades
  };
}
