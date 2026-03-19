export class Memory {
  private data = new Map<number, number>();

  readByte(addr: number): number {
    return this.data.get(addr >>> 0) ?? 0;
  }

  writeByte(addr: number, value: number): void {
    this.data.set(addr >>> 0, value & 0xff);
  }

  readHalf(addr: number): number {
    const a = addr >>> 0;
    const b0 = this.readByte(a);
    const b1 = this.readByte(a + 1);
    const val = b0 | (b1 << 8);
    // Sign-extend from 16 bits
    return (val << 16) >> 16;
  }

  readHalfUnsigned(addr: number): number {
    const a = addr >>> 0;
    return this.readByte(a) | (this.readByte(a + 1) << 8);
  }

  writeHalf(addr: number, value: number): void {
    const a = addr >>> 0;
    this.writeByte(a, value & 0xff);
    this.writeByte(a + 1, (value >> 8) & 0xff);
  }

  readWord(addr: number): number {
    const a = addr >>> 0;
    const b0 = this.readByte(a);
    const b1 = this.readByte(a + 1);
    const b2 = this.readByte(a + 2);
    const b3 = this.readByte(a + 3);
    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) | 0;
  }

  writeWord(addr: number, value: number): void {
    const a = addr >>> 0;
    this.writeByte(a, value & 0xff);
    this.writeByte(a + 1, (value >> 8) & 0xff);
    this.writeByte(a + 2, (value >> 16) & 0xff);
    this.writeByte(a + 3, (value >> 24) & 0xff);
  }

  readString(addr: number): string {
    let s = '';
    let a = addr >>> 0;
    while (true) {
      const b = this.readByte(a);
      if (b === 0) break;
      s += String.fromCharCode(b);
      a++;
    }
    return s;
  }

  writeString(addr: number, str: string, nullTerminate = true): number {
    let a = addr >>> 0;
    for (let i = 0; i < str.length; i++) {
      this.writeByte(a++, str.charCodeAt(i) & 0xff);
    }
    if (nullTerminate) {
      this.writeByte(a++, 0);
    }
    return a - (addr >>> 0);
  }

  loadBytes(base: number, bytes: Uint8Array): void {
    let a = base >>> 0;
    for (let i = 0; i < bytes.length; i++) {
      this.writeByte(a++, bytes[i]);
    }
  }

  reset(): void {
    this.data.clear();
  }
}
