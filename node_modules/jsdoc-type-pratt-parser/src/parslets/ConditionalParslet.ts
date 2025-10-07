import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
// import { UnexpectedTypeError } from '../errors.js'
import { assertRootResult } from '../assertTypes.js'
import type { RootResult, NullableResult } from '../result/RootResult.js'

export const conditionalParslet = composeParslet({
  name: 'conditionalParslet',
  precedence: Precedence.INFIX,
  accept: type => type === 'extends',
  parseInfix: (parser, left) => {
    parser.consume('extends')

    const extendsType = (
      parser.parseType(Precedence.KEY_OF_TYPE_OF
      ) as NullableResult<RootResult>).element

    // parser.consume('?')

    const trueType = parser.parseType(Precedence.INFIX)

    parser.consume(':')

    return {
      type: 'JsdocTypeConditional',
      checksType: assertRootResult(left),
      extendsType,
      trueType,
      falseType: parser.parseType(Precedence.INFIX)
    }
  }
})
