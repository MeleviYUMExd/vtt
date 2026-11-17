import { $, toast, traducirError } from "./utils.js";
import { estado } from "./state.js";
import { crearPersonaje, actualizarPersonaje } from "./characters.js";
import { tirarStats } from "./dados.js";

let editandoId = null;

const CAMPOS_STATS = [
  { campo: "vida", input: "#pj-vida", etiqueta: "#pj-vida-label", nombre: "Vida" },
  { campo: "fuerza", input: "#pj-fuerza", etiqueta: "#pj-fuerza-label", nombre: "Fuerza" },
  { campo: "magia", input: "#pj-magia", etiqueta: "#pj-magia-label", nombre: "Magia" },
  { campo: "encanto", input: "#pj-encanto", etiqueta: "#pj-encanto-label", nombre: "Encanto" }
];

function leerNumero(selector) {
  return Number($(selector).value);
}

function ponerStats(stats) {
  CAMPOS_STATS.forEach(({ campo, input }) => {
    $(input).value = stats[campo];
  });
}

function configurarStats(editable) {
  const maximo = editable ? 15 : 4;
  CAMPOS_STATS.forEach(({ input, etiqueta, nombre }) => {
    $(input).max = String(maximo);
    $(input).readOnly = !editable;
    $(etiqueta).textContent = `${nombre} (0-${maximo})`;
  });
}

function textoGuardar(texto) {
  $('#form-pj button[type="submit"]').textContent = texto;
}

function cerrar() {
  editandoId = null;
  $("#form-pj").reset();
  configurarStats(false);
  $("#form-pj").hidden = true;
  $("#btn-nuevo-pj").hidden = !estado.esLoremaster;
  textoGuardar("Guardar");
}

export function abrirEdicion(p) {
  if (!estado.esLoremaster) return;

  editandoId = p.id;
  configurarStats(true);
  $("#pj-nombre").value = p.nombre;
  ponerStats(p.stats);
  $("#form-pj").hidden = false;
  $("#btn-nuevo-pj").hidden = true;
  textoGuardar("Guardar cambios");
  $("#form-pj").scrollIntoView({ behavior: "smooth", block: "nearest" });
  $("#pj-nombre").focus();
}

export function iniciarFormPj() {
  const form = $("#form-pj");
  const btnNuevo = $("#btn-nuevo-pj");
  const btnCancelar = $("#btn-cancelar-pj");

  configurarStats(false);

  btnNuevo.addEventListener("click", () => {
    if (!estado.esLoremaster) return;

    editandoId = null;
    configurarStats(false);
    form.hidden = false;
    btnNuevo.hidden = true;
    textoGuardar("Guardar");
    const stats = tirarStats();
    ponerStats(stats);
    toast(`Dados: vida ${stats.vida}, fuerza ${stats.fuerza}, magia ${stats.magia}, encanto ${stats.encanto}.`);
  });

  btnCancelar.addEventListener("click", cerrar);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    if (!estado.esLoremaster) return;

    const maximo = editandoId ? 15 : 4;
    const datos = {
      nombre: $("#pj-nombre").value.trim(),
      stats: {
        vida: leerNumero("#pj-vida"),
        fuerza: leerNumero("#pj-fuerza"),
        magia: leerNumero("#pj-magia"),
        encanto: leerNumero("#pj-encanto")
      }
    };

    if (Object.values(datos.stats).some((valor) => !Number.isInteger(valor) || valor < 0 || valor > maximo)) {
      toast(`Las estadísticas deben estar entre 0 y ${maximo}.`, "error");
      return;
    }

    try {
      if (editandoId) {
        // TODO: guarda los cambios del personaje que se está editando.
        // await actualizarPersonaje(estado.codigo, editandoId, datos);
        toast("La actualización todavía está pendiente.", "error");
        return;
      }

      await crearPersonaje(estado.codigo, datos);
      toast("Personaje creado.", "ok");
      cerrar();
    } catch (e) {
      toast(traducirError(e), "error");
    }
  });
}