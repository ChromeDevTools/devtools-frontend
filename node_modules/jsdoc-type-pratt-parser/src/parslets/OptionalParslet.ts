import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertRootResult } from '../assertTypes.js'

export const optionalParslet = composeParslet({
  name: 'optionalParslet',
  accept: type => type === '=',
  precedence: Precedence.OPTIONAL,
  parsePrefix: parser => {
    parser.consume('=')
    return {
      type: 'JsdocTypeOptional',
      element: parser.parseType(Precedence.OPTIONAL),
      meta: {
        position: 'prefix'
      }
    }
  },
  parseInfix: (parser, left) => {
    parser.consume('=')
    return {
      type: 'JsdocTypeOptional',
      element: assertRootResult(left),
      meta: {
        position: 'suffix'
      }
    }
  }
})
