import { RegisterFile } from './registers.js';
import { Memory } from './memory.js';
import { SyscallHandler, HaltException, InputRequestException, ConsoleOutputFn } from './syscalls.js';
import { AssemblyResult } from '../assembler/assembler.js';
import { REGISTER_NAMES } from '../utils/constants.js';

export type CpuState = 'idle' | 'ready' | 'running' | 'paused' | 'halted' | 'waiting_input';

export interface DecodedInstruction {
  pc: number;
  word: number;
  name: string;
  fullText: string;
  opcode: number;
  rs: number; rt: number; rd: number;
  shamt: number; funct: number;
  imm: number;
  type: 'R' | 'I' | 'J';
  isMemOp: boolean;
  isStore: boolean;
  memAddr?: number;
  destReg?: number;
  destValue?: number;
}

export interface CpuCallbacks {
  onConsoleOutput: ConsoleOutputFn;
  onStateChange: (state: CpuState) => void;
  onStep: () => void;  // called after each instruction for UI update
}

export class CPU {
  readonly registers: RegisterFile;
  readonly memory: Memory;
  private syscallHandler: SyscallHandler;
  private callbacks: CpuCallbacks;

  state: CpuState = 'idle';
  instrCount = 0;
  sourceMap = new Map<number, number>();
  lastInstruction: DecodedInstruction | null = null;
  pipelineHistory: DecodedInstruction[] = [];
  private static readonly MAX_HISTORY = 8;

  private runResolve: (() => void) | null = null;
  private pendingInput: InputRequestException | null = null;
  private shouldStop = false;
  private speed = 0; // 0 = max speed (ms between steps)

  constructor(callbacks: CpuCallbacks) {
    this.registers = new RegisterFile();
    this.memory = new Memory();
    this.callbacks = callbacks;
    this.syscallHandler = new SyscallHandler(
      this.registers,
      this.memory,
      callbacks.onConsoleOutput,
    );
  }

  loadProgram(result: AssemblyResult): void {
    this.memory.loadBytes(result.textBase, result.textSegment);
    this.memory.loadBytes(result.dataBase, result.dataSegment);
    this.sourceMap = result.sourceMap;
    this.instrCount = 0;
    this.lastInstruction = null;
    this.pipelineHistory = [];
    this.setState('ready');
  }

  step(): 'ok' | 'halted' | 'input' | 'error' {
    if (this.state === 'halted') return 'halted';

    this.registers.snapshot();

    const fetchPC = this.registers.pc;

    try {
      const word = this.memory.readWord(this.registers.pc);
      this.registers.pc = (this.registers.pc + 4) | 0;
      this.executeWord(word);
      this.instrCount++;

      // Capture decoded instruction
      this.lastInstruction = this.decodeForDisplay(fetchPC, word);
      this.pushHistory(this.lastInstruction);

      return 'ok';
    } catch (e) {
      if (e instanceof HaltException) {
        const word = this.memory.readWord(fetchPC);
        this.lastInstruction = this.decodeForDisplay(fetchPC, word);
        this.pushHistory(this.lastInstruction);
        this.setState('halted');
        return 'halted';
      }
      if (e instanceof InputRequestException) {
        const word = this.memory.readWord(fetchPC);
        this.lastInstruction = this.decodeForDisplay(fetchPC, word);
        this.pushHistory(this.lastInstruction);
        this.pendingInput = e;
        this.instrCount++;
        this.setState('waiting_input');
        return 'input';
      }
      this.setState('halted');
      this.callbacks.onConsoleOutput(`\n[Runtime error: ${e instanceof Error ? e.message : String(e)}]\n`);
      return 'error';
    }
  }

  private pushHistory(instr: DecodedInstruction): void {
    this.pipelineHistory.push(instr);
    if (this.pipelineHistory.length > CPU.MAX_HISTORY) {
      this.pipelineHistory.shift();
    }
  }

  setSpeed(delay: number): void {
    this.speed = delay;
  }

  async run(delay = 0): Promise<void> {
    this.shouldStop = false;
    this.speed = delay;
    this.setState('running');

    return new Promise<void>((resolve) => {
      this.runResolve = resolve;
      this.runLoop();
    });
  }

  private runLoop(): void {
    if (this.shouldStop || this.state !== 'running') {
      if (this.state === 'running') this.setState('paused');
      this.runResolve?.();
      this.runResolve = null;
      return;
    }

    const batchSize = this.speed === 0 ? 1000 : 1;

    for (let i = 0; i < batchSize; i++) {
      const result = this.step();
      if (result === 'halted' || result === 'error') {
        this.callbacks.onStep();
        this.runResolve?.();
        this.runResolve = null;
        return;
      }
      if (result === 'input') {
        // Pause for input — will resume via submitInput()
        this.callbacks.onStep();
        return;
      }
    }

    this.callbacks.onStep();
    setTimeout(() => this.runLoop(), this.speed);
  }

  stop(): void {
    this.shouldStop = true;
    if (this.state === 'running') {
      this.setState('paused');
    }
  }

  submitInput(input: string): void {
    if (this.pendingInput && this.state === 'waiting_input') {
      this.syscallHandler.completeInput(this.pendingInput, input);
      this.pendingInput = null;

      // Resume running if we were in run mode
      if (this.runResolve) {
        this.setState('running');
        setTimeout(() => this.runLoop(), 0);
      } else {
        this.setState('ready');
        this.callbacks.onStep();
      }
    }
  }

  reset(): void {
    this.shouldStop = true;
    this.registers.reset();
    this.memory.reset();
    this.instrCount = 0;
    this.pendingInput = null;
    this.lastInstruction = null;
    this.pipelineHistory = [];
    this.sourceMap.clear();
    this.setState('idle');
  }

  getCurrentLine(): number | undefined {
    // Use the PC of the last executed instruction, not the current PC
    // (which already points to the next instruction)
    if (this.lastInstruction) {
      return this.sourceMap.get(this.lastInstruction.pc);
    }
    return this.sourceMap.get(this.registers.pc);
  }

  private setState(state: CpuState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private signExtend16(val: number): number {
    return (val << 16) >> 16;
  }

  private executeWord(word: number): void {
    const opcode = (word >>> 26) & 0x3f;
    const rs = (word >>> 21) & 0x1f;
    const rt = (word >>> 16) & 0x1f;
    const rd = (word >>> 11) & 0x1f;
    const shamt = (word >>> 6) & 0x1f;
    const funct = word & 0x3f;
    const imm = this.signExtend16(word & 0xffff);
    const uimm = word & 0xffff;
    const target = word & 0x3ffffff;

    const regs = this.registers;

    switch (opcode) {
      case 0x00: // R-type
        this.executeRType(rs, rt, rd, shamt, funct);
        break;

      case 0x01: // REGIMM
        this.executeRegimm(rs, rt, imm);
        break;

      // J-type
      case 0x02: // j
        regs.pc = ((regs.pc) & 0xf0000000) | (target << 2);
        break;

      case 0x03: // jal
        regs.write(31, regs.pc); // $ra = PC (already incremented)
        regs.pc = ((regs.pc) & 0xf0000000) | (target << 2);
        break;

      // I-type branches
      case 0x04: // beq
        if (regs.read(rs) === regs.read(rt)) {
          regs.pc = (regs.pc + (imm << 2)) | 0;
        }
        break;

      case 0x05: // bne
        if (regs.read(rs) !== regs.read(rt)) {
          regs.pc = (regs.pc + (imm << 2)) | 0;
        }
        break;

      case 0x06: // blez
        if (regs.read(rs) <= 0) {
          regs.pc = (regs.pc + (imm << 2)) | 0;
        }
        break;

      case 0x07: // bgtz
        if (regs.read(rs) > 0) {
          regs.pc = (regs.pc + (imm << 2)) | 0;
        }
        break;

      // I-type ALU
      case 0x08: // addi
        regs.write(rt, (regs.read(rs) + imm) | 0);
        break;

      case 0x09: // addiu
        regs.write(rt, (regs.read(rs) + imm) | 0);
        break;

      case 0x0a: // slti
        regs.write(rt, regs.read(rs) < imm ? 1 : 0);
        break;

      case 0x0b: // sltiu
        regs.write(rt, (regs.read(rs) >>> 0) < (imm >>> 0) ? 1 : 0);
        break;

      case 0x0c: // andi
        regs.write(rt, regs.read(rs) & uimm);
        break;

      case 0x0d: // ori
        regs.write(rt, regs.read(rs) | uimm);
        break;

      case 0x0e: // xori
        regs.write(rt, regs.read(rs) ^ uimm);
        break;

      case 0x0f: // lui
        regs.write(rt, (uimm << 16) | 0);
        break;

      // Load instructions
      case 0x20: // lb
        regs.write(rt, (this.memory.readByte((regs.read(rs) + imm) | 0) << 24) >> 24);
        break;

      case 0x21: // lh
        regs.write(rt, this.memory.readHalf((regs.read(rs) + imm) | 0));
        break;

      case 0x23: // lw
        regs.write(rt, this.memory.readWord((regs.read(rs) + imm) | 0));
        break;

      case 0x24: // lbu
        regs.write(rt, this.memory.readByte((regs.read(rs) + imm) | 0));
        break;

      case 0x25: // lhu
        regs.write(rt, this.memory.readHalfUnsigned((regs.read(rs) + imm) | 0));
        break;

      // Store instructions
      case 0x28: // sb
        this.memory.writeByte((regs.read(rs) + imm) | 0, regs.read(rt));
        break;

      case 0x29: // sh
        this.memory.writeHalf((regs.read(rs) + imm) | 0, regs.read(rt));
        break;

      case 0x2b: // sw
        this.memory.writeWord((regs.read(rs) + imm) | 0, regs.read(rt));
        break;

      default:
        throw new Error(`Unknown opcode: 0x${opcode.toString(16).padStart(2, '0')} at PC=0x${((regs.pc - 4) >>> 0).toString(16)}`);
    }
  }

  private executeRType(rs: number, rt: number, rd: number, shamt: number, funct: number): void {
    const regs = this.registers;

    switch (funct) {
      case 0x00: // sll
        regs.write(rd, (regs.read(rt) << shamt) | 0);
        break;

      case 0x02: // srl
        regs.write(rd, regs.read(rt) >>> shamt);
        break;

      case 0x03: // sra
        regs.write(rd, regs.read(rt) >> shamt);
        break;

      case 0x04: // sllv
        regs.write(rd, (regs.read(rt) << (regs.read(rs) & 0x1f)) | 0);
        break;

      case 0x06: // srlv
        regs.write(rd, regs.read(rt) >>> (regs.read(rs) & 0x1f));
        break;

      case 0x07: // srav
        regs.write(rd, regs.read(rt) >> (regs.read(rs) & 0x1f));
        break;

      case 0x08: // jr
        regs.pc = regs.read(rs);
        break;

      case 0x09: // jalr
        regs.write(rd, regs.pc);
        regs.pc = regs.read(rs);
        break;

      case 0x0c: { // syscall
        const result = this.syscallHandler.handle();
        if (result) throw result;
        break;
      }

      case 0x10: // mfhi
        regs.write(rd, regs.hi);
        break;

      case 0x11: // mthi
        regs.hi = regs.read(rs);
        break;

      case 0x12: // mflo
        regs.write(rd, regs.lo);
        break;

      case 0x13: // mtlo
        regs.lo = regs.read(rs);
        break;

      case 0x18: { // mult (signed)
        const a = BigInt(regs.read(rs));
        const b = BigInt(regs.read(rt));
        const product = a * b;
        regs.lo = Number(product & 0xffffffffn) | 0;
        regs.hi = Number((product >> 32n) & 0xffffffffn) | 0;
        break;
      }

      case 0x19: { // multu (unsigned)
        const a = BigInt(regs.read(rs) >>> 0);
        const b = BigInt(regs.read(rt) >>> 0);
        const product = a * b;
        regs.lo = Number(product & 0xffffffffn) | 0;
        regs.hi = Number((product >> 32n) & 0xffffffffn) | 0;
        break;
      }

      case 0x1a: { // div
        const divisor = regs.read(rt);
        if (divisor !== 0) {
          regs.lo = (regs.read(rs) / divisor) | 0;
          regs.hi = (regs.read(rs) % divisor) | 0;
        }
        break;
      }

      case 0x1b: { // divu
        const divisor = regs.read(rt) >>> 0;
        if (divisor !== 0) {
          regs.lo = ((regs.read(rs) >>> 0) / divisor) | 0;
          regs.hi = ((regs.read(rs) >>> 0) % divisor) | 0;
        }
        break;
      }

      case 0x20: // add
        regs.write(rd, (regs.read(rs) + regs.read(rt)) | 0);
        break;

      case 0x21: // addu
        regs.write(rd, (regs.read(rs) + regs.read(rt)) | 0);
        break;

      case 0x22: // sub
        regs.write(rd, (regs.read(rs) - regs.read(rt)) | 0);
        break;

      case 0x23: // subu
        regs.write(rd, (regs.read(rs) - regs.read(rt)) | 0);
        break;

      case 0x24: // and
        regs.write(rd, regs.read(rs) & regs.read(rt));
        break;

      case 0x25: // or
        regs.write(rd, regs.read(rs) | regs.read(rt));
        break;

      case 0x26: // xor
        regs.write(rd, regs.read(rs) ^ regs.read(rt));
        break;

      case 0x27: // nor
        regs.write(rd, ~(regs.read(rs) | regs.read(rt)));
        break;

      case 0x2a: // slt
        regs.write(rd, regs.read(rs) < regs.read(rt) ? 1 : 0);
        break;

      case 0x2b: // sltu
        regs.write(rd, (regs.read(rs) >>> 0) < (regs.read(rt) >>> 0) ? 1 : 0);
        break;

      default:
        throw new Error(`Unknown R-type funct: 0x${funct.toString(16).padStart(2, '0')}`);
    }
  }

  private executeRegimm(rs: number, rt: number, imm: number): void {
    const regs = this.registers;
    const rsVal = regs.read(rs);

    switch (rt) {
      case 0x00: // bltz
        if (rsVal < 0) {
          regs.pc = (regs.pc + (imm << 2)) | 0;
        }
        break;

      case 0x01: // bgez
        if (rsVal >= 0) {
          regs.pc = (regs.pc + (imm << 2)) | 0;
        }
        break;

      default:
        throw new Error(`Unknown REGIMM rt: 0x${rt.toString(16).padStart(2, '0')}`);
    }
  }

  private decodeForDisplay(pc: number, word: number): DecodedInstruction {
    const opcode = (word >>> 26) & 0x3f;
    const rs = (word >>> 21) & 0x1f;
    const rt = (word >>> 16) & 0x1f;
    const rd = (word >>> 11) & 0x1f;
    const shamt = (word >>> 6) & 0x1f;
    const funct = word & 0x3f;
    const imm = this.signExtend16(word & 0xffff);
    const uimm = word & 0xffff;
    const target = word & 0x3ffffff;

    const R = REGISTER_NAMES;
    let name = '???';
    let fullText = '???';
    let type: 'R' | 'I' | 'J' = 'R';
    let isMemOp = false;
    let isStore = false;
    let memAddr: number | undefined;
    let destReg: number | undefined;
    let destValue: number | undefined;

    const changed = this.registers.getChanged();
    // Find dest reg and value from changes
    for (const idx of changed) {
      if (idx < 32) { destReg = idx; destValue = this.registers.read(idx); break; }
    }
    if (changed.has(32)) { /* pc changed is normal */ }

    if (opcode === 0) {
      type = 'R';
      const rNames: Record<number, string> = {
        0x00:'sll',0x02:'srl',0x03:'sra',0x04:'sllv',0x06:'srlv',0x07:'srav',
        0x08:'jr',0x09:'jalr',0x0c:'syscall',
        0x10:'mfhi',0x11:'mthi',0x12:'mflo',0x13:'mtlo',
        0x18:'mult',0x19:'multu',0x1a:'div',0x1b:'divu',
        0x20:'add',0x21:'addu',0x22:'sub',0x23:'subu',
        0x24:'and',0x25:'or',0x26:'xor',0x27:'nor',
        0x2a:'slt',0x2b:'sltu',
      };
      name = rNames[funct] || `funct(0x${funct.toString(16)})`;

      if (funct === 0x0c) { fullText = 'syscall'; }
      else if (funct === 0x08) { fullText = `jr ${R[rs]}`; }
      else if (funct === 0x09) { fullText = `jalr ${R[rd]}, ${R[rs]}`; }
      else if (funct === 0x10) { fullText = `mfhi ${R[rd]}`; }
      else if (funct === 0x12) { fullText = `mflo ${R[rd]}`; }
      else if (funct === 0x11) { fullText = `mthi ${R[rs]}`; }
      else if (funct === 0x13) { fullText = `mtlo ${R[rs]}`; }
      else if (funct === 0x18 || funct === 0x19) { fullText = `${name} ${R[rs]}, ${R[rt]}`; }
      else if (funct === 0x1a || funct === 0x1b) { fullText = `${name} ${R[rs]}, ${R[rt]}`; }
      else if (funct <= 0x03) { fullText = `${name} ${R[rd]}, ${R[rt]}, ${shamt}`; }
      else if (funct <= 0x07) { fullText = `${name} ${R[rd]}, ${R[rt]}, ${R[rs]}`; }
      else { fullText = `${name} ${R[rd]}, ${R[rs]}, ${R[rt]}`; }
    } else if (opcode === 0x01) {
      type = 'I';
      name = rt === 0 ? 'bltz' : 'bgez';
      fullText = `${name} ${R[rs]}, ${imm}`;
    } else if (opcode === 0x02 || opcode === 0x03) {
      type = 'J';
      name = opcode === 0x02 ? 'j' : 'jal';
      fullText = `${name} 0x${(target << 2).toString(16)}`;
      if (opcode === 0x03) { destReg = 31; destValue = this.registers.read(31); }
    } else {
      type = 'I';
      const iNames: Record<number, string> = {
        0x04:'beq',0x05:'bne',0x06:'blez',0x07:'bgtz',
        0x08:'addi',0x09:'addiu',0x0a:'slti',0x0b:'sltiu',
        0x0c:'andi',0x0d:'ori',0x0e:'xori',0x0f:'lui',
        0x20:'lb',0x21:'lh',0x23:'lw',0x24:'lbu',0x25:'lhu',
        0x28:'sb',0x29:'sh',0x2b:'sw',
      };
      name = iNames[opcode] || `op(0x${opcode.toString(16)})`;

      const loadOps = new Set([0x20,0x21,0x23,0x24,0x25]);
      const storeOps = new Set([0x28,0x29,0x2b]);
      isMemOp = loadOps.has(opcode) || storeOps.has(opcode);
      isStore = storeOps.has(opcode);

      if (isMemOp) {
        memAddr = (this.registers.read(rs) + imm) | 0;
        // For loads, note we use the pre-exec rs value is still in snapshot
        fullText = `${name} ${R[rt]}, ${imm}(${R[rs]})`;
      } else if (opcode === 0x0f) {
        fullText = `lui ${R[rt]}, 0x${uimm.toString(16)}`;
      } else if (opcode >= 0x04 && opcode <= 0x07) {
        if (opcode === 0x04 || opcode === 0x05) {
          fullText = `${name} ${R[rs]}, ${R[rt]}, ${imm}`;
        } else {
          fullText = `${name} ${R[rs]}, ${imm}`;
        }
      } else {
        fullText = `${name} ${R[rt]}, ${R[rs]}, ${imm}`;
      }
    }

    if (isMemOp && memAddr !== undefined) {
      if (!isStore) { destReg = rt; destValue = this.registers.read(rt); }
    }

    return { pc, word, name, fullText, opcode, rs, rt, rd, shamt, funct, imm, type, isMemOp, isStore, memAddr, destReg, destValue };
  }
}
