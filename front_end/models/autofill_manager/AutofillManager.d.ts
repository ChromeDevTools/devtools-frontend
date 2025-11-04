import * as Common from '../../core/common/common.js';
import type * as Protocol from '../../generated/protocol.js';
export declare class AutofillManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): AutofillManager;
    getLastFilledAddressForm(): AddressFormFilledEvent | null;
    highlightFilledField(filledField: Protocol.Autofill.FilledField): void;
    clearHighlightedFilledFields(): void;
}
/**
 * A Match describes how the value of a filled field corresponds to a substring
 * of address from startIndex to endIndex.
 **/
export interface Match {
    startIndex: number;
    endIndex: number;
    filledFieldIndex: number;
}
export declare const enum Events {
    ADDRESS_FORM_FILLED = "AddressFormFilled"
}
export interface AddressFormFilledEvent {
    address: string;
    filledFields: Protocol.Autofill.FilledField[];
    matches: Match[];
}
export interface EventTypes {
    [Events.ADDRESS_FORM_FILLED]: AddressFormFilledEvent;
}
