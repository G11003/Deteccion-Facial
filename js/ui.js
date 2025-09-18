// ui.js -> Manejo del DOM y fetch de configuración
let config = {};

async function loadConfig() {
  try {
    const response = await fetch("data/config.json");
    config = await response.json();
    console.log("Configuración cargada:", config);
  } catch (error) {
    console.error("Error cargando configuración:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadConfig);
