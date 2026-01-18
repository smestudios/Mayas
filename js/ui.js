function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(sec => {
    sec.style.display = 'none';
  });
  document.getElementById(id).style.display = 'block';
}

mostrarSeccion('productos');
