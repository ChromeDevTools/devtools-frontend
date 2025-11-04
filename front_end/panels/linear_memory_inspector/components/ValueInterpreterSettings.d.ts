import '../../../ui/legacy/legacy.js';
import { ValueType } from './ValueInterpreterDisplayUtils.js';
export interface ValueInterpreterSettingsData {
    valueTypes: Set<ValueType>;
}
export declare class TypeToggleEvent extends Event {
    static readonly eventName = "typetoggle";
    data: {
        type: ValueType;
        checked: boolean;
    };
    constructor(type: ValueType, checked: boolean);
}
export declare class ValueInterpreterSettings extends HTMLElement {
    #private;
    set data(data: ValueInterpreterSettingsData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-linear-memory-inspector-interpreter-settings': ValueInterpreterSettings;
    }
}
