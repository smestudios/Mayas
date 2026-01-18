import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tablaClientes = document.getElementById("tablaClientes");

async function cargarClientes() {
  tablaClientes.innerHTML = "";

  try {
    const clientesSnapshot = await getDocs(collection(db, "clientes"));

    if (clientesSnapshot.empty) {
      tablaClientes.innerHTML = `
        <tr>
          <td colspan="5">No hay clientes registrados</td>
        </tr>
      `;
      return;
    }

    for (const clienteDoc of clientesSnapshot.docs) {
      const c = clienteDoc.data();

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
        </tr>
      `;
    }

  } catch (error) {
    console.error("Error cargando clientes:", error);
    tablaClientes.innerHTML = `
      <tr>
        <td colspan="5">Error cargando clientes</td>
      </tr>
    `;
  }
}

cargarClientes();
