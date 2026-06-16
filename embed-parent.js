/**
 * Daily Dilemma — Squarespace parent-page resize listener.
 *
 * OPTION A (easiest): paste squarespace-code-block.html into your homepage Code block.
 * OPTION B: paste squarespace-header-injection.html into Settings → Advanced → Code Injection → Header.
 *
 * Do NOT paste raw JavaScript without <script> tags — it will show as visible text on the page.
 * Do NOT put this in a text/HTML block in the site header.
 *
 * After saving, publish the site and test in a private/incognito window (logged-out).
 */
(function () {
  var ALLOWED = { "https://forgeagentanonymuss.github.io": true };
  var GAME = "https://forgeagentanonymuss.github.io";
  var GAME_BASE = GAME + "/daily-dilemma/";
  var FORWARD_PARAMS = ["r", "share", "reset", "dev"];

  function forwardedGameSearch() {
    var out = new URLSearchParams();
    var page = new URLSearchParams(window.location.search);
    out.set("join", "https://www.the-daily-dilemma.com/go-premium");
    FORWARD_PARAMS.forEach(function (key) {
      if (page.has(key)) out.set(key, page.get(key));
    });
    return out.toString();
  }

  function gameFrameSrc() {
    return GAME_BASE + "?" + forwardedGameSearch();
  }

  function syncFrameSrc(frame) {
    var next = gameFrameSrc();
    if (!frame.src || frame.src !== next) frame.src = next;
  }

  function resizeFrames(height) {
    var h = Math.max(520, Math.min(height, 2400));
    document.querySelectorAll('iframe[src*="daily-dilemma"]').forEach(function (frame) {
      frame.style.height = h + "px";
      frame.style.minHeight = "0";
      frame.style.overflow = "hidden";
      frame.setAttribute("scrolling", "no");
    });
  }

  function requestChildResize(frame) {
    try {
      frame.contentWindow.postMessage({ type: "dd-request-resize" }, GAME);
    } catch (e) { /* cross-origin until loaded */ }
  }

  function wireFrame(frame) {
    if (frame.dataset.ddWired === "1") return;
    frame.dataset.ddWired = "1";
    syncFrameSrc(frame);
    frame.addEventListener("load", function () {
      requestChildResize(frame);
      setTimeout(function () { requestChildResize(frame); }, 400);
      setTimeout(function () { requestChildResize(frame); }, 1200);
    });
    requestChildResize(frame);
  }

  window.addEventListener("message", function (e) {
    if (!ALLOWED[e.origin]) return;
    if (!e.data) return;
    if (e.data.type === "dd-modal") {
      var lock = !!e.data.open;
      document.documentElement.style.overflow = lock ? "hidden" : "";
      document.body.style.overflow = lock ? "hidden" : "";
      return;
    }
    if (e.data.type !== "dd-resize" || typeof e.data.height !== "number") return;
    resizeFrames(e.data.height);
  });

  function boot() {
    document.querySelectorAll('iframe[src*="daily-dilemma"]').forEach(wireFrame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("load", boot);
})();