export class ConsolePanel {
  private container: HTMLElement;
  private outputEl: HTMLPreElement;
  private inputArea: HTMLDivElement;
  private inputField: HTMLInputElement;
  private inputResolve: ((value: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';

    const label = document.createElement('span');
    label.textContent = 'Console';

    const actions = document.createElement('div');
    actions.className = 'panel-actions';

    const clearBtn = document.createElement('md-icon-button') as HTMLElement;
    clearBtn.setAttribute('title', 'Clear console');
    clearBtn.innerHTML = '<md-icon>delete</md-icon>';
    clearBtn.addEventListener('click', () => this.clear());
    actions.appendChild(clearBtn);

    header.appendChild(label);
    header.appendChild(actions);
    container.appendChild(header);

    // Output
    this.outputEl = document.createElement('pre');
    this.outputEl.className = 'console-output';
    container.appendChild(this.outputEl);

    // Input area
    this.inputArea = document.createElement('div');
    this.inputArea.className = 'console-input-area';
    this.inputArea.hidden = true;

    this.inputField = document.createElement('input');
    this.inputField.type = 'text';
    this.inputField.placeholder = 'Enter value...';
    this.inputField.style.cssText = 'flex:1;font-family:var(--font-mono);font-size:12px;padding:3px 6px;border:1px solid var(--md-sys-color-outline);border-radius:4px;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface);outline:none;height:24px;box-sizing:border-box;';

    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitInput();
    });

    const submitBtn = document.createElement('md-filled-button') as HTMLElement;
    submitBtn.textContent = 'Submit';
    submitBtn.style.cssText = '--md-filled-button-container-shape: 4px; --md-filled-button-container-height: 24px; --md-filled-button-label-text-size: 11px; --md-filled-button-icon-size: 14px;';
    submitBtn.addEventListener('click', () => this.submitInput());

    this.inputArea.appendChild(this.inputField);
    this.inputArea.appendChild(submitBtn);
    container.appendChild(this.inputArea);
  }

  appendOutput(text: string): void {
    this.outputEl.textContent += text;
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  clear(): void {
    this.outputEl.textContent = '';
  }

  showInput(prompt: string, resolve: (value: string) => void): void {
    this.inputResolve = resolve;
    this.inputField.placeholder = prompt;
    this.inputField.value = '';
    this.inputArea.hidden = false;
    this.inputField.focus();
  }

  hideInput(): void {
    this.inputArea.hidden = true;
    this.inputResolve = null;
  }

  private submitInput(): void {
    const value = this.inputField.value;
    if (this.inputResolve) {
      this.appendOutput(value + '\n');
      this.inputResolve(value);
      this.inputResolve = null;
      this.inputArea.hidden = true;
    }
  }
}
