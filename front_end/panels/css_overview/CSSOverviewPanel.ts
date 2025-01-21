// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as SDK from "../../core/sdk/sdk.js";
import type * as Protocol from "../../generated/protocol.js";
import * as UI from "../../ui/legacy/legacy.js";
import { item } from "../../ui/visual_logging/visual_logging.js";

import * as CSSOverviewComponents from "./components/components.js";
import cssOverviewStyles from "./cssOverview.css.js";
import {
  type ContrastIssue,
  CSSOverviewCompletedView,
} from "./CSSOverviewCompletedView.js";
import { Events, type OverviewController } from "./CSSOverviewController.js";
import { CSSOverviewModel, type GlobalStyleStats } from "./CSSOverviewModel.js";
import { CSSOverviewProcessingView } from "./CSSOverviewProcessingView.js";
import type { UnusedDeclaration } from "./CSSOverviewUnusedDeclarations.js";

export class CSSOverviewPanel
  extends UI.Panel.Panel
  implements SDK.TargetManager.Observer
{
  // @ts-ignore
  readonly #controller: OverviewController;
  // @ts-ignore
  readonly #startView: CSSOverviewComponents.CSSOverviewStartView.CSSOverviewStartView;
  // @ts-ignore
  readonly #processingView: CSSOverviewProcessingView;
  // @ts-ignore
  readonly #completedView: CSSOverviewCompletedView;
  #model?: CSSOverviewModel;
  #backgroundColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  #textColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  #fillColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  #borderColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  #fontInfo!: Map<
    string,
    Map<string, Map<string, Protocol.DOM.BackendNodeId[]>>
  >;
  #mediaQueries!: Map<string, Protocol.CSS.CSSMedia[]>;
  #unusedDeclarations!: Map<string, UnusedDeclaration[]>;
  #elementCount!: number;
  #globalStyleStats!: GlobalStyleStats;
  #textColorContrastIssues!: Map<string, ContrastIssue[]>;

  constructor(controller: OverviewController) {
    super("css-overview");

    this.contentElement.innerHTML = "<h1>hello event listeners 2</h1>";
    this.updateAlways();
  }

  async waitForContext() {
    let other;
    while (!other) {
      await new Promise((r) => {
        setTimeout(r, 10);
      });
      other = UI.Context.Context.instance().flavor(
        SDK.RuntimeModel.ExecutionContext
      );
    }
    return other;
  }

  private async updateAlways() {
    while (true) {
      try {
        await this.update();
      } catch {
        // we tried
      }
      await new Promise((r) => {
        setTimeout(r, 1000);
      });
    }
  }

  private async getEventListeners(
    executionContext: SDK.RuntimeModel.ExecutionContext,
    runtimeModel: SDK.RuntimeModel.RuntimeModel
  ) {
    const eventTargetRef = await executionContext.evaluate(
      { expression: "EventTarget.prototype" },
      false,
      false
    );
    if ("error" in eventTargetRef) {
      throw new Error(eventTargetRef.error);
    }
    const objectId = eventTargetRef.object.objectId;
    if (!objectId) {
      return;
    }
    const objects = await runtimeModel.queryObjects(eventTargetRef.object);

    if ("error" in objects) {
      throw new Error(objects.error);
    }

    await executionContext.callFunctionOn({
      functionDeclaration: `function(eventTargets){
globalThis.____objects = eventTargets
}
`,
      returnByValue: true,
      arguments: [{ objectId: objects.objects.objectId }],
      awaitPromise: true,
      userGesture: true,
    });

    const listenerCount = await executionContext.evaluate(
      {
        expression: `(() => {
const objects = globalThis.____objects
delete globalThis.____objects

const getAllEventListeners = (nodes) => {
const listenerMap = Object.create(null)
for (const node of nodes) {
  const listeners = getEventListeners(node)
  for (const [key, value] of Object.entries(listeners)) {
    listenerMap[key] ||= 0
    listenerMap[key] += value.length
    listenerMap.z_total ||= 0
    listenerMap.z_total += value.length
  }
}
return listenerMap
}

const listenerMap = getAllEventListeners(objects)
return listenerMap

})()
`,
        includeCommandLineAPI: true,
        returnByValue: true,
      },
      false,
      false
    );
    if ("error" in listenerCount) {
      throw new Error(listenerCount.error);
    }
    const value = listenerCount.object.value;
    return value;
  }

  private toOverview(listeners: any[]) {}

  private async getEventListersDebugger(
    domDebugger: SDK.DOMDebuggerModel.DOMDebuggerModel,
    objectIds: string[]
  ) {
    const promises = [];
    for (const objectId of objectIds) {
      promises.push(
        domDebugger.agent.invoke_getEventListeners({
          objectId: objectId as any,
        })
      );
    }
    const listeners = await Promise.all(promises);
    const listenersFlat = listeners.flatMap((item) => item.listeners);
    const pretty = listenersFlat.map((item) => {
      return {
        type: item.type,
        description: item.handler?.description || "",
      };
    });
    const map = Object.create(null);
    const countMap = Object.create(null);
    for (const item of pretty) {
      const key = `${item.type}:${item.description}`;
      countMap[key] ||= 0;
      countMap[key]++;
      map[key] = item;
    }
    const deduplicated = [];
    for (const [key, value] of Object.entries(map)) {
      const count = countMap[key];
      deduplicated.push({
        // @ts-ignore
        ...value,
        count,
      });
    }
    const sorted = deduplicated.sort((a, b) => b.count - a.count);
    return sorted;
  }

  private async getEventListenersJson(
    executionContext: SDK.RuntimeModel.ExecutionContext,
    runtimeModel: SDK.RuntimeModel.RuntimeModel,
    domDebuggerModel: SDK.DOMDebuggerModel.DOMDebuggerModel
  ) {
    const eventTargetRef = await executionContext.evaluate(
      { expression: "EventTarget.prototype" },
      false,
      false
    );
    if ("error" in eventTargetRef) {
      throw new Error(eventTargetRef.error);
    }
    const objectId = eventTargetRef.object.objectId;
    if (!objectId) {
      console.log("return 1");
      return [];
    }
    const objects = await runtimeModel.queryObjects(eventTargetRef.object);

    if ("error" in objects) {
      throw new Error(objects.error);
    }

    const properties = await objects.objects.getAllProperties(false, false);

    if ("error" in properties) {
      // @ts-ignore
      throw new Error(properties.error);
    }

    if (!properties.properties) {
      throw new Error("no properties");
    }

    const objectIds: string[] =
      properties.properties
        .map((property) => property?.value?.objectId || "")
        .filter(Boolean) || [];
    const listeners = await this.getEventListersDebugger(
      domDebuggerModel,
      objectIds
    );

    return listeners;
  }

  private toViewModel(eventListenerMap: any) {
    const items = [];
    for (const [key, value] of Object.entries(eventListenerMap)) {
      items.push({ key, count: value });
    }
    items.sort((a, b) => {
      // @ts-ignore
      return b.count - a.count;
    });
    return items;
  }

  private useJson = false;

  private toggleJson() {
    this.useJson = !this.useJson;
  }

  private updateDisplay(viewModel: any[], valueJson: any[]) {
    this.contentElement.textContent = "";

    const app = document.createElement("div");
    app.style.display = "flex";
    app.style.flexDirection = "column";
    const header = document.createElement("header");
    header.style.display = "flex";
    header.style.gap = "10px";
    header.style.height = "35px";
    header.style.flexShrink = "0";
    header.style.alignItems = "center";
    const heading = document.createElement("h1");
    heading.style.margin = "0";
    heading.textContent = "Event Listeners";

    const options = document.createElement("div");
    options.style.marginLeft = "auto";
    options.style.padding = "5px";
    options.style.display = "flex";
    options.style.alignItems = "center";
    const label = document.createElement("label");
    label.textContent = "json";
    label.htmlFor = "json";
    const checkbox = document.createElement("input");
    checkbox.checked = this.useJson;
    checkbox.onclick = this.toggleJson.bind(this);
    checkbox.type = "checkbox";
    checkbox.id = "json";
    checkbox.style.width = "20px";
    checkbox.style.height = "20px";
    checkbox.style.appearance = "checkbox";
    options.append(checkbox, label);

    header.append(heading, options);
    app.append(header);

    if (!this.useJson) {
      const table = document.createElement("table");
      table.style.width = "300px";
      const thead = document.createElement("thead");
      const tr = document.createElement("tr");
      const th1 = document.createElement("th");
      th1.textContent = "type";
      const th2 = document.createElement("th");
      th2.textContent = "count";
      tr.append(th1, th2);
      thead.append(tr);
      const tbody = document.createElement("tbody");
      for (const { key, count } of viewModel) {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.style.width = "200px";
        const td2 = document.createElement("td");
        td1.textContent = key;
        td2.textContent = count;
        tr.append(td1, td2);
        tbody.append(tr);
      }
      table.append(thead, tbody);
      app.append(table);
    } else {
      const pre = document.createElement("pre");
      pre.style.overflowY = "auto";
      pre.textContent = JSON.stringify(valueJson, null, 2) + "\n";
      app.append(pre);
    }

    this.contentElement.append(app);
  }

  private async update() {
    const other = await this.waitForContext();
    if (!other) {
      this.contentElement.innerHTML = "no execuetion context";
      return;
    }
    const r = await other.evaluate(
      {
        expression: "1+1",
      },
      true,
      true
    );
    if ("error" in r) {
      throw new Error(r.error);
    }
    const runtimeModel = r.object.runtimeModel();

    const executionContext = runtimeModel.defaultExecutionContext();

    if (!executionContext) {
      this.contentElement.innerHTML = "no execution context";
      return;
    }
    const domDebuggerModel = runtimeModel
      .target()
      .model(SDK.DOMDebuggerModel.DOMDebuggerModel);

    if (!domDebuggerModel) {
      this.contentElement.innerHTML = "no dom debugger model";
      return;
    }
    let value;
    let valueJson: any[] = [];
    let viewModel: any[] = [];
    if (this.useJson) {
      valueJson = await this.getEventListenersJson(
        executionContext,
        runtimeModel,
        domDebuggerModel
      );
    } else {
      value = await this.getEventListeners(executionContext, runtimeModel);
      viewModel = this.toViewModel(value);
    }
    this.updateDisplay(viewModel, valueJson);
  }

  targetAdded(target: SDK.Target.Target): void {
    if (
      target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()
    ) {
      return;
    }
    this.#completedView.initializeModels(target);
    const model = target.model(CSSOverviewModel);
    this.#model = model as CSSOverviewModel;
  }

  targetRemoved(): void {}

  #getModel(): CSSOverviewModel {
    if (!this.#model) {
      throw new Error("Did not retrieve model information yet.");
    }
    return this.#model;
  }

  #reset(): void {
    this.#backgroundColors = new Map();
    this.#textColors = new Map();
    this.#fillColors = new Map();
    this.#borderColors = new Map();
    this.#fontInfo = new Map();
    this.#mediaQueries = new Map();
    this.#unusedDeclarations = new Map();
    this.#elementCount = 0;
    this.#globalStyleStats = {
      styleRules: 0,
      inlineStyles: 0,
      externalSheets: 0,
      stats: {
        // Simple.
        type: 0,
        class: 0,
        id: 0,
        universal: 0,
        attribute: 0,

        // Non-simple.
        nonSimple: 0,
      },
    };
    this.#textColorContrastIssues = new Map();
    this.#renderInitialView();
  }

  #requestNodeHighlight(
    evt: Common.EventTarget.EventTargetEvent<number>
  ): void {
    this.#getModel().highlightNode(evt.data as Protocol.DOM.BackendNodeId);
  }

  #renderInitialView(): void {}

  #renderOverviewStartedView(): void {
    this.#startView.hide();
    this.#completedView.hideWidget();

    this.#processingView.show(this.contentElement);
  }

  #renderOverviewCompletedView(): void {
    this.#startView.hide();
    this.#processingView.hideWidget();

    this.#completedView.show(this.contentElement);
    this.#completedView.setOverviewData({
      backgroundColors: this.#backgroundColors,
      textColors: this.#textColors,
      textColorContrastIssues: this.#textColorContrastIssues,
      fillColors: this.#fillColors,
      borderColors: this.#borderColors,
      globalStyleStats: this.#globalStyleStats,
      fontInfo: this.#fontInfo,
      elementCount: this.#elementCount,
      mediaQueries: this.#mediaQueries,
      unusedDeclarations: this.#unusedDeclarations,
    });
  }

  async #startOverview(): Promise<void> {
    this.#renderOverviewStartedView();

    const model = this.#getModel();
    const [
      globalStyleStats,
      {
        elementCount,
        backgroundColors,
        textColors,
        textColorContrastIssues,
        fillColors,
        borderColors,
        fontInfo,
        unusedDeclarations,
      },
      mediaQueries,
    ] = await Promise.all([
      model.getGlobalStylesheetStats(),
      model.getNodeStyleStats(),
      model.getMediaQueries(),
    ]);

    if (elementCount) {
      this.#elementCount = elementCount;
    }

    if (globalStyleStats) {
      this.#globalStyleStats = globalStyleStats;
    }

    if (mediaQueries) {
      this.#mediaQueries = mediaQueries;
    }

    if (backgroundColors) {
      this.#backgroundColors = backgroundColors;
    }

    if (textColors) {
      this.#textColors = textColors;
    }

    if (textColorContrastIssues) {
      this.#textColorContrastIssues = textColorContrastIssues;
    }

    if (fillColors) {
      this.#fillColors = fillColors;
    }

    if (borderColors) {
      this.#borderColors = borderColors;
    }

    if (fontInfo) {
      this.#fontInfo = fontInfo;
    }

    if (unusedDeclarations) {
      this.#unusedDeclarations = unusedDeclarations;
    }

    this.#controller.dispatchEventToListeners(Events.OVERVIEW_COMPLETED);
  }

  #overviewCompleted(): void {
    this.#renderOverviewCompletedView();
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([cssOverviewStyles]);
  }
}
