document.addEventListener("DOMContentLoaded", () => {
  // Configuración y estado
  // Si se accede desde un puerto local estático (ej: Live Server en 5500), conectar al backend en 3000
  const isLocalStaticPort = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && 
                            window.location.port !== "" && window.location.port !== "3000";
  const API_BASE = isLocalStaticPort ? "http://localhost:3000" : "";
  let authToken = localStorage.getItem("gs_lujan_token");
  let currentUser = localStorage.getItem("gs_lujan_user");

  let historyData = [];
  let novedadesData = [];
  let currentHistoryImages = [];

  // Helper para procesar respuestas JSON de forma segura evitando SyntaxError con páginas de error HTML (404/500)
  async function parseJsonResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      if (contentType.includes("application/json")) {
        const errJson = await response.json();
        throw new Error(errJson.error || errJson.message || `Error del servidor (${response.status})`);
      } else {
        const text = await response.text();
        if (response.status === 404) {
          throw new Error("El servicio backend no está disponible en este servidor (Error 404). Si ejecuta localmente, verifique que 'node server.js' esté activo.");
        }
        if (response.status === 405) {
          throw new Error("El método HTTP no está permitido en este servidor estático (Error 405).");
        }
        const cleanSnippet = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
        throw new Error(`Error del servidor (${response.status}): ${cleanSnippet || "Respuesta no válida"}`);
      }
    }

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      const cleanSnippet = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
      throw new Error(`Respuesta no válida del servidor (no es JSON): ${cleanSnippet}`);
    }

    return await response.json();
  }

  // Elementos DOM principales
  const loginSection = document.getElementById("login-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const userSession = document.getElementById("user-session");
  const loggedUserName = document.getElementById("logged-user-name");
  const logoutBtn = document.getElementById("logout-btn");
  const toastContainer = document.getElementById("toast-container");

  // Formulario Login
  const loginForm = document.getElementById("login-form");
  const loginUsernameInput = document.getElementById("login-username");
  const loginPasswordInput = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const loginSubmitBtn = document.getElementById("login-submit-btn");

  // Pestañas
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // Pestaña Historia (Libro de Oro)
  const historyTableBody = document.getElementById("history-table-body");
  const historySearchInput = document.getElementById("history-search");
  const btnNewYear = document.getElementById("btn-new-year");

  // Modal Historia
  const modalHistory = document.getElementById("modal-history");
  const modalHistoryTitle = document.getElementById("modal-history-title");
  const formHistory = document.getElementById("form-history");
  const closeModalHistory = document.getElementById("close-modal-history");
  const cancelModalHistory = document.getElementById("cancel-modal-history");
  const editYearInput = document.getElementById("edit-year");
  const editTitleInput = document.getElementById("edit-title");
  const editEventInput = document.getElementById("edit-event");
  const editUrlInput = document.getElementById("edit-url");
  const editDescriptionInput = document.getElementById("edit-description");
  const historyDropzone = document.getElementById("history-dropzone");
  const historyFileInput = document.getElementById("history-file-input");
  const historyPhotosGrid = document.getElementById("history-photos-grid");
  const uploadStatusHistory = document.getElementById("upload-status-history");
  const editorToolBtns = document.querySelectorAll(".editor-tool-btn");

  // Pestaña Novedades
  const novedadesTableBody = document.getElementById("novedades-table-body");
  const novedadesSearchInput = document.getElementById("novedades-search");
  const btnNewNovedad = document.getElementById("btn-new-novedad");

  // Modal Novedades
  const modalNovedad = document.getElementById("modal-novedad");
  const modalNovedadTitle = document.getElementById("modal-novedad-title");
  const formNovedad = document.getElementById("form-novedad");
  const closeModalNovedad = document.getElementById("close-modal-novedad");
  const cancelModalNovedad = document.getElementById("cancel-modal-novedad");
  const novedadIdInput = document.getElementById("novedad-id");
  const novedadTitleInput = document.getElementById("novedad-title");
  const novedadDateInput = document.getElementById("novedad-date");
  const novedadCategoryInput = document.getElementById("novedad-category");
  const novedadImageInput = document.getElementById("novedad-image");
  const novedadSummaryInput = document.getElementById("novedad-summary");
  const novedadContentInput = document.getElementById("novedad-content");
  const novedadPublishedInput = document.getElementById("novedad-published");

  // ==========================================
  // NOTIFICACIONES TOAST
  // ==========================================
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================
  // AUTENTICACIÓN Y SESIÓN
  // ==========================================

  // Petición con token
  async function authFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (authToken) {
      options.headers["Authorization"] = `Bearer ${authToken}`;
    }
    const response = await fetch(url, options);
    if (response.status === 401) {
      handleLogout("Sesión expirada. Inicie sesión nuevamente.");
      throw new Error("No autorizado");
    }
    return response;
  }

  // Verificar sesión existente al cargar
  async function verifySession() {
    if (!authToken) {
      showLogin();
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/api/auth/verify`);
      const data = await parseJsonResponse(res);
      if (data.success) {
        showDashboard(data.user);
      } else {
        handleLogout();
      }
    } catch (e) {
      console.warn("No se pudo verificar la sesión con el backend:", e.message);
      handleLogout();
    }
  }

  function showLogin() {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    userSession.classList.add("hidden");
    loginUsernameInput.focus();
  }

  function showDashboard(username) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    userSession.classList.remove("hidden");
    loggedUserName.textContent = username || currentUser || "dirigente";

    loadHistoryData();
    loadNovedadesData();
  }

  function handleLogout(msg) {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("gs_lujan_token");
    localStorage.removeItem("gs_lujan_user");
    showLogin();
    if (msg) showToast(msg, "error");
  }

  // Submit Login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = "Verificando...";

    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value;

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await parseJsonResponse(res);

      if (!data.success) {
        throw new Error(data.error || "Error de inicio de sesión");
      }

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("gs_lujan_token", authToken);
      localStorage.setItem("gs_lujan_user", currentUser);

      loginPasswordInput.value = "";
      showDashboard(currentUser);
      showToast(`¡Bienvenido/a al panel, ${currentUser}!`);
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove("hidden");
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = "Ingresar al Panel";
    }
  });

  logoutBtn.addEventListener("click", () => {
    handleLogout("Sesión finalizada con éxito.");
  });

  // ==========================================
  // PESTAÑAS DEL DASHBOARD
  // ==========================================
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      tabContents.forEach(c => c.classList.add("hidden"));

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.remove("hidden");
    });
  });

  // ==========================================
  // GESTIÓN DEL LIBRO DE ORO
  // ==========================================

  async function loadHistoryData() {
    try {
      const res = await fetch(`${API_BASE}/api/history`);
      historyData = await parseJsonResponse(res);
      historyData.sort((a, b) => b.year - a.year);
      renderHistoryTable();
    } catch (err) {
      console.warn("Fallo carga desde /api/history, intentando fallback estático:", err.message);
      try {
        const staticRes = await fetch("json/history.json");
        if (staticRes.ok) {
          historyData = await staticRes.json();
          historyData.sort((a, b) => b.year - a.year);
          renderHistoryTable();
          showToast("Capítulos cargados en modo lectura (servidor backend no disponible)", "warning");
          return;
        }
      } catch (staticErr) {
        console.error("Error en fallback estático:", staticErr);
      }
      showToast("Error al cargar los capítulos del Libro de Oro: " + err.message, "error");
    }
  }

  function renderHistoryTable() {
    const query = (historySearchInput.value || "").toLowerCase().trim();
    historyTableBody.innerHTML = "";

    const filtered = historyData.filter(item => {
      if (!query) return true;
      const yearStr = item.year.toString();
      const titleStr = (item.title || "").toLowerCase();
      const eventStr = (item.event || "").toLowerCase();
      const descStr = (item.description || "").toLowerCase();
      return yearStr.includes(query) || titleStr.includes(query) || eventStr.includes(query) || descStr.includes(query);
    });

    if (filtered.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #64748b;">No se encontraron capítulos.</td></tr>`;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement("tr");

      const photoCount = item.images ? item.images.length : 0;

      tr.innerHTML = `
        <td><span class="year-tag">${item.year}</span></td>
        <td><strong>${item.title || "—"}</strong></td>
        <td>${item.event || "—"}</td>
        <td>${photoCount > 0 ? `📷 ${photoCount}` : "0"}</td>
        <td class="table-actions">
          <button type="button" class="action-btn edit" data-year="${item.year}">Editar</button>
          <button type="button" class="action-btn delete" data-year="${item.year}">Eliminar</button>
        </td>
      `;

      tr.querySelector(".action-btn.edit").addEventListener("click", () => openHistoryModal(item));
      tr.querySelector(".action-btn.delete").addEventListener("click", () => deleteHistoryYear(item.year));

      historyTableBody.appendChild(tr);
    });
  }

  historySearchInput.addEventListener("input", renderHistoryTable);

  // Abrir modal de historia (crear o editar)
  function openHistoryModal(item = null) {
    formHistory.reset();
    uploadStatusHistory.classList.add("hidden");

    if (item) {
      modalHistoryTitle.textContent = `Editar Capítulo: Año ${item.year}`;
      editYearInput.value = item.year;
      editTitleInput.value = item.title || "";
      editEventInput.value = item.event || "";
      editUrlInput.value = item.url || "";
      editDescriptionInput.value = item.description || "";
      currentHistoryImages = Array.isArray(item.images) ? [...item.images] : [];
    } else {
      modalHistoryTitle.textContent = "Agregar Nuevo Año al Libro de Oro";
      // Sugerir próximo año a partir del mayor año existente
      const maxYear = historyData.length > 0 ? Math.max(...historyData.map(h => Number(h.year) || 0)) : 1981;
      editYearInput.value = maxYear + 1;
      currentHistoryImages = [];
    }

    renderHistoryPhotosGrid();
    modalHistory.classList.remove("hidden");
  }

  function closeHistoryModal() {
    modalHistory.classList.add("hidden");
  }

  closeModalHistory.addEventListener("click", closeHistoryModal);
  cancelModalHistory.addEventListener("click", closeHistoryModal);
  btnNewYear.addEventListener("click", () => openHistoryModal());

  // Renderizar miniaturas de fotos en el modal
  function renderHistoryPhotosGrid() {
    historyPhotosGrid.innerHTML = "";
    if (currentHistoryImages.length === 0) {
      historyPhotosGrid.innerHTML = `<span style="font-size:0.8rem; color:#94a3b8;">No hay imágenes cargadas para este año aún.</span>`;
      return;
    }

    currentHistoryImages.forEach((imgUrl, idx) => {
      const box = document.createElement("div");
      box.className = "photo-thumb-box";

      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = `Foto ${idx + 1}`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-remove-photo";
      removeBtn.innerHTML = "&times;";
      removeBtn.title = "Quitar foto";
      removeBtn.addEventListener("click", () => {
        currentHistoryImages.splice(idx, 1);
        renderHistoryPhotosGrid();
      });

      box.appendChild(img);
      box.appendChild(removeBtn);
      historyPhotosGrid.appendChild(box);
    });
  }

  // Herramientas rápidas del editor de texto
  editorToolBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag;
      const start = editDescriptionInput.selectionStart;
      const end = editDescriptionInput.selectionEnd;
      const selectedText = editDescriptionInput.value.substring(start, end);
      const replacement = `<${tag}>${selectedText || "texto"}</${tag}>`;

      editDescriptionInput.setRangeText(replacement, start, end, "select");
      editDescriptionInput.focus();
    });
  });

  // Subida de archivos de imágenes
  historyDropzone.addEventListener("click", () => historyFileInput.click());

  historyDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    historyDropzone.classList.add("dragover");
  });

  historyDropzone.addEventListener("dragleave", () => {
    historyDropzone.classList.remove("dragover");
  });

  historyDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    historyDropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadHistoryFiles(e.dataTransfer.files);
    }
  });

  historyFileInput.addEventListener("change", () => {
    if (historyFileInput.files && historyFileInput.files.length > 0) {
      uploadHistoryFiles(historyFileInput.files);
    }
  });

  async function uploadHistoryFiles(files) {
    uploadStatusHistory.classList.remove("hidden");
    uploadStatusHistory.textContent = `Subiendo ${files.length} imagen(es)...`;

    const formData = new FormData();
    formData.append("year", editYearInput.value || "nuevo");
    for (let i = 0; i < files.length; i++) {
      formData.append("photos", files[i]);
    }

    try {
      const res = await authFetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData
      });

      const data = await parseJsonResponse(res);

      // Agregar las nuevas rutas a la lista
      currentHistoryImages.push(...data.files);
      renderHistoryPhotosGrid();

      uploadStatusHistory.textContent = `✓ ${data.message}`;
      showToast(data.message, "success");
    } catch (err) {
      uploadStatusHistory.textContent = `Error: ${err.message}`;
      showToast(err.message, "error");
    } finally {
      historyFileInput.value = "";
    }
  }

  // Guardar formulario de historia
  formHistory.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("save-history-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";

    const payload = {
      year: parseInt(editYearInput.value, 10),
      title: editTitleInput.value,
      event: editEventInput.value,
      url: editUrlInput.value,
      description: editDescriptionInput.value,
      images: currentHistoryImages
    };

    try {
      const res = await authFetch(`${API_BASE}/api/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await parseJsonResponse(res);

      showToast(data.message, "success");
      closeHistoryModal();
      loadHistoryData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar Capítulo";
    }
  });

  // Eliminar año
  async function deleteHistoryYear(year) {
    if (!confirm(`¿Está seguro de que desea eliminar el año ${year} del Libro de Oro? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/api/history/${year}`, {
        method: "DELETE"
      });

      const data = await parseJsonResponse(res);

      showToast(data.message, "success");
      loadHistoryData();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // ==========================================
  // GESTIÓN DE NOVEDADES
  // ==========================================

  async function loadNovedadesData() {
    try {
      const res = await fetch(`${API_BASE}/api/novedades`);
      novedadesData = await parseJsonResponse(res);
      novedadesData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      renderNovedadesTable();
    } catch (err) {
      console.warn("Fallo carga desde /api/novedades, intentando fallback estático:", err.message);
      try {
        const staticRes = await fetch("json/novedades.json");
        if (staticRes.ok) {
          novedadesData = await staticRes.json();
          novedadesData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          renderNovedadesTable();
          showToast("Novedades cargadas en modo lectura (servidor backend no disponible)", "warning");
          return;
        }
      } catch (staticErr) {
        console.error("Error en fallback estático de novedades:", staticErr);
      }
      showToast("Error al cargar las novedades: " + err.message, "error");
    }
  }

  function renderNovedadesTable() {
    const query = (novedadesSearchInput.value || "").toLowerCase().trim();
    novedadesTableBody.innerHTML = "";

    const filtered = novedadesData.filter(item => {
      if (!query) return true;
      const titleStr = (item.title || "").toLowerCase();
      const catStr = (item.category || "").toLowerCase();
      const sumStr = (item.summary || "").toLowerCase();
      return titleStr.includes(query) || catStr.includes(query) || sumStr.includes(query);
    });

    if (filtered.length === 0) {
      novedadesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #64748b;">No se encontraron novedades registradas.</td></tr>`;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><small>${item.date || "—"}</small></td>
        <td><strong>${item.title}</strong></td>
        <td><span class="badge-category">${item.category || "General"}</span></td>
        <td>
          <span class="badge-status ${item.published ? 'badge-published' : 'badge-draft'}">
            ${item.published ? 'Publicado' : 'Borrador'}
          </span>
        </td>
        <td class="table-actions">
          <button type="button" class="action-btn edit">Editar</button>
          <button type="button" class="action-btn delete">Eliminar</button>
        </td>
      `;

      tr.querySelector(".action-btn.edit").addEventListener("click", () => openNovedadModal(item));
      tr.querySelector(".action-btn.delete").addEventListener("click", () => deleteNovedad(item.id));

      novedadesTableBody.appendChild(tr);
    });
  }

  novedadesSearchInput.addEventListener("input", renderNovedadesTable);

  function openNovedadModal(item = null) {
    formNovedad.reset();

    if (item) {
      modalNovedadTitle.textContent = "Editar Novedad";
      novedadIdInput.value = item.id || "";
      novedadTitleInput.value = item.title || "";
      novedadDateInput.value = item.date || "";
      novedadCategoryInput.value = item.category || "Institucional";
      novedadImageInput.value = item.image || "";
      novedadSummaryInput.value = item.summary || "";
      novedadContentInput.value = item.content || "";
      novedadPublishedInput.checked = item.published !== false;
    } else {
      modalNovedadTitle.textContent = "Publicar Nueva Novedad";
      novedadIdInput.value = "";
      novedadDateInput.value = new Date().toISOString().split("T")[0];
      novedadPublishedInput.checked = true;
    }

    modalNovedad.classList.remove("hidden");
  }

  function closeNovedadModal() {
    modalNovedad.classList.add("hidden");
  }

  closeModalNovedad.addEventListener("click", closeNovedadModal);
  cancelModalNovedad.addEventListener("click", closeNovedadModal);
  btnNewNovedad.addEventListener("click", () => openNovedadModal());

  // Guardar novedad
  formNovedad.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("save-novedad-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";

    const payload = {
      id: novedadIdInput.value || undefined,
      title: novedadTitleInput.value,
      date: novedadDateInput.value,
      category: novedadCategoryInput.value,
      image: novedadImageInput.value,
      summary: novedadSummaryInput.value,
      content: novedadContentInput.value,
      published: novedadPublishedInput.checked
    };

    try {
      const res = await authFetch(`${API_BASE}/api/novedades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await parseJsonResponse(res);

      showToast(data.message, "success");
      closeNovedadModal();
      loadNovedadesData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar Novedad";
    }
  });

  // Eliminar novedad
  async function deleteNovedad(id) {
    if (!confirm("¿Está seguro de que desea eliminar esta novedad?")) {
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/api/novedades/${id}`, {
        method: "DELETE"
      });

      const data = await parseJsonResponse(res);

      showToast(data.message, "success");
      loadNovedadesData();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // Inicializar verificación de sesión
  verifySession();
});
