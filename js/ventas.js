import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
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

/* =========================
   ABRIR / CERRAR MODAL
========================= */
btnVender.onclick = async () => {
  await cargarProductos();

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
   GUARDAR VENTA
========================= */
btnGuardarVenta.onclick = async () => {
  if (!ventaCliente.value) {
    alert("Ingrese cliente");
    return;
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
    return;
  }

  let total = 0;
  let costoTotal = 0;

  productos.forEach(p => {
    total += p.subtotal;
    costoTotal += p.costo * p.cantidad;
  });

  const ganancia = total - costoTotal;

  // Guardar venta
  await addDoc(collection(db, "ventas"), {
    fecha: serverTimestamp(),
    cliente: ventaCliente.value,
    tipo: ventaTipo.value,
    productos,
    total,
    costoTotal,
    ganancia
  });

  // Descontar inventario
  for (const p of productos) {
    const invRef = doc(db, "inventario", p.productoId);
    await updateDoc(invRef, {
      stock: p => p.stock - p.cantidad
    });
  }

  modalVenta.classList.remove("activo");
};

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
