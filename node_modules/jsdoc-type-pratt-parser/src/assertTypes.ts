import type { IndexSignatureResult, KeyValueResult, MappedTypeResult } from './result/NonRootResult.js'
import { UnexpectedTypeError } from './errors.js'
import type { NameResult, NumberResult, RootResult, VariadicResult, TupleResult, GenericResult } from './result/RootResult.js'
import type { IntermediateResult } from './result/IntermediateResult.js'
import {
  reservedWords, futureReservedWords, strictModeNonIdentifiers,
  reservedWordsAsRootTSTypes
} from './lexer/Token.js'
import type { Parser } from './Parser.js'

export function assertResultIsNotReservedWord <T extends RootResult|IntermediateResult> (
  parser: Parser, result: T
): T {
  let text: string;
  if (result.type === 'JsdocTypeName') {
    text = result.value
  } else if (result.type === 'JsdocTypeParenthesis') {
    let res: IntermediateResult = result
    while (res.type === 'JsdocTypeParenthesis') {
      res = res.element
    }

    if (res.type === 'JsdocTypeName') {
      text = res.value
    } else {
      return result
    }
  } else {
    return result
  }


  if (reservedWords.always.includes(text) && !reservedWordsAsRootTSTypes.includes(text) &&
    (text !== 'this' || parser.classContext !== true)) {
    throw new Error(`Unexpected reserved keyword "${text}"`)
  }
  if (futureReservedWords.always.includes(text)) {
    throw new Error(`Unexpected future reserved keyword "${text}"`)
  }

  if ((parser.module !== undefined && parser.module) ||
    (parser.strictMode !== undefined && parser.strictMode)
  ) {
    if (reservedWords.strictMode.includes(text)) {
      throw new Error(`Unexpected reserved keyword "${text}" for strict mode`)
    }
    if (futureReservedWords.strictMode.includes(text)) {
      throw new Error(`Unexpected future reserved keyword "${text}" for strict mode`)
    }
    if (strictModeNonIdentifiers.includes(text)) {
      throw new Error(`The item "${text}" is not an identifier in strict mode`);
    }
  }
  if ((parser.module !== undefined && parser.module) ||
    (parser.asyncFunctionBody !== undefined && parser.asyncFunctionBody)
  ) {
    if (reservedWords.moduleOrAsyncFunctionBodies.includes(text)) {
      throw new Error(`Unexpected reserved keyword "${text}" for modules or async function bodies`)
    }
  }

  return result
}

/**
 * Throws an error if the provided result is not a {@link RootResult}
 */
export function assertRootResult (result?: IntermediateResult): RootResult {
  if (result === undefined) {
    throw new Error('Unexpected undefined')
  }
  if (
    result.type === 'JsdocTypeKeyValue' || result.type === 'JsdocTypeParameterList' ||
    result.type === 'JsdocTypeProperty' || result.type === 'JsdocTypeReadonlyProperty' ||
    result.type === 'JsdocTypeObjectField' || result.type === 'JsdocTypeJsdocObjectField' ||
    result.type === 'JsdocTypeIndexSignature' || result.type === 'JsdocTypeMappedType' ||
    result.type === 'JsdocTypeTypeParameter' || result.type === 'JsdocTypeCallSignature' ||
    result.type === 'JsdocTypeConstructorSignature' || result.type === 'JsdocTypeMethodSignature' ||
    result.type === 'JsdocTypeIndexedAccessIndex' || result.type === 'JsdocTypeComputedProperty' ||
    result.type === 'JsdocTypeComputedMethod'
  ) {
    throw new UnexpectedTypeError(result)
  }
  return result
}

export function assertPlainKeyValueOrRootResult (result: IntermediateResult): KeyValueResult | RootResult {
  if (result.type === 'JsdocTypeKeyValue') {
    return assertPlainKeyValueResult(result)
  }
  return assertRootResult(result)
}

export function assertPlainKeyValueOrNameResult (result: IntermediateResult): KeyValueResult | NameResult {
  if (result.type === 'JsdocTypeName') {
    return result
  }
  return assertPlainKeyValueResult(result)
}

export function assertPlainKeyValueResult (result: IntermediateResult): KeyValueResult {
  if (result.type !== 'JsdocTypeKeyValue') {
    throw new UnexpectedTypeError(result)
  }
  return result
}

export function assertNumberOrVariadicNameResult (result: IntermediateResult): NumberResult | NameResult | VariadicResult<NameResult> {
  if (result.type === 'JsdocTypeVariadic') {
    if (result.element?.type === 'JsdocTypeName') {
      return result as VariadicResult<NameResult>
    }
    throw new UnexpectedTypeError(result)
  }
  if (result.type !== 'JsdocTypeNumber' && result.type !== 'JsdocTypeName') {
    throw new UnexpectedTypeError(result)
  }
  return result
}

export function assertArrayOrTupleResult (result: IntermediateResult): TupleResult | GenericResult {
  if (result.type === 'JsdocTypeTuple') {
    return result
  }

  if (result.type === 'JsdocTypeGeneric' && result.meta.brackets === 'square') {
    return result
  }

  throw new UnexpectedTypeError(result)
}

export function isSquaredProperty (result: IntermediateResult): result is IndexSignatureResult | MappedTypeResult {
  return result.type === 'JsdocTypeIndexSignature' || result.type === 'JsdocTypeMappedType'
}
