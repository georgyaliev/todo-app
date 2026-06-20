import type { TodoService } from '../../services/TodoService';
import { buildMonthGrid } from '../../utils/dateUtils';
import { CalendarHeader, type HeaderCallbacks } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { MobileSheet, type SheetCallbacks } from './MobileSheet';
import type { CellCallbacks } from './CalendarCell';

export interface MonthStats {
  completed: number;
  active: number;
}

export class CalendarView {
  private containerEl: HTMLElement;
  private service: TodoService;

  private currentYear: number;
  private currentMonth: number;

  private wrapperEl!: HTMLElement;

  private header!: CalendarHeader;
  private grid!: CalendarGrid;
  private mobileSheet!: MobileSheet;

  private unsubscribe: (() => void) | null = null;

  constructor(containerEl: HTMLElement, service: TodoService) {
    this.containerEl = containerEl;
    this.service = service;

    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
  }

  mount(): void {
    if (this.wrapperEl) return;

    // Build DOM structure
    const wrapper = document.createElement('div');
    wrapper.className = 'cal-wrapper';

    const headerEl = document.createElement('nav');
    headerEl.className = 'cal-header';
    headerEl.setAttribute('aria-label', 'Навигация по календарю');

    const gridContainer = document.createElement('div');

    wrapper.append(headerEl, gridContainer);
    this.containerEl.appendChild(wrapper);

    this.wrapperEl = wrapper;

    this.header = new CalendarHeader(headerEl);
    this.grid = new CalendarGrid(gridContainer);

    const sheetCallbacks: SheetCallbacks = {
      onToggle: (id) => {
        this.service.toggle(id);
      },
      onRemove: (id) => {
        this.service.remove(id);
      },
      onAdd: (text, date) => {
        this.service.add(text, date);
      },
    };

    this.mobileSheet = new MobileSheet(sheetCallbacks);

    this.unsubscribe = this.service.onChange(() => {
      this.render();
      if (this.mobileSheet.currentDate !== '') {
        const updatedTodos = this.service.getByDate(this.mobileSheet.currentDate);
        this.mobileSheet.updateTodos(updatedTodos);
      }
    });

    this.render();
  }

  private render(): void {
    const { currentYear: year, currentMonth: month } = this;
    const cells = buildMonthGrid(year, month);
    const dates = cells.map((c) => c.date);
    const todosMap = this.service.getByDateRange(dates);
    const stats = this.service.getMonthStats(year, month);

    const headerCallbacks: HeaderCallbacks = {
      onPrev: () => {
        if (this.currentMonth === 0) {
          this.currentMonth = 11;
          this.currentYear -= 1;
        } else {
          this.currentMonth -= 1;
        }
        this.render();
      },
      onNext: () => {
        if (this.currentMonth === 11) {
          this.currentMonth = 0;
          this.currentYear += 1;
        } else {
          this.currentMonth += 1;
        }
        this.render();
      },
      onToday: () => {
        const now = new Date();
        this.currentYear = now.getFullYear();
        this.currentMonth = now.getMonth();
        this.render();
      },
    };

    this.header.render(year, month, stats, headerCallbacks);

    const cellCallbacks: CellCallbacks = {
      onToggle: (id) => {
        this.service.toggle(id);
      },
      onRemove: (id) => {
        this.service.remove(id);
      },
      onCellClick: (date) => {
        const dateTodos = this.service.getByDate(date);
        const sheetCallbacks: SheetCallbacks = {
          onToggle: (id) => this.service.toggle(id),
          onRemove: (id) => this.service.remove(id),
          onAdd: (text, d) => this.service.add(text, d),
        };
        this.mobileSheet.open(date, dateTodos, sheetCallbacks);
      },
      onShowMore: (date) => {
        const dateTodos = this.service.getByDate(date);
        const sheetCallbacks: SheetCallbacks = {
          onToggle: (id) => this.service.toggle(id),
          onRemove: (id) => this.service.remove(id),
          onAdd: (text, d) => this.service.add(text, d),
        };
        this.mobileSheet.open(date, dateTodos, sheetCallbacks);
      },
      onAddInline: (text, date) => {
        this.service.add(text, date);
      },
    };

    this.grid.render(cells, todosMap, cellCallbacks);
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.mobileSheet.destroy();
    this.wrapperEl.remove();
  }
}
