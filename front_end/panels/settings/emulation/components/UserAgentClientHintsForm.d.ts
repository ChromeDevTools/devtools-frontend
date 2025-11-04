import '../../../../ui/legacy/legacy.js';
import type * as Protocol from '../../../../generated/protocol.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
export declare class ClientHintsChangeEvent extends Event {
    static readonly eventName = "clienthintschange";
    constructor();
}
export declare class ClientHintsSubmitEvent extends Event {
    static readonly eventName = "clienthintssubmit";
    detail: {
        value: Protocol.Emulation.UserAgentMetadata;
    };
    constructor(value: Protocol.Emulation.UserAgentMetadata);
}
export interface UserAgentClientHintsFormData {
    metaData?: Protocol.Emulation.UserAgentMetadata;
    showMobileCheckbox?: boolean;
    showSubmitButton?: boolean;
}
export declare const ALL_PROTOCOL_FORM_FACTORS: string[];
/**
 * Component for user agent client hints form, it is used in device settings panel
 * and network conditions panel. It is customizable through showMobileCheckbox and showSubmitButton.
 */
export declare class UserAgentClientHintsForm extends HTMLElement {
    #private;
    set value(data: UserAgentClientHintsFormData);
    get value(): UserAgentClientHintsFormData;
    set disabled(disableForm: boolean);
    get disabled(): boolean;
    validate: () => UI.ListWidget.ValidatorResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-user-agent-client-hints-form': UserAgentClientHintsForm;
    }
}
