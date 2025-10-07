import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertRootResult } from '../assertTypes.js'
import { UnexpectedTypeError } from '../errors.js'

export const genericParslet = composeParslet({
  name: 'genericParslet',
  accept: (type, next) => type === '<' || (type === '.' && next === '<'),
  precedence: Precedence.GENERIC,
  parseInfix: (parser, left) => {
    const dot = parser.consume('.')
    parser.consume('<')

    const objects = []
    let infer = false
    if (parser.consume('infer')) {
      infer = true
      const left = parser.parseIntermediateType(Precedence.SYMBOL)

      if (left.type !== 'JsdocTypeName') {
        throw new UnexpectedTypeError(left, 'A typescript infer always has to have a name.')
      }
      objects.push(left)
    } else {
      do {
        objects.push(parser.parseType(Precedence.PARAMETER_LIST))
      } while (parser.consume(','))
    }

    if (!parser.consume('>')) {
      throw new Error('Unterminated generic parameter list')
    }

    return {
      type: 'JsdocTypeGeneric',
      left: assertRootResult(left),
      elements: objects,
      ...(infer ? { infer: true } : {}),
      meta: {
        brackets: 'angle',
        dot
      }
    }
  }
})
