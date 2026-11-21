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
  $("#btn-iniciar-turnos").hidden = !(estado.esLoremaster && !t);

  if (!t) {
    $("#turnos-texto").textContent = "Sin turnos todavía.";
    return;
  }
  const nombre = (uid) => estado.jugadores.find((j) => j.uid === uid)?.nombre ?? "?";
  const sig = siguienteDe(t.orden, t.actual);
  $("#turnos-texto").textContent =
    `Ronda ${t.ronda} · Turno: ${nombre(t.actual)} · Siguiente: ${nombre(sig)}`;
}
