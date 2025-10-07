import type { ParsletFunction } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { isQuestionMarkUnknownType } from './isQuestionMarkUnknownType.js'
import { assertRootResult } from '../assertTypes.js'

export const nullableParslet: ParsletFunction = (parser, precedence, left) => {
  const type = parser.lexer.current.type
  const next = parser.lexer.next.type

  const accept = ((left == null) && type === '?' && !isQuestionMarkUnknownType(next)) ||
    ((left != null) && type === '?')

  if (!accept) {
    return null
  }

  parser.consume('?')

  if (left == null) {
    return {
      type: 'JsdocTypeNullable',
      element: parser.parseType(Precedence.NULLABLE),
      meta: {
        position: 'prefix'
      }
    }
  } else {
    return {
      type: 'JsdocTypeNullable',
      element: assertRootResult(left),
      meta: {
        position: 'suffix'
      }
    }
  }
}
