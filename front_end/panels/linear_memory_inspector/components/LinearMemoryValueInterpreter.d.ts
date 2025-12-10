import '../../../ui/kit/kit.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { Endianness, type ValueType, type ValueTypeMode } from './ValueInterpreterDisplayUtils.js';
export interface ViewInput {
    endianness: Endianness;
    buffer: ArrayBuffer;
    valueTypes: Set<ValueType>;
    valueTypeModes: Map<ValueType, ValueTypeMode>;
    memoryLength: number;
    showSettings: boolean;
    onValueTypeModeChange: (type: ValueType, mode: ValueTypeMode) => void;
    onJumpToAddressClicked: (address: number) => void;
    onEndiannessChanged: (endianness: Endianness) => void;
    onValueTypeToggled: (type: ValueType, checked: boolean) => void;
    onSettingsToggle: () => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare class LinearMemoryValueInterpreter extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set buffer(value: ArrayBuffer);
    get buffer(): ArrayBuffer;
    set valueTypes(value: Set<ValueType>);
    get valueTypes(): Set<ValueType>;
    set valueTypeModes(value: Map<ValueType, ValueTypeMode>);
    get valueTypeModes(): Map<ValueType, ValueTypeMode>;
    set endianness(value: Endianness);
    get endianness(): Endianness;
    set memoryLength(value: number);
    get memoryLength(): number;
    get onValueTypeModeChange(): (type: ValueType, mode: ValueTypeMode) => void;
    set onValueTypeModeChange(value: (type: ValueType, mode: ValueTypeMode) => void);
    get onJumpToAddressClicked(): (address: number) => void;
    set onJumpToAddressClicked(value: (address: number) => void);
    get onEndiannessChanged(): (endianness: Endianness) => void;
    set onEndiannessChanged(value: (endianness: Endianness) => void);
    get onValueTypeToggled(): (type: ValueType, checked: boolean) => void;
    set onValueTypeToggled(value: (type: ValueType, checked: boolean) => void);
    performUpdate(): void;
}
