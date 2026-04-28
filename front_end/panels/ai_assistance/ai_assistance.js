var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/ai_assistance/AiAssistancePanel.js
import "./../../ui/kit/kit.js";
import * as Common6 from "./../../core/common/common.js";
import * as Host7 from "./../../core/host/host.js";
import * as i18n21 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as Root8 from "./../../core/root/root.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
import * as AiAssistanceModel7 from "./../../models/ai_assistance/ai_assistance.js";
import * as Annotations from "./../../models/annotations/annotations.js";
import * as Badges from "./../../models/badges/badges.js";
import * as Greendev from "./../../models/greendev/greendev.js";
import * as Workspace6 from "./../../models/workspace/workspace.js";
import * as Buttons9 from "./../../ui/components/buttons/buttons.js";
import * as Snackbars3 from "./../../ui/components/snackbars/snackbars.js";
import * as UIHelpers2 from "./../../ui/helpers/helpers.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
import * as Lit10 from "./../../ui/lit/lit.js";
import * as VisualLogging9 from "./../../ui/visual_logging/visual_logging.js";
import * as LighthousePanel from "./../lighthouse/lighthouse.js";
import * as NetworkForward from "./../network/forward/forward.js";
import * as NetworkPanel from "./../network/network.js";
import * as TimelinePanel2 from "./../timeline/timeline.js";

// gen/front_end/panels/ai_assistance/aiAssistancePanel.css.js
var aiAssistancePanel_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.toolbar-container {
  display: flex;
  flex-wrap: wrap;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
  flex: 0 0 auto;
  justify-content: space-between;
}

.ai-assistance-view-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  align-items: center;
  overflow: hidden;

  & .fill-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  devtools-split-view {
    width: 100%;
    height: 100%;
  }
}

.toolbar-feedback-link {
  color: var(--sys-color-primary);
  margin: 0 var(--sys-size-3);
  height: auto;
  font-size: var(--sys-typescale-body4-size);
}

/*# sourceURL=${import.meta.resolve("././aiAssistancePanel.css")} */`;

// gen/front_end/panels/ai_assistance/components/AccessibilityAgentMarkdownRenderer.js
import * as SDK from "./../../core/sdk/sdk.js";
import * as Lit2 from "./../../ui/lit/lit.js";
import * as PanelsCommon from "./../common/common.js";

// gen/front_end/panels/ai_assistance/components/MarkdownRendererWithCodeBlock.js
import * as Common from "./../../core/common/common.js";
import * as Platform from "./../../core/platform/platform.js";
import * as AiAssistanceModel from "./../../models/ai_assistance/ai_assistance.js";
import * as Logs from "./../../models/logs/logs.js";
import * as MarkdownView from "./../../ui/components/markdown_view/markdown_view.js";
import * as Lit from "./../../ui/lit/lit.js";
var { html } = Lit;
var MarkdownRendererWithCodeBlock = class extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  #revealableLink(revealable, label) {
    return html`<devtools-link @click=${(e) => {
      e.preventDefault();
      e.stopPropagation();
      void Common.Revealer.reveal(revealable);
    }}>${Platform.StringUtilities.trimEndWithMaxLength(label, 100)}</devtools-link>`;
  }
  #renderLink(href, fallbackText) {
    if (href.startsWith("#req-")) {
      const request = Logs.NetworkLog.NetworkLog.instance().requests().find((req) => req.requestId() === href.substring(5));
      if (request) {
        return this.#revealableLink(request, request.url());
      }
      return html`${fallbackText}`;
    }
    if (href.startsWith("#file-")) {
      const file = AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.getUISourceCodes().find((file2) => AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.get(file2) === Number(href.substring(6)));
      if (file) {
        return this.#revealableLink(file, file.name());
      }
      return html`${fallbackText}`;
    }
    return null;
  }
  templateForToken(token) {
    if (token.type === "link") {
      const link4 = this.#renderLink(token.href, token.text);
      if (link4) {
        return link4;
      }
    }
    if (token.type === "code") {
      const lines = token.text.split("\n");
      if (lines[0]?.trim() === "css") {
        token.lang = "css";
        token.text = lines.slice(1).join("\n");
      }
    }
    if (token.type === "codespan") {
      const matches = token.text.match(/^\[(.*)\]\((.+)\)$/);
      if (matches?.[2]) {
        const link4 = this.#renderLink(matches[2], matches[1]);
        if (link4) {
          return link4;
        }
      }
    }
    return super.templateForToken(token);
  }
};

// gen/front_end/panels/ai_assistance/components/AccessibilityAgentMarkdownRenderer.js
var { html: html2 } = Lit2.StaticHtml;
var { until } = Lit2.Directives;
var AccessibilityAgentMarkdownRenderer = class extends MarkdownRendererWithCodeBlock {
  mainFrameId;
  constructor(mainFrameId = "") {
    super();
    this.mainFrameId = mainFrameId;
  }
  templateForToken(token) {
    if (token.type === "link" && token.href.startsWith("#")) {
      const parsed = this.#parseLink(token.href);
      if (parsed) {
        const resultPromise = parsed.type === "path" ? this.#linkifyPath(parsed.path, token.text) : this.#linkifyNode(parsed.nodeId, token.text);
        return html2`<span>${until(resultPromise.then((node) => node || token.text), token.text)}</span>`;
      }
    }
    return super.templateForToken(token);
  }
  /**
   * Parses a link href to determine if it's a node ID or a DOM path.
   *
   * The AI agent is instructed to use #node-ID or #path-PATH, but
   * sometimes it omits the prefixes, in which case we try to detect
   * paths by looking for `#1,HTML` which is often how paths in LH
   * start.
   */
  #parseLink(href) {
    if (href.startsWith("#path-")) {
      return { type: "path", path: href.replace("#path-", "") };
    }
    if (href.startsWith("#1,HTML")) {
      return { type: "path", path: href.slice(1) };
    }
    let nodeIdStr = "";
    if (href.startsWith("#node-")) {
      nodeIdStr = href.replace("#node-", "");
    } else if (href.startsWith("#")) {
      nodeIdStr = href.slice(1);
    }
    if (nodeIdStr.trim() !== "") {
      const nodeId = Number(nodeIdStr);
      if (Number.isInteger(nodeId)) {
        return { type: "node", nodeId };
      }
    }
    return null;
  }
  /**
   * Linkifies a node using its backend node ID.
   */
  async #linkifyNode(backendNodeId, label) {
    if (backendNodeId === void 0) {
      return;
    }
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return void 0;
    }
    const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([backendNodeId]));
    const node = domNodesMap?.get(backendNodeId);
    if (!node) {
      return;
    }
    if (node.frameId() !== this.mainFrameId) {
      return;
    }
    const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
    return linkedNode;
  }
  /**
   * Linkifies a node using its full DOM path (e.g. "1,HTML,1,BODY,...").
   */
  async #linkifyPath(path, label) {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return void 0;
    }
    const nodeId = await domModel.pushNodeByPathToFrontend(path);
    if (!nodeId) {
      return;
    }
    const node = domModel.nodeForId(nodeId);
    if (!node) {
      return;
    }
    const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
    return linkedNode;
  }
};

// gen/front_end/panels/ai_assistance/components/ChatView.js
import "./../../ui/components/spinners/spinners.js";
import * as Host5 from "./../../core/host/host.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as Root4 from "./../../core/root/root.js";
import * as AiAssistanceModel6 from "./../../models/ai_assistance/ai_assistance.js";
import * as Buttons7 from "./../../ui/components/buttons/buttons.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
import { Directives as Directives6, html as html9, nothing as nothing7, render as render7 } from "./../../ui/lit/lit.js";

// gen/front_end/panels/ai_assistance/PatchWidget.js
var PatchWidget_exports = {};
__export(PatchWidget_exports, {
  PatchSuggestionState: () => PatchSuggestionState,
  PatchWidget: () => PatchWidget,
  isAiAssistancePatchingEnabled: () => isAiAssistancePatchingEnabled
});
import "./../../ui/legacy/legacy.js";
import "./../../ui/components/markdown_view/markdown_view.js";
import "./../../ui/components/spinners/spinners.js";
import "./../../ui/kit/kit.js";
import * as Common3 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as Root2 from "./../../core/root/root.js";
import * as AiAssistanceModel2 from "./../../models/ai_assistance/ai_assistance.js";
import * as Persistence2 from "./../../models/persistence/persistence.js";
import * as Workspace3 from "./../../models/workspace/workspace.js";
import * as WorkspaceDiff from "./../../models/workspace_diff/workspace_diff.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html4, nothing as nothing2, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
import * as ChangesPanel from "./../changes/changes.js";
import * as PanelCommon from "./../common/common.js";

// gen/front_end/panels/ai_assistance/SelectWorkspaceDialog.js
import "./../../ui/kit/kit.js";
import * as Common2 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as Persistence from "./../../models/persistence/persistence.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI from "./../../ui/legacy/legacy.js";
import { html as html3, nothing, render } from "./../../ui/lit/lit.js";

// gen/front_end/panels/ai_assistance/selectWorkspaceDialog.css.js
var selectWorkspaceDialog_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  :scope {
    width: 100%;
    box-shadow: none;
  }

  .dialog-header {
    margin: var(--sys-size-6) var(--sys-size-8) var(--sys-size-5);
    font: var(--sys-typescale-headline5);
  }

  .buttons {
    margin: var(--sys-size-6) var(--sys-size-8) var(--sys-size-8);
    display: flex;
    justify-content: flex-start;
    gap: var(--sys-size-5);
  }

  .main-content {
    color: var(--sys-color-on-surface-subtle);
    margin: 0 var(--sys-size-8);
    line-height: 18px;
  }

  .add-folder-button {
    margin-left: auto;
  }

  ul {
    list-style-type: none;
    padding: 0;
    margin: var(--sys-size-6) 0 var(--sys-size-4) 0;
    max-height: var(--sys-size-20);
    overflow-y: auto;
  }

  li {
    display: flex;
    align-items: center;
    color: var(--sys-color-on-surface-subtle);
    border-radius: 0 var(--sys-shape-corner-full) var(--sys-shape-corner-full) 0;
    height: var(--sys-size-10);
    margin: 0 var(--sys-size-8);
    padding-left: var(--sys-size-9);
  }

  li:hover, li.selected {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  li:focus {
    background-color: var(--app-color-navigation-drawer-background-selected);
  }

  .folder-icon {
    color: var(--icon-file-default);
    margin-right: var(--sys-size-4);
  }

  li.selected .folder-icon {
    color: var(--icon-file-authored);
  }

  .select-project-root {
    margin-bottom: var(--sys-size-6);
  }

  .theme-with-dark-background, :host-context(.theme-with-dark-background) {
    /*
      * List item is focused and selected: there is no valid state where the list item is focused but not selected.
    */
    li:focus {
      color: var(--app-color-navigation-drawer-label-selected);
      background-color: var(--app-color-navigation-drawer-background-selected);

      & .folder-icon {
        color: var(--app-color-navigation-drawer-label-selected);
      }
    }
  }

  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/*# sourceURL=${import.meta.resolve("././selectWorkspaceDialog.css")} */`;

// gen/front_end/panels/ai_assistance/SelectWorkspaceDialog.js
var UIStringsNotTranslate = {
  /**
   * @description Heading of dialog box which asks user to select a workspace folder.
   */
  selectFolder: "Select folder",
  /**
   * @description Heading of dialog box which asks user to select a workspace folder for a11y clients.
   */
  selectFolderAccessibleLabel: "Select a folder to apply changes",
  /**
   * @description Button text for canceling workspace selection.
   */
  cancel: "Cancel",
  /**
   * @description Button text for confirming the selected workspace folder.
   */
  select: "Select",
  /**
   * @description Button text for adding a workspace folder.
   */
  addFolder: "Add folder",
  /**
   * @description Explanation for selecting the correct workspace folder.
   */
  selectProjectRoot: "Source code from the selected folder is sent to Google. This data may be seen by human reviewers to improve this feature.",
  /**
   * @description Explanation for selecting the correct workspace folder when enterprise logging is off.
   */
  selectProjectRootNoLogging: "Source code from the selected folder is sent to Google. This data will not be used to improve Google\u2019s AI models. Your organization may change these settings at any time."
};
var lockedString = i18n.i18n.lockedString;
var SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW = (input, _output, target) => {
  const hasFolders = input.folders.length > 0;
  render(html3`
      <style>${selectWorkspaceDialog_css_default}</style>
      <h2 class="dialog-header">${lockedString(UIStringsNotTranslate.selectFolder)}</h2>
      <div class="main-content">
        <div class="select-project-root">${input.selectProjectRootText}</div>
        ${input.showAutomaticWorkspaceNudge ? html3`
          <!-- Hardcoding, because there is no 'getFormatLocalizedString' equivalent for 'lockedString' -->
          <div>
            Tip: provide a
            <devtools-link
              class="devtools-link"
              href="https://goo.gle/devtools-automatic-workspace-folders"
              jslogcontext="automatic-workspaces-documentation"
            >com.chrome.devtools.json</devtools-link>
            file to automatically connect your project to DevTools.
          </div>
        ` : nothing}
      </div>
      ${hasFolders ? html3`
        <ul role="listbox" aria-label=${lockedString(UIStringsNotTranslate.selectFolder)}
          aria-activedescendant=${input.folders.length > 0 ? `option-${input.selectedIndex}` : ""}>
          ${input.folders.map((folder, index) => {
    const optionId = `option-${index}`;
    return html3`
              <li
                id=${optionId}
                @mousedown=${() => input.onProjectSelected(index)}
                @keydown=${input.onListItemKeyDown}
                class=${index === input.selectedIndex ? "selected" : ""}
                aria-selected=${index === input.selectedIndex ? "true" : "false"}
                title=${folder.path}
                role="option"
                tabindex=${index === input.selectedIndex ? "0" : "-1"}
              >
                <devtools-icon class="folder-icon" name="folder"></devtools-icon>
                <span class="ellipsis">${folder.name}</span>
              </li>`;
  })}
        </ul>
      ` : nothing}
      <div class="buttons">
        <devtools-button
          title=${lockedString(UIStringsNotTranslate.cancel)}
          aria-label="Cancel"
          .jslogContext=${"cancel"}
          @click=${input.onCancelButtonClick}
          .variant=${"outlined"}>${lockedString(UIStringsNotTranslate.cancel)}</devtools-button>
        <devtools-button
          class="add-folder-button"
          title=${lockedString(UIStringsNotTranslate.addFolder)}
          aria-label="Add folder"
          .iconName=${"plus"}
          .jslogContext=${"add-folder"}
          @click=${input.onAddFolderButtonClick}
          .variant=${hasFolders ? "tonal" : "primary"}>${lockedString(UIStringsNotTranslate.addFolder)}</devtools-button>
        ${hasFolders ? html3`
          <devtools-button
            title=${lockedString(UIStringsNotTranslate.select)}
            aria-label="Select"
            @click=${input.onSelectButtonClick}
            .jslogContext=${"select"}
            .variant=${"primary"}>${lockedString(UIStringsNotTranslate.select)}</devtools-button>
        ` : nothing}
      </div>
    `, target);
};
var SelectWorkspaceDialog = class _SelectWorkspaceDialog extends UI.Widget.VBox {
  #view;
  #workspace = Workspace.Workspace.WorkspaceImpl.instance();
  #selectedIndex = 0;
  #onProjectSelected;
  #dialog;
  #automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
  #folders = [];
  constructor(options, view) {
    super();
    this.#onProjectSelected = options.onProjectSelected;
    this.#dialog = options.dialog;
    this.#updateProjectsAndFolders();
    if (options.currentProject) {
      this.#selectedIndex = Math.max(0, this.#folders.findIndex((folder) => folder.project === options.currentProject));
    }
    this.#view = view ?? SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.contentElement?.querySelector(".selected")?.focus();
    });
  }
  wasShown() {
    super.wasShown();
    this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);
  }
  willHide() {
    super.willHide();
    this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
    this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);
  }
  #onListItemKeyDown(event) {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        this.#selectedIndex = Math.min(this.#selectedIndex + 1, this.#folders.length - 1);
        const targetItem = this.contentElement.querySelectorAll("li")[this.#selectedIndex];
        targetItem?.scrollIntoView({ block: "nearest", inline: "nearest" });
        targetItem?.focus({ preventScroll: true });
        this.requestUpdate();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        this.#selectedIndex = Math.max(this.#selectedIndex - 1, 0);
        const targetItem = this.contentElement.querySelectorAll("li")[this.#selectedIndex];
        targetItem?.scrollIntoView({ block: "nearest", inline: "nearest" });
        targetItem?.focus({ preventScroll: true });
        this.requestUpdate();
        break;
      }
      case "Enter":
        event.preventDefault();
        this.#onSelectButtonClick();
        break;
    }
  }
  #onSelectButtonClick() {
    const selectedFolder = this.#folders[this.#selectedIndex];
    if (selectedFolder.project) {
      this.#dialog.hide();
      this.#onProjectSelected(selectedFolder.project);
    } else {
      void this.#connectToAutomaticFilesystem();
    }
  }
  performUpdate() {
    const loggingEnabled = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue !== Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    const viewInput = {
      folders: this.#folders,
      selectedIndex: this.#selectedIndex,
      selectProjectRootText: loggingEnabled ? lockedString(UIStringsNotTranslate.selectProjectRoot) : lockedString(UIStringsNotTranslate.selectProjectRootNoLogging),
      showAutomaticWorkspaceNudge: this.#automaticFileSystemManager.automaticFileSystem === null && this.#automaticFileSystemManager.availability === "available",
      onProjectSelected: (index) => {
        this.#selectedIndex = index;
        this.requestUpdate();
      },
      onSelectButtonClick: this.#onSelectButtonClick.bind(this),
      onCancelButtonClick: () => {
        this.#dialog.hide();
      },
      onAddFolderButtonClick: () => {
        void this.#addFileSystem();
      },
      onListItemKeyDown: this.#onListItemKeyDown.bind(this)
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
  async #addFileSystem() {
    await Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
    this.contentElement?.querySelector('[aria-label="Select"]')?.shadowRoot?.querySelector("button")?.focus();
  }
  async #connectToAutomaticFilesystem() {
    const success = await this.#automaticFileSystemManager.connectAutomaticFileSystem(
      /* addIfMissing= */
      true
    );
    if (!success) {
      this.#dialog.hide();
    }
  }
  #updateProjectsAndFolders() {
    this.#folders = [];
    const automaticFileSystem = this.#automaticFileSystemManager.automaticFileSystem;
    if (automaticFileSystem) {
      this.#folders.push({
        name: Common2.ParsedURL.ParsedURL.extractName(automaticFileSystem.root),
        path: automaticFileSystem.root,
        automaticFileSystem
      });
    }
    const projects = this.#workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem).filter((project) => project instanceof Persistence.FileSystemWorkspaceBinding.FileSystem && project.fileSystem().type() === Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT);
    for (const project of projects) {
      if (automaticFileSystem && project === this.#workspace.projectForFileSystemRoot(automaticFileSystem.root)) {
        this.#folders[0].project = project;
        continue;
      }
      this.#folders.push({
        name: Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(project.displayName()),
        path: Common2.ParsedURL.ParsedURL.urlToRawPathString(project.id(), Host.Platform.isWin()),
        project
      });
    }
  }
  #onProjectAdded(event) {
    const addedProject = event.data;
    const automaticFileSystem = this.#automaticFileSystemManager.automaticFileSystem;
    if (automaticFileSystem && addedProject === this.#workspace.projectForFileSystemRoot(automaticFileSystem.root)) {
      this.#dialog.hide();
      this.#onProjectSelected(addedProject);
      return;
    }
    this.#updateProjectsAndFolders();
    const projectIndex = this.#folders.findIndex((folder) => folder.project === addedProject);
    if (projectIndex !== -1) {
      this.#selectedIndex = projectIndex;
    }
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.contentElement?.querySelector(".selected")?.scrollIntoView();
    });
  }
  #onProjectRemoved() {
    const selectedProject = this.#selectedIndex >= 0 && this.#selectedIndex < this.#folders.length ? this.#folders[this.#selectedIndex].project : null;
    this.#updateProjectsAndFolders();
    if (selectedProject) {
      const projectIndex = this.#folders.findIndex((folder) => folder.project === selectedProject);
      this.#selectedIndex = projectIndex === -1 ? Math.min(this.#folders.length - 1, this.#selectedIndex) : projectIndex;
    } else {
      this.#selectedIndex = 0;
    }
    this.requestUpdate();
  }
  static show(onProjectSelected, currentProject) {
    const dialog3 = new UI.Dialog.Dialog("select-workspace");
    dialog3.setAriaLabel(UIStringsNotTranslate.selectFolderAccessibleLabel);
    dialog3.setMaxContentSize(new Geometry.Size(384, 340));
    dialog3.setSizeBehavior(
      "SetExactWidthMaxHeight"
      /* UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */
    );
    dialog3.setDimmed(true);
    new _SelectWorkspaceDialog({ dialog: dialog3, onProjectSelected, currentProject }).show(dialog3.contentElement);
    dialog3.show();
  }
};

// gen/front_end/panels/ai_assistance/PatchWidget.js
var UIStringsNotTranslate2 = {
  /**
   * @description Text displayed for showing patch widget view.
   */
  unsavedChanges: "Unsaved changes",
  /**
   * @description Loading text displayed as a summary title when the patch suggestion is getting loaded
   */
  applyingToWorkspace: "Applying to workspace\u2026",
  /**
   * @description Button text for staging changes to workspace.
   */
  applyToWorkspace: "Apply to workspace",
  /**
   * @description Button text to change the selected workspace
   */
  change: "Change",
  /**
   * @description Accessible title of the Change button to indicate that
   * the button can be used to change the root folder.
   */
  changeRootFolder: "Change project root folder",
  /**
   * @description Button text to cancel applying to workspace
   */
  cancel: "Cancel",
  /**
   * @description Button text to discard the suggested changes and not save them to file system
   */
  discard: "Discard",
  /**
   * @description Button text to save all the suggested changes to file system
   */
  saveAll: "Save all",
  /**
   * @description Header text after the user saved the changes to the disk.
   */
  savedToDisk: "Saved to disk",
  /**
   * @description Disclaimer text shown for using code snippets with caution
   */
  codeDisclaimer: "Use code snippets with caution",
  /**
   * @description Tooltip text for the info icon beside the "Apply to workspace" button
   */
  applyToWorkspaceTooltip: "Source code from the selected folder is sent to Google to generate code suggestions.",
  /**
   * @description Tooltip text for the info icon beside the "Apply to workspace" button when enterprise logging is off
   */
  applyToWorkspaceTooltipNoLogging: "Source code from the selected folder is sent to Google to generate code suggestions. This data will not be used to improve Google\u2019s AI models.",
  /**
   * @description The footer disclaimer that links to more information
   * about the AI feature. Same text as in ChatView.
   */
  learnMore: "Learn more",
  /**
   * @description Header text for the AI-powered code suggestions disclaimer dialog.
   */
  freDisclaimerHeader: "Apply changes directly to your project\u2019s source code",
  /**
   * @description First disclaimer item text for the fre dialog.
   */
  freDisclaimerTextAiWontAlwaysGetItRight: "This feature uses AI and won\u2019t always get it right",
  /**
   * @description Second disclaimer item text for the fre dialog.
   */
  freDisclaimerTextPrivacy: "To generate code suggestions, source code from the selected folder is sent to Google. This data may be seen by human reviewers to improve this feature.",
  /**
   * @description Second disclaimer item text for the fre dialog when enterprise logging is off.
   */
  freDisclaimerTextPrivacyNoLogging: "To generate code suggestions, source code from the selected folder is sent to Google. This data will not be used to improve Google\u2019s AI models. Your organization may change these settings at any time.",
  /**
   * @description Third disclaimer item text for the fre dialog.
   */
  freDisclaimerTextUseWithCaution: "Use generated code snippets with caution",
  /**
   * @description Title of the link opening data that was used to
   * produce a code suggestion.
   */
  viewUploadedFiles: "View data sent to Google",
  /**
   * @description Text indicating that a link opens in a new tab (for a11y).
   */
  opensInNewTab: "(opens in a new tab)",
  /**
   * @description Generic error text for the case the changes were not applied to the workspace.
   */
  genericErrorMessage: "Changes couldn\u2019t be applied to your workspace."
};
var lockedString2 = i18n3.i18n.lockedString;
var CODE_SNIPPET_WARNING_URL = "https://support.google.com/legal/answer/13505487";
var { widget } = UI2.Widget;
var PatchSuggestionState;
(function(PatchSuggestionState2) {
  PatchSuggestionState2["INITIAL"] = "initial";
  PatchSuggestionState2["LOADING"] = "loading";
  PatchSuggestionState2["SUCCESS"] = "success";
  PatchSuggestionState2["ERROR"] = "error";
})(PatchSuggestionState || (PatchSuggestionState = {}));
var SelectedProjectType;
(function(SelectedProjectType2) {
  SelectedProjectType2["NONE"] = "none";
  SelectedProjectType2["REGULAR"] = "regular";
  SelectedProjectType2["AUTOMATIC_DISCONNECTED"] = "automaticDisconnected";
  SelectedProjectType2["AUTOMATIC_CONNECTED"] = "automaticConnected";
})(SelectedProjectType || (SelectedProjectType = {}));
var DEFAULT_VIEW = (input, output, target) => {
  if (!input.changeSummary && input.patchSuggestionState === PatchSuggestionState.INITIAL) {
    return;
  }
  output.changeRef = output.changeRef ?? Directives2.createRef();
  output.summaryRef = output.summaryRef ?? Directives2.createRef();
  function renderSourcesLink() {
    if (!input.sources) {
      return nothing2;
    }
    return html4`<devtools-link
          class="link"
          title="${UIStringsNotTranslate2.viewUploadedFiles} ${UIStringsNotTranslate2.opensInNewTab}"
          href="data:text/plain;charset=utf-8,${encodeURIComponent(input.sources)}"
          jslogcontext="files-used-in-patching">
          ${UIStringsNotTranslate2.viewUploadedFiles}
        </devtools-link>`;
  }
  function renderHeader() {
    if (input.savedToDisk) {
      return html4`
            <devtools-icon class="green-bright-icon summary-badge" name="check-circle"></devtools-icon>
            <span class="header-text">
              ${lockedString2(UIStringsNotTranslate2.savedToDisk)}
            </span>
          `;
    }
    if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
      return html4`
            <devtools-icon class="on-tonal-icon summary-badge" name="difference"></devtools-icon>
            <span class="header-text">
              ${lockedString2(`File changes in ${input.projectName}`)}
            </span>
            <devtools-icon
              class="arrow"
              name="chevron-down"
            ></devtools-icon>
          `;
    }
    return html4`
          <devtools-icon class="on-tonal-icon summary-badge" name="pen-spark"></devtools-icon>
          <span class="header-text">
            ${lockedString2(UIStringsNotTranslate2.unsavedChanges)}
          </span>
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        `;
  }
  function renderContent() {
    if (!input.changeSummary && input.patchSuggestionState === PatchSuggestionState.INITIAL || input.savedToDisk) {
      return nothing2;
    }
    if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
      return html4`${widget(ChangesPanel.CombinedDiffView.CombinedDiffView, {
        workspaceDiff: input.workspaceDiff,
        // Ignore user creates inspector-stylesheets
        ignoredUrls: ["inspector://"]
      })}`;
    }
    return html4`<devtools-code-block
          .code=${input.changeSummary ?? ""}
          .codeLang=${"css"}
          .displayNotice=${true}
        ></devtools-code-block>
        ${input.patchSuggestionState === PatchSuggestionState.ERROR ? html4`<div class="error-container">
              <devtools-icon name="cross-circle-filled"></devtools-icon>${lockedString2(UIStringsNotTranslate2.genericErrorMessage)} ${renderSourcesLink()}
            </div>` : nothing2}`;
  }
  function renderFooter() {
    if (input.savedToDisk) {
      return nothing2;
    }
    if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
      return html4`
          <div class="footer">
            <div class="left-side">
              <devtools-link class="link disclaimer-link" href="https://support.google.com/legal/answer/13505487" jslogcontext="code-disclaimer">
                ${lockedString2(UIStringsNotTranslate2.codeDisclaimer)}
              </devtools-link>
              ${renderSourcesLink()}
            </div>
            <div class="save-or-discard-buttons">
              <devtools-button
                @click=${input.onDiscard}
                .jslogContext=${"patch-widget.discard"}
                .variant=${"outlined"}>
                  ${lockedString2(UIStringsNotTranslate2.discard)}
              </devtools-button>
              <devtools-button
                @click=${input.onSaveAll}
                .jslogContext=${"patch-widget.save-all"}
                .variant=${"primary"}>
                  ${lockedString2(UIStringsNotTranslate2.saveAll)}
              </devtools-button>
            </div>
          </div>
          `;
    }
    const iconName = input.projectType === SelectedProjectType.AUTOMATIC_DISCONNECTED ? "folder-off" : input.projectType === SelectedProjectType.AUTOMATIC_CONNECTED ? "folder-asterisk" : "folder";
    return html4`
        <div class="footer">
          ${input.projectName ? html4`
            <div class="change-workspace" jslog=${VisualLogging.section("patch-widget.workspace")}>
                <devtools-icon .name=${iconName}></devtools-icon>
                <span class="folder-name" title=${input.projectPath}>${input.projectName}</span>
              ${input.onChangeWorkspaceClick ? html4`
                <devtools-button
                  @click=${input.onChangeWorkspaceClick}
                  .jslogContext=${"change-workspace"}
                  .variant=${"text"}
                  .title=${lockedString2(UIStringsNotTranslate2.changeRootFolder)}
                  .disabled=${input.patchSuggestionState === PatchSuggestionState.LOADING}
                  ${Directives2.ref(output.changeRef)}
                >${lockedString2(UIStringsNotTranslate2.change)}</devtools-button>
              ` : nothing2}
            </div>
          ` : nothing2}
          <div class="apply-to-workspace-container" aria-live="polite">
            ${input.patchSuggestionState === PatchSuggestionState.LOADING ? html4`
              <div class="loading-text-container" jslog=${VisualLogging.section("patch-widget.apply-to-workspace-loading")}>
                <devtools-spinner></devtools-spinner>
                <span>
                  ${lockedString2(UIStringsNotTranslate2.applyingToWorkspace)}
                </span>
              </div>
            ` : html4`
                <devtools-button
                @click=${input.onApplyToWorkspace}
                .jslogContext=${"patch-widget.apply-to-workspace"}
                .variant=${"outlined"}>
                ${lockedString2(UIStringsNotTranslate2.applyToWorkspace)}
              </devtools-button>
            `}
            ${input.patchSuggestionState === PatchSuggestionState.LOADING ? html4`<devtools-button
              @click=${input.onCancel}
              .jslogContext=${"cancel"}
              .variant=${"outlined"}>
              ${lockedString2(UIStringsNotTranslate2.cancel)}
            </devtools-button>` : nothing2}
            <devtools-button
              aria-details="info-tooltip"
              .jslogContext=${"patch-widget.info-tooltip-trigger"}
              .iconName=${"info"}
              .variant=${"icon"}
            ></devtools-button>
            <devtools-tooltip
                id="info-tooltip"
                variant="rich"
              >
             <div class="info-tooltip-container">
               ${input.applyToWorkspaceTooltipText}
               <button
                 class="link tooltip-link"
                 role="link"
                 jslog=${VisualLogging.link("open-ai-settings").track({
      click: true
    })}
                 @click=${input.onLearnMoreTooltipClick}
               >${lockedString2(UIStringsNotTranslate2.learnMore)}</button>
             </div>
            </devtools-tooltip>
          </div>
        </div>`;
  }
  const template = input.savedToDisk ? html4`
          <div class="change-summary saved-to-disk" role="status" aria-live="polite">
            <div class="header-container">
             ${renderHeader()}
             </div>
          </div>` : html4`
          <details class="change-summary" jslog=${VisualLogging.section("patch-widget")}>
            <summary class="header-container" ${Directives2.ref(output.summaryRef)}>
              ${renderHeader()}
            </summary>
            ${renderContent()}
            ${renderFooter()}
          </details>
        `;
  render2(template, target);
};
var PatchWidget = class extends UI2.Widget.Widget {
  changeSummary = "";
  changeManager;
  // Whether the user completed first run experience dialog or not.
  #aiPatchingFreCompletedSetting = Common3.Settings.Settings.instance().createSetting("ai-assistance-patching-fre-completed", false);
  #projectIdSetting = Common3.Settings.Settings.instance().createSetting("ai-assistance-patching-selected-project-id", "");
  #view;
  #viewOutput = {};
  #aidaClient;
  #applyPatchAbortController;
  #project;
  #patchSources;
  #savedToDisk;
  #loggingEnabled;
  // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
  #patchSuggestionState = PatchSuggestionState.INITIAL;
  #workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
  #workspace = Workspace3.Workspace.WorkspaceImpl.instance();
  #automaticFileSystem = Persistence2.AutomaticFileSystemManager.AutomaticFileSystemManager.instance().automaticFileSystem;
  #applyToDisconnectedAutomaticWorkspace = false;
  // `rpcId` from the `applyPatch` request
  #rpcId = null;
  constructor(element, view = DEFAULT_VIEW, opts) {
    super(element);
    this.#aidaClient = opts?.aidaClient ?? new Host2.AidaClient.AidaClient();
    this.#loggingEnabled = Root2.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue !== Root2.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    this.#view = view;
    this.requestUpdate();
  }
  #onLearnMoreTooltipClick() {
    void UI2.ViewManager.ViewManager.instance().showView("chrome-ai");
  }
  #getDisplayedProject() {
    if (this.#project) {
      return {
        projectName: Common3.ParsedURL.ParsedURL.encodedPathToRawPathString(this.#project.displayName()),
        projectPath: Common3.ParsedURL.ParsedURL.urlToRawPathString(this.#project.id(), Host2.Platform.isWin())
      };
    }
    if (this.#automaticFileSystem) {
      return {
        projectName: Common3.ParsedURL.ParsedURL.extractName(this.#automaticFileSystem.root),
        projectPath: this.#automaticFileSystem.root
      };
    }
    return {
      projectName: "",
      projectPath: Platform4.DevToolsPath.EmptyRawPathString
    };
  }
  #shouldShowChangeButton() {
    const automaticFileSystemProject = this.#automaticFileSystem ? this.#workspace.projectForFileSystemRoot(this.#automaticFileSystem.root) : null;
    const regularProjects = this.#workspace.projectsForType(Workspace3.Workspace.projectTypes.FileSystem).filter((project) => project instanceof Persistence2.FileSystemWorkspaceBinding.FileSystem && project.fileSystem().type() === Persistence2.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT).filter((project) => project !== automaticFileSystemProject);
    return regularProjects.length > 0;
  }
  #getSelectedProjectType(projectPath) {
    if (this.#automaticFileSystem && this.#automaticFileSystem.root === projectPath) {
      return this.#project ? SelectedProjectType.AUTOMATIC_CONNECTED : SelectedProjectType.AUTOMATIC_DISCONNECTED;
    }
    return this.#project ? SelectedProjectType.NONE : SelectedProjectType.REGULAR;
  }
  performUpdate() {
    const { projectName, projectPath } = this.#getDisplayedProject();
    this.#view({
      workspaceDiff: this.#workspaceDiff,
      changeSummary: this.changeSummary,
      patchSuggestionState: this.#patchSuggestionState,
      sources: this.#patchSources,
      projectName,
      projectPath,
      projectType: this.#getSelectedProjectType(projectPath),
      savedToDisk: this.#savedToDisk,
      applyToWorkspaceTooltipText: this.#loggingEnabled ? lockedString2(UIStringsNotTranslate2.applyToWorkspaceTooltip) : lockedString2(UIStringsNotTranslate2.applyToWorkspaceTooltipNoLogging),
      onLearnMoreTooltipClick: this.#onLearnMoreTooltipClick.bind(this),
      onApplyToWorkspace: this.#onApplyToWorkspace.bind(this),
      onCancel: () => {
        this.#applyPatchAbortController?.abort();
      },
      onDiscard: this.#onDiscard.bind(this),
      onSaveAll: this.#onSaveAll.bind(this),
      onChangeWorkspaceClick: this.#shouldShowChangeButton() ? this.#showSelectWorkspaceDialog.bind(this, { applyPatch: false }) : void 0
    }, this.#viewOutput, this.contentElement);
  }
  wasShown() {
    super.wasShown();
    this.#selectDefaultProject();
    if (isAiAssistancePatchingEnabled()) {
      this.#workspace.addEventListener(Workspace3.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
      this.#workspace.addEventListener(Workspace3.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);
    }
  }
  willHide() {
    super.willHide();
    this.#applyToDisconnectedAutomaticWorkspace = false;
    if (isAiAssistancePatchingEnabled()) {
      this.#workspace.removeEventListener(Workspace3.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
      this.#workspace.removeEventListener(Workspace3.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);
    }
  }
  async #showFreDisclaimerIfNeeded() {
    const isAiPatchingFreCompleted = this.#aiPatchingFreCompletedSetting.get();
    if (isAiPatchingFreCompleted) {
      return true;
    }
    const iconName = AiAssistanceModel2.AiUtils.getIconName();
    const result = await PanelCommon.FreDialog.show({
      header: { iconName, text: lockedString2(UIStringsNotTranslate2.freDisclaimerHeader) },
      reminderItems: [
        {
          iconName: "psychiatry",
          content: lockedString2(UIStringsNotTranslate2.freDisclaimerTextAiWontAlwaysGetItRight)
        },
        {
          iconName: "google",
          content: this.#loggingEnabled ? lockedString2(UIStringsNotTranslate2.freDisclaimerTextPrivacy) : lockedString2(UIStringsNotTranslate2.freDisclaimerTextPrivacyNoLogging)
        },
        {
          iconName: "warning",
          // clang-format off
          content: html4`<devtools-link
            href=${CODE_SNIPPET_WARNING_URL}
            class="link devtools-link"
            jslogcontext="code-snippets-explainer.patch-widget"
          >${lockedString2(UIStringsNotTranslate2.freDisclaimerTextUseWithCaution)}</devtools-link>`
          // clang-format on
        }
      ],
      onLearnMoreClick: () => {
        void UI2.ViewManager.ViewManager.instance().showView("chrome-ai");
      },
      ariaLabel: lockedString2(UIStringsNotTranslate2.freDisclaimerHeader),
      learnMoreButtonText: lockedString2(UIStringsNotTranslate2.learnMore)
    });
    if (result) {
      this.#aiPatchingFreCompletedSetting.set(true);
    }
    return result;
  }
  #selectDefaultProject() {
    const project = this.#automaticFileSystem ? this.#workspace.projectForFileSystemRoot(this.#automaticFileSystem.root) : this.#workspace.project(this.#projectIdSetting.get());
    if (project) {
      this.#project = project;
    } else {
      this.#project = void 0;
      this.#projectIdSetting.set("");
    }
    this.requestUpdate();
  }
  #onProjectAdded(event) {
    const addedProject = event.data;
    if (this.#applyToDisconnectedAutomaticWorkspace && this.#automaticFileSystem && addedProject === this.#workspace.projectForFileSystemRoot(this.#automaticFileSystem.root)) {
      this.#applyToDisconnectedAutomaticWorkspace = false;
      this.#project = addedProject;
      void this.#applyPatchAndUpdateUI();
    } else if (this.#project === void 0) {
      this.#selectDefaultProject();
    }
  }
  #onProjectRemoved() {
    if (this.#project && !this.#workspace.project(this.#project.id())) {
      this.#projectIdSetting.set("");
      this.#project = void 0;
      this.requestUpdate();
    }
  }
  #showSelectWorkspaceDialog(options = { applyPatch: false }) {
    const onProjectSelected = (project) => {
      this.#project = project;
      this.#projectIdSetting.set(project.id());
      if (options.applyPatch) {
        void this.#applyPatchAndUpdateUI();
      } else {
        this.requestUpdate();
        void this.updateComplete.then(() => {
          this.contentElement?.querySelector(".apply-to-workspace-container devtools-button")?.shadowRoot?.querySelector("button")?.focus();
        });
      }
    };
    SelectWorkspaceDialog.show(onProjectSelected, this.#project);
  }
  async #onApplyToWorkspace() {
    if (!isAiAssistancePatchingEnabled()) {
      return;
    }
    const freDisclaimerCompleted = await this.#showFreDisclaimerIfNeeded();
    if (!freDisclaimerCompleted) {
      return;
    }
    if (this.#project) {
      await this.#applyPatchAndUpdateUI();
    } else if (this.#automaticFileSystem) {
      this.#applyToDisconnectedAutomaticWorkspace = true;
      await Persistence2.AutomaticFileSystemManager.AutomaticFileSystemManager.instance().connectAutomaticFileSystem(
        /* addIfMissing= */
        true
      );
    } else {
      this.#showSelectWorkspaceDialog({ applyPatch: true });
    }
  }
  /**
   * The modified files excluding inspector stylesheets
   */
  get #modifiedFiles() {
    return this.#workspaceDiff.modifiedUISourceCodes().filter((modifiedUISourceCode) => {
      return !modifiedUISourceCode.url().startsWith("inspector://");
    });
  }
  async #applyPatchAndUpdateUI() {
    const changeSummary = this.changeSummary;
    if (!changeSummary) {
      throw new Error("Change summary does not exist");
    }
    this.#patchSuggestionState = PatchSuggestionState.LOADING;
    this.#rpcId = null;
    this.requestUpdate();
    const { response, processedFiles } = await this.#applyPatch(changeSummary);
    if (response && "rpcId" in response && response.rpcId) {
      this.#rpcId = response.rpcId;
    }
    const hasChanges = this.#modifiedFiles.length > 0;
    if (response?.type === "answer" && hasChanges) {
      this.#patchSuggestionState = PatchSuggestionState.SUCCESS;
    } else if (response?.type === "error" && response.error === "abort") {
      this.#patchSuggestionState = PatchSuggestionState.INITIAL;
    } else {
      this.#patchSuggestionState = PatchSuggestionState.ERROR;
    }
    this.#patchSources = `Filenames in ${this.#project?.displayName()}.
Files:
${processedFiles.map((filename) => `* ${filename}`).join("\n")}`;
    this.requestUpdate();
    if (this.#patchSuggestionState === PatchSuggestionState.SUCCESS) {
      void this.updateComplete.then(() => {
        this.#viewOutput.summaryRef?.value?.focus();
      });
    }
  }
  #onDiscard() {
    for (const modifiedUISourceCode of this.#modifiedFiles) {
      modifiedUISourceCode.resetWorkingCopy();
    }
    this.#patchSuggestionState = PatchSuggestionState.INITIAL;
    this.#patchSources = void 0;
    void this.changeManager?.popStashedChanges();
    this.#submitRating(
      "NEGATIVE"
      /* Host.AidaClient.Rating.NEGATIVE */
    );
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#viewOutput.changeRef?.value?.focus();
    });
  }
  #onSaveAll() {
    for (const modifiedUISourceCode of this.#modifiedFiles) {
      modifiedUISourceCode.commitWorkingCopy();
    }
    void this.changeManager?.stashChanges().then(() => {
      this.changeManager?.dropStashedChanges();
    });
    this.#savedToDisk = true;
    this.#submitRating(
      "POSITIVE"
      /* Host.AidaClient.Rating.POSITIVE */
    );
    this.requestUpdate();
  }
  #submitRating(rating) {
    if (!this.#rpcId) {
      return;
    }
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: this.#rpcId,
      disable_user_content_logging: true,
      do_conversation_client_event: {
        user_feedback: {
          sentiment: rating
        }
      }
    });
  }
  async #applyPatch(changeSummary) {
    if (!this.#project) {
      throw new Error("Project does not exist");
    }
    this.#applyPatchAbortController = new AbortController();
    const agent = new AiAssistanceModel2.PatchAgent.PatchAgent({
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: false,
      project: this.#project
    });
    const { responses, processedFiles } = await agent.applyChanges(changeSummary, { signal: this.#applyPatchAbortController.signal });
    return {
      response: responses.at(-1),
      processedFiles
    };
  }
};
function isAiAssistancePatchingEnabled() {
  return Boolean(Root2.Runtime.hostConfig.devToolsFreestyler?.patching);
}
window.aiAssistanceTestPatchPrompt = async (projectName, changeSummary, expectedChanges) => {
  if (!isAiAssistancePatchingEnabled()) {
    return;
  }
  const workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
  const workspace = Workspace3.Workspace.WorkspaceImpl.instance();
  const project = workspace.projectsForType(Workspace3.Workspace.projectTypes.FileSystem).filter((project2) => project2 instanceof Persistence2.FileSystemWorkspaceBinding.FileSystem && project2.fileSystem().type() === Persistence2.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT).find((project2) => project2.displayName() === projectName);
  if (!project) {
    throw new Error("project not found");
  }
  const aidaClient = new Host2.AidaClient.AidaClient();
  const agent = new AiAssistanceModel2.PatchAgent.PatchAgent({
    aidaClient,
    serverSideLoggingEnabled: false,
    project
  });
  try {
    const assertionFailures = [];
    const { processedFiles, responses } = await agent.applyChanges(changeSummary);
    if (responses.at(-1)?.type === "error") {
      return {
        error: "failed to patch",
        debugInfo: {
          responses,
          processedFiles
        }
      };
    }
    for (const file of processedFiles) {
      const change = expectedChanges.find((change2) => change2.path === file);
      if (!change) {
        assertionFailures.push(`Patched ${file} that was not expected`);
        break;
      }
      const agentProject = agent.agentProject;
      const content = await agentProject.readFile(file);
      if (!content) {
        throw new Error(`${file} has no content`);
      }
      for (const m of change.matches) {
        if (!content.match(new RegExp(m, "gm"))) {
          assertionFailures.push({
            message: `Did not match ${m} in ${file}`,
            file,
            content
          });
        }
      }
      for (const m of change.doesNotMatch || []) {
        if (content.match(new RegExp(m, "gm"))) {
          assertionFailures.push({
            message: `Unexpectedly matched ${m} in ${file}`,
            file,
            content
          });
        }
      }
    }
    return {
      assertionFailures,
      debugInfo: {
        responses,
        processedFiles
      }
    };
  } finally {
    workspaceDiff.modifiedUISourceCodes().forEach((modifiedUISourceCode) => {
      modifiedUISourceCode.resetWorkingCopy();
    });
  }
};

// gen/front_end/panels/ai_assistance/components/ChatInput.js
var ChatInput_exports = {};
__export(ChatInput_exports, {
  ChatInput: () => ChatInput,
  DEFAULT_VIEW: () => DEFAULT_VIEW2
});
import "./../../ui/components/tooltips/tooltips.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as AiAssistanceModel3 from "./../../models/ai_assistance/ai_assistance.js";
import * as PanelsCommon2 from "./../common/common.js";
import * as PanelUtils from "./../utils/utils.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as Input from "./../../ui/components/input/input.js";
import * as Snackbars from "./../../ui/components/snackbars/snackbars.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as Lit3 from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/ai_assistance/components/chatInput.css.js
var chatInput_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:host {
  display: flex;
  flex-direction: column;
}

.input-form {
  display: flex;
  flex-direction: column;
  padding: 0 var(--sys-size-5) var(--sys-size-5) var(--sys-size-5);
  max-width: var(--sys-size-36);
  background-color: var(--sys-color-cdt-base-container);
  width: 100%;
}

.chat-readonly-container {
  display: flex;
  width: 100%;
  max-width: var(--sys-size-36);
  justify-content: center;
  align-items: center;
  background-color: var(--sys-color-surface3);
  font: var(--sys-typescale-body4-regular);
  padding: var(--sys-size-5) 0;
  border-radius: var(--sys-shape-corner-medium-small);
  margin-bottom: var(--sys-size-5);
  color: var(--sys-color-on-surface-subtle);
}

.chat-input-container {
  width: 100%;
  display: flex;
  position: relative;
  flex-direction: column;
  border: 1px solid var(--sys-color-neutral-outline);
  border-radius: var(--sys-shape-corner-small);

  &:focus-within {
    outline: 1px solid var(--sys-color-primary);
    border-color: var(--sys-color-primary);
  }

  &.disabled {
    background-color: var(--sys-color-state-disabled-container);
    border-color: transparent;

    & .chat-input-disclaimer {
      border-color: var(--sys-color-state-disabled);
    }
  }

  &.single-line-layout {
    flex-direction: row;
    justify-content: space-between;

    .chat-input {
      flex-shrink: 1;
      padding: var(--sys-size-4);
    }

    .chat-input-actions {
      flex-shrink: 0;
      padding-block: 0;
      align-items: flex-end;
      padding-bottom: var(--sys-size-1);
    }
  }

  & .image-input-container {
    margin: var(--sys-size-3) var(--sys-size-4) 0;
    max-width: 100%;
    width: fit-content;
    position: relative;

    devtools-button {
      position: absolute;
      top: calc(-1 * var(--sys-size-2));
      right: calc(-1 * var(--sys-size-3));
      border-radius: var(--sys-shape-corner-full);
      border: 1px solid var(--sys-color-neutral-outline);
      background-color: var(--sys-color-cdt-base-container);
    }

    img {
      max-height: var(--sys-size-18);
      max-width: 100%;
      border: 1px solid var(--sys-color-neutral-outline);
      border-radius: var(--sys-shape-corner-small);
    }

    .loading {
      margin: var(--sys-size-4) 0;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      height: var(--sys-size-18);
      width: var(--sys-size-19);
      background-color: var(--sys-color-surface3);
      border-radius: var(--sys-shape-corner-small);
      border: 1px solid var(--sys-color-neutral-outline);

      devtools-spinner {
        color: var(--sys-color-state-disabled);
      }
    }
  }

  & .chat-input-disclaimer-container {
    display: flex;
    align-items: center;
    padding-right: var(--sys-size-3);
    flex-shrink: 0;
  }

  & .chat-input-disclaimer {
    display: flex;
    justify-content: center;
    align-items: center;
    font: var(--sys-typescale-body5-regular);
    border-right: 1px solid var(--sys-color-divider);
    padding-right: 8px;

    &.hide-divider {
      border-right: none;
    }
  }

  /*
    Hide the inline disclaimer on narrow widths (< 400px) because space is limited
    and the disclaimer is shown in the footer instead for this case.
  */
  @container --chat-ui-container (width < 400px) {
    & .chat-input-disclaimer-container {
      display: none;
    }
  }
}

.chat-input {
  scrollbar-width: none;
  field-sizing: content;
  resize: none;
  width: 100%;
  max-height: 84px; /* 4 rows */
  border: 0;
  border-radius: var(--sys-shape-corner-small);
  font: var(--sys-typescale-body4-regular);
  line-height: 18px;
  min-height: var(--sys-size-11);
  color: var(--sys-color-on-surface);
  background-color: var(--sys-color-cdt-base-container);
  padding: var(--sys-size-4) var(--sys-size-4) var(--sys-size-3)
    var(--sys-size-4);

  &::placeholder {
    opacity: 60%;
  }

  &:focus-visible {
    outline: 0;
  }

  &:disabled {
    color: var(--sys-color-state-disabled);
    background-color: transparent;
    border-color: transparent;

    &::placeholder {
      color: var(--sys-color-on-surface-subtle);
      opacity: 100%;
    }
  }
}

.chat-input-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-left: var(--sys-size-4);
  padding-right: var(--sys-size-2);
  gap: var(--sys-size-6);
  padding-bottom: var(--sys-size-2);

  & .chat-input-actions-left {
    flex: 1 1 0;
    min-width: 0;
  }

  & .chat-input-actions-right {
    flex-shrink: 0;
    display: flex;

    & .start-new-chat-button {
      padding-bottom: var(--sys-size-2);
      padding-right: var(--sys-size-3);
    }
  }
}

.chat-inline-button {
  padding-left: 3px;
}

.select-element {
  display: flex;
  gap: var(--sys-size-3);
  align-items: center;

  .resource-link {
    display: flex;
    background-color: var(--sys-color-cdt-base-container);
    align-items: center;
    cursor: pointer;
    padding: var(--sys-size-2) var(--sys-size-3);
    font: var(--sys-typescale-body5-regular);
    border: var(--sys-size-1) solid var(--sys-color-divider);
    border-radius: var(--sys-shape-corner-extra-small);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    /*
      Allow the link/task item to shrink below its intrinsic minimum width in the flex container,
      enabling text-overflow ellipsis to work correctly.
    */
    min-width: 0;
    line-height: 1;

    & .title {
      vertical-align: middle;
      /* Fixed italic text getting cut off */
      padding-right: var(--sys-size-2);
      font: var(--sys-typescale-body5-regular);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    & .remove-context,
    & .add-context {
      vertical-align: middle;
    }

    &:focus-visible {
      outline: 2px solid var(--sys-color-state-focus-ring);
    }

    devtools-icon,
    devtools-file-source-icon {
      display: inline-flex;
      vertical-align: middle;
      min-width: var(--sys-size-7);
      min-height: var(--sys-size-7);
    }

    &.disabled {
      border-style: dashed;
      border-color: var(--sys-color-neutral-outline);
      color: var(--sys-color-on-surface-light);

      devtools-icon,
      devtools-file-source-icon {
        /* Override devtools-file-source-icon */
        --override-file-source-icon-color: var(
          --sys-color-on-surface-light-graphics
        );
        /* Some icons set their style attribute and we need to override it */
        /* stylelint-disable-next-line declaration-no-important */
        color: var(--sys-color-on-surface-light-graphics) !important;
      }

      .title {
        color: var(--sys-color-on-surface-light);
        font-style: italic;
      }
    }

    /*
      CSS styling for \\'network-override-marker\\' is similar to
      https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/network/networkLogView.css;l=379.
      There is a difference in \\'left\\' and \\'top\\' values to make sure
      it is placed correctly for the network icon in assistance panel.
    */
    .network-override-marker {
      position: relative;
      float: left;
    }

    .network-override-marker::before {
      content: var(--image-file-empty);
      width: var(--sys-size-4);
      height: var(--sys-size-4);
      border-radius: 50%;
      outline: var(--sys-size-1) solid var(--icon-gap-focus-selected);
      left: 11px;
      position: absolute;
      top: 13px;
      z-index: 1;
      background-color: var(--sys-color-purple-bright);
    }

    .image.icon {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      vertical-align: middle;
      margin-right: var(--sys-size-3);

      img {
        max-width: var(--sys-size-7);
        max-height: var(--sys-size-7);
      }
    }
  }
}

.link {
  color: var(--text-link);
  text-decoration: underline;
  cursor: pointer;
}

button.link {
  border: none;
  background: none;
  font: inherit;

  &:focus-visible {
    outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    outline-offset: 0;
    border-radius: var(--sys-shape-corner-extra-small);
  }
}

.floaty {
  font: var(--sys-typescale-body4);
  color: var(--sys-color-on-surface);
  user-select: none;
  padding: 0;
  margin: 0;
  list-style-type: none;
  display: flex;
  flex-flow: row wrap;
  align-items: flex-end;
  gap: var(--sys-size-2);
  margin-bottom: var(--sys-size-2);

  li {
    background: var(--sys-color-surface3);
    border-radius: var(--sys-shape-corner-small);
    border: 1px solid var(--sys-color-neutral-outline);
    padding: var(--sys-size-2) var(--sys-size-3);
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--sys-size-2);
    min-height: var(--sys-size-8);
  }

  .context-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--sys-size-2);
  }

  .open-floaty {
    padding: 0;
    border: none;

    /* To align with other chips */
    margin-bottom: 1px;
  }
}

.chat-input-footer {
  display: flex;
  justify-content: center;
  padding-block: var(--sys-size-3);
  font: var(--sys-typescale-body5-regular);
  border-top: 1px solid var(--sys-color-divider);
  text-wrap: balance;
  text-align: center;
  width: 100%;

  /*
    The footer (for active conversations) is hidden by default on wider screens
    because the disclaimer is shown inline within the chat input actions. Show it only on narrow widths (< 400px).
  */
  &:not(.is-read-only) {
    display: none;
    border: none;

    @container --chat-ui-container (width < 400px) {
      display: flex;
    }
  }
}

/*# sourceURL=${import.meta.resolve("././components/chatInput.css")} */`;

// gen/front_end/panels/ai_assistance/components/ChatInput.js
var { html: html5, Directives: { createRef, ref } } = Lit3;
var { widget: widget2 } = UI3.Widget;
var UIStrings = {
  /**
   * @description Label added to the text input to describe the context for screen readers. Not shown visibly on screen.
   */
  inputTextAriaDescription: "You can also use one of the suggested prompts above to start your conversation",
  /**
   * @description Label added to the button that reveals the selected context item in DevTools
   */
  revealContextDescription: "Reveal the selected context item in DevTools",
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: "Learn about AI in DevTools"
};
var UIStringsNotTranslate3 = {
  /**
   * @description Title for the send icon button.
   */
  sendButtonTitle: "Send",
  /**
   * @description Title for the start new chat
   */
  startNewChat: "Start new chat",
  /**
   * @description Title for the cancel icon button.
   */
  cancelButtonTitle: "Cancel",
  /**
   * @description Label for the "select an element" button.
   */
  selectAnElement: "Select an element",
  /**
   * @description Title for the take screenshot button.
   */
  takeScreenshotButtonTitle: "Take screenshot",
  /**
   * @description Title for the remove image input button.
   */
  removeImageInputButtonTitle: "Remove image input",
  /**
   * @description Title for the add image button.
   */
  addImageButtonTitle: "Add image",
  /**
   * @description Text displayed when the chat input is disabled due to reading past conversation.
   */
  pastConversation: "You're viewing a past conversation.",
  /**
   * @description Message displayed in toast in case of any failures while taking a screenshot of the page.
   */
  screenshotFailureMessage: "Failed to take a screenshot. Please try again.",
  /**
   * @description Message displayed in toast in case of any failures while uploading an image file as input.
   */
  uploadImageFailureMessage: "Failed to upload image. Please try again.",
  /**
   * @description Label added to the button that add selected context from the current panel in AI Assistance panel.
   */
  addContext: "Add item for context",
  /**
   * @description Label added to the button that remove the currently selected element in AI Assistance panel.
   */
  removeContextElement: "Remove element from context",
  /**
   * @description Label added to the button that remove the currently selected context in AI Assistance panel.
   */
  removeContextRequest: "Remove request from context",
  /**
   * @description Label added to the button that remove the currently selected context in AI Assistance panel.
   */
  removeContextFile: "Remove file from context",
  /**
   * @description Label added to the button that remove the currently selected context in AI Assistance panel.
   */
  removeContextPerfInsight: "Remove performance insight from context",
  /**
   * @description Label added to the button that remove the currently selected context in AI Assistance panel.
   */
  removeContext: "Remove from context"
};
var str_ = i18n5.i18n.registerUIStrings("panels/ai_assistance/components/ChatInput.ts", UIStrings);
var i18nString = i18n5.i18n.getLocalizedString.bind(void 0, str_);
var lockedString3 = i18n5.i18n.lockedString;
var SCREENSHOT_QUALITY = 80;
var JPEG_MIME_TYPE = "image/jpeg";
var SHOW_LOADING_STATE_TIMEOUT = 100;
var RELEVANT_DATA_LINK_CHAT_ID = "relevant-data-link-chat";
var RELEVANT_DATA_LINK_FOOTER_ID = "relevant-data-link-footer";
function getContextRemoveLabel(context) {
  if (context instanceof AiAssistanceModel3.FileAgent.FileContext) {
    return lockedString3(UIStringsNotTranslate3.removeContextFile);
  }
  if (context instanceof AiAssistanceModel3.StylingAgent.NodeContext) {
    return lockedString3(UIStringsNotTranslate3.removeContextElement);
  }
  if (context instanceof AiAssistanceModel3.NetworkAgent.RequestContext) {
    return lockedString3(UIStringsNotTranslate3.removeContextRequest);
  }
  if (context instanceof AiAssistanceModel3.PerformanceAgent.PerformanceTraceContext) {
    return lockedString3(UIStringsNotTranslate3.removeContextPerfInsight);
  }
  return lockedString3(UIStringsNotTranslate3.removeContext);
}
var DEFAULT_VIEW2 = (input, _output, target) => {
  const chatInputContainerCls = Lit3.Directives.classMap({
    "chat-input-container": true,
    "single-line-layout": !input.context,
    disabled: input.isTextInputDisabled
  });
  const renderRelevantDataDisclaimer = (tooltipId) => {
    const classes = Lit3.Directives.classMap({
      "chat-input-disclaimer": true,
      "hide-divider": !input.isLoading && input.blockedByCrossOrigin
    });
    return html5`
      <div class=${classes}>
        <button
          class="link"
          role="link"
          aria-details=${tooltipId}
          jslog=${VisualLogging2.link("open-ai-settings").track({
      click: true
    })}
          @click=${(ev) => {
      ev.preventDefault();
      void UI3.ViewManager.ViewManager.instance().showView("chrome-ai");
    }}
        >${lockedString3("Relevant data")}</button>&nbsp;${lockedString3("is sent to Google")}
        <devtools-tooltip
          id=${tooltipId}
          variant="rich"
        ><div class="info-tooltip-container">
          ${input.disclaimerText}
          <button
            class="link tooltip-link"
            role="link"
            jslog=${VisualLogging2.link("open-ai-settings").track({
      click: true
    })}
            @click=${() => {
      void UI3.ViewManager.ViewManager.instance().showView("chrome-ai");
    }}>${i18nString(UIStrings.learnAbout)}
          </button>
        </div></devtools-tooltip>
      </div>
    `;
  };
  Lit3.render(html5`
    <style>${Input.textInputStyles}</style>
    <style>${chatInput_css_default}</style>
    ${input.isReadOnly ? html5`
        <div
          class="chat-readonly-container"
          jslog=${VisualLogging2.section("read-only")}
        >
          <span>${lockedString3(UIStringsNotTranslate3.pastConversation)}</span>
          <devtools-button
            aria-label=${lockedString3(UIStringsNotTranslate3.startNewChat)}
            class="chat-inline-button"
            @click=${input.onNewConversation}
            .data=${{
    variant: "text",
    title: lockedString3(UIStringsNotTranslate3.startNewChat),
    jslogContext: "start-new-chat"
  }}
          >${lockedString3(UIStringsNotTranslate3.startNewChat)}</devtools-button>
        </div>` : html5`
        <form class="input-form" @submit=${input.onSubmit}>
          <div class=${chatInputContainerCls}>
            ${input.multimodalInputEnabled && input.imageInput && !input.isTextInputDisabled ? html5`
                <div class="image-input-container">
                  <devtools-button
                    aria-label=${lockedString3(UIStringsNotTranslate3.removeImageInputButtonTitle)}
                    @click=${input.onRemoveImageInput}
                    .data=${{
    variant: "icon",
    size: "MICRO",
    iconName: "cross",
    title: lockedString3(UIStringsNotTranslate3.removeImageInputButtonTitle)
  }}
                  ></devtools-button>
                  ${input.imageInput.isLoading ? html5`
                      <div class="loading">
                        <devtools-spinner></devtools-spinner>
                      </div>` : html5`
                      <img src="data:${input.imageInput.mimeType};base64, ${input.imageInput.data}" alt="Image input" />`}
                </div>` : Lit3.nothing}
            <textarea
              class="chat-input"
              .disabled=${input.isTextInputDisabled}
              wrap="hard"
              maxlength="10000"
              @keydown=${input.onTextAreaKeyDown}
              @paste=${input.onImagePaste}
              @dragover=${input.onImageDragOver}
              @drop=${input.onImageDrop}
              @input=${(event) => {
    input.onTextInputChange(event.target.value);
  }}
              placeholder=${input.inputPlaceholder}
              jslog=${VisualLogging2.textField("query").track({
    change: true,
    keydown: "Enter"
  })}
              aria-description=${i18nString(UIStrings.inputTextAriaDescription)}
              ${ref(input.textAreaRef)}
            ></textarea>
            <div class="chat-input-actions">
              <div class="chat-input-actions-left">
                ${input.context ? html5`
                    <div class="select-element">
                      ${input.conversationType === "freestyler" ? html5`
                          <devtools-button
                            .data=${{
    variant: "icon_toggle",
    size: "SMALL",
    iconName: "select-element",
    toggledIconName: "select-element",
    toggleType: "primary-toggle",
    toggled: input.inspectElementToggled,
    title: lockedString3(UIStringsNotTranslate3.selectAnElement),
    jslogContext: "select-element",
    disabled: input.isTextInputDisabled
  }}
                            @click=${input.onInspectElementClick}
                          ></devtools-button>` : Lit3.nothing}
                      <div
                        class=${Lit3.Directives.classMap({
    "resource-link": true,
    disabled: !input.isContextSelected
  })}
                      >
                        ${input.context instanceof AiAssistanceModel3.StylingAgent.NodeContext ? html5`
                              <devtools-widget
                                class="title"
                                ${widget2(PanelsCommon2.DOMLinkifier.DOMNodeLink, {
    node: input.context.getItem(),
    options: {
      disabled: !input.isContextSelected,
      hiddenClassList: input.context.getItem().classNames().filter((className) => className.startsWith(AiAssistanceModel3.Injected.AI_ASSISTANCE_CSS_CLASS_NAME)),
      ariaDescription: i18nString(UIStrings.revealContextDescription)
    }
  })}
                              ></devtools-widget>` : html5`
                          ${input.context instanceof AiAssistanceModel3.NetworkAgent.RequestContext ? PanelUtils.PanelUtils.getIconForNetworkRequest(input.context.getItem()) : input.context instanceof AiAssistanceModel3.FileAgent.FileContext ? PanelUtils.PanelUtils.getIconForSourceFile(input.context.getItem()) : input.context instanceof AiAssistanceModel3.AccessibilityAgent.AccessibilityContext ? html5`<devtools-icon class="icon" name="performance" title="Lighthouse"></devtools-icon>` : input.context instanceof AiAssistanceModel3.PerformanceAgent.PerformanceTraceContext ? html5`<devtools-icon class="icon" name="performance" title="Performance"></devtools-icon>` : Lit3.nothing}
                            <span
                              role="button"
                              class="title"
                              tabindex="0"
                              @click=${input.onContextClick}
                              @keydown=${(ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      void input.onContextClick();
    }
  }}
                              aria-description=${i18nString(UIStrings.revealContextDescription)}
                            >${input.context.getTitle()}</span>`}
                        ${input.isContextSelected && input.onContextRemoved ? html5`
                                  <devtools-button
                                    title=${getContextRemoveLabel(input.context)}
                                    aria-label=${getContextRemoveLabel(input.context)}
                                    class="remove-context"
                                    .iconName=${"cross"}
                                    .size=${"MICRO"}
                                    .jslogContext=${"context-removed"}
                                    .variant=${"icon"}
                                    @click=${input.onContextRemoved}></devtools-button>` : Lit3.nothing}
                      ${!input.isContextSelected && input.onContextAdd ? html5`
                                    <devtools-button
                                      title=${lockedString3(UIStringsNotTranslate3.addContext)}
                                      aria-label=${lockedString3(UIStringsNotTranslate3.addContext)}
                                      class="add-context"
                                      .iconName=${"plus"}
                                      .size=${"MICRO"}
                                      .jslogContext=${"context-added"}
                                      .variant=${"icon"}
                                      @click=${input.onContextAdd}></devtools-button>` : Lit3.nothing}
                      </div>
                    </div>` : Lit3.nothing}
              </div>
              <div class="chat-input-actions-right">
                <div class="chat-input-disclaimer-container">
                  ${renderRelevantDataDisclaimer(RELEVANT_DATA_LINK_CHAT_ID)}
                </div>
                ${input.multimodalInputEnabled && !input.blockedByCrossOrigin ? html5`
                    ${input.uploadImageInputEnabled ? html5`
                        <devtools-button
                          class="chat-input-button"
                          aria-label=${lockedString3(UIStringsNotTranslate3.addImageButtonTitle)}
                          @click=${input.onImageUpload}
                          .data=${{
    variant: "icon",
    size: "REGULAR",
    disabled: input.isTextInputDisabled || input.imageInput?.isLoading,
    iconName: "add-photo",
    title: lockedString3(UIStringsNotTranslate3.addImageButtonTitle),
    jslogContext: "upload-image"
  }}
                        ></devtools-button>` : Lit3.nothing}
                    <devtools-button
                      class="chat-input-button"
                      aria-label=${lockedString3(UIStringsNotTranslate3.takeScreenshotButtonTitle)}
                      @click=${input.onTakeScreenshot}
                      .data=${{
    variant: "icon",
    size: "REGULAR",
    disabled: input.isTextInputDisabled || input.imageInput?.isLoading,
    iconName: "photo-camera",
    title: lockedString3(UIStringsNotTranslate3.takeScreenshotButtonTitle),
    jslogContext: "take-screenshot"
  }}
                    ></devtools-button>` : Lit3.nothing}
                ${input.isLoading ? html5`
                    <devtools-button
                      class="chat-input-button"
                      aria-label=${lockedString3(UIStringsNotTranslate3.cancelButtonTitle)}
                      @click=${input.onCancel}
                      .data=${{
    variant: "icon",
    size: "REGULAR",
    iconName: "record-stop",
    title: lockedString3(UIStringsNotTranslate3.cancelButtonTitle),
    jslogContext: "stop"
  }}
                    ></devtools-button>` : input.blockedByCrossOrigin ? html5`
                      <devtools-button
                        class="start-new-chat-button"
                        aria-label=${lockedString3(UIStringsNotTranslate3.startNewChat)}
                        @click=${input.onNewConversation}
                        .data=${{
    variant: "outlined",
    size: "SMALL",
    title: lockedString3(UIStringsNotTranslate3.startNewChat),
    jslogContext: "start-new-chat"
  }}
                      >${lockedString3(UIStringsNotTranslate3.startNewChat)}</devtools-button>` : html5`
                      <devtools-button
                        class="chat-input-button"
                        aria-label=${lockedString3(UIStringsNotTranslate3.sendButtonTitle)}
                        .data=${{
    type: "submit",
    variant: "icon",
    size: "REGULAR",
    disabled: input.isTextInputDisabled || input.isTextInputEmpty || input.imageInput?.isLoading,
    iconName: "send",
    title: lockedString3(UIStringsNotTranslate3.sendButtonTitle),
    jslogContext: "send"
  }}
                      ></devtools-button>`}
              </div>
            </div>
          </div>
        </form>`}
    <footer
      class=${Lit3.Directives.classMap({
    "chat-input-footer": true,
    "is-read-only": input.isReadOnly
  })}
      jslog=${VisualLogging2.section("footer")}
    >
      ${renderRelevantDataDisclaimer(RELEVANT_DATA_LINK_FOOTER_ID)}
    </footer>
  `, target);
};
var ChatInput = class extends UI3.Widget.Widget {
  isLoading = false;
  blockedByCrossOrigin = false;
  isTextInputDisabled = false;
  inputPlaceholder = "";
  context = null;
  isContextSelected = false;
  inspectElementToggled = false;
  disclaimerText = "";
  conversationType = "freestyler";
  multimodalInputEnabled = false;
  uploadImageInputEnabled = false;
  isReadOnly = false;
  #textAreaRef = createRef();
  #imageInput;
  /**
   * Tracks the user's position when navigating through prompt history.
   * -1 means the user is at the newest "uncommitted" position (the current input).
   * 0 to N-1 are indices into the recent prompts array (newest to oldest).
   */
  #historyOffset = -1;
  /**
   * Stores the text the user had typed before they started navigating through history,
   * so it can be restored if they navigate back to the newest position.
   */
  #uncommittedText = "";
  setInputValue(text) {
    if (this.#textAreaRef.value) {
      this.#textAreaRef.value.value = text;
      this.#textAreaRef.value.setSelectionRange(text.length, text.length);
    }
    this.performUpdate();
  }
  #isTextInputEmpty() {
    return !this.#textAreaRef.value?.value?.trim();
  }
  onTextSubmit = () => {
  };
  onContextClick = () => {
  };
  onInspectElementClick = () => {
  };
  onCancelClick = () => {
  };
  onNewConversation = () => {
  };
  onContextRemoved = null;
  onContextAdd = null;
  /**
   * Navigates the prompt history.
   * @param dir direction to navigate. -1 for older, 1 for newer.
   */
  #navigatePromptHistory(dir) {
    const prompts = AiAssistanceModel3.AiHistoryStorage.AiHistoryStorage.instance().getRecentPrompts();
    if (!prompts.length) {
      return;
    }
    if (dir === -1) {
      if (this.#historyOffset === -1) {
        this.#uncommittedText = this.#textAreaRef.value?.value || "";
      }
      if (this.#historyOffset < prompts.length - 1) {
        this.#historyOffset++;
        this.setInputValue(prompts[this.#historyOffset]);
      }
    } else if (this.#historyOffset > 0) {
      this.#historyOffset--;
      this.setInputValue(prompts[this.#historyOffset]);
    } else if (this.#historyOffset === 0) {
      this.#historyOffset = -1;
      this.setInputValue(this.#uncommittedText);
    }
  }
  async #handleTakeScreenshot() {
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      throw new Error("Could not find main target");
    }
    const model = mainTarget.model(SDK2.ScreenCaptureModel.ScreenCaptureModel);
    if (!model) {
      throw new Error("Could not find model");
    }
    const showLoadingTimeout = setTimeout(() => {
      this.#imageInput = { isLoading: true };
      this.performUpdate();
    }, SHOW_LOADING_STATE_TIMEOUT);
    const bytes = await model.captureScreenshot(
      "jpeg",
      SCREENSHOT_QUALITY,
      "fromViewport"
      /* SDK.ScreenCaptureModel.ScreenshotMode.FROM_VIEWPORT */
    );
    clearTimeout(showLoadingTimeout);
    if (bytes) {
      this.#imageInput = {
        isLoading: false,
        data: bytes,
        mimeType: JPEG_MIME_TYPE,
        inputType: "screenshot"
        /* AiAssistanceModel.AiAgent.MultimodalInputType.SCREENSHOT */
      };
      this.performUpdate();
      void this.updateComplete.then(() => {
        this.focusTextInput();
      });
    } else {
      this.#imageInput = void 0;
      this.performUpdate();
      Snackbars.Snackbar.Snackbar.show({ message: lockedString3(UIStringsNotTranslate3.screenshotFailureMessage) });
    }
  }
  targetAdded(_target) {
  }
  targetRemoved(_target) {
  }
  #handleRemoveImageInput() {
    this.#imageInput = void 0;
    this.performUpdate();
    void this.updateComplete.then(() => {
      this.focusTextInput();
    });
  }
  #handleImageDataTransferEvent(dataTransfer, event) {
    if (this.conversationType !== "freestyler") {
      return;
    }
    const files = dataTransfer?.files;
    if (!files || files.length === 0) {
      return;
    }
    const imageFile = Array.from(files).find((file) => file.type.startsWith("image/"));
    if (!imageFile) {
      return;
    }
    event.preventDefault();
    void this.#handleLoadImage(imageFile);
  }
  #handleImagePaste = (event) => {
    this.#handleImageDataTransferEvent(event.clipboardData, event);
  };
  #handleImageDragOver = (event) => {
    if (this.conversationType !== "freestyler") {
      return;
    }
    event.preventDefault();
  };
  #handleImageDrop = (event) => {
    this.#handleImageDataTransferEvent(event.dataTransfer, event);
  };
  async #handleLoadImage(file) {
    const showLoadingTimeout = setTimeout(() => {
      this.#imageInput = { isLoading: true };
      this.performUpdate();
    }, SHOW_LOADING_STATE_TIMEOUT);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("FileReader result was not a string."));
          }
        };
        reader.readAsDataURL(file);
      });
      const commaIndex = dataUrl.indexOf(",");
      const bytes = dataUrl.substring(commaIndex + 1);
      this.#imageInput = {
        isLoading: false,
        data: bytes,
        mimeType: file.type,
        inputType: "uploaded-image"
        /* AiAssistanceModel.AiAgent.MultimodalInputType.UPLOADED_IMAGE */
      };
    } catch {
      this.#imageInput = void 0;
      Snackbars.Snackbar.Snackbar.show({ message: lockedString3(UIStringsNotTranslate3.uploadImageFailureMessage) });
    }
    clearTimeout(showLoadingTimeout);
    this.performUpdate();
    void this.updateComplete.then(() => {
      this.focusTextInput();
    });
  }
  #view;
  constructor(element, view) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW2;
  }
  wasShown() {
    super.wasShown();
    SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
  }
  willHide() {
    super.willHide();
    SDK2.TargetManager.TargetManager.instance().removeModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
  }
  #onPrimaryPageChanged() {
    this.#imageInput = void 0;
    this.performUpdate();
  }
  performUpdate() {
    this.#view({
      inputPlaceholder: this.inputPlaceholder,
      isLoading: this.isLoading,
      blockedByCrossOrigin: this.blockedByCrossOrigin,
      isTextInputDisabled: this.isTextInputDisabled,
      context: this.context,
      isContextSelected: this.isContextSelected,
      inspectElementToggled: this.inspectElementToggled,
      isTextInputEmpty: this.#isTextInputEmpty(),
      disclaimerText: this.disclaimerText,
      conversationType: this.conversationType,
      multimodalInputEnabled: this.multimodalInputEnabled,
      imageInput: this.#imageInput,
      uploadImageInputEnabled: this.uploadImageInputEnabled,
      isReadOnly: this.isReadOnly,
      textAreaRef: this.#textAreaRef,
      onContextClick: this.onContextClick,
      onInspectElementClick: this.onInspectElementClick,
      onImagePaste: this.#handleImagePaste,
      onNewConversation: this.onNewConversation,
      onTextInputChange: () => {
        this.requestUpdate();
      },
      onTakeScreenshot: this.#handleTakeScreenshot.bind(this),
      onRemoveImageInput: this.#handleRemoveImageInput.bind(this),
      onSubmit: this.onSubmit,
      onTextAreaKeyDown: this.onTextAreaKeyDown,
      onCancel: this.onCancel,
      onImageUpload: this.onImageUpload,
      onImageDragOver: this.#handleImageDragOver,
      onImageDrop: this.#handleImageDrop,
      onContextRemoved: this.onContextRemoved,
      onContextAdd: this.onContextAdd
    }, void 0, this.contentElement);
  }
  focusTextInput() {
    this.#textAreaRef.value?.focus();
  }
  onSubmit = (event) => {
    event.preventDefault();
    if (this.#imageInput?.isLoading) {
      return;
    }
    const imageInput = !this.#imageInput?.isLoading && this.#imageInput?.data ? { inlineData: { data: this.#imageInput.data, mimeType: this.#imageInput.mimeType } } : void 0;
    this.onTextSubmit(this.#textAreaRef.value?.value ?? "", imageInput, this.#imageInput?.inputType);
    this.#imageInput = void 0;
    this.#historyOffset = -1;
    this.#uncommittedText = "";
    this.setInputValue("");
  };
  onTextAreaKeyDown = (event) => {
    if (!event.target || !(event.target instanceof HTMLTextAreaElement)) {
      return;
    }
    if (event.key === "ArrowUp") {
      const { value, selectionStart, selectionEnd } = event.target;
      if (selectionStart === selectionEnd && value.lastIndexOf("\n", selectionStart - 1) === -1) {
        event.preventDefault();
        this.#navigatePromptHistory(-1);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      const { selectionEnd, selectionStart, value } = event.target;
      if (selectionStart === selectionEnd && value.indexOf("\n", selectionEnd) === -1) {
        event.preventDefault();
        this.#navigatePromptHistory(1);
      }
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!event.target?.value || this.#imageInput?.isLoading) {
        return;
      }
      const imageInput = !this.#imageInput?.isLoading && this.#imageInput?.data ? { inlineData: { data: this.#imageInput.data, mimeType: this.#imageInput.mimeType } } : void 0;
      this.onTextSubmit(event.target.value, imageInput, this.#imageInput?.inputType);
      this.#imageInput = void 0;
      this.#historyOffset = -1;
      this.#uncommittedText = "";
      this.setInputValue("");
    }
  };
  onCancel = (ev) => {
    ev.preventDefault();
    if (!this.isLoading) {
      return;
    }
    this.onCancelClick();
  };
  onImageUpload = (ev) => {
    ev.stopPropagation();
    const fileSelector = UI3.UIUtils.createFileSelectorElement(this.#handleLoadImage.bind(this), ".jpeg,.jpg,.png");
    fileSelector.click();
  };
};

// gen/front_end/panels/ai_assistance/components/ChatMessage.js
var ChatMessage_exports = {};
__export(ChatMessage_exports, {
  ChatMessage: () => ChatMessage,
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  getDeduplicatedWidgetsMessage: () => getDeduplicatedWidgetsMessage,
  getWidgetSignature: () => getWidgetSignature,
  renderStep: () => renderStep,
  titleForStep: () => titleForStep
});
import "./../../ui/components/markdown_view/markdown_view.js";
import "./../../ui/kit/kit.js";
import * as Common4 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as Root3 from "./../../core/root/root.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as AiAssistanceModel5 from "./../../models/ai_assistance/ai_assistance.js";
import * as ComputedStyle from "./../../models/computed_style/computed_style.js";
import * as Trace from "./../../models/trace/trace.js";
import * as PanelsCommon3 from "./../common/common.js";
import * as Marked from "./../../third_party/marked/marked.js";
import * as Buttons5 from "./../../ui/components/buttons/buttons.js";
import * as Input3 from "./../../ui/components/input/input.js";
import * as UIHelpers from "./../../ui/helpers/helpers.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import * as Lit5 from "./../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";
import * as Elements from "./../elements/elements.js";
import * as TimelineComponents from "./../timeline/components/components.js";
import * as TimelineInsights from "./../timeline/components/insights/insights.js";
import * as Timeline from "./../timeline/timeline.js";
import * as TimelineUtils from "./../timeline/utils/utils.js";
import { PanelUtils as PanelUtils3 } from "./../utils/utils.js";

// gen/front_end/panels/ai_assistance/components/chatMessage.css.js
var chatMessage_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .ai-assistance-feedback-row {
    font-family: var(--default-font-family);
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-block: calc(-1 * var(--sys-size-3));
    margin-top: var(--sys-size-5);
    overflow: hidden;
    mask-image: linear-gradient(to right, var(--ref-palette-neutral0) calc(100% - var(--sys-size-15)), transparent 100%);

    &.not-v2 {
      /* Can be removed when AIv2 ships */
      gap: var(--sys-size-8);
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: var(--sys-size-2);
      padding: var(--sys-size-4) 0;
    }

    .vertical-separator {
      height: 16px;
      width: 1px;
      vertical-align: top;
      margin: 0 var(--sys-size-2);
      background: var(--sys-color-divider);
      display: inline-block;
    }

    .suggestions-container {
      overflow: hidden;
      position: relative;
      display: flex;

      .suggestions-scroll-container {
        display: flex;
        overflow: auto hidden;
        scrollbar-width: none;
        gap: var(--sys-size-3);
        padding: var(--sys-size-3);
      }

      .scroll-button-container {
        position: absolute;
        top: 0;
        height: 100%;
        display: flex;
        align-items: center;
        width: var(--sys-size-15);
        z-index: 999;
      }

      .scroll-button-container.hidden {
        display: none;
      }

      .scroll-button-container.left {
        left: 0;
        background:
          linear-gradient(
            90deg,
            var(--sys-color-cdt-base-container) 0%,
            var(--sys-color-cdt-base-container) 50%,
            transparent
          );
      }

      .scroll-button-container.right {
        right: 0;
        background:
          linear-gradient(
            90deg,
            transparent,
            var(--sys-color-cdt-base-container) 50%
          );
        justify-content: flex-end;
      }
    }
  }

  .feedback-form {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-5);
    margin-top: var(--sys-size-4);
    background-color: var(--sys-color-surface3);
    padding: var(--sys-size-6);
    border-radius: var(--sys-shape-corner-medium-small);
    max-width: var(--sys-size-32);

    .feedback-input {
      height: var(--sys-size-11);
      padding: 0 var(--sys-size-5);
      background-color: var(--sys-color-surface3);
      width: auto;
    }

    .feedback-input::placeholder {
      color: var(--sys-color-on-surface-subtle);
      font: var(--sys-typescale-body4-regular);
    }

    .feedback-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .feedback-title {
      margin: 0;
      font: var(--sys-typescale-body3-medium);
    }

    .feedback-disclaimer {
      padding: 0 var(--sys-size-4);
    }
  }

  .user-query-wrapper {
    display: flex;
    justify-content: flex-end;
    padding: 0 var(--sys-size-5);
    align-items: center;
  }

  .chat-message {
    user-select: text;
    cursor: initial;
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-5);
    width: 100%;
    padding: var(--sys-size-7) var(--sys-size-5);
    font-size: 12px;
    word-break: normal;
    overflow-wrap: anywhere;
    border-bottom: var(--sys-size-1) solid var(--sys-color-divider);


    &.query.ai-v2 {
      width: fit-content;
      max-width: 80%;
      text-align: left;
      padding: var(--sys-size-4) var(--sys-size-6);
      font: var(--sys-typescale-body4-regular);
      /* top left - top right - bottom right - bottom left */
      border-radius: var(--sys-shape-corner-medium) var(--sys-shape-corner-extra-small) var(--sys-shape-corner-medium) var(--sys-shape-corner-medium);
      background-color: var(--sys-color-surface5);
      color: var(--sys-color-on-surface);

      &.is-first-message {
        /* So the first message doesn't bump right against the top
         * toolbar */
        margin-top: var(--sys-size-6);
      }
    }

    &.ai-v2 {
      border-bottom: none;
    }

    .ai-css-change {
      margin: var(--sys-size-6) 0;
    }

    &:not(.ai-v2) .answer-body-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--sys-size-5);
      width: 100%;
    }

    &.ai-v2 .answer-body-wrapper {
      @container(min-width: 700px) {
        /* Purposefully not using design system variables, this is a
         * specific size to indent the content in and align it with the
         * walkthrough CTA. */
        padding-left: 35px;
      }
    }

    &.is-last-message {
      border-bottom: 0;
    }

    .message-info {
      display: flex;
      align-items: center;
      height: var(--sys-size-11);
      gap: var(--sys-size-4);
      font: var(--sys-typescale-body4-bold);

      h2 {
        font: var(--sys-typescale-body4-bold);
      }
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: var(--sys-size-8);
      max-width: 100%;
    }

    .aborted {
      color: var(--sys-color-on-surface-subtle);
    }

    .image-link {
      width: fit-content;
      border-radius: var(--sys-shape-corner-small);
      outline-offset: var(--sys-size-2);

      img {
        max-height: var(--sys-size-20);
        max-width: 100%;
        border-radius: var(--sys-shape-corner-small);
        border: 1px solid var(--sys-color-neutral-outline);
        width: fit-content;
        vertical-align: bottom;
      }
    }

    .unavailable-image {
      margin: var(--sys-size-4) 0;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      height: var(--sys-size-17);
      width: var(--sys-size-18);
      background-color: var(--sys-color-surface3);
      border-radius: var(--sys-shape-corner-small);
      border: 1px solid var(--sys-color-neutral-outline);

      devtools-icon {
        color: var(--sys-color-state-disabled);
      }
    }
  }

  .indicator {
    color: var(--sys-color-green-bright);
  }

  .summary {
    display: grid;
    grid-template-columns: auto 1fr auto;
    padding: var(--sys-size-3);
    line-height: var(--sys-size-9);
    cursor: default;
    gap: var(--sys-size-3);
    justify-content: center;
    align-items: center;

    .title {
      margin: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      font: var(--sys-typescale-body4-regular);

      .paused {
        font: var(--sys-typescale-body4-bold);
      }
    }
  }

  .step-code {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-2);
  }

  .js-code-output {
    devtools-code-block {
      --code-block-max-code-height: 50px;
    }
  }

  .context-details {
    devtools-code-block {
      --code-block-max-code-height: 80px;
    }
  }

  .step {
    width: fit-content;
    background-color: var(--sys-color-surface3);
    border-radius: 16px;
    position: relative;

    &.empty {
      pointer-events: none;

      .arrow {
        display: none;
      }
    }

    &:not(&[open]):hover::after {
      content: '';
      height: 100%;
      width: 100%;
      border-radius: inherit;
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &.paused {
      .indicator {
        color: var(--sys-color-on-surface-subtle);
      }
    }

    &.canceled {
      .summary {
        color: var(--sys-color-state-disabled);
        text-decoration: line-through;
      }

      .indicator {
        color: var(--sys-color-state-disabled);
      }
    }

    devtools-markdown-view {
      --code-background-color: var(--sys-color-surface1);
    }

    devtools-icon {
      vertical-align: bottom;
    }

    devtools-spinner {
      width: var(--sys-size-9);
      height: var(--sys-size-9);
      padding: var(--sys-size-2);
    }

    &[open] {
      width: auto;

      summary {
        margin-bottom: var(--sys-size-2);
      }

      .summary .title {
        white-space: normal;
        overflow: unset;
      }

      .summary .arrow {
        transform: rotate(180deg);
      }
    }

    summary::marker {
      content: '';
    }

    summary {
      border-radius: 16px;

      &:focus-visible {
        outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
        outline-offset: var(--sys-size-2);
      }
    }

    .step-details {
      padding: 0 var(--sys-size-5) var(--sys-size-4) var(--sys-size-12);
      display: flex;
      flex-direction: column;
      gap: var(--sys-size-6);

      devtools-code-block {
        --code-block-background-color: var(--sys-color-surface1);
      }
    }
  }


  .error-step {
    color: var(--sys-color-error);
  }

  .side-effect-confirmation {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-5);
    padding-bottom: var(--sys-size-4);
  }

  .side-effect-buttons-container {
    display: flex;
    gap: var(--sys-size-4);
  }

  .walkthrough-toggle-container {
    display: flex;
    gap: var(--sys-size-2);
    align-items: center;

    &.has-widgets {
      gap: var(--sys-size-6);
    }

    .chevron {
      color: var(--sys-color-primary);
      width: var(--sys-size-8);
      height: var(--sys-size-8);
      margin-left: var(--sys-size-2);
    }
  }


  .computed-styles-widget {
    display: block;
    width: fit-content;
  }

  .styling-preview-widget {
    width: 100%;
    min-height: 100px;
  }

  .main-widgets-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-5);
  }

  .step-widgets-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--sys-size-5);
  }

  .widget-header {
    display: flex;
    justify-content: space-between;
    height: var(--sys-size-11);
    align-items: center;
    background: var(--sys-color-surface5);
    padding: var(--sys-size-2) var(--sys-size-4);
    border-top-left-radius: var(--sys-shape-corner-small);
    border-top-right-radius: var(--sys-shape-corner-small);

    .widget-name {
      font: var(--sys-typescale-body4-regular);
      margin: 0;
      max-width: 80%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap; /* stop the titles going onto multiple lines */
    }

    /* This widget's title is some text + then a DOM node link, so it
     * needs some extra styling */
    .computed-style-title-wrapper {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: var(--sys-size-3);
    }

    .computed-style-title-prefix {
      flex-shrink: 0;
    }

    .widget-reveal-container {
      padding: 0;
      background: none;
      border-radius: 0;
    }
  }

  .widget-reveal-button {
    display: flex;
    align-items: center;

    devtools-icon {
      margin-left: var(--sys-size-3);
      color: var(--sys-color-primary);
      width: var(--sys-size-8);
      height: var(--sys-size-8);
    }

  }

  .widget-and-revealer-container {
    width: 100%;
    min-width: var(--sys-size-30);
    max-width: var(--sys-size-33);
  }

  .widget-reveal-container {
    background: var(--sys-color-surface5);
    border-bottom-right-radius: var(--sys-shape-corner-small);
    border-bottom-left-radius: var(--sys-shape-corner-small);
    padding: 0 var(--sys-size-4) var(--sys-size-4) 0;
  }

  .revealer-only .widget-reveal-container {
    background: none;
    border-radius: unset;
  }

  .widget-content-container {
    padding: var(--sys-size-4) var(--sys-size-5);
    border-top-left-radius: var(--sys-shape-corner-medium);
    border-top-right-radius: var(--sys-shape-corner-medium);
    overflow-x: auto;
    background-color: var(--sys-color-surface3);

    --override-computed-style-property-white-space: normal;

    /* When header is present, content follows it and shouldn't have top radii */
    .widget-header+& {
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }

    /* When header is present, content is the last child and needs bottom radii */
    .widget-header+&:last-child {
      border-bottom-left-radius: var(--sys-shape-corner-medium);
      border-bottom-right-radius: var(--sys-shape-corner-medium);
    }
  }

  .network-request-preview {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-4);
    margin-bottom: var(--sys-size-5);
    padding-bottom: var(--sys-size-5);
    border-bottom: 1px solid var(--sys-color-divider);

    .network-request-header {
      display: flex;
      align-items: center;
      gap: var(--sys-size-5);

      .network-request-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--sys-color-surface1);
        border-radius: var(--sys-shape-corner-small);
        border: 1px solid var(--sys-color-divider);
        overflow: hidden;

        img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        devtools-icon {
          width: 20px;
          height: 20px;
        }
      }

      .network-request-details {
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .network-request-name {
          font: var(--sys-typescale-body4-bold);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .network-request-size {
          font: var(--sys-typescale-body4-regular);
          color: var(--sys-color-on-surface-subtle);
        }
      }
    }
  }
}

/*# sourceURL=${import.meta.resolve("././components/chatMessage.css")} */`;

// gen/front_end/panels/ai_assistance/components/WalkthroughUtils.js
var WalkthroughUtils_exports = {};
__export(WalkthroughUtils_exports, {
  getButtonLabel: () => getButtonLabel
});
function smartTruncate(text, targetLength) {
  if (text.length <= targetLength) {
    return { truncatedText: text, moreCharacters: 0 };
  }
  const lastSpaceBefore = text.lastIndexOf(" ", targetLength);
  const firstSpaceAfter = text.indexOf(" ", targetLength);
  let cutIndex = targetLength;
  if (lastSpaceBefore === -1 && firstSpaceAfter === -1) {
    cutIndex = targetLength;
  } else if (lastSpaceBefore === -1) {
    cutIndex = firstSpaceAfter;
  } else if (firstSpaceAfter === -1) {
    cutIndex = lastSpaceBefore;
  } else {
    const distanceToSpaceBefore = targetLength - lastSpaceBefore;
    const distanceToSpaceAfter = firstSpaceAfter - targetLength;
    cutIndex = distanceToSpaceBefore <= distanceToSpaceAfter ? lastSpaceBefore : firstSpaceAfter;
  }
  let truncatedText = text;
  let moreCharacters = 0;
  if (cutIndex < text.length) {
    truncatedText = text.slice(0, cutIndex);
    moreCharacters = text.length - cutIndex;
  }
  return { truncatedText, moreCharacters };
}
function getButtonLabel(input) {
  let labelBase = "";
  if (input.isLoading && !input.isExpanded && input.stepTitle) {
    labelBase = input.stepTitle;
  } else {
    const action2 = input.isExpanded ? "Hide" : "Show";
    const type = input.hasWidgets ? "AI walkthrough" : "thinking";
    labelBase = `${action2} ${type}`;
  }
  if (input.isLoading) {
    return `Loading: ${labelBase}`;
  }
  const TARGET_LENGTH = 50;
  const { truncatedText, moreCharacters } = smartTruncate(input.prompt, TARGET_LENGTH);
  const promptSuffix = moreCharacters > 0 ? ` (and ${moreCharacters} more characters)` : "";
  return `${labelBase} for prompt ${truncatedText}${promptSuffix}`;
}

// gen/front_end/panels/ai_assistance/components/WalkthroughView.js
var WalkthroughView_exports = {};
__export(WalkthroughView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  WalkthroughView: () => WalkthroughView,
  walkthroughCloseTitle: () => walkthroughCloseTitle,
  walkthroughTitle: () => walkthroughTitle
});
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as AiAssistanceModel4 from "./../../models/ai_assistance/ai_assistance.js";
import * as Buttons4 from "./../../ui/components/buttons/buttons.js";
import * as Input2 from "./../../ui/components/input/input.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as Lit4 from "./../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/ai_assistance/components/walkthroughView.css.js
var walkthroughView_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope (devtools-widget) {
  .walkthrough-view {
    height: 100%;
    background-color: var(--sys-color-cdt-base-container);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

@scope (devtools-widget > *) {
  .walkthrough-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 8px;
    height: 35px;
    border-bottom: 1px solid var(--sys-color-divider);
    flex-shrink: 0;
  }

  .walkthrough-title {
    font-size: 11px;
    font-weight: 500;
    color: var(--sys-color-on-surface);
  }

  .steps-container {
    flex: 1;
    overflow-y: auto;
  }

  .steps-scroll-content {
    padding: var(--sys-size-6);
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-6);
  }

  .walkthrough-step {
    display: flex;
    gap: var(--sys-size-6);
    align-items: flex-start;
    justify-content: flex-start;
    flex-shrink: 0;

    .step-number {
      font: var(--sys-typescale-body4-regular);
      color: var(--sys-color-on-surface-subtle);
      padding-top:var(--sys-size-4);
      flex-grow: 0;
      flex-shrink: 0;
    }
  }

  .step-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-5);
    min-width: 0;
    width: 100%;
  }

  .step-container {
    display: flex;
    gap: var(--sys-size-5);
    align-items: flex-start;
  }

  .step-icon {
    color: var(--sys-color-on-surface-subtle);
    width: var(--sys-size-8);
    height: var(--sys-size-8);
    flex-shrink: 0;
    margin-top: var(--sys-size-2);
  }

  .step-content {
    flex: 1;
    font-size: 11px;
    color: var(--sys-color-on-surface);
    line-height: 1.4;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--sys-color-on-surface-subtle);
    font-size: 11px;
  }

  .inline-wrapper {
    display: flex;
    align-items: flex-start;
    gap: var(--sys-size-2);
    justify-content: flex-start;

    .inline-icon {
      display: block;
    margin-top: var(--sys-size-2);
    }
  }

  .walkthrough-inline {
    border-radius: var(--sys-shape-corner-full);
    overflow: hidden;
    width: fit-content;
    max-width: 100%;

    &[open] {
      border-radius: var(--sys-size-5);
      width: auto;
      background-color: var(--sys-color-surface2);
      margin-left: calc(var(--sys-size-6) / 2);
      flex-grow: 1;
    }
  }

  .walkthrough-inline > summary {
    display: flex;
    align-items: center;
    cursor: pointer;
    background-color: transparent;
    /* The same height as a DevTools Button */
    height: var(--sys-size-11);
    font: var(--sys-typescale-body4-regular);
    font-weight:var(--ref-typeface-weight-medium);
    user-select: none;
    list-style: none; /* Hide default triangle */
    justify-content: flex-start;
    gap: var(--sys-size-4);
    color: var(--sys-color-primary);
    padding: 0 var(--sys-size-6);
    overflow: hidden;

    devtools-icon {
      color: var(--sys-color-primary);
    }

    /* Align the summary to look like the tonal button */
    &[data-has-widgets] {
      background: var(--sys-color-tonal-container);
      color: var(--sys-color-on-tonal-container);
      border-radius: var(--sys-shape-corner-full);
      margin-left: var(--sys-size-6);

      devtools-icon {
        color: var(--sys-color-on-tonal-container);
      }
    }

    > .walkthrough-inline-title {
      font: var(--sys-typescale-body4-regular);
      font-weight: var(--ref-typeface-weight-medium);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    &:focus-visible {
      outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
      outline-offset: calc(-1 * var(--sys-size-2));
    }
  }

  .walkthrough-inline[open] > summary {
    border-radius: var(--sys-shape-corner-medium-small);
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
    background: var(--sys-color-surface5);
    color: var(--sys-color-on-surface);

    &[data-has-widgets] {
      margin-left: 0;
    }

    > devtools-icon[name='chevron-right'] {
      transform: rotate(270deg);
    }

  }

  .walkthrough-inline > summary::-webkit-details-marker {
    display: none;
  }

  .walkthrough-inline > summary:hover {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  .walkthrough-inline .steps-container {
    padding: var(--sys-size-6);
    border-top: 1px solid var(--sys-color-divider);
    background-color: transparent;
  }

  .walkthrough-inline > summary > devtools-icon[name='chevron-right'] {
    width: var(--sys-size-8);
    height: var(--sys-size-8);
    transition: transform 0.2s;
    margin-left: auto;
  }

  .walkthrough-inline .step {
    background-color: var(--sys-color-surface5);
  }
}

/*# sourceURL=${import.meta.resolve("././components/walkthroughView.css")} */`;

// gen/front_end/panels/ai_assistance/components/WalkthroughView.js
var lockedString4 = i18n7.i18n.lockedString;
var { html: html6, render: render4, Directives: Directives4 } = Lit4;
var { ref: ref2 } = Directives4;
var SCROLL_ROUND_OFFSET = 2;
var UIStrings2 = {
  /**
   * @description Title for the close button in the walkthrough view.
   */
  close: "Close",
  /**
   * @description Title for the walkthrough view.
   */
  title: "Agent walkthrough",
  /**
   * @description Title for the button that shows the walkthrough when there are no widgets in the walkthrough.
   */
  showThinking: "Show thinking",
  /**
   * @description Title for the button that shows the walkthrough when there are widgets in the walkthrough.
   */
  showAgentWalkthrough: "Show agent walkthrough",
  /**
   * @description Title for the button that hides the walkthrough when there are no widgets in the walkthrough.
   */
  hideThinking: "Hide thinking",
  /**
   * @description Title for the button that hides the walkthrough when there are widgets in the walkthrough.
   */
  hideAgentWalkthrough: "Hide agent walkthrough",
  /**
   * @description Aria label for the spinner to be read by screen reader when a step is in progress.
   */
  inProgress: "In progress"
};
var str_2 = i18n7.i18n.registerUIStrings("panels/ai_assistance/components/WalkthroughView.ts", UIStrings2);
var i18nString2 = i18n7.i18n.getLocalizedString.bind(void 0, str_2);
function walkthroughTitle(input) {
  if (input.isLoading) {
    return titleForStep(input.lastStep);
  }
  if (input.hasWidgets) {
    return lockedString4(UIStrings2.showAgentWalkthrough);
  }
  return lockedString4(UIStrings2.showThinking);
}
function walkthroughCloseTitle(input) {
  if (input.isInlined) {
    return i18nString2(UIStrings2.title);
  }
  if (input.hasWidgets) {
    return lockedString4(UIStrings2.hideAgentWalkthrough);
  }
  return lockedString4(UIStrings2.hideThinking);
}
function renderInlineWalkthrough(input, stepsOutput, allSteps) {
  const lastStep = allSteps.at(-1);
  if (!input.isInlined || !lastStep) {
    return Lit4.nothing;
  }
  function onToggle(event) {
    const isOpen = event.target.open;
    if (!input.message) {
      return;
    }
    if (isOpen) {
      input.onOpen(input.message);
    } else {
      input.onToggle(isOpen, input.message);
    }
  }
  const hasWidgets = allSteps.some((s) => s.widgets?.length);
  const icon = AiAssistanceModel4.AiUtils.getIconName();
  return html6`
    <div class="inline-wrapper" ?data-open=${input.isExpanded} jslog=${VisualLogging3.section("walkthrough-container")}>
      <span class="inline-icon">
        ${input.isLoading ? html6`<devtools-spinner aria-label=${lockedString4(UIStrings2.inProgress)}></devtools-spinner>` : html6`<devtools-icon name=${icon}></devtools-icon>`}
      </span>
      <details class="walkthrough-inline" ?open=${input.isExpanded} @toggle=${onToggle} jslog=${VisualLogging3.expand("walkthrough").track({ click: true })}>
        <summary
          ?data-has-widgets=${!input.isLoading && hasWidgets}
          aria-label=${getButtonLabel({
    isExpanded: input.isExpanded,
    isLoading: input.isLoading,
    hasWidgets,
    prompt: input.prompt,
    stepTitle: titleForStep(lastStep)
  })}
        >
          <h2 class="walkthrough-inline-title">
            ${input.isExpanded ? walkthroughCloseTitle({ hasWidgets, isInlined: true }) : walkthroughTitle({ isLoading: input.isLoading, lastStep, hasWidgets })}
          </h2>
          <devtools-icon name="chevron-right"></devtools-icon>
        </summary>

        ${stepsOutput}
      </details>
    </div>
  `;
}
function renderSidebarWalkthrough(input, stepsOutput, stepsCount) {
  if (input.isInlined) {
    return Lit4.nothing;
  }
  return html6`
    <div class="walkthrough-view" jslog=${VisualLogging3.section("walkthrough-container")}>
      <div class="walkthrough-header">
         <h2 class="walkthrough-title">${i18nString2(UIStrings2.title)}</h2>
         <devtools-button
          .data=${{
    variant: "toolbar",
    iconName: "cross",
    title: i18nString2(UIStrings2.close),
    jslogContext: "close-walkthrough"
  }}
          @click=${() => {
    if (input.message) {
      input.onToggle(false, input.message);
    }
  }}
        ></devtools-button>
      </div>
      ${stepsOutput}
      ${stepsCount === 0 ? html6`
        <div class="empty-state">
          <p>No walkthrough steps available yet.</p>
        </div>
      ` : Lit4.nothing}
    </div>
  `;
}
var DEFAULT_VIEW3 = (input, output, target) => {
  const allSteps = input.message?.parts.filter((t) => t.type === "step")?.map((p) => p.step) ?? [];
  const renderableSteps = allSteps.filter((s) => !s.requestApproval);
  const stepsOutput = renderableSteps.length > 0 ? html6`
    <div class="steps-container" @scroll=${input.handleScroll} ${ref2((el) => {
    output.scrollContainer = el;
  })}>
      <div class="steps-scroll-content" ${ref2((el) => {
    output.stepsContainer = el;
  })}>
        ${renderableSteps.map((step, index) => html6`
          <div class="walkthrough-step">
            <span class="step-number">${index + 1}</span>
            <div class="step-wrapper">
              ${renderStep({
    step,
    isLoading: input.isLoading,
    markdownRenderer: input.markdownRenderer,
    isLast: index === renderableSteps.length - 1
  })}
            </div>
          </div>
        `)}
      </div>
    </div>
  ` : Lit4.nothing;
  render4(html6`
    <style>
      ${Input2.textInputStyles}
      ${chatMessage_css_default}
      ${walkthroughView_css_default}
    </style>
    ${input.isInlined ? renderInlineWalkthrough(input, stepsOutput, allSteps) : renderSidebarWalkthrough(input, stepsOutput, renderableSteps.length)}`, target);
};
var WalkthroughView = class extends UI4.Widget.Widget {
  #view;
  #message = null;
  #isLoading = false;
  #markdownRenderer = null;
  #onToggle = () => {
  };
  #onOpen = () => {
  };
  #isInlined = false;
  #isExpanded = false;
  #prompt = "";
  #pinScrollToBottom = true;
  #isProgrammaticScroll = false;
  #output = {};
  #stepsContainerResizeObserver = new ResizeObserver(() => this.#handleStepsContainerResize());
  #lastStepsContainerWidth = 0;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element);
    this.#view = view;
    this.setMinimumSize(330, 0);
  }
  wasShown() {
    super.wasShown();
    this.#registerResizeObservers();
  }
  willHide() {
    super.willHide();
    this.#stepsContainerResizeObserver.disconnect();
  }
  #registerResizeObservers() {
    if (this.#output.stepsContainer) {
      this.#stepsContainerResizeObserver.observe(this.#output.stepsContainer);
    }
  }
  #handleStepsContainerResize() {
    const width = this.#output.stepsContainer?.offsetWidth ?? 0;
    if (width !== this.#lastStepsContainerWidth) {
      this.#lastStepsContainerWidth = width;
      return;
    }
    if (!this.#pinScrollToBottom || !this.#isLoading) {
      return;
    }
    this.scrollToBottom();
  }
  scrollToBottom() {
    if (!this.#output.stepsContainer) {
      return;
    }
    this.#isProgrammaticScroll = true;
    window.requestAnimationFrame(() => {
      const lastElement = this.#output.stepsContainer?.lastElementChild;
      if (lastElement) {
        lastElement.scrollIntoView({
          behavior: "smooth",
          block: "end"
        });
      }
    });
  }
  #handleScroll = (ev) => {
    if (!ev.target || !(ev.target instanceof HTMLElement)) {
      return;
    }
    if (this.#isProgrammaticScroll) {
      const isAtBottom = ev.target.scrollTop + ev.target.clientHeight + SCROLL_ROUND_OFFSET >= ev.target.scrollHeight;
      if (isAtBottom) {
        this.#isProgrammaticScroll = false;
      }
      return;
    }
    this.#pinScrollToBottom = ev.target.scrollTop + ev.target.clientHeight + SCROLL_ROUND_OFFSET >= ev.target.scrollHeight;
  };
  set isLoading(isLoading) {
    this.#isLoading = isLoading;
    this.requestUpdate();
  }
  get isLoading() {
    return this.#isLoading;
  }
  get markdownRenderer() {
    return this.#markdownRenderer;
  }
  set markdownRenderer(markdownRenderer) {
    this.#markdownRenderer = markdownRenderer;
    this.requestUpdate();
  }
  get message() {
    return this.#message;
  }
  get onOpen() {
    return this.#onOpen;
  }
  set onOpen(onOpen) {
    this.#onOpen = onOpen;
    this.requestUpdate();
  }
  set message(message) {
    this.#message = message;
    this.requestUpdate();
  }
  set onToggle(onToggle) {
    this.#onToggle = onToggle;
    this.requestUpdate();
  }
  set isInlined(isInlined) {
    this.#isInlined = isInlined;
    this.requestUpdate();
  }
  set isExpanded(isExpanded) {
    this.#isExpanded = isExpanded;
    this.requestUpdate();
  }
  get prompt() {
    return this.#prompt;
  }
  set prompt(prompt) {
    this.#prompt = prompt;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#markdownRenderer) {
      return;
    }
    const message = this.#message ? getDeduplicatedWidgetsMessage(this.#message) : null;
    this.#view({
      isLoading: this.#isLoading,
      markdownRenderer: this.#markdownRenderer,
      onToggle: this.#onToggle,
      onOpen: this.#onOpen,
      isInlined: this.#isInlined,
      isExpanded: this.#isExpanded,
      prompt: this.#prompt,
      message,
      handleScroll: this.#handleScroll
    }, this.#output, this.contentElement);
    this.#registerResizeObservers();
    if (this.#pinScrollToBottom && this.#isLoading) {
      this.scrollToBottom();
    }
  }
};

// gen/front_end/panels/ai_assistance/components/ChatMessage.js
var { html: html7, Directives: { ref: ref3, ifDefined } } = Lit5;
var lockedString5 = i18n9.i18n.lockedString;
var { widget: widget3 } = UI5.Widget;
var REPORT_URL = "https://crbug.com/364805393";
var SCROLL_ROUNDING_OFFSET = 1;
var MAX_NUM_LINES_IN_CODEBLOCK = 11;
var UIStringsNotTranslate4 = {
  /**
   * @description The title of the button that allows submitting positive
   * feedback about the response for AI assistance.
   */
  thumbsUp: "Good response",
  /**
   * @description The title of the button that allows submitting negative
   * feedback about the response for AI assistance.
   */
  thumbsDown: "Bad response",
  /**
   * @description The placeholder text for the feedback input.
   */
  provideFeedbackPlaceholder: "Provide additional feedback",
  /**
   * @description The disclaimer text that tells the user what will be shared
   * and what will be stored.
   */
  disclaimer: "Submitted feedback will also include your conversation",
  /**
   * @description The button text for the action of submitting feedback.
   */
  submit: "Submit",
  /**
   * @description The header of the feedback form asking.
   */
  whyThisRating: "Why did you choose this rating? (optional)",
  /**
   * @description The button text for the action that hides the feedback form.
   */
  close: "Close",
  /**
   * @description The title of the button that opens a page to report a legal
   * issue with the AI assistance message.
   */
  report: "Report legal issue",
  /**
   * @description The title of the button for scrolling to see next suggestions
   */
  scrollToNext: "Scroll to next suggestions",
  /**
   * @description The title of the button for scrolling to see previous suggestions
   */
  scrollToPrevious: "Scroll to previous suggestions",
  /**
   * @description The title of the button that copies the AI-generated response to the clipboard.
   */
  copyResponse: "Copy response",
  /**
   * @description The error message when the request to the LLM failed for some reason.
   */
  systemError: "Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue. If this keeps happening, update Chrome to the latest version.",
  /**
   * @description The error message when the LLM gets stuck in a loop (max steps reached).
   */
  maxStepsError: "Seems like I am stuck with the investigation. It would be better if you start over.",
  /**
   * @description The error message when the LLM selects context from a different origin.
   */
  crossOriginError: "I have selected the new context but you will have to start a new chat.",
  /**
   * @description Displayed when the user stop the response
   */
  stoppedResponse: "You stopped this response",
  /**
   * @description Button text that confirm code execution that may affect the page.
   */
  confirmActionRequestApproval: "Continue",
  /**
   * @description Button text that cancels code execution that may affect the page.
   */
  declineActionRequestApproval: "Cancel",
  /**
   * @description The generic name of the AI agent (do not translate)
   */
  ai: "AI",
  /**
   * @description Gemini (do not translate)
   */
  gemini: "Gemini",
  /**
   * @description The fallback text when a step has no title yet
   */
  investigating: "Investigating",
  /**
   * @description Prefix to the title of each thinking step of a user action is required to continue
   */
  paused: "Paused",
  /**
   * @description Heading text for the code block that shows the executed code.
   */
  codeExecuted: "Code executed",
  /**
   * @description Heading text for the code block that shows the code to be executed after side effect confirmation.
   */
  codeToExecute: "Code to execute",
  /**
   * @description Heading text for the code block that shows the returned data.
   */
  dataReturned: "Data returned",
  /**
   * @description Aria label for the check mark icon to be read by screen reader
   */
  completed: "Completed",
  /**
   * @description Aria label for the spinner to be read by screen reader when a step is in progress.
   */
  inProgress: "In progress",
  /**
   * @description Aria label for the aborted icon to be read by screen reader
   */
  aborted: "Aborted",
  /**
   * @description Alt text for the image input (displayed in the chat messages) that has been sent to the model.
   */
  imageInputSentToTheModel: "Image input sent to the model",
  /**
   * @description Title for the link which wraps the image input rendered in chat messages.
   */
  openImageInNewTab: "Open image in a new tab",
  /**
   * @description Alt text for image when it is not available.
   */
  imageUnavailable: "Image unavailable",
  /**
   * @description Title for the button that takes the user into other DevTools panels to reveal items the AI references.
   */
  reveal: "Reveal",
  /**
   * @description Title used for revealing the performance trace.
   */
  revealTrace: "Reveal trace",
  /**
   * @description Accessible label for the reveal button in the computed styles widget.
   */
  revealComputedStyles: "Reveal computed styles",
  /**
   * @description Accessible label for the reveal button in the core web vitals widget.
   */
  revealCoreWebVitals: "Reveal Core Web Vitals",
  /**
   * @description Accessible label for the reveal button in the style properties widget.
   */
  revealStyleProperties: "Reveal style properties",
  /**
   * @description Accessible label for the reveal button in the LCP breakdown widget.
   */
  revealLcpBreakdown: "Reveal LCP breakdown",
  /**
   * @description Accessible label for the reveal button in the LCP element widget.
   */
  revealLcpElement: "Reveal LCP element",
  /**
   * @description Accessible label for the reveal button in the performance summary widget.
   */
  revealPerformanceSummary: "Reveal performance summary",
  /**
   * @description Accessible label for the reveal button in the bottom up thread activity widget.
   */
  revealBottomUpTree: "Reveal bottom-up thread activity",
  /**
   * @description Title for the core web vitals widget.
   */
  coreVitals: "Core Web Vitals",
  /**
   * @description Title for the LCP breakdown widget.
   */
  lcpBreakdown: "LCP breakdown",
  /**
   * @description Title for the LCP element widget.
   */
  lcpElement: "LCP element",
  /**
   * @description Title for the performance summary widget.
   */
  performanceSummary: "Performance summary",
  /**
   * @description The title of the button that allows exporting the conversation for agents.
   */
  exportForAgents: "Copy to coding agent",
  /**
   * @description Title for the bottom up thread activity widget.
   */
  bottomUpTree: "Bottom-up thread activity"
};
var DEFAULT_VIEW4 = (input, output, target) => {
  const hasAiV2 = Boolean(Root3.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled);
  const message = input.message;
  if (message.entity === "user") {
    const imageInput = message.imageInput && "inlineData" in message.imageInput ? renderImageChatMessage(message.imageInput.inlineData) : Lit5.nothing;
    const messageClasses2 = Lit5.Directives.classMap({
      "chat-message": true,
      query: true,
      "is-last-message": input.isLastMessage,
      "is-first-message": input.isFirstMessage,
      "ai-v2": hasAiV2
    });
    const userQueryWrapperClasses = Lit5.Directives.classMap({
      // Don't need to style at all unless we are on the V2 flag.
      // Once we ship this can be removed entirely.
      "user-query-wrapper": hasAiV2
    });
    Lit5.render(html7`
      <style>${Input3.textInputStyles}</style>
      <style>${chatMessage_css_default}</style>
      <div class=${userQueryWrapperClasses}>
        <section class=${messageClasses2} jslog=${VisualLogging4.section("question")}>
          ${imageInput}
          <div class="message-content">${renderTextAsMarkdown(message.text, input.markdownRenderer)}</div>
        </section>
      </div>
    `, target);
    return;
  }
  const steps = message.parts.filter((part) => part.type === "step").map((part) => part.step);
  const icon = AiAssistanceModel5.AiUtils.getIconName();
  const messageClasses = Lit5.Directives.classMap({
    "chat-message": true,
    answer: true,
    "is-last-message": input.isLastMessage,
    "is-first-message": input.isFirstMessage,
    "ai-v2": hasAiV2
  });
  Lit5.render(html7`
    <style>${Input3.textInputStyles}</style>
    <style>${chatMessage_css_default}</style>
    <section class=${messageClasses} jslog=${VisualLogging4.section("answer")}>
      ${hasAiV2 ? Lit5.nothing : html7`
        <div class="message-info">
          <devtools-icon name=${icon}></devtools-icon>
          <div class="message-name">
            <h2>${AiAssistanceModel5.AiUtils.isGeminiBranding() ? lockedString5(UIStringsNotTranslate4.gemini) : lockedString5(UIStringsNotTranslate4.ai)}</h2>
          </div>
        </div>`}
      ${hasAiV2 ? renderWalkthroughUI(input, steps) : Lit5.nothing}
      <div class="answer-body-wrapper">
        ${Lit5.Directives.repeat(message.parts, (_, index) => index, (part, index) => {
    const isLastPart = index === message.parts.length - 1;
    if (part.type === "answer") {
      return html7`<p>${renderTextAsMarkdown(part.text, input.markdownRenderer, { animate: !input.isReadOnly && input.isLoading && isLastPart && input.isLastMessage })}</p>`;
    }
    if (part.type === "widget") {
      return html7`${Lit5.Directives.until(renderWidgets(part.widgets, { wrapperClass: "main-widgets-wrapper" }))}`;
    }
    if (!hasAiV2 && part.type === "step") {
      return renderStep({
        step: part.step,
        isLoading: input.isLoading,
        markdownRenderer: input.markdownRenderer,
        isLast: isLastPart
      });
    }
    return Lit5.nothing;
  })}
        ${renderError(message)}
        ${input.shouldShowCSSChangeSummary && hasAiV2 && input.changeSummary ? html7`
          <devtools-code-block
            .code=${input.changeSummary}
            .codeLang=${"css"}
            .displayLimit=${MAX_NUM_LINES_IN_CODEBLOCK}
            .displayNotice=${true}
            class="ai-css-change"
          ></devtools-code-block>
        ` : Lit5.nothing}
        ${input.showActions ? renderActions(input, output) : Lit5.nothing}
      </div>
      ${hasAiV2 ? renderSideEffectStepsUI(input, steps) : Lit5.nothing}
    </section>
  `, target);
};
function renderTextAsMarkdown(text, markdownRenderer, { animate, ref: refFn } = {}) {
  let tokens = [];
  try {
    tokens = Marked.Marked.lexer(text);
    for (const token of tokens) {
      markdownRenderer.renderToken(token);
    }
  } catch {
    return html7`${text}`;
  }
  return html7`<devtools-markdown-view
    .data=${{ tokens, renderer: markdownRenderer, animationEnabled: animate }}
    ${refFn ? ref3(refFn) : Lit5.nothing}>
  </devtools-markdown-view>`;
}
function titleForStep(step) {
  return step.title ?? `${lockedString5(UIStringsNotTranslate4.investigating)}\u2026`;
}
function renderTitle(step) {
  const paused = step.requestApproval ? html7`<span class="paused">${lockedString5(UIStringsNotTranslate4.paused)}: </span>` : Lit5.nothing;
  return html7`<h3 class="title" aria-label=${titleForStep(step)}>${paused}${titleForStep(step)}</h3>`;
}
function renderStepCode(step) {
  if (!step.code && !step.output) {
    return Lit5.nothing;
  }
  const codeHeadingText = step.output && !step.canceled ? lockedString5(UIStringsNotTranslate4.codeExecuted) : lockedString5(UIStringsNotTranslate4.codeToExecute);
  const code = step.code ? html7`<div class="action-result">
      <devtools-code-block
        .code=${step.code.trim()}
        .codeLang=${"js"}
        .displayNotice=${!Boolean(step.output)}
        .header=${codeHeadingText}
        .showCopyButton=${true}
      ></devtools-code-block>
  </div>` : Lit5.nothing;
  const output = step.output ? html7`<div class="js-code-output">
    <devtools-code-block
      .code=${step.output}
      .codeLang=${"js"}
      .displayNotice=${true}
      .header=${lockedString5(UIStringsNotTranslate4.dataReturned)}
      .showCopyButton=${false}
    ></devtools-code-block>
  </div>` : Lit5.nothing;
  return html7`<div class="step-code">${code}${output}</div>`;
}
function renderStepDetails({ step, markdownRenderer, isLast }) {
  const sideEffects = isLast && step.requestApproval ? renderSideEffectConfirmationUi(step) : Lit5.nothing;
  const thought = step.thought ? html7`<p>${renderTextAsMarkdown(step.thought, markdownRenderer)}</p>` : Lit5.nothing;
  const contextDetails = step.contextDetails ? html7`${Lit5.Directives.repeat(step.contextDetails, (contextDetail) => {
    return html7`<div class="context-details">
      <devtools-code-block
        .code=${contextDetail.text}
        .codeLang=${contextDetail.codeLang || ""}
        .displayNotice=${false}
        .header=${contextDetail.title}
        .showCopyButton=${true}
      ></devtools-code-block>
    </div>`;
  })}` : Lit5.nothing;
  return html7`<div class="step-details">
    ${thought}
    ${renderStepCode(step)}
    ${sideEffects}
    ${contextDetails}
  </div>`;
}
function renderWalkthroughSidebarButton(input, steps) {
  const { message, walkthrough } = input;
  const lastStep = steps.at(-1);
  if (walkthrough.isInlined || !lastStep) {
    return Lit5.nothing;
  }
  const hasOneStepWithWidget = steps.some((step) => step.widgets?.length);
  const isExpanded = walkthrough.isExpanded && input.message === input.walkthrough.activeSidebarMessage;
  const title = isExpanded ? walkthroughCloseTitle({ hasWidgets: hasOneStepWithWidget }) : walkthroughTitle({
    isLoading: input.isLoading,
    hasWidgets: hasOneStepWithWidget,
    lastStep
  });
  const variant = hasOneStepWithWidget && !input.isLoading ? "tonal" : "text";
  const icon = AiAssistanceModel5.AiUtils.getIconName();
  const toggleContainerClasses = Lit5.Directives.classMap({
    "walkthrough-toggle-container": true,
    // We only apply the widget styling when loading is complete
    "has-widgets": hasOneStepWithWidget && !input.isLoading
  });
  const accessibleLabel = getButtonLabel({
    isExpanded,
    isLoading: input.isLoading,
    hasWidgets: hasOneStepWithWidget,
    prompt: input.prompt,
    stepTitle: titleForStep(lastStep)
  });
  return html7`
    <div class=${toggleContainerClasses}>
      ${input.isLoading ? html7`<devtools-spinner></devtools-spinner>` : html7`<devtools-icon name=${icon}></devtools-icon>`}
      <devtools-button
        .variant=${variant}
        .size=${"SMALL"}
        .title=${lastStep.isLoading ? titleForStep(lastStep) : title}
        .accessibleLabel=${accessibleLabel}
        .jslogContext=${walkthrough.isExpanded ? "ai-hide-walkthrough-sidebar" : "ai-show-walkthrough-sidebar"}
        data-show-walkthrough
        @click=${() => {
    if (walkthrough.activeSidebarMessage === input.message && walkthrough.isExpanded) {
      walkthrough.onToggle(false, message);
    } else {
      walkthrough.onOpen(message);
    }
  }}>${title}<devtools-icon class="chevron" .name=${isExpanded ? "cross" : "chevron-right"}></devtools-icon>
      </devtools-button>
    </div>
  `;
}
function renderWalkthroughUI(input, steps) {
  const lastStep = steps.at(-1);
  if (!lastStep) {
    return Lit5.nothing;
  }
  const openWalkThroughSidebarButton = !input.walkthrough.isInlined ? renderWalkthroughSidebarButton(input, steps) : Lit5.nothing;
  const isExpanded = input.walkthrough.isInlined ? input.walkthrough.inlineExpandedMessages.includes(input.message) : input.walkthrough.isExpanded && input.walkthrough.activeSidebarMessage === input.message;
  const walkthroughInline = input.walkthrough.isInlined ? html7`
    <div class="walkthrough-container">
      ${widget3(WalkthroughView, {
    message: input.message,
    isLoading: input.isLoading && input.isLastMessage,
    markdownRenderer: input.markdownRenderer,
    isInlined: true,
    isExpanded,
    prompt: input.prompt,
    onToggle: input.walkthrough.onToggle,
    onOpen: input.walkthrough.onOpen
  })}
    </div>
  ` : Lit5.nothing;
  return html7`
    ${openWalkThroughSidebarButton}
    ${walkthroughInline}
  `;
}
function renderSideEffectStepsUI(input, steps) {
  const sideEffectSteps = steps.filter((s) => s.requestApproval);
  if (sideEffectSteps.length === 0) {
    return Lit5.nothing;
  }
  return html7`
    ${sideEffectSteps.map((step) => html7`
      <div class="side-effect-container">
        ${renderStep({
    step,
    isLoading: input.isLoading,
    markdownRenderer: input.markdownRenderer,
    isLast: true
  })}
      </div> `)}
  `;
}
function renderStepBadge({ step, isLoading, isLast }) {
  if (isLoading && isLast && !step.requestApproval) {
    return html7`<devtools-spinner aria-label=${lockedString5(UIStringsNotTranslate4.inProgress)}></devtools-spinner>`;
  }
  let iconName = "checkmark";
  let ariaLabel = lockedString5(UIStringsNotTranslate4.completed);
  let role = "button";
  if (isLast && step.requestApproval) {
    role = void 0;
    ariaLabel = lockedString5(UIStringsNotTranslate4.paused);
    iconName = "pause-circle";
  } else if (step.canceled) {
    ariaLabel = lockedString5(UIStringsNotTranslate4.aborted);
    iconName = "cross";
  }
  return html7`<devtools-icon
      class="indicator"
      role=${ifDefined(role)}
      aria-label=${ifDefined(ariaLabel)}
      .name=${iconName}
    ></devtools-icon>`;
}
function renderStep({ step, isLoading, markdownRenderer, isLast }) {
  const stepClasses = Lit5.Directives.classMap({
    step: true,
    empty: !step.thought && !step.code && !step.contextDetails && !step.requestApproval,
    paused: Boolean(step.requestApproval),
    canceled: Boolean(step.canceled)
  });
  return html7`
    <details class=${stepClasses}
      jslog=${VisualLogging4.expand("step").track({ click: true })}
      .open=${Boolean(step.requestApproval)}>
      <summary>
        <div class="summary">
          ${renderStepBadge({ step, isLoading, isLast })}
          ${renderTitle(step)}
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        </div>
      </summary>
      ${renderStepDetails({ step, markdownRenderer, isLast })}
    </details>
    ${Lit5.Directives.until(renderWidgets(step.widgets, { wrapperClass: "step-widgets-wrapper" }))}
    `;
}
var nodeCache = /* @__PURE__ */ new Map();
async function resolveNode(backendNodeId) {
  const cachedNode = nodeCache.get(backendNodeId);
  if (cachedNode) {
    return cachedNode;
  }
  const target = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
  if (!target) {
    return null;
  }
  const node = new SDK3.DOMModel.DeferredDOMNode(target, backendNodeId);
  const resolved = await node.resolvePromise();
  if (resolved) {
    nodeCache.set(backendNodeId, resolved);
  }
  return resolved;
}
async function makeComputedStyleWidget(widgetData) {
  const domNodeForId = await resolveNode(widgetData.data.backendNodeId);
  if (!domNodeForId) {
    return null;
  }
  const styles = new ComputedStyle.ComputedStyleModel.ComputedStyle(domNodeForId, widgetData.data.computedStyles);
  let filterText = null;
  try {
    filterText = new RegExp(widgetData.data.properties.join("|"), "i");
  } catch {
    return null;
  }
  const renderedWidget = html7`<devtools-widget
      class="computed-styles-widget" ${widget3(Elements.ComputedStyleWidget.ComputedStyleWidget, {
    nodeStyle: styles,
    matchedStyles: widgetData.data.matchedCascade,
    // This disables showing the nested traces and detailed information in the widget.
    propertyTraces: null,
    allowUserControl: false,
    filterText,
    enableNarrowViewResizing: false
  })}></devtools-widget>`;
  return {
    renderedWidget,
    revealable: new Elements.ElementsPanel.NodeComputedStyles(domNodeForId),
    accessibleRevealLabel: lockedString5(UIStringsNotTranslate4.revealComputedStyles),
    // clang-format off
    title: html7`
      <span class="computed-style-title-wrapper">
        <span class="computed-style-title-prefix">Computed styles</span>
        <span class="style-class-wrapper">
          (<devtools-widget
            ${widget3(PanelsCommon3.DOMLinkifier.DOMNodeLink, {
      node: domNodeForId
    })}
          ></devtools-widget>)
        </span>
      </span>`,
    // clang-format on
    jslogContext: "computed-styles"
  };
}
async function makeCoreWebVitalsWidget(widgetData) {
  const renderedWidget = html7`<devtools-widget class="core-vitals-widget" ${widget3(TimelineComponents.CWVMetrics.CWVMetrics, { data: widgetData.data, skipBottomBorder: true })}>
  </devtools-widget>`;
  return {
    renderedWidget,
    revealable: new TimelineUtils.Helpers.RevealableCoreVitals(widgetData.data.insightSetKey),
    accessibleRevealLabel: lockedString5(UIStringsNotTranslate4.revealCoreWebVitals),
    title: lockedString5(UIStringsNotTranslate4.coreVitals),
    jslogContext: "core-web-vitals"
  };
}
async function makeStylePropertiesWidget(widgetData) {
  const domNodeForId = await resolveNode(widgetData.data.backendNodeId);
  if (!domNodeForId) {
    return null;
  }
  let filter = null;
  try {
    filter = widgetData.data.selector ? new RegExp(widgetData.data.selector) : null;
  } catch {
    return null;
  }
  const renderedWidget = html7`<devtools-widget
      class="styling-preview-widget"
      ${widget3(Elements.StandaloneStylesContainer.StandaloneStylesContainer, {
    domNode: domNodeForId,
    filter
  })}>
  </devtools-widget>`;
  return {
    renderedWidget,
    revealable: domNodeForId,
    accessibleRevealLabel: lockedString5(UIStringsNotTranslate4.revealStyleProperties),
    title: html7`<devtools-widget
      ${widget3(PanelsCommon3.DOMLinkifier.DOMNodeLink, {
      node: domNodeForId
    })}
    ></devtools-widget>`,
    jslogContext: "standalone-styles"
  };
}
async function makePerfInsightWidget(widgetData) {
  switch (widgetData.data.insight) {
    case "lcp": {
      const insight = widgetData.data.insightData;
      if (!insight || !Trace.Insights.Models.LCPBreakdown.isLCPBreakdownInsight(insight)) {
        return null;
      }
      const renderedWidget = html7`<devtools-widget
        class="lcp-breakdown-widget"
        ${widget3(TimelineInsights.LCPBreakdown.LCPBreakdown, {
        model: insight,
        minimal: true
      })}></devtools-widget>`;
      return {
        renderedWidget,
        revealable: new TimelineUtils.Helpers.RevealableInsight(insight),
        accessibleRevealLabel: lockedString5(UIStringsNotTranslate4.revealLcpBreakdown),
        title: lockedString5(UIStringsNotTranslate4.lcpBreakdown),
        jslogContext: "lcp-breakdown"
      };
    }
    default:
      return null;
  }
}
async function makeBottomUpTimelineTreeWidget(widgetData) {
  const bottomUpRootNode = AiAssistanceModel5.AIQueries.AIQueries.mainThreadActivityBottomUp(widgetData.data.bounds, widgetData.data.parsedTrace);
  if (!bottomUpRootNode) {
    return null;
  }
  const events = bottomUpRootNode.events;
  const startTime = Trace.Helpers.Timing.microToMilli(widgetData.data.bounds.min);
  const endTime = Trace.Helpers.Timing.microToMilli(widgetData.data.bounds.max);
  const renderedWidget = html7`<devtools-widget
      class="bottom-up-timeline-tree-widget"
      ${widget3(Timeline.TimelineTreeView.BottomUpTimelineTreeView, {
    selectedEvents: events,
    parsedTrace: widgetData.data.parsedTrace,
    startTime,
    endTime,
    compactMode: true,
    maxLinkLength: 15,
    maxRows: 10
  })}></devtools-widget>`;
  return {
    renderedWidget,
    revealable: new TimelineUtils.Helpers.RevealableBottomUpProfile(widgetData.data.bounds),
    accessibleRevealLabel: lockedString5(UIStringsNotTranslate4.revealBottomUpTree),
    title: lockedString5(UIStringsNotTranslate4.bottomUpTree),
    jslogContext: "bottom-up"
  };
}
function renderWidgetResponse(response) {
  if (response === null) {
    return Lit5.nothing;
  }
  function onReveal() {
    if (response === null) {
      return;
    }
    void Common4.Revealer.reveal(response?.revealable);
  }
  const classes = Lit5.Directives.classMap({
    "widget-and-revealer-container": true,
    "revealer-only": response.renderedWidget === null
  });
  const revealButton = html7`
    <devtools-button class="widget-reveal-button"
      .variant=${"text"}
      .accessibleLabel=${response.accessibleRevealLabel}
      .jslogContext=${"reveal"}
      @click=${onReveal}
    >
      ${response.customRevealTitle ?? lockedString5(UIStringsNotTranslate4.reveal)}
      <devtools-icon name='tab-move'></devtools-icon>
    </devtools-button>
  `;
  return html7`
    <div class=${classes} jslog=${ifDefined(response.jslogContext ? VisualLogging4.section(response.jslogContext) : void 0)}>
      ${response.title ? html7`
        <div class="widget-header">
          <h4 class="widget-name">${response.title}</h4>
          <div class="widget-reveal-container">
            ${revealButton}
          </div>
        </div>
      ` : Lit5.nothing}
      ${response.renderedWidget ? html7`
        <div class="widget-content-container">
          ${response.renderedWidget}
        </div>` : Lit5.nothing}
      ${!response.title ? html7`
        <div class="widget-reveal-container">
          ${revealButton}
        </div>
      ` : Lit5.nothing}
    </div>
    `;
}
async function makePerformanceTraceWidget(widgetData) {
  const customRevealTitle = lockedString5(UIStringsNotTranslate4.revealTrace);
  return {
    renderedWidget: null,
    title: null,
    revealable: new Timeline.TimelinePanel.ParsedTraceRevealable(widgetData.data.parsedTrace),
    customRevealTitle,
    accessibleRevealLabel: customRevealTitle,
    jslogContext: "performance-trace"
  };
}
function renderNetworkRequestPreview(networkRequest) {
  const filename = networkRequest.url.split("/").pop() || networkRequest.url;
  const size = i18n9.ByteUtilities.bytesToString(networkRequest.size);
  const resourceType = Common4.ResourceType.resourceTypes[networkRequest.resourceType];
  const { iconName, color } = PanelUtils3.iconDataForResourceType(resourceType);
  return html7`
    <div class="network-request-preview">
      <div class="network-request-header">
        <div class="network-request-icon">
          ${resourceType.isImage() ? html7`<img src=${networkRequest.imageUrl ?? networkRequest.url} alt=${filename} />` : html7`<devtools-icon name=${iconName} style=${Lit5.Directives.styleMap({
    color: color ?? ""
  })}></devtools-icon>`}
        </div>
        <div class="network-request-details">
          <div class="network-request-name" title=${networkRequest.url}>${filename}</div>
          <div class="network-request-size">${size}</div>
        </div>
      </div>
    </div>
  `;
}
async function makeDomTreeWidget(widgetData) {
  const root = widgetData.data.root;
  if (!(root instanceof SDK3.DOMModel.DOMNodeSnapshot)) {
    return null;
  }
  const networkRequest = widgetData.data.networkRequest;
  const renderedWidget = html7`
    ${networkRequest ? renderNetworkRequestPreview(networkRequest) : Lit5.nothing}
    <devtools-widget class="dom-tree-widget" ${widget3(Elements.ElementsTreeOutline.DOMTreeWidget, {
    maxTreeDepth: 2,
    enableContextMenu: false,
    showComments: false,
    showAIButton: false,
    disableEdits: true,
    expandRoot: true,
    rootDOMNode: root,
    visibleWidth: 400,
    wrap: true,
    maxRows: 10
  })}></devtools-widget>
  `;
  return {
    renderedWidget,
    revealable: new SDK3.DOMModel.DeferredDOMNode(root.domModel().target(), root.backendNodeId()),
    accessibleRevealLabel: lockedString5(UIStringsNotTranslate4.revealLcpElement),
    title: lockedString5(UIStringsNotTranslate4.lcpElement),
    jslogContext: "dom-snapshot"
  };
}
function getWidgetSignature(widget6) {
  switch (widget6.name) {
    case "COMPUTED_STYLES":
      return `${widget6.name}:${widget6.data.backendNodeId}`;
    case "CORE_VITALS":
      return `${widget6.name}:${widget6.data.insightSetKey}`;
    case "STYLE_PROPERTIES":
      return `${widget6.name}:${widget6.data.backendNodeId}:${widget6.data.selector ?? ""}`;
    case "DOM_TREE":
      return `${widget6.name}:${widget6.data.root.backendNodeId()}`;
    case "PERFORMANCE_TRACE":
      return `${widget6.name}`;
    case "PERF_INSIGHT":
      return `${widget6.name}:${widget6.data.insight}:${widget6.data.insightData.insightKey}:${widget6.data.insightData.navigation?.args?.data?.navigationId ?? "no-nav-id"}`;
    case "TIMELINE_RANGE_SUMMARY":
      return `${widget6.name}:${widget6.data.track}:${widget6.data.bounds.min}-${widget6.data.bounds.max}`;
    case "BOTTOM_UP_TREE":
      return `${widget6.name}:${widget6.data.bounds.min}-${widget6.data.bounds.max}`;
    default:
      Platform5.assertNever(widget6, "Unknown AiWidget name");
  }
}
function getDeduplicatedWidgetsMessage(message) {
  const seenWidgets = /* @__PURE__ */ new Set();
  const filterWidgets = (widgets) => {
    return widgets.filter((widget6) => {
      const signature = getWidgetSignature(widget6);
      if (seenWidgets.has(signature)) {
        return false;
      }
      seenWidgets.add(signature);
      return true;
    });
  };
  const deduplicatedParts = message.parts.map((part) => {
    if (part.type === "widget") {
      return {
        ...part,
        widgets: filterWidgets(part.widgets)
      };
    }
    if (part.type === "step" && part.step.widgets) {
      return {
        ...part,
        step: {
          ...part.step,
          widgets: filterWidgets(part.step.widgets)
        }
      };
    }
    return part;
  });
  return {
    ...message,
    parts: deduplicatedParts
  };
}
async function renderWidgets(widgets, options = {}) {
  if (!Root3.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled || !widgets || widgets.length === 0) {
    return Lit5.nothing;
  }
  const ui = await Promise.all(widgets.map(async (widgetData) => {
    let response = null;
    switch (widgetData.name) {
      case "COMPUTED_STYLES":
        response = await makeComputedStyleWidget(widgetData);
        break;
      case "CORE_VITALS":
        response = await makeCoreWebVitalsWidget(widgetData);
        break;
      case "STYLE_PROPERTIES":
        response = await makeStylePropertiesWidget(widgetData);
        break;
      case "DOM_TREE":
        response = await makeDomTreeWidget(widgetData);
        break;
      case "PERFORMANCE_TRACE":
        response = await makePerformanceTraceWidget(widgetData);
        break;
      case "PERF_INSIGHT":
        response = await makePerfInsightWidget(widgetData);
        break;
      case "TIMELINE_RANGE_SUMMARY":
        response = await makeTimelineRangeSummaryWidget(widgetData);
        break;
      case "BOTTOM_UP_TREE":
        response = await makeBottomUpTimelineTreeWidget(widgetData);
        break;
      default:
        Platform5.assertNever(widgetData, "Unknown AiWidget name");
    }
    return renderWidgetResponse(response);
  }));
  if (options.wrapperClass) {
    return html7`<div class=${options.wrapperClass}>${ui}</div>`;
  }
  return html7`${ui}`;
}
function renderSideEffectConfirmationUi(step) {
  if (!step.requestApproval) {
    return Lit5.nothing;
  }
  return html7`<div
    class="side-effect-confirmation"
    jslog=${VisualLogging4.section("side-effect-confirmation")}
  >
    ${step.requestApproval.description ? html7`<p>${step.requestApproval.description}</p>` : Lit5.nothing}
    <div class="side-effect-buttons-container">
      <devtools-button
        .data=${{
    variant: "outlined",
    jslogContext: "decline-execute-code"
  }}
        @click=${() => step.requestApproval?.onAnswer(false)}
      >${lockedString5(UIStringsNotTranslate4.declineActionRequestApproval)}</devtools-button>
      <devtools-button
        .data=${{
    variant: "primary",
    jslogContext: "accept-execute-code",
    iconName: "play"
  }}
        @click=${() => step.requestApproval?.onAnswer(true)}
      >${lockedString5(UIStringsNotTranslate4.confirmActionRequestApproval)}</devtools-button>
    </div>
  </div>`;
}
function renderError(message) {
  if (message.error) {
    let errorMessage;
    switch (message.error) {
      case "unknown":
      case "block":
        errorMessage = UIStringsNotTranslate4.systemError;
        break;
      case "max-steps":
        errorMessage = UIStringsNotTranslate4.maxStepsError;
        break;
      case "cross-origin":
        errorMessage = UIStringsNotTranslate4.crossOriginError;
        break;
      case "abort":
        return html7`<p class="aborted" jslog=${VisualLogging4.section("aborted")}>${lockedString5(UIStringsNotTranslate4.stoppedResponse)}</p>`;
    }
    return html7`<p class="error" jslog=${VisualLogging4.section("error")}>${lockedString5(errorMessage)}</p>`;
  }
  return Lit5.nothing;
}
function renderImageChatMessage(inlineData) {
  if (inlineData.data === AiAssistanceModel5.AiConversation.NOT_FOUND_IMAGE_DATA) {
    return html7`<div class="unavailable-image" title=${UIStringsNotTranslate4.imageUnavailable}>
      <devtools-icon name='file-image'></devtools-icon>
    </div>`;
  }
  const imageUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
  return html7`<devtools-link
      class="image-link" title=${UIStringsNotTranslate4.openImageInNewTab}
      href=${imageUrl}
    >
      <img src=${imageUrl} alt=${UIStringsNotTranslate4.imageInputSentToTheModel} />
    </devtools-link>`;
}
function renderActions(input, output) {
  const aiAssistanceV2 = Root3.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled;
  const rowClasses = Lit5.Directives.classMap({
    "ai-assistance-feedback-row": true,
    "not-v2": !aiAssistanceV2
  });
  return html7`
    <div class=${rowClasses}>
      <div class="action-buttons">
        ${input.showRateButtons ? html7`
          <devtools-button
            .data=${{
    variant: "icon",
    size: "SMALL",
    iconName: "thumb-up",
    toggledIconName: "thumb-up-filled",
    toggled: input.currentRating === "POSITIVE",
    toggleType: "primary-toggle",
    title: lockedString5(UIStringsNotTranslate4.thumbsUp),
    jslogContext: "thumbs-up"
  }}
            @click=${() => input.onRatingClick(
    "POSITIVE"
    /* Host.AidaClient.Rating.POSITIVE */
  )}
          ></devtools-button>
          <devtools-button
            .data=${{
    variant: "icon",
    size: "SMALL",
    iconName: "thumb-down",
    toggledIconName: "thumb-down-filled",
    toggled: input.currentRating === "NEGATIVE",
    toggleType: "primary-toggle",
    title: lockedString5(UIStringsNotTranslate4.thumbsDown),
    jslogContext: "thumbs-down"
  }}
            @click=${() => input.onRatingClick(
    "NEGATIVE"
    /* Host.AidaClient.Rating.NEGATIVE */
  )}
          ></devtools-button>
          ${aiAssistanceV2 ? Lit5.nothing : html7`<div class="vertical-separator"></div>`}
        ` : Lit5.nothing}
        <devtools-button
          .data=${{
    variant: "icon",
    size: "SMALL",
    title: lockedString5(UIStringsNotTranslate4.report),
    iconName: "report",
    jslogContext: "report"
  }}
          @click=${input.onReportClick}
        ></devtools-button>
        ${aiAssistanceV2 ? Lit5.nothing : html7`
          <div class="vertical-separator"></div>
          <devtools-button
            .data=${{
    variant: "icon",
    size: "SMALL",
    title: lockedString5(UIStringsNotTranslate4.copyResponse),
    iconName: "copy",
    jslogContext: "copy-ai-response"
  }}
            aria-label=${lockedString5(UIStringsNotTranslate4.copyResponse)}
            @click=${input.onCopyResponseClick}></devtools-button>
        `}
        ${input.onExportClick && aiAssistanceV2 && input.isLastMessage ? html7`
          <devtools-button
            class="export-for-agents-button"
            .jslogContext=${"ai-export-for-agents"}
            .variant=${"outlined"}
            .iconName=${"copy"}
            aria-label=${lockedString5(UIStringsNotTranslate4.exportForAgents)}
            @click=${input.onExportClick}
          >${lockedString5(UIStringsNotTranslate4.exportForAgents)}</devtools-button>
          ${input.suggestions ? html7`<div class="vertical-separator"></div>` : Lit5.nothing}
        ` : Lit5.nothing}
      </div>
      ${input.suggestions ? html7`<div class="suggestions-container">
        <div class="scroll-button-container left hidden" ${ref3((element) => {
    output.suggestionsLeftScrollButtonContainer = element;
  })}>
          <devtools-button
            class='scroll-button'
            .data=${{
    variant: "icon",
    size: "SMALL",
    iconName: "chevron-left",
    title: lockedString5(UIStringsNotTranslate4.scrollToPrevious),
    jslogContext: "chevron-left"
  }}
            @click=${() => input.scrollSuggestionsScrollContainer("left")}
          ></devtools-button>
        </div>
        <div class="suggestions-scroll-container" @scroll=${input.onSuggestionsScrollOrResize} ${ref3((element) => {
    output.suggestionsScrollContainer = element;
  })}>
          ${input.suggestions.map((suggestion) => html7`<devtools-button
            class='suggestion'
            .data=${{
    variant: "outlined",
    title: suggestion,
    jslogContext: "suggestion"
  }}
            @click=${() => input.onSuggestionClick(suggestion)}
          >${suggestion}</devtools-button>`)}
        </div>
        <div class="scroll-button-container right hidden" ${ref3((element) => {
    output.suggestionsRightScrollButtonContainer = element;
  })}>
          <devtools-button
            class='scroll-button'
            .data=${{
    variant: "icon",
    size: "SMALL",
    iconName: "chevron-right",
    title: lockedString5(UIStringsNotTranslate4.scrollToNext),
    jslogContext: "chevron-right"
  }}
            @click=${() => input.scrollSuggestionsScrollContainer("right")}
          ></devtools-button>
        </div>
      </div>` : Lit5.nothing}
    </div>
    ${input.isShowingFeedbackForm ? html7`
      <form class="feedback-form" @submit=${input.onSubmit}>
        <div class="feedback-header">
          <h4 class="feedback-title">${lockedString5(UIStringsNotTranslate4.whyThisRating)}</h4>
          <devtools-button
            aria-label=${lockedString5(UIStringsNotTranslate4.close)}
            @click=${input.onClose}
            .data=${{
    variant: "icon",
    iconName: "cross",
    size: "SMALL",
    title: lockedString5(UIStringsNotTranslate4.close),
    jslogContext: "close"
  }}
          ></devtools-button>
        </div>
        <input
          type="text"
          class="devtools-text-input feedback-input"
          @input=${(event) => input.onInputChange(event.target.value)}
          placeholder=${lockedString5(UIStringsNotTranslate4.provideFeedbackPlaceholder)}
          jslog=${VisualLogging4.textField("feedback").track({ keydown: "Enter" })}
        >
        <span class="feedback-disclaimer">${lockedString5(UIStringsNotTranslate4.disclaimer)}</span>
        <div>
          <devtools-button
          aria-label=${lockedString5(UIStringsNotTranslate4.submit)}
          .data=${{
    type: "submit",
    disabled: input.isSubmitButtonDisabled,
    variant: "outlined",
    size: "SMALL",
    title: lockedString5(UIStringsNotTranslate4.submit),
    jslogContext: "send"
  }}
          >${lockedString5(UIStringsNotTranslate4.submit)}</devtools-button>
        </div>
      </div>
    </form>
    ` : Lit5.nothing}
  `;
}
var ChatMessage = class extends UI5.Widget.Widget {
  message = { entity: "user", text: "" };
  isLoading = false;
  isReadOnly = false;
  prompt = "";
  canShowFeedbackForm = false;
  isLastMessage = false;
  isFirstMessage = false;
  shouldShowCSSChangeSummary = false;
  markdownRenderer;
  onSuggestionClick = () => {
  };
  onFeedbackSubmit = () => {
  };
  onCopyResponseClick = () => {
  };
  onExportClick = () => {
  };
  changeSummary;
  walkthrough = {
    onOpen: () => {
    },
    onToggle: () => {
    },
    isInlined: false,
    isExpanded: false,
    activeSidebarMessage: null,
    inlineExpandedMessages: []
  };
  #suggestionsResizeObserver = new ResizeObserver(() => this.#handleSuggestionsScrollOrResize());
  #suggestionsEvaluateLayoutThrottler = new Common4.Throttler.Throttler(100);
  #feedbackValue = "";
  #currentRating;
  #isShowingFeedbackForm = false;
  #isSubmitButtonDisabled = true;
  #view;
  #viewOutput = {};
  #isObservingSuggestions = false;
  constructor(element, view) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW4;
  }
  wasShown() {
    super.wasShown();
    void this.performUpdate();
    this.#evaluateSuggestionsLayout();
  }
  performUpdate() {
    const message = this.message.entity === "model" ? getDeduplicatedWidgetsMessage(this.message) : this.message;
    this.#view({
      message,
      isLoading: this.isLoading,
      isReadOnly: this.isReadOnly,
      canShowFeedbackForm: this.canShowFeedbackForm,
      markdownRenderer: this.markdownRenderer,
      isLastMessage: this.isLastMessage,
      isFirstMessage: this.isFirstMessage,
      prompt: this.prompt,
      shouldShowCSSChangeSummary: this.shouldShowCSSChangeSummary,
      onSuggestionClick: this.onSuggestionClick,
      onRatingClick: this.#handleRateClick.bind(this),
      onReportClick: () => UIHelpers.openInNewTab(REPORT_URL),
      onCopyResponseClick: () => {
        if (this.message.entity === "model") {
          this.onCopyResponseClick(this.message);
        }
      },
      onExportClick: this.onExportClick,
      scrollSuggestionsScrollContainer: this.#scrollSuggestionsScrollContainer.bind(this),
      onSuggestionsScrollOrResize: this.#handleSuggestionsScrollOrResize.bind(this),
      onSubmit: this.#handleSubmit.bind(this),
      onClose: this.#handleClose.bind(this),
      onInputChange: this.#handleInputChange.bind(this),
      isSubmitButtonDisabled: this.#isSubmitButtonDisabled,
      // Props for actions logic
      showActions: !(this.isLastMessage && this.isLoading),
      showRateButtons: this.message.entity === "model" && !!this.message.rpcId,
      suggestions: this.isLastMessage && this.message.entity === "model" && !this.isReadOnly && this.message.parts.at(-1)?.type === "answer" ? this.message.parts.at(-1).suggestions : void 0,
      currentRating: this.#currentRating,
      isShowingFeedbackForm: this.#isShowingFeedbackForm,
      onFeedbackSubmit: this.onFeedbackSubmit,
      changeSummary: this.changeSummary,
      walkthrough: this.walkthrough
    }, this.#viewOutput, this.contentElement);
    if (this.#viewOutput.suggestionsScrollContainer && !this.#isObservingSuggestions) {
      this.#suggestionsResizeObserver.observe(this.#viewOutput.suggestionsScrollContainer);
      this.#isObservingSuggestions = true;
    }
  }
  #handleInputChange(value) {
    this.#feedbackValue = value;
    const disableSubmit = !value;
    if (disableSubmit !== this.#isSubmitButtonDisabled) {
      this.#isSubmitButtonDisabled = disableSubmit;
      void this.performUpdate();
    }
  }
  #evaluateSuggestionsLayout = () => {
    const suggestionsScrollContainer = this.#viewOutput.suggestionsScrollContainer;
    const leftScrollButtonContainer = this.#viewOutput.suggestionsLeftScrollButtonContainer;
    const rightScrollButtonContainer = this.#viewOutput.suggestionsRightScrollButtonContainer;
    if (!suggestionsScrollContainer || !leftScrollButtonContainer || !rightScrollButtonContainer) {
      return;
    }
    const shouldShowLeftButton = suggestionsScrollContainer.scrollLeft > SCROLL_ROUNDING_OFFSET;
    const shouldShowRightButton = suggestionsScrollContainer.scrollLeft + suggestionsScrollContainer.offsetWidth + SCROLL_ROUNDING_OFFSET < suggestionsScrollContainer.scrollWidth;
    leftScrollButtonContainer.classList.toggle("hidden", !shouldShowLeftButton);
    rightScrollButtonContainer.classList.toggle("hidden", !shouldShowRightButton);
  };
  willHide() {
    super.willHide();
    this.#suggestionsResizeObserver.disconnect();
    this.#isObservingSuggestions = false;
  }
  #handleSuggestionsScrollOrResize() {
    void this.#suggestionsEvaluateLayoutThrottler.schedule(() => {
      this.#evaluateSuggestionsLayout();
      return Promise.resolve();
    });
  }
  #scrollSuggestionsScrollContainer(direction) {
    const suggestionsScrollContainer = this.#viewOutput.suggestionsScrollContainer;
    if (!suggestionsScrollContainer) {
      return;
    }
    suggestionsScrollContainer.scroll({
      top: 0,
      left: direction === "left" ? suggestionsScrollContainer.scrollLeft - suggestionsScrollContainer.clientWidth : suggestionsScrollContainer.scrollLeft + suggestionsScrollContainer.clientWidth,
      behavior: "smooth"
    });
  }
  #handleRateClick(rating) {
    if (this.#currentRating === rating) {
      this.#currentRating = void 0;
      this.#isShowingFeedbackForm = false;
      this.#isSubmitButtonDisabled = true;
      if (this.message.entity === "model" && this.message.rpcId) {
        this.onFeedbackSubmit(
          this.message.rpcId,
          "SENTIMENT_UNSPECIFIED"
          /* Host.AidaClient.Rating.SENTIMENT_UNSPECIFIED */
        );
      }
      void this.performUpdate();
      return;
    }
    this.#currentRating = rating;
    this.#isShowingFeedbackForm = this.canShowFeedbackForm;
    if (this.message.entity === "model" && this.message.rpcId) {
      this.onFeedbackSubmit(this.message.rpcId, rating);
    }
    void this.performUpdate();
  }
  #handleClose() {
    this.#isShowingFeedbackForm = false;
    this.#isSubmitButtonDisabled = true;
    void this.performUpdate();
  }
  #handleSubmit(ev) {
    ev.preventDefault();
    const input = this.#feedbackValue;
    if (!this.#currentRating || !input) {
      return;
    }
    if (this.message.entity === "model" && this.message.rpcId) {
      this.onFeedbackSubmit(this.message.rpcId, this.#currentRating, input);
    }
    this.#isShowingFeedbackForm = false;
    this.#isSubmitButtonDisabled = true;
    void this.performUpdate();
  }
};
async function makeTimelineRangeSummaryWidget(widgetData) {
  const { bounds, parsedTrace, track } = widgetData.data;
  let events = [];
  if (track === "main") {
    const flameChartView = Timeline.TimelinePanel.TimelinePanel.instance().getFlameChart();
    const mainDataProvider = flameChartView.getMainDataProvider();
    const mainTrack = mainDataProvider.timelineData().groups.find((group) => group.name.startsWith("Main \u2014 "));
    if (mainTrack) {
      events = mainDataProvider.groupTreeEvents(mainTrack) ?? [];
    }
  }
  const eventsArray = Array.from(events);
  eventsArray.sort((a, b) => a.ts - b.ts);
  const thirdPartyTree = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
  const mapper = Trace.EntityMapper.EntityMapper.getOrCreate(parsedTrace);
  thirdPartyTree.model = { selectedEvents: eventsArray, parsedTrace, entityMapper: mapper };
  thirdPartyTree.activeSelection = Timeline.TimelineSelection.selectionFromRangeMicroSeconds(bounds.min, bounds.max);
  thirdPartyTree.refreshTree(true);
  const template = html7`
    <devtools-widget
      ${widget3(TimelineComponents.TimelineRangeSummaryView.TimelineRangeSummaryView, {
    data: {
      parsedTrace,
      events,
      isInAIWidget: true,
      startTime: Trace.Helpers.Timing.microToMilli(bounds.min),
      endTime: Trace.Helpers.Timing.microToMilli(bounds.max),
      thirdPartyTreeTemplate: html7`${widget3(Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget, {
        maxRows: 10,
        isInAIWidget: true,
        model: {
          selectedEvents: thirdPartyTree.selectedEvents ?? null,
          parsedTrace,
          entityMapper: thirdPartyTree.entityMapper()
        },
        activeSelection: { bounds },
        onBottomUpButtonClicked: (node) => {
          void Common4.Revealer.reveal(new TimelineUtils.Helpers.RevealableBottomUpProfile(bounds, node ?? void 0));
        }
      })}`
    }
  })}
    ></devtools-widget>`;
  return {
    renderedWidget: template,
    revealable: new TimelineUtils.Helpers.RevealableTimeRange(bounds),
    accessibleRevealLabel: lockedString5(UIStringsNotTranslate4.revealPerformanceSummary),
    title: lockedString5(UIStringsNotTranslate4.performanceSummary),
    jslogContext: "timeline-range-summary"
  };
}

// gen/front_end/panels/ai_assistance/components/chatView.css.js
var chatView_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:host {
  width: 100%;
  height: 100%;
  user-select: text;
  display: flex;
  flex-direction: column;
  background-color: var(--sys-color-cdt-base-container);
}

.chat-ui {
  width: 100%;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  container-type: size;
  container-name: --chat-ui-container;
}

.info-tooltip-container {
  max-width: var(--sys-size-28);
  padding: var(--sys-size-4) var(--sys-size-5);
}

.tooltip-link {
  display: block;
  margin-top: var(--sys-size-4);
  color: var(--sys-color-primary);
  padding-left: 0;
}

.chat-cancel-context-button {
  padding-bottom: 3px;
  padding-right: var(--sys-size-3);
}


.messages-container {
  flex-grow: 1;
  width: 100%;
  max-width: var(--sys-size-36);

  /* Prevents the container from jumping when the scrollbar is shown */
  /* 688px is the max width of the input form + left and right paddings: var(--sys-size-36) + 2 * var(--sys-size-5)  */
  @container (width > 688px) {
    --half-scrollbar-width: calc((100cqw - 100%) / 2);

    margin-left: var(--half-scrollbar-width);
    margin-right: calc(-1 * var(--half-scrollbar-width));
  }
}

.link {
  color: var(--text-link);
  text-decoration: underline;
  cursor: pointer;
}

button.link {
  border: none;
  background: none;
  font: inherit;

  &:focus-visible {
    outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    outline-offset: 0;
    border-radius: var(--sys-shape-corner-extra-small);
  }
}

.select-an-element-text {
  margin-left: 2px;
}

main {
  overflow: hidden auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  container-type: size;
  scrollbar-width: thin;
  /*
  Even though \\'transform: translateZ(1px)\\' doesn't have a visual effect,
  it puts \\'main\\' element into another rendering layer which somehow
  fixes the \\'.input-form\\' jumping on scroll issue.
  */
  transform: translateZ(1px);
  scroll-timeline: --scroll-timeline y;
}

.empty-state-container {
  flex-grow: 1;
  display: grid;
  align-items: center;
  justify-content: center;
  font: var(--sys-typescale-headline4);
  gap: var(--sys-size-8);
  padding: var(--sys-size-4);
  max-width: var(--sys-size-33);

  /* Prevents the container from jumping when the scrollbar is shown */
  /* 688px is the max width of the input form + left and right paddings: var(--sys-size-36) + 2 * var(--sys-size-5)  */
  @container (width > 688px) {
    --half-scrollbar-width: calc((100cqw - 100%) / 2);

    margin-left: var(--half-scrollbar-width);
    margin-right: calc(-1 * var(--half-scrollbar-width));
  }

  .header {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    justify-content: center;
    align-self: end;
    gap: var(--sys-size-5);

    .icon {
      display: flex;
      justify-content: center;
      align-items: center;
      height: var(--sys-size-14);
      width: var(--sys-size-14);
      border-radius: var(--sys-shape-corner-small);
      background: linear-gradient(
        135deg,
        var(--sys-color-gradient-primary),
        var(--sys-color-gradient-tertiary)
      );
    }

    h1 {
      font: var(--sys-typescale-headline4);
    }

    p {
      text-align: center;
      font: var(--sys-typescale-body4-regular);
    }
  }

  .empty-state-content {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-5);
    align-items: center;
    justify-content: center;
    align-self: start;
  }
}

.gemini {
  .empty-state-container {
    padding: var(--sys-size-8);
  }

  .empty-state-container .icon {
    display: none;
  }

  .empty-state-container .header {
    align-items: flex-start;
    line-height: var(--sys-size-4);
  }

  .empty-state-content {
    align-items: flex-start
  }

  .empty-state-container .greeting {
    font-size: var(--sys-size-10);
    color: var(--sys-color-primary);
  }

  .empty-state-container .cta {
    font-size: var(--sys-size-10);
  }

  main {
    align-items: flex-start;
  }
}

.change-summary {
  background-color: var(--sys-color-surface3);
  border-radius: var(--sys-shape-corner-medium-small);
  position: relative;
  margin: 0 var(--sys-size-5) var(--sys-size-7) var(--sys-size-5);
  padding: 0 var(--sys-size-5);

  &.saved-to-disk {
    pointer-events: none;
  }

  & .header-container {
    display: flex;
    align-items: center;
    gap: var(--sys-size-3);
    height: var(--sys-size-14);
    padding-left: var(--sys-size-3);

    devtools-spinner {
      width: var(--sys-size-6);
      height: var(--sys-size-6);
      margin-left: var(--sys-size-3);
      margin-right: var(--sys-size-3);
    }

    & devtools-icon.summary-badge {
      width: var(--sys-size-8);
      height: var(--sys-size-8);
    }

    & .green-bright-icon {
      color: var(--sys-color-green-bright);
    }

    & .on-tonal-icon {
      color: var(--sys-color-on-tonal-container);
    }

    & .header-text {
      font: var(--sys-typescale-body4);
      color: var(--sys-color-on-surface);
      white-space: nowrap;
      overflow-x: hidden;
      text-overflow: ellipsis;
    }

    & .arrow {
      margin-left: auto;
    }

    &::marker {
      content: '';
    }
  }

  &:not(.saved-to-disk, &[open]):hover::after {
    content: '';
    height: 100%;
    width: 100%;
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  &[open]:not(.saved-to-disk) {
    &::details-content {
      height: fit-content;
      padding: var(--sys-size-2) 0;
      border-radius: inherit;
    }

    summary .arrow {
      transform: rotate(180deg);
    }
  }

  devtools-code-block {
    margin-bottom: var(--sys-size-5);

    --code-block-background-color: var(--sys-color-surface1);
  }

  .error-container {
    display: flex;
    align-items: center;
    gap: var(--sys-size-3);
    color: var(--sys-color-error);
  }

  .footer {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    margin: var(--sys-size-5) 0 var(--sys-size-5) var(--sys-size-2);
    gap: var(--sys-size-6) var(--sys-size-5);

    .disclaimer-link {
      align-self: center;
    }

    .left-side {
      flex-grow: 1;
      display: flex;
      align-self: center;
      gap: var(--sys-size-3);
    }

    .save-or-discard-buttons {
      flex-grow: 1;
      display: flex;
      justify-content: flex-end;
      gap: var(--sys-size-3);
    }

    .change-workspace {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--sys-size-3);
      min-width: var(--sys-size-22);
      flex: 1 1 40%;

      .folder-name {
        white-space: nowrap;
        overflow-x: hidden;
        text-overflow: ellipsis;
      }
    }

    .loading-text-container {
      margin-right: var(--sys-size-3);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--sys-size-3);
    }

    .apply-to-workspace-container {
      display: flex;
      align-items: center;
      gap: var(--sys-size-3);
      min-width: fit-content;
      justify-content: flex-end;
      flex-grow: 1;
      flex-shrink: 1;

      devtools-icon {
        /* var(--sys-size-8) is too small and var(--sys-size-9) is too big. */
        width: 18px;
        height: 18px;
        margin-left: var(--sys-size-2);
      }
    }
  }
}

@keyframes reveal {
  0%,
  99% {
    opacity: 100%;
  }

  100% {
    opacity: 0%;
  }
}

.sticky {
  position: sticky;
  bottom: 0;
  z-index: 9999;
}

.chat-input-widget {
  width: 100%;
  max-width: var(--sys-size-36);
  background-color: var(--sys-color-cdt-base-container);
  /*
  The \\'box-shadow\\' is a workaround to hide the content appearing between the \\'.input-form\\'
  and the footer in some resolutions even though the \\'.input-form\\' has \\'bottom: 0\\'.
  */
  box-shadow: 0 1px var(--sys-color-cdt-base-container);

  /* Prevents the input form from jumping when the scrollbar is shown */
  /* 688px is the max width of the input form + left and right paddings: var(--sys-size-36) + 2 * var(--sys-size-5)  */
  @container (width > 688px) {
    --half-scrollbar-width: calc((100cqw - 100%) / 2);

    margin-left: var(--half-scrollbar-width);
    margin-right: calc(-1 * var(--half-scrollbar-width));
  }

  /* when there isn't enough space to view the messages,
  do not overlay the input form on top of the messages */
  /* height < var(--sys-size-27) */
  @container (height < 224px) {
    margin-top: var(--sys-size-4);
    margin-bottom: var(--sys-size-4);
    position: static;
  }

  @container --chat-ui-container (width < 400px) {
    /*
      The footer already adds necessary paddings for this state.
      However, without the \\'padding-bottom\\' here, the outline in the bottom
      is rendered behind the footer. So, we add 1px space here to make sure
      that the outline is rendered fully.
    */
    padding-bottom: var(--sys-size-1);
  }
}

/*# sourceURL=${import.meta.resolve("././components/chatView.css")} */`;

// gen/front_end/panels/ai_assistance/components/ExportForAgentsDialog.js
var ExportForAgentsDialog_exports = {};
__export(ExportForAgentsDialog_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  ExportForAgentsDialog: () => ExportForAgentsDialog
});
import "./../../ui/components/spinners/spinners.js";
import * as Host4 from "./../../core/host/host.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as Buttons6 from "./../../ui/components/buttons/buttons.js";
import * as Snackbars2 from "./../../ui/components/snackbars/snackbars.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as Lit6 from "./../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/ai_assistance/components/exportForAgentsDialog.css.js
var exportForAgentsDialog_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    width: 100%;
    box-shadow: none;
    padding: var(--sys-size-8);
    background-color: var(--sys-color-surface);
    border-radius: var(--sys-shape-corner-medium);
  }

  .export-for-agents-dialog {
    width: var(--sys-size-33); /* 512px */
    max-width: 100%; /* deal with the dialog being squashed on smaller devices */
  }

  .export-for-agents-dialog header {
    margin-bottom: var(--sys-size-6);

    h1 {
      font: var(--sys-typescale-headline5);
      margin: 0;
      color: var(--sys-color-on-surface);
    }
  }

  .export-for-agents-dialog .state-selection {
    display: flex;
    gap: var(--sys-size-5);
    margin: var(--sys-size-7) 0;
  }

  .export-for-agents-dialog .state-selection label {
    display: flex;
    align-items: center;
    gap: var(--sys-size-2);
    cursor: pointer;
    font: var(--sys-typescale-body3-regular);

    input {
      /* Remove the margin on radio buttons so that the text and the
       * radio button are properly aligned vertically. */
      margin-bottom: 0;
    }
  }

  .export-for-agents-dialog textarea {
    width: 100%;
    min-height: var(--sys-size-30); /* 288px */
    max-height: var(--sys-size-34); /* 512px */
    resize: none;
    padding: var(--sys-size-5);
    box-sizing: border-box;
    font-family: var(--monospace-font-family);
    font-size: var(--monospace-font-size);
    background-color: var(--sys-color-surface5);
    color: var(--sys-color-on-surface);
    border-radius: var(--sys-shape-corner-small);
    border: none;
  }

  main {
    position: relative;
  }

  .prompt-loading {
    position: absolute;
    padding: var(--sys-size-5);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--sys-size-5);
  }

  .export-for-agents-dialog .disclaimer {
    margin-top: var(--sys-size-5);
    font: var(--sys-typescale-body4-regular);
    color: var(--sys-color-on-surface-subtle);
  }

  .export-for-agents-dialog footer {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--sys-size-6);
  }

  .export-for-agents-dialog .right-buttons {
    display: flex;
    gap: var(--sys-size-5);
  }
}

/*# sourceURL=${import.meta.resolve("././components/exportForAgentsDialog.css")} */`;

// gen/front_end/panels/ai_assistance/components/ExportForAgentsDialog.js
var { html: html8, render: render6 } = Lit6;
var UIStrings3 = {
  /**
   * @description Title for the export for agents dialog.
   */
  exportForAgents: "Copy to coding agent",
  /**
   * @description Button text for copying to clipboard.
   */
  copyToClipboard: "Copy to clipboard",
  /**
   * @description Text displayed in a toast to indicate that the content was copied to the clipboard.
   */
  copiedToClipboard: "Copied to clipboard",
  /**
   * @description Label for the 'as prompt' radio button in the export for agents dialog.
   */
  asPrompt: "As prompt",
  /**
   * @description Label for the 'as markdown' radio button in the export for agents dialog.
   */
  asMarkdown: "As markdown",
  /**
   * @description Button text for saving content as a markdown file.
   */
  saveAsMarkdown: "Save as\u2026",
  /**
   * @description Text displayed while the summary is being generated.
   */
  generatingSummary: "Generating summary\u2026",
  /**
   * @description Disclaimer text for the export for agents dialog.
   */
  disclaimer: "This is an experimental AI feature and won\u2019t always get it right. Double check this text before pasting into another tool."
};
var str_3 = i18n11.i18n.registerUIStrings("panels/ai_assistance/components/ExportForAgentsDialog.ts", UIStrings3);
var i18nString3 = i18n11.i18n.getLocalizedString.bind(void 0, str_3);
var DEFAULT_STATE_TYPE = "prompt";
var DEFAULT_VIEW5 = (input, _output, target) => {
  const isPrompt = input.state.activeType === "prompt";
  const buttonText = isPrompt ? i18nString3(UIStrings3.copyToClipboard) : i18nString3(UIStrings3.saveAsMarkdown);
  const exportText = isPrompt ? input.state.promptText : input.state.conversationText;
  render6(html8`
    <style>${exportForAgentsDialog_css_default}</style>
    <div class="export-for-agents-dialog" jslog=${VisualLogging5.dialog("ai-export-for-agents")}>
      <header>
        <h1 id="export-for-agents-dialog-title" tabindex="-1">
          ${i18nString3(UIStrings3.exportForAgents)}
        </h1>
      </header>
      <div class="state-selection" role="radiogroup" aria-labelledby="export-for-agents-dialog-title">
        <label>
          <input
            type="radio"
            value="prompt"
            name="export-state"
            .checked=${isPrompt}
            autofocus
            aria-label=${i18nString3(UIStrings3.asPrompt)}
            @change=${() => input.onStateChange(
    "prompt"
    /* StateType.PROMPT */
  )}
          >
          ${i18nString3(UIStrings3.asPrompt)}
        </label>
        <label>
          <input
            type="radio"
            value="conversation"
            name="export-state"
            .checked=${!isPrompt}
            aria-label=${i18nString3(UIStrings3.asMarkdown)}
            @change=${() => input.onStateChange(
    "conversation"
    /* StateType.CONVERSATION */
  )}
          >
          ${i18nString3(UIStrings3.asMarkdown)}
        </label>
      </div>
      <main>
        ${isPrompt && input.state.isPromptLoading ? html8`
          <span class="prompt-loading">
            <devtools-spinner></devtools-spinner>
            ${i18nString3(UIStrings3.generatingSummary)}
          </span>
          ` : Lit6.nothing}
        ${isPrompt ? html8`<textarea class="prompt" readonly .value=${input.state.isPromptLoading ? "" : exportText}></textarea>` : html8`<textarea class="conversation" readonly .value=${exportText}></textarea>`}
      </main>
      <div class="disclaimer">${i18nString3(UIStrings3.disclaimer)}</div>
      <footer>
        <div class="right-buttons">
          <devtools-button
            @click=${input.onButtonClick}
            .jslogContext=${input.jslogContext}
            .variant=${"primary"}
            .disabled=${isPrompt && input.state.isPromptLoading}
            .accessibleLabel=${buttonText}
          >
            ${buttonText}
          </devtools-button>
        </div>
      </footer>
    </div>
  `, target);
};
var ExportForAgentsDialog = class _ExportForAgentsDialog extends UI6.Widget.VBox {
  static #lastSelectedType = DEFAULT_STATE_TYPE;
  #view;
  #dialog;
  #state;
  #onConversationSaveAs;
  constructor(options, view = DEFAULT_VIEW5) {
    super();
    this.#dialog = options.dialog;
    this.#state = {
      activeType: _ExportForAgentsDialog.#lastSelectedType,
      promptText: typeof options.promptText === "string" ? options.promptText : "",
      conversationText: options.markdownText,
      isPromptLoading: typeof options.promptText !== "string"
    };
    this.#onConversationSaveAs = options.onConversationSaveAs;
    this.#view = view;
    if (typeof options.promptText !== "string") {
      void options.promptText.then((promptText) => {
        this.#state.promptText = promptText;
        this.#state.isPromptLoading = false;
        this.requestUpdate();
      });
    }
    this.requestUpdate();
  }
  static clearPersistedViewState() {
    _ExportForAgentsDialog.#lastSelectedType = DEFAULT_STATE_TYPE;
  }
  #onStateChange = (newState) => {
    this.#state.activeType = newState;
    _ExportForAgentsDialog.#lastSelectedType = newState;
    this.requestUpdate();
  };
  performUpdate() {
    let onButtonClick;
    let jslogContext = "";
    switch (this.#state.activeType) {
      case "prompt":
        jslogContext = "ai-export-for-agents.copy-to-clipboard";
        onButtonClick = (event) => {
          event.preventDefault();
          Host4.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.#state.promptText);
          const snackbar = Snackbars2.Snackbar.Snackbar.show({
            message: i18nString3(UIStrings3.copiedToClipboard)
          });
          snackbar.setAttribute("aria-label", i18nString3(UIStrings3.copiedToClipboard));
          this.#dialog.hide();
        };
        break;
      case "conversation":
        jslogContext = "ai-export-for-agents.save-as-markdown";
        onButtonClick = () => {
          this.#dialog.hide();
          this.#onConversationSaveAs();
        };
        break;
    }
    const viewInput = {
      onButtonClick,
      state: this.#state,
      onStateChange: this.#onStateChange,
      jslogContext
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
  static show({ promptText, markdownText, onConversationSaveAs }) {
    const dialog3 = new UI6.Dialog.Dialog();
    dialog3.setAriaLabel(i18nString3(UIStrings3.exportForAgents));
    dialog3.setOutsideClickCallback((ev) => {
      ev.consume(true);
      dialog3.hide();
    });
    dialog3.addCloseButton();
    dialog3.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    dialog3.setDimmed(true);
    const exportDialog = new _ExportForAgentsDialog({ dialog: dialog3, promptText, markdownText, onConversationSaveAs });
    exportDialog.show(dialog3.contentElement);
    void exportDialog.updateComplete.then(() => {
      dialog3.show();
    });
  }
};

// gen/front_end/panels/ai_assistance/components/ChatView.js
var { ref: ref4, repeat, classMap } = Directives6;
var { widget: widget4 } = UI7.Widget;
var UIStringsNotTranslate5 = {
  /**
   * @description Text for the empty state of the AI assistance panel.
   */
  emptyStateText: "How can I help you?",
  /**
   * @description Text for the empty state of the Gemini panel.
   */
  emptyStateTextGemini: "Where should we start?"
};
var lockedString6 = i18n13.i18n.lockedString;
var SCROLL_ROUNDING_OFFSET2 = 1;
function getCSSChangeSummaryMessage(messages, isLoading) {
  const modelMessages = messages.filter(
    (m) => m.entity === "model"
    /* ChatMessageEntity.MODEL */
  );
  const lastModelMessage = modelMessages.at(-1);
  if (!lastModelMessage) {
    return void 0;
  }
  if (isLoading && messages.at(-1) === lastModelMessage) {
    return modelMessages.at(-2);
  }
  return lastModelMessage;
}
var DEFAULT_VIEW6 = (input, output, target) => {
  const hasAiV2 = Boolean(Root4.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled);
  const chatUiClasses = classMap({
    "chat-ui": true,
    gemini: AiAssistanceModel6.AiUtils.isGeminiBranding(),
    "ai-v2": hasAiV2
  });
  const inputWidgetClasses = classMap({
    "chat-input-widget": true,
    sticky: !input.isReadOnly
  });
  const shouldShowPatchWidget = !hasAiV2 && !input.isLoading;
  const cssChangeSummaryMessage = getCSSChangeSummaryMessage(input.messages, input.isLoading);
  render7(html9`
      <style>${chatView_css_default}</style>
      <div class=${chatUiClasses}>
        <main @scroll=${input.handleScroll} ${ref4((element) => {
    output.mainElement = element;
  })}>
          ${input.messages.length > 0 ? html9`
            <div class="messages-container" ${ref4(input.handleMessageContainerRef)}>
              ${repeat(input.messages, (message, index) => {
    const prevMessage = index > 0 ? input.messages[index - 1] : null;
    const prompt = message.entity === "model" && prevMessage?.entity === "user" ? prevMessage.text : "";
    return widget4(ChatMessage, {
      message,
      isLoading: input.isLoading && index === input.messages.length - 1,
      isReadOnly: input.isReadOnly,
      canShowFeedbackForm: input.canShowFeedbackForm,
      markdownRenderer: input.markdownRenderer,
      isLastMessage: index === input.messages.length - 1,
      isFirstMessage: index === 0,
      prompt,
      shouldShowCSSChangeSummary: message === cssChangeSummaryMessage,
      onSuggestionClick: input.handleSuggestionClick,
      onFeedbackSubmit: input.onFeedbackSubmit,
      onCopyResponseClick: input.onCopyResponseClick,
      onExportClick: input.exportForAgentsClick,
      changeSummary: input.changeSummary,
      walkthrough: {
        ...input.walkthrough
      }
    });
  })}
              ${shouldShowPatchWidget ? widget4(PatchWidget, {
    changeSummary: input.changeSummary ?? "",
    changeManager: input.changeManager
  }) : nothing7}
            </div>
          ` : html9`
            <div class="empty-state-container">
              <div class="header">
                <div class="icon">
                  <devtools-icon
                    name="smart-assistant"
                  ></devtools-icon>
                </div>
                ${AiAssistanceModel6.AiUtils.isGeminiBranding() ? html9`
                    <h1 class='greeting'>Hello</h1>
                    <p class='cta'>${lockedString6(UIStringsNotTranslate5.emptyStateTextGemini)}</p>
                  ` : html9`<h1>${lockedString6(UIStringsNotTranslate5.emptyStateText)}</h1>`}
              </div>
              <div class="empty-state-content">
                ${input.emptyStateSuggestions.map(({ title, jslogContext }) => {
    return html9`<devtools-button
                    class="suggestion"
                    @click=${() => input.handleSuggestionClick(title)}
                    .data=${{
      variant: "outlined",
      size: "REGULAR",
      title,
      jslogContext: jslogContext ?? "suggestion",
      disabled: input.isTextInputDisabled
    }}
                  >${title}</devtools-button>`;
  })}
              </div>
            </div>
          `}
          <devtools-widget class=${inputWidgetClasses} ${widget4(ChatInput, {
    isLoading: input.isLoading,
    blockedByCrossOrigin: input.blockedByCrossOrigin,
    isTextInputDisabled: input.isTextInputDisabled,
    inputPlaceholder: input.inputPlaceholder,
    disclaimerText: input.disclaimerText,
    context: input.context,
    isContextSelected: input.isContextSelected,
    inspectElementToggled: input.inspectElementToggled,
    multimodalInputEnabled: input.multimodalInputEnabled ?? false,
    conversationType: input.conversationType,
    uploadImageInputEnabled: input.uploadImageInputEnabled ?? false,
    isReadOnly: input.isReadOnly,
    onContextClick: input.onContextClick,
    onInspectElementClick: input.onInspectElementClick,
    onTextSubmit: input.onTextSubmit,
    onCancelClick: input.onCancelClick,
    onNewConversation: input.onNewConversation,
    onContextRemoved: input.onContextRemoved,
    onContextAdd: input.onContextAdd
  })} ${ref4((element) => {
    output.input = element;
  })}></devtools-widget>
        </main>
      </div>
    `, target);
};
var ChatView = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #scrollTop;
  #props;
  #messagesContainerElement;
  #output = {};
  #messagesContainerResizeObserver = new ResizeObserver(() => this.#handleMessagesContainerResize());
  /**
   * Indicates whether the chat scroll position should be pinned to the bottom.
   *
   * This is true when:
   *   - The scroll is at the very bottom, allowing new messages to push the scroll down automatically.
   *   - The panel is initially rendered and the user hasn't scrolled yet.
   *
   * It is set to false when the user scrolls up to view previous messages.
   */
  #pinScrollToBottom = true;
  /**
   * Indicates whether the scroll event originated from code
   * or a user action. When set to `true`, `handleScroll` will ignore the event,
   * allowing it to only handle user-driven scrolls and correctly decide
   * whether to pin the content to the bottom.
   */
  #isProgrammaticScroll = false;
  #view;
  #cachedSummary = null;
  constructor(props, view = DEFAULT_VIEW6) {
    super();
    this.#props = props;
    this.#view = view;
  }
  set props(props) {
    this.#props = props;
    this.#render();
  }
  connectedCallback() {
    this.#render();
    if (this.#messagesContainerElement) {
      this.#messagesContainerResizeObserver.observe(this.#messagesContainerElement);
    }
  }
  disconnectedCallback() {
    this.#messagesContainerResizeObserver.disconnect();
  }
  focusTextInput() {
    const textArea = this.#shadow.querySelector(".chat-input");
    if (!textArea) {
      return;
    }
    textArea.focus();
  }
  setInputValue(text) {
    this.#output.input?.getWidget()?.setInputValue(text);
  }
  restoreScrollPosition() {
    if (this.#scrollTop === void 0) {
      return;
    }
    if (!this.#output.mainElement) {
      return;
    }
    this.#setMainElementScrollTop(this.#scrollTop);
  }
  scrollToBottom() {
    if (!this.#output.mainElement) {
      return;
    }
    this.#setMainElementScrollTop(this.#output.mainElement.scrollHeight);
  }
  #handleMessagesContainerResize() {
    if (!this.#pinScrollToBottom) {
      return;
    }
    if (!this.#output.mainElement) {
      return;
    }
    if (this.#pinScrollToBottom) {
      this.#setMainElementScrollTop(this.#output.mainElement.scrollHeight);
    }
  }
  #setMainElementScrollTop(scrollTop) {
    if (!this.#output.mainElement) {
      return;
    }
    this.#scrollTop = scrollTop;
    this.#isProgrammaticScroll = true;
    this.#output.mainElement.scrollTop = scrollTop;
  }
  #handleMessageContainerRef = (el) => {
    this.#messagesContainerElement = el;
    if (el) {
      this.#messagesContainerResizeObserver.observe(el);
    } else {
      this.#pinScrollToBottom = true;
      this.#messagesContainerResizeObserver.disconnect();
    }
  };
  #handleScroll = (ev) => {
    if (!ev.target || !(ev.target instanceof HTMLElement)) {
      return;
    }
    if (this.#isProgrammaticScroll) {
      this.#isProgrammaticScroll = false;
      return;
    }
    this.#scrollTop = ev.target.scrollTop;
    this.#pinScrollToBottom = ev.target.scrollTop + ev.target.clientHeight + SCROLL_ROUNDING_OFFSET2 > ev.target.scrollHeight;
  };
  #handleSuggestionClick = (suggestion) => {
    this.#output.input?.getWidget()?.setInputValue(suggestion);
    this.#render();
    this.focusTextInput();
    Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
  };
  async #getSummary() {
    const cacheKey = this.#props.conversationMarkdown.replace(/\*\*Export Timestamp \(UTC\):\*\* .*\n\n/, "");
    if (this.#cachedSummary?.markdown === cacheKey) {
      return this.#cachedSummary.summary;
    }
    try {
      const summary = await this.#props.generateConversationSummary(this.#props.conversationMarkdown);
      this.#cachedSummary = { markdown: cacheKey, summary };
      return summary;
    } catch (err) {
      console.error(err);
      return "Failed to generate summary.";
    }
  }
  async #exportForAgentsClick() {
    const summaryPromise = this.#getSummary();
    void ExportForAgentsDialog.show({
      promptText: summaryPromise,
      markdownText: this.#props.conversationMarkdown,
      onConversationSaveAs: this.#props.onExportConversation ?? (async () => {
      })
    });
  }
  #render() {
    this.#view({
      ...this.#props,
      handleScroll: this.#handleScroll,
      handleSuggestionClick: this.#handleSuggestionClick,
      handleMessageContainerRef: this.#handleMessageContainerRef,
      exportForAgentsClick: this.#exportForAgentsClick.bind(this)
    }, this.#output, this.#shadow);
  }
};
customElements.define("devtools-ai-chat-view", ChatView);

// gen/front_end/panels/ai_assistance/components/DisabledWidget.js
var DisabledWidget_exports = {};
__export(DisabledWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW7,
  DisabledWidget: () => DisabledWidget
});
import * as Host6 from "./../../core/host/host.js";
import * as i18n15 from "./../../core/i18n/i18n.js";
import * as Root5 from "./../../core/root/root.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import * as UI8 from "./../../ui/legacy/legacy.js";
import { html as html10, render as render8 } from "./../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/ai_assistance/components/disabledWidget.css.js
var disabledWidget_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .disabled-view {
    display: flex;
    max-width: var(--sys-size-34);
    border-radius: var(--sys-shape-corner-small);
    box-shadow: var(--sys-elevation-level3);
    background-color: var(--app-color-card-background);
    font: var(--sys-typescale-body4-regular);
    text-wrap: pretty;
    padding: var(--sys-size-6) var(--sys-size-8);
    margin: var(--sys-size-4);
    line-height: var(--sys-size-9);

    .disabled-view-icon-container {
      flex-shrink: 0;
      border-radius: var(--sys-shape-corner-extra-small);
      width: var(--sys-size-9);
      height: var(--sys-size-9);
      background: linear-gradient(
        135deg,
        var(--sys-color-gradient-primary),
        var(--sys-color-gradient-tertiary)
      );
      margin-right: var(--sys-size-5);

      devtools-icon {
        margin: var(--sys-size-2);
        width: var(--sys-size-8);
        height: var(--sys-size-8);
      }
    }
  }

  .link {
    color: var(--text-link);
    text-decoration: underline;
    cursor: pointer;
  }
}

/*# sourceURL=${import.meta.resolve("././components/disabledWidget.css")} */`;

// gen/front_end/panels/ai_assistance/components/DisabledWidget.js
var UIStrings4 = {
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  notLoggedIn: "This feature is only available when you are signed into Chrome with your Google account",
  /**
   * @description Message shown when the user is offline.
   */
  offline: "Check your internet connection and try again",
  /**
   * @description Text for a link to Chrome DevTools Settings.
   */
  settingsLink: "AI assistance in Settings",
  /**
   * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   * @example {AI assistance in Settings} PH1
   */
  turnOnForStyles: "Turn on {PH1} to get help with understanding CSS styles",
  /**
   * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   * @example {AI assistance in Settings} PH1
   */
  turnOnForStylesAndRequests: "Turn on {PH1} to get help with styles and network requests",
  /**
   * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   * @example {AI assistance in Settings} PH1
   */
  turnOnForStylesRequestsAndFiles: "Turn on {PH1} to get help with styles, network requests, and files",
  /**
   * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   * @example {AI assistance in Settings} PH1
   */
  turnOnForStylesRequestsPerformanceAndFiles: "Turn on {PH1} to get help with styles, network requests, performance, and files",
  /**
   * @description Text informing the user that AI assistance is not available in Incognito mode or Guest mode.
   */
  notAvailableInIncognitoMode: "AI assistance is not available in Incognito mode or Guest mode"
};
var str_4 = i18n15.i18n.registerUIStrings("panels/ai_assistance/components/DisabledWidget.ts", UIStrings4);
var i18nString4 = i18n15.i18n.getLocalizedString.bind(void 0, str_4);
function renderAidaUnavailableContents(aidaAvailability) {
  switch (aidaAvailability) {
    case "no-account-email":
    case "sync-is-paused": {
      return html10`${i18nString4(UIStrings4.notLoggedIn)}`;
    }
    case "no-internet": {
      return html10`${i18nString4(UIStrings4.offline)}`;
    }
  }
}
function renderConsentViewContents(hostConfig) {
  if (hostConfig.isOffTheRecord) {
    return html10`${i18nString4(UIStrings4.notAvailableInIncognitoMode)}`;
  }
  const settingsLink = document.createElement("span");
  settingsLink.textContent = i18nString4(UIStrings4.settingsLink);
  settingsLink.classList.add("link");
  UI8.ARIAUtils.markAsLink(settingsLink);
  settingsLink.addEventListener("click", () => {
    void UI8.ViewManager.ViewManager.instance().showView("chrome-ai");
  });
  settingsLink.setAttribute("jslog", `${VisualLogging6.action("open-ai-settings").track({ click: true })}`);
  let consentViewContents;
  if (hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(str_4, UIStrings4.turnOnForStylesRequestsPerformanceAndFiles, { PH1: settingsLink });
  } else if (hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(str_4, UIStrings4.turnOnForStylesRequestsAndFiles, { PH1: settingsLink });
  } else if (hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(str_4, UIStrings4.turnOnForStylesAndRequests, { PH1: settingsLink });
  } else {
    consentViewContents = uiI18n.getFormatLocalizedString(str_4, UIStrings4.turnOnForStyles, { PH1: settingsLink });
  }
  return html10`${consentViewContents}`;
}
var DEFAULT_VIEW7 = (input, _output, target) => {
  render8(html10`
      <style>
        ${disabledWidget_css_default}
      </style>
      <div class="disabled-view">
        <div class="disabled-view-icon-container">
          <devtools-icon name="smart-assistant"></devtools-icon>
        </div>
        <div>
          ${input.aidaAvailability === "available" ? renderConsentViewContents(input.hostConfig) : renderAidaUnavailableContents(input.aidaAvailability)}
        </div>
      </div>
    `, target);
};
var DisabledWidget = class extends UI8.Widget.Widget {
  aidaAvailability = "no-account-email";
  #view;
  constructor(element, view = DEFAULT_VIEW7) {
    super(element);
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    void this.requestUpdate();
  }
  performUpdate() {
    const hostConfig = Root5.Runtime.hostConfig;
    this.#view({
      aidaAvailability: this.aidaAvailability,
      hostConfig
    }, {}, this.contentElement);
  }
};

// gen/front_end/panels/ai_assistance/components/ExploreWidget.js
var ExploreWidget_exports = {};
__export(ExploreWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW8,
  ExploreWidget: () => ExploreWidget
});
import * as i18n17 from "./../../core/i18n/i18n.js";
import * as Root6 from "./../../core/root/root.js";
import * as UI9 from "./../../ui/legacy/legacy.js";
import { html as html11, render as render9 } from "./../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/ai_assistance/components/exploreWidget.css.js
var exploreWidget_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .ai-assistance-explore-container {
    &,
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    width: 100%;
    height: fit-content;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: auto 0;
    font: var(--sys-typescale-headline4);
    gap: var(--sys-size-8);
    padding: var(--sys-size-3);
    overflow: auto;
    scrollbar-gutter: stable both-edges;

    .link {
      padding: 0;
      margin: 0 3px;
    }

    .header {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      width: 100%;
      align-items: center;
      justify-content: center;
      justify-self: center;
      gap: var(--sys-size-4);

      .icon {
        display: flex;
        justify-content: center;
        align-items: center;
        height: var(--sys-size-14);
        width: var(--sys-size-14);
        border-radius: var(--sys-shape-corner-small);
        background: linear-gradient(
          135deg,
          var(--sys-color-gradient-primary),
          var(--sys-color-gradient-tertiary)
        );
      }

      h1 {
        font: var(--sys-typescale-headline4);
      }

      p {
        text-align: center;
        font: var(--sys-typescale-body4-regular);
      }

      .link {
        font: var(--sys-typescale-body4-regular);
      }
    }

    .content {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: var(--sys-size-5);
      align-items: center;
      justify-content: center;
      justify-self: center;
    }

    .feature-card {
      display: flex;
      padding: var(--sys-size-4) var(--sys-size-6);
      gap: 10px;
      background-color: var(--sys-color-surface2);
      border-radius: var(--sys-shape-corner-medium-small);
      width: 100%;
      align-items: center;

      .feature-card-icon {
        min-width: var(--sys-size-12);
        min-height: var(--sys-size-12);
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: var(--sys-color-tonal-container);
        border-radius: var(--sys-shape-corner-full);

        devtools-icon {
          width: 18px;
          height: 18px;
        }
      }

      .feature-card-content {
        h3 {
          font: var(--sys-typescale-body3-medium);
        }

        p {
          font: var(--sys-typescale-body4-regular);
          line-height: 18px;
        }
      }
    }
  }

  .ai-assistance-explore-footer {
    flex-shrink: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-block: var(--sys-size-3);
    font: var(--sys-typescale-body5-regular);
    border-top: 1px solid var(--sys-color-divider);
    text-wrap: balance;
    text-align: center;

    p {
      margin: 0;
      padding: 0;
    }
  }
}

/*# sourceURL=${import.meta.resolve("././components/exploreWidget.css")} */`;

// gen/front_end/panels/ai_assistance/components/ExploreWidget.js
var UIStringsNotTranslate6 = {
  /**
   * @description Text for the empty state of the AI assistance panel when there is no agent selected.
   */
  Explore: "Explore AI assistance",
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: "Learn about AI in DevTools"
};
var lockedString7 = i18n17.i18n.lockedString;
var DEFAULT_VIEW8 = (input, _output, target) => {
  function renderFeatureCardContent(featureCard) {
    return html11`Open
     <button
       class="link"
       role="link"
       jslog=${VisualLogging7.link(featureCard.jslogContext).track({
      click: true
    })}
       @click=${featureCard.onClick}
     >${featureCard.panelName}</button>
     ${featureCard.text}`;
  }
  render9(html11`
      <style>
        ${exploreWidget_css_default}
      </style>
      <div class="ai-assistance-explore-container">
        <div class="header">
          <div class="icon">
            <devtools-icon name="smart-assistant"></devtools-icon>
          </div>
          <h1>${lockedString7(UIStringsNotTranslate6.Explore)}</h1>
          <p>
            To chat about an item, right-click and select${" "}
            <strong>Ask AI</strong>.
            <button
              class="link"
              role="link"
              jslog=${VisualLogging7.link("open-ai-settings").track({ click: true })}
              @click=${() => {
    void UI9.ViewManager.ViewManager.instance().showView("chrome-ai");
  }}
            >${lockedString7(UIStringsNotTranslate6.learnAbout)}
            </button>
          </p>
        </div>
        <div class="content">
          ${input.featureCards.map((featureCard) => html11`
              <div class="feature-card">
                <div class="feature-card-icon">
                  <devtools-icon name=${featureCard.icon}></devtools-icon>
                </div>
                <div class="feature-card-content">
                  <h3>${featureCard.heading}</h3>
                  <p>${renderFeatureCardContent(featureCard)}</p>
                </div>
              </div>
            `)}
        </div>
      </div>
    `, target);
};
var ExploreWidget = class extends UI9.Widget.Widget {
  #view;
  constructor(element, view = DEFAULT_VIEW8) {
    super(element);
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    void this.requestUpdate();
  }
  performUpdate() {
    const config = Root6.Runtime.hostConfig;
    const featureCards = [];
    if (config.devToolsFreestyler?.enabled && UI9.ViewManager.ViewManager.instance().hasView("elements")) {
      featureCards.push({
        icon: "brush-2",
        heading: "CSS styles",
        jslogContext: "open-elements-panel",
        onClick: () => {
          void UI9.ViewManager.ViewManager.instance().showView("elements");
        },
        panelName: "Elements",
        text: "to ask about CSS styles"
      });
    }
    if (config.devToolsAiAssistanceNetworkAgent?.enabled && UI9.ViewManager.ViewManager.instance().hasView("network")) {
      featureCards.push({
        icon: "arrow-up-down",
        heading: "Network",
        jslogContext: "open-network-panel",
        onClick: () => {
          void UI9.ViewManager.ViewManager.instance().showView("network");
        },
        panelName: "Network",
        text: "to ask about a request's details"
      });
    }
    if (config.devToolsAiAssistanceFileAgent?.enabled && UI9.ViewManager.ViewManager.instance().hasView("sources")) {
      featureCards.push({
        icon: "document",
        heading: "Files",
        jslogContext: "open-sources-panel",
        onClick: () => {
          void UI9.ViewManager.ViewManager.instance().showView("sources");
        },
        panelName: "Sources",
        text: "to ask about a file's content"
      });
    }
    if (config.devToolsAiAssistancePerformanceAgent?.enabled && UI9.ViewManager.ViewManager.instance().hasView("timeline")) {
      featureCards.push({
        icon: "performance",
        heading: "Performance",
        jslogContext: "open-performance-panel",
        onClick: () => {
          void UI9.ViewManager.ViewManager.instance().showView("timeline");
        },
        panelName: "Performance",
        text: "to ask about a trace item"
      });
    }
    this.#view({
      featureCards
    }, {}, this.contentElement);
  }
};

// gen/front_end/panels/ai_assistance/components/OptInChangeDialog.js
var OptInChangeDialog_exports = {};
__export(OptInChangeDialog_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW9,
  OptInChangeDialog: () => OptInChangeDialog
});
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as Root7 from "./../../core/root/root.js";
import * as Buttons8 from "./../../ui/components/buttons/buttons.js";
import * as UI10 from "./../../ui/legacy/legacy.js";
import * as Lit7 from "./../../ui/lit/lit.js";
import * as VisualLogging8 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/ai_assistance/components/optInChangeDialog.css.js
var optInChangeDialog_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    width: 100%;
    box-shadow: none;
    padding: var(--sys-size-8);
    background-color: var(--sys-color-surface);
    border-radius: var(--sys-shape-corner-medium);
  }

  .opt-in-change-dialog {
    width: var(--sys-size-33);
    max-width: 100%;
  }

  header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--sys-size-8);
    margin-bottom: var(--sys-size-8);

    h1 {
      margin: 0;
      color: var(--sys-color-on-surface);
      font: var(--sys-typescale-headline5);
    }

    .header-icon-container {
      background: linear-gradient(
        135deg,
        var(--sys-color-gradient-primary),
        var(--sys-color-gradient-tertiary)
      );
      border-radius: var(--sys-size-4);
      height: var(--sys-size-14);
      width: var(--sys-size-14);
      display: flex;
      align-items: center;
      justify-content: center;

      devtools-icon {
        width: var(--sys-size-9);
        height: var(--sys-size-9);
      }
    }
  }

  main {
    background-color: var(--sys-color-surface4);
    border-radius: var(--sys-shape-corner-medium-small);
    padding: var(--sys-size-8);
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-6);
    margin-bottom: var(--sys-size-8);

    .item {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--sys-size-8);

      devtools-icon {
        width: var(--sys-size-8);
        height: var(--sys-size-8);
        flex-shrink: 0;
        color: var(--sys-color-on-surface-subtle);
      }

      .text {
        font: var(--sys-typescale-body4);
        color: var(--sys-color-on-surface);
      }
    }
  }

  footer {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;

    .right-buttons {
      display: flex;
      gap: var(--sys-size-5);
    }
  }
}

/*# sourceURL=${import.meta.resolve("././components/optInChangeDialog.css")} */`;

// gen/front_end/panels/ai_assistance/components/OptInChangeDialog.js
var { html: html12, render: render10 } = Lit7;
var UIStrings5 = {
  /**
   * @description Title for the opt-in change dialog.
   */
  title: "AI assistance just got better",
  /**
   * @description First point in the opt-in change dialog, describing the new integration.
   */
  integrationPoint: "AI assistance is now integrated with Application and Lighthouse panels, and pulls context from data sources simultaneously",
  /**
   * @description Second point in the opt-in change dialog, describing the new widgets.
   */
  widgetPoint: "Use widgets to verify results or jump to source data for select debugging cases",
  /**
   * @description Third point in the opt-in change dialog (disclaimer) for regular users.
   */
  privacyDisclaimer: "Chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Third point in the opt-in change dialog (disclaimer) for enterprise users with logging disabled.
   */
  privacyDisclaimerEnterpriseNoLogging: "Chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google. The content submitted to and generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Button text for managing settings.
   */
  manageSettings: "Manage in settings",
  /**
   * @description Button text for acknowledging the changes.
   */
  gotIt: "Got it"
};
var str_5 = i18n19.i18n.registerUIStrings("panels/ai_assistance/components/OptInChangeDialog.ts", UIStrings5);
var i18nString5 = i18n19.i18n.getLocalizedString.bind(void 0, str_5);
var DEFAULT_VIEW9 = (input, _output, target) => {
  const disclaimer = input.loggingEnabled ? i18nString5(UIStrings5.privacyDisclaimer) : i18nString5(UIStrings5.privacyDisclaimerEnterpriseNoLogging);
  render10(html12`
    <style>${optInChangeDialog_css_default}</style>
    <div class="opt-in-change-dialog" jslog=${VisualLogging8.dialog("ai-v2-opt-in-change-dialog")}>
      <header>
        <div class="header-icon-container">
          <devtools-icon name="smart-assistant" role="presentation"></devtools-icon>
        </div>
        <h1 tabindex="-1">
          ${i18nString5(UIStrings5.title)}
        </h1>
      </header>
      <main>
        <div class="item">
          <devtools-icon name="lightbulb-spark" role="presentation"></devtools-icon>
          <div class="text">${i18nString5(UIStrings5.integrationPoint)}</div>
        </div>
        <div class="item">
          <devtools-icon name="flowsheet" role="presentation"></devtools-icon>
          <div class="text">${i18nString5(UIStrings5.widgetPoint)}</div>
        </div>
        <div class="item">
          <devtools-icon name="google" role="presentation"></devtools-icon>
          <div class="text">${disclaimer}</div>
        </div>
      </main>
      <footer>
        <div class="right-buttons">
          <devtools-button
            @click=${input.onManageSettings}
            .jslogContext=${"ai-assistance-v2-opt-in.manage-settings"}
            .variant=${"outlined"}
            .accessibleLabel=${i18nString5(UIStrings5.manageSettings)}
          >
            ${i18nString5(UIStrings5.manageSettings)}
          </devtools-button>
          <devtools-button
            @click=${input.onGotIt}
            .jslogContext=${"ai-assistance-v2-opt-in.got-it"}
            .variant=${"primary"}
            .accessibleLabel=${i18nString5(UIStrings5.gotIt)}
          >
            ${i18nString5(UIStrings5.gotIt)}
          </devtools-button>
        </div>
      </footer>
    </div>
  `, target);
};
var OptInChangeDialog = class _OptInChangeDialog extends UI10.Widget.VBox {
  #view;
  #onGotIt;
  #onManageSettings;
  constructor(options, view = DEFAULT_VIEW9) {
    super();
    this.#onGotIt = options.onGotIt;
    this.#onManageSettings = options.onManageSettings;
    this.#view = view;
    this.requestUpdate();
  }
  performUpdate() {
    const loggingEnabled = Root7.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue !== Root7.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    const viewInput = {
      onGotIt: this.#onGotIt,
      onManageSettings: this.#onManageSettings,
      loggingEnabled
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
  focusTitle() {
    this.contentElement.querySelector("h1")?.focus();
  }
  static show(options) {
    const dialog3 = new UI10.Dialog.Dialog();
    dialog3.setAriaLabel(i18nString5(UIStrings5.title));
    dialog3.setOutsideClickCallback((event) => event.consume(true));
    dialog3.setCloseOnEscape(false);
    dialog3.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    dialog3.setDimmed(true);
    const optInChangeDialog = new _OptInChangeDialog({
      onGotIt: () => {
        dialog3.hide();
        options.onGotIt();
      },
      onManageSettings: () => {
        dialog3.hide();
        options.onManageSettings();
      }
    });
    optInChangeDialog.show(dialog3.contentElement);
    void optInChangeDialog.updateComplete.then(() => {
      dialog3.show();
      optInChangeDialog.focusTitle();
    });
  }
};

// gen/front_end/panels/ai_assistance/components/PerformanceAgentMarkdownRenderer.js
import * as Common5 from "./../../core/common/common.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as Trace2 from "./../../models/trace/trace.js";
import * as Lit8 from "./../../ui/lit/lit.js";
import * as PanelsCommon4 from "./../common/common.js";
var { html: html13 } = Lit8.StaticHtml;
var { until: until2 } = Lit8.Directives;
var PerformanceAgentMarkdownRenderer = class extends MarkdownRendererWithCodeBlock {
  mainFrameId;
  lookupEvent;
  constructor(mainFrameId = "", lookupEvent = () => null) {
    super();
    this.mainFrameId = mainFrameId;
    this.lookupEvent = lookupEvent;
  }
  templateForToken(token) {
    if (token.type === "link" && token.href.startsWith("#")) {
      if (token.href.startsWith("#node-")) {
        const nodeId = Number(token.href.replace("#node-", ""));
        return html13`<span>${until2(this.#linkifyNode(nodeId, token.text).then((node) => node || token.text), token.text)}</span>`;
      }
      const event = this.lookupEvent(token.href.slice(1));
      if (!event) {
        return html13`${token.text}`;
      }
      let label = token.text;
      let title = "";
      if (Trace2.Types.Events.isSyntheticNetworkRequest(event)) {
        title = event.args.data.url;
      } else {
        label += ` (${event.name})`;
      }
      return html13`<a href="#" draggable=false .title=${title} @click=${(e) => {
        e.stopPropagation();
        void Common5.Revealer.reveal(new SDK4.TraceObject.RevealableEvent(event));
      }}>${label}</a>`;
    }
    return super.templateForToken(token);
  }
  // Taken from front_end/panels/timeline/components/insights/NodeLink.ts
  // Would be nice to move the above component to somewhere that allows the AI
  // Assistance panel to also use it.
  async #linkifyNode(backendNodeId, label) {
    if (backendNodeId === void 0) {
      return;
    }
    const target = SDK4.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK4.DOMModel.DOMModel);
    if (!domModel) {
      return void 0;
    }
    const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([backendNodeId]));
    const node = domNodesMap?.get(backendNodeId);
    if (!node) {
      return;
    }
    if (node.frameId() !== this.mainFrameId) {
      return;
    }
    const linkedNode = PanelsCommon4.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
    return linkedNode;
  }
};

// gen/front_end/panels/ai_assistance/components/StylingAgentMarkdownRenderer.js
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as Marked3 from "./../../third_party/marked/marked.js";
import * as Lit9 from "./../../ui/lit/lit.js";
import * as PanelsCommon5 from "./../common/common.js";
var { html: html14 } = Lit9.StaticHtml;
var { until: until3 } = Lit9.Directives;
var StylingAgentMarkdownRenderer = class _StylingAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
  mainFrameId;
  constructor(mainFrameId = "") {
    super();
    this.mainFrameId = mainFrameId;
  }
  #renderTableFromJson(data) {
    if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== "object" || data[0] === null) {
      return null;
    }
    const headers = Object.keys(data[0]);
    const requiredKeys = ["Problem", "Element", "NodeId", "Details"];
    if (!requiredKeys.every((key) => headers.includes(key))) {
      return null;
    }
    const problemIndex = headers.indexOf("Problem");
    if (problemIndex > -1) {
      const problemHeader = headers.splice(problemIndex, 1);
      headers.unshift(...problemHeader);
    }
    return html14`
      <table style="width: 100%;">
        <thead>
          <tr>
            ${headers.map((header) => html14`<th style="text-align: left;">${header === "NodeId" ? "" : header}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${data.flatMap((row) => {
      return html14`
            <tr>
              ${headers.map((header) => {
        if (header === "NodeId") {
          return html14`<td>${this.#renderLinkifiedText(row[header])}</td>`;
        }
        if (header === "Details") {
          return html14`<td><a href="#" @click=${this.#toggleDetailsRow}>Details</a></td>`;
        }
        return html14`<td>${row[header]}</td>`;
      })}
            </tr>
            <tr class="details-row" style="display: none;">
              <td colspan=${headers.length} style="background-color: #f0f0f0; padding: 1em;">
                <devtools-markdown-view .data=${{
        tokens: Marked3.Marked.lexer(row["Details"]),
        renderer: new _StylingAgentMarkdownRenderer(this.mainFrameId)
      }}></devtools-markdown-view>
              </td>
            </tr>
          `;
    })}
        </tbody>
      </table>
      <br><div>To investigate these problems, please click one of the provided links (above), to set as context, and ask me further questions about the problem.</div>
    `;
  }
  templateForToken(token) {
    if (token.type === "code") {
      try {
        const data = JSON.parse(token.text);
        const table = this.#renderTableFromJson(data);
        if (table) {
          return table;
        }
      } catch {
      }
    }
    if (token.type === "link" && token.href.startsWith("#")) {
      let nodeId = void 0;
      if (token.href.startsWith("#node-")) {
        nodeId = Number(token.href.replace("#node-", ""));
      } else if (token.href.startsWith("#")) {
        nodeId = Number(token.href.replace("#", ""));
      }
      if (nodeId) {
        return html14`<span>${until3(this.#linkifyNode(nodeId, token.text).then((node) => node || token.text), token.text)}</span>`;
      }
    }
    return super.templateForToken(token);
  }
  #toggleDetailsRow(e) {
    e.preventDefault();
    const link4 = e.target;
    const currentRow = link4.closest("tr");
    if (!currentRow) {
      return;
    }
    const detailsRow = currentRow.nextElementSibling;
    if (detailsRow?.classList.contains("details-row")) {
      if (detailsRow.style.display === "none") {
        detailsRow.style.display = "table-row";
        link4.textContent = "Hide";
      } else {
        detailsRow.style.display = "none";
        link4.textContent = "Details";
      }
    }
  }
  #renderLinkifiedText(text) {
    if (text.indexOf(",") === -1) {
      const nodeId = Number(text);
      if (isNaN(nodeId)) {
        return html14`${text}`;
      }
      return this.#renderSingleLink(nodeId);
    }
    const nodeIdsStr = text.split(",").map((s) => s.trim()).filter(Boolean);
    return html14`${nodeIdsStr.map((idStr) => {
      const nodeId = Number(idStr);
      if (isNaN(nodeId)) {
        return html14`<div>${idStr}</div>`;
      }
      return html14`<div>${this.#renderSingleLink(nodeId)}</div>`;
    })}`;
  }
  #renderSingleLink(nodeId) {
    const label = `link`;
    return html14`<span>${until3(this.#linkifyNode(nodeId, label).then((node) => node || label), label)}</span>`;
  }
  async #linkifyNode(backendNodeId, label) {
    if (backendNodeId === void 0) {
      return;
    }
    const target = SDK5.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK5.DOMModel.DOMModel);
    if (!domModel) {
      return void 0;
    }
    const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([backendNodeId]));
    const node = domNodesMap?.get(backendNodeId);
    if (!node) {
      return;
    }
    if (node.frameId() !== this.mainFrameId) {
      return;
    }
    const linkedNode = PanelsCommon5.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
    return linkedNode;
  }
};

// gen/front_end/panels/ai_assistance/ExportConversation.js
var ExportConversation_exports = {};
__export(ExportConversation_exports, {
  saveToDisk: () => saveToDisk
});
import * as Platform6 from "./../../core/platform/platform.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Workspace5 from "./../../models/workspace/workspace.js";
async function saveToDisk(conversation) {
  const markdownContent = conversation.getConversationMarkdown();
  const contentData = new TextUtils.ContentData.ContentData(markdownContent, false, "text/markdown");
  const titleFormatted = Platform6.StringUtilities.toSnakeCase(conversation.title || "");
  const prefix = "devtools_";
  const suffix = ".md";
  const maxTitleLength = 64 - prefix.length - suffix.length;
  let finalTitle = titleFormatted || "conversation";
  if (finalTitle.length > maxTitleLength) {
    finalTitle = finalTitle.substring(0, maxTitleLength);
  }
  const filename = `${prefix}${finalTitle}${suffix}`;
  await Workspace5.FileManager.FileManager.instance().save(filename, contentData, true);
  Workspace5.FileManager.FileManager.instance().close(filename);
}

// gen/front_end/panels/ai_assistance/AiAssistancePanel.js
var { html: html15 } = Lit10;
var { widget: widget5 } = UI11.Widget;
var AI_ASSISTANCE_SEND_FEEDBACK = "https://crbug.com/364805393";
var AI_ASSISTANCE_HELP = "https://developer.chrome.com/docs/devtools/ai-assistance";
var WALKTHROUGH_SIDEBAR_BREAKPOINT = 700;
var WALKTHROUGH_SIDEBAR_INITIAL_WIDTH = 400;
var UIStrings6 = {
  /**
   * @description AI assistance UI text creating a new chat.
   */
  newChat: "New chat",
  /**
   * @description AI assistance UI tooltip text for the help button.
   */
  help: "Help",
  /**
   * @description AI assistant UI tooltip text for the settings button (gear icon).
   */
  settings: "Settings",
  /**
   * @description AI assistant UI tooltip sending feedback.
   */
  sendFeedback: "Send feedback",
  /**
   * @description Announcement text for screen readers when a new chat is created.
   */
  newChatCreated: "New chat created",
  /**
   * @description Announcement text for screen readers when the chat is deleted.
   */
  chatDeleted: "Chat deleted",
  /**
   * @description AI assistance UI text creating selecting a history entry.
   */
  history: "History",
  /**
   * @description AI assistance UI text deleting the current chat session from local history.
   */
  deleteChat: "Delete local chat",
  /**
   * @description AI assistance UI text that deletes all local history entries.
   */
  clearChatHistory: "Clear local chats",
  /**
   *@description AI assistance UI text for the export conversation button.
   */
  exportConversation: "Export conversation",
  /**
   * @description AI assistance UI text explains that he user had no pas conversations.
   */
  noPastConversations: "No past conversations",
  /**
   * @description Placeholder text for an inactive text field. When active, it's used for the user's input to the GenAI assistance.
   */
  followTheSteps: "Follow the steps above to ask a question",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForEmptyState: "This is an experimental AI feature and won't always get it right.",
  /**
   * @description The message shown in a toast when the response is copied to the clipboard.
   */
  responseCopiedToClipboard: "Response copied to clipboard"
};
var UIStringsNotTranslate7 = {
  /**
   * @description Announcement text for screen readers when the conversation starts.
   */
  answerLoading: "Answer loading",
  /**
   * @description Announcement text for screen readers when the answer comes.
   */
  answerReady: "Answer ready",
  /**
   * @description Title for the first step of the walkthrough.
   */
  analyzingData: "Analyzing data",
  /**
   * @description Placeholder text for the input shown when the conversation is blocked because a cross-origin context was selected.
   */
  crossOriginError: "To talk about data from another origin, start a new chat",
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForStyling: "Ask a question about the selected element",
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForNetwork: "Ask a question about the selected network request",
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForFile: "Ask a question about the selected file",
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceWithNoRecording: "Record a performance trace and select an item to ask a question",
  /**
   * @description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForStylingNoContext: "Select an element to ask a question",
  /**
   * @description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForNetworkNoContext: "Select a network request to ask a question",
  /**
   * @description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForFileNoContext: "Select a file to ask a question",
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceTrace: "Ask a question about the selected performance trace",
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForPerformanceTraceNoContext: "Record or select a performance trace to ask a question",
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForNoContext: "Ask AI Assistance",
  /**
   * @description Placeholder text for the chat UI input with branding Gemini (do not translate)
   */
  inputPlaceholderForNoContextBranded: "Ask Gemini",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForStyling: "Chat messages and any data the inspected page can access via Web APIs are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForStylingEnterpriseNoLogging: "Chat messages and any data the inspected page can access via Web APIs are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForNetwork: "Chat messages and the selected network request are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForNetworkEnterpriseNoLogging: "Chat messages and the selected network request are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForFile: "Chat messages and the selected file are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won't always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForFileEnterpriseNoLogging: "Chat messages and the selected file are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForPerformance: "Chat messages and trace data from your performance trace are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won't always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForPerformanceEnterpriseNoLogging: "Chat messages and data from your performance trace are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForNoContext: "Chat messages, any data the inspected page can see using Web APIs, and the items you select such as files, network requests, and performance traces are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForNoContextEnterpriseNoLogging: "Chat messages, any data the inspected page can see using Web APIs, and the items you select such as files, network requests, and performance traces are sent to Google. This data will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Placeholder text for the chat UI input.
   */
  inputPlaceholderForAccessibility: "Ask a question about the selected Lighthouse report",
  /**
   * @description Placeholder text for the chat UI input when there is no context selected.
   */
  inputPlaceholderForAccessibilityNoContext: "Generate a Lighthouse report to ask a question",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForAccessibility: "Chat messages and the selected Lighthouse report are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForAccessibilityEnterpriseNoLogging: "Chat messages and the selected Lighthouse report are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input when V2 is enabled.
   */
  inputDisclaimerV2: "Chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input when V2 is enabled and enterprise logging is off.
   */
  inputDisclaimerEnterpriseNoLoggingV2: "Chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google. The content submitted to and generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right."
};
var str_6 = i18n21.i18n.registerUIStrings("panels/ai_assistance/AiAssistancePanel.ts", UIStrings6);
var i18nString6 = i18n21.i18n.getLocalizedString.bind(void 0, str_6);
var lockedString8 = i18n21.i18n.lockedString;
function selectedElementFilter(maybeNode) {
  if (maybeNode) {
    if (Greendev.Prototypes.instance().isEnabled("emulationCapabilities")) {
      return maybeNode;
    }
    return maybeNode.nodeType() === Node.ELEMENT_NODE ? maybeNode : null;
  }
  return null;
}
async function getEmptyStateSuggestions(conversation) {
  const context = conversation?.selectedContext;
  if (context) {
    const specialSuggestions = await context.getSuggestions();
    if (specialSuggestions) {
      return specialSuggestions;
    }
  }
  if (!conversation?.type || conversation.isReadOnly) {
    return [];
  }
  switch (conversation.type) {
    case "freestyler":
      return [
        { title: "What can you help me with?", jslogContext: "styling-default" },
        { title: "Why isn\u2019t this element visible?", jslogContext: "styling-default" },
        {
          title: Greendev.Prototypes.instance().isEnabled("emulationCapabilities") ? "Are there display issues on this page for people using an Android phone?" : "How do I center this element?",
          jslogContext: "styling-default"
        }
      ];
    case "drjones-file":
      return [
        { title: "What does this script do?", jslogContext: "file-default" },
        { title: "Is the script optimized for performance?", jslogContext: "file-default" },
        { title: "Does the script handle user input safely?", jslogContext: "file-default" }
      ];
    case "accessibility":
      return [
        { title: "How can I fix accessibility issues on my page?", jslogContext: "accessibility-default" },
        { title: "What accessibility issues exist on my page?", jslogContext: "accessibility-default" }
      ];
    case "drjones-network-request":
      return [
        { title: "Why is this network request taking so long?", jslogContext: "network-default" },
        { title: "Are there any security headers present?", jslogContext: "network-default" },
        { title: "Why is the request failing?", jslogContext: "network-default" }
      ];
    case "drjones-performance-full": {
      return [
        { title: "What performance issues exist with my page?", jslogContext: "performance-default" }
      ];
    }
    case "breakpoint": {
      return [
        { title: "Why did the code pause here?" },
        { title: "What function does this breakpoint belong to?" },
        { title: "Why is this error thrown?" }
      ];
    }
    case "none": {
      return [
        { title: "What can you help me with?", jslogContext: "empty" },
        { title: "What performance issues exist on the page?", jslogContext: "empty" },
        { title: "What are the slowest network requests on this page?", jslogContext: "empty" }
      ];
    }
    default:
      Platform7.assertNever(conversation.type, "Unknown conversation type");
  }
}
function getMarkdownRenderer(conversation) {
  const context = conversation?.selectedContext;
  if (context instanceof AiAssistanceModel7.PerformanceAgent.PerformanceTraceContext) {
    if (!context.external) {
      const focus = context.getItem();
      return new PerformanceAgentMarkdownRenderer(focus.parsedTrace.data.Meta.mainFrameId, focus.lookupEvent.bind(focus));
    }
  } else if (conversation?.type === "drjones-performance-full") {
    return new PerformanceAgentMarkdownRenderer();
  } else if (Greendev.Prototypes.instance().isEnabled("emulationCapabilities") && conversation?.type === "freestyler" && SDK6.TargetManager.TargetManager.instance().primaryPageTarget()?.model(SDK6.DOMModel.DOMModel)) {
    const domModel = SDK6.TargetManager.TargetManager.instance().primaryPageTarget()?.model(SDK6.DOMModel.DOMModel);
    const resourceTreeModel = domModel?.target().model(SDK6.ResourceTreeModel.ResourceTreeModel);
    const mainFrameId = resourceTreeModel?.mainFrame?.id;
    return new StylingAgentMarkdownRenderer(mainFrameId);
  } else if (conversation?.type === "accessibility") {
    const domModel = SDK6.TargetManager.TargetManager.instance().primaryPageTarget()?.model(SDK6.DOMModel.DOMModel);
    const resourceTreeModel = domModel?.target().model(SDK6.ResourceTreeModel.ResourceTreeModel);
    const mainFrameId = resourceTreeModel?.mainFrame?.id;
    return new AccessibilityAgentMarkdownRenderer(mainFrameId);
  }
  return new MarkdownRendererWithCodeBlock();
}
function toolbarView(input) {
  const hasAiV2 = Boolean(Root8.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled);
  return html15`
    <div class="toolbar-container" role="toolbar" jslog=${VisualLogging9.toolbar()}>
      <devtools-toolbar class="freestyler-left-toolbar" role="presentation">
      ${input.showChatActions ? html15`<devtools-button
          title=${i18nString6(UIStrings6.newChat)}
          aria-label=${i18nString6(UIStrings6.newChat)}
          .iconName=${"plus"}
          .jslogContext=${"freestyler.new-chat"}
          .variant=${"toolbar"}
          @click=${input.onNewChatClick}></devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-menu-button
          title=${i18nString6(UIStrings6.history)}
          aria-label=${i18nString6(UIStrings6.history)}
          .iconName=${"history"}
          .jslogContext=${"freestyler.history"}
          .populateMenuCall=${input.populateHistoryMenu}
        ></devtools-menu-button>` : Lit10.nothing}
        ${input.showActiveConversationActions ? html15`
          <devtools-button
              title=${i18nString6(UIStrings6.deleteChat)}
              aria-label=${i18nString6(UIStrings6.deleteChat)}
              .iconName=${"bin"}
              .jslogContext=${"freestyler.delete"}
              .variant=${"toolbar"}
              @click=${input.onDeleteClick}>
          </devtools-button>
          ${hasAiV2 ? Lit10.nothing : html15`
            <devtools-button
              title=${i18nString6(UIStrings6.exportConversation)}
              aria-label=${i18nString6(UIStrings6.exportConversation)}
              .iconName=${"download"}
              .disabled=${input.isLoading}
              .jslogContext=${"export-ai-conversation"}
              .variant=${"toolbar"}
              @click=${input.onExportConversationClick}>
            </devtools-button>
            `}` : Lit10.nothing}
      </devtools-toolbar>
      <devtools-toolbar class="freestyler-right-toolbar" role="presentation">
        <devtools-link
          class="toolbar-feedback-link"
          title=${i18nString6(UIStrings6.sendFeedback)}
          href=${AI_ASSISTANCE_SEND_FEEDBACK}
          jslogcontext=${"freestyler.send-feedback"}
        >${i18nString6(UIStrings6.sendFeedback)}</devtools-link>
        <div class="toolbar-divider"></div>
        <devtools-button
          title=${i18nString6(UIStrings6.help)}
          aria-label=${i18nString6(UIStrings6.help)}
          .iconName=${"help"}
          .jslogContext=${"freestyler.help"}
          .variant=${"toolbar"}
          @click=${input.onHelpClick}></devtools-button>
        <devtools-button
          title=${i18nString6(UIStrings6.settings)}
          aria-label=${i18nString6(UIStrings6.settings)}
          .iconName=${"gear"}
          .jslogContext=${"freestyler.settings"}
          .variant=${"toolbar"}
          @click=${input.onSettingsClick}></devtools-button>
      </devtools-toolbar>
    </div>
  `;
}
function defaultView(input, output, target) {
  function renderState() {
    switch (input.state) {
      case "chat-view": {
        return html15`<devtools-ai-chat-view
          .props=${input.props}
          ${Lit10.Directives.ref((el) => {
          if (!el || !(el instanceof ChatView)) {
            return;
          }
          output.chatView = el;
        })}
        ></devtools-ai-chat-view>`;
      }
      case "explore-view":
        return html15`<devtools-widget class="fill-panel" ${widget5(ExploreWidget)}>
                    </devtools-widget>`;
      case "disabled-view":
        return html15`<devtools-widget class="fill-panel" ${widget5(DisabledWidget, input.props)}>
                    </devtools-widget>`;
    }
  }
  if (Root8.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled || Greendev.Prototypes.instance().isEnabled("breakpointDebuggerAgent")) {
    const shouldShowWalkthrough = input.state === "chat-view" && input.props.walkthrough.isExpanded;
    let walkthroughIsForLastMessage = false;
    if (input.state === "chat-view") {
      const lastMessage = input.props.messages.at(-1);
      if (lastMessage && input.props.walkthrough.activeSidebarMessage === lastMessage) {
        walkthroughIsForLastMessage = true;
      }
    }
    Lit10.render(html15`
      ${toolbarView(input)}
      <div class="ai-assistance-view-container">
        <devtools-split-view
          name="ai-assistance-split-view-state"
          direction="column"
          sidebar-position="second"
          sidebar-visibility=${shouldShowWalkthrough && !input.props.walkthrough.isInlined ? "visible" : "hidden"}
          sidebar-initial-size=${WALKTHROUGH_SIDEBAR_INITIAL_WIDTH}
        >
          <div slot="main" class="main-view">
            ${renderState()}
          </div>
          ${shouldShowWalkthrough ? html15`
            <devtools-widget slot="sidebar" ${widget5(WalkthroughView, {
      message: input.props.walkthrough.activeSidebarMessage,
      isLoading: input.props.isLoading && walkthroughIsForLastMessage,
      markdownRenderer: input.props.markdownRenderer,
      onToggle: input.props.walkthrough.onToggle
    })}></devtools-widget>` : Lit10.nothing}
        </devtools-split-view>
      </div>
    `, target);
  } else {
    Lit10.render(html15`
      ${toolbarView(input)}
      <div class="ai-assistance-view-container">${renderState()}</div>
    `, target);
  }
}
function createNodeContext(node) {
  if (!node) {
    return null;
  }
  return new AiAssistanceModel7.StylingAgent.NodeContext(node);
}
function createFileContext(file) {
  if (!file) {
    return null;
  }
  return new AiAssistanceModel7.FileAgent.FileContext(file);
}
function createBreakpointContext(uiLocation) {
  if (!uiLocation) {
    return null;
  }
  return new AiAssistanceModel7.BreakpointDebuggerAgent.BreakpointContext(uiLocation);
}
function createAccessibilityContext(report) {
  if (!report) {
    return null;
  }
  return new AiAssistanceModel7.AccessibilityAgent.AccessibilityContext(report.report);
}
function createRequestContext(request) {
  if (!request) {
    return null;
  }
  const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
  return new AiAssistanceModel7.NetworkAgent.RequestContext(request, calculator);
}
function createPerformanceTraceContext(focus) {
  if (!focus) {
    return null;
  }
  return new AiAssistanceModel7.PerformanceAgent.PerformanceTraceContext(focus);
}
var panelInstance;
var AiAssistancePanel = class _AiAssistancePanel extends UI11.Panel.Panel {
  view;
  static panelName = "freestyler";
  // NodeJS debugging does not have Elements panel, thus this action might not exist.
  #toggleSearchElementAction;
  #aidaClient;
  #conversationSummaryAgent;
  #viewOutput = {};
  #serverSideLoggingEnabled = isAiAssistanceServerSideLoggingEnabled();
  #aiAssistanceEnabledSetting;
  #changeManager = new AiAssistanceModel7.ChangeManager.ChangeManager();
  #mutex = new Common6.Mutex.Mutex();
  #conversation;
  #selectedFile = null;
  #selectedElement = null;
  #selectedPerformanceTrace = null;
  #selectedRequest = null;
  #selectedBreakpoint = null;
  #selectedAccessibility = null;
  // Messages displayed in the `ChatView` component.
  #messages = [];
  // Whether the UI should show loading or not.
  #isLoading = false;
  // Stores the availability status of the `AidaClient` and the reason for unavailability, if any.
  #aidaAvailability;
  #timelinePanelInstance = null;
  #runAbortController = new AbortController();
  #walkthrough = {
    isInlined: false,
    isExpanded: false,
    activeSidebarMessage: null,
    inlineExpandedMessages: []
  };
  constructor(view = defaultView, { aidaClient, aidaAvailability }) {
    super(_AiAssistancePanel.panelName);
    this.view = view;
    this.registerRequiredCSS(aiAssistancePanel_css_default);
    this.#aiAssistanceEnabledSetting = this.#getAiAssistanceEnabledSetting();
    this.#aidaClient = aidaClient;
    this.#aidaAvailability = aidaAvailability;
    if (UI11.ActionRegistry.ActionRegistry.instance().hasAction("elements.toggle-element-search")) {
      this.#toggleSearchElementAction = UI11.ActionRegistry.ActionRegistry.instance().getAction("elements.toggle-element-search");
    }
    AiAssistanceModel7.AiHistoryStorage.AiHistoryStorage.instance().addEventListener("AiHistoryDeleted", this.#onHistoryDeleted, this);
  }
  #getToolbarInput() {
    return {
      isLoading: this.#isLoading,
      showChatActions: this.#shouldShowChatActions(),
      showActiveConversationActions: Boolean(this.#conversation && !this.#conversation.isEmpty),
      onNewChatClick: this.#handleNewChatRequest.bind(this),
      populateHistoryMenu: this.#populateHistoryMenu.bind(this),
      onDeleteClick: this.#onDeleteClicked.bind(this),
      onExportConversationClick: this.#onExportConversationClick.bind(this),
      onHelpClick: () => {
        UIHelpers2.openInNewTab(AI_ASSISTANCE_HELP);
      },
      onSettingsClick: () => {
        void UI11.ViewManager.ViewManager.instance().showView("chrome-ai");
      }
    };
  }
  async #getPanelViewInput() {
    const blockedByAge = Root8.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    if (this.#aidaAvailability !== "available" || !this.#aiAssistanceEnabledSetting?.getIfNotDisabled() || blockedByAge) {
      return {
        state: "disabled-view",
        props: {
          aidaAvailability: this.#aidaAvailability
        }
      };
    }
    if (this.#conversation) {
      const emptyStateSuggestions = await getEmptyStateSuggestions(this.#conversation);
      const markdownRenderer = getMarkdownRenderer(this.#conversation);
      let onContextAdd = null;
      if (isAiAssistanceContextSelectionAgentEnabled() && // Only add it the button if can have anything already selected
      this.#getConversationContext(this.#getDefaultConversationType())) {
        onContextAdd = this.#handleContextAdd.bind(this);
      }
      return {
        state: "chat-view",
        props: {
          blockedByCrossOrigin: this.#conversation.isBlockedByOrigin,
          isLoading: this.#isLoading,
          messages: this.#messages,
          /**
           * We pass either the selected context with isContextSelected=true
           * to make sure the pill is show with normal styling and a remove button.
           * Or we pass the panels default context with isContextSelected=false
           * to display a placeholder pill with neutral styling and an add button.
           */
          context: this.#conversation.selectedContext ?? this.#getConversationContext(this.#getDefaultConversationType()),
          isContextSelected: Boolean(this.#conversation.selectedContext),
          conversationType: this.#conversation.type,
          isReadOnly: this.#conversation.isReadOnly ?? false,
          changeSummary: this.#getChangeSummary(),
          inspectElementToggled: this.#toggleSearchElementAction?.toggled() ?? false,
          canShowFeedbackForm: this.#serverSideLoggingEnabled,
          multimodalInputEnabled: isAiAssistanceMultimodalInputEnabled() && this.#conversation.type === "freestyler",
          isTextInputDisabled: this.#isTextInputDisabled(),
          emptyStateSuggestions,
          inputPlaceholder: this.#getChatInputPlaceholder(),
          disclaimerText: this.#getDisclaimerText(),
          onExportConversation: this.#onExportConversationClick.bind(this),
          changeManager: this.#changeManager,
          uploadImageInputEnabled: isAiAssistanceMultimodalUploadInputEnabled() && this.#conversation.type === "freestyler",
          markdownRenderer,
          conversationMarkdown: this.#conversation.getConversationMarkdown(),
          generateConversationSummary: async (markdown) => {
            if (!this.#conversationSummaryAgent) {
              this.#conversationSummaryAgent = new AiAssistanceModel7.ConversationSummaryAgent.ConversationSummaryAgent({
                aidaClient: this.#aidaClient,
                serverSideLoggingEnabled: this.#serverSideLoggingEnabled
              });
            }
            return await this.#conversationSummaryAgent.summarizeConversation(markdown);
          },
          onTextSubmit: async (text, imageInput, multimodalInputType) => {
            const submit = () => {
              Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceQuerySubmitted);
              void this.#startConversation(text, imageInput, multimodalInputType);
            };
            const isAIV2Enabled = Root8.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled;
            const seenSetting = Common6.Settings.Settings.instance().moduleSetting("ai-assistance-v2-opt-in-change-dialog-seen");
            if (isAIV2Enabled && !seenSetting.get()) {
              OptInChangeDialog.show({
                onGotIt: () => {
                  seenSetting.set(true);
                  submit();
                },
                onManageSettings: () => {
                  seenSetting.set(true);
                  this.#viewOutput.chatView?.setInputValue(text);
                  void UI11.ViewManager.ViewManager.instance().showView("chrome-ai");
                }
              });
              return;
            }
            submit();
          },
          onInspectElementClick: this.#handleSelectElementClick.bind(this),
          onFeedbackSubmit: this.#handleFeedbackSubmit.bind(this),
          onCancelClick: this.#cancel.bind(this),
          onContextClick: this.#handleContextClick.bind(this),
          onNewConversation: this.#handleNewChatRequest.bind(this),
          onCopyResponseClick: this.#onCopyResponseClick.bind(this),
          onContextRemoved: isAiAssistanceContextSelectionAgentEnabled() ? this.#handleContextRemoved.bind(this) : null,
          onContextAdd,
          walkthrough: {
            onToggle: this.#toggleWalkthrough.bind(this),
            onOpen: this.#openWalkthrough.bind(this),
            isExpanded: this.#walkthrough.isExpanded,
            isInlined: this.#walkthrough.isInlined,
            activeSidebarMessage: this.#walkthrough.activeSidebarMessage,
            inlineExpandedMessages: this.#walkthrough.inlineExpandedMessages
          }
        }
      };
    }
    return {
      state: "explore-view"
    };
  }
  // Responsive logic for Walkthrough
  onResize() {
    super.onResize();
    if (Root8.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled) {
      this.#updateWalkthroughResponsiveness();
    }
  }
  #updateWalkthroughResponsiveness() {
    const isNarrow = this.contentElement.offsetWidth < WALKTHROUGH_SIDEBAR_BREAKPOINT;
    if (isNarrow === this.#walkthrough.isInlined) {
      return;
    }
    this.#walkthrough.isInlined = isNarrow;
    if (!this.#walkthrough.isExpanded) {
      this.#walkthrough.activeSidebarMessage = null;
      this.#walkthrough.inlineExpandedMessages = [];
      this.requestUpdate();
      return;
    }
    if (isNarrow) {
      this.#walkthrough.inlineExpandedMessages = this.#walkthrough.activeSidebarMessage ? [this.#walkthrough.activeSidebarMessage] : [];
    } else {
      this.#walkthrough.activeSidebarMessage = this.#walkthrough.inlineExpandedMessages.at(-1) ?? null;
    }
    this.requestUpdate();
  }
  #openWalkthrough(message) {
    if (!this.#walkthrough.inlineExpandedMessages.includes(message)) {
      this.#walkthrough.inlineExpandedMessages.push(message);
    }
    this.#walkthrough.activeSidebarMessage = message;
    this.#walkthrough.isExpanded = true;
    this.requestUpdate();
  }
  /**
   * Toggles the expanded state of a walkthrough.
   *
   * In Wide (sidebar) mode:
   * - Opening a message's walkthrough shows the sidebar for that message.
   * - Closing the sidebar hides the walkthrough for the currently active message.
   *
   * In Narrow (inline) mode:
   * - Any number of walkthroughs can be open at once.
   * - Opening/closing a message's walkthrough only affects that message's inline display.
   */
  #toggleWalkthrough(isOpen, message) {
    if (isOpen) {
      this.#openWalkthrough(message);
      return;
    }
    this.#walkthrough.inlineExpandedMessages = this.#walkthrough.inlineExpandedMessages.filter((m) => m !== message);
    if (this.#walkthrough.isInlined) {
      this.#walkthrough.isExpanded = this.#walkthrough.inlineExpandedMessages.length > 0;
      if (this.#walkthrough.activeSidebarMessage === message) {
        this.#walkthrough.activeSidebarMessage = this.#walkthrough.inlineExpandedMessages.at(-1) ?? null;
      }
    } else {
      this.#walkthrough.isExpanded = false;
      this.#walkthrough.activeSidebarMessage = null;
    }
    this.requestUpdate();
  }
  #getAiAssistanceEnabledSetting() {
    try {
      return Common6.Settings.moduleSetting("ai-assistance-enabled");
    } catch {
      return;
    }
  }
  static async instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!panelInstance || forceNew) {
      const aidaClient = new Host7.AidaClient.AidaClient();
      const aidaAvailability = await Host7.AidaClient.AidaClient.checkAccessPreconditions();
      panelInstance = new _AiAssistancePanel(defaultView, { aidaClient, aidaAvailability });
    }
    return panelInstance;
  }
  /**
   * Called when the TimelinePanel instance changes. We use this to listen to
   * the status of if the user is viewing a trace or not, and update the
   * placeholder text in the panel accordingly. We do this because if the user
   * has an active trace, we show different text than if they are viewing
   * the performance panel but have no trace imported.
   */
  #bindTimelineTraceListener() {
    const timelinePanel = UI11.Context.Context.instance().flavor(TimelinePanel2.TimelinePanel.TimelinePanel);
    if (timelinePanel === this.#timelinePanelInstance) {
      return;
    }
    this.#timelinePanelInstance?.removeEventListener("IsViewingTrace", this.requestUpdate, this);
    this.#timelinePanelInstance = timelinePanel;
    if (this.#timelinePanelInstance) {
      this.#timelinePanelInstance.addEventListener("IsViewingTrace", this.requestUpdate, this);
    }
  }
  async #handlePerformanceRecordAndReload() {
    return await TimelinePanel2.TimelinePanel.TimelinePanel.executeRecordAndReload();
  }
  async #handleLighthouseRun(overrides) {
    return await LighthousePanel.LighthousePanel.LighthousePanel.executeLighthouseRecording({
      isAIControlled: true,
      ...overrides
    });
  }
  #getDefaultConversationType() {
    const { hostConfig } = Root8.Runtime;
    const viewManager = UI11.ViewManager.ViewManager.instance();
    const isElementsPanelVisible = viewManager.isViewVisible("elements");
    const isNetworkPanelVisible = viewManager.isViewVisible("network");
    const isSourcesPanelVisible = viewManager.isViewVisible("sources");
    const isPerformancePanelVisible = viewManager.isViewVisible("timeline");
    const isLighthousePanelVisible = viewManager.isViewVisible("lighthouse");
    let targetConversationType;
    if (isElementsPanelVisible && hostConfig.devToolsFreestyler?.enabled) {
      targetConversationType = "freestyler";
    } else if (isNetworkPanelVisible && hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
      targetConversationType = "drjones-network-request";
    } else if (isSourcesPanelVisible && this.#conversation?.type === "breakpoint") {
      targetConversationType = "breakpoint";
    } else if (isSourcesPanelVisible && hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
      targetConversationType = "drjones-file";
    } else if (isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
      targetConversationType = "drjones-performance-full";
    } else if (isLighthousePanelVisible && hostConfig.devToolsAiAssistanceAccessibilityAgent?.enabled) {
      targetConversationType = "accessibility";
    }
    if (isAiAssistanceContextSelectionAgentEnabled() && !targetConversationType) {
      return "none";
    }
    return targetConversationType;
  }
  // We select the default agent based on the open panels if
  // there isn't any active conversation.
  #selectDefaultAgentIfNeeded() {
    if (this.#isLoading) {
      this.requestUpdate();
      return;
    }
    if (this.#conversation && !this.#conversation.isEmpty) {
      this.requestUpdate();
      return;
    }
    const targetConversationType = this.#getDefaultConversationType();
    if (this.#conversation?.type === targetConversationType) {
      this.requestUpdate();
      return;
    }
    const conversation = targetConversationType ? new AiAssistanceModel7.AiConversation.AiConversation({
      type: targetConversationType,
      data: [],
      isReadOnly: false,
      aidaClient: this.#aidaClient,
      changeManager: this.#changeManager,
      isExternal: false,
      performanceRecordAndReload: this.#handlePerformanceRecordAndReload.bind(this),
      onInspectElement: this.#handleInspectElement.bind(this),
      networkTimeCalculator: NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator(),
      lighthouseRecording: this.#handleLighthouseRun.bind(this)
    }) : void 0;
    this.#updateConversationState(conversation);
  }
  #updateConversationState(conversation) {
    if (this.#conversation !== conversation) {
      this.#cancel();
      this.#messages = [];
      this.#isLoading = false;
      this.#conversation?.archiveConversation();
      if (!conversation) {
        const conversationType = this.#getDefaultConversationType();
        if (conversationType) {
          conversation = new AiAssistanceModel7.AiConversation.AiConversation({
            type: conversationType,
            data: [],
            isReadOnly: false,
            aidaClient: this.#aidaClient,
            changeManager: this.#changeManager,
            isExternal: false,
            performanceRecordAndReload: this.#handlePerformanceRecordAndReload.bind(this),
            onInspectElement: this.#handleInspectElement.bind(this),
            networkTimeCalculator: NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator(),
            lighthouseRecording: this.#handleLighthouseRun.bind(this)
          });
        }
      }
      this.#conversation = conversation;
    }
    if (this.#conversation) {
      if (this.#conversation.isEmpty && isAiAssistanceContextSelectionAgentEnabled()) {
        const context = this.#getConversationContext(this.#getDefaultConversationType());
        this.#conversation.setContext(context);
      } else {
        const context = this.#getConversationContext(this.#conversation.type);
        if (context || !isAiAssistanceContextSelectionAgentEnabled()) {
          this.#conversation.setContext(context);
        }
      }
    }
    this.requestUpdate();
  }
  async handleBreakpointConversation(uiLocation, errorMsg) {
    const context = new AiAssistanceModel7.BreakpointDebuggerAgent.BreakpointContext(uiLocation);
    this.#selectedBreakpoint = context;
    const conversation = new AiAssistanceModel7.AiConversation.AiConversation({
      type: "breakpoint",
      data: [],
      isReadOnly: false,
      aidaClient: this.#aidaClient,
      changeManager: this.#changeManager,
      isExternal: false,
      performanceRecordAndReload: this.#handlePerformanceRecordAndReload.bind(this),
      onInspectElement: this.#handleInspectElement.bind(this),
      networkTimeCalculator: NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator(),
      lighthouseRecording: this.#handleLighthouseRun.bind(this)
    });
    this.#updateConversationState(conversation);
    this.#conversation?.setContext(context);
    this.requestUpdate();
    await UI11.ViewManager.ViewManager.instance().showView(_AiAssistancePanel.panelName);
    const prompt = errorMsg ? `debug the error "${errorMsg}" using breakpoint debugging agent` : "debug the error using breakpoint debugging agent";
    await this.#startConversation(prompt);
  }
  wasShown() {
    super.wasShown();
    this.#viewOutput.chatView?.restoreScrollPosition();
    this.#viewOutput.chatView?.focusTextInput();
    void this.#handleAidaAvailabilityChange();
    this.#selectedElement = createNodeContext(selectedElementFilter(UI11.Context.Context.instance().flavor(SDK6.DOMModel.DOMNode)));
    this.#selectedRequest = createRequestContext(UI11.Context.Context.instance().flavor(SDK6.NetworkRequest.NetworkRequest));
    this.#selectedPerformanceTrace = createPerformanceTraceContext(UI11.Context.Context.instance().flavor(AiAssistanceModel7.AIContext.AgentFocus));
    this.#selectedFile = createFileContext(UI11.Context.Context.instance().flavor(Workspace6.UISourceCode.UISourceCode));
    this.#selectedBreakpoint = createBreakpointContext(UI11.Context.Context.instance().flavor(Workspace6.UISourceCode.UILocation));
    this.#selectedAccessibility = createAccessibilityContext(UI11.Context.Context.instance().flavor(LighthousePanel.LighthousePanel.ActiveLighthouseReport));
    this.#updateConversationState(this.#conversation);
    this.#aiAssistanceEnabledSetting?.addChangeListener(this.requestUpdate, this);
    Host7.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged", this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction?.addEventListener("Toggled", this.requestUpdate, this);
    UI11.Context.Context.instance().addFlavorChangeListener(SDK6.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI11.Context.Context.instance().addFlavorChangeListener(SDK6.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI11.Context.Context.instance().addFlavorChangeListener(AiAssistanceModel7.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
    UI11.Context.Context.instance().addFlavorChangeListener(Workspace6.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
    UI11.Context.Context.instance().addFlavorChangeListener(Workspace6.UISourceCode.UILocation, this.#handleBreakpointFlavorChange);
    UI11.Context.Context.instance().addFlavorChangeListener(LighthousePanel.LighthousePanel.ActiveLighthouseReport, this.#handleLighthouseReportFlavorChange);
    UI11.ViewManager.ViewManager.instance().addEventListener("ViewVisibilityChanged", this.#selectDefaultAgentIfNeeded, this);
    SDK6.TargetManager.TargetManager.instance().addModelListener(SDK6.DOMModel.DOMModel, SDK6.DOMModel.Events.AttrModified, this.#handleDOMNodeAttrChange, this);
    SDK6.TargetManager.TargetManager.instance().addModelListener(SDK6.DOMModel.DOMModel, SDK6.DOMModel.Events.AttrRemoved, this.#handleDOMNodeAttrChange, this);
    UI11.Context.Context.instance().addFlavorChangeListener(TimelinePanel2.TimelinePanel.TimelinePanel, this.#bindTimelineTraceListener, this);
    this.#bindTimelineTraceListener();
    this.#selectDefaultAgentIfNeeded();
    Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistancePanelOpened);
  }
  willHide() {
    super.willHide();
    this.#aiAssistanceEnabledSetting?.removeChangeListener(this.requestUpdate, this);
    Host7.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged", this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction?.removeEventListener("Toggled", this.requestUpdate, this);
    UI11.Context.Context.instance().removeFlavorChangeListener(SDK6.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI11.Context.Context.instance().removeFlavorChangeListener(SDK6.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI11.Context.Context.instance().removeFlavorChangeListener(AiAssistanceModel7.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
    UI11.Context.Context.instance().removeFlavorChangeListener(Workspace6.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
    UI11.Context.Context.instance().removeFlavorChangeListener(LighthousePanel.LighthousePanel.ActiveLighthouseReport, this.#handleLighthouseReportFlavorChange);
    UI11.ViewManager.ViewManager.instance().removeEventListener("ViewVisibilityChanged", this.#selectDefaultAgentIfNeeded, this);
    UI11.Context.Context.instance().removeFlavorChangeListener(TimelinePanel2.TimelinePanel.TimelinePanel, this.#bindTimelineTraceListener, this);
    SDK6.TargetManager.TargetManager.instance().removeModelListener(SDK6.DOMModel.DOMModel, SDK6.DOMModel.Events.AttrModified, this.#handleDOMNodeAttrChange, this);
    SDK6.TargetManager.TargetManager.instance().removeModelListener(SDK6.DOMModel.DOMModel, SDK6.DOMModel.Events.AttrRemoved, this.#handleDOMNodeAttrChange, this);
    if (this.#timelinePanelInstance) {
      this.#timelinePanelInstance.removeEventListener("IsViewingTrace", this.requestUpdate, this);
      this.#timelinePanelInstance = null;
    }
  }
  #handleAidaAvailabilityChange = async () => {
    const currentAidaAvailability = await Host7.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      this.requestUpdate();
    }
  };
  #handleDOMNodeFlavorChange = (ev) => {
    if (this.#selectedElement?.getItem() === ev.data) {
      return;
    }
    this.#selectedElement = createNodeContext(selectedElementFilter(ev.data));
    this.#updateConversationState(this.#conversation);
  };
  #handleDOMNodeAttrChange = (ev) => {
    if (this.#selectedElement?.getItem() === ev.data.node) {
      if (ev.data.name === "class" || ev.data.name === "id") {
        this.requestUpdate();
      }
    }
  };
  #handleNetworkRequestFlavorChange = (ev) => {
    if (this.#selectedRequest?.getItem() === ev.data) {
      return;
    }
    if (Boolean(ev.data)) {
      const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
      this.#selectedRequest = new AiAssistanceModel7.NetworkAgent.RequestContext(ev.data, calculator);
    } else {
      this.#selectedRequest = null;
    }
    this.#updateConversationState(this.#conversation);
  };
  #handlePerformanceTraceFlavorChange = (ev) => {
    if (this.#selectedPerformanceTrace?.getItem() === ev.data) {
      return;
    }
    this.#selectedPerformanceTrace = Boolean(ev.data) ? new AiAssistanceModel7.PerformanceAgent.PerformanceTraceContext(ev.data) : null;
    this.#updateConversationState(this.#conversation);
  };
  #handleUISourceCodeFlavorChange = (ev) => {
    const newFile = ev.data;
    if (!newFile || this.#selectedFile?.getItem() === newFile) {
      return;
    }
    this.#selectedFile = new AiAssistanceModel7.FileAgent.FileContext(ev.data);
    this.#updateConversationState(this.#conversation);
  };
  #handleBreakpointFlavorChange = (ev) => {
    const newBreakpoint = ev.data;
    if (!newBreakpoint || this.#selectedBreakpoint?.getItem() === newBreakpoint) {
      return;
    }
    this.#selectedBreakpoint = new AiAssistanceModel7.BreakpointDebuggerAgent.BreakpointContext(newBreakpoint);
    this.#updateConversationState(this.#conversation);
  };
  #handleLighthouseReportFlavorChange = (ev) => {
    const newReport = ev.data;
    if (this.#selectedAccessibility?.getItem() === newReport?.report) {
      return;
    }
    this.#selectedAccessibility = createAccessibilityContext(newReport);
    this.#updateConversationState(this.#conversation);
  };
  #getChangeSummary() {
    if (!isAiAssistancePatchingEnabled() || !this.#conversation || this.#conversation?.isReadOnly) {
      return;
    }
    const hasAiV2 = Boolean(Root8.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled);
    return this.#changeManager.formatChangesForPatching(
      this.#conversation.id,
      /* includeMetadata= */
      !hasAiV2
    );
  }
  async performUpdate() {
    const viewInput = {
      ...this.#getToolbarInput(),
      ...await this.#getPanelViewInput()
    };
    this.view(viewInput, this.#viewOutput, this.contentElement);
  }
  #onCopyResponseClick(message) {
    const markdown = getResponseMarkdown(message);
    if (markdown) {
      Host7.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(markdown);
      Snackbars3.Snackbar.Snackbar.show({
        message: i18nString6(UIStrings6.responseCopiedToClipboard)
      });
    }
  }
  #handleSelectElementClick() {
    UI11.Context.Context.instance().setFlavor(Common6.ReturnToPanel.ReturnToPanelFlavor, new Common6.ReturnToPanel.ReturnToPanelFlavor(this.panelName));
    void this.#toggleSearchElementAction?.execute();
  }
  #isTextInputDisabled() {
    if (this.#conversation && this.#conversation.isBlockedByOrigin) {
      return true;
    }
    if (!this.#conversation) {
      return true;
    }
    if (!this.#conversation.selectedContext && !isAiAssistanceContextSelectionAgentEnabled()) {
      return true;
    }
    return false;
  }
  #shouldShowChatActions() {
    const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
    const isBlockedByAge = Root8.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    if (!aiAssistanceSetting || isBlockedByAge) {
      return false;
    }
    if (this.#aidaAvailability === "no-account-email" || this.#aidaAvailability === "sync-is-paused") {
      return false;
    }
    return true;
  }
  #getChatInputPlaceholder() {
    if (!this.#conversation) {
      return i18nString6(UIStrings6.followTheSteps);
    }
    if (this.#conversation && this.#conversation.isBlockedByOrigin) {
      return lockedString8(UIStringsNotTranslate7.crossOriginError);
    }
    switch (this.#conversation.type) {
      case "freestyler":
        return this.#conversation.selectedContext ? lockedString8(UIStringsNotTranslate7.inputPlaceholderForStyling) : lockedString8(UIStringsNotTranslate7.inputPlaceholderForStylingNoContext);
      case "drjones-file":
        return this.#conversation.selectedContext ? lockedString8(UIStringsNotTranslate7.inputPlaceholderForFile) : lockedString8(UIStringsNotTranslate7.inputPlaceholderForFileNoContext);
      case "drjones-network-request":
        return this.#conversation.selectedContext ? lockedString8(UIStringsNotTranslate7.inputPlaceholderForNetwork) : lockedString8(UIStringsNotTranslate7.inputPlaceholderForNetworkNoContext);
      case "drjones-performance-full": {
        const perfPanel = UI11.Context.Context.instance().flavor(TimelinePanel2.TimelinePanel.TimelinePanel);
        if (perfPanel?.hasActiveTrace()) {
          return this.#conversation.selectedContext ? lockedString8(UIStringsNotTranslate7.inputPlaceholderForPerformanceTrace) : lockedString8(UIStringsNotTranslate7.inputPlaceholderForPerformanceTraceNoContext);
        }
        return lockedString8(UIStringsNotTranslate7.inputPlaceholderForPerformanceWithNoRecording);
      }
      case "breakpoint":
        return lockedString8(UIStringsNotTranslate7.inputPlaceholderForNoContext);
      case "accessibility":
        return this.#conversation.selectedContext ? lockedString8(UIStringsNotTranslate7.inputPlaceholderForAccessibility) : lockedString8(UIStringsNotTranslate7.inputPlaceholderForAccessibilityNoContext);
      case "none":
        if (AiAssistanceModel7.AiUtils.isGeminiBranding()) {
          return lockedString8(UIStringsNotTranslate7.inputPlaceholderForNoContextBranded);
        }
        return lockedString8(UIStringsNotTranslate7.inputPlaceholderForNoContext);
    }
  }
  #getDisclaimerText() {
    if (!this.#conversation || this.#conversation.isReadOnly) {
      return i18nString6(UIStrings6.inputDisclaimerForEmptyState);
    }
    const loggingEnabled = Root8.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue !== Root8.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    if (Root8.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled) {
      if (loggingEnabled) {
        return lockedString8(UIStringsNotTranslate7.inputDisclaimerV2);
      }
      return lockedString8(UIStringsNotTranslate7.inputDisclaimerEnterpriseNoLoggingV2);
    }
    switch (this.#conversation.type) {
      case "freestyler":
        if (loggingEnabled) {
          return lockedString8(UIStringsNotTranslate7.inputDisclaimerForStyling);
        }
        return lockedString8(UIStringsNotTranslate7.inputDisclaimerForStylingEnterpriseNoLogging);
      case "drjones-file":
        if (loggingEnabled) {
          return lockedString8(UIStringsNotTranslate7.inputDisclaimerForFile);
        }
        return lockedString8(UIStringsNotTranslate7.inputDisclaimerForFileEnterpriseNoLogging);
      case "drjones-network-request":
        if (loggingEnabled) {
          return lockedString8(UIStringsNotTranslate7.inputDisclaimerForNetwork);
        }
        return lockedString8(UIStringsNotTranslate7.inputDisclaimerForNetworkEnterpriseNoLogging);
      // It is deliberate that both Performance agents use the same disclaimer
      // text and this has been approved by Privacy.
      case "drjones-performance-full":
        if (loggingEnabled) {
          return lockedString8(UIStringsNotTranslate7.inputDisclaimerForPerformance);
        }
        return lockedString8(UIStringsNotTranslate7.inputDisclaimerForPerformanceEnterpriseNoLogging);
      case "accessibility":
        if (loggingEnabled) {
          return lockedString8(UIStringsNotTranslate7.inputDisclaimerForAccessibility);
        }
        return lockedString8(UIStringsNotTranslate7.inputDisclaimerForAccessibilityEnterpriseNoLogging);
      case "breakpoint":
      case "none":
        if (loggingEnabled) {
          return lockedString8(UIStringsNotTranslate7.inputDisclaimerForNoContext);
        }
        return lockedString8(UIStringsNotTranslate7.inputDisclaimerForNoContextEnterpriseNoLogging);
    }
  }
  #handleFeedbackSubmit(rpcId, rating, feedback) {
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: rpcId,
      disable_user_content_logging: !this.#serverSideLoggingEnabled,
      do_conversation_client_event: {
        user_feedback: {
          sentiment: rating,
          user_input: {
            comment: feedback
          }
        }
      }
    });
  }
  #handleContextClick() {
    if (!this.#conversation) {
      return;
    }
    const context = this.#conversation.selectedContext;
    if (context instanceof AiAssistanceModel7.NetworkAgent.RequestContext) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
        context.getItem(),
        "headers-component"
        /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */
      );
      return Common6.Revealer.reveal(requestLocation);
    }
    if (context instanceof AiAssistanceModel7.FileAgent.FileContext) {
      return Common6.Revealer.reveal(context.getItem().uiLocation(0, 0));
    }
    if (context instanceof AiAssistanceModel7.PerformanceAgent.PerformanceTraceContext) {
      const focus = context.getItem();
      if (focus.callTree) {
        const event = focus.callTree.selectedNode?.event ?? focus.callTree.rootNode.event;
        const revealable = new SDK6.TraceObject.RevealableEvent(event);
        return Common6.Revealer.reveal(revealable);
      }
      if (focus.insight) {
        return Common6.Revealer.reveal(focus.insight);
      }
    }
  }
  #handleContextRemoved() {
    this.#conversation?.setContext(null);
    this.requestUpdate();
  }
  #handleContextAdd() {
    this.#conversation?.setContext(this.#getConversationContext(this.#getDefaultConversationType()));
    this.requestUpdate();
  }
  #canExecuteQuery() {
    const isBrandedBuild = Boolean(Root8.Runtime.hostConfig.aidaAvailability?.enabled);
    const isBlockedByAge = Boolean(Root8.Runtime.hostConfig.aidaAvailability?.blockedByAge);
    const isAidaAvailable = Boolean(
      this.#aidaAvailability === "available"
      /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */
    );
    const isUserOptedIn = Boolean(this.#aiAssistanceEnabledSetting?.getIfNotDisabled());
    return isBrandedBuild && isAidaAvailable && isUserOptedIn && !isBlockedByAge;
  }
  async handleAction(actionId, opts) {
    if (this.#isLoading && !opts?.["prompt"]) {
      this.#viewOutput.chatView?.focusTextInput();
      return;
    }
    let targetConversationType;
    switch (actionId) {
      case "freestyler.elements-floating-button": {
        Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceOpenedFromElementsPanelFloatingButton);
        targetConversationType = "freestyler";
        break;
      }
      case "freestyler.element-panel-context": {
        Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceOpenedFromElementsPanel);
        targetConversationType = "freestyler";
        break;
      }
      case "drjones.network-floating-button": {
        Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanelFloatingButton);
        targetConversationType = "drjones-network-request";
        break;
      }
      case "drjones.network-panel-context": {
        Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanel);
        targetConversationType = "drjones-network-request";
        break;
      }
      case "drjones.performance-panel-context": {
        Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceOpenedFromPerformancePanelCallTree);
        targetConversationType = "drjones-performance-full";
        break;
      }
      case "drjones.sources-floating-button": {
        Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanelFloatingButton);
        targetConversationType = "drjones-file";
        break;
      }
      case "drjones.sources-panel-context": {
        Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanel);
        targetConversationType = "drjones-file";
        break;
      }
    }
    if (!targetConversationType) {
      return;
    }
    let conversation = this.#conversation;
    if (!this.#conversation || this.#conversation.type !== targetConversationType || this.#conversation.isEmpty) {
      conversation = new AiAssistanceModel7.AiConversation.AiConversation({
        type: targetConversationType,
        data: [],
        isReadOnly: false,
        aidaClient: this.#aidaClient,
        changeManager: this.#changeManager,
        isExternal: false,
        performanceRecordAndReload: this.#handlePerformanceRecordAndReload.bind(this),
        onInspectElement: this.#handleInspectElement.bind(this),
        networkTimeCalculator: NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator(),
        lighthouseRecording: this.#handleLighthouseRun.bind(this)
      });
    }
    this.#updateConversationState(conversation);
    const predefinedPrompt = opts?.["prompt"];
    if (predefinedPrompt && typeof predefinedPrompt === "string") {
      if (!this.#canExecuteQuery()) {
        return;
      }
      Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.AiAssistanceQuerySubmitted);
      if (this.#conversation && this.#conversation.isBlockedByOrigin) {
        this.#handleNewChatRequest();
      }
      await this.#startConversation(predefinedPrompt);
    } else {
      this.#viewOutput.chatView?.focusTextInput();
    }
  }
  #populateHistoryMenu(contextMenu) {
    const historicalConversations = AiAssistanceModel7.AiHistoryStorage.AiHistoryStorage.instance().getHistory().map((serializedConversation) => AiAssistanceModel7.AiConversation.AiConversation.fromSerializedConversation(serializedConversation));
    for (const conversation of historicalConversations.reverse()) {
      if (conversation.isEmpty || !conversation.title) {
        continue;
      }
      contextMenu.defaultSection().appendCheckboxItem(conversation.title, () => {
        void this.#openHistoricConversation(conversation);
      }, { checked: this.#conversation?.id === conversation.id, jslogContext: "freestyler.history-item" });
    }
    const historyEmpty = contextMenu.defaultSection().items.length === 0;
    if (historyEmpty) {
      contextMenu.defaultSection().appendItem(i18nString6(UIStrings6.noPastConversations), () => {
      }, {
        disabled: true
      });
    }
    contextMenu.footerSection().appendItem(i18nString6(UIStrings6.clearChatHistory), () => {
      void AiAssistanceModel7.AiHistoryStorage.AiHistoryStorage.instance().deleteAll();
    }, {
      disabled: historyEmpty
    });
  }
  #onHistoryDeleted() {
    this.#updateConversationState();
  }
  #resetWalkthrough() {
    this.#walkthrough.isExpanded = false;
    this.#walkthrough.activeSidebarMessage = null;
    this.#walkthrough.inlineExpandedMessages = [];
  }
  #onDeleteClicked() {
    if (!this.#conversation) {
      return;
    }
    this.#resetWalkthrough();
    void AiAssistanceModel7.AiHistoryStorage.AiHistoryStorage.instance().deleteHistoryEntry(this.#conversation.id);
    this.#updateConversationState();
    UI11.ARIAUtils.LiveAnnouncer.alert(i18nString6(UIStrings6.chatDeleted));
  }
  async #onExportConversationClick() {
    if (!this.#conversation) {
      return;
    }
    return await saveToDisk(this.#conversation);
  }
  async #openHistoricConversation(conversation) {
    if (this.#conversation?.id === conversation.id) {
      return;
    }
    this.#updateConversationState(conversation);
    await this.#doConversation(conversation.history);
  }
  #handleNewChatRequest() {
    this.#updateConversationState();
    this.#resetWalkthrough();
    UI11.ARIAUtils.LiveAnnouncer.alert(i18nString6(UIStrings6.newChatCreated));
    if (Annotations.AnnotationRepository.annotationsEnabled()) {
      Annotations.AnnotationRepository.instance().deleteAllAnnotations();
    }
  }
  #cancel() {
    this.#runAbortController.abort();
    this.#runAbortController = new AbortController();
  }
  #getConversationContext(type) {
    switch (type) {
      case "freestyler":
        return this.#selectedElement;
      case "drjones-file":
        return this.#selectedFile;
      case "drjones-network-request":
        return this.#selectedRequest;
      case "drjones-performance-full":
        return this.#selectedPerformanceTrace;
      case "breakpoint":
        return this.#selectedBreakpoint;
      case "accessibility":
        return this.#selectedAccessibility;
      case "none":
      case void 0:
        return null;
    }
  }
  #handleConversationContextChange = (data) => {
    if (data instanceof AiAssistanceModel7.FileAgent.FileContext) {
      this.#selectedFile = data;
    } else if (data instanceof AiAssistanceModel7.StylingAgent.NodeContext) {
      this.#selectedElement = data;
    } else if (data instanceof AiAssistanceModel7.NetworkAgent.RequestContext) {
      this.#selectedRequest = data;
    } else if (data instanceof AiAssistanceModel7.PerformanceAgent.PerformanceTraceContext) {
      this.#selectedPerformanceTrace = data;
    } else if (data instanceof AiAssistanceModel7.BreakpointDebuggerAgent.BreakpointContext) {
      this.#selectedBreakpoint = data;
    } else if (data instanceof AiAssistanceModel7.AccessibilityAgent.AccessibilityContext) {
      this.#selectedAccessibility = data;
    }
    void VisualLogging9.logFunctionCall(`context-change-${this.#conversation?.type}`);
    this.requestUpdate();
  };
  async #handleInspectElement() {
    if (!this.#toggleSearchElementAction) {
      return null;
    }
    const result = new Promise((resolve) => {
      const handleDOMNodeFlavorChange = (ev) => {
        if (!ev.data) {
          return;
        }
        resolve(selectedElementFilter(ev.data));
        removeListeners();
      };
      const handleInspectModeToggled = (ev) => {
        if (!ev.data) {
          window.setTimeout(() => {
            resolve(selectedElementFilter(UI11.Context.Context.instance().flavor(SDK6.DOMModel.DOMNode)));
            removeListeners();
          }, 50);
        }
      };
      const removeListeners = () => {
        UI11.Context.Context.instance().removeFlavorChangeListener(SDK6.DOMModel.DOMNode, handleDOMNodeFlavorChange);
        this.#toggleSearchElementAction?.removeEventListener("Toggled", handleInspectModeToggled);
      };
      UI11.Context.Context.instance().addFlavorChangeListener(SDK6.DOMModel.DOMNode, handleDOMNodeFlavorChange);
      this.#toggleSearchElementAction?.addEventListener("Toggled", handleInspectModeToggled);
      this.#runAbortController.signal.addEventListener("abort", () => {
        resolve(null);
        removeListeners();
      }, { once: true });
    });
    void this.#toggleSearchElementAction.execute();
    try {
      return await result;
    } finally {
      if (this.#toggleSearchElementAction.toggled()) {
        void this.#toggleSearchElementAction.execute();
      }
    }
  }
  async #startConversation(text, imageInput, multimodalInputType) {
    if (!this.#conversation) {
      return;
    }
    this.#cancel();
    const signal = this.#runAbortController.signal;
    if (this.#conversation.isEmpty) {
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.STARTED_AI_CONVERSATION);
    }
    const greenDevEmulationEnabled = Greendev.Prototypes.instance().isEnabled("emulationCapabilities");
    let multimodalInput;
    const pendingInput = this.#conversation.getPendingMultimodalInput();
    if (greenDevEmulationEnabled && pendingInput) {
      multimodalInput = pendingInput;
    } else if (isAiAssistanceMultimodalInputEnabled() && imageInput && multimodalInputType) {
      multimodalInput = {
        input: imageInput,
        id: crypto.randomUUID(),
        type: multimodalInputType
      };
    }
    void VisualLogging9.logFunctionCall(`start-conversation-${this.#conversation.type}`, "ui");
    await this.#doConversation(this.#conversation.run(text, {
      signal,
      multimodalInput
    }));
  }
  async #doConversation(items) {
    const release = await this.#mutex.acquire();
    try {
      let commitStep = function() {
        const lastPart = systemMessage.parts.at(-1);
        if (lastPart?.type === "step" && lastPart.step === step) {
          return;
        }
        systemMessage.parts.push({
          type: "step",
          step
        });
      };
      let systemMessage = {
        entity: "model",
        parts: []
      };
      let step = { isLoading: true };
      this.#isLoading = true;
      let announcedAnswerLoading = false;
      let announcedAnswerReady = false;
      for await (const data of items) {
        step.requestApproval = void 0;
        switch (data.type) {
          case "user-query": {
            this.#messages.push({
              entity: "user",
              text: data.query,
              imageInput: data.imageInput
            });
            systemMessage = {
              entity: "model",
              parts: []
            };
            this.#messages.push(systemMessage);
            const isSidebarWalkthroughOpen = this.#walkthrough.isExpanded && !this.#walkthrough.isInlined;
            if (isSidebarWalkthroughOpen || Greendev.Prototypes.instance().isEnabled("breakpointDebuggerAgent") && this.#conversation?.type === "breakpoint") {
              this.#openWalkthrough(systemMessage);
            }
            break;
          }
          case "querying": {
            step = { isLoading: true };
            if (!systemMessage.parts.length) {
              commitStep();
            }
            break;
          }
          case "context": {
            step.title = lockedString8(UIStringsNotTranslate7.analyzingData);
            step.contextDetails = data.details;
            step.widgets = data.widgets;
            step.isLoading = false;
            commitStep();
            break;
          }
          case "title": {
            step.title = data.title;
            commitStep();
            break;
          }
          case "thought": {
            step.isLoading = false;
            step.thought = data.thought;
            commitStep();
            break;
          }
          case "suggestions": {
            const lastPart = systemMessage.parts.at(-1);
            if (lastPart?.type === "answer") {
              lastPart.suggestions = data.suggestions;
            } else {
              systemMessage.parts.push({
                type: "answer",
                text: "",
                suggestions: data.suggestions
              });
            }
            break;
          }
          case "side-effect": {
            step.isLoading = false;
            step.code ??= data.code;
            step.requestApproval = {
              description: data.description,
              onAnswer: (result) => {
                data.confirm(result);
                step.requestApproval = void 0;
                this.requestUpdate();
              }
            };
            commitStep();
            break;
          }
          case "action": {
            step.isLoading = false;
            step.code ??= data.code;
            step.output ??= data.output;
            step.canceled = data.canceled;
            step.widgets ??= data.widgets;
            commitStep();
            break;
          }
          case "answer": {
            systemMessage.rpcId = data.rpcId;
            const lastPart = systemMessage.parts.at(-1);
            if (lastPart?.type === "answer") {
              lastPart.text = data.text;
              if (data.suggestions) {
                lastPart.suggestions = data.suggestions;
              }
            } else {
              const newPart = {
                type: "answer",
                text: data.text
              };
              if (data.suggestions) {
                newPart.suggestions = data.suggestions;
              }
              systemMessage.parts.push(newPart);
            }
            if (data.widgets && Root8.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled) {
              systemMessage.parts.push({
                type: "widget",
                widgets: data.widgets
              });
            }
            if (systemMessage.parts.length > 1) {
              const firstPart = systemMessage.parts[0];
              if (firstPart.type === "step" && firstPart.step.isLoading && !firstPart.step.thought && !firstPart.step.code && !firstPart.step.contextDetails) {
                systemMessage.parts.shift();
              }
            }
            step.isLoading = false;
            break;
          }
          case "error": {
            systemMessage.error = data.error;
            const lastPart = systemMessage.parts.at(-1);
            if (lastPart?.type === "step") {
              const lastStep = lastPart.step;
              if (data.error === "abort") {
                lastStep.canceled = true;
              } else if (lastStep.isLoading) {
                systemMessage.parts.pop();
              }
            }
            if (data.error === "block") {
              const lastPart2 = systemMessage.parts.at(-1);
              if (lastPart2?.type === "answer") {
                systemMessage.parts.pop();
              }
            }
            break;
          }
          case "context-change": {
            this.#handleConversationContextChange(data.context);
            step.isLoading = false;
            step.widgets = data.widgets;
            commitStep();
            step = { isLoading: true };
            break;
          }
        }
        if (!this.#conversation?.isReadOnly) {
          this.requestUpdate();
          if (data.type === "context" || data.type === "side-effect") {
            this.#viewOutput.chatView?.scrollToBottom();
          }
          switch (data.type) {
            case "context":
              UI11.ARIAUtils.LiveAnnouncer.status(lockedString8(UIStringsNotTranslate7.analyzingData));
              break;
            case "answer": {
              if (!data.complete && !announcedAnswerLoading) {
                announcedAnswerLoading = true;
                UI11.ARIAUtils.LiveAnnouncer.status(lockedString8(UIStringsNotTranslate7.answerLoading));
              } else if (data.complete && !announcedAnswerReady) {
                announcedAnswerReady = true;
                UI11.ARIAUtils.LiveAnnouncer.status(lockedString8(UIStringsNotTranslate7.answerReady));
              }
            }
          }
        }
      }
      this.#isLoading = false;
      this.requestUpdate();
    } finally {
      release();
    }
  }
};
function getResponseMarkdown(message) {
  const contentParts = ["## AI"];
  for (const part of message.parts) {
    if (part.type === "answer") {
      contentParts.push(`### Answer

${part.text}`);
    } else if (part.type === "step") {
      const step = part.step;
      if (step.title) {
        contentParts.push(`### ${step.title}`);
      }
      if (step.contextDetails) {
        contentParts.push(AiAssistanceModel7.AiConversation.generateContextDetailsMarkdown(step.contextDetails));
      }
      if (step.thought) {
        contentParts.push(step.thought);
      }
      if (step.code) {
        contentParts.push(`**Code executed:**
\`\`\`
${step.code.trim()}
\`\`\``);
      }
      if (step.output) {
        contentParts.push(`**Data returned:**
\`\`\`
${step.output}
\`\`\``);
      }
    }
  }
  return contentParts.join("\n\n");
}
var ActionDelegate = class {
  handleAction(_context, actionId, opts) {
    switch (actionId) {
      case "freestyler.elements-floating-button":
      case "freestyler.element-panel-context":
      case "freestyler.main-menu":
      case "drjones.network-floating-button":
      case "drjones.network-panel-context":
      case "drjones.performance-panel-context":
      case "drjones.sources-floating-button":
      case "drjones.sources-panel-context": {
        void (async () => {
          const view = UI11.ViewManager.ViewManager.instance().view(AiAssistancePanel.panelName);
          if (!view) {
            return;
          }
          await UI11.ViewManager.ViewManager.instance().showView(AiAssistancePanel.panelName);
          const minDrawerSize = UI11.InspectorView.InspectorView.instance().totalSize() / 4;
          if (UI11.InspectorView.InspectorView.instance().drawerSize() < minDrawerSize) {
            UI11.InspectorView.InspectorView.instance().setDrawerSize(minDrawerSize);
          }
          const widget6 = await view.widget();
          void widget6.handleAction(actionId, opts);
        })();
        return true;
      }
    }
    return false;
  }
};
function isAiAssistanceMultimodalUploadInputEnabled() {
  return isAiAssistanceMultimodalInputEnabled() && Boolean(Root8.Runtime.hostConfig.devToolsFreestyler?.multimodalUploadInput);
}
function isAiAssistanceMultimodalInputEnabled() {
  return Boolean(Root8.Runtime.hostConfig.devToolsFreestyler?.multimodal);
}
function isAiAssistanceContextSelectionAgentEnabled() {
  return Boolean(Root8.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled);
}
function isAiAssistanceServerSideLoggingEnabled() {
  return !Root8.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
export {
  AccessibilityAgentMarkdownRenderer,
  ActionDelegate,
  AiAssistancePanel,
  ChatInput_exports as ChatInput,
  ChatMessage_exports as ChatMessage,
  ChatView,
  DisabledWidget_exports as DisabledWidget,
  ExploreWidget_exports as ExploreWidget,
  ExportConversation_exports as ExportConversation,
  ExportForAgentsDialog_exports as ExportForAgentsDialog,
  MarkdownRendererWithCodeBlock,
  OptInChangeDialog_exports as OptInChangeDialog,
  PatchWidget_exports as PatchWidget,
  SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW,
  SelectWorkspaceDialog,
  WalkthroughUtils_exports as WalkthroughUtils,
  WalkthroughView_exports as WalkthroughView,
  getCSSChangeSummaryMessage,
  getResponseMarkdown
};
//# sourceMappingURL=ai_assistance.js.map
