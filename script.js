/**
 * PORTFOLIO — script.js
 * Interactive layer: loader, cursor, canvas, scroll effects,
 * typed text, counters, project filtering, modal, form validation
 */

'use strict';

/* ══════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════ */

/** Throttle fn to once per `limit` ms */
function throttle(fn, limit = 16) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn(...args); }
  };
}

/** Linear interpolation */
const lerp = (a, b, t) => a + (b - a) * t;

/* ══════════════════════════════════════════════
   LOADER
══════════════════════════════════════════════ */

(function initLoader() {
  const loader  = document.getElementById('loader');
  const fill    = loader.querySelector('.loader-fill');
  const pct     = loader.querySelector('.loader-pct');
  let progress  = 0;

  const tick = setInterval(() => {
    // Speed up toward end — slow down at 80 until page ready
    const step = progress < 80 ? 3 : 0.8;
    progress = Math.min(progress + step, 99);
    fill.style.width = progress + '%';
    pct.textContent  = Math.floor(progress) + '%';
  }, 40);

  const finish = () => {
    clearInterval(tick);
    fill.style.width = '100%';
    pct.textContent  = '100%';
    setTimeout(() => {
      loader.classList.add('loaded');
      // Trigger initial reveal animations
      document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right')
        .forEach(el => checkReveal(el));
    }, 350);
  };

  if (document.readyState === 'complete') {
    finish();
  } else {
    window.addEventListener('load', finish, { once: true });
    // Fallback: force finish after 3.5s regardless
    setTimeout(finish, 3500);
  }
})();

/* ══════════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════════ */

(function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  // Only on non-touch devices
  if (window.matchMedia('(pointer: coarse)').matches) return;

  let mx = -100, my = -100;
  let rx = -100, ry = -100;
  let raf;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  // Animate ring with lerp for smooth trailing
  const animate = () => {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    raf = requestAnimationFrame(animate);
  };
  animate();

  // Hover states
  const interactable = 'a, button, .project-card, .orb, .filter-btn, .social-btn, .tag';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactable)) ring.classList.add('hovered');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactable)) ring.classList.remove('hovered');
  });

  // Click effect
  document.addEventListener('mousedown', () => ring.classList.add('clicking'));
  document.addEventListener('mouseup',   () => ring.classList.remove('clicking'));
})();

/* ══════════════════════════════════════════════
   HERO PARTICLE CANVAS
══════════════════════════════════════════════ */

(function initCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [];
  const COUNT = window.innerWidth < 600 ? 40 : 80;

  class Particle {
    constructor() { this.reset(true); }

    reset(init = false) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : H + 10;
      this.r  = Math.random() * 1.5 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -(Math.random() * 0.4 + 0.1);
      this.life = 0;
      this.maxLife = Math.random() * 300 + 200;
      // Alternate between amber and teal
      this.color = Math.random() > 0.5
        ? `rgba(240,165,0,`
        : `rgba(0,212,184,`;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life++;
      if (this.life > this.maxLife || this.y < -10) this.reset();
    }

    draw() {
      const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * 0.7;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color + alpha + ')';
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, () => new Particle());
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(240,165,0,${0.06 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }

  init();
  loop();
  window.addEventListener('resize', throttle(resize, 200));
})();

/* ══════════════════════════════════════════════
   TYPED TEXT (HERO)
══════════════════════════════════════════════ */

(function initTyped() {
  const el = document.getElementById('typed-title');
  if (!el) return;

  const phrases = [
    'Full-Stack Developer',
    'UI / UX Engineer',
    'Open-Source Contributor',
    'Creative Technologist',
    'Performance Enthusiast'
  ];

  let phraseIdx = 0;
  let charIdx   = 0;
  let deleting  = false;
  let paused    = false;

  function type() {
    const phrase = phrases[phraseIdx];
    el.textContent = phrase.substring(0, charIdx);

    if (paused) return;

    if (!deleting) {
      if (charIdx < phrase.length) {
        charIdx++;
        setTimeout(type, 65);
      } else {
        // Hold for 2.2s then delete
        paused = true;
        setTimeout(() => { paused = false; deleting = true; type(); }, 2200);
      }
    } else {
      if (charIdx > 0) {
        charIdx--;
        setTimeout(type, 35);
      } else {
        deleting  = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        setTimeout(type, 400);
      }
    }
  }

  // Start after loader hides
  setTimeout(type, 1800);
})();

/* ══════════════════════════════════════════════
   COUNTER ANIMATION (HERO STATS)
══════════════════════════════════════════════ */

function animateCounter(el) {
  const target   = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const start    = performance.now();

  function update(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  }

  requestAnimationFrame(update);
}

/* ══════════════════════════════════════════════
   SCROLL PROGRESS BAR
══════════════════════════════════════════════ */

(function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  const update = throttle(() => {
    const scrollTop   = window.scrollY;
    const docHeight   = document.body.scrollHeight - window.innerHeight;
    const pct         = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width   = pct + '%';
  }, 16);

  window.addEventListener('scroll', update, { passive: true });
})();

/* ══════════════════════════════════════════════
   NAVBAR (scroll state)
══════════════════════════════════════════════ */

(function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const update = throttle(() => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, 50);

  window.addEventListener('scroll', update, { passive: true });
})();

/* ══════════════════════════════════════════════
   MOBILE MENU
══════════════════════════════════════════════ */

(function initMobileMenu() {
  const btn   = document.getElementById('hamburger');
  const menu  = document.getElementById('mobile-menu');
  const links = menu.querySelectorAll('.mob-link');
  if (!btn || !menu) return;

  function toggle(open) {
    btn.classList.toggle('open', open);
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  btn.addEventListener('click', () => toggle(!menu.classList.contains('open')));

  links.forEach(link => {
    link.addEventListener('click', () => toggle(false));
  });

  // Close on Esc
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) toggle(false);
  });
})();

/* ══════════════════════════════════════════════
   THEME TOGGLE
══════════════════════════════════════════════ */

(function initTheme() {
  const btn  = document.getElementById('theme-toggle');
  const root = document.documentElement;
  if (!btn) return;

  // Restore saved preference
  const saved = localStorage.getItem('portfolio-theme') || 'dark';
  root.setAttribute('data-theme', saved);

  btn.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('portfolio-theme', next);
  });
})();

/* ══════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════ */

let countersAnimated = false;
let skillsAnimated   = false;

function checkReveal(el) {
  const rect   = el.getBoundingClientRect();
  const inView = rect.top < window.innerHeight * 0.88 && rect.bottom > 0;
  if (inView) el.classList.add('visible');
  return inView;
}

function onScroll() {
  // Reveal elements
  document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right')
    .forEach(el => {
      if (!el.classList.contains('visible')) checkReveal(el);
    });

  // Counter animation (hero stats)
  if (!countersAnimated) {
    const counters = document.querySelectorAll('.stat-num');
    if (counters.length && counters[0].getBoundingClientRect().top < window.innerHeight) {
      countersAnimated = true;
      counters.forEach(c => animateCounter(c));
    }
  }

  // Skill bars
  if (!skillsAnimated) {
    const skillsSection = document.getElementById('skills');
    if (skillsSection) {
      const rect = skillsSection.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        skillsAnimated = true;
        document.querySelectorAll('.skill-bar').forEach(bar => {
          // Stagger bars
          const delay = Array.from(bar.closest('.skills-bars').querySelectorAll('.skill-bar'))
            .indexOf(bar) * 120;
          setTimeout(() => {
            bar.style.width = bar.dataset.width + '%';
          }, delay);
        });
      }
    }
  }
}

window.addEventListener('scroll', throttle(onScroll, 16), { passive: true });
// Run once on init (catches above-fold elements)
setTimeout(onScroll, 100);

/* ══════════════════════════════════════════════
   PROJECT FILTERING
══════════════════════════════════════════════ */

(function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards   = document.querySelectorAll('.project-card');
  if (!buttons.length || !cards.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Active state
      buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.dataset.filter;

      cards.forEach((card, i) => {
        const match = filter === 'all' || card.dataset.category === filter;

        if (match) {
          card.classList.remove('hidden');
          // Stagger re-appear
          card.style.opacity    = '0';
          card.style.transform  = 'translateY(20px)';
          setTimeout(() => {
            card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            card.style.opacity    = '1';
            card.style.transform  = 'translateY(0)';
          }, i * 60);
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
})();

/* ══════════════════════════════════════════════
   PROJECT MODAL
══════════════════════════════════════════════ */

const projectData = [
  {
    title: 'Accident Detection & Tracking',
    cat:   'Web App · 2026',
    desc:  'A real-time safety system designed to detect accidents and coordinate emergency response. It features a 10-second warning countdown to prevent false alarms and automated location tracking for precise emergency alerts.',
    detail: 'Built with a Flask backend to handle logic and Twilio API for reliable SMS emergency messaging. The system utilizes geolocation fetching to provide exact coordinates to first responders within seconds of an incident.',
    tech:  ['Python', 'Flask', 'Twilio API', 'JavaScript', 'HTML/CSS', 'Geolocation API'],
    bg:    'bg-1',
    live:  '#',
    code:  '#'
  },
  {
    title: 'Pulse',
    cat:   'Mobile App · 2024',
    desc:  'A health & fitness tracker with adaptive, ML-driven workout recommendations. Pulse integrates with Apple Health, Google Fit, and wearable biometrics to build a complete picture of your wellness.',
    detail: 'The ML model runs fully on-device using TensorFlow Lite, ensuring user data never leaves the phone. A custom animation engine delivers 120fps transitions on modern hardware.',
    tech:  ['React Native', 'TensorFlow Lite', 'Firebase', 'HealthKit', 'Reanimated 3'],
    bg:    'bg-2',
    live:  '#',
    code:  '#'
  },
  {
    title: 'Stratum UI',
    cat:   'Design System · 2023',
    desc:  'An open-source design system with 120+ fully accessible components. Stratum ships with full dark/light theming, motion primitives, and comprehensive Storybook documentation.',
    detail: 'Every component meets WCAG AA standards and is tested across 12 browsers. The token system supports multi-brand theming with a single configuration file. Downloaded 80K+ times.',
    tech:  ['TypeScript', 'Storybook 8', 'CSS Custom Props', 'Radix UI', 'Playwright'],
    bg:    'bg-3',
    live:  '#',
    code:  '#'
  },
  {
    title: 'Void Analytics',
    cat:   'Web App · 2023',
    desc:  'A privacy-first web analytics platform with zero cookies and full GDPR compliance by design. Provides beautiful real-time dashboards without compromising visitor privacy.',
    detail: 'Uses a custom event fingerprinting approach that anonymizes users without tracking them. The ClickHouse backend processes 50M+ events per day with sub-second query performance.',
    tech:  ['Go', 'ClickHouse', 'React', 'D3.js', 'Tailwind', 'Fly.io'],
    bg:    'bg-4',
    live:  '#',
    code:  '#'
  },
  {
    title: 'Echo',
    cat:   'Web App · 2022',
    desc:  'End-to-end encrypted messaging with disappearing messages, group spaces, and zero data retention. No phone number required — just a username and a passphrase.',
    detail: 'Uses the Signal Protocol for E2E encryption, with all message keys derived client-side. The server only ever sees encrypted blobs. WebRTC powers peer-to-peer video calls that bypass servers entirely.',
    tech:  ['Node.js', 'WebRTC', 'MongoDB', 'Signal Protocol', 'React', 'Docker'],
    bg:    'bg-5',
    live:  '#',
    code:  '#'
  },
  {
    title: 'Prism',
    cat:   'Generative Art · 2022',
    desc:  'An interactive generative art generator that uses GLSL shaders, Perlin noise, and custom particle physics to create unique, high-resolution exportable art pieces.',
    detail: 'Runs entirely in the browser via WebGL 2.0. Each piece is deterministic from a seed — shareable URLs reproduce exact artworks. Export at up to 8K resolution as PNG or SVG.',
    tech:  ['WebGL 2.0', 'GLSL', 'Canvas API', 'Simplex Noise', 'Vite', 'TypeScript'],
    bg:    'bg-6',
    live:  '#',
    code:  '#'
  }
];

(function initModal() {
  const modal    = document.getElementById('project-modal');
  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('modal-close');
  const content  = document.getElementById('modal-content');
  if (!modal) return;

  function openModal(idx) {
    const p = projectData[idx];
    if (!p) return;

    content.innerHTML = `
      <div class="modal-img-preview ${p.bg}"></div>
      <div class="modal-cat">${p.cat}</div>
      <h2>${p.title}</h2>
      <p>${p.desc}</p>
      <p>${p.detail}</p>
      <div class="modal-tech">
        ${p.tech.map(t => `<span>${t}</span>`).join('')}
      </div>
      <div class="modal-links">
        <a href="${p.live}" class="btn btn-primary">↗ Live Demo</a>
        <a href="${p.code}" class="btn btn-ghost">⌥ Source Code</a>
      </div>
    `;

    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    // Focus the close button for accessibility
    closeBtn.focus();
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // Attach to view buttons (delegation on grid)
  document.getElementById('projects-grid')?.addEventListener('click', e => {
    const btn = e.target.closest('.project-view-btn');
    if (btn) openModal(parseInt(btn.dataset.project, 10));
  });

  // Keyboard: Enter/Space on project cards opens modal
  document.getElementById('projects-grid')?.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('project-card')) {
      e.preventDefault();
      const idx = Array.from(document.querySelectorAll('.project-card'))
        .indexOf(e.target);
      openModal(idx);
    }
  });

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
  });
})();

/* ══════════════════════════════════════════════
   CONTACT FORM VALIDATION
══════════════════════════════════════════════ */

(function initForm() {
  const form     = document.getElementById('contact-form');
  const success  = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  function setError(fieldId, msg) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(fieldId + '-error');
    if (field) field.classList.toggle('error', !!msg);
    if (error) error.textContent = msg || '';
  }

  function validate() {
    let valid = true;

    const name    = form.name.value.trim();
    const email   = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    // Name
    if (!name) {
      setError('name', 'Name is required.');
      valid = false;
    } else if (name.length < 2) {
      setError('name', 'Name must be at least 2 characters.');
      valid = false;
    } else {
      setError('name', '');
    }

    // Email
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError('email', 'Email is required.');
      valid = false;
    } else if (!emailRx.test(email)) {
      setError('email', 'Please enter a valid email.');
      valid = false;
    } else {
      setError('email', '');
    }

    // Subject
    if (!subject) {
      setError('subject', 'Subject is required.');
      valid = false;
    } else {
      setError('subject', '');
    }

    // Message
    if (!message) {
      setError('message', 'Message is required.');
      valid = false;
    } else if (message.length < 20) {
      setError('message', 'Message must be at least 20 characters.');
      valid = false;
    } else {
      setError('message', '');
    }

    return valid;
  }

  // Real-time validation on blur
  ['name', 'email', 'subject', 'message'].forEach(id => {
    document.getElementById(id)?.addEventListener('blur', validate);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;

    // Simulate send
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').textContent = 'Sending...';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').textContent = 'Send Message';
      success.removeAttribute('hidden');
      form.reset();
      ['name', 'email', 'subject', 'message'].forEach(id => setError(id, ''));
      // Hide success after 5s
      setTimeout(() => success.setAttribute('hidden', ''), 5000);
    }, 1400);
  });
})();

/* ══════════════════════════════════════════════
   BACK TO TOP
══════════════════════════════════════════════ */

(function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', throttle(() => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, 100), { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ══════════════════════════════════════════════
   SMOOTH SCROLL FOR NAV LINKS
══════════════════════════════════════════════ */

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80; // navbar height
    const top    = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ══════════════════════════════════════════════
   PARALLAX — hero grid on mouse move
══════════════════════════════════════════════ */

(function initParallax() {
  const grid = document.querySelector('.hero-grid');
  if (!grid || window.matchMedia('(pointer: coarse)').matches) return;

  document.addEventListener('mousemove', throttle(e => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx * 12;
    const dy = (e.clientY - cy) / cy * 8;
    grid.style.transform = `translate(${dx}px, ${dy}px)`;
  }, 30));
})();

/* ══════════════════════════════════════════════
   STAGGER DELAY FOR REVEAL GROUPS
══════════════════════════════════════════════ */

(function applyStaggerDelays() {
  // Hero content children
  document.querySelectorAll('.hero-content .reveal-up').forEach((el, i) => {
    el.style.transitionDelay = (i * 120 + 800) + 'ms';
  });
  // Section headers get a short delay
  document.querySelectorAll('.section-header .reveal-up').forEach(el => {
    el.style.transitionDelay = '50ms';
  });
})();

/* ══════════════════════════════════════════════
   ACTIVE NAV HIGHLIGHT (Intersection Observer)
══════════════════════════════════════════════ */

(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          const active = link.getAttribute('href') === '#' + id;
          link.style.color = active
            ? 'var(--text-1)'
            : '';
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => obs.observe(s));
})();
