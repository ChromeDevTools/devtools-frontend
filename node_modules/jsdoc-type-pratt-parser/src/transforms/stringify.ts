import { transform, type TransformRules } from './transform.js'
import type { NonRootResult } from '../result/NonRootResult.js'
import type { RootResult } from '../result/RootResult.js'
import type { Node } from 'estree'

function applyPosition (position: 'prefix' | 'suffix', target: string, value: string): string {
  return position === 'prefix' ? value + target : target + value
}

export function quote (value: string, quote: 'single' | 'double' | undefined): string {
  switch (quote) {
    case 'double':
      return `"${value}"`
    case 'single':
      return `'${value}'`
    case undefined:
      return value
  }
}

export function stringifyRules ({
  computedPropertyStringifier
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Ok
  computedPropertyStringifier?: (node: Node, options?: any) => string
} = {}): TransformRules<string> {
  return {
    JsdocTypeParenthesis: (result, transform) => `(${result.element !== undefined ? transform(result.element) : ''})`,

    JsdocTypeKeyof: (result, transform) => `keyof ${transform(result.element)}`,

    JsdocTypeFunction: (result, transform) => {
      if (!result.arrow) {
        let stringified = result.constructor ? 'new' : 'function'
        if (!result.parenthesis) {
          return stringified
        }
        stringified += `(${result.parameters.map(transform).join(',' + (result.meta?.parameterSpacing ?? ' '))})`
        if (result.returnType !== undefined) {
          stringified += `${result.meta?.preReturnMarkerSpacing ?? ''}:${result.meta?.postReturnMarkerSpacing ?? ' '}${transform(result.returnType)}`
        }
        return stringified
      } else {
        if (result.returnType === undefined) {
          throw new Error('Arrow function needs a return type.')
        }
        let stringified = `${
          result.typeParameters !== undefined
            ? `<${result.typeParameters.map(transform).join(',' + (result.meta?.typeParameterSpacing ?? ' '))}>${
          result.meta?.postGenericSpacing ?? ''
        }`
            : ''
        }(${result.parameters.map(transform).join(',' + (result.meta?.parameterSpacing ?? ' '))})${
          result.meta?.preReturnMarkerSpacing ?? ' '
        }=>${result.meta?.postReturnMarkerSpacing ?? ' '}${transform(result.returnType)}`
        if (result.constructor) {
          stringified = 'new ' + stringified
        }
        return stringified
      }
    },

    JsdocTypeName: result => result.value,

    JsdocTypeTuple: (result, transform) => `[${(result.elements as NonRootResult[]).map(transform).join(',' + (result.meta?.elementSpacing ?? ' '))}]`,

    JsdocTypeVariadic: (result, transform) => result.meta.position === undefined
      ? '...'
      : applyPosition(result.meta.position, transform(result.element as NonRootResult), '...'),

    JsdocTypeNamePath: (result, transform) => {
      const left = transform(result.left)
      const right = transform(result.right)
      switch (result.pathType) {
        case 'inner':
          return `${left}~${right}`
        case 'instance':
          return `${left}#${right}`
        case 'property':
          return `${left}.${right}`
        case 'property-brackets':
          return `${left}[${right}]`
      }
    },

    JsdocTypeStringValue: result => quote(result.value, result.meta.quote),

    JsdocTypeAny: () => '*',

    JsdocTypeGeneric: (result, transform) => {
      if (result.meta.brackets === 'square') {
        const element = result.elements[0]
        const transformed = transform(element)
        if (element.type === 'JsdocTypeUnion' || element.type === 'JsdocTypeIntersection') {
          return `(${transformed})[]`
        } else {
          return `${transformed}[]`
        }
      } else {
        return `${transform(result.left)}${result.meta.dot ? '.' : ''}<${result.infer === true ? 'infer ' : ''}${result.elements.map(transform).join(',' + (result.meta.elementSpacing ?? ' '))}>`
      }
    },

    JsdocTypeImport: (result, transform) => `import(${transform(result.element)})`,

    JsdocTypeObjectField: (result, transform) => {
      let text = ''
      if (result.readonly) {
        text += 'readonly '
      }

      let optionalBeforeParentheses = false

      if (typeof result.key === 'string') {
        text += quote(result.key, result.meta.quote)
      } else {
        if (result.key.type === 'JsdocTypeComputedMethod') {
          optionalBeforeParentheses = true;
        }
        text += transform(result.key)
      }

      text += result.meta.postKeySpacing ?? ''

      if (!optionalBeforeParentheses && result.optional) {
        text += '?'
        text += result.meta.postOptionalSpacing ?? ''
      }

      if (result.right === undefined) {
        return text
      } else {
        return text + `:${result.meta.postColonSpacing ?? ' '}${transform(result.right)}`
      }
    },

    JsdocTypeJsdocObjectField: (result, transform) => `${transform(result.left)}: ${transform(result.right)}`,

    JsdocTypeKeyValue: (result, transform) => {
      let text = result.key
      if (result.optional) {
        text += (result.meta?.postKeySpacing ?? '') + '?' + (result.meta?.postOptionalSpacing ?? '')
      } else if (result.variadic) {
        text = '...' + (result.meta?.postVariadicSpacing ?? '') + text
      } else if (result.right !== undefined) {
        text += (result.meta?.postKeySpacing ?? '')
      }

      if (result.right === undefined) {
        return text
      } else {
        return text + `:${(result.meta?.postColonSpacing ?? ' ')}${transform(result.right)}`
      }
    },

    JsdocTypeSpecialNamePath: result => `${result.specialType}:${quote(result.value, result.meta.quote)}`,

    JsdocTypeNotNullable: (result, transform) => applyPosition(result.meta.position, transform(result.element), '!'),

    JsdocTypeNull: () => 'null',

    JsdocTypeNullable: (result, transform) => applyPosition(result.meta.position, transform(result.element), '?'),

    JsdocTypeNumber: result => result.value.toString(),

    JsdocTypeObject: (result, transform) => {
      /* c8 ignore next -- Guard */
      const lbType = (result.meta.separator ?? '').endsWith('linebreak')
      const lbEnding = result.meta.separator === 'comma-and-linebreak'
        ? ',\n'
        : result.meta.separator === 'semicolon-and-linebreak'
          ? ';\n'
          : result.meta.separator === 'linebreak' ? '\n' : ''

      const separatorForSingleObjectField = result.meta.separatorForSingleObjectField ?? false
      const trailingPunctuation = result.meta.trailingPunctuation ?? false

      return `{${
      /* c8 ignore next -- Guard */
      (lbType && (separatorForSingleObjectField || result.elements.length > 1) ? '\n' + (result.meta.propertyIndent ?? '') : '') +
      result.elements.map(transform).join(
        (result.meta.separator === 'comma' ? ', ' : lbType
          ? lbEnding +
            /* c8 ignore next -- Guard */
            (result.meta.propertyIndent ?? '')
          : '; ')
      ) +
      (separatorForSingleObjectField && result.elements.length === 1
        ? (result.meta.separator === 'comma' ? ',' : lbType ? lbEnding : ';')
        : trailingPunctuation && result.meta.separator !== undefined
          ? result.meta.separator.startsWith('comma')
            ? ','
            : result.meta.separator.startsWith('semicolon')
             ? ';'
             : ''
          : '') +
      (lbType && result.elements.length > 1 ? '\n' : '')
    }}`
    },

    JsdocTypeOptional: (result, transform) => applyPosition(result.meta.position, transform(result.element), '='),

    JsdocTypeSymbol: (result, transform) => `${result.value}(${result.element !== undefined ? transform(result.element) : ''})`,

    JsdocTypeTypeof: (result, transform) => `typeof ${transform(result.element)}`,

    JsdocTypeUndefined: () => 'undefined',

    JsdocTypeUnion: (result, transform) => result.elements.map(transform).join(
      result.meta?.spacing === undefined
        ? ' | '
        : `${result.meta.spacing}|${result.meta.spacing}`
    ),

    JsdocTypeUnknown: () => '?',

    JsdocTypeIntersection: (result, transform) => result.elements.map(transform).join(' & '),

    JsdocTypeProperty: result => quote(result.value, result.meta.quote),

    JsdocTypePredicate: (result, transform) => `${transform(result.left)} is ${transform(result.right)}`,

    JsdocTypeIndexSignature: (result, transform) => `[${result.key}: ${transform(result.right)}]`,

    JsdocTypeMappedType: (result, transform) => `[${result.key} in ${transform(result.right)}]`,

    JsdocTypeAsserts: (result, transform) => `asserts ${transform(result.left)} is ${transform(result.right)}`,

    JsdocTypeReadonlyArray: (result, transform) => `readonly ${transform(result.element)}`,

    JsdocTypeAssertsPlain: (result, transform) => `asserts ${transform(result.element)}`,

    JsdocTypeConditional: (result, transform) => `${transform(result.checksType)} extends ${transform(result.extendsType)} ? ${transform(result.trueType)} : ${transform(result.falseType)}`,

    JsdocTypeTypeParameter: (result, transform) => `${
      transform(result.name)}${
        result.constraint !== undefined ? ` extends ${transform(result.constraint)}` : ''
      }${
        result.defaultValue !== undefined ? `${
           result.meta?.defaultValueSpacing ?? ' '
        }=${
           result.meta?.defaultValueSpacing ?? ' '
        }${transform(result.defaultValue)}` : ''
      }`,

    JsdocTypeCallSignature: (result, transform) => `${
      result.typeParameters !== undefined
        ? `<${result.typeParameters.map(transform).join(',' + (result.meta?.typeParameterSpacing ?? ' '))}>${
          result.meta?.postGenericSpacing ?? ''
        }`
        : ''
    }(${
      result.parameters.map(transform).join(',' + (result.meta?.parameterSpacing ?? ' '))
    })${result.meta?.preReturnMarkerSpacing ?? ''}:${result.meta?.postReturnMarkerSpacing ?? ' '}${
      transform(result.returnType)
    }`,

    JsdocTypeConstructorSignature: (result, transform) => `new${result.meta?.postNewSpacing ?? ' '}${
      result.typeParameters !== undefined
        ? `<${result.typeParameters.map(transform).join(',' + (result.meta?.typeParameterSpacing ?? ' '))}>${
          result.meta?.postGenericSpacing ?? ''
        }`
        : ''
    }(${
      result.parameters.map(transform).join(',' + (result.meta?.parameterSpacing ?? ' '))
    })${result.meta?.preReturnMarkerSpacing ?? ''}:${result.meta?.postReturnMarkerSpacing ?? ' '}${
      transform(result.returnType)
    }`,

    JsdocTypeMethodSignature: (result, transform) => {
      const quote = result.meta.quote === 'double'
        ? '"'
        : result.meta.quote === 'single'
          ? "'"
          : '';

      return `${quote}${result.name}${quote}${
        result.meta.postMethodNameSpacing ?? ''
      }${
        result.typeParameters !== undefined
          ? `<${result.typeParameters.map(transform).join(',' + (result.meta.typeParameterSpacing ?? ' '))}>${
          result.meta.postGenericSpacing ?? ''
        }`
          : ''
      }(${
        result.parameters.map(transform).join(',' + (result.meta.parameterSpacing ?? ' '))
      })${result.meta.preReturnMarkerSpacing ?? ''}:${result.meta.postReturnMarkerSpacing ?? ' '}${
        transform(result.returnType)
      }`
    },

    JsdocTypeIndexedAccessIndex: (result, transform) => (transform(result.right)),

    JsdocTypeTemplateLiteral: (result, transform) => (`\`${
      // starts with a literal (even empty string) then alternating
      //    interpolations and literals and also ending in literal
      //    (even empty string)
      result.literals.slice(0, -1).map(
        (literal, idx) =>
          literal.replace(/`/gu, '\\`') + '${' + transform(result.interpolations[idx]) + '}'
      ).join('') + result.literals.slice(-1)[0].replace(/`/gu, '\\`')
    }\``),

    JsdocTypeComputedProperty: (result, transform) => {
      if (result.value.type.startsWith('JsdocType')) {
        return `[${
          transform(result.value as RootResult)
        }]`
      } else {
        if (computedPropertyStringifier === undefined) {
          throw new Error('Must have a computed property stringifier')
        }
        return `[${
          computedPropertyStringifier(result.value as Node).replace(/;$/u, '')
        }]`
      }
    },

    JsdocTypeComputedMethod: (result, transform) => {
      if (result.value.type.startsWith('JsdocType')) {
        return `[${transform(result.value as RootResult)}]${
          result.optional ? '?' : ''
        }${
          result.typeParameters !== undefined
            ? `<${result.typeParameters.map(transform).join(',' + (result.meta?.typeParameterSpacing ?? ' '))}>${
              result.meta?.postGenericSpacing ?? ''
            }`
            : ''
        }(${
          result.parameters.map(transform).join(',' + (result.meta?.parameterSpacing ?? ' '))
        })${result.meta?.preReturnMarkerSpacing ?? ''}:${result.meta?.postReturnMarkerSpacing ?? ' '}${transform(result.returnType)}`
      } else {
        if (computedPropertyStringifier === undefined) {
          throw new Error('Must have a computed property stringifier')
        }
        return `[${
          computedPropertyStringifier(result.value as Node).replace(/;$/u, '')
        }](${
          result.parameters.map(transform).join(',' + (result.meta?.parameterSpacing ?? ' '))
        })${result.meta?.preReturnMarkerSpacing ?? ''}:${result.meta?.postReturnMarkerSpacing ?? ' '}${transform(result.returnType)}`
      }
    }
  }
}

const storedStringifyRules = stringifyRules()

export function stringify (
  result: RootResult,
  stringificationRules: TransformRules<string>|
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Ok
    ((node: Node, options?: any) => string) = storedStringifyRules
): string {
  if (typeof stringificationRules === 'function') {
    stringificationRules = stringifyRules({
      computedPropertyStringifier: stringificationRules,
    })
  }
  return transform(stringificationRules, result)
}
