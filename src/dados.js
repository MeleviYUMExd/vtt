export function tirarDado(caras) {
  if (!Number.isInteger(caras) || caras < 1) {
    throw new RangeError("El dado debe tener al menos una cara.");
  }
  return Math.floor(Math.random() * caras) + 1;
}

export function tirarEntre(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError("El rango de la tirada no es válido.");
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function tirarStats() {
  return {
    vida: tirarEntre(0, 4),
    fuerza: tirarEntre(0, 4),
    magia: tirarEntre(0, 4),
    encanto: tirarEntre(0, 4)
  };
}

// Cantidad inicial de habilidades: 1 casi siempre, 2 rara, 3 muy rara.
// Cambia los pesos aquí si quieres otra probabilidad (deben sumar 100).
const PESOS_HABILIDADES = [
  { valor: 1, peso: 70 },
  { valor: 2, peso: 25 },
  { valor: 3, peso: 5 }
];

export function tirarHabilidades() {
  const total = PESOS_HABILIDADES.reduce((suma, o) => suma + o.peso, 0);
  let punto = Math.random() * total;
  for (const opcion of PESOS_HABILIDADES) {
    if (punto < opcion.peso) return opcion.valor;
    punto -= opcion.peso;
  }
  return 1;
}
