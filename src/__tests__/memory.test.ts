import { describe, it, expect } from 'vitest';
import { Memory } from '../simulator/memory.js';

describe('Memory', () => {
  it('should read zero from uninitialized memory', () => {
    const mem = new Memory();
    expect(mem.readByte(0x10010000)).toBe(0);
    expect(mem.readWord(0x10010000)).toBe(0);
  });

  it('should write and read bytes', () => {
    const mem = new Memory();
    mem.writeByte(0x10010000, 0xAB);
    expect(mem.readByte(0x10010000)).toBe(0xAB);
  });

  it('should write and read words (little-endian)', () => {
    const mem = new Memory();
    mem.writeWord(0x10010000, 0x12345678);
    expect(mem.readByte(0x10010000)).toBe(0x78);
    expect(mem.readByte(0x10010001)).toBe(0x56);
    expect(mem.readByte(0x10010002)).toBe(0x34);
    expect(mem.readByte(0x10010003)).toBe(0x12);
    expect(mem.readWord(0x10010000)).toBe(0x12345678);
  });

  it('should write and read strings', () => {
    const mem = new Memory();
    mem.writeString(0x10010000, 'Hello');
    expect(mem.readString(0x10010000)).toBe('Hello');
    expect(mem.readByte(0x10010005)).toBe(0); // null terminator
  });

  it('should write and read half words', () => {
    const mem = new Memory();
    mem.writeHalf(0x10010000, 0x1234);
    expect(mem.readHalfUnsigned(0x10010000)).toBe(0x1234);
  });

  it('should sign-extend half reads', () => {
    const mem = new Memory();
    mem.writeHalf(0x10010000, 0xFFFF);
    expect(mem.readHalf(0x10010000)).toBe(-1);
    expect(mem.readHalfUnsigned(0x10010000)).toBe(0xFFFF);
  });

  it('should handle negative word values', () => {
    const mem = new Memory();
    mem.writeWord(0x10010000, -1);
    expect(mem.readWord(0x10010000)).toBe(-1);
    expect(mem.readByte(0x10010000)).toBe(0xFF);
  });

  it('should reset and clear all data', () => {
    const mem = new Memory();
    mem.writeWord(0x10010000, 42);
    mem.reset();
    expect(mem.readWord(0x10010000)).toBe(0);
  });

  it('should load bytes in bulk', () => {
    const mem = new Memory();
    const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    mem.loadBytes(0x10010000, data);
    expect(mem.readWord(0x10010000)).toBe(0x04030201); // little-endian
  });
});
