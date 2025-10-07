import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { UnexpectedTypeError } from '../errors.js'
import { assertRootResult } from '../assertTypes.js'

export const predicateParslet = composeParslet({
  name: 'predicateParslet',
  precedence: Precedence.INFIX,
  accept: type => type === 'is',
  parseInfix: (parser, left) => {
    if (left.type !== 'JsdocTypeName') {
      throw new UnexpectedTypeError(left, 'A typescript predicate always has to have a name on the left side.')
    }

    parser.consume('is')

    return {
      type: 'JsdocTypePredicate',
      left,
      right: assertRootResult(parser.parseIntermediateType(Precedence.INFIX))
    }
  }
})
