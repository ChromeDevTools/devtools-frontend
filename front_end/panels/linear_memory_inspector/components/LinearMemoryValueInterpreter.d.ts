import '../../../ui/components/icon_button/icon_button.js';
import './ValueInterpreterDisplay.js';
import './ValueInterpreterSettings.js';
import { Endianness, type ValueType, type ValueTypeMode } from './ValueInterpreterDisplayUtils.js';
export declare class EndiannessChangedEvent extends Event {
    static readonly eventName = "endiannesschanged";
    data: Endianness;
    constructor(endianness: Endianness);
}
export declare class ValueTypeToggledEvent extends Event {
    static readonly eventName = "valuetypetoggled";
    data: {
        type: ValueType;
        checked: boolean;
    };
    constructor(type: ValueType, checked: boolean);
}
export interface LinearMemoryValueInterpreterData {
    value: ArrayBuffer;
    valueTypes: Set<ValueType>;
    endianness: Endianness;
    valueTypeModes?: Map<ValueType, ValueTypeMode>;
    memoryLength: number;
}
export declare class LinearMemoryValueInterpreter extends HTMLElement {
    #private;
    set data(data: LinearMemoryValueInterpreterData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-linear-memory-inspector-interpreter': LinearMemoryValueInterpreter;
    }
}
