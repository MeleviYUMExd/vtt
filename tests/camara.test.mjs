// Pruebas de camara.js. Ejecuta: node tests/camara.test.mjs
import assert from "node:assert/strict";
import {
  camaraNueva, worldToScreen, screenToWorld, mover, zoomEnPunto, limitar, ZOOM_MIN, ZOOM_MAX
} from "../src/camara.js";

let fallos = 0;
function prueba(nombre, fn) {
  try { fn(); console.log("OK     " + nombre); }
  catch (e) { fallos++; console.log("FALLA  " + nombre + "\n         " + e.message.split("\n")[0]); }
}
const casi = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} no es igual a ${b}`);

prueba("limitar: deja el valor dentro del rango", () => {
  assert.equal(limitar(9, 0, 5), 5);
  assert.equal(limitar(-3, 0, 5), 0);
  assert.equal(limitar(2, 0, 5), 2);
});

prueba("worldToScreen: ejemplo ya resuelto", () => {
  assert.deepEqual(worldToScreen({ x: 100, y: 0, zoom: 2 }, 125, 10), { x: 50, y: 20 });
});

prueba("screenToWorld: el ejemplo del enunciado", () => {
  assert.deepEqual(screenToWorld({ x: 100, y: 0, zoom: 2 }, 50, 20), { x: 125, y: 10 });
});

prueba("screenToWorld es la inversa de worldToScreen", () => {
  const cam = { x: -37.5, y: 412, zoom: 1.7 };
  const p = worldToScreen(cam, 321, -45);
  const w = screenToWorld(cam, p.x, p.y);
  casi(w.x, 321);
  casi(w.y, -45);
});

prueba("mover: arrastrar a la derecha lleva la cámara a la izquierda", () => {
  const cam = { x: 0, y: 0, zoom: 1 };
  mover(cam, 30, -10);
  assert.deepEqual(cam, { x: -30, y: 10, zoom: 1 });
});

prueba("mover: con zoom 2, 30 píxeles son 15 unidades del mundo", () => {
  const cam = { x: 0, y: 0, zoom: 2 };
  mover(cam, 30, 0);
  assert.equal(cam.x, -15);
});

prueba("zoomEnPunto: el punto bajo el cursor no se mueve", () => {
  const cam = { x: 120, y: -80, zoom: 1.3 };
  const antes = screenToWorld(cam, 400, 250);
  zoomEnPunto(cam, 400, 250, 1.5);
  assert.ok(cam.zoom > 1.3);
  const despues = screenToWorld(cam, 400, 250);
  casi(despues.x, antes.x);
  casi(despues.y, antes.y);
});

prueba("zoomEnPunto: respeta el zoom mínimo y máximo", () => {
  const cam = camaraNueva();
  for (let i = 0; i < 50; i++) zoomEnPunto(cam, 10, 10, 2);
  assert.equal(cam.zoom, ZOOM_MAX);
  for (let i = 0; i < 50; i++) zoomEnPunto(cam, 10, 10, 0.5);
  assert.equal(cam.zoom, ZOOM_MIN);
});

console.log(fallos === 0 ? "\nTodo bien: 0 fallos." : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
