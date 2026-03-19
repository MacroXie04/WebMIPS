export type TokenType =
  | 'DIRECTIVE'
  | 'LABEL_DEF'
  | 'REGISTER'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'COMMA'
  | 'LPAREN'
  | 'RPAREN'
  | 'COLON'
  | 'NEWLINE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

function isAlpha(ch: string): boolean {
  return /^[a-zA-Z_]$/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isAlphaNum(ch: string): boolean {
  return isAlpha(ch) || isDigit(ch) || ch === '.';
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const lines = source.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    let line = lines[lineIdx];

    // Strip comment
    const commentIdx = line.indexOf('#');
    if (commentIdx >= 0) {
      line = line.substring(0, commentIdx);
    }

    let i = 0;

    while (i < line.length) {
      const ch = line[i];

      // Whitespace
      if (ch === ' ' || ch === '\t') {
        i++;
        continue;
      }

      // Comma
      if (ch === ',') {
        tokens.push({ type: 'COMMA', value: ',', line: lineNum });
        i++;
        continue;
      }

      // Parentheses
      if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(', line: lineNum });
        i++;
        continue;
      }
      if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')', line: lineNum });
        i++;
        continue;
      }

      // Colon (standalone, for .word repeat syntax)
      // Note: label colons are handled with identifiers below

      // String literal
      if (ch === '"') {
        let str = '';
        i++; // skip opening quote
        while (i < line.length && line[i] !== '"') {
          if (line[i] === '\\') {
            i++;
            if (i < line.length) {
              switch (line[i]) {
                case 'n': str += '\n'; break;
                case 't': str += '\t'; break;
                case '0': str += '\0'; break;
                case '\\': str += '\\'; break;
                case '"': str += '"'; break;
                default: str += line[i]; break;
              }
            }
          } else {
            str += line[i];
          }
          i++;
        }
        i++; // skip closing quote
        tokens.push({ type: 'STRING', value: str, line: lineNum });
        continue;
      }

      // Register ($...)
      if (ch === '$') {
        let reg = '$';
        i++;
        while (i < line.length && (isAlphaNum(line[i]) || isDigit(line[i]))) {
          reg += line[i];
          i++;
        }
        tokens.push({ type: 'REGISTER', value: reg, line: lineNum });
        continue;
      }

      // Directive (.word, .data, etc.)
      if (ch === '.') {
        let dir = '.';
        i++;
        while (i < line.length && isAlpha(line[i])) {
          dir += line[i];
          i++;
        }
        tokens.push({ type: 'DIRECTIVE', value: dir, line: lineNum });
        continue;
      }

      // Number (decimal, hex, binary, negative)
      if (isDigit(ch) || (ch === '-' && i + 1 < line.length && isDigit(line[i + 1]))) {
        let num = '';
        if (ch === '-') {
          num = '-';
          i++;
        }
        if (i + 1 < line.length && line[i] === '0' && (line[i + 1] === 'x' || line[i + 1] === 'X')) {
          num += '0x';
          i += 2;
          while (i < line.length && /^[0-9a-fA-F]$/.test(line[i])) {
            num += line[i];
            i++;
          }
        } else if (i + 1 < line.length && line[i] === '0' && (line[i + 1] === 'b' || line[i + 1] === 'B')) {
          num += '0b';
          i += 2;
          while (i < line.length && (line[i] === '0' || line[i] === '1')) {
            num += line[i];
            i++;
          }
        } else {
          while (i < line.length && isDigit(line[i])) {
            num += line[i];
            i++;
          }
        }
        tokens.push({ type: 'NUMBER', value: num, line: lineNum });
        continue;
      }

      // Identifier or label definition
      if (isAlpha(ch)) {
        let ident = '';
        while (i < line.length && (isAlphaNum(line[i]) || isDigit(line[i]))) {
          ident += line[i];
          i++;
        }
        // Check for colon → label definition
        if (i < line.length && line[i] === ':') {
          i++; // consume colon
          tokens.push({ type: 'LABEL_DEF', value: ident, line: lineNum });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: ident, line: lineNum });
        }
        continue;
      }

      // Colon (standalone)
      if (ch === ':') {
        tokens.push({ type: 'COLON', value: ':', line: lineNum });
        i++;
        continue;
      }

      // Unknown character — skip
      i++;
    }

    tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum });
  }

  tokens.push({ type: 'EOF', value: '', line: lines.length });
  return tokens;
}
