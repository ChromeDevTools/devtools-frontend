import { composeParslet } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { UnexpectedTypeError } from '../errors.js'
import type { FunctionResult } from '../result/RootResult.js'
import type { TypeParameterResult } from '../result/NonRootResult.js'

export const genericArrowFunctionParslet = composeParslet({
  name: 'genericArrowFunctionParslet',
  accept: type => type === '<',
  parsePrefix: (parser) => {
    const typeParameters: TypeParameterResult[] = []
    parser.consume('<')

    do {
      let defaultValue = undefined
      let name = parser.parseIntermediateType(Precedence.SYMBOL)
      if (name.type === 'JsdocTypeOptional') {
        name = name.element
        defaultValue = parser.parseType(Precedence.SYMBOL)
      }
      if (name.type !== 'JsdocTypeName') {
        throw new UnexpectedTypeError(name)
      }
      let constraint = undefined
      if (parser.consume('extends')) {
        constraint = parser.parseType(Precedence.SYMBOL)
        // Got an equal sign
        if (constraint.type === 'JsdocTypeOptional') {
          constraint = constraint.element
          defaultValue = parser.parseType(Precedence.SYMBOL)
        }
      }

      const typeParameter: TypeParameterResult = {
        type: 'JsdocTypeTypeParameter',
        name
      }

      if (constraint !== undefined) {
        typeParameter.constraint = constraint
      }

      if (defaultValue !== undefined) {
        typeParameter.defaultValue = defaultValue
      }

      typeParameters.push(typeParameter)

      if (parser.consume('>')) {
        break
      }
    } while (parser.consume(','))

    const functionBase = parser.parseIntermediateType(Precedence.SYMBOL) as FunctionResult
    functionBase.typeParameters = typeParameters

    return functionBase
  }
})
