// Sube imágenes a Cloudinary con un preset unsigned.
import { cloudinary } from "./config.js";

export const MAX_BYTES = 8 * 1024 * 1024;
export const TIPOS = ["image/png", "image/jpeg", "image/webp"];

export const PARA_TOKEN = "w_256,h_256,c_fill,f_auto,q_auto";
export const PARA_FONDO = "w_2400,c_limit,f_auto,q_auto";

export function conTransformacion(url, trans) {
  const marca = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marca)) return url;
  return url.replace(marca, marca + trans + "/");
}

export function elegirArchivo() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = TIPOS.join(",");
    input.addEventListener("change", () => resolve(input.files[0] ?? null));
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

function validarArchivo(archivo) {
  if (!archivo || !TIPOS.includes(archivo.type)) {
    throw new Error("Solo se aceptan imágenes PNG, JPG o WEBP.");
  }
  if (archivo.size > MAX_BYTES) {
    throw new Error("La imagen pesa más de 8 MB.");
  }
  return archivo;
}

export async function subirImagen(archivo, trans) {
  validarArchivo(archivo);

  const datos = new FormData();
  datos.append("file", archivo);
  datos.append("upload_preset", cloudinary.uploadPreset);

  const resp = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
    { method: "POST", body: datos }
  );
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json.error?.message || "No se pudo subir la imagen. Revisa tu conexión.");
  }

  if (typeof json.secure_url !== "string" || !json.secure_url.startsWith("https://")) {
    throw new Error("Cloudinary no devolvió una URL HTTPS válida.");
  }
  return conTransformacion(json.secure_url, trans);
}
