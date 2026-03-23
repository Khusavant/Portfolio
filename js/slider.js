/* ═══════════════════════════════
   SLIDER.JS — Horizontal Project Carousel
   Loads projects.json, renders cards, handles navigation
   ═══════════════════════════════ */

const Slider = (() => {
  let projects = [];
  let track, dots, currentIndex = 0;

  // ── Render a single project card ──
  function createCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';

    // Build preview section
    let previewHTML;
    if (project.preview) {
      previewHTML = `
        <div class="project-preview">
          <div class="preview-browser-bar">
            <span class="preview-dot red"></span>
            <span class="preview-dot yellow"></span>
            <span class="preview-dot green"></span>
            <span class="preview-url">${project.title}</span>
          </div>
          <div class="preview-viewport">
            <iframe src="${project.preview}" loading="lazy" sandbox="allow-same-origin" title="Preview of ${project.title}"></iframe>
          </div>
        </div>`;
    } else {
      previewHTML = `
        <div class="project-preview no-preview">
          <div class="preview-browser-bar">
            <span class="preview-dot red"></span>
            <span class="preview-dot yellow"></span>
            <span class="preview-dot green"></span>
            <span class="preview-url">${project.title}</span>
          </div>
          <div class="preview-viewport preview-fallback">
            <span class="preview-icon">${project.icon || '🚀'}</span>
            <span class="preview-label">Server-side project</span>
          </div>
        </div>`;
    }

    card.innerHTML = `
      ${previewHTML}
      <h3 class="project-title">${project.title}</h3>
      <p class="project-description">${project.description}</p>
      <div class="project-tech">
        ${project.techStack.map(t => `<span class="tech-tag">${t}</span>`).join('')}
      </div>
      <div class="project-links">
        <a href="${project.github}" target="_blank" class="project-link" aria-label="GitHub repo for ${project.title}">
          💻 GitHub
        </a>
        ${project.demo && project.demo !== '#'
          ? `<a href="${project.demo}" target="_blank" class="project-link" aria-label="Live demo of ${project.title}">🔗 Live Demo</a>`
          : ''
        }
        <button class="explain-btn" data-project-id="${project.id}" aria-label="Explain ${project.title}">🧠 Explain</button>
      </div>
    `;

    // Wire up the explain button
    const explainBtn = card.querySelector('.explain-btn');
    explainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Chatbot.explainProject(project.id);
    });

    return card;
  }

  // ── Render dot indicators ──
  function renderDots() {
    const dotsContainer = document.getElementById('sliderDots');
    dotsContainer.innerHTML = '';
    projects.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Go to project ${i + 1}`);
      dot.addEventListener('click', () => scrollToCard(i));
      dotsContainer.appendChild(dot);
    });
    dots = dotsContainer.querySelectorAll('.slider-dot');
  }

  // ── Scroll to a specific card ──
  function scrollToCard(index) {
    const cards = track.querySelectorAll('.project-card');
    if (cards[index]) {
      cards[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      currentIndex = index;
      updateDots();
    }
  }

  // ── Update active dot ──
  function updateDots() {
    if (!dots) return;
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === currentIndex);
    });
  }

  // ── Detect which card is centered (on scroll) ──
  function onScroll() {
    const cards = track.querySelectorAll('.project-card');
    const trackRect = track.getBoundingClientRect();
    const center = trackRect.left + trackRect.width / 2;

    let closest = 0;
    let minDist = Infinity;
    cards.forEach((card, i) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const dist = Math.abs(center - cardCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });

    if (closest !== currentIndex) {
      currentIndex = closest;
      updateDots();
    }
  }

  // ── Arrow navigation ──
  function prevSlide() {
    scrollToCard(Math.max(0, currentIndex - 1));
  }

  function nextSlide() {
    scrollToCard(Math.min(projects.length - 1, currentIndex + 1));
  }

  // ── Touch/drag support ──
  function setupDrag() {
    let isDown = false, startX, scrollLeft;

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        isDown = true;
        startX = e.pageX - track.offsetLeft;
        scrollLeft = track.scrollLeft;
        track.style.cursor = 'grabbing';
      }
    });

    track.addEventListener('pointerup', () => {
      isDown = false;
      track.style.cursor = '';
    });

    track.addEventListener('pointerleave', () => {
      isDown = false;
      track.style.cursor = '';
    });

    track.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollLeft - walk;
    });
  }

  // ── Initialize ──
  async function init() {
    track = document.getElementById('sliderTrack');
    if (!track) return;

    try {
      const res = await fetch('data/projects.json');
      projects = await res.json();

      // Render cards
      projects.forEach(p => track.appendChild(createCard(p)));

      // Setup navigation
      renderDots();
      document.getElementById('sliderPrev').addEventListener('click', prevSlide);
      document.getElementById('sliderNext').addEventListener('click', nextSlide);

      // Scroll listener for dot sync
      let scrollTimeout;
      track.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(onScroll, 100);
      });

      // Drag support
      setupDrag();

      // Keyboard support
      track.setAttribute('tabindex', '0');
      track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
      });

    } catch (err) {
      console.error('Failed to load projects:', err);
      track.innerHTML = '<p style="color: var(--text-muted); padding: 2rem;">Could not load projects.</p>';
    }
  }

  // ── Public API ──
  return { init, getProjects: () => projects };
})();
