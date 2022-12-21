import { baseGrammar } from './baseGrammar'
import { Grammar } from './Grammar'
import { pathGrammar } from './pathGrammar'
import { createNameParslet } from '../parslets/NameParslet'
import { nullableParslet } from '../parslets/NullableParslets'
import { optionalParslet } from '../parslets/OptionalParslet'
import { stringValueParslet } from '../parslets/StringValueParslet'
import { numberParslet } from '../parslets/NumberParslet'
import { createKeyValueParslet } from '../parslets/KeyValueParslet'
import { createFunctionParslet } from '../parslets/FunctionParslet'
import { createObjectParslet } from '../parslets/ObjectParslet'
import { createTupleParslet } from '../parslets/TupleParslet'
import { createVariadicParslet } from '../parslets/VariadicParslet'
import { typeOfParslet } from '../parslets/TypeOfParslet'
import { keyOfParslet } from '../parslets/KeyOfParslet'
import { importParslet } from '../parslets/ImportParslet'
import { createSpecialNamePathParslet } from '../parslets/SpecialNamePathParslet'
import { readonlyPropertyParslet } from '../parslets/ReadonlyPropertyParslet'
import { arrayBracketsParslet } from '../parslets/ArrayBracketsParslet'
import { arrowFunctionParslet } from '../parslets/ArrowFunctionParslet'
import { createNamePathParslet } from '../parslets/NamePathParslet'
import { intersectionParslet } from '../parslets/IntersectionParslet'
import { predicateParslet } from '../parslets/predicateParslet'

const objectFieldGrammar: Grammar = [
  readonlyPropertyParslet,
  createNameParslet({
    allowedAdditionalTokens: ['module', 'event', 'keyof', 'event', 'external']
  }),
  nullableParslet,
  optionalParslet,
  stringValueParslet,
  numberParslet,
  createKeyValueParslet({
    allowKeyTypes: false,
    allowOptional: true,
    allowReadonly: true,
    allowVariadic: false
  })
]

export const typescriptGrammar: Grammar = [
  ...baseGrammar,
  createObjectParslet({
    allowKeyTypes: false,
    objectFieldGrammar
  }),
  typeOfParslet,
  keyOfParslet,
  importParslet,
  stringValueParslet,
  createFunctionParslet({
    allowWithoutParenthesis: true,
    allowNoReturnType: false,
    allowNamedParameters: ['this', 'new', 'args'],
    allowNewAsFunctionKeyword: true
  }),
  createTupleParslet({
    allowQuestionMark: false
  }),
  createVariadicParslet({
    allowEnclosingBrackets: false,
    allowPostfix: false
  }),
  createNameParslet({
    allowedAdditionalTokens: ['event', 'external']
  }),
  createSpecialNamePathParslet({
    allowedTypes: ['module'],
    pathGrammar
  }),
  arrayBracketsParslet,
  arrowFunctionParslet,
  createNamePathParslet({
    allowJsdocNamePaths: false,
    pathGrammar
  }),
  createKeyValueParslet({
    allowKeyTypes: false,
    allowOptional: true,
    allowReadonly: true,
    allowVariadic: true
  }),
  intersectionParslet,
  predicateParslet
]
