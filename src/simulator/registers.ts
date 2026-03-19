import { TEXT_BASE, STACK_BASE, GP_INIT } from '../utils/constants.js';

export class RegisterFile {
  readonly gpr = new Int32Array(32);
  pc = 0;
  hi = 0;
  lo = 0;

  private prev = new Int32Array(32);
  private prevPc = 0;
  private prevHi = 0;
  private prevLo = 0;

  constructor() {
    this.reset();
  }

  read(reg: number): number {
    if (reg === 0) return 0;
    return this.gpr[reg];
  }

  write(reg: number, value: number): void {
    if (reg === 0) return;
    this.gpr[reg] = value | 0;
  }

  reset(): void {
    this.gpr.fill(0);
    this.gpr[28] = GP_INIT;   // $gp
    this.gpr[29] = STACK_BASE; // $sp
    this.pc = TEXT_BASE;
    this.hi = 0;
    this.lo = 0;
    this.snapshot();
  }

  snapshot(): void {
    this.prev.set(this.gpr);
    this.prevPc = this.pc;
    this.prevHi = this.hi;
    this.prevLo = this.lo;
  }

  getChanged(): Set<number> {
    const changed = new Set<number>();
    for (let i = 0; i < 32; i++) {
      if (this.gpr[i] !== this.prev[i]) changed.add(i);
    }
    if (this.pc !== this.prevPc) changed.add(32); // pc
    if (this.hi !== this.prevHi) changed.add(33); // hi
    if (this.lo !== this.prevLo) changed.add(34); // lo
    return changed;
  }
}
