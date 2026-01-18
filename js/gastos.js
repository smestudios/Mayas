import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tablaGastos = document.getElementById("tablaGastos");

async function cargarGastos() {
  tablaGastos.innerHTML = "";

  try {
    const gastosSnapshot = await getDocs(collection(db, "gastos"));

    if (gastosSnapshot.empty) {
      tablaGastos.innerHTML = `
        <tr>
          <td colspan="4">No hay gastos registrados</td>
        </tr>
      `;
      return;
    }

    for (const gastoDoc of gastosSnapshot.docs) {
      const g = gastoDoc.data();

      // 📅 Fecha
      let fecha = "—";
      if (g.fecha?.seconds) {
        fecha = new Date(g.fecha.seconds * 1000).toLocaleDateString();
      }

      tablaGastos.innerHTML += `
        <tr>
          <td>${fecha}</td>
          <td>${g.descripcion}</td>
          <td>${g.categoria}</td>
          <td class="ganancia-negativa">
            $${g.monto.toLocaleString()}
          </td>
        </tr>
      `;
    }

  } catch (error) {
    console.error("Error cargando gastos:", error);
    tablaGastos.innerHTML = `
      <tr>
        <td colspan="4">Error cargando gastos</td>
      </tr>
    `;
  }
}

cargarGastos();
