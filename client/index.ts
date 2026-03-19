import { Context } from '@koishijs/client'
import { computed, defineComponent, inject, onBeforeUnmount, onMounted, type ComputedRef, watch, h } from 'vue'

type NavSection = {
  key: 'base' | 'tool' | 'search' | 'web_fetch' | 'jina'
  title: string
}

type NavGroup = {
  title: string
  sections: NavSection[]
}

const PLUGIN_NAMES = new Set([
  'isthattrue', // legacy package name
  'chatluna-fact-check',
  'koishi-plugin-isthattrue', // legacy package name
  'koishi-plugin-chatluna-fact-check',
])

function isFactCheckPluginName(name: string | undefined): boolean {
  if (!name) return false
  if (PLUGIN_NAMES.has(name)) return true
  for (const pluginName of PLUGIN_NAMES) {
    if (name.startsWith(`${pluginName}:`)) return true
  }
  return false
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: '基础',
    sections: [
      { key: 'base', title: '基础设置' },
      { key: 'tool', title: '工具设置' },
    ],
  },
  {
    title: '搜索与抓取',
    sections: [
      { key: 'search', title: '搜索设置' },
      { key: 'web_fetch', title: '网页抓取设置' },
      { key: 'jina', title: 'Jina 设置' },
    ],
  },
] 

const NAV_SECTIONS: NavSection[] = NAV_GROUPS.flatMap((group) => group.sections)
const SECTION_TITLE_ALIASES: Record<NavSection['key'], string[]> = {
  base: ['基础设置'],
  tool: ['工具设置', '工具配置'],
  search: ['搜索设置', '搜索配置'],
  web_fetch: ['网页抓取设置', '网页抓取配置'],
  jina: ['Jina 设置', 'Jina 配置'],
}

const STYLE_ID = 'isthattrue-nav-style'

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
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
`
  document.head.appendChild(style)
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, '').trim()
}

function getSectionNodes() {
  return Array.from(document.querySelectorAll<HTMLElement>(
    '.k-schema-section-title, .k-schema-header, h2.k-schema-header'
  ))
}

function findHeaderBySection(section: NavSection) {
  const targets = [section.title, ...(SECTION_TITLE_ALIASES[section.key] || [])]
    .map(item => normalizeText(item))
    .filter(Boolean)
  const headers = getSectionNodes()
  for (const header of headers) {
    const text = normalizeText(header.textContent || '')
    if (!text) continue
    if (targets.some(target => text.includes(target))) return header
  }
  return null
}

function matchSectionByHeaderText(text: string): NavSection | undefined {
  const normalized = normalizeText(text)
  return NAV_SECTIONS.find((section) => {
    const candidates = [section.title, ...(SECTION_TITLE_ALIASES[section.key] || [])]
      .map(item => normalizeText(item))
      .filter(Boolean)
    return candidates.some(candidate => normalized.includes(candidate))
  })
}

function mountFloatingNav() {
  ensureStyle()

  const existing = document.querySelector<HTMLElement>('.isthattrue-nav')
  existing?.remove()

  const root = document.createElement('div')
  root.className = 'isthattrue-nav'
  root.innerHTML = `
<div class="isthattrue-nav-header">
  <span class="isthattrue-nav-handle">⋮⋮</span>
  <button class="isthattrue-nav-toggle" type="button">−</button>
</div>
<div class="isthattrue-nav-body"></div>
`
  document.body.appendChild(root)

  root.style.top = '260px'
  root.style.right = '60px'

  const body = root.querySelector<HTMLElement>('.isthattrue-nav-body')!
  const toggle = root.querySelector<HTMLButtonElement>('.isthattrue-nav-toggle')!
  const header = root.querySelector<HTMLElement>('.isthattrue-nav-header')!

  const itemMap = new Map<string, HTMLButtonElement>()
  for (const group of NAV_GROUPS) {
    const sectionEl = document.createElement('div')
    sectionEl.className = 'isthattrue-nav-section'

    const sectionTitle = document.createElement('div')
    sectionTitle.className = 'isthattrue-nav-section-title'
    sectionTitle.textContent = group.title
    sectionEl.appendChild(sectionTitle)

    for (const section of group.sections) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'isthattrue-nav-item'
      button.textContent = section.title
      button.addEventListener('click', () => {
        const target = findHeaderBySection(section)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
      sectionEl.appendChild(button)
      itemMap.set(section.key, button)
    }
    body.appendChild(sectionEl)
  }

  toggle.addEventListener('click', (event) => {
    event.stopPropagation()
    const collapsed = root.classList.toggle('collapsed')
    toggle.textContent = collapsed ? '+' : '−'
  })

  let dragStartX = 0
  let dragStartY = 0
  let startRight = 0
  let startTop = 0

  header.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement
    if (target.closest('.isthattrue-nav-toggle')) return
    event.preventDefault()
    header.setPointerCapture(event.pointerId)
    dragStartX = event.clientX
    dragStartY = event.clientY
    startRight = parseFloat(root.style.right || '60')
    startTop = parseFloat(root.style.top || '260')
  })

  header.addEventListener('pointermove', (event) => {
    if (!header.hasPointerCapture(event.pointerId)) return
    const dx = event.clientX - dragStartX
    const dy = event.clientY - dragStartY
    root.style.top = `${Math.max(0, startTop + dy)}px`
    root.style.right = `${Math.max(0, startRight - dx)}px`
  })

  const onPointerEnd = (event: PointerEvent) => {
    if (header.hasPointerCapture(event.pointerId)) {
      header.releasePointerCapture(event.pointerId)
    }
  }
  header.addEventListener('pointerup', onPointerEnd)
  header.addEventListener('pointercancel', onPointerEnd)

  let observer: IntersectionObserver | null = null
  const refreshActive = () => {
    observer?.disconnect()
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const text = (entry.target.textContent || '').trim()
        const section = matchSectionByHeaderText(text)
        if (!section) continue
        for (const item of itemMap.values()) item.classList.remove('active')
        itemMap.get(section.key)?.classList.add('active')
        break
      }
    }, {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    })

    const headers = getSectionNodes()
    for (const node of headers) {
      const text = node.textContent || ''
      if (matchSectionByHeaderText(text)) {
        observer.observe(node)
      }
    }
  }

  const mutationObserver = new MutationObserver(() => {
    window.setTimeout(refreshActive, 200)
  })
  mutationObserver.observe(document.body, { childList: true, subtree: true })

  window.setTimeout(refreshActive, 300)

  return () => {
    observer?.disconnect()
    mutationObserver.disconnect()
    root.remove()
  }
}

const FactCheckDetailsLoader = defineComponent({
  name: 'FactCheckDetailsLoader',
  setup() {
    const pluginName = inject<ComputedRef<string>>('plugin:name')
      const isOwn = computed(() => {
        const current = pluginName?.value
        return isFactCheckPluginName(current)
      })

    let dispose: (() => void) | null = null

    const tryMount = () => {
      dispose?.()
      dispose = null
      if (!isOwn.value) return
      dispose = mountFloatingNav()
    }

    onMounted(tryMount)
    watch(isOwn, tryMount)
    onBeforeUnmount(() => dispose?.())
    return () => h('div', { style: { display: 'none' } })
  },
})

export default (ctx: Context) => {
  ctx.slot({
    type: 'plugin-details',
    component: FactCheckDetailsLoader,
    order: -999,
  })
}
