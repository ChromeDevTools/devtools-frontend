// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/spinners/spinners.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { CustomDirectives, Directive, Directives, html, nothing, render, } from '../../ui/lit/lit.js';
import * as SettingsUI from '../../ui/settings/settings.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';
import { PanelUtils } from '../utils/utils.js';
import navigatorTreeStyles from './navigatorTree.css.js';
import navigatorViewStyles from './navigatorView.css.js';
import { SearchSources } from './SearchSourcesView.js';
const { classMap, repeat } = Directives;
const { widget } = UI.Widget;
const on = Directive.directive(CustomDirectives.InterceptBindingDirective);
const UIStrings = {
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    searchInFolder: 'Search in folder',
    /**
     * @description Search label in Navigator view of the Sources panel.
     */
    searchInAllFiles: 'Search in all files',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    noDomain: '(no domain)',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    authored: 'Authored',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    authoredTooltip: 'Contains original sources',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    deployed: 'Deployed',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    deployedTooltip: 'Contains final sources the browser sees',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    excludeThisFolder: 'Exclude this folder?',
    /**
     * @description Text in a dialog which appears when users click on 'Exclude from workspace' menu item.
     */
    folderWillNotBeShown: 'This folder and its contents won’t be shown in workspace',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    deleteThisFile: 'Delete this file?',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    rename: 'Rename…',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    makeACopy: 'Make a copy…',
    /**
     * @description Text to delete something.
     */
    delete: 'Delete',
    /**
     * @description A button text to confirm an action to remove a folder. This is not the same as delete. It removes the folder from the UI but does not delete it.
     */
    remove: 'Remove',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    deleteFolder: 'Delete this folder and its contents?',
    /**
     * @description Text in Navigator view of the Sources panel. A confirmation message on action to delete a folder or file.
     */
    actionCannotBeUndone: 'This action can’t be undone',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    openFolder: 'Open folder',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    newFile: 'New file',
    /**
     * @description A context menu item in the Navigator view of the Sources panel to exclude a folder from workspace.
     */
    excludeFolder: 'Exclude from workspace',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    removeFolderFromWorkspace: 'Remove from workspace',
    /**
     * @description Text in Navigator view of the Sources panel.
     * @example {a-folder-name} PH1
     */
    areYouSureYouWantToRemoveThis: 'Remove ‘{PH1}’ from workspace?',
    /**
     * @description Text in Navigator view of the Sources panel. Warning message when user removes a folder.
     */
    workspaceStopSyncing: 'This will stop syncing changes from DevTools to your sources',
    /**
     * @description Name of an item from a source map.
     * @example {compile.html} PH1
     */
    sFromSourceMap: '{PH1} (from source map)',
    /**
     * @description Name of an item that is on the ignore list.
     * @example {compile.html} PH1
     */
    sIgnoreListed: '{PH1} (ignore listed)',
    /**
     * @description Text for the button in the Workspace tab of the Sources panel,
     *              which allows the user to connect automatic workspace folders.
     */
    connect: 'Connect',
    /**
     * @description A context menu item in the Workspace tab of the Sources panel, which
     *              shows up for disconnected automatic workspace folders.
     */
    connectFolderToWorkspace: 'Connect to workspace',
    /**
     * @description A context menu item in the Sources navigator of the Sources panel.
     */
    run: 'Run',
    /**
     * @description Text to save content as a specific file type.
     */
    saveAs: 'Save as…',
    /**
     * @description An error message logged to the Console panel when the user uses
     *              the "Save as…" context menu in the Sources panel and the operation
     *              fails.
     */
    saveAsFailed: 'Failed to save file to disk',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/NavigatorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const Types = {
    Authored: 'authored',
    AutomaticFileSystem: 'automatic-fs',
    Deployed: 'deployed',
    Domain: 'domain',
    File: 'file',
    FileSystem: 'fs',
    FileSystemFolder: 'fs-folder',
    Frame: 'frame',
    NetworkFolder: 'nw-folder',
    Root: 'root',
    Worker: 'worker',
};
const TYPE_ORDERS = new Map([
    [Types.Root, 1],
    [Types.Authored, 1],
    [Types.Deployed, 5],
    [Types.Domain, 10],
    [Types.FileSystemFolder, 1],
    [Types.NetworkFolder, 1],
    [Types.File, 10],
    [Types.Frame, 70],
    [Types.Worker, 90],
    [Types.AutomaticFileSystem, 99],
    [Types.FileSystem, 100],
]);
export function iconTypeForNodeType(type) {
    switch (type) {
        case Types.Domain:
            return 'cloud';
        case Types.Frame:
            return 'frame';
        case Types.Worker:
            return 'gears';
        case Types.Authored:
            return 'code';
        case Types.Deployed:
            return 'deployed';
        case Types.AutomaticFileSystem:
            return 'folder-asterisk';
    }
    return 'folder';
}
export function contextForNodeType(type) {
    switch (type) {
        case Types.Domain:
            return 'domain';
        case Types.Frame:
            return 'frame';
        case Types.Worker:
            return 'worker';
        case Types.Authored:
            return 'authored';
        case Types.Deployed:
            return 'deployed';
    }
    return 'folder';
}
export function renderFolderLeadingIcon(type) {
    return html `<devtools-icon name=${iconTypeForNodeType(type)}></devtools-icon>`;
}
export function renderSourceTrailingIcons(uiSourceCode, onSelectSource) {
    if (!UI.ActionRegistry.ActionRegistry.instance().hasAction('drjones.sources-floating-button')) {
        return [];
    }
    if (!uiSourceCode.contentType().isTextType() ||
        Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
        return [];
    }
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('drjones.sources-floating-button');
    const icon = AiAssistance.AiUtils.getIconName();
    // clang-format off
    return [html `<span class="ai-button-container">
    <devtools-floating-button
      .iconName=${icon}
      .title=${action.title()}
      .jslogContext=${'ask-ai'}
      @click=${(ev) => {
            ev.stopPropagation();
            onSelectSource(uiSourceCode, false);
            void action.execute();
        }}
      @mousedown=${(ev) => {
            ev.stopPropagation();
        }}
    ></devtools-floating-button>
  </span>`];
    // clang-format on
}
export function renderGroupTrailingIcons(project) {
    if (!(project instanceof Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem)) {
        return [];
    }
    const { automaticFileSystem, automaticFileSystemManager } = project;
    switch (automaticFileSystem?.state) {
        case 'connecting': {
            // clang-format off
            return [html `<devtools-spinner></devtools-spinner>`];
            // clang-format on
        }
        case 'disconnected': {
            // clang-format off
            return [html `<devtools-button
        .data=${{
                    variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
                    size: "MICRO" /* Buttons.Button.Size.MICRO */,
                    title: i18nString(UIStrings.connectFolderToWorkspace),
                    jslogContext: 'automatic-workspace-folders.connect',
                }}
        @click=${async (event) => {
                    event.consume();
                    await automaticFileSystemManager.connectAutomaticFileSystem(
                    /* addIfMissing= */ true);
                }}
      >${i18nString(UIStrings.connect)}</devtools-button>`];
            // clang-format on
        }
    }
    return [];
}
function nodeAriaLabel(node) {
    if (node instanceof NavigatorUISourceCodeTreeNode) {
        return `${node.uiSourceCode().name()}, ${node.type}`;
    }
    return `${node.mergedTitle()}, ${node.type}`;
}
function renderLeadingIcon(node) {
    if (node instanceof NavigatorUISourceCodeTreeNode) {
        const icon = PanelUtils.getIconForSourceFile(node.uiSourceCode());
        const binding = Persistence.Persistence.PersistenceImpl.instance().binding(node.uiSourceCode());
        const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
        const isHeaderOverride = networkPersistenceManager.isActiveHeaderOverrides(node.uiSourceCode());
        const hasDotBadge = Boolean(binding || isHeaderOverride);
        const isDotPurple = Boolean(binding ? networkPersistenceManager.project() === binding.fileSystem.project() : isHeaderOverride);
        const badge = hasDotBadge ? (isDotPurple ? 'purple' : 'green') : 'none';
        return html `<span class="leading-icons icons-container" data-badge=${badge}>${icon}</span>`;
    }
    const icon = renderFolderLeadingIcon(node.type);
    return html `<span class="leading-icons icons-container">${icon}</span>`;
}
function renderTrailingIcons(node, input) {
    if (node instanceof NavigatorUISourceCodeTreeNode) {
        const trailing = renderSourceTrailingIcons(node.uiSourceCode(), input.onSelectSource);
        return trailing.length > 0 ? html `<span class="trailing-icons icons-container">${trailing}</span>` : nothing;
    }
    if (node instanceof NavigatorGroupTreeNode) {
        const trailing = renderGroupTrailingIcons(node.project);
        return trailing.length > 0 ? html `<span class="trailing-icons icons-container">${trailing}</span>` : nothing;
    }
    return nothing;
}
export const DEFAULT_NAVIGATOR_SOURCE_TITLE_VIEW = (input, _output, target) => {
    const stopPropagationIfEditing = (event) => {
        if (input.editing) {
            event.stopPropagation();
        }
    };
    // clang-format off
    render(html `
    <devtools-prompt
      value=${input.title}
      ?editing=${input.editing}
      @commit=${(event) => input.onCommit(event.detail)}
      @cancel=${() => input.onCancel()}
      @mousedown=${stopPropagationIfEditing}
      @click=${stopPropagationIfEditing}
      @dblclick=${stopPropagationIfEditing}>${input.title}</devtools-prompt>
  `, target);
    // clang-format on
};
export class NavigatorSourceTitleWidget extends UI.Widget.Widget {
    #title = '';
    #editing = false;
    #view;
    onCommit;
    onCancel;
    set title(title) {
        if (this.#title === title) {
            return;
        }
        this.#title = title;
        this.requestUpdate();
    }
    get title() {
        return this.#title;
    }
    set editing(editing) {
        if (this.#editing === editing) {
            return;
        }
        this.#editing = editing;
        this.requestUpdate();
    }
    get editing() {
        return this.#editing;
    }
    constructor(element, view = DEFAULT_NAVIGATOR_SOURCE_TITLE_VIEW) {
        super(element);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            title: this.#title,
            editing: this.#editing,
            onCommit: (detail) => this.onCommit?.(detail),
            onCancel: () => this.onCancel?.(),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
const TITLE_JSLOG = `${VisualLogging.value('title').track({ change: true })}`;
function renderTitle(node, input) {
    if (node instanceof NavigatorUISourceCodeTreeNode) {
        return html `<span title=${node.computedTooltip()} class="tree-element-title" jslog=${TITLE_JSLOG}>
      <devtools-widget ${widget(NavigatorSourceTitleWidget, {
            title: node.title,
            editing: node.isEditing,
            onCommit: (detail) => input.onCommitRename(node, detail),
            onCancel: () => input.onCancelRename(node),
        })}></devtools-widget>
    </span>`;
    }
    return html `<span title=${node.computedTooltip()} class="tree-element-title" data-title=${node.mergedTitle()}>${node.mergedTitle()}</span>`;
}
function renderNode(node, input) {
    const children = node.effectiveChildren();
    const isExpandable = node instanceof NavigatorFolderTreeNode ||
        (node instanceof NavigatorGroupTreeNode &&
            !(node.project instanceof Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem)) ||
        children.length > 0;
    const isExpanded = input.expandedNodes.has(node) ||
        (node instanceof NavigatorFolderTreeNode && input.expandedNodes.has(node.mergedLeafNode()));
    const isSelected = (input.selectedNode === node ||
        (node instanceof NavigatorFolderTreeNode && input.selectedNode === node.mergedLeafNode())) &&
        !(node instanceof NavigatorUISourceCodeTreeNode && node.isEditing);
    const classes = {
        'navigator-folder-tree-item': node instanceof NavigatorFolderTreeNode || node instanceof NavigatorGroupTreeNode,
        'navigator-file-tree-item': node instanceof NavigatorUISourceCodeTreeNode,
        ['navigator-' + node.type + '-tree-item']: true,
        'is-from-source-map': Boolean(node.recursiveProperties.exclusivelySourceMapped),
        'is-ignore-listed': Boolean(node.recursiveProperties.exclusivelyIgnored),
        'has-mapped-files': node.hasMappedFiles,
        selected: isSelected,
    };
    // clang-format off
    return html `
    <li role="treeitem"
        data-title=${node.title}
        data-node-id=${node.id}
        class=${classMap(classes)}
        ?open=${isExpanded}
        ?selected=${isSelected}
        aria-label=${nodeAriaLabel(node)}
        jslog=${VisualLogging.treeItem(node instanceof NavigatorUISourceCodeTreeNode ? node.uiSourceCode().contentType().name() : contextForNodeType(node.type)).track({ click: true })}
        draggable=${node instanceof NavigatorUISourceCodeTreeNode ? 'true' : 'false'}
        @expand=${on((e) => input.onExpand(node, e.detail.expanded))}
        @select=${on((e) => input.onSelect(node, Boolean(e.detail?.selectedByUser)))}
        @enter=${on(() => {
        if (node instanceof NavigatorUISourceCodeTreeNode) {
            input.onSelectSource(node.uiSourceCode(), true);
        }
    })}
        @keydown=${on((e) => {
        if (e.key === ' ' && node instanceof NavigatorUISourceCodeTreeNode && !node.isEditing) {
            e.consume(true);
            input.onSelectSource(node.uiSourceCode(), true);
        }
    })}
        @click=${on((e) => {
        if (node instanceof NavigatorUISourceCodeTreeNode && e.button === 0) {
            input.onSelectSource(node.uiSourceCode(), false);
        }
    })}
        @dblclick=${on((e) => input.onDoubleClick(node, e.button === 1))}
        @contextmenu=${on((e) => input.onContextMenu(node, new UI.ContextMenu.ContextMenu(e)))}
        @dragstart=${on((e) => {
        if (node instanceof NavigatorUISourceCodeTreeNode && e.dataTransfer) {
            e.dataTransfer.setData('text/plain', node.uiSourceCode().url());
            e.dataTransfer.effectAllowed = 'copy';
        }
    })}
        @mousedown=${on((e) => {
        if (e.button === 0) {
            input.onMouseDown(node);
        }
    })}
        @mousemove=${on(() => input.onHover(node, true))}
        @mouseleave=${on(() => input.onHover(node, false))}
    >
      ${renderLeadingIcon(node)}
      ${renderTitle(node, input)}
      ${renderTrailingIcons(node, input)}
      ${isExpandable ? html `
        <ul role="group">
          ${renderNodes(children, input)}
        </ul>
      ` : nothing}
    </li>
  `;
    // clang-format on
}
function renderNodes(nodes, input) {
    return html `${repeat(nodes, node => node.id, node => renderNode(node, input))}`;
}
function onTreeKeyDown(input, event) {
    if (event.key === ' ' && input.selectedNode instanceof NavigatorUISourceCodeTreeNode &&
        !input.selectedNode.isEditing) {
        event.consume(true);
        input.onSelectSource(input.selectedNode.uiSourceCode(), true);
    }
}
export const DEFAULT_VIEW = (input, _output, target) => {
    const showPlaceholder = !input.showTree;
    // clang-format off
    render(html `
        <style>${navigatorViewStyles}</style>
        <slot name="header"></slot>
        <div class="vbox flex-auto" ?hidden=${!showPlaceholder}>
          <slot name="placeholder"></slot>
        </div>
        <div class="vbox flex-auto" ?hidden=${showPlaceholder}>
          <devtools-tree autofocus navigation-variant hide-overflow
            @keydown=${(e) => onTreeKeyDown(input, e)}
            .template=${html `
            <style>${navigatorTreeStyles}</style>
            <ul role="tree">
              ${renderNodes(input.nodes, input)}
            </ul>
          `}></devtools-tree>
        </div>
      `, target);
    // clang-format on
};
export var Events;
(function (Events) {
    Events["UI_SOURCE_CODE_ADDED"] = "ui-source-code-added";
    Events["SOURCE_SELECTED"] = "source-selected";
})(Events || (Events = {}));
const NavigatorViewBase = Common.ObjectWrapper.eventMixin(UI.Widget.VBox);
export class NavigatorView extends NavigatorViewBase {
    static INJECT = [
        Bindings.NetworkProject.NetworkProjectManager,
        Workspace.Workspace.WorkspaceImpl,
        Workspace.IgnoreListManager.IgnoreListManager,
        Persistence.Persistence.PersistenceImpl,
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager,
        SDK.TargetManager.TargetManager,
        Common.Settings.Settings,
    ];
    #uiSourceCodeNodes;
    #subfolderNodes;
    rootNode;
    #frameNodes;
    #authoredNode;
    #deployedNode;
    #navigatorGroupByFolderSetting;
    #navigatorJustMyCodeSetting;
    #navigatorGroupByAuthoredSetting;
    #navigatorGroupByAuthoredChangeListener;
    #enableAuthoredGrouping = false;
    #projectFilter;
    #workspace;
    #subscribed = false;
    #needsRegroup = false;
    #prevJustMyCode;
    #groupingChangedListener = this.#groupingChanged.bind(this);
    #ignoreListChangedListener = this.#ignoreListChanged.bind(this);
    #networkProjectManager;
    #ignoreListManager;
    #persistence;
    #networkPersistenceManager;
    #targetManager;
    #settings;
    #groupByFrame;
    #groupByAuthored;
    #groupByDomain;
    #groupByFolder;
    #selectedNode = null;
    #expandedNodes = new WeakSet();
    #renamingNode = null;
    #view;
    constructor(element, [networkProjectManager = Bindings.NetworkProject.NetworkProjectManager.instance(), workspace = Workspace.Workspace.WorkspaceImpl.instance(), ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance(), persistence = Persistence.Persistence.PersistenceImpl.instance(), networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance(), targetManager = SDK.TargetManager.TargetManager.instance(), settings = Common.Settings.Settings.instance(),] = [], view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.#networkProjectManager = networkProjectManager;
        this.#workspace = workspace;
        this.#ignoreListManager = ignoreListManager;
        this.#persistence = persistence;
        this.#networkPersistenceManager = networkPersistenceManager;
        this.#targetManager = targetManager;
        this.#settings = settings;
        this.#uiSourceCodeNodes = new Platform.MapUtilities.Multimap();
        this.#subfolderNodes = new Map();
        this.rootNode = new NavigatorRootTreeNode(this);
        this.rootNode.populate();
        this.#frameNodes = new Map();
        UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.contentElement, { 'sources.rename': this.#renameShortcut.bind(this) });
        this.#navigatorGroupByFolderSetting =
            this.#settings.resolve(SettingsUI.SourcesSettings.navigatorGroupByFolderSettingDescriptor);
        this.#navigatorJustMyCodeSetting =
            this.#settings.resolve(SettingsUI.SourcesSettings.navigatorJustMyCodeSettingDescriptor);
        this.#initGrouping();
        this.requestUpdate();
    }
    get ignoreListManager() {
        return this.#ignoreListManager;
    }
    get persistence() {
        return this.#persistence;
    }
    get settings() {
        return this.#settings;
    }
    wasShown() {
        super.wasShown();
        this.#subscribe();
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.#unsubscribe();
    }
    #subscribe() {
        if (this.#subscribed) {
            return;
        }
        this.#subscribed = true;
        this.#navigatorGroupByFolderSetting.addChangeListener(this.#groupingChangedListener);
        this.#navigatorJustMyCodeSetting.addChangeListener(this.#groupingChangedListener);
        if (this.#navigatorGroupByAuthoredSetting && this.#navigatorGroupByAuthoredChangeListener) {
            this.#navigatorGroupByAuthoredSetting.addChangeListener(this.#navigatorGroupByAuthoredChangeListener);
        }
        this.#ignoreListManager.addChangeListener(this.#ignoreListChangedListener);
        this.#persistence.addEventListener(Persistence.Persistence.Events.BindingCreated, this.#onBindingChanged, this);
        this.#persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved, this.#onBindingChanged, this);
        this.#networkPersistenceManager.addEventListener("RequestsForHeaderOverridesFileChanged" /* Persistence.NetworkPersistenceManager.Events.REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED */, this.#onRequestsForHeaderOverridesFileChanged, this);
        this.#targetManager.addEventListener("NameChanged" /* SDK.TargetManager.Events.NAME_CHANGED */, this.#targetNameChanged, this);
        this.#targetManager.observeTargets(this);
        this.#networkProjectManager.addEventListener("FrameAttributionAdded" /* Bindings.NetworkProject.Events.FRAME_ATTRIBUTION_ADDED */, this.#frameAttributionAdded, this);
        this.#networkProjectManager.addEventListener("FrameAttributionRemoved" /* Bindings.NetworkProject.Events.FRAME_ATTRIBUTION_REMOVED */, this.#frameAttributionRemoved, this);
        const prevGroupByFolder = this.#groupByFolder;
        const prevGroupByDomain = this.#groupByDomain;
        const prevGroupByAuthored = this.#groupByAuthored;
        const prevJustMyCode = this.#prevJustMyCode;
        this.#initGrouping();
        const groupingChanged = prevGroupByFolder !== this.#groupByFolder || prevGroupByDomain !== this.#groupByDomain ||
            prevGroupByAuthored !== this.#groupByAuthored || prevJustMyCode !== this.#prevJustMyCode;
        if (groupingChanged || this.#needsRegroup) {
            this.#needsRegroup = false;
            this.#groupingChanged();
            return;
        }
        this.#resetWorkspace(this.#workspace);
        const current = new Set(this.#workspace.uiSourceCodes());
        const workspaceProjects = new Set(this.#workspace.projects());
        const toRemove = [];
        for (const uiSourceCode of this.#uiSourceCodeNodes.keys()) {
            if (!current.has(uiSourceCode) || !workspaceProjects.has(uiSourceCode.project()) ||
                !this.#acceptsUISourceCode(uiSourceCode) ||
                (this.#navigatorJustMyCodeSetting.get() &&
                    this.#ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode))) {
                toRemove.push(uiSourceCode);
            }
        }
        if (toRemove.length > 0) {
            this.#removeUISourceCodes(toRemove);
        }
        const rootOrDeployed = this.#rootOrDeployedNode();
        for (const child of [...rootOrDeployed.children()]) {
            if (child instanceof NavigatorGroupTreeNode && child.project && !workspaceProjects.has(child.project)) {
                this.removeProject(child.project);
            }
        }
        for (const uiSourceCode of current) {
            if (!this.#uiSourceCodeNodes.has(uiSourceCode)) {
                this.#addUISourceCode(uiSourceCode);
            }
            else {
                const frames = Bindings.NetworkProject.NetworkProject.framesForUISourceCode(uiSourceCode);
                const desiredFrames = new Set(frames.length > 0 ? frames : [null]);
                for (const node of [...this.#uiSourceCodeNodes.get(uiSourceCode)]) {
                    if (!desiredFrames.has(node.frame())) {
                        this.#removeUISourceCodeNode(node);
                    }
                }
                const existingFrames = new Set(Array.from(this.#uiSourceCodeNodes.get(uiSourceCode), node => node.frame()));
                for (const frame of desiredFrames) {
                    if (!existingFrames.has(frame)) {
                        this.#addUISourceCodeNode(uiSourceCode, frame);
                    }
                }
            }
        }
        if (this.#targetManager) {
            const liveTargets = new Set(this.#targetManager.targets());
            const scopeTarget = this.#targetManager.scopeTarget();
            for (const child of [...rootOrDeployed.children()]) {
                if (child.id.startsWith('target:')) {
                    const targetId = child.id.slice('target:'.length);
                    const target = this.#targetManager.targetById(targetId);
                    if (!target || !liveTargets.has(target) || target === scopeTarget) {
                        rootOrDeployed.removeChild(child);
                    }
                    else {
                        child.setTitle(target.name());
                    }
                }
            }
        }
        this.rootNode.updateTitleRecursive();
    }
    #unsubscribe() {
        if (!this.#subscribed) {
            return;
        }
        this.#subscribed = false;
        this.#navigatorGroupByFolderSetting.removeChangeListener(this.#groupingChangedListener);
        this.#navigatorJustMyCodeSetting.removeChangeListener(this.#groupingChangedListener);
        if (this.#navigatorGroupByAuthoredSetting && this.#navigatorGroupByAuthoredChangeListener) {
            this.#navigatorGroupByAuthoredSetting.removeChangeListener(this.#navigatorGroupByAuthoredChangeListener);
        }
        this.#ignoreListManager.removeChangeListener(this.#ignoreListChangedListener);
        this.#persistence.removeEventListener(Persistence.Persistence.Events.BindingCreated, this.#onBindingChanged, this);
        this.#persistence.removeEventListener(Persistence.Persistence.Events.BindingRemoved, this.#onBindingChanged, this);
        this.#networkPersistenceManager.removeEventListener("RequestsForHeaderOverridesFileChanged" /* Persistence.NetworkPersistenceManager.Events.REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED */, this.#onRequestsForHeaderOverridesFileChanged, this);
        this.#targetManager.removeEventListener("NameChanged" /* SDK.TargetManager.Events.NAME_CHANGED */, this.#targetNameChanged, this);
        this.#targetManager.unobserveTargets(this);
        this.#networkProjectManager.removeEventListener("FrameAttributionAdded" /* Bindings.NetworkProject.Events.FRAME_ATTRIBUTION_ADDED */, this.#frameAttributionAdded, this);
        this.#networkProjectManager.removeEventListener("FrameAttributionRemoved" /* Bindings.NetworkProject.Events.FRAME_ATTRIBUTION_REMOVED */, this.#frameAttributionRemoved, this);
        this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedCallback, this);
        this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeRemovedCallback, this);
        this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectAdded, this.#projectAddedCallback, this);
        this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#projectRemovedCallback, this);
    }
    get enableAuthoredGrouping() {
        return this.#enableAuthoredGrouping;
    }
    set enableAuthoredGrouping(enableAuthoredGrouping) {
        if (this.#enableAuthoredGrouping === enableAuthoredGrouping) {
            return;
        }
        this.#enableAuthoredGrouping = enableAuthoredGrouping;
        if (this.#navigatorGroupByAuthoredSetting && this.#navigatorGroupByAuthoredChangeListener) {
            this.#navigatorGroupByAuthoredSetting.removeChangeListener(this.#navigatorGroupByAuthoredChangeListener);
            this.#navigatorGroupByAuthoredSetting = undefined;
            this.#navigatorGroupByAuthoredChangeListener = undefined;
        }
        if (enableAuthoredGrouping) {
            this.#navigatorGroupByAuthoredSetting =
                this.#settings.resolve(SettingsUI.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor);
            this.#navigatorGroupByAuthoredChangeListener = this.#groupingChanged.bind(this);
            if (this.#subscribed) {
                this.#navigatorGroupByAuthoredSetting.addChangeListener(this.#navigatorGroupByAuthoredChangeListener);
            }
        }
        if (Boolean(this.#groupByAuthored) !== Boolean(this.#navigatorGroupByAuthoredSetting?.get())) {
            if (this.#subscribed) {
                this.#initGrouping();
                this.#groupingChanged();
            }
            else {
                this.#needsRegroup = true;
            }
        }
        this.requestUpdate();
    }
    get projectFilter() {
        return this.#projectFilter;
    }
    set projectFilter(projectFilter) {
        if (this.#projectFilter === projectFilter) {
            return;
        }
        this.#projectFilter = projectFilter;
        if (this.#subscribed) {
            this.#groupingChanged();
        }
        else {
            this.#needsRegroup = true;
        }
        this.requestUpdate();
    }
    static #nodeOrder(node) {
        if (node.boostOrder) {
            return 0;
        }
        let order = TYPE_ORDERS.get(node.type) || 0;
        if (node instanceof NavigatorUISourceCodeTreeNode) {
            const contentType = node.uiSourceCode().contentType();
            if (contentType.isDocument()) {
                order += 3;
            }
            else if (contentType.isScript()) {
                order += 5;
            }
            else if (contentType.isStyleSheet()) {
                order += 10;
            }
            else {
                order += 15;
            }
        }
        return order;
    }
    static compareNodes(node1, node2) {
        const order1 = NavigatorView.#nodeOrder(node1);
        const order2 = NavigatorView.#nodeOrder(node2);
        if (order1 > order2) {
            return 1;
        }
        if (order1 < order2) {
            return -1;
        }
        return Platform.StringUtilities.naturalOrderComparator(node1.mergedTitle(), node2.mergedTitle());
    }
    static appendSearchItem(contextMenu, path) {
        const searchLabel = path ? i18nString(UIStrings.searchInFolder) : i18nString(UIStrings.searchInAllFiles);
        const searchSources = new SearchSources(path && `file:${path}`);
        contextMenu.viewSection().appendItem(searchLabel, () => Common.Revealer.reveal(searchSources), { jslogContext: path ? 'search-in-folder' : 'search-in-all-files' });
    }
    performUpdate() {
        const nodes = this.rootNode.effectiveChildren();
        this.#view({
            nodes,
            expandedNodes: this.#expandedNodes,
            selectedNode: this.#selectedNode,
            onExpand: this.#onExpand.bind(this),
            onSelect: this.#onSelect.bind(this),
            onDoubleClick: this.#onDoubleClick.bind(this),
            onContextMenu: this.#onContextMenu.bind(this),
            onHover: this.#onHover.bind(this),
            onMouseDown: this.#onMouseDown.bind(this),
            onSelectSource: this.sourceSelected.bind(this),
            onCommitRename: this.#onCommitRename.bind(this),
            onCancelRename: this.#onCancelRename.bind(this),
            showTree: nodes.length > 0,
        }, undefined, this.contentElement);
    }
    #onBindingChanged(event) {
        const binding = event.data;
        let isFromSourceMap = false;
        // Update UISourceCode titles.
        const networkNodes = this.#uiSourceCodeNodes.get(binding.network);
        for (const networkNode of networkNodes) {
            networkNode.updateTitle();
            isFromSourceMap ||= networkNode.uiSourceCode().contentType().isFromSourceMap();
        }
        const fileSystemNodes = this.#uiSourceCodeNodes.get(binding.fileSystem);
        for (const fileSystemNode of fileSystemNodes) {
            fileSystemNode.updateTitle();
            isFromSourceMap ||= fileSystemNode.uiSourceCode().contentType().isFromSourceMap();
        }
        // Update folder titles.
        const pathTokens = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);
        let folderPath = Platform.DevToolsPath.EmptyEncodedPathString;
        for (let i = 0; i < pathTokens.length - 1; ++i) {
            folderPath = Common.ParsedURL.ParsedURL.concatenate(folderPath, pathTokens[i]);
            const folderId = this.#folderNodeId(binding.fileSystem.project(), null, null, binding.fileSystem.origin(), isFromSourceMap, folderPath);
            const folderNode = this.#subfolderNodes.get(folderId);
            if (folderNode) {
                folderNode.updateTitle();
            }
            folderPath = Common.ParsedURL.ParsedURL.concatenate(folderPath, '/');
        }
        // Update fileSystem root title.
        const fileSystemRoot = this.#rootOrDeployedNode().child(binding.fileSystem.project().id());
        if (fileSystemRoot) {
            fileSystemRoot.updateTitle();
        }
    }
    #onRequestsForHeaderOverridesFileChanged(event) {
        const headersFileUiSourceCode = event.data;
        const networkNodes = this.#uiSourceCodeNodes.get(headersFileUiSourceCode);
        for (const networkNode of networkNodes) {
            networkNode.updateTitle();
        }
    }
    selectNode(node) {
        this.#selectedNode = node;
        this.requestUpdate();
    }
    expandNode(node) {
        const leaf = node instanceof NavigatorFolderTreeNode ? node.mergedLeafNode() : node;
        this.#expandedNodes.add(node);
        this.#expandedNodes.add(leaf);
        node.populate();
        leaf.populate();
        this.requestUpdate();
    }
    collapseNode(node) {
        const leaf = node instanceof NavigatorFolderTreeNode ? node.mergedLeafNode() : node;
        this.#expandedNodes.delete(node);
        this.#expandedNodes.delete(leaf);
        this.requestUpdate();
    }
    isNodeExpanded(node) {
        return this.#expandedNodes.has(node);
    }
    isNodeSelected(node) {
        return this.#selectedNode === node;
    }
    setNodeSelected(node) {
        this.#selectedNode = node;
    }
    setNodeExpanded(node) {
        this.#expandedNodes.add(node);
    }
    isNodeSelectedOrDescendant(node) {
        let curr = this.#selectedNode;
        while (curr) {
            if (curr === node) {
                return true;
            }
            curr = curr.parent;
        }
        return false;
    }
    deselectIfDescendant(node) {
        if (this.isNodeSelectedOrDescendant(node)) {
            this.#selectedNode = null;
        }
    }
    #onExpand(node, expanded) {
        const leaf = node instanceof NavigatorFolderTreeNode ? node.mergedLeafNode() : node;
        if (expanded) {
            this.#expandedNodes.add(node);
            this.#expandedNodes.add(leaf);
            node.populate();
            leaf.populate();
        }
        else {
            this.#expandedNodes.delete(node);
            this.#expandedNodes.delete(leaf);
        }
        this.requestUpdate();
    }
    #onSelect(node, selectedByUser) {
        if (!selectedByUser && this.#selectedNode !== null) {
            return;
        }
        if (node instanceof NavigatorFolderTreeNode) {
            this.#selectedNode = node.mergedLeafNode();
        }
        else {
            this.#selectedNode = node;
        }
    }
    #onDoubleClick(node, middleClick) {
        if (node instanceof NavigatorUISourceCodeTreeNode) {
            this.sourceSelected(node.uiSourceCode(), !middleClick);
        }
    }
    #onContextMenu(node, contextMenu) {
        this.selectNode(node);
        if (node instanceof NavigatorUISourceCodeTreeNode) {
            this.handleFileContextMenu(contextMenu, node);
        }
        else if (node instanceof NavigatorFolderTreeNode || node instanceof NavigatorGroupTreeNode) {
            this.handleFolderContextMenu(contextMenu, node);
        }
    }
    #onHover(node, hovered) {
        if (node instanceof NavigatorFolderTreeNode || node instanceof NavigatorGroupTreeNode) {
            this.folderHovered(node, hovered);
        }
    }
    #onMouseDown(node) {
        if (!(node instanceof NavigatorUISourceCodeTreeNode)) {
            return;
        }
        if (!this.shouldRenameOnMouseDown(node)) {
            return;
        }
        setTimeout(() => {
            if (this.shouldRenameOnMouseDown(node)) {
                this.rename(node, false);
            }
        }, 300);
    }
    #onCommitRename(node, newTitle) {
        void node.commitRename(newTitle);
    }
    #onCancelRename(node) {
        node.cancelRename();
    }
    #resetWorkspace(workspace) {
        // Clear old event listeners first.
        if (this.#subscribed && this.#workspace) {
            this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedCallback, this);
            this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeRemovedCallback, this);
            this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectAdded, this.#projectAddedCallback, this);
            this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#projectRemovedCallback, this);
        }
        this.#workspace = workspace;
        if (this.#subscribed) {
            this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedCallback, this);
            this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeRemovedCallback, this);
            this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, this.#projectAddedCallback, this);
            this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#projectRemovedCallback, this);
        }
        this.#workspace.projects().forEach(this.#projectAdded.bind(this));
        this.#computeUniqueFileSystemProjectNames();
    }
    #projectAddedCallback(event) {
        const project = event.data;
        this.#projectAdded(project);
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            this.#computeUniqueFileSystemProjectNames();
        }
    }
    #projectRemovedCallback(event) {
        const project = event.data;
        this.removeProject(project);
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            this.#computeUniqueFileSystemProjectNames();
        }
    }
    acceptProject(project) {
        if (this.#projectFilter) {
            return this.#projectFilter(project);
        }
        return !project.isServiceProject();
    }
    #frameAttributionAdded(event) {
        const { uiSourceCode } = event.data;
        if (!this.#acceptsUISourceCode(uiSourceCode)) {
            return;
        }
        const addedFrame = event.data.frame;
        // This event does not happen for UISourceCodes without initial attribution.
        this.#addUISourceCodeNode(uiSourceCode, addedFrame);
    }
    #frameAttributionRemoved(event) {
        const { uiSourceCode } = event.data;
        if (!this.#acceptsUISourceCode(uiSourceCode)) {
            return;
        }
        const removedFrame = event.data.frame;
        const node = Array.from(this.#uiSourceCodeNodes.get(uiSourceCode)).find(node => node.frame() === removedFrame);
        if (node) {
            this.#removeUISourceCodeNode(node);
        }
    }
    #acceptsUISourceCode(uiSourceCode) {
        return this.acceptProject(uiSourceCode.project());
    }
    #addUISourceCode(uiSourceCode) {
        if (this.#navigatorJustMyCodeSetting.get() &&
            this.#ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
            return;
        }
        if (!this.#acceptsUISourceCode(uiSourceCode)) {
            return;
        }
        if (uiSourceCode.isFetchXHR()) {
            return;
        }
        const frames = Bindings.NetworkProject.NetworkProject.framesForUISourceCode(uiSourceCode);
        if (frames.length) {
            for (const frame of frames) {
                this.#addUISourceCodeNode(uiSourceCode, frame);
            }
        }
        else {
            this.#addUISourceCodeNode(uiSourceCode, null);
        }
        this.dispatchEventToListeners("ui-source-code-added" /* Events.UI_SOURCE_CODE_ADDED */, uiSourceCode);
    }
    #addUISourceCodeNode(uiSourceCode, frame) {
        const isFromSourceMap = uiSourceCode.contentType().isFromSourceMap();
        let path;
        if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
            path = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0, -1);
        }
        else {
            path = Common.ParsedURL.ParsedURL.extractPath(uiSourceCode.url()).split('/').slice(1, -1);
        }
        const project = uiSourceCode.project();
        const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
        const folderNode = this.#folderNode(uiSourceCode, project, target, frame, uiSourceCode.origin(), path, isFromSourceMap);
        const uiSourceCodeNode = new NavigatorUISourceCodeTreeNode(this, uiSourceCode, frame);
        const existingNode = folderNode.child(uiSourceCodeNode.id);
        if (existingNode && existingNode instanceof NavigatorUISourceCodeTreeNode) {
            this.#uiSourceCodeNodes.set(uiSourceCode, existingNode);
        }
        else {
            folderNode.appendChild(uiSourceCodeNode);
            this.#uiSourceCodeNodes.set(uiSourceCode, uiSourceCodeNode);
            uiSourceCodeNode.updateTitleBubbleUp();
        }
        this.#selectDefaultTreeNode();
    }
    #uiSourceCodeAddedCallback(event) {
        const uiSourceCode = event.data;
        this.#addUISourceCode(uiSourceCode);
    }
    #uiSourceCodeRemovedCallback(event) {
        this.#removeUISourceCodes([event.data]);
    }
    tryAddProject(project) {
        this.#projectAdded(project);
        for (const uiSourceCode of project.uiSourceCodes()) {
            this.#addUISourceCode(uiSourceCode);
        }
    }
    #projectAdded(project) {
        const rootOrDeployed = this.#rootOrDeployedNode();
        const FILE_SYSTEM_TYPES = [
            Workspace.Workspace.projectTypes.ConnectableFileSystem,
            Workspace.Workspace.projectTypes.FileSystem,
        ];
        if (!this.acceptProject(project) || !FILE_SYSTEM_TYPES.includes(project.type()) ||
            Snippets.ScriptSnippetFileSystem.isSnippetsProject(project) || rootOrDeployed.child(project.id())) {
            return;
        }
        const type = (project instanceof Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem ||
            (project instanceof Persistence.FileSystemWorkspaceBinding.FileSystem && project.fileSystem().automatic)) ?
            Types.AutomaticFileSystem :
            Types.FileSystem;
        rootOrDeployed.appendChild(new NavigatorGroupTreeNode(this, project, project.id(), type, project.displayName()));
        this.#selectDefaultTreeNode();
    }
    // TODO(einbinder) remove this code after crbug.com/964075 is fixed
    #selectDefaultTreeNode() {
        const children = this.rootNode.children();
        if (children.length && !this.#selectedNode) {
            this.selectNode(children[0]);
        }
    }
    #computeUniqueFileSystemProjectNames() {
        const fileSystemProjects = this.#workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem);
        if (!fileSystemProjects.length) {
            return;
        }
        const reversedIndex = Common.Trie.Trie.newArrayTrie();
        const reversedPaths = [];
        for (const project of fileSystemProjects) {
            const fileSystem = project;
            const reversedPathParts = fileSystem.fileSystemPath().split('/').reverse();
            reversedPaths.push(reversedPathParts);
            reversedIndex.add(reversedPathParts);
        }
        const rootOrDeployed = this.#rootOrDeployedNode();
        for (let i = 0; i < fileSystemProjects.length; ++i) {
            const reversedPath = reversedPaths[i];
            const project = fileSystemProjects[i];
            reversedIndex.remove(reversedPath);
            const commonPrefix = reversedIndex.longestPrefix(reversedPath, false /* fullWordOnly */);
            reversedIndex.add(reversedPath);
            const prefixPath = reversedPath.slice(0, commonPrefix.length + 1);
            const path = Common.ParsedURL.ParsedURL.encodedPathToRawPathString(prefixPath.reverse().join('/'));
            const fileSystemNode = rootOrDeployed.child(project.id());
            if (fileSystemNode) {
                fileSystemNode.setTitle(path);
            }
        }
    }
    removeProject(project) {
        this.#removeUISourceCodes(project.uiSourceCodes());
        if (project.type() !== Workspace.Workspace.projectTypes.ConnectableFileSystem &&
            project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
            return;
        }
        const fileSystemNode = this.#rootOrDeployedNode().child(project.id()) ?? this.rootNode.child(project.id());
        fileSystemNode?.parent?.removeChild(fileSystemNode);
    }
    #folderNodeId(project, target, frame, projectOrigin, isFromSourceMap, path) {
        const projectId = project.type() === Workspace.Workspace.projectTypes.FileSystem ? project.id() : '';
        let targetId = target && !(this.#groupByAuthored && isFromSourceMap) ? target.id() : '';
        let frameId = this.#groupByFrame && frame ? frame.id : '';
        if (this.#groupByAuthored) {
            if (isFromSourceMap) {
                targetId = 'Authored';
                frameId = '';
            }
            else {
                targetId = 'Deployed:' + targetId;
            }
        }
        return targetId + ':' + projectId + ':' + frameId + ':' + projectOrigin + ':' + path;
    }
    #folderNode(uiSourceCode, project, target, frame, projectOrigin, path, fromSourceMap) {
        if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
            return this.rootNode;
        }
        if (target && !this.#groupByFolder && !fromSourceMap) {
            return this.#domainNode(uiSourceCode, project, target, frame, projectOrigin);
        }
        const folderPath = Common.ParsedURL.ParsedURL.join(path, '/');
        const folderId = this.#folderNodeId(project, target, frame, projectOrigin, fromSourceMap, folderPath);
        let folderNode = this.#subfolderNodes.get(folderId);
        if (folderNode) {
            return folderNode;
        }
        if (!path.length) {
            if (target) {
                return this.#domainNode(uiSourceCode, project, target, frame, projectOrigin);
            }
            return this.#rootOrDeployedNode().child(project.id());
        }
        const parentNode = this.#folderNode(uiSourceCode, project, target, frame, projectOrigin, path.slice(0, -1), fromSourceMap);
        let type = Types.NetworkFolder;
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            type = Types.FileSystemFolder;
        }
        const name = Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path[path.length - 1]);
        folderNode = new NavigatorFolderTreeNode(this, project, folderId, type, folderPath, name, projectOrigin);
        this.#subfolderNodes.set(folderId, folderNode);
        parentNode.appendChild(folderNode);
        return folderNode;
    }
    #domainNode(uiSourceCode, project, target, frame, projectOrigin) {
        const isAuthored = uiSourceCode.contentType().isFromSourceMap();
        const frameNode = this.#frameNode(project, target, frame, isAuthored);
        if (!this.#groupByDomain) {
            return frameNode;
        }
        let domainNode = frameNode.child(projectOrigin);
        if (domainNode) {
            return domainNode;
        }
        domainNode = new NavigatorGroupTreeNode(this, project, projectOrigin, Types.Domain, this.#computeProjectDisplayName(target, projectOrigin));
        if (frame && projectOrigin === Common.ParsedURL.ParsedURL.extractOrigin(frame.url)) {
            domainNode.boostOrder = true;
        }
        frameNode.appendChild(domainNode);
        if (isAuthored && this.#groupByAuthored) {
            this.expandNode(domainNode);
        }
        return domainNode;
    }
    #frameNode(project, target, frame, isAuthored) {
        if (!this.#groupByFrame || !frame || (this.#groupByAuthored && isAuthored)) {
            return this.#targetNode(project, target, isAuthored);
        }
        let frameNode = this.#frameNodes.get(frame);
        if (frameNode) {
            return frameNode;
        }
        frameNode = new NavigatorGroupTreeNode(this, project, target.id() + ':' + frame.id, Types.Frame, frame.displayName(), undefined, frame);
        this.#frameNodes.set(frame, frameNode);
        const parentFrame = frame.parentFrame();
        if (!parentFrame) {
            frameNode.boostOrder = true;
        }
        this.#frameNode(project, parentFrame ? parentFrame.resourceTreeModel().target() : target, parentFrame, isAuthored)
            .appendChild(frameNode);
        if (!parentFrame) {
            this.expandNode(frameNode);
        }
        return frameNode;
    }
    #targetNode(project, target, isAuthored) {
        if (this.#groupByAuthored && isAuthored) {
            if (!this.#authoredNode) {
                this.#authoredNode =
                    new NavigatorGroupTreeNode(this, null, 'group:Authored', Types.Authored, i18nString(UIStrings.authored), i18nString(UIStrings.authoredTooltip));
                this.rootNode.appendChild(this.#authoredNode);
                this.expandNode(this.#authoredNode);
            }
            return this.#authoredNode;
        }
        const rootOrDeployed = this.#rootOrDeployedNode();
        if (target === this.#targetManager.scopeTarget()) {
            return rootOrDeployed;
        }
        let targetNode = rootOrDeployed.child('target:' + target.id());
        if (!targetNode) {
            targetNode = new NavigatorGroupTreeNode(this, project, 'target:' + target.id(), target.type() === SDK.Target.Type.FRAME ? Types.Frame : Types.Worker, target.name());
            rootOrDeployed.appendChild(targetNode);
        }
        return targetNode;
    }
    #rootOrDeployedNode() {
        if (this.#groupByAuthored) {
            if (!this.#deployedNode) {
                this.#deployedNode =
                    new NavigatorGroupTreeNode(this, null, 'group:Deployed', Types.Deployed, i18nString(UIStrings.deployed), i18nString(UIStrings.deployedTooltip));
                this.rootNode.appendChild(this.#deployedNode);
            }
            return this.#deployedNode;
        }
        return this.rootNode;
    }
    #computeProjectDisplayName(target, projectOrigin) {
        const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
        const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
        let matchingContextName = null;
        for (const context of executionContexts) {
            if (!context.origin || !projectOrigin.startsWith(context.origin)) {
                continue;
            }
            // If the project origin matches the default context origin then we should break out and use the
            // project origin for the display name.
            if (context.isDefault) {
                matchingContextName = null;
                break;
            }
            if (!context.name) {
                continue;
            }
            matchingContextName = context.name;
        }
        if (matchingContextName) {
            return matchingContextName;
        }
        if (!projectOrigin) {
            return i18nString(UIStrings.noDomain);
        }
        const parsedURL = new Common.ParsedURL.ParsedURL(projectOrigin);
        const prettyURL = parsedURL.isValid ? parsedURL.host + (parsedURL.port ? (':' + parsedURL.port) : '') : '';
        return (prettyURL || projectOrigin);
    }
    revealUISourceCode(uiSourceCode, select) {
        const nodes = this.#uiSourceCodeNodes.get(uiSourceCode);
        if (nodes.size === 0) {
            return null;
        }
        const node = nodes.values().next().value;
        if (!node) {
            return null;
        }
        if (this.#selectedNode) {
            // If a file is currently being renamed (or choosing the name for a new snippet),
            // we shall not proceed with revealing here, as that will steal focus from the
            // input widget and thus cancel editing. The test/e2e/snippets/breakpoint.test.ts
            // exercises this.
            if (this.isRenaming()) {
                return null;
            }
            this.#selectedNode = null;
        }
        // TODO(dgozman): figure out revealing multiple.
        node.reveal(select);
        return node;
    }
    sourceSelected(uiSourceCode, focusSource) {
        this.dispatchEventToListeners("source-selected" /* Events.SOURCE_SELECTED */, { uiSourceCode, focusSource });
        void Common.Revealer.reveal(uiSourceCode, !focusSource);
    }
    #isUISourceCodeOrAnyAncestorSelected(node) {
        let currentNode = node;
        while (currentNode) {
            if (currentNode === this.#selectedNode) {
                return true;
            }
            currentNode = currentNode.parent;
            if (!(currentNode instanceof NavigatorGroupTreeNode || currentNode instanceof NavigatorFolderTreeNode)) {
                break;
            }
        }
        return false;
    }
    #removeUISourceCodes(uiSourceCodes) {
        const nodesWithSelectionOnPath = [];
        // First we remove source codes without any selection on their path to root, and only then
        // the ones with selection. This to avoid layout work associated with moving the selection
        // around (crbug.com/1409025).
        for (const uiSourceCode of uiSourceCodes) {
            const nodes = this.#uiSourceCodeNodes.get(uiSourceCode);
            for (const node of nodes) {
                if (this.#isUISourceCodeOrAnyAncestorSelected(node)) {
                    nodesWithSelectionOnPath.push(node);
                }
                else {
                    this.removeUISourceCodeNode(node);
                }
            }
        }
        nodesWithSelectionOnPath.forEach(this.removeUISourceCodeNode.bind(this));
    }
    removeUISourceCodeNode(node) {
        this.#removeUISourceCodeNode(node);
    }
    #removeUISourceCodeNode(node) {
        const uiSourceCode = node.uiSourceCode();
        this.#uiSourceCodeNodes.delete(uiSourceCode, node);
        const project = uiSourceCode.project();
        const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
        let frame = node.frame();
        let parentNode = node.parent;
        if (!parentNode) {
            return;
        }
        parentNode.removeChild(node);
        let currentNode = parentNode;
        while (currentNode) {
            parentNode = currentNode.parent;
            if (!parentNode) {
                break;
            }
            if ((parentNode === this.rootNode || parentNode === this.#deployedNode) &&
                project.type() === Workspace.Workspace.projectTypes.FileSystem) {
                break;
            }
            if (!(currentNode instanceof NavigatorGroupTreeNode || currentNode instanceof NavigatorFolderTreeNode)) {
                break;
            }
            if (!currentNode.isEmpty()) {
                currentNode.updateTitleBubbleUp();
                break;
            }
            if (currentNode.type === Types.Frame) {
                this.#discardFrame(frame, Boolean(this.#groupByAuthored) && uiSourceCode.contentType().isFromSourceMap());
                frame = frame.parentFrame();
            }
            else {
                const folderId = this.#folderNodeId(project, target, frame, uiSourceCode.origin(), uiSourceCode.contentType().isFromSourceMap(), currentNode instanceof NavigatorFolderTreeNode && currentNode.folderPath ||
                    Platform.DevToolsPath.EmptyEncodedPathString);
                this.#subfolderNodes.delete(folderId);
                parentNode.removeChild(currentNode);
            }
            if (currentNode === this.#authoredNode) {
                this.#authoredNode = undefined;
            }
            else if (currentNode === this.#deployedNode) {
                this.#deployedNode = undefined;
            }
            currentNode = parentNode;
        }
    }
    reset(tearDownOnly) {
        for (const node of this.#uiSourceCodeNodes.valuesArray()) {
            node.dispose();
        }
        this.#selectedNode = null;
        this.#renamingNode = null;
        this.#expandedNodes = new WeakSet();
        this.#uiSourceCodeNodes.clear();
        this.#subfolderNodes.clear();
        this.#frameNodes.clear();
        this.rootNode.reset();
        this.#authoredNode = undefined;
        this.#deployedNode = undefined;
        if (!tearDownOnly) {
            // Reset the workspace to repopulate filesystem folders.
            this.#resetWorkspace(this.#workspace);
        }
        this.requestUpdate();
    }
    async #renameShortcut() {
        if (!(this.#selectedNode instanceof NavigatorUISourceCodeTreeNode) ||
            !this.#selectedNode.uiSourceCode().canRename()) {
            return false;
        }
        this.rename(this.#selectedNode, false);
        return true;
    }
    #handleContextMenuCreate(project, path, uiSourceCode) {
        if (uiSourceCode) {
            const relativePath = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
            relativePath.pop();
            path = Common.ParsedURL.ParsedURL.join(relativePath, '/');
        }
        void this.create(project, path, uiSourceCode);
    }
    #handleContextMenuRename(node) {
        this.rename(node, false);
    }
    async #handleContextMenuExclude(project, path) {
        const shouldExclude = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.folderWillNotBeShown), i18nString(UIStrings.excludeThisFolder), undefined, { jslogContext: 'exclude-folder-confirmation' });
        if (shouldExclude) {
            UI.UIUtils.startBatchUpdate();
            project.excludeFolder(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path));
            UI.UIUtils.endBatchUpdate();
        }
    }
    async #handleContextMenuDelete(uiSourceCode) {
        const shouldDelete = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.actionCannotBeUndone), i18nString(UIStrings.deleteThisFile), undefined, { jslogContext: 'delete-file-confirmation' });
        if (shouldDelete) {
            uiSourceCode.project().deleteFile(uiSourceCode);
        }
    }
    shouldRenameOnMouseDown(node) {
        if (!node.uiSourceCode().canRename()) {
            return false;
        }
        return this.#selectedNode === node && this.contentElement.hasFocus() && !this.isRenaming();
    }
    startRenamingNode(node) {
        this.#renamingNode = node;
    }
    stopRenamingNode(node) {
        if (this.#renamingNode === node) {
            this.#renamingNode = null;
        }
    }
    isRenaming() {
        return this.#renamingNode !== null;
    }
    handleFileContextMenu(contextMenu, node) {
        const uiSourceCode = node.uiSourceCode();
        if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
            contextMenu.headerSection().appendItem(i18nString(UIStrings.run), () => Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode), { jslogContext: 'run' });
            contextMenu.editSection().appendItem(i18nString(UIStrings.rename), () => this.rename(node, false), { jslogContext: 'rename' });
            contextMenu.editSection().appendItem(i18nString(UIStrings.remove), () => uiSourceCode.project().deleteFile(uiSourceCode), { jslogContext: 'remove' });
            contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), this.#handleSaveAs.bind(this, uiSourceCode), { jslogContext: 'save-as' });
            void contextMenu.show();
            return;
        }
        contextMenu.appendApplicableItems(uiSourceCode);
        const project = uiSourceCode.project();
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            contextMenu.editSection().appendItem(i18nString(UIStrings.rename), this.#handleContextMenuRename.bind(this, node), { jslogContext: 'rename' });
            contextMenu.editSection().appendItem(i18nString(UIStrings.makeACopy), this.#handleContextMenuCreate.bind(this, project, Platform.DevToolsPath.EmptyEncodedPathString, uiSourceCode), { jslogContext: 'make-a-copy' });
            contextMenu.editSection().appendItem(i18nString(UIStrings.delete), this.#handleContextMenuDelete.bind(this, uiSourceCode), { jslogContext: 'delete' });
        }
        void contextMenu.show();
    }
    async #handleSaveAs(uiSourceCode) {
        uiSourceCode.commitWorkingCopy();
        const contentData = await uiSourceCode.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(contentData)) {
            console.error(`Failed to retrieve content for ${uiSourceCode.url()}: ${contentData}`);
            Common.Console.Console.instance().error(i18nString(UIStrings.saveAsFailed), /* show=*/ false);
            return;
        }
        await Workspace.FileManager.FileManager.instance().save(this.#addJSExtension(uiSourceCode.url()), contentData, 
        /* forceSaveAs=*/ true);
        Workspace.FileManager.FileManager.instance().close(uiSourceCode.url());
    }
    #addJSExtension(url) {
        return Common.ParsedURL.ParsedURL.concatenate(url, '.js');
    }
    async #handleDeleteFolder(node) {
        const shouldRemove = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.actionCannotBeUndone), i18nString(UIStrings.deleteFolder), undefined, { jslogContext: 'delete-folder-confirmation' });
        if (shouldRemove) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideTabDeleteFolderContextMenu);
            const topNode = this.#findTopNonMergedNode(node);
            await this.#removeUISourceCodeFromProject(topNode);
            await this.#deleteDirectoryRecursively(topNode);
        }
    }
    async #removeUISourceCodeFromProject(node) {
        node.children().slice(0).forEach(async (child) => {
            await this.#removeUISourceCodeFromProject(child);
        });
        if (node instanceof NavigatorUISourceCodeTreeNode) {
            node.uiSourceCode().project().removeUISourceCode(node.uiSourceCode().url());
        }
    }
    async #deleteDirectoryRecursively(node) {
        if (!(node instanceof NavigatorFolderTreeNode)) {
            return;
        }
        await this.#networkPersistenceManager.project()?.deleteDirectoryRecursively(node.folderPath);
    }
    #findTopNonMergedNode(node) {
        // multiple folder nodes can be merged into one if it only contains one file
        // e.g. the folder of "abc.com/assets/css/button.css" can be "abc.com/assets/css"
        // find the top non-merged node (abc.com) recursively
        if (!node.isMerged) {
            return node;
        }
        if (!(node.parent instanceof NavigatorFolderTreeNode)) {
            return node;
        }
        return this.#findTopNonMergedNode(node.parent);
    }
    folderHovered(node, hovered) {
        if (node instanceof NavigatorGroupTreeNode && node.frame) {
            if (hovered) {
                const overlayModel = node.frame.resourceTreeModel().target().model(SDK.OverlayModel.OverlayModel);
                if (overlayModel) {
                    overlayModel.highlightFrame(node.frame.id);
                }
            }
            else {
                SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(this.#targetManager);
            }
        }
    }
    handleFolderContextMenu(contextMenu, node) {
        const activeNode = node instanceof NavigatorFolderTreeNode ? node.mergedLeafNode() : node;
        const path = activeNode instanceof NavigatorFolderTreeNode ? activeNode.folderPath :
            Platform.DevToolsPath.EmptyEncodedPathString;
        const project = activeNode.project || null;
        if (project?.type() !== Workspace.Workspace.projectTypes.ConnectableFileSystem) {
            NavigatorView.appendSearchItem(contextMenu, path);
        }
        if (!project) {
            return;
        }
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            const folderPath = Common.ParsedURL.ParsedURL.urlToRawPathString(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path), Host.Platform.isWin());
            contextMenu.revealSection().appendItem(i18nString(UIStrings.openFolder), () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(folderPath), { jslogContext: 'open-folder' });
            if (project.canCreateFile()) {
                contextMenu.defaultSection().appendItem(i18nString(UIStrings.newFile), () => {
                    this.#handleContextMenuCreate(project, path, undefined);
                }, { jslogContext: 'new-file' });
            }
        }
        else if (activeNode instanceof NavigatorFolderTreeNode && activeNode.origin && activeNode.folderPath) {
            const url = Common.ParsedURL.ParsedURL.concatenate(activeNode.origin, '/', activeNode.folderPath);
            const options = {
                isContentScript: activeNode.recursiveProperties.exclusivelyContentScripts || false,
                isKnownThirdParty: activeNode.recursiveProperties.exclusivelyThirdParty || false,
                isCurrentlyIgnoreListed: activeNode.recursiveProperties.exclusivelyIgnored || false,
            };
            for (const { text, callback, jslogContext } of this.#ignoreListManager.getIgnoreListFolderContextMenuItems(url, options)) {
                contextMenu.defaultSection().appendItem(text, callback, { jslogContext });
            }
        }
        if (project.canExcludeFolder(path)) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.excludeFolder), this.#handleContextMenuExclude.bind(this, project, path), { jslogContext: 'exclude-folder' });
        }
        if (project.type() === Workspace.Workspace.projectTypes.ConnectableFileSystem) {
            const automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
            const { automaticFileSystem } = automaticFileSystemManager;
            if (automaticFileSystem?.state === 'disconnected') {
                contextMenu.defaultSection().appendItem(i18nString(UIStrings.connectFolderToWorkspace), async () => {
                    await automaticFileSystemManager.connectAutomaticFileSystem(
                    /* addIfMissing= */ true);
                }, { jslogContext: 'automatic-workspace-folders.connect' });
            }
        }
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            if (Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !==
                Persistence.PlatformFileSystem.PlatformFileSystemType.OVERRIDES) {
                if (activeNode instanceof NavigatorGroupTreeNode) {
                    contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeFolderFromWorkspace), async () => {
                        const header = i18nString(UIStrings.areYouSureYouWantToRemoveThis, { PH1: activeNode.title });
                        const shouldRemove = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.workspaceStopSyncing), header, undefined, {
                            okButtonLabel: i18nString(UIStrings.remove),
                            jslogContext: 'remove-folder-from-workspace-confirmation',
                        });
                        if (shouldRemove) {
                            project.remove();
                        }
                    }, { jslogContext: 'remove-folder-from-workspace' });
                }
            }
            else if (!(activeNode instanceof NavigatorGroupTreeNode)) {
                contextMenu.defaultSection().appendItem(i18nString(UIStrings.delete), this.#handleDeleteFolder.bind(this, activeNode), { jslogContext: 'delete' });
            }
        }
        void contextMenu.show();
    }
    rename(node, creatingNewUISourceCode) {
        const uiSourceCode = node.uiSourceCode();
        node.rename(callback.bind(this));
        function callback(committed) {
            if (!creatingNewUISourceCode) {
                return;
            }
            if (!committed) {
                uiSourceCode.remove();
            }
            else if (this.contentElement.hasFocus()) {
                this.sourceSelected(uiSourceCode, true);
            }
        }
    }
    async create(project, path, uiSourceCodeToCopy) {
        let content = '';
        if (uiSourceCodeToCopy) {
            const contentDataOrError = await uiSourceCodeToCopy.requestContentData();
            content = TextUtils.ContentData.ContentData.textOr(contentDataOrError, '');
        }
        const uiSourceCode = await project.createFile(path, null, content);
        if (!uiSourceCode) {
            return;
        }
        this.sourceSelected(uiSourceCode, false);
        const node = this.revealUISourceCode(uiSourceCode, true);
        if (node) {
            await this.updateComplete;
            this.rename(node, true);
        }
    }
    #groupingChanged() {
        this.reset(true);
        this.#initGrouping();
        // Reset the workspace to repopulate filesystem folders.
        this.#resetWorkspace(this.#workspace);
        this.#workspace.uiSourceCodes().forEach(this.#addUISourceCode.bind(this));
    }
    #ignoreListChanged() {
        if (this.#navigatorJustMyCodeSetting.get()) {
            this.#groupingChanged();
        }
        else {
            this.rootNode.updateTitleRecursive();
        }
    }
    #initGrouping() {
        this.#groupByFrame = true;
        this.#groupByDomain = this.#navigatorGroupByFolderSetting.get();
        this.#groupByFolder = this.#groupByDomain;
        if (this.#navigatorGroupByAuthoredSetting) {
            this.#groupByAuthored = this.#navigatorGroupByAuthoredSetting.get();
        }
        else {
            this.#groupByAuthored = false;
        }
        this.#prevJustMyCode = this.#navigatorJustMyCodeSetting.get();
    }
    resetForTest(groupBy) {
        if (groupBy) {
            if (typeof groupBy.frame === 'boolean') {
                this.#groupByFrame = groupBy.frame;
            }
            if (typeof groupBy.domain === 'boolean') {
                this.#groupByDomain = groupBy.domain;
            }
            if (typeof groupBy.folder === 'boolean') {
                this.#groupByFolder = groupBy.folder;
            }
        }
        this.reset();
        this.#workspace.uiSourceCodes().forEach(this.#addUISourceCode.bind(this));
    }
    #discardFrame(frame, isAuthored) {
        if (isAuthored) {
            return;
        }
        const node = this.#frameNodes.get(frame);
        if (!node) {
            return;
        }
        if (node.parent) {
            node.parent.removeChild(node);
        }
        this.#frameNodes.delete(frame);
        for (const child of frame.childFrames) {
            this.#discardFrame(child, isAuthored);
        }
    }
    targetAdded(_target) {
    }
    targetRemoved(target) {
        const rootOrDeployed = this.#rootOrDeployedNode();
        const targetNode = rootOrDeployed.child('target:' + target.id());
        if (targetNode) {
            rootOrDeployed.removeChild(targetNode);
        }
    }
    #targetNameChanged(event) {
        const target = event.data;
        const targetNode = this.#rootOrDeployedNode().child('target:' + target.id());
        if (targetNode) {
            targetNode.setTitle(target.name());
        }
    }
}
export class NavigatorTreeNode {
    id;
    navigatorView;
    type;
    boostOrder = false;
    hasMappedFiles = false;
    #populated = false;
    isMerged = false;
    mergedTitle() {
        return this.title;
    }
    effectiveChildren() {
        return this.#children.filter(node => !node.isMerged);
    }
    parent;
    title;
    tooltip;
    recursiveProperties;
    #children = [];
    #childById = new Map();
    #disposed = false;
    constructor(navigatorView, id, type, tooltip) {
        this.id = id;
        this.navigatorView = navigatorView;
        this.type = type;
        this.tooltip = tooltip;
        this.recursiveProperties = {
            exclusivelySourceMapped: null,
            exclusivelyIgnored: null,
            exclusivelyContentScripts: null,
            exclusivelyThirdParty: null,
        };
    }
    isDisposed() {
        return this.#disposed;
    }
    dispose() {
        this.#disposed = true;
    }
    computedTooltip() {
        if (this.tooltip) {
            return this.tooltip;
        }
        const paths = [];
        let currentNode = this;
        while (currentNode && !currentNode.isRoot() && currentNode.type === this.type) {
            paths.push(currentNode.title);
            currentNode = currentNode.parent;
        }
        paths.reverse();
        let tooltip = paths.join('/');
        if (Boolean(this.recursiveProperties.exclusivelyIgnored)) {
            tooltip = i18nString(UIStrings.sIgnoreListed, { PH1: tooltip });
        }
        return tooltip;
    }
    updateTitle() {
    }
    updateTitleRecursive() {
        for (const child of this.children()) {
            child.updateTitleRecursive();
        }
        this.updateTitle();
    }
    updateTitleBubbleUp() {
        this.updateTitle();
        if (this.parent) {
            this.parent.updateTitleBubbleUp();
        }
    }
    isRoot() {
        return false;
    }
    hasChildren() {
        return true;
    }
    onattach() {
    }
    setTitle(_title) {
        throw new Error('Not implemented');
    }
    populate() {
        if (this.isPopulated()) {
            return;
        }
        if (this.parent) {
            this.parent.populate();
        }
        this.#populated = true;
        this.wasPopulated();
    }
    wasPopulated() {
        this.navigatorView.requestUpdate();
    }
    didAddChild(_node) {
        this.navigatorView.requestUpdate();
    }
    willRemoveChild(_node) {
    }
    isPopulated() {
        return this.#populated;
    }
    isEmpty() {
        return !this.#children.length;
    }
    children() {
        return this.#children;
    }
    child(id) {
        return this.#childById.get(id) ?? null;
    }
    appendChild(node) {
        Platform.ArrayUtilities.insertWithComparator(this.#children, node, NavigatorView.compareNodes);
        this.#childById.set(node.id, node);
        node.parent = this;
        this.didAddChild(node);
    }
    resortChild(node) {
        const idx = this.#children.indexOf(node);
        if (idx < 0) {
            return;
        }
        this.#children.splice(idx, 1);
        Platform.ArrayUtilities.insertWithComparator(this.#children, node, NavigatorView.compareNodes);
        this.navigatorView.requestUpdate();
    }
    removeChild(node) {
        const isSelected = this.navigatorView.isNodeSelectedOrDescendant(node);
        const idx = this.#children.findIndex(n => n.id === node.id);
        const nextNode = isSelected && idx >= 0 ?
            (this.#children[idx + 1] ?? this.#children[idx - 1] ?? (this !== this.navigatorView.rootNode ? this : null)) :
            null;
        if (nextNode) {
            this.navigatorView.selectNode(nextNode);
        }
        else {
            this.navigatorView.deselectIfDescendant(node);
        }
        this.willRemoveChild(node);
        if (idx >= 0) {
            this.#children.splice(idx, 1);
        }
        this.#childById.delete(node.id);
        node.parent = null;
        node.dispose();
        this.navigatorView.requestUpdate();
    }
    reset() {
        this.#children = [];
        this.#childById.clear();
    }
    updateId(newId) {
        if (this.parent) {
            this.parent.#childById.delete(this.id);
            this.parent.#childById.set(newId, this);
        }
        this.id = newId;
    }
}
export class NavigatorRootTreeNode extends NavigatorTreeNode {
    constructor(navigatorView) {
        super(navigatorView, '', Types.Root);
    }
    isRoot() {
        return true;
    }
}
export class NavigatorUISourceCodeTreeNode extends NavigatorTreeNode {
    #uiSourceCode;
    isEditing = false;
    #eventListeners;
    #frame;
    #renameCallback;
    constructor(navigatorView, uiSourceCode, frame) {
        super(navigatorView, 'UISourceCode:' + uiSourceCode.canonicalScriptId(), Types.File);
        this.#uiSourceCode = uiSourceCode;
        this.#frame = frame;
        this.recursiveProperties.exclusivelySourceMapped = uiSourceCode.contentType().isFromSourceMap();
        if (uiSourceCode.contentType().isScript()) {
            // These properties affect ignore-listing menus and only matter when the UISourceCode is a script
            this.recursiveProperties.exclusivelyThirdParty = uiSourceCode.isKnownThirdParty();
            this.recursiveProperties.exclusivelyContentScripts =
                uiSourceCode.project().type() === Workspace.Workspace.projectTypes.ContentScripts;
        }
        window.dispatchEvent(new CustomEvent('source-tree-file-added', { bubbles: true, cancelable: true, detail: this.#uiSourceCode.fullDisplayName() }));
        this.updateTitle();
        const updateTitleBound = this.updateTitle.bind(this, undefined);
        this.#eventListeners = [
            this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, updateTitleBound),
            this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, updateTitleBound),
            this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, updateTitleBound),
        ];
    }
    frame() {
        return this.#frame;
    }
    uiSourceCode() {
        return this.#uiSourceCode;
    }
    updateTitle(ignoreIsDirty) {
        const isIgnoreListed = this.navigatorView.ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(this.#uiSourceCode);
        this.recursiveProperties.exclusivelyIgnored =
            (this.#uiSourceCode.contentType().isScript() || isIgnoreListed) ? isIgnoreListed : null;
        let titleText = this.#uiSourceCode.displayName();
        if (!ignoreIsDirty && !this.isEditing && this.#uiSourceCode.isDirty()) {
            titleText = '*' + titleText;
        }
        this.title = titleText;
        let tooltip = this.#uiSourceCode.url();
        if (this.#uiSourceCode.contentType().isFromSourceMap()) {
            tooltip = i18nString(UIStrings.sFromSourceMap, { PH1: this.#uiSourceCode.displayName() });
        }
        if (isIgnoreListed) {
            tooltip = i18nString(UIStrings.sIgnoreListed, { PH1: tooltip });
        }
        this.tooltip = tooltip;
        this.updateId('UISourceCode:' + this.#uiSourceCode.canonicalScriptId());
        this.navigatorView.requestUpdate();
    }
    hasChildren() {
        return false;
    }
    dispose() {
        super.dispose();
        Common.EventTarget.removeEventListeners(this.#eventListeners);
        if (this.isEditing) {
            this.isEditing = false;
            this.navigatorView.stopRenamingNode(this);
        }
        const callback = this.#renameCallback;
        this.#renameCallback = undefined;
        if (callback) {
            callback(false);
        }
    }
    reveal(select) {
        let parent = this.parent;
        while (parent && parent !== this.navigatorView.rootNode) {
            parent.populate();
            this.navigatorView.expandNode(parent);
            parent = parent.parent;
        }
        if (select) {
            this.navigatorView.selectNode(this);
        }
    }
    rename(callback) {
        if (this.isDisposed()) {
            return;
        }
        this.#renameCallback = callback;
        this.navigatorView.startRenamingNode(this);
        this.isEditing = true;
        this.updateTitle(true);
    }
    async commitRename(newTitle) {
        if (this.isDisposed()) {
            return;
        }
        const oldTitle = this.title;
        if (newTitle !== oldTitle) {
            this.isEditing = false;
            this.title = newTitle;
            this.navigatorView.stopRenamingNode(this);
            this.navigatorView.requestUpdate();
            const success = await this.#uiSourceCode.rename(newTitle);
            if (this.isDisposed()) {
                return;
            }
            if (!success) {
                this.updateTitle();
                this.rename(this.#renameCallback);
                return;
            }
            this.parent?.resortChild(this);
        }
        this.#afterEditing(true);
    }
    cancelRename() {
        if (this.isDisposed()) {
            return;
        }
        this.#afterEditing(false);
    }
    #afterEditing(committed) {
        this.isEditing = false;
        this.navigatorView.stopRenamingNode(this);
        this.updateTitle();
        this.navigatorView.selectNode(this);
        this.navigatorView.requestUpdate();
        void this.navigatorView.updateComplete.then(() => {
            this.navigatorView.focus();
        });
        if (this.#renameCallback) {
            const cb = this.#renameCallback;
            this.#renameCallback = undefined;
            cb(committed);
        }
    }
}
export class NavigatorFolderTreeNode extends NavigatorTreeNode {
    project;
    folderPath;
    origin;
    title;
    constructor(navigatorView, project, id, type, folderPath, title, origin) {
        super(navigatorView, id, type);
        this.project = project;
        this.folderPath = folderPath;
        this.title = title;
        this.origin = origin;
    }
    computedTooltip() {
        if (this.isMerged) {
            return super.computedTooltip();
        }
        const leafNode = this.mergedLeafNode();
        if (leafNode !== this) {
            return leafNode.computedTooltip();
        }
        return super.computedTooltip();
    }
    #computeHasMappedFiles() {
        if (!this.project || this.project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
            return false;
        }
        const absoluteFileSystemPath = Common.ParsedURL.ParsedURL.concatenate(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(this.project.id()), '/', this.folderPath);
        const isOverrides = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(this.project) === 'overrides';
        return isOverrides ?
            this.navigatorView.settings
                .resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor)
                .get() :
            this.navigatorView.persistence.filePathHasBindings(absoluteFileSystemPath);
    }
    updateTitle() {
        let propName;
        for (propName in this.recursiveProperties) {
            let propValue = null;
            for (const child of this.children()) {
                if (child.recursiveProperties[propName] === false) {
                    propValue = false;
                    break;
                }
                else if (child.recursiveProperties[propName]) {
                    propValue = true;
                }
            }
            this.recursiveProperties[propName] = propValue;
        }
        this.hasMappedFiles = this.#computeHasMappedFiles();
        this.navigatorView.requestUpdate();
    }
    didAddChild(node) {
        const children = this.children();
        if (children.length === 1 && this.shouldMerge(node)) {
            node.isMerged = true;
            if (this.navigatorView.isNodeExpanded(this)) {
                node.populate();
                this.navigatorView.setNodeExpanded(node);
            }
        }
        else if (children.length === 2) {
            const oldNode = children[0] !== node ? children[0] : children[1];
            if (oldNode) {
                oldNode.isMerged = false;
                if (this.navigatorView.isNodeExpanded(this) || this.navigatorView.isNodeExpanded(oldNode)) {
                    this.populate();
                    oldNode.populate();
                    this.navigatorView.setNodeExpanded(this);
                    this.navigatorView.setNodeExpanded(oldNode);
                }
            }
        }
        super.didAddChild(node);
    }
    shouldMerge(node) {
        return this.type !== Types.Domain && node instanceof NavigatorFolderTreeNode;
    }
    mergedTitle() {
        const children = this.children();
        if (children.length === 1 && children[0].isMerged) {
            return this.title + '/' + children[0].mergedTitle();
        }
        return this.title;
    }
    mergedLeafNode() {
        const children = this.children();
        if (children.length === 1 && children[0].isMerged) {
            return children[0].mergedLeafNode();
        }
        return this;
    }
    effectiveChildren() {
        const leaf = this.mergedLeafNode();
        if (!leaf.isPopulated()) {
            return [];
        }
        return leaf.children().filter(node => !node.isMerged);
    }
}
export class NavigatorGroupTreeNode extends NavigatorTreeNode {
    project;
    title;
    frame;
    constructor(navigatorView, project, id, type, title, tooltip, frame) {
        super(navigatorView, id, type, tooltip);
        this.project = project;
        this.title = title;
        this.frame = frame;
        this.populate();
    }
    #computeHasMappedFiles() {
        if (!this.project || this.project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
            return false;
        }
        const fileSystemPath = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(this.project.id());
        const isOverrides = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(this.project) === 'overrides';
        return isOverrides ?
            this.navigatorView.settings
                .resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor)
                .get() :
            this.navigatorView.persistence.filePathHasBindings(fileSystemPath);
    }
    updateTitle() {
        const wasActive = this.hasMappedFiles;
        this.hasMappedFiles = this.#computeHasMappedFiles();
        const isActive = this.hasMappedFiles;
        if (this.project?.type() === Workspace.Workspace.projectTypes.FileSystem && wasActive !== isActive) {
            if (isActive) {
                this.navigatorView.expandNode(this);
            }
            else {
                this.navigatorView.collapseNode(this);
            }
        }
        this.navigatorView.requestUpdate();
    }
    setTitle(title) {
        this.title = title;
        this.navigatorView.requestUpdate();
    }
}
//# sourceMappingURL=NavigatorView.js.map