// Rosa de los vientos estilo carta marina, con el norte en rojo.
export function rosaDeLosVientos(tam = 34) {
  const oro = "#e8c06a";
  const tinta = "#2a170a";
  const punta = (giro, largo, ancho, claro, oscuro) =>
    `<g transform="rotate(${giro} 32 32)" stroke="${tinta}" stroke-width=".8" stroke-linejoin="round">` +
    `<polygon points="32,${32 - largo} ${32 - ancho},32 32,32" fill="${claro}"/>` +
    `<polygon points="32,${32 - largo} ${32 + ancho},32 32,32" fill="${oscuro}"/></g>`;

  let diagonales = "";
  let cardinales = "";
  for (let i = 0; i < 8; i++) {
    if (i % 2) {
      diagonales += punta(i * 45, 17, 3.6, "#f6e7c1", "#b99a62");
    } else {
      const norte = i === 0;
      cardinales += punta(
        i * 45,
        27,
        5,
        norte ? "#e2503a" : "#f6e7c1",
        norte ? "#8f2a1d" : "#b99a62"
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${tam}" height="${tam}" aria-hidden="true">` +
    `<circle cx="32" cy="32" r="30" fill="none" stroke="${oro}" stroke-width="2"/>` +
    `<circle cx="32" cy="32" r="22" fill="none" stroke="${oro}" stroke-width="1" stroke-dasharray="2 2"/>` +
    diagonales + cardinales +
    `<circle cx="32" cy="32" r="3.2" fill="${oro}" stroke="${tinta}" stroke-width=".8"/></svg>`;
}
