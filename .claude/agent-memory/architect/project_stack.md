---
name: project-stack
description: Выбранный стек для todo-app — Vanilla TypeScript + Vite, без фреймворка
metadata:
  type: project
---

Стек: **Vanilla TypeScript + Vite** (без React и других UI-фреймворков).

**Why:** Приложение — одна страница, три операции. React добавил бы 150+ KB рантайма без выгоды. Vanilla TS даёт нулевые рантайм-зависимости, полный контроль над DOM, < 100 мс отклик гарантирован.

**How to apply:** Не предлагать React/Vue/Svelte без явного запроса. Если проект вырастет в multi-feature SPA — тогда обсуждать миграцию.

Архитектурный документ: docs/architecture/todo-list-core.md
