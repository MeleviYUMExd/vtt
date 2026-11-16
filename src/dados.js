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
