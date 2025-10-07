import type { IndexSignatureResult, KeyValueResult, MappedTypeResult } from './result/NonRootResult.js'
import { UnexpectedTypeError } from './errors.js'
import type { NameResult, NumberResult, RootResult, VariadicResult, TupleResult, GenericResult } from './result/RootResult.js'
import type { IntermediateResult } from './result/IntermediateResult.js'

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
