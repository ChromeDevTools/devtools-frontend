// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Components from './components/components.js';
import { EditingLocationHistoryManager } from './EditingLocationHistoryManager.js';
import sourcesViewStyles from './sourcesView.css.js';
import { TabbedEditorContainer, } from './TabbedEditorContainer.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
const UIStrings = {
    /**
     * @description Tooltip for the navigator toggle in the Sources panel. Command to open or show the
     * sidebar containing the navigator tool.
     */
    showNavigator: 'Show navigator',
    /**
     * @description Tooltip for the navigator toggle in the Sources panel. Command to close or hide
     * the sidebar containing the navigator tool.
     */
    hideNavigator: 'Hide navigator',
    /**
     * @description Screen reader announcement when the navigator sidebar is shown in the Sources panel.
     */
    navigatorShown: 'Navigator sidebar shown',
    /**
     * @description Screen reader announcement when the navigator sidebar is hidden in the Sources panel.
     */
    navigatorHidden: 'Navigator sidebar hidden',
    /**
     * @description Screen reader announcement when the debugger sidebar is shown in the Sources panel.
     */
    debuggerShown: 'Debugger sidebar shown',
    /**
     * @description Screen reader announcement when the debugger sidebar is hidden in the Sources panel.
     */
    debuggerHidden: 'Debugger sidebar hidden',
    /**
     * @description Tooltip for the debugger toggle in the Sources panel. Command to open or show the
     * sidebar containing the debugger tool.
     */
    showDebugger: 'Show debugger',
    /**
     * @description Tooltip for the debugger toggle in the Sources panel. Command to close or hide the
     * sidebar containing the debugger tool.
     */
    hideDebugger: 'Hide debugger',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { widget, widgetRef } = UI.Widget;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
    <devtools-widget class="vbox flex-auto" ${widget(input.searchableViewFactory)}>
      <devtools-widget class="vbox flex-auto"
        ${widget(TabbedEditorContainer, { delegate: input.delegate, previouslyViewedFilesSetting: input.previouslyViewedFilesSetting })}
        ${widgetRef(TabbedEditorContainer, e => { output.editorContainer = e; })}>
      </devtools-widget>
    </devtools-widget>
    <div class="sources-toolbar" jslog=${VisualLogging.toolbar('bottom')}>
      <devtools-toolbar class="script-view-toolbar" style="flex: auto;" ${Directives.ref(el => { output.scriptViewToolbar = el; })}>
        ${input.scriptViewToolbarItems.map(item => item.element)}
      </devtools-toolbar>
      <devtools-toolbar class="bottom-toolbar">
        ${input.bottomToolbarItems.map(item => item.element)}
      </devtools-toolbar>
    </div>`, target);
    // clang-format on
};
export class SourcesView extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    #searchableView;
    sourceViewByUISourceCode;
    editorContainer;
    #uiSourceCodes = new Set();
    historyManager;
    #scriptViewToolbar;
    #scriptViewToolbarItems = [];
    #bottomToolbarItems = [];
    toolbarChangedListener;
    searchView;
    searchConfig;
    #view = DEFAULT_VIEW;
    #toggleNavigatorSidebarButton;
    #toggleDebuggerSidebarButton;
    #onToggleNavigatorSidebar;
    #onToggleDebuggerSidebar;
    #isNavigatorSidebarOpen = false;
    #isDebuggerSidebarOpen = false;
    #navigatorSidebarInitialized = false;
    #debuggerSidebarInitialized = false;
    #isVertical = false;
    #leftToolbarItems;
    #rightToolbarItems;
    #breakpointsActive;
    #editorContainerPromise;
    #editorContainerResolve;
    previouslyViewedFilesSetting;
    constructor() {
        super({ jslog: `${VisualLogging.pane('editor').track({ keydown: 'Escape' })}` });
        this.#editorContainerPromise = new Promise(resolve => {
            this.#editorContainerResolve = resolve;
        });
        this.registerRequiredCSS(sourcesViewStyles);
        this.element.id = 'sources-panel-sources-view';
        this.setMinimumAndPreferredSizes(88, 52, 150, 100);
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        this.sourceViewByUISourceCode = new Map();
        this.historyManager = new EditingLocationHistoryManager(this);
        this.toolbarChangedListener = null;
        this.#toggleNavigatorSidebarButton =
            new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showNavigator), 'left-panel-open');
        this.#toggleNavigatorSidebarButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, () => {
            this.#onToggleNavigatorSidebar?.();
        });
        this.#toggleNavigatorSidebarButton.element.setAttribute('jslog', `${VisualLogging.toggleSubpane().track({ click: true }).context('navigator')}`);
        this.#toggleDebuggerSidebarButton =
            new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showDebugger), 'right-panel-open');
        this.#toggleDebuggerSidebarButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, () => {
            this.#onToggleDebuggerSidebar?.();
        });
        this.#toggleDebuggerSidebarButton.element.setAttribute('jslog', `${VisualLogging.toggleSubpane().track({ click: true }).context('debugger')}`);
        this.previouslyViewedFilesSetting =
            Common.Settings.Settings.instance().createLocalSetting('previously-viewed-files', []);
        this.requestUpdate();
        UI.UIUtils.startBatchUpdate();
        workspace.uiSourceCodes().forEach(ui => this.addUISourceCode(ui));
        UI.UIUtils.endBatchUpdate();
        workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
        workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
        workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved.bind(this), this);
        SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.#onScopeChange.bind(this));
        function handleBeforeUnload(event) {
            if (event.returnValue) {
                return;
            }
            const unsavedSourceCodes = [];
            const projects = Workspace.Workspace.WorkspaceImpl.instance().projectsForType(Workspace.Workspace.projectTypes.FileSystem);
            for (const project of projects) {
                for (const uiSourceCode of project.uiSourceCodes()) {
                    if (uiSourceCode.isDirty()) {
                        unsavedSourceCodes.push(uiSourceCode);
                    }
                }
            }
            if (!unsavedSourceCodes.length) {
                return;
            }
            event.returnValue = true;
            void UI.ViewManager.ViewManager.instance().showView('sources');
            for (const sourceCode of unsavedSourceCodes) {
                void Common.Revealer.reveal(sourceCode);
            }
        }
        if (!window.opener) {
            window.addEventListener('beforeunload', handleBeforeUnload, true);
        }
    }
    performUpdate() {
        const input = {
            searchProvider: this,
            replaceProvider: this,
            searchableViewId: 'sources-view-search-config',
            scriptViewToolbarItems: this.#scriptViewToolbarItems,
            bottomToolbarItems: this.#bottomToolbarItems,
            searchableViewFactory: this.#searchableViewFactory,
            delegate: this,
            previouslyViewedFilesSetting: this.previouslyViewedFilesSetting,
        };
        const that = this;
        const output = {
            set scriptViewToolbar(value) {
                that.#scriptViewToolbar = value;
            },
            set editorContainer(value) {
                that.setEditorContainer(value);
            },
        };
        this.#view(input, output, this.element);
    }
    onDetach() {
        super.onDetach();
        this.editorContainer?.detachEditors();
    }
    setEditorContainer(editorContainer) {
        if (this.editorContainer === editorContainer) {
            return;
        }
        if (this.editorContainer) {
            this.editorContainer.removeEventListener("EditorSelected" /* TabbedEditorContainerEvents.EDITOR_SELECTED */, this.editorSelected, this);
            this.editorContainer.removeEventListener("EditorClosed" /* TabbedEditorContainerEvents.EDITOR_CLOSED */, this.editorClosed, this);
        }
        this.editorContainer = editorContainer;
        if (this.editorContainer) {
            if (this.#leftToolbarItems) {
                this.editorContainer.leftToolbar().removeToolbarItems();
                for (const item of this.#leftToolbarItems) {
                    this.editorContainer.leftToolbar().appendToolbarItem(item);
                }
            }
            if (this.#rightToolbarItems) {
                this.editorContainer.rightToolbar().removeToolbarItems();
                for (const item of this.#rightToolbarItems) {
                    this.editorContainer.rightToolbar().appendToolbarItem(item);
                }
            }
            if (this.#breakpointsActive !== undefined) {
                this.editorContainer.element.classList.toggle('breakpoints-deactivated', !this.#breakpointsActive);
            }
            this.#editorContainerResolve(editorContainer);
            this.editorContainer.addEventListener("EditorSelected" /* TabbedEditorContainerEvents.EDITOR_SELECTED */, this.editorSelected, this);
            this.editorContainer.addEventListener("EditorClosed" /* TabbedEditorContainerEvents.EDITOR_CLOSED */, this.editorClosed, this);
            UI.UIUtils.startBatchUpdate();
            for (const uiSourceCode of this.#uiSourceCodes) {
                this.editorContainer.addUISourceCode(uiSourceCode);
            }
            UI.UIUtils.endBatchUpdate();
        }
    }
    static defaultUISourceCodeScores() {
        const defaultScores = new Map();
        const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
        if (sourcesView) {
            const uiSourceCodes = sourcesView.editorContainer?.historyUISourceCodes() ?? [];
            for (let i = 1; i < uiSourceCodes.length; ++i) // Skip current element
             {
                defaultScores.set(uiSourceCodes[i], uiSourceCodes.length - i);
            }
        }
        return defaultScores;
    }
    set onToggleNavigatorSidebar(callback) {
        this.#onToggleNavigatorSidebar = callback;
    }
    set onToggleDebuggerSidebar(callback) {
        this.#onToggleDebuggerSidebar = callback;
    }
    set isNavigatorSidebarOpen(isOpen) {
        const isInitialized = this.#navigatorSidebarInitialized;
        this.#navigatorSidebarInitialized = true;
        if (this.#isNavigatorSidebarOpen === isOpen) {
            return;
        }
        this.#isNavigatorSidebarOpen = isOpen;
        this.#updateNavigatorSidebarButton();
        if (isInitialized) {
            UI.ARIAUtils.LiveAnnouncer.alert(isOpen ? i18nString(UIStrings.navigatorShown) :
                i18nString(UIStrings.navigatorHidden));
        }
    }
    set isDebuggerSidebarOpen(isOpen) {
        const isInitialized = this.#debuggerSidebarInitialized;
        this.#debuggerSidebarInitialized = true;
        if (this.#isDebuggerSidebarOpen === isOpen) {
            return;
        }
        this.#isDebuggerSidebarOpen = isOpen;
        this.#updateDebuggerSidebarButton();
        if (isInitialized) {
            UI.ARIAUtils.LiveAnnouncer.alert(isOpen ? i18nString(UIStrings.debuggerShown) :
                i18nString(UIStrings.debuggerHidden));
        }
    }
    #updateNavigatorSidebarButton() {
        const navHidden = !this.#isNavigatorSidebarOpen;
        this.#toggleNavigatorSidebarButton.setGlyph(navHidden ? 'left-panel-open' : 'left-panel-close');
        this.#toggleNavigatorSidebarButton.setTitle(navHidden ? i18nString(UIStrings.showNavigator) :
            i18nString(UIStrings.hideNavigator));
    }
    #updateDebuggerSidebarButton() {
        const debuggerHidden = !this.#isDebuggerSidebarOpen;
        const debuggerGlyph = debuggerHidden ? (this.#isVertical ? 'right-panel-open' : 'bottom-panel-open') :
            (this.#isVertical ? 'right-panel-close' : 'bottom-panel-close');
        this.#toggleDebuggerSidebarButton.setGlyph(debuggerGlyph);
        this.#toggleDebuggerSidebarButton.setTitle(debuggerHidden ? i18nString(UIStrings.showDebugger) :
            i18nString(UIStrings.hideDebugger));
    }
    toggleDebuggerSidebarButtonEnabled(enabled) {
        this.#toggleDebuggerSidebarButton.setEnabled(enabled);
    }
    setLayoutMode(splitWidget, isVertical, isInWrapper) {
        this.#bottomToolbarItems = [];
        if (isVertical || isInWrapper) {
            if (this.#scriptViewToolbar) {
                splitWidget.uninstallResizer(this.#scriptViewToolbar);
            }
        }
        else if (this.#scriptViewToolbar) {
            splitWidget.installResizer(this.#scriptViewToolbar);
        }
        this.#isVertical = isVertical;
        this.#updateNavigatorSidebarButton();
        this.#updateDebuggerSidebarButton();
        const leftItems = [];
        const rightItems = [];
        if (!isInWrapper) {
            leftItems.push(this.#toggleNavigatorSidebarButton);
            if (!Root.Runtime.Runtime.isTraceApp()) {
                if (isVertical) {
                    rightItems.push(this.#toggleDebuggerSidebarButton);
                }
                else {
                    this.#bottomToolbarItems.push(this.#toggleDebuggerSidebarButton);
                }
            }
        }
        this.#leftToolbarItems = leftItems;
        this.#rightToolbarItems = rightItems;
        if (this.editorContainer) {
            const editorContainer = this.editorContainer;
            editorContainer.leftToolbar().removeToolbarItems();
            leftItems.forEach(item => editorContainer.leftToolbar().appendToolbarItem(item));
            editorContainer.rightToolbar().removeToolbarItems();
            rightItems.forEach(item => editorContainer.rightToolbar().appendToolbarItem(item));
        }
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        UI.Context.Context.instance().setFlavor(SourcesView, this);
    }
    willHide() {
        UI.Context.Context.instance().setFlavor(SourcesView, null);
        super.willHide();
    }
    searchableView() {
        return this.#searchableViewFactory();
    }
    visibleView() {
        return (this.editorContainer?.visibleView ?? null);
    }
    currentSourceFrame() {
        const view = this.visibleView();
        if (!(view instanceof UISourceCodeFrame)) {
            return null;
        }
        return (view);
    }
    currentUISourceCode() {
        return this.editorContainer?.currentFile() ?? null;
    }
    onCloseEditorTab() {
        const uiSourceCode = this.editorContainer?.currentFile();
        if (!uiSourceCode) {
            return false;
        }
        this.editorContainer?.closeFile(uiSourceCode);
        return true;
    }
    onJumpToPreviousLocation() {
        this.historyManager.rollback();
    }
    onJumpToNextLocation() {
        this.historyManager.rollover();
    }
    #onScopeChange() {
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        for (const uiSourceCode of workspace.uiSourceCodes()) {
            if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Network) {
                continue;
            }
            const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
            if (SDK.TargetManager.TargetManager.instance().isInScope(target)) {
                this.addUISourceCode(uiSourceCode);
            }
            else {
                this.removeUISourceCodes([uiSourceCode]);
            }
        }
    }
    uiSourceCodeAdded(event) {
        const uiSourceCode = event.data;
        this.addUISourceCode(uiSourceCode);
    }
    addUISourceCode(uiSourceCode) {
        const project = uiSourceCode.project();
        if (project.isServiceProject()) {
            return;
        }
        switch (project.type()) {
            case Workspace.Workspace.projectTypes.FileSystem: {
                if (Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) === 'overrides') {
                    return;
                }
                break;
            }
            case Workspace.Workspace.projectTypes.Network: {
                const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
                if (!SDK.TargetManager.TargetManager.instance().isInScope(target)) {
                    return;
                }
            }
        }
        this.#uiSourceCodes.add(uiSourceCode);
        this.editorContainer?.addUISourceCode(uiSourceCode);
    }
    uiSourceCodeRemoved(event) {
        const uiSourceCode = event.data;
        this.removeUISourceCodes([uiSourceCode]);
    }
    removeUISourceCodes(uiSourceCodes) {
        uiSourceCodes.forEach(ui => this.#uiSourceCodes.delete(ui));
        this.editorContainer?.removeUISourceCodes(uiSourceCodes);
        for (let i = 0; i < uiSourceCodes.length; ++i) {
            this.removeSourceFrame(uiSourceCodes[i]);
            this.historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
        }
    }
    projectRemoved(event) {
        const project = event.data;
        const uiSourceCodes = project.uiSourceCodes();
        this.removeUISourceCodes([...uiSourceCodes]);
    }
    updateScriptViewToolbarItems() {
        const view = this.visibleView();
        if (view instanceof UI.View.SimpleView) {
            void view.toolbarItems().then(items => {
                if (Array.isArray(items)) {
                    this.#scriptViewToolbarItems = items;
                }
                else {
                    const wrapper = document.createElement('div');
                    wrapper.style.display = 'contents';
                    // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
                    render(items, wrapper);
                    this.#scriptViewToolbarItems = [new UI.Toolbar.ToolbarItem(wrapper)];
                }
                this.requestUpdate();
            });
        }
    }
    async showSourceLocation(uiSourceCode, location, omitFocus, omitHighlight) {
        if (!this.editorContainer) {
            await this.#editorContainerPromise;
        }
        const currentFrame = this.currentSourceFrame();
        if (currentFrame) {
            this.historyManager.updateCurrentState(currentFrame.uiSourceCode(), currentFrame.textEditor.state.selection.main.head);
        }
        this.editorContainer?.showFile(uiSourceCode);
        const currentSourceFrame = this.currentSourceFrame();
        if (currentSourceFrame && location) {
            currentSourceFrame.revealPosition(location, !omitHighlight);
        }
        const visibleView = this.visibleView();
        if (!omitFocus && visibleView) {
            visibleView.focus();
        }
    }
    createSourceView(uiSourceCode) {
        let sourceView;
        const contentType = uiSourceCode.contentType();
        if (contentType === Common.ResourceType.resourceTypes.Image || uiSourceCode.mimeType().startsWith('image/')) {
            sourceView = new SourceFrame.ImageView.ImageView(uiSourceCode.mimeType(), uiSourceCode);
        }
        else if (contentType === Common.ResourceType.resourceTypes.Font || uiSourceCode.mimeType().includes('font')) {
            sourceView = new SourceFrame.FontView.FontView(uiSourceCode.mimeType(), uiSourceCode);
        }
        else if (uiSourceCode.name() === HEADER_OVERRIDES_FILENAME) {
            sourceView = new Components.HeadersView.HeadersView(uiSourceCode);
        }
        else {
            sourceView = new UISourceCodeFrame(uiSourceCode);
            this.historyManager.trackSourceFrameCursorJumps(sourceView);
        }
        uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
        this.sourceViewByUISourceCode.set(uiSourceCode, sourceView);
        return sourceView;
    }
    #sourceViewTypeForWidget(widget) {
        if (widget instanceof SourceFrame.ImageView.ImageView) {
            return "ImageView" /* SourceViewType.IMAGE_VIEW */;
        }
        if (widget instanceof SourceFrame.FontView.FontView) {
            return "FontView" /* SourceViewType.FONT_VIEW */;
        }
        if (widget instanceof Components.HeadersView.HeadersView) {
            return "HeadersView" /* SourceViewType.HEADERS_VIEW */;
        }
        return "SourceView" /* SourceViewType.SOURCE_VIEW */;
    }
    #sourceViewTypeForUISourceCode(uiSourceCode) {
        if (uiSourceCode.name() === HEADER_OVERRIDES_FILENAME) {
            return "HeadersView" /* SourceViewType.HEADERS_VIEW */;
        }
        const contentType = uiSourceCode.contentType();
        switch (contentType) {
            case Common.ResourceType.resourceTypes.Image:
                return "ImageView" /* SourceViewType.IMAGE_VIEW */;
            case Common.ResourceType.resourceTypes.Font:
                return "FontView" /* SourceViewType.FONT_VIEW */;
            default:
                return "SourceView" /* SourceViewType.SOURCE_VIEW */;
        }
    }
    #uiSourceCodeTitleChanged(event) {
        const uiSourceCode = event.data;
        const widget = this.sourceViewByUISourceCode.get(uiSourceCode);
        if (widget) {
            if (this.#sourceViewTypeForWidget(widget) !== this.#sourceViewTypeForUISourceCode(uiSourceCode)) {
                // Remove the existing editor tab and create a new one of the correct type.
                this.removeUISourceCodes([uiSourceCode]);
                this.#uiSourceCodes.add(uiSourceCode);
                void this.showSourceLocation(uiSourceCode);
            }
        }
    }
    getSourceView(uiSourceCode) {
        return this.sourceViewByUISourceCode.get(uiSourceCode);
    }
    getOrCreateSourceView(uiSourceCode) {
        return this.sourceViewByUISourceCode.get(uiSourceCode) || this.createSourceView(uiSourceCode);
    }
    recycleUISourceCodeFrame(sourceFrame, uiSourceCode) {
        sourceFrame.uiSourceCode().removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
        this.sourceViewByUISourceCode.delete(sourceFrame.uiSourceCode());
        sourceFrame.setUISourceCode(uiSourceCode);
        this.sourceViewByUISourceCode.set(uiSourceCode, sourceFrame);
        uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
    }
    viewForFile(uiSourceCode) {
        return this.getOrCreateSourceView(uiSourceCode);
    }
    removeSourceFrame(uiSourceCode) {
        const sourceView = this.sourceViewByUISourceCode.get(uiSourceCode);
        this.sourceViewByUISourceCode.delete(uiSourceCode);
        if (sourceView && sourceView instanceof UISourceCodeFrame) {
            (sourceView).dispose();
        }
        uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
    }
    editorClosed(event) {
        const uiSourceCode = event.data;
        this.historyManager.removeHistoryForSourceCode(uiSourceCode);
        let wasSelected = false;
        if (!this.editorContainer?.currentFile()) {
            wasSelected = true;
        }
        // SourcesNavigator does not need to update on EditorClosed.
        this.removeToolbarChangedListener();
        this.updateScriptViewToolbarItems();
        this.searchableView().resetSearch();
        const data = {
            uiSourceCode,
            wasSelected,
        };
        this.dispatchEventToListeners("EditorClosed" /* Events.EDITOR_CLOSED */, data);
    }
    editorSelected(event) {
        const previousSourceFrame = event.data.previousView instanceof UISourceCodeFrame ? event.data.previousView : null;
        if (previousSourceFrame) {
            previousSourceFrame.setSearchableView(null);
        }
        const currentSourceFrame = event.data.currentView instanceof UISourceCodeFrame ? event.data.currentView : null;
        if (currentSourceFrame) {
            currentSourceFrame.setSearchableView(this.searchableView());
        }
        this.searchableView().setReplaceable(Boolean(currentSourceFrame?.canEditSource()));
        this.searchableView().refreshSearch();
        this.updateToolbarChangedListener();
        this.updateScriptViewToolbarItems();
        const currentFile = this.editorContainer?.currentFile();
        if (currentFile) {
            this.dispatchEventToListeners("EditorSelected" /* Events.EDITOR_SELECTED */, currentFile);
        }
    }
    removeToolbarChangedListener() {
        if (this.toolbarChangedListener) {
            Common.EventTarget.removeEventListeners([this.toolbarChangedListener]);
        }
        this.toolbarChangedListener = null;
    }
    updateToolbarChangedListener() {
        this.removeToolbarChangedListener();
        const sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            return;
        }
        this.toolbarChangedListener = sourceFrame.addEventListener("ToolbarItemsChanged" /* UISourceCodeFrameEvents.TOOLBAR_ITEMS_CHANGED */, this.updateScriptViewToolbarItems, this);
    }
    onSearchCanceled() {
        if (this.searchView) {
            this.searchView.onSearchCanceled();
        }
        delete this.searchView;
        delete this.searchConfig;
    }
    performSearch(searchConfig, shouldJump, jumpBackwards) {
        const sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            return;
        }
        this.searchView = sourceFrame;
        this.searchConfig = searchConfig;
        this.searchView.performSearch(this.searchConfig, shouldJump, jumpBackwards);
    }
    jumpToNextSearchResult() {
        if (!this.searchView) {
            return;
        }
        if (this.searchConfig && this.searchView !== this.currentSourceFrame()) {
            this.performSearch(this.searchConfig, true);
            return;
        }
        this.searchView.jumpToNextSearchResult();
    }
    jumpToPreviousSearchResult() {
        if (!this.searchView) {
            return;
        }
        if (this.searchConfig && this.searchView !== this.currentSourceFrame()) {
            this.performSearch(this.searchConfig, true);
            if (this.searchView) {
                this.searchView.jumpToLastSearchResult();
            }
            return;
        }
        this.searchView.jumpToPreviousSearchResult();
    }
    supportsCaseSensitiveSearch() {
        return true;
    }
    supportsWholeWordSearch() {
        return true;
    }
    supportsRegexSearch() {
        return true;
    }
    replaceSelectionWith(searchConfig, replacement) {
        const sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            console.assert(Boolean(sourceFrame));
            return;
        }
        sourceFrame.replaceSelectionWith(searchConfig, replacement);
    }
    replaceAllWith(searchConfig, replacement) {
        const sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            console.assert(Boolean(sourceFrame));
            return;
        }
        sourceFrame.replaceAllWith(searchConfig, replacement);
    }
    showOutlineQuickOpen() {
        QuickOpen.QuickOpen.QuickOpenImpl.show('@');
    }
    showGoToLineQuickOpen() {
        if (this.editorContainer?.currentFile()) {
            QuickOpen.QuickOpen.QuickOpenImpl.show(':');
        }
    }
    save() {
        this.saveSourceFrame(this.currentSourceFrame());
    }
    saveAll() {
        const sourceFrames = this.editorContainer?.fileViews() ?? [];
        sourceFrames.forEach(this.saveSourceFrame.bind(this));
    }
    saveSourceFrame(sourceFrame) {
        if (!(sourceFrame instanceof UISourceCodeFrame)) {
            return;
        }
        const uiSourceCodeFrame = sourceFrame;
        uiSourceCodeFrame.commitEditing();
    }
    #searchableViewFactory = () => {
        if (!this.#searchableView) {
            this.#searchableView = new UI.SearchableView.SearchableView(this, this, 'sources.search-sources-tab');
            this.#searchableView.setMinimalSearchQuerySize(0);
        }
        return this.#searchableView;
    };
    toggleBreakpointsActiveState(active) {
        this.#breakpointsActive = active;
        this.editorContainer?.element.classList.toggle('breakpoints-deactivated', !active);
        this.requestUpdate();
    }
}
export class SwitchFileActionDelegate {
    static nextFile(currentUISourceCode) {
        function fileNamePrefix(name) {
            const lastDotIndex = name.lastIndexOf('.');
            const namePrefix = name.substr(0, lastDotIndex !== -1 ? lastDotIndex : name.length);
            return namePrefix.toLowerCase();
        }
        const candidates = [];
        const url = currentUISourceCode.parentURL();
        const name = currentUISourceCode.name();
        const namePrefix = fileNamePrefix(name);
        for (const uiSourceCode of currentUISourceCode.project().uiSourceCodes()) {
            if (url !== uiSourceCode.parentURL()) {
                continue;
            }
            if (fileNamePrefix(uiSourceCode.name()) === namePrefix) {
                candidates.push(uiSourceCode.name());
            }
        }
        candidates.sort(Platform.StringUtilities.naturalOrderComparator);
        const index = Platform.NumberUtilities.mod(candidates.indexOf(name) + 1, candidates.length);
        const fullURL = Common.ParsedURL.ParsedURL.concatenate((url ? Common.ParsedURL.ParsedURL.concatenate(url, '/') : ''), candidates[index]);
        const nextUISourceCode = currentUISourceCode.project().uiSourceCodeForURL(fullURL);
        return nextUISourceCode !== currentUISourceCode ? nextUISourceCode : null;
    }
    handleAction(context, _actionId) {
        const sourcesView = context.flavor(SourcesView);
        if (!sourcesView) {
            return false;
        }
        const currentUISourceCode = sourcesView.currentUISourceCode();
        if (!currentUISourceCode) {
            return false;
        }
        const nextUISourceCode = SwitchFileActionDelegate.nextFile(currentUISourceCode);
        if (!nextUISourceCode) {
            return false;
        }
        void sourcesView.showSourceLocation(nextUISourceCode);
        return true;
    }
}
export class ActionDelegate {
    handleAction(context, actionId) {
        const sourcesView = context.flavor(SourcesView);
        if (!sourcesView) {
            return false;
        }
        switch (actionId) {
            case 'sources.close-all':
                sourcesView.editorContainer?.closeAllFiles();
                return true;
            case 'sources.jump-to-previous-location':
                sourcesView.onJumpToPreviousLocation();
                return true;
            case 'sources.jump-to-next-location':
                sourcesView.onJumpToNextLocation();
                return true;
            case 'sources.next-editor-tab':
                sourcesView.editorContainer?.selectNextTab();
                return true;
            case 'sources.previous-editor-tab':
                sourcesView.editorContainer?.selectPrevTab();
                return true;
            case 'sources.close-editor-tab':
                return sourcesView.onCloseEditorTab();
            case 'sources.go-to-line':
                sourcesView.showGoToLineQuickOpen();
                return true;
            case 'sources.go-to-member':
                sourcesView.showOutlineQuickOpen();
                return true;
            case 'sources.save':
                sourcesView.save();
                return true;
            case 'sources.save-all':
                sourcesView.saveAll();
                return true;
        }
        return false;
    }
}
const HEADER_OVERRIDES_FILENAME = '.headers';
//# sourceMappingURL=SourcesView.js.map