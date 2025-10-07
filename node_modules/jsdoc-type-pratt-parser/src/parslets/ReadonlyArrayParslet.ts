import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertArrayOrTupleResult } from '../assertTypes.js'

export const readonlyArrayParslet = composeParslet({
  name: 'readonlyArrayParslet',
  accept: type => type === 'readonly',
  parsePrefix: parser => {
    parser.consume('readonly')
    return {
      type: 'JsdocTypeReadonlyArray',
      element: assertArrayOrTupleResult(parser.parseIntermediateType(Precedence.ALL))
    }
  }
})
