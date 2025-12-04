import * as UI from '../../../ui/legacy/legacy.js';
import { ValueType } from './ValueInterpreterDisplayUtils.js';
export interface ViewInput {
    valueTypes: Set<ValueType>;
    onToggle: (type: ValueType, checked: boolean) => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare class ValueInterpreterSettings extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: (input: ViewInput, _output: undefined, target: HTMLElement) => void);
    get valueTypes(): Set<ValueType>;
    set valueTypes(value: Set<ValueType>);
    get onToggle(): (type: ValueType, checked: boolean) => void;
    set onToggle(value: (type: ValueType, checked: boolean) => void);
    performUpdate(): void;
}
