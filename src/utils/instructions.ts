// Operand types for instruction definitions
export type OperandType = 'rd' | 'rs' | 'rt' | 'shamt' | 'imm' | 'offset_base' | 'label' | 'target';

export interface InstructionDef {
  name: string;
  type: 'R' | 'I' | 'J' | 'REGIMM';
  opcode: number;
  funct?: number;
  rt?: number;         // for REGIMM instructions (bltz/bgez)
  operands: OperandType[];
}

// All supported real (non-pseudo) instructions
export const INSTRUCTIONS: InstructionDef[] = [
  // R-type (opcode = 0x00)
  { name: 'add',    type: 'R', opcode: 0x00, funct: 0x20, operands: ['rd', 'rs', 'rt'] },
  { name: 'addu',   type: 'R', opcode: 0x00, funct: 0x21, operands: ['rd', 'rs', 'rt'] },
  { name: 'sub',    type: 'R', opcode: 0x00, funct: 0x22, operands: ['rd', 'rs', 'rt'] },
  { name: 'subu',   type: 'R', opcode: 0x00, funct: 0x23, operands: ['rd', 'rs', 'rt'] },
  { name: 'and',    type: 'R', opcode: 0x00, funct: 0x24, operands: ['rd', 'rs', 'rt'] },
  { name: 'or',     type: 'R', opcode: 0x00, funct: 0x25, operands: ['rd', 'rs', 'rt'] },
  { name: 'xor',    type: 'R', opcode: 0x00, funct: 0x26, operands: ['rd', 'rs', 'rt'] },
  { name: 'nor',    type: 'R', opcode: 0x00, funct: 0x27, operands: ['rd', 'rs', 'rt'] },
  { name: 'slt',    type: 'R', opcode: 0x00, funct: 0x2a, operands: ['rd', 'rs', 'rt'] },
  { name: 'sltu',   type: 'R', opcode: 0x00, funct: 0x2b, operands: ['rd', 'rs', 'rt'] },
  { name: 'sll',    type: 'R', opcode: 0x00, funct: 0x00, operands: ['rd', 'rt', 'shamt'] },
  { name: 'srl',    type: 'R', opcode: 0x00, funct: 0x02, operands: ['rd', 'rt', 'shamt'] },
  { name: 'sra',    type: 'R', opcode: 0x00, funct: 0x03, operands: ['rd', 'rt', 'shamt'] },
  { name: 'sllv',   type: 'R', opcode: 0x00, funct: 0x04, operands: ['rd', 'rt', 'rs'] },
  { name: 'srlv',   type: 'R', opcode: 0x00, funct: 0x06, operands: ['rd', 'rt', 'rs'] },
  { name: 'srav',   type: 'R', opcode: 0x00, funct: 0x07, operands: ['rd', 'rt', 'rs'] },
  { name: 'jr',     type: 'R', opcode: 0x00, funct: 0x08, operands: ['rs'] },
  { name: 'jalr',   type: 'R', opcode: 0x00, funct: 0x09, operands: ['rd', 'rs'] },
  { name: 'mult',   type: 'R', opcode: 0x00, funct: 0x18, operands: ['rs', 'rt'] },
  { name: 'multu',  type: 'R', opcode: 0x00, funct: 0x19, operands: ['rs', 'rt'] },
  { name: 'div',    type: 'R', opcode: 0x00, funct: 0x1a, operands: ['rs', 'rt'] },
  { name: 'divu',   type: 'R', opcode: 0x00, funct: 0x1b, operands: ['rs', 'rt'] },
  { name: 'mfhi',   type: 'R', opcode: 0x00, funct: 0x10, operands: ['rd'] },
  { name: 'mflo',   type: 'R', opcode: 0x00, funct: 0x12, operands: ['rd'] },
  { name: 'mthi',   type: 'R', opcode: 0x00, funct: 0x11, operands: ['rs'] },
  { name: 'mtlo',   type: 'R', opcode: 0x00, funct: 0x13, operands: ['rs'] },
  { name: 'syscall', type: 'R', opcode: 0x00, funct: 0x0c, operands: [] },

  // I-type
  { name: 'addi',   type: 'I', opcode: 0x08, operands: ['rt', 'rs', 'imm'] },
  { name: 'addiu',  type: 'I', opcode: 0x09, operands: ['rt', 'rs', 'imm'] },
  { name: 'andi',   type: 'I', opcode: 0x0c, operands: ['rt', 'rs', 'imm'] },
  { name: 'ori',    type: 'I', opcode: 0x0d, operands: ['rt', 'rs', 'imm'] },
  { name: 'xori',   type: 'I', opcode: 0x0e, operands: ['rt', 'rs', 'imm'] },
  { name: 'slti',   type: 'I', opcode: 0x0a, operands: ['rt', 'rs', 'imm'] },
  { name: 'sltiu',  type: 'I', opcode: 0x0b, operands: ['rt', 'rs', 'imm'] },
  { name: 'lui',    type: 'I', opcode: 0x0f, operands: ['rt', 'imm'] },
  { name: 'lw',     type: 'I', opcode: 0x23, operands: ['rt', 'offset_base'] },
  { name: 'sw',     type: 'I', opcode: 0x2b, operands: ['rt', 'offset_base'] },
  { name: 'lb',     type: 'I', opcode: 0x20, operands: ['rt', 'offset_base'] },
  { name: 'lbu',    type: 'I', opcode: 0x24, operands: ['rt', 'offset_base'] },
  { name: 'lh',     type: 'I', opcode: 0x21, operands: ['rt', 'offset_base'] },
  { name: 'lhu',    type: 'I', opcode: 0x25, operands: ['rt', 'offset_base'] },
  { name: 'sb',     type: 'I', opcode: 0x28, operands: ['rt', 'offset_base'] },
  { name: 'sh',     type: 'I', opcode: 0x29, operands: ['rt', 'offset_base'] },
  { name: 'beq',    type: 'I', opcode: 0x04, operands: ['rs', 'rt', 'label'] },
  { name: 'bne',    type: 'I', opcode: 0x05, operands: ['rs', 'rt', 'label'] },
  { name: 'bgtz',   type: 'I', opcode: 0x07, operands: ['rs', 'label'] },
  { name: 'blez',   type: 'I', opcode: 0x06, operands: ['rs', 'label'] },

  // REGIMM (opcode = 0x01)
  { name: 'bltz',   type: 'REGIMM', opcode: 0x01, rt: 0x00, operands: ['rs', 'label'] },
  { name: 'bgez',   type: 'REGIMM', opcode: 0x01, rt: 0x01, operands: ['rs', 'label'] },

  // J-type
  { name: 'j',      type: 'J', opcode: 0x02, operands: ['target'] },
  { name: 'jal',    type: 'J', opcode: 0x03, operands: ['target'] },
];

// Lookup by name
const instructionMap = new Map<string, InstructionDef>();
for (const instr of INSTRUCTIONS) {
  instructionMap.set(instr.name, instr);
}

export function getInstruction(name: string): InstructionDef | undefined {
  return instructionMap.get(name);
}

// Set of known pseudo-instruction names
export const PSEUDO_INSTRUCTIONS = new Set([
  'li', 'la', 'move', 'nop', 'not', 'neg', 'negu',
  'blt', 'bgt', 'ble', 'bge', 'bltu', 'bgtu', 'bleu', 'bgeu',
  'mul',
]);
