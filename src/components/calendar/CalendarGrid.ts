import type { GridCell } from '../../utils/dateUtils';
import type { Todo } from '../../types';
import { createCalendarCell, type CellCallbacks } from './CalendarCell';
import { CalendarInlineForm } from './CalendarInlineForm';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export class CalendarGrid {
  private gridEl: HTMLElement;
  private activeForm: CalendarInlineForm | null = null;

  constructor(containerEl: HTMLElement) {
    const weekdays = document.createElement('ul');
    weekdays.className = 'cal-weekdays';
    weekdays.style.listStyle = 'none';
    weekdays.style.padding = '0';
    weekdays.style.margin = '0';

    for (const day of WEEKDAYS) {
      const li = document.createElement('li');
      li.className = 'cal-weekday';
      li.textContent = day;
      weekdays.appendChild(li);
    }

    const grid = document.createElement('ul');
    grid.className = 'cal-grid';
    grid.style.listStyle = 'none';
    grid.style.padding = '0';
    grid.style.margin = '0';

    containerEl.append(weekdays, grid);
    this.gridEl = grid;
  }

  render(
    cells: GridCell[],
    todosMap: Map<string, Todo[]>,
    callbacks: CellCallbacks,
  ): void {
    this.closeActiveForm();
    this.gridEl.textContent = '';

    const openInlineForm = (cellEl: HTMLElement, date: string): void => {
      this.closeActiveForm();

      const form = new CalendarInlineForm(
        cellEl,
        date,
        (text, d) => {
          callbacks.onAddInline(text, d);
          // form stays open for further input — it will be replaced on re-render
        },
        () => {
          this.activeForm = null;
        },
      );

      this.activeForm = form;
      form.focus();
    };

    for (const cell of cells) {
      const todos = todosMap.get(cell.date) ?? [];
      const cellEl = createCalendarCell(cell, todos, callbacks, openInlineForm);
      this.gridEl.appendChild(cellEl);
    }
  }

  private closeActiveForm(): void {
    if (this.activeForm) {
      this.activeForm.destroy();
      this.activeForm = null;
    }
  }
}
