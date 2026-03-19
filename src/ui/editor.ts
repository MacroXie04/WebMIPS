const STORAGE_KEY = 'webmips-editor-content';

const DEFAULT_PROGRAM = ``;

const INSTRUCTIONS = new Set([
  'add','addu','sub','subu','and','or','xor','nor','slt','sltu',
  'sll','srl','sra','sllv','srlv','srav','jr','jalr',
  'mult','multu','div','divu','mfhi','mflo','mthi','mtlo','syscall',
  'addi','addiu','andi','ori','xori','slti','sltiu','lui',
  'lw','sw','lb','lbu','lh','lhu','sb','sh',
  'beq','bne','bgtz','blez','bltz','bgez',
  'j','jal',
  'li','la','move','nop','not','neg','negu',
  'blt','bgt','ble','bge','bltu','bgtu','bleu','bgeu','mul',
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightLine(line: string): string {
  // Process the line character by character to handle overlapping patterns
  let result = '';
  let i = 0;

  while (i < line.length) {
    // Comment — rest of line
    if (line[i] === '#') {
      result += `<span class="hl-comment">${escapeHtml(line.substring(i))}</span>`;
      return result;
    }

    // String literal
    if (line[i] === '"') {
      let end = i + 1;
      while (end < line.length && line[end] !== '"') {
        if (line[end] === '\\') end++; // skip escaped char
        end++;
      }
      if (end < line.length) end++; // include closing quote
      result += `<span class="hl-string">${escapeHtml(line.substring(i, end))}</span>`;
      i = end;
      continue;
    }

    // Register ($...)
    if (line[i] === '$') {
      let end = i + 1;
      while (end < line.length && /[a-zA-Z0-9]/.test(line[end])) end++;
      result += `<span class="hl-register">${escapeHtml(line.substring(i, end))}</span>`;
      i = end;
      continue;
    }

    // Directive (.word, .data, etc.)
    if (line[i] === '.' && (i === 0 || /\s/.test(line[i - 1]))) {
      let end = i + 1;
      while (end < line.length && /[a-zA-Z]/.test(line[end])) end++;
      result += `<span class="hl-directive">${escapeHtml(line.substring(i, end))}</span>`;
      i = end;
      continue;
    }

    // Number (hex, binary, decimal)
    if (/[0-9]/.test(line[i]) || (line[i] === '-' && i + 1 < line.length && /[0-9]/.test(line[i + 1]) && (i === 0 || /[\s,:(]/.test(line[i - 1])))) {
      let end = i;
      if (line[end] === '-') end++;
      if (end + 1 < line.length && line[end] === '0' && /[xXbB]/.test(line[end + 1])) {
        end += 2;
        while (end < line.length && /[0-9a-fA-F]/.test(line[end])) end++;
      } else {
        while (end < line.length && /[0-9]/.test(line[end])) end++;
      }
      result += `<span class="hl-number">${escapeHtml(line.substring(i, end))}</span>`;
      i = end;
      continue;
    }

    // Identifier (instruction or label)
    if (/[a-zA-Z_]/.test(line[i])) {
      let end = i;
      while (end < line.length && /[a-zA-Z0-9_.]/.test(line[end])) end++;
      const word = line.substring(i, end);

      // Check for label definition (word followed by colon)
      if (end < line.length && line[end] === ':') {
        result += `<span class="hl-label">${escapeHtml(word)}:</span>`;
        i = end + 1;
        continue;
      }

      // Instruction
      if (INSTRUCTIONS.has(word.toLowerCase())) {
        result += `<span class="hl-instruction">${escapeHtml(word)}</span>`;
      } else {
        result += escapeHtml(word);
      }
      i = end;
      continue;
    }

    // Other characters (whitespace, punctuation)
    result += escapeHtml(line[i]);
    i++;
  }

  return result;
}

function highlightCode(source: string): string {
  return source.split('\n').map(highlightLine).join('\n');
}

export class Editor {
  private textarea: HTMLTextAreaElement;
  private highlightEl: HTMLPreElement;
  private lineNumbers: HTMLDivElement;
  private container: HTMLElement;
  private errorLines = new Set<number>();
  private currentLine: number | undefined;

  constructor(container: HTMLElement) {
    this.container = container;

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.textContent = 'Editor';
    container.appendChild(header);

    // Editor wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-wrapper';

    this.lineNumbers = document.createElement('div');
    this.lineNumbers.className = 'line-numbers';

    // Code area container (highlight overlay + textarea)
    const codeArea = document.createElement('div');
    codeArea.className = 'code-area';

    this.highlightEl = document.createElement('pre');
    this.highlightEl.className = 'editor-highlight';
    this.highlightEl.setAttribute('aria-hidden', 'true');

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'editor-textarea';
    this.textarea.spellcheck = false;
    this.textarea.autocomplete = 'off';
    this.textarea.wrap = 'off';

    codeArea.appendChild(this.highlightEl);
    codeArea.appendChild(this.textarea);

    wrapper.appendChild(this.lineNumbers);
    wrapper.appendChild(codeArea);
    container.appendChild(wrapper);

    // Events
    this.textarea.addEventListener('input', () => this.onInput());
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Load saved content or default
    const saved = localStorage.getItem(STORAGE_KEY);
    this.textarea.value = saved !== null ? saved : DEFAULT_PROGRAM;
    this.onInput();
  }

  getValue(): string {
    return this.textarea.value;
  }

  setReadOnly(readOnly: boolean): void {
    this.textarea.readOnly = readOnly;
    this.textarea.style.opacity = readOnly ? '0.7' : '1';
  }

  setValue(code: string): void {
    this.textarea.value = code;
    this.onInput();
  }

  setErrorLines(lines: Set<number>): void {
    this.errorLines = lines;
    this.updateLineNumbers();
  }

  setCurrentLine(line: number | undefined): void {
    this.currentLine = line;
    this.updateHighlight();
    this.updateLineNumbers();
  }

  scrollToLine(line: number, smooth = false): void {
    const lineHeight = parseInt(getComputedStyle(this.textarea).lineHeight) || 21;
    const viewHeight = this.textarea.clientHeight;
    const targetScroll = Math.max(0, (line - 1) * lineHeight - viewHeight / 2 + lineHeight / 2);
    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
    this.textarea.scrollTo({ top: targetScroll, behavior });
    this.highlightEl.scrollTo({ top: targetScroll, behavior });
    this.lineNumbers.scrollTo({ top: targetScroll, behavior });
  }

  clearHighlights(): void {
    this.errorLines.clear();
    this.currentLine = undefined;
    this.updateLineNumbers();
  }

  private onInput(): void {
    this.updateHighlight();
    this.updateLineNumbers();
    localStorage.setItem(STORAGE_KEY, this.textarea.value);
  }

  private updateHighlight(): void {
    const lines = this.textarea.value.split('\n');
    const highlighted = lines.map((line, i) => {
      const lineNum = i + 1;
      const hl = highlightLine(line);
      if (lineNum === this.currentLine) {
        return `<span class="hl-current-line">${hl}</span>`;
      }
      return hl;
    });
    this.highlightEl.innerHTML = highlighted.join('\n') + '\n';
  }

  private updateLineNumbers(): void {
    const lineCount = this.textarea.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      let cls = 'line-number';
      if (this.errorLines.has(i)) cls += ' error';
      if (this.currentLine === i) cls += ' current';
      html += `<div class="${cls}">${i}</div>`;
    }
    this.lineNumbers.innerHTML = html;
  }

  private syncScroll(): void {
    this.lineNumbers.scrollTop = this.textarea.scrollTop;
    this.highlightEl.scrollTop = this.textarea.scrollTop;
    this.highlightEl.scrollLeft = this.textarea.scrollLeft;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const value = this.textarea.value;
      this.textarea.value = value.substring(0, start) + '        ' + value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + 8;
      this.onInput();
    }
  }
}
