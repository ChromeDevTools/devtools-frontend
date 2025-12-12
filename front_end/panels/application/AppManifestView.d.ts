import '../../ui/legacy/components/inline_editor/inline_editor.js';
import '../../ui/components/report_view/report_view.js';
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
interface Screenshot {
    src: string;
    type?: string;
    sizes?: string;
    label?: string;
    form_factor?: string;
    platform?: string;
}
interface Manifest {
    background_color?: string;
    description?: string;
    display?: string;
    display_override?: string[];
    icons?: Array<{
        src: string;
        sizes?: string;
        type?: string;
        purpose?: string;
    }>;
    id?: string;
    name?: string;
    note_taking?: {
        new_note_url?: string;
    };
    orientation?: string;
    protocol_handlers?: Protocol.Page.ProtocolHandler[];
    screenshots?: Screenshot[];
    short_name?: string;
    shortcuts?: Array<{
        name: string;
        url: string;
        description?: string;
        short_name?: string;
        icons?: Array<{
            src: string;
            sizes?: string;
            type?: string;
            purpose?: string;
        }>;
    }>;
    start_url?: string;
    theme_color?: string;
}
interface IdentitySectionData {
    name: string;
    shortName: string;
    description: string;
    appId: string | null;
    recommendedId: string | null;
    hasId: boolean;
    warnings: Platform.UIString.LocalizedString[];
}
interface PresentationSectionData {
    startUrl: string;
    completeStartUrl: Platform.DevToolsPath.UrlString | null;
    themeColor: Common.Color.Color | null;
    backgroundColor: Common.Color.Color | null;
    orientation: string;
    display: string;
    newNoteUrl?: string;
    hasNewNoteUrl: boolean;
    completeNewNoteUrl: Platform.DevToolsPath.UrlString | null;
}
interface ProtocolHandlersSectionData {
    protocolHandlers: Protocol.Page.ProtocolHandler[];
    manifestLink: Platform.DevToolsPath.UrlString;
}
interface IconsSectionData {
    icons: Map<string, ProcessedImageResource[]>;
    imageResourceErrors: Platform.UIString.LocalizedString[];
}
interface ProcessedShortcut {
    name: string;
    shortName?: string;
    description?: string;
    url: string;
    shortcutUrl: Platform.DevToolsPath.UrlString;
    icons: Map<string, ProcessedImageResource[]>;
}
interface ShortcutsSectionData {
    shortcuts: ProcessedShortcut[];
    warnings: Platform.UIString.LocalizedString[];
    imageResourceErrors: Platform.UIString.LocalizedString[];
}
interface ProcessedScreenshot {
    screenshot: Screenshot;
    processedImage: ProcessedImageResource;
}
interface ScreenshotsSectionData {
    screenshots: ProcessedScreenshot[];
    warnings: Platform.UIString.LocalizedString[];
    imageResourceErrors: Platform.UIString.LocalizedString[];
}
interface WindowControlsSectionData {
    hasWco: boolean;
    themeColor: string;
    wcoStyleSheetText: boolean;
    url: Platform.DevToolsPath.UrlString;
}
type ProcessedImageResource = {
    imageResourceErrors: Platform.UIString.LocalizedString[];
    imageUrl?: string;
    squareSizedIconAvailable?: boolean;
} | {
    imageResourceErrors: Platform.UIString.LocalizedString[];
    imageUrl: string;
    squareSizedIconAvailable: boolean;
    title: string;
    naturalWidth: number;
    naturalHeight: number;
    imageSrc: string;
};
interface ViewInput {
    isEmpty?: boolean;
    errorsSection?: UI.ReportView.Section;
    installabilitySection?: UI.ReportView.Section;
    identitySection?: UI.ReportView.Section;
    presentationSection?: UI.ReportView.Section;
    iconsSection?: UI.ReportView.Section;
    maskedIcons?: boolean;
    windowControlsSection?: UI.ReportView.Section;
    shortcutSections?: UI.ReportView.Section[];
    screenshotsSections?: UI.ReportView.Section[];
    parsedManifest?: Manifest;
    url?: Platform.DevToolsPath.UrlString;
    identityData?: IdentitySectionData;
    presentationData?: PresentationSectionData;
    protocolHandlersData?: ProtocolHandlersSectionData;
    iconsData?: IconsSectionData;
    shortcutsData?: ShortcutsSectionData;
    screenshotsData?: ScreenshotsSectionData;
    installabilityErrors?: Protocol.Page.InstallabilityError[];
    warnings?: Platform.UIString.LocalizedString[];
    errors?: Protocol.Page.AppManifestError[];
    imageErrors?: Platform.UIString.LocalizedString[];
    windowControlsData?: WindowControlsSectionData;
    selectedPlatform?: string;
    onSelectOs?: (selectedOS: SDK.OverlayModel.EmulatedOSType) => Promise<void>;
    onToggleWcoToolbar?: (enabled: boolean) => Promise<void>;
    onCopyId?: () => void;
    onToggleIconMasked?: (masked: boolean) => void;
}
interface ViewOutput {
    scrollToSection: Map<string, () => void>;
    focusOnSection: Map<string, () => void>;
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
declare const AppManifestView_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.MANIFEST_DETECTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.MANIFEST_DETECTED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.MANIFEST_DETECTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.MANIFEST_DETECTED): boolean;
    dispatchEventToListeners<T extends Events.MANIFEST_DETECTED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class AppManifestView extends AppManifestView_base implements SDK.TargetManager.Observer {
    private registeredListeners;
    private target?;
    private resourceTreeModel?;
    private serviceWorkerManager?;
    private overlayModel?;
    private manifestUrl;
    private manifestData;
    private manifestErrors;
    private installabilityErrors;
    private appIdResponse;
    private wcoToolbarEnabled;
    private maskedIcons;
    private readonly view;
    private readonly output;
    constructor(view?: View);
    scrollToSection(sectionTitle: string): void;
    focusOnSection(sectionTitle: string): boolean;
    getStaticSections(): Array<{
        title: string;
        jslogContext: string | undefined;
    }>;
    getManifestElement(): Element;
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
    private updateManifest;
    performUpdate(): Promise<void>;
    private stringProperty;
    private loadImage;
    parseSizes(sizes: string, resourceName: Platform.UIString.LocalizedString, imageUrl: string, imageResourceErrors: Platform.UIString.LocalizedString[]): ParsedSize[];
    checkSizeProblem(size: ParsedSize, naturalWidth: number, naturalHeight: number, resourceName: Platform.UIString.LocalizedString, imageUrl: string): {
        hasSquareSize: boolean;
        error?: Platform.UIString.LocalizedString;
    };
    private processImageResource;
    private onToggleWcoToolbar;
    private onSelectOs;
    private processIdentity;
    private processIcons;
    private processShortcuts;
    private processScreenshots;
    private processWindowControls;
    private processPresentation;
    private processProtocolHandlers;
}
export declare const enum Events {
    MANIFEST_DETECTED = "ManifestDetected"
}
export interface EventTypes {
    [Events.MANIFEST_DETECTED]: boolean;
}
export {};
