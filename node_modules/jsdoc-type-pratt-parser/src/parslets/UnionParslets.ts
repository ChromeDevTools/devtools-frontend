import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertRootResult, assertResultIsNotReservedWord } from '../assertTypes.js'

export const unionParslet = composeParslet({
  name: 'unionParslet',
  accept: type => type === '|',
  precedence: Precedence.UNION,
  parseInfix: (parser, left) => {
    parser.consume('|')

    const elements = []
    do {
      elements.push(parser.parseType(Precedence.UNION))
    } while (parser.consume('|'))

    return {
      type: 'JsdocTypeUnion',
      elements: [
        assertResultIsNotReservedWord(parser, assertRootResult(left)),
        ...elements.map((element) => assertResultIsNotReservedWord(parser, element))
      ]
    }
  }
})
