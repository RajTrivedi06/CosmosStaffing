/* ============================================================
   COSMOS STAFFING — site.js
   Shared header/footer injection + motion system.
   ============================================================ */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MOBILE = function () { return window.matchMedia("(max-width: 820px)").matches; };

  /* ---------------- NAV CONFIG ---------------- */
  var NAV = [
    { label: "About", href: "about.html", page: "about" },
    { label: "Staffing & Recruiting", href: "staffing.html", page: "staffing" },
    { label: "HR & Payroll", href: "hr-payroll.html", page: "hr-payroll" },
    { label: "Bookkeeping", href: "bookkeeping.html", page: "bookkeeping" },
    { label: "For Job Seekers", href: "job-seekers.html", page: "job-seekers" },
    { label: "Contact", href: "contact.html", page: "contact" }
  ];

  var ARROW = '<svg class="arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------------- HEADER ---------------- */
  function buildHeader() {
    var current = document.body.getAttribute("data-page") || "";
    var navHtml = NAV.map(function (n) {
      var active = n.page === current ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="' + n.href + '"' + active + '>' + n.label + "</a>";
    }).join("");

    var mobileLinks = NAV.map(function (n, i) {
      return '<a href="' + n.href + '" style="--d:' + (i * 55) + 'ms">' + n.label + "</a>";
    }).join("");

    var header =
      '<header class="site-header" id="siteHeader">' +
        '<div class="wrap site-header__inner">' +
          '<a class="brand" href="index.html" aria-label="Cosmos Staffing home">' +
            '<span class="brand__mark" aria-hidden="true"></span>Cosmos' +
          '</a>' +
          '<nav class="nav" aria-label="Primary">' + navHtml + '</nav>' +
          '<div class="header-tools">' +
            themeToggleHtml() +
            '<a class="btn btn--primary" href="contact.html" data-magnetic>Request Talent</a>' +
            '<button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false"><span></span></button>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div class="mobile-menu" id="mobileMenu">' +
        mobileLinks +
        '<a class="btn btn--primary mobile-menu__cta" href="contact.html">Request Talent ' + ARROW + '</a>' +
      '</div>';

    document.body.insertAdjacentHTML("afterbegin", header);
  }

  function themeToggleHtml() {
    return '<button class="theme-toggle" id="themeToggle" aria-label="Toggle color theme">' +
      '<svg class="icon-moon" viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
      '<svg class="icon-sun" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '</button>';
  }

  /* ---------------- FOOTER ---------------- */
  function buildFooter() {
    var year = new Date().getFullYear();
    var footer =
      '<footer class="site-footer" data-reveal>' +
        '<div class="wrap">' +
          '<div class="footer-grid">' +
            '<div class="footer-brandline">' +
              '<a class="brand" href="index.html"><span class="brand__mark" aria-hidden="true"></span>Cosmos</a>' +
              '<p class="muted" style="font-size:var(--fs-small)">Staffing and workforce solutions, Austin-based. Vetted people and the back office behind them.</p>' +
            '</div>' +
            '<div class="footer-col">' +
              '<h4>Services</h4>' +
              '<ul>' +
                '<li><a class="link-slide" href="staffing.html">Staffing &amp; Recruiting</a></li>' +
                '<li><a class="link-slide" href="professional-search.html">Professional Search</a></li>' +
                '<li><a class="link-slide" href="hr-payroll.html">HR &amp; Payroll</a></li>' +
                '<li><a class="link-slide" href="bookkeeping.html">Bookkeeping</a></li>' +
              '</ul>' +
            '</div>' +
            '<div class="footer-col">' +
              '<h4>Company</h4>' +
              '<ul>' +
                '<li><a class="link-slide" href="about.html">About</a></li>' +
                '<li><a class="link-slide" href="job-seekers.html">For Job Seekers</a></li>' +
                '<li><a class="link-slide" href="contact.html">Contact</a></li>' +
              '</ul>' +
            '</div>' +
            '<div class="footer-col">' +
              '<h4>Contact</h4>' +
              '<ul>' +
                '<li class="muted"><span class="ph">[PLACEHOLDER: address]</span></li>' +
                '<li><a class="link-slide" href="contact.html"><span class="ph">[PLACEHOLDER: phone]</span></a></li>' +
                '<li><a class="link-slide" href="contact.html"><span class="ph">[PLACEHOLDER: email]</span></a></li>' +
                '<li style="margin-top:8px"><a class="link-slide" href="#">LinkedIn</a></li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
          '<div class="footer-bottom">' +
            '<span>&copy; ' + year + ' Cosmos Services LLC.</span>' +
            '<span>Serving Austin &amp; Central Texas</span>' +
          '</div>' +
        '</div>' +
      '</footer>';
    document.body.insertAdjacentHTML("beforeend", footer);
  }

  /* ---------------- THEME ---------------- */
  function initTheme() {
    var saved = null;
    try { saved = sessionStorage.getItem("cosmos-theme"); } catch (e) {}
    var sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = saved || (sysDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("#themeToggle");
      if (!btn) return;
      var cur = document.documentElement.getAttribute("data-theme");
      var next = cur === "dark" ? "light" : "dark";
      document.documentElement.classList.add("theme-anim");
      document.documentElement.setAttribute("data-theme", next);
      try { sessionStorage.setItem("cosmos-theme", next); } catch (e2) {}
      window.setTimeout(function () {
        document.documentElement.classList.remove("theme-anim");
      }, 460);
    });
  }

  /* ---------------- SMOOTH SCROLL (Lenis, guarded) ---------------- */
  function initSmoothScroll() {
    if (REDUCED || typeof window.Lenis !== "function") return;
    try {
      var lenis = new window.Lenis({ duration: 1.05, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      window.__lenis = lenis;
    } catch (e) { /* native scroll fallback */ }
  }

  /* ---------------- HEADER CONDENSE ---------------- */
  function initHeaderCondense() {
    var header = document.getElementById("siteHeader");
    if (!header) return;
    function onScroll() {
      if (window.scrollY > 24) header.classList.add("is-condensed");
      else header.classList.remove("is-condensed");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- MOBILE MENU ---------------- */
  function initMobileMenu() {
    document.addEventListener("click", function (e) {
      var toggle = e.target.closest("#navToggle");
      if (toggle) {
        var open = document.body.classList.toggle("menu-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        return;
      }
      if (e.target.closest("#mobileMenu a")) {
        document.body.classList.remove("menu-open");
      }
    });
  }

  /* ---------------- SCROLL SCHEDULER ----------------
     IntersectionObserver is unreliable inside some preview iframes,
     so visibility is driven by getBoundingClientRect on a shared,
     rAF-throttled scroll/resize loop. Works everywhere. */
  var SCROLL_CBS = [];
  function onScrollFrame(cb) { SCROLL_CBS.push(cb); }
  function initScrollScheduler() {
    var scheduled = false;
    function run() { scheduled = false; for (var i = 0; i < SCROLL_CBS.length; i++) { try { SCROLL_CBS[i](); } catch (e) {} } }
    function req() { if (scheduled) return; scheduled = true; setTimeout(run, 16); }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req, { passive: true });
    if (window.__lenis) { try { window.__lenis.on("scroll", req); } catch (e) {} }
    run();
    // catch late layout/font shifts without relying on rAF
    var n = 0, iv = setInterval(function () { run(); if (++n > 16) clearInterval(iv); }, 180);
    window.addEventListener("load", run);
  }
  // rAF that degrades to setTimeout when the frame loop is throttled
  function safeRaf(cb) {
    var done = false;
    var id = requestAnimationFrame(function (t) { if (!done) { done = true; cb(t); } });
    setTimeout(function () { if (!done) { done = true; cancelAnimationFrame(id); cb(performance.now()); } }, 32);
  }
  function inView(el, ratioFromBottom) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var trigger = vh * (ratioFromBottom == null ? 0.88 : ratioFromBottom);
    return r.top < trigger && r.bottom > 0;
  }

  /* ---------------- REVEALS ---------------- */
  function initReveals() {
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    var lines = Array.prototype.slice.call(document.querySelectorAll(".reveal-lines"));
    if (REDUCED) {
      items.forEach(function (el) { el.classList.add("in"); });
      lines.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    // stagger groups
    document.querySelectorAll("[data-stagger]").forEach(function (group) {
      group.querySelectorAll("[data-reveal]").forEach(function (el, i) {
        el.style.transitionDelay = (i * 75) + "ms";
      });
    });
    onScrollFrame(function () {
      for (var i = items.length - 1; i >= 0; i--) {
        if (inView(items[i])) { items[i].classList.add("in"); items.splice(i, 1); }
      }
      for (var j = lines.length - 1; j >= 0; j--) {
        if (inView(lines[j], 0.92)) { lines[j].classList.add("in"); lines.splice(j, 1); }
      }
    });
  }

  /* ---------------- PARALLAX ---------------- */
  function initParallax() {
    if (REDUCED) return;
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
    if (!els.length) return;
    onScrollFrame(function () {
      var vh = window.innerHeight;
      var small = MOBILE();
      els.forEach(function (el) {
        if (small && el.hasAttribute("data-parallax-desktop")) { el.style.transform = ""; return; }
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        var rect = el.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var offset = (center - vh / 2) * speed * -1;
        el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
      });
    });
  }

  /* ---------------- COUNT UP ---------------- */
  function initCountUp() {
    var nums = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
    if (!nums.length) return;
    function format(n) { return n.toLocaleString("en-US"); }
    function start(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      if (REDUCED) { el.textContent = format(target) + suffix; return; }
      var dur = 1300, t0 = Date.now();
      var iv = setInterval(function () {
        var p = Math.min((Date.now() - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(Math.round(target * eased)) + suffix;
        if (p >= 1) clearInterval(iv);
      }, 32);
    }
    onScrollFrame(function () {
      for (var i = nums.length - 1; i >= 0; i--) {
        if (inView(nums[i], 0.82)) { start(nums[i]); nums.splice(i, 1); }
      }
    });
  }

  /* ---------------- MAGNETIC BUTTONS ---------------- */
  function initMagnetic() {
    if (REDUCED) return;
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      var strength = 0.32;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + (x * strength).toFixed(1) + "px," + (y * strength).toFixed(1) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------- SCROLLYTELLING ---------------- */
  function initScrolly() {
    var root = document.querySelector("[data-scrolly]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".step"));
    var scenes = Array.prototype.slice.call(root.querySelectorAll(".scene"));
    if (!steps.length) return;
    var current = -1;
    function setActive(idx) {
      if (idx === current) return;
      current = idx;
      steps.forEach(function (s, i) { s.classList.toggle("active", i === idx); });
      scenes.forEach(function (s, i) { s.classList.toggle("active", i === idx); });
    }
    setActive(0);
    onScrollFrame(function () {
      var vh = window.innerHeight;
      var focus = vh * 0.5;
      var best = 0, bestDist = Infinity;
      steps.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        var center = r.top + r.height / 2;
        var dist = Math.abs(center - focus);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      setActive(best);
    });
  }

  /* ---------------- HORIZONTAL SCROLL PANEL ---------------- */
  function initHScroll() {
    var section = document.querySelector("[data-hscroll]");
    if (!section) return;
    var track = section.querySelector(".hscroll-track");
    var sticky = section.querySelector(".hscroll-sticky");
    if (!track || !sticky) return;

    function smallMode() { return REDUCED || MOBILE(); }

    function layout() {
      if (smallMode()) {
        section.style.height = "";
        sticky.style.height = "";
        track.style.transform = "";
        section.classList.add("hscroll--native");
        return;
      }
      section.classList.remove("hscroll--native");
      var overflow = track.scrollWidth - sticky.clientWidth;
      if (overflow < 0) overflow = 0;
      section.style.height = (window.innerHeight + overflow) + "px";
      sticky.style.height = window.innerHeight + "px";
      update();
    }

    function update() {
      if (smallMode()) return;
      var rect = section.getBoundingClientRect();
      var overflow = track.scrollWidth - sticky.clientWidth;
      var total = section.offsetHeight - window.innerHeight;
      var progress = Math.min(Math.max(-rect.top / total, 0), 1);
      track.style.transform = "translate3d(" + (-progress * overflow).toFixed(1) + "px,0,0)";
    }

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(function () { update(); ticking = false; }); }
    }, { passive: true });
    window.addEventListener("resize", layout);
    window.addEventListener("load", layout);
    layout();
  }

  /* ---------------- FAQ ---------------- */
  function initFaq() {
    document.querySelectorAll(".faq__q").forEach(function (q) {
      q.addEventListener("click", function () {
        var item = q.closest(".faq__item");
        var ans = item.querySelector(".faq__a");
        var open = item.classList.toggle("open");
        ans.style.maxHeight = open ? ans.scrollHeight + "px" : "0px";
        q.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  /* ---------------- CONTACT FORM (simulated) ---------------- */
  function initForm() {
    var form = document.getElementById("talentForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (f) {
        if (!f.value.trim()) { ok = false; f.style.borderColor = "var(--accent)"; }
        else { f.style.borderColor = ""; }
      });
      if (!ok) return;
      var success = document.getElementById("formSuccess");
      form.style.display = "none";
      if (success) {
        success.classList.add("show");
        success.setAttribute("tabindex", "-1");
        success.focus();
      }
    });
  }

  /* ---------------- INIT ---------------- */
  function init() {
    buildHeader();
    buildFooter();
    initTheme();
    initSmoothScroll();
    initHeaderCondense();
    initMobileMenu();
    initReveals();
    initParallax();
    initCountUp();
    initMagnetic();
    initScrolly();
    initHScroll();
    initFaq();
    initForm();
    initScrollScheduler();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
