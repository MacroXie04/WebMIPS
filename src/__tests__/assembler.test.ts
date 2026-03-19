import { describe, it, expect } from 'vitest';
import { tokenize } from '../assembler/lexer.js';
import { parse } from '../assembler/parser.js';
import { assemble } from '../assembler/assembler.js';

describe('Lexer', () => {
  it('should tokenize a simple instruction', () => {
    const tokens = tokenize('add $t0, $t1, $t2');
    const types = tokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF').map(t => t.type);
    expect(types).toEqual(['IDENTIFIER', 'REGISTER', 'COMMA', 'REGISTER', 'COMMA', 'REGISTER']);
  });

  it('should tokenize labels', () => {
    const tokens = tokenize('loop: add $t0, $t1, $t2');
    expect(tokens[0].type).toBe('LABEL_DEF');
    expect(tokens[0].value).toBe('loop');
  });

  it('should tokenize directives', () => {
    const tokens = tokenize('.data\n.word 42');
    const directives = tokens.filter(t => t.type === 'DIRECTIVE');
    expect(directives.length).toBe(2);
    expect(directives[0].value).toBe('.data');
    expect(directives[1].value).toBe('.word');
  });

  it('should handle comments', () => {
    const tokens = tokenize('add $t0, $t1, $t2 # this is a comment');
    const identifiers = tokens.filter(t => t.type === 'IDENTIFIER');
    expect(identifiers.length).toBe(1);
    expect(identifiers[0].value).toBe('add');
  });

  it('should handle string literals with escapes', () => {
    const tokens = tokenize('.asciiz "Hello\\n"');
    const strings = tokens.filter(t => t.type === 'STRING');
    expect(strings.length).toBe(1);
    expect(strings[0].value).toBe('Hello\n');
  });

  it('should handle hex numbers', () => {
    const tokens = tokenize('li $t0, 0xFF');
    const nums = tokens.filter(t => t.type === 'NUMBER');
    expect(nums.length).toBe(1);
    expect(nums[0].value).toBe('0xFF');
  });
});

describe('Parser', () => {
  it('should parse a simple program', () => {
    const tokens = tokenize('.text\nadd $t0, $t1, $t2');
    const program = parse(tokens);
    expect(program.textInstructions.length).toBe(1);
    expect(program.textInstructions[0].name).toBe('add');
    expect(program.textInstructions[0].operands.length).toBe(3);
  });

  it('should parse data directives', () => {
    const tokens = tokenize('.data\nmsg: .asciiz "Hello"');
    const program = parse(tokens);
    expect(program.dataDirectives.length).toBe(1);
    expect(program.dataDirectives[0].label).toBe('msg');
    expect(program.dataDirectives[0].type).toBe('.asciiz');
  });

  it('should parse memory operands', () => {
    const tokens = tokenize('.text\nlw $t0, 4($sp)');
    const program = parse(tokens);
    const op = program.textInstructions[0].operands[1];
    expect(op.kind).toBe('memory');
    expect(op.value).toBe(4);
    expect(op.base).toBe(29); // $sp
  });
});

describe('Assembler', () => {
  it('should assemble a hello world program', () => {
    const result = assemble(`
.data
msg: .asciiz "Hello"
.text
li $v0, 4
la $a0, msg
syscall
li $v0, 10
syscall
`);
    expect(result.errors.length).toBe(0);
    expect(result.textSegment.length).toBeGreaterThan(0);
    expect(result.dataSegment.length).toBeGreaterThan(0);
    expect(result.symbolTable.get('msg')).toBe(0x10010000);
  });

  it('should report errors for unknown instructions', () => {
    const result = assemble('.text\naddd $t0, $t1, $t2');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle pseudo-instructions', () => {
    const result = assemble(`
.text
li $t0, 0x12345678
move $t1, $t0
nop
`);
    expect(result.errors.length).toBe(0);
    // li with large immediate = 2 instructions, move = 1, nop = 1 → 4 instructions = 16 bytes
    expect(result.textSegment.length).toBe(16);
  });

  it('should resolve forward label references', () => {
    const result = assemble(`
.text
j end
nop
end: li $v0, 10
syscall
`);
    expect(result.errors.length).toBe(0);
    expect(result.symbolTable.has('end')).toBe(true);
  });

  it('should handle branch instructions', () => {
    const result = assemble(`
.text
loop: addi $t0, $t0, 1
bne $t0, $t1, loop
`);
    expect(result.errors.length).toBe(0);
  });
});
