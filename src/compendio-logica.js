// src/compendio-logica.js
// Validación pura de una entrada del compendio.

export const CATEGORIAS = {
  razas: "Razas",
  objetos: "Objetos",
  spawn: "Spawn",
  habilidades: "Habilidades"
};

export function limpiarEntrada(d = {}) {
  if (!Object.hasOwn(CATEGORIAS, d.categoria)) throw new Error("Categoría inválida.");
  const nombre = String(d.nombre ?? "").trim().slice(0, 40);
  if (!nombre) throw new Error("El nombre es obligatorio.");
  const descripcion = String(d.descripcion ?? "").trim().slice(0, 300);

  const subOpciones = [];
  if (d.categoria === "habilidades" && Array.isArray(d.subOpciones)) {
    const vistos = new Set();
    for (const s of d.subOpciones) {
      const t = String(s ?? "").trim().slice(0, 40);
      if (t && !vistos.has(t.toLowerCase())) {
        vistos.add(t.toLowerCase());
        subOpciones.push(t);
      }
      if (subOpciones.length >= 30) break;
    }
  }
  return { categoria: d.categoria, nombre, descripcion, subOpciones };
}
