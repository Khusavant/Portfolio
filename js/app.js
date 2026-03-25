/* ═══════════════════════════════
   APP.JS — Main Orchestrator
   Particles, mode switching, scroll effects, init
   ═══════════════════════════════ */

(async function App() {

  // ═══════════════════════════════
  // 1. HERO PARTICLES
  // ═══════════════════════════════
  function createParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;

    const count = 20;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (7 + Math.random() * 10) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';
      p.style.width = p.style.height = (1.5 + Math.random() * 2.5) + 'px';
      container.appendChild(p);
    }
  }

  // ═══════════════════════════════
  // 2. NAVBAR SCROLL EFFECT
  // ═══════════════════════════════
  function setupNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    // Scrolled class
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Mobile hamburger
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        hamburger.classList.toggle('active');
      });

      // Close on link click
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('open');
          hamburger.classList.remove('active');
        });
      });
    }
  }

  // ═══════════════════════════════
  // 3. SCROLL REVEAL ANIMATIONS
  // ═══════════════════════════════
  function setupReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
  }

  // ═══════════════════════════════
  // 4. DUAL MODE SWITCHING
  // ═══════════════════════════════
  function setupModeToggle() {
    const manualBtn = document.getElementById('manualBtn');
    const aiBtn = document.getElementById('aiBtn');
    const slider = document.getElementById('modeSlider');
    const overlay = document.getElementById('aiOverlay');
    const chatToggle = document.getElementById('chatToggle');

    let currentMode = 'manual';

    function switchMode(mode) {
      currentMode = mode;

      if (mode === 'ai') {
        // AI Mode
        manualBtn.classList.remove('active');
        aiBtn.classList.add('active');
        slider.classList.add('ai-mode');

        // Show overlay, open fullscreen chat
        overlay.classList.add('active');
        chatToggle.classList.add('hidden');
        Chatbot.open();
        Chatbot.setFullscreen(true);

      } else {
        // Manual Mode
        aiBtn.classList.remove('active');
        manualBtn.classList.add('active');
        slider.classList.remove('ai-mode');

        // Hide overlay, close fullscreen chat
        overlay.classList.remove('active');
        chatToggle.classList.remove('hidden');
        Chatbot.close();
        Chatbot.setFullscreen(false);
      }
    }

    manualBtn.addEventListener('click', () => switchMode('manual'));
    aiBtn.addEventListener('click', () => switchMode('ai'));

    // Click overlay to exit AI mode
    overlay.addEventListener('click', () => switchMode('manual'));
  }

  // ═══════════════════════════════
  // 5. SMOOTH SCROLL FOR NAV LINKS
  // ═══════════════════════════════
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = 80; // navbar height
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  // ═══════════════════════════════
  // 6. ACTIVE NAV LINK HIGHLIGHT
  // ═══════════════════════════════
  function setupActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.style.color = link.getAttribute('href') === `#${id}`
              ? 'var(--accent-cyan)'
              : '';
          });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(s => observer.observe(s));
  }

  // ═══════════════════════════════
  // 7. CONTEXT-AWARE SECTION DETECTION
  // ═══════════════════════════════
  function setupSectionDetection() {
    const sections = document.querySelectorAll('section[id]');
    let ready = false;

    setTimeout(() => { ready = true; }, 2000);

    const observer = new IntersectionObserver((entries) => {
      if (!ready) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('id');
          Chatbot.onSectionChange(sectionId);
        }
      });
    }, { threshold: 0.4 });

    sections.forEach(s => observer.observe(s));
  }

  // ═══════════════════════════════
  // 8. AI SUMMARY TYPEWRITER
  // ═══════════════════════════════
  function setupTypewriter() {
    const summaryEl = document.getElementById('summaryText');
    const cursorEl = document.querySelector('.summary-cursor');
    if (!summaryEl) return;

    let typed = false;

    // Fetch summary text from knowledge.json
    fetch('data/knowledge.json')
      .then(r => r.json())
      .then(data => {
        const fullText = data.aiSummary || '';
        if (!fullText) return;

        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !typed) {
              typed = true;
              typeText(summaryEl, cursorEl, fullText);
              observer.disconnect();
            }
          });
        }, { threshold: 0.3 });

        observer.observe(summaryEl.closest('.ai-summary-card'));
      });
  }

  function typeText(el, cursor, text) {
    let i = 0;
    const speed = 18; // ms per character

    function type() {
      if (i < text.length) {
        // Handle markdown bold **text**
        if (text[i] === '*' && text[i + 1] === '*') {
          const closeIdx = text.indexOf('**', i + 2);
          if (closeIdx !== -1) {
            const boldText = text.substring(i + 2, closeIdx);
            el.innerHTML += `<strong>${boldText}</strong>`;
            i = closeIdx + 2;
          } else {
            el.innerHTML += text[i];
            i++;
          }
        } else {
          el.innerHTML += text[i];
          i++;
        }
        setTimeout(type, speed);
      } else {
        // Done typing — hide cursor after a moment
        if (cursor) {
          setTimeout(() => { cursor.style.display = 'none'; }, 2000);
        }
      }
    }

    type();
  }

  // ═══════════════════════════════
  // 9. BOOT SEQUENCE
  // ═══════════════════════════════
  createParticles();
  setupNavbar();
  setupSmoothScroll();
  setupActiveNav();
  setupReveal();

  // Initialize modules
  await Slider.init();
  await Chatbot.init();

  // Mode toggle (after chatbot is ready)
  setupModeToggle();

  // Context-aware hints (after chatbot is ready)
  setupSectionDetection();

  // AI Summary typewriter
  setupTypewriter();

  // Interaction system
  Interactions.init();
  
  // Wire up Hero CTA "Talk to AI"
  const heroTalkBtn = document.getElementById('heroTalkBtn');
  if (heroTalkBtn) {
    heroTalkBtn.addEventListener('click', () => Chatbot.toggle());
  }

  console.log('%c🤖 KhushAI Portfolio Loaded', 'color: #00d4ff; font-size: 14px; font-weight: bold;');

})();
