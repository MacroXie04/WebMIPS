import { tokenize } from './lexer.js';
import { parse, AssemblyError, ParsedInstruction } from './parser.js';
import { pseudoSize, expandPseudos } from './pseudo.js';
import { encode } from './encoder.js';
import { getInstruction, PSEUDO_INSTRUCTIONS } from '../utils/instructions.js';
import { TEXT_BASE, DATA_BASE } from '../utils/constants.js';

export interface AssemblyResult {
  textSegment: Uint8Array;
  dataSegment: Uint8Array;
  textBase: number;
  dataBase: number;
  symbolTable: Map<string, number>;
  sourceMap: Map<number, number>;  // pc address → source line number
  errors: AssemblyError[];
}

function alignTo4(addr: number): number {
  return (addr + 3) & ~3;
}

export function assemble(source: string): AssemblyResult {
  const tokens = tokenize(source);
  const program = parse(tokens);
  const errors: AssemblyError[] = [...program.errors];
  const symbolTable = new Map<string, number>();
  const sourceMap = new Map<number, number>();

  // === Pass 1: Build symbol table ===

  // Data segment addresses
  let dataAddr = DATA_BASE;
  for (const dir of program.dataDirectives) {
    if (dir.label) {
      symbolTable.set(dir.label, dataAddr);
    }

    switch (dir.type) {
      case '.word': {
        const count = dir.repeat ?? dir.values.length;
        dataAddr += count * 4;
        break;
      }
      case '.half': {
        const count = dir.repeat ?? dir.values.length;
        dataAddr += count * 2;
        dataAddr = alignTo4(dataAddr);
        break;
      }
      case '.byte': {
        const count = dir.repeat ?? dir.values.length;
        dataAddr += count;
        dataAddr = alignTo4(dataAddr);
        break;
      }
      case '.asciiz': {
        const str = dir.values[0];
        if (typeof str === 'string') {
          dataAddr += str.length + 1; // +1 for null terminator
          dataAddr = alignTo4(dataAddr);
        }
        break;
      }
      case '.ascii': {
        const str = dir.values[0];
        if (typeof str === 'string') {
          dataAddr += str.length;
          dataAddr = alignTo4(dataAddr);
        }
        break;
      }
      case '.space': {
        const size = typeof dir.values[0] === 'number' ? dir.values[0] : 0;
        dataAddr += size;
        dataAddr = alignTo4(dataAddr);
        break;
      }
    }
  }

  // Text segment addresses — count instruction sizes including pseudo expansion
  let textAddr = TEXT_BASE;
  for (const instr of program.textInstructions) {
    if (instr.label) {
      symbolTable.set(instr.label, textAddr);
    }

    if (PSEUDO_INSTRUCTIONS.has(instr.name)) {
      textAddr += pseudoSize(instr.name, instr.operands) * 4;
    } else if (getInstruction(instr.name)) {
      textAddr += 4;
    } else {
      errors.push({ line: instr.line, message: `Unknown instruction: ${instr.name}` });
      textAddr += 4;
    }
  }

  if (errors.length > 0) {
    return {
      textSegment: new Uint8Array(0),
      dataSegment: new Uint8Array(0),
      textBase: TEXT_BASE,
      dataBase: DATA_BASE,
      symbolTable,
      sourceMap,
      errors,
    };
  }

  // === Pass 2: Encode instructions ===

  // Expand pseudo-instructions with symbol table
  const expanded = expandPseudos(program.textInstructions, symbolTable);

  // Encode each instruction
  const textSize = (textAddr - TEXT_BASE);
  const textSegment = new Uint8Array(textSize);
  let pc = TEXT_BASE;

  for (const instr of expanded) {
    const result = encode(instr, pc, symbolTable);
    if (result.error) {
      errors.push(result.error);
    }

    // Write word to text segment (little-endian)
    const offset = pc - TEXT_BASE;
    if (offset >= 0 && offset + 3 < textSegment.length) {
      textSegment[offset] = result.word & 0xff;
      textSegment[offset + 1] = (result.word >> 8) & 0xff;
      textSegment[offset + 2] = (result.word >> 16) & 0xff;
      textSegment[offset + 3] = (result.word >> 24) & 0xff;
    }

    sourceMap.set(pc, instr.line);
    pc += 4;
  }

  // === Encode data segment ===
  const dataSize = dataAddr - DATA_BASE;
  const dataSegment = new Uint8Array(dataSize);
  let dOffset = 0;

  for (const dir of program.dataDirectives) {
    switch (dir.type) {
      case '.word': {
        const repeatCount = dir.repeat ?? 1;
        for (let r = 0; r < repeatCount; r++) {
          for (const val of dir.values) {
            let numVal: number;
            if (typeof val === 'string') {
              // Label reference
              numVal = symbolTable.get(val) ?? 0;
            } else {
              numVal = val;
            }
            dataSegment[dOffset] = numVal & 0xff;
            dataSegment[dOffset + 1] = (numVal >> 8) & 0xff;
            dataSegment[dOffset + 2] = (numVal >> 16) & 0xff;
            dataSegment[dOffset + 3] = (numVal >> 24) & 0xff;
            dOffset += 4;
          }
        }
        break;
      }
      case '.half': {
        for (const val of dir.values) {
          const numVal = typeof val === 'number' ? val : 0;
          dataSegment[dOffset] = numVal & 0xff;
          dataSegment[dOffset + 1] = (numVal >> 8) & 0xff;
          dOffset += 2;
        }
        dOffset = alignTo4(dOffset);
        break;
      }
      case '.byte': {
        for (const val of dir.values) {
          const numVal = typeof val === 'number' ? val : 0;
          dataSegment[dOffset] = numVal & 0xff;
          dOffset++;
        }
        dOffset = alignTo4(dOffset);
        break;
      }
      case '.asciiz': {
        const str = dir.values[0];
        if (typeof str === 'string') {
          for (let i = 0; i < str.length; i++) {
            dataSegment[dOffset++] = str.charCodeAt(i) & 0xff;
          }
          dataSegment[dOffset++] = 0; // null terminator
          dOffset = alignTo4(dOffset);
        }
        break;
      }
      case '.ascii': {
        const str = dir.values[0];
        if (typeof str === 'string') {
          for (let i = 0; i < str.length; i++) {
            dataSegment[dOffset++] = str.charCodeAt(i) & 0xff;
          }
          dOffset = alignTo4(dOffset);
        }
        break;
      }
      case '.space': {
        const size = typeof dir.values[0] === 'number' ? dir.values[0] : 0;
        // Already zero-initialized in Uint8Array
        dOffset += size;
        dOffset = alignTo4(dOffset);
        break;
      }
    }
  }

  return {
    textSegment,
    dataSegment,
    textBase: TEXT_BASE,
    dataBase: DATA_BASE,
    symbolTable,
    sourceMap,
    errors,
  };
}
