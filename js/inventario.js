import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tablaInventario = document.getElementById("tablaInventario");

async function cargarInventario() {
  tablaInventario.innerHTML = "";

  try {
    // 1️⃣ Traer todo el inventario
    const inventarioSnapshot = await getDocs(collection(db, "inventario"));

    if (inventarioSnapshot.empty) {
      tablaInventario.innerHTML = `
        <tr>
          <td colspan="4">No hay registros de inventario</td>
        </tr>
      `;
      return;
    }

    // 2️⃣ Recorrer inventario
    for (const invDoc of inventarioSnapshot.docs) {
      const inv = invDoc.data();

      // 3️⃣ Buscar el producto relacionado
      const productoRef = doc(db, "productos", inv.productoId);
      const productoSnap = await getDoc(productoRef);

      let nombreProducto = "Producto no encontrado";

      if (productoSnap.exists()) {
        nombreProducto = productoSnap.data().nombre;
      }

      // 4️⃣ Estado del stock
      let estado = "";
      if (inv.stock <= inv.stockMinimo) {
        estado = `<span class="ganancia-negativa">⚠ Bajo</span>`;
      } else {
        estado = `<span class="ganancia-positiva">✔ OK</span>`;
      }

      // 5️⃣ Pintar fila
      tablaInventario.innerHTML += `
        <tr>
          <td>${nombreProducto}</td>
          <td>${inv.stock}</td>
          <td>${inv.stockMinimo}</td>
          <td>${estado}</td>
        </tr>
      `;
    }

  } catch (error) {
    console.error("Error cargando inventario:", error);
    tablaInventario.innerHTML = `
      <tr>
        <td colspan="4">Error cargando inventario</td>
      </tr>
    `;
  }
}

// Ejecutar
cargarInventario();
