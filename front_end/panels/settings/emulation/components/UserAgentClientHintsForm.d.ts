import '../../../../ui/kit/kit.js';
import * as Common from '../../../../core/common/common.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export declare const enum Events {
    CLIENT_HINTS_CHANGE = "clienthintschange",
    CLIENT_HINTS_SUBMIT = "clienthintssubmit"
}
export interface EventTypes {
    [Events.CLIENT_HINTS_CHANGE]: Protocol.Emulation.UserAgentMetadata;
    [Events.CLIENT_HINTS_SUBMIT]: Protocol.Emulation.UserAgentMetadata;
}
declare global {
    interface HTMLElementEventMap {
        [Events.CLIENT_HINTS_CHANGE]: CustomEvent<Protocol.Emulation.UserAgentMetadata>;
        [Events.CLIENT_HINTS_SUBMIT]: CustomEvent<Protocol.Emulation.UserAgentMetadata>;
    }
}
export interface UserAgentClientHintsFormData {
    metaData?: Protocol.Emulation.UserAgentMetadata;
    showMobileCheckbox?: boolean;
    showSubmitButton?: boolean;
}
export declare const ALL_PROTOCOL_FORM_FACTORS: string[];
type BrandList = 'brands' | 'fullVersionList';
type BrandInputType = 'brandName' | 'brandVersion';
type TextField = 'fullVersion' | 'platform' | 'platformVersion' | 'architecture' | 'model';
export interface BrandRow {
    brand: string;
    version: string;
}
export interface ViewInput {
    brands: BrandRow[];
    fullVersionList: BrandRow[];
    fullVersion: string;
    formFactors: string[];
    platform: string;
    platformVersion: string;
    architecture: string;
    model: string;
    mobile: boolean;
    isFormOpened: boolean;
    isFormDisabled: boolean;
    showMobileCheckbox: boolean;
    showSubmitButton: boolean;
    useragentModifiedAriaMessage: string;
    onTreeToggle: (key?: string) => void;
    onBrandAdd: (list: BrandList) => void;
    onBrandDelete: (list: BrandList, index: number) => void;
    onBrandInputChange: (list: BrandList, index: number, brandInputType: BrandInputType, value: string) => void;
    onTextFieldChange: (field: TextField, value: string) => void;
    onMobileChange: (mobile: boolean) => void;
    onFormFactorChange: (formFactor: string, isChecked: boolean) => void;
    onSubmit: () => void;
}
export interface ViewOutput {
    focusBrandInput?: (list: BrandList, index: number) => void;
    focusAddBrandButton?: (list: BrandList) => void;
}
type View = typeof DEFAULT_VIEW;
declare const UserAgentClientHintsFormBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.Widget>;
/**
 * Component for user agent client hints form, it is used in device settings panel
 * and network conditions panel. It is customizable through showMobileCheckbox and showSubmitButton.
 *
 * The form dispatches {@link Events.CLIENT_HINTS_CHANGE} when the user changes
 * a value, and {@link Events.CLIENT_HINTS_SUBMIT} when the user submits the
 * form. The widget element also dispatches each event as a DOM `CustomEvent`
 * with the metadata in `detail`.
 */
export declare class UserAgentClientHintsForm extends UserAgentClientHintsFormBase {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set value(data: UserAgentClientHintsFormData);
    get value(): UserAgentClientHintsFormData;
    set disabled(disableForm: boolean);
    get disabled(): boolean;
    wasShown(): void;
    validate: () => UI.ListWidget.ValidatorResult;
    performUpdate(): void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export {};
