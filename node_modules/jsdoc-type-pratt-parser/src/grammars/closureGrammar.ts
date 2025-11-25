import { baseGrammar } from './baseGrammar.js'
import { pathGrammar } from './pathGrammar.js'
import { createNameParslet } from '../parslets/NameParslet.js'
import { nullableParslet } from '../parslets/NullableParslets.js'
import type { Grammar } from './Grammar.js'
import { optionalParslet } from '../parslets/OptionalParslet.js'
import { stringValueParslet } from '../parslets/StringValueParslet.js'
import { numberParslet } from '../parslets/NumberParslet.js'
import { createKeyValueParslet } from '../parslets/KeyValueParslet.js'
import { createObjectParslet } from '../parslets/ObjectParslet.js'
import { typeOfParslet } from '../parslets/TypeOfParslet.js'
import { createFunctionParslet } from '../parslets/FunctionParslet.js'
import { createVariadicParslet } from '../parslets/VariadicParslet.js'
import { createSpecialNamePathParslet } from '../parslets/SpecialNamePathParslet.js'
import { createNamePathParslet } from '../parslets/NamePathParslet.js'
import { symbolParslet } from '../parslets/SymbolParslet.js'
import { createObjectFieldParslet } from '../parslets/ObjectFieldParslet.js'
import { genericParslet } from '../parslets/GenericParslet.js'
import { arrayBracketsParslet } from '../parslets/ArrayBracketsParslet.js'
import { baseNameTokens } from '../lexer/Token.js'

const objectFieldGrammar: Grammar = [
  createNameParslet({
    allowedAdditionalTokens: [
      'typeof', 'module', 'keyof', 'event', 'external', 'in'
    ]
  }),
  nullableParslet,
  optionalParslet,
  stringValueParslet,
  numberParslet,
  createObjectFieldParslet({
    allowSquaredProperties: false,
    allowKeyTypes: false,
    allowOptional: false,
    allowReadonly: false
  })
]

export const closureGrammar = [
  ...baseGrammar,
  createObjectParslet({
    allowKeyTypes: false,
    objectFieldGrammar
  }),
  createNameParslet({
    allowedAdditionalTokens: ['event', 'external', 'in']
  }),
  typeOfParslet,
  createFunctionParslet({
    allowWithoutParenthesis: false,
    allowNamedParameters: ['this', 'new'],
    allowNoReturnType: true,
    allowNewAsFunctionKeyword: false
  }),
  createVariadicParslet({
    allowEnclosingBrackets: false,
    allowPostfix: false
  }),
  // additional name parslet is needed for some special cases
  createNameParslet({
    allowedAdditionalTokens: ['keyof']
  }),
  createSpecialNamePathParslet({
    allowedTypes: ['module'],
    pathGrammar
  }),
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar
  }),
  createKeyValueParslet({
    allowOptional: false,
    allowVariadic: false
  }),
  symbolParslet
]

export const closureNameGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  })
]

export const closureNamePathGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  }),
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar
  })
]

export const closureNamePathSpecialGrammar = [
  createSpecialNamePathParslet({
    allowedTypes: ['module'],
    pathGrammar
  }),
  ...closureNamePathGrammar
]
