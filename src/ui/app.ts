import { CPU, CpuState } from '../simulator/cpu.js';
import { assemble, AssemblyResult } from '../assembler/assembler.js';
import { Editor } from './editor.js';
import { RegistersPanel } from './registers-panel.js';
import { MemoryPanel } from './memory-panel.js';
import { ConsolePanel } from './console-panel.js';
import { Toolbar } from './toolbar.js';
import { StatusBar } from './status-bar.js';
import { Settings } from './settings.js';

export class App {
  private cpu!: CPU;
  private editor!: Editor;
  private registersPanel!: RegistersPanel;
  private memoryPanel!: MemoryPanel;
  private consolePanel!: ConsolePanel;
  private toolbar!: Toolbar;
  private statusBar!: StatusBar;
  private settings!: Settings;
  private errorBar!: HTMLElement;

  private assembled = false;
  private lastResult: AssemblyResult | null = null;
  private runDelay = 0;
  private followEnabled = true;

  init(): void {
    // Create CPU
    this.cpu = new CPU({
      onConsoleOutput: (text) => this.consolePanel.appendOutput(text),
      onStateChange: (state) => this.onStateChange(state),
      onStep: () => this.updatePanels(),
    });

    // Create UI components
    this.editor = new Editor(document.getElementById('editor-panel')!);
    this.registersPanel = new RegistersPanel(document.getElementById('registers-panel')!);
    this.memoryPanel = new MemoryPanel(document.getElementById('memory-panel')!);
    this.consolePanel = new ConsolePanel(document.getElementById('console-panel')!);
    this.statusBar = new StatusBar(document.getElementById('status-bar')!);
    this.errorBar = document.getElementById('error-bar')!;

    // Settings (must be created before toolbar so initial theme is applied)
    this.settings = new Settings(() => {});

    this.toolbar = new Toolbar(document.getElementById('toolbar')!, {
      onAssemble: () => this.doAssemble(),
      onRun: () => this.doRun(),
      onStep: () => this.doStep(),
      onStop: () => this.doStop(),
      onReset: () => this.doReset(),
      onSpeedChange: (delay) => { this.runDelay = delay; this.cpu.setSpeed(delay); },
      onFollowToggle: (enabled) => { this.followEnabled = enabled; },
      onSettings: () => this.settings.open(),
    });

    // Bind panels to simulator data
    this.registersPanel.bind(this.cpu.registers);
    this.memoryPanel.bind(this.cpu.memory);

    // Initial state
    this.toolbar.updateState('idle');
    this.statusBar.updateState('idle');
    this.statusBar.updatePC(this.cpu.registers.pc);
  }

  private doAssemble(): void {
    this.hideError();
    this.editor.clearHighlights();

    const source = this.editor.getValue();
    const result = assemble(source);

    if (result.errors.length > 0) {
      this.showError(result.errors[0].message, result.errors[0].line);
      const errorLines = new Set(result.errors.map(e => e.line));
      this.editor.setErrorLines(errorLines);
      this.assembled = false;
      return;
    }

    // Reset and load
    this.cpu.registers.reset();
    this.cpu.memory.reset();
    this.cpu.loadProgram(result);
    this.lastResult = result;
    this.assembled = true;

    this.consolePanel.clear();
    this.updatePanels();
  }

  private async doRun(): Promise<void> {
    if (!this.assembled && this.cpu.state !== 'paused' && this.cpu.state !== 'ready') return;
    await this.cpu.run(this.runDelay);
    this.updatePanels();
  }

  private doStep(): void {
    if (!this.assembled && this.cpu.state !== 'paused' && this.cpu.state !== 'ready') return;

    const result = this.cpu.step();
    const changed = this.cpu.registers.getChanged();
    this.registersPanel.update(changed);
    this.statusBar.updatePC(this.cpu.registers.pc);
    this.statusBar.updateInstrCount(this.cpu.instrCount);
    this.memoryPanel.update();

    // Highlight current line
    const currentLine = this.cpu.getCurrentLine();
    this.editor.setCurrentLine(currentLine);

    if (result === 'input') {
      this.handleInputRequest();
    }
  }

  private doStop(): void {
    this.cpu.stop();
  }

  private doReset(): void {
    this.cpu.stop();
    this.consolePanel.hideInput();
    this.hideError();
    this.editor.clearHighlights();

    if (this.lastResult) {
      this.cpu.registers.reset();
      this.cpu.memory.reset();
      this.cpu.loadProgram(this.lastResult);
    } else {
      this.cpu.reset();
      this.assembled = false;
    }

    this.consolePanel.clear();
    this.updatePanels();
  }

  private handleInputRequest(): void {
    const prompt = 'Enter value:';
    this.consolePanel.showInput(prompt, (input) => {
      this.cpu.submitInput(input);
    });
  }

  private updatePanels(): void {
    const changed = this.cpu.registers.getChanged();
    this.registersPanel.update(changed);
    this.statusBar.updatePC(this.cpu.registers.pc);
    this.statusBar.updateInstrCount(this.cpu.instrCount);
    this.memoryPanel.update();

    // Always highlight current line
    const currentLine = this.cpu.getCurrentLine();
    this.editor.setCurrentLine(currentLine);

    // Auto-scroll panels when follow is enabled
    if (this.followEnabled) {
      const smooth = this.runDelay >= 1000;
      if (currentLine !== undefined) {
        this.editor.scrollToLine(currentLine, smooth);
      }
      if (changed.size > 0) {
        this.registersPanel.scrollToChanged(changed, smooth);
      }
    }

    if (this.cpu.state === 'waiting_input') {
      this.handleInputRequest();
    }
  }

  private onStateChange(state: CpuState): void {
    this.toolbar.updateState(state);
    this.statusBar.updateState(state);
  }

  private showError(message: string, line?: number): void {
    this.errorBar.hidden = false;
    const prefix = line ? `Line ${line}: ` : '';
    this.errorBar.innerHTML = `
      <span class="material-symbols-outlined">error</span>
      <span class="error-message">${prefix}${this.escapeHtml(message)}</span>
      <md-icon-button onclick="this.parentElement.hidden=true"><md-icon>close</md-icon></md-icon-button>
    `;
  }

  private hideError(): void {
    this.errorBar.hidden = true;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
