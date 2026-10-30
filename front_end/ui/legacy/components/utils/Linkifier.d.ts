import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import type * as StackTrace from '../../../../models/stack_trace/stack_trace.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import { type LitTemplate, type TemplateResult } from '../../../lit/lit.js';
import * as UI from '../../legacy.js';
export declare class Linkifier extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements SDK.TargetManager.Observer {
    #private;
    private readonly maxLength;
    private readonly anchorsByTarget;
    private readonly locationPoolByTarget;
    private useLinkDecorator;
    constructor(maxLengthForDisplayedURLs?: number, useLinkDecorator?: boolean);
    static setLinkDecorator(linkDecorator: LinkDecorator): void;
    private updateAllAnchorDecorations;
    private static bindUILocation;
    static bindUILocationForTest(anchor: Element, uiLocation: Workspace.UISourceCode.UILocation): void;
    private static unbindUILocation;
    /**
     * When we link to a breakpoint condition, we need to stash the BreakpointLocation as the revealable
     * in the LinkInfo.
     */
    private static bindBreakpoint;
    /**
     * When we link to a breakpoint condition, we store the BreakpointLocation in the revealable.
     * Clear it when the LiveLocation updates.
     */
    private static unbindBreakpoint;
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
    maybeLinkifyScriptLocation(target: SDK.Target.Target | null, scriptId: Protocol.Runtime.ScriptId | null, sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number | undefined, options?: LinkifyOptions): HTMLElement | null;
    linkifyScriptLocation(target: SDK.Target.Target | null, scriptId: Protocol.Runtime.ScriptId | null, sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number | undefined, options?: LinkifyOptions): HTMLElement;
    linkifyRawLocation(rawLocation: SDK.DebuggerModel.Location, fallbackUrl: Platform.DevToolsPath.UrlString, className?: string, options?: LinkifyOptions): HTMLElement;
    maybeLinkifyConsoleCallFrame(target: SDK.Target.Target | null, callFrame: Protocol.Runtime.CallFrame | Trace.Types.Events.CallFrame, options?: LinkifyOptions): HTMLElement | null;
    static linkifyUILocation(uiLocation: Workspace.UISourceCode.UILocation, options?: LinkifyOptions): HTMLElement;
    static linkifyStackTraceFrame(frame: StackTrace.StackTrace.Frame, options?: LinkifyOptions): HTMLElement;
    linkifyStackTraceTopFrame(target: SDK.Target.Target | null, stackTrace: Protocol.Runtime.StackTrace): HTMLElement;
    linkifyCSSLocation(rawLocation: SDK.CSSModel.CSSLocation, classes?: string): Element;
    reset(): void;
    dispose(): void;
    private updateAnchor;
    private static updateAnchorFromUILocation;
    private static updateLinkDecorations;
    static renderLinkifiedUrl(url: Platform.DevToolsPath.UrlString, options?: LinkifyURLOptions): TemplateResult;
    /**
     * @deprecated use renderLinkifiedUrl.
     */
    static linkifyURL(url: Platform.DevToolsPath.UrlString, options?: LinkifyURLOptions): HTMLElement;
    static linkifyRevealable(revealable: Object, text: string | HTMLElement, fallbackHref?: Platform.DevToolsPath.UrlString, title?: string, className?: string, jslogContext?: string): HTMLElement;
    private static renderLink;
    /**
     * @deprecated use renderLink.
     */
    private static createLink;
    private static setTrimmedText;
    private static appendTextWithoutHashes;
    private static appendHiddenText;
    static untruncatedNodeText(node: Node): string;
    static untruncatedTextContent(node: Node): string;
    static linkInfo(link: Element | null): LinkInfo | null;
    private static handleClick;
    static handleClickFromNewComponentLand(linkInfo: LinkInfo): void;
    static invokeFirstAction(linkInfo: LinkInfo): boolean;
    static linkHandlerSetting(): Common.Settings.Setting<string>;
    static registerLinkHandler(registration: LinkHandlerRegistration): void;
    static unregisterLinkHandler(registration: LinkHandlerRegistration): void;
    static isRegisteredLinkHandlerScheme(scheme: string): boolean;
    static shouldHandleOpenResource(openResourceScheme: string | null, url: Platform.DevToolsPath.UrlString, otherSchemeRegistrations: Set<string>): boolean;
    static uiLocation(link: Element): Workspace.UISourceCode.UILocation | null;
    /**
     * Returns the frame or worker to attribute opening `info`'s URL in a new tab to: the one it was linkified for,
     * if given; the one that the network request it reveals belongs to; or the one that the source it points at
     * was loaded by. A URL that merely matches some resource of the page is not attributed to that resource's
     * frame: where the text came from matters, not what it happens to spell.
     */
    private static initiatorIdForLink;
    static linkActions(info: LinkInfo): Array<{
        section: string;
        title: string;
        jslogContext: string;
        handler: () => Promise<void> | void;
    }>;
}
export interface LinkDecorator extends Common.EventTarget.EventTarget<LinkDecorator.EventTypes> {
    linkIcon(uiSourceCode: Workspace.UISourceCode.UISourceCode): LitTemplate | null;
}
export declare namespace LinkDecorator {
    const enum Events {
        LINK_ICON_CHANGED = "LinkIconChanged"
    }
    interface EventTypes {
        [Events.LINK_ICON_CHANGED]: Workspace.UISourceCode.UISourceCode;
    }
}
export declare class LinkContextMenuProvider implements UI.ContextMenu.Provider<Node> {
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: Node): void;
}
export declare class LinkHandlerSettingUI {
    private element;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): LinkHandlerSettingUI;
    update(): void;
    private onChange;
    settingElement(): Element;
}
export declare class ContentProviderContextMenuProvider implements UI.ContextMenu
    .Provider<Workspace.UISourceCode.UISourceCode | SDK.Resource.Resource | SDK.NetworkRequest.NetworkRequest> {
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, contentProvider: Workspace.UISourceCode.UISourceCode | SDK.Resource.Resource | SDK.NetworkRequest.NetworkRequest): void;
}
/**
 * Returns the {@link OpenInNewTabInitiatorId} for a URL that came from `source`: the frame that `source` belongs
 * to, or the worker that it belongs to when there is no frame, if DevTools knows that unambiguously. Returns
 * `undefined` otherwise, in which case the browser attributes the navigation to an opaque origin. A request,
 * resource or execution context is not attributed to its frame once the frame has navigated away from the
 * document it belongs to, or once the target that `source` came from no longer tracks the frame (see
 * {@link frameIdUnlessNavigatedSince}).
 */
export declare function openInNewTabInitiatorId(source: SDK.NetworkRequest.NetworkRequest | SDK.Resource.Resource | SDK.RuntimeModel.ExecutionContext | Workspace.UISourceCode.UISourceCode): OpenInNewTabInitiatorId | undefined;
interface LinkInfo {
    enableDecorator?: boolean;
    uiLocation?: Workspace.UISourceCode.UILocation;
    url?: Platform.DevToolsPath.UrlString;
    lineNumber?: number;
    columnNumber?: number;
    revealable?: Object;
    fallback?: Element;
    userMetric?: Host.UserMetrics.Action;
    allowPrivileged?: boolean;
    initiatorId?: OpenInNewTabInitiatorIdOrProvider;
}
/**
 * The DevTools frame id or target id of the frame or worker that a linkified URL came from. When the URL is opened
 * in a new tab, the browser attributes the navigation to it, like a link clicked in that frame or worker; see
 * `InspectorFrontendHostAPI.openInNewTab()`.
 */
export type OpenInNewTabInitiatorId = Protocol.Page.FrameId | Protocol.Target.TargetID;
/**
 * An {@link OpenInNewTabInitiatorId}, or a function that determines it at the time the link is opened. Use the
 * function when where the link came from may be gone by then: a frame keeps its id across navigations, so the id
 * of a frame that has since navigated would attribute the navigation to whatever document the frame shows now.
 */
export type OpenInNewTabInitiatorIdOrProvider = OpenInNewTabInitiatorId | (() => OpenInNewTabInitiatorId | undefined);
export interface LinkifyURLOptions {
    allowPrivileged?: boolean;
    /**
     * {@link OpenInNewTabInitiatorIdOrProvider}
     */
    initiatorId?: OpenInNewTabInitiatorIdOrProvider;
    text?: string;
    className?: string;
    lineNumber?: number;
    columnNumber?: number;
    showColumnNumber?: boolean;
    preventClick?: boolean;
    maxLength?: number;
    tabStop?: boolean;
    bypassURLTrimming?: boolean;
    userMetric?: Host.UserMetrics.Action;
    jslogContext?: string;
    omitOrigin?: boolean;
    onRef?: (el: HTMLElement) => void;
    omitLineAndRenderColumnAsHex?: boolean;
}
export interface LinkifyOptions {
    allowPrivileged?: boolean;
    className?: string;
    columnNumber?: number;
    showColumnNumber?: boolean;
    tabStop?: boolean;
    userMetric?: Host.UserMetrics.Action;
    jslogContext?: string;
    omitOrigin?: boolean;
    /**
     * {@link LinkDisplayOptions.revealBreakpoint}
     */
    revealBreakpoint?: boolean;
    maxLength?: number;
    ignoreListManager?: Workspace.IgnoreListManager.IgnoreListManager;
}
/**
 * The filter function for the openResourceHandlers. Returns true if the `url`
 * should be considered for a particular handler. `specificSchemeHandlers`
 * is the set of all schemes handled by all registered DevTools extensions
 * (that specify a particular scheme).
 **/
export type LinkHandlerPredicate = (url: Platform.DevToolsPath.UrlString, specificSchemeHandlers: Set<string>) => boolean;
export type LinkHandler = (arg0: TextUtils.ContentProvider.ContentProvider | Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber?: number) => void;
export interface LinkHandlerRegistration {
    title: string;
    origin: Platform.DevToolsPath.UrlString;
    scheme?: string;
    handler: LinkHandler;
    shouldHandleOpenResource: LinkHandlerPredicate;
}
export declare const enum Events {
    LIVE_LOCATION_UPDATED = "liveLocationUpdated"
}
export interface EventTypes {
    [Events.LIVE_LOCATION_UPDATED]: Bindings.LiveLocation.LiveLocation;
}
export interface ScriptLocationViewInput {
    target?: SDK.Target.Target;
    scriptId?: Protocol.Runtime.ScriptId;
    sourceURL: Platform.DevToolsPath.UrlString;
    lineNumber?: number;
    options?: LinkifyOptions;
    linkifier: Linkifier;
}
export type ScriptLocationView = (input: ScriptLocationViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_SCRIPT_LOCATION_VIEW: ScriptLocationView;
export declare class ScriptLocationLink extends UI.Widget.Widget {
    #private;
    target?: SDK.Target.Target;
    scriptId?: Protocol.Runtime.ScriptId;
    sourceURL: Platform.DevToolsPath.UrlString;
    lineNumber?: number;
    options?: LinkifyOptions;
    linkifier: Linkifier;
    constructor(element: HTMLElement, view?: ScriptLocationView);
    performUpdate(): void;
    onDetach(): void;
}
export {};
