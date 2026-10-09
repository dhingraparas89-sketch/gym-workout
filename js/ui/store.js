// Saved state on this device. Every storage access is wrapped: storage can be blocked or full,
// and the site must work without it. Keys live under "repsheet.".
//
// Progress-ready: Store.collection(name) gives any future list (training plans, workout history,
// set logs) the same guarded add / update / remove / list API, so those features only need a page.

const Store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("repsheet." + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) { try { localStorage.setItem("repsheet." + key, JSON.stringify(value)); } catch (e) {} },
  raw(key) { try { return localStorage.getItem("repsheet." + key); } catch (e) { return null; } },
  setRaw(key, value) { try { localStorage.setItem("repsheet." + key, value); } catch (e) {} },

  // ----- Favorites and recently viewed (exercise names) -----
  known(name) { return typeof BY_NAME === "undefined" || !!BY_NAME[name]; },
  favorites() { const f = Store.get("favorites", []); return Array.isArray(f) ? f.filter((n) => Store.known(n)) : []; },
  isFav(name) { return Store.favorites().includes(name); },
  toggleFav(name) {
    const f = Store.favorites(), i = f.indexOf(name);
    if (i >= 0) f.splice(i, 1); else f.unshift(name);
    Store.set("favorites", f);
    return i < 0;
  },
  recent() { const r = Store.get("recent", []); return Array.isArray(r) ? r.filter((n) => Store.known(n)) : []; },
  pushRecent(name) { Store.set("recent", [name, ...Store.recent().filter((n) => n !== name)].slice(0, 12)); },
  clearRecent() { Store.set("recent", []); },

  // ----- Settings -----
  athlete() { const a = Store.raw("athlete"); return a === "male" || a === "female" ? a : null; },
  setAthlete(a) { Store.setRaw("athlete", a); },
  // Guide level: beginner (plain words, slower playback), standard, advanced (anatomy, fibers).
  level() { const l = Store.raw("level"); return l === "beginner" || l === "advanced" ? l : "standard"; },
  setLevel(l) { Store.setRaw("level", l); },

  // ----- Generic collections for future progress features -----
  collection(name) {
    const key = "c." + name;
    const all = () => { const v = Store.get(key, []); return Array.isArray(v) ? v : []; };
    return {
      list: all,
      add(item) {
        const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), ...item };
        Store.set(key, [rec, ...all()]);
        return rec;
      },
      update(id, patch) { Store.set(key, all().map((r) => (r.id === id ? { ...r, ...patch } : r))); },
      remove(id) { Store.set(key, all().filter((r) => r.id !== id)); },
      clear() { Store.set(key, []); }
    };
  }
};
