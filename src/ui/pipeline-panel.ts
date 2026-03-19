import { DecodedInstruction } from '../simulator/cpu.js';
import { REGISTER_NAMES } from '../utils/constants.js';

const STAGE_COLORS = ['#4285f4', '#34a853', '#ea8600', '#9334e6', '#d93025'];

function hex(val: number, digits = 8): string {
  return '0x' + ((val >>> 0).toString(16)).padStart(digits, '0');
}

export class PipelinePanel {
  private detailEl: HTMLDivElement;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = '<span>Pipeline</span>';
    container.appendChild(header);

    // Content wrapper
    const content = document.createElement('div');
    content.className = 'pipeline-content';

    // Instruction detail section
    this.detailEl = document.createElement('div');
    this.detailEl.className = 'pipeline-detail';
    this.detailEl.innerHTML = '<div class="pipeline-empty">No instruction executed yet</div>';
    content.appendChild(this.detailEl);

    container.appendChild(content);
  }

  update(last: DecodedInstruction | null, _history: DecodedInstruction[]): void {
    this.updateDetail(last);
  }

  clear(): void {
    this.detailEl.innerHTML = '<div class="pipeline-empty">No instruction executed yet</div>';
  }

  private updateDetail(instr: DecodedInstruction | null): void {
    if (!instr) {
      this.detailEl.innerHTML = '<div class="pipeline-empty">No instruction executed yet</div>';
      return;
    }

    const R = REGISTER_NAMES;
    const rows: string[] = [];

    // IF stage
    rows.push(this.stageRow('IF', STAGE_COLORS[0], `${hex(instr.pc)}: ${hex(instr.word)}`));

    // ID stage
    let decodeInfo = `<strong>${instr.fullText}</strong>`;
    if (instr.type === 'R') {
      decodeInfo += ` <span class="detail-dim">op=0x00 funct=0x${instr.funct.toString(16).padStart(2,'0')} rs=${R[instr.rs]} rt=${R[instr.rt]} rd=${R[instr.rd]} shamt=${instr.shamt}</span>`;
    } else if (instr.type === 'I') {
      decodeInfo += ` <span class="detail-dim">op=0x${instr.opcode.toString(16).padStart(2,'0')} rs=${R[instr.rs]} rt=${R[instr.rt]} imm=${instr.imm}</span>`;
    } else {
      decodeInfo += ` <span class="detail-dim">op=0x${instr.opcode.toString(16).padStart(2,'0')} target=0x${(instr.word & 0x3ffffff).toString(16)}</span>`;
    }
    rows.push(this.stageRow('ID', STAGE_COLORS[1], decodeInfo));

    // EX stage
    let execInfo = '—';
    if (instr.destReg !== undefined && instr.destValue !== undefined && !instr.isMemOp) {
      execInfo = `${R[instr.destReg]} = ${hex(instr.destValue)} (${instr.destValue})`;
    } else if (instr.isMemOp && instr.memAddr !== undefined) {
      execInfo = `addr = ${R[instr.rs]} + ${instr.imm} = ${hex(instr.memAddr)}`;
    } else if (instr.name === 'syscall') {
      execInfo = 'syscall dispatch';
    }
    rows.push(this.stageRow('EX', STAGE_COLORS[2], execInfo));

    // MEM stage
    let memInfo = '—';
    if (instr.isMemOp && instr.memAddr !== undefined) {
      if (instr.isStore) {
        memInfo = `MEM[${hex(instr.memAddr)}] ← ${R[instr.rt]}`;
      } else {
        memInfo = `${R[instr.rt]} ← MEM[${hex(instr.memAddr)}] = ${hex(instr.destValue ?? 0)}`;
      }
    }
    rows.push(this.stageRow('MEM', STAGE_COLORS[3], memInfo));

    // WB stage
    let wbInfo = '—';
    if (instr.destReg !== undefined && instr.destValue !== undefined) {
      wbInfo = `${R[instr.destReg]} ← ${hex(instr.destValue)}`;
    }
    rows.push(this.stageRow('WB', STAGE_COLORS[4], wbInfo));

    this.detailEl.innerHTML = rows.join('');
  }

  private stageRow(stage: string, color: string, content: string): string {
    return `<div class="pipeline-stage-row">
      <span class="stage-badge" style="background:${color}">${stage}</span>
      <span class="stage-content">${content}</span>
    </div>`;
  }
}
