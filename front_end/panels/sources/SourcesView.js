// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
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
const { ref } = Directives;
const { widget, widgetRef } = UI.Widget;
export const DEFAULT_VIEW = (input, output, target) => {
    const renderNavigatorToggleButton = () => {
        const navHidden = !input.isNavigatorSidebarOpen;
        const title = navHidden ? i18nString(UIStrings.showNavigator) : i18nString(UIStrings.hideNavigator);
        // clang-format off
        return html `
      <devtools-button
        class="toolbar-button"
        title=${title}
        aria-label=${title}
        .iconName=${navHidden ? 'left-panel-open' : 'left-panel-close'}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
        jslog=${VisualLogging.toggleSubpane().track({ click: true }).context('navigator')}
        @click=${() => input.onToggleNavigatorSidebar?.()}
      ></devtools-button>`;
        // clang-format on
    };
    const renderDebuggerToggleButton = () => {
        const debuggerHidden = !input.isDebuggerSidebarOpen;
        const title = debuggerHidden ? i18nString(UIStrings.showDebugger) : i18nString(UIStrings.hideDebugger);
        const glyph = debuggerHidden ? (input.isVertical ? 'right-panel-open' : 'bottom-panel-open') :
            (input.isVertical ? 'right-panel-close' : 'bottom-panel-close');
        // clang-format off
        return html `
      <devtools-button
        class="toolbar-button"
        title=${title}
        aria-label=${title}
        .iconName=${glyph}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
        ?disabled=${!input.isDebuggerSidebarButtonEnabled}
        jslog=${VisualLogging.toggleSubpane().track({ click: true }).context('debugger')}
        @click=${() => input.onToggleDebuggerSidebar?.()}
      ></devtools-button>`;
        // clang-format on
    };
    const leftToolbarItems = !input.isInWrapper ? [renderNavigatorToggleButton()] : [];
    const rightToolbarItems = (!input.isInWrapper && !input.isTraceApp && input.isVertical) ? [renderDebuggerToggleButton()] : [];
    const bottomToolbarContent = (!input.isInWrapper && !input.isTraceApp && !input.isVertical) ? renderDebuggerToggleButton() : nothing;
    // clang-format off
    render(html `
    <style>${sourcesViewStyles}</style>
    <devtools-widget class="vbox flex-auto"
      ${widget(element => {
        const searchableView = new UI.SearchableView.SearchableView(input.searchProvider, input.replaceProvider, input.searchableViewId, element);
        searchableView.setMinimalSearchQuerySize(0);
        return searchableView;
    })}
      ${widgetRef(UI.SearchableView.SearchableView, e => { output.searchableView = e; })}
    >
      <devtools-widget class="vbox flex-auto ${input.breakpointsActive ? '' : 'breakpoints-deactivated'}"
        ${widget(TabbedEditorContainer, {
        historyManager: input.historyManager,
        previouslyViewedFilesSetting: input.previouslyViewedFilesSetting,
        leftToolbarItems,
        rightToolbarItems,
        uiSourceCodes: input.uiSourceCodes,
        onEditorSelected: input.onEditorSelected,
        onEditorClosed: input.onEditorClosed,
    })}
        ${widgetRef(TabbedEditorContainer, e => { output.editorContainer = e; })}>
      </devtools-widget>
    </devtools-widget>
    <div class="sources-toolbar" jslog=${VisualLogging.toolbar('bottom')}>
      <devtools-toolbar class="script-view-toolbar" style="flex: auto;" ${ref(el => {
        if (el && input.splitWidget) {
            input.splitWidget.toggleResizer(el, !input.isVertical && !input.isInWrapper);
        }
    })}>
        ${Array.isArray(input.scriptViewToolbarItems)
        ? input.scriptViewToolbarItems.map(item => item.element)
        : input.scriptViewToolbarItems}
      </devtools-toolbar>
      <devtools-toolbar class="bottom-toolbar">
        ${bottomToolbarContent}
      </devtools-toolbar>
    </div>`, target, {
        container: {
            attributes: {
                id: 'sources-panel-sources-view',
            },
        },
    });
    // clang-format on
};
const SourcesViewBase = Common.ObjectWrapper.eventMixin(UI.Widget.VBox);
export class SourcesView extends SourcesViewBase {
    #searchableView;
    editorContainer;
    #uiSourceCodes = new Set();
    historyManager;
    #scriptViewToolbarItems = [];
    toolbarChangedListener;
    searchView;
    searchConfig;
    #view;
    #onToggleNavigatorSidebar;
    #onToggleDebuggerSidebar;
    #isNavigatorSidebarOpen = false;
    #isDebuggerSidebarOpen = false;
    #isDebuggerSidebarButtonEnabled = true;
    #navigatorSidebarInitialized = false;
    #debuggerSidebarInitialized = false;
    #isVertical = false;
    #isInWrapper = true;
    #splitWidget;
    #breakpointsActive = true;
    #editorContainerPromise;
    #editorContainerResolve;
    previouslyViewedFilesSetting;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { jslog: `${VisualLogging.pane('editor').track({ keydown: 'Escape' })}` });
        this.#view = view;
        this.#editorContainerPromise = new Promise(resolve => {
            this.#editorContainerResolve = resolve;
        });
        this.setMinimumAndPreferredSizes(88, 52, 150, 100);
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        this.historyManager = new EditingLocationHistoryManager(this);
        this.toolbarChangedListener = null;
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
            isNavigatorSidebarOpen: this.#isNavigatorSidebarOpen,
            isDebuggerSidebarOpen: this.#isDebuggerSidebarOpen,
            isDebuggerSidebarButtonEnabled: this.#isDebuggerSidebarButtonEnabled,
            isVertical: this.#isVertical,
            isInWrapper: this.#isInWrapper,
            isTraceApp: Root.Runtime.Runtime.isTraceApp(),
            splitWidget: this.#splitWidget,
            onToggleNavigatorSidebar: this.#onToggleNavigatorSidebar,
            onToggleDebuggerSidebar: this.#onToggleDebuggerSidebar,
            breakpointsActive: this.#breakpointsActive,
            uiSourceCodes: new Set(this.#uiSourceCodes),
            historyManager: this.historyManager,
            previouslyViewedFilesSetting: this.previouslyViewedFilesSetting,
            onEditorSelected: this.editorSelected.bind(this),
            onEditorClosed: this.editorClosed.bind(this),
        };
        const that = this;
        const output = {
            set editorContainer(value) {
                that.setEditorContainer(value);
            },
            set searchableView(value) {
                that.#searchableView = value;
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
        this.editorContainer = editorContainer;
        if (this.editorContainer) {
            this.#editorContainerResolve(editorContainer);
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
        this.requestUpdate();
    }
    set onToggleDebuggerSidebar(callback) {
        this.#onToggleDebuggerSidebar = callback;
        this.requestUpdate();
    }
    set isNavigatorSidebarOpen(isOpen) {
        const isInitialized = this.#navigatorSidebarInitialized;
        this.#navigatorSidebarInitialized = true;
        if (this.#isNavigatorSidebarOpen === isOpen) {
            return;
        }
        this.#isNavigatorSidebarOpen = isOpen;
        this.requestUpdate();
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
        this.requestUpdate();
        if (isInitialized) {
            UI.ARIAUtils.LiveAnnouncer.alert(isOpen ? i18nString(UIStrings.debuggerShown) :
                i18nString(UIStrings.debuggerHidden));
        }
    }
    toggleDebuggerSidebarButtonEnabled(enabled) {
        this.#isDebuggerSidebarButtonEnabled = enabled;
        this.requestUpdate();
    }
    setLayoutMode(splitWidget, isVertical, isInWrapper) {
        this.#splitWidget = splitWidget;
        this.#isVertical = isVertical;
        this.#isInWrapper = isInWrapper;
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
        if (!this.#searchableView) {
            this.performUpdate();
        }
        return this.#searchableView;
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
        this.requestUpdate();
    }
    uiSourceCodeRemoved(event) {
        const uiSourceCode = event.data;
        this.removeUISourceCodes([uiSourceCode]);
    }
    removeUISourceCodes(uiSourceCodes) {
        uiSourceCodes.forEach(ui => this.#uiSourceCodes.delete(ui));
        for (let i = 0; i < uiSourceCodes.length; ++i) {
            this.historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
        }
        this.requestUpdate();
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
                this.#scriptViewToolbarItems = items;
                this.requestUpdate();
            });
        }
        else {
            this.#scriptViewToolbarItems = [];
            this.requestUpdate();
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
    viewForFile(uiSourceCode) {
        return this.editorContainer?.viewForFile(uiSourceCode);
    }
    getSourceView(uiSourceCode) {
        return this.editorContainer?.getCreatedSourceView(uiSourceCode);
    }
    editorClosed(uiSourceCode) {
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
        const previousSourceFrame = event.previousView instanceof UISourceCodeFrame ? event.previousView : null;
        if (previousSourceFrame) {
            previousSourceFrame.setSearchableView(null);
        }
        const currentSourceFrame = event.currentView instanceof UISourceCodeFrame ? event.currentView : null;
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
    toggleBreakpointsActiveState(active) {
        this.#breakpointsActive = active;
        this.requestUpdate();
    }
}
export var Events;
(function (Events) {
    Events["EDITOR_CLOSED"] = "EditorClosed";
    Events["EDITOR_SELECTED"] = "EditorSelected";
})(Events || (Events = {}));
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
//# sourceMappingURL=SourcesView.js.map