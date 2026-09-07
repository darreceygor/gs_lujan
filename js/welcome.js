// ==========================================================================
// PANTALLA DE BIENVENIDA (CARRUSEL 10s + CARTEL "BIENVENIDOS")
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const welcomeIntro = document.getElementById("welcome-intro");
  if (!welcomeIntro) return;

  const welcomeSlider = document.getElementById("welcome-slider");
  const welcomeProgressBar = document.getElementById("welcome-progress-bar");
  const welcomeSkipBtn = document.getElementById("welcome-skip-btn");
  const welcomeEnterBtn = document.getElementById("welcome-enter-btn");
  const welcomeIndicators = document.getElementById("welcome-indicators");
  const welcomeCountdownSec = document.getElementById("welcome-countdown-sec");

  // Verificar si es la primera vez que ingresa a la sesión o si se recargó la página
  let isReload = false;
  try {
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries && navEntries.length > 0) {
      isReload = navEntries[0].type === "reload";
    }
  } catch (e) {}

  const hasSeenIntro = sessionStorage.getItem("welcome_intro_shown");
  const shouldShow = isReload || !hasSeenIntro;

  if (!shouldShow) {
    // Si ya la vio en esta navegación y no es recarga, ocultar sin demora
    welcomeIntro.classList.add("welcome-hidden");
    document.body.classList.remove("welcome-active");
  } else {
    // Bloquear scroll de la página mientras el intro esté activo
    document.body.classList.add("welcome-active");
  }

  const fallbackImages = [
    "img/carrousel/WhatsApp Image 2026-09-07 at 08.04.31.jpeg",
    "img/carrousel/WhatsApp Image 2026-09-07 at 08.04.47 (1).jpeg",
    "img/carrousel/WhatsApp Image 2026-09-07 at 08.04.47.jpeg",
    "img/carrousel/WhatsApp Image 2026-09-07 at 08.04.48.jpeg"
  ];

  let isDismissed = false;
  let currentSlideIdx = 0;
  let slides = [];
  let dots = [];
  let progressTimer = null;
  let slideTimer = null;
  let countdownInterval = null;

  const TOTAL_INTRO_MS = 10000; // 10 segundos
  const AUTO_ENTER_COUNTDOWN_SEC = 3; // 3 segundos tras aparecer Bienvenidos

  function dismissWelcome() {
    if (isDismissed) return;
    isDismissed = true;

    // Limpiar temporizadores
    clearInterval(progressTimer);
    clearInterval(slideTimer);
    clearInterval(countdownInterval);

    // Desvanecer la pantalla de bienvenida
    welcomeIntro.classList.add("welcome-fade-out");
    document.body.classList.remove("welcome-active");

    // Remover del flujo tras la transición
    setTimeout(() => {
      welcomeIntro.classList.add("welcome-hidden");
    }, 850);
  }

  // Eventos de usuario para ingresar u omitir
  if (welcomeSkipBtn) {
    welcomeSkipBtn.addEventListener("click", dismissWelcome);
  }
  if (welcomeEnterBtn) {
    welcomeEnterBtn.addEventListener("click", dismissWelcome);
  }

  const welcomeCard = document.getElementById("welcome-card");
  if (welcomeCard) {
    welcomeCard.addEventListener("click", dismissWelcome);
  }

  const replayIntroBtn = document.getElementById("replay-intro-btn");
  if (replayIntroBtn) {
    replayIntroBtn.addEventListener("click", () => {
      clearInterval(progressTimer);
      clearInterval(slideTimer);
      clearInterval(countdownInterval);

      isDismissed = false;
      welcomeIntro.classList.remove("welcome-hidden", "welcome-fade-out", "show-card");
      if (welcomeProgressBar) welcomeProgressBar.style.width = "0%";
      document.body.classList.add("welcome-active");

      if (slides.length === 0) {
        loadImages();
      } else {
        currentSlideIdx = 0;
        showSlide(0);
        startOrchestration(slides.length);
      }
    });
  }

  // Permitir ingresar pulsando Escape, Enter o Barra espaciadora
  window.addEventListener("keydown", (e) => {
    if (!isDismissed && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) {
      dismissWelcome();
    }
  });

  // Cargar imágenes del carrusel desde el servidor o fallback
  async function loadImages() {
    let imageList = [];
    try {
      const res = await fetch("/api/carrousel-images");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          imageList = data;
        }
      }
    } catch (err) {}

    if (imageList.length === 0) {
      try {
        const res2 = await fetch("/carrousel-images");
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2) && data2.length > 0) {
            imageList = data2;
          }
        }
      } catch (err2) {}
    }

    if (imageList.length === 0) {
      imageList = fallbackImages;
    }

    setupSlides(imageList);
  }

  function setupSlides(images) {
    if (!welcomeSlider) return;
    welcomeSlider.innerHTML = "";
    if (welcomeIndicators) welcomeIndicators.innerHTML = "";

    slides = [];
    dots = [];

    images.forEach((imgSrc) => {
      // Diapositiva
      const slide = document.createElement("div");
      slide.className = "welcome-slide";
      const safeUrl = encodeURI(decodeURI(imgSrc));
      slide.style.backgroundImage = `url("${safeUrl}")`;
      welcomeSlider.appendChild(slide);
      slides.push(slide);

      // Indicador
      if (welcomeIndicators) {
        const dot = document.createElement("div");
        dot.className = "welcome-dot";
        welcomeIndicators.appendChild(dot);
        dots.push(dot);
      }
    });

    if (slides.length > 0) {
      slides[0].classList.add("active");
      if (dots[0]) dots[0].classList.add("active");
    }

    startOrchestration(images.length);
  }

  function showSlide(index) {
    slides.forEach((s, i) => {
      s.classList.toggle("active", i === index);
    });
    dots.forEach((d, i) => {
      d.classList.toggle("active", i === index);
    });
  }

  function startOrchestration(totalImages) {
    const startTime = performance.now();

    // Rotación de diapositivas durante los 10 segundos
    const slideDuration = Math.max(1800, Math.min(3000, TOTAL_INTRO_MS / totalImages));
    slideTimer = setInterval(() => {
      if (isDismissed) return;
      currentSlideIdx = (currentSlideIdx + 1) % slides.length;
      showSlide(currentSlideIdx);
    }, slideDuration);

    // Barra de progreso y activación del cartel a los 10 segundos
    progressTimer = setInterval(() => {
      if (isDismissed) return;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(100, (elapsed / TOTAL_INTRO_MS) * 100);

      if (welcomeProgressBar) {
        welcomeProgressBar.style.width = `${progress}%`;
      }

      // Al alcanzar los 10 segundos
      if (elapsed >= TOTAL_INTRO_MS) {
        clearInterval(progressTimer);

        // Mostrar cartel central "Bienvenidos"
        welcomeIntro.classList.add("show-card");

        // Iniciar cuenta regresiva para entrar automáticamente
        let secondsLeft = AUTO_ENTER_COUNTDOWN_SEC;
        if (welcomeCountdownSec) {
          welcomeCountdownSec.textContent = secondsLeft;
        }

        countdownInterval = setInterval(() => {
          if (isDismissed) return;
          secondsLeft -= 1;
          if (welcomeCountdownSec) {
            welcomeCountdownSec.textContent = Math.max(0, secondsLeft);
          }
          if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            dismissWelcome();
          }
        }, 1000);
      }
    }, 50);
  }

  if (shouldShow) {
    sessionStorage.setItem("welcome_intro_shown", "true");
    loadImages();
  }
});
