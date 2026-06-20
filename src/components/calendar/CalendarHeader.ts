import type { MonthStats } from './CalendarView';
import { formatMonthYear } from '../../utils/dateUtils';

export interface HeaderCallbacks {
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export class CalendarHeader {
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  render(year: number, month: number, stats: MonthStats, cb: HeaderCallbacks): void {
    this.el.textContent = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'cal-nav-btn';
    prevBtn.textContent = '‹';
    prevBtn.setAttribute('aria-label', 'Предыдущий месяц');
    prevBtn.addEventListener('click', cb.onPrev);

    const title = document.createElement('span');
    title.className = 'cal-title';
    title.textContent = formatMonthYear(year, month);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cal-nav-btn';
    nextBtn.textContent = '›';
    nextBtn.setAttribute('aria-label', 'Следующий месяц');
    nextBtn.addEventListener('click', cb.onNext);

    const todayBtn = document.createElement('button');
    todayBtn.className = 'cal-today-btn';
    todayBtn.textContent = 'Сегодня';
    todayBtn.addEventListener('click', cb.onToday);

    const doneStat = document.createElement('span');
    doneStat.className = 'cal-stat cal-stat--done';
    doneStat.textContent = `✓ ${stats.completed}`;
    doneStat.setAttribute('aria-label', `Выполнено: ${stats.completed}`);

    const activeStat = document.createElement('span');
    activeStat.className = 'cal-stat cal-stat--active';
    activeStat.textContent = `● ${stats.active}`;
    activeStat.setAttribute('aria-label', `В работе: ${stats.active}`);

    this.el.append(prevBtn, title, nextBtn, todayBtn, doneStat, activeStat);
  }
}
