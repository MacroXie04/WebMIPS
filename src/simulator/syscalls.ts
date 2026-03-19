import { RegisterFile } from './registers.js';
import { Memory } from './memory.js';
import {
  SYSCALL_PRINT_INT, SYSCALL_PRINT_STRING, SYSCALL_PRINT_CHAR,
  SYSCALL_READ_INT, SYSCALL_READ_STRING, SYSCALL_READ_CHAR,
  SYSCALL_EXIT, SYSCALL_EXIT2,
} from '../utils/constants.js';

export type ConsoleOutputFn = (text: string) => void;
export type ConsoleInputFn = (prompt: string) => Promise<string>;

export class HaltException {
  exitCode: number;
  constructor(exitCode = 0) {
    this.exitCode = exitCode;
  }
}

export class InputRequestException {
  prompt: string;
  resolve!: (value: string) => void;
  promise: Promise<string>;

  constructor(prompt: string) {
    this.prompt = prompt;
    this.promise = new Promise<string>((res) => {
      this.resolve = res;
    });
  }
}

export class SyscallHandler {
  constructor(
    private registers: RegisterFile,
    private memory: Memory,
    private consoleOutput: ConsoleOutputFn,
  ) {}

  handle(): HaltException | InputRequestException | null {
    const code = this.registers.read(2); // $v0

    switch (code) {
      case SYSCALL_PRINT_INT:
        this.consoleOutput(String(this.registers.read(4))); // $a0
        return null;

      case SYSCALL_PRINT_STRING: {
        const addr = this.registers.read(4); // $a0
        const str = this.memory.readString(addr);
        this.consoleOutput(str);
        return null;
      }

      case SYSCALL_PRINT_CHAR: {
        const ch = this.registers.read(4) & 0xff;
        this.consoleOutput(String.fromCharCode(ch));
        return null;
      }

      case SYSCALL_READ_INT:
        return new InputRequestException('Enter integer:');

      case SYSCALL_READ_STRING:
        return new InputRequestException('Enter string:');

      case SYSCALL_READ_CHAR:
        return new InputRequestException('Enter character:');

      case SYSCALL_EXIT:
        return new HaltException(0);

      case SYSCALL_EXIT2:
        return new HaltException(this.registers.read(4)); // $a0

      default:
        this.consoleOutput(`[Unknown syscall: ${code}]\n`);
        return null;
    }
  }

  completeInput(request: InputRequestException, input: string): void {
    const code = this.registers.read(2);

    switch (code) {
      case SYSCALL_READ_INT: {
        const val = parseInt(input, 10) || 0;
        this.registers.write(2, val); // $v0
        break;
      }
      case SYSCALL_READ_STRING: {
        const addr = this.registers.read(4); // $a0
        const maxLen = this.registers.read(5); // $a1
        const truncated = input.substring(0, maxLen - 1);
        this.memory.writeString(addr, truncated, true);
        break;
      }
      case SYSCALL_READ_CHAR: {
        const ch = input.length > 0 ? input.charCodeAt(0) : 0;
        this.registers.write(2, ch); // $v0
        break;
      }
    }
  }
}
