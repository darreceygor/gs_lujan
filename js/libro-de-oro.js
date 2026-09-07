document.addEventListener("DOMContentLoaded", () => {
  // Configuración y rutas
  const historiaPath = "/json/history.json";

  // Elementos DOM de la línea de tiempo
  const timelineScrollContainer = document.getElementById("timeline-scroll-container");
  const timeline = document.getElementById("timeline");
  const scrollLeftBtn = document.getElementById("scroll-left");
  const scrollRightBtn = document.getElementById("scroll-right");
  const decadeButtons = document.querySelectorAll(".decade-btn");
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search");
  const searchStatus = document.getElementById("search-status");

  // Elementos DOM de detalles del año
  const details = document.getElementById("details");
  const intro = document.getElementById("intro-content");
  const closeDetailsBtn = document.getElementById("close-details");
  const bottomCloseDetailsBtn = document.getElementById("bottom-close-details");
  const detailYear = document.getElementById("detail-year");
  const detailTitle = document.getElementById("detail-title");
  const detailEvent = document.getElementById("detail-event");
  const detailDescription = document.getElementById("detail-description");
  const detailImages = document.getElementById("detail-images");
  const gallerySection = document.getElementById("gallery-section");
  const photoCount = document.getElementById("photo-count");

  // Paginación entre años
  const prevYearBtn = document.getElementById("prev-year-btn");
  const nextYearBtn = document.getElementById("next-year-btn");
  const prevYearLabel = document.getElementById("prev-year-label");
  const nextYearLabel = document.getElementById("next-year-label");
  const bottomPrevYearBtn = document.getElementById("bottom-prev-year-btn");
  const bottomNextYearBtn = document.getElementById("bottom-next-year-btn");

  // Elementos DOM del Lightbox
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxOverlay = document.getElementById("lightbox-overlay");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const lightboxYear = document.getElementById("lightbox-year");

  // Footer
  const currentYearSpan = document.getElementById("current-year");
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  // Estado de la aplicación
  let allEvents = [];
  let filteredEvents = [];
  let currentEvent = null;
  let activeDecade = "all";
  let searchTerm = "";

  // Estado del Lightbox
  let currentGalleryImages = [];
  let currentImageIndex = 0;

  // Normalizador de texto para búsquedas (quita tildes y diacríticos)
  function normalizeText(text) {
    if (!text) return "";
    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  // Carga de datos de la historia
  async function loadTimelineData() {
    try {
      const response = await fetch(historiaPath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (contentType && !contentType.includes("json") && !contentType.includes("text/plain")) {
        throw new Error(`Formato inesperado devuelto por el servidor (${contentType})`);
      }
      allEvents = await response.json();
      
      // Ordenar cronológicamente por año
      allEvents.sort((a, b) => a.year - b.year);
      filteredEvents = [...allEvents];

      // Renderizar botones de la línea de tiempo
      renderTimelineButtons();

      // Verificar si hay un año solicitado en el Hash de la URL (ej: #1982)
      handleInitialUrlHash();
    } catch (error) {
      console.error("Error al cargar la historia del grupo:", error);
      if (searchStatus) {
        searchStatus.textContent = "No se pudieron cargar los datos históricos. Asegúrate de servir la página mediante un servidor web local o hosting.";
        searchStatus.classList.remove("hidden");
      }
    }
  }

  // Renderizar los botones de años en el contenedor de la línea de tiempo
  function renderTimelineButtons() {
    timeline.innerHTML = "";

    if (filteredEvents.length === 0) {
      timeline.innerHTML = '<span class="empty-timeline">No se encontraron eventos para el filtro seleccionado.</span>';
      return;
    }

    filteredEvents.forEach(event => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "timeline-year-btn";
      btn.dataset.year = event.year;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-label", `Año ${event.year}: ${event.title || event.event || "Ver detalles"}`);

      const yearText = document.createElement("span");
      yearText.textContent = event.year;
      btn.appendChild(yearText);

      // Si tiene fotos, mostrar indicador
      if (event.images && event.images.length > 0) {
        const photoBadge = document.createElement("span");
        photoBadge.className = "badge-has-photos";
        photoBadge.title = `${event.images.length} fotos disponibles`;
        photoBadge.textContent = `📷 ${event.images.length}`;
        btn.appendChild(photoBadge);
      }

      // Marcar si está activo
      if (currentEvent && currentEvent.year === event.year) {
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
      } else {
        btn.setAttribute("aria-selected", "false");
      }

      btn.addEventListener("click", () => {
        showDetails(event, true);
      });

      timeline.appendChild(btn);
    });

    updateActiveButtonHighlight();
  }

  // Resaltar y centrar el botón del año activo
  function updateActiveButtonHighlight() {
    const buttons = timeline.querySelectorAll(".timeline-year-btn");
    buttons.forEach(btn => {
      const btnYear = parseInt(btn.dataset.year, 10);
      if (currentEvent && currentEvent.year === btnYear) {
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        // Scroll horizontal suave para mantener el botón visible
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      } else {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      }
    });
  }

  // Filtrar eventos por década y término de búsqueda
  function applyFilters() {
    const query = normalizeText(searchTerm);

    filteredEvents = allEvents.filter(event => {
      // Filtro de década
      let matchDecade = true;
      if (activeDecade !== "all") {
        const decadeNum = parseInt(activeDecade, 10);
        matchDecade = event.year >= decadeNum && event.year < decadeNum + 10;
      }

      // Filtro de texto de búsqueda
      let matchSearch = true;
      if (query) {
        const yearStr = event.year.toString();
        const titleStr = normalizeText(event.title);
        const eventStr = normalizeText(event.event);
        const descStr = normalizeText(event.description);
        
        matchSearch = yearStr.includes(query) ||
                      titleStr.includes(query) ||
                      eventStr.includes(query) ||
                      descStr.includes(query);
      }

      return matchDecade && matchSearch;
    });

    // Actualizar mensaje de estado de búsqueda
    if (searchTerm || activeDecade !== "all") {
      searchStatus.classList.remove("hidden");
      let msg = `Mostrando ${filteredEvents.length} año${filteredEvents.length === 1 ? '' : 's'}`;
      if (activeDecade !== "all") msg += ` de la década de los ${activeDecade}s`;
      if (searchTerm) msg += ` para "${searchTerm}"`;
      searchStatus.textContent = msg;
    } else {
      searchStatus.classList.add("hidden");
    }

    renderTimelineButtons();
  }

  // Mostrar la ficha de detalles de un año
  function showDetails(event, updateHash = true) {
    currentEvent = event;

    // Año
    detailYear.textContent = event.year || "Año desconocido";

    // Título
    if (event.title && event.title.trim() !== "") {
      detailTitle.textContent = event.title;
      detailTitle.classList.remove("hidden");
    } else {
      detailTitle.textContent = `Acontecimientos de ${event.year}`;
      detailTitle.classList.remove("hidden");
    }

    // Evento / Fecha conmemorativa
    if (event.event && event.event.trim() !== "") {
      detailEvent.textContent = event.event;
      detailEvent.classList.remove("hidden");
    } else {
      detailEvent.classList.add("hidden");
    }

    // Descripción con formato enriquecido
    if (event.description && event.description.trim() !== "") {
      detailDescription.innerHTML = event.description;
    } else {
      detailDescription.innerHTML = "<p>No hay registro narrativo detallado para este año en el archivo histórico.</p>";
    }

    // Renderizar Galería de Imágenes
    detailImages.innerHTML = "";
    currentGalleryImages = event.images || [];

    if (currentGalleryImages.length > 0) {
      gallerySection.classList.remove("hidden");
      photoCount.textContent = `${currentGalleryImages.length} foto${currentGalleryImages.length === 1 ? '' : 's'}`;

      currentGalleryImages.forEach((imgUrl, idx) => {
        const item = document.createElement("div");
        item.className = "gallery-item";
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.setAttribute("aria-label", `Ampliar fotografía ${idx + 1} de ${event.year}`);

        const img = document.createElement("img");
        img.src = imgUrl;
        img.alt = `Fotografía del Grupo Scout Luján - Año ${event.year} (${idx + 1})`;
        img.loading = "lazy";

        const overlay = document.createElement("div");
        overlay.className = "gallery-item-overlay";
        overlay.innerHTML = `<span>🔍 Ampliar foto ${idx + 1}</span>`;

        item.appendChild(img);
        item.appendChild(overlay);

        item.addEventListener("click", () => openLightbox(idx));
        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openLightbox(idx);
          }
        });

        detailImages.appendChild(item);
      });
    } else {
      gallerySection.classList.add("hidden");
    }

    // Configuración de botones de navegación Anterior / Siguiente año
    updateYearPager(event.year);

    // Visibilidad de secciones
    if (intro) {
      intro.classList.add("hidden");
    }
    details.classList.remove("hidden");
    details.setAttribute("aria-hidden", "false");

    // Actualizar resaltado de botón activo en la línea de tiempo
    updateActiveButtonHighlight();

    // Actualizar hash en la URL
    if (updateHash) {
      history.replaceState(null, "", `#${event.year}`);
    }

    // Desplazamiento suave hacia la ficha de detalles
    details.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Actualizar los botones de navegación entre años
  function updateYearPager(currentYear) {
    const currentIndex = allEvents.findIndex(e => e.year === currentYear);

    // Año anterior
    if (currentIndex > 0) {
      const prevEvent = allEvents[currentIndex - 1];
      prevYearBtn.disabled = false;
      bottomPrevYearBtn.disabled = false;
      prevYearLabel.textContent = prevEvent.year;
      prevYearBtn.onclick = () => showDetails(prevEvent, true);
      bottomPrevYearBtn.onclick = () => showDetails(prevEvent, true);
    } else {
      prevYearBtn.disabled = true;
      bottomPrevYearBtn.disabled = true;
      prevYearLabel.textContent = "Inicio";
    }

    // Año siguiente
    if (currentIndex < allEvents.length - 1 && currentIndex !== -1) {
      const nextEvent = allEvents[currentIndex + 1];
      nextYearBtn.disabled = false;
      bottomNextYearBtn.disabled = false;
      nextYearLabel.textContent = nextEvent.year;
      nextYearBtn.onclick = () => showDetails(nextEvent, true);
      bottomNextYearBtn.onclick = () => showDetails(nextEvent, true);
    } else {
      nextYearBtn.disabled = true;
      bottomNextYearBtn.disabled = true;
      nextYearLabel.textContent = "Final";
    }
  }

  // Cerrar la ficha de detalles y regresar a la introducción inicial
  function closeDetails() {
    details.classList.add("hidden");
    details.setAttribute("aria-hidden", "true");
    if (intro) {
      intro.classList.remove("hidden");
      intro.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    currentEvent = null;
    updateActiveButtonHighlight();
    history.replaceState(null, "", "#libro-de-oro");
  }

  // Manejo del Lightbox (Visor de Fotos)
  function openLightbox(index) {
    if (!currentGalleryImages || currentGalleryImages.length === 0) return;

    currentImageIndex = index;
    updateLightboxImage();

    lightbox.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Bloquear scroll de la página de fondo
  }

  function updateLightboxImage() {
    const imgSrc = currentGalleryImages[currentImageIndex];
    lightboxImg.src = imgSrc;
    lightboxImg.alt = `Fotografía histórica del año ${currentEvent.year} (${currentImageIndex + 1} de ${currentGalleryImages.length})`;
    lightboxCounter.textContent = `Foto ${currentImageIndex + 1} de ${currentGalleryImages.length}`;
    lightboxYear.textContent = `Año ${currentEvent.year}`;

    // Mostrar/ocultar flechas si solo hay 1 foto
    if (currentGalleryImages.length <= 1) {
      lightboxPrev.style.display = "none";
      lightboxNext.style.display = "none";
    } else {
      lightboxPrev.style.display = "flex";
      lightboxNext.style.display = "flex";
    }
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    document.body.style.overflow = ""; // Restaurar scroll
    lightboxImg.src = "";
  }

  function prevLightboxImage() {
    if (currentGalleryImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
    updateLightboxImage();
  }

  function nextLightboxImage() {
    if (currentGalleryImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentGalleryImages.length;
    updateLightboxImage();
  }

  // Manejo del Hash en la URL para enlaces directos
  function handleInitialUrlHash() {
    const hash = window.location.hash.replace("#", "").trim();
    if (hash) {
      const targetYear = parseInt(hash, 10);
      if (!isNaN(targetYear)) {
        const found = allEvents.find(e => e.year === targetYear);
        if (found) {
          showDetails(found, false);
          return;
        }
      }
    }
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  // Botones de cierre de detalles
  closeDetailsBtn.addEventListener("click", closeDetails);
  bottomCloseDetailsBtn.addEventListener("click", closeDetails);

  // Desplazamiento horizontal de la línea de tiempo
  scrollLeftBtn.addEventListener("click", () => {
    timelineScrollContainer.scrollBy({ left: -300, behavior: "smooth" });
  });

  scrollRightBtn.addEventListener("click", () => {
    timelineScrollContainer.scrollBy({ left: 300, behavior: "smooth" });
  });

  // Filtros de décadas
  decadeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      decadeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeDecade = btn.dataset.decade;
      applyFilters();
    });
  });

  // Buscador en tiempo real
  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    if (searchTerm.trim() !== "") {
      clearSearchBtn.classList.remove("hidden");
    } else {
      clearSearchBtn.classList.add("hidden");
    }
    applyFilters();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchTerm = "";
    clearSearchBtn.classList.add("hidden");
    searchInput.focus();
    applyFilters();
  });

  // Controles del Lightbox
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxOverlay.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", prevLightboxImage);
  lightboxNext.addEventListener("click", nextLightboxImage);

  // Navegación por teclado accesible
  document.addEventListener("keydown", (e) => {
    // Si el lightbox está abierto
    if (!lightbox.classList.contains("hidden")) {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        prevLightboxImage();
      } else if (e.key === "ArrowRight") {
        nextLightboxImage();
      }
      return;
    }

    // Si la ficha de detalles está abierta y no estamos escribiendo en el buscador
    if (!details.classList.contains("hidden") && document.activeElement !== searchInput) {
      if (e.key === "Escape") {
        closeDetails();
      }
    }
  });

  // Escuchar cambios en el Hash (historial del navegador atrás/adelante)
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "").trim();
    if (!hash || hash === "inicio" || hash === "libro-de-oro" || hash === "introduccion") {
      if (!details.classList.contains("hidden")) {
        closeDetails();
      }
      return;
    }
    const year = parseInt(hash, 10);
    if (!isNaN(year)) {
      const found = allEvents.find(e => e.year === year);
      if (found && (!currentEvent || currentEvent.year !== year)) {
        showDetails(found, false);
      }
    }
  });

  // ==========================================================================

  // Inicializar carga de datos de la línea de tiempo
  loadTimelineData();
});
