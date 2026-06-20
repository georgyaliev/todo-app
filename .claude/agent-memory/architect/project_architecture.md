---
name: project-architecture
description: Архитектурные решения и конвенции todo-app — структура, паттерны, соглашения
metadata:
  type: project
---

Трёхслойная архитектура: данные → логика → представление.

**Структура `src/`:**
- `types.ts` — интерфейс Todo, классы ошибок ValidationError/NotFoundError
- `models/Todo.ts` — фабрика createTodo()
- `services/StorageService.ts` — единственный доступ к localStorage
- `services/TodoService.ts` — единственное место хранения состояния, CRUD + onChange подписки
- `components/TodoForm.ts`, `TodoList.ts`, `TodoItem.ts` — DOM, колбэки наверх
- `main.ts` — сборка зависимостей, первый рендер
- `styles/main.css` — без препроцессора, CSS custom properties

**Ключевые конвенции:**
- Пользовательский текст — только через `textContent`, никогда `innerHTML` (XSS)
- StorageService не знает про бизнес-логику; TodoService не знает про DOM
- Поток данных однонаправленный: DOM event → main.ts → TodoService → onChange → render
- localStorage ключ: `"todos"`, значение: `JSON.stringify(Todo[])`
- ID задачи: `crypto.randomUUID()`

**Схема Todo:**
```typescript
interface Todo {
  id: string;        // UUID
  text: string;      // trimmed, 1-255 символов
  completed: boolean;
  createdAt: number; // Date.now()
}
```

**Технический долг (зафиксирован):**
- Полный ре-рендер списка — пересмотреть при > 1000 задач
- localStorage без версионирования схемы — добавить `version` при изменении структуры Todo
- Нет тестов — написать на TodoService перед следующей фичей
- Нет синхронизации вкладок — добавить `window.addEventListener('storage')` если нужно

**Why:** Документ зафиксирован 2026-06-19, решения приняты для MVP с нуля.

**How to apply:** Новый код вписывать в эту структуру. Не добавлять новые слои без явного обсуждения.
