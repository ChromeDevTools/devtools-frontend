import * as Common from '../../core/common/common.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Bindings from '../../models/bindings/bindings.js';
import type * as UI from '../../ui/legacy/legacy.js';
export declare class ProfileHeader extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    title: string;
    uid: number;
    tempFile: Bindings.TempFile.TempFile | null;
    constructor(profileType: ProfileType, title: string);
    setTitle(title: string): void;
    profileType(): ProfileType;
    updateStatus(subtitle: string | null, wait?: boolean): void;
    /**
     * Must be implemented by subclasses.
     */
    createSidebarTreeElement(_dataDisplayDelegate: DataDisplayDelegate): UI.TreeOutline.TreeElement;
    createView(_dataDisplayDelegate: DataDisplayDelegate): UI.Widget.Widget;
    removeTempFile(): void;
    dispose(): void;
    canSaveToFile(): boolean;
    saveToFile(): void;
    loadFromFile(_file: File): Promise<Error | DOMError | null>;
    fromFile(): boolean;
    setFromFile(): void;
    setProfile(_profile: Protocol.Profiler.Profile): void;
}
export declare class StatusUpdate {
    subtitle: string | null;
    wait: boolean | undefined;
    constructor(subtitle: string | null, wait: boolean | undefined);
}
export declare const enum Events {
    UPDATE_STATUS = "UpdateStatus",
    PROFILE_TITLE_CHANGED = "ProfileTitleChanged"
}
export interface EventTypes {
    [Events.UPDATE_STATUS]: StatusUpdate;
    [Events.PROFILE_TITLE_CHANGED]: ProfileHeader;
}
export declare class ProfileType extends Common.ObjectWrapper.ObjectWrapper<ProfileEventTypes> {
    #private;
    profiles: ProfileHeader[];
    constructor(id: string, name: string);
    typeName(): string;
    nextProfileUid(): number;
    incrementProfileUid(): number;
    hasTemporaryView(): boolean;
    fileExtension(): string | null;
    get buttonTooltip(): string;
    get id(): string;
    get treeItemTitle(): string;
    get name(): string;
    buttonClicked(): boolean;
    get description(): string;
    isInstantProfile(): boolean;
    isEnabled(): boolean;
    getProfiles(): ProfileHeader[];
    customContent(): Element | null;
    setCustomContentEnabled(_enable: boolean): void;
    loadFromFile(file: File): Promise<Error | DOMError | null>;
    createProfileLoadedFromFile(_title: string): ProfileHeader;
    addProfile(profile: ProfileHeader): void;
    removeProfile(profile: ProfileHeader): void;
    clearTempStorage(): void;
    profileBeingRecorded(): ProfileHeader | null;
    setProfileBeingRecorded(profile: ProfileHeader | null): void;
    profileBeingRecordedRemoved(): void;
    reset(): void;
    disposeProfile(profile: ProfileHeader): void;
}
export declare const enum ProfileEvents {
    ADD_PROFILE_HEADER = "add-profile-header",
    PROFILE_COMPLETE = "profile-complete",
    REMOVE_PROFILE_HEADER = "remove-profile-header",
    VIEW_UPDATED = "view-updated"
}
export interface ProfileEventTypes {
    [ProfileEvents.ADD_PROFILE_HEADER]: ProfileHeader;
    [ProfileEvents.PROFILE_COMPLETE]: ProfileHeader;
    [ProfileEvents.REMOVE_PROFILE_HEADER]: ProfileHeader;
    [ProfileEvents.VIEW_UPDATED]: void;
}
export interface DataDisplayDelegate {
    showProfile(profile: ProfileHeader | null): UI.Widget.Widget | null;
    showObject(snapshotObjectId: string, perspectiveName: string): void;
    linkifyObject(nodeIndex: number): Promise<Element | null>;
}
