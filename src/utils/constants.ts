// Memory layout
export const TEXT_BASE = 0x00400000;
export const DATA_BASE = 0x10010000;
export const HEAP_BASE = 0x10040000;
export const STACK_BASE = 0x7ffffffc;
export const GP_INIT = 0x10008000;

// Register names indexed by number
export const REGISTER_NAMES: readonly string[] = [
  '$zero', '$at', '$v0', '$v1',
  '$a0', '$a1', '$a2', '$a3',
  '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
  '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
  '$t8', '$t9',
  '$k0', '$k1',
  '$gp', '$sp', '$fp', '$ra',
];

// Map register name/alias → index
const REGISTER_MAP = new Map<string, number>();

for (let i = 0; i < 32; i++) {
  REGISTER_MAP.set(REGISTER_NAMES[i], i);
  REGISTER_MAP.set('$' + i, i);
}

// Extra aliases
REGISTER_MAP.set('$0', 0);

export function parseRegister(name: string): number | null {
  return REGISTER_MAP.get(name) ?? null;
}

// Syscall codes
export const SYSCALL_PRINT_INT = 1;
export const SYSCALL_PRINT_FLOAT = 2;
export const SYSCALL_PRINT_STRING = 4;
export const SYSCALL_READ_INT = 5;
export const SYSCALL_READ_STRING = 8;
export const SYSCALL_EXIT = 10;
export const SYSCALL_PRINT_CHAR = 11;
export const SYSCALL_READ_CHAR = 12;
export const SYSCALL_EXIT2 = 17;
