import { describe, it, expect } from 'vitest';
import { CPU } from '../simulator/cpu.js';
import { assemble } from '../assembler/assembler.js';

function createCPU() {
  let output = '';
  const cpu = new CPU({
    onConsoleOutput: (text) => { output += text; },
    onStateChange: () => {},
    onStep: () => {},
  });
  return { cpu, getOutput: () => output };
}

function runProgram(source: string): { cpu: CPU; output: string } {
  const { cpu, getOutput } = createCPU();
  const result = assemble(source);
  if (result.errors.length > 0) {
    throw new Error(`Assembly errors: ${result.errors.map(e => e.message).join(', ')}`);
  }
  cpu.loadProgram(result);

  let steps = 0;
  while (steps < 10000) {
    const status = cpu.step();
    if (status === 'halted' || status === 'error') break;
    if (status === 'input') break;
    steps++;
  }

  return { cpu, output: getOutput() };
}

describe('CPU', () => {
  it('should execute hello world', () => {
    const { output } = runProgram(`
.data
msg: .asciiz "Hello, World!"
.text
li $v0, 4
la $a0, msg
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('Hello, World!');
  });

  it('should execute print integer', () => {
    const { output } = runProgram(`
.text
li $a0, 42
li $v0, 1
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('42');
  });

  it('should execute arithmetic operations', () => {
    const { output } = runProgram(`
.text
li $t0, 10
li $t1, 20
add $a0, $t0, $t1
li $v0, 1
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('30');
  });

  it('should handle branches', () => {
    const { output } = runProgram(`
.text
li $t0, 5
li $t1, 0
loop: beq $t0, $zero, done
add $t1, $t1, $t0
addi $t0, $t0, -1
j loop
done: move $a0, $t1
li $v0, 1
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('15'); // 5+4+3+2+1
  });

  it('should handle recursive factorial', () => {
    const { output } = runProgram(`
.text
main:
    li $a0, 10
    jal fact
    move $a0, $v0
    li $v0, 1
    syscall
    li $v0, 10
    syscall

fact:
    addi $sp, $sp, -8
    sw $ra, 4($sp)
    sw $a0, 0($sp)
    slti $t0, $a0, 2
    beq $t0, $zero, recurse
    li $v0, 1
    addi $sp, $sp, 8
    jr $ra
recurse:
    addi $a0, $a0, -1
    jal fact
    lw $a0, 0($sp)
    lw $ra, 4($sp)
    addi $sp, $sp, 8
    mul $v0, $a0, $v0
    jr $ra
`);
    expect(output).toBe('3628800'); // 10!
  });

  it('should handle Fibonacci sequence', () => {
    const { output } = runProgram(`
.data
space: .asciiz " "
.text
    li $s0, 1
    li $s1, 1
    li $s2, 0
    li $s3, 10

loop: move $a0, $s0
    li $v0, 1
    syscall
    la $a0, space
    li $v0, 4
    syscall
    add $s2, $s0, $s1
    move $s0, $s1
    move $s1, $s2
    addi $s3, $s3, -1
    bgtz $s3, loop

    li $v0, 10
    syscall
`);
    expect(output).toBe('1 1 2 3 5 8 13 21 34 55 ');
  });

  it('should handle $zero register immutability', () => {
    const { cpu } = runProgram(`
.text
add $zero, $t0, $t1
li $v0, 10
syscall
`);
    expect(cpu.registers.read(0)).toBe(0);
  });

  it('should handle slt instruction', () => {
    const { output } = runProgram(`
.text
li $t0, 5
li $t1, 10
slt $a0, $t0, $t1
li $v0, 1
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('1');
  });

  it('should handle logical operations', () => {
    const { output } = runProgram(`
.text
li $t0, 0xFF
li $t1, 0x0F
and $a0, $t0, $t1
li $v0, 1
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('15'); // 0x0F
  });

  it('should handle shift operations', () => {
    const { output } = runProgram(`
.text
li $t0, 1
sll $a0, $t0, 4
li $v0, 1
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('16'); // 1 << 4
  });

  it('should handle mult/mflo', () => {
    const { output } = runProgram(`
.text
li $t0, 7
li $t1, 6
mult $t0, $t1
mflo $a0
li $v0, 1
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('42');
  });

  it('should handle div/mflo/mfhi', () => {
    const { output } = runProgram(`
.text
li $t0, 17
li $t1, 5
div $t0, $t1
mflo $a0
li $v0, 1
syscall
li $v0, 11
li $a0, 32
syscall
mfhi $a0
li $v0, 1
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('3 2'); // 17/5 = 3 remainder 2
  });

  it('should handle lb/sb byte access', () => {
    const { output } = runProgram(`
.data
buf: .byte 65, 66, 67, 0
.text
la $t0, buf
lb $a0, 0($t0)
li $v0, 11
syscall
lb $a0, 1($t0)
syscall
lb $a0, 2($t0)
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('ABC');
  });

  it('should handle print char syscall', () => {
    const { output } = runProgram(`
.text
li $a0, 72
li $v0, 11
syscall
li $a0, 105
syscall
li $v0, 10
syscall
`);
    expect(output).toBe('Hi');
  });
});
