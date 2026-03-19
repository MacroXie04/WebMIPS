import { CpuState } from '../simulator/cpu.js';

export interface ToolbarCallbacks {
  onAssemble: () => void;
  onRun: () => void;
  onStep: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpeedChange: (delay: number) => void;
  onFollowToggle: (enabled: boolean) => void;
  onSettings: () => void;
}

export class Toolbar {
  private container: HTMLElement;
  private assembleBtn: HTMLElement;
  private runStopBtn: HTMLElement;
  private stepBtn: HTMLElement;
  private resetBtn: HTMLElement;
  private speedBtn: HTMLElement;
  private followBtn: HTMLElement;
  private speedIndex = 0;
  private isRunning = false;
  private followEnabled = true;
  private static readonly SPEEDS = [
    { label: 'Instant', icon: 'bolt',         delay: 0,    runOnly: false },
    { label: 'Fast',    icon: 'fast_forward',  delay: 100,  runOnly: true },
    { label: 'Slow',    icon: 'skip_next',     delay: 1000, runOnly: true },
  ];

  constructor(container: HTMLElement, callbacks: ToolbarCallbacks) {
    this.container = container;

    // Assemble
    this.assembleBtn = this.createButton('md-filled-button', 'build', 'Assemble', callbacks.onAssemble);
    container.appendChild(this.assembleBtn);

    // Step
    this.stepBtn = this.createButton('md-filled-tonal-button', 'skip_next', 'Step', callbacks.onStep);
    this.stepBtn.setAttribute('disabled', '');
    container.appendChild(this.stepBtn);

    // Run/Stop toggle
    this.runStopBtn = document.createElement('md-filled-tonal-button');
    this.runStopBtn.innerHTML = '<md-icon slot="icon">play_arrow</md-icon>Run';
    this.runStopBtn.setAttribute('disabled', '');
    this.runStopBtn.addEventListener('click', () => {
      if (this.isRunning) {
        callbacks.onStop();
      } else {
        if (!this.runStopBtn.hasAttribute('disabled')) callbacks.onRun();
      }
    });
    container.appendChild(this.runStopBtn);

    // Speed toggle button
    this.speedBtn = document.createElement('md-outlined-button');
    this.speedBtn.className = 'speed-btn';
    this.updateSpeedLabel();
    this.speedBtn.addEventListener('click', () => {
      // When running, only cycle between runOnly speeds (Fast/Step)
      do {
        this.speedIndex = (this.speedIndex + 1) % Toolbar.SPEEDS.length;
      } while (this.isRunning && !Toolbar.SPEEDS[this.speedIndex].runOnly);
      this.updateSpeedLabel();
      callbacks.onSpeedChange(Toolbar.SPEEDS[this.speedIndex].delay);
    });
    container.appendChild(this.speedBtn);

    // Follow toggle
    this.followBtn = document.createElement('md-filled-tonal-button');
    this.followBtn.innerHTML = '<md-icon slot="icon">my_location</md-icon>Follow';
    this.followBtn.addEventListener('click', () => {
      this.followEnabled = !this.followEnabled;
      this.updateFollowStyle();
      callbacks.onFollowToggle(this.followEnabled);
    });
    container.appendChild(this.followBtn);

    // Reset
    this.resetBtn = this.createButton('md-outlined-button', 'restart_alt', 'Reset', callbacks.onReset);
    this.resetBtn.setAttribute('disabled', '');
    container.appendChild(this.resetBtn);

    // Spacer pushes Settings + GitHub to the right
    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    container.appendChild(spacer);

    // Settings
    const settingsBtn = this.createButton('md-outlined-button', 'settings', 'Settings', () => callbacks.onSettings());
    container.appendChild(settingsBtn);

    // GitHub link
    const githubBtn = document.createElement('md-outlined-button') as any;
    githubBtn.innerHTML = `<svg slot="icon" viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>GitHub`;
    githubBtn.addEventListener('click', () => {
      window.open('https://github.com/MacroXie04/WebMIPS', '_blank');
    });
    container.appendChild(githubBtn);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        callbacks.onAssemble();
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (this.isRunning) {
          callbacks.onStop();
        } else if (!this.runStopBtn.hasAttribute('disabled')) {
          callbacks.onRun();
        }
      }
      if (e.key === 'F10') {
        e.preventDefault();
        if (!this.stepBtn.hasAttribute('disabled')) callbacks.onStep();
      }
    });
  }

  updateState(state: CpuState): void {
    const enable = (btn: HTMLElement) => btn.removeAttribute('disabled');
    const disable = (btn: HTMLElement) => btn.setAttribute('disabled', '');

    this.isRunning = state === 'running';

    // Toggle Run/Stop button appearance
    if (this.isRunning) {
      this.runStopBtn.innerHTML = '<md-icon slot="icon">stop</md-icon>Stop';
    } else {
      this.runStopBtn.innerHTML = '<md-icon slot="icon">play_arrow</md-icon>Run';
    }

    switch (state) {
      case 'idle':
        enable(this.assembleBtn);
        disable(this.runStopBtn);
        disable(this.stepBtn);
        disable(this.resetBtn);
        break;
      case 'ready':
        enable(this.assembleBtn);
        enable(this.runStopBtn);
        enable(this.stepBtn);
        enable(this.resetBtn);
        break;
      case 'running':
        disable(this.assembleBtn);
        enable(this.runStopBtn);
        disable(this.stepBtn);
        disable(this.resetBtn);
        break;
      case 'paused':
        enable(this.assembleBtn);
        enable(this.runStopBtn);
        enable(this.stepBtn);
        enable(this.resetBtn);
        break;
      case 'halted':
        enable(this.assembleBtn);
        disable(this.runStopBtn);
        disable(this.stepBtn);
        enable(this.resetBtn);
        break;
      case 'waiting_input':
        disable(this.assembleBtn);
        enable(this.runStopBtn);
        disable(this.stepBtn);
        disable(this.resetBtn);
        break;
    }
  }

  isFollowOn(): boolean {
    return this.followEnabled;
  }

  private updateFollowStyle(): void {
    if (this.followEnabled) {
      this.followBtn.innerHTML = '<md-icon slot="icon">my_location</md-icon>Follow';
    } else {
      this.followBtn.innerHTML = '<md-icon slot="icon">location_disabled</md-icon>Follow';
    }
    this.followBtn.style.opacity = this.followEnabled ? '1' : '0.5';
  }

  getDelay(): number {
    return Toolbar.SPEEDS[this.speedIndex].delay;
  }

  private updateSpeedLabel(): void {
    const speed = Toolbar.SPEEDS[this.speedIndex];
    this.speedBtn.innerHTML = `<md-icon slot="icon">${speed.icon}</md-icon>${speed.label}`;
  }

  private createButton(tag: string, icon: string, label: string, onClick: () => void): HTMLElement {
    const btn = document.createElement(tag);
    btn.innerHTML = `<md-icon slot="icon">${icon}</md-icon>${label}`;
    btn.addEventListener('click', () => {
      if (!btn.hasAttribute('disabled')) onClick();
    });
    return btn;
  }
}
