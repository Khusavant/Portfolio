/* ═══════════════════════════════
   CHATBOT.JS — AI Assistant Chat System
   Navigation, profiling, explanations, idle behavior
   ═══════════════════════════════ */

const Chatbot = (() => {
  let knowledge = null;
  let panel, messages, input, isOpen = false;

  // ── Context hint state ──
  let hintEl = null;
  let currentSection = null;
  let hintTimeout = null;
  let hintCooldown = false;

  // ── User profiling state ──
  const profile = { recruiter: 0, developer: 0, visitor: 0 };
  let messageCount = 0;

  // ── Idle detection state ──
  let idleTimer = null;
  let idlePromptCount = 0;
  const IDLE_TIMEOUT = 30000; // 30 seconds
  const MAX_IDLE_PROMPTS = 2;

  // ── Projects cache ──
  let projectsData = null;

  // ═══════════════════════════════
  // CORE CHATBOT
  // ═══════════════════════════════

  async function loadKnowledge() {
    try {
      const res = await fetch('data/knowledge.json');
      knowledge = await res.json();
    } catch (err) {
      console.error('Failed to load knowledge base:', err);
      knowledge = { fallback: "Sorry, I'm having trouble loading my data.", intents: [] };
    }
  }

  async function loadProjects() {
    try {
      const res = await fetch('data/projects.json');
      projectsData = await res.json();
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  function createMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = sender === 'bot' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = formatText(text);

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    return msg;
  }

  function formatText(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/• /g, '&bull; ');
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'chat-message bot';
    typing.id = 'typingIndicator';
    typing.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    messages.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  function addMessage(text, sender = 'bot') {
    const msg = createMessage(text, sender);
    messages.appendChild(msg);
    scrollToBottom();
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  // ═══════════════════════════════
  // INTENT MATCHING + NAVIGATION
  // ═══════════════════════════════

  function findResponse(userInput) {
    if (!knowledge || !knowledge.intents) return { text: knowledge?.fallback || "I'm not sure about that." };

    const inp = userInput.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const intent of knowledge.intents) {
      for (const pattern of intent.patterns) {
        const patternLower = pattern.toLowerCase();

        if (inp === patternLower) {
          return { text: intent.response, action: intent.action, target: intent.target };
        }

        const patternWords = patternLower.split(/\s+/);
        const inputWords = inp.split(/\s+/);
        let score = 0;

        for (const pw of patternWords) {
          for (const iw of inputWords) {
            if (iw.includes(pw) || pw.includes(iw)) {
              score += 1;
            }
          }
        }

        if (inp.includes(patternLower) || patternLower.includes(inp)) {
          score += 2;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = intent;
        }
      }
    }

    if (bestScore >= 1 && bestMatch) {
      return { text: bestMatch.response, action: bestMatch.action, target: bestMatch.target };
    }

    return { text: knowledge.fallback };
  }

  // ── Smooth scroll to a section ──
  function smoothScrollTo(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const offset = 80;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  // ═══════════════════════════════
  // USER PROFILING (SUBTLE)
  // ═══════════════════════════════

  const recruiterKeywords = ['hire', 'experience', 'resume', 'cv', 'job', 'career', 'internship', 'position', 'salary', 'team', 'company', 'work history', 'background'];
  const developerKeywords = ['code', 'stack', 'github', 'architecture', 'api', 'framework', 'repository', 'commit', 'deploy', 'docker', 'node', 'python', 'react', 'debug', 'algorithm', 'database'];

  function updateProfile(text) {
    const lower = text.toLowerCase();
    messageCount++;

    for (const kw of recruiterKeywords) {
      if (lower.includes(kw)) { profile.recruiter += 1; break; }
    }
    for (const kw of developerKeywords) {
      if (lower.includes(kw)) { profile.developer += 1; break; }
    }

    // Default visitor score increases slowly
    profile.visitor += 0.3;
  }

  function getProfileType() {
    if (messageCount < 2) return 'visitor';
    if (profile.recruiter > profile.developer && profile.recruiter > profile.visitor) return 'recruiter';
    if (profile.developer > profile.recruiter && profile.developer > profile.visitor) return 'developer';
    return 'visitor';
  }

  function getProfileSuggestions() {
    const type = getProfileType();
    switch (type) {
      case 'recruiter':
        return ['Experience', 'AI Summary', 'Contact', 'Skills'];
      case 'developer':
        return ['GitHub Projects', 'Tech Stack', 'Architecture', 'Show projects'];
      default:
        return ['Who are you?', 'Show projects', 'Skills', 'Contact'];
    }
  }

  // ═══════════════════════════════
  // EXPLAIN PROJECT
  // ═══════════════════════════════

  function explainProject(projectId) {
    if (!projectsData) return;

    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;

    // Open chat if not open
    if (!isOpen) open();

    // Add a system-style message with the explanation
    const msg = document.createElement('div');
    msg.className = 'chat-message bot';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '🤖';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    // Mode toggle
    const toggle = document.createElement('div');
    toggle.className = 'explain-toggle';

    const simpleBtn = document.createElement('button');
    simpleBtn.className = 'explain-toggle-btn active';
    simpleBtn.textContent = '💡 Simple';

    const techBtn = document.createElement('button');
    techBtn.className = 'explain-toggle-btn';
    techBtn.textContent = '⚙️ Technical';

    toggle.appendChild(simpleBtn);
    toggle.appendChild(techBtn);

    // Content container
    const content = document.createElement('div');
    content.innerHTML = `<strong>${project.title}</strong><br><br>${formatText(project.simpleExplanation)}`;

    simpleBtn.addEventListener('click', () => {
      simpleBtn.classList.add('active');
      techBtn.classList.remove('active');
      content.innerHTML = `<strong>${project.title}</strong><br><br>${formatText(project.simpleExplanation)}`;
    });

    techBtn.addEventListener('click', () => {
      techBtn.classList.add('active');
      simpleBtn.classList.remove('active');
      content.innerHTML = `<strong>${project.title}</strong><br><br>${formatText(project.technicalExplanation)}`;
    });

    bubble.appendChild(toggle);
    bubble.appendChild(content);
    msg.appendChild(avatar);
    msg.appendChild(bubble);

    messages.appendChild(msg);
    scrollToBottom();
  }

  // ═══════════════════════════════
  // HANDLE SEND
  // ═══════════════════════════════

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    // Reset idle timer
    resetIdleTimer();

    // Add user message
    addMessage(text, 'user');
    input.value = '';

    // Update user profile
    updateProfile(text);

    // Show typing
    showTyping();

    const delay = 400 + Math.random() * 800;
    await new Promise(r => setTimeout(r, delay));

    hideTyping();

    const result = findResponse(text);
    addMessage(result.text, 'bot');

    // Handle navigation action
    if (result.action === 'navigate' && result.target) {
      setTimeout(() => {
        smoothScrollTo(result.target);
      }, 600);
    }
  }

  // ═══════════════════════════════
  // OPEN / CLOSE / TOGGLE
  // ═══════════════════════════════

  function open() {
    panel.classList.add('open');
    isOpen = true;
    input.focus();

    dismissHint();
    resetIdleTimer();

    if (messages.children.length === 0 && knowledge) {
      addMessage(knowledge.greeting || "Hello! How can I help you?", 'bot');
    }
  }

  function close() {
    panel.classList.remove('open');
    panel.classList.remove('fullscreen');
    isOpen = false;
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function setFullscreen(fullscreen) {
    panel.classList.toggle('fullscreen', fullscreen);
  }

  // ═══════════════════════════════
  // CONTEXT HINT SYSTEM
  // ═══════════════════════════════

  function showHint(text) {
    if (!hintEl) return;

    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }

    hintEl.classList.remove('visible', 'fade-out');
    hintEl.textContent = text;
    void hintEl.offsetWidth;
    hintEl.classList.add('visible');

    hintTimeout = setTimeout(() => {
      dismissHint();
    }, 5000);
  }

  function dismissHint() {
    if (!hintEl) return;
    hintEl.classList.add('fade-out');
    hintEl.classList.remove('visible');
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }
  }

  function onSectionChange(sectionId) {
    if (isOpen) return;
    if (sectionId === currentSection) return;
    currentSection = sectionId;
    if (hintCooldown) return;

    const hints = knowledge?.contextHints;
    if (!hints || !hints[sectionId]) return;

    showHint(hints[sectionId]);

    hintCooldown = true;
    setTimeout(() => { hintCooldown = false; }, 8000);
  }

  // ═══════════════════════════════
  // SMART IDLE BEHAVIOR
  // ═══════════════════════════════

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);

    if (idlePromptCount >= MAX_IDLE_PROMPTS) return;

    idleTimer = setTimeout(() => {
      showIdlePrompt();
    }, IDLE_TIMEOUT);
  }

  function showIdlePrompt() {
    if (isOpen || idlePromptCount >= MAX_IDLE_PROMPTS) return;

    const prompts = knowledge?.idlePrompts;
    if (!prompts || prompts.length === 0) return;

    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    showHint(randomPrompt);
    idlePromptCount++;

    // Set another idle timer for next prompt
    resetIdleTimer();
  }

  function setupIdleListeners() {
    const events = ['scroll', 'mousemove', 'click', 'keydown', 'touchstart'];
    let throttled = false;

    events.forEach(event => {
      window.addEventListener(event, () => {
        if (throttled) return;
        throttled = true;
        setTimeout(() => { throttled = false; }, 2000);
        resetIdleTimer();
      }, { passive: true });
    });
  }

  // ═══════════════════════════════
  // SUGGESTION CHIPS
  // ═══════════════════════════════

  function addSuggestions() {
    const suggestions = getProfileSuggestions();
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 12px;';

    suggestions.forEach(text => {
      const chip = document.createElement('button');
      chip.textContent = text;
      chip.style.cssText = `
        padding: 6px 14px;
        border-radius: 999px;
        border: 1px solid rgba(0,240,255,0.2);
        background: rgba(0,240,255,0.05);
        color: var(--accent-cyan, #00f0ff);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
      `;
      chip.addEventListener('mouseenter', () => {
        chip.style.background = 'rgba(0,240,255,0.15)';
        chip.style.borderColor = 'rgba(0,240,255,0.4)';
        chip.style.transform = 'translateY(-1px)';
      });
      chip.addEventListener('mouseleave', () => {
        chip.style.background = 'rgba(0,240,255,0.05)';
        chip.style.borderColor = 'rgba(0,240,255,0.2)';
        chip.style.transform = '';
      });
      chip.addEventListener('click', () => {
        input.value = text;
        handleSend();
        container.remove();
      });
      container.appendChild(chip);
    });

    const inputArea = panel.querySelector('.chat-input-area');
    inputArea.parentNode.insertBefore(container, inputArea);
  }

  // ═══════════════════════════════
  // INITIALIZE
  // ═══════════════════════════════

  async function init() {
    panel = document.getElementById('chatbotPanel');
    messages = document.getElementById('chatMessages');
    input = document.getElementById('chatInput');
    hintEl = document.getElementById('contextHint');

    if (!panel || !messages || !input) return;

    await Promise.all([loadKnowledge(), loadProjects()]);

    // Click to dismiss hint → open chatbot
    if (hintEl) {
      hintEl.addEventListener('click', () => {
        dismissHint();
        toggle();
        if (isOpen && messages.children.length <= 1) {
          setTimeout(addSuggestions, 600);
        }
      });
    }

    // Chat toggle button
    document.getElementById('chatToggle').addEventListener('click', () => {
      toggle();
      if (isOpen && messages.children.length <= 1) {
        setTimeout(addSuggestions, 600);
      }
    });

    // Close button
    document.getElementById('chatClose').addEventListener('click', close);

    // Send button
    document.getElementById('chatSend').addEventListener('click', handleSend);

    // Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    // Start idle detection
    setupIdleListeners();
    resetIdleTimer();
  }

  // ── Public API ──
  return {
    init,
    open,
    close,
    toggle,
    setFullscreen,
    onSectionChange,
    explainProject,
    isOpen: () => isOpen
  };
})();
