import { composeParslet, type ParsletFunction } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { UnexpectedTypeError } from '../errors.js'

export function createKeyValueParslet ({ allowOptional, allowVariadic, acceptParameterList }: {
  allowOptional: boolean
  allowVariadic: boolean,
  acceptParameterList?: boolean
}): ParsletFunction {
  return composeParslet({
    name: 'keyValueParslet',
    precedence: Precedence.KEY_VALUE,
    accept: type => type === ':',
    parseInfix: (parser, left) => {
      let optional = false
      let variadic = false

      if (allowOptional && left.type === 'JsdocTypeNullable') {
        optional = true
        left = left.element
      }

      if (allowVariadic && left.type === 'JsdocTypeVariadic' && left.element !== undefined) {
        variadic = true
        left = left.element
      }

      if (left.type !== 'JsdocTypeName') {
        if (acceptParameterList !== undefined && left.type === 'JsdocTypeParameterList') {
          parser.consume(':')
          return left
        }
        throw new UnexpectedTypeError(left)
      }

      parser.consume(':')

      const right = parser.parseType(Precedence.KEY_VALUE)

      return {
        type: 'JsdocTypeKeyValue',
        key: left.value,
        right,
        optional,
        variadic
      }
    }
  })
}
