// Page shell: hash router, top navigation, guide-level setting and favorites. Every 3D viewer is
// created by the page that shows it (at most three at once) and disposed when the route changes.

// ---------- Viewer lifecycle ----------
const MAX_VIEWERS = 3;
const live = { viewers: [], cleanups: [] };
function makeViewer(container, mode, opts) {
  if (!window.THREE || typeof createViewer3D !== "function") return null;
  while (live.viewers.length >= MAX_VIEWERS) { const old = live.viewers.shift(); try { old.dispose(); } catch (e) {} }
  let v = null;
  try { v = createViewer3D(container, mode, opts || {}); } catch (e) { console.error(e); v = null; }
  if (v) live.viewers.push(v);
  return v;
}
function dropViewer(v) {
  if (!v) return;
  live.viewers = live.viewers.filter((x) => x !== v);
  try { v.dispose(); } catch (e) {}
}
function teardown() {
  live.cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) {} });
  live.viewers.splice(0).forEach((v) => { try { v.dispose(); } catch (e) {} });
}
const ctx = {
  makeViewer, dropViewer,
  onCleanup: (fn) => live.cleanups.push(fn),
  // Update the address without re-rendering the page (filters, selections).
  setHash(h) { try { history.replaceState(null, "", h); } catch (e) { location.hash = h; } highlightNav(); },
  rerender: () => route(true)
};

// ---------- Router ----------
function parseHash() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch (e) { return p; } });
  return { page: parts[0] || "", params: parts.slice(1), query: new URLSearchParams(query || "") };
}
function renderExercise(r) {
  const ex = exByAny(r.params[0] || "");
  if (!ex) return notFound();
  Store.pushRecent(ex.name);
  document.title = ex.name + " · Rep Sheet";
  return renderDetail(ex, ctx);
}
const PAGES = {
  "": renderHome, library: renderLibrary, exercise: renderExercise, muscles: (r) => renderMuscles(r.params, ctx),
  analysis: renderAnalysis, favorites: renderFavorites, recent: renderRecent, compare: renderCompare, plans: renderPlans,
  my: renderFavorites
};
const TITLES = { library: "Exercise Library", muscles: "Muscle Explorer", analysis: "Exercise Analysis", favorites: "Favorites", recent: "Recently Viewed", compare: "Compare exercises", plans: "Sample plans" };
const NAV_OF = { "": "", library: "library", exercise: "library", muscles: "muscles", analysis: "analysis", favorites: "favorites", my: "favorites", recent: "recent" };
function highlightNav() {
  const { page } = parseHash();
  $$(".nav a").forEach((a) => {
    if (a.dataset.nav === NAV_OF[page]) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}
function notFound() {
  return mk("empty", `<span class="empty-ico">${ICON.search}</span><h2>Page not found</h2><p>That page or exercise doesn't exist.</p><a class="btn btn-ghost" href="#/library">Browse the library</a>`);
}
let lastPage = null;
function route(keepScroll) {
  teardown();
  const r = parseHash();
  const render = PAGES[r.page] || notFound;
  const app = $("#app");
  app.innerHTML = "";
  document.title = TITLES[r.page] ? TITLES[r.page] + " · Rep Sheet" : "Rep Sheet";
  let node;
  try { node = render(r, ctx); } catch (e) {
    console.error(e);
    node = mk("empty", `<span class="empty-ico">${ICON.warn}</span><h2>Something went wrong</h2><p>This page could not be shown. Try again, or go back to the library.</p><a class="btn btn-ghost" href="#/library">Exercise Library</a>`);
  }
  app.appendChild(node);
  app.dataset.page = r.page || "home";
  highlightNav();
  closeMenu();
  const key = r.page + "/" + r.params.join("/");
  if (key !== lastPage && keepScroll !== true) {
    window.scrollTo(0, 0);
    // Move focus to the new page for keyboard and screen-reader users (not on the first load).
    if (lastPage !== null) { const h = app.querySelector("h1"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
  }
  lastPage = key;
}

// ---------- Shell ----------
function closeMenu() { document.body.classList.remove("menu-open"); const m = $(".menu-btn"); if (m) m.setAttribute("aria-expanded", "false"); }
function applyLevel(level) { document.body.dataset.level = level; const s = $("#level-switch"); if (s) s.value = level; }

document.addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) {
    e.preventDefault(); e.stopPropagation();
    const name = fav.dataset.fav, on = Store.toggleFav(name);
    $$(`[data-fav="${CSS.escape(name)}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", `${on ? "Remove" : "Save"} ${name} ${on ? "from" : "to"} favorites`);
      b.title = on ? "Saved to favorites" : "Save to favorites";
      b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
    });
    return;
  }
  if (e.target.closest(".menu-btn")) {
    const open = !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open);
    e.target.closest(".menu-btn").setAttribute("aria-expanded", String(open));
    if (open) { const first = $(".nav a"); if (first) first.focus(); }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("menu-open")) { closeMenu(); const m = $(".menu-btn"); if (m) m.focus(); }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "level-switch") {
    const l = e.target.value;
    Store.setLevel(l); applyLevel(l);
    route(true); // re-render the page in the new level's words
  }
});
window.addEventListener("hashchange", () => route());

applyLevel(Store.level());
route();
