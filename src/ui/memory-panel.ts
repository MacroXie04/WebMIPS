import { Memory } from '../simulator/memory.js';
import { DATA_BASE } from '../utils/constants.js';

export class MemoryPanel {
  private container: HTMLElement;
  private tbody: HTMLTableSectionElement;
  private memory: Memory | null = null;
  private baseAddress = DATA_BASE;
  private wordCount = 32;
  private addressInput: HTMLInputElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';

    const label = document.createElement('span');
    label.textContent = 'Memory';

    const actions = document.createElement('div');
    actions.className = 'panel-actions';
    actions.style.gap = '4px';

    // Address input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '0x10010000';
    input.style.cssText = 'width:90px;font-family:var(--font-mono);font-size:11px;padding:2px 4px;border:1px solid var(--md-sys-color-outline);border-radius:4px;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface);';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.jumpToAddress(input.value);
    });
    this.addressInput = input;
    actions.appendChild(input);

    const goBtn = document.createElement('md-icon-button') as HTMLElement;
    goBtn.setAttribute('title', 'Go to address');
    goBtn.innerHTML = '<md-icon>arrow_forward</md-icon>';
    goBtn.addEventListener('click', () => this.jumpToAddress(input.value));
    actions.appendChild(goBtn);

    header.appendChild(label);
    header.appendChild(actions);
    container.appendChild(header);

    // Table
    const tableContainer = document.createElement('div');
    tableContainer.className = 'memory-table-container';

    const table = document.createElement('table');
    table.className = 'memory-table';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Address</th><th>Value</th><th>ASCII</th></tr>';
    table.appendChild(thead);

    this.tbody = document.createElement('tbody');
    table.appendChild(this.tbody);
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
  }

  bind(memory: Memory): void {
    this.memory = memory;
    this.update();
  }

  update(): void {
    if (!this.memory) return;

    this.tbody.innerHTML = '';

    for (let i = 0; i < this.wordCount; i++) {
      const addr = (this.baseAddress + i * 4) >>> 0;
      const word = this.memory.readWord(addr);

      const row = document.createElement('tr');

      const tdAddr = document.createElement('td');
      tdAddr.textContent = '0x' + addr.toString(16).padStart(8, '0');

      const tdVal = document.createElement('td');
      tdVal.textContent = '0x' + (word >>> 0).toString(16).padStart(8, '0');

      const tdAscii = document.createElement('td');
      let ascii = '';
      for (let b = 0; b < 4; b++) {
        const byte = this.memory.readByte(addr + b);
        ascii += (byte >= 0x20 && byte <= 0x7e) ? String.fromCharCode(byte) : '.';
      }
      tdAscii.textContent = ascii;

      row.appendChild(tdAddr);
      row.appendChild(tdVal);
      row.appendChild(tdAscii);
      this.tbody.appendChild(row);
    }
  }

  jumpToAddress(addrStr: string): void {
    const addr = parseInt(addrStr, 16) || parseInt(addrStr, 10) || DATA_BASE;
    this.baseAddress = (addr & ~3) >>> 0; // align to word
    this.update();
  }

  setBaseAddress(addr: number): void {
    this.baseAddress = (addr & ~3) >>> 0;
    if (this.addressInput) {
      this.addressInput.value = '0x' + this.baseAddress.toString(16).padStart(8, '0');
    }
    this.update();
  }
}
