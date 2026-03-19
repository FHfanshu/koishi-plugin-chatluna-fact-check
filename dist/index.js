import { defineComponent as I, inject as T, computed as M, onMounted as N, watch as _, onBeforeUnmount as z, h as A } from "vue";
const P = /* @__PURE__ */ new Set([
  "isthattrue",
  // legacy package name
  "chatluna-fact-check",
  "koishi-plugin-isthattrue",
  // legacy package name
  "koishi-plugin-chatluna-fact-check"
]), S = [
  {
    title: "基础与工具",
    sections: [
      { key: "base", title: "基础" },
      { key: "tool", title: "tool" }
    ]
  },
  {
    title: "搜索与抓取",
    sections: [
      { key: "search", title: "search" },
      { key: "web_fetch", title: "web_fetch" },
      { key: "jina", title: "jina" }
    ]
  }
], O = S.flatMap((t) => t.sections), C = {
  base: ["基础"],
  tool: ["tool", "工具配置"],
  search: ["search", "搜索配置"],
  web_fetch: ["web_fetch", "网页抓取配置"],
  jina: ["jina", "Jina 配置"]
}, k = "isthattrue-nav-style";
function j() {
  if (document.getElementById(k)) return;
  const t = document.createElement("style");
  t.id = k, t.textContent = `
.isthattrue-nav {
  position: fixed;
  top: 260px;
  right: 60px;
  z-index: 1000;
  width: 140px;
  max-width: 90vw;
  user-select: none;
}
.isthattrue-nav-header {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--k-color-border, #4b5563);
  background: color-mix(in srgb, var(--k-color-bg, #1f2937) 94%, white);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  touch-action: none;
}
.isthattrue-nav-handle {
  color: var(--k-text-light, #9ca3af);
  font-size: 14px;
  line-height: 1;
}
.isthattrue-nav-toggle {
  border: none;
  background: transparent;
  color: var(--k-text-light, #9ca3af);
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  line-height: 1;
}
.isthattrue-nav-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.isthattrue-nav.collapsed .isthattrue-nav-body {
  display: none;
}
.isthattrue-nav-item {
  border: none;
  background: transparent;
  color: var(--k-text, #d1d5db);
  text-align: left;
  padding: 6px 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1.4;
}
.isthattrue-nav-item:hover {
  color: var(--k-color-primary, #4f7cff);
}
.isthattrue-nav-item.active {
  color: var(--k-color-primary, #4f7cff);
}
.isthattrue-nav-group {
  margin-top: 4px;
  padding: 6px 4px 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--k-text-light, #9ca3af);
  opacity: 0.9;
}
/* Shrink nested sub-section headers inside intersect groups. */
.k-schema-group .k-schema-group .k-schema-header {
  font-size: 0.85em;
  margin-top: 0.4em;
  margin-bottom: 0.2em;
}
`, document.head.appendChild(t);
}
function h(t) {
  return t.replace(/\s+/g, "").trim();
}
function E() {
  return Array.from(document.querySelectorAll(
    ".k-schema-section-title, .k-schema-header, h2.k-schema-header"
  ));
}
function B(t) {
  const e = [t.title, ...C[t.key] || []].map((i) => h(i)).filter(Boolean), r = E();
  for (const i of r) {
    const o = h(i.textContent || "");
    if (o && e.some((d) => o.includes(d)))
      return i;
  }
  return null;
}
function w(t) {
  const e = h(t);
  return O.find((r) => [r.title, ...C[r.key] || []].map((o) => h(o)).filter(Boolean).some((o) => e.includes(o)));
}
function q() {
  j();
  const t = document.querySelector(".isthattrue-nav");
  t == null || t.remove();
  const e = document.createElement("div");
  e.className = "isthattrue-nav", e.innerHTML = `
<div class="isthattrue-nav-header">
  <span class="isthattrue-nav-handle">⋮⋮</span>
  <button class="isthattrue-nav-toggle" type="button">⌄</button>
</div>
<div class="isthattrue-nav-body"></div>
`, document.body.appendChild(e);
  const r = e.querySelector(".isthattrue-nav-body"), i = e.querySelector(".isthattrue-nav-toggle"), o = e.querySelector(".isthattrue-nav-header"), d = /* @__PURE__ */ new Map();
  for (const n of S) {
    const a = document.createElement("div");
    a.className = "isthattrue-nav-group", a.textContent = n.title, r.appendChild(a);
    for (const s of n.sections) {
      const c = document.createElement("button");
      c.type = "button", c.className = "isthattrue-nav-item", c.textContent = s.title, c.addEventListener("click", () => {
        const u = B(s);
        u && u.scrollIntoView({ behavior: "smooth", block: "start" });
      }), r.appendChild(c), d.set(s.key, c);
    }
  }
  i.addEventListener("click", (n) => {
    n.stopPropagation();
    const a = e.classList.toggle("collapsed");
    i.textContent = a ? "⌃" : "⌄";
  });
  let p = 0, m = 0, f = 0, g = 0;
  o.addEventListener("pointerdown", (n) => {
    n.target.closest(".isthattrue-nav-toggle") || (n.preventDefault(), o.setPointerCapture(n.pointerId), p = n.clientX, m = n.clientY, f = parseFloat(e.style.right || "60"), g = parseFloat(e.style.top || "260"));
  }), o.addEventListener("pointermove", (n) => {
    if (!o.hasPointerCapture(n.pointerId)) return;
    const a = n.clientX - p, s = n.clientY - m;
    e.style.top = `${Math.max(0, g + s)}px`, e.style.right = `${Math.max(0, f - a)}px`;
  });
  const v = (n) => {
    o.hasPointerCapture(n.pointerId) && o.releasePointerCapture(n.pointerId);
  };
  o.addEventListener("pointerup", v), o.addEventListener("pointercancel", v);
  let l = null;
  const x = () => {
    l == null || l.disconnect(), l = new IntersectionObserver((a) => {
      var s;
      for (const c of a) {
        if (!c.isIntersecting) continue;
        const u = (c.target.textContent || "").trim(), b = w(u);
        if (b) {
          for (const L of d.values()) L.classList.remove("active");
          (s = d.get(b.key)) == null || s.classList.add("active");
          break;
        }
      }
    }, {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0
    });
    const n = E();
    for (const a of n) {
      const s = a.textContent || "";
      w(s) && l.observe(a);
    }
  }, y = new MutationObserver(() => {
    window.setTimeout(x, 200);
  });
  return y.observe(document.body, { childList: !0, subtree: !0 }), window.setTimeout(x, 300), () => {
    l == null || l.disconnect(), y.disconnect(), e.remove();
  };
}
const F = I({
  name: "FactCheckDetailsLoader",
  setup() {
    const t = T("plugin:name"), e = M(() => {
      const o = t == null ? void 0 : t.value;
      return !!o && P.has(o);
    });
    let r = null;
    const i = () => {
      r == null || r(), r = null, e.value && (r = q());
    };
    return N(i), _(e, i), z(() => r == null ? void 0 : r()), () => A("div", { style: { display: "none" } });
  }
}), Y = (t) => {
  t.slot({
    type: "plugin-details",
    component: F,
    order: -999
  });
};
export {
  Y as default
};
