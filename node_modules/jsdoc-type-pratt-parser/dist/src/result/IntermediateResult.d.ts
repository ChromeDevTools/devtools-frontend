import type { KeyValueResult, NonRootResult } from './NonRootResult.js';
import type { RootResult } from './RootResult.js';
export type IntermediateResult = NonRootResult | ParameterList | ReadonlyProperty;
export interface ParameterList {
    type: 'JsdocTypeParameterList';
    elements: Array<KeyValueResult | RootResult>;
}
export interface ReadonlyProperty {
    type: 'JsdocTypeReadonlyProperty';
    element: IntermediateResult;
}
