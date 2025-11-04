import * as Common from '../../core/common/common.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { ProfileType } from './ProfileHeader.js';
import type { ProfilesPanel } from './ProfilesPanel.js';
declare const ProfileLauncherView_base: (new (...args: any[]) => {
    addEventListener<T extends Events.PROFILE_TYPE_SELECTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.PROFILE_TYPE_SELECTED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.PROFILE_TYPE_SELECTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.PROFILE_TYPE_SELECTED): boolean;
    dispatchEventToListeners<T extends Events.PROFILE_TYPE_SELECTED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class ProfileLauncherView extends ProfileLauncherView_base {
    #private;
    readonly panel: ProfilesPanel;
    readonly selectedProfileTypeSetting: Common.Settings.Setting<string>;
    profileTypeHeaderElement: HTMLElement;
    readonly profileTypeSelectorForm: HTMLElement;
    controlButton: Buttons.Button.Button;
    readonly loadButton: Buttons.Button.Button;
    recordButtonEnabled: boolean;
    typeIdToOptionElementAndProfileType: Map<string, {
        optionElement: HTMLInputElement;
        profileType: ProfileType;
    }>;
    isProfiling?: boolean;
    isInstantProfile?: boolean;
    isEnabled?: boolean;
    constructor(profilesPanel: ProfilesPanel);
    loadButtonClicked(): void;
    updateControls(): void;
    profileStarted(): void;
    profileFinished(): void;
    updateProfileType(profileType: ProfileType, recordButtonEnabled: boolean): void;
    addProfileType(profileType: ProfileType): void;
    restoreSelectedProfileType(): void;
    controlButtonClicked(): void;
    profileTypeChanged(profileType: ProfileType): void;
}
export declare const enum Events {
    PROFILE_TYPE_SELECTED = "ProfileTypeSelected"
}
export interface EventTypes {
    [Events.PROFILE_TYPE_SELECTED]: ProfileType;
}
export {};
