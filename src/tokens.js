// src/tokens.js
import {
  db, doc, collection, setDoc, deleteDoc, onSnapshot, serverTimestamp
} from "./firebase.js";

export const TAM_POR_DEFECTO = 100;

function limpiarNombreToken(s) {
  return String(s ?? "").trim().slice(0, 30);
}

function validarUrl(url) {
  const limpia = String(url ?? "").trim();
  if (!limpia.startsWith("https://") || limpia.length > 500) {
    throw new Error("La URL de la imagen debe empezar con https://");
  }
  return limpia;
}

export async function crearToken(codigo, datos, uid) {
  const nombre = limpiarNombreToken(datos.nombre);
  if (!nombre) throw new Error("El nombre es obligatorio.");

  const ref = doc(collection(db, "salas", codigo, "tokens"));
  await setDoc(ref, {
    nombre,
    imagenUrl: validarUrl(datos.imagenUrl),
    x: Number(datos.x),
    y: Number(datos.y),
    tam: TAM_POR_DEFECTO,
    duenoUid: uid,
    creadoEn: serverTimestamp()
  });
  return ref.id;
}

export function escucharTokens(codigo, cb, cbError) {
  return onSnapshot(
    collection(db, "salas", codigo, "tokens"),
    (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
    cbError
  );
}

export function borrarToken(codigo, id) {
  return deleteDoc(doc(db, "salas", codigo, "tokens", id));
}
