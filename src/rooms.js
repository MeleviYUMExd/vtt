import {
  db, doc, getDoc, setDoc, updateDoc, deleteDoc,
  runTransaction, onSnapshot, collection, serverTimestamp
} from "./firebase.js";

const salaRef = (c) => doc(db, "salas", c);
const jugRef = (c, uid) => doc(db, "salas", c, "jugadores", uid);

// Crea la sala y la ficha del Loremaster en UNA transacción.
// Si dos personas eligen el mismo código a la vez, solo una lo consigue.
export async function crearSala(codigo, nombre, uid) {
  await runTransaction(db, async (tx) => {
    const s = await tx.get(salaRef(codigo));
    if (s.exists()) throw new Error("CODIGO_OCUPADO");
    tx.set(salaRef(codigo), {
      loremasterId: uid,
      creadaEn: serverTimestamp(),
      version: 1,
      config: { admision: "manual" }
    });
    tx.set(jugRef(codigo, uid), {
      uid, nombre, esLoremaster: true, estado: "activo",
      creadoEn: serverTimestamp()
    });
  });
}

// Registra al jugador como "esperando". Si ya estaba registrado, no duplica.
export async function unirseSala(codigo, nombre, uid) {
  const s = await getDoc(salaRef(codigo));
  if (!s.exists()) throw new Error("SALA_NO_EXISTE");
  const yo = await getDoc(jugRef(codigo, uid));
  if (yo.exists()) return;
  await setDoc(jugRef(codigo, uid), {
    uid, nombre, esLoremaster: false, estado: "esperando",
    creadoEn: serverTimestamp()
  });
}

export async function obtenerJugador(codigo, uid) {
  const d = await getDoc(jugRef(codigo, uid));
  return d.exists() ? d.data() : null;
}

// Escucha MI documento. cb(null) si desaparece (me expulsaron o borraron la sala).
export function escucharMiJugador(codigo, uid, cb, cbError) {
  return onSnapshot(jugRef(codigo, uid),
    (d) => cb(d.exists() ? d.data() : null), cbError);
}

// Escucha a todos los jugadores (solo permitido a miembros activos).
export function escucharJugadores(codigo, cb, cbError) {
  return onSnapshot(collection(db, "salas", codigo, "jugadores"),
    (snap) => cb(snap.docs.map((d) => d.data())), cbError);
}

export const admitir = (codigo, uid) => updateDoc(jugRef(codigo, uid), { estado: "activo" });
export const rechazar = (codigo, uid) => updateDoc(jugRef(codigo, uid), { estado: "rechazado" });
export const expulsar = (codigo, uid) => deleteDoc(jugRef(codigo, uid));
export const salirDeSala = (codigo, uid) => deleteDoc(jugRef(codigo, uid));
