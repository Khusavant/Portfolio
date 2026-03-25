/* ═══════════════════════════════
   INTERACTIONS.JS — Intelligent UI Layer
   Focus detection, cursor intelligence,
   engagement tracking, UI morphing
   ═══════════════════════════════ */

const Interactions = (() => {

  // ═══════════════════════════════
  // STATE
  // ═══════════════════════════════
  let engagement = {
    clicks: 0,
    scrolls: 0,
    moves: 0,
    level: 'low',        // low, medium, high
    lastActivity: Date.now(),
    sessionStart: Date.now(),
    isTabFocused: true,
    wasAway: false,
    awayDuration: 0,
    leftAt: 0
  };

  let morphState = {
    active: false,
    intensity: 0          // 0–1 scale
  };

  let cursorGlow = null;

  // ═══════════════════════════════
  // 1. FOCUS / TAB DETECTION
  // ═══════════════════════════════
  function setupFocusDetection() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // User left the tab
        engagement.isTabFocused = false;
        engagement.leftAt = Date.now();
        document.body.classList.add('tab-inactive');
        document.body.classList.remove('tab-focused');

        // Reduce animation intensity
        reduceMorphIntensity();
      } else {
        // User came back
        engagement.isTabFocused = true;
        engagement.wasAway = true;
        engagement.awayDuration = Date.now() - engagement.leftAt;
        document.body.classList.remove('tab-inactive');
        document.body.classList.add('tab-focused');

        // Restore animations
        restoreMorphIntensity();

        // Show welcome back behavior
        handleWelcomeBack();

        // Clear the flag after a moment
        setTimeout(() => {
          document.body.classList.remove('tab-focused');
        }, 2000);
      }
    });

    // Window focus/blur for additional detection
    window.addEventListener('focus', () => {
      if (!engagement.isTabFocused) {
        engagement.isTabFocused = true;
      }
    });

    window.addEventListener('blur', () => {
      engagement.isTabFocused = false;
    });
  }

  function handleWelcomeBack() {
    if (engagement.awayDuration < 5000) return; // Only if away > 5s

    // Subtle hero glow pulse
    const heroGlow = document.querySelector('.hero-glow');
    if (heroGlow) {
      heroGlow.classList.add('welcome-pulse');
      setTimeout(() => heroGlow.classList.remove('welcome-pulse'), 2500);
    }

    // If chatbot is available and user was away > 30s, show a gentle hint
    if (engagement.awayDuration > 30000 && typeof Chatbot !== 'undefined') {
      const hints = [
        '👋 Welcome back! Need any help exploring?',
        '✨ Good to see you again! Ask me anything.',
        '🔍 Ready to explore more? I can guide you.'
      ];
      const hint = hints[Math.floor(Math.random() * hints.length)];

      // Only show if chatbot hint system exists
      const hintEl = document.getElementById('contextHint');
      if (hintEl && !Chatbot.isOpen()) {
        hintEl.textContent = hint;
        hintEl.classList.remove('fade-out');
        hintEl.classList.add('visible');
        setTimeout(() => {
          hintEl.classList.add('fade-out');
          hintEl.classList.remove('visible');
        }, 4000);
      }
    }
  }

  // ═══════════════════════════════
  // 2. CURSOR INTELLIGENCE
  // ═══════════════════════════════
  function setupCursorIntelligence() {
    // Create a subtle cursor glow element
    cursorGlow = document.createElement('div');
    cursorGlow.className = 'cursor-glow';
    cursorGlow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursorGlow);

    let glowVisible = false;
    let rafId = null;
    let curX = 0, curY = 0;

    document.addEventListener('mousemove', (e) => {
      curX = e.clientX;
      curY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          cursorGlow.style.transform = `translate(${curX - 150}px, ${curY - 150}px)`;
          rafId = null;
        });
      }

      // Track engagement
      engagement.moves++;
    }, { passive: true });

    // Show/hide based on interactive elements
    const interactiveSelectors = '.btn, .project-card, .contact-link, .skill-node, .chat-toggle, .slider-arrow, .mode-btn, .nav-links a';

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest(interactiveSelectors);
      if (target) {
        cursorGlow.classList.add('cursor-glow-active');
        glowVisible = true;
      }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest(interactiveSelectors);
      if (target && glowVisible) {
        cursorGlow.classList.remove('cursor-glow-active');
        glowVisible = false;
      }
    }, { passive: true });

    // Hide on touch devices
    if ('ontouchstart' in window) {
      cursorGlow.style.display = 'none';
    }
  }

  // ═══════════════════════════════
  // 3. ENGAGEMENT TRACKING
  // ═══════════════════════════════
  function setupEngagementTracking() {
    // Click tracking
    document.addEventListener('click', () => {
      engagement.clicks++;
      engagement.lastActivity = Date.now();
      updateEngagementLevel();
    }, { passive: true });

    // Scroll tracking (throttled)
    let scrollThrottled = false;
    window.addEventListener('scroll', () => {
      if (scrollThrottled) return;
      scrollThrottled = true;
      setTimeout(() => { scrollThrottled = false; }, 500);

      engagement.scrolls++;
      engagement.lastActivity = Date.now();
      updateEngagementLevel();
    }, { passive: true });

    // Periodic engagement decay
    setInterval(() => {
      const inactiveSec = (Date.now() - engagement.lastActivity) / 1000;

      if (inactiveSec > 60) {
        engagement.level = 'low';
        applyEngagementState();
      } else if (inactiveSec > 20) {
        if (engagement.level === 'high') {
          engagement.level = 'medium';
          applyEngagementState();
        }
      }
    }, 10000);
  }

  function updateEngagementLevel() {
    const sessionSec = (Date.now() - engagement.sessionStart) / 1000;
    const score = engagement.clicks * 3 + engagement.scrolls * 1.5 + engagement.moves * 0.01;
    const rate = score / Math.max(sessionSec / 60, 0.5); // score per minute

    const prev = engagement.level;

    if (rate > 30) {
      engagement.level = 'high';
    } else if (rate > 10) {
      engagement.level = 'medium';
    } else {
      engagement.level = 'low';
    }

    if (prev !== engagement.level) {
      applyEngagementState();
    }
  }

  function applyEngagementState() {
    document.body.classList.remove('engagement-low', 'engagement-medium', 'engagement-high');
    document.body.classList.add(`engagement-${engagement.level}`);
  }

  // ═══════════════════════════════
  // 4. UI MORPHING
  // ═══════════════════════════════
  function setupUIMorphing() {
    // Subtle background morph based on scroll position
    let lastScrollY = 0;
    let morphThrottled = false;

    window.addEventListener('scroll', () => {
      if (morphThrottled) return;
      morphThrottled = true;

      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const progress = Math.min(scrollY / maxScroll, 1);

        // Shift hero glow based on scroll
        const heroGlow = document.querySelector('.hero-glow');
        if (heroGlow) {
          const scale = 1 - progress * 0.3;
          const opacity = Math.max(0, 0.8 - progress * 1.5);
          heroGlow.style.transform = `translate(-50%, -50%) scale(${scale})`;
          heroGlow.style.opacity = opacity;
        }

        lastScrollY = scrollY;
        morphThrottled = false;
      });
    }, { passive: true });
  }

  function reduceMorphIntensity() {
    document.body.style.setProperty('--morph-intensity', '0.3');
  }

  function restoreMorphIntensity() {
    document.body.style.setProperty('--morph-intensity', '1');
  }

  // ═══════════════════════════════
  // 5. ENHANCED SECTION AWARENESS
  // ═══════════════════════════════
  function setupSectionAwareness() {
    const sections = document.querySelectorAll('section[id]');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add active state to section
          entry.target.classList.add('section-in-view');

          // Stagger-animate children with .reveal class
          const reveals = entry.target.querySelectorAll('.reveal:not(.visible)');
          reveals.forEach((el, i) => {
            setTimeout(() => el.classList.add('visible'), i * 120);
          });
        } else {
          entry.target.classList.remove('section-in-view');
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    sections.forEach(s => observer.observe(s));
  }

  // ═══════════════════════════════
  // 6. SMOOTH ELEMENT ENTRANCE
  // ═══════════════════════════════
  function setupElementEntrance() {
    // Cards, stats, skill nodes — stagger on view
    const staggerGroups = [
      { selector: '.about-stats .stat-item', delay: 100 },
      { selector: '.skill-cluster', delay: 150 },
      { selector: '.contact-link', delay: 120 }
    ];

    staggerGroups.forEach(group => {
      const elements = document.querySelectorAll(group.selector);
      if (!elements.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Find index in parent
            const siblings = Array.from(entry.target.parentElement.children);
            const index = siblings.indexOf(entry.target);
            entry.target.style.transitionDelay = `${index * group.delay}ms`;
            entry.target.classList.add('element-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });

      elements.forEach(el => {
        el.classList.add('element-entrance');
        observer.observe(el);
      });
    });
  }

  // ═══════════════════════════════
  // 7. MAGNETIC BUTTON EFFECT
  // ═══════════════════════════════
  function setupMagneticButtons() {
    const buttons = document.querySelectorAll('.btn, .chat-toggle, .slider-arrow');

    buttons.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const strength = 0.15;

        btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      }, { passive: true });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => { btn.style.transition = ''; }, 400);
      }, { passive: true });
    });
  }

  // ═══════════════════════════════
  // INITIALIZE
  // ═══════════════════════════════
  function init() {
    setupFocusDetection();
    setupCursorIntelligence();
    setupEngagementTracking();
    setupUIMorphing();
    setupSectionAwareness();
    setupElementEntrance();
    setupMagneticButtons();

    // Set initial state
    document.body.classList.add('engagement-low');
    document.body.style.setProperty('--morph-intensity', '1');

    console.log('%c✨ Interaction System Active', 'color: #00d4ff; font-size: 11px;');
  }

  // ── Public API ──
  return {
    init,
    getEngagement: () => ({ ...engagement }),
    isTabFocused: () => engagement.isTabFocused
  };

})();
