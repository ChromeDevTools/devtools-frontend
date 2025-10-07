import type { TokenType } from '../lexer/Token.js'

export function isQuestionMarkUnknownType (next: TokenType): boolean {
  return next === '}' || next === 'EOF' || next === '|' || next === ',' || next === ')' || next === '>'
}
