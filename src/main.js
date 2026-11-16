import { asegurarSesion } from "./firebase.js";
import { escucharPersonajes } from "./characters.js";
import { pintarPersonajes } from "./cards.js";
import * as salas from "./rooms.js";
import { estado, reiniciarSala, cortarListeners, sesion } from "./state.js";
import {
  $, h, toast, traducirError, normalizarCodigo, limpiarNombre, CODIGO_RE, millis
} from "./utils.js";

const VISTAS = ["login", "espera", "juego"];
function mostrar(nombre) {
  VISTAS.forEach((v) => { $(`#vista-${v}`).hidden = v !== nombre; });
}

const codigoDeHash = () => normalizarCodigo(new URLSearchParams(location.hash.slice(1)).get("sala"));

/* ---------- LOGIN ---------- */
function mostrarLogin(codigoPrevio = "") {
  reiniciarSala();
  mostrar("login");
  $("#in-codigo").value = codigoPrevio;
  $("#in-nombre").focus();
}

function leerFormulario() {
  const nombre = limpiarNombre($("#in-nombre").value);
  const codigo = normalizarCodigo($("#in-codigo").value);
  if (!nombre) { toast("Escribe tu nombre.", "error"); return null; }
  if (!CODIGO_RE.test(codigo)) { toast("El código debe tener 4 letras o números.", "error"); return null; }
  return { nombre, codigo };
}

async function accionLogin(fn) {
  const datos = leerFormulario();
  if (!datos) return;
  const botones = document.querySelectorAll("#form-login button");
  botones.forEach((b) => (b.disabled = true));
  try {
    await fn(datos);
    entrarASala(datos.codigo);
  } catch (e) {
    toast(traducirError(e), "error");
  } finally {
    botones.forEach((b) => (b.disabled = false));
  }
}

$("#form-login").addEventListener("submit", (ev) => {
  ev.preventDefault();
  accionLogin(({ codigo, nombre }) => salas.unirseSala(codigo, nombre, estado.uid));
});
$("#btn-crear").addEventListener("click", () =>
  accionLogin(({ codigo, nombre }) => salas.crearSala(codigo, nombre, estado.uid)));

/* ---------- ENTRAR A UNA SALA ---------- */
function entrarASala(codigo) {
  cortarListeners();
  estado.codigo = codigo;
  sesion.guardar(codigo);
  history.replaceState(null, "", `#sala=${codigo}`);

  let escuchandoLista = false;

  const off = salas.escucharMiJugador(codigo, estado.uid, (yo) => {
    if (!yo) {
      toast("Ya no estás en esta sala.", "error");
      sesion.borrar();
      history.replaceState(null, "", location.pathname);
      return mostrarLogin();
    }
    estado.yo = yo;
    estado.esLoremaster = yo.esLoremaster === true;

    if (yo.estado === "esperando" || yo.estado === "rechazado") {
      pintarEspera(yo);
      return mostrar("espera");
    }

    // activo o pausa
    pintarCabecera();
    mostrar("juego");
    if (!escuchandoLista) {
      escuchandoLista = true;
      estado.desuscribir.push(
        salas.escucharJugadores(codigo, pintarListas, (e) => toast(traducirError(e), "error"))
      );
      estado.desuscribir.push(
        escucharPersonajes(
          codigo,
          (lista) => pintarPersonajes(lista, $("#lista-personajes")),
          (e) => toast(traducirError(e), "error")
        )
      );
    }
  }, (e) => toast(traducirError(e), "error"));

  estado.desuscribir.push(off);
}

/* ---------- ESPERA ---------- */
function pintarEspera(yo) {
  $("#espera-codigo").textContent = estado.codigo;
  const rechazado = yo.estado === "rechazado";
  $("#espera-titulo").textContent = rechazado ? "No fuiste admitido" : "Esperando al Loremaster";
  $("#espera-texto").textContent = rechazado
    ? "El Loremaster rechazó tu solicitud. Puedes salir y probar con otra sala."
    : "Ya estás registrado. Cuando el Loremaster te admita, entrarás solo.";
}
$("#btn-espera-salir").addEventListener("click", salir);

/* ---------- JUEGO ---------- */
function pintarCabecera() {
  $("#juego-codigo").textContent = estado.codigo;
  $("#juego-rol").textContent = estado.esLoremaster ? "Loremaster" : "Jugador";
  $("#panel-espera").hidden = !estado.esLoremaster;
}

function pintarListas(jugadores) {
  const ordenados = [...jugadores].sort((a, b) => millis(a.creadoEn) - millis(b.creadoEn));
  const mesa = ordenados.filter((j) => j.estado === "activo" || j.estado === "pausa");
  const espera = ordenados.filter((j) => j.estado === "esperando");

  const lm = $("#lista-mesa");
  lm.replaceChildren(...mesa.map((j) =>
    h("li", {},
      h("span", { class: "nombre" },
        h("span", {}, h("span", { class: `punto ${j.estado}` }), j.nombre, j.uid === estado.uid ? " (tú)" : ""),
        h("small", {}, j.esLoremaster ? "Loremaster" : j.estado === "pausa" ? "En pausa" : "Jugador")),
      estado.esLoremaster && !j.esLoremaster
        ? h("button", { class: "btn chico peligro", onclick: () => accion(() => salas.expulsar(estado.codigo, j.uid)) }, "Expulsar")
        : null)));

  if (estado.esLoremaster) {
    const le = $("#lista-espera");
    le.replaceChildren(...(espera.length ? espera.map((j) =>
      h("li", {},
        h("span", { class: "nombre" }, j.nombre),
        h("span", { class: "acciones" },
          h("button", { class: "btn chico primario", onclick: () => accion(() => salas.admitir(estado.codigo, j.uid)) }, "Admitir"),
          h("button", { class: "btn chico peligro", onclick: () => accion(() => salas.rechazar(estado.codigo, j.uid)) }, "Rechazar"))))
      : [h("li", { class: "vacio" }, "Nadie esperando")]));

    if (espera.length > (pintarListas.previo ?? 0)) toast(`${espera[espera.length - 1].nombre} quiere entrar.`);
    pintarListas.previo = espera.length;
  }
}

async function accion(fn) {
  try { await fn(); } catch (e) { toast(traducirError(e), "error"); }
}

$("#btn-invitar").addEventListener("click", async () => {
  const url = `${location.origin}${location.pathname}#sala=${estado.codigo}`;
  try { await navigator.clipboard.writeText(url); toast("Enlace copiado.", "ok"); }
  catch { toast(url); }
});
$("#btn-salir").addEventListener("click", salir);

async function salir() {
  const codigo = estado.codigo;
  try {
    // El Loremaster no borra su ficha al salir: así puede volver a su sala.
    if (codigo && !estado.esLoremaster) await salas.salirDeSala(codigo, estado.uid);
  } catch (e) { toast(traducirError(e), "error"); }
  sesion.borrar();
  history.replaceState(null, "", location.pathname);
  mostrarLogin();
}

/* ---------- ARRANQUE ---------- */
(async function iniciar() {
  try {
    const user = await asegurarSesion();
    estado.uid = user.uid;
  } catch (e) {
    mostrar("login");
    return toast("No se pudo iniciar sesión: " + traducirError(e), "error", 8000);
  }

  const codigo = codigoDeHash() || sesion.leer();
  if (codigo && CODIGO_RE.test(codigo)) {
    try {
      const yo = await salas.obtenerJugador(codigo, estado.uid);
      if (yo) return entrarASala(codigo);   // reconexión automática por uid
    } catch { /* si falla, caemos al login */ }
  }
  mostrarLogin(codigo && CODIGO_RE.test(codigo) ? codigo : "");
})();