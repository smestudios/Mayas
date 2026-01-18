import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tabla = document.getElementById("tablaProductos");

async function cargarProductos() {
  tabla.innerHTML = "";

  try {
    const q = query(
      collection(db, "productos"),
      where("activo", "==", true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      tabla.innerHTML = `
        <tr>
          <td colspan="4">No hay productos</td>
        </tr>
      `;
      return;
    }

    snapshot.forEach(doc => {
      const p = doc.data();
      const ganancia = p.precioVenta - p.costo;

      tabla.innerHTML += `
        <tr>
          <td>${p.nombre}</td>
          <td>$${p.costo.toLocaleString()}</td>
          <td>$${p.precioVenta.toLocaleString()}</td>
          <td style="color:${ganancia >= 0 ? 'green' : 'red'}">
            $${ganancia.toLocaleString()}
          </td>
        </tr>
      `;
    });

  } catch (error) {
    console.error(error);
    tabla.innerHTML = `
      <tr>
        <td colspan="4">Error cargando productos</td>
      </tr>
    `;
  }
}

cargarProductos();
