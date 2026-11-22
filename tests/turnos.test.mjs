// Pruebas de turnos-logica.js. Ejecuta: node tests/turnos.test.mjs
import assert from "node:assert/strict";
import {
  elegibles, calcularCola, nuevoTurno, tiradasPara, sumarPendiente,
  faseDelDia, avanzar, puedeTirar, sincronizar, MAX_TIRADAS
} from "../src/turnos-logica.js";

let fallos = 0;
function prueba(nombre, fn) {
  try { fn(); console.log("OK     " + nombre); }
  catch (e) { fallos++; console.log("FALLA  " + nombre + "\n         " + e.message.split("\n")[0]); }
}

const ts = (n) => ({ toMillis: () => n });
const t0 = (extra = {}) => ({ ...nuevoTurno(["a", "b", "c"]), ...extra });
const nadie = () => false;

prueba("elegibles: solo vivos, con dueño en la mesa, por orden de creación", () => {
  const personajes = [
    { id: "p2", estado: "vivo", meta: { duenoUid: "u2", creadoEn: ts(20) } },
    { id: "p1", estado: "vivo", meta: { duenoUid: "u1", creadoEn: ts(10) } },
    { id: "p3", estado: "muerto", meta: { duenoUid: "u1", creadoEn: ts(30) } },
    { id: "p4", estado: "vivo", meta: { duenoUid: null, creadoEn: ts(40) } },
    { id: "p5", estado: "vivo", meta: { duenoUid: "u3", creadoEn: ts(50) } }
  ];
  const jugadores = [
    { uid: "u1", estado: "activo" }, { uid: "u2", estado: "pausa" }, { uid: "u3", estado: "esperando" }
  ];
  assert.deepEqual(elegibles(personajes, jugadores), ["p1", "p2"]);
});

prueba("calcularCola: quita a los que se fueron y agrega los nuevos al final", () => {
  assert.deepEqual(calcularCola(["a", "b", "c"], ["c", "a", "d"]), ["a", "c", "d"]);
});

prueba("tiradasPara: turno propio + pendientes, con tope de 5", () => {
  assert.equal(tiradasPara({ pendientes: {} }, "a"), 1);
  assert.equal(tiradasPara({ pendientes: { a: 2 } }, "a"), 3);
  assert.equal(tiradasPara({ pendientes: { a: 9 } }, "a"), MAX_TIRADAS);
});

prueba("sumarPendiente: suma 1, tope 4 y no modifica el original", () => {
  const original = { a: 1 };
  assert.deepEqual(sumarPendiente(original, "a"), { a: 2 });
  assert.deepEqual(original, { a: 1 });
  assert.deepEqual(sumarPendiente({}, "b"), { b: 1 });
  assert.deepEqual(sumarPendiente({ a: 4 }, "a"), { a: 4 });
});

prueba("faseDelDia: 3 de día y 2 de noche", () => {
  assert.deepEqual(faseDelDia(1, 3, 2), { fase: "Día", faltan: 3 });
  assert.deepEqual(faseDelDia(3, 3, 2), { fase: "Día", faltan: 1 });
  assert.deepEqual(faseDelDia(4, 3, 2), { fase: "Noche", faltan: 2 });
  assert.deepEqual(faseDelDia(5, 3, 2), { fase: "Noche", faltan: 1 });
  assert.deepEqual(faseDelDia(6, 3, 2), { fase: "Día", faltan: 3 });
});

prueba("avanzar: pasa al siguiente sin cambiar la ronda", () => {
  const r = avanzar(t0(), nadie);
  assert.equal(r.actual, "b");
  assert.equal(r.ronda, 1);
  assert.equal(r.tiradasRestantes, 1);
});

prueba("avanzar: al dar la vuelta sube la ronda", () => {
  const r = avanzar(t0({ actual: "c" }), nadie);
  assert.equal(r.actual, "a");
  assert.equal(r.ronda, 2);
});

prueba("avanzar: salta al AFK y le anota un turno perdido", () => {
  const r = avanzar(t0(), (id) => id === "b");
  assert.equal(r.actual, "c");
  assert.deepEqual(r.pendientes, { b: 1 });
});

prueba("avanzar: al volver, el AFK juega su turno más los acumulados", () => {
  const r = avanzar(t0({ pendientes: { b: 2 } }), nadie);
  assert.equal(r.actual, "b");
  assert.equal(r.tiradasRestantes, 3);
  assert.deepEqual(r.pendientes, {});
});

prueba("avanzar: si todos están AFK no se cuelga", () => {
  const r = avanzar(t0(), () => true);
  assert.ok(["a", "b", "c"].includes(r.actual));
});

prueba("avanzar: un solo personaje sube la ronda en cada pase", () => {
  const r = avanzar({ ...nuevoTurno(["a"]) }, nadie);
  assert.equal(r.actual, "a");
  assert.equal(r.ronda, 2);
});

prueba("avanzar: saltar a un AFK también cuenta la vuelta de ronda", () => {
  const r = avanzar({ ...nuevoTurno(["a", "b"]) }, (id) => id === "b");
  assert.equal(r.actual, "a");
  assert.equal(r.ronda, 2);
  assert.deepEqual(r.pendientes, { b: 1 });
});

prueba("puedeTirar: reglas de tiradas", () => {
  const t = t0({ actual: "b", tiradasRestantes: 1 });
  assert.equal(puedeTirar(null, { esLM: false, uid: "x", duenoActual: null }), true);
  assert.equal(puedeTirar(t, { esLM: false, uid: "u2", duenoActual: "u2" }), true);
  assert.equal(puedeTirar({ ...t, tiradasRestantes: 0 }, { esLM: false, uid: "u2", duenoActual: "u2" }), false);
  assert.equal(puedeTirar(t, { esLM: false, uid: "u1", duenoActual: "u2" }), false);
  assert.equal(puedeTirar(t, { esLM: true, uid: "lm", duenoActual: "u2" }), false);
  assert.equal(puedeTirar({ ...t, infinitas: true }, { esLM: true, uid: "lm", duenoActual: "u2" }), true);
  assert.equal(puedeTirar({ ...t, infinitas: true }, { esLM: false, uid: "u1", duenoActual: "u2" }), false);
  assert.equal(puedeTirar(t, { esLM: true, uid: "lm", duenoActual: "lm" }), true);
});

prueba("sincronizar: sin cambios devuelve null", () => {
  assert.equal(sincronizar(t0(), ["a", "b", "c"]), null);
});

prueba("sincronizar: un personaje nuevo entra al final sin cambiar el turno", () => {
  const r = sincronizar(t0({ actual: "b" }), ["a", "b", "c", "d"]);
  assert.deepEqual(r.orden, ["a", "b", "c", "d"]);
  assert.equal(r.actual, "b");
});

prueba("sincronizar: si sale el del turno, pasa al siguiente", () => {
  const r = sincronizar(t0({ actual: "b" }), ["a", "c"]);
  assert.deepEqual(r.orden, ["a", "c"]);
  assert.equal(r.actual, "c");
});

prueba("sincronizar: ignora formato viejo y cola vacía", () => {
  assert.equal(sincronizar({ orden: ["u1"], actual: "u1", ronda: 1, pendientes: {} }, ["a"]), null);
  assert.equal(sincronizar(t0(), []), null);
});

console.log(fallos === 0 ? "\nTodo bien: 0 fallos." : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
