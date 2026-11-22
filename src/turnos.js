// src/turnos.js
// Turnos por PERSONAJE: conecta la logica pura con Firestore y la pantalla.
import {
  db, doc, collection, setDoc, updateDoc, onSnapshot, runTransaction, serverTimestamp
} from "./firebase.js";
import { $ } from "./utils.js";
import { estado } from "./state.js";
import { tirarDado } from "./dados.js";
import { registrarTirada } from "./rooms.js";
import {
  elegibles, nuevoTurno, sincronizar, avanzar, puedeTirar, faseDelDia
} from "./turnos-logica.js";

const ref = (codigo) => doc(db, "salas", codigo, "turnos", "estado");
const vigente = (t) => !!t && typeof t.tiradasRestantes === "number";

function personaje(id) {
  return estado.personajes.find((p) => p.id === id) ?? null;
}

export function personajeActual() {
  return personaje(estado.turnos?.actual);
}

function nombreDe(id) {
  return personaje(id)?.nombre ?? "?";
}

function duenoDe(id) {
  const uid = personaje(id)?.meta?.duenoUid;
  return estado.jugadores.find((j) => j.uid === uid) ?? null;
}

function esAfk(id) {
  return duenoDe(id)?.estado === "pausa";
}

export function escucharTurnos(codigo, cb, cbError) {
  return onSnapshot(ref(codigo), (snap) => cb(snap.exists() ? snap.data() : null), cbError);
}

export function iniciarTurnos(codigo) {
  const ids = elegibles(estado.personajes, estado.jugadores);
  if (ids.length === 0) throw new Error("Hace falta al menos un personaje vivo con dueño.");
  const t = estado.turnos;
  const nuevo = nuevoTurno(ids);
  if (vigente(t)) {
    nuevo.diaRondas = t.diaRondas;
    nuevo.nocheRondas = t.nocheRondas;
    nuevo.infinitas = t.infinitas;
  }
  return setDoc(ref(codigo), nuevo);
}

export async function sincronizarCola(codigo) {
  const t = estado.turnos;
  if (!vigente(t) || !estado.esLoremaster || estado.jugadores.length === 0) return;

  const ids = elegibles(estado.personajes, estado.jugadores);
  if (!sincronizar(t, ids)) return;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(codigo));
    if (!snap.exists()) return;
    const nuevo = sincronizar(snap.data(), ids);
    if (nuevo) tx.set(ref(codigo), nuevo);
  });
}

export function avanzarTurno(codigo) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(codigo));
    if (!snap.exists()) throw new Error("Los turnos aún no empezaron.");
    const t = snap.data();
    if (!vigente(t)) throw new Error("Reinicia los turnos primero.");
    tx.set(ref(codigo), avanzar(t, esAfk));
  });
}

export function darTiradaExtra(codigo) {
  const t = estado.turnos;
  if (!vigente(t)) throw new Error("Los turnos aún no empezaron.");
  return updateDoc(ref(codigo), { tiradasRestantes: Math.min(t.tiradasRestantes + 1, 9) });
}

export function cambiarInfinitas(codigo) {
  const t = estado.turnos;
  if (!vigente(t)) throw new Error("Los turnos aún no empezaron.");
  return updateDoc(ref(codigo), { infinitas: !t.infinitas });
}

export function cambiarCiclo(codigo) {
  const t = estado.turnos;
  if (!vigente(t)) throw new Error("Los turnos aún no empezaron.");
  const dia = prompt("¿Cuántas rondas dura el día? (1 a 20)", t.diaRondas);
  if (dia === null) return;
  const noche = prompt("¿Cuántas rondas dura la noche? (1 a 20)", t.nocheRondas);
  if (noche === null) return;
  const d = Math.round(Number(dia));
  const n = Math.round(Number(noche));
  if (!(d >= 1 && d <= 20 && n >= 1 && n <= 20)) throw new Error("Usa números del 1 al 20.");
  return updateDoc(ref(codigo), { diaRondas: d, nocheRondas: n });
}

export function alternarAfk(codigo, jugador) {
  const nuevo = jugador.estado === "pausa" ? "activo" : "pausa";
  return updateDoc(doc(db, "salas", codigo, "jugadores", jugador.uid), { estado: nuevo });
}

export function puedeTirarAhora() {
  return puedeTirar(estado.turnos, {
    esLM: estado.esLoremaster,
    uid: estado.uid,
    duenoActual: personajeActual()?.meta?.duenoUid ?? null
  });
}

export async function tirarD20(codigo) {
  if (!puedeTirarAhora()) throw new Error("No tienes tiradas disponibles en este turno.");

  const t = estado.turnos;
  const actual = personajeActual();
  const esSuTurno = !!t && actual?.meta?.duenoUid === estado.uid;
  const nombre = esSuTurno ? actual.nombre : estado.yo.nombre;
  const resultado = tirarDado(20);

  const libre = !t || (estado.esLoremaster && t.infinitas);
  if (libre) return registrarTirada(codigo, estado.uid, nombre, resultado);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(codigo));
    const fresco = snap.data();
    if (!fresco || fresco.actual !== t.actual || fresco.tiradasRestantes < 1) {
      throw new Error("El turno cambió, intenta de nuevo.");
    }
    tx.update(ref(codigo), { tiradasRestantes: fresco.tiradasRestantes - 1 });
    tx.set(doc(collection(db, "salas", codigo, "tiradas")), {
      uid: estado.uid, nombre, resultado, creadoEn: serverTimestamp()
    });
  });
}

export function pintarBarraTurnos() {
  const t = estado.turnos;
  const lm = estado.esLoremaster;
  const ok = vigente(t);

  $("#barra-turnos").hidden = false;
  $("#btn-iniciar-turnos").hidden = !lm;
  $("#btn-iniciar-turnos").textContent = t ? "Reiniciar turnos" : "Iniciar turnos";
  for (const id of ["#btn-pasar-turno", "#btn-tirada-extra", "#btn-infinitas", "#btn-ciclo"]) {
    $(id).hidden = !(lm && ok);
  }
  if (ok) {
    $("#btn-infinitas").textContent = `Tiros infinitos: ${t.infinitas ? "prendido" : "apagado"}`;
  }

  const puede = puedeTirarAhora();
  $("#btn-d20").disabled = !puede;
  $("#btn-d20").title = puede ? "" : "No es tu turno, o ya gastaste tu tirada.";

  const texto = $("#turnos-texto");
  if (!t) {
    texto.textContent = "Sin turnos todavía.";
    return;
  }
  if (!ok) {
    texto.textContent = "Estos turnos son de una versión anterior. El Loremaster debe reiniciarlos.";
    return;
  }

  const { fase, faltan } = faseDelDia(t.ronda, t.diaRondas, t.nocheRondas);
  const cambio = fase === "Día" ? "noche" : "día";
  const dueno = duenoDe(t.actual);
  const afk = esAfk(t.actual) ? " (AFK)" : "";
  const siguiente = nombreDe(avanzar(t, esAfk).actual);
  const suTurno = dueno?.uid === estado.uid ? " ¡Es tu turno!" : "";

  texto.textContent =
    `${fase === "Día" ? "☀" : "☾"} ${fase} · cambia a ${cambio} en ${faltan} · Ronda ${t.ronda}` +
    ` · Turno: ${nombreDe(t.actual)}${dueno ? ` (de ${dueno.nombre})` : ""}${afk}` +
    ` · Tiradas: ${t.tiradasRestantes} · Siguiente: ${siguiente}.${suTurno}`;
}
