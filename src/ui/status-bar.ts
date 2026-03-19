import { CpuState } from '../simulator/cpu.js';

export class StatusBar {
  private container: HTMLElement;
  private indicator: HTMLSpanElement;
  private statusText: HTMLSpanElement;
  private pcText: HTMLSpanElement;
  private instrText: HTMLSpanElement;

  constructor(container: HTMLElement) {
    this.container = container;

    this.indicator = document.createElement('span');
    this.indicator.className = 'status-indicator';

    this.statusText = document.createElement('span');
    this.statusText.textContent = 'Ready';

    this.pcText = document.createElement('span');
    this.pcText.style.fontFamily = 'var(--font-mono)';
    this.pcText.textContent = 'PC: 0x00400000';

    this.instrText = document.createElement('span');
    this.instrText.textContent = 'Instructions: 0';

    const spacer = document.createElement('span');
    spacer.className = 'spacer';

    const tagline = document.createElement('span');
    tagline.textContent = 'Simulated in TypeScript. No silicon involved.';
    tagline.style.color = '#e53935';
    tagline.style.opacity = '0.8';

    const spacer2 = document.createElement('span');
    spacer2.className = 'spacer';

    const version = document.createElement('span');
    version.textContent = 'MIPS32';

    container.appendChild(this.indicator);
    container.appendChild(this.statusText);
    container.appendChild(this.pcText);
    container.appendChild(this.instrText);
    container.appendChild(spacer);
    container.appendChild(tagline);
    container.appendChild(spacer2);
    container.appendChild(version);
  }

  updateState(state: CpuState): void {
    this.indicator.className = 'status-indicator';

    switch (state) {
      case 'idle':
        this.statusText.textContent = 'Ready';
        break;
      case 'ready':
        this.statusText.textContent = 'Assembled';
        break;
      case 'running':
        this.indicator.classList.add('running');
        this.statusText.textContent = 'Running';
        break;
      case 'paused':
        this.indicator.classList.add('running');
        this.statusText.textContent = 'Paused';
        break;
      case 'halted':
        this.indicator.classList.add('halted');
        this.statusText.textContent = 'Halted';
        break;
      case 'waiting_input':
        this.indicator.classList.add('running');
        this.statusText.textContent = 'Waiting for input';
        break;
    }
  }

  updatePC(pc: number): void {
    this.pcText.textContent = 'PC: 0x' + (pc >>> 0).toString(16).padStart(8, '0');
  }

  updateInstrCount(count: number): void {
    this.instrText.textContent = `Instructions: ${count}`;
  }
}
