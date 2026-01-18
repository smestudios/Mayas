import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================
// DASHBOARD GENERAL
// ==========================
const elVentas = document.getElementById("totalVentas");
const elCostos = document.getElementById("totalCostos");
const elGastos = document.getElementById("totalGastos");
const elUtilidad = document.getElementById("utilidad");

async function cargarDashboardGeneral() {
  let totalVentas = 0;
  let totalCostos = 0;
  let totalGastos = 0;

  const ventasSnap = await getDocs(collection(db, "ventas"));
  ventasSnap.forEach(doc => {
    const v = doc.data();
    totalVentas += v.totalVenta || 0;
    totalCostos += v.totalCosto || 0;
  });

  const gastosSnap = await getDocs(collection(db, "gastos"));
  gastosSnap.forEach(doc => {
    totalGastos += doc.data().monto || 0;
  });

  const utilidad = totalVentas - totalCostos - totalGastos;

  elVentas.textContent = `$${totalVentas.toLocaleString()}`;
  elCostos.textContent = `$${totalCostos.toLocaleString()}`;
  elGastos.textContent = `$${totalGastos.toLocaleString()}`;
  elUtilidad.textContent = `$${utilidad.toLocaleString()}`;
  elUtilidad.style.color = utilidad >= 0 ? "#16a34a" : "#dc2626";
}

// ==========================
// DASHBOARD FILTRADO
// ==========================
const filtroVentas = document.getElementById("filtroVentas");
const filtroCostos = document.getElementById("filtroCostos");
const filtroGastos = document.getElementById("filtroGastos");
const filtroUtilidad = document.getElementById("filtroUtilidad");

const fechaInicioInput = document.getElementById("fechaInicio");
const fechaFinInput = document.getElementById("fechaFin");
const btnFiltrar = document.getElementById("btnFiltrar");

async function cargarDashboardFiltrado(fechaInicio, fechaFin) {
  let ventas = 0;
  let costos = 0;
  let gastos = 0;

  const ventasQuery = query(
    collection(db, "ventas"),
    where("fecha", ">=", fechaInicio),
    where("fecha", "<=", fechaFin)
  );

  const ventasSnap = await getDocs(ventasQuery);
  ventasSnap.forEach(doc => {
    const v = doc.data();
    ventas += v.totalVenta || 0;
    costos += v.totalCosto || 0;
  });

  const gastosQuery = query(
    collection(db, "gastos"),
    where("fecha", ">=", fechaInicio),
    where("fecha", "<=", fechaFin)
  );

  const gastosSnap = await getDocs(gastosQuery);
  gastosSnap.forEach(doc => {
    gastos += doc.data().monto || 0;
  });

  const utilidad = ventas - costos - gastos;

  filtroVentas.textContent = `$${ventas.toLocaleString()}`;
  filtroCostos.textContent = `$${costos.toLocaleString()}`;
  filtroGastos.textContent = `$${gastos.toLocaleString()}`;
  filtroUtilidad.textContent = `$${utilidad.toLocaleString()}`;
  filtroUtilidad.style.color = utilidad >= 0 ? "#16a34a" : "#dc2626";
}

// ==========================
// EVENTO FILTRAR
// ==========================
btnFiltrar.addEventListener("click", () => {
  if (!fechaInicioInput.value || !fechaFinInput.value) {
    alert("Selecciona ambas fechas");
    return;
  }

  const inicio = new Date(fechaInicioInput.value);
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date(fechaFinInput.value);
  fin.setHours(23, 59, 59, 999);

  cargarDashboardFiltrado(
    Timestamp.fromDate(inicio),
    Timestamp.fromDate(fin)
  );
});

// ==========================
// CARGA INICIAL
// ==========================
cargarDashboardGeneral();
