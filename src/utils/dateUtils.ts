export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface GridCell {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function buildMonthGrid(year: number, month: number): GridCell[] {
  const todayStr = toISODate(new Date());
  const firstDay = new Date(year, month, 1);
  // Понедельник = 0 ... Воскресенье = 6
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const cells: GridCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(year, month, 1 - startDow + i);
    const dateStr = toISODate(cellDate);
    cells.push({
      date: dateStr,
      isCurrentMonth: cellDate.getMonth() === month,
      isToday: dateStr === todayStr,
    });
  }
  return cells;
}

const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS_RU[month]} ${year}`;
}
