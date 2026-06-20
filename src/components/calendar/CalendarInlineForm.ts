export class CalendarInlineForm {
  private formEl: HTMLElement;
  private inputEl: HTMLInputElement;

  constructor(
    cellEl: HTMLElement,
    date: string,
    onAdd: (text: string, date: string) => void,
    onCancel: () => void,
  ) {
    const form = document.createElement('div');
    form.className = 'cal-inline-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cal-inline-form__input';
    input.placeholder = 'Новая задача...';
    input.maxLength = 255;

    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'cal-inline-form__submit';
    submit.textContent = '+';

    form.append(input, submit);
    cellEl.appendChild(form);

    this.formEl = form;
    this.inputEl = input;

    const handleSubmit = (): void => {
      const value = input.value.trim();
      if (value.length > 0) {
        onAdd(value, date);
      }
    };

    submit.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSubmit();
    });

    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        this.destroy();
      }
    });
  }

  focus(): void {
    this.inputEl.focus();
  }

  destroy(): void {
    this.formEl.remove();
  }
}
