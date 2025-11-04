export declare class SwitchChangeEvent extends Event {
    readonly checked: boolean;
    static readonly eventName = "switchchange";
    constructor(checked: boolean);
}
export declare class Switch extends HTMLElement {
    #private;
    connectedCallback(): void;
    set checked(isChecked: boolean);
    get checked(): boolean;
    set disabled(isDisabled: boolean);
    get disabled(): boolean;
    get jslogContext(): string;
    set jslogContext(jslogContext: string);
    get label(): string;
    set label(label: string);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-switch': Switch;
    }
}
declare global {
    interface HTMLElementEventMap {
        [SwitchChangeEvent.eventName]: SwitchChangeEvent;
    }
}
