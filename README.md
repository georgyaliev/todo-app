# Todo App

Минималистичный менеджер задач. Vanilla TypeScript + Vite, данные хранятся в localStorage.

## Локальная разработка

```bash
npm install
npm run dev       # http://localhost:5173
```

## Тесты

```bash
npm run test               # запуск всех тестов
npm run test:coverage      # с отчётом покрытия
```

## Автоматический деплой (GitHub Pages)

[![Deploy to GitHub Pages](https://github.com/georgyaliev/todo-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/georgyaliev/todo-app/actions/workflows/deploy.yml)

Сайт: **https://georgyaliev.github.io/todo-app/**

Каждый `git push` в ветку `main` автоматически запускает пайплайн:
тесты → сборка → деплой. Если тесты падают — деплой не происходит.

### Подключение GitHub Pages (один раз, после первого пуша)

1. Открой репозиторий на GitHub → **Settings → Pages**.
2. В разделе **Build and deployment** выбери **Source: GitHub Actions**.
3. Сохрани. После следующего пуша в `main` сайт станет доступен по адресу выше.

---

## Деплой на Netlify

### Вариант A: Drag-and-drop (без git, 1 минута)

1. Собери проект локально:
   ```bash
   npm run build
   ```
2. Открой [app.netlify.com](https://app.netlify.com) и войди в аккаунт (или зарегистрируйся бесплатно).
3. На главной странице найди блок **"Deploy manually"** → перетащи папку `dist/` прямо в браузер.
4. Netlify выдаст случайный URL вида `https://amazing-name-123.netlify.app` — сайт уже доступен.
5. (Опционально) В настройках сайта → **Domain settings** → задай собственное имя или подключи свой домен.

### Вариант B: Через Netlify CLI (если уже есть Node)

```bash
npm install -g netlify-cli   # один раз
npm run build
netlify deploy --dir=dist    # черновой деплой для проверки
netlify deploy --dir=dist --prod   # деплой в продакшен
```

### Вариант C: Автодеплой из git (после инициализации репозитория)

1. Запушь проект на GitHub/GitLab.
2. В Netlify: **Add new site → Import an existing project**.
3. Выбери репозиторий. Netlify автоматически обнаружит `netlify.toml` и настроит:
   - команда сборки: `npm run build`
   - папка публикации: `dist`
4. Каждый `git push` в основную ветку запускает деплой автоматически.

## Откат (rollback)

В Netlify UI: **Deploys** → выбери любой предыдущий деплой → **Publish deploy**.  
Через CLI: `netlify rollback` (откатывает на предыдущую версию мгновенно).

## Структура проекта

```
src/
  components/   # UI-компоненты (TodoForm, TodoList, TodoCounter)
  models/       # доменные модели (Todo, TodoList)
  services/     # бизнес-логика (TodoService, StorageService)
  __tests__/    # тесты (45 unit-тестов)
  main.ts       # точка входа
  types.ts      # общие TypeScript-типы
  errors.ts     # кастомные ошибки
```
