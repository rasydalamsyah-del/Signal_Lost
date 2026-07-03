/* ============================================================
   assets/icons.js
   Original, hand-drawn SVG icons (not copied from any OS or app) —
   flat, two-tone line/fill style consistent with the Signal Lost
   design tokens. Every icon is an inner <svg> body string, sized
   on a 24x24 grid, so it drops straight into any wrapper.
   ============================================================ */

const ICONS = {
  // ---- app icons (used in the home-screen grid) ----
  dashchat: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.2 3.2c-.5.4-1.2 0-1.2-.6V16h-.1A2.5 2.5 0 0 1 4 13.5v-7Z" fill="currentColor"/><circle cx="8.5" cy="10" r="1.1" fill="#0B0D10"/><circle cx="12" cy="10" r="1.1" fill="#0B0D10"/><circle cx="15.5" cy="10" r="1.1" fill="#0B0D10"/></svg>`,

  contacts: `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="currentColor"/><circle cx="12" cy="10" r="2.6" fill="#0B0D10"/><path d="M7.5 16.8c.8-2 2.4-3 4.5-3s3.7 1 4.5 3" stroke="#0B0D10" stroke-width="1.4" stroke-linecap="round"/></svg>`,

  snaply: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="13" rx="3" fill="currentColor"/><path d="M8.5 6 10 3.8h4L15.5 6" fill="currentColor"/><circle cx="12" cy="12.5" r="3.6" fill="#0B0D10"/><circle cx="12" cy="12.5" r="1.7" fill="currentColor"/><circle cx="16.6" cy="9" r=".9" fill="#0B0D10"/></svg>`,

  stremly: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="12.5" rx="2.5" fill="currentColor"/><path d="M10 8.7 15 11l-5 2.3V8.7Z" fill="#0B0D10"/><path d="M8 20h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,

  gallery: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="currentColor"/><circle cx="8.3" cy="9.3" r="1.6" fill="#0B0D10"/><path d="M4 17.5 9 12l3.2 3.2L15 12l5.5 5.5" stroke="#0B0D10" stroke-width="1.6" stroke-linejoin="round" fill="none"/></svg>`,

  storage: `<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 9.5a4.5 4.5 0 0 1 8.7-1.6A4 4 0 0 1 18 15.5H7A3.5 3.5 0 0 1 6.5 9.5Z" fill="currentColor"/><path d="M12 11v5.3M12 16.3l-2-2M12 16.3l2-2" stroke="#0B0D10" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  myshop: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 8.5h12l-.9 9.3a2 2 0 0 1-2 1.7H8.9a2 2 0 0 1-2-1.7L6 8.5Z" fill="currentColor"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" stroke="#0B0D10" stroke-width="1.6" stroke-linecap="round"/></svg>`,

  location: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.8c-3.4 0-6.2 2.7-6.2 6.2 0 4.6 6.2 12.2 6.2 12.2s6.2-7.6 6.2-12.2c0-3.5-2.8-6.2-6.2-6.2Z" fill="currentColor"/><circle cx="12" cy="9" r="2.3" fill="#0B0D10"/></svg>`,

  calendar: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="currentColor"/><rect x="3.5" y="5" width="17" height="4" rx="2" fill="#0B0D10" opacity=".35"/><path d="M8 3.3v3.4M16 3.3v3.4" stroke="#0B0D10" stroke-width="1.6" stroke-linecap="round"/><rect x="7" y="12" width="3" height="3" rx=".6" fill="#0B0D10"/><rect x="13.7" y="12" width="3" height="3" rx=".6" fill="#0B0D10"/></svg>`,

  settings: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.6l1.6 1.9 2.4-.6 1.1 2.2 2.4.5-.1 2.5 1.9 1.5-1.5 1.9.6 2.4-2.3 1-.6 2.4-2.4-.4-1.6 1.9-2.2-1.2-2.4.5-1-2.2-2.4-.5.2-2.5-1.9-1.5 1.4-1.9-.5-2.4 2.3-1 .6-2.4 2.4.4L9.6 2.6l2.2 1.2Z" fill="currentColor" opacity=".9"/><circle cx="12" cy="12" r="3.4" fill="#0B0D10"/></svg>`,

  // ---- misc ----
  arrowBack: `<svg viewBox="0 0 24 24" fill="none"><path d="M15 4.5 6.5 12l8.5 7.5" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.6" stroke="currentColor" stroke-width="2.1" fill="none"/></svg>`,
  recent: `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" stroke-width="2.1" fill="none"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" fill="currentColor"/></svg>`,
  chevronUp: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  wifi: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 9.5a13 13 0 0 1 18 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".55"/><path d="M6.2 13a8.4 8.4 0 0 1 11.6 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".8"/><path d="M9.4 16.4a3.9 3.9 0 0 1 5.2 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="12" cy="19" r="1.1" fill="currentColor"/></svg>`
};

// per-app icon background: [gradient-from, gradient-to]
const ICON_BG = {
  dashchat: ['#5DEFDF', '#2BB8AA'],
  contacts: ['#A6B4FF', '#7C8CFF'],
  snaply:   ['#FFA0C6', '#FF6FA0'],
  stremly:  ['#CBA6FF', '#9F6BFF'],
  gallery:  ['#FFD48A', '#FFAE4C'],
  storage:  ['#8CFFC0', '#4FE894'],
  myshop:   ['#FFE58A', '#FFCC4C'],
  location: ['#8FE0FF', '#4CC3F5'],
  calendar: ['#FFB08A', '#FF7E4C'],
  settings: ['#9AA5B1', '#6B7580']
};
