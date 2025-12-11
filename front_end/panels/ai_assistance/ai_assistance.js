var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/ai_assistance/AiAssistancePanel.js
import "./../../ui/kit/kit.js";
import * as Common5 from "./../../core/common/common.js";
import * as Host6 from "./../../core/host/host.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as Root5 from "./../../core/root/root.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as AiAssistanceModel4 from "./../../models/ai_assistance/ai_assistance.js";
import * as Annotations from "./../../models/annotations/annotations.js";
import * as Badges from "./../../models/badges/badges.js";
import * as GreenDev3 from "./../../models/greendev/greendev.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Workspace6 from "./../../models/workspace/workspace.js";
import * as Buttons6 from "./../../ui/components/buttons/buttons.js";
import * as Snackbars from "./../../ui/components/snackbars/snackbars.js";
import * as UIHelpers2 from "./../../ui/helpers/helpers.js";
import * as UI9 from "./../../ui/legacy/legacy.js";
import * as Lit7 from "./../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../ui/visual_logging/visual_logging.js";
import * as NetworkForward from "./../network/forward/forward.js";
import * as NetworkPanel from "./../network/network.js";
import * as TimelinePanel from "./../timeline/timeline.js";

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

.artifacts-toolbar-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 27px;
  padding: 5px;
  border-bottom: 1px solid var(--sys-color-divider);
}

.assistance-view-wrapper-with-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
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
}

.toolbar-feedback-link {
  color: var(--sys-color-primary);
  margin: 0 var(--sys-size-3);
  height: auto;
  font-size: var(--sys-typescale-body4-size);
}

/*# sourceURL=${import.meta.resolve("././aiAssistancePanel.css")} */`;

// gen/front_end/panels/ai_assistance/components/CollapsibleAssistanceContentWidget.js
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as Lit from "./../../ui/lit/lit.js";

// gen/front_end/panels/ai_assistance/components/collapsibleAssistanceContentWidget.css.js
var collapsibleAssistanceContentWidget_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
  flex-shrink: 0;
  width: 100%;
  border: 2px solid var(--sys-color-neutral-container);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  background-color: var(--sys-color-cdt-base-container);
}

.header {
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  background-color: var(--sys-color-surface3);
  justify-content: space-between;
  transition: background-color 0.2s ease-in-out;
}

.content {
  background-color: var(--sys-color-surface);
  padding: 12px 16px;
}

/*# sourceURL=${import.meta.resolve("././components/collapsibleAssistanceContentWidget.css")} */`;

// gen/front_end/panels/ai_assistance/components/CollapsibleAssistanceContentWidget.js
var { render, html } = Lit;
var CollapsibleAssistanceContentWidget = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #isCollapsed = false;
  #headerText = "Details";
  set data(data) {
    this.#headerText = data.headerText;
    this.#render();
  }
  connectedCallback() {
    this.#render();
  }
  #toggleCollapse() {
    this.#isCollapsed = !this.#isCollapsed;
    this.#render();
  }
  #render() {
    const output = html`
      <style>${collapsibleAssistanceContentWidget_css_default}</style>
      <details ?open=${!this.#isCollapsed}>
        <summary class="header" @click=${(event) => {
      event.preventDefault();
      this.#toggleCollapse();
    }}>
          ${this.#headerText}
          <devtools-button .data=${{
      variant: "icon",
      iconName: this.#isCollapsed ? "triangle-right" : "triangle-down",
      color: "var(--sys-color-on-surface)",
      width: "14px",
      height: "14px"
    }}
          ></devtools-button>
        </summary>
        <div class="content">
          <slot></slot>
        </div>
      </details>
    `;
    render(output, this.#shadow, { host: this });
  }
};
customElements.define("devtools-collapsible-assistance-content-widget", CollapsibleAssistanceContentWidget);

// gen/front_end/panels/ai_assistance/components/PerformanceAgentFlameChart.js
import * as Trace from "./../../models/trace/trace.js";
import * as PerfUI from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Lit2 from "./../../ui/lit/lit.js";
import * as Timeline from "./../timeline/timeline.js";
var { html: html2 } = Lit2;
var PerformanceAgentFlameChart = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #flameChartContainer = document.createElement("div");
  #flameChart;
  #dataProvider;
  #parsedTrace = null;
  constructor() {
    super();
    this.#flameChartContainer.classList.add("container");
    this.#dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    this.#flameChart = new PerfUI.FlameChart.FlameChart(this.#dataProvider, this);
    this.#flameChart.markAsRoot();
    this.#flameChart.show(this.#flameChartContainer);
    const observer = new ResizeObserver(this.#onResize.bind(this));
    observer.observe(this.#flameChartContainer);
  }
  set data(data) {
    if (!data.parsedTrace) {
      return;
    }
    this.#parsedTrace = data.parsedTrace;
    const entityMapper = new Trace.EntityMapper.EntityMapper(data.parsedTrace);
    this.#dataProvider.setModel(data.parsedTrace, entityMapper);
    this.#dataProvider.buildWithCustomTracksForTest({
      filterTracks: (trackName) => trackName.startsWith("Main"),
      expandTracks: () => true
    });
    let start = Trace.Types.Timing.Micro(data.start);
    let end = Trace.Types.Timing.Micro(data.end);
    const minTraceTime = data.parsedTrace.data.Meta.traceBounds.min;
    const maxTraceTime = data.parsedTrace.data.Meta.traceBounds.max;
    if (start < 0 || end < 0 || start >= end || start === end || start < minTraceTime || end > maxTraceTime) {
      start = minTraceTime;
      end = maxTraceTime;
      console.log("[GreenDev] Flamechart widget bounds reset to the whole trace duration.");
    }
    const bounds = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds({
      min: start,
      max: end,
      range: Trace.Types.Timing.Micro(end - start)
    });
    this.#flameChart.setWindowTimes(bounds.min, bounds.max);
    this.#flameChart.setSize(600, 300);
    this.#render();
  }
  #onResize(entries) {
    const container = entries[0];
    this.#flameChart.setSize(container.contentRect.width, 600);
  }
  #render() {
    if (!this.#parsedTrace) {
      return;
    }
    const output = html2`
        <style>
          :host {
            display: flex;
          }

          .container {
            display: flex;
            width: 100%;
            height: 300px;
          }

          .flex-auto {
            flex: auto;
          }

          .vbox {
            display: flex;
            flex-direction: column;
            position: relative;
          }
        </style>
        ${this.#flameChartContainer}
      `;
    Lit2.render(output, this.#shadow, { host: this });
    this.#flameChart.update();
    this.#flameChart.setSize(600, 300);
  }
  windowChanged(startTime, endTime, animate) {
    this.#flameChart.setWindowTimes(startTime, endTime, animate);
  }
  updateRangeSelection(startTime, endTime) {
    this.#flameChart.updateRangeSelection(startTime, endTime);
  }
  updateSelectedEntry(_entryIndex) {
  }
  updateSelectedGroup(_flameChart, _group) {
  }
};
customElements.define("devtools-performance-agent-flame-chart", PerformanceAgentFlameChart);

// gen/front_end/panels/ai_assistance/components/ArtifactsViewer.js
import * as AiAssistanceModel from "./../../models/ai_assistance/ai_assistance.js";
import * as Logs from "./../../models/logs/logs.js";
import * as NetworkTimeCalculator from "./../../models/network_time_calculator/network_time_calculator.js";
import * as Trace2 from "./../../models/trace/trace.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as Lit3 from "./../../ui/lit/lit.js";
import * as Network from "./../network/network.js";
import * as Insights from "./../timeline/components/insights/insights.js";

// gen/front_end/panels/ai_assistance/components/artifactsViewer.css.js
var artifactsViewer_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.artifacts-viewer {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 20px;
  gap: 10px;
}

/*# sourceURL=${import.meta.resolve("././components/artifactsViewer.css")} */`;

// gen/front_end/panels/ai_assistance/components/ArtifactsViewer.js
var { html: html3, render: render3 } = Lit3;
function renderArtifact(artifact, parsedTrace) {
  switch (artifact.type) {
    // clang-format off
    case "insight": {
      const insightRenderer = new Insights.InsightRenderer.InsightRenderer();
      const componentName = artifact.insightType;
      const insightSet = parsedTrace.insights?.values().next().value;
      const insightModel = insightSet?.model[componentName];
      if (!insightModel) {
        return Lit3.nothing;
      }
      return html3`
        <devtools-collapsible-assistance-content-widget .data=${{ headerText: `Insight - ${componentName}` }}>
          ${insightRenderer.renderInsightToWidgetElement(parsedTrace, insightSet, insightModel, componentName, {
        selected: true,
        isAIAssistanceContext: true
      })}
        </devtools-collapsible-assistance-content-widget>`;
    }
    case "network-request": {
      const networkRequest = artifact.request;
      if ("args" in networkRequest && Trace2.Types.Events.isSyntheticNetworkRequest(networkRequest)) {
        const calculator = new NetworkTimeCalculator.NetworkTimeCalculator(true);
        const sdkRequest = Logs.NetworkLog.NetworkLog.instance().requestsForId(networkRequest.args.data.requestId).find((r) => r.url() === networkRequest.args.data.url) ?? null;
        if (!sdkRequest) {
          return Lit3.nothing;
        }
        return html3`
        <devtools-collapsible-assistance-content-widget
          .data=${{ headerText: `Network Request: ${sdkRequest.url().length > 80 ? sdkRequest.url().slice(0, 80) + "..." : sdkRequest.url()}` }}>
          <devtools-widget class="actions" .widgetConfig=${UI.Widget.widgetConfig(Network.RequestTimingView.RequestTimingView, {
          request: sdkRequest,
          calculator
        })}></devtools-widget>
        </devtools-collapsible-assistance-content-widget>`;
      }
      return Lit3.nothing;
    }
    case "flamechart": {
      return html3`
        <devtools-collapsible-assistance-content-widget .data=${{ headerText: `Flamechart` }}>
          <devtools-performance-agent-flame-chart .data=${{
        parsedTrace,
        start: artifact.start,
        end: artifact.end
      }}>
          </devtools-performance-agent-flame-chart>
        </devtools-collapsible-assistance-content-widget>`;
    }
    default:
      return Lit3.nothing;
  }
}
var DEFAULT_VIEW = (input, _output, target) => {
  render3(html3`
      <style>${artifactsViewer_css_default}</style>
      <div class="artifacts-viewer">
        ${input.artifacts.map((artifact) => renderArtifact(artifact, input.parsedTrace))}
      </div>
    `, target);
};
var ArtifactsViewer = class extends UI.Widget.Widget {
  #view;
  #parsedTrace;
  constructor(element, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.#parsedTrace = null;
  }
  wasShown() {
    super.wasShown();
    AiAssistanceModel.ArtifactsManager.ArtifactsManager.instance().addEventListener(AiAssistanceModel.ArtifactsManager.ArtifactAddedEvent.eventName, () => {
      if (this.#parsedTrace) {
        this.performUpdate();
      }
    });
    UI.Context.Context.instance().addFlavorChangeListener(AiAssistanceModel.AIContext.AgentFocus, ({ data }) => {
      this.#parsedTrace = data.parsedTrace;
      if (this.#parsedTrace) {
        this.performUpdate();
      }
    });
    const focus = UI.Context.Context.instance().flavor(AiAssistanceModel.AIContext.AgentFocus);
    if (focus) {
      this.#parsedTrace = focus.parsedTrace;
      this.performUpdate();
    }
  }
  performUpdate() {
    if (!this.#parsedTrace) {
      return;
    }
    this.#view({
      artifacts: AiAssistanceModel.ArtifactsManager.ArtifactsManager.instance().artifacts,
      parsedTrace: this.#parsedTrace
    }, {}, this.contentElement);
  }
};

// gen/front_end/panels/ai_assistance/components/ChatView.js
import "./../../ui/components/spinners/spinners.js";
import * as Host4 from "./../../core/host/host.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as AiAssistanceModel3 from "./../../models/ai_assistance/ai_assistance.js";
import * as GreenDev from "./../../models/greendev/greendev.js";
import * as Trace3 from "./../../models/trace/trace.js";
import * as Workspace5 from "./../../models/workspace/workspace.js";
import * as PanelsCommon from "./../common/common.js";
import * as PanelUtils from "./../utils/utils.js";
import * as Marked from "./../../third_party/marked/marked.js";
import * as Buttons5 from "./../../ui/components/buttons/buttons.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import * as Lit5 from "./../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";

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
import * as Common2 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as Root2 from "./../../core/root/root.js";
import * as AiAssistanceModel2 from "./../../models/ai_assistance/ai_assistance.js";
import * as Persistence2 from "./../../models/persistence/persistence.js";
import * as Workspace3 from "./../../models/workspace/workspace.js";
import * as WorkspaceDiff from "./../../models/workspace_diff/workspace_diff.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import { Directives, html as html5, nothing as nothing3, render as render5 } from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
import * as ChangesPanel from "./../changes/changes.js";
import * as PanelCommon from "./../common/common.js";

// gen/front_end/panels/ai_assistance/SelectWorkspaceDialog.js
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as Persistence from "./../../models/persistence/persistence.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { html as html4, nothing as nothing2, render as render4 } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

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
  render4(html4`
      <style>${selectWorkspaceDialog_css_default}</style>
      <h2 class="dialog-header">${lockedString(UIStringsNotTranslate.selectFolder)}</h2>
      <div class="main-content">
        <div class="select-project-root">${input.selectProjectRootText}</div>
        ${input.showAutomaticWorkspaceNudge ? html4`
          <!-- Hardcoding, because there is no 'getFormatLocalizedString' equivalent for 'lockedString' -->
          <div>
            Tip: provide a
            <x-link
              class="devtools-link"
              href="https://goo.gle/devtools-automatic-workspace-folders"
              jslog=${VisualLogging.link().track({ click: true, keydown: "Enter|Space" }).context("automatic-workspaces-documentation")}
            >com.chrome.devtools.json</x-link>
            file to automatically connect your project to DevTools.
          </div>
        ` : nothing2}
      </div>
      ${hasFolders ? html4`
        <ul role="listbox" aria-label=${lockedString(UIStringsNotTranslate.selectFolder)}
          aria-activedescendant=${input.folders.length > 0 ? `option-${input.selectedIndex}` : ""}>
          ${input.folders.map((folder, index) => {
    const optionId = `option-${index}`;
    return html4`
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
      ` : nothing2}
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
        ${hasFolders ? html4`
          <devtools-button
            title=${lockedString(UIStringsNotTranslate.select)}
            aria-label="Select"
            @click=${input.onSelectButtonClick}
            .jslogContext=${"select"}
            .variant=${"primary"}>${lockedString(UIStringsNotTranslate.select)}</devtools-button>
        ` : nothing2}
      </div>
    `, target);
};
var SelectWorkspaceDialog = class _SelectWorkspaceDialog extends UI2.Widget.VBox {
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
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    const viewInput = {
      folders: this.#folders,
      selectedIndex: this.#selectedIndex,
      selectProjectRootText: noLogging ? lockedString(UIStringsNotTranslate.selectProjectRootNoLogging) : lockedString(UIStringsNotTranslate.selectProjectRoot),
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
        name: Common.ParsedURL.ParsedURL.extractName(automaticFileSystem.root),
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
        name: Common.ParsedURL.ParsedURL.encodedPathToRawPathString(project.displayName()),
        path: Common.ParsedURL.ParsedURL.urlToRawPathString(project.id(), Host.Platform.isWin()),
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
    const dialog = new UI2.Dialog.Dialog("select-workspace");
    dialog.setAriaLabel(UIStringsNotTranslate.selectFolderAccessibleLabel);
    dialog.setMaxContentSize(new Geometry.Size(384, 340));
    dialog.setSizeBehavior(
      "SetExactWidthMaxHeight"
      /* UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */
    );
    dialog.setDimmed(true);
    new _SelectWorkspaceDialog({ dialog, onProjectSelected, currentProject }).show(dialog.contentElement);
    dialog.show();
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
var DEFAULT_VIEW2 = (input, output, target) => {
  if (!input.changeSummary && input.patchSuggestionState === PatchSuggestionState.INITIAL) {
    return;
  }
  output.changeRef = output.changeRef ?? Directives.createRef();
  output.summaryRef = output.summaryRef ?? Directives.createRef();
  function renderSourcesLink() {
    if (!input.sources) {
      return nothing3;
    }
    return html5`<x-link
          class="link"
          title="${UIStringsNotTranslate2.viewUploadedFiles} ${UIStringsNotTranslate2.opensInNewTab}"
          href="data:text/plain;charset=utf-8,${encodeURIComponent(input.sources)}"
          jslog=${VisualLogging2.link("files-used-in-patching").track({ click: true })}>
          ${UIStringsNotTranslate2.viewUploadedFiles}
        </x-link>`;
  }
  function renderHeader() {
    if (input.savedToDisk) {
      return html5`
            <devtools-icon class="green-bright-icon summary-badge" name="check-circle"></devtools-icon>
            <span class="header-text">
              ${lockedString2(UIStringsNotTranslate2.savedToDisk)}
            </span>
          `;
    }
    if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
      return html5`
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
    return html5`
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
      return nothing3;
    }
    if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
      return html5`<devtools-widget .widgetConfig=${UI3.Widget.widgetConfig(ChangesPanel.CombinedDiffView.CombinedDiffView, {
        workspaceDiff: input.workspaceDiff,
        // Ignore user creates inspector-stylesheets
        ignoredUrls: ["inspector://"]
      })}></devtools-widget>`;
    }
    return html5`<devtools-code-block
          .code=${input.changeSummary ?? ""}
          .codeLang=${"css"}
          .displayNotice=${true}
        ></devtools-code-block>
        ${input.patchSuggestionState === PatchSuggestionState.ERROR ? html5`<div class="error-container">
              <devtools-icon name="cross-circle-filled"></devtools-icon>${lockedString2(UIStringsNotTranslate2.genericErrorMessage)} ${renderSourcesLink()}
            </div>` : nothing3}`;
  }
  function renderFooter() {
    if (input.savedToDisk) {
      return nothing3;
    }
    if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
      return html5`
          <div class="footer">
            <div class="left-side">
              <x-link class="link disclaimer-link" href="https://support.google.com/legal/answer/13505487" jslog=${VisualLogging2.link("code-disclaimer").track({
        click: true
      })}>
                ${lockedString2(UIStringsNotTranslate2.codeDisclaimer)}
              </x-link>
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
    return html5`
        <div class="footer">
          ${input.projectName ? html5`
            <div class="change-workspace" jslog=${VisualLogging2.section("patch-widget.workspace")}>
                <devtools-icon .name=${iconName}></devtools-icon>
                <span class="folder-name" title=${input.projectPath}>${input.projectName}</span>
              ${input.onChangeWorkspaceClick ? html5`
                <devtools-button
                  @click=${input.onChangeWorkspaceClick}
                  .jslogContext=${"change-workspace"}
                  .variant=${"text"}
                  .title=${lockedString2(UIStringsNotTranslate2.changeRootFolder)}
                  .disabled=${input.patchSuggestionState === PatchSuggestionState.LOADING}
                  ${Directives.ref(output.changeRef)}
                >${lockedString2(UIStringsNotTranslate2.change)}</devtools-button>
              ` : nothing3}
            </div>
          ` : nothing3}
          <div class="apply-to-workspace-container" aria-live="polite">
            ${input.patchSuggestionState === PatchSuggestionState.LOADING ? html5`
              <div class="loading-text-container" jslog=${VisualLogging2.section("patch-widget.apply-to-workspace-loading")}>
                <devtools-spinner></devtools-spinner>
                <span>
                  ${lockedString2(UIStringsNotTranslate2.applyingToWorkspace)}
                </span>
              </div>
            ` : html5`
                <devtools-button
                @click=${input.onApplyToWorkspace}
                .jslogContext=${"patch-widget.apply-to-workspace"}
                .variant=${"outlined"}>
                ${lockedString2(UIStringsNotTranslate2.applyToWorkspace)}
              </devtools-button>
            `}
            ${input.patchSuggestionState === PatchSuggestionState.LOADING ? html5`<devtools-button
              @click=${input.onCancel}
              .jslogContext=${"cancel"}
              .variant=${"outlined"}>
              ${lockedString2(UIStringsNotTranslate2.cancel)}
            </devtools-button>` : nothing3}
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
                 jslog=${VisualLogging2.link("open-ai-settings").track({
      click: true
    })}
                 @click=${input.onLearnMoreTooltipClick}
               >${lockedString2(UIStringsNotTranslate2.learnMore)}</button>
             </div>
            </devtools-tooltip>
          </div>
        </div>`;
  }
  const template = input.savedToDisk ? html5`
          <div class="change-summary saved-to-disk" role="status" aria-live="polite">
            <div class="header-container">
             ${renderHeader()}
             </div>
          </div>` : html5`
          <details class="change-summary" jslog=${VisualLogging2.section("patch-widget")}>
            <summary class="header-container" ${Directives.ref(output.summaryRef)}>
              ${renderHeader()}
            </summary>
            ${renderContent()}
            ${renderFooter()}
          </details>
        `;
  render5(template, target);
};
var PatchWidget = class extends UI3.Widget.Widget {
  changeSummary = "";
  changeManager;
  // Whether the user completed first run experience dialog or not.
  #aiPatchingFreCompletedSetting = Common2.Settings.Settings.instance().createSetting("ai-assistance-patching-fre-completed", false);
  #projectIdSetting = Common2.Settings.Settings.instance().createSetting("ai-assistance-patching-selected-project-id", "");
  #view;
  #viewOutput = {};
  #aidaClient;
  #applyPatchAbortController;
  #project;
  #patchSources;
  #savedToDisk;
  #noLogging;
  // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
  #patchSuggestionState = PatchSuggestionState.INITIAL;
  #workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
  #workspace = Workspace3.Workspace.WorkspaceImpl.instance();
  #automaticFileSystem = Persistence2.AutomaticFileSystemManager.AutomaticFileSystemManager.instance().automaticFileSystem;
  #applyToDisconnectedAutomaticWorkspace = false;
  // `rpcId` from the `applyPatch` request
  #rpcId = null;
  constructor(element, view = DEFAULT_VIEW2, opts) {
    super(element);
    this.#aidaClient = opts?.aidaClient ?? new Host2.AidaClient.AidaClient();
    this.#noLogging = Root2.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root2.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    this.#view = view;
    this.requestUpdate();
  }
  #onLearnMoreTooltipClick() {
    void UI3.ViewManager.ViewManager.instance().showView("chrome-ai");
  }
  #getDisplayedProject() {
    if (this.#project) {
      return {
        projectName: Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(this.#project.displayName()),
        projectPath: Common2.ParsedURL.ParsedURL.urlToRawPathString(this.#project.id(), Host2.Platform.isWin())
      };
    }
    if (this.#automaticFileSystem) {
      return {
        projectName: Common2.ParsedURL.ParsedURL.extractName(this.#automaticFileSystem.root),
        projectPath: this.#automaticFileSystem.root
      };
    }
    return {
      projectName: "",
      projectPath: Platform3.DevToolsPath.EmptyRawPathString
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
      applyToWorkspaceTooltipText: this.#noLogging ? lockedString2(UIStringsNotTranslate2.applyToWorkspaceTooltipNoLogging) : lockedString2(UIStringsNotTranslate2.applyToWorkspaceTooltip),
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
    const result = await PanelCommon.FreDialog.show({
      header: { iconName: "smart-assistant", text: lockedString2(UIStringsNotTranslate2.freDisclaimerHeader) },
      reminderItems: [
        {
          iconName: "psychiatry",
          content: lockedString2(UIStringsNotTranslate2.freDisclaimerTextAiWontAlwaysGetItRight)
        },
        {
          iconName: "google",
          content: this.#noLogging ? lockedString2(UIStringsNotTranslate2.freDisclaimerTextPrivacyNoLogging) : lockedString2(UIStringsNotTranslate2.freDisclaimerTextPrivacy)
        },
        {
          iconName: "warning",
          // clang-format off
          content: html5`<x-link
            href=${CODE_SNIPPET_WARNING_URL}
            class="link devtools-link"
            jslog=${VisualLogging2.link("code-snippets-explainer.patch-widget").track({
            click: true
          })}
          >${lockedString2(UIStringsNotTranslate2.freDisclaimerTextUseWithCaution)}</x-link>`
          // clang-format on
        }
      ],
      onLearnMoreClick: () => {
        void UI3.ViewManager.ViewManager.instance().showView("chrome-ai");
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

.input-form {
  display: flex;
  flex-direction: column;
  padding: 0 var(--sys-size-5) 0 var(--sys-size-5);
  max-width: var(--sys-size-36);
  background-color: var(--sys-color-cdt-base-container);
  width: 100%;
  position: sticky;
  z-index: 9999;
  bottom: 0;
  padding-bottom: var(--sys-size-5);
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

.chat-cancel-context-button {
  padding-bottom: 3px;
  padding-right: var(--sys-size-3);
}

footer.chat-view-footer {
  display: flex;
  justify-content: center;
  padding-block: var(--sys-size-3);
  font: var(--sys-typescale-body5-regular);
  border-top: 1px solid var(--sys-color-divider);
  text-wrap: balance;
  text-align: center;

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

  &:last-of-type {
    border-bottom: 0;
  }

  .message-info {
    display: flex;
    align-items: center;
    height: var(--sys-size-11);
    gap: var(--sys-size-4);
    font: var(--sys-typescale-body4-bold);

    img {
      border: 0;
      border-radius: var(--sys-shape-corner-full);
      display: block;
      height: var(--sys-size-9);
      width: var(--sys-size-9);
    }

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

.select-element {
  display: flex;
  gap: var(--sys-size-3);
  align-items: center;

  .resource-link,
  .resource-task {
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
      font: var(--sys-typescale-body5-regular);
    }

    &.has-picker-behavior {
      overflow: visible;
    }

    &:focus-visible {
      outline: 2px solid var(--sys-color-state-focus-ring);
    }

    devtools-icon,
    devtools-file-source-icon {
      display: inline-flex;
      vertical-align: middle;
      width: var(--sys-size-7);
      height: var(--sys-size-7);
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

  .resource-link.disabled,
  .resource-task.disabled,
  .resource-link.not-selected,
  .resource-task.not-selected {
    color: var(--sys-color-state-disabled);
    border-color: var(--sys-color-neutral-outline);
  }

  .resource-link.disabled,
  .resource-task.disabled {
    pointer-events: none;
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
  border-radius: var(--sys-size-6);
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
    border-radius: var(--sys-size-6);
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

.floaty {
  margin: var(--sys-size-3) 0;
  padding: 0;
  list-style: none;
  display: flex;
  gap: var(--sys-size-4);

  li {
    border: var(--sys-size-1) solid var(--sys-color-divider);
    padding: var(--sys-size-2) var(--sys-size-3);
    max-width: 150px;
    display: flex;
    align-items: center;
    justify-content: flex-start;

    .context-item {
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-grow: 0;
    }
  }

  .open-floaty {
    margin-left: auto;
  }
}

/*# sourceURL=${import.meta.resolve("././components/chatView.css")} */`;

// gen/front_end/panels/ai_assistance/components/UserActionRow.js
var UserActionRow_exports = {};
__export(UserActionRow_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  UserActionRow: () => UserActionRow
});
import * as Common3 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Buttons4 from "./../../ui/components/buttons/buttons.js";
import * as Input from "./../../ui/components/input/input.js";
import * as UIHelpers from "./../../ui/helpers/helpers.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as Lit4 from "./../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/ai_assistance/components/userActionRow.css.js
var userActionRow_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .ai-assistance-feedback-row {
    font-family: var(--default-font-family);
    width: 100%;
    display: flex;
    gap: var(--sys-size-8);
    justify-content: space-between;
    align-items: center;
    margin-block: calc(-1 * var(--sys-size-3));

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
}

/*# sourceURL=${import.meta.resolve("././components/userActionRow.css")} */`;

// gen/front_end/panels/ai_assistance/components/UserActionRow.js
var { html: html6, Directives: { ref } } = Lit4;
var UIStringsNotTranslate3 = {
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
  copyResponse: "Copy response"
};
var lockedString3 = i18n5.i18n.lockedString;
var REPORT_URL = "https://support.google.com/legal/troubleshooter/1114905?hl=en#ts=1115658%2C13380504";
var SCROLL_ROUNDING_OFFSET = 1;
var DEFAULT_VIEW3 = (input, output, target) => {
  Lit4.render(html6`
    <style>${Input.textInputStyles}</style>
    <style>${userActionRow_css_default}</style>
    <div class="ai-assistance-feedback-row">
      <div class="action-buttons">
        ${input.showRateButtons ? html6`
          <devtools-button
            .data=${{
    variant: "icon",
    size: "SMALL",
    iconName: "thumb-up",
    toggledIconName: "thumb-up-filled",
    toggled: input.currentRating === "POSITIVE",
    toggleType: "primary-toggle",
    title: lockedString3(UIStringsNotTranslate3.thumbsUp),
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
    title: lockedString3(UIStringsNotTranslate3.thumbsDown),
    jslogContext: "thumbs-down"
  }}
            @click=${() => input.onRatingClick(
    "NEGATIVE"
    /* Host.AidaClient.Rating.NEGATIVE */
  )}
          ></devtools-button>
          <div class="vertical-separator"></div>
        ` : Lit4.nothing}
        <devtools-button
          .data=${{
    variant: "icon",
    size: "SMALL",
    title: lockedString3(UIStringsNotTranslate3.report),
    iconName: "report",
    jslogContext: "report"
  }}
          @click=${input.onReportClick}
        ></devtools-button>
        <div class="vertical-separator"></div>
          <devtools-button
            .data=${{
    variant: "icon",
    size: "SMALL",
    title: lockedString3(UIStringsNotTranslate3.copyResponse),
    iconName: "copy",
    jslogContext: "copy-ai-response"
  }}
            aria-label=${lockedString3(UIStringsNotTranslate3.copyResponse)}
            @click=${input.onCopyResponseClick}></devtools-button>
      </div>
      ${input.suggestions ? html6`<div class="suggestions-container">
        <div class="scroll-button-container left hidden" ${ref((element) => {
    output.suggestionsLeftScrollButtonContainer = element;
  })}>
          <devtools-button
            class='scroll-button'
            .data=${{
    variant: "icon",
    size: "SMALL",
    iconName: "chevron-left",
    title: lockedString3(UIStringsNotTranslate3.scrollToPrevious),
    jslogContext: "chevron-left"
  }}
            @click=${() => input.scrollSuggestionsScrollContainer("left")}
          ></devtools-button>
        </div>
        <div class="suggestions-scroll-container" @scroll=${input.onSuggestionsScrollOrResize} ${ref((element) => {
    output.suggestionsScrollContainer = element;
  })}>
          ${input.suggestions.map((suggestion) => html6`<devtools-button
            class='suggestion'
            .data=${{
    variant: "outlined",
    title: suggestion,
    jslogContext: "suggestion"
  }}
            @click=${() => input.onSuggestionClick(suggestion)}
          >${suggestion}</devtools-button>`)}
        </div>
        <div class="scroll-button-container right hidden" ${ref((element) => {
    output.suggestionsRightScrollButtonContainer = element;
  })}>
          <devtools-button
            class='scroll-button'
            .data=${{
    variant: "icon",
    size: "SMALL",
    iconName: "chevron-right",
    title: lockedString3(UIStringsNotTranslate3.scrollToNext),
    jslogContext: "chevron-right"
  }}
            @click=${() => input.scrollSuggestionsScrollContainer("right")}
          ></devtools-button>
        </div>
      </div>` : Lit4.nothing}
    </div>
    ${input.isShowingFeedbackForm ? html6`
      <form class="feedback-form" @submit=${input.onSubmit}>
        <div class="feedback-header">
          <h4 class="feedback-title">${lockedString3(UIStringsNotTranslate3.whyThisRating)}</h4>
          <devtools-button
            aria-label=${lockedString3(UIStringsNotTranslate3.close)}
            @click=${input.onClose}
            .data=${{
    variant: "icon",
    iconName: "cross",
    size: "SMALL",
    title: lockedString3(UIStringsNotTranslate3.close),
    jslogContext: "close"
  }}
          ></devtools-button>
        </div>
        <input
          type="text"
          class="devtools-text-input feedback-input"
          @input=${(event) => input.onInputChange(event.target.value)}
          placeholder=${lockedString3(UIStringsNotTranslate3.provideFeedbackPlaceholder)}
          jslog=${VisualLogging3.textField("feedback").track({ keydown: "Enter" })}
        >
        <span class="feedback-disclaimer">${lockedString3(UIStringsNotTranslate3.disclaimer)}</span>
        <div>
          <devtools-button
          aria-label=${lockedString3(UIStringsNotTranslate3.submit)}
          .data=${{
    type: "submit",
    disabled: input.isSubmitButtonDisabled,
    variant: "outlined",
    size: "SMALL",
    title: lockedString3(UIStringsNotTranslate3.submit),
    jslogContext: "send"
  }}
          >${lockedString3(UIStringsNotTranslate3.submit)}</devtools-button>
        </div>
      </div>
    </form>
    ` : Lit4.nothing}
  `, target);
};
var UserActionRow = class extends UI4.Widget.Widget {
  showRateButtons = false;
  onFeedbackSubmit = () => {
  };
  suggestions;
  onCopyResponseClick = () => {
  };
  onSuggestionClick = () => {
  };
  canShowFeedbackForm = false;
  #suggestionsResizeObserver = new ResizeObserver(() => this.#handleSuggestionsScrollOrResize());
  #suggestionsEvaluateLayoutThrottler = new Common3.Throttler.Throttler(50);
  #feedbackValue = "";
  #currentRating;
  #isShowingFeedbackForm = false;
  #isSubmitButtonDisabled = true;
  #view;
  #viewOutput = {};
  constructor(element, view) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW3;
  }
  wasShown() {
    super.wasShown();
    void this.performUpdate();
    this.#evaluateSuggestionsLayout();
    if (this.#viewOutput.suggestionsScrollContainer) {
      this.#suggestionsResizeObserver.observe(this.#viewOutput.suggestionsScrollContainer);
    }
  }
  performUpdate() {
    this.#view({
      onSuggestionClick: this.onSuggestionClick,
      onRatingClick: this.#handleRateClick.bind(this),
      onReportClick: () => UIHelpers.openInNewTab(REPORT_URL),
      onCopyResponseClick: this.onCopyResponseClick,
      scrollSuggestionsScrollContainer: this.#scrollSuggestionsScrollContainer.bind(this),
      onSuggestionsScrollOrResize: this.#handleSuggestionsScrollOrResize.bind(this),
      onSubmit: this.#handleSubmit.bind(this),
      onClose: this.#handleClose.bind(this),
      onInputChange: this.#handleInputChange.bind(this),
      isSubmitButtonDisabled: this.#isSubmitButtonDisabled,
      showRateButtons: this.showRateButtons,
      suggestions: this.suggestions,
      currentRating: this.#currentRating,
      isShowingFeedbackForm: this.#isShowingFeedbackForm
    }, this.#viewOutput, this.contentElement);
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
      this.onFeedbackSubmit(
        "SENTIMENT_UNSPECIFIED"
        /* Host.AidaClient.Rating.SENTIMENT_UNSPECIFIED */
      );
      void this.performUpdate();
      return;
    }
    this.#currentRating = rating;
    this.#isShowingFeedbackForm = this.canShowFeedbackForm;
    this.onFeedbackSubmit(rating);
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
    this.onFeedbackSubmit(this.#currentRating, input);
    this.#isShowingFeedbackForm = false;
    this.#isSubmitButtonDisabled = true;
    void this.performUpdate();
  }
};

// gen/front_end/panels/ai_assistance/components/ChatView.js
var { html: html7, Directives: { ifDefined, ref: ref2 } } = Lit5;
var UIStrings = {
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: "Learn about AI in DevTools",
  /**
   * @description Label added to the text input to describe the context for screen readers. Not shown visibly on screen.
   */
  inputTextAriaDescription: "You can also use one of the suggested prompts above to start your conversation",
  /**
   * @description Label added to the button that reveals the selected context item in DevTools
   */
  revealContextDescription: "Reveal the selected context item in DevTools"
};
var UIStringsNotTranslate4 = {
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
   * @description Label for the "select an element" button.
   */
  noElementSelected: "No element selected",
  /**
   * @description Text for the empty state of the AI assistance panel.
   */
  emptyStateText: "How can I help you?",
  /**
   * @description The error message when the request to the LLM failed for some reason.
   */
  systemError: "Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue. If this keeps happening, update Chrome to the latest version.",
  /**
   * @description The error message when the LLM gets stuck in a loop (max steps reached).
   */
  maxStepsError: "Seems like I am stuck with the investigation. It would be better if you start over.",
  /**
   * @description Displayed when the user stop the response
   */
  stoppedResponse: "You stopped this response",
  /**
   * @description Prompt for user to confirm code execution that may affect the page.
   */
  sideEffectConfirmationDescription: "This code may modify page content. Continue?",
  /**
   * @description Button text that confirm code execution that may affect the page.
   */
  positiveSideEffectConfirmation: "Continue",
  /**
   * @description Button text that cancels code execution that may affect the page.
   */
  negativeSideEffectConfirmation: "Cancel",
  /**
   * @description The generic name of the AI agent (do not translate)
   */
  ai: "AI",
  /**
   * @description The fallback text when we can't find the user full name
   */
  you: "You",
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
   * @description Aria label for the cancel icon to be read by screen reader
   */
  canceled: "Canceled",
  /**
   * @description Text displayed when the chat input is disabled due to reading past conversation.
   */
  pastConversation: "You're viewing a past conversation.",
  /**
   * @description Title for the take screenshot button.
   */
  takeScreenshotButtonTitle: "Take screenshot",
  /**
   * @description Title for the remove image input button.
   */
  removeImageInputButtonTitle: "Remove image input",
  /**
   * @description Alt text for the image input (displayed in the chat messages) that has been sent to the model.
   */
  imageInputSentToTheModel: "Image input sent to the model",
  /**
   * @description Alt text for the account avatar.
   */
  accountAvatar: "Account avatar",
  /**
   * @description Title for the x-link which wraps the image input rendered in chat messages.
   */
  openImageInNewTab: "Open image in a new tab",
  /**
   * @description Alt text for image when it is not available.
   */
  imageUnavailable: "Image unavailable",
  /**
   * @description Title for the add image button.
   */
  addImageButtonTitle: "Add image"
};
var str_ = i18n7.i18n.registerUIStrings("panels/ai_assistance/components/ChatView.ts", UIStrings);
var i18nString = i18n7.i18n.getLocalizedString.bind(void 0, str_);
var lockedString4 = i18n7.i18n.lockedString;
var SCROLL_ROUNDING_OFFSET2 = 1;
var RELEVANT_DATA_LINK_FOOTER_ID = "relevant-data-link-footer";
var RELEVANT_DATA_LINK_CHAT_ID = "relevant-data-link-chat";
var ChatView = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #scrollTop;
  #props;
  #messagesContainerElement;
  #mainElementRef = Lit5.Directives.createRef();
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
  constructor(props) {
    super();
    this.#props = props;
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
  restoreScrollPosition() {
    if (this.#scrollTop === void 0) {
      return;
    }
    if (!this.#mainElementRef?.value) {
      return;
    }
    this.#setMainElementScrollTop(this.#scrollTop);
  }
  scrollToBottom() {
    if (!this.#mainElementRef?.value) {
      return;
    }
    this.#setMainElementScrollTop(this.#mainElementRef.value.scrollHeight);
  }
  #handleMessagesContainerResize() {
    if (!this.#pinScrollToBottom) {
      return;
    }
    if (!this.#mainElementRef?.value) {
      return;
    }
    if (this.#pinScrollToBottom) {
      this.#setMainElementScrollTop(this.#mainElementRef.value.scrollHeight);
    }
  }
  #setMainElementScrollTop(scrollTop) {
    if (!this.#mainElementRef?.value) {
      return;
    }
    this.#scrollTop = scrollTop;
    this.#isProgrammaticScroll = true;
    this.#mainElementRef.value.scrollTop = scrollTop;
  }
  #setInputText(text) {
    const textArea = this.#shadow.querySelector(".chat-input");
    if (!textArea) {
      return;
    }
    textArea.value = text;
    this.#props.onTextInputChange(text);
  }
  #handleMessageContainerRef(el) {
    this.#messagesContainerElement = el;
    if (el) {
      this.#messagesContainerResizeObserver.observe(el);
    } else {
      this.#pinScrollToBottom = true;
      this.#messagesContainerResizeObserver.disconnect();
    }
  }
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
  #handleSubmit = (ev) => {
    ev.preventDefault();
    if (this.#props.imageInput?.isLoading) {
      return;
    }
    const textArea = this.#shadow.querySelector(".chat-input");
    if (!textArea?.value) {
      return;
    }
    const imageInput = !this.#props.imageInput?.isLoading && this.#props.imageInput?.data ? { inlineData: { data: this.#props.imageInput.data, mimeType: this.#props.imageInput.mimeType } } : void 0;
    void this.#props.onTextSubmit(textArea.value, imageInput, this.#props.imageInput?.inputType);
    textArea.value = "";
  };
  #handleTextAreaKeyDown = (ev) => {
    if (!ev.target || !(ev.target instanceof HTMLTextAreaElement)) {
      return;
    }
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      if (!ev.target?.value || this.#props.imageInput?.isLoading) {
        return;
      }
      const imageInput = !this.#props.imageInput?.isLoading && this.#props.imageInput?.data ? { inlineData: { data: this.#props.imageInput.data, mimeType: this.#props.imageInput.mimeType } } : void 0;
      void this.#props.onTextSubmit(ev.target.value, imageInput, this.#props.imageInput?.inputType);
      ev.target.value = "";
    }
  };
  #handleCancel = (ev) => {
    ev.preventDefault();
    if (!this.#props.isLoading) {
      return;
    }
    this.#props.onCancelClick();
  };
  #handleImageUpload = (ev) => {
    ev.stopPropagation();
    if (this.#props.onLoadImage) {
      const fileSelector = UI5.UIUtils.createFileSelectorElement(this.#props.onLoadImage.bind(this), ".jpeg,.jpg,.png");
      fileSelector.click();
    }
  };
  #handleSuggestionClick = (suggestion) => {
    this.#setInputText(suggestion);
    this.focusTextInput();
    Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
  };
  #render() {
    const renderFooter = () => {
      const classes = Lit5.Directives.classMap({
        "chat-view-footer": true,
        "is-read-only": this.#props.isReadOnly
      });
      return html7`
        <footer class=${classes} jslog=${VisualLogging4.section("footer")}>
          ${renderRelevantDataDisclaimer({
        isLoading: this.#props.isLoading,
        blockedByCrossOrigin: this.#props.blockedByCrossOrigin,
        tooltipId: RELEVANT_DATA_LINK_FOOTER_ID,
        disclaimerText: this.#props.disclaimerText
      })}
        </footer>
      `;
    };
    const renderInputOrReadOnlySection = () => {
      if (this.#props.isReadOnly) {
        return renderReadOnlySection({
          onNewConversation: this.#props.onNewConversation
        });
      }
      return renderChatInput({
        isLoading: this.#props.isLoading,
        blockedByCrossOrigin: this.#props.blockedByCrossOrigin,
        isTextInputDisabled: this.#props.isTextInputDisabled,
        inputPlaceholder: this.#props.inputPlaceholder,
        disclaimerText: this.#props.disclaimerText,
        selectedContext: this.#props.selectedContext,
        inspectElementToggled: this.#props.inspectElementToggled,
        multimodalInputEnabled: this.#props.multimodalInputEnabled,
        conversationType: this.#props.conversationType,
        imageInput: this.#props.imageInput,
        isTextInputEmpty: this.#props.isTextInputEmpty,
        uploadImageInputEnabled: this.#props.uploadImageInputEnabled,
        onContextClick: this.#props.onContextClick,
        onInspectElementClick: this.#props.onInspectElementClick,
        onSubmit: this.#handleSubmit,
        onTextAreaKeyDown: this.#handleTextAreaKeyDown,
        onCancel: this.#handleCancel,
        onNewConversation: this.#props.onNewConversation,
        onTakeScreenshot: this.#props.onTakeScreenshot,
        onRemoveImageInput: this.#props.onRemoveImageInput,
        onTextInputChange: this.#props.onTextInputChange,
        onImageUpload: this.#handleImageUpload,
        additionalFloatyContext: this.#props.additionalFloatyContext
      });
    };
    Lit5.render(html7`
      <style>${chatView_css_default}</style>
      <div class="chat-ui">
        <main @scroll=${this.#handleScroll} ${ref2(this.#mainElementRef)}>
          ${renderMainContents({
      messages: this.#props.messages,
      isLoading: this.#props.isLoading,
      isReadOnly: this.#props.isReadOnly,
      canShowFeedbackForm: this.#props.canShowFeedbackForm,
      isTextInputDisabled: this.#props.isTextInputDisabled,
      suggestions: this.#props.emptyStateSuggestions,
      userInfo: this.#props.userInfo,
      markdownRenderer: this.#props.markdownRenderer,
      changeSummary: this.#props.changeSummary,
      changeManager: this.#props.changeManager,
      onSuggestionClick: this.#handleSuggestionClick,
      onFeedbackSubmit: this.#props.onFeedbackSubmit,
      onMessageContainerRef: this.#handleMessageContainerRef,
      onCopyResponseClick: this.#props.onCopyResponseClick
    })}
          ${renderInputOrReadOnlySection()}
        </main>
       ${renderFooter()}
      </div>
    `, this.#shadow, { host: this });
  }
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
    ${refFn ? ref2(refFn) : Lit5.nothing}>
  </devtools-markdown-view>`;
}
function renderTitle(step) {
  const paused = step.sideEffect ? html7`<span class="paused">${lockedString4(UIStringsNotTranslate4.paused)}: </span>` : Lit5.nothing;
  const actionTitle = step.title ?? `${lockedString4(UIStringsNotTranslate4.investigating)}\u2026`;
  return html7`<span class="title">${paused}${actionTitle}</span>`;
}
function renderStepCode(step) {
  if (!step.code && !step.output) {
    return Lit5.nothing;
  }
  const codeHeadingText = step.output && !step.canceled ? lockedString4(UIStringsNotTranslate4.codeExecuted) : lockedString4(UIStringsNotTranslate4.codeToExecute);
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
      .header=${lockedString4(UIStringsNotTranslate4.dataReturned)}
      .showCopyButton=${false}
    ></devtools-code-block>
  </div>` : Lit5.nothing;
  return html7`<div class="step-code">${code}${output}</div>`;
}
function renderStepDetails({ step, markdownRenderer, isLast }) {
  const sideEffects = isLast && step.sideEffect ? renderSideEffectConfirmationUi(step) : Lit5.nothing;
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
function renderStepBadge({ step, isLoading, isLast }) {
  if (isLoading && isLast && !step.sideEffect) {
    return html7`<devtools-spinner></devtools-spinner>`;
  }
  let iconName = "checkmark";
  let ariaLabel = lockedString4(UIStringsNotTranslate4.completed);
  let role = "button";
  if (isLast && step.sideEffect) {
    role = void 0;
    ariaLabel = void 0;
    iconName = "pause-circle";
  } else if (step.canceled) {
    ariaLabel = lockedString4(UIStringsNotTranslate4.canceled);
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
    empty: !step.thought && !step.code && !step.contextDetails && !step.sideEffect,
    paused: Boolean(step.sideEffect),
    canceled: Boolean(step.canceled)
  });
  return html7`
    <details class=${stepClasses}
      jslog=${VisualLogging4.section("step")}
      .open=${Boolean(step.sideEffect)}>
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
    </details>`;
}
function renderSideEffectConfirmationUi(step) {
  if (!step.sideEffect) {
    return Lit5.nothing;
  }
  return html7`<div
    class="side-effect-confirmation"
    jslog=${VisualLogging4.section("side-effect-confirmation")}
  >
    <p>${lockedString4(UIStringsNotTranslate4.sideEffectConfirmationDescription)}</p>
    <div class="side-effect-buttons-container">
      <devtools-button
        .data=${{
    variant: "outlined",
    jslogContext: "decline-execute-code"
  }}
        @click=${() => step.sideEffect?.onAnswer(false)}
      >${lockedString4(UIStringsNotTranslate4.negativeSideEffectConfirmation)}</devtools-button>
      <devtools-button
        .data=${{
    variant: "primary",
    jslogContext: "accept-execute-code",
    iconName: "play"
  }}
        @click=${() => step.sideEffect?.onAnswer(true)}
      >${lockedString4(UIStringsNotTranslate4.positiveSideEffectConfirmation)}</devtools-button>
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
      case "abort":
        return html7`<p class="aborted" jslog=${VisualLogging4.section("aborted")}>${lockedString4(UIStringsNotTranslate4.stoppedResponse)}</p>`;
    }
    return html7`<p class="error" jslog=${VisualLogging4.section("error")}>${lockedString4(errorMessage)}</p>`;
  }
  return Lit5.nothing;
}
function renderChatMessage({ message, isLoading, isReadOnly, canShowFeedbackForm, isLast, userInfo, markdownRenderer, onSuggestionClick, onFeedbackSubmit, onCopyResponseClick }) {
  if (message.entity === "user") {
    const name = userInfo.accountFullName || lockedString4(UIStringsNotTranslate4.you);
    const image = userInfo.accountImage ? html7`<img src="data:image/png;base64, ${userInfo.accountImage}" alt=${UIStringsNotTranslate4.accountAvatar} />` : html7`<devtools-icon
          name="profile"
        ></devtools-icon>`;
    const imageInput = message.imageInput && "inlineData" in message.imageInput ? renderImageChatMessage(message.imageInput.inlineData) : Lit5.nothing;
    return html7`<section
      class="chat-message query"
      jslog=${VisualLogging4.section("question")}
    >
      <div class="message-info">
        ${image}
        <div class="message-name">
          <h2>${name}</h2>
        </div>
      </div>
      ${imageInput}
      <div class="message-content">${renderTextAsMarkdown(message.text, markdownRenderer)}</div>
    </section>`;
  }
  return html7`
    <section
      class="chat-message answer"
      jslog=${VisualLogging4.section("answer")}
    >
      <div class="message-info">
        <devtools-icon name="smart-assistant"></devtools-icon>
        <div class="message-name">
          <h2>${lockedString4(UIStringsNotTranslate4.ai)}</h2>
        </div>
      </div>
      ${Lit5.Directives.repeat(message.parts, (_, index) => index, (part, index) => {
    const isLastPart = index === message.parts.length - 1;
    if (part.type === "answer") {
      return html7`<p>${renderTextAsMarkdown(part.text, markdownRenderer, { animate: !isReadOnly && isLoading && isLast && isLastPart })}</p>`;
    }
    return renderStep({
      step: part.step,
      isLoading,
      markdownRenderer,
      isLast: isLastPart && isLast
    });
  })}
      ${renderError(message)}
      ${isLast && isLoading ? Lit5.nothing : html7`<devtools-widget class="actions" .widgetConfig=${UI5.Widget.widgetConfig(UserActionRow, {
    showRateButtons: message.rpcId !== void 0,
    onFeedbackSubmit: (rating, feedback) => {
      if (!message.rpcId) {
        return;
      }
      onFeedbackSubmit(message.rpcId, rating, feedback);
    },
    suggestions: isLast && !isReadOnly && message.parts.at(-1)?.type === "answer" ? message.parts.at(-1).suggestions : void 0,
    onSuggestionClick,
    onCopyResponseClick: () => onCopyResponseClick(message),
    canShowFeedbackForm
  })}></devtools-widget>`}
    </section>
  `;
}
function renderImageChatMessage(inlineData) {
  if (inlineData.data === AiAssistanceModel3.AiConversation.NOT_FOUND_IMAGE_DATA) {
    return html7`<div class="unavailable-image" title=${UIStringsNotTranslate4.imageUnavailable}>
      <devtools-icon name='file-image'></devtools-icon>
    </div>`;
  }
  const imageUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
  return html7`<x-link
      class="image-link" title=${UIStringsNotTranslate4.openImageInNewTab}
      href=${imageUrl}
    >
      <img src=${imageUrl} alt=${UIStringsNotTranslate4.imageInputSentToTheModel} />
    </x-link>`;
}
function renderContextIcon(context) {
  if (!context) {
    return Lit5.nothing;
  }
  const item = context.getItem();
  if (item instanceof SDK.NetworkRequest.NetworkRequest) {
    return PanelUtils.PanelUtils.getIconForNetworkRequest(item);
  }
  if (item instanceof Workspace5.UISourceCode.UISourceCode) {
    return PanelUtils.PanelUtils.getIconForSourceFile(item);
  }
  if (item instanceof AiAssistanceModel3.AIContext.AgentFocus) {
    return html7`<devtools-icon name="performance" title="Performance"></devtools-icon>`;
  }
  if (item instanceof SDK.DOMModel.DOMNode) {
    return Lit5.nothing;
  }
  return Lit5.nothing;
}
function renderContextTitle(context, disabled) {
  const item = context.getItem();
  if (item instanceof SDK.DOMModel.DOMNode) {
    const hiddenClassList = item.classNames().filter((className) => className.startsWith(AiAssistanceModel3.Injected.AI_ASSISTANCE_CSS_CLASS_NAME));
    return html7`<devtools-widget .widgetConfig=${UI5.Widget.widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, {
      node: item,
      options: { hiddenClassList, disabled }
    })}></devtools-widget>`;
  }
  return context.getTitle();
}
function renderSelection({ selectedContext, inspectElementToggled, conversationType, isTextInputDisabled, onContextClick, onInspectElementClick }) {
  if (!selectedContext) {
    return Lit5.nothing;
  }
  const hasPickerBehavior = conversationType === "freestyler";
  const resourceClass = Lit5.Directives.classMap({
    "not-selected": !selectedContext,
    "resource-link": true,
    "has-picker-behavior": hasPickerBehavior,
    disabled: isTextInputDisabled
  });
  const handleKeyDown = (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      void onContextClick();
    }
  };
  return html7`<div class="select-element">
    ${hasPickerBehavior ? html7`
        <devtools-button
          .data=${{
    variant: "icon_toggle",
    size: "SMALL",
    iconName: "select-element",
    toggledIconName: "select-element",
    toggleType: "primary-toggle",
    toggled: inspectElementToggled,
    title: lockedString4(UIStringsNotTranslate4.selectAnElement),
    jslogContext: "select-element",
    disabled: isTextInputDisabled
  }}
          @click=${onInspectElementClick}
        ></devtools-button>
      ` : Lit5.nothing}
    <div
      role=button
      class=${resourceClass}
      tabindex=${hasPickerBehavior || isTextInputDisabled ? "-1" : "0"}
      @click=${onContextClick}
      @keydown=${handleKeyDown}
      aria-description=${i18nString(UIStrings.revealContextDescription)}
    >
      ${renderContextIcon(selectedContext)}
      <span class="title">${selectedContext ? renderContextTitle(selectedContext, isTextInputDisabled) : lockedString4(UIStringsNotTranslate4.noElementSelected)}</span>
    </div>
  </div>`;
}
function renderMessages({ messages, isLoading, isReadOnly, canShowFeedbackForm, userInfo, markdownRenderer, changeSummary, changeManager, onSuggestionClick, onFeedbackSubmit, onCopyResponseClick, onMessageContainerRef }) {
  function renderPatchWidget() {
    if (isLoading) {
      return Lit5.nothing;
    }
    return html7`<devtools-widget
      .widgetConfig=${UI5.Widget.widgetConfig(PatchWidget, {
      changeSummary: changeSummary ?? "",
      changeManager
    })}
    ></devtools-widget>`;
  }
  return html7`
    <div class="messages-container" ${ref2(onMessageContainerRef)}>
      ${messages.map((message, _, array) => renderChatMessage({
    message,
    isLoading,
    isReadOnly,
    canShowFeedbackForm,
    isLast: array.at(-1) === message,
    userInfo,
    markdownRenderer,
    onSuggestionClick,
    onFeedbackSubmit,
    onCopyResponseClick
  }))}
      ${renderPatchWidget()}
    </div>
  `;
}
function renderEmptyState({ isTextInputDisabled, suggestions, onSuggestionClick }) {
  return html7`<div class="empty-state-container">
    <div class="header">
      <div class="icon">
        <devtools-icon
          name="smart-assistant"
        ></devtools-icon>
      </div>
      <h1>${lockedString4(UIStringsNotTranslate4.emptyStateText)}</h1>
    </div>
    <div class="empty-state-content">
      ${suggestions.map(({ title, jslogContext }) => {
    return html7`<devtools-button
          class="suggestion"
          @click=${() => onSuggestionClick(title)}
          .data=${{
      variant: "outlined",
      size: "REGULAR",
      title,
      jslogContext: jslogContext ?? "suggestion",
      disabled: isTextInputDisabled
    }}
        >${title}</devtools-button>`;
  })}
    </div>
  </div>`;
}
function renderReadOnlySection({ onNewConversation }) {
  return html7`<div
    class="chat-readonly-container"
    jslog=${VisualLogging4.section("read-only")}
  >
    <span>${lockedString4(UIStringsNotTranslate4.pastConversation)}</span>
    <devtools-button
      aria-label=${lockedString4(UIStringsNotTranslate4.startNewChat)}
      class="chat-inline-button"
      @click=${onNewConversation}
      .data=${{
    variant: "text",
    title: lockedString4(UIStringsNotTranslate4.startNewChat),
    jslogContext: "start-new-chat"
  }}
    >${lockedString4(UIStringsNotTranslate4.startNewChat)}</devtools-button>
  </div>`;
}
function renderChatInputButtons({ isLoading, blockedByCrossOrigin, isTextInputDisabled, isTextInputEmpty, imageInput, onCancel, onNewConversation }) {
  if (isLoading) {
    return html7`<devtools-button
      class="chat-input-button"
      aria-label=${lockedString4(UIStringsNotTranslate4.cancelButtonTitle)}
      @click=${onCancel}
      .data=${{
      variant: "icon",
      size: "REGULAR",
      iconName: "record-stop",
      title: lockedString4(UIStringsNotTranslate4.cancelButtonTitle),
      jslogContext: "stop"
    }}
    ></devtools-button>`;
  }
  if (blockedByCrossOrigin) {
    return html7`
      <devtools-button
        class="start-new-chat-button"
        aria-label=${lockedString4(UIStringsNotTranslate4.startNewChat)}
        @click=${onNewConversation}
        .data=${{
      variant: "outlined",
      size: "SMALL",
      title: lockedString4(UIStringsNotTranslate4.startNewChat),
      jslogContext: "start-new-chat"
    }}
      >${lockedString4(UIStringsNotTranslate4.startNewChat)}</devtools-button>
    `;
  }
  return html7`<devtools-button
    class="chat-input-button"
    aria-label=${lockedString4(UIStringsNotTranslate4.sendButtonTitle)}
    .data=${{
    type: "submit",
    variant: "icon",
    size: "REGULAR",
    disabled: isTextInputDisabled || isTextInputEmpty || imageInput?.isLoading,
    iconName: "send",
    title: lockedString4(UIStringsNotTranslate4.sendButtonTitle),
    jslogContext: "send"
  }}
  ></devtools-button>`;
}
function renderMultimodalInputButtons({ multimodalInputEnabled, blockedByCrossOrigin, isTextInputDisabled, imageInput, uploadImageInputEnabled, onTakeScreenshot, onImageUpload }) {
  if (!multimodalInputEnabled || blockedByCrossOrigin) {
    return Lit5.nothing;
  }
  const addImageButton = uploadImageInputEnabled ? html7`<devtools-button
    class="chat-input-button"
    aria-label=${lockedString4(UIStringsNotTranslate4.addImageButtonTitle)}
    @click=${onImageUpload}
    .data=${{
    variant: "icon",
    size: "REGULAR",
    disabled: isTextInputDisabled || imageInput?.isLoading,
    iconName: "add-photo",
    title: lockedString4(UIStringsNotTranslate4.addImageButtonTitle),
    jslogContext: "upload-image"
  }}
  ></devtools-button>` : Lit5.nothing;
  return html7`${addImageButton}<devtools-button
    class="chat-input-button"
    aria-label=${lockedString4(UIStringsNotTranslate4.takeScreenshotButtonTitle)}
    @click=${onTakeScreenshot}
    .data=${{
    variant: "icon",
    size: "REGULAR",
    disabled: isTextInputDisabled || imageInput?.isLoading,
    iconName: "photo-camera",
    title: lockedString4(UIStringsNotTranslate4.takeScreenshotButtonTitle),
    jslogContext: "take-screenshot"
  }}
  ></devtools-button>`;
}
function renderImageInput({ multimodalInputEnabled, imageInput, isTextInputDisabled, onRemoveImageInput }) {
  if (!multimodalInputEnabled || !imageInput || isTextInputDisabled) {
    return Lit5.nothing;
  }
  const crossButton = html7`<devtools-button
      aria-label=${lockedString4(UIStringsNotTranslate4.removeImageInputButtonTitle)}
      @click=${onRemoveImageInput}
      .data=${{
    variant: "icon",
    size: "MICRO",
    iconName: "cross",
    title: lockedString4(UIStringsNotTranslate4.removeImageInputButtonTitle)
  }}
    ></devtools-button>`;
  if (imageInput.isLoading) {
    return html7`<div class="image-input-container">
        ${crossButton}
        <div class="loading">
          <devtools-spinner></devtools-spinner>
        </div>
      </div>`;
  }
  return html7`
    <div class="image-input-container">
      ${crossButton}
      <img src="data:${imageInput.mimeType};base64, ${imageInput.data}" alt="Image input" />
    </div>`;
}
function renderRelevantDataDisclaimer({ isLoading, blockedByCrossOrigin, tooltipId, disclaimerText }) {
  const classes = Lit5.Directives.classMap({
    "chat-input-disclaimer": true,
    "hide-divider": !isLoading && blockedByCrossOrigin
  });
  return html7`
    <p class=${classes}>
      <button
        class="link"
        role="link"
        aria-details=${tooltipId}
        jslog=${VisualLogging4.link("open-ai-settings").track({
    click: true
  })}
        @click=${() => {
    void UI5.ViewManager.ViewManager.instance().showView("chrome-ai");
  }}
      >${lockedString4("Relevant data")}</button>&nbsp;${lockedString4("is sent to Google")}
      ${renderDisclaimerTooltip(tooltipId, disclaimerText)}
    </p>
  `;
}
function renderChatInput({ isLoading, blockedByCrossOrigin, isTextInputDisabled, inputPlaceholder, selectedContext, inspectElementToggled, multimodalInputEnabled, conversationType, imageInput, isTextInputEmpty, uploadImageInputEnabled, disclaimerText, additionalFloatyContext, onContextClick, onInspectElementClick, onSubmit, onTextAreaKeyDown, onCancel, onNewConversation, onTakeScreenshot, onRemoveImageInput, onTextInputChange, onImageUpload }) {
  const chatInputContainerCls = Lit5.Directives.classMap({
    "chat-input-container": true,
    "single-line-layout": !selectedContext,
    disabled: isTextInputDisabled
  });
  return html7` <form class="input-form" @submit=${onSubmit}>
  ${renderFloatyExtraContext(additionalFloatyContext)}
    <div class=${chatInputContainerCls}>
      ${renderImageInput({
    multimodalInputEnabled,
    imageInput,
    isTextInputDisabled,
    onRemoveImageInput
  })}
      <textarea
        class="chat-input"
        .disabled=${isTextInputDisabled}
        wrap="hard"
        maxlength="10000"
        @keydown=${onTextAreaKeyDown}
        @input=${(event) => onTextInputChange(event.target.value)}
        placeholder=${inputPlaceholder}
        jslog=${VisualLogging4.textField("query").track({
    change: true,
    keydown: "Enter"
  })}
        aria-description=${i18nString(UIStrings.inputTextAriaDescription)}
        ${ref2((el) => {
    if (el && isTextInputDisabled) {
      el.value = "";
    }
  })}
      ></textarea>
      <div class="chat-input-actions">
        <div class="chat-input-actions-left">
          ${renderSelection({
    selectedContext,
    inspectElementToggled,
    conversationType,
    isTextInputDisabled,
    onContextClick,
    onInspectElementClick
  })}
        </div>
        <div class="chat-input-actions-right">
          <div class="chat-input-disclaimer-container">
            ${renderRelevantDataDisclaimer({
    isLoading,
    blockedByCrossOrigin,
    tooltipId: RELEVANT_DATA_LINK_CHAT_ID,
    disclaimerText
  })}
          </div>
          ${renderMultimodalInputButtons({
    multimodalInputEnabled,
    blockedByCrossOrigin,
    isTextInputDisabled,
    imageInput,
    uploadImageInputEnabled,
    onTakeScreenshot,
    onImageUpload
  })}
          ${renderChatInputButtons({
    isLoading,
    blockedByCrossOrigin,
    isTextInputDisabled,
    isTextInputEmpty,
    imageInput,
    onCancel,
    onNewConversation
  })}
        </div>
      </div>
    </div>
  </form>`;
}
function renderFloatyExtraContext(contexts) {
  if (!GreenDev.Prototypes.instance().isEnabled("inDevToolsFloaty")) {
    return Lit5.nothing;
  }
  return html7`
  <ul class="floaty">
    ${contexts.map((c) => {
    function onDelete(e) {
      e.preventDefault();
      UI5.Floaty.onFloatyContextDelete(c);
    }
    return html7`<li>
        <span class="context-item">
          ${renderFloatyContext(c)}
        </span>
        <devtools-button
          class="floaty-delete-button"
          @click=${onDelete}
          .data=${{
      variant: "icon",
      iconName: "cross",
      title: "Delete",
      size: "SMALL"
    }}
        ></devtools-button>
      </li>`;
  })}
    <li class="open-floaty">
      <devtools-button
        class="floaty-add-button"
        @click=${UI5.Floaty.onFloatyOpen}
        .data=${{
    variant: "icon",
    iconName: "select-element",
    title: "Open context picker",
    size: "SMALL"
  }}
      ></devtools-button>
    </li>
  </ul>
  `;
}
function renderFloatyContext(context) {
  if (context instanceof SDK.NetworkRequest.NetworkRequest) {
    return html7`${context.url()}`;
  }
  if (context instanceof SDK.DOMModel.DOMNode) {
    return html7`<devtools-widget .widgetConfig=${UI5.Widget.widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, { node: context })}>`;
  }
  if ("insight" in context) {
    return html7`${context.insight.title}`;
  }
  if ("event" in context && "traceStartTime" in context) {
    const time = Trace3.Types.Timing.Micro(context.event.ts - context.traceStartTime);
    return html7`${context.event.name} @ ${i18n7.TimeUtilities.formatMicroSecondsAsMillisFixed(time)}`;
  }
  Platform4.assertNever(context, "Unsupported context");
}
function renderMainContents({ messages, isLoading, isReadOnly, canShowFeedbackForm, isTextInputDisabled, suggestions, userInfo, markdownRenderer, changeSummary, changeManager, onSuggestionClick, onFeedbackSubmit, onCopyResponseClick, onMessageContainerRef }) {
  if (messages.length > 0) {
    return renderMessages({
      messages,
      isLoading,
      isReadOnly,
      canShowFeedbackForm,
      userInfo,
      markdownRenderer,
      changeSummary,
      changeManager,
      onSuggestionClick,
      onFeedbackSubmit,
      onMessageContainerRef,
      onCopyResponseClick
    });
  }
  return renderEmptyState({ isTextInputDisabled, suggestions, onSuggestionClick });
}
function renderDisclaimerTooltip(id, disclaimerText) {
  return html7`
    <devtools-tooltip
      id=${id}
      variant="rich"
    >
      <div class="info-tooltip-container">
        ${disclaimerText}
        <button
          class="link tooltip-link"
          role="link"
          jslog=${VisualLogging4.link("open-ai-settings").track({
    click: true
  })}
          @click=${() => {
    void UI5.ViewManager.ViewManager.instance().showView("chrome-ai");
  }}>${i18nString(UIStrings.learnAbout)}
        </button>
      </div>
    </devtools-tooltip>`;
}
customElements.define("devtools-ai-chat-view", ChatView);

// gen/front_end/panels/ai_assistance/components/DisabledWidget.js
var DisabledWidget_exports = {};
__export(DisabledWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  DisabledWidget: () => DisabledWidget
});
import * as Host5 from "./../../core/host/host.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Root3 from "./../../core/root/root.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import { html as html8, render as render8 } from "./../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";

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
var UIStrings2 = {
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
var str_2 = i18n9.i18n.registerUIStrings("panels/ai_assistance/components/DisabledWidget.ts", UIStrings2);
var i18nString2 = i18n9.i18n.getLocalizedString.bind(void 0, str_2);
function renderAidaUnavailableContents(aidaAvailability) {
  switch (aidaAvailability) {
    case "no-account-email":
    case "sync-is-paused": {
      return html8`${i18nString2(UIStrings2.notLoggedIn)}`;
    }
    case "no-internet": {
      return html8`${i18nString2(UIStrings2.offline)}`;
    }
  }
}
function renderConsentViewContents(hostConfig) {
  if (hostConfig.isOffTheRecord) {
    return html8`${i18nString2(UIStrings2.notAvailableInIncognitoMode)}`;
  }
  const settingsLink = document.createElement("span");
  settingsLink.textContent = i18nString2(UIStrings2.settingsLink);
  settingsLink.classList.add("link");
  UI6.ARIAUtils.markAsLink(settingsLink);
  settingsLink.addEventListener("click", () => {
    void UI6.ViewManager.ViewManager.instance().showView("chrome-ai");
  });
  settingsLink.setAttribute("jslog", `${VisualLogging5.action("open-ai-settings").track({ click: true })}`);
  let consentViewContents;
  if (hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(str_2, UIStrings2.turnOnForStylesRequestsPerformanceAndFiles, { PH1: settingsLink });
  } else if (hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(str_2, UIStrings2.turnOnForStylesRequestsAndFiles, { PH1: settingsLink });
  } else if (hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(str_2, UIStrings2.turnOnForStylesAndRequests, { PH1: settingsLink });
  } else {
    consentViewContents = uiI18n.getFormatLocalizedString(str_2, UIStrings2.turnOnForStyles, { PH1: settingsLink });
  }
  return html8`${consentViewContents}`;
}
var DEFAULT_VIEW4 = (input, _output, target) => {
  render8(html8`
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
var DisabledWidget = class extends UI6.Widget.Widget {
  aidaAvailability = "no-account-email";
  #view;
  constructor(element, view = DEFAULT_VIEW4) {
    super(element);
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    void this.requestUpdate();
  }
  performUpdate() {
    const hostConfig = Root3.Runtime.hostConfig;
    this.#view({
      aidaAvailability: this.aidaAvailability,
      hostConfig
    }, {}, this.contentElement);
  }
};

// gen/front_end/panels/ai_assistance/components/ExploreWidget.js
var ExploreWidget_exports = {};
__export(ExploreWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  ExploreWidget: () => ExploreWidget
});
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as Root4 from "./../../core/root/root.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
import { html as html9, render as render9 } from "./../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../ui/visual_logging/visual_logging.js";

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
var UIStringsNotTranslate5 = {
  /**
   * @description Text for the empty state of the AI assistance panel when there is no agent selected.
   */
  Explore: "Explore AI assistance",
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: "Learn about AI in DevTools"
};
var lockedString5 = i18n11.i18n.lockedString;
var DEFAULT_VIEW5 = (input, _output, target) => {
  function renderFeatureCardContent(featureCard) {
    return html9`Open
     <button
       class="link"
       role="link"
       jslog=${VisualLogging6.link(featureCard.jslogContext).track({
      click: true
    })}
       @click=${featureCard.onClick}
     >${featureCard.panelName}</button>
     ${featureCard.text}`;
  }
  render9(html9`
      <style>
        ${exploreWidget_css_default}
      </style>
      <div class="ai-assistance-explore-container">
        <div class="header">
          <div class="icon">
            <devtools-icon name="smart-assistant"></devtools-icon>
          </div>
          <h1>${lockedString5(UIStringsNotTranslate5.Explore)}</h1>
          <p>
            To chat about an item, right-click and select${" "}
            <strong>Ask AI</strong>.
            <button
              class="link"
              role="link"
              jslog=${VisualLogging6.link("open-ai-settings").track({ click: true })}
              @click=${() => {
    void UI7.ViewManager.ViewManager.instance().showView("chrome-ai");
  }}
            >${lockedString5(UIStringsNotTranslate5.learnAbout)}
            </button>
          </p>
        </div>
        <div class="content">
          ${input.featureCards.map((featureCard) => html9`
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
var ExploreWidget = class extends UI7.Widget.Widget {
  #view;
  constructor(element, view = DEFAULT_VIEW5) {
    super(element);
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    void this.requestUpdate();
  }
  performUpdate() {
    const config = Root4.Runtime.hostConfig;
    const featureCards = [];
    if (config.devToolsFreestyler?.enabled && UI7.ViewManager.ViewManager.instance().hasView("elements")) {
      featureCards.push({
        icon: "brush-2",
        heading: "CSS styles",
        jslogContext: "open-elements-panel",
        onClick: () => {
          void UI7.ViewManager.ViewManager.instance().showView("elements");
        },
        panelName: "Elements",
        text: "to ask about CSS styles"
      });
    }
    if (config.devToolsAiAssistanceNetworkAgent?.enabled && UI7.ViewManager.ViewManager.instance().hasView("network")) {
      featureCards.push({
        icon: "arrow-up-down",
        heading: "Network",
        jslogContext: "open-network-panel",
        onClick: () => {
          void UI7.ViewManager.ViewManager.instance().showView("network");
        },
        panelName: "Network",
        text: "to ask about a request's details"
      });
    }
    if (config.devToolsAiAssistanceFileAgent?.enabled && UI7.ViewManager.ViewManager.instance().hasView("sources")) {
      featureCards.push({
        icon: "document",
        heading: "Files",
        jslogContext: "open-sources-panel",
        onClick: () => {
          void UI7.ViewManager.ViewManager.instance().showView("sources");
        },
        panelName: "Sources",
        text: "to ask about a file's content"
      });
    }
    if (config.devToolsAiAssistancePerformanceAgent?.enabled && UI7.ViewManager.ViewManager.instance().hasView("timeline")) {
      featureCards.push({
        icon: "performance",
        heading: "Performance",
        jslogContext: "open-performance-panel",
        onClick: () => {
          void UI7.ViewManager.ViewManager.instance().showView("timeline");
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

// gen/front_end/panels/ai_assistance/components/MarkdownRendererWithCodeBlock.js
import * as MarkdownView from "./../../ui/components/markdown_view/markdown_view.js";
var MarkdownRendererWithCodeBlock = class extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  templateForToken(token) {
    if (token.type === "code") {
      const lines = token.text.split("\n");
      if (lines[0]?.trim() === "css") {
        token.lang = "css";
        token.text = lines.slice(1).join("\n");
      }
    }
    return super.templateForToken(token);
  }
};

// gen/front_end/panels/ai_assistance/components/PerformanceAgentMarkdownRenderer.js
import "./../../models/trace/insights/insights.js";
import "./../timeline/components/components.js";
import * as Common4 from "./../../core/common/common.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as GreenDev2 from "./../../models/greendev/greendev.js";
import * as Logs2 from "./../../models/logs/logs.js";
import * as NetworkTimeCalculator3 from "./../../models/network_time_calculator/network_time_calculator.js";
import * as Helpers2 from "./../../models/trace/helpers/helpers.js";
import * as Trace4 from "./../../models/trace/trace.js";
import * as UI8 from "./../../ui/legacy/legacy.js";
import * as Lit6 from "./../../ui/lit/lit.js";
import * as PanelsCommon2 from "./../common/common.js";
import * as Network2 from "./../network/network.js";
import * as TimelineComponents from "./../timeline/components/components.js";
import * as Insights2 from "./../timeline/components/insights/insights.js";
var { html: html10 } = Lit6.StaticHtml;
var { ref: ref3, createRef } = Lit6.Directives;
var { widgetConfig } = UI8.Widget;
var PerformanceAgentMarkdownRenderer = class extends MarkdownRendererWithCodeBlock {
  mainFrameId;
  lookupEvent;
  parsedTrace;
  #insightRenderer = new Insights2.InsightRenderer.InsightRenderer();
  constructor(mainFrameId = "", lookupEvent = () => null, parsedTrace = null) {
    super();
    this.mainFrameId = mainFrameId;
    this.lookupEvent = lookupEvent;
    this.parsedTrace = parsedTrace;
  }
  templateForToken(token) {
    if (!this.parsedTrace) {
      return null;
    }
    if (token.type === "html" && GreenDev2.Prototypes.instance().isEnabled("inlineWidgets")) {
      if (token.text.includes("<flame-chart-widget")) {
        const startMatch = token.text.match(/start="?(\d+)"?/);
        const endMatch = token.text.match(/end="?(\d+)"?/);
        const start = startMatch ? Number(startMatch[1]) : this.parsedTrace.data.Meta.traceBounds.min;
        const end = endMatch ? Number(endMatch[1]) : this.parsedTrace.data.Meta.traceBounds.max;
        return html10`<devtools-performance-agent-flame-chart .data=${{
          parsedTrace: this.parsedTrace,
          start,
          end
        }}
          }></devtools-performance-agent-flame-chart>`;
      }
      const regex = /<([a-z-]+)\s+value="([^"]+)">/;
      const match = token.text.match(regex);
      if (!match) {
        return null;
      }
      const tagName = match[1];
      const value = match[2];
      if (tagName === "ai-insight" && value) {
        const componentName = value;
        const insightSet = this.parsedTrace.insights?.values().next().value;
        const insightM = insightSet?.model[componentName];
        if (!insightM) {
          return null;
        }
        return html10`<devtools-collapsible-assistance-content-widget  .data=${{
          headerText: `Insight - ${componentName}`
        }}>
        ${this.#insightRenderer.renderInsightToWidgetElement(this.parsedTrace, insightSet, insightM, componentName, {
          selected: true,
          isAIAssistanceContext: true
        })}
        </devtools-collapsible-assistance-content-widget>`;
      }
      if (tagName === "network-request-widget" && value) {
        const rawTraceEvent = Helpers2.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents().at(Number(value));
        if (rawTraceEvent && Trace4.Types.Events.isSyntheticNetworkRequest(rawTraceEvent)) {
          const rawTraceEventId = rawTraceEvent?.args?.data?.requestId;
          const rawTraceEventUrl = rawTraceEvent?.args?.data?.url;
          const networkRequest = rawTraceEvent ? Logs2.NetworkLog.NetworkLog.instance().requestsForId(rawTraceEventId).find((r) => r.url() === rawTraceEventUrl) : null;
          if (networkRequest) {
            const calculator = new NetworkTimeCalculator3.NetworkTimeCalculator(true);
            return html10`<devtools-collapsible-assistance-content-widget
            .data=${{
              headerText: `Network Request: ${networkRequest.url().length > 80 ? networkRequest.url().slice(0, 80) + "..." : networkRequest.url()}`
            }}>
            <devtools-widget class="actions" .widgetConfig=${UI8.Widget.widgetConfig(Network2.RequestTimingView.RequestTimingView, {
              request: networkRequest,
              calculator
            })}></devtools-widget>
            </devtools-collapsible-assistance-content-widget>`;
          }
        }
        const syntheticRequest = Helpers2.SyntheticEvents.SyntheticEventsManager.getActiveManager().syntheticEventForRawEventIndex(Number(value));
        let networkTooltip = null;
        if (syntheticRequest && Trace4.Types.Events.isSyntheticNetworkRequest(syntheticRequest)) {
          networkTooltip = html10`<devtools-widget .widgetConfig=${widgetConfig(TimelineComponents.NetworkRequestTooltip.NetworkRequestTooltip, {
            networkRequest: syntheticRequest
          })}></devtools-widget>`;
        }
        return html10`<devtools-collapsible-assistance-content-widget
        .data=${{
          headerText: "Network Request"
        }}>
          ${networkTooltip}
          </devtools-collapsible-assistance-content-widget>`;
      }
      return null;
    }
    if (token.type === "link" && token.href.startsWith("#")) {
      if (token.href.startsWith("#node-")) {
        const nodeId = Number(token.href.replace("#node-", ""));
        const templateRef = createRef();
        void this.#linkifyNode(nodeId, token.text).then((node) => {
          if (!templateRef.value || !node) {
            return;
          }
          templateRef.value.textContent = "";
          templateRef.value.append(node);
        });
        return html10`<span ${ref3(templateRef)}>${token.text}</span>`;
      }
      const event = this.lookupEvent(token.href.slice(1));
      if (!event) {
        return html10`${token.text}`;
      }
      let label = token.text;
      let title = "";
      if (Trace4.Types.Events.isSyntheticNetworkRequest(event)) {
        title = event.args.data.url;
      } else {
        label += ` (${event.name})`;
      }
      return html10`<a href="#" draggable=false .title=${title} @click=${(e) => {
        e.stopPropagation();
        void Common4.Revealer.reveal(new SDK2.TraceObject.RevealableEvent(event));
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
    const target = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK2.DOMModel.DOMModel);
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
    const linkedNode = PanelsCommon2.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
    return linkedNode;
  }
};

// gen/front_end/panels/ai_assistance/AiAssistancePanel.js
var { html: html11 } = Lit7;
var AI_ASSISTANCE_SEND_FEEDBACK = "https://crbug.com/364805393";
var AI_ASSISTANCE_HELP = "https://developer.chrome.com/docs/devtools/ai-assistance";
var SCREENSHOT_QUALITY = 100;
var SHOW_LOADING_STATE_TIMEOUT = 100;
var JPEG_MIME_TYPE = "image/jpeg";
var UIStrings3 = {
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
var UIStringsNotTranslate6 = {
  /**
   * @description Announcement text for screen readers when the conversation starts.
   */
  answerLoading: "Answer loading",
  /**
   * @description Announcement text for screen readers when the answer comes.
   */
  answerReady: "Answer ready",
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
   * @description Message displayed in toast in case of any failures while taking a screenshot of the page.
   */
  screenshotFailureMessage: "Failed to take a screenshot. Please try again.",
  /**
   * @description Message displayed in toast in case of any failures while uploading an image file as input.
   */
  uploadImageFailureMessage: "Failed to upload image. Please try again."
};
var str_3 = i18n13.i18n.registerUIStrings("panels/ai_assistance/AiAssistancePanel.ts", UIStrings3);
var i18nString3 = i18n13.i18n.getLocalizedString.bind(void 0, str_3);
var lockedString6 = i18n13.i18n.lockedString;
function selectedElementFilter(maybeNode) {
  if (maybeNode) {
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
        { title: "How do I center this element?", jslogContext: "styling-default" }
      ];
    case "drjones-file":
      return [
        { title: "What does this script do?", jslogContext: "file-default" },
        { title: "Is the script optimized for performance?", jslogContext: "file-default" },
        { title: "Does the script handle user input safely?", jslogContext: "file-default" }
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
    default:
      Platform5.assertNever(conversation.type, "Unknown conversation type");
  }
}
function getMarkdownRenderer(conversation) {
  const context = conversation?.selectedContext;
  if (context instanceof AiAssistanceModel4.PerformanceAgent.PerformanceTraceContext) {
    if (!context.external) {
      const focus = context.getItem();
      return new PerformanceAgentMarkdownRenderer(focus.parsedTrace.data.Meta.mainFrameId, focus.lookupEvent.bind(focus), focus.parsedTrace);
    }
  } else if (conversation?.type === "drjones-performance-full") {
    return new PerformanceAgentMarkdownRenderer();
  }
  return new MarkdownRendererWithCodeBlock();
}
function toolbarView(input) {
  return html11`
    <div class="toolbar-container" role="toolbar" jslog=${VisualLogging7.toolbar()}>
      <devtools-toolbar class="freestyler-left-toolbar" role="presentation">
      ${input.showChatActions ? html11`<devtools-button
          title=${i18nString3(UIStrings3.newChat)}
          aria-label=${i18nString3(UIStrings3.newChat)}
          .iconName=${"plus"}
          .jslogContext=${"freestyler.new-chat"}
          .variant=${"toolbar"}
          @click=${input.onNewChatClick}></devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-menu-button
          title=${i18nString3(UIStrings3.history)}
          aria-label=${i18nString3(UIStrings3.history)}
          .iconName=${"history"}
          .jslogContext=${"freestyler.history"}
          .populateMenuCall=${input.populateHistoryMenu}
        ></devtools-menu-button>` : Lit7.nothing}
        ${input.showActiveConversationActions ? html11`
          <devtools-button
              title=${i18nString3(UIStrings3.deleteChat)}
              aria-label=${i18nString3(UIStrings3.deleteChat)}
              .iconName=${"bin"}
              .jslogContext=${"freestyler.delete"}
              .variant=${"toolbar"}
              @click=${input.onDeleteClick}>
          </devtools-button>
          <devtools-button
            title=${i18nString3(UIStrings3.exportConversation)}
            aria-label=${i18nString3(UIStrings3.exportConversation)}
            .iconName=${"download"}
            .disabled=${input.isLoading}
            .jslogContext=${"export-ai-conversation"}
            .variant=${"toolbar"}
            @click=${input.onExportConversationClick}>
          </devtools-button>` : Lit7.nothing}
      </devtools-toolbar>
      <devtools-toolbar class="freestyler-right-toolbar" role="presentation">
        <devtools-link
          class="toolbar-feedback-link"
          title=${i18nString3(UIStrings3.sendFeedback)}
          href=${AI_ASSISTANCE_SEND_FEEDBACK}
          jslogcontext=${"freestyler.send-feedback"}
        >${i18nString3(UIStrings3.sendFeedback)}</devtools-link>
        <div class="toolbar-divider"></div>
        <devtools-button
          title=${i18nString3(UIStrings3.help)}
          aria-label=${i18nString3(UIStrings3.help)}
          .iconName=${"help"}
          .jslogContext=${"freestyler.help"}
          .variant=${"toolbar"}
          @click=${input.onHelpClick}></devtools-button>
        <devtools-button
          title=${i18nString3(UIStrings3.settings)}
          aria-label=${i18nString3(UIStrings3.settings)}
          .iconName=${"gear"}
          .jslogContext=${"freestyler.settings"}
          .variant=${"toolbar"}
          @click=${input.onSettingsClick}></devtools-button>
        <!-- If the green experiment is enabled, render the artifacts sidebar toggle button -->
        ${GreenDev3.Prototypes.instance().isEnabled("artifactViewer") ? html11`<devtools-button
          title=${i18nString3(UIStrings3.settings)}
          aria-label=${i18nString3(UIStrings3.settings)}
          .iconName=${input.artifactsSidebarVisible ? "left-panel-open" : "left-panel-close"}
          .variant=${"toolbar"}
          @click=${input.onArtifactsSidebarToggle}></devtools-button>` : Lit7.nothing}
      </devtools-toolbar>
    </div>
  `;
}
function defaultView(input, output, target) {
  function renderState() {
    switch (input.state) {
      case "chat-view": {
        return html11`
        <devtools-ai-chat-view
          .props=${input.props}
          ${Lit7.Directives.ref((el) => {
          if (!el || !(el instanceof ChatView)) {
            return;
          }
          output.chatView = el;
        })}
        ></devtools-ai-chat-view>`;
      }
      case "explore-view":
        return html11`<devtools-widget
          class="fill-panel"
          .widgetConfig=${UI9.Widget.widgetConfig(ExploreWidget)}
        ></devtools-widget>`;
      case "disabled-view":
        return html11`<devtools-widget
          class="fill-panel"
          .widgetConfig=${UI9.Widget.widgetConfig(DisabledWidget, input.props)}
        ></devtools-widget>`;
    }
  }
  const panelWithToolbar = html11`
    ${toolbarView(input)}
    <div class="ai-assistance-view-container">${renderState()}</div>`;
  if (GreenDev3.Prototypes.instance().isEnabled("artifactViewer")) {
    Lit7.render(html11`
        <devtools-split-view
          direction="column"
          sidebar-visibility=${input.artifactsSidebarVisible ? "visible" : "hidden"}
          sidebar-position="second"
          sidebar-initial-size="520"
          style="width: 100%;">
          <div slot="main" class="assistance-view-wrapper-with-sidebar">
            ${panelWithToolbar}
          </div>
          <div slot="sidebar">
            <div class="artifacts-toolbar-container" role="toolbar">
              <div>Artifacts Viewer</div>
            </div>
            <devtools-widget
              class="fill-panel"
              .widgetConfig=${UI9.Widget.widgetConfig(ArtifactsViewer)}
            ></devtools-widget>
          </div>
        </devtools-split-view>
      `, target);
  } else {
    Lit7.render(panelWithToolbar, target);
  }
}
function createNodeContext(node) {
  if (!node) {
    return null;
  }
  return new AiAssistanceModel4.StylingAgent.NodeContext(node);
}
function createFileContext(file) {
  if (!file) {
    return null;
  }
  return new AiAssistanceModel4.FileAgent.FileContext(file);
}
function createRequestContext(request) {
  if (!request) {
    return null;
  }
  const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
  return new AiAssistanceModel4.NetworkAgent.RequestContext(request, calculator);
}
function createPerformanceTraceContext(focus) {
  if (!focus) {
    return null;
  }
  return new AiAssistanceModel4.PerformanceAgent.PerformanceTraceContext(focus);
}
var panelInstance;
var AiAssistancePanel = class _AiAssistancePanel extends UI9.Panel.Panel {
  view;
  static panelName = "freestyler";
  // NodeJS debugging does not have Elements panel, thus this action might not exist.
  #toggleSearchElementAction;
  #aidaClient;
  #viewOutput = {};
  #serverSideLoggingEnabled = isAiAssistanceServerSideLoggingEnabled();
  #aiAssistanceEnabledSetting;
  #changeManager = new AiAssistanceModel4.ChangeManager.ChangeManager();
  #mutex = new Common5.Mutex.Mutex();
  #conversation;
  #selectedFile = null;
  #selectedElement = null;
  #selectedPerformanceTrace = null;
  #selectedRequest = null;
  #isArtifactsSidebarOpen = false;
  // Messages displayed in the `ChatView` component.
  #messages = [];
  // Whether the UI should show loading or not.
  #isLoading = false;
  // Stores the availability status of the `AidaClient` and the reason for unavailability, if any.
  #aidaAvailability;
  // Info of the currently logged in user.
  #userInfo;
  #imageInput;
  // Used to disable send button when there is not text input.
  #isTextInputEmpty = true;
  #timelinePanelInstance = null;
  #runAbortController = new AbortController();
  #additionalContextItemsFromFloaty = [];
  constructor(view = defaultView, { aidaClient, aidaAvailability, syncInfo }) {
    super(_AiAssistancePanel.panelName);
    this.view = view;
    this.registerRequiredCSS(aiAssistancePanel_css_default);
    this.#aiAssistanceEnabledSetting = this.#getAiAssistanceEnabledSetting();
    this.#aidaClient = aidaClient;
    this.#aidaAvailability = aidaAvailability;
    this.#userInfo = {
      accountImage: syncInfo.accountImage,
      accountFullName: syncInfo.accountFullName
    };
    if (UI9.ActionRegistry.ActionRegistry.instance().hasAction("elements.toggle-element-search")) {
      this.#toggleSearchElementAction = UI9.ActionRegistry.ActionRegistry.instance().getAction("elements.toggle-element-search");
    }
    AiAssistanceModel4.AiHistoryStorage.AiHistoryStorage.instance().addEventListener("AiHistoryDeleted", this.#onHistoryDeleted, this);
    if (GreenDev3.Prototypes.instance().isEnabled("artifactViewer")) {
      AiAssistanceModel4.ArtifactsManager.ArtifactsManager.instance().addEventListener(AiAssistanceModel4.ArtifactsManager.ArtifactAddedEvent.eventName, this.#onArtifactAdded.bind(this));
    }
  }
  async #getPanelViewInput() {
    const blockedByAge = Root5.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
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
      return {
        state: "chat-view",
        props: {
          additionalFloatyContext: this.#additionalContextItemsFromFloaty,
          blockedByCrossOrigin: this.#conversation.isBlockedByOrigin,
          isLoading: this.#isLoading,
          messages: this.#messages,
          selectedContext: this.#conversation.selectedContext ?? null,
          conversationType: this.#conversation.type,
          isReadOnly: this.#conversation.isReadOnly ?? false,
          changeSummary: this.#getChangeSummary(),
          inspectElementToggled: this.#toggleSearchElementAction?.toggled() ?? false,
          userInfo: this.#userInfo,
          canShowFeedbackForm: this.#serverSideLoggingEnabled,
          multimodalInputEnabled: isAiAssistanceMultimodalInputEnabled() && this.#conversation.type === "freestyler",
          imageInput: this.#imageInput,
          isTextInputDisabled: this.#isTextInputDisabled(),
          emptyStateSuggestions,
          inputPlaceholder: this.#getChatInputPlaceholder(),
          disclaimerText: this.#getDisclaimerText(),
          isTextInputEmpty: this.#isTextInputEmpty,
          changeManager: this.#changeManager,
          uploadImageInputEnabled: isAiAssistanceMultimodalUploadInputEnabled() && this.#conversation.type === "freestyler",
          markdownRenderer,
          isArtifactsSidebarOpen: this.#isArtifactsSidebarOpen,
          onTextSubmit: async (text, imageInput, multimodalInputType) => {
            this.#imageInput = void 0;
            this.#isTextInputEmpty = true;
            Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceQuerySubmitted);
            await this.#startConversation(text, imageInput, multimodalInputType);
          },
          onInspectElementClick: this.#handleSelectElementClick.bind(this),
          onFeedbackSubmit: this.#handleFeedbackSubmit.bind(this),
          onCancelClick: this.#cancel.bind(this),
          onContextClick: this.#handleContextClick.bind(this),
          onNewConversation: this.#handleNewChatRequest.bind(this),
          onTakeScreenshot: isAiAssistanceMultimodalInputEnabled() ? this.#handleTakeScreenshot.bind(this) : void 0,
          onRemoveImageInput: isAiAssistanceMultimodalInputEnabled() ? this.#handleRemoveImageInput.bind(this) : void 0,
          onCopyResponseClick: this.#onCopyResponseClick.bind(this),
          onTextInputChange: this.#handleTextInputChange.bind(this),
          onLoadImage: isAiAssistanceMultimodalUploadInputEnabled() ? this.#handleLoadImage.bind(this) : void 0
        }
      };
    }
    return {
      state: "explore-view"
    };
  }
  #getAiAssistanceEnabledSetting() {
    try {
      return Common5.Settings.moduleSetting("ai-assistance-enabled");
    } catch {
      return;
    }
  }
  static async instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!panelInstance || forceNew) {
      const aidaClient = new Host6.AidaClient.AidaClient();
      const syncInfoPromise = new Promise((resolve) => Host6.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
      const [aidaAvailability, syncInfo] = await Promise.all([Host6.AidaClient.AidaClient.checkAccessPreconditions(), syncInfoPromise]);
      panelInstance = new _AiAssistancePanel(defaultView, { aidaClient, aidaAvailability, syncInfo });
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
    const timelinePanel = UI9.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.TimelinePanel);
    if (timelinePanel === this.#timelinePanelInstance) {
      return;
    }
    this.#timelinePanelInstance?.removeEventListener("IsViewingTrace", this.requestUpdate, this);
    this.#timelinePanelInstance = timelinePanel;
    if (this.#timelinePanelInstance) {
      this.#timelinePanelInstance.addEventListener("IsViewingTrace", this.requestUpdate, this);
    }
  }
  #bindFloatyListener() {
    const additionalContexts = UI9.Context.Context.instance().flavor(UI9.Floaty.FloatyFlavor);
    if (!additionalContexts) {
      return;
    }
    this.#additionalContextItemsFromFloaty = additionalContexts.selectedContexts;
    this.requestUpdate();
  }
  #getDefaultConversationType() {
    const { hostConfig } = Root5.Runtime;
    const viewManager = UI9.ViewManager.ViewManager.instance();
    const isElementsPanelVisible = viewManager.isViewVisible("elements");
    const isNetworkPanelVisible = viewManager.isViewVisible("network");
    const isSourcesPanelVisible = viewManager.isViewVisible("sources");
    const isPerformancePanelVisible = viewManager.isViewVisible("timeline");
    let targetConversationType;
    if (isElementsPanelVisible && hostConfig.devToolsFreestyler?.enabled) {
      targetConversationType = "freestyler";
    } else if (isNetworkPanelVisible && hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
      targetConversationType = "drjones-network-request";
    } else if (isSourcesPanelVisible && hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
      targetConversationType = "drjones-file";
    } else if (isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
      targetConversationType = "drjones-performance-full";
    }
    return targetConversationType;
  }
  // We select the default agent based on the open panels if
  // there isn't any active conversation.
  #selectDefaultAgentIfNeeded() {
    if (this.#conversation && !this.#conversation.isEmpty || this.#isLoading) {
      return;
    }
    const targetConversationType = this.#getDefaultConversationType();
    if (this.#conversation?.type === targetConversationType) {
      return;
    }
    const conversation = targetConversationType ? new AiAssistanceModel4.AiConversation.AiConversation(targetConversationType, [], void 0, false, this.#aidaClient, this.#changeManager) : void 0;
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
          conversation = new AiAssistanceModel4.AiConversation.AiConversation(conversationType, [], void 0, false, this.#aidaClient, this.#changeManager);
        }
      }
      this.#conversation = conversation;
    }
    this.#conversation?.setContext(this.#getConversationContext(this.#conversation));
    this.requestUpdate();
  }
  wasShown() {
    super.wasShown();
    this.#viewOutput.chatView?.restoreScrollPosition();
    this.#viewOutput.chatView?.focusTextInput();
    void this.#handleAidaAvailabilityChange();
    this.#selectedElement = createNodeContext(selectedElementFilter(UI9.Context.Context.instance().flavor(SDK3.DOMModel.DOMNode)));
    this.#selectedRequest = createRequestContext(UI9.Context.Context.instance().flavor(SDK3.NetworkRequest.NetworkRequest));
    this.#selectedPerformanceTrace = createPerformanceTraceContext(UI9.Context.Context.instance().flavor(AiAssistanceModel4.AIContext.AgentFocus));
    this.#selectedFile = createFileContext(UI9.Context.Context.instance().flavor(Workspace6.UISourceCode.UISourceCode));
    this.#updateConversationState(this.#conversation);
    this.#aiAssistanceEnabledSetting?.addChangeListener(this.requestUpdate, this);
    Host6.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged", this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction?.addEventListener("Toggled", this.requestUpdate, this);
    UI9.Context.Context.instance().addFlavorChangeListener(SDK3.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI9.Context.Context.instance().addFlavorChangeListener(SDK3.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI9.Context.Context.instance().addFlavorChangeListener(AiAssistanceModel4.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
    UI9.Context.Context.instance().addFlavorChangeListener(Workspace6.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
    UI9.ViewManager.ViewManager.instance().addEventListener("ViewVisibilityChanged", this.#selectDefaultAgentIfNeeded, this);
    SDK3.TargetManager.TargetManager.instance().addModelListener(SDK3.DOMModel.DOMModel, SDK3.DOMModel.Events.AttrModified, this.#handleDOMNodeAttrChange, this);
    SDK3.TargetManager.TargetManager.instance().addModelListener(SDK3.DOMModel.DOMModel, SDK3.DOMModel.Events.AttrRemoved, this.#handleDOMNodeAttrChange, this);
    SDK3.TargetManager.TargetManager.instance().addModelListener(SDK3.ResourceTreeModel.ResourceTreeModel, SDK3.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    UI9.Context.Context.instance().addFlavorChangeListener(TimelinePanel.TimelinePanel.TimelinePanel, this.#bindTimelineTraceListener, this);
    this.#bindTimelineTraceListener();
    this.#selectDefaultAgentIfNeeded();
    Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistancePanelOpened);
    if (GreenDev3.Prototypes.instance().isEnabled("inDevToolsFloaty")) {
      UI9.Context.Context.instance().addFlavorChangeListener(UI9.Floaty.FloatyFlavor, this.#bindFloatyListener, this);
      this.#bindFloatyListener();
    }
  }
  #onArtifactAdded() {
    if (AiAssistanceModel4.ArtifactsManager.ArtifactsManager.instance().artifacts.length > 0) {
      this.#isArtifactsSidebarOpen = true;
      this.requestUpdate();
    }
  }
  willHide() {
    super.willHide();
    this.#aiAssistanceEnabledSetting?.removeChangeListener(this.requestUpdate, this);
    Host6.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged", this.#handleAidaAvailabilityChange);
    this.#toggleSearchElementAction?.removeEventListener("Toggled", this.requestUpdate, this);
    UI9.Context.Context.instance().removeFlavorChangeListener(SDK3.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI9.Context.Context.instance().removeFlavorChangeListener(SDK3.NetworkRequest.NetworkRequest, this.#handleNetworkRequestFlavorChange);
    UI9.Context.Context.instance().removeFlavorChangeListener(AiAssistanceModel4.AIContext.AgentFocus, this.#handlePerformanceTraceFlavorChange);
    UI9.Context.Context.instance().removeFlavorChangeListener(Workspace6.UISourceCode.UISourceCode, this.#handleUISourceCodeFlavorChange);
    UI9.ViewManager.ViewManager.instance().removeEventListener("ViewVisibilityChanged", this.#selectDefaultAgentIfNeeded, this);
    UI9.Context.Context.instance().removeFlavorChangeListener(TimelinePanel.TimelinePanel.TimelinePanel, this.#bindTimelineTraceListener, this);
    SDK3.TargetManager.TargetManager.instance().removeModelListener(SDK3.DOMModel.DOMModel, SDK3.DOMModel.Events.AttrModified, this.#handleDOMNodeAttrChange, this);
    SDK3.TargetManager.TargetManager.instance().removeModelListener(SDK3.DOMModel.DOMModel, SDK3.DOMModel.Events.AttrRemoved, this.#handleDOMNodeAttrChange, this);
    SDK3.TargetManager.TargetManager.instance().removeModelListener(SDK3.ResourceTreeModel.ResourceTreeModel, SDK3.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    if (this.#timelinePanelInstance) {
      this.#timelinePanelInstance.removeEventListener("IsViewingTrace", this.requestUpdate, this);
      this.#timelinePanelInstance = null;
    }
  }
  #handleAidaAvailabilityChange = async () => {
    const currentAidaAvailability = await Host6.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      const syncInfo = await new Promise((resolve) => Host6.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
      this.#userInfo = {
        accountImage: syncInfo.accountImage,
        accountFullName: syncInfo.accountFullName
      };
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
      this.#selectedRequest = new AiAssistanceModel4.NetworkAgent.RequestContext(ev.data, calculator);
    } else {
      this.#selectedRequest = null;
    }
    this.#updateConversationState(this.#conversation);
  };
  #handlePerformanceTraceFlavorChange = (ev) => {
    if (this.#selectedPerformanceTrace?.getItem() === ev.data) {
      return;
    }
    this.#selectedPerformanceTrace = Boolean(ev.data) ? new AiAssistanceModel4.PerformanceAgent.PerformanceTraceContext(ev.data) : null;
    this.#updateConversationState(this.#conversation);
  };
  #handleUISourceCodeFlavorChange = (ev) => {
    const newFile = ev.data;
    if (!newFile || this.#selectedFile?.getItem() === newFile) {
      return;
    }
    this.#selectedFile = new AiAssistanceModel4.FileAgent.FileContext(ev.data);
    this.#updateConversationState(this.#conversation);
  };
  #onPrimaryPageChanged() {
    if (!this.#imageInput) {
      return;
    }
    this.#imageInput = void 0;
    this.requestUpdate();
  }
  #getChangeSummary() {
    if (!isAiAssistancePatchingEnabled() || !this.#conversation || this.#conversation?.isReadOnly) {
      return;
    }
    return this.#changeManager.formatChangesForPatching(
      this.#conversation.id,
      /* includeSourceLocation= */
      true
    );
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
        void UI9.ViewManager.ViewManager.instance().showView("chrome-ai");
      },
      onArtifactsSidebarToggle: () => {
        this.#isArtifactsSidebarOpen = !this.#isArtifactsSidebarOpen;
        this.requestUpdate();
      },
      artifactsSidebarVisible: this.#isArtifactsSidebarOpen
    };
  }
  async performUpdate() {
    this.view({
      ...this.#getToolbarInput(),
      ...await this.#getPanelViewInput()
    }, this.#viewOutput, this.contentElement);
  }
  #onCopyResponseClick(message) {
    const markdown = getResponseMarkdown(message);
    if (markdown) {
      Host6.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(markdown);
      Snackbars.Snackbar.Snackbar.show({
        message: i18nString3(UIStrings3.responseCopiedToClipboard)
      });
    }
  }
  #handleSelectElementClick() {
    UI9.Context.Context.instance().setFlavor(Common5.ReturnToPanel.ReturnToPanelFlavor, new Common5.ReturnToPanel.ReturnToPanelFlavor(this.panelName));
    void this.#toggleSearchElementAction?.execute();
  }
  #isTextInputDisabled() {
    if (this.#conversation && this.#conversation.isBlockedByOrigin) {
      return true;
    }
    if (!this.#conversation) {
      return true;
    }
    if (!this.#conversation.selectedContext) {
      return true;
    }
    return false;
  }
  #shouldShowChatActions() {
    const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
    const isBlockedByAge = Root5.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
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
      return i18nString3(UIStrings3.followTheSteps);
    }
    if (this.#conversation && this.#conversation.isBlockedByOrigin) {
      return lockedString6(UIStringsNotTranslate6.crossOriginError);
    }
    switch (this.#conversation.type) {
      case "freestyler":
        return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate6.inputPlaceholderForStyling) : lockedString6(UIStringsNotTranslate6.inputPlaceholderForStylingNoContext);
      case "drjones-file":
        return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate6.inputPlaceholderForFile) : lockedString6(UIStringsNotTranslate6.inputPlaceholderForFileNoContext);
      case "drjones-network-request":
        return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate6.inputPlaceholderForNetwork) : lockedString6(UIStringsNotTranslate6.inputPlaceholderForNetworkNoContext);
      case "drjones-performance-full": {
        const perfPanel = UI9.Context.Context.instance().flavor(TimelinePanel.TimelinePanel.TimelinePanel);
        if (perfPanel?.hasActiveTrace()) {
          return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate6.inputPlaceholderForPerformanceTrace) : lockedString6(UIStringsNotTranslate6.inputPlaceholderForPerformanceTraceNoContext);
        }
        return lockedString6(UIStringsNotTranslate6.inputPlaceholderForPerformanceWithNoRecording);
      }
    }
  }
  #getDisclaimerText() {
    if (!this.#conversation || this.#conversation.isReadOnly) {
      return i18nString3(UIStrings3.inputDisclaimerForEmptyState);
    }
    const noLogging = Root5.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root5.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    switch (this.#conversation.type) {
      case "freestyler":
        if (noLogging) {
          return lockedString6(UIStringsNotTranslate6.inputDisclaimerForStylingEnterpriseNoLogging);
        }
        return lockedString6(UIStringsNotTranslate6.inputDisclaimerForStyling);
      case "drjones-file":
        if (noLogging) {
          return lockedString6(UIStringsNotTranslate6.inputDisclaimerForFileEnterpriseNoLogging);
        }
        return lockedString6(UIStringsNotTranslate6.inputDisclaimerForFile);
      case "drjones-network-request":
        if (noLogging) {
          return lockedString6(UIStringsNotTranslate6.inputDisclaimerForNetworkEnterpriseNoLogging);
        }
        return lockedString6(UIStringsNotTranslate6.inputDisclaimerForNetwork);
      // It is deliberate that both Performance agents use the same disclaimer
      // text and this has been approved by Privacy.
      case "drjones-performance-full":
        if (noLogging) {
          return lockedString6(UIStringsNotTranslate6.inputDisclaimerForPerformanceEnterpriseNoLogging);
        }
        return lockedString6(UIStringsNotTranslate6.inputDisclaimerForPerformance);
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
    if (context instanceof AiAssistanceModel4.NetworkAgent.RequestContext) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
        context.getItem(),
        "headers-component"
        /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */
      );
      return Common5.Revealer.reveal(requestLocation);
    }
    if (context instanceof AiAssistanceModel4.FileAgent.FileContext) {
      return Common5.Revealer.reveal(context.getItem().uiLocation(0, 0));
    }
    if (context instanceof AiAssistanceModel4.PerformanceAgent.PerformanceTraceContext) {
      const focus = context.getItem();
      if (focus.callTree) {
        const event = focus.callTree.selectedNode?.event ?? focus.callTree.rootNode.event;
        const revealable = new SDK3.TraceObject.RevealableEvent(event);
        return Common5.Revealer.reveal(revealable);
      }
      if (focus.insight) {
        return Common5.Revealer.reveal(focus.insight);
      }
    }
  }
  #canExecuteQuery() {
    const isBrandedBuild = Boolean(Root5.Runtime.hostConfig.aidaAvailability?.enabled);
    const isBlockedByAge = Boolean(Root5.Runtime.hostConfig.aidaAvailability?.blockedByAge);
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
        Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceOpenedFromElementsPanelFloatingButton);
        targetConversationType = "freestyler";
        break;
      }
      case "freestyler.element-panel-context": {
        Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceOpenedFromElementsPanel);
        targetConversationType = "freestyler";
        break;
      }
      case "drjones.network-floating-button": {
        Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanelFloatingButton);
        targetConversationType = "drjones-network-request";
        break;
      }
      case "drjones.network-panel-context": {
        Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanel);
        targetConversationType = "drjones-network-request";
        break;
      }
      case "drjones.performance-panel-context": {
        Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceOpenedFromPerformancePanelCallTree);
        targetConversationType = "drjones-performance-full";
        break;
      }
      case "drjones.sources-floating-button": {
        Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanelFloatingButton);
        targetConversationType = "drjones-file";
        break;
      }
      case "drjones.sources-panel-context": {
        Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanel);
        targetConversationType = "drjones-file";
        break;
      }
    }
    if (!targetConversationType) {
      return;
    }
    let conversation = this.#conversation;
    if (!this.#conversation || this.#conversation.type !== targetConversationType || this.#conversation.isEmpty) {
      conversation = new AiAssistanceModel4.AiConversation.AiConversation(targetConversationType, [], void 0, false, this.#aidaClient, this.#changeManager);
    }
    this.#updateConversationState(conversation);
    const predefinedPrompt = opts?.["prompt"];
    if (predefinedPrompt && typeof predefinedPrompt === "string") {
      if (!this.#canExecuteQuery()) {
        return;
      }
      this.#imageInput = void 0;
      this.#isTextInputEmpty = true;
      Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.AiAssistanceQuerySubmitted);
      if (this.#conversation && this.#conversation.isBlockedByOrigin) {
        this.#handleNewChatRequest();
      }
      await this.#startConversation(predefinedPrompt);
    } else {
      this.#viewOutput.chatView?.focusTextInput();
    }
  }
  #populateHistoryMenu(contextMenu) {
    const historicalConversations = AiAssistanceModel4.AiHistoryStorage.AiHistoryStorage.instance().getHistory().map((serializedConversation) => AiAssistanceModel4.AiConversation.AiConversation.fromSerializedConversation(serializedConversation));
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
      contextMenu.defaultSection().appendItem(i18nString3(UIStrings3.noPastConversations), () => {
      }, {
        disabled: true
      });
    }
    contextMenu.footerSection().appendItem(i18nString3(UIStrings3.clearChatHistory), () => {
      void AiAssistanceModel4.AiHistoryStorage.AiHistoryStorage.instance().deleteAll();
    }, {
      disabled: historyEmpty
    });
  }
  #onHistoryDeleted() {
    this.#updateConversationState();
  }
  #onDeleteClicked() {
    if (!this.#conversation) {
      return;
    }
    void AiAssistanceModel4.AiHistoryStorage.AiHistoryStorage.instance().deleteHistoryEntry(this.#conversation.id);
    this.#updateConversationState();
    UI9.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.chatDeleted));
  }
  async #onExportConversationClick() {
    if (!this.#conversation) {
      return;
    }
    const markdownContent = this.#conversation.getConversationMarkdown();
    const contentData = new TextUtils.ContentData.ContentData(markdownContent, false, "text/markdown");
    const titleFormatted = Platform5.StringUtilities.toSnakeCase(this.#conversation.title || "");
    const prefix = "devtools_";
    const suffix = ".md";
    const maxTitleLength = 64 - prefix.length - suffix.length;
    let finalTitle = titleFormatted || "conversation";
    if (finalTitle.length > maxTitleLength) {
      finalTitle = finalTitle.substring(0, maxTitleLength);
    }
    const filename = `${prefix}${finalTitle}${suffix}`;
    await Workspace6.FileManager.FileManager.instance().save(filename, contentData, true);
    Workspace6.FileManager.FileManager.instance().close(filename);
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
    UI9.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.newChatCreated));
    if (Annotations.AnnotationRepository.annotationsEnabled()) {
      Annotations.AnnotationRepository.instance().deleteAllAnnotations();
    }
  }
  async #handleTakeScreenshot() {
    const mainTarget = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      throw new Error("Could not find main target");
    }
    const model = mainTarget.model(SDK3.ScreenCaptureModel.ScreenCaptureModel);
    if (!model) {
      throw new Error("Could not find model");
    }
    const showLoadingTimeout = setTimeout(() => {
      this.#imageInput = { isLoading: true };
      this.requestUpdate();
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
      this.requestUpdate();
      void this.updateComplete.then(() => {
        this.#viewOutput.chatView?.focusTextInput();
      });
    } else {
      this.#imageInput = void 0;
      this.requestUpdate();
      Snackbars.Snackbar.Snackbar.show({
        message: lockedString6(UIStringsNotTranslate6.screenshotFailureMessage)
      });
    }
  }
  #handleRemoveImageInput() {
    this.#imageInput = void 0;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#viewOutput.chatView?.focusTextInput();
    });
  }
  #handleTextInputChange(value) {
    const disableSubmit = !value;
    if (disableSubmit !== this.#isTextInputEmpty) {
      this.#isTextInputEmpty = disableSubmit;
      void this.requestUpdate();
    }
  }
  async #handleLoadImage(file) {
    const showLoadingTimeout = setTimeout(() => {
      this.#imageInput = { isLoading: true };
      this.requestUpdate();
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
      Snackbars.Snackbar.Snackbar.show({
        message: lockedString6(UIStringsNotTranslate6.uploadImageFailureMessage)
      });
    }
    clearTimeout(showLoadingTimeout);
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#viewOutput.chatView?.focusTextInput();
    });
  }
  #cancel() {
    this.#runAbortController.abort();
    this.#runAbortController = new AbortController();
  }
  #getConversationContext(conversation) {
    if (!conversation) {
      return null;
    }
    switch (conversation.type) {
      case "freestyler":
        return this.#selectedElement;
      case "drjones-file":
        return this.#selectedFile;
      case "drjones-network-request":
        return this.#selectedRequest;
      case "drjones-performance-full":
        return this.#selectedPerformanceTrace;
    }
  }
  async #startConversation(text, imageInput, multimodalInputType) {
    if (!this.#conversation) {
      return;
    }
    this.#cancel();
    const signal = this.#runAbortController.signal;
    const context = this.#getConversationContext(this.#conversation);
    this.#conversation.setContext(context);
    if (this.#conversation.isBlockedByOrigin) {
      throw new Error("cross-origin context data should not be included");
    }
    if (this.#conversation.isEmpty) {
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.STARTED_AI_CONVERSATION);
    }
    const multimodalInput = isAiAssistanceMultimodalInputEnabled() && imageInput && multimodalInputType ? {
      input: imageInput,
      id: crypto.randomUUID(),
      type: multimodalInputType
    } : void 0;
    void VisualLogging7.logFunctionCall(`start-conversation-${this.#conversation.type}`, "ui");
    await this.#doConversation(this.#conversation.run(text, {
      signal,
      extraContext: this.#additionalContextItemsFromFloaty,
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
        step.sideEffect = void 0;
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
            step.title = data.title;
            step.contextDetails = data.details;
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
            step.sideEffect = {
              onAnswer: (result) => {
                data.confirm(result);
                step.sideEffect = void 0;
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
        }
        if (!this.#conversation?.isReadOnly) {
          this.requestUpdate();
          if (data.type === "context" || data.type === "side-effect") {
            this.#viewOutput.chatView?.scrollToBottom();
          }
          switch (data.type) {
            case "context":
              UI9.ARIAUtils.LiveAnnouncer.status(data.title);
              break;
            case "answer": {
              if (!data.complete && !announcedAnswerLoading) {
                announcedAnswerLoading = true;
                UI9.ARIAUtils.LiveAnnouncer.status(lockedString6(UIStringsNotTranslate6.answerLoading));
              } else if (data.complete && !announcedAnswerReady) {
                announcedAnswerReady = true;
                UI9.ARIAUtils.LiveAnnouncer.status(lockedString6(UIStringsNotTranslate6.answerReady));
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
    } else {
      const step = part.step;
      if (step.title) {
        contentParts.push(`### ${step.title}`);
      }
      if (step.contextDetails) {
        contentParts.push(AiAssistanceModel4.AiConversation.generateContextDetailsMarkdown(step.contextDetails));
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
          const view = UI9.ViewManager.ViewManager.instance().view(AiAssistancePanel.panelName);
          if (!view) {
            return;
          }
          await UI9.ViewManager.ViewManager.instance().showView(AiAssistancePanel.panelName);
          const minDrawerSize = UI9.InspectorView.InspectorView.instance().totalSize() / 4;
          if (UI9.InspectorView.InspectorView.instance().drawerSize() < minDrawerSize) {
            UI9.InspectorView.InspectorView.instance().setDrawerSize(minDrawerSize);
          }
          const widget = await view.widget();
          void widget.handleAction(actionId, opts);
        })();
        return true;
      }
    }
    return false;
  }
};
function isAiAssistanceMultimodalUploadInputEnabled() {
  return isAiAssistanceMultimodalInputEnabled() && Boolean(Root5.Runtime.hostConfig.devToolsFreestyler?.multimodalUploadInput);
}
function isAiAssistanceMultimodalInputEnabled() {
  return Boolean(Root5.Runtime.hostConfig.devToolsFreestyler?.multimodal);
}
function isAiAssistanceServerSideLoggingEnabled() {
  return !Root5.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
export {
  ActionDelegate,
  AiAssistancePanel,
  ChatView,
  DisabledWidget_exports as DisabledWidget,
  ExploreWidget_exports as ExploreWidget,
  MarkdownRendererWithCodeBlock,
  PatchWidget_exports as PatchWidget,
  PerformanceAgentFlameChart,
  SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW,
  SelectWorkspaceDialog,
  UserActionRow_exports as UserActionRow,
  getResponseMarkdown
};
//# sourceMappingURL=ai_assistance.js.map
