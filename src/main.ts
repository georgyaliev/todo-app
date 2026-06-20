import './styles/calendar.css';
import { StorageService } from './services/StorageService';
import { TodoService } from './services/TodoService';
import { CalendarView } from './components/calendar/CalendarView';

const storage = new StorageService();
const service = new TodoService(storage);

const calendarContainer = document.getElementById('calendar-view');
if (!calendarContainer) throw new Error('Элемент #calendar-view не найден в DOM');
const calendarView = new CalendarView(calendarContainer, service);
calendarView.mount();
