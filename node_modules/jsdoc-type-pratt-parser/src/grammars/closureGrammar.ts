import { baseGrammar } from './baseGrammar'
import { pathGrammar } from './pathGrammar'
import { createNameParslet } from '../parslets/NameParslet'
import { nullableParslet } from '../parslets/NullableParslets'
import { Grammar } from './Grammar'
import { optionalParslet } from '../parslets/OptionalParslet'
import { stringValueParslet } from '../parslets/StringValueParslet'
import { numberParslet } from '../parslets/NumberParslet'
import { createKeyValueParslet } from '../parslets/KeyValueParslet'
import { createObjectParslet } from '../parslets/ObjectParslet'
import { typeOfParslet } from '../parslets/TypeOfParslet'
import { createFunctionParslet } from '../parslets/FunctionParslet'
import { createVariadicParslet } from '../parslets/VariadicParslet'
import { createSpecialNamePathParslet } from '../parslets/SpecialNamePathParslet'
import { createNamePathParslet } from '../parslets/NamePathParslet'
import { symbolParslet } from '../parslets/SymbolParslet'

const objectFieldGrammar: Grammar = [
  createNameParslet({
    allowedAdditionalTokens: ['module', 'keyof', 'event', 'external']
  }),
  nullableParslet,
  optionalParslet,
  stringValueParslet,
  numberParslet,
  createKeyValueParslet({
    allowKeyTypes: false,
    allowOptional: false,
    allowReadonly: false,
    allowVariadic: false
  })
]

export const closureGrammar = [
  ...baseGrammar,
  createObjectParslet({
    allowKeyTypes: false,
    objectFieldGrammar
  }),
  createNameParslet({
    allowedAdditionalTokens: ['event', 'external']
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
    allowJsdocNamePaths: true,
    pathGrammar
  }),
  createKeyValueParslet({
    allowKeyTypes: false,
    allowOptional: false,
    allowReadonly: false,
    allowVariadic: false
  }),
  symbolParslet
]
