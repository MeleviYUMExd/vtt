import { asegurarSesion } from "./firebase.js";
import { escucharPersonajes } from "./characters.js";
import { pintarPersonajes } from "./cards.js";
import { iniciarFormPj } from "./pj-form.js";
import {
  iniciarMapa, ponerFondo, ponerRectFondo, permitirEdicion, alSoltarFondo
} from "./mapa.js";
import {
  escucharTurnos, iniciarTurnos, pintarBarraTurnos, sincronizarCola, avanzarTurno,
  darTiradaExtra, cambiarInfinitas, cambiarCiclo, alternarAfk, tirarD20, puedeTirarAhora
} from "./turnos.js";
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
  let primeraCargaTiradas = true;
  const tiradasConocidas = new Set();

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
        salas.escucharSala(codigo, (sala) => {
          ponerFondo(sala?.config?.fondoUrl);
          ponerRectFondo(sala?.config?.fondoRect);
        },
          (e) => toast(traducirError(e), "error"))
      );
      estado.desuscribir.push(
        salas.escucharJugadores(codigo, pintarListas, (e) => toast(traducirError(e), "error"))
      );
      estado.desuscribir.push(
        escucharPersonajes(
          codigo,
          (lista) => {
            estado.personajes = lista;
            repintarPersonajes();
            refrescarTurnos();
          },
          (e) => toast(traducirError(e), "error")
        )
      );
      estado.desuscribir.push(
        escucharTurnos(
          codigo,
          (t) => { estado.turnos = t; refrescarTurnos(); repintarPersonajes(); },
          (e) => toast(traducirError(e), "error")
        )
      );
      estado.desuscribir.push(
        salas.escucharTiradas(codigo, (tiradas, desdeCache) => {
          if (primeraCargaTiradas) {
            if (desdeCache) return;
            tiradas.forEach((tirada) => tiradasConocidas.add(tirada.id));
            primeraCargaTiradas = false;
            return;
          }

          const nuevas = tiradas.filter((tirada) => !tiradasConocidas.has(tirada.id));
          tiradasConocidas.clear();
          tiradas.forEach((tirada) => tiradasConocidas.add(tirada.id));
          nuevas.reverse().forEach((tirada) => {
            toast(
              `${tirada.nombre} sacó ${tirada.resultado} en d20.`,
              tirada.resultado === 20 ? "ok" : "info"
            );
          });
        }, (e) => toast(traducirError(e), "error"))
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
  permitirEdicion(estado.esLoremaster);
  $("#btn-fondo").hidden = !estado.esLoremaster;
  $("#panel-espera").hidden = !estado.esLoremaster;
  $("#btn-nuevo-pj").hidden = !estado.esLoremaster || !$("#form-pj").hidden;
}

function repintarPersonajes() {
  pintarPersonajes(estado.personajes, $("#lista-personajes"));
}

// Repinta la barra de turnos y corrige la cola si hace falta.
function refrescarTurnos() {
  pintarBarraTurnos();
  sincronizarCola(estado.codigo).catch((e) => toast(traducirError(e), "error"));
}

function pintarListas(jugadores) {
  estado.jugadores = jugadores;
  repintarPersonajes();
  refrescarTurnos();

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
        ? h("span", { class: "acciones" },
            h("button", { class: "btn chico", onclick: () => accion(() => alternarAfk(estado.codigo, j)) }, j.estado === "pausa" ? "Volver" : "AFK"),
            h("button", { class: "btn chico peligro", onclick: () => accion(() => salas.expulsar(estado.codigo, j.uid)) }, "Expulsar"))
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

$("#btn-fondo").addEventListener("click", () => {
  const url = prompt("Pega la URL directa de la imagen (https://...). Vacío quita el fondo:");
  if (url === null) return;
  accion(() => salas.cambiarFondo(estado.codigo, url));
});

$("#btn-d20").addEventListener("click", () => {
  if (!puedeTirarAhora()) return toast("No es tu turno, o ya gastaste tu tirada.", "error");
  accion(() => tirarD20(estado.codigo));
});

$("#btn-iniciar-turnos").addEventListener("click", () => {
  if (estado.turnos && !confirm("¿Reiniciar los turnos desde la ronda 1?")) return;
  accion(() => iniciarTurnos(estado.codigo));
});
$("#btn-pasar-turno").addEventListener("click", () => accion(() => avanzarTurno(estado.codigo)));
$("#btn-tirada-extra").addEventListener("click", () => accion(() => darTiradaExtra(estado.codigo)));
$("#btn-infinitas").addEventListener("click", () => accion(() => cambiarInfinitas(estado.codigo)));
$("#btn-ciclo").addEventListener("click", () => accion(() => cambiarCiclo(estado.codigo)));

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

iniciarFormPj();
iniciarMapa();
alSoltarFondo((r) => accion(() => salas.guardarFondoRect(estado.codigo, r)));

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