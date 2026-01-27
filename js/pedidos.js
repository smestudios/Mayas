import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  runTransaction,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ELEMENTOS DOM
========================= */
const tablaPedidos = document.getElementById("tablaPedidos");
const btnNuevoPedido = document.getElementById("btnNuevoPedido");
const modalPedido = document.getElementById("modalPedido");
const btnCancelarPedido = document.getElementById("btnCancelarPedido");
const btnGuardarPedido = document.getElementById("btnGuardarPedido");
const btnAgregarProductoPedido = document.getElementById("btnAgregarProductoPedido");

const pedidoCliente = document.getElementById("pedidoCliente");
const pedidoTipo = document.getElementById("pedidoTipo");
const contenedorProductos = document.getElementById("productosPedido");
const tituloPedido = document.getElementById("tituloPedido");

const pedidoTotalTxt = document.getElementById("pedidoTotal");
const pedidoGananciaTxt = document.getElementById("pedidoGanancia");

/* =========================
   ESTADO
========================= */
let productosDisponibles = [];
let clientesDisponibles = [];
let pedidoEnEdicion = null;

/* =========================
   UTILIDADES
========================= */
function normalizarNumero(valor) {
  if (valor === null || valor === undefined) return 0;
  const limpio = String(valor).replace(/,/g, "");
  const numero = Number(limpio);
  return Number.isNaN(numero) ? 0 : numero;
}

function formatearMoneda(valor) {
  return Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* =========================
   CARGAR DATA
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
        precio: p.precioVenta ?? p.precio
      });
    }
  });
}

async function cargarClientes() {
  const snap = await getDocs(collection(db, "clientes"));
  clientesDisponibles = [];
  pedidoCliente.innerHTML = `<option value="">Selecciona cliente / tienda</option>`;

  snap.forEach(d => {
    const c = d.data();
    if (!c.activo) return;
    clientesDisponibles.push({ id: d.id, nombre: c.nombre });
    const option = document.createElement("option");
    option.value = d.id;
    option.textContent = c.nombre;
    pedidoCliente.appendChild(option);
  });
}

/* =========================
   MODAL
========================= */
function prepararNuevoPedido() {
  pedidoEnEdicion = null;
  contenedorProductos.innerHTML = "";
  pedidoCliente.value = "";
  pedidoTipo.value = "mostrador";
  pedidoTotalTxt.textContent = "0";
  pedidoGananciaTxt.textContent = "0";
  tituloPedido.textContent = "Nuevo pedido";
  btnGuardarPedido.textContent = "Guardar pedido";
}

function cerrarModalPedido() {
  modalPedido.classList.remove("activo");
  prepararNuevoPedido();
}

btnNuevoPedido.onclick = async () => {
  await cargarProductos();
  await cargarClientes();
  prepararNuevoPedido();
  modalPedido.classList.add("activo");
};

btnCancelarPedido.onclick = cerrarModalPedido;

/* =========================
   FILAS DE PRODUCTO
========================= */
function crearFilaPedido({ productoId = "", cantidadValor = "", precioValor = "" } = {}) {
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
  if (cantidadValor) cantidad.value = cantidadValor;

  const precio = document.createElement("input");
  precio.type = "number";
  precio.placeholder = "Precio";
  precio.readOnly = true;
  if (precioValor) precio.value = normalizarNumero(precioValor);

  const btnEliminar = document.createElement("button");
  btnEliminar.textContent = "✖";
  btnEliminar.className = "danger";
  btnEliminar.onclick = () => {
    fila.remove();
    calcularTotales();
  };

  const actualizarPrecio = () => {
    const prod = productosDisponibles.find(p => p.id === select.value);
    if (prod) {
      precio.value = normalizarNumero(prod.precio);
    } else {
      precio.value = "";
    }
  };

  select.onchange = () => {
    actualizarPrecio();
    calcularTotales();
  };

  cantidad.oninput = calcularTotales;

  fila.append(select, cantidad, precio, btnEliminar);
  contenedorProductos.appendChild(fila);

  if (productoId) {
    select.value = productoId;
    if (!precio.value) actualizarPrecio();
  }
  calcularTotales();
}

btnAgregarProductoPedido.onclick = () => {
  crearFilaPedido();
};

/* =========================
   TOTALES
========================= */
function calcularTotales() {
  let total = 0;
  let ganancia = 0;

  document.querySelectorAll("#productosPedido .fila-venta").forEach(fila => {
    const select = fila.querySelector("select");
    const inputs = fila.querySelectorAll("input");
    const cantidad = normalizarNumero(inputs[0].value);
    const precio = normalizarNumero(inputs[1].value);

    if (!select.value || !cantidad || !precio) return;

    const prod = productosDisponibles.find(p => p.id === select.value);
    if (!prod) return;

    total += cantidad * precio;
    ganancia += cantidad * (precio - normalizarNumero(prod.costo));
  });

  pedidoTotalTxt.textContent = total;
  pedidoGananciaTxt.textContent = ganancia;
}

function obtenerProductosPedido() {
  if (!pedidoCliente.value) {
    alert("Seleccione cliente");
    return null;
  }

  const clienteSeleccionado = clientesDisponibles.find(
    c => c.id === pedidoCliente.value
  );
  if (!clienteSeleccionado) {
    alert("Seleccione un cliente válido");
    return null;
  }

  const productos = [];

  document.querySelectorAll("#productosPedido .fila-venta").forEach(fila => {
    const select = fila.querySelector("select");
    const inputs = fila.querySelectorAll("input");
    const cantidad = normalizarNumero(inputs[0].value);
    const precio = normalizarNumero(inputs[1].value);

    if (!select.value || !cantidad || !precio) return;

    const prod = productosDisponibles.find(p => p.id === select.value);

    productos.push({
      productoId: prod.id,
      nombre: prod.nombre,
      cantidad,
      precio,
      costo: normalizarNumero(prod.costo),
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
    clienteId: pedidoCliente.value,
    tipo: pedidoTipo.value,
    productos,
    total,
    costoTotal,
    ganancia
  };
};

/* =========================
   INVENTARIO
========================= */
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

/* =========================
   GUARDAR PEDIDO
========================= */
async function registrarPedido() {
  const pedido = obtenerProductosPedido();
  if (!pedido) return;

  if (pedidoEnEdicion) {
    await updateDoc(doc(db, "pedidos", pedidoEnEdicion.id), {
      cliente: pedido.cliente,
      clienteId: pedido.clienteId,
      tipo: pedido.tipo,
      productos: pedido.productos,
      total: pedido.total,
      costoTotal: pedido.costoTotal,
      ganancia: pedido.ganancia,
      actualizadoEn: serverTimestamp()
    });
    cerrarModalPedido();
    return;
  }

  await addDoc(collection(db, "pedidos"), {
    fecha: serverTimestamp(),
    cliente: pedido.cliente,
    clienteId: pedido.clienteId,
    tipo: pedido.tipo,
    productos: pedido.productos,
    total: pedido.total,
    costoTotal: pedido.costoTotal,
    ganancia: pedido.ganancia,
    estado: "pendiente"
  });

  cerrarModalPedido();
}

btnGuardarPedido.onclick = () => registrarPedido();

/* =========================
   ENTREGAR PEDIDO
========================= */
async function entregarPedido(pedidoId, pedidoData) {
  const confirmado = confirm("¿Marcar este pedido como entregado?");
  if (!confirmado) return;

  const stockValido = await validarStock(pedidoData.productos || []);
  if (!stockValido) return;

  try {
    await descontarInventario(pedidoData.productos || []);
  } catch (error) {
    alert("No se pudo descontar inventario. Revise el stock.");
    return;
  }

  await addDoc(collection(db, "ventas"), {
    fecha: serverTimestamp(),
    cliente: pedidoData.cliente,
    clienteId: pedidoData.clienteId,
    tipo: pedidoData.tipo,
    productos: pedidoData.productos || [],
    total: pedidoData.total || 0,
    costoTotal: pedidoData.costoTotal || 0,
    ganancia: pedidoData.ganancia || 0
  });

  await deleteDoc(doc(db, "pedidos", pedidoId));
}

async function abrirModalEdicion(pedidoId, pedidoData) {
  await cargarProductos();
  await cargarClientes();

  pedidoEnEdicion = { id: pedidoId, data: pedidoData };
  contenedorProductos.innerHTML = "";

  pedidoCliente.value = pedidoData.clienteId || "";
  pedidoTipo.value = pedidoData.tipo || "mostrador";

  (pedidoData.productos || []).forEach(p => {
    crearFilaPedido({
      productoId: p.productoId,
      cantidadValor: p.cantidad,
      precioValor: p.precio
    });
  });

  tituloPedido.textContent = "Editar pedido";
  btnGuardarPedido.textContent = "Guardar cambios";
  modalPedido.classList.add("activo");
}

async function eliminarPedido(pedidoId) {
  const confirmado = confirm("¿Deseas eliminar este pedido?");
  if (!confirmado) return;

  await deleteDoc(doc(db, "pedidos", pedidoId));
}

/* =========================
   LISTA DE PEDIDOS
========================= */
onSnapshot(collection(db, "pedidos"), snap => {
  tablaPedidos.innerHTML = "";

  if (snap.empty) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7">Sin pedidos registrados.</td>`;
    tablaPedidos.appendChild(tr);
    return;
  }

  snap.forEach(docu => {
    const p = docu.data();
    const productosTxt = (p.productos || [])
      .map(prod => `${prod.nombre} x${prod.cantidad}`)
      .join(", ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.fecha?.toDate().toLocaleDateString() || ""}</td>
      <td>${p.cliente}</td>
      <td>${p.tipo}</td>
      <td>${productosTxt}</td>
      <td>$${formatearMoneda(p.total)}</td>
      <td>${p.estado || "pendiente"}</td>
      <td></td>
    `;

    const accionesTd = tr.querySelector("td:last-child");
    const accionesContenedor = document.createElement("div");
    accionesContenedor.className = "acciones-venta";

    const btnEntregado = document.createElement("button");
    btnEntregado.className = "editar";
    btnEntregado.textContent = "✅";
    btnEntregado.title = "Marcar como entregado";
    btnEntregado.onclick = () => entregarPedido(docu.id, p);

    const btnEditar = document.createElement("button");
    btnEditar.className = "editar";
    btnEditar.textContent = "✏️";
    btnEditar.title = "Editar pedido";
    btnEditar.onclick = () => abrirModalEdicion(docu.id, p);

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "eliminar";
    btnEliminar.textContent = "🗑️";
    btnEliminar.title = "Eliminar pedido";
    btnEliminar.onclick = () => eliminarPedido(docu.id);

    accionesContenedor.append(btnEntregado, btnEditar, btnEliminar);
    accionesTd.appendChild(accionesContenedor);

    tablaPedidos.appendChild(tr);
  });
});
