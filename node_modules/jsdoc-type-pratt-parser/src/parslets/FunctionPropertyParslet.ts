import { composeParslet } from './Parslet.js'
import type { CallSignatureResult, ConstructorSignatureResult, MethodSignatureResult } from '../result/NonRootResult.js'
import type { NameResult } from '../result/RootResult.js'

// (optional new or optionally quoted other optional name) +
//    (...args) + ":" + return value
export const functionPropertyParslet = composeParslet({
  name: 'functionPropertyParslet',
  accept: (type, next) =>
    type === 'new' && next ==='(' ||
    type === 'Identifier' && next === '(' ||
    type === 'StringValue' && next === '(' ||
    type === '(',
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

    const hasParenthesis = parser.lexer.current.type === '('

    /* c8 ignore next 3 -- Unreachable */
    if (!hasParenthesis) {
      throw new Error('function property is missing parameter list')
    }

    return result
  }
})
