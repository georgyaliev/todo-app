import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildMonthGrid, formatMonthYear, toISODate } from '../utils/dateUtils';

// ---------------------------------------------------------------------------
// toISODate
// ---------------------------------------------------------------------------

describe('toISODate()', () => {
  it('форматирует дату в строку YYYY-MM-DD', () => {
    const d = new Date(2026, 5, 15); // 15 июня 2026
    expect(toISODate(d)).toBe('2026-06-15');
  });

  it('использует локальное время, а не UTC', () => {
    // Создаём дату через локальный конструктор — должен вернуть локальную дату,
    // а не смещённую UTC
    const d = new Date(2026, 0, 1); // 1 января 2026 в локальной полночи
    expect(toISODate(d)).toBe('2026-01-01');
  });

  it('корректно добавляет ведущие нули для месяца и дня', () => {
    const d = new Date(2026, 0, 9); // 9 января 2026
    expect(toISODate(d)).toBe('2026-01-09');
  });

  it('корректно обрабатывает конец месяца', () => {
    const d = new Date(2026, 11, 31); // 31 декабря 2026
    expect(toISODate(d)).toBe('2026-12-31');
  });

  it('возвращает строку формата YYYY-MM-DD (проверка regexp)', () => {
    const result = toISODate(new Date(2026, 5, 1));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// formatMonthYear
// ---------------------------------------------------------------------------

describe('formatMonthYear()', () => {
  it('formatMonthYear(2026, 5) → "Июнь 2026"', () => {
    expect(formatMonthYear(2026, 5)).toBe('Июнь 2026');
  });

  it('formatMonthYear(2026, 0) → "Январь 2026"', () => {
    expect(formatMonthYear(2026, 0)).toBe('Январь 2026');
  });

  it('форматирует все 12 месяцев правильно', () => {
    const expected = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
    ];
    for (let m = 0; m < 12; m++) {
      expect(formatMonthYear(2026, m)).toBe(`${expected[m]} 2026`);
    }
  });

  it('форматирует разные года', () => {
    expect(formatMonthYear(2025, 5)).toBe('Июнь 2025');
    expect(formatMonthYear(2027, 0)).toBe('Январь 2027');
  });
});

// ---------------------------------------------------------------------------
// buildMonthGrid
// ---------------------------------------------------------------------------

describe('buildMonthGrid()', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Июнь 2026 (начинается с понедельника) ---
  describe('Июнь 2026 (month=5)', () => {
    it('возвращает ровно 35 ячеек (5 недель)', () => {
      const grid = buildMonthGrid(2026, 5);
      expect(grid).toHaveLength(35);
    });

    it('первая ячейка = 2026-06-01', () => {
      const grid = buildMonthGrid(2026, 5);
      expect(grid[0].date).toBe('2026-06-01');
    });

    it('последняя ячейка = 2026-07-05', () => {
      const grid = buildMonthGrid(2026, 5);
      expect(grid[34].date).toBe('2026-07-05');
    });

    it('isCurrentMonth=true только для дней июня', () => {
      const grid = buildMonthGrid(2026, 5);
      const juneCount = grid.filter((c) => c.isCurrentMonth).length;
      expect(juneCount).toBe(30); // 30 дней в июне
      // Все ячейки с isCurrentMonth=true имеют дату в июне
      grid
        .filter((c) => c.isCurrentMonth)
        .forEach((c) => expect(c.date).toMatch(/^2026-06-/));
      // Ячейки вне месяца — хвост июля
      grid
        .filter((c) => !c.isCurrentMonth)
        .forEach((c) => expect(c.date).toMatch(/^2026-07-/));
    });
  });

  // --- Январь 2026 (начинается с четверга, хвост декабря) ---
  describe('Январь 2026 (month=0)', () => {
    it('возвращает ровно 35 ячеек (5 недель)', () => {
      const grid = buildMonthGrid(2026, 0);
      expect(grid).toHaveLength(35);
    });

    it('первая ячейка = 2025-12-29 (хвост декабря)', () => {
      const grid = buildMonthGrid(2026, 0);
      expect(grid[0].date).toBe('2025-12-29');
    });

    it('последняя ячейка = 2026-02-01', () => {
      const grid = buildMonthGrid(2026, 0);
      expect(grid[34].date).toBe('2026-02-01');
    });

    it('isCurrentMonth=true только для 31 дня января', () => {
      const grid = buildMonthGrid(2026, 0);
      const janCells = grid.filter((c) => c.isCurrentMonth);
      expect(janCells).toHaveLength(31);
      janCells.forEach((c) => expect(c.date).toMatch(/^2026-01-/));
    });

    it('хвостовые ячейки перед январём имеют isCurrentMonth=false', () => {
      const grid = buildMonthGrid(2026, 0);
      // Первые 3 ячейки — декабрь (29, 30, 31)
      expect(grid[0].isCurrentMonth).toBe(false);
      expect(grid[1].isCurrentMonth).toBe(false);
      expect(grid[2].isCurrentMonth).toBe(false);
      expect(grid[3].isCurrentMonth).toBe(true); // 1 января
    });
  });

  // --- Февраль 2026 (28 дней, начинается с воскресенья) ---
  describe('Февраль 2026 (month=1)', () => {
    it('возвращает корректное число ячеек (35 или 42)', () => {
      const grid = buildMonthGrid(2026, 1);
      expect(grid.length === 35 || grid.length === 42).toBe(true);
      expect(grid.length % 7).toBe(0);
    });

    it('содержит ровно 28 ячеек с isCurrentMonth=true', () => {
      const grid = buildMonthGrid(2026, 1);
      const febCells = grid.filter((c) => c.isCurrentMonth);
      expect(febCells).toHaveLength(28);
    });

    it('первый день февраля присутствует в сетке', () => {
      const grid = buildMonthGrid(2026, 1);
      expect(grid.some((c) => c.date === '2026-02-01')).toBe(true);
    });

    it('последний день февраля присутствует в сетке', () => {
      const grid = buildMonthGrid(2026, 1);
      expect(grid.some((c) => c.date === '2026-02-28')).toBe(true);
    });

    it('воскресенье 2026-02-01 начинает последний столбец недели (позиция 6)', () => {
      // Feb 1 = Sunday. В нашей сетке неделя Пн-Вс, поэтому позиция воскресенья = 6
      const grid = buildMonthGrid(2026, 1);
      const firstFebIdx = grid.findIndex((c) => c.date === '2026-02-01');
      expect(firstFebIdx % 7).toBe(6);
    });
  });

  // --- isToday ---
  describe('isToday', () => {
    it('isToday=true только для ячейки с сегодняшней датой', () => {
      // Фиксируем "сегодня" = 2026-06-15 (попадает в сетку июня)
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 15));

      const grid = buildMonthGrid(2026, 5);
      const todayCells = grid.filter((c) => c.isToday);
      expect(todayCells).toHaveLength(1);
      expect(todayCells[0].date).toBe('2026-06-15');
    });

    it('isToday=false для всех ячеек когда сегодня не попадает в сетку', () => {
      // Фиксируем "сегодня" = 2025-01-01 (далеко от июня 2026)
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 0, 1));

      const grid = buildMonthGrid(2026, 5);
      expect(grid.every((c) => !c.isToday)).toBe(true);
    });

    it('isToday=true для ячейки в хвосте предыдущего месяца если сегодня там', () => {
      // Январь 2026 начинается с 2025-12-29. Если сегодня 2025-12-30 — оно в сетке
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 11, 30)); // 30 декабря 2025

      const grid = buildMonthGrid(2026, 0);
      const todayCells = grid.filter((c) => c.isToday);
      expect(todayCells).toHaveLength(1);
      expect(todayCells[0].date).toBe('2025-12-30');
      expect(todayCells[0].isCurrentMonth).toBe(false);
    });
  });

  // --- Общие свойства сетки ---
  describe('общие свойства сетки', () => {
    it('количество ячеек всегда кратно 7', () => {
      for (let m = 0; m < 12; m++) {
        expect(buildMonthGrid(2026, m).length % 7).toBe(0);
      }
    });

    it('даты идут строго по возрастанию', () => {
      const grid = buildMonthGrid(2026, 5);
      for (let i = 1; i < grid.length; i++) {
        expect(grid[i].date > grid[i - 1].date).toBe(true);
      }
    });

    it('каждая дата в сетке уникальна', () => {
      const grid = buildMonthGrid(2026, 5);
      const dates = grid.map((c) => c.date);
      const unique = new Set(dates);
      expect(unique.size).toBe(dates.length);
    });

    it('каждая ячейка имеет поля date, isCurrentMonth, isToday', () => {
      const grid = buildMonthGrid(2026, 5);
      for (const cell of grid) {
        expect(typeof cell.date).toBe('string');
        expect(typeof cell.isCurrentMonth).toBe('boolean');
        expect(typeof cell.isToday).toBe('boolean');
      }
    });
  });
});
