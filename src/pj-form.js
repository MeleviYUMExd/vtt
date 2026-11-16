import { $, toast, traducirError } from "./utils.js";
import { estado } from "./state.js";
import { crearPersonaje } from "./characters.js";
import { tirarStats } from "./dados.js";

function leerNumero(selector) {
  return Number($(selector).value);
}

function ponerStats(stats) {
  $("#pj-vida").value = stats.vida;
  $("#pj-fuerza").value = stats.fuerza;
  $("#pj-magia").value = stats.magia;
  $("#pj-encanto").value = stats.encanto;
}

export function iniciarFormPj() {
  const form = $("#form-pj");
  const btnNuevo = $("#btn-nuevo-pj");
  const btnCancelar = $("#btn-cancelar-pj");

  function cerrar() {
    form.reset();
    form.hidden = true;
    btnNuevo.hidden = !estado.esLoremaster;
  }

  btnNuevo.addEventListener("click", () => {
    if (!estado.esLoremaster) return;

    form.hidden = false;
    btnNuevo.hidden = true;
    const stats = tirarStats();
    ponerStats(stats);
    toast(`Dados: vida ${stats.vida}, fuerza ${stats.fuerza}, magia ${stats.magia}, encanto ${stats.encanto}.`);
  });

  btnCancelar.addEventListener("click", cerrar);

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
      }
    };

    if (Object.values(datos.stats).some((valor) => !Number.isInteger(valor) || valor < 0 || valor > 4)) {
      toast("Las estadísticas iniciales deben estar entre 0 y 4.", "error");
      return;
    }

    try {
      await crearPersonaje(estado.codigo, datos);
      toast("Personaje creado.", "ok");
      cerrar();
    } catch (e) {
      toast(traducirError(e), "error");
    }
  });
}