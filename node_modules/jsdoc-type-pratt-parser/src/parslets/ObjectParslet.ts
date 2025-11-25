import { composeParslet, type ParsletFunction } from './Parslet.js'
import { Parser } from '../Parser.js'
import { Precedence } from '../Precedence.js'
import { UnexpectedTypeError } from '../errors.js'
import type { ObjectResult } from '../result/RootResult.js'
import type { Grammar } from '../grammars/Grammar.js'
import { getParameters } from './FunctionParslet.js'

export function createObjectParslet ({ signatureGrammar, objectFieldGrammar, allowKeyTypes }: {
  signatureGrammar?: Grammar
  objectFieldGrammar: Grammar
  allowKeyTypes: boolean
}): ParsletFunction {
  return composeParslet({
    name: 'objectParslet',
    accept: type => type === '{',
    parsePrefix: parser => {
      parser.consume('{')
      const result: ObjectResult = {
        type: 'JsdocTypeObject',
        meta: {
          separator: 'comma'
        },
        elements: []
      }

      if (!parser.consume('}')) {
        let separator: 'comma' | 'semicolon' | 'linebreak' | 'comma-and-linebreak' | 'semicolon-and-linebreak' | undefined

        const fieldParser = new Parser(
          objectFieldGrammar,
          parser.lexer,
          parser,
          parser.externalParsers?.computedPropertyParser !== undefined
            ? {
              externalParsers: {
                computedPropertyParser: parser.externalParsers.computedPropertyParser
              }
            }
            : undefined
        )

        while (true) {
          fieldParser.acceptLexerState(parser)
          let field = fieldParser.parseIntermediateType(Precedence.OBJECT)
          parser.acceptLexerState(fieldParser)

          if (field === undefined && allowKeyTypes) {
            field = parser.parseIntermediateType(Precedence.OBJECT)
          }

          let optional = false
          if (field.type === 'JsdocTypeNullable') {
            optional = true
            field = field.element
          }

          if (field.type === 'JsdocTypeNumber' || field.type === 'JsdocTypeName' || field.type === 'JsdocTypeStringValue') {
            let quote
            if (field.type === 'JsdocTypeStringValue') {
              quote = field.meta.quote
            }

            result.elements.push({
              type: 'JsdocTypeObjectField',
              key: field.value.toString(),
              right: undefined,
              optional,
              readonly: false,
              meta: {
                quote
              }
            })
          } else if (
            signatureGrammar !== undefined &&
            (field.type === 'JsdocTypeCallSignature' ||
            field.type === 'JsdocTypeConstructorSignature' ||
            field.type === 'JsdocTypeMethodSignature')
          ) {

            const signatureParser = new Parser(
              [
                ...signatureGrammar,
                ...parser.grammar.flatMap((grammar) => {
                  // We're supplying our own version
                  if (grammar.name === 'keyValueParslet') {
                    return []
                  }
                  return [grammar]
                })
              ],
              parser.lexer,
              parser
            )

            signatureParser.acceptLexerState(parser)
            const params = signatureParser.parseIntermediateType(Precedence.OBJECT)
            parser.acceptLexerState(signatureParser)

            field.parameters = getParameters(params)

            const returnType = parser.parseType(Precedence.OBJECT)
            field.returnType = returnType

            result.elements.push(field)
          } else if (
            field.type === 'JsdocTypeObjectField' ||
            field.type === 'JsdocTypeJsdocObjectField'
          ) {
            result.elements.push(field)
          } else if (
            field.type === 'JsdocTypeReadonlyProperty' &&
            field.element.type === 'JsdocTypeObjectField'
          ) {
            if (typeof field.element.key === 'object' &&
              field.element.key.type === 'JsdocTypeComputedMethod') {
              throw new Error('Computed method may not be readonly');
            }
            field.element.readonly = true
            result.elements.push(field.element)
          } else {
            throw new UnexpectedTypeError(field)
          }
          if (parser.lexer.current.startOfLine) {
            separator ??= 'linebreak';
            // Handle single stray comma/semi-colon
            parser.consume(',') || parser.consume(';')
          } else if (parser.consume(',')) {
            if (parser.lexer.current.startOfLine) {
              separator = 'comma-and-linebreak'
            } else {
              separator = 'comma'
            }
          } else if (parser.consume(';')) {
            if (parser.lexer.current.startOfLine) {
              separator = 'semicolon-and-linebreak'
            } else {
              separator = 'semicolon'
            }
          } else {
            break
          }
          const type = parser.lexer.current.type
          if (type === '}') {
            break
          }
        }

        result.meta.separator = separator ?? 'comma' // TODO: use undefined here
        if ((separator ?? '').endsWith('linebreak')) {
          // TODO: Consume appropriate whitespace
          result.meta.propertyIndent = '  '
        }

        if (!parser.consume('}')) {
          throw new Error('Unterminated record type. Missing \'}\'')
        }
      }
      return result
    }
  })
}
