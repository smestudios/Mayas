import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tablaVentas = document.getElementById("tablaVentas");

async function cargarVentas() {
  tablaVentas.innerHTML = "";

  try {
    const ventasSnapshot = await getDocs(collection(db, "ventas"));

    if (ventasSnapshot.empty) {
      tablaVentas.innerHTML = `
        <tr>
          <td colspan="6">No hay ventas registradas</td>
        </tr>
      `;
      return;
    }

    for (const ventaDoc of ventasSnapshot.docs) {
      const v = ventaDoc.data();

      // 📅 Fecha
      let fecha = "—";
      if (v.fecha?.seconds) {
        fecha = new Date(v.fecha.seconds * 1000).toLocaleDateString();
      }

      // 👤 Cliente
      let cliente = "Cliente eliminado";
      if (v.clienteId) {
        const clienteRef = doc(db, "clientes", v.clienteId);
        const clienteSnap = await getDoc(clienteRef);
        if (clienteSnap.exists()) {
          cliente = clienteSnap.data().nombre;
        }
      }

      // 📦 Productos
      let productosHTML = "";
      v.productos.forEach(p => {
        productosHTML += `
          ${p.nombre} (x${p.cantidad})<br>
        `;
      });

      // 🎨 Tipo
      const tipo = v.tipo === "fisica" ? "🏪 Física" : "🌐 Web";

      // 💰 Ganancia
      const gananciaClass =
        v.ganancia >= 0 ? "ganancia-positiva" : "ganancia-negativa";

      tablaVentas.innerHTML += `
        <tr>
          <td>${fecha}</td>
          <td>${cliente}</td>
          <td>${tipo}</td>
          <td>${productosHTML}</td>
          <td>$${v.totalVenta.toLocaleString()}</td>
          <td class="${gananciaClass}">
            $${v.ganancia.toLocaleString()}
          </td>
        </tr>
      `;
    }

  } catch (error) {
    console.error("Error cargando ventas:", error);
    tablaVentas.innerHTML = `
      <tr>
        <td colspan="6">Error cargando ventas</td>
      </tr>
    `;
  }
}

cargarVentas();
