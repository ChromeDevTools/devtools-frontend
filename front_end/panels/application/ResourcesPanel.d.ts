import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ApplicationPanelSidebar } from './ApplicationPanelSidebar.js';
import type { DOMStorage } from './DOMStorageModel.js';
import type { ExtensionStorage } from './ExtensionStorageModel.js';
import type * as PreloadingHelper from './preloading/helper/helper.js';
export declare class ResourcesPanel extends UI.Panel.PanelWithSidebar {
    private readonly resourcesLastSelectedItemSetting;
    visibleView: UI.Widget.Widget | null;
    private pendingViewPromise;
    private categoryView;
    storageViews: HTMLElement;
    private readonly storageViewToolbar;
    private domStorageView;
    private extensionStorageView;
    private cookieView;
    private readonly sidebar;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): ResourcesPanel;
    private static shouldCloseOnReset;
    static showAndGetSidebar(): Promise<ApplicationPanelSidebar>;
    focus(): void;
    lastSelectedItemPath(): Platform.DevToolsPath.UrlString[];
    setLastSelectedItemPath(path: Platform.DevToolsPath.UrlString[]): void;
    resetView(): void;
    showView(view: UI.Widget.Widget | null): void;
    scheduleShowView(viewPromise: Promise<UI.Widget.Widget>): Promise<UI.Widget.Widget | null>;
    showCategoryView(categoryName: string, categoryHeadline: string, categoryDescription: string, categoryLink: Platform.DevToolsPath.UrlString | null): void;
    showDOMStorage(domStorage: DOMStorage): void;
    showExtensionStorage(extensionStorage: ExtensionStorage): void;
    showCookies(cookieFrameTarget: SDK.Target.Target, cookieDomain: string): void;
    clearCookies(target: SDK.Target.Target, cookieDomain: string): void;
}
export declare class ResourceRevealer implements Common.Revealer.Revealer<SDK.Resource.Resource> {
    reveal(resource: SDK.Resource.Resource): Promise<void>;
}
export declare class FrameDetailsRevealer implements Common.Revealer.Revealer<SDK.ResourceTreeModel.ResourceTreeFrame> {
    reveal(frame: SDK.ResourceTreeModel.ResourceTreeFrame): Promise<void>;
}
export declare class RuleSetViewRevealer implements Common.Revealer.Revealer<PreloadingHelper.PreloadingForward.RuleSetView> {
    reveal(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): Promise<void>;
}
export declare class AttemptViewWithFilterRevealer implements Common.Revealer.Revealer<PreloadingHelper.PreloadingForward.AttemptViewWithFilter> {
    reveal(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): Promise<void>;
}
