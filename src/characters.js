import { db, doc, collection, setDoc, onSnapshot, serverTimestamp } from "./firebase.js";

// Las 4 estadísticas esenciales de todo personaje.
const STATS = ["vida", "fuerza", "magia", "encanto"];
const STAT_MAX = 15;   // tope de cada estadística (la tirada inicial va de 0 a 4)

// Limpia una referencia a una entrada del compendio.
// Devuelve siempre { origenId, nombre } y nada más.
function limpiarReferencia(obj) {
  return {
    origenId: obj?.origenId ?? null,
    nombre: String(obj?.nombre ?? "").trim().slice(0, 30)
  };
}

// Convierte un valor en un entero entre min y max.
// Si no es un número válido, devuelve min.
function entero(valor, min, max) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return min;
  return Math.round(Math.min(Math.max(num, min), max));
}

// Devuelve { vida, fuerza, magia, encanto }, cada una entera entre 0 y STAT_MAX.
function limpiarStats(stats) {
  const resultado = {};
  for (const clave of STATS) {
    resultado[clave] = entero(stats?.[clave], 0, STAT_MAX);
  }
  return resultado;
}

// Limpia la lista de habilidades: máximo "limite" elementos,
// cada una con origenId, nombre y nivelActual (0 a 10).
function limpiarHabilidades(lista, limite) {
  const segura = Array.isArray(lista) ? lista.slice(0, limite) : [];
  return segura.map((h) => ({
    origenId: h?.origenId ?? null,
    nombre: String(h?.nombre ?? "").trim().slice(0, 30),
    nivelActual: entero(h?.nivelActual, 0, 10)
  }));
}

// Limpia el inventario: máximo 10 objetos, sin nombres vacíos.
function limpiarInventario(lista) {
  const segura = Array.isArray(lista) ? lista.slice(0, 10) : [];
  return segura
    .map(limpiarReferencia)
    .filter((r) => r.nombre !== "");
}

// Junta todo en un único objeto limpio, listo para guardar.
function limpiarDatos(datos = {}) {
  const habilidadesMax = entero(datos.habilidadesMax, 1, 3);
  const habilidadesExtra = entero(datos.habilidadesExtra, 0, 2);
  const stats = limpiarStats(datos.stats);

  const nombre = String(datos.nombre ?? "").trim().slice(0, 30);
  if (!nombre) throw new Error("El nombre es obligatorio.");

  return {
    nombre,
    stats,
    vidaActual: stats.vida,
    magiaActual: stats.magia,
    raza: limpiarReferencia(datos.raza),
    spawn: limpiarReferencia(datos.spawn),
    habilidadesMax,
    habilidadesExtra,
    habilidades: limpiarHabilidades(datos.habilidades, habilidadesMax + habilidadesExtra),
    inventario: limpiarInventario(datos.inventario),
    estado: "vivo"
  };
}
// Escucha todos los personajes de la sala. Llama a cb(lista) cada vez que algo cambia.
// Devuelve una función para dejar de escuchar.
export function escucharPersonajes(codigo, cb, cbError) {
  return onSnapshot(
    collection(db, "salas", codigo, "personajes"),
    (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
    cbError
  );
}

// Guarda un personaje nuevo en salas/{codigo}/personajes y devuelve su id.
export async function crearPersonaje(codigo, datos) {
  const limpio = limpiarDatos(datos);
  const ref = doc(collection(db, "salas", codigo, "personajes"));
  await setDoc(ref, {
    ...limpio,
    meta: { duenoUid: null, creadoEn: serverTimestamp() }
  });
  return ref.id;
  

  
}