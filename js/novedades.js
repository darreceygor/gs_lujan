document.addEventListener("DOMContentLoaded", () => {
  const novedadesContainer = document.getElementById("novedades-container");
  const currentYearSpan = document.getElementById("current-year");

  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  // Formateador de fecha legible (ej: 15 de marzo de 2026)
  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  // Carga de novedades desde la API o archivo estático
  async function loadNovedades() {
    if (!novedadesContainer) return;

    try {
      let novedades = [];

      // Intentar primero desde el endpoint de la API
      try {
        const apiRes = await fetch("/api/novedades");
        if (apiRes.ok) {
          novedades = await apiRes.json();
        }
      } catch (errApi) {}

      // Si no obtuvo datos de la API, intentar json estático
      if (!Array.isArray(novedades) || novedades.length === 0) {
        try {
          const fileRes = await fetch("/json/novedades.json");
          if (fileRes.ok) {
            novedades = await fileRes.json();
          }
        } catch (errFile) {}
      }

      const published = (novedades || []).filter(n => n.published !== false);
      published.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      if (published.length === 0) {
        novedadesContainer.innerHTML = `
          <div class="empty-novedades">
            <div class="empty-icon" style="font-size: 2.5rem; margin-bottom: 0.75rem;">📢</div>
            <h3 style="color: var(--scout-blue-dark); margin-bottom: 0.5rem;">No hay novedades publicadas por el momento</h3>
            <p style="color: var(--text-muted);">Pronto compartiremos nuevas circulares, eventos y convocatorias del grupo scout.</p>
          </div>
        `;
        return;
      }

      novedadesContainer.innerHTML = "";
      published.forEach(item => {
        const card = document.createElement("article");
        card.className = "novedad-item";

        const imageHtml = item.image 
          ? `<div class="novedad-image-wrap"><img src="${item.image}" alt="${item.title}" loading="lazy"></div>`
          : "";

        const formattedDate = formatDate(item.date);

        card.innerHTML = `
          ${imageHtml}
          <div class="novedad-body">
            <div class="novedad-meta">
              <span class="novedad-badge">${item.category || "General"}</span>
              <time class="novedad-date" datetime="${item.date || ""}">${formattedDate}</time>
            </div>
            <h3 class="novedad-title">${item.title}</h3>
            ${item.summary ? `<p class="novedad-summary">${item.summary}</p>` : ""}
            ${item.content ? `
              <div class="novedad-content-full hidden" id="content-${item.id}">
                ${item.content}
              </div>
              <button type="button" class="btn-read-more" data-target="content-${item.id}">
                Leer más &darr;
              </button>
            ` : ""}
          </div>
        `;

        const btnReadMore = card.querySelector(".btn-read-more");
        if (btnReadMore) {
          btnReadMore.addEventListener("click", () => {
            const target = card.querySelector(`#${btnReadMore.dataset.target}`);
            if (target.classList.contains("hidden")) {
              target.classList.remove("hidden");
              btnReadMore.innerHTML = "Leer menos &uarr;";
            } else {
              target.classList.add("hidden");
              btnReadMore.innerHTML = "Leer más &darr;";
            }
          });
        }

        novedadesContainer.appendChild(card);
      });

    } catch (e) {
      console.error("Error al cargar novedades:", e);
      if (novedadesContainer) {
        novedadesContainer.innerHTML = `
          <div class="empty-novedades">
            <p>Ocurrió un error al cargar las novedades. Por favor, intente nuevamente más tarde.</p>
          </div>
        `;
      }
    }
  }

  loadNovedades();
});
