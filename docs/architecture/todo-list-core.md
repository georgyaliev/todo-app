# Техническое решение: Todo List Core (MVP)

## Контекст и ограничения

- Проект с нуля, стек свободен
- Одиночный пользователь, один браузер, нет бэкенда
- MVP: добавление / toggle / удаление / localStorage
- До 500 задач, отклик UI < 100 мс
- Интерфейс: русский язык
- Браузеры: Chrome, Firefox, Safari (последние 2 версии)
- Адаптивность: 320px – 1920px

---

## Выбор стека

### Решение: Vanilla TypeScript + Vite (без фреймворка)

| Критерий | Vanilla TS + Vite | React + Vite |
|---|---|---|
| Объём бандла | ~5 KB (только наш код) | ~150 KB (React runtime) |
| Скорость запуска | Мгновенная | Мгновенная |
| Сложность кода | Минимальная | Избыточная для 1 компонента |
| Кривая обучения | Нет | Требует знания React |
| Масштабируемость | Требует рефакторинга при росте | Готова к росту |

**Обоснование выбора Vanilla TS + Vite:**
Приложение — одна страница с тремя операциями. React добавляет 150+ KB рантайма, виртуальный DOM и концепции (хуки, JSX), которые здесь ничего не дают. Vanilla TS даёт полный контроль, нулевые зависимости в рантайме, < 100 мс отклик гарантирован без виртуального DOM. Vite обеспечивает TypeScript out-of-the-box, HMR при разработке и оптимальный продакшн-бандл.

Если проект перерастёт в multi-feature SPA (фильтры, несколько списков, синхронизация) — миграция на React потребует переписать слой представления, но модели данных и сервисы останутся без изменений.

---

## Архитектура

### Компоненты и их ответственность

Архитектура трёхслойная: данные → логика → представление.

```
src/
├── main.ts              # Точка входа: инициализация, сборка зависимостей
├── types.ts             # Типы и интерфейсы
│
├── models/
│   └── Todo.ts          # Тип Todo, фабрика createTodo()
│
├── services/
│   ├── TodoService.ts   # Бизнес-логика: CRUD, валидация
│   └── StorageService.ts # localStorage: сериализация/десериализация
│
├── components/
│   ├── TodoForm.ts      # Поле ввода + кнопка добавления
│   ├── TodoItem.ts      # Строка задачи: checkbox + текст + удалить
│   └── TodoList.ts      # Контейнер списка + пустое состояние + счётчик
│
└── styles/
    └── main.css         # CSS с custom properties, без препроцессора
```

**Ответственность:**

- `StorageService` — единственный, кто знает про localStorage. Методы: `load(): Todo[]`, `save(todos: Todo[]): void`. Не знает про бизнес-логику.
- `TodoService` — единственный, кто хранит состояние (`Todo[]`). Методы: `add`, `toggle`, `remove`, `getAll`, `getActiveCount`. Вызывает StorageService при каждом изменении. Не знает про DOM.
- `TodoForm`, `TodoItem`, `TodoList` — рендерят DOM и пробрасывают события наверх через колбэки. Не хранят бизнес-состояние.
- `main.ts` — собирает зависимости, подписывает компоненты на события TodoService, вызывает первый рендер.

### Схема данных

**Тип `Todo`:**
```typescript
interface Todo {
  id: string;         // crypto.randomUUID() — уникален, не угадываем
  text: string;       // 1..255 символов, trimmed
  completed: boolean; // false при создании
  createdAt: number;  // Date.now() — для сортировки и отладки
}
```

**Формат в localStorage:**
```
ключ: "todos"
значение: JSON.stringify(Todo[])
```

Пример:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "Купить молоко",
    "completed": false,
    "createdAt": 1718800000000
  }
]
```

Порядок отображения — по индексу массива (append-only), `createdAt` дублирует его для надёжности.

### API-контракты между модулями

**StorageService:**
```typescript
interface IStorageService {
  load(): Todo[];          // Возвращает [] при отсутствии/ошибке парсинга
  save(todos: Todo[]): void; // Тихо глотает ошибку QuotaExceededError (логирует в console.warn)
}
```

**TodoService:**
```typescript
interface ITodoService {
  getAll(): Todo[];
  getActiveCount(): number;
  add(text: string): Todo;      // Бросает ValidationError если невалидно
  toggle(id: string): Todo;     // Бросает NotFoundError если id не найден
  remove(id: string): void;     // Бросает NotFoundError если id не найден
  onChange(listener: () => void): void; // Подписка на любое изменение
}
```

**Колбэки компонентов (события наверх):**
```typescript
// TodoForm
onAdd: (text: string) => void

// TodoItem
onToggle: (id: string) => void
onRemove: (id: string) => void

// TodoList
// Не генерирует события, только рендерит
```

**Поток данных (однонаправленный):**
```
Пользователь
  → Component (DOM event)
    → main.ts (колбэк)
      → TodoService.add/toggle/remove()
        → StorageService.save()
        → onChange listeners
          → main.ts
            → TodoList.render(todoService.getAll())
```

---

## Безопасность и качество

**Валидация на входе (TodoService.add):**
- `text.trim().length === 0` → ValidationError "Введите текст задачи"
- `text.trim().length > 255` → ValidationError "Текст не должен превышать 255 символов"
- Trim применяется перед сохранением

**XSS-защита:**
- Весь пользовательский текст вставляется через `element.textContent`, никогда через `innerHTML`
- Единственное исключение — статичная разметка шаблонов (без пользовательских данных)

**localStorage квота (~5 MB):**
- 500 задач × 300 байт = ~150 KB — в 30 раз меньше лимита, риска нет
- Обёртка `save()` логирует `QuotaExceededError` в `console.warn`, не падает

**Доступность (a11y):**
- Checkbox для toggle: нативный `<input type="checkbox">`, label привязан через `htmlFor`
- Кнопка удаления: `aria-label="Удалить задачу: {текст}"`, чтобы скринридер понимал контекст
- Форма: `<form>` с `submit` событием — Enter работает нативно без JS-костылей
- Tab-порядок: форма → список задач (checkbox → кнопка удалить) — естественный DOM-порядок

**Производительность (500 задач):**
- При каждом изменении — полный ре-рендер `TodoList` (innerHTML замена)
- 500 строк × DOM-операция < 16 мс — укладывается в 60 FPS
- Оптимизация (виртуализация, дифференциальный рендеринг) — не нужна для MVP

---

## План реализации

### Шаг 1. Инициализация проекта (зависимости: нет)
```bash
npm create vite@latest . -- --template vanilla-ts
npm install
```
Удалить из шаблона: `counter.ts`, `typescript.svg`, лишнее из `main.ts` и `style.css`.
Проверить: `npm run dev` — открывается пустая страница.

### Шаг 2. Типы и модель (зависимости: Шаг 1)
Создать `src/types.ts` с интерфейсом `Todo` и классами ошибок `ValidationError`, `NotFoundError`.
Создать `src/models/Todo.ts` с фабрикой `createTodo(text: string): Todo`.

### Шаг 3. StorageService (зависимости: Шаг 2)
Реализовать `src/services/StorageService.ts`.
- `load()`: `JSON.parse(localStorage.getItem('todos') ?? '[]')` в try/catch → возврат `[]`
- `save()`: `localStorage.setItem('todos', JSON.stringify(todos))` в try/catch
Проверить в консоли браузера вручную.

### Шаг 4. TodoService (зависимости: Шаг 3)
Реализовать `src/services/TodoService.ts` с полным CRUD и системой подписок `onChange`.
- `add()` валидирует и бросает `ValidationError`
- После каждого изменения вызывает `storage.save()` и всех `onChange`-листенеров
Проверить в консоли браузера: создать, переключить, удалить, перезагрузить → данные восстановились.

### Шаг 5. HTML-скелет и CSS (зависимости: Шаг 1)
Разметить `index.html`:
```html
<main class="app">
  <h1>Мои задачи</h1>
  <form id="todo-form">...</form>
  <p id="todo-counter"></p>
  <ul id="todo-list"></ul>
</main>
```
Написать CSS: CSS custom properties для цветов, флекс-лейаут, адаптивность через `max-width` + padding, стиль выполненной задачи (`text-decoration: line-through`, снижение opacity).

### Шаг 6. Компонент TodoItem (зависимости: Шаг 2, Шаг 5)
`src/components/TodoItem.ts` — функция `createTodoItem(todo, {onToggle, onRemove}): HTMLElement`.
Возвращает `<li>` с checkbox, `<span>` (textContent, не innerHTML), кнопкой удаления.

### Шаг 7. Компонент TodoList (зависимости: Шаг 6)
`src/components/TodoList.ts` — класс или объект с методом `render(todos: Todo[], count: number): void`.
Полностью перестраивает `<ul>` и обновляет счётчик. При пустом массиве — вставляет заглушку.

### Шаг 8. Компонент TodoForm (зависимости: Шаг 5)
`src/components/TodoForm.ts` — навешивает обработчик на `form submit`, вызывает `onAdd(input.value)`, показывает ошибку валидации в `<span>` рядом с полем.

### Шаг 9. Сборка в main.ts (зависимости: Шаги 4, 7, 8)
```typescript
const storage = new StorageService();
const service = new TodoService(storage);
const list = new TodoList(document.getElementById('todo-list')!);
const form = new TodoForm(document.getElementById('todo-form')!, {
  onAdd: (text) => {
    service.add(text);
    form.clear();
  }
});
service.onChange(() => {
  list.render(service.getAll(), service.getActiveCount());
});
// Первый рендер
list.render(service.getAll(), service.getActiveCount());
```

### Шаг 10. Финальная проверка (зависимости: Шаг 9)
Пройти по всем критериям приёмки из `docs/requirements/todo-list-core.md`:
- Добавление валидного текста, пустого, > 255 символов
- Toggle туда-обратно, счётчик
- Удаление, удаление последней задачи
- Перезагрузка страницы — данные сохранились
- Resize до 320px — вёрстка не ломается
- Tab-навигация — всё доступно с клавиатуры

---

## Технический долг / компромиссы

| Решение | Компромисс | Когда пересматривать |
|---|---|---|
| Полный ре-рендер списка при каждом изменении | Простота vs эффективность. При 500 задачах — ок. При 5000 — мерцание | При жалобах на производительность или лимите > 1000 |
| `innerHTML = ''` + вставка элементов | Быстрее написать, но теряем DOM-состояние (фокус, анимации) | Если добавим CSS-анимации удаления или inline-редактирование |
| Один файл `main.css` без препроцессора | Проще для MVP. При росте — отсутствие переменных области видимости | При добавлении тем или > 300 строк CSS |
| Нет тестов | Скорость MVP vs надёжность | Перед добавлением следующей фичи — написать тесты на TodoService |
| localStorage без версионирования схемы | Если изменим структуру Todo — старые данные сломают парсинг | При любом изменении структуры Todo добавить поле `version` и миграцию |
| Нет обработки конкурентных вкладок | Две вкладки с приложением рассинхронизируются | Добавить `window.addEventListener('storage', ...)` для синхронизации |
