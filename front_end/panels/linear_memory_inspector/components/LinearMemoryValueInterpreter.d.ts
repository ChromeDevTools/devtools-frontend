import '../../../ui/kit/kit.js';
import { Endianness, type ValueType, type ValueTypeMode } from './ValueInterpreterDisplayUtils.js';
export interface LinearMemoryValueInterpreterData {
    value: ArrayBuffer;
    valueTypes: Set<ValueType>;
    endianness: Endianness;
    valueTypeModes?: Map<ValueType, ValueTypeMode>;
    memoryLength: number;
    onValueTypeModeChange: (type: ValueType, mode: ValueTypeMode) => void;
    onJumpToAddressClicked: (address: number) => void;
    onEndiannessChanged: (endianness: Endianness) => void;
    onValueTypeToggled: (type: ValueType, checked: boolean) => void;
}
export declare class LinearMemoryValueInterpreter extends HTMLElement {
    #private;
    set data(data: LinearMemoryValueInterpreterData);
    get onValueTypeModeChange(): (type: ValueType, mode: ValueTypeMode) => void;
    set onValueTypeModeChange(value: (type: ValueType, mode: ValueTypeMode) => void);
    get onJumpToAddressClicked(): (address: number) => void;
    set onJumpToAddressClicked(value: (address: number) => void);
    get onEndiannessChanged(): (endianness: Endianness) => void;
    set onEndiannessChanged(value: (endianness: Endianness) => void);
    get onValueTypeToggled(): (type: ValueType, checked: boolean) => void;
    set onValueTypeToggled(value: (type: ValueType, checked: boolean) => void);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-linear-memory-inspector-interpreter': LinearMemoryValueInterpreter;
    }
}
