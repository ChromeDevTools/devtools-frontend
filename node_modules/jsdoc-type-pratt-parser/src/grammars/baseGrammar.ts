import type { Grammar } from './Grammar.js'
import { nullableParslet } from '../parslets/NullableParslets.js'
import { optionalParslet } from '../parslets/OptionalParslet.js'
import { numberParslet } from '../parslets/NumberParslet.js'
import { parenthesisParslet } from '../parslets/ParenthesisParslet.js'
import { specialTypesParslet } from '../parslets/SpecialTypesParslet.js'
import { notNullableParslet } from '../parslets/NotNullableParslet.js'
import { createParameterListParslet } from '../parslets/ParameterListParslet.js'
import { genericParslet } from '../parslets/GenericParslet.js'
import { unionParslet } from '../parslets/UnionParslets.js'

export const baseGrammar: Grammar = [
  nullableParslet,
  optionalParslet,
  numberParslet,
  parenthesisParslet,
  specialTypesParslet,
  notNullableParslet,
  createParameterListParslet({
    allowTrailingComma: true
  }),
  genericParslet,
  unionParslet,
  optionalParslet
]
