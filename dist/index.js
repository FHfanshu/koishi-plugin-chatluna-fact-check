import { defineComponent as N, inject as T, computed as M, onMounted as P, watch as A, onBeforeUnmount as _, h as z } from "vue";
const y = /* @__PURE__ */ new Set([
  "isthattrue",
  // legacy package name
  "chatluna-fact-check",
  "koishi-plugin-isthattrue",
  // legacy package name
  "koishi-plugin-chatluna-fact-check"
]);
function O(t) {
  if (!t) return !1;
  if (y.has(t)) return !0;
  for (const e of y)
    if (t.startsWith(`${e}:`)) return !0;
  return !1;
}
const S = [
  {
    title: "基础",
    sections: [
      { key: "base", title: "基础设置" },
      { key: "tool", title: "工具设置" }
    ]
  },
  {
    title: "搜索与抓取",
    sections: [
      { key: "search", title: "搜索设置" },
      { key: "web_fetch", title: "网页抓取设置" },
      { key: "jina", title: "Jina 设置" }
    ]
  }
], B = S.flatMap((t) => t.sections), E = {
  base: ["基础设置"],
  tool: ["工具设置", "工具配置"],
  search: ["搜索设置", "搜索配置"],
  web_fetch: ["网页抓取设置", "网页抓取配置"],
  jina: ["Jina 设置", "Jina 配置"]
}, w = "isthattrue-nav-style";
function F() {
  if (document.getElementById(w)) return;
  const t = document.createElement("style");
  t.id = w, t.textContent = `
.isthattrue-nav {
  position: absolute;
  z-index: 1000;
  width: 200px;
  max-width: 90vw;
  max-height: 70vh;
  background: var(--k-card-bg);
  border-radius: 8px;
  box-shadow: var(--k-card-shadow);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--k-card-border);
  user-select: none;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}
@media (max-width: 768px) {
  .isthattrue-nav { width: 160px; max-height: 50vh; }
}
.isthattrue-nav:hover {
  box-shadow: var(--k-card-shadow-hover, 0 4px 16px rgba(0,0,0,.15));
}
.isthattrue-nav-header {
  padding: 4px 8px;
  border-bottom: 1px solid var(--k-color-divider, #ebeef5);
  background-color: var(--k-hover-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  transition: background-color 0.2s;
}
.isthattrue-nav-header:hover {
  background-color: var(--k-activity-bg);
}
.isthattrue-nav-handle {
  color: var(--k-text-light);
  cursor: grab;
  transition: color 0.2s;
}
.isthattrue-nav-handle:active {
  cursor: grabbing;
  color: var(--k-color-primary);
}
.isthattrue-nav-toggle {
  border: none;
  background: transparent;
  color: var(--k-text-light);
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  transition: transform 0.3s ease, color 0.2s;
}
.isthattrue-nav-toggle:hover {
  color: var(--k-text-active);
}
.isthattrue-nav-body {
  overflow-y: auto;
  padding: 4px 0;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  opacity: 1;
}
.isthattrue-nav-body::-webkit-scrollbar { width: 6px; }
.isthattrue-nav-body::-webkit-scrollbar-thumb { background: var(--k-scroll-thumb); border-radius: 3px; }
.isthattrue-nav-body::-webkit-scrollbar-track { background: transparent; }
.isthattrue-nav.collapsed .isthattrue-nav-body {
  max-height: 0;
  padding: 0;
  opacity: 0;
  overflow: hidden;
}
.isthattrue-nav.collapsed .isthattrue-nav-toggle {
  transform: rotate(-90deg);
}
.isthattrue-nav.collapsed .isthattrue-nav-header {
  border-bottom: none;
}
.isthattrue-nav-section {
  margin-bottom: 4px;
}
.isthattrue-nav-section-title {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--k-text-light);
  background-color: var(--k-bg-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.isthattrue-nav-item {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--k-text);
  text-align: left;
  padding: 5px 12px 5px 20px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.5;
  transition: background-color 0.15s, color 0.15s;
}
.isthattrue-nav-item:hover {
  background-color: var(--k-hover-bg);
  color: var(--k-text-active);
}
.isthattrue-nav-item.active {
  color: var(--k-color-primary);
  background-color: var(--k-hover-bg);
}
/* Shrink nested sub-section headers inside intersect groups. */
.k-schema-group .k-schema-group .k-schema-header {
  font-size: 0.85em;
  margin-top: 0.4em;
  margin-bottom: 0.2em;
}
`, document.head.appendChild(t);
}
function p(t) {
  return t.replace(/\s+/g, "").trim();
}
function L() {
  return Array.from(document.querySelectorAll(
    ".k-schema-section-title, .k-schema-header, h2.k-schema-header"
  ));
}
function q(t) {
  const e = [t.title, ...E[t.key] || []].map((i) => p(i)).filter(Boolean), r = L();
  for (const i of r) {
    const n = p(i.textContent || "");
    if (n && e.some((u) => n.includes(u)))
      return i;
  }
  return null;
}
function C(t) {
  const e = p(t);
  return B.find((r) => [r.title, ...E[r.key] || []].map((n) => p(n)).filter(Boolean).some((n) => e.includes(n)));
}
function j() {
  F();
  const t = document.querySelector(".isthattrue-nav");
  t == null || t.remove();
  const e = document.createElement("div");
  e.className = "isthattrue-nav", e.innerHTML = `
<div class="isthattrue-nav-header">
  <span class="isthattrue-nav-handle">⋮⋮</span>
  <button class="isthattrue-nav-toggle" type="button">−</button>
</div>
<div class="isthattrue-nav-body"></div>
`, document.body.appendChild(e), e.style.top = "260px", e.style.right = "60px";
  const r = e.querySelector(".isthattrue-nav-body"), i = e.querySelector(".isthattrue-nav-toggle"), n = e.querySelector(".isthattrue-nav-header"), u = /* @__PURE__ */ new Map();
  for (const o of S) {
    const a = document.createElement("div");
    a.className = "isthattrue-nav-section";
    const s = document.createElement("div");
    s.className = "isthattrue-nav-section-title", s.textContent = o.title, a.appendChild(s);
    for (const d of o.sections) {
      const l = document.createElement("button");
      l.type = "button", l.className = "isthattrue-nav-item", l.textContent = d.title, l.addEventListener("click", () => {
        const h = q(d);
        h && h.scrollIntoView({ behavior: "smooth", block: "start" });
      }), a.appendChild(l), u.set(d.key, l);
    }
    r.appendChild(a);
  }
  i.addEventListener("click", (o) => {
    o.stopPropagation();
    const a = e.classList.toggle("collapsed");
    i.textContent = a ? "+" : "−";
  });
  let v = 0, g = 0, m = 0, b = 0;
  n.addEventListener("pointerdown", (o) => {
    o.target.closest(".isthattrue-nav-toggle") || (o.preventDefault(), n.setPointerCapture(o.pointerId), v = o.clientX, g = o.clientY, m = parseFloat(e.style.right || "60"), b = parseFloat(e.style.top || "260"));
  }), n.addEventListener("pointermove", (o) => {
    if (!n.hasPointerCapture(o.pointerId)) return;
    const a = o.clientX - v, s = o.clientY - g;
    e.style.top = `${Math.max(0, b + s)}px`, e.style.right = `${Math.max(0, m - a)}px`;
  });
  const f = (o) => {
    n.hasPointerCapture(o.pointerId) && n.releasePointerCapture(o.pointerId);
  };
  n.addEventListener("pointerup", f), n.addEventListener("pointercancel", f);
  let c = null;
  const x = () => {
    c == null || c.disconnect(), c = new IntersectionObserver((a) => {
      var s;
      for (const d of a) {
        if (!d.isIntersecting) continue;
        const l = (d.target.textContent || "").trim(), h = C(l);
        if (h) {
          for (const I of u.values()) I.classList.remove("active");
          (s = u.get(h.key)) == null || s.classList.add("active");
          break;
        }
      }
    }, {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0
    });
    const o = L();
    for (const a of o) {
      const s = a.textContent || "";
      C(s) && c.observe(a);
    }
  }, k = new MutationObserver(() => {
    window.setTimeout(x, 200);
  });
  return k.observe(document.body, { childList: !0, subtree: !0 }), window.setTimeout(x, 300), () => {
    c == null || c.disconnect(), k.disconnect(), e.remove();
  };
}
const D = N({
  name: "FactCheckDetailsLoader",
  setup() {
    const t = T("plugin:name"), e = M(() => {
      const n = t == null ? void 0 : t.value;
      return O(n);
    });
    let r = null;
    const i = () => {
      r == null || r(), r = null, e.value && (r = j());
    };
    return P(i), A(e, i), _(() => r == null ? void 0 : r()), () => z("div", { style: { display: "none" } });
  }
}), H = (t) => {
  t.slot({
    type: "plugin-details",
    component: D,
    order: -999
  });
};
export {
  H as default
};
