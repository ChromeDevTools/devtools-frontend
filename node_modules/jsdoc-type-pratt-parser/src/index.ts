/**
 * @package
 * This package provides a parser for jsdoc types.
 */

export * from './parse.js'
export type * from './result/RootResult.js'
export type * from './result/NonRootResult.js'
export { transform, type TransformRule, type TransformFunction, type TransformRules } from './transforms/transform.js'
export { catharsisTransform } from './transforms/catharsisTransform.js'
export { jtpTransform } from './transforms/jtpTransform.js'
export { stringify, stringifyRules } from './transforms/stringify.js'
export { identityTransformRules } from './transforms/identityTransformRules.js'
export * from './traverse.js'
export * from './visitorKeys.js'
