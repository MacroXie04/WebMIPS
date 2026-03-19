export interface SettingsValues {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
}

const DEFAULTS: SettingsValues = {
  theme: 'system',
  fontSize: 13,
};

export class Settings {
  private dialog: HTMLDialogElement;
  private themeSelect: HTMLSelectElement;
  private fontSizeInput: HTMLInputElement;
  private fontSizeValue: HTMLSpanElement;
  private values: SettingsValues;
  private onChange: (values: SettingsValues) => void;

  constructor(onChange: (values: SettingsValues) => void) {
    this.onChange = onChange;

    // Load saved settings
    const saved = localStorage.getItem('mercury-settings');
    this.values = saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };

    // Create dialog
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'settings-dialog';
    this.dialog.innerHTML = `
      <div class="settings-content">
        <div class="settings-header">
          <span class="settings-title">Settings</span>
          <md-icon-button class="settings-close"><md-icon>close</md-icon></md-icon-button>
        </div>
        <div class="settings-body">
          <div class="settings-row">
            <label>Theme</label>
            <select class="settings-select" id="settings-theme">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Font Size</label>
            <div class="font-size-control">
              <input type="range" min="10" max="20" step="1" id="settings-fontsize">
              <span class="font-size-value" id="settings-fontsize-value">13px</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.dialog);

    this.themeSelect = this.dialog.querySelector('#settings-theme') as HTMLSelectElement;
    this.fontSizeInput = this.dialog.querySelector('#settings-fontsize') as HTMLInputElement;
    this.fontSizeValue = this.dialog.querySelector('#settings-fontsize-value') as HTMLSpanElement;

    // Set initial values
    this.themeSelect.value = this.values.theme;
    this.fontSizeInput.value = String(this.values.fontSize);
    this.fontSizeValue.textContent = `${this.values.fontSize}px`;

    // Events
    this.themeSelect.addEventListener('change', () => {
      this.values.theme = this.themeSelect.value as SettingsValues['theme'];
      this.save();
    });

    this.fontSizeInput.addEventListener('input', () => {
      this.values.fontSize = parseInt(this.fontSizeInput.value);
      this.fontSizeValue.textContent = `${this.values.fontSize}px`;
      this.save();
    });

    this.dialog.querySelector('.settings-close')!.addEventListener('click', () => {
      this.dialog.close();
    });

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.dialog.close();
    });

    // Apply initial settings
    this.apply();
  }

  open(): void {
    this.dialog.showModal();
  }

  getValues(): SettingsValues {
    return { ...this.values };
  }

  private save(): void {
    localStorage.setItem('mercury-settings', JSON.stringify(this.values));
    this.apply();
  }

  private apply(): void {
    // Apply theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let dark: boolean;
    if (this.values.theme === 'system') {
      dark = prefersDark;
    } else {
      dark = this.values.theme === 'dark';
    }

    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Apply font size
    document.documentElement.style.setProperty('--app-font-size', `${this.values.fontSize}px`);
    document.documentElement.style.setProperty('--app-line-height', `${Math.round(this.values.fontSize * 1.6)}px`);

    this.onChange(this.values);
  }
}
