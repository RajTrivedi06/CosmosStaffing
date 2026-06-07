(() => {
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saved = sessionStorage.getItem('cosmos-theme');
  const system = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  doc.dataset.theme = saved || system;
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  const header = document.querySelector('[data-header]');
  const onScrollHeader = () => header?.classList.toggle('is-condensed', scrollY > 24);
  addEventListener('scroll', onScrollHeader, { passive: true }); onScrollHeader();

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = doc.dataset.theme === 'dark' ? 'light' : 'dark';
    if (document.startViewTransition) document.startViewTransition(() => { doc.dataset.theme = next; });
    else doc.dataset.theme = next;
    sessionStorage.setItem('cosmos-theme', next);
  });

  const menuBtn = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  menuBtn?.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        if (entry.target.matches('[data-counts]')) runCounts(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal,.reveal-group,[data-counts],.point-card').forEach(el => io.observe(el));

  if (!reduce) {
    let current = scrollY, target = scrollY, ticking = false, isSmoothing = false;
    const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
    addEventListener('wheel', e => {
      if (innerWidth < 900) return;
      e.preventDefault(); target = Math.max(0, Math.min(maxScroll(), target + e.deltaY));
      if (!ticking) requestAnimationFrame(smoothStep); ticking = true;
    }, { passive: false });
    function smoothStep() {
      current += (target - current) * 0.14; isSmoothing = true; scrollTo(0, current); isSmoothing = false;
      if (Math.abs(target - current) > 0.5) requestAnimationFrame(smoothStep); else { ticking = false; current = target; scrollTo(0, target); }
    }
    addEventListener('scroll', () => { if (!isSmoothing) { target = scrollY; current = scrollY; } parallax(); scrolly(); resumeThin(); }, { passive: true });
    addEventListener('resize', () => { target = scrollY; current = scrollY; });
  }

  function parallax() {
    document.querySelectorAll('[data-parallax-section]').forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const p = (innerHeight - rect.top) / (innerHeight + rect.height) - .5;
      section.querySelectorAll('.layer-slow').forEach(el => el.style.transform = `translate3d(0,${p * 34}px,0)`);
      section.querySelectorAll('.layer-fast').forEach(el => el.style.transform = `translate3d(0,${p * -22}px,0)`);
    });
  }

  function resumeThin() {
    document.querySelectorAll('[data-resume-section]').forEach(section => section.querySelector('.resume-stack')?.classList.toggle('is-thin', section.getBoundingClientRect().top < innerHeight * .45));
  }

  function scrolly() {
    const wrap = document.querySelector('[data-scrolly]'); if (!wrap || innerWidth < 900) return;
    const steps = [...wrap.querySelectorAll('[data-step]')];
    let active = 0, nearest = Infinity;
    steps.forEach((step, i) => { const d = Math.abs(step.getBoundingClientRect().top - innerHeight * .38); if (d < nearest) { nearest = d; active = i; } });
    steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
    wrap.querySelectorAll('[data-scene]').forEach((s, i) => s.classList.toggle('is-active', i === active));
    const progress = wrap.querySelector('[data-progress]'); if (progress) progress.style.height = `${((active + 1) / steps.length) * 100}%`;
  }

  function runCounts(root) {
    if (reduce) return;
    root.querySelectorAll('[data-count]').forEach(el => {
      const end = Number(el.dataset.count), start = performance.now(), dur = 1000;
      const finalText = el.dataset.final || el.textContent;
      const tick = now => { const t = Math.min(1, (now - start) / dur); const eased = 1 - Math.pow(1 - t, 4); el.textContent = t < 1 ? String(Math.round(end * eased)) : finalText; if (t < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }

  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('pointermove', e => { if (reduce) return; const r = btn.getBoundingClientRect(); btn.style.transform = `translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.12}px)`; });
    btn.addEventListener('pointerleave', () => btn.style.transform = '');
  });

  document.querySelectorAll('form[data-simulated-form]').forEach(form => {
    form.addEventListener('submit', e => { e.preventDefault(); form.querySelector('.form-success')?.classList.add('is-visible'); form.reset(); });
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href$=".html"],a[href*=".html#"]');
    if (!a || !document.startViewTransition || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); document.startViewTransition(() => { location.href = a.href; });
  });
})();
