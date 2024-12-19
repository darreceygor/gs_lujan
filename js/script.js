document.addEventListener("DOMContentLoaded", () => {
  const timeline = document.getElementById("timeline");
  const details = document.getElementById("details");
  const closeDetails = document.getElementById("close-details");
  const detailYear = document.getElementById("detail-year");
  const detailTitle = document.getElementById("detail-title");
  const detailEvent = document.getElementById("detail-event");
  const detailDescription = document.getElementById("detail-description");
  const detailImages = document.getElementById("detail-images");
  const historia="../json/history.json";

  // const detailUrl = document.getElementById("detail-url");
  const intro = document.querySelector(".intro-content"); // Usa querySelector para obtener el primer elemento.

  async function loadTimelineData() {
    try {
      const response = await fetch(historia);
      const events = await response.json();
      events.forEach(event => createTimelineButton(event));
    } catch (error) {
      console.error("Error cargando los datos:", error);
    }
  }

  function createTimelineButton(event) {
    const yearButton = document.createElement("button");
    yearButton.textContent = event.year;
    yearButton.setAttribute("aria-label", `Ver detalles del año ${event.year}`);
    yearButton.addEventListener("click", () => showDetails(event));
    timeline.appendChild(yearButton);
  }

  function showDetails(event) {
  //year
    detailYear.textContent = event.year || "Año desconocido";

  //title
    if (event.title) {
          detailTitle.textContent = event.title;
          detailTitle.classList.remove('hidden'); // Asegúrate de que no esté oculto
      } else {
          detailTitle.textContent = ""; // Opcional, para limpiar el texto
          detailTitle.classList.add('hidden'); // Añade la clase para ocultar
      }
      
  //event
    if (event.event) {
        detailEvent.textContent = event.event;
        detailEvent.classList.remove('hidden'); // Asegúrate de que no esté oculto
    } else {
      detailEvent.textContent = ""; // Opcional, para limpiar el texto
      detailEvent.classList.add('hidden'); // Añade la clase para ocultar
    }

    //description
    detailDescription.innerHTML = event.description || "<p>Descripción no disponible</p>";

    // Limpiar imágenes previas
    detailImages.innerHTML = "";
    if (event.images) {
      event.images.forEach(imageUrl => {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = `Imagen del evento ${event.year}`;
        img.loading = "lazy";
        detailImages.appendChild(img);
      });
    }

    // Configurar URL
    // detailUrl.href = event.url || "#";
    // detailUrl.textContent = "Más información";

    // Mostrar el modal y ocultar intro
    if (intro) {
      intro.classList.add("hidden"); // Oculta la sección de introducción.
    }
    details.classList.remove("hidden");
    details.setAttribute("aria-hidden", "false");
    // window.scrollTo({
    //   top: details.offsetTop,
    //   behavior: "smooth"
    //});
  }

  closeDetails.addEventListener("click", () => {
    details.classList.add("hidden");
    details.setAttribute("aria-hidden", "true");
    if (intro) {
      intro.classList.remove("hidden"); // Restaura la visibilidad de la sección de introducción.
    }
  });

  loadTimelineData();
});
