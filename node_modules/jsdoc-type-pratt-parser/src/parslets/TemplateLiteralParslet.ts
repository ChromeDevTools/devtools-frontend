import { composeParslet } from './Parslet.js'
import type { RootResult } from '../result/RootResult.js'
import { Precedence } from '../Precedence.js'
import { getTemplateLiteralLiteral } from '../lexer/LexerRules.js'
import { Parser } from '../Parser.js'
import { Lexer } from '../lexer/Lexer.js'

export const templateLiteralParslet = composeParslet({
  name: 'templateLiteralParslet',
  accept: type => type === 'TemplateLiteral',
  parsePrefix: parser => {
    const text = parser.lexer.current.text
    parser.consume('TemplateLiteral')

    const literals: string[] = []
    const interpolations = [] as RootResult[]

    let currentText = text.slice(1, -1)

    const advanceLiteral = (): void => {
      const literal = getTemplateLiteralLiteral(currentText) ?? ''

      // We collect backslashes for total length, but need to replace
      literals.push(literal.replace(/\\`/g, '`'))

      currentText = currentText.slice(literal.length)
    }

    // The first can be the empty string (at least one literal
    //   should be populated)
    advanceLiteral()

    while (true) {
      if (currentText.startsWith('${')) {
        currentText = currentText.slice(2)

        let templateParser
        let interpolationType

        let snipped = currentText
        let remnant = ''
        while (true) {
          // Some tokens (like hyphen) may not be recognized by the parser,
          //   so we avoid processing them (may be part of a literal)
          try {
            templateParser = new Parser(
              parser.grammar,
              Lexer.create(parser.lexer.lexerRules, snipped)
            )
            interpolationType = templateParser.parseType(Precedence.ALL)
            break
          } catch (err) {
            remnant = snipped.slice(-1) + remnant
            snipped = snipped.slice(0, -1)
          }
        }

        interpolations.push(interpolationType)

        if (templateParser.lexer.current.text !== '}') {
          throw new Error('unterminated interpolation')
        }

        currentText = templateParser.lexer.remaining() + remnant
      } else { // currentText.startsWith('`')
        break;
      }

      // May also be empty string if seeing `}${` or just a final `}`
      advanceLiteral()
    }

    return {
      type: 'JsdocTypeTemplateLiteral',
      literals,
      interpolations
    }
  }
})
