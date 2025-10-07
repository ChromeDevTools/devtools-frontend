import type { ParsletFunction } from './Parslet.js'
import { Precedence } from '../Precedence.js'
import { assertRootResult } from '../assertTypes.js'
import { Parser } from '../Parser.js'
import type { NamePathResult, SpecialNamePath } from '../result/RootResult.js'
import { UnexpectedTypeError } from '../errors.js'
import type { PropertyResult, IndexedAccessIndexResult } from '../result/NonRootResult.js'
import type { Grammar } from '../grammars/Grammar.js'

export function createNamePathParslet ({ allowSquareBracketsOnAnyType, allowJsdocNamePaths, pathGrammar }: {
  allowJsdocNamePaths: boolean
  allowSquareBracketsOnAnyType: boolean
  pathGrammar: Grammar | null
}): ParsletFunction {
  return function namePathParslet (parser, precedence, left) {
    if ((left == null) || precedence >= Precedence.NAME_PATH) {
      return null
    }
    const type = parser.lexer.current.type
    const next = parser.lexer.next.type

    const accept = (type === '.' && next !== '<') ||
      (type === '[' && (allowSquareBracketsOnAnyType || left.type === 'JsdocTypeName')) ||
      (allowJsdocNamePaths && (type === '~' || type === '#'))

    if (!accept) {
      return null
    }

    let pathType: NamePathResult['pathType']
    let brackets = false

    if (parser.consume('.')) {
      pathType = 'property'
    } else if (parser.consume('[')) {
      pathType = 'property-brackets'
      brackets = true
    } else if (parser.consume('~')) {
      pathType = 'inner'
    } else {
      parser.consume('#')
      pathType = 'instance'
    }

    const pathParser = brackets && allowSquareBracketsOnAnyType
      ? parser
      : pathGrammar !== null
        ? new Parser(pathGrammar, parser.lexer, parser)
        : parser

    const parsed = pathParser.parseType(Precedence.NAME_PATH)
    parser.acceptLexerState(pathParser)
    let right: PropertyResult | SpecialNamePath<'event'> | IndexedAccessIndexResult

    switch (parsed.type) {
      case 'JsdocTypeName':
        right = {
          type: 'JsdocTypeProperty',
          value: parsed.value,
          meta: {
            quote: undefined
          }
        }
        break
      case 'JsdocTypeNumber':
        right = {
          type: 'JsdocTypeProperty',
          value: parsed.value.toString(10),
          meta: {
            quote: undefined
          }
        }
        break
      case 'JsdocTypeStringValue':
        right = {
          type: 'JsdocTypeProperty',
          value: parsed.value,
          meta: {
            quote: parsed.meta.quote
          }
        }
        break
      case 'JsdocTypeSpecialNamePath':
        if (parsed.specialType === 'event') {
          right = parsed as SpecialNamePath<'event'>
        } else {
          throw new UnexpectedTypeError(parsed, 'Type \'JsdocTypeSpecialNamePath\' is only allowed with specialType \'event\'')
        }
        break
      default:
        if (!brackets || !allowSquareBracketsOnAnyType) {
          throw new UnexpectedTypeError(parsed, 'Expecting \'JsdocTypeName\', \'JsdocTypeNumber\', \'JsdocStringValue\' or \'JsdocTypeSpecialNamePath\'')
        }

        right = {
          type: 'JsdocTypeIndexedAccessIndex',
          right: parsed
        }
    }

    if (brackets && !parser.consume(']')) {
      const token = parser.lexer.current
      throw new Error(`Unterminated square brackets. Next token is '${token.type}' ` +
        `with text '${token.text}'`)
    }

    return {
      type: 'JsdocTypeNamePath',
      left: assertRootResult(left),
      right,
      pathType
    }
  }
}
