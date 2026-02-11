import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ELEMENTOS DOM
========================= */
const tabla = document.getElementById("tablaInventario");

const modal = document.getElementById("modalInventario");
const tituloModal = document.getElementById("tituloInventario");
const nombreProductoTxt = document.getElementById("nombreProductoInventario");
const inputCantidad = document.getElementById("cantidadMovimiento");
const inputMotivo = document.getElementById("motivoMovimiento");

const btnGuardar = document.getElementById("btnGuardarMovimiento");
const btnCancelar = document.getElementById("btnCancelarInventario");

/* =========================
   ESTADO
========================= */
let inventarioActualId = null;
let tipoMovimiento = null; // entrada | salida | ajuste | cambioSalida | cambioEntrada
let stockActual = 0;
let productosCache = [];
let inventarioCache = {};


/* =========================
   INVENTARIO EN TIEMPO REAL
========================= */
function escucharInventario() {

  // 🔹 Escuchar productos
  onSnapshot(collection(db, "productos"), (snap) => {
    productosCache = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.activo);

    renderInventario();
  });

  // 🔹 Escuchar inventario
  onSnapshot(collection(db, "inventario"), (snap) => {
    inventarioCache = {};
    snap.docs.forEach(d => {
      inventarioCache[d.id] = d.data();
    });

    renderInventario();
  });
}

function renderInventario() {
  tabla.innerHTML = "";

  productosCache.forEach(producto => {
    const inv = inventarioCache[producto.id] || {
      stock: 0,
      stockMinimo: 5,
      cambiosPendientes: 0
    };

    let estado = "OK";
    let claseEstado = "ganancia-positiva";

    if (inv.stock <= inv.stockMinimo) {
      estado = "BAJO";
      claseEstado = "ganancia-negativa";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${producto.nombre}</td>
      <td>${inv.stock}</td>
      <td>${inv.cambiosPendientes || 0}</td>
      <td>${inv.stockMinimo}</td>
      <td class="${claseEstado}">${estado}</td>
      <td>
        <button title="Entrada" onclick="abrirMovimiento('${producto.id}', '${producto.nombre}', ${inv.stock}, 'entrada')">➕</button>
        <button title="Salida" onclick="abrirMovimiento('${producto.id}', '${producto.nombre}', ${inv.stock}, 'salida')">➖</button>
        <button title="Ajuste" onclick="abrirMovimiento('${producto.id}', '${producto.nombre}', ${inv.stock}, 'ajuste')">✏️</button>
        <button title="Entregado por cambio" onclick="abrirMovimiento('${producto.id}', '${producto.nombre}', ${inv.stock}, 'cambioSalida')">🔄➖</button>
        <button title="Regresa de cambio" onclick="abrirMovimiento('${producto.id}', '${producto.nombre}', ${inv.stock}, 'cambioEntrada')">🔄➕</button>
      </td>
    `;
    tabla.appendChild(tr);
  });
}


/* =========================
   ABRIR MODAL
========================= */
window.abrirMovimiento = (id, nombre, stock, tipo) => {
  inventarioActualId = id;
  tipoMovimiento = tipo;
  stockActual = stock;

  tituloModal.textContent =
    tipo === "entrada" ? "Entrada de inventario" :
    tipo === "salida" ? "Salida de inventario" :
    tipo === "cambioSalida" ? "Entregar producto por cambio" :
    tipo === "cambioEntrada" ? "Regresar producto de cambio" :
    "Ajuste de inventario";

  nombreProductoTxt.textContent = `Producto: ${nombre}`;
  inputCantidad.value = "";
  inputMotivo.value = "";

  modal.classList.add("activo");
};

/* =========================
   GUARDAR MOVIMIENTO
========================= */
btnGuardar.onclick = async () => {
  const cantidad = Number(inputCantidad.value);
  if (cantidad <= 0) {
    alert("Cantidad inválida");
    return;
  }

  let nuevoStock = stockActual;
  const cambiosActuales = Number(inventarioCache[inventarioActualId]?.cambiosPendientes || 0);
  let cambiosPendientes = cambiosActuales;

  if (tipoMovimiento === "entrada") {
    nuevoStock += cantidad;
  }

  if (tipoMovimiento === "salida") {
    if (cantidad > stockActual) {
      alert("No hay suficiente stock");
      return;
    }
    nuevoStock -= cantidad;
  }

  if (tipoMovimiento === "ajuste") {
    nuevoStock = cantidad;
  }

  if (tipoMovimiento === "cambioSalida") {
    if (cantidad > stockActual) {
      alert("No hay suficiente stock");
      return;
    }
    nuevoStock -= cantidad;
    cambiosPendientes += cantidad;
  }

  if (tipoMovimiento === "cambioEntrada") {
    if (cantidad > cambiosActuales) {
      alert("La cantidad supera los cambios pendientes");
      return;
    }
    nuevoStock += cantidad;
    cambiosPendientes -= cantidad;
  }

  const stockMinimo = inventarioCache[inventarioActualId]?.stockMinimo ?? 5;

  // Actualizar inventario
  await setDoc(
    doc(db, "inventario", inventarioActualId),
    { stock: nuevoStock, stockMinimo, cambiosPendientes },
    { merge: true }
  );

  // Guardar historial (MUY IMPORTANTE)
  await addDoc(collection(db, "movimientosInventario"), {
    inventarioId: inventarioActualId,
    tipo: tipoMovimiento,
    cantidad,
    stockAnterior: stockActual,
    stockNuevo: nuevoStock,
    motivo: inputMotivo.value || "",
    fecha: serverTimestamp()
  });

  cerrarModal();
};

/* =========================
   CERRAR MODAL
========================= */
function cerrarModal() {
  modal.classList.remove("activo");
  inventarioActualId = null;
  tipoMovimiento = null;
}

btnCancelar.onclick = cerrarModal;

/* =========================
   INICIAR
========================= */
escucharInventario();
