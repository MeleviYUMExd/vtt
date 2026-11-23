// Pruebas de ruletas, compendio y sorteo.
import assert from "node:assert/strict";
import { indiceAleatorio, valorDado, rotacionFinal, indiceBajoPuntero, disponibles, construirHabilidad } from "../src/ruleta-logica.js";
import { limpiarEntrada } from "../src/compendio-logica.js";
import { sortearPersonaje, sortearHabilidad } from "../src/sorteo-logica.js";

let fallos = 0;
async function prueba(nombre, fn) {
  try { await fn(); console.log("OK     " + nombre); }
  catch (e) { fallos++; console.log("FALLA  " + nombre + "\n         " + e.message.split("\n")[0]); }
}

await prueba("indiceAleatorio nunca se sale del rango", () => {
  assert.equal(indiceAleatorio(5, () => 0.999999), 4);
  assert.equal(indiceAleatorio(5, () => 0), 0);
});
await prueba("valorDado(0, 4) da 0..4 y alcanza los dos extremos", () => {
  assert.equal(valorDado(0, 4, () => 0), 0);
  assert.equal(valorDado(0, 4, () => 0.999999), 4);
});
await prueba("la rueda siempre para en la rebanada elegida", () => {
  for (const n of [1,2,3,5,8,13,30]) for (let idx=0; idx<n; idx++) for (const j of [-0.4,0,0.4]) for (const desde of [0,1.7,40]) {
    const r = rotacionFinal(n, idx, desde, 5, j);
    assert.ok(r > desde + 4*Math.PI);
    assert.equal(indiceBajoPuntero(n,r), idx);
  }
});
await prueba("disponibles quita las ya elegidas", () => {
  assert.deepEqual(disponibles([{id:"a"},{id:"b"},{id:"c"}], ["b"]).map(e=>e.id), ["a","c"]);
});
await prueba("construirHabilidad con y sin ruleta extra", () => {
  assert.deepEqual(construirHabilidad({id:"x",nombre:"Danmaku"}), {origenId:"x",nombre:"Danmaku",nivelActual:0});
  assert.equal(construirHabilidad({id:"s",nombre:"Stand"},"Echoes").nombre,"Echoes (Stand)");
});
await prueba("limpiarEntrada valida categoría, nombre y opciones", () => {
  assert.throws(() => limpiarEntrada({categoria:"toString",nombre:"x"}));
  assert.throws(() => limpiarEntrada({categoria:"razas",nombre:"   "}));
  const e = limpiarEntrada({categoria:"habilidades",nombre:" Stand ",descripcion:"d",subOpciones:["Echoes"," echoes ","","Star Platinum"]});
  assert.equal(e.nombre,"Stand");
  assert.deepEqual(e.subOpciones,["Echoes","Star Platinum"]);
  assert.deepEqual(limpiarEntrada({categoria:"razas",nombre:"Elfo",subOpciones:["a"]}).subOpciones,[]);
});

function fabrica() {
  const razas = ["Youkai","Humano","Hada"].map((n,i)=>({id:"r"+i,categoria:"razas",nombre:n}));
  const spawns = ["Aldea","Bosque"].map((n,i)=>({id:"s"+i,categoria:"spawn",nombre:n}));
  const habs = [
    {id:"h0",categoria:"habilidades",nombre:"Danmaku"},
    {id:"h1",categoria:"habilidades",nombre:"Stand",subOpciones:["Star Platinum","Echoes","Killer Queen"]},
    {id:"h2",categoria:"habilidades",nombre:"Minecraft"},
    {id:"h3",categoria:"habilidades",nombre:"Magia"},
    {id:"h4",categoria:"habilidades",nombre:"Ninpo"}
  ];
  const todo=[...razas,...spawns,...habs], giros=[];
  return {giros,deps:{
    entradas:(cat)=>todo.filter(e=>e.categoria===cat),
    girar:async(titulo,nombres,idx)=>{assert.ok(idx>=0&&idx<nombres.length);giros.push({titulo,nombres,idx})},
    dados:async()=>{}, pausa:async()=>{}
  }};
}

await prueba("sorteo: estadísticas 0-4, 1-3 habilidades y ninguna repetida (500 veces)", async () => {
  for(let i=0;i<500;i++){
    const {deps}=fabrica();
    const r=await sortearPersonaje(deps,"Pe");
    for(const k of ["vida","fuerza","magia","encanto"]) assert.ok(r.stats[k]>=0&&r.stats[k]<=4);
    assert.ok(r.habilidadesMax>=1&&r.habilidadesMax<=3);
    assert.equal(r.habilidades.length,r.habilidadesMax);
    const ids=r.habilidades.map(h=>h.origenId);
    assert.equal(new Set(ids).size,ids.length);
    assert.ok(r.raza&&r.raza.origenId.startsWith("r"));
    assert.ok(["Aldea","Bosque"].includes(r.spawn));
  }
});
await prueba("sorteo: Stand dispara ruleta extra", async () => {
  const {deps,giros}=fabrica();
  deps.rng=()=>0.3;
  const hab=await sortearHabilidad(deps,[],"Habilidad");
  assert.equal(hab.origenId,"h1");
  assert.ok(hab.nombre.endsWith("(Stand)"));
  assert.deepEqual(giros.at(-1).nombres,["Star Platinum","Echoes","Killer Queen"]);
  assert.equal(giros.length,2);
});
await prueba("sorteo: pocas habilidades se agotan sin repetir", async () => {
  const {deps}=fabrica();
  const solo=deps.entradas("habilidades").slice(0,1);
  deps.entradas=(cat)=>(cat==="habilidades"?solo:fabrica().deps.entradas(cat));
  for(let i=0;i<50;i++) assert.equal((await sortearPersonaje(deps,"Pe")).habilidades.length,1);
});
await prueba("sorteo: compendio vacío no se rompe", async () => {
  const {deps}=fabrica();
  deps.entradas=()=>[];
  const r=await sortearPersonaje(deps,"Pe");
  assert.equal(r.raza,null); assert.equal(r.spawn,null); assert.deepEqual(r.habilidades,[]);
});

console.log(fallos===0?"\nTodo bien: 0 fallos.":`\n${fallos} prueba(s) fallaron.`);
process.exit(fallos===0?0:1);
