import { composeParslet, type ParsletFunction } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { UnexpectedTypeError } from '../errors.js'
import { assertRootResult, isSquaredProperty } from '../assertTypes.js'

export function createObjectFieldParslet ({ allowSquaredProperties, allowKeyTypes, allowReadonly, allowOptional }: {
  allowSquaredProperties: boolean
  allowKeyTypes: boolean
  allowOptional: boolean
  allowReadonly: boolean
}): ParsletFunction {
  return composeParslet({
    name: 'objectFieldParslet',
    precedence: Precedence.KEY_VALUE,
    accept: type => type === ':',
    parseInfix: (parser, left) => {
      let optional = false
      let readonlyProperty = false

      if (allowOptional && left.type === 'JsdocTypeNullable') {
        optional = true
        left = left.element
      }

      if (allowReadonly && left.type === 'JsdocTypeReadonlyProperty') {
        readonlyProperty = true
        left = left.element
      }

      /* c8 ignore next 2 -- Always has base parser? */
      // object parslet uses a special grammar and for the value we want to switch back to the parent
      const parentParser = parser.baseParser ?? parser
      parentParser.acceptLexerState(parser)

      if (
        left.type === 'JsdocTypeNumber' || left.type === 'JsdocTypeName' || left.type === 'JsdocTypeStringValue' ||
        isSquaredProperty(left)
      ) {
        /* c8 ignore next 3 -- Guard */
        if (isSquaredProperty(left) && !allowSquaredProperties) {
          throw new UnexpectedTypeError(left)
        }

        parentParser.consume(':')

        let quote
        if (left.type === 'JsdocTypeStringValue') {
          quote = left.meta.quote
        }

        const right = parentParser.parseType(Precedence.KEY_VALUE)
        parser.acceptLexerState(parentParser)

        return {
          type: 'JsdocTypeObjectField',
          /* c8 ignore next -- Guard; not needed anymore? */
          key: isSquaredProperty(left) ? left : left.value.toString(),
          right,
          optional,
          readonly: readonlyProperty,
          meta: {
            quote
          }
        }
      } else {
        if (!allowKeyTypes) {
          throw new UnexpectedTypeError(left)
        }

        parentParser.consume(':')

        const right = parentParser.parseType(Precedence.KEY_VALUE)
        parser.acceptLexerState(parentParser)

        return {
          type: 'JsdocTypeJsdocObjectField',
          left: assertRootResult(left),
          right
        }
      }
    }
  })
}
