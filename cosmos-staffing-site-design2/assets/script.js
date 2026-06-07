(() => {
  const doc = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storedTheme = sessionStorage.getItem('cosmos-theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  doc.dataset.theme = storedTheme || (systemDark ? 'dark' : 'light');

  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];

  const header = qs('.site-header');
  const onScroll = () => {
    const y = window.scrollY || 0;
    header?.classList.toggle('is-scrolled', y > 16);
    if (!prefersReduced) {
      qsa('[data-parallax]').forEach(el => {
        const speed = parseFloat(el.dataset.parallax || '0.08');
        el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      });
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  qsa('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = doc.dataset.theme === 'dark' ? 'light' : 'dark';
      doc.dataset.theme = next;
      sessionStorage.setItem('cosmos-theme', next);
      btn.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} theme`);
    });
  });

  const mobileBtn = qs('.mobile-toggle');
  const mobileMenu = qs('.mobile-menu');
  mobileBtn?.addEventListener('click', () => {
    const open = !mobileMenu.classList.contains('is-open');
    mobileMenu.classList.toggle('is-open', open);
    mobileBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  qsa('.mobile-menu a').forEach(a => a.addEventListener('click', () => {
    mobileMenu?.classList.remove('is-open');
    mobileBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }));

  if (!prefersReduced) {
    qsa('.word-reveal').forEach(el => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(w => `<span>${w}&nbsp;</span>`).join('');
    });
  }


  // Lightweight Lenis-style wheel smoothing for desktop browsers.
  if (!prefersReduced && !window.matchMedia('(pointer: coarse)').matches) {
    let targetY = window.scrollY;
    let raf = null;
    const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const render = () => {
      const current = window.scrollY;
      const next = current + (targetY - current) * 0.16;
      window.scrollTo(0, Math.abs(targetY - next) < 0.6 ? targetY : next);
      if (Math.abs(targetY - window.scrollY) > 0.7) raf = requestAnimationFrame(render);
      else raf = null;
    };
    window.addEventListener('wheel', (event) => {
      if (event.ctrlKey || event.metaKey || event.target.closest('textarea, select, [data-native-scroll]')) return;
      event.preventDefault();
      targetY = Math.max(0, Math.min(maxScroll(), targetY + event.deltaY));
      if (!raf) raf = requestAnimationFrame(render);
    }, { passive: false });
    window.addEventListener('keydown', () => { targetY = window.scrollY; }, { passive: true });
    window.addEventListener('resize', () => { targetY = Math.min(window.scrollY, maxScroll()); }, { passive: true });
    window.addEventListener('scroll', () => { if (!raf) targetY = window.scrollY; }, { passive: true });
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        if (entry.target.matches('.stat-row')) countStats(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  qsa('.reveal, .word-reveal, .line-reveal, .resume-stack, .why-card, .stat-row').forEach(el => io.observe(el));

  qsa('[data-stagger]').forEach(group => {
    qsa('.reveal', group).forEach((el, i) => el.style.transitionDelay = `${i * 80}ms`);
  });

  const countStats = (root) => {
    if (root.dataset.counted) return;
    root.dataset.counted = 'true';
    if (prefersReduced) return;
    qsa('[data-count]', root).forEach(el => {
      const target = Number(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const start = performance.now();
      const dur = 1150;
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        const value = Math.round(target * eased);
        el.textContent = `${prefix}${value}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  const steps = qsa('.step');
  const scenes = qsa('.visual-scene');
  const stepsRoot = qs('.steps');
  if (steps.length && scenes.length) {
    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const index = Number(entry.target.dataset.step);
        steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.step) === index));
        scenes.forEach(s => s.classList.toggle('active', Number(s.dataset.scene) === index));
        if (stepsRoot) stepsRoot.style.setProperty('--progress', `${((index + 1) / steps.length) * 88}%`);
      });
    }, { threshold: 0.52, rootMargin: '-18% 0px -28% 0px' });
    steps.forEach(step => stepIO.observe(step));
  }

  qsa('.btn-primary[data-magnetic]').forEach(btn => {
    if (prefersReduced || window.matchMedia('(pointer: coarse)').matches) return;
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.16;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.16;
      btn.style.setProperty('--mx', `${x}px`);
      btn.style.setProperty('--my', `${y}px`);
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    });
  });

  qsa('form[data-simulated]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      qsa('[required]', form).forEach(field => {
        const empty = !String(field.value || '').trim();
        field.setAttribute('aria-invalid', String(empty));
        valid = valid && !empty;
      });
      const success = qs('.form-success', form.parentElement || document);
      if (!valid) {
        success?.classList.remove('show');
        return;
      }
      success?.classList.add('show');
      form.reset();
    });
  });

  qsa('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!href.endsWith('.html') || !document.startViewTransition) return;
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      document.startViewTransition(() => { window.location.href = href; });
    });
  });
})();
