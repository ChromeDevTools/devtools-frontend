import type { Token } from './Token.js'
import type { Rule } from './LexerRules.js'

const breakingWhitespaceRegex = /^\s*\n\s*/

export class Lexer {
  private readonly text: string = ''
  public readonly lexerRules: Rule[]
  public readonly current: Token
  public readonly next: Token
  public readonly previous: Token | undefined

  public static create (lexerRules: Rule[], text: string): Lexer {
    const current = this.read(lexerRules, text)
    text = current.text
    const next = this.read(lexerRules, text)
    text = next.text
    return new Lexer(lexerRules, text, undefined, current.token, next.token)
  }

  private constructor (lexerRules: Rule[], text: string, previous: Token | undefined, current: Token, next: Token) {
    this.lexerRules = lexerRules
    this.text = text
    this.previous = previous
    this.current = current
    this.next = next
  }

  private static read (lexerRules: Rule[], text: string, startOfLine = false): { text: string, token: Token } {
    startOfLine ||= breakingWhitespaceRegex.test(text)
    text = text.trim()
    for (const rule of lexerRules) {
      const partial = rule(text)
      if (partial !== null) {
        const token = {
          ...partial,
          startOfLine
        }
        text = text.slice(token.text.length)
        return { text, token }
      }
    }
    throw new Error('Unexpected Token ' + text)
  }

  remaining (): string {
    return this.next.text + this.text
  }

  advance (): Lexer {
    const next = Lexer.read(this.lexerRules, this.text)
    return new Lexer(
      this.lexerRules, next.text, this.current, this.next, next.token
    )
  }
}
