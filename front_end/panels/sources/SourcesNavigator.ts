/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Snippets from '../snippets/snippets.js';

import {type NavigatorUISourceCodeTreeNode, NavigatorView} from './NavigatorView.js';
import sourcesNavigatorStyles from './sourcesNavigator.css.js';

const UIStrings = {
  /**
   *@description Text to show if no workspaces are set up. https://goo.gle/devtools-workspace
   */
  noWorkspace: 'No workspaces set up',
  /**
   *@description Text to explain the Workspace feature in the Sources panel. https://goo.gle/devtools-workspace
   */
  explainWorkspace: 'Set up workspaces to sync edits directly to the sources you develop.',
  /**
   *@description Text to show if no local overrides are set up. https://goo.gle/devtools-overrides
   */
  noLocalOverrides: 'No local overrides set up',
  /**
   *@description Text to explain the Local Overrides feature. https://goo.gle/devtools-overrides
   */
  explainLocalOverrides: 'Override network requests and web content locally to mock remote resources.',
  /**
   *@description Tooltip text that appears when hovering over the largeicon clear button in the Sources Navigator of the Sources panel
   */
  clearConfiguration: 'Clear configuration',
  /**
   *@description Text in Sources Navigator of the Sources panel
   */
  selectFolderForOverrides: 'Select folder for overrides',
  /**
   *@description Text to show if no content scripts can be found in the Sources panel. https://developer.chrome.com/extensions/content_scripts
   */
  noContentScripts: 'No content scripts detected',
  /**
   *@description Text to explain the content scripts pane in the Sources panel
   */
  explainContentScripts: 'View content scripts served by extensions.',
  /**
   *@description Text to show if no snippets were created and saved in the Sources panel https://goo.gle/devtools-snippets
   */
  noSnippets: 'No snippets saved',
  /**
   *@description Text to explain the Snippets feature in the Sources panel https://goo.gle/devtools-snippets
   */
  explainSnippets: 'Save the JavaScript code you run often in a snippet to run it again anytime.',
  /**
   *@description Text in Sources Navigator of the Sources panel
   */
  newSnippet: 'New snippet',
  /**
   *@description Title of an action in the sources tool to create snippet
   */
  createNewSnippet: 'Create new snippet',
  /**
   *@description A context menu item in the Sources Navigator of the Sources panel
   */
  run: 'Run',
  /**
   *@description A context menu item in the Navigator View of the Sources panel
   */
  rename: 'Rename…',
  /**
   *@description Label for an item to remove something
   */
  remove: 'Remove',
  /**
   *@description Text to save content as a specific file type
   */
  saveAs: 'Save as...',
  /**
   * @description Text in Workspaces tab in the Sources panel when an automatic
   *              workspace folder is detected.
   * @example {/path/to/foo} PH1
   */
  automaticWorkspaceFolderDetected: 'Workspace folder {PH1} detected.',
  /**
   * @description Button description in Workspaces tab in the Sources panel
   *              to connect to an automatic workspace folder.
   */
  automaticWorkspaceFolderConnect: 'Connect...',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesNavigator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let networkNavigatorViewInstance: NetworkNavigatorView;

export class NetworkNavigatorView extends NavigatorView {
  private constructor() {
    super('navigator-network', true);
    this.registerRequiredCSS(sourcesNavigatorStyles);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.INSPECTED_URL_CHANGED, this.inspectedURLChanged, this);

    // Record the sources tool load time after the file navigator has loaded.
    Host.userMetrics.panelLoaded('sources', 'DevTools.Launch.Sources');
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): NetworkNavigatorView {
    const {forceNew} = opts;
    if (!networkNavigatorViewInstance || forceNew) {
      networkNavigatorViewInstance = new NetworkNavigatorView();
    }

    return networkNavigatorViewInstance;
  }

  override acceptProject(project: Workspace.Workspace.Project): boolean {
    return project.type() === Workspace.Workspace.projectTypes.Network &&
        SDK.TargetManager.TargetManager.instance().isInScope(
            Bindings.NetworkProject.NetworkProject.getTargetForProject(project));
  }

  onScopeChange(): void {
    for (const project of Workspace.Workspace.WorkspaceImpl.instance().projects()) {
      if (!this.acceptProject(project)) {
        this.removeProject(project);
      } else {
        this.tryAddProject(project);
      }
    }
  }

  private inspectedURLChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    const mainTarget = SDK.TargetManager.TargetManager.instance().scopeTarget();
    if (event.data !== mainTarget) {
      return;
    }
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL) {
      return;
    }
    for (const uiSourceCode of this.workspace().uiSourceCodes()) {
      if (this.acceptProject(uiSourceCode.project()) && uiSourceCode.url() === inspectedURL) {
        this.revealUISourceCode(uiSourceCode, true);
      }
    }
  }

  override uiSourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const mainTarget = SDK.TargetManager.TargetManager.instance().scopeTarget();
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
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
  #infobar: UI.Infobar.Infobar|null = null;
  #eventListeners: Common.EventTarget.EventDescriptor[] = [];

  constructor() {
    super('navigator-files');
    const placeholder =
        new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noWorkspace), i18nString(UIStrings.explainWorkspace));
    this.setPlaceholder(placeholder);
    placeholder.appendLink('https://goo.gle/devtools-workspace' as Platform.DevToolsPath.UrlString);

    const toolbar = document.createElement('devtools-toolbar');
    toolbar.classList.add('navigator-toolbar');
    void toolbar.appendItemsAtLocation('files-navigator-toolbar').then(() => {
      if (!toolbar.empty()) {
        this.contentElement.insertBefore(toolbar, this.contentElement.firstChild);
      }
    });
  }

  override wasShown(): void {
    super.wasShown();
    this.#eventListeners = [
      this.#automaticFileSystemManager.addEventListener(
          Persistence.AutomaticFileSystemManager.Events.AUTOMATIC_FILE_SYSTEM_CHANGED, this.#automaticFileSystemChanged,
          this),
    ];
    this.#automaticFileSystemChanged({data: this.#automaticFileSystemManager.automaticFileSystem});
  }

  override willHide(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.#automaticFileSystemChanged({data: null});
    super.willHide();
  }

  override sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.WorkspaceSourceSelected);
    super.sourceSelected(uiSourceCode, focusSource);
  }

  override acceptProject(project: Workspace.Workspace.Project): boolean {
    return project.type() === Workspace.Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides' &&
        !Snippets.ScriptSnippetFileSystem.isSnippetsProject(project);
  }

  override handleContextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendAction('sources.add-folder-to-workspace', undefined, true);
    void contextMenu.show();
  }

  #automaticFileSystemChanged(
      event: Common.EventTarget.EventTargetEvent<Persistence.AutomaticFileSystemManager.AutomaticFileSystem|null>):
      void {
    const automaticFileSystem = event.data;
    if (automaticFileSystem === null || automaticFileSystem.state !== 'disconnected') {
      this.#infobar?.dispose();
      this.#infobar = null;
    } else {
      this.#infobar = UI.Infobar.Infobar.create(
          UI.Infobar.Type.INFO,
          i18nString(UIStrings.automaticWorkspaceFolderDetected, {PH1: automaticFileSystem.root}),
          [{
            text: i18nString(UIStrings.automaticWorkspaceFolderConnect),
            highlight: true,
            delegate: () => this.#automaticFileSystemManager.connectAutomaticFileSystem(/* addIfMissing= */ true),
            dismiss: true,
            jslogContext: 'automatic-workspace-folders.connect',
          }],
          Common.Settings.Settings.instance().moduleSetting('persistence-automatic-workspace-folders'),
          'automatic-workspace-folders',
      );
      if (this.#infobar) {
        this.contentElement.append(this.#infobar.element);
      }
    }
  }
}

let overridesNavigatorViewInstance: OverridesNavigatorView;

export class OverridesNavigatorView extends NavigatorView {
  private readonly toolbar: UI.Toolbar.Toolbar;
  private constructor() {
    super('navigator-overrides');
    const placeholder = new UI.EmptyWidget.EmptyWidget(
        i18nString(UIStrings.noLocalOverrides), i18nString(UIStrings.explainLocalOverrides));
    this.setPlaceholder(placeholder);
    placeholder.appendLink('https://goo.gle/devtools-overrides' as Platform.DevToolsPath.UrlString);

    this.toolbar = document.createElement('devtools-toolbar');
    this.toolbar.classList.add('navigator-toolbar');

    this.contentElement.insertBefore(this.toolbar, this.contentElement.firstChild);

    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener(
        Persistence.NetworkPersistenceManager.Events.PROJECT_CHANGED, this.updateProjectAndUI, this);
    this.workspace().addEventListener(Workspace.Workspace.Events.ProjectAdded, this.onProjectAddOrRemoved, this);
    this.workspace().addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.onProjectAddOrRemoved, this);
    this.updateProjectAndUI();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): OverridesNavigatorView {
    const {forceNew} = opts;
    if (!overridesNavigatorViewInstance || forceNew) {
      overridesNavigatorViewInstance = new OverridesNavigatorView();
    }

    return overridesNavigatorViewInstance;
  }

  private onProjectAddOrRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.Project>): void {
    const project = event.data;
    if (project && project.type() === Workspace.Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides') {
      return;
    }
    this.updateUI();
  }

  private updateProjectAndUI(): void {
    this.reset();
    const project = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
    if (project) {
      this.tryAddProject(project);
    }
    this.updateUI();
  }

  private updateUI(): void {
    this.toolbar.removeToolbarItems();
    const project = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
    if (project) {
      const enableCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
          Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled'));
      this.toolbar.appendToolbarItem(enableCheckbox);

      this.toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator(true));
      const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearConfiguration), 'clear');
      clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
        Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').set(false);
        project.remove();
      });
      this.toolbar.appendToolbarItem(clearButton);
      return;
    }
    const title = i18nString(UIStrings.selectFolderForOverrides);
    const setupButton = new UI.Toolbar.ToolbarButton(title, 'plus', title);
    setupButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, _event => {
      void this.setupNewWorkspace();
    }, this);
    this.toolbar.appendToolbarItem(setupButton);
  }

  async setupNewWorkspace(): Promise<void> {
    const fileSystem =
        await Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem('overrides');
    if (!fileSystem) {
      return;
    }
    Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').set(true);
  }

  override sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverridesSourceSelected);
    super.sourceSelected(uiSourceCode, focusSource);
  }

  override acceptProject(project: Workspace.Workspace.Project): boolean {
    return project === Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
  }
}

export class ContentScriptsNavigatorView extends NavigatorView {
  constructor() {
    super('navigator-content-scripts');
    const placeholder = new UI.EmptyWidget.EmptyWidget(
        i18nString(UIStrings.noContentScripts), i18nString(UIStrings.explainContentScripts));
    this.setPlaceholder(placeholder);
    placeholder.appendLink(
        'https://developer.chrome.com/extensions/content_scripts' as Platform.DevToolsPath.UrlString);
  }

  override acceptProject(project: Workspace.Workspace.Project): boolean {
    return project.type() === Workspace.Workspace.projectTypes.ContentScripts;
  }
}

export class SnippetsNavigatorView extends NavigatorView {
  constructor() {
    super('navigator-snippets');
    const placeholder = new UI.EmptyWidget.EmptyWidget(UIStrings.noSnippets, UIStrings.explainSnippets);
    this.setPlaceholder(placeholder);
    placeholder.appendLink('https://goo.gle/devtools-snippets' as Platform.DevToolsPath.UrlString);

    const toolbar = document.createElement('devtools-toolbar');
    toolbar.classList.add('navigator-toolbar');
    const newButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.newSnippet), 'plus', i18nString(UIStrings.newSnippet), 'sources.new-snippet');
    newButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, _event => {
      void this.create(
          Snippets.ScriptSnippetFileSystem.findSnippetsProject(), '' as Platform.DevToolsPath.EncodedPathString);
    });
    toolbar.appendToolbarItem(newButton);
    this.contentElement.insertBefore(toolbar, this.contentElement.firstChild);
  }

  override acceptProject(project: Workspace.Workspace.Project): boolean {
    return Snippets.ScriptSnippetFileSystem.isSnippetsProject(project);
  }

  override handleContextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(
        i18nString(UIStrings.createNewSnippet),
        () => this.create(
            Snippets.ScriptSnippetFileSystem.findSnippetsProject(), '' as Platform.DevToolsPath.EncodedPathString),
        {jslogContext: 'create-new-snippet'});
    void contextMenu.show();
  }

  override handleFileContextMenu(event: Event, node: NavigatorUISourceCodeTreeNode): void {
    const uiSourceCode = node.uiSourceCode();
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(
        i18nString(UIStrings.run), () => Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode),
        {jslogContext: 'run'});
    contextMenu.editSection().appendItem(
        i18nString(UIStrings.rename), () => this.rename(node, false), {jslogContext: 'rename'});
    contextMenu.editSection().appendItem(
        i18nString(UIStrings.remove), () => uiSourceCode.project().deleteFile(uiSourceCode), {jslogContext: 'remove'});
    contextMenu.saveSection().appendItem(
        i18nString(UIStrings.saveAs), this.handleSaveAs.bind(this, uiSourceCode), {jslogContext: 'save-as'});
    void contextMenu.show();
  }

  private async handleSaveAs(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    uiSourceCode.commitWorkingCopy();
    const {content} = await uiSourceCode.requestContent();
    await Workspace.FileManager.FileManager.instance().save(
        this.addJSExtension(uiSourceCode.url()), content || '', true, false /* isBase64 */);
    Workspace.FileManager.FileManager.instance().close(uiSourceCode.url());
  }

  private addJSExtension(url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    return Common.ParsedURL.ParsedURL.concatenate(url, '.js');
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
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
