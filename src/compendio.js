// src/compendio.js
import {
  db, doc, collection, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp
} from "./firebase.js";
import { limpiarEntrada, CATEGORIAS } from "./compendio-logica.js";

export { CATEGORIAS };

let cache = [];

export function entradasDe(cat) {
  return cache
    .filter((e) => e.categoria === cat)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function escucharCompendio(codigo, cb, cbError) {
  cache = [];
  return onSnapshot(
    collection(db, "salas", codigo, "compendio"),
    (snap) => {
      cache = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      cb(cache);
    },
    cbError
  );
}

export async function crearEntrada(codigo, datos, uid) {
  const limpio = limpiarEntrada(datos);
  const ref = doc(collection(db, "salas", codigo, "compendio"));
  await setDoc(ref, { ...limpio, creadoPor: uid, creadoEn: serverTimestamp() });
  return ref.id;
}

export function actualizarEntrada(codigo, id, datos) {
  return updateDoc(doc(db, "salas", codigo, "compendio", id), limpiarEntrada(datos));
}

export function borrarEntrada(codigo, id) {
  return deleteDoc(doc(db, "salas", codigo, "compendio", id));
}
