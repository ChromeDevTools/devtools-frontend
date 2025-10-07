import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertRootResult } from '../assertTypes.js'

export const notNullableParslet = composeParslet({
  name: 'notNullableParslet',
  accept: type => type === '!',
  precedence: Precedence.NULLABLE,
  parsePrefix: parser => {
    parser.consume('!')
    return {
      type: 'JsdocTypeNotNullable',
      element: parser.parseType(Precedence.NULLABLE),
      meta: {
        position: 'prefix'
      }
    }
  },
  parseInfix: (parser, left) => {
    parser.consume('!')
    return {
      type: 'JsdocTypeNotNullable',
      element: assertRootResult(left),
      meta: {
        position: 'suffix'
      }
    }
  }
})
