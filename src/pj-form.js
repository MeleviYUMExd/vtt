import { $, toast, traducirError } from "./utils.js";
import { estado } from "./state.js";
import { crearPersonaje } from "./characters.js";
import { tirarStats, tirarHabilidades } from "./dados.js";

function leerNumero(selector) {
  return Number($(selector).value);
}

function ponerDados(stats, habilidades) {
  $("#pj-vida").value = stats.vida;
  $("#pj-fuerza").value = stats.fuerza;
  $("#pj-magia").value = stats.magia;
  $("#pj-encanto").value = stats.encanto;
  $("#pj-habilidades").value = habilidades;
}

function cerrar() {
  $("#form-pj").reset();
  $("#form-pj").hidden = true;
  $("#btn-nuevo-pj").hidden = !estado.esLoremaster;
}

export function iniciarFormPj() {
  const form = $("#form-pj");
  const btnNuevo = $("#btn-nuevo-pj");
  const btnCancelar = $("#btn-cancelar-pj");

  btnNuevo.addEventListener("click", () => {
    if (!estado.esLoremaster) return;
    form.hidden = false;
    btnNuevo.hidden = true;
    const stats = tirarStats();
    const habilidades = tirarHabilidades();
    ponerDados(stats, habilidades);
    toast(`Dados: vida ${stats.vida}, fuerza ${stats.fuerza}, magia ${stats.magia}, encanto ${stats.encanto}, habilidades ${habilidades}.`);
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
      },
      habilidadesMax: leerNumero("#pj-habilidades")
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