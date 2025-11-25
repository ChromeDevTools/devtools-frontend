import { baseGrammar } from './baseGrammar.js'
import type { Grammar } from './Grammar.js'
import { pathGrammar } from './pathGrammar.js'
import { createFunctionParslet } from '../parslets/FunctionParslet.js'
import { stringValueParslet } from '../parslets/StringValueParslet.js'
import { createSpecialNamePathParslet } from '../parslets/SpecialNamePathParslet.js'
import { createVariadicParslet } from '../parslets/VariadicParslet.js'
import { createNameParslet } from '../parslets/NameParslet.js'
import { symbolParslet } from '../parslets/SymbolParslet.js'
import { arrayBracketsParslet } from '../parslets/ArrayBracketsParslet.js'
import { createNamePathParslet } from '../parslets/NamePathParslet.js'
import { createObjectParslet } from '../parslets/ObjectParslet.js'
import { createObjectFieldParslet } from '../parslets/ObjectFieldParslet.js'
import { createKeyValueParslet } from '../parslets/KeyValueParslet.js'
import { genericParslet } from '../parslets/GenericParslet.js'
import { baseNameTokens } from '../lexer/Token.js'

const jsdocBaseGrammar = [
  ...baseGrammar,
  createFunctionParslet({
    allowWithoutParenthesis: true,
    allowNamedParameters: ['this', 'new'],
    allowNoReturnType: true,
    allowNewAsFunctionKeyword: false
  }),
  stringValueParslet,
  createSpecialNamePathParslet({
    allowedTypes: ['module', 'external', 'event'],
    pathGrammar
  }),
  createVariadicParslet({
    allowEnclosingBrackets: true,
    allowPostfix: true
  }),
  createNameParslet({
    allowedAdditionalTokens: ['keyof']
  }),
  symbolParslet,
  arrayBracketsParslet,
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar
  })
]

export const jsdocGrammar: Grammar = [
  ...jsdocBaseGrammar,
  createObjectParslet({
    // jsdoc syntax allows full types as keys, so we need to pull in the full grammar here
    // we leave out the object type deliberately
    objectFieldGrammar: [
      createNameParslet({
        allowedAdditionalTokens: ['typeof', 'module', 'in']
      }),
      createObjectFieldParslet({
        allowSquaredProperties: false,
        allowKeyTypes: true,
        allowOptional: false,
        allowReadonly: false
      }),
      ...jsdocBaseGrammar
    ],
    allowKeyTypes: true
  }),
  createKeyValueParslet({
    allowOptional: true,
    allowVariadic: true
  })
]

export const jsdocNameGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  })
]

export const jsdocNamePathGrammar = [
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

export const jsdocNamePathSpecialGrammar = [
  createSpecialNamePathParslet({
    allowedTypes: ['module', 'external', 'event'],
    pathGrammar
  }),
  ...jsdocNamePathGrammar
]
