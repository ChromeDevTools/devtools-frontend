import { identityTransformRules } from './identityTransformRules.js'
import { transform } from './transform.js'
import type { RootResult } from '../result/RootResult.js'

const simplifyRules = identityTransformRules()

// remove parenthesis
simplifyRules.JsdocTypeParenthesis = (result, transform) => transform(result.element)

// remove squares around variadic parameters
const identityVariadic = simplifyRules.JsdocTypeVariadic
simplifyRules.JsdocTypeVariadic = (result, transform) => {
  result.meta.squareBrackets = false
  return identityVariadic(result, transform)
}

export function simplify (result: RootResult): RootResult {
  return transform(simplifyRules, result) as RootResult
}
