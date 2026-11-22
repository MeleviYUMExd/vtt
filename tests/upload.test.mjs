import assert from "node:assert/strict";
import {
  MAX_BYTES, conTransformacion, subirImagen
} from "../src/upload.js";

await assert.rejects(
  subirImagen({ type: "image/gif", size: 10 }, "w_256"),
  { message: "Solo se aceptan imágenes PNG, JPG o WEBP." }
);
await assert.rejects(
  subirImagen({ type: "image/png", size: MAX_BYTES + 1 }, "w_256"),
  { message: "La imagen pesa más de 8 MB." }
);

assert.equal(
  conTransformacion("https://res.cloudinary.com/demo/image/upload/foto.png", "w_256"),
  "https://res.cloudinary.com/demo/image/upload/w_256/foto.png"
);
assert.equal(
  conTransformacion("https://example.com/foto.png", "w_256"),
  "https://example.com/foto.png"
);

const fetchOriginal = globalThis.fetch;
try {
  let solicitud;
  globalThis.fetch = async (url, opciones) => {
    solicitud = { url, opciones };
    return {
      ok: true,
      json: async () => ({ secure_url: "https://res.cloudinary.com/demo/image/upload/foto.png" })
    };
  };
  const url = await subirImagen(new Blob(["imagen"], { type: "image/png" }), "w_256");
  assert.match(solicitud.url, /^https:\/\/api\.cloudinary\.com\/v1_1\/.+\/image\/upload$/);
  assert.equal(solicitud.opciones.body.get("upload_preset"), "vtt_unsigned");
  assert.equal(url, "https://res.cloudinary.com/demo/image/upload/w_256/foto.png");
} finally {
  globalThis.fetch = fetchOriginal;
}

console.log("Todo bien: validación, preset y transformaciones de upload.");
