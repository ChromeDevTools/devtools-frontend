import type { Node } from 'estree'
import type { TransformRules } from './transform.js'
import type {
  JsdocObjectFieldResult,
  KeyValueResult,
  NonRootResult,
  ObjectFieldResult,
  CallSignatureResult,
  ConstructorSignatureResult,
  MethodSignatureResult
} from '../result/NonRootResult.js'
import type {
  FunctionResult,
  NameResult,
  StringValueResult,
  SymbolResult,
  RootResult,
  VariadicResult,
  NumberResult
} from '../result/RootResult.js'

export function identityTransformRules (): TransformRules<NonRootResult> {
  return {
    JsdocTypeIntersection: (result, transform) => ({
      type: 'JsdocTypeIntersection',
      elements: result.elements.map(transform) as RootResult[]
    }),

    JsdocTypeGeneric: (result, transform) => ({
      type: 'JsdocTypeGeneric',
      left: transform(result.left) as RootResult,
      elements: result.elements.map(transform) as RootResult[],
      meta: {
        dot: result.meta.dot,
        brackets: result.meta.brackets
      }
    }),

    JsdocTypeNullable: result => result,

    JsdocTypeUnion: (result, transform) => ({
      type: 'JsdocTypeUnion',
      elements: result.elements.map(transform) as RootResult[]
    }),

    JsdocTypeUnknown: result => result,

    JsdocTypeUndefined: result => result,

    JsdocTypeTypeof: (result, transform) => ({
      type: 'JsdocTypeTypeof',
      element: transform(result.element) as RootResult
    }),

    JsdocTypeSymbol: (result, transform) => {
      const transformed: SymbolResult = {
        type: 'JsdocTypeSymbol',
        value: result.value
      }
      if (result.element !== undefined) {
        transformed.element = transform(result.element) as NumberResult | NameResult | VariadicResult<NameResult>
      }
      return transformed
    },

    JsdocTypeOptional: (result, transform) => ({
      type: 'JsdocTypeOptional',
      element: transform(result.element) as RootResult,
      meta: {
        position: result.meta.position
      }
    }),

    JsdocTypeObject: (result, transform) => ({
      type: 'JsdocTypeObject',
      meta: {
        separator: 'comma'
      },
      elements: result.elements.map(transform) as Array<ObjectFieldResult | JsdocObjectFieldResult | CallSignatureResult | ConstructorSignatureResult | MethodSignatureResult>
    }),

    JsdocTypeNumber: result => result,

    JsdocTypeNull: result => result,

    JsdocTypeNotNullable: (result, transform) => ({
      type: 'JsdocTypeNotNullable',
      element: transform(result.element) as RootResult,
      meta: {
        position: result.meta.position
      }
    }),

    JsdocTypeSpecialNamePath: result => result,

    JsdocTypeObjectField: (result, transform) => ({
      type: 'JsdocTypeObjectField',
      key: result.key,
      right: result.right === undefined ? undefined : transform(result.right) as RootResult,
      optional: result.optional,
      readonly: result.readonly,
      meta: result.meta
    }),

    JsdocTypeJsdocObjectField: (result, transform) => ({
      type: 'JsdocTypeJsdocObjectField',
      left: transform(result.left) as RootResult,
      right: transform(result.right) as RootResult
    }),

    JsdocTypeKeyValue: (result, transform) => ({
      type: 'JsdocTypeKeyValue',
      key: result.key,
      right: result.right === undefined ? undefined : transform(result.right) as RootResult,
      optional: result.optional,
      variadic: result.variadic
    }),

    JsdocTypeImport: (result, transform) => ({
      type: 'JsdocTypeImport',
      element: transform(result.element) as StringValueResult
    }),

    JsdocTypeAny: result => result,

    JsdocTypeStringValue: result => result,

    JsdocTypeNamePath: result => result,

    JsdocTypeVariadic: (result, transform) => {
      const transformed: VariadicResult<RootResult> = {
        type: 'JsdocTypeVariadic',
        meta: {
          position: result.meta.position,
          squareBrackets: result.meta.squareBrackets
        }
      }

      if (result.element !== undefined) {
        transformed.element = transform(result.element) as RootResult
      }

      return transformed
    },

    JsdocTypeTuple: (result, transform) => ({
      type: 'JsdocTypeTuple',
      elements: (result.elements as NonRootResult[]).map(transform) as RootResult[] | KeyValueResult[]
    }),

    JsdocTypeName: result => result,

    JsdocTypeFunction: (result, transform) => {
      const transformed: FunctionResult = {
        type: 'JsdocTypeFunction',
        arrow: result.arrow,
        parameters: result.parameters.map(transform) as RootResult[],
        constructor: result.constructor,
        parenthesis: result.parenthesis
      }

      if (result.returnType !== undefined) {
        transformed.returnType = transform(result.returnType) as RootResult
      }

      return transformed
    },

    JsdocTypeKeyof: (result, transform) => ({
      type: 'JsdocTypeKeyof',
      element: transform(result.element) as RootResult
    }),

    JsdocTypeParenthesis: (result, transform) => ({
      type: 'JsdocTypeParenthesis',
      element: transform(result.element) as RootResult
    }),

    JsdocTypeProperty: result => result,

    JsdocTypePredicate: (result, transform) => ({
      type: 'JsdocTypePredicate',
      left: transform(result.left) as NameResult,
      right: transform(result.right) as RootResult
    }),

    JsdocTypeIndexSignature: (result, transform) => ({
      type: 'JsdocTypeIndexSignature',
      key: result.key,
      right: transform(result.right) as RootResult
    }),

    JsdocTypeMappedType: (result, transform) => ({
      type: 'JsdocTypeMappedType',
      key: result.key,
      right: transform(result.right) as RootResult
    }),

    JsdocTypeAsserts: (result, transform) => ({
      type: 'JsdocTypeAsserts',
      left: transform(result.left) as NameResult,
      right: transform(result.right) as RootResult
    }),

    JsdocTypeReadonlyArray: (result, transform) => ({
      type: 'JsdocTypeReadonlyArray',
      element: transform(result.element) as RootResult
    }),

    JsdocTypeAssertsPlain: (result, transform) => ({
      type: 'JsdocTypeAssertsPlain',
      element: transform(result.element) as NameResult
    }),

    JsdocTypeConditional: (result, transform) => ({
      type: 'JsdocTypeConditional',
      checksType: transform(result.checksType) as RootResult,
      extendsType: transform(result.extendsType) as RootResult,
      trueType: transform(result.trueType) as RootResult,
      falseType: transform(result.falseType) as RootResult
    }),

    JsdocTypeTypeParameter: (result, transform) => ({
      type: 'JsdocTypeTypeParameter',
      name: transform(result.name) as NameResult,
      constraint: result.constraint !== undefined ? transform(result.constraint) as RootResult : undefined,
      defaultValue: result.defaultValue !== undefined ? transform(result.defaultValue) as RootResult : undefined
    }),

    JsdocTypeCallSignature: (result, transform) => ({
      type: 'JsdocTypeCallSignature',
      parameters: result.parameters.map(transform) as RootResult[],
      returnType: transform(result.returnType) as RootResult
    }),

    JsdocTypeConstructorSignature: (result, transform) => ({
      type: 'JsdocTypeConstructorSignature',
      parameters: result.parameters.map(transform) as RootResult[],
      returnType: transform(result.returnType) as RootResult
    }),

    JsdocTypeMethodSignature: (result, transform) => ({
      type: 'JsdocTypeMethodSignature',
      name: result.name,
      parameters: result.parameters.map(transform) as RootResult[],
      returnType: transform(result.returnType) as RootResult,
      meta: result.meta
    }),

    JsdocTypeIndexedAccessIndex: (result, transform) => ({
      type: 'JsdocTypeIndexedAccessIndex',
      right: transform(result.right) as RootResult
    }),

    JsdocTypeTemplateLiteral: (result, transform) => ({
      type: 'JsdocTypeTemplateLiteral',
      literals: result.literals,
      interpolations: result.interpolations.map(transform) as RootResult[]
    }),

    JsdocTypeComputedProperty: (result, transform) => {
      if (result.value.type.startsWith('JsdocType')) {
        return {
          type: 'JsdocTypeComputedProperty',
          value: transform(result.value as RootResult) as RootResult
        }
      } else {
        return {
          type: 'JsdocTypeComputedProperty',
          value: structuredClone(result.value) as Node
        }
      }
    },

    JsdocTypeComputedMethod: (result, transform) => {
      if (result.value.type.startsWith('JsdocType')) {
        return {
          type: 'JsdocTypeComputedMethod',
          value: transform(result.value as RootResult) as RootResult,
          optional: result.optional,
          parameters: result.parameters.map(transform) as RootResult[],
          returnType: transform(result.returnType) as RootResult
        }
      } else {
        return {
          type: 'JsdocTypeComputedMethod',
          value: structuredClone(result.value) as Node,
          optional: result.optional,
          parameters: result.parameters.map(transform) as RootResult[],
          returnType: transform(result.returnType) as RootResult
        }
      }
    }
  }
}
