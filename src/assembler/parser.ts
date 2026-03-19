import { Token, TokenType } from './lexer.js';
import { parseRegister } from '../utils/constants.js';
import { getInstruction, PSEUDO_INSTRUCTIONS } from '../utils/instructions.js';

export interface Operand {
  kind: 'register' | 'immediate' | 'label' | 'memory';
  value: number;    // register index or immediate value or offset
  base?: number;    // base register for memory operands
  label?: string;   // label name for label operands
}

export interface ParsedInstruction {
  name: string;
  operands: Operand[];
  label?: string;
  line: number;
}

export interface DataDirective {
  type: string;        // .word, .half, .byte, .asciiz, .ascii, .space
  values: (number | string)[];
  repeat?: number;     // for .word val : count
  label?: string;
  line: number;
}

export interface Program {
  dataDirectives: DataDirective[];
  textInstructions: ParsedInstruction[];
  errors: AssemblyError[];
}

export interface AssemblyError {
  line: number;
  message: string;
}

export function parse(tokens: Token[]): Program {
  const dataDirectives: DataDirective[] = [];
  const textInstructions: ParsedInstruction[] = [];
  const errors: AssemblyError[] = [];
  let section: 'text' | 'data' = 'text';
  let pendingLabel: string | undefined;
  let pos = 0;

  function peek(): Token {
    return tokens[pos] || { type: 'EOF', value: '', line: 0 };
  }

  function advance(): Token {
    return tokens[pos++] || { type: 'EOF', value: '', line: 0 };
  }

  function expect(type: TokenType): Token | null {
    const t = peek();
    if (t.type === type) return advance();
    return null;
  }

  function skipNewlines(): void {
    while (peek().type === 'NEWLINE') advance();
  }

  function parseNumber(token: Token): number {
    const v = token.value;
    if (v.startsWith('0x') || v.startsWith('0X') || v.startsWith('-0x') || v.startsWith('-0X')) {
      return parseInt(v, 16);
    }
    if (v.startsWith('0b') || v.startsWith('0B') || v.startsWith('-0b') || v.startsWith('-0B')) {
      const neg = v.startsWith('-');
      const bin = v.replace(/^-?0[bB]/, '');
      return neg ? -parseInt(bin, 2) : parseInt(bin, 2);
    }
    return parseInt(v, 10);
  }

  function parseOperand(): Operand | null {
    const t = peek();

    if (t.type === 'REGISTER') {
      advance();
      const regIdx = parseRegister(t.value);
      if (regIdx === null) {
        errors.push({ line: t.line, message: `Unknown register: ${t.value}` });
        return { kind: 'register', value: 0 };
      }
      return { kind: 'register', value: regIdx };
    }

    if (t.type === 'NUMBER') {
      advance();
      const num = parseNumber(t);

      // Check for memory operand: number(register)
      if (peek().type === 'LPAREN') {
        advance(); // (
        const regTok = expect('REGISTER');
        if (!regTok) {
          errors.push({ line: t.line, message: 'Expected register in memory operand' });
          return null;
        }
        expect('RPAREN');
        const base = parseRegister(regTok.value);
        if (base === null) {
          errors.push({ line: t.line, message: `Unknown register: ${regTok.value}` });
          return null;
        }
        return { kind: 'memory', value: num, base };
      }

      return { kind: 'immediate', value: num };
    }

    if (t.type === 'IDENTIFIER') {
      advance();
      return { kind: 'label', value: 0, label: t.value };
    }

    // Memory operand with no offset: ($reg)
    if (t.type === 'LPAREN') {
      advance();
      const regTok = expect('REGISTER');
      if (!regTok) {
        errors.push({ line: t.line, message: 'Expected register in memory operand' });
        return null;
      }
      expect('RPAREN');
      const base = parseRegister(regTok.value);
      if (base === null) {
        errors.push({ line: t.line, message: `Unknown register: ${regTok.value}` });
        return null;
      }
      return { kind: 'memory', value: 0, base };
    }

    return null;
  }

  function parseDataDirective(dir: string, line: number): void {
    const directive: DataDirective = {
      type: dir,
      values: [],
      label: pendingLabel,
      line,
    };
    pendingLabel = undefined;

    switch (dir) {
      case '.word':
      case '.half':
      case '.byte': {
        // Parse comma-separated numbers or label references
        while (true) {
          const t = peek();
          if (t.type === 'NUMBER') {
            advance();
            const val = parseNumber(t);
            directive.values.push(val);
          } else if (t.type === 'IDENTIFIER') {
            advance();
            // Label reference in data — store as string for later resolution
            directive.values.push(t.value);
          } else {
            break;
          }

          // Check for repeat syntax: .word 0 : 19
          if (peek().type === 'COLON') {
            advance();
            const countTok = expect('NUMBER');
            if (countTok) {
              directive.repeat = parseNumber(countTok);
            }
            break;
          }

          if (peek().type === 'COMMA') {
            advance();
          } else {
            break;
          }
        }
        break;
      }

      case '.asciiz':
      case '.ascii': {
        const strTok = expect('STRING');
        if (strTok) {
          directive.values.push(strTok.value);
        } else {
          errors.push({ line, message: `Expected string after ${dir}` });
        }
        break;
      }

      case '.space': {
        const numTok = expect('NUMBER');
        if (numTok) {
          directive.values.push(parseNumber(numTok));
        } else {
          errors.push({ line, message: 'Expected number after .space' });
        }
        break;
      }

      default:
        errors.push({ line, message: `Unknown directive: ${dir}` });
        break;
    }

    dataDirectives.push(directive);
  }

  function parseTextLine(): void {
    const t = peek();

    if (t.type === 'IDENTIFIER') {
      const name = t.value.toLowerCase();
      // Check if it's a known instruction or pseudo
      if (getInstruction(name) || PSEUDO_INSTRUCTIONS.has(name)) {
        advance();
        const instr: ParsedInstruction = {
          name,
          operands: [],
          label: pendingLabel,
          line: t.line,
        };
        pendingLabel = undefined;

        // Parse operands
        let first = true;
        while (peek().type !== 'NEWLINE' && peek().type !== 'EOF') {
          if (!first) {
            if (peek().type === 'COMMA') advance();
          }
          first = false;
          const op = parseOperand();
          if (op) {
            instr.operands.push(op);
          } else {
            break;
          }
        }

        textInstructions.push(instr);
        return;
      }
    }

    // Skip unknown content on this line
    if (t.type !== 'NEWLINE' && t.type !== 'EOF') {
      errors.push({ line: t.line, message: `Unexpected token: ${t.value}` });
      while (peek().type !== 'NEWLINE' && peek().type !== 'EOF') advance();
    }
  }

  // Main parse loop
  while (peek().type !== 'EOF') {
    skipNewlines();
    const t = peek();
    if (t.type === 'EOF') break;

    // Label definition
    if (t.type === 'LABEL_DEF') {
      advance();
      pendingLabel = t.value;
      continue;
    }

    // Section directive
    if (t.type === 'DIRECTIVE') {
      advance();
      if (t.value === '.data') {
        section = 'data';
        continue;
      }
      if (t.value === '.text') {
        section = 'text';
        continue;
      }
      if (t.value === '.globl' || t.value === '.global') {
        // Skip .globl directive — consume the identifier
        if (peek().type === 'IDENTIFIER') advance();
        continue;
      }
      // Data directive in data section
      if (section === 'data') {
        parseDataDirective(t.value, t.line);
        continue;
      }
      errors.push({ line: t.line, message: `Directive ${t.value} not valid in .text section` });
      continue;
    }

    // In text section, parse instructions
    if (section === 'text') {
      parseTextLine();
    } else {
      // In data section, skip to next line
      while (peek().type !== 'NEWLINE' && peek().type !== 'EOF') advance();
    }
  }

  return { dataDirectives, textInstructions, errors };
}
