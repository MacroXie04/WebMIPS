import { RegisterFile } from '../simulator/registers.js';
import { REGISTER_NAMES } from '../utils/constants.js';

export class RegistersPanel {
  private container: HTMLElement;
  private tbody: HTMLTableSectionElement;
  private rows: HTMLTableRowElement[] = [];
  private format: 'hex' | 'dec' = 'hex';
  private registers: RegisterFile | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';

    const label = document.createElement('span');
    label.textContent = 'Registers';

    const actions = document.createElement('div');
    actions.className = 'panel-actions';

    const toggleBtn = document.createElement('md-icon-button') as HTMLElement;
    toggleBtn.setAttribute('title', 'Toggle HEX/DEC');
    toggleBtn.innerHTML = '<md-icon>swap_horiz</md-icon>';
    toggleBtn.addEventListener('click', () => this.toggleFormat());
    actions.appendChild(toggleBtn);

    header.appendChild(label);
    header.appendChild(actions);
    container.appendChild(header);

    // Table
    const tableContainer = document.createElement('div');
    tableContainer.className = 'register-table-container';

    const table = document.createElement('table');
    table.className = 'register-table';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>#</th><th>Value</th></tr>';
    table.appendChild(thead);

    this.tbody = document.createElement('tbody');

    // 32 GP registers + pc, hi, lo
    for (let i = 0; i < 35; i++) {
      const row = document.createElement('tr');
      const tdName = document.createElement('td');
      const tdNum = document.createElement('td');
      const tdVal = document.createElement('td');

      if (i < 32) {
        tdName.textContent = REGISTER_NAMES[i];
        tdNum.textContent = String(i);
      } else if (i === 32) {
        tdName.textContent = 'pc';
        tdNum.textContent = '';
      } else if (i === 33) {
        tdName.textContent = 'hi';
        tdNum.textContent = '';
      } else {
        tdName.textContent = 'lo';
        tdNum.textContent = '';
      }

      tdVal.textContent = this.formatValue(0);
      row.appendChild(tdName);
      row.appendChild(tdNum);
      row.appendChild(tdVal);
      this.tbody.appendChild(row);
      this.rows.push(row);
    }

    table.appendChild(this.tbody);
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
  }

  bind(registers: RegisterFile): void {
    this.registers = registers;
    this.update();
  }

  update(changed?: Set<number>): void {
    if (!this.registers) return;

    for (let i = 0; i < 32; i++) {
      const val = this.registers.read(i);
      this.rows[i].cells[2].textContent = this.formatValue(val);

      if (changed?.has(i)) {
        this.rows[i].classList.add('changed');
        setTimeout(() => this.rows[i].classList.remove('changed'), 500);
      }
    }

    // pc, hi, lo
    this.rows[32].cells[2].textContent = this.formatValue(this.registers.pc);
    this.rows[33].cells[2].textContent = this.formatValue(this.registers.hi);
    this.rows[34].cells[2].textContent = this.formatValue(this.registers.lo);

    if (changed?.has(32)) {
      this.rows[32].classList.add('changed');
      setTimeout(() => this.rows[32].classList.remove('changed'), 500);
    }
    if (changed?.has(33)) {
      this.rows[33].classList.add('changed');
      setTimeout(() => this.rows[33].classList.remove('changed'), 500);
    }
    if (changed?.has(34)) {
      this.rows[34].classList.add('changed');
      setTimeout(() => this.rows[34].classList.remove('changed'), 500);
    }
  }

  scrollToChanged(changed: Set<number>, smooth = false): void {
    if (changed.size === 0) return;

    // Prefer scrolling to the first changed GP register (0-31)
    // Only scroll to pc/hi/lo (32-34) if no GP register changed
    let target = -1;
    for (let i = 0; i <= 31; i++) {
      if (changed.has(i)) { target = i; break; }
    }
    if (target === -1) {
      for (const idx of changed) {
        if (idx < this.rows.length) { target = idx; break; }
      }
    }

    if (target >= 0 && target < this.rows.length) {
      const container = this.rows[target].closest('.register-table-container');
      if (container && smooth) {
        // Manual scroll to center the target row, avoids smooth animation interruption issues
        const row = this.rows[target];
        const rowTop = row.offsetTop;
        const rowHeight = row.offsetHeight;
        const containerHeight = container.clientHeight;
        const scrollTarget = rowTop - containerHeight / 2 + rowHeight / 2;
        container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
      } else {
        this.rows[target].scrollIntoView({ block: 'nearest' });
      }
    }
  }

  private toggleFormat(): void {
    this.format = this.format === 'hex' ? 'dec' : 'hex';
    this.update();
  }

  private formatValue(val: number): string {
    if (this.format === 'hex') {
      return '0x' + ((val >>> 0).toString(16)).padStart(8, '0');
    }
    return String(val);
  }
}
