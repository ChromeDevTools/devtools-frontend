import type { Grammar } from './Grammar.js'
import { createNamePathParslet } from '../parslets/NamePathParslet.js'
import { createNameParslet } from '../parslets/NameParslet.js'
import { stringValueParslet } from '../parslets/StringValueParslet.js'
import { numberParslet } from '../parslets/NumberParslet.js'
import { createSpecialNamePathParslet } from '../parslets/SpecialNamePathParslet.js'
import { baseNameTokens } from '../lexer/Token.js'

const basePathGrammar: Grammar = [
  createNameParslet({
    allowedAdditionalTokens: ['external', 'module']
  }),
  stringValueParslet,
  numberParslet,
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar: null
  })
]

export const pathGrammar: Grammar = [
  ...basePathGrammar,
  createSpecialNamePathParslet({
    allowedTypes: ['event'],
    pathGrammar: basePathGrammar
  }),
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  })
]
