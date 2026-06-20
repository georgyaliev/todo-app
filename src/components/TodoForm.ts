import { ValidationError } from '../errors';

export class TodoForm {
  private readonly inputEl: HTMLInputElement;
  private readonly errorEl: HTMLSpanElement;
  private readonly onAdd: (text: string) => void;

  constructor(
    formEl: HTMLFormElement,
    inputEl: HTMLInputElement,
    errorEl: HTMLSpanElement,
    onAdd: (text: string) => void,
  ) {
    this.inputEl = inputEl;
    this.errorEl = errorEl;
    this.onAdd = onAdd;

    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  private handleSubmit(): void {
    try {
      this.onAdd(this.inputEl.value);
      this.clear();
    } catch (err) {
      if (err instanceof ValidationError) {
        this.errorEl.textContent = err.message;
      }
    }
  }

  clear(): void {
    this.inputEl.value = '';
    this.errorEl.textContent = '';
  }
}
