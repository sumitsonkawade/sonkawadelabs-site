// Shared behaviour for the Sonkawade Labs site.
// Loaded blocking in <head> so the theme class lands before first paint —
// everything that touches the DOM waits for DOMContentLoaded.
// Dependency-free: this is the vanilla port of Nim's motion-primitives.
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------------------------------------------------------------------
   * Theme. localStorage key "theme", values light | dark | system,
   * default system — same contract as next-themes in the reference.
   * ------------------------------------------------------------------- */
  var STORAGE_KEY = "theme";
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function stored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === "light" || v === "dark" || v === "system" ? v : "system";
    } catch (e) {
      return "system"; // private mode / storage disabled
    }
  }

  function applyTheme(pref) {
    var dark = pref === "dark" || (pref === "system" && media.matches);
    root.classList.toggle("dark", dark);
  }

  function setTheme(pref) {
    try { localStorage.setItem(STORAGE_KEY, pref); } catch (e) {}
    applyTheme(pref);
  }

  // Runs now, in <head>, so there is no flash of the wrong theme.
  root.classList.add("js");
  applyTheme(stored());

  // Follow the OS while the preference is "system".
  var onSystemChange = function () { if (stored() === "system") applyTheme("system"); };
  if (media.addEventListener) media.addEventListener("change", onSystemChange);
  else if (media.addListener) media.addListener(onSystemChange);

  var ICONS = {
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'
  };
  var ORDER = ["light", "dark", "system"];

  // Injected rather than written into 31 pages of markup — every page that
  // has a .footer-bottom gets the switch for free.
  function mountThemeSwitch() {
    var host = document.querySelector(".footer-bottom");
    if (!host || host.querySelector(".theme-switch")) return;

    var box = document.createElement("div");
    box.className = "theme-switch";

    var thumb = document.createElement("span");
    thumb.className = "theme-switch__thumb";
    box.appendChild(thumb);

    function paint(pref) {
      var i = ORDER.indexOf(pref);
      if (i < 0) i = 2;
      thumb.style.transform = "translateX(" + i * 26 + "px)";
      Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) {
        b.setAttribute("data-checked", b.getAttribute("data-id") === pref ? "true" : "false");
      });
    }

    ORDER.forEach(function (id) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-id", id);
      b.setAttribute("aria-label", "Switch to " + id + " theme");
      b.innerHTML = ICONS[id];
      b.addEventListener("click", function () {
        setTheme(id);
        paint(id);
      });
      box.appendChild(b);
    });

    paint(stored());
    host.appendChild(box);
  }

  /* ---------------------------------------------------------------------
   * Reveal. Sections fade up out of a blur, staggered — Nim's entrance,
   * applied without touching any page's markup.
   * ------------------------------------------------------------------- */
  function initReveal() {
    var targets = [].concat(
      Array.prototype.slice.call(document.querySelectorAll(".site-header > *")),
      Array.prototype.slice.call(document.querySelectorAll("main.stack > section, main.stack > .site-footer"))
    );
    if (!targets.length) return;

    targets.forEach(function (el, i) {
      el.setAttribute("data-reveal", "");
      el.style.setProperty("--reveal-delay", Math.min(i, 8) * 150 + "ms");
    });

    // The animation itself is pure CSS (see [data-reveal] in site.css) — JS
    // only marks the elements and spaces out their delays.
  }

  /* ---------------------------------------------------------------------
   * Spotlight. The card CSS reads --mx/--my; this just reports the pointer.
   * ------------------------------------------------------------------- */
  function initSpotlight() {
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".card");
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------
   * Magnetic buttons. Each .btn is wrapped in a span that drifts toward the
   * cursor and springs back. Skipped for touch and reduced motion.
   * ------------------------------------------------------------------- */
  function initMagnetic() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    document.querySelectorAll(".btn").forEach(function (btn) {
      var wrap = document.createElement("span");
      wrap.className = "magnetic";
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);

      var INTENSITY = 0.3;
      var RANGE = 60;

      function move(e) {
        var r = wrap.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        if (Math.abs(dx) > r.width / 2 + RANGE || Math.abs(dy) > r.height / 2 + RANGE) {
          wrap.style.transform = "";
          return;
        }
        wrap.style.transform = "translate(" + dx * INTENSITY + "px," + dy * INTENSITY + "px)";
      }

      wrap.style.transition = "transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)";
      document.addEventListener("pointermove", move, { passive: true });
      wrap.addEventListener("pointerleave", function () { wrap.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------------------
   * Tabs. Markup contract (unchanged from the previous site):
   *   <div class="tabs" role="tablist">
   *     <button class="tab" role="tab" aria-selected aria-controls="ID">
   *   <div class="tab-panel" id="ID" role="tabpanel">
   * ------------------------------------------------------------------- */
  function initTabs(list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll(".tab"));
    if (!tabs.length) return;

    function panelFor(tab) {
      var id = tab.getAttribute("aria-controls");
      return id ? document.getElementById(id) : null;
    }

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var p = panelFor(t);
        if (!p) return;
        if (on) {
          p.hidden = false;
          p.classList.remove("is-entering");
          void p.offsetWidth; // restart the entry animation
          p.classList.add("is-entering");
        } else {
          p.hidden = true;
        }
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });

    var initial = tabs.filter(function (t) {
      return t.getAttribute("aria-selected") === "true";
    })[0] || tabs[0];
    select(initial, false);
  }

  function init() {
    mountThemeSwitch();
    initReveal();
    initSpotlight();
    initMagnetic();
    document.querySelectorAll(".tabs").forEach(initTabs);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
