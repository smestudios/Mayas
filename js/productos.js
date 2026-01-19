import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tabla = document.getElementById("tablaProductos");
const buscador = document.getElementById("buscadorProductos");
const btnNuevo = document.getElementById("btnNuevoProducto");

// MODAL
const modal = document.getElementById("modalProducto");
const tituloModal = document.getElementById("tituloModal");
const btnGuardar = document.getElementById("btnGuardarProducto");
const btnCancelar = document.getElementById("btnCancelar");

const inputNombre = document.getElementById("prodNombre");
const inputCategoria = document.getElementById("prodCategoria");
const inputCosto = document.getElementById("prodCosto");
const inputPrecio = document.getElementById("prodPrecio");

let productos = [];
let productoEditandoId = null;

// ==========================
// CARGAR PRODUCTOS
// ==========================
async function cargarProductos() {
  const q = query(collection(db, "productos"), where("activo", "==", true));
  const snap = await getDocs(q);

  productos = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  renderTabla(productos);
}

// ==========================
// RENDER TABLA
// ==========================
function renderTabla(lista) {
  tabla.innerHTML = "";

  lista.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nombre}</td>
      <td>$${p.costo.toLocaleString()}</td>
      <td>$${p.precioVenta.toLocaleString()}</td>
      <td>$${(p.precioVenta - p.costo).toLocaleString()}</td>
      <td>
        <button onclick="editarProducto('${p.id}')">✏️</button>
        <button onclick="eliminarProducto('${p.id}')">🗑️</button>
      </td>
    `;
    tabla.appendChild(tr);
  });
}

// ==========================
// BUSCADOR
// ==========================
buscador.addEventListener("input", () => {
  const texto = buscador.value.toLowerCase();

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(texto) ||
    p.categoria.toLowerCase().includes(texto)
  );

  renderTabla(filtrados);
});

// ==========================
// NUEVO
// ==========================
btnNuevo.onclick = () => {
  productoEditandoId = null;
  tituloModal.textContent = "Nuevo producto";
  inputNombre.value = "";
  inputCategoria.value = "";
  inputCosto.value = "";
  inputPrecio.value = "";
  modal.classList.add("activo");
};

// ==========================
// GUARDAR
// ==========================
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const categoria = inputCategoria.value.trim();
  const costo = Number(inputCosto.value);
  const precio = Number(inputPrecio.value);

  if (!nombre || !categoria || costo <= 0 || precio <= 0) {
    alert("Completa todos los campos");
    return;
  }

  if (productoEditandoId) {
    await updateDoc(doc(db, "productos", productoEditandoId), {
      nombre,
      categoria,
      costo,
      precioVenta: precio
    });
  } else {
    await addDoc(collection(db, "productos"), {
      nombre,
      categoria,
      costo,
      precioVenta: precio,
      activo: true,
      creadoEn: Timestamp.now()
    });
  }

  modal.classList.remove("activo");
  cargarProductos();
};

// ==========================
// EDITAR
// ==========================
window.editarProducto = (id) => {
  const p = productos.find(x => x.id === id);
  if (!p) return;

  productoEditandoId = id;
  tituloModal.textContent = "Editar producto";

  inputNombre.value = p.nombre;
  inputCategoria.value = p.categoria;
  inputCosto.value = p.costo;
  inputPrecio.value = p.precioVenta;

  modal.classList.add("activo");
};

// ==========================
// ELIMINAR (SOFT)
// ==========================
window.eliminarProducto = async (id) => {
  if (!confirm("¿Eliminar producto?")) return;

  await updateDoc(doc(db, "productos", id), { activo: false });
  cargarProductos();
};

// ==========================
btnCancelar.onclick = () => modal.classList.remove("activo");
cargarProductos();
