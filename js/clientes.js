import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tablaClientes = document.getElementById("tablaClientes");
const btnNuevoCliente = document.getElementById("btnNuevoCliente");

const modalCliente = document.getElementById("modalCliente");
const tituloCliente = document.getElementById("tituloCliente");
const btnGuardarCliente = document.getElementById("btnGuardarCliente");
const btnCancelarCliente = document.getElementById("btnCancelarCliente");

const inputNombre = document.getElementById("clienteNombre");
const inputTipo = document.getElementById("clienteTipo");
const inputTelefono = document.getElementById("clienteTelefono");
const inputDireccion = document.getElementById("clienteDireccion");
const inputEstado = document.getElementById("clienteEstado");

let clientes = [];
let clienteEditandoId = null;

async function cargarClientes() {
  tablaClientes.innerHTML = "";

  try {
    const clientesSnapshot = await getDocs(collection(db, "clientes"));

    if (clientesSnapshot.empty) {
      tablaClientes.innerHTML = `
        <tr>
          <td colspan="6">No hay clientes registrados</td>
        </tr>
      `;
      return;
    }

    clientes = clientesSnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderTabla(clientes);
  } catch (error) {
    console.error("Error cargando clientes:", error);
    tablaClientes.innerHTML = `
      <tr>
        <td colspan="6">Error cargando clientes</td>
      </tr>
    `;
  }
}

function renderTabla(lista) {
  tablaClientes.innerHTML = "";

  lista.forEach(c => {
    const tipo =
      c.tipo === "tienda" ? "🏪 Tienda" : "👤 Cliente";

    const estado =
      c.activo
        ? `<span class="ganancia-positiva">✔ Activo</span>`
        : `<span class="ganancia-negativa">✖ Inactivo</span>`;

    tablaClientes.innerHTML += `
      <tr>
        <td>${c.nombre}</td>
        <td>${tipo}</td>
        <td>${c.telefono || "—"}</td>
        <td>${c.direccion || "—"}</td>
        <td>${estado}</td>
        <td>
          <button onclick="editarCliente('${c.id}')">✏️</button>
          <button onclick="eliminarCliente('${c.id}')">🗑️</button>
        </td>
      </tr>
    `;
  });
}

btnNuevoCliente.onclick = () => {
  clienteEditandoId = null;
  tituloCliente.textContent = "Nuevo cliente";
  inputNombre.value = "";
  inputTipo.value = "cliente";
  inputTelefono.value = "";
  inputDireccion.value = "";
  inputEstado.value = "true";
  modalCliente.classList.add("activo");
};

btnGuardarCliente.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const tipo = inputTipo.value;
  const telefono = inputTelefono.value.trim();
  const direccion = inputDireccion.value.trim();
  const activo = inputEstado.value === "true";

  if (!nombre) {
    alert("Completa el nombre del cliente");
    return;
  }

  const payload = {
    nombre,
    tipo,
    telefono: telefono || null,
    direccion: direccion || null,
    activo
  };

  if (clienteEditandoId) {
    await updateDoc(doc(db, "clientes", clienteEditandoId), payload);
  } else {
    await addDoc(collection(db, "clientes"), {
      ...payload,
      creadoEn: Timestamp.now()
    });
  }

  modalCliente.classList.remove("activo");
  cargarClientes();
};

window.editarCliente = (id) => {
  const c = clientes.find(item => item.id === id);
  if (!c) return;

  clienteEditandoId = id;
  tituloCliente.textContent = "Editar cliente";
  inputNombre.value = c.nombre || "";
  inputTipo.value = c.tipo || "cliente";
  inputTelefono.value = c.telefono || "";
  inputDireccion.value = c.direccion || "";
  inputEstado.value = c.activo ? "true" : "false";

  modalCliente.classList.add("activo");
};

window.eliminarCliente = async (id) => {
  if (!confirm("¿Quitar cliente?")) return;

  await updateDoc(doc(db, "clientes", id), { activo: false });
  cargarClientes();
};

btnCancelarCliente.onclick = () => modalCliente.classList.remove("activo");
cargarClientes();
