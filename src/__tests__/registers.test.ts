import { describe, it, expect } from 'vitest';
import { RegisterFile } from '../simulator/registers.js';

describe('RegisterFile', () => {
  it('should initialize with correct default values', () => {
    const regs = new RegisterFile();
    expect(regs.pc).toBe(0x00400000);
    expect(regs.read(29)).toBe(0x7ffffffc); // $sp
    expect(regs.read(28)).toBe(0x10008000); // $gp
    expect(regs.read(0)).toBe(0);           // $zero
  });

  it('should not allow writing to $zero', () => {
    const regs = new RegisterFile();
    regs.write(0, 42);
    expect(regs.read(0)).toBe(0);
  });

  it('should read and write registers correctly', () => {
    const regs = new RegisterFile();
    regs.write(8, 100);  // $t0
    expect(regs.read(8)).toBe(100);
    regs.write(8, -1);
    expect(regs.read(8)).toBe(-1);
  });

  it('should handle 32-bit overflow', () => {
    const regs = new RegisterFile();
    regs.write(8, 0x7fffffff + 1);
    expect(regs.read(8)).toBe(-2147483648); // 0x80000000 as signed
  });

  it('should track changes via snapshot/getChanged', () => {
    const regs = new RegisterFile();
    regs.snapshot();
    regs.write(8, 42);
    regs.write(9, 99);
    const changed = regs.getChanged();
    expect(changed.has(8)).toBe(true);
    expect(changed.has(9)).toBe(true);
    expect(changed.has(10)).toBe(false);
  });

  it('should reset to defaults', () => {
    const regs = new RegisterFile();
    regs.write(8, 42);
    regs.pc = 0x00400100;
    regs.reset();
    expect(regs.read(8)).toBe(0);
    expect(regs.pc).toBe(0x00400000);
    expect(regs.read(29)).toBe(0x7ffffffc);
  });
});
