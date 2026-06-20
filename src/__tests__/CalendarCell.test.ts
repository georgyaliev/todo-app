/**
 * Unit-тесты для CalendarCell и вспомогательного getTooltip (singleton).
 *
 * Покрывает:
 *  - createCalendarCell рендерит корректную DOM-структуру
 *  - getTooltip singleton: при множественных вызовах создаётся ровно один <div.cal-tooltip>
 *  - Tooltip использует textContent (не innerHTML)
 *  - Проверка scrollWidth > clientWidth перед показом тултипа
 *  - Тултип скрывается при mouseleave
 *  - "+N ещё" button появляется при > VISIBLE_LIMIT задач
 *  - Клик по ячейке не срабатывает при клике на todo-item
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCalendarCell } from '../components/calendar/CalendarCell';
import type { GridCell } from '../utils/dateUtils';
import type { Todo } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCell(overrides: Partial<GridCell> = {}): GridCell {
  return {
    date: '2026-06-15',
    isCurrentMonth: true,
    isToday: false,
    ...overrides,
  };
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: `todo-${Math.random()}`,
    text: 'Test task',
    completed: false,
    createdAt: Date.now(),
    dueDate: '2026-06-15',
    ...overrides,
  };
}

function makeCallbacks() {
  return {
    onToggle: vi.fn(),
    onRemove: vi.fn(),
    onCellClick: vi.fn(),
    onShowMore: vi.fn(),
    onAddInline: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Cleanup: удаляем tooltip-синглтон между тестами, мокаем matchMedia
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.querySelectorAll('.cal-tooltip').forEach((el) => el.remove());

  // jsdom не реализует window.matchMedia — мокаем по умолчанию как "не мобайл"
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false, // desktop: (max-width: 480px) → false
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

// ---------------------------------------------------------------------------
// createCalendarCell — структура
// ---------------------------------------------------------------------------

describe('createCalendarCell() — DOM структура', () => {
  it('возвращает <li> элемент', () => {
    const li = createCalendarCell(makeCell(), [], makeCallbacks(), vi.fn());
    expect(li.tagName).toBe('LI');
  });

  it('добавляет класс cal-cell для текущего месяца', () => {
    const li = createCalendarCell(makeCell({ isCurrentMonth: true }), [], makeCallbacks(), vi.fn());
    expect(li.classList.contains('cal-cell')).toBe(true);
    expect(li.classList.contains('cal-cell--tail')).toBe(false);
  });

  it('добавляет класс cal-cell--tail для ячеек вне текущего месяца', () => {
    const li = createCalendarCell(makeCell({ isCurrentMonth: false }), [], makeCallbacks(), vi.fn());
    expect(li.classList.contains('cal-cell--tail')).toBe(true);
  });

  it('отображает номер дня', () => {
    const li = createCalendarCell(makeCell({ date: '2026-06-15' }), [], makeCallbacks(), vi.fn());
    const numEl = li.querySelector('.cal-cell__num');
    expect(numEl?.textContent).toBe('15');
  });

  it('для isToday=true добавляет span.cal-cell__num--today', () => {
    const li = createCalendarCell(makeCell({ isToday: true }), [], makeCallbacks(), vi.fn());
    const todaySpan = li.querySelector('.cal-cell__num--today');
    expect(todaySpan).not.toBeNull();
  });

  it('для isToday=false нет span.cal-cell__num--today', () => {
    const li = createCalendarCell(makeCell({ isToday: false }), [], makeCallbacks(), vi.fn());
    expect(li.querySelector('.cal-cell__num--today')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createCalendarCell — задачи
// ---------------------------------------------------------------------------

describe('createCalendarCell() — отображение задач', () => {
  it('рендерит переданные задачи (до 3-х)', () => {
    const todos = [makeTodo(), makeTodo(), makeTodo()];
    const li = createCalendarCell(makeCell(), todos, makeCallbacks(), vi.fn());
    const items = li.querySelectorAll('.cal-todo-item');
    expect(items.length).toBe(3);
  });

  it('при 4 задачах показывает 3 + кнопку "+1 ещё"', () => {
    const todos = [makeTodo(), makeTodo(), makeTodo(), makeTodo()];
    const li = createCalendarCell(makeCell(), todos, makeCallbacks(), vi.fn());
    const items = li.querySelectorAll('.cal-todo-item');
    const moreBtn = li.querySelector('.cal-cell__more');
    expect(items.length).toBe(3);
    expect(moreBtn).not.toBeNull();
    expect(moreBtn?.textContent).toBe('+1 ещё');
  });

  it('при 3 задачах кнопки "+N ещё" нет', () => {
    const todos = [makeTodo(), makeTodo(), makeTodo()];
    const li = createCalendarCell(makeCell(), todos, makeCallbacks(), vi.fn());
    expect(li.querySelector('.cal-cell__more')).toBeNull();
  });

  it('todo-item с completed=true получает класс cal-todo-item--done', () => {
    const todo = makeTodo({ completed: true, text: 'Выполнено' });
    const li = createCalendarCell(makeCell(), [todo], makeCallbacks(), vi.fn());
    const item = li.querySelector('.cal-todo-item');
    expect(item?.classList.contains('cal-todo-item--done')).toBe(true);
  });

  it('todo-item использует textContent (не innerHTML) для текста', () => {
    const xss = '<img src=x onerror=alert(1)>';
    const todo = makeTodo({ text: xss });
    const li = createCalendarCell(makeCell(), [todo], makeCallbacks(), vi.fn());
    const textEl = li.querySelector('.cal-todo-item__text');
    // textContent должен содержать сырой текст, не распарсить HTML
    expect(textEl?.textContent).toBe(xss);
    // Тэг img не должен появиться в DOM
    expect(li.querySelector('img')).toBeNull();
  });

  it('checkbox вызывает onToggle при изменении', () => {
    const callbacks = makeCallbacks();
    const todo = makeTodo({ id: 'my-id' });
    const li = createCalendarCell(makeCell(), [todo], callbacks, vi.fn());
    const checkbox = li.querySelector<HTMLInputElement>('.cal-todo-item__check');
    checkbox?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(callbacks.onToggle).toHaveBeenCalledWith('my-id');
  });

  it('кнопка удаления вызывает onRemove', () => {
    const callbacks = makeCallbacks();
    const todo = makeTodo({ id: 'del-id' });
    const li = createCalendarCell(makeCell(), [todo], callbacks, vi.fn());
    const delBtn = li.querySelector<HTMLButtonElement>('.cal-todo-item__del');
    delBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(callbacks.onRemove).toHaveBeenCalledWith('del-id');
  });
});

// ---------------------------------------------------------------------------
// getTooltip singleton — создаётся один div при множественных вызовах
// ---------------------------------------------------------------------------

describe('Tooltip singleton', () => {
  it('при первом mouseenter создаётся ровно один .cal-tooltip в document.body', () => {
    const todo = makeTodo({ text: 'Длинный текст задачи' });
    const li = createCalendarCell(makeCell(), [todo], makeCallbacks(), vi.fn());
    document.body.appendChild(li);

    const textEl = li.querySelector<HTMLElement>('.cal-todo-item__text')!;

    // Имитируем truncation: scrollWidth > clientWidth
    Object.defineProperty(textEl, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(textEl, 'clientWidth', { value: 100, configurable: true });

    textEl.dispatchEvent(new MouseEvent('mouseenter'));

    const tooltips = document.querySelectorAll('.cal-tooltip');
    expect(tooltips.length).toBe(1);

    li.remove();
  });

  it('повторный mouseenter на разных элементах не создаёт дубли .cal-tooltip', () => {
    const todos = [
      makeTodo({ text: 'Задача один' }),
      makeTodo({ text: 'Задача два' }),
    ];
    const li = createCalendarCell(makeCell(), todos, makeCallbacks(), vi.fn());
    document.body.appendChild(li);

    const textEls = li.querySelectorAll<HTMLElement>('.cal-todo-item__text');

    // Первый элемент — truncated
    Object.defineProperty(textEls[0], 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(textEls[0], 'clientWidth', { value: 100, configurable: true });

    // Второй элемент — тоже truncated
    Object.defineProperty(textEls[1], 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(textEls[1], 'clientWidth', { value: 80, configurable: true });

    // Наводим на первый, потом на второй
    textEls[0].dispatchEvent(new MouseEvent('mouseenter'));
    textEls[1].dispatchEvent(new MouseEvent('mouseenter'));

    const tooltips = document.querySelectorAll('.cal-tooltip');
    expect(tooltips.length).toBe(1); // singleton!

    li.remove();
  });

  it('tooltip использует textContent (защита от XSS)', () => {
    const xss = '<script>alert(1)</script>';
    const todo = makeTodo({ text: xss });
    const li = createCalendarCell(makeCell(), [todo], makeCallbacks(), vi.fn());
    document.body.appendChild(li);

    const textEl = li.querySelector<HTMLElement>('.cal-todo-item__text')!;
    Object.defineProperty(textEl, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(textEl, 'clientWidth', { value: 50, configurable: true });

    textEl.dispatchEvent(new MouseEvent('mouseenter'));

    const tooltip = document.querySelector('.cal-tooltip')!;
    expect(tooltip.textContent).toBe(xss);
    // script-тэг не должен появиться как DOM-элемент
    expect(document.querySelector('script')).toBeNull();

    li.remove();
  });

  it('тултип показывается (cal-tooltip--visible) при scrollWidth > clientWidth', () => {
    const todo = makeTodo({ text: 'Длинный текст' });
    const li = createCalendarCell(makeCell(), [todo], makeCallbacks(), vi.fn());
    document.body.appendChild(li);

    const textEl = li.querySelector<HTMLElement>('.cal-todo-item__text')!;
    Object.defineProperty(textEl, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(textEl, 'clientWidth', { value: 100, configurable: true });

    textEl.dispatchEvent(new MouseEvent('mouseenter'));

    const tooltip = document.querySelector('.cal-tooltip')!;
    expect(tooltip.classList.contains('cal-tooltip--visible')).toBe(true);

    li.remove();
  });

  it('тултип НЕ показывается если scrollWidth <= clientWidth', () => {
    const todo = makeTodo({ text: 'Короткий' });
    const li = createCalendarCell(makeCell(), [todo], makeCallbacks(), vi.fn());
    document.body.appendChild(li);

    const textEl = li.querySelector<HTMLElement>('.cal-todo-item__text')!;
    // Текст помещается — нет обрезки
    Object.defineProperty(textEl, 'scrollWidth', { value: 50, configurable: true });
    Object.defineProperty(textEl, 'clientWidth', { value: 100, configurable: true });

    textEl.dispatchEvent(new MouseEvent('mouseenter'));

    // .cal-tooltip может не существовать вовсе (синглтон не создан) или не иметь --visible
    const tooltip = document.querySelector('.cal-tooltip');
    expect(tooltip?.classList.contains('cal-tooltip--visible') ?? false).toBe(false);

    li.remove();
  });

  it('тултип скрывается (убирается cal-tooltip--visible) при mouseleave', () => {
    const todo = makeTodo({ text: 'Длинный текст задачи' });
    const li = createCalendarCell(makeCell(), [todo], makeCallbacks(), vi.fn());
    document.body.appendChild(li);

    const textEl = li.querySelector<HTMLElement>('.cal-todo-item__text')!;
    Object.defineProperty(textEl, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(textEl, 'clientWidth', { value: 80, configurable: true });

    textEl.dispatchEvent(new MouseEvent('mouseenter'));
    textEl.dispatchEvent(new MouseEvent('mouseleave'));

    const tooltip = document.querySelector('.cal-tooltip');
    expect(tooltip?.classList.contains('cal-tooltip--visible')).toBe(false);

    li.remove();
  });
});

// ---------------------------------------------------------------------------
// createCalendarCell — обработчик клика по ячейке
// ---------------------------------------------------------------------------

describe('createCalendarCell() — click-обработчик', () => {
  it('клик по пустой ячейке вызывает openInlineForm на desktop', () => {
    // matchMedia по умолчанию в jsdom возвращает matches:false → не мобайл
    const openInlineForm = vi.fn();
    const li = createCalendarCell(makeCell(), [], makeCallbacks(), openInlineForm);
    li.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(openInlineForm).toHaveBeenCalledWith(li, '2026-06-15');
  });

  it('клик по .cal-todo-item не всплывает до обработчика ячейки', () => {
    const callbacks = makeCallbacks();
    const openInlineForm = vi.fn();
    const todo = makeTodo();
    const li = createCalendarCell(makeCell(), [todo], callbacks, openInlineForm);

    const todoItem = li.querySelector<HTMLElement>('.cal-todo-item')!;
    todoItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(openInlineForm).not.toHaveBeenCalled();
    expect(callbacks.onCellClick).not.toHaveBeenCalled();
  });
});
