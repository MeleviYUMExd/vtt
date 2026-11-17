// Estado global mínimo de la sesión.
export const estado = {
  uid: null,
  codigo: null,
  yo: null,            // mi documento en jugadores/{uid}
  esLoremaster: false,
  jugadores: [],
  personajes: [],
  desuscribir: []      // funciones para cortar listeners
};

export function cortarListeners() {
  estado.desuscribir.forEach((f) => f());
  estado.desuscribir = [];
}

export function reiniciarSala() {
  cortarListeners();
  estado.codigo = null;
  estado.yo = null;
  estado.esLoremaster = false;
  estado.jugadores = [];
  estado.personajes = [];
}

const CLAVE = "vtt:sesion";
export const sesion = {
  guardar: (codigo) => { try { localStorage.setItem(CLAVE, codigo); } catch {} },
  leer: () => { try { return localStorage.getItem(CLAVE); } catch { return null; } },
  borrar: () => { try { localStorage.removeItem(CLAVE); } catch {} }
};
