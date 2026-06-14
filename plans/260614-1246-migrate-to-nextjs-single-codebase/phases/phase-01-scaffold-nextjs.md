# Phase 01 — Scaffold Next.js + Tailwind + shadcn + design tokens

**Priority:** P0 · **Status:** ⬜

## Mục tiêu
Tạo app Next.js (App Router, TS) trong `app/`, cài Tailwind + shadcn, port "Claude design system".

## Việc
1. `create-next-app` (TS, App Router, src dir, Tailwind, ESLint). Thư mục `app/`.
2. shadcn/ui init (`components.json`), base components: button, dialog, sheet, scroll-area, badge, skeleton, toast.
3. `tailwind.config.ts`: map tokens vào theme + CSS vars trong `globals.css`:
   - light: `--bg:#f5f4ed; --surface:#faf9f5; --fg:#141413; --muted:#5e5d59; --border:#e8e6dc; --primary:#c96442`
   - dark: như `html[data-theme=dark]` hiện tại
   - category colors: tech/science/news/biz/world
   - fonts: body `system-ui`, display `Georgia, serif` (`--font-display`)
4. Dark mode: `darkMode:['selector','[data-theme="dark"]']`, theme provider set `data-theme`.
5. `next.config`: `output:'standalone'` (Docker), images remotePatterns (vnecdn, tinhte, google favicons).

## Success
- `npm run dev` → trang trắng có nền parchment + nút shadcn đúng tông terracotta, dark mode toggle chạy.
