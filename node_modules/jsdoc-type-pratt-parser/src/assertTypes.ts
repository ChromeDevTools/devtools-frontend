import { KeyValueResult } from './result/NonRootResult'
import { UnexpectedTypeError } from './errors'
import { NameResult, NumberResult, RootResult, VariadicResult } from './result/RootResult'
import { IntermediateResult } from './result/IntermediateResult'

/**
 * Throws an error if the provided result is not a {@link RootResult}
 */
export function assertRootResult (result?: IntermediateResult): RootResult {
  if (result === undefined) {
    throw new Error('Unexpected undefined')
  }
  if (result.type === 'JsdocTypeKeyValue' || result.type === 'JsdocTypeParameterList' || result.type === 'JsdocTypeProperty' || result.type === 'JsdocTypeReadonlyProperty') {
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
  if (!isPlainKeyValue(result)) {
    if (result.type === 'JsdocTypeKeyValue') {
      throw new UnexpectedTypeError(result, 'Expecting no left side expression.')
    } else {
      throw new UnexpectedTypeError(result)
    }
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

export function isPlainKeyValue (result: IntermediateResult): result is KeyValueResult {
  return result.type === 'JsdocTypeKeyValue' && !result.meta.hasLeftSideExpression
}
