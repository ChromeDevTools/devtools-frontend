import { composeParslet, type ParsletFunction } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertPlainKeyValueOrRootResult } from '../assertTypes.js'
import { NoParsletFoundError } from '../errors.js'
import type { KeyValueResult } from '../index.js'
import type { RootResult } from '../result/RootResult.js'

export function createParameterListParslet ({ allowTrailingComma }: {
  allowTrailingComma: boolean
}): ParsletFunction {
  return composeParslet({
    name: 'parameterListParslet',
    accept: type => type === ',',
    precedence: Precedence.PARAMETER_LIST,
    parseInfix: (parser, left) => {
      const elements: Array<RootResult | KeyValueResult> = [
        assertPlainKeyValueOrRootResult(left)
      ]
      parser.consume(',')
      do {
        try {
          const next = parser.parseIntermediateType(Precedence.PARAMETER_LIST)
          elements.push(assertPlainKeyValueOrRootResult(next))
        } catch (e) {
          if (allowTrailingComma && e instanceof NoParsletFoundError) {
            break
          } else {
            throw e
          }
        }
      } while (parser.consume(','))

      if (elements.length > 0 && elements.slice(0, -1).some(e => e.type === 'JsdocTypeVariadic')) {
        throw new Error('Only the last parameter may be a rest parameter')
      }

      return {
        type: 'JsdocTypeParameterList',
        elements
      }
    }
  })
}
