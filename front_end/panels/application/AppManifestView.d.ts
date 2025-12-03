import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export type ParsedSize = {
    any: 'any';
    formatted: string;
} | {
    width: number;
    height: number;
    formatted: string;
};
declare const AppManifestView_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends keyof EventTypes>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof EventTypes): boolean;
    dispatchEventToListeners<T extends keyof EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class AppManifestView extends AppManifestView_base implements SDK.TargetManager.Observer {
    private readonly emptyView;
    private readonly reportView;
    private readonly errorsSection;
    private readonly installabilitySection;
    private readonly identitySection;
    private readonly presentationSection;
    private readonly iconsSection;
    private readonly windowControlsSection;
    private readonly protocolHandlersSection;
    private readonly shortcutSections;
    private readonly screenshotsSections;
    private nameField;
    private shortNameField;
    private descriptionField;
    private readonly startURLField;
    private readonly themeColorSwatch;
    private readonly backgroundColorSwatch;
    private orientationField;
    private displayField;
    private readonly newNoteUrlField;
    private readonly throttler;
    private registeredListeners;
    private target?;
    private resourceTreeModel?;
    private serviceWorkerManager?;
    private overlayModel?;
    private protocolHandlersView;
    private manifestUrl;
    private manifestData;
    private manifestErrors;
    private installabilityErrors;
    private appIdResponse;
    constructor(emptyView: UI.EmptyWidget.EmptyWidget, reportView: UI.ReportView.ReportView, throttler: Common.Throttler.Throttler);
    getStaticSections(): UI.ReportView.Section[];
    getManifestElement(): Element;
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
    private updateManifest;
    performUpdate(): Promise<void>;
    private renderErrors;
    private renderIdentity;
    private renderPresentation;
    private renderProtocolHandlers;
    private renderIcons;
    private renderShortcuts;
    private renderScreenshots;
    private renderInstallability;
    private stringProperty;
    private renderWindowControls;
    getInstallabilityErrorMessages(installabilityErrors: Protocol.Page.InstallabilityError[]): string[];
    private loadImage;
    parseSizes(sizes: string, resourceName: Platform.UIString.LocalizedString, imageUrl: string, imageResourceErrors: Platform.UIString.LocalizedString[]): ParsedSize[];
    checkSizeProblem(size: ParsedSize, image: HTMLImageElement, resourceName: Platform.UIString.LocalizedString, imageUrl: string): {
        hasSquareSize: boolean;
        error?: Platform.UIString.LocalizedString;
    };
    private appendImageResourceToSection;
    private appendWindowControlsToSection;
}
export declare const enum Events {
    MANIFEST_DETECTED = "ManifestDetected",
    MANIFEST_RENDERED = "ManifestRendered"
}
export interface EventTypes {
    [Events.MANIFEST_DETECTED]: boolean;
    [Events.MANIFEST_RENDERED]: void;
}
export {};
