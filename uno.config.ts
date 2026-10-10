import { defineConfig, presetWind3 } from 'unocss'

export default defineConfig({
  presets: [presetWind3()],

  content: {
    pipeline: {
      include: [/\.(vue|md|ts)($|\?)/],
    },
  },

  theme: {
    colors: {
      'ch-bg':          'var(--ch-bg)',
      'ch-bg-soft':     'var(--ch-bg-soft)',
      'ch-bg-card':     'var(--ch-bg-card)',
      'ch-bg-panel':    'var(--ch-bg-panel)',
      'ch-border':      'var(--ch-border)',
      'ch-border-hover':'var(--ch-border-hover)',
      'ch-accent':      'var(--ch-accent)',
      'ch-accent-soft': 'var(--ch-accent-soft)',
      'ch-text-1':      'var(--ch-text-1)',
      'ch-text-2':      'var(--ch-text-2)',
      'ch-text-3':      'var(--ch-text-3)',
    },
  },

  shortcuts: [
    // Card: block link card with border + hover accent
    ['ch-card', 'relative block rounded-[10px] border border-[var(--ch-border)] bg-[var(--ch-bg-card)] p-[18px] no-underline transition-[border-color,box-shadow,transform] duration-200 overflow-hidden color-[var(--ch-text-1)] hover:border-[var(--ch-border-hover)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:translate-y-[-2px]'],

    // Tabs
    ['ch-tab-btn', 'px-3 py-1 text-[0.875em] rounded border border-transparent color-[var(--ch-text-2)] cursor-pointer bg-transparent transition-colors duration-150'],
    ['ch-tab-btn-active', 'border-[var(--ch-accent)] color-[var(--ch-accent)] bg-[var(--ch-accent-soft)]'],

    // Badge base
    ['ch-badge', 'inline-block px-2 py-[2px] rounded-[10px] text-[11px] font-medium'],

    // Difficulty badges
    ['ch-badge-easy',    'ch-badge bg-[var(--ch-easy-bg)] color-[var(--ch-easy-fg)]'],
    ['ch-badge-medium',  'ch-badge bg-[var(--ch-med-bg)]  color-[var(--ch-med-fg)]'],
    ['ch-badge-hard',    'ch-badge bg-[var(--ch-hard-bg)] color-[var(--ch-hard-fg)]'],
    ['ch-badge-mystery', 'ch-badge bg-[var(--ch-myst-bg)] color-[var(--ch-myst-fg)]'],

    // Category badges
    ['ch-badge-web',     'ch-badge bg-[var(--ch-web-bg)]  color-[var(--ch-web-fg)]'],

    // Completion badge. Named here rather than spelled out at each of the three call
    // sites so the list rows, the list cards and the challenge page's nav cannot drift
    // apart — "completed" has to look like one thing wherever it appears.
    ['ch-badge-done',    'ch-badge inline-flex items-center gap-1 bg-[var(--ch-done-bg)] color-[var(--ch-done-fg)]'],

    // Note cards
    ['ch-note-card', 'block rounded-lg border border-[var(--ch-border)] bg-[var(--ch-bg-card)] p-3 cursor-pointer transition-[border-color] duration-150 hover:border-[var(--ch-border-hover)]'],
    ['ch-note-card-selected', 'border-[var(--ch-accent)]'],

    // Merged nav
    ['ch-nav-icon-btn', 'flex items-center justify-center w-[28px] h-[28px] rounded border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)] cursor-pointer hover:border-[var(--ch-accent)] transition-colors'],
    ['ch-nav-pill-btn', 'flex items-center gap-1 px-2 py-1 text-[0.8125em] rounded border border-[var(--ch-border)] bg-[var(--ch-bg-soft)] color-[var(--ch-text-1)] cursor-pointer hover:border-[var(--ch-accent)] transition-colors'],
    ['ch-nav-sep', 'color-[var(--ch-text-3)] text-[0.75em] shrink-0'],

    // Challenge list redesign
    ['ch-input', 'px-3 py-1.5 rounded-lg border border-[var(--ch-border)] bg-[var(--ch-bg)] color-[var(--ch-text-1)] text-sm outline-none focus:border-[var(--ch-accent)] transition-colors'],
    ['ch-select', 'px-3 py-1.5 rounded-lg border border-[var(--ch-border)] bg-[var(--ch-bg)] color-[var(--ch-text-1)] text-sm outline-none focus:border-[var(--ch-accent)] transition-colors cursor-pointer appearance-none'],
    ['ch-view-btn', 'px-2 py-1 rounded border border-[var(--ch-border)] bg-transparent color-[var(--ch-text-2)] cursor-pointer transition-colors hover:border-[var(--ch-accent)] hover:color-[var(--ch-accent)]'],
    ['ch-view-btn-active', 'px-2 py-1 rounded border border-[var(--ch-accent)] bg-[var(--ch-accent-soft)] color-[var(--ch-accent)] cursor-pointer'],
    ['ch-tag', 'inline-block px-1.5 py-[1px] rounded text-[10px] bg-[var(--ch-bg-soft)] color-[var(--ch-text-2)] border border-[var(--ch-border)]'],
    ['ch-list-row', 'flex flex-col gap-1 px-4 py-3 border-b border-[var(--ch-border)] border-l-2 border-l-transparent cursor-pointer transition-[background-color,border-color] duration-150 hover:bg-[var(--ch-bg-soft)] hover:border-l-[var(--ch-accent)]'],
  ],
})
