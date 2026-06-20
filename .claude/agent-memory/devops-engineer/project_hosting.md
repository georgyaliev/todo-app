---
name: project-hosting
description: Выбранная платформа деплоя и обоснование — Netlify для статического сайта без CI/CD
metadata:
  type: project
---

Выбранная платформа деплоя: **Netlify** (drag-and-drop ручной деплой).

**Why:** Проект — чистый статический сайт (Vanilla TS + Vite, localStorage), git-репозиторий отсутствует. Netlify позволяет деплоить папку `dist/` без git через браузер за 30 секунд. Когда появится git — Netlify поддерживает автодеплой без смены платформы.

**How to apply:** При любых следующих DevOps-задачах в этом проекте считать Netlify основной платформой. `netlify.toml` уже в корне проекта. Не предлагать GitHub Pages без явной просьбы — там нужен git и настройка `base` URL.

Связанные решения:
- `tsconfig.build.json` отделяет тесты от продакшен-компиляции ([[project-build-config]])
- `netlify.toml` содержит security headers, NODE_VERSION=22
