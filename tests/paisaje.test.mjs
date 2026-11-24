import assert from "node:assert/strict";
import { generarPaisaje, PAISAJE } from "../src/paisaje.js";
import { DISCORD_URL, YOUTUBE_URL } from "../src/redes.js";

function luminancia(paisaje) {
  let total = 0;
  for (let i = 0; i < paisaje.datos.length; i += 4) {
    total += paisaje.datos[i] * 0.3 + paisaje.datos[i + 1] * 0.59 + paisaje.datos[i + 2] * 0.11;
  }
  return total / (paisaje.datos.length / 4);
}

const dia = generarPaisaje(1, "Día");
const noche = generarPaisaje(1, "Noche");

assert.ok(PAISAJE.noche.cieloArriba && PAISAJE.noche.pastoAbajo);
assert.ok(luminancia(noche) < luminancia(dia) * 0.6);
assert.deepEqual(generarPaisaje(5, "Noche").datos, generarPaisaje(5, "Noche").datos);
for (const paisaje of [dia, noche]) {
  assert.equal(paisaje.ancho, PAISAJE.px);
  assert.equal(paisaje.alto, PAISAJE.px);
  for (let i = 3; i < paisaje.datos.length; i += 4) assert.equal(paisaje.datos[i], 255);
}
assert.equal(DISCORD_URL, "https://discord.gg/b5D7ekhvZu");
assert.equal(YOUTUBE_URL, "https://www.youtube.com/@Melevi___xd");

console.log("Todo bien: paisaje diurno/nocturno y enlaces sociales.");
