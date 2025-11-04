// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Snippets from '../snippets/snippets.js';
import { NavigatorView } from './NavigatorView.js';
import sourcesNavigatorStyles from './sourcesNavigator.css.js';
const UIStrings = {
    /**
     * @description Text to show if no workspaces are set up. https://goo.gle/devtools-workspace
     */
    noWorkspace: 'No workspaces set up',
    /**
     * @description Text to explain the Workspace feature in the Sources panel. https://goo.gle/devtools-workspace
     */
    explainWorkspace: 'Set up workspaces to sync edits directly to the sources you develop.',
    /**
     * @description Text to show if no local overrides are set up. https://goo.gle/devtools-overrides
     */
    noLocalOverrides: 'No local overrides set up',
    /**
     * @description Text to explain the Local Overrides feature. https://goo.gle/devtools-overrides
     */
    explainLocalOverrides: 'Override network requests and web content locally to mock remote resources.',
    /**
     * @description Tooltip text that appears when hovering over the largeicon clear button in the Sources Navigator of the Sources panel
     */
    clearConfiguration: 'Clear configuration',
    /**
     * @description Text in Sources Navigator of the Sources panel
     */
    selectFolderForOverrides: 'Select folder for overrides',
    /**
     * @description Text to show if no content scripts can be found in the Sources panel. https://developer.chrome.com/extensions/content_scripts
     */
    noContentScripts: 'No content scripts detected',
    /**
     * @description Text to explain the content scripts pane in the Sources panel
     */
    explainContentScripts: 'View content scripts served by extensions.',
    /**
     * @description Text to show if no snippets were created and saved in the Sources panel https://goo.gle/devtools-snippets
     */
    noSnippets: 'No snippets saved',
    /**
     * @description Text to explain the Snippets feature in the Sources panel https://goo.gle/devtools-snippets
     */
    explainSnippets: 'Save the JavaScript code you run often in a snippet to run it again anytime.',
    /**
     * @description Text in Sources Navigator of the Sources panel
     */
    newSnippet: 'New snippet',
    /**
     * @description Title of an action in the sources tool to create snippet
     */
    createNewSnippet: 'Create new snippet',
    /**
     * @description A context menu item in the Sources Navigator of the Sources panel
     */
    run: 'Run',
    /**
     * @description A context menu item in the Navigator View of the Sources panel
     */
    rename: 'Rename…',
    /**
     * @description Label for an item to remove something
     */
    remove: 'Remove',
    /**
     * @description Text to save content as a specific file type
     */
    saveAs: 'Save as…',
    /**
     * @description An error message logged to the Console panel when the user uses
     *              the "Save as…" context menu in the Sources panel and the operation
     *              fails.
     */
    saveAsFailed: 'Failed to save file to disk.',
    /**
     * @description Message shown in the Workspace tab of the Sources panel to nudge
     *              developers into utilizing the Automatic Workspace Folders feature
     *              in Chrome DevTools by setting up a `com.chrome.devtools.json`
     *              file / endpoint in their project. This nudge is only shown when
     *              the feature is enabled and there's no automatic workspace folder
     *              detected.
     * @example {com.chrome.devtools.json} PH1
     */
    automaticWorkspaceNudge: 'Use {PH1} to automatically connect your project folder',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesNavigator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let networkNavigatorViewInstance;
export class NetworkNavigatorView extends NavigatorView {
    constructor() {
        super('navigator-network', true);
        this.registerRequiredCSS(sourcesNavigatorStyles);
        SDK.TargetManager.TargetManager.instance().addEventListener("InspectedURLChanged" /* SDK.TargetManager.Events.INSPECTED_URL_CHANGED */, this.inspectedURLChanged, this);
        // Record the sources tool load time after the file navigator has loaded.
        Host.userMetrics.panelLoaded('sources', 'DevTools.Launch.Sources');
        SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!networkNavigatorViewInstance || forceNew) {
            networkNavigatorViewInstance = new NetworkNavigatorView();
        }
        return networkNavigatorViewInstance;
    }
    acceptProject(project) {
        return project.type() === Workspace.Workspace.projectTypes.Network &&
            SDK.TargetManager.TargetManager.instance().isInScope(Bindings.NetworkProject.NetworkProject.getTargetForProject(project));
    }
    onScopeChange() {
        for (const project of Workspace.Workspace.WorkspaceImpl.instance().projects()) {
            if (!this.acceptProject(project)) {
                this.removeProject(project);
            }
            else {
                this.tryAddProject(project);
            }
        }
    }
    inspectedURLChanged(event) {
        const mainTarget = SDK.TargetManager.TargetManager.instance().scopeTarget();
        if (event.data !== mainTarget) {
            return;
        }
        const inspectedURL = mainTarget?.inspectedURL();
        if (!inspectedURL) {
            return;
        }
        for (const uiSourceCode of this.workspace().uiSourceCodes()) {
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
export class FilesNavigatorView extends NavigatorView {
    #automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
    #eventListeners = [];
    #automaticFileSystemNudge;
    constructor() {
        super('navigator-files');
        this.registerRequiredCSS(sourcesNavigatorStyles);
        const placeholder = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noWorkspace), i18nString(UIStrings.explainWorkspace));
        this.setPlaceholder(placeholder);
        placeholder.link = 'https://developer.chrome.com/docs/devtools/workspaces/';
        const link = UI.XLink.XLink.create('https://goo.gle/devtools-automatic-workspace-folders', 'com.chrome.devtools.json');
        this.#automaticFileSystemNudge =
            uiI18n.getFormatLocalizedString(str_, UIStrings.automaticWorkspaceNudge, { PH1: link });
        this.#automaticFileSystemNudge.classList.add('automatic-file-system-nudge');
        this.contentElement.insertBefore(this.#automaticFileSystemNudge, this.contentElement.firstChild);
        const toolbar = document.createElement('devtools-toolbar');
        toolbar.classList.add('navigator-toolbar');
        void toolbar.appendItemsAtLocation('files-navigator-toolbar').then(() => {
            if (!toolbar.empty()) {
                this.contentElement.insertBefore(toolbar, this.contentElement.firstChild);
            }
        });
    }
    wasShown() {
        super.wasShown();
        this.#eventListeners = [
            this.#automaticFileSystemManager.addEventListener("AutomaticFileSystemChanged" /* Persistence.AutomaticFileSystemManager.Events.AUTOMATIC_FILE_SYSTEM_CHANGED */, this.#automaticFileSystemChanged, this),
            this.#automaticFileSystemManager.addEventListener("AvailabilityChanged" /* Persistence.AutomaticFileSystemManager.Events.AVAILABILITY_CHANGED */, this.#availabilityChanged, this),
        ];
        this.#automaticFileSystemChanged({ data: this.#automaticFileSystemManager.automaticFileSystem });
    }
    willHide() {
        Common.EventTarget.removeEventListeners(this.#eventListeners);
        this.#automaticFileSystemChanged({ data: null });
        super.willHide();
    }
    sourceSelected(uiSourceCode, focusSource) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.WorkspaceSourceSelected);
        super.sourceSelected(uiSourceCode, focusSource);
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
    #automaticFileSystemChanged(_event) {
        this.#availabilityChanged({ data: this.#automaticFileSystemManager.availability });
    }
    #availabilityChanged(event) {
        const availability = event.data;
        const { automaticFileSystem } = this.#automaticFileSystemManager;
        this.#automaticFileSystemNudge.hidden = automaticFileSystem !== null || availability !== 'available';
    }
}
let overridesNavigatorViewInstance;
export class OverridesNavigatorView extends NavigatorView {
    toolbar;
    constructor() {
        super('navigator-overrides');
        const placeholder = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noLocalOverrides), i18nString(UIStrings.explainLocalOverrides));
        this.setPlaceholder(placeholder);
        placeholder.link = 'https://developer.chrome.com/docs/devtools/overrides/';
        this.toolbar = document.createElement('devtools-toolbar');
        this.toolbar.classList.add('navigator-toolbar');
        this.contentElement.insertBefore(this.toolbar, this.contentElement.firstChild);
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("ProjectChanged" /* Persistence.NetworkPersistenceManager.Events.PROJECT_CHANGED */, this.updateProjectAndUI, this);
        this.workspace().addEventListener(Workspace.Workspace.Events.ProjectAdded, this.onProjectAddOrRemoved, this);
        this.workspace().addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.onProjectAddOrRemoved, this);
        this.updateProjectAndUI();
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!overridesNavigatorViewInstance || forceNew) {
            overridesNavigatorViewInstance = new OverridesNavigatorView();
        }
        return overridesNavigatorViewInstance;
    }
    onProjectAddOrRemoved(event) {
        const project = event.data;
        if (project && project.type() === Workspace.Workspace.projectTypes.FileSystem &&
            Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides') {
            return;
        }
        this.updateUI();
    }
    updateProjectAndUI() {
        this.reset();
        const project = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
        if (project) {
            this.tryAddProject(project);
        }
        this.updateUI();
    }
    updateUI() {
        this.toolbar.removeToolbarItems();
        const project = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
        if (project) {
            const enableCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled'));
            this.toolbar.appendToolbarItem(enableCheckbox);
            this.toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator(true));
            const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearConfiguration), 'clear');
            clearButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, () => {
                Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').set(false);
                project.remove();
            });
            this.toolbar.appendToolbarItem(clearButton);
            return;
        }
        const title = i18nString(UIStrings.selectFolderForOverrides);
        const setupButton = new UI.Toolbar.ToolbarButton(title, 'plus', title);
        setupButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, _event => {
            void this.setupNewWorkspace();
        }, this);
        this.toolbar.appendToolbarItem(setupButton);
    }
    async setupNewWorkspace() {
        const fileSystem = await Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem('overrides');
        if (!fileSystem) {
            return;
        }
        Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').set(true);
    }
    sourceSelected(uiSourceCode, focusSource) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverridesSourceSelected);
        super.sourceSelected(uiSourceCode, focusSource);
    }
    acceptProject(project) {
        return project === Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
    }
}
export class ContentScriptsNavigatorView extends NavigatorView {
    constructor() {
        super('navigator-content-scripts');
        const placeholder = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noContentScripts), i18nString(UIStrings.explainContentScripts));
        this.setPlaceholder(placeholder);
        placeholder.link = 'https://developer.chrome.com/extensions/content_scripts';
    }
    acceptProject(project) {
        return project.type() === Workspace.Workspace.projectTypes.ContentScripts;
    }
}
export class SnippetsNavigatorView extends NavigatorView {
    constructor() {
        super('navigator-snippets');
        const placeholder = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noSnippets), i18nString(UIStrings.explainSnippets));
        this.setPlaceholder(placeholder);
        placeholder.link =
            'https://developer.chrome.com/docs/devtools/javascript/snippets/';
        const toolbar = document.createElement('devtools-toolbar');
        toolbar.classList.add('navigator-toolbar');
        const newButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.newSnippet), 'plus', i18nString(UIStrings.newSnippet), 'sources.new-snippet');
        newButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, _event => {
            void this.create(Snippets.ScriptSnippetFileSystem.findSnippetsProject(), '');
        });
        toolbar.appendToolbarItem(newButton);
        this.contentElement.insertBefore(toolbar, this.contentElement.firstChild);
    }
    acceptProject(project) {
        return Snippets.ScriptSnippetFileSystem.isSnippetsProject(project);
    }
    handleContextMenu(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.headerSection().appendItem(i18nString(UIStrings.createNewSnippet), () => this.create(Snippets.ScriptSnippetFileSystem.findSnippetsProject(), ''), { jslogContext: 'create-new-snippet' });
        void contextMenu.show();
    }
    handleFileContextMenu(event, node) {
        const uiSourceCode = node.uiSourceCode();
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.headerSection().appendItem(i18nString(UIStrings.run), () => Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode), { jslogContext: 'run' });
        contextMenu.editSection().appendItem(i18nString(UIStrings.rename), () => this.rename(node, false), { jslogContext: 'rename' });
        contextMenu.editSection().appendItem(i18nString(UIStrings.remove), () => uiSourceCode.project().deleteFile(uiSourceCode), { jslogContext: 'remove' });
        contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), this.handleSaveAs.bind(this, uiSourceCode), { jslogContext: 'save-as' });
        void contextMenu.show();
    }
    async handleSaveAs(uiSourceCode) {
        uiSourceCode.commitWorkingCopy();
        const contentData = await uiSourceCode.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(contentData)) {
            console.error(`Failed to retrieve content for ${uiSourceCode.url()}: ${contentData}`);
            Common.Console.Console.instance().error(i18nString(UIStrings.saveAsFailed), /* show=*/ false);
            return;
        }
        await Workspace.FileManager.FileManager.instance().save(this.addJSExtension(uiSourceCode.url()), contentData, /* forceSaveAs=*/ true);
        Workspace.FileManager.FileManager.instance().close(uiSourceCode.url());
    }
    addJSExtension(url) {
        return Common.ParsedURL.ParsedURL.concatenate(url, '.js');
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