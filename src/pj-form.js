import { $, toast, traducirError } from "./utils.js";
import { estado } from "./state.js";
import { crearPersonaje } from "./characters.js";

function leerNumero(selector) {
  return Number($(selector).value);
}

export function iniciarFormPj() {
  const form = $("#form-pj");
  const btnNuevo = $("#btn-nuevo-pj");
  const btnCancelar = $("#btn-cancelar-pj");

  btnNuevo.addEventListener("click", () => {
    form.hidden = false;
    btnNuevo.hidden = true;
  });

  btnCancelar.addEventListener("click", () => {
    form.reset();
    form.hidden = true;
    btnNuevo.hidden = false;
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const datos = {
      nombre: $("#pj-nombre").value.trim(),
      stats: {
        vida: leerNumero("#pj-vida"),
        fuerza: leerNumero("#pj-fuerza"),
        magia: leerNumero("#pj-magia"),
        encanto: leerNumero("#pj-encanto")
      }
    };

    try {
      await crearPersonaje(estado.codigo, datos);
      toast("Personaje creado.", "ok");
      form.reset();
      form.hidden = true;
      btnNuevo.hidden = false;
    } catch (e) {
      toast(traducirError(e), "error");
    }
  });
}