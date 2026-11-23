// src/ruleta-logica.js
// Matemática pura de ruletas y dados.
export const VUELTAS = 5;
const DOS_PI = 2 * Math.PI;

export function indiceAleatorio(n, rng = Math.random) {
  return n <= 0 ? 0 : Math.min(n - 1, Math.floor(rng() * n));
}

export function valorDado(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function rotacionFinal(n, idx, desde = 0, vueltas = VUELTAS, jitter = 0) {
  const paso = DOS_PI / n;
  const objetivo = -(idx + 0.5 + jitter) * paso;
  const falta = (((objetivo - desde) % DOS_PI) + DOS_PI) % DOS_PI;
  return desde + falta + vueltas * DOS_PI;
}

export function indiceBajoPuntero(n, rot) {
  const paso = DOS_PI / n;
  const a = (((-rot) % DOS_PI) + DOS_PI) % DOS_PI;
  return Math.floor(a / paso) % n;
}

export function disponibles(pool, excluirIds) {
  return pool.filter((e) => !excluirIds.includes(e.id));
}

export function construirHabilidad(entrada, sub = null) {
  return {
    origenId: entrada.id,
    nombre: sub ? `${sub} (${entrada.nombre})` : entrada.nombre,
    nivelActual: 0
  };
}
