export type ThemeId = 'dark-default' | 'monokai' | 'one-dark' | 'dracula' | 'solarized-dark'
  | 'light-default' | 'solarized-light' | 'github-light';

export interface SettingsValues {
  theme: ThemeId;
  fontSize: number;
}

const DEFAULTS: SettingsValues = {
  theme: 'dark-default',
  fontSize: 13,
};

interface ThemeDef {
  label: string;
  group: 'dark' | 'light';
  surface: string;
  onSurface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  outline: string;
  primary: string;
  editorBg: string;
  editorFg: string;
  gutterBg: string;
  gutterFg: string;
  consoleFg: string;
  registerChanged: string;
  hlComment: string;
  hlDirective: string;
  hlRegister: string;
  hlInstruction: string;
  hlNumber: string;
  hlString: string;
  hlLabel: string;
}

const THEMES: Record<ThemeId, ThemeDef> = {
  'dark-default': {
    label: 'Dark (Default)',
    group: 'dark',
    surface: '#1f1f1f', onSurface: '#e3e3e3',
    surfaceContainer: '#2d2d2d', surfaceContainerLow: '#252525', surfaceContainerHigh: '#353535',
    outline: '#5f6368', primary: '#8ab4f8',
    editorBg: '#1e1e1e', editorFg: '#d4d4d4', gutterBg: '#1e1e1e', gutterFg: '#6a6a6a',
    consoleFg: '#a6e3a1', registerChanged: '#1a4731',
    hlComment: '#6a9955', hlDirective: '#c586c0', hlRegister: '#9cdcfe',
    hlInstruction: '#dcdcaa', hlNumber: '#b5cea8', hlString: '#ce9178', hlLabel: '#4ec9b0',
  },
  'monokai': {
    label: 'Monokai',
    group: 'dark',
    surface: '#272822', onSurface: '#f8f8f2',
    surfaceContainer: '#2e2e28', surfaceContainerLow: '#222218', surfaceContainerHigh: '#3e3d32',
    outline: '#575753', primary: '#a6e22e',
    editorBg: '#272822', editorFg: '#f8f8f2', gutterBg: '#272822', gutterFg: '#90908a',
    consoleFg: '#a6e22e', registerChanged: '#3e3d32',
    hlComment: '#75715e', hlDirective: '#ae81ff', hlRegister: '#66d9ef',
    hlInstruction: '#f92672', hlNumber: '#ae81ff', hlString: '#e6db74', hlLabel: '#a6e22e',
  },
  'one-dark': {
    label: 'One Dark',
    group: 'dark',
    surface: '#282c34', onSurface: '#abb2bf',
    surfaceContainer: '#2c313a', surfaceContainerLow: '#21252b', surfaceContainerHigh: '#353b45',
    outline: '#545862', primary: '#61afef',
    editorBg: '#282c34', editorFg: '#abb2bf', gutterBg: '#282c34', gutterFg: '#636d83',
    consoleFg: '#98c379', registerChanged: '#2a3a2a',
    hlComment: '#5c6370', hlDirective: '#c678dd', hlRegister: '#e06c75',
    hlInstruction: '#61afef', hlNumber: '#d19a66', hlString: '#98c379', hlLabel: '#e5c07b',
  },
  'dracula': {
    label: 'Dracula',
    group: 'dark',
    surface: '#282a36', onSurface: '#f8f8f2',
    surfaceContainer: '#2d2f3d', surfaceContainerLow: '#21222c', surfaceContainerHigh: '#343746',
    outline: '#6272a4', primary: '#bd93f9',
    editorBg: '#282a36', editorFg: '#f8f8f2', gutterBg: '#282a36', gutterFg: '#6272a4',
    consoleFg: '#50fa7b', registerChanged: '#2a3a2e',
    hlComment: '#6272a4', hlDirective: '#ff79c6', hlRegister: '#8be9fd',
    hlInstruction: '#bd93f9', hlNumber: '#bd93f9', hlString: '#f1fa8c', hlLabel: '#50fa7b',
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    group: 'dark',
    surface: '#002b36', onSurface: '#839496',
    surfaceContainer: '#073642', surfaceContainerLow: '#002028', surfaceContainerHigh: '#0a4050',
    outline: '#586e75', primary: '#268bd2',
    editorBg: '#002b36', editorFg: '#839496', gutterBg: '#002b36', gutterFg: '#586e75',
    consoleFg: '#859900', registerChanged: '#073642',
    hlComment: '#586e75', hlDirective: '#d33682', hlRegister: '#268bd2',
    hlInstruction: '#b58900', hlNumber: '#2aa198', hlString: '#2aa198', hlLabel: '#cb4b16',
  },
  'light-default': {
    label: 'Light (Default)',
    group: 'light',
    surface: '#ffffff', onSurface: '#1f1f1f',
    surfaceContainer: '#f1f3f4', surfaceContainerLow: '#f8f9fa', surfaceContainerHigh: '#e8eaed',
    outline: '#dadce0', primary: '#1a73e8',
    editorBg: '#ffffff', editorFg: '#1f1f1f', gutterBg: '#f5f5f5', gutterFg: '#80868b',
    consoleFg: '#1e8e3e', registerChanged: '#c6f6d5',
    hlComment: '#80868b', hlDirective: '#9334e6', hlRegister: '#1a73e8',
    hlInstruction: '#d93025', hlNumber: '#e37400', hlString: '#1e8e3e', hlLabel: '#e8710a',
  },
  'solarized-light': {
    label: 'Solarized Light',
    group: 'light',
    surface: '#fdf6e3', onSurface: '#657b83',
    surfaceContainer: '#eee8d5', surfaceContainerLow: '#f5efdc', surfaceContainerHigh: '#ddd6c1',
    outline: '#93a1a1', primary: '#268bd2',
    editorBg: '#fdf6e3', editorFg: '#657b83', gutterBg: '#eee8d5', gutterFg: '#93a1a1',
    consoleFg: '#859900', registerChanged: '#d5e8c5',
    hlComment: '#93a1a1', hlDirective: '#d33682', hlRegister: '#268bd2',
    hlInstruction: '#b58900', hlNumber: '#2aa198', hlString: '#2aa198', hlLabel: '#cb4b16',
  },
  'github-light': {
    label: 'GitHub Light',
    group: 'light',
    surface: '#ffffff', onSurface: '#24292f',
    surfaceContainer: '#f6f8fa', surfaceContainerLow: '#fafbfc', surfaceContainerHigh: '#e1e4e8',
    outline: '#d0d7de', primary: '#0969da',
    editorBg: '#ffffff', editorFg: '#24292f', gutterBg: '#f6f8fa', gutterFg: '#8c959f',
    consoleFg: '#1a7f37', registerChanged: '#dafbe1',
    hlComment: '#6e7781', hlDirective: '#8250df', hlRegister: '#0550ae',
    hlInstruction: '#cf222e', hlNumber: '#0550ae', hlString: '#0a3069', hlLabel: '#953800',
  },
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

    // Validate theme still exists
    if (!(this.values.theme in THEMES)) {
      this.values.theme = DEFAULTS.theme;
    }

    // Build theme options HTML
    const darkOptions = Object.entries(THEMES)
      .filter(([, t]) => t.group === 'dark')
      .map(([id, t]) => `<option value="${id}">${t.label}</option>`)
      .join('');
    const lightOptions = Object.entries(THEMES)
      .filter(([, t]) => t.group === 'light')
      .map(([id, t]) => `<option value="${id}">${t.label}</option>`)
      .join('');

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
              <optgroup label="Dark">${darkOptions}</optgroup>
              <optgroup label="Light">${lightOptions}</optgroup>
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
      this.values.theme = this.themeSelect.value as ThemeId;
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
    const theme = THEMES[this.values.theme];
    const isDark = theme.group === 'dark';

    // Set data-theme for components that check it
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Apply all theme colors as CSS custom properties
    const root = document.documentElement.style;
    root.setProperty('--md-sys-color-surface', theme.surface);
    root.setProperty('--md-sys-color-on-surface', theme.onSurface);
    root.setProperty('--md-sys-color-surface-container', theme.surfaceContainer);
    root.setProperty('--md-sys-color-surface-container-low', theme.surfaceContainerLow);
    root.setProperty('--md-sys-color-surface-container-high', theme.surfaceContainerHigh);
    root.setProperty('--md-sys-color-outline', theme.outline);
    root.setProperty('--md-sys-color-primary', theme.primary);
    root.setProperty('--editor-bg', theme.editorBg);
    root.setProperty('--editor-fg', theme.editorFg);
    root.setProperty('--editor-gutter-bg', theme.gutterBg);
    root.setProperty('--editor-gutter-fg', theme.gutterFg);
    root.setProperty('--console-fg', theme.consoleFg);
    root.setProperty('--register-changed', theme.registerChanged);
    root.setProperty('--hl-comment', theme.hlComment);
    root.setProperty('--hl-directive', theme.hlDirective);
    root.setProperty('--hl-register', theme.hlRegister);
    root.setProperty('--hl-instruction', theme.hlInstruction);
    root.setProperty('--hl-number', theme.hlNumber);
    root.setProperty('--hl-string', theme.hlString);
    root.setProperty('--hl-label', theme.hlLabel);

    // Apply font size
    root.setProperty('--app-font-size', `${this.values.fontSize}px`);
    root.setProperty('--app-line-height', `${Math.round(this.values.fontSize * 1.6)}px`);

    this.onChange(this.values);
  }
}
