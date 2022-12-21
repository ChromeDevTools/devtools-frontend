import { TransformRules } from './transform'
import {
  JsdocObjectKeyValueResult,
  KeyValueResult,
  NonRootResult
} from '../result/NonRootResult'
import {
  FunctionResult,
  NameResult,
  StringValueResult,
  SymbolResult,
  RootResult,
  VariadicResult,
  NumberResult
} from '../result/RootResult'
import { isPlainKeyValue } from '../assertTypes'

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
      elements: result.elements.map(transform) as Array<KeyValueResult | JsdocObjectKeyValueResult>
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

    JsdocTypeKeyValue: (result, transform) => {
      if (isPlainKeyValue(result)) {
        return {
          type: 'JsdocTypeKeyValue',
          key: result.key,
          right: result.right === undefined ? undefined : transform(result.right) as RootResult,
          optional: result.optional,
          readonly: result.readonly,
          variadic: result.variadic,
          meta: result.meta
        }
      } else {
        return {
          type: 'JsdocTypeKeyValue',
          left: transform(result.left) as RootResult,
          right: transform(result.right) as RootResult,
          meta: result.meta
        }
      }
    },

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
      elements: (result.elements as NonRootResult[]).map(transform) as RootResult[]|KeyValueResult[]
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
    })
  }
}
