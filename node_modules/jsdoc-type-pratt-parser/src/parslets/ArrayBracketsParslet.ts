import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertRootResult } from '../assertTypes.js'

export const arrayBracketsParslet = composeParslet({
  name: 'arrayBracketsParslet',
  precedence: Precedence.ARRAY_BRACKETS,
  accept: (type, next) => type === '[' && next === ']',
  parseInfix: (parser, left) => {
    parser.consume('[')
    parser.consume(']')
    return {
      type: 'JsdocTypeGeneric',
      left: {
        type: 'JsdocTypeName',
        value: 'Array'
      },
      elements: [
        assertRootResult(left)
      ],
      meta: {
        brackets: 'square',
        dot: false
      }
    }
  }
})
