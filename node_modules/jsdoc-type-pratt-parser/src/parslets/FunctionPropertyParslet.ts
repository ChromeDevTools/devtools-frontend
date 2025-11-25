import { composeParslet } from './Parslet.js'
import type { TypeParameterResult, CallSignatureResult, ConstructorSignatureResult, MethodSignatureResult } from '../result/NonRootResult.js'
import type { NameResult } from '../result/RootResult.js'
import { Precedence } from '../Precedence.js'
import { UnexpectedTypeError } from '../errors.js'

// (optional new or optionally quoted other optional name) +
//    (...args) + ":" + return value
export const functionPropertyParslet = composeParslet({
  name: 'functionPropertyParslet',
  accept: (type, next) =>
    type === 'new' && (next ==='(' || next === '<') ||
    type === 'Identifier' && (next === '(' || next === '<') ||
    type === 'StringValue' && (next === '(' || next === '<') ||
    type === '(' || type === '<',
  parsePrefix: parser => {
    let result: CallSignatureResult | ConstructorSignatureResult | MethodSignatureResult

    // Just a placeholder
    const returnType: NameResult = {
      type: 'JsdocTypeName',
      value: 'void'
    }

    const newKeyword = parser.consume('new')
    if (newKeyword) {
      result = {
        type: 'JsdocTypeConstructorSignature',
        parameters: [],
        returnType
      }
    } else {
      const text = parser.lexer.current.text
      const identifier = parser.consume('Identifier')
      if (identifier) {
        result = {
          type: 'JsdocTypeMethodSignature',
          name: text,
          meta: {
            quote: undefined
          },
          parameters: [],
          returnType
        }
      } else {
        const text = parser.lexer.current.text
        const stringValue = parser.consume('StringValue')
        if (stringValue) {
          result = {
            type: 'JsdocTypeMethodSignature',
            name: text.slice(1, -1),
            meta: {
              quote: text.startsWith('"') ? 'double' : 'single'
            },
            parameters: [],
            returnType
          }
        } else {
          result = {
            type: 'JsdocTypeCallSignature',
            parameters: [],
            returnType
          }
        }
      }
    }

    const typeParameters: TypeParameterResult[] = []
    if (parser.consume('<')) {
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

      result.typeParameters = typeParameters
    }

    const hasParenthesis = parser.lexer.current.type === '('

    /* c8 ignore next 3 -- Unreachable */
    if (!hasParenthesis) {
      throw new Error('function property is missing parameter list')
    }

    return result
  }
})
