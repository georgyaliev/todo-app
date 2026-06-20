---
name: project-hosting
description: Платформы деплоя проекта — Netlify (ручной) и GitHub Pages (автоматический через GitHub Actions)
metadata:
  type: project
---

Проект поддерживает два варианта деплоя:

**1. Netlify** — ручной drag-and-drop и CLI-деплой.
`netlify.toml` в корне: команда `npm run build`, папка `dist`, security headers, NODE_VERSION=22.
Используется для быстрого ручного деплоя без git.

**2. GitHub Pages** — автоматический деплой через GitHub Actions.
Remote: `https://github.com/georgyaliev/todo-app.git` (username: `georgyaliev`).
Сайт: `https://georgyaliev.github.io/todo-app/`
Пайплайн: `.github/workflows/deploy.yml` — push в `main` → тесты → сборка → деплой.
`vite.config.ts` содержит `base: '/todo-app/'` — обязательно для корректных путей на GitHub Pages.

**Why:** Пользователь запросил GitHub Actions CI/CD как основной автодеплой. Netlify остаётся как запасной вариант для ручного деплоя.

**How to apply:** При изменении `vite.config.ts` не удалять `base: '/todo-app/'` — без него ассеты сломаются на GitHub Pages. При добавлении новых workflow учитывать существующий `deploy.yml`. Netlify-конфиг (`netlify.toml`) не трогать — он нужен для ручного варианта.

Связанные решения:
- `tsconfig.build.json` отделяет тесты от продакшен-компиляции ([[project-build-config]])
- `netlify.toml` содержит security headers, NODE_VERSION=22
- GitHub Actions workflow: `.github/workflows/deploy.yml`
