import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertRootResult } from '../assertTypes.js'

export const keyOfParslet = composeParslet({
  name: 'keyOfParslet',
  accept: type => type === 'keyof',
  parsePrefix: parser => {
    parser.consume('keyof')
    return {
      type: 'JsdocTypeKeyof',
      element: assertRootResult(parser.parseType(Precedence.KEY_OF_TYPE_OF))
    }
  }
})
