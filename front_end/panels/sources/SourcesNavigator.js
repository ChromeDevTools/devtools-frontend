// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';
import { NavigatorView } from './NavigatorView.js';
import sourcesNavigatorStyles from './sourcesNavigator.css.js';
const { html, render, Directives: { ref } } = Lit;
const { urlString } = Platform.DevToolsPath;
const { bindToAction, bindToSetting } = UI.UIUtils;
const { widget } = UI.Widget;
const UIStrings = {
    /**
     * @description Text to show if no workspaces are set up. Learn more at https://goo.gle/devtools-workspace.
     */
    noWorkspace: 'No workspaces set up',
    /**
     * @description Text to explain the workspace feature in the Sources panel. Learn more at https://goo.gle/devtools-workspace.
     */
    explainWorkspace: 'Set up workspaces to sync edits directly to the sources you develop',
    /**
     * @description Button in the Workspace tab of the Sources panel, used to
     *              (manually) add a folder to the workspace.
     */
    addFolderManually: 'Add folder manually',
    /**
     * @description Text to show if no local overrides are set up. Learn more at https://goo.gle/devtools-overrides.
     */
    noLocalOverrides: 'No local overrides set up',
    /**
     * @description Title of a setting under the Persistence category in Settings.
     */
    localOverrides: 'Local overrides',
    /**
     * @description Text to explain the local overrides feature. Learn more at https://goo.gle/devtools-overrides.
     */
    explainLocalOverrides: 'Override network requests and web content locally to mock remote resources',
    /**
     * @description Tooltip text that appears when hovering over the clear button in the Sources navigator of the Sources panel.
     */
    clearConfiguration: 'Clear configuration',
    /**
     * @description Text in Sources navigator of the Sources panel.
     */
    selectFolderForOverrides: 'Select folder for overrides',
    /**
     * @description Text to show if no content scripts can be found in the Sources panel. Learn more at https://developer.chrome.com/extensions/content_scripts.
     */
    noContentScripts: 'No content scripts detected',
    /**
     * @description Text to explain the content scripts sidebar in the Sources panel.
     */
    explainContentScripts: 'View content scripts served by extensions',
    /**
     * @description Text to show if no snippets were created and saved in the Sources panel. Learn more at https://goo.gle/devtools-snippets.
     */
    noSnippets: 'No snippets saved',
    /**
     * @description Text to explain the snippets feature in the Sources panel. Learn more at https://goo.gle/devtools-snippets.
     */
    explainSnippets: 'Save the JavaScript code you run often in a snippet to run it again anytime',
    /**
     * @description Text in Sources navigator of the Sources panel.
     */
    newSnippet: 'New snippet',
    /**
     * @description Title of an action in the sources tool to create a snippet.
     */
    createNewSnippet: 'Create new snippet',
    /**
     * @description Message shown in the Workspace tab of the Sources panel to nudge
     *              developers into utilizing the Automatic Workspace Folders feature
     *              in Chrome DevTools by setting up a com.chrome.devtools.json
     *              file or endpoint in their project. This nudge is only shown when
     *              the feature is enabled and there's no automatic workspace folder
     *              detected.
     * @example {com.chrome.devtools.json} PH1
     */
    automaticWorkspaceNudge: 'Use {PH1} to automatically connect your project folder',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesNavigator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let networkNavigatorViewInstance;
export class SourcesNavigatorView extends UI.Widget.VBox {
    viewOutput = {};
    projectFilter = this.acceptProject.bind(this);
    constructor(element) {
        super(element);
        this.requestUpdate();
    }
    get navigatorView() {
        return this.viewOutput.navigatorView?.getWidget();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    revealUISourceCode(uiSourceCode, select) {
        this.navigatorView?.revealUISourceCode(uiSourceCode, select);
    }
}
export const NETWORK_NAVIGATOR_DEFAULT_VIEW = (input, output, target) => {
    // We cannot use `widgetRef` here because `Lit.Directives.ref` runs while the
    // template is still in a detached `DocumentFragment` before `render` inserts
    // it into `target`, which prevents `NavigatorView`'s `INJECT` lookup from
    // finding the `Universe` in the DOM. Instead, pass out the `WidgetElement`
    // via `ref` and read `getWidget()` when accessed.
    // clang-format off
    render(html `
        <style>${sourcesNavigatorStyles}</style>
        <devtools-widget
          jslog=${VisualLogging.pane('navigator-network').track({ resize: true })}
          @ui-source-code-added=${(e) => input.onUISourceCodeAdded(e.detail)}
          ${widget(NavigatorView, {
        enableAuthoredGrouping: true,
        projectFilter: input.projectFilter,
    })}
          ${ref(e => {
        if (e instanceof UI.Widget.WidgetElement) {
            output.navigatorView = e;
        }
    })}
        ></devtools-widget>
      `, target);
    // clang-format on
};
export class NetworkNavigatorView extends SourcesNavigatorView {
    #view;
    constructor(element, view = NETWORK_NAVIGATOR_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        SDK.TargetManager.TargetManager.instance().addEventListener("InspectedURLChanged" /* SDK.TargetManager.Events.INSPECTED_URL_CHANGED */, this.#inspectedURLChanged, this);
        // Record the sources tool load time after the file navigator has loaded.
        UI.UIUserMetrics.UIUserMetrics.instance().panelLoaded('sources', 'DevTools.Launch.Sources');
        SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!networkNavigatorViewInstance || forceNew) {
            networkNavigatorViewInstance = new NetworkNavigatorView();
        }
        return networkNavigatorViewInstance;
    }
    async performUpdate() {
        this.#view({
            projectFilter: this.projectFilter,
            onUISourceCodeAdded: this.uiSourceCodeAdded.bind(this),
        }, this.viewOutput, this.contentElement);
        await this.navigatorView?.updateComplete;
    }
    acceptProject(project) {
        return project.type() === Workspace.Workspace.projectTypes.Network &&
            SDK.TargetManager.TargetManager.instance().isInScope(Bindings.NetworkProject.NetworkProject.getTargetForProject(project));
    }
    onScopeChange() {
        const navigatorView = this.navigatorView;
        if (!navigatorView) {
            return;
        }
        for (const project of Workspace.Workspace.WorkspaceImpl.instance().projects()) {
            if (!this.acceptProject(project)) {
                navigatorView.removeProject(project);
            }
            else {
                navigatorView.tryAddProject(project);
            }
        }
    }
    #inspectedURLChanged(event) {
        const mainTarget = SDK.TargetManager.TargetManager.instance().scopeTarget();
        if (event.data !== mainTarget) {
            return;
        }
        const inspectedURL = mainTarget?.inspectedURL();
        if (!inspectedURL) {
            return;
        }
        for (const uiSourceCode of Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes()) {
            if (this.acceptProject(uiSourceCode.project()) && uiSourceCode.url() === inspectedURL) {
                this.revealUISourceCode(uiSourceCode, true);
            }
        }
    }
    uiSourceCodeAdded(uiSourceCode) {
        const mainTarget = SDK.TargetManager.TargetManager.instance().scopeTarget();
        const inspectedURL = mainTarget?.inspectedURL();
        if (!inspectedURL) {
            return;
        }
        if (uiSourceCode.url() === inspectedURL) {
            this.revealUISourceCode(uiSourceCode, true);
        }
    }
}
export const FILES_NAVIGATOR_DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
        <style>${sourcesNavigatorStyles}</style>
        <devtools-widget
          jslog=${VisualLogging.pane('navigator-files').track({ resize: true })}
          @contextmenu=${input.onContextMenu}
          @source-selected=${input.onSourceSelected}
          ${widget(NavigatorView, {
        projectFilter: input.projectFilter,
    })}
          ${ref(e => {
        if (e instanceof UI.Widget.WidgetElement) {
            output.navigatorView = e;
        }
    })}
        >
          <devtools-toolbar class="navigator-toolbar" slot="header">
            <devtools-button
              class="toolbar-button"
              .iconName=${'plus'}
              .variant=${"text" /* Buttons.Button.Variant.TEXT */}
              .reducedFocusRing=${true}
              ${bindToAction('sources.add-folder-to-workspace')}
            >${i18nString(UIStrings.addFolderManually)}</devtools-button>
          </devtools-toolbar>
          <span class="automatic-file-system-nudge" slot="header" ?hidden=${!input.showAutomaticFileSystemNudge}>
            ${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.automaticWorkspaceNudge, { PH1: html `<devtools-link href="https://goo.gle/devtools-automatic-workspace-folders">com.chrome.devtools.json</devtools-link>` })}
          </span>
          <devtools-widget
            slot="placeholder"
            ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noWorkspace),
        text: i18nString(UIStrings.explainWorkspace),
        link: 'https://developer.chrome.com/docs/devtools/workspaces/',
    })}
          ></devtools-widget>
        </devtools-widget>
      `, target);
    // clang-format on
};
export class FilesNavigatorView extends SourcesNavigatorView {
    #view;
    #automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
    #eventListeners = [];
    constructor(element, view = FILES_NAVIGATOR_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.#eventListeners = [
            this.#automaticFileSystemManager.addEventListener("AutomaticFileSystemChanged" /* Persistence.AutomaticFileSystemManager.Events.AUTOMATIC_FILE_SYSTEM_CHANGED */, this.requestUpdate, this),
            this.#automaticFileSystemManager.addEventListener("AvailabilityChanged" /* Persistence.AutomaticFileSystemManager.Events.AVAILABILITY_CHANGED */, this.requestUpdate, this),
        ];
    }
    willHide() {
        Common.EventTarget.removeEventListeners(this.#eventListeners);
        super.willHide();
    }
    async performUpdate() {
        const { automaticFileSystem, availability } = this.#automaticFileSystemManager;
        this.#view({
            projectFilter: this.projectFilter,
            showAutomaticFileSystemNudge: automaticFileSystem === null && availability === 'available',
            onContextMenu: this.handleContextMenu.bind(this),
            onSourceSelected: this.sourceSelected.bind(this),
        }, this.viewOutput, this.contentElement);
        await this.navigatorView?.updateComplete;
    }
    sourceSelected() {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.WorkspaceSourceSelected);
    }
    acceptProject(project) {
        if (project.type() === Workspace.Workspace.projectTypes.ConnectableFileSystem) {
            return true;
        }
        return project.type() === Workspace.Workspace.projectTypes.FileSystem &&
            Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides' &&
            !Snippets.ScriptSnippetFileSystem.isSnippetsProject(project);
    }
    handleContextMenu(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.defaultSection().appendAction('sources.add-folder-to-workspace', undefined, true);
        void contextMenu.show();
    }
}
export const OVERRIDES_NAVIGATOR_DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
        <style>${sourcesNavigatorStyles}</style>
        <devtools-widget
          jslog=${VisualLogging.pane('navigator-overrides').track({ resize: true })}
          @source-selected=${input.onSourceSelected}
          ${widget(NavigatorView, {
        projectFilter: input.projectFilter,
    })}
          ${ref(e => {
        if (e instanceof UI.Widget.WidgetElement) {
            output.navigatorView = e;
        }
    })}
        >
          <devtools-toolbar class="navigator-toolbar" slot="header">
            ${input.hasProject ? html `
              <devtools-checkbox
                ${bindToSetting(Common.Settings.Settings.instance().resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor))}
              >${i18nString(UIStrings.localOverrides)}</devtools-checkbox>
              <div class="toolbar-spacer"></div>
              <devtools-button
                class="toolbar-button"
                title=${i18nString(UIStrings.clearConfiguration)}
                aria-label=${i18nString(UIStrings.clearConfiguration)}
                .iconName=${'clear'}
                .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                @click=${input.onClearConfiguration}
              ></devtools-button>
            ` : html `
              <devtools-button
                class="toolbar-button"
                title=${i18nString(UIStrings.selectFolderForOverrides)}
                aria-label=${i18nString(UIStrings.selectFolderForOverrides)}
                .iconName=${'plus'}
                .variant=${"text" /* Buttons.Button.Variant.TEXT */}
                .reducedFocusRing=${true}
                @click=${input.onSetupNewWorkspace}
              >${i18nString(UIStrings.selectFolderForOverrides)}</devtools-button>
            `}
          </devtools-toolbar>
          <devtools-widget
            slot="placeholder"
            ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noLocalOverrides),
        text: i18nString(UIStrings.explainLocalOverrides),
        link: 'https://developer.chrome.com/docs/devtools/overrides/',
    })}
          ></devtools-widget>
        </devtools-widget>
      `, target);
    // clang-format on
};
let overridesNavigatorViewInstance;
export class OverridesNavigatorView extends SourcesNavigatorView {
    #view;
    constructor(element, view = OVERRIDES_NAVIGATOR_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("ProjectChanged" /* Persistence.NetworkPersistenceManager.Events.PROJECT_CHANGED */, this.#updateProjectAndUI, this);
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("LocalOverridesProjectUpdated" /* Persistence.NetworkPersistenceManager.Events.LOCAL_OVERRIDES_PROJECT_UPDATED */, this.#updateProjectAndUI, this);
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAddOrRemoved, this);
        workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#onProjectAddOrRemoved, this);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!overridesNavigatorViewInstance || forceNew) {
            overridesNavigatorViewInstance = new OverridesNavigatorView();
        }
        return overridesNavigatorViewInstance;
    }
    async performUpdate() {
        const project = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
        this.#view({
            projectFilter: this.projectFilter,
            hasProject: Boolean(project),
            onSetupNewWorkspace: () => {
                void OverridesNavigatorView.setupNewWorkspace();
            },
            onClearConfiguration: () => {
                if (!project) {
                    return;
                }
                Common.Settings.Settings.instance()
                    .resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor)
                    .set(false);
                project.remove();
            },
            onSourceSelected: this.sourceSelected.bind(this),
        }, this.viewOutput, this.contentElement);
        await this.navigatorView?.updateComplete;
    }
    #onProjectAddOrRemoved(event) {
        const project = event.data;
        if (project && project.type() === Workspace.Workspace.projectTypes.FileSystem &&
            Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides') {
            return;
        }
        this.requestUpdate();
    }
    #updateProjectAndUI() {
        const navigatorView = this.navigatorView;
        if (navigatorView) {
            navigatorView.reset();
            const project = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
            if (project) {
                navigatorView.tryAddProject(project);
            }
        }
        this.requestUpdate();
    }
    static async setupNewWorkspace() {
        const fileSystem = await Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem('overrides');
        if (!fileSystem) {
            return;
        }
        Common.Settings.Settings.instance()
            .resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor)
            .set(true);
    }
    sourceSelected() {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverridesSourceSelected);
    }
    acceptProject(project) {
        return project === Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
    }
}
export const CONTENT_SCRIPTS_NAVIGATOR_DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
        <style>${sourcesNavigatorStyles}</style>
        <devtools-widget
          jslog=${VisualLogging.pane('navigator-content-scripts').track({ resize: true })}
          ${widget(NavigatorView, {
        projectFilter: input.projectFilter,
    })}
          ${ref(e => {
        if (e instanceof UI.Widget.WidgetElement) {
            output.navigatorView = e;
        }
    })}
        >
          <devtools-widget
            slot="placeholder"
            ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noContentScripts),
        text: i18nString(UIStrings.explainContentScripts),
        link: urlString `https://developer.chrome.com/extensions/content_scripts`,
    })}
          ></devtools-widget>
        </devtools-widget>
      `, target);
    // clang-format on
};
export class ContentScriptsNavigatorView extends SourcesNavigatorView {
    #view;
    constructor(element, view = CONTENT_SCRIPTS_NAVIGATOR_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    async performUpdate() {
        this.#view({
            projectFilter: this.projectFilter,
        }, this.viewOutput, this.contentElement);
        await this.navigatorView?.updateComplete;
    }
    acceptProject(project) {
        return project.type() === Workspace.Workspace.projectTypes.ContentScripts;
    }
}
export const SNIPPETS_NAVIGATOR_DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
        <style>${sourcesNavigatorStyles}</style>
        <devtools-widget
          jslog=${VisualLogging.pane('navigator-snippets').track({ resize: true })}
          @contextmenu=${input.onContextMenu}
          ${widget(NavigatorView, {
        projectFilter: input.projectFilter,
    })}
          ${ref(e => {
        if (e instanceof UI.Widget.WidgetElement) {
            output.navigatorView = e;
        }
    })}
        >
          <devtools-toolbar class="navigator-toolbar" slot="header">
            <devtools-button
              class="toolbar-button"
              title=${i18nString(UIStrings.newSnippet)}
              aria-label=${i18nString(UIStrings.newSnippet)}
              .iconName=${'plus'}
              .variant=${"text" /* Buttons.Button.Variant.TEXT */}
              .reducedFocusRing=${true}
              .jslogContext=${'sources.new-snippet'}
              @click=${input.onNewSnippet}
            >${i18nString(UIStrings.newSnippet)}</devtools-button>
          </devtools-toolbar>
          <devtools-widget
            slot="placeholder"
            ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noSnippets),
        text: i18nString(UIStrings.explainSnippets),
        link: 'https://developer.chrome.com/docs/devtools/javascript/snippets/',
    })}
          ></devtools-widget>
        </devtools-widget>
      `, target);
    // clang-format on
};
export class SnippetsNavigatorView extends SourcesNavigatorView {
    #view;
    constructor(element, view = SNIPPETS_NAVIGATOR_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    performUpdate() {
        this.#view({
            projectFilter: this.projectFilter,
            onNewSnippet: () => {
                void this.navigatorView?.create(Snippets.ScriptSnippetFileSystem.findSnippetsProject(), '');
            },
            onContextMenu: this.handleContextMenu.bind(this),
        }, this.viewOutput, this.contentElement);
    }
    acceptProject(project) {
        return Snippets.ScriptSnippetFileSystem.isSnippetsProject(project);
    }
    handleContextMenu(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.headerSection().appendItem(i18nString(UIStrings.createNewSnippet), () => this.navigatorView?.create(Snippets.ScriptSnippetFileSystem.findSnippetsProject(), ''), { jslogContext: 'create-new-snippet' });
        void contextMenu.show();
    }
}
export class ActionDelegate {
    handleAction(_context, actionId) {
        switch (actionId) {
            case 'sources.create-snippet':
                void Snippets.ScriptSnippetFileSystem.findSnippetsProject()
                    .createFile(Platform.DevToolsPath.EmptyEncodedPathString, null, '')
                    .then(uiSourceCode => Common.Revealer.reveal(uiSourceCode));
                return true;
            case 'sources.add-folder-to-workspace':
                void Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
                return true;
        }
        return false;
    }
}
//# sourceMappingURL=SourcesNavigator.js.map