import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertPlainKeyValueOrNameResult } from '../assertTypes.js'
import { getParameters } from './FunctionParslet.js'

export const arrowFunctionParslet = composeParslet({
  name: 'arrowFunctionParslet',
  precedence: Precedence.ARROW,
  accept: type => type === '=>',
  parseInfix: (parser, left) => {
    parser.consume('=>')
    return {
      type: 'JsdocTypeFunction',
      parameters: getParameters(left).map(assertPlainKeyValueOrNameResult),
      arrow: true,
      constructor: false,
      parenthesis: true,
      returnType: parser.parseType(Precedence.OBJECT)
    }
  }
})
