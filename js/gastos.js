import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tablaGastos = document.getElementById("tablaGastos");
const btnNuevoGasto = document.getElementById("btnNuevoGasto");

const modalGasto = document.getElementById("modalGasto");
const tituloGasto = document.getElementById("tituloGasto");
const btnGuardarGasto = document.getElementById("btnGuardarGasto");
const btnCancelarGasto = document.getElementById("btnCancelarGasto");

const inputFecha = document.getElementById("gastoFecha");
const inputDescripcion = document.getElementById("gastoDescripcion");
const inputCategoria = document.getElementById("gastoCategoria");
const inputMonto = document.getElementById("gastoMonto");

let gastos = [];
let gastoEditandoId = null;

async function cargarGastos() {
  tablaGastos.innerHTML = "";

  try {
    const gastosSnapshot = await getDocs(collection(db, "gastos"));

    if (gastosSnapshot.empty) {
      tablaGastos.innerHTML = `
        <tr>
          <td colspan="5">No hay gastos registrados</td>
        </tr>
      `;
      return;
    }

    gastos = gastosSnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderTabla(gastos);
  } catch (error) {
    console.error("Error cargando gastos:", error);
    tablaGastos.innerHTML = `
      <tr>
        <td colspan="5">Error cargando gastos</td>
      </tr>
    `;
  }
}

function renderTabla(lista) {
  tablaGastos.innerHTML = "";

  lista.forEach(g => {
    let fecha = "—";
    if (g.fecha?.seconds) {
      fecha = new Date(g.fecha.seconds * 1000).toLocaleDateString();
    } else if (typeof g.fecha?.toDate === "function") {
      fecha = g.fecha.toDate().toLocaleDateString();
    }

    tablaGastos.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${g.descripcion}</td>
        <td>${g.categoria}</td>
        <td class="ganancia-negativa">
          $${Number(g.monto || 0).toLocaleString()}
        </td>
        <td>
          <button onclick="editarGasto('${g.id}')">✏️</button>
          <button onclick="eliminarGasto('${g.id}')">🗑️</button>
        </td>
      </tr>
    `;
  });
}

btnNuevoGasto.onclick = () => {
  gastoEditandoId = null;
  tituloGasto.textContent = "Nuevo gasto";
  inputFecha.valueAsDate = new Date();
  inputDescripcion.value = "";
  inputCategoria.value = "";
  inputMonto.value = "";
  modalGasto.classList.add("activo");
};

btnGuardarGasto.onclick = async () => {
  const fecha = inputFecha.value;
  const descripcion = inputDescripcion.value.trim();
  const categoria = inputCategoria.value.trim();
  const monto = Number(inputMonto.value);

  if (!fecha || !descripcion || !categoria || monto <= 0) {
    alert("Completa todos los campos");
    return;
  }

  const fechaTimestamp = Timestamp.fromDate(new Date(`${fecha}T00:00:00`));

  if (gastoEditandoId) {
    await updateDoc(doc(db, "gastos", gastoEditandoId), {
      fecha: fechaTimestamp,
      descripcion,
      categoria,
      monto
    });
  } else {
    await addDoc(collection(db, "gastos"), {
      fecha: fechaTimestamp,
      descripcion,
      categoria,
      monto
    });
  }

  modalGasto.classList.remove("activo");
  cargarGastos();
};

window.editarGasto = (id) => {
  const g = gastos.find(item => item.id === id);
  if (!g) return;

  gastoEditandoId = id;
  tituloGasto.textContent = "Editar gasto";
  const fecha =
    g.fecha?.seconds
      ? new Date(g.fecha.seconds * 1000)
      : typeof g.fecha?.toDate === "function"
        ? g.fecha.toDate()
        : new Date();
  inputFecha.valueAsDate = fecha;
  inputDescripcion.value = g.descripcion || "";
  inputCategoria.value = g.categoria || "";
  inputMonto.value = g.monto ?? "";

  modalGasto.classList.add("activo");
};

window.eliminarGasto = async (id) => {
  if (!confirm("¿Eliminar gasto?")) return;
  await deleteDoc(doc(db, "gastos", id));
  cargarGastos();
};

btnCancelarGasto.onclick = () => modalGasto.classList.remove("activo");
cargarGastos();
