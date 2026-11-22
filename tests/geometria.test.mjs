// Pruebas de geometria.js. Ejecuta: node tests/geometria.test.mjs
import assert from "node:assert/strict";
import {
  puntoEnRect, esquinas, esquinaEn, moverRect, redimensionar, MIN_ANCHO
} from "../src/geometria.js";

let fallos = 0;
function prueba(nombre, fn) {
  try { fn(); console.log("OK     " + nombre); }
  catch (e) { fallos++; console.log("FALLA  " + nombre + "\n         " + e.message.split("\n")[0]); }
}
const casi = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} no es igual a ${b}`);
const R = { x: 100, y: 200, w: 400, h: 200 };

prueba("puntoEnRect: dentro y fuera (ya resuelta)", () => {
  assert.equal(puntoEnRect(R, { x: 300, y: 300 }), true);
  assert.equal(puntoEnRect(R, { x: 50, y: 300 }), false);
});

prueba("esquinaEn: detecta cada esquina", () => {
  assert.equal(esquinaEn(R, { x: 102, y: 203 }, 10), "nw");
  assert.equal(esquinaEn(R, { x: 498, y: 201 }, 10), "ne");
  assert.equal(esquinaEn(R, { x: 99, y: 398 }, 10), "sw");
  assert.equal(esquinaEn(R, { x: 505, y: 405 }, 10), "se");
});

prueba("esquinaEn: devuelve null si no hay esquina cerca", () => {
  assert.equal(esquinaEn(R, { x: 300, y: 300 }, 10), null);
});

prueba("moverRect: devuelve uno nuevo y no toca el original", () => {
  const n = moverRect(R, 30, -20);
  assert.deepEqual(n, { x: 130, y: 180, w: 400, h: 200 });
  assert.deepEqual(R, { x: 100, y: 200, w: 400, h: 200 });
});

prueba("redimensionar se: la esquina nw queda fija y se mantiene la proporcion", () => {
  const n = redimensionar(R, "se", { x: 700, y: 999 });
  assert.equal(n.x, 100); assert.equal(n.y, 200);
  casi(n.w, 600); casi(n.h, 300);
});

prueba("redimensionar nw: la esquina se queda fija", () => {
  const n = redimensionar(R, "nw", { x: 300, y: 0 });
  casi(n.w, 200); casi(n.h, 100);
  casi(n.x + n.w, 500); casi(n.y + n.h, 400);
});

prueba("redimensionar ne y sw: anclas correctas", () => {
  const a = redimensionar(R, "ne", { x: 600, y: 0 });
  casi(a.x, 100); casi(a.y + a.h, 400); casi(a.w, 500);
  const b = redimensionar(R, "sw", { x: 0, y: 999 });
  casi(b.x + b.w, 500); casi(b.y, 200); casi(b.w, 500);
});

prueba("redimensionar: nunca baja del ancho minimo", () => {
  const n = redimensionar(R, "se", { x: 101, y: 201 });
  assert.equal(n.w, MIN_ANCHO);
});

prueba("redimensionar: mantiene siempre la proporcion", () => {
  const n = redimensionar(R, "se", { x: 333, y: 777 });
  casi(n.w / n.h, R.w / R.h);
});

console.log(fallos === 0 ? "\nTodo bien: 0 fallos." : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
