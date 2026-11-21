// src/turnos.js
import { db, doc, setDoc, onSnapshot } from "./firebase.js";
import { $, millis } from "./utils.js";
import { estado } from "./state.js";

const ref = (codigo) => doc(db, "salas", codigo, "turnos", "estado");

// Escucha el documento de turnos. cb recibe el objeto, o null si aún no existe.
export function escucharTurnos(codigo, cb, cbError) {
  return onSnapshot(ref(codigo), (snap) => cb(snap.exists() ? snap.data() : null), cbError);
}

export function primero(orden) {
  return orden[0];
}

export function siguienteDe(orden, actual) {
  if (orden.length === 0) return undefined;
  const i = orden.indexOf(actual);
  if (i === -1) return undefined;
  return orden[(i + 1) % orden.length];
}

export function iniciarTurnos(codigo, jugadores) {
  const orden = jugadores
    .filter((j) => !j.esLoremaster && (j.estado === "activo" || j.estado === "pausa"))
    .sort((a, b) => millis(a.creadoEn) - millis(b.creadoEn))
    .map((j) => j.uid);
  if (orden.length === 0) throw new Error("No hay jugadores admitidos para armar la cola.");
  return setDoc(ref(codigo), { orden, actual: primero(orden), ronda: 1, pendientes: {} });
}

export function pintarBarraTurnos() {
  const t = estado.turnos;
  $("#barra-turnos").hidden = false;
  const btn = $("#btn-iniciar-turnos");
  btn.hidden = !estado.esLoremaster;
  btn.textContent = t ? "Reiniciar turnos" : "Iniciar turnos";

  if (!t) {
    $("#turnos-texto").textContent = "Sin turnos todavía.";
    return;
  }
  const nombre = (uid) => estado.jugadores.find((j) => j.uid === uid)?.nombre ?? "?";
  const sig = siguienteDe(t.orden, t.actual);
  $("#turnos-texto").textContent =
    `Ronda ${t.ronda} · Turno: ${nombre(t.actual)} · Siguiente: ${nombre(sig)}`;
}

export function calcularCola(t, jugadores) {
  const validos = jugadores
    .filter((j) => !j.esLoremaster && (j.estado === "activo" || j.estado === "pausa"))
    .sort((a, b) => millis(a.creadoEn) - millis(b.creadoEn))
    .map((j) => j.uid);

  const conservados = t.orden.filter((uid) => validos.includes(uid));
  const nuevos = validos.filter((uid) => !t.orden.includes(uid));

  return [...conservados, ...nuevos];
}

export async function sincronizarCola(codigo, t, jugadores) {
  if (!t || !estado.esLoremaster || jugadores.length === 0) return;

  const orden = calcularCola(t, jugadores);
  if (orden.length === 0) return;

  const igual = orden.length === t.orden.length && orden.every((uid, i) => uid === t.orden[i]);
  if (igual) return;

  let actual = t.actual;
  if (!orden.includes(actual)) {
    const i = t.orden.indexOf(actual);
    const despues = [...t.orden.slice(i + 1), ...t.orden.slice(0, i)];
    actual = despues.find((uid) => orden.includes(uid)) ?? orden[0];
  }

  const pendientes = Object.fromEntries(
    Object.entries(t.pendientes ?? {}).filter(([uid]) => orden.includes(uid))
  );
  await setDoc(ref(codigo), { orden, actual, ronda: t.ronda, pendientes });
}
