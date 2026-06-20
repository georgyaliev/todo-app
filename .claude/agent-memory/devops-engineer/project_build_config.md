---
name: project-build-config
description: Особенности конфигурации сборки — разделение tsconfig для prod и тестов
metadata:
  type: project
---

**tsconfig разделён на два файла:**
- `tsconfig.json` — базовый, включает весь `src/` (используется IDE и vitest)
- `tsconfig.build.json` — расширяет базовый, исключает `src/__tests__/` (используется командой `build`)

**Why:** `tsconfig.json` включает `src/` целиком, в том числе тестовые файлы. В тестовом файле `TodoService.test.ts` импортируется `beforeEach` из vitest без использования, что вызывает ошибку `noUnusedLocals` при продакшен-сборке. Менять тестовый код — не задача DevOps, поэтому тесты исключены из сборочного tsconfig.

**How to apply:** Скрипт `build` в `package.json` использует `tsc -p tsconfig.build.json`. Не менять на просто `tsc` — сборка сломается. Vitest использует `vitest.config.ts`, который не зависит от tsconfig.build.json.

Связанные решения: [[project-hosting]]
