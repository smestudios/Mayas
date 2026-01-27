import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================
// DASHBOARD GENERAL
// ==========================
const elVentas = document.getElementById("totalVentas");
const elCostos = document.getElementById("totalCostos");
const elGastos = document.getElementById("totalGastos");
const elUtilidad = document.getElementById("utilidad");

let ventasCache = [];
let gastosCache = [];

function renderDashboardGeneral() {
  const totalVentas = ventasCache.reduce(
    (acc, venta) => acc + (venta.total || 0),
    0
  );
  const totalCostos = ventasCache.reduce(
    (acc, venta) => acc + (venta.costoTotal || 0),
    0
  );
  const totalGastos = gastosCache.reduce(
    (acc, gasto) => acc + (gasto.monto || 0),
    0
  );

  const utilidad = totalVentas - totalCostos - totalGastos;

  elVentas.textContent = `$${totalVentas.toLocaleString()}`;
  elCostos.textContent = `$${totalCostos.toLocaleString()}`;
  elGastos.textContent = `$${totalGastos.toLocaleString()}`;
  elUtilidad.textContent = `$${utilidad.toLocaleString()}`;
  elUtilidad.style.color = utilidad >= 0 ? "#16a34a" : "#dc2626";
}

function escucharDashboardGeneral() {
  onSnapshot(collection(db, "ventas"), snap => {
    ventasCache = snap.docs.map(doc => doc.data());
    renderDashboardGeneral();
  });

  onSnapshot(collection(db, "gastos"), snap => {
    gastosCache = snap.docs.map(doc => doc.data());
    renderDashboardGeneral();
  });
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
    ventas += v.total || 0;
    costos += v.costoTotal || 0;
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
escucharDashboardGeneral();
