import { assertPlainKeyValueResult, assertRootResult } from '../assertTypes.js'
import { composeParslet, type ParsletFunction } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import type { TupleResult } from '../result/RootResult.js'
import type { IntermediateResult } from '../result/IntermediateResult.js'

export function createTupleParslet ({ allowQuestionMark }: {
  allowQuestionMark: boolean
}): ParsletFunction {
  return composeParslet({
    name: 'tupleParslet',
    accept: type => type === '[',
    parsePrefix: parser => {
      parser.consume('[')
      const result: TupleResult = {
        type: 'JsdocTypeTuple',
        elements: []
      }

      if (parser.consume(']')) {
        return result
      }

      const typeList = parser.parseIntermediateType(Precedence.ALL)
      if (typeList.type === 'JsdocTypeParameterList') {
        if (typeList.elements[0].type === 'JsdocTypeKeyValue') {
          result.elements = typeList.elements.map(assertPlainKeyValueResult)
        } else {
          result.elements = typeList.elements.map(assertRootResult)
        }
      } else {
        if (typeList.type === 'JsdocTypeKeyValue') {
          result.elements = [assertPlainKeyValueResult(typeList)]
        } else {
          result.elements = [assertRootResult(typeList)]
        }
      }

      if (!parser.consume(']')) {
        throw new Error('Unterminated \'[\'')
      }

      if (!allowQuestionMark && result.elements.some((e: IntermediateResult) => e.type === 'JsdocTypeUnknown')) {
        throw new Error('Question mark in tuple not allowed')
      }

      return result
    }
  })
}
