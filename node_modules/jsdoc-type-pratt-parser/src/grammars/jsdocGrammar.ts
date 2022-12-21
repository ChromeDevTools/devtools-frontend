import { baseGrammar } from './baseGrammar'
import { Grammar } from './Grammar'
import { pathGrammar } from './pathGrammar'
import { createFunctionParslet } from '../parslets/FunctionParslet'
import { stringValueParslet } from '../parslets/StringValueParslet'
import { createSpecialNamePathParslet } from '../parslets/SpecialNamePathParslet'
import { createVariadicParslet } from '../parslets/VariadicParslet'
import { createNameParslet } from '../parslets/NameParslet'
import { symbolParslet } from '../parslets/SymbolParslet'
import { arrayBracketsParslet } from '../parslets/ArrayBracketsParslet'
import { createNamePathParslet } from '../parslets/NamePathParslet'
import { createKeyValueParslet } from '../parslets/KeyValueParslet'
import { createObjectParslet } from '../parslets/ObjectParslet'

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
    allowJsdocNamePaths: true,
    pathGrammar
  }),
  createKeyValueParslet({
    allowKeyTypes: true,
    allowOptional: false,
    allowReadonly: false,
    allowVariadic: false
  })
]

export const jsdocGrammar: Grammar = [
  ...jsdocBaseGrammar,
  createObjectParslet({
    // jsdoc syntax allows full types as keys, so we need to pull in the full grammar here
    // we leave out the object type deliberately
    objectFieldGrammar: [
      createNameParslet({
        allowedAdditionalTokens: ['module']
      }),
      ...jsdocBaseGrammar
    ],
    allowKeyTypes: true
  })
]
