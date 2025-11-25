import { assertsParslet } from '../parslets/assertsParslet.js'
import { baseGrammar } from './baseGrammar.js'
import type { Grammar } from './Grammar.js'
import { pathGrammar } from './pathGrammar.js'
import { createNameParslet } from '../parslets/NameParslet.js'
import { nullableParslet } from '../parslets/NullableParslets.js'
import { optionalParslet } from '../parslets/OptionalParslet.js'
import { stringValueParslet } from '../parslets/StringValueParslet.js'
import { numberParslet } from '../parslets/NumberParslet.js'
import { createFunctionParslet } from '../parslets/FunctionParslet.js'
import { createObjectParslet } from '../parslets/ObjectParslet.js'
import { functionPropertyParslet } from '../parslets/FunctionPropertyParslet.js'
import { createTupleParslet } from '../parslets/TupleParslet.js'
import { createVariadicParslet } from '../parslets/VariadicParslet.js'
import { typeOfParslet } from '../parslets/TypeOfParslet.js'
import { keyOfParslet } from '../parslets/KeyOfParslet.js'
import { importParslet } from '../parslets/ImportParslet.js'
import { createSpecialNamePathParslet } from '../parslets/SpecialNamePathParslet.js'
import { readonlyPropertyParslet } from '../parslets/ReadonlyPropertyParslet.js'
import { arrayBracketsParslet } from '../parslets/ArrayBracketsParslet.js'
import { arrowFunctionParslet } from '../parslets/ArrowFunctionParslet.js'
import { genericArrowFunctionParslet } from '../parslets/GenericArrowFunctionParslet.js'
import { createNamePathParslet } from '../parslets/NamePathParslet.js'
import { intersectionParslet } from '../parslets/IntersectionParslet.js'
import { predicateParslet } from '../parslets/predicateParslet.js'
import { createObjectFieldParslet } from '../parslets/ObjectFieldParslet.js'
import { createKeyValueParslet } from '../parslets/KeyValueParslet.js'
import { objectSquaredPropertyParslet } from '../parslets/ObjectSquaredPropertyParslet.js'
import { readonlyArrayParslet } from '../parslets/ReadonlyArrayParslet.js'
import { conditionalParslet } from '../parslets/ConditionalParslet.js'
import { templateLiteralParslet } from '../parslets/TemplateLiteralParslet.js'
import { genericParslet } from '../parslets/GenericParslet.js'
import { baseNameTokens } from '../lexer/Token.js'

const objectFieldGrammar: Grammar = [
  functionPropertyParslet,
  readonlyPropertyParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  }),
  nullableParslet,
  optionalParslet,
  stringValueParslet,
  numberParslet,
  createObjectFieldParslet({
    allowSquaredProperties: true,
    allowKeyTypes: false,
    allowOptional: true,
    allowReadonly: true
  }),
  objectSquaredPropertyParslet
]

export const typescriptGrammar: Grammar = [
  ...baseGrammar,
  createObjectParslet({
    allowKeyTypes: false,
    objectFieldGrammar,
    signatureGrammar: [
      createKeyValueParslet({
        allowVariadic: true,
        allowOptional: true,
        acceptParameterList: true,
      })
    ]
  }),
  readonlyArrayParslet,
  typeOfParslet,
  keyOfParslet,
  importParslet,
  stringValueParslet,
  createFunctionParslet({
    allowWithoutParenthesis: true,
    allowNoReturnType: true,
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
  assertsParslet,
  conditionalParslet,
  createNameParslet({
    allowedAdditionalTokens: ['event', 'external', 'in']
  }),
  createSpecialNamePathParslet({
    allowedTypes: ['module'],
    pathGrammar
  }),
  arrayBracketsParslet,
  arrowFunctionParslet,
  genericArrowFunctionParslet,
  createNamePathParslet({
    allowSquareBracketsOnAnyType: true,
    allowJsdocNamePaths: false,
    pathGrammar
  }),
  intersectionParslet,
  predicateParslet,
  templateLiteralParslet,
  createKeyValueParslet({
    allowVariadic: true,
    allowOptional: true
  })
]

export const typescriptNameGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  })
]

export const typescriptNamePathGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  }),
  createNamePathParslet({
    allowSquareBracketsOnAnyType: true,
    // Here we actually want JSDoc name paths (even though TS
    //   in JSDoc namepath positions interpret them differently
    //   than JSDoc)
    allowJsdocNamePaths: true,
    pathGrammar
  })
]

export const typescriptNamePathSpecialGrammar = [
  createSpecialNamePathParslet({
    allowedTypes: ['module'],
    pathGrammar
  }),
  ...typescriptNamePathGrammar
]
