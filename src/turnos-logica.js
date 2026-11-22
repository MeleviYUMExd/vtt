// src/turnos-logica.js
// Logica pura de turnos: no usa Firebase ni el navegador.

export const MAX_TIRADAS = 5;

const ms = (ts) => (ts?.toMillis ? ts.toMillis() : 0);

export function elegibles(personajes, jugadores) {
  const enMesa = (uid) =>
    jugadores.some((j) => j.uid === uid && (j.estado === "activo" || j.estado === "pausa"));
  return personajes
    .filter((p) => p.estado !== "muerto" && p.meta?.duenoUid && enMesa(p.meta.duenoUid))
    .sort((a, b) => ms(a.meta?.creadoEn) - ms(b.meta?.creadoEn))
    .map((p) => p.id);
}

export function calcularCola(orden, ids) {
  const conservados = orden.filter((id) => ids.includes(id));
  const nuevos = ids.filter((id) => !orden.includes(id));
  return [...conservados, ...nuevos];
}

export function nuevoTurno(ids) {
  return {
    orden: ids,
    actual: ids[0],
    ronda: 1,
    pendientes: {},
    tiradasRestantes: 1,
    infinitas: false,
    diaRondas: 3,
    nocheRondas: 2
  };
}

export function tiradasPara(t, id) {
  return Math.min(1 + (t.pendientes?.[id] ?? 0), MAX_TIRADAS);
}

export function sumarPendiente(pendientes, id) {
  const actual = pendientes?.[id] ?? 0;
  return { ...pendientes, [id]: Math.min(actual + 1, MAX_TIRADAS - 1) };
}

export function faseDelDia(ronda, dia, noche) {
  const total = dia + noche;
  const pos = (ronda - 1) % total;
  if (pos < dia) {
    return { fase: "Día", faltan: dia - pos };
  }
  return { fase: "Noche", faltan: total - pos };
}

export function avanzar(t, esAfk) {
  const n = t.orden.length;
  let idx = t.orden.indexOf(t.actual);
  let ronda = t.ronda;
  let pendientes = { ...t.pendientes };

  for (let paso = 0; paso < n; paso++) {
    idx = (idx + 1) % n;
    if (idx === 0) ronda += 1;

    const id = t.orden[idx];
    const ultimo = paso === n - 1;

    if (esAfk(id) && !ultimo) {
      pendientes = sumarPendiente(pendientes, id);
      continue;
    }

    const tiradasRestantes = tiradasPara({ pendientes }, id);
    delete pendientes[id];
    return { ...t, actual: id, ronda, pendientes, tiradasRestantes };
  }
}

export function puedeTirar(t, ctx) {
  if (t === null) return true;
  if (ctx.esLM && t.infinitas) return true;
  if (ctx.esLM) return ctx.uid === ctx.duenoActual;
  return ctx.uid === ctx.duenoActual && t.tiradasRestantes > 0;
}

export function sincronizar(t, ids) {
  if (typeof t.tiradasRestantes !== "number") return null;
  if (ids.length === 0) return null;

  const orden = calcularCola(t.orden, ids);
  const igual = orden.length === t.orden.length && orden.every((id, i) => id === t.orden[i]);
  if (igual) return null;

  const pendientes = Object.fromEntries(
    Object.entries(t.pendientes ?? {}).filter(([id]) => orden.includes(id))
  );
  let actual = t.actual;
  let tiradasRestantes = t.tiradasRestantes;

  if (!orden.includes(actual)) {
    const i = t.orden.indexOf(actual);
    const despues = [...t.orden.slice(i + 1), ...t.orden.slice(0, i)];
    actual = despues.find((id) => orden.includes(id)) ?? orden[0];
    tiradasRestantes = tiradasPara({ pendientes }, actual);
    delete pendientes[actual];
  }
  return { ...t, orden, actual, pendientes, tiradasRestantes };
}
