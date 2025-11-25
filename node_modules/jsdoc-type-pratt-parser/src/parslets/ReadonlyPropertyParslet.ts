import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'

export const readonlyPropertyParslet = composeParslet({
  name: 'readonlyPropertyParslet',
  accept: (type, next) => type === 'readonly' && next !== ':',
  parsePrefix: parser => {
    parser.consume('readonly')
    return {
      type: 'JsdocTypeReadonlyProperty',
      element: parser.parseIntermediateType(Precedence.KEY_VALUE)
    }
  }
})
