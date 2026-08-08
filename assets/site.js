// Shared interactions for the Sonkawade Labs site.
// Kept dependency-free and defensive: every page loads this, including the
// legal pages that have no tabs.
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
   * Button label slide.
   * Each .btn gets a second copy of its label stacked below the first inside
   * an overflow-hidden box; on hover the pair slides up by one line height.
   * Done in JS so the markup stays plain text and every button — current or
   * future — picks the effect up automatically.
   * ------------------------------------------------------------------- */
  function wrapLabels() {
    document.querySelectorAll(".btn").forEach(function (btn) {
      if (btn.querySelector(".btn__label")) return; // already wrapped
      // Only plain-text buttons; anything with markup is left alone.
      if (btn.children.length) return;
      var text = btn.textContent.trim();
      if (!text) return;

      var box = document.createElement("span");
      box.className = "btn__label";

      var a = document.createElement("span");
      a.textContent = text;
      var b = document.createElement("span");
      b.textContent = text;
      b.setAttribute("aria-hidden", "true");

      box.appendChild(a);
      box.appendChild(b);
      btn.textContent = "";
      btn.appendChild(box);
    });
  }

  /* ---------------------------------------------------------------------
   * Tabs. Markup contract:
   *   <div class="tabs" role="tablist">
   *     <button class="tab" role="tab" aria-selected="true" aria-controls="ID">
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
          // restart the entry animation
          p.classList.remove("is-entering");
          void p.offsetWidth;
          p.classList.add("is-entering");
        } else {
          p.hidden = true;
        }
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(tab, false);
      });
      tab.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });

    // Normalise initial state from whichever tab is marked selected.
    var initial = tabs.filter(function (t) {
      return t.getAttribute("aria-selected") === "true";
    })[0] || tabs[0];
    select(initial, false);
  }

  function init() {
    wrapLabels();
    document.querySelectorAll(".tabs").forEach(initTabs);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
