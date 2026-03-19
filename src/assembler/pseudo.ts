import { ParsedInstruction, Operand } from './parser.js';

// Returns the number of real instructions a pseudo-instruction expands to.
// Used in pass 1 for address calculation.
export function pseudoSize(name: string, operands: Operand[]): number {
  switch (name) {
    case 'nop':
    case 'move':
    case 'not':
    case 'neg':
    case 'negu':
      return 1;

    case 'li': {
      // If immediate fits in signed 16-bit, 1 instruction; otherwise 2
      const imm = operands[1];
      if (imm.kind === 'immediate') {
        const v = imm.value;
        if (v >= -32768 && v <= 65535) return 1;
      }
      return 2;
    }

    case 'la':
      return 2; // lui + ori

    case 'blt':
    case 'bgt':
    case 'ble':
    case 'bge':
    case 'bltu':
    case 'bgtu':
    case 'bleu':
    case 'bgeu':
      return 2; // slt + branch

    case 'mul':
      return 2; // mult + mflo

    default:
      return 1;
  }
}

function reg(value: number): Operand {
  return { kind: 'register', value };
}

function imm(value: number): Operand {
  return { kind: 'immediate', value };
}

function lbl(name: string): Operand {
  return { kind: 'label', value: 0, label: name };
}

// Expand pseudo-instructions into real instructions.
// symbolTable is needed for `la` to compute upper/lower halves.
export function expandPseudos(
  instructions: ParsedInstruction[],
  symbolTable: Map<string, number>,
): ParsedInstruction[] {
  const result: ParsedInstruction[] = [];

  for (const instr of instructions) {
    const { name, operands, label, line } = instr;
    const expanded = expandOne(name, operands, symbolTable, line);
    if (expanded) {
      // Attach the label to the first expanded instruction
      expanded[0].label = label;
      result.push(...expanded);
    } else {
      result.push(instr);
    }
  }

  return result;
}

function expandOne(
  name: string,
  ops: Operand[],
  symbolTable: Map<string, number>,
  line: number,
): ParsedInstruction[] | null {
  switch (name) {
    case 'nop':
      return [{ name: 'sll', operands: [reg(0), reg(0), imm(0)], line }];

    case 'move':
      // move $rd, $rs → or $rd, $rs, $zero
      return [{ name: 'or', operands: [ops[0], ops[1], reg(0)], line }];

    case 'not':
      // not $rd, $rs → nor $rd, $rs, $zero
      return [{ name: 'nor', operands: [ops[0], ops[1], reg(0)], line }];

    case 'neg':
      // neg $rd, $rs → sub $rd, $zero, $rs
      return [{ name: 'sub', operands: [ops[0], reg(0), ops[1]], line }];

    case 'negu':
      // negu $rd, $rs → subu $rd, $zero, $rs
      return [{ name: 'subu', operands: [ops[0], reg(0), ops[1]], line }];

    case 'li': {
      const rd = ops[0];
      const val = ops[1].kind === 'immediate' ? ops[1].value : 0;

      // Fits in signed 16-bit
      if (val >= -32768 && val <= 32767) {
        return [{ name: 'addiu', operands: [rd, reg(0), imm(val)], line }];
      }
      // Fits in unsigned 16-bit
      if (val >= 0 && val <= 65535) {
        return [{ name: 'ori', operands: [rd, reg(0), imm(val)], line }];
      }
      // Need lui + ori
      const upper = (val >>> 16) & 0xffff;
      const lower = val & 0xffff;
      const result: ParsedInstruction[] = [
        { name: 'lui', operands: [rd, imm(upper)], line },
      ];
      if (lower !== 0) {
        result.push({ name: 'ori', operands: [rd, rd, imm(lower)], line });
      } else {
        // Still need to return 2 for size consistency if we promised 2
        // Actually, if lower is 0, we can use just lui (1 instruction)
        // But pseudoSize might have returned 2. Let's just always emit 2 for consistency.
        result.push({ name: 'ori', operands: [rd, rd, imm(0)], line });
      }
      return result;
    }

    case 'la': {
      const rd = ops[0];
      let addr = 0;
      if (ops[1].kind === 'label' && ops[1].label) {
        addr = symbolTable.get(ops[1].label) ?? 0;
      } else if (ops[1].kind === 'immediate') {
        addr = ops[1].value;
      }
      const upper = (addr >>> 16) & 0xffff;
      const lower = addr & 0xffff;
      return [
        { name: 'lui', operands: [reg(1), imm(upper)], line }, // $at
        { name: 'ori', operands: [rd, reg(1), imm(lower)], line },
      ];
    }

    case 'blt':
      // blt $rs, $rt, label → slt $at, $rs, $rt + bne $at, $zero, label
      return [
        { name: 'slt', operands: [reg(1), ops[0], ops[1]], line },
        { name: 'bne', operands: [reg(1), reg(0), ops[2]], line },
      ];

    case 'bgt':
      // bgt $rs, $rt, label → slt $at, $rt, $rs + bne $at, $zero, label
      return [
        { name: 'slt', operands: [reg(1), ops[1], ops[0]], line },
        { name: 'bne', operands: [reg(1), reg(0), ops[2]], line },
      ];

    case 'ble':
      // ble $rs, $rt, label → slt $at, $rt, $rs + beq $at, $zero, label
      return [
        { name: 'slt', operands: [reg(1), ops[1], ops[0]], line },
        { name: 'beq', operands: [reg(1), reg(0), ops[2]], line },
      ];

    case 'bge':
      // bge $rs, $rt, label → slt $at, $rs, $rt + beq $at, $zero, label
      return [
        { name: 'slt', operands: [reg(1), ops[0], ops[1]], line },
        { name: 'beq', operands: [reg(1), reg(0), ops[2]], line },
      ];

    case 'bltu':
      return [
        { name: 'sltu', operands: [reg(1), ops[0], ops[1]], line },
        { name: 'bne', operands: [reg(1), reg(0), ops[2]], line },
      ];

    case 'bgtu':
      return [
        { name: 'sltu', operands: [reg(1), ops[1], ops[0]], line },
        { name: 'bne', operands: [reg(1), reg(0), ops[2]], line },
      ];

    case 'bleu':
      return [
        { name: 'sltu', operands: [reg(1), ops[1], ops[0]], line },
        { name: 'beq', operands: [reg(1), reg(0), ops[2]], line },
      ];

    case 'bgeu':
      return [
        { name: 'sltu', operands: [reg(1), ops[0], ops[1]], line },
        { name: 'beq', operands: [reg(1), reg(0), ops[2]], line },
      ];

    case 'mul':
      // mul $rd, $rs, $rt → mult $rs, $rt + mflo $rd
      return [
        { name: 'mult', operands: [ops[1], ops[2]], line },
        { name: 'mflo', operands: [ops[0]], line },
      ];

    default:
      return null;
  }
}
