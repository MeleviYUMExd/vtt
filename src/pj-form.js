// Formulario "Nuevo personaje" (solo Loremaster).
import { $, h, toast, traducirError } from "./utils.js";
import { estado } from "./state.js";
import { crearPersonaje } from "./characters.js";
import { sortearPersonaje } from "./sorteo.js";

const TEXTO_VACIO = "Sin sortear: la raza y las habilidades quedarán vacías.";
let sorteo = null;

const leerNumero = (selector) => Number($(selector).value);

function ponerStats(s) {
  $("#pj-vida").value = s.vida;
  $("#pj-fuerza").value = s.fuerza;
  $("#pj-magia").value = s.magia;
  $("#pj-encanto").value = s.encanto;
}

function textoResumen(s) {
  const habs = s.habilidades.map((x) => x.nombre).join(", ") || "—";
  return `Raza: ${s.raza?.nombre ?? "—"} · Habilidades (${s.habilidadesMax}): ${habs} · Aparece en: ${s.spawn ?? "—"}`;
}

export function iniciarFormPj() {
  const form = $("#form-pj");
  const btnNuevo = $("#btn-nuevo-pj");
  const btnCancelar = $("#btn-cancelar-pj");

  const resumen = h("p", { class: "ayuda", id: "pj-resumen" }, TEXTO_VACIO);
  const btnSortear = h("button", { type: "button", class: "btn chico primario", id: "btn-sortear-pj" },
    "🎲 Sortear dados y ruletas");
  const fila = form.querySelector(".fila");
  form.insertBefore(btnSortear, fila);
  form.insertBefore(resumen, fila);

  function cerrar() {
    form.reset();
    form.hidden = true;
    btnNuevo.hidden = !estado.esLoremaster;
    sorteo = null;
    resumen.textContent = TEXTO_VACIO;
  }

  btnNuevo.addEventListener("click", () => {
    if (!estado.esLoremaster) return;
    form.hidden = false;
    btnNuevo.hidden = true;
  });

  btnCancelar.addEventListener("click", cerrar);

  btnSortear.addEventListener("click", async () => {
    const nombre = $("#pj-nombre").value.trim();
    if (!nombre) return toast("Escribe primero el nombre del personaje.", "error");
    btnSortear.disabled = true;
    try {
      sorteo = await sortearPersonaje(nombre);
      ponerStats(sorteo.stats);
      resumen.textContent = textoResumen(sorteo);
      if (!sorteo.raza) toast("No hay razas en la base de datos (☰ Datos).", "error");
    } catch (e) {
      toast(traducirError(e), "error");
    } finally {
      btnSortear.disabled = false;
    }
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!estado.esLoremaster) return;

    const datos = {
      nombre: $("#pj-nombre").value.trim(),
      stats: {
        vida: leerNumero("#pj-vida"),
        fuerza: leerNumero("#pj-fuerza"),
        magia: leerNumero("#pj-magia"),
        encanto: leerNumero("#pj-encanto")
      },
      raza: sorteo?.raza ?? null,
      habilidades: sorteo?.habilidades ?? [],
      habilidadesMax: sorteo?.habilidadesMax ?? 1
    };

    try {
      await crearPersonaje(estado.codigo, datos);
      toast("Personaje creado.", "ok");
      cerrar();
    } catch (e) {
      toast(traducirError(e), "error");
    }
  });
}
