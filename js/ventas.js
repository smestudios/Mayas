import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  runTransaction,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ELEMENTOS DOM
========================= */
const tablaVentas = document.getElementById("tablaVentas");

const btnVender = document.getElementById("btnVender");
const modalVenta = document.getElementById("modalVenta");
const btnCancelarVenta = document.getElementById("btnCancelarVenta");
const btnGuardarVenta = document.getElementById("btnGuardarVenta");
const btnGuardarVentaPdf = document.getElementById("btnGuardarVentaPdf");
const btnAgregarProducto = document.getElementById("btnAgregarProducto");

const ventaCliente = document.getElementById("ventaCliente");
const ventaTipo = document.getElementById("ventaTipo");
const contenedorProductos = document.getElementById("productosVenta");

const ventaTotalTxt = document.getElementById("ventaTotal");
const ventaGananciaTxt = document.getElementById("ventaGanancia");

/* =========================
   ESTADO
========================= */
let productosDisponibles = [];
let productosVenta = [];
let clientesDisponibles = [];

/* =========================
   CARGAR PRODUCTOS ACTIVOS
========================= */
async function cargarProductos() {
  const snap = await getDocs(collection(db, "productos"));
  productosDisponibles = [];

  snap.forEach(d => {
    const p = d.data();
    if (p.activo) {
      productosDisponibles.push({
        id: d.id,
        nombre: p.nombre,
        costo: p.costo,
        precio: p.precio
      });
    }
  });
}

async function cargarClientes() {
  const snap = await getDocs(collection(db, "clientes"));
  clientesDisponibles = [];
  ventaCliente.innerHTML = `<option value="">Selecciona cliente / tienda</option>`;

  snap.forEach(d => {
    const c = d.data();
    if (!c.activo) return;
    clientesDisponibles.push({ id: d.id, nombre: c.nombre });
    const option = document.createElement("option");
    option.value = d.id;
    option.textContent = c.nombre;
    ventaCliente.appendChild(option);
  });
}

/* =========================
   ABRIR / CERRAR MODAL
========================= */
btnVender.onclick = async () => {
  await cargarProductos();
  await cargarClientes();

  productosVenta = [];
  contenedorProductos.innerHTML = "";
  ventaCliente.value = "";
  ventaTotalTxt.textContent = "0";
  ventaGananciaTxt.textContent = "0";

  modalVenta.classList.add("activo");
};

btnCancelarVenta.onclick = () => {
  modalVenta.classList.remove("activo");
};

/* =========================
   AGREGAR PRODUCTO A VENTA
========================= */
btnAgregarProducto.onclick = () => {
  const fila = document.createElement("div");
  fila.className = "fila-venta";

  const select = document.createElement("select");
  select.innerHTML = `<option value="">Producto</option>`;
  productosDisponibles.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
  });

  const cantidad = document.createElement("input");
  cantidad.type = "number";
  cantidad.min = 1;
  cantidad.placeholder = "Cantidad";

  const precio = document.createElement("input");
  precio.type = "number";
  precio.placeholder = "Precio";

  const btnEliminar = document.createElement("button");
  btnEliminar.textContent = "✖";
  btnEliminar.className = "danger";

  btnEliminar.onclick = () => {
    fila.remove();
    calcularTotales();
  };

  select.onchange = () => {
    const prod = productosDisponibles.find(p => p.id === select.value);
    if (prod) precio.value = prod.precio;
    calcularTotales();
  };

  cantidad.oninput = calcularTotales;
  precio.oninput = calcularTotales;

  fila.append(select, cantidad, precio, btnEliminar);
  contenedorProductos.appendChild(fila);
};

/* =========================
   CALCULAR TOTALES
========================= */
function calcularTotales() {
  let total = 0;
  let ganancia = 0;

  document.querySelectorAll(".fila-venta").forEach(fila => {
    const select = fila.querySelector("select");
    const inputs = fila.querySelectorAll("input");
    const cantidad = Number(inputs[0].value);
    const precio = Number(inputs[1].value);

    if (!select.value || !cantidad || !precio) return;

    const prod = productosDisponibles.find(p => p.id === select.value);
    if (!prod) return;

    total += cantidad * precio;
    ganancia += cantidad * (precio - prod.costo);
  });

  ventaTotalTxt.textContent = total;
  ventaGananciaTxt.textContent = ganancia;
}

/* =========================
   UTILIDADES
========================= */
function formatearMoneda(valor) {
  return Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function obtenerProductosVenta() {
  if (!ventaCliente.value) {
    alert("Seleccione cliente");
    return null;
  }

  const clienteSeleccionado = clientesDisponibles.find(
    c => c.id === ventaCliente.value
  );
  if (!clienteSeleccionado) {
    alert("Seleccione un cliente válido");
    return null;
  }

  const productos = [];

  document.querySelectorAll(".fila-venta").forEach(fila => {
    const select = fila.querySelector("select");
    const inputs = fila.querySelectorAll("input");
    const cantidad = Number(inputs[0].value);
    const precio = Number(inputs[1].value);

    if (!select.value || !cantidad || !precio) return;

    const prod = productosDisponibles.find(p => p.id === select.value);

    productos.push({
      productoId: prod.id,
      nombre: prod.nombre,
      cantidad,
      precio,
      costo: prod.costo,
      subtotal: cantidad * precio
    });
  });

  if (productos.length === 0) {
    alert("Agregue al menos un producto");
    return null;
  }

  let total = 0;
  let costoTotal = 0;

  productos.forEach(p => {
    total += p.subtotal;
    costoTotal += p.costo * p.cantidad;
  });

  const ganancia = total - costoTotal;

  return {
    cliente: clienteSeleccionado.nombre,
    clienteId: ventaCliente.value,
    tipo: ventaTipo.value,
    productos,
    total,
    costoTotal,
    ganancia
  };
};

async function validarStock(productos) {
  for (const p of productos) {
    const invRef = doc(db, "inventario", p.productoId);
    const snap = await getDoc(invRef);
    const stockActual = snap.exists() ? Number(snap.data().stock || 0) : 0;

    if (stockActual < p.cantidad) {
      alert(`Stock insuficiente para ${p.nombre}`);
      return false;
    }
  }
  return true;
}

async function descontarInventario(productos) {
  for (const p of productos) {
    const invRef = doc(db, "inventario", p.productoId);
    await runTransaction(db, async transaction => {
      const snap = await transaction.get(invRef);
      const stockActual = snap.exists() ? Number(snap.data().stock || 0) : 0;
      const nuevoStock = stockActual - p.cantidad;

      if (nuevoStock < 0) {
        throw new Error(`Stock insuficiente para ${p.nombre}`);
      }

      transaction.set(
        invRef,
        { stock: nuevoStock, stockMinimo: snap.data()?.stockMinimo ?? 5 },
        { merge: true }
      );
    });
  }
}

function generarReciboPDF(venta, ventaId) {
  if (!window.jspdf) {
    alert("No se pudo generar el PDF. Verifique la conexión.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();
  const fecha = new Date().toLocaleString("es-MX");

  docPdf.setFontSize(16);
  docPdf.text("Recibo de venta", 14, 20);
  docPdf.setFontSize(11);
  docPdf.text(`Fecha: ${fecha}`, 14, 30);
  docPdf.text(`Cliente: ${venta.cliente}`, 14, 38);
  docPdf.text(`Tipo: ${venta.tipo}`, 14, 46);
  docPdf.text(`Folio: ${ventaId}`, 14, 54);

  let y = 66;
  docPdf.setFontSize(12);
  docPdf.text("Detalle:", 14, y);
  y += 8;

  venta.productos.forEach(p => {
    docPdf.setFontSize(10);
    docPdf.text(
      `${p.nombre} x${p.cantidad} - $${formatearMoneda(p.subtotal)}`,
      14,
      y
    );
    y += 6;
  });

  y += 4;
  docPdf.setFontSize(12);
  docPdf.text(`Total: $${formatearMoneda(venta.total)}`, 14, y);
  y += 8;
  docPdf.text(`Ganancia: $${formatearMoneda(venta.ganancia)}`, 14, y);

  docPdf.save(`venta-${ventaId}.pdf`);
}

/* =========================
   GUARDAR VENTA
========================= */
async function registrarVenta({ descargarPdf }) {
  const venta = obtenerProductosVenta();
  if (!venta) return;

  const stockValido = await validarStock(venta.productos);
  if (!stockValido) return;

  const docRef = await addDoc(collection(db, "ventas"), {
    fecha: serverTimestamp(),
    cliente: venta.cliente,
    clienteId: venta.clienteId,
    tipo: venta.tipo,
    productos: venta.productos,
    total: venta.total,
    costoTotal: venta.costoTotal,
    ganancia: venta.ganancia
  });

  try {
    await descontarInventario(venta.productos);
  } catch (error) {
    await updateDoc(doc(db, "ventas", docRef.id), {
      estado: "inventario_no_actualizado"
    });
    alert("No se pudo descontar inventario. Revise el stock.");
  }

  if (descargarPdf) {
    generarReciboPDF(venta, docRef.id);
  }

  modalVenta.classList.remove("activo");
}

btnGuardarVenta.onclick = () => registrarVenta({ descargarPdf: false });
btnGuardarVentaPdf.onclick = () => registrarVenta({ descargarPdf: true });

/* =========================
   HISTORIAL DE VENTAS
========================= */
onSnapshot(collection(db, "ventas"), snap => {
  tablaVentas.innerHTML = "";

  snap.forEach(docu => {
    const v = docu.data();

    const productosTxt = v.productos
      .map(p => `${p.nombre} x${p.cantidad}`)
      .join(", ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.fecha?.toDate().toLocaleDateString() || ""}</td>
      <td>${v.cliente}</td>
      <td>${v.tipo}</td>
      <td>${productosTxt}</td>
      <td>$${v.total}</td>
      <td class="${v.ganancia >= 0 ? "ganancia-positiva" : "ganancia-negativa"}">
        $${v.ganancia}
      </td>
    `;

    tablaVentas.appendChild(tr);
  });
});
