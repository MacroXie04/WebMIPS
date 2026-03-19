import { ParsedInstruction, Operand } from './parser.js';
import { getInstruction, InstructionDef } from '../utils/instructions.js';

export interface EncodeError {
  line: number;
  message: string;
}

function getRegOp(op: Operand): number {
  return op.kind === 'register' ? op.value : 0;
}

function getImmOp(op: Operand): number {
  if (op.kind === 'immediate') return op.value;
  return 0;
}

export function encode(
  instr: ParsedInstruction,
  pc: number,
  symbolTable: Map<string, number>,
): { word: number; error?: EncodeError } {
  const def = getInstruction(instr.name);
  if (!def) {
    return { word: 0, error: { line: instr.line, message: `Unknown instruction: ${instr.name}` } };
  }

  try {
    const word = encodeWithDef(def, instr, pc, symbolTable);
    return { word };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { word: 0, error: { line: instr.line, message: msg } };
  }
}

function resolveLabel(op: Operand, symbolTable: Map<string, number>, line: number): number {
  if (op.kind === 'label' && op.label) {
    const addr = symbolTable.get(op.label);
    if (addr === undefined) {
      throw new Error(`Undefined label: ${op.label}`);
    }
    return addr;
  }
  if (op.kind === 'immediate') return op.value;
  return 0;
}

function encodeWithDef(
  def: InstructionDef,
  instr: ParsedInstruction,
  pc: number,
  symbolTable: Map<string, number>,
): number {
  const ops = instr.operands;

  switch (def.type) {
    case 'R':
      return encodeR(def, ops, instr.line);

    case 'I':
      return encodeI(def, ops, pc, symbolTable, instr.line);

    case 'REGIMM':
      return encodeRegimm(def, ops, pc, symbolTable, instr.line);

    case 'J':
      return encodeJ(def, ops, pc, symbolTable, instr.line);

    default:
      throw new Error(`Unknown instruction type: ${def.type}`);
  }
}

function encodeR(def: InstructionDef, ops: Operand[], line: number): number {
  let rs = 0, rt = 0, rd = 0, shamt = 0;
  const funct = def.funct ?? 0;

  switch (def.name) {
    // rd, rs, rt
    case 'add': case 'addu': case 'sub': case 'subu':
    case 'and': case 'or': case 'xor': case 'nor':
    case 'slt': case 'sltu':
      rd = getRegOp(ops[0]);
      rs = getRegOp(ops[1]);
      rt = getRegOp(ops[2]);
      break;

    // rd, rt, shamt
    case 'sll': case 'srl': case 'sra':
      rd = getRegOp(ops[0]);
      rt = getRegOp(ops[1]);
      shamt = getImmOp(ops[2]) & 0x1f;
      break;

    // rd, rt, rs (variable shifts)
    case 'sllv': case 'srlv': case 'srav':
      rd = getRegOp(ops[0]);
      rt = getRegOp(ops[1]);
      rs = getRegOp(ops[2]);
      break;

    // rs
    case 'jr': case 'mthi': case 'mtlo':
      rs = getRegOp(ops[0]);
      break;

    // rd, rs
    case 'jalr':
      if (ops.length >= 2) {
        rd = getRegOp(ops[0]);
        rs = getRegOp(ops[1]);
      } else {
        rd = 31; // $ra
        rs = getRegOp(ops[0]);
      }
      break;

    // rs, rt
    case 'mult': case 'multu': case 'div': case 'divu':
      rs = getRegOp(ops[0]);
      rt = getRegOp(ops[1]);
      break;

    // rd
    case 'mfhi': case 'mflo':
      rd = getRegOp(ops[0]);
      break;

    // no operands
    case 'syscall':
      break;

    default:
      throw new Error(`Unhandled R-type: ${def.name}`);
  }

  return ((def.opcode & 0x3f) << 26) |
         ((rs & 0x1f) << 21) |
         ((rt & 0x1f) << 16) |
         ((rd & 0x1f) << 11) |
         ((shamt & 0x1f) << 6) |
         (funct & 0x3f);
}

function encodeI(
  def: InstructionDef,
  ops: Operand[],
  pc: number,
  symbolTable: Map<string, number>,
  line: number,
): number {
  let rs = 0, rt = 0, immediate = 0;

  switch (def.name) {
    // rt, rs, imm
    case 'addi': case 'addiu': case 'slti': case 'sltiu':
    case 'andi': case 'ori': case 'xori':
      rt = getRegOp(ops[0]);
      rs = getRegOp(ops[1]);
      immediate = getImmOp(ops[2]);
      break;

    // rt, imm (lui)
    case 'lui':
      rt = getRegOp(ops[0]);
      immediate = getImmOp(ops[1]);
      break;

    // rt, offset(base) — load/store
    case 'lw': case 'sw': case 'lb': case 'lbu':
    case 'lh': case 'lhu': case 'sb': case 'sh': {
      rt = getRegOp(ops[0]);
      if (ops[1].kind === 'memory') {
        immediate = ops[1].value;
        rs = ops[1].base ?? 0;
      } else {
        // Support la-style: lw $t0, label — treated as offset from $zero
        immediate = getImmOp(ops[1]);
        rs = 0;
      }
      break;
    }

    // rs, rt, label (branches)
    case 'beq': case 'bne': {
      rs = getRegOp(ops[0]);
      rt = getRegOp(ops[1]);
      const target = resolveLabel(ops[2], symbolTable, line);
      immediate = ((target - (pc + 4)) >> 2) | 0;
      break;
    }

    // rs, label (bgtz, blez)
    case 'bgtz': case 'blez': {
      rs = getRegOp(ops[0]);
      rt = 0;
      const target = resolveLabel(ops[1], symbolTable, line);
      immediate = ((target - (pc + 4)) >> 2) | 0;
      break;
    }

    default:
      throw new Error(`Unhandled I-type: ${def.name}`);
  }

  return ((def.opcode & 0x3f) << 26) |
         ((rs & 0x1f) << 21) |
         ((rt & 0x1f) << 16) |
         (immediate & 0xffff);
}

function encodeRegimm(
  def: InstructionDef,
  ops: Operand[],
  pc: number,
  symbolTable: Map<string, number>,
  line: number,
): number {
  const rs = getRegOp(ops[0]);
  const rt = def.rt ?? 0;
  const target = resolveLabel(ops[1], symbolTable, line);
  const offset = ((target - (pc + 4)) >> 2) | 0;

  return ((def.opcode & 0x3f) << 26) |
         ((rs & 0x1f) << 21) |
         ((rt & 0x1f) << 16) |
         (offset & 0xffff);
}

function encodeJ(
  def: InstructionDef,
  ops: Operand[],
  pc: number,
  symbolTable: Map<string, number>,
  line: number,
): number {
  const target = resolveLabel(ops[0], symbolTable, line);
  const addr = (target >>> 2) & 0x3ffffff;

  return ((def.opcode & 0x3f) << 26) | addr;
}
