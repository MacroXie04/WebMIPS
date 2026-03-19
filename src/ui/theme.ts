export class ThemeManager {
  private dark: boolean;
  private onToggle: (dark: boolean) => void;

  constructor(onToggle: (dark: boolean) => void) {
    this.onToggle = onToggle;

    // Check saved preference or system preference
    const saved = localStorage.getItem('mercury-theme');
    if (saved) {
      this.dark = saved === 'dark';
    } else {
      this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    this.apply();
  }

  toggle(): void {
    this.dark = !this.dark;
    this.apply();
    localStorage.setItem('mercury-theme', this.dark ? 'dark' : 'light');
    this.onToggle(this.dark);
  }

  isDark(): boolean {
    return this.dark;
  }

  private apply(): void {
    if (this.dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    this.onToggle(this.dark);
  }
}
