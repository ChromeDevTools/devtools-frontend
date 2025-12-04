import '../../../ui/kit/kit.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { Endianness, ValueType, ValueTypeMode } from './ValueInterpreterDisplayUtils.js';
export interface ValueDisplayData {
    buffer: ArrayBuffer;
    valueTypes: Set<ValueType>;
    endianness: Endianness;
    memoryLength: number;
    valueTypeModes?: Map<ValueType, ValueTypeMode>;
}
export interface ViewInput {
    buffer: ArrayBuffer;
    valueTypes: ValueType[];
    endianness: Endianness;
    memoryLength: number;
    valueTypeModes: Map<ValueType, ValueTypeMode>;
    onValueTypeModeChange: (type: ValueType, mode: ValueTypeMode) => void;
    onJumpToAddressClicked: (address: number) => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ValueInterpreterDisplay extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set onValueTypeModeChange(callback: (type: ValueType, mode: ValueTypeMode) => void);
    get onValueTypeModeChange(): (type: ValueType, mode: ValueTypeMode) => void;
    set onJumpToAddressClicked(callback: (address: number) => void);
    get onJumpToAddressClicked(): (address: number) => void;
    get valueTypeModes(): Map<ValueType, ValueTypeMode>;
    set valueTypeModes(modes: Map<ValueType, ValueTypeMode>);
    get valueTypes(): Set<ValueType>;
    set valueTypes(valueTypes: Set<ValueType>);
    get buffer(): ArrayBuffer;
    set buffer(buffer: ArrayBuffer);
    get endianness(): Endianness;
    set endianness(endianness: Endianness);
    get memoryLength(): number;
    set memoryLength(memoryLength: number);
    performUpdate(): void;
}
export {};
