var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/panels/ai_assistance/AiAssistancePanel.ts
import "../../ui/kit/kit.js";
import * as Common5 from "../../core/common/common.js";
import * as Host5 from "../../core/host/host.js";
import * as i18n17 from "../../core/i18n/i18n.js";
import * as Platform5 from "../../core/platform/platform.js";
import * as Root4 from "../../core/root/root.js";
import * as SDK6 from "../../core/sdk/sdk.js";
import * as AiAssistanceModel8 from "../../models/ai_assistance/ai_assistance.js";
import * as Badges from "../../models/badges/badges.js";
import * as Workspace4 from "../../models/workspace/workspace.js";
import * as Buttons7 from "../../ui/components/buttons/buttons.js";
import * as Snackbars4 from "../../ui/components/snackbars/snackbars.js";
import * as UIHelpers2 from "../../ui/helpers/helpers.js";
import * as UI9 from "../../ui/legacy/legacy.js";
import * as Lit10 from "../../ui/lit/lit.js";
import * as VisualLogging8 from "../../ui/visual_logging/visual_logging.js";
import * as LighthousePanel2 from "../lighthouse/lighthouse.js";
import * as NetworkForward2 from "../network/forward/forward.js";
import * as NetworkPanel from "../network/network.js";
import * as TimelinePanel2 from "../timeline/timeline.js";

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
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
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

// ../../front_end/panels/ai_assistance/components/AccessibilityAgentMarkdownRenderer.ts
import * as SDK from "../../core/sdk/sdk.js";
import * as AiAssistanceModel2 from "../../models/ai_assistance/ai_assistance.js";
import * as Lit2 from "../../ui/lit/lit.js";
import * as PanelsCommon from "../common/common.js";

// ../../front_end/panels/ai_assistance/components/MarkdownRendererWithCodeBlock.ts
import * as Common from "../../core/common/common.js";
import * as Platform from "../../core/platform/platform.js";
import * as AiAssistanceModel from "../../models/ai_assistance/ai_assistance.js";
import * as Logs from "../../models/logs/logs.js";
import * as MarkdownView from "../../ui/components/markdown_view/markdown_view.js";
import * as Lit from "../../ui/lit/lit.js";
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
      const request = Logs.NetworkLog.NetworkLog.instance().requests().find(
        (req) => req.requestId() === href.substring(5)
      );
      if (request) {
        return this.#revealableLink(request, request.url());
      }
      return html`${fallbackText}`;
    }
    if (href.startsWith("#file-")) {
      const file = AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.getUISourceCodes().find(
        (file2) => AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.get(file2) === Number(href.substring(6))
      );
      if (file) {
        return this.#revealableLink(file, file.name());
      }
      return html`${fallbackText}`;
    }
    return null;
  }
  templateForToken(token) {
    if (token.type === "link") {
      const link3 = this.#renderLink(token.href, token.text);
      if (link3) {
        return link3;
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
        const link3 = this.#renderLink(
          matches[2],
          matches[1]
        );
        if (link3) {
          return link3;
        }
      }
    }
    return super.templateForToken(token);
  }
};

// ../../front_end/panels/ai_assistance/components/AccessibilityAgentMarkdownRenderer.ts
var { html: html2 } = Lit2.StaticHtml;
var { until } = Lit2.Directives;
var AccessibilityAgentMarkdownRenderer = class extends MarkdownRendererWithCodeBlock {
  constructor(mainDocumentURL = "") {
    super();
    this.mainDocumentURL = mainDocumentURL;
  }
  #isSameOrigin(node) {
    const nodeDocumentURL = node.ownerDocument?.documentURL ?? "";
    return AiAssistanceModel2.AiUtils.isSameOrigin(this.mainDocumentURL, nodeDocumentURL);
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
    if (!this.#isSameOrigin(node)) {
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
    if (!this.#isSameOrigin(node)) {
      return;
    }
    const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
    return linkedNode;
  }
};

// ../../front_end/panels/ai_assistance/components/AIv2MarkdownRenderer.ts
import * as Common2 from "../../core/common/common.js";
import * as Platform2 from "../../core/platform/platform.js";
import * as SDK2 from "../../core/sdk/sdk.js";
import * as AiAssistanceModel3 from "../../models/ai_assistance/ai_assistance.js";
import * as Logs2 from "../../models/logs/logs.js";
import * as Trace from "../../models/trace/trace.js";
import * as MarkdownView3 from "../../ui/components/markdown_view/markdown_view.js";
import * as Lit3 from "../../ui/lit/lit.js";
import * as PanelsCommon2 from "../common/common.js";
var { html: html3 } = Lit3.StaticHtml;
var { until: until2 } = Lit3.Directives;
var AIv2MarkdownRenderer = class extends MarkdownView3.MarkdownView.MarkdownInsightRenderer {
  constructor(options = {}) {
    super();
    this.options = options;
  }
  #isSameOrigin(node) {
    if (!this.options.mainDocumentURL) {
      return true;
    }
    const nodeDocumentURL = node.ownerDocument?.documentURL ?? "";
    return AiAssistanceModel3.AiUtils.isSameOrigin(this.options.mainDocumentURL, nodeDocumentURL);
  }
  #revealableLink(revealable, label) {
    return html3`<devtools-link @click=${(e) => {
      e.preventDefault();
      e.stopPropagation();
      void Common2.Revealer.reveal(revealable);
    }}>${Platform2.StringUtilities.trimEndWithMaxLength(label, 100)}</devtools-link>`;
  }
  #renderLink(href, text) {
    const devtoolsLink = this.#renderDevToolsLink(href, text);
    if (devtoolsLink) {
      return devtoolsLink;
    }
    if (href.startsWith("#")) {
      const parsed = this.#parseLink(href);
      if (parsed) {
        const resultPromise = parsed.type === "path" ? this.#linkifyPath(parsed.path, text) : this.#linkifyNode(parsed.nodeId, text);
        return html3`<span>${until2(resultPromise.then((node) => node || text), text)}</span>`;
      }
      if (this.options.lookupTraceEvent) {
        const event = this.options.lookupTraceEvent(href.slice(1));
        if (event) {
          let label = text;
          let title = "";
          if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
            title = event.args.data.url;
          } else {
            label += ` (${event.name})`;
          }
          return html3`<a href="#" draggable=false .title=${title} @click=${(e) => {
            e.stopPropagation();
            void Common2.Revealer.reveal(new SDK2.TraceObject.RevealableEvent(event));
          }}>${label}</a>`;
        }
      }
    }
    return null;
  }
  #renderDevToolsLink(href, fallbackText) {
    if (href.startsWith("#req-")) {
      const request = Logs2.NetworkLog.NetworkLog.instance().requests().find(
        (req) => req.requestId() === href.substring(5)
      );
      if (request) {
        return this.#revealableLink(request, request.url());
      }
      return html3`${fallbackText}`;
    }
    if (href.startsWith("#file-")) {
      const file = AiAssistanceModel3.ListSources.ListSourcesTool.getUISourceCodes().find(
        (file2) => AiAssistanceModel3.ListSources.ListSourcesTool.uiSourceCodeId.get(file2) === Number(href.substring(6))
      );
      if (file) {
        return this.#revealableLink(file, file.name());
      }
      return html3`${fallbackText}`;
    }
    return null;
  }
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
  async #linkifyNode(backendNodeId, label) {
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
    if (this.options.mainFrameId && node.frameId() !== this.options.mainFrameId) {
      return;
    }
    if (!this.#isSameOrigin(node)) {
      return;
    }
    const linkedNode = PanelsCommon2.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
    return linkedNode;
  }
  async #linkifyPath(path, label) {
    const target = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK2.DOMModel.DOMModel);
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
    if (!this.#isSameOrigin(node)) {
      return;
    }
    const linkedNode = PanelsCommon2.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
    return linkedNode;
  }
  templateForToken(token) {
    if (token.type === "link") {
      const link3 = this.#renderLink(token.href, token.text);
      if (link3) {
        return link3;
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
        const link3 = this.#renderLink(
          matches[2],
          matches[1]
        );
        if (link3) {
          return link3;
        }
      }
    }
    return super.templateForToken(token);
  }
};

// ../../front_end/panels/ai_assistance/components/ChatMessage.ts
var ChatMessage_exports = {};
__export(ChatMessage_exports, {
  ChatMessage: () => ChatMessage,
  ChatMessageEntity: () => ChatMessageEntity,
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  getDeduplicatedWidgetsMessage: () => getDeduplicatedWidgetsMessage,
  getWidgetSignature: () => getWidgetSignature,
  renderStep: () => renderStep,
  titleForStep: () => titleForStep
});
import "../../ui/components/markdown_view/markdown_view.js";
import "../../ui/kit/kit.js";
import * as Common3 from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as i18n3 from "../../core/i18n/i18n.js";
import * as Platform3 from "../../core/platform/platform.js";
import * as SDK3 from "../../core/sdk/sdk.js";
import * as TextUtils from "../../core/text_utils/text_utils.js";
import * as AiAssistanceModel5 from "../../models/ai_assistance/ai_assistance.js";
import * as ComputedStyle from "../../models/computed_style/computed_style.js";
import * as Formatter from "../../models/formatter/formatter.js";
import * as Trace2 from "../../models/trace/trace.js";
import * as Workspace from "../../models/workspace/workspace.js";
import * as PanelsCommon3 from "../common/common.js";
import * as TraceBounds from "../../services/trace_bounds/trace_bounds.js";
import * as Marked from "../../third_party/marked/marked.js";
import * as Buttons2 from "../../ui/components/buttons/buttons.js";
import * as Input2 from "../../ui/components/input/input.js";
import * as Snackbars from "../../ui/components/snackbars/snackbars.js";
import * as UIHelpers from "../../ui/helpers/helpers.js";
import * as UI2 from "../../ui/legacy/legacy.js";
import * as Lit5 from "../../ui/lit/lit.js";
import * as VisualLogging2 from "../../ui/visual_logging/visual_logging.js";
import * as Application from "../application/application.js";
import * as Elements from "../elements/elements.js";
import * as Lighthouse from "../lighthouse/lighthouse.js";
import * as NetworkForward from "../network/forward/forward.js";
import * as Network from "../network/network.js";
import * as TimelineComponents from "../timeline/components/components.js";
import * as TimelineInsights from "../timeline/components/insights/insights.js";
import * as Timeline from "../timeline/timeline.js";
import * as TimelineUtils from "../timeline/utils/utils.js";
import { PanelUtils } from "../utils/utils.js";

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

    .action-buttons {
      display: flex;
      align-items: center;
      gap: var(--sys-size-2);
      padding: var(--sys-size-4) 0;
    }

    .vertical-separator {
      height: var(--sys-size-8);
      width: var(--sys-size-1);
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
    font-size: var(--sys-typescale-body4-size);
    word-break: normal;
    overflow-wrap: anywhere;

    &.query {
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

    .ai-css-change {
      margin: var(--sys-size-6) 0;
    }

    .answer-body-wrapper {
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
        border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
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
      border: var(--sys-size-1) solid var(--sys-color-neutral-outline);

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

  .show-all-container {
    padding-bottom: 0;
  }

  .js-code-output {
    devtools-code-block {
      --code-block-max-code-height: 50px;
    }
  }

  .context-details {
    devtools-code-block {
      --code-block-max-code-height: var(--sys-size-19);
    }
  }

  .step {
    width: fit-content;
    background-color: var(--sys-color-surface3);
    border-radius: var(--sys-shape-corner-medium);
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
      border-radius: var(--sys-shape-corner-medium);

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
    border-bottom: var(--sys-size-1) solid var(--sys-color-divider);

    .network-request-header {
      display: flex;
      align-items: center;
      gap: var(--sys-size-5);

      .network-request-icon {
        width: var(--sys-size-13);
        height: var(--sys-size-13);
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--sys-color-surface1);
        border-radius: var(--sys-shape-corner-small);
        border: var(--sys-size-1) solid var(--sys-color-divider);
        overflow: hidden;

        img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        devtools-icon {
          width: var(--sys-size-9);
          height: var(--sys-size-9);
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


  .source-files-details {
    display: contents;

    summary {
      list-style: none;
      cursor: pointer;
      padding: var(--sys-size-3) var(--sys-size-6);
      border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
      border-radius: var(--sys-shape-corner-small);
      color: var(--sys-color-primary);
      width: fit-content;

      &:hover {
        background-color: var(--sys-color-state-hover-on-subtle);
      }
    }

    &[open] summary {
      display: none;
    }
  }

  .network-requests-widget {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-4);
  }

  .storage-breakdown-widget {
    display: flex;
    justify-content: center;
    padding: var(--sys-size-4);
  }
}

/*# sourceURL=${import.meta.resolve("././components/chatMessage.css")} */`;

// ../../front_end/panels/ai_assistance/components/WalkthroughUtils.ts
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
    const action3 = input.isExpanded ? "Hide" : "Show";
    const type = input.hasWidgets ? "AI walkthrough" : "thinking";
    labelBase = `${action3} ${type}`;
  }
  if (input.isLoading) {
    return `Loading: ${labelBase}`;
  }
  const TARGET_LENGTH = 50;
  const { truncatedText, moreCharacters } = smartTruncate(input.prompt, TARGET_LENGTH);
  const promptSuffix = moreCharacters > 0 ? ` (and ${moreCharacters} more characters)` : "";
  return `${labelBase} for prompt ${truncatedText}${promptSuffix}`;
}

// ../../front_end/panels/ai_assistance/components/WalkthroughView.ts
var WalkthroughView_exports = {};
__export(WalkthroughView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  WalkthroughView: () => WalkthroughView,
  walkthroughCloseTitle: () => walkthroughCloseTitle,
  walkthroughTitle: () => walkthroughTitle
});
import * as i18n from "../../core/i18n/i18n.js";
import * as AiAssistanceModel4 from "../../models/ai_assistance/ai_assistance.js";
import * as Buttons from "../../ui/components/buttons/buttons.js";
import * as Input from "../../ui/components/input/input.js";
import * as UI from "../../ui/legacy/legacy.js";
import * as Lit4 from "../../ui/lit/lit.js";
import * as VisualLogging from "../../ui/visual_logging/visual_logging.js";

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
    padding: 0 var(--sys-size-5);
    height: 35px;
    border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
    flex-shrink: 0;
  }

  .walkthrough-title {
    font-size: var(--sys-typescale-body5-size);
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
    font-size: var(--sys-typescale-body5-size);
    color: var(--sys-color-on-surface);
    line-height: 1.4;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--sys-color-on-surface-subtle);
    font-size: var(--sys-typescale-body5-size);
  }

  .inline-wrapper {
    display: flex;
    align-items: center;
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
    border-top: var(--sys-size-1) solid var(--sys-color-divider);
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

// ../../front_end/panels/ai_assistance/components/WalkthroughView.ts
var lockedString = i18n.i18n.lockedString;
var { html: html4, render, Directives: Directives3 } = Lit4;
var { ref } = Directives3;
var SCROLL_ROUND_OFFSET = 2;
var UIStrings = {
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
var str_ = i18n.i18n.registerUIStrings("panels/ai_assistance/components/WalkthroughView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function walkthroughTitle(input) {
  if (input.isLoading) {
    return titleForStep(input.lastStep);
  }
  if (input.hasWidgets) {
    return lockedString(UIStrings.showAgentWalkthrough);
  }
  return lockedString(UIStrings.showThinking);
}
function walkthroughCloseTitle(input) {
  if (input.isInlined) {
    return i18nString(UIStrings.title);
  }
  if (input.hasWidgets) {
    return lockedString(UIStrings.hideAgentWalkthrough);
  }
  return lockedString(UIStrings.hideThinking);
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
  return html4`
    <div class="inline-wrapper" ?data-open=${input.isExpanded} jslog=${VisualLogging.section("walkthrough-container")}>
      <span class="inline-icon">
        ${input.isLoading ? html4`<devtools-spinner aria-label=${lockedString(UIStrings.inProgress)}></devtools-spinner>` : html4`<devtools-icon name=${icon}></devtools-icon>`}
      </span>
      <details class="walkthrough-inline" ?open=${input.isExpanded} @toggle=${onToggle} jslog=${VisualLogging.expand("walkthrough").track({ click: true })}>
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
  return html4`
    <div class="walkthrough-view" jslog=${VisualLogging.section("walkthrough-container")}>
      <div class="walkthrough-header">
         <h2 class="walkthrough-title">${i18nString(UIStrings.title)}</h2>
         <devtools-button
          .data=${{
    variant: Buttons.Button.Variant.TOOLBAR,
    iconName: "cross",
    title: i18nString(UIStrings.close),
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
      ${stepsCount === 0 ? html4`
        <div class="empty-state">
          <p>No walkthrough steps available yet.</p>
        </div>
      ` : Lit4.nothing}
    </div>
  `;
}
var DEFAULT_VIEW = (input, output, target) => {
  const allSteps = input.message?.parts.filter((t) => t.type === "step")?.map((p) => p.step) ?? [];
  const renderableSteps = allSteps.filter((s) => s.state.type !== "needs_approval");
  const stepsOutput = renderableSteps.length > 0 ? html4`
    <div class="steps-container" @scroll=${input.handleScroll} ${ref((el) => {
    output.scrollContainer = el;
  })}>
      <div class="steps-scroll-content" ${ref((el) => {
    output.stepsContainer = el;
  })}>
        ${renderableSteps.map((step, index) => html4`
          <div class="walkthrough-step">
            <span class="step-number">${index + 1}</span>
            <div class="step-wrapper">
              ${renderStep({
    step,
    markdownRenderer: input.markdownRenderer,
    isLast: index === renderableSteps.length - 1
  })}
            </div>
          </div>
        `)}
      </div>
    </div>
  ` : Lit4.nothing;
  render(html4`
    <style>
      ${Input.textInputStyles}
      ${chatMessage_css_default}
      ${walkthroughView_css_default}
    </style>
    ${input.isInlined ? renderInlineWalkthrough(input, stepsOutput, allSteps) : renderSidebarWalkthrough(input, stepsOutput, renderableSteps.length)}`, target);
};
var WalkthroughView = class extends UI.Widget.Widget {
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
  constructor(element, view = DEFAULT_VIEW) {
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
    this.#view(
      {
        isLoading: this.#isLoading,
        markdownRenderer: this.#markdownRenderer,
        onToggle: this.#onToggle,
        onOpen: this.#onOpen,
        isInlined: this.#isInlined,
        isExpanded: this.#isExpanded,
        prompt: this.#prompt,
        message,
        handleScroll: this.#handleScroll
      },
      this.#output,
      this.contentElement
    );
    this.#registerResizeObservers();
    if (this.#pinScrollToBottom && this.#isLoading) {
      this.scrollToBottom();
    }
  }
};

// ../../front_end/panels/ai_assistance/components/ChatMessage.ts
var { html: html5, Directives: { ref: ref2, ifDefined } } = Lit5;
var lockedString2 = i18n3.i18n.lockedString;
var { widget } = UI2.Widget;
var REPORT_URL = "https://crbug.com/508304827";
var SCROLL_ROUNDING_OFFSET = 1;
var UIStringsNotTranslate = {
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
   * @description The error message when the request to the LLM failed for some reason.
   */
  systemError: "Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue. If this keeps happening, update Chrome to the latest version.",
  /**
   * @description The error message when the user is out of quota or rate limited.
   */
  quotaError: "You reached your limit for AI assistance requests. Try again later.",
  /**
   * @description The error message when the LLM gets stuck in a loop (max steps reached).
   */
  maxStepsError: "Seems like I am stuck with the investigation. It would be better if you start over.",
  /**
   * @description The error message when the LLM selects context from a different origin.
   */
  crossOriginError: "I have selected the new context but you will have to start a new chat.",
  /**
   * @description The error message when the request payload is too large.
   */
  payloadTooLargeError: "The request payload is too large. Please try a smaller image or a screenshot.",
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
   * @description Accessible label for the reveal button in the LCP discovery widget.
   */
  revealLcpDiscovery: "Reveal LCP discovery",
  /**
   * @description Accessible label for the reveal button in the layout shift culprits widget.
   */
  revealClsCulprits: "Reveal layout shift culprits",
  /**
   * @description Accessible label for the reveal button in the render-blocking requests widget.
   */
  revealRenderBlockingBreakdown: "Reveal render-blocking requests",
  /**
   * @description Accessible label for the reveal button in the performance summary widget.
   */
  revealPerformanceSummary: "Reveal performance summary",
  /**
   * @description Accessible label for the reveal button in the network track widget.
   */
  revealNetworkActivity: "Reveal network activity",
  /**
   * @description Accessible label for the reveal button in the bottom up thread activity widget.
   */
  revealBottomUpTree: "Reveal bottom-up thread activity",
  /**
   * @description Accessible label for the reveal button in the network dependency tree widget.
   */
  revealNetworkDependencyTree: "Reveal network dependency tree",
  /**
   * @description Accessible label for the reveal button in the 3rd parties widget.
   */
  revealThirdParties: "Reveal 3rd parties",
  /**
   * @description Title for the core web vitals widget.
   */
  coreVitals: "Core Web Vitals",
  /**
   * @description Title for the Lighthouse report widget.
   */
  lighthouseReport: "Lighthouse report",
  /**
   * @description Accessible label for the reveal button in the Lighthouse report widget.
   */
  revealLighthouse: "Reveal Lighthouse report",
  /**
   * @description Title for the Timeline event summary widget.
   */
  timelineEventSummary: "Event summary",
  /**
   * @description Accessible label for the reveal button in the Timeline event summary widget.
   */
  revealTimelineEventSummary: "Reveal event",
  /**
   * @description Title for the LCP breakdown widget.
   */
  lcpBreakdown: "LCP breakdown",
  /**
   * @description Title for the LCP discovery widget.
   */
  lcpDiscovery: "LCP discovery",
  /**
   * @description Title for the layout shift culprits widget.
   */
  clsCulprits: "Layout shift culprits",
  /**
   * @description Title for the render-blocking requests widget.
   */
  renderBlockingBreakdown: "Render-blocking requests",
  /**
   * @description Title for the network dependency tree widget.
   */
  networkDependencyTree: "Network dependency tree",
  /**
   * @description Title for the 3rd parties widget.
   */
  thirdParties: "3rd parties",
  /**
   * @description Title for the performance summary widget.
   */
  performanceSummary: "Performance summary",
  /**
   * @description Title for the network activity summary widget.
   */
  networkActivitySummary: "Network activity",
  /**
   * @description The title of the button that allows exporting the conversation for agents.
   */
  exportForAgents: "Copy to coding agent",
  /**
   * @description Title for the bottom up thread activity widget.
   */
  bottomUpTree: "Bottom-up thread activity",
  /**
   * @description Accessible label for the reveal button in the forced reflow widget.
   */
  revealForcedReflow: "Reveal forced reflow",
  /**
   * @description Title for the forced reflow widget.
   */
  forcedReflow: "Forced reflow",
  /**
   * @description Accessible label for the reveal button in the cache widget.
   */
  revealCache: "Reveal efficient cache lifetimes",
  /**
   * @description Title for the cache widget.
   */
  cache: "Efficient cache lifetimes",
  /**
   * @description Accessible label for the reveal button in the INP breakdown widget.
   */
  revealInpBreakdown: "Reveal INP breakdown",
  /**
   * @description Title for the INP breakdown widget.
   */
  inpBreakdown: "INP breakdown",
  /**
   * @description Accessible label for the reveal button in the document latency widget.
   */
  revealDocumentLatency: "Reveal document latency",
  /**
   * @description Title for the document latency widget.
   */
  documentLatency: "Document latency",
  /**
   * @description Accessible label for the reveal button in the DOM size widget.
   */
  revealDomSize: "Reveal DOM size",
  /**
   * @description Title for the DOM size widget.
   */
  domSize: "DOM size",
  /**
   * @description Accessible label for the reveal button in the duplicated JavaScript widget.
   */
  revealDuplicateJavaScript: "Reveal duplicated JavaScript",
  /**
   * @description Title for the duplicated JavaScript widget.
   */
  duplicateJavaScript: "Duplicated JavaScript",
  /**
   * @description Accessible label for the reveal button in the image delivery widget.
   */
  revealImageDelivery: "Reveal image delivery",
  /**
   * @description Title for the image delivery widget.
   */
  imageDelivery: "Image delivery",
  /**
   * @description Accessible label for the reveal button in the font display widget.
   */
  revealFontDisplay: "Reveal font display",
  /**
   * @description Title for the font display widget.
   */
  fontDisplay: "Font display",
  /**
   * @description Accessible label for the reveal button in the slow CSS selectors widget.
   */
  revealSlowCssSelector: "Reveal slow CSS selectors",
  /**
   * @description Title for the slow CSS selectors widget.
   */
  slowCssSelector: "Slow CSS selectors",
  /**
   * @description Accessible label for the reveal button in the legacy JavaScript widget.
   */
  revealLegacyJavaScript: "Reveal legacy JavaScript",
  /**
   * @description Title for the legacy JavaScript widget.
   */
  legacyJavaScript: "Legacy JavaScript",
  /**
   * @description Accessible label for the reveal button in the viewport optimization widget.
   */
  revealViewport: "Reveal viewport optimization",
  /**
   * @description Title for the viewport optimization widget.
   */
  viewport: "Viewport optimization",
  /**
   * @description Accessible label for the reveal button in the network request general headers widget.
   */
  revealNetworkRequest: "Reveal network request",
  /**
   * @description Title for the network request general headers widget.
   */
  networkRequest: "Network request",
  /**
   * @description Accessible label for the reveal button in the modern HTTP usage widget.
   */
  revealModernHttp: "Reveal modern HTTP usage",
  /**
   * @description Title for the modern HTTP usage widget.
   */
  modernHttp: "Modern HTTP usage",
  /**
   * @description Accessible label for the reveal button in the character set declaration widget.
   */
  revealCharacterSet: "Reveal character set declaration",
  /**
   * @description Title for the character set declaration widget.
   */
  characterSet: "Character set declaration",
  /**
   * @description Title for the network requests list widget.
   */
  networkRequests: "Network requests",
  /**
   * @description Accessible label for the reveal button in the network requests list widget.
   */
  revealFirstNetworkRequest: "Reveal first network request in Network panel",
  /**
   * @description Title for the source files list widget.
   */
  inspectedFileNames: "Inspected file names",
  /**
   * @description Title for the storage breakdown widget.
   */
  storageBreakdown: "Storage breakdown",
  /**
   * @description Accessible label for the reveal button in the storage breakdown widget.
   */
  revealStorageBreakdown: "Reveal storage breakdown in Application panel"
};
var ChatMessageEntity = /* @__PURE__ */ ((ChatMessageEntity2) => {
  ChatMessageEntity2["MODEL"] = "model";
  ChatMessageEntity2["USER"] = "user";
  return ChatMessageEntity2;
})(ChatMessageEntity || {});
var DEFAULT_VIEW2 = (input, output, target) => {
  const message = input.message;
  if (message.entity === "user" /* USER */) {
    const imageInput = message.imageInput && "inlineData" in message.imageInput ? renderImageChatMessage(message.imageInput.inlineData) : Lit5.nothing;
    const messageClasses2 = Lit5.Directives.classMap({
      "chat-message": true,
      query: true,
      "is-last-message": input.isLastMessage,
      "is-first-message": input.isFirstMessage
    });
    Lit5.render(html5`
      <style>${Input2.textInputStyles}</style>
      <style>${chatMessage_css_default}</style>
      <div class="user-query-wrapper">
        <section class=${messageClasses2} jslog=${VisualLogging2.section("question")}>
          ${imageInput}
          <div class="message-content">${renderTextAsMarkdown(message.text, input.markdownRenderer)}</div>
        </section>
      </div>
    `, target);
    return;
  }
  const steps = message.parts.filter((part) => part.type === "step").map((part) => part.step);
  const messageClasses = Lit5.Directives.classMap({
    "chat-message": true,
    answer: true,
    "is-last-message": input.isLastMessage,
    "is-first-message": input.isFirstMessage
  });
  Lit5.render(html5`
    <style>${Input2.textInputStyles}</style>
    <style>${chatMessage_css_default}</style>
    <section class=${messageClasses} jslog=${VisualLogging2.section("answer")}>
      ${renderWalkthroughUI(input, steps)}
      <div class="answer-body-wrapper">
        ${Lit5.Directives.repeat(
    message.parts,
    (_, index) => index,
    (part, index) => {
      const isLastPart = index === message.parts.length - 1;
      if (part.type === "answer") {
        return html5`<p>${renderTextAsMarkdown(part.text, input.markdownRenderer, { animate: !input.isReadOnly && input.isLoading && isLastPart && input.isLastMessage })}</p>`;
      }
      if (part.type === "widget") {
        return html5`${Lit5.Directives.until(renderWidgets(part.widgets, { wrapperClass: "main-widgets-wrapper" }))}`;
      }
      return Lit5.nothing;
    }
  )}
        ${renderError(message)}
        ${input.showActions ? renderActions(input, output) : Lit5.nothing}
      </div>
      ${renderSideEffectStepsUI(input, steps)}
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
    return html5`${text}`;
  }
  return html5`<devtools-markdown-view
    .data=${{ tokens, renderer: markdownRenderer, animationEnabled: animate }}
    ${refFn ? ref2(refFn) : Lit5.nothing}>
  </devtools-markdown-view>`;
}
function titleForStep(step) {
  return step.title ?? `${lockedString2(UIStringsNotTranslate.investigating)}\u2026`;
}
function renderTitle(step) {
  const paused = step.state.type === "needs_approval" ? html5`<span class="paused">${lockedString2(UIStringsNotTranslate.paused)}: </span>` : Lit5.nothing;
  return html5`<h3 class="title" aria-label=${titleForStep(step)}>${paused}${titleForStep(step)}</h3>`;
}
function renderStepCode(step) {
  if (!step.code && !step.output) {
    return Lit5.nothing;
  }
  const codeHeadingText = step.output && step.state.type !== "canceled" ? lockedString2(UIStringsNotTranslate.codeExecuted) : lockedString2(UIStringsNotTranslate.codeToExecute);
  const code = step.code ? html5`<div class="action-result">
      <devtools-code-block
        .code=${step.code.trim()}
        .codeLang=${"js"}
        .displayNotice=${!Boolean(step.output)}
        .header=${codeHeadingText}
        .showCopyButton=${true}
      ></devtools-code-block>
  </div>` : Lit5.nothing;
  const output = step.output ? html5`<div class="js-code-output">
    <devtools-code-block
      .code=${step.output}
      .codeLang=${"js"}
      .displayNotice=${true}
      .header=${lockedString2(UIStringsNotTranslate.dataReturned)}
      .showCopyButton=${false}
    ></devtools-code-block>
  </div>` : Lit5.nothing;
  return html5`<div class="step-code">${code}${output}</div>`;
}
function renderStepDetails({
  step,
  markdownRenderer,
  isLast
}) {
  const sideEffects = isLast && step.state.type === "needs_approval" ? renderSideEffectConfirmationUi(step) : Lit5.nothing;
  const thought = step.thought ? html5`<p>${renderTextAsMarkdown(step.thought, markdownRenderer)}</p>` : Lit5.nothing;
  const contextDetails = step.contextDetails ? html5`${Lit5.Directives.repeat(
    step.contextDetails,
    (contextDetail) => {
      return html5`<div class="context-details">
      <devtools-code-block
        .code=${contextDetail.text}
        .codeLang=${contextDetail.codeLang || ""}
        .displayNotice=${false}
        .header=${contextDetail.title}
        .showCopyButton=${true}
      ></devtools-code-block>
    </div>`;
    }
  )}` : Lit5.nothing;
  return html5`<div class="step-details">
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
  const isExpanded = walkthrough.isExpanded && input.message.id === input.walkthrough.activeSidebarMessage?.id;
  const title = isExpanded ? walkthroughCloseTitle({ hasWidgets: hasOneStepWithWidget }) : walkthroughTitle({
    isLoading: input.isLoading,
    hasWidgets: hasOneStepWithWidget,
    lastStep
  });
  const variant = hasOneStepWithWidget && !input.isLoading ? Buttons2.Button.Variant.TONAL : Buttons2.Button.Variant.TEXT;
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
  return html5`
    <div class=${toggleContainerClasses}>
      ${input.isLoading ? html5`<devtools-spinner></devtools-spinner>` : html5`<devtools-icon name=${icon}></devtools-icon>`}
      <devtools-button
        .variant=${variant}
        .size=${Buttons2.Button.Size.SMALL}
        .title=${lastStep.state.type === "in_progress" ? titleForStep(lastStep) : title}
        .accessibleLabel=${accessibleLabel}
        .jslogContext=${walkthrough.isExpanded ? "ai-hide-walkthrough-sidebar" : "ai-show-walkthrough-sidebar"}
        data-show-walkthrough
        @click=${() => {
    if (walkthrough.activeSidebarMessage?.id === input.message.id && walkthrough.isExpanded) {
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
  const isExpanded = input.walkthrough.isInlined ? input.walkthrough.inlineExpandedMessages.some((m) => m.id === input.message.id) : input.walkthrough.isExpanded && input.walkthrough.activeSidebarMessage?.id === input.message.id;
  const walkthroughInline = input.walkthrough.isInlined ? html5`
    <div class="walkthrough-container">
      ${widget(WalkthroughView, {
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
  return html5`
    ${openWalkThroughSidebarButton}
    ${walkthroughInline}
  `;
}
function renderSideEffectStepsUI(input, steps) {
  const sideEffectSteps = steps.filter((s) => s.state.type === "needs_approval" || s.state.type === "canceled");
  if (sideEffectSteps.length === 0) {
    return Lit5.nothing;
  }
  return html5`
    ${sideEffectSteps.map((step) => html5`
      <div class="side-effect-container">
        ${renderStep({
    step,
    markdownRenderer: input.markdownRenderer,
    isLast: true
  })}
      </div> `)}
  `;
}
function renderStepBadge({ step, isLast }) {
  if (isLast && step.state.type === "in_progress") {
    return html5`<devtools-spinner aria-label=${lockedString2(UIStringsNotTranslate.inProgress)}></devtools-spinner>`;
  }
  let iconName = "checkmark";
  let ariaLabel = lockedString2(UIStringsNotTranslate.completed);
  let role = "button";
  if (step.state.type === "needs_approval") {
    if (!isLast) {
      console.error("A step in needs_approval state must be the last step.");
    }
    role = void 0;
    ariaLabel = lockedString2(UIStringsNotTranslate.paused);
    iconName = "pause-circle";
  } else if (step.state.type === "canceled") {
    ariaLabel = lockedString2(UIStringsNotTranslate.aborted);
    iconName = "cross";
  }
  return html5`<devtools-icon
      class="indicator"
      role=${ifDefined(role)}
      aria-label=${ifDefined(ariaLabel)}
      .name=${iconName}
    ></devtools-icon>`;
}
function renderStep({ step, markdownRenderer, isLast }) {
  const stepClasses = Lit5.Directives.classMap({
    step: true,
    empty: !step.thought && !step.code && !step.contextDetails && step.state.type !== "needs_approval",
    paused: step.state.type === "needs_approval",
    canceled: step.state.type === "canceled"
  });
  return html5`
    <details class=${stepClasses}
      jslog=${VisualLogging2.expand("step").track({ click: true })}
      .open=${step.state.type === "needs_approval"}>
      <summary>
        <div class="summary">
          ${renderStepBadge({ step, isLast })}
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
async function makeStorageBreakdownWidget(widgetData) {
  const target = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
  if (!target) {
    return null;
  }
  const breakdown = widgetData.data.usageBreakdown;
  const total = breakdown.reduce((sum, item) => sum + item.bytes, 0);
  const slices = breakdown.map((item) => {
    const color = Application.StorageView.storagePieColors.get(item.storageType) || "rgb(180, 180, 180)";
    const title = Application.StorageView.StorageView.getStorageTypeNameForWidget(item.storageType);
    return {
      value: item.bytes,
      color,
      title
    };
  });
  const chartData = {
    chartName: lockedString2(UIStringsNotTranslate.storageBreakdown),
    size: 110,
    formatter: (val) => AiAssistanceModel5.UnitFormatters.bytes(val),
    showLegend: true,
    total,
    slices
  };
  const renderedWidget = html5`
    <div class="storage-breakdown-widget">
      <devtools-perf-piechart .data=${chartData}></devtools-perf-piechart>
    </div>
  `;
  return {
    renderedWidget,
    title: lockedString2(UIStringsNotTranslate.storageBreakdown),
    revealable: new Application.StorageView.StorageRevealable(target),
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealStorageBreakdown),
    jslogContext: "storage-breakdown-widget"
  };
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
  const renderedWidget = html5`<devtools-widget
      class="computed-styles-widget" ${widget(Elements.ComputedStyleWidget.ComputedStyleWidget, {
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
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealComputedStyles),
    // clang-format off
    title: html5`
      <span class="computed-style-title-wrapper">
        <span class="computed-style-title-prefix">Computed styles</span>
        <span class="style-class-wrapper">
          (<devtools-widget
            ${widget(PanelsCommon3.DOMLinkifier.DOMNodeLink, {
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
  const renderedWidget = html5`<devtools-widget class="core-vitals-widget" ${widget(TimelineComponents.CWVMetrics.CWVMetrics, { data: widgetData.data, skipBottomBorder: true })}>
  </devtools-widget>`;
  return {
    renderedWidget,
    revealable: new TimelineUtils.Helpers.RevealableCoreVitals(widgetData.data.insightSetKey),
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealCoreWebVitals),
    title: lockedString2(UIStringsNotTranslate.coreVitals),
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
  const renderedWidget = html5`<devtools-widget
      class="styling-preview-widget"
      ${widget(Elements.StandaloneStylesContainer.StandaloneStylesContainer, {
    domNode: domNodeForId,
    filter
  })}>
  </devtools-widget>`;
  return {
    renderedWidget,
    revealable: domNodeForId,
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealStyleProperties),
    title: html5`<devtools-widget
      ${widget(PanelsCommon3.DOMLinkifier.DOMNodeLink, {
      node: domNodeForId
    })}
    ></devtools-widget>`,
    jslogContext: "standalone-styles"
  };
}
var INSIGHT_METADATA = {
  [Trace2.Insights.Types.InsightKeys.LCP_BREAKDOWN]: {
    component: TimelineInsights.LCPBreakdown.LCPBreakdown,
    accessibleLabel: UIStringsNotTranslate.revealLcpBreakdown,
    title: UIStringsNotTranslate.lcpBreakdown,
    jslog: "lcp-breakdown-widget"
  },
  [Trace2.Insights.Types.InsightKeys.RENDER_BLOCKING]: {
    component: TimelineInsights.RenderBlocking.RenderBlocking,
    accessibleLabel: UIStringsNotTranslate.revealRenderBlockingBreakdown,
    title: UIStringsNotTranslate.renderBlockingBreakdown,
    jslog: "render-blocking-widget"
  },
  [Trace2.Insights.Types.InsightKeys.LCP_DISCOVERY]: {
    component: TimelineInsights.LCPDiscovery.LCPDiscovery,
    accessibleLabel: UIStringsNotTranslate.revealLcpDiscovery,
    title: UIStringsNotTranslate.lcpDiscovery,
    jslog: "lcp-discovery-widget"
  },
  [Trace2.Insights.Types.InsightKeys.CLS_CULPRITS]: {
    component: TimelineInsights.CLSCulprits.CLSCulprits,
    accessibleLabel: UIStringsNotTranslate.revealClsCulprits,
    title: UIStringsNotTranslate.clsCulprits,
    jslog: "cls-culprits-widget"
  },
  [Trace2.Insights.Types.InsightKeys.NETWORK_DEPENDENCY_TREE]: {
    component: TimelineInsights.NetworkDependencyTree.NetworkDependencyTree,
    accessibleLabel: UIStringsNotTranslate.revealNetworkDependencyTree,
    title: UIStringsNotTranslate.networkDependencyTree,
    jslog: "network-dependency-tree-widget"
  },
  [Trace2.Insights.Types.InsightKeys.THIRD_PARTIES]: {
    component: TimelineInsights.ThirdParties.ThirdParties,
    accessibleLabel: UIStringsNotTranslate.revealThirdParties,
    title: UIStringsNotTranslate.thirdParties,
    jslog: "third-parties-widget"
  },
  [Trace2.Insights.Types.InsightKeys.FORCED_REFLOW]: {
    component: TimelineInsights.ForcedReflow.ForcedReflow,
    accessibleLabel: UIStringsNotTranslate.revealForcedReflow,
    title: UIStringsNotTranslate.forcedReflow,
    jslog: "forced-reflow-widget"
  },
  [Trace2.Insights.Types.InsightKeys.CACHE]: {
    component: TimelineInsights.Cache.Cache,
    accessibleLabel: UIStringsNotTranslate.revealCache,
    title: UIStringsNotTranslate.cache,
    jslog: "cache-widget"
  },
  [Trace2.Insights.Types.InsightKeys.INP_BREAKDOWN]: {
    component: TimelineInsights.INPBreakdown.INPBreakdown,
    accessibleLabel: UIStringsNotTranslate.revealInpBreakdown,
    title: UIStringsNotTranslate.inpBreakdown,
    jslog: "inp-breakdown-widget"
  },
  [Trace2.Insights.Types.InsightKeys.DOCUMENT_LATENCY]: {
    component: TimelineInsights.DocumentLatency.DocumentLatency,
    accessibleLabel: UIStringsNotTranslate.revealDocumentLatency,
    title: UIStringsNotTranslate.documentLatency,
    jslog: "document-latency-widget"
  },
  [Trace2.Insights.Types.InsightKeys.DOM_SIZE]: {
    component: TimelineInsights.DOMSize.DOMSize,
    accessibleLabel: UIStringsNotTranslate.revealDomSize,
    title: UIStringsNotTranslate.domSize,
    jslog: "dom-size-widget"
  },
  [Trace2.Insights.Types.InsightKeys.DUPLICATE_JAVASCRIPT]: {
    component: TimelineInsights.DuplicatedJavaScript.DuplicatedJavaScript,
    accessibleLabel: UIStringsNotTranslate.revealDuplicateJavaScript,
    title: UIStringsNotTranslate.duplicateJavaScript,
    jslog: "duplicate-javascript-widget"
  },
  [Trace2.Insights.Types.InsightKeys.IMAGE_DELIVERY]: {
    component: TimelineInsights.ImageDelivery.ImageDelivery,
    accessibleLabel: UIStringsNotTranslate.revealImageDelivery,
    title: UIStringsNotTranslate.imageDelivery,
    jslog: "image-delivery-widget"
  },
  [Trace2.Insights.Types.InsightKeys.FONT_DISPLAY]: {
    component: TimelineInsights.FontDisplay.FontDisplay,
    accessibleLabel: UIStringsNotTranslate.revealFontDisplay,
    title: UIStringsNotTranslate.fontDisplay,
    jslog: "font-display-widget"
  },
  [Trace2.Insights.Types.InsightKeys.SLOW_CSS_SELECTOR]: {
    component: TimelineInsights.SlowCSSSelector.SlowCSSSelector,
    accessibleLabel: UIStringsNotTranslate.revealSlowCssSelector,
    title: UIStringsNotTranslate.slowCssSelector,
    jslog: "slow-css-selector-widget"
  },
  [Trace2.Insights.Types.InsightKeys.LEGACY_JAVASCRIPT]: {
    component: TimelineInsights.LegacyJavaScript.LegacyJavaScript,
    accessibleLabel: UIStringsNotTranslate.revealLegacyJavaScript,
    title: UIStringsNotTranslate.legacyJavaScript,
    jslog: "legacy-javascript-widget"
  },
  [Trace2.Insights.Types.InsightKeys.VIEWPORT]: {
    component: TimelineInsights.Viewport.Viewport,
    accessibleLabel: UIStringsNotTranslate.revealViewport,
    title: UIStringsNotTranslate.viewport,
    jslog: "viewport-widget"
  },
  [Trace2.Insights.Types.InsightKeys.MODERN_HTTP]: {
    component: TimelineInsights.ModernHTTP.ModernHTTP,
    accessibleLabel: UIStringsNotTranslate.revealModernHttp,
    title: UIStringsNotTranslate.modernHttp,
    jslog: "modern-http-widget"
  },
  [Trace2.Insights.Types.InsightKeys.CHARACTER_SET]: {
    component: TimelineInsights.CharacterSet.CharacterSet,
    accessibleLabel: UIStringsNotTranslate.revealCharacterSet,
    title: UIStringsNotTranslate.characterSet,
    jslog: "character-set-widget"
  }
};
function renderInsightWidget(component, insight, jslog, accessibleLabel, title, bounds) {
  const renderedWidget = html5`<devtools-widget
    class=${jslog}
    ${widget(component, {
    model: insight,
    minimal: true,
    bounds: bounds ?? null
  })}
  ></devtools-widget>`;
  return {
    renderedWidget,
    revealable: new TimelineUtils.Helpers.RevealableInsight(insight),
    accessibleRevealLabel: lockedString2(accessibleLabel),
    title: lockedString2(title),
    jslogContext: jslog
  };
}
async function makePerfInsightWidget(widgetData) {
  const insightKey = widgetData.data.insight;
  const insight = widgetData.data.insightData;
  const meta = INSIGHT_METADATA[insightKey];
  if (!meta) {
    return null;
  }
  let bounds;
  if (insightKey === Trace2.Insights.Types.InsightKeys.CLS_CULPRITS) {
    const traceBounds = TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.entireTraceBounds;
    if (!traceBounds) {
      return null;
    }
    bounds = traceBounds;
  }
  return renderInsightWidget(meta.component, insight, meta.jslog, meta.accessibleLabel, meta.title, bounds);
}
async function makeBottomUpTimelineTreeWidget(widgetData) {
  const bottomUpRootNode = AiAssistanceModel5.AIQueries.AIQueries.mainThreadActivityBottomUp(
    widgetData.data.bounds,
    widgetData.data.parsedTrace
  );
  if (!bottomUpRootNode) {
    return null;
  }
  const events = bottomUpRootNode.events;
  const startTime = Trace2.Helpers.Timing.microToMilli(widgetData.data.bounds.min);
  const endTime = Trace2.Helpers.Timing.microToMilli(widgetData.data.bounds.max);
  const renderedWidget = html5`<devtools-widget
      class="bottom-up-timeline-tree-widget"
      ${widget(Timeline.TimelineTreeView.BottomUpTimelineTreeView, {
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
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealBottomUpTree),
    title: lockedString2(UIStringsNotTranslate.bottomUpTree),
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
    Common3.Revealer.reveal(response?.revealable).catch((error) => {
      if (!error.message) {
        return;
      }
      Snackbars.Snackbar.Snackbar.show({ message: error.message });
    });
  }
  const classes = Lit5.Directives.classMap({
    "widget-and-revealer-container": true,
    "revealer-only": response.renderedWidget === null
  });
  const revealButton = html5`
    <devtools-button class="widget-reveal-button"
      .variant=${Buttons2.Button.Variant.TEXT}
      .accessibleLabel=${response.accessibleRevealLabel}
      .jslogContext=${"reveal"}
      @click=${onReveal}
    >
      ${response.customRevealTitle ?? lockedString2(UIStringsNotTranslate.reveal)}
      <devtools-icon name='tab-move'></devtools-icon>
    </devtools-button>
  `;
  return html5`
    <div class=${classes} jslog=${ifDefined(response.jslogContext ? VisualLogging2.section(response.jslogContext) : void 0)}>
      ${response.title ? html5`
        <div class="widget-header">
          <h4 class="widget-name">${response.title}</h4>
          <div class="widget-reveal-container">
            ${revealButton}
          </div>
        </div>
      ` : Lit5.nothing}
      ${response.renderedWidget ? html5`
        <div class="widget-content-container">
          ${response.renderedWidget}
        </div>` : Lit5.nothing}
      ${!response.title ? html5`
        <div class="widget-reveal-container">
          ${revealButton}
        </div>
      ` : Lit5.nothing}
    </div>
    `;
}
async function makePerformanceTraceWidget(widgetData) {
  const customRevealTitle = lockedString2(UIStringsNotTranslate.revealTrace);
  return {
    renderedWidget: null,
    title: null,
    revealable: new Timeline.TimelinePanel.ParsedTraceRevealable(widgetData.data.parsedTrace),
    customRevealTitle,
    accessibleRevealLabel: customRevealTitle,
    jslogContext: "performance-trace"
  };
}
async function makeSourceFileWidget(widgetData) {
  const file = widgetData.data.uiSourceCode;
  const customRevealTitle = i18n3.i18n.lockedString(`Show ${file.name()}`);
  return {
    renderedWidget: null,
    title: null,
    revealable: file,
    customRevealTitle,
    accessibleRevealLabel: customRevealTitle,
    jslogContext: "source-file-widget"
  };
}
async function makeSourceCodeWidget(widgetData) {
  const url = widgetData.data.url;
  const filename = url.split("/").pop() || url;
  const line = widgetData.data.line;
  const column = widgetData.data.column;
  const header = line !== void 0 && column !== void 0 ? `${filename}:${line}:${column}` : filename;
  const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
  const lastDotIndex = filename.lastIndexOf(".");
  const fileExtension = lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1) : "";
  let code = widgetData.data.code;
  if (TextUtils.TextUtils.isMinified(code)) {
    const canonicalMimeType = uiSourceCode?.contentType().canonicalMimeType() || "text/javascript";
    const formatted = await Formatter.ScriptFormatter.formatScriptContent(
      Common3.Settings.Settings.instance(),
      canonicalMimeType,
      code,
      "  "
    );
    code = formatted.formattedContent;
  }
  const renderedWidget = html5`
    <devtools-code-block
      class="source-code-widget"
      .displayLimit=${20}
      .code=${code}
      .codeLang=${fileExtension}
      .displayToolbar=${false}
      .displayNotice=${false}
    ></devtools-code-block>
  `;
  return {
    renderedWidget,
    title: lockedString2(header),
    revealable: uiSourceCode,
    accessibleRevealLabel: i18n3.i18n.lockedString(`Show ${filename} in Sources`),
    jslogContext: "source-code-widget"
  };
}
function renderFileRevealButton(file, collapsed) {
  const onReveal = () => {
    void Common3.Revealer.reveal(file);
  };
  const accessibleLabel = i18n3.i18n.lockedString(`Show ${file.fullDisplayName()}`);
  const className = `widget-reveal-button ${collapsed ? "collapsed-file" : "visible-file"}`;
  return html5`
    <devtools-button class=${className}
      .variant=${Buttons2.Button.Variant.TEXT}
      .accessibleLabel=${accessibleLabel}
      .jslogContext=${"reveal"}
      @click=${onReveal}>
      ${file.fullDisplayName()}
      <devtools-icon name='tab-move'></devtools-icon>
    </devtools-button>
  `;
}
async function makeSourceFilesListWidget(widgetData) {
  const files = widgetData.data.uiSourceCodes;
  if (files.length === 0) {
    return null;
  }
  const renderedWidget = html5`
    <div class="source-files-widget">
      ${files.slice(0, 10).map((file) => renderFileRevealButton(
    file,
    /* collapsed */
    false
  ))}
      ${files.length > 10 ? html5`
        <details class="source-files-details">
          <summary class="show-more-summary">${i18n3.i18n.lockedString(`Show all ${files.length} files`)}</summary>
          ${files.slice(10).map((file) => renderFileRevealButton(
    file,
    /* collapsed */
    true
  ))}
        </details> ` : Lit5.nothing}
    </div>`;
  const title = lockedString2(UIStringsNotTranslate.inspectedFileNames);
  return {
    renderedWidget,
    title,
    revealable: files[0],
    accessibleRevealLabel: i18n3.i18n.lockedString("Reveal first file in Sources panel"),
    jslogContext: "source-files-list-widget"
  };
}
var expandedNetworkRequestsWidgets = /* @__PURE__ */ new WeakSet();
async function makeNetworkRequestsListWidget(widgetData) {
  const requests = widgetData.data.requests;
  if (requests.length === 0) {
    return null;
  }
  const isExpanded = expandedNetworkRequestsWidgets.has(widgetData);
  if (isExpanded) {
    expandedNetworkRequestsWidgets.delete(widgetData);
  }
  const displayedRequests = isExpanded ? requests : requests.slice(0, 15);
  const renderedWidget = html5`
    <div class="network-requests-widget">
      <devtools-data-grid striped inline>
        <table>
          <tr>
            <th id="name" weight="4">${i18n3.i18n.lockedString("Name")}</th>
            <th id="status" weight="1">${i18n3.i18n.lockedString("Status")}</th>
            <th id="size" weight="1">${i18n3.i18n.lockedString("Size")}</th>
            <th id="time" weight="1">${i18n3.i18n.lockedString("Time")}</th>
          </tr>
          ${displayedRequests.map((request) => html5`
            <tr>
              <td>${request.name()}</td>
              <td>${request.statusCode}</td>
              <td>${i18n3.ByteUtilities.formatBytesToKb(request.transferSize)}</td>
              <td>${i18n3.TimeUtilities.secondsToString(request.duration)}</td>
            </tr>
          `)}
        </table>
      </devtools-data-grid>
      ${!isExpanded && requests.length > 15 ? html5`
        <div class="show-all-container">
          <button class="show-all-widget-requests-button text-button"
            jslog=${VisualLogging2.action("show-all-widget-requests-button").track({ click: true })}
            @click=${(e) => {
    expandedNetworkRequestsWidgets.add(widgetData);
    const widgetEl = e.target.closest(".widget");
    if (widgetEl) {
      const widget5 = UI2.Widget.Widget.get(widgetEl);
      if (widget5 && widget5.performUpdate) {
        void widget5.performUpdate();
      }
    }
  }}>
            ${i18n3.i18n.lockedString(`Show all ${requests.length} network requests`)}
          </button>
        </div>
      ` : Lit5.nothing}
    </div>
  `;
  return {
    renderedWidget,
    title: lockedString2(UIStringsNotTranslate.networkRequests),
    revealable: requests[0],
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealFirstNetworkRequest),
    jslogContext: "network-requests-list-widget"
  };
}
function renderNetworkRequestPreview(networkRequest) {
  const filename = networkRequest.url.split("/").pop() || networkRequest.url;
  const size = i18n3.ByteUtilities.bytesToString(networkRequest.size);
  const resourceType = Common3.ResourceType.resourceTypes[networkRequest.resourceType];
  const { iconName, color } = PanelUtils.iconDataForResourceType(resourceType);
  const imageUrl = networkRequest.imageContent?.asImagePreviewUrl();
  return html5`
    <div class="network-request-preview">
      <div class="network-request-header">
        <div class="network-request-icon">
          ${resourceType.isImage() && imageUrl ? (
    // only try to render the image if we have a preview URL, else fallback to a coloured square.
    html5`<img src=${imageUrl} alt=${filename} />`
  ) : html5`<devtools-icon name=${iconName} style=${Lit5.Directives.styleMap({ color: color ?? "" })}></devtools-icon>`}
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
  const renderedWidget = html5`
    ${networkRequest ? renderNetworkRequestPreview(networkRequest) : Lit5.nothing}
    <devtools-widget class="dom-tree-widget" ${widget(Elements.ElementsTreeOutline.DOMTreeWidget, {
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
    accessibleRevealLabel: widgetData.data.accessibleRevealLabel,
    title: widgetData.data.title,
    jslogContext: "dom-snapshot"
  };
}
function getWidgetSignature(widget5) {
  switch (widget5.name) {
    case "COMPUTED_STYLES":
      return `${widget5.name}:${widget5.data.backendNodeId}`;
    case "CORE_VITALS":
      return `${widget5.name}:${widget5.data.insightSetKey}`;
    case "STYLE_PROPERTIES":
      return `${widget5.name}:${widget5.data.backendNodeId}:${widget5.data.selector ?? ""}`;
    case "DOM_TREE":
      return `${widget5.name}:${widget5.data.root.backendNodeId()}`;
    case "PERFORMANCE_TRACE":
      return `${widget5.name}`;
    case "PERF_INSIGHT":
      return `${widget5.name}:${widget5.data.insight}:${widget5.data.insightData.insightKey}:${widget5.data.insightData.navigation?.args?.data?.navigationId ?? "no-nav-id"}`;
    case "TIMELINE_RANGE_SUMMARY":
      return `${widget5.name}:${widget5.data.track}:${widget5.data.bounds.min}-${widget5.data.bounds.max}`;
    case "BOTTOM_UP_TREE":
      return `${widget5.name}:${widget5.data.bounds.min}-${widget5.data.bounds.max}`;
    case "NETWORK_TRACK":
      return `${widget5.name}:${widget5.data.bounds.min}-${widget5.data.bounds.max}`;
    case "SOURCE_FILE":
      return `${widget5.name}:${widget5.data.uiSourceCode.url()}`;
    case "SOURCE_FILES_LIST":
      return `${widget5.name}:${widget5.data.uiSourceCodes.map((f) => f.url()).join(",")}`;
    case "LIGHTHOUSE_REPORT":
      return `${widget5.name}:${widget5.data.report.fetchTime}`;
    case "TIMELINE_EVENT_SUMMARY":
      return `${widget5.name}:${widget5.data.event.ts}:${widget5.data.event.name}`;
    case "NETWORK_REQUEST_GENERAL_HEADERS":
      return `${widget5.name}:${widget5.data.request.requestId()}`;
    case "SOURCE_CODE":
      return `${widget5.name}:${widget5.data.url}:${widget5.data.line ?? ""}:${widget5.data.column ?? ""}`;
    case "NETWORK_REQUESTS_LIST":
      return `${widget5.name}:${widget5.data.requests.map((r) => r.requestId()).join(",")}`;
    case "STORAGE_BREAKDOWN":
      return `${widget5.name}:${widget5.data.totalUsageBytes}:${widget5.data.usageBreakdown.map((e) => `${e.storageType}_${e.bytes}`).join(",")}`;
    default:
      Platform3.assertNever(widget5, "Unknown AiAssistanceModel.AiAgent.AiWidget name");
  }
}
function getDeduplicatedWidgetsMessage(message) {
  const seenWidgets = /* @__PURE__ */ new Set();
  const filterWidgets = (widgets) => {
    return widgets.filter((widget5) => {
      const signature = getWidgetSignature(widget5);
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
  if (!widgets || widgets.length === 0) {
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
      case "NETWORK_TRACK":
        response = await makeNetworkTrackWidget(widgetData);
        break;
      case "SOURCE_FILE":
        response = await makeSourceFileWidget(widgetData);
        break;
      case "SOURCE_FILES_LIST":
        response = await makeSourceFilesListWidget(widgetData);
        break;
      case "NETWORK_REQUESTS_LIST":
        response = await makeNetworkRequestsListWidget(widgetData);
        break;
      case "LIGHTHOUSE_REPORT":
        response = await makeLighthouseReportWidget(widgetData);
        break;
      case "TIMELINE_EVENT_SUMMARY":
        response = await makeTimelineEventSummaryWidget(widgetData);
        break;
      case "NETWORK_REQUEST_GENERAL_HEADERS":
        response = await makeNetworkRequestGeneralHeadersWidget(widgetData);
        break;
      case "SOURCE_CODE":
        response = await makeSourceCodeWidget(widgetData);
        break;
      case "STORAGE_BREAKDOWN":
        response = await makeStorageBreakdownWidget(widgetData);
        break;
      default:
        Platform3.assertNever(widgetData, "Unknown AiAssistanceModel.AiAgent.AiWidget name");
    }
    return renderWidgetResponse(response);
  }));
  const renderedItems = ui.filter((item) => item !== Lit5.nothing);
  if (renderedItems.length === 0) {
    return Lit5.nothing;
  }
  if (options.wrapperClass) {
    return html5`<div class=${options.wrapperClass}>${renderedItems}</div>`;
  }
  return html5`${renderedItems}`;
}
function renderSideEffectConfirmationUi(step) {
  if (step.state.type !== "needs_approval") {
    return Lit5.nothing;
  }
  const dialog3 = step.state.sideEffectDialog;
  return html5`<div
    class="side-effect-confirmation"
    jslog=${VisualLogging2.section("side-effect-confirmation")}
  >
    ${dialog3.description ? html5`<p>${dialog3.description}</p>` : Lit5.nothing}
    <div class="side-effect-buttons-container">
      <devtools-button
        .data=${{
    variant: Buttons2.Button.Variant.OUTLINED,
    jslogContext: "decline-execute-code"
  }}
        @click=${() => dialog3.onAnswer(false)}
      >${lockedString2(
    UIStringsNotTranslate.declineActionRequestApproval
  )}</devtools-button>
      <devtools-button
        .data=${{
    variant: Buttons2.Button.Variant.PRIMARY,
    jslogContext: "accept-execute-code",
    iconName: "play"
  }}
        @click=${() => dialog3.onAnswer(true)}
      >${lockedString2(UIStringsNotTranslate.confirmActionRequestApproval)}</devtools-button>
    </div>
  </div>`;
}
function renderError(message) {
  if (message.error) {
    let errorMessage;
    switch (message.error) {
      case AiAssistanceModel5.AiAgent.ErrorType.UNKNOWN:
      case AiAssistanceModel5.AiAgent.ErrorType.BLOCK:
        errorMessage = UIStringsNotTranslate.systemError;
        break;
      case AiAssistanceModel5.AiAgent.ErrorType.QUOTA:
        errorMessage = UIStringsNotTranslate.quotaError;
        break;
      case AiAssistanceModel5.AiAgent.ErrorType.MAX_STEPS:
        errorMessage = UIStringsNotTranslate.maxStepsError;
        break;
      case AiAssistanceModel5.AiAgent.ErrorType.CROSS_ORIGIN:
        errorMessage = UIStringsNotTranslate.crossOriginError;
        break;
      case AiAssistanceModel5.AiAgent.ErrorType.PAYLOAD_TOO_LARGE:
        errorMessage = UIStringsNotTranslate.payloadTooLargeError;
        break;
      case AiAssistanceModel5.AiAgent.ErrorType.ABORT:
        return html5`<p class="aborted" jslog=${VisualLogging2.section("aborted")}>${lockedString2(UIStringsNotTranslate.stoppedResponse)}</p>`;
    }
    return html5`<p class="error" jslog=${VisualLogging2.section("error")}>${lockedString2(errorMessage)}</p>`;
  }
  return Lit5.nothing;
}
function renderImageChatMessage(inlineData) {
  if (inlineData.data === AiAssistanceModel5.AiConversation.NOT_FOUND_IMAGE_DATA) {
    return html5`<div class="unavailable-image" title=${UIStringsNotTranslate.imageUnavailable}>
      <devtools-icon name='file-image'></devtools-icon>
    </div>`;
  }
  const imageUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
  return html5`<devtools-link
      class="image-link" title=${UIStringsNotTranslate.openImageInNewTab}
      href=${imageUrl}
    >
      <img src=${imageUrl} alt=${UIStringsNotTranslate.imageInputSentToTheModel} />
    </devtools-link>`;
}
function renderActions(input, output) {
  return html5`
    <div class="ai-assistance-feedback-row">
      <div class="action-buttons">
        ${input.showRateButtons ? html5`
          <devtools-button
            .data=${{
    variant: Buttons2.Button.Variant.ICON,
    size: Buttons2.Button.Size.SMALL,
    iconName: "thumb-up",
    toggledIconName: "thumb-up-filled",
    toggled: input.currentRating === Host.AidaClient.Rating.POSITIVE,
    toggleType: Buttons2.Button.ToggleType.PRIMARY,
    title: lockedString2(UIStringsNotTranslate.thumbsUp),
    jslogContext: "thumbs-up"
  }}
            @click=${() => input.onRatingClick(Host.AidaClient.Rating.POSITIVE)}
          ></devtools-button>
          <devtools-button
            .data=${{
    variant: Buttons2.Button.Variant.ICON,
    size: Buttons2.Button.Size.SMALL,
    iconName: "thumb-down",
    toggledIconName: "thumb-down-filled",
    toggled: input.currentRating === Host.AidaClient.Rating.NEGATIVE,
    toggleType: Buttons2.Button.ToggleType.PRIMARY,
    title: lockedString2(UIStringsNotTranslate.thumbsDown),
    jslogContext: "thumbs-down"
  }}
            @click=${() => input.onRatingClick(Host.AidaClient.Rating.NEGATIVE)}
          ></devtools-button>
        ` : Lit5.nothing}
        <devtools-button
          .data=${{
    variant: Buttons2.Button.Variant.ICON,
    size: Buttons2.Button.Size.SMALL,
    title: lockedString2(UIStringsNotTranslate.report),
    iconName: "report",
    jslogContext: "report"
  }}
          @click=${input.onReportClick}
        ></devtools-button>
        ${input.onExportClick && input.isLastMessage ? html5`
          <devtools-button
            class="export-for-agents-button"
            .jslogContext=${"ai-export-for-agents"}
            .variant=${Buttons2.Button.Variant.OUTLINED}
            .iconName=${"copy"}
            aria-label=${lockedString2(UIStringsNotTranslate.exportForAgents)}
            @click=${input.onExportClick}
          >${lockedString2(UIStringsNotTranslate.exportForAgents)}</devtools-button>
          ${input.suggestions ? html5`<div class="vertical-separator"></div>` : Lit5.nothing}
        ` : Lit5.nothing}
      </div>
      ${input.suggestions ? html5`<div class="suggestions-container">
        <div class="scroll-button-container left hidden" ${ref2((element) => {
    output.suggestionsLeftScrollButtonContainer = element;
  })}>
          <devtools-button
            class='scroll-button'
            .data=${{
    variant: Buttons2.Button.Variant.ICON,
    size: Buttons2.Button.Size.SMALL,
    iconName: "chevron-left",
    title: lockedString2(UIStringsNotTranslate.scrollToPrevious),
    jslogContext: "chevron-left"
  }}
            @click=${() => input.scrollSuggestionsScrollContainer("left")}
          ></devtools-button>
        </div>
        <div class="suggestions-scroll-container" @scroll=${input.onSuggestionsScrollOrResize} ${ref2((element) => {
    output.suggestionsScrollContainer = element;
  })}>
          ${input.suggestions.map((suggestion) => html5`<devtools-button
            class='suggestion'
            .data=${{
    variant: Buttons2.Button.Variant.OUTLINED,
    title: suggestion,
    jslogContext: "suggestion"
  }}
            @click=${() => input.onSuggestionClick(suggestion)}
          >${suggestion}</devtools-button>`)}
        </div>
        <div class="scroll-button-container right hidden" ${ref2((element) => {
    output.suggestionsRightScrollButtonContainer = element;
  })}>
          <devtools-button
            class='scroll-button'
            .data=${{
    variant: Buttons2.Button.Variant.ICON,
    size: Buttons2.Button.Size.SMALL,
    iconName: "chevron-right",
    title: lockedString2(UIStringsNotTranslate.scrollToNext),
    jslogContext: "chevron-right"
  }}
            @click=${() => input.scrollSuggestionsScrollContainer("right")}
          ></devtools-button>
        </div>
      </div>` : Lit5.nothing}
    </div>
    ${input.isShowingFeedbackForm ? html5`
      <form class="feedback-form" @submit=${input.onSubmit}>
        <div class="feedback-header">
          <h4 class="feedback-title">${lockedString2(
    UIStringsNotTranslate.whyThisRating
  )}</h4>
          <devtools-button
            aria-label=${lockedString2(UIStringsNotTranslate.close)}
            @click=${input.onClose}
            .data=${{
    variant: Buttons2.Button.Variant.ICON,
    iconName: "cross",
    size: Buttons2.Button.Size.SMALL,
    title: lockedString2(UIStringsNotTranslate.close),
    jslogContext: "close"
  }}
          ></devtools-button>
        </div>
        <input
          type="text"
          class="devtools-text-input feedback-input"
          @input=${(event) => input.onInputChange(event.target.value)}
          placeholder=${lockedString2(
    UIStringsNotTranslate.provideFeedbackPlaceholder
  )}
          jslog=${VisualLogging2.textField("feedback").track({ keydown: "Enter" })}
        >
        <span class="feedback-disclaimer">${lockedString2(UIStringsNotTranslate.disclaimer)}</span>
        <div>
          <devtools-button
          aria-label=${lockedString2(UIStringsNotTranslate.submit)}
          .data=${{
    type: "submit",
    disabled: input.isSubmitButtonDisabled,
    variant: Buttons2.Button.Variant.OUTLINED,
    size: Buttons2.Button.Size.SMALL,
    title: lockedString2(UIStringsNotTranslate.submit),
    jslogContext: "send"
  }}
          >${lockedString2(UIStringsNotTranslate.submit)}</devtools-button>
        </div>
      </div>
    </form>
    ` : Lit5.nothing}
  `;
}
var ChatMessage = class extends UI2.Widget.Widget {
  message = { entity: "user" /* USER */, text: "", id: "" };
  isLoading = false;
  isReadOnly = false;
  prompt = "";
  canShowFeedbackForm = false;
  isLastMessage = false;
  isFirstMessage = false;
  markdownRenderer;
  onSuggestionClick = () => {
  };
  onFeedbackSubmit = () => {
  };
  onCopyResponseClick = () => {
  };
  onExportClick = () => {
  };
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
  #suggestionsEvaluateLayoutThrottler = new Common3.Throttler.Throttler(100);
  #feedbackValue = "";
  #currentRating;
  #isShowingFeedbackForm = false;
  #isSubmitButtonDisabled = true;
  #view;
  #viewOutput = {};
  #isObservingSuggestions = false;
  constructor(element, view) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW2;
  }
  wasShown() {
    super.wasShown();
    void this.performUpdate();
    this.#evaluateSuggestionsLayout();
  }
  performUpdate() {
    const message = this.message.entity === "model" /* MODEL */ ? getDeduplicatedWidgetsMessage(this.message) : this.message;
    this.#view(
      {
        message,
        isLoading: this.isLoading,
        isReadOnly: this.isReadOnly,
        canShowFeedbackForm: this.canShowFeedbackForm,
        markdownRenderer: this.markdownRenderer,
        isLastMessage: this.isLastMessage,
        isFirstMessage: this.isFirstMessage,
        prompt: this.prompt,
        onSuggestionClick: this.onSuggestionClick,
        onRatingClick: this.#handleRateClick.bind(this),
        onReportClick: () => UIHelpers.openInNewTab(REPORT_URL),
        onCopyResponseClick: () => {
          if (this.message.entity === "model" /* MODEL */) {
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
        showRateButtons: this.message.entity === "model" /* MODEL */ && !!this.message.rpcId,
        suggestions: this.isLastMessage && this.message.entity === "model" /* MODEL */ && !this.isReadOnly && this.message.parts.at(-1)?.type === "answer" ? this.message.parts.at(-1).suggestions : void 0,
        currentRating: this.#currentRating,
        isShowingFeedbackForm: this.#isShowingFeedbackForm,
        onFeedbackSubmit: this.onFeedbackSubmit,
        walkthrough: this.walkthrough
      },
      this.#viewOutput,
      this.contentElement
    );
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
      if (this.message.entity === "model" /* MODEL */ && this.message.rpcId) {
        this.onFeedbackSubmit(this.message.rpcId, Host.AidaClient.Rating.SENTIMENT_UNSPECIFIED);
      }
      void this.performUpdate();
      return;
    }
    this.#currentRating = rating;
    this.#isShowingFeedbackForm = this.canShowFeedbackForm;
    if (this.message.entity === "model" /* MODEL */ && this.message.rpcId) {
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
    if (this.message.entity === "model" /* MODEL */ && this.message.rpcId) {
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
    let navigationId;
    for (const nav of parsedTrace.data.Meta.mainFrameNavigations) {
      if (nav.ts <= bounds.min) {
        navigationId = nav.args.data?.navigationId;
      } else {
        break;
      }
    }
    const mainThread = AiAssistanceModel5.AIQueries.AIQueries.findMainThread(navigationId, parsedTrace);
    if (mainThread) {
      events = mainThread.entries;
      AiAssistanceModel5.Debug.debugLog(
        `AiAssistanceModel.AiAgent.TimelineRangeSummaryAiWidget found main thread. PID:`,
        mainThread.pid,
        "TID:",
        mainThread.tid,
        "Number of entries:",
        mainThread.entries.length
      );
    }
  }
  if (!events) {
    AiAssistanceModel5.Debug.debugLog(
      `Warning: could not find events for AiAssistanceModel.AiAgent.TimelineRangeSummaryAiWidget`,
      widgetData
    );
    return null;
  }
  const thirdPartyTree = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
  const mapper = Trace2.EntityMapper.EntityMapper.getOrCreate(parsedTrace);
  thirdPartyTree.model = { selectedEvents: events, parsedTrace, entityMapper: mapper };
  thirdPartyTree.activeSelection = Timeline.TimelineSelection.selectionFromRangeMicroSeconds(bounds.min, bounds.max);
  thirdPartyTree.refreshTree(true);
  const template = html5`
    <devtools-widget
      ${widget(TimelineComponents.TimelineRangeSummaryView.TimelineRangeSummaryView, {
    data: {
      parsedTrace,
      events,
      isInAIWidget: true,
      startTime: Trace2.Helpers.Timing.microToMilli(bounds.min),
      endTime: Trace2.Helpers.Timing.microToMilli(bounds.max),
      thirdPartyTreeTemplate: html5`${widget(Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget, {
        maxRows: 10,
        isInAIWidget: true,
        model: {
          selectedEvents: thirdPartyTree.selectedEvents ?? null,
          parsedTrace,
          entityMapper: thirdPartyTree.entityMapper()
        },
        activeSelection: { bounds },
        onBottomUpButtonClicked: (node) => {
          void Common3.Revealer.reveal(new TimelineUtils.Helpers.RevealableBottomUpProfile(bounds, node ?? void 0));
        }
      })}`
    }
  })}
    ></devtools-widget>`;
  return {
    renderedWidget: template,
    revealable: new TimelineUtils.Helpers.RevealableTimeRange(bounds),
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealPerformanceSummary),
    title: lockedString2(UIStringsNotTranslate.performanceSummary),
    jslogContext: "timeline-range-summary"
  };
}
async function makeNetworkTrackWidget(widgetData) {
  const { parsedTrace, bounds } = widgetData.data;
  const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
  const template = html5`
    <devtools-performance-agent-network-track
      .data=${{
    parsedTrace,
    bounds,
    dataProvider
  }}
    ></devtools-performance-agent-network-track>`;
  return {
    renderedWidget: template,
    revealable: new TimelineUtils.Helpers.RevealableTimeRange(bounds),
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealNetworkActivity),
    title: lockedString2(UIStringsNotTranslate.networkActivitySummary),
    jslogContext: "network-track-widget"
  };
}
async function makeLighthouseReportWidget(widgetData) {
  let reportEl = null;
  try {
    reportEl = Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.renderLighthouseScores(widgetData.data.report);
  } catch {
    reportEl = null;
  }
  const snapshotReport = widgetData.data.snapshotReport;
  const revealLighthouseLabel = lockedString2(UIStringsNotTranslate.revealLighthouse);
  const title = reportEl ? lockedString2(UIStringsNotTranslate.lighthouseReport) : null;
  const customRevealTitle = reportEl ? void 0 : revealLighthouseLabel;
  return {
    renderedWidget: reportEl ? html5`<div class="lighthouse-report-widget">${reportEl}</div>` : null,
    revealable: new Lighthouse.LighthousePanel.ActiveLighthouseReport(widgetData.data.report),
    accessibleRevealLabel: revealLighthouseLabel,
    customRevealTitle,
    title,
    jslogContext: snapshotReport ? "lighthouse-snapshot-report-widget" : "lighthouse-report-widget"
  };
}
async function makeTimelineEventSummaryWidget(widgetData) {
  const renderedWidget = html5`<devtools-widget class="timeline-event-summary-widget" ${widget(() => {
    return Timeline.TimelineDetailsView.TimelineDetailsPane.makeEventWidget(
      widgetData.data.event,
      widgetData.data.parsedTrace
    );
  })}></devtools-widget>`;
  return {
    renderedWidget,
    revealable: new SDK3.TraceObject.RevealableEvent(widgetData.data.event),
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealTimelineEventSummary),
    title: lockedString2(UIStringsNotTranslate.timelineEventSummary),
    jslogContext: "timeline-event-summary-widget"
  };
}
async function makeNetworkRequestGeneralHeadersWidget(widgetData) {
  const renderedWidget = html5`<devtools-widget class="network-request-general-headers-widget" ${widget(() => {
    return Network.RequestHeadersView.RequestHeadersView.createGeneralHeadersView(widgetData.data.request);
  })}></devtools-widget>`;
  return {
    renderedWidget,
    revealable: NetworkForward.UIRequestLocation.UIRequestLocation.tab(
      widgetData.data.request,
      NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT
    ),
    accessibleRevealLabel: lockedString2(UIStringsNotTranslate.revealNetworkRequest),
    title: lockedString2(UIStringsNotTranslate.networkRequest),
    jslogContext: "network-request-general-headers-widget"
  };
}

// ../../front_end/panels/ai_assistance/components/ChatView.ts
import "../../ui/components/spinners/spinners.js";
import * as Host3 from "../../core/host/host.js";
import * as i18n9 from "../../core/i18n/i18n.js";
import * as AiAssistanceModel7 from "../../models/ai_assistance/ai_assistance.js";
import * as Buttons5 from "../../ui/components/buttons/buttons.js";
import * as UI5 from "../../ui/legacy/legacy.js";
import { Directives as Directives6, html as html8, render as render5 } from "../../ui/lit/lit.js";

// ../../front_end/panels/ai_assistance/components/ChatInput.ts
var ChatInput_exports = {};
__export(ChatInput_exports, {
  ChatInput: () => ChatInput,
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  MAX_IMAGE_FILE_SIZE_BYTES: () => MAX_IMAGE_FILE_SIZE_BYTES
});
import "../../ui/components/tooltips/tooltips.js";
import * as i18n5 from "../../core/i18n/i18n.js";
import * as SDK4 from "../../core/sdk/sdk.js";

// ../../front_end/generated/protocol.ts
var Accessibility;
((Accessibility2) => {
  let AXValueType;
  ((AXValueType2) => {
    AXValueType2["Boolean"] = "boolean";
    AXValueType2["Tristate"] = "tristate";
    AXValueType2["BooleanOrUndefined"] = "booleanOrUndefined";
    AXValueType2["Idref"] = "idref";
    AXValueType2["IdrefList"] = "idrefList";
    AXValueType2["Integer"] = "integer";
    AXValueType2["Node"] = "node";
    AXValueType2["NodeList"] = "nodeList";
    AXValueType2["Number"] = "number";
    AXValueType2["String"] = "string";
    AXValueType2["ComputedString"] = "computedString";
    AXValueType2["Token"] = "token";
    AXValueType2["TokenList"] = "tokenList";
    AXValueType2["DomRelation"] = "domRelation";
    AXValueType2["Role"] = "role";
    AXValueType2["InternalRole"] = "internalRole";
    AXValueType2["ValueUndefined"] = "valueUndefined";
  })(AXValueType = Accessibility2.AXValueType || (Accessibility2.AXValueType = {}));
  let AXValueSourceType;
  ((AXValueSourceType2) => {
    AXValueSourceType2["Attribute"] = "attribute";
    AXValueSourceType2["Implicit"] = "implicit";
    AXValueSourceType2["Style"] = "style";
    AXValueSourceType2["Contents"] = "contents";
    AXValueSourceType2["Placeholder"] = "placeholder";
    AXValueSourceType2["RelatedElement"] = "relatedElement";
  })(AXValueSourceType = Accessibility2.AXValueSourceType || (Accessibility2.AXValueSourceType = {}));
  let AXValueNativeSourceType;
  ((AXValueNativeSourceType2) => {
    AXValueNativeSourceType2["Description"] = "description";
    AXValueNativeSourceType2["Figcaption"] = "figcaption";
    AXValueNativeSourceType2["Label"] = "label";
    AXValueNativeSourceType2["Labelfor"] = "labelfor";
    AXValueNativeSourceType2["Labelwrapped"] = "labelwrapped";
    AXValueNativeSourceType2["Legend"] = "legend";
    AXValueNativeSourceType2["Rubyannotation"] = "rubyannotation";
    AXValueNativeSourceType2["Tablecaption"] = "tablecaption";
    AXValueNativeSourceType2["Title"] = "title";
    AXValueNativeSourceType2["Other"] = "other";
  })(AXValueNativeSourceType = Accessibility2.AXValueNativeSourceType || (Accessibility2.AXValueNativeSourceType = {}));
  let AXPropertyName;
  ((AXPropertyName2) => {
    AXPropertyName2["Actions"] = "actions";
    AXPropertyName2["Busy"] = "busy";
    AXPropertyName2["Disabled"] = "disabled";
    AXPropertyName2["Editable"] = "editable";
    AXPropertyName2["Focusable"] = "focusable";
    AXPropertyName2["Focused"] = "focused";
    AXPropertyName2["Hidden"] = "hidden";
    AXPropertyName2["HiddenRoot"] = "hiddenRoot";
    AXPropertyName2["Invalid"] = "invalid";
    AXPropertyName2["Keyshortcuts"] = "keyshortcuts";
    AXPropertyName2["Settable"] = "settable";
    AXPropertyName2["Roledescription"] = "roledescription";
    AXPropertyName2["Live"] = "live";
    AXPropertyName2["Atomic"] = "atomic";
    AXPropertyName2["Relevant"] = "relevant";
    AXPropertyName2["Root"] = "root";
    AXPropertyName2["Autocomplete"] = "autocomplete";
    AXPropertyName2["HasPopup"] = "hasPopup";
    AXPropertyName2["Level"] = "level";
    AXPropertyName2["Multiselectable"] = "multiselectable";
    AXPropertyName2["Orientation"] = "orientation";
    AXPropertyName2["Multiline"] = "multiline";
    AXPropertyName2["Readonly"] = "readonly";
    AXPropertyName2["Required"] = "required";
    AXPropertyName2["Valuemin"] = "valuemin";
    AXPropertyName2["Valuemax"] = "valuemax";
    AXPropertyName2["Valuetext"] = "valuetext";
    AXPropertyName2["Checked"] = "checked";
    AXPropertyName2["Expanded"] = "expanded";
    AXPropertyName2["Modal"] = "modal";
    AXPropertyName2["Pressed"] = "pressed";
    AXPropertyName2["Selected"] = "selected";
    AXPropertyName2["Activedescendant"] = "activedescendant";
    AXPropertyName2["Controls"] = "controls";
    AXPropertyName2["Describedby"] = "describedby";
    AXPropertyName2["Details"] = "details";
    AXPropertyName2["Errormessage"] = "errormessage";
    AXPropertyName2["Flowto"] = "flowto";
    AXPropertyName2["Labelledby"] = "labelledby";
    AXPropertyName2["Owns"] = "owns";
    AXPropertyName2["Url"] = "url";
    AXPropertyName2["ActiveFullscreenElement"] = "activeFullscreenElement";
    AXPropertyName2["ActiveModalDialog"] = "activeModalDialog";
    AXPropertyName2["ActiveAriaModalDialog"] = "activeAriaModalDialog";
    AXPropertyName2["AriaHiddenElement"] = "ariaHiddenElement";
    AXPropertyName2["AriaHiddenSubtree"] = "ariaHiddenSubtree";
    AXPropertyName2["EmptyAlt"] = "emptyAlt";
    AXPropertyName2["EmptyText"] = "emptyText";
    AXPropertyName2["InertElement"] = "inertElement";
    AXPropertyName2["InertSubtree"] = "inertSubtree";
    AXPropertyName2["LabelContainer"] = "labelContainer";
    AXPropertyName2["LabelFor"] = "labelFor";
    AXPropertyName2["NotRendered"] = "notRendered";
    AXPropertyName2["NotVisible"] = "notVisible";
    AXPropertyName2["PresentationalRole"] = "presentationalRole";
    AXPropertyName2["ProbablyPresentational"] = "probablyPresentational";
    AXPropertyName2["InactiveCarouselTabContent"] = "inactiveCarouselTabContent";
    AXPropertyName2["Uninteresting"] = "uninteresting";
  })(AXPropertyName = Accessibility2.AXPropertyName || (Accessibility2.AXPropertyName = {}));
})(Accessibility || (Accessibility = {}));
var Animation;
((Animation2) => {
  let AnimationType;
  ((AnimationType2) => {
    AnimationType2["CSSTransition"] = "CSSTransition";
    AnimationType2["CSSAnimation"] = "CSSAnimation";
    AnimationType2["WebAnimation"] = "WebAnimation";
  })(AnimationType = Animation2.AnimationType || (Animation2.AnimationType = {}));
})(Animation || (Animation = {}));
var Audits;
((Audits2) => {
  let CookieExclusionReason;
  ((CookieExclusionReason2) => {
    CookieExclusionReason2["ExcludeSameSiteUnspecifiedTreatedAsLax"] = "ExcludeSameSiteUnspecifiedTreatedAsLax";
    CookieExclusionReason2["ExcludeSameSiteNoneInsecure"] = "ExcludeSameSiteNoneInsecure";
    CookieExclusionReason2["ExcludeSameSiteLax"] = "ExcludeSameSiteLax";
    CookieExclusionReason2["ExcludeSameSiteStrict"] = "ExcludeSameSiteStrict";
    CookieExclusionReason2["ExcludeDomainNonASCII"] = "ExcludeDomainNonASCII";
    CookieExclusionReason2["ExcludeThirdPartyCookieBlockedInFirstPartySet"] = "ExcludeThirdPartyCookieBlockedInFirstPartySet";
    CookieExclusionReason2["ExcludeThirdPartyPhaseout"] = "ExcludeThirdPartyPhaseout";
    CookieExclusionReason2["ExcludePortMismatch"] = "ExcludePortMismatch";
    CookieExclusionReason2["ExcludeSchemeMismatch"] = "ExcludeSchemeMismatch";
  })(CookieExclusionReason = Audits2.CookieExclusionReason || (Audits2.CookieExclusionReason = {}));
  let CookieWarningReason;
  ((CookieWarningReason2) => {
    CookieWarningReason2["WarnSameSiteUnspecifiedCrossSiteContext"] = "WarnSameSiteUnspecifiedCrossSiteContext";
    CookieWarningReason2["WarnSameSiteNoneInsecure"] = "WarnSameSiteNoneInsecure";
    CookieWarningReason2["WarnSameSiteUnspecifiedLaxAllowUnsafe"] = "WarnSameSiteUnspecifiedLaxAllowUnsafe";
    CookieWarningReason2["WarnSameSiteStrictLaxDowngradeStrict"] = "WarnSameSiteStrictLaxDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeStrict"] = "WarnSameSiteStrictCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeLax"] = "WarnSameSiteStrictCrossDowngradeLax";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeStrict"] = "WarnSameSiteLaxCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeLax"] = "WarnSameSiteLaxCrossDowngradeLax";
    CookieWarningReason2["WarnAttributeValueExceedsMaxSize"] = "WarnAttributeValueExceedsMaxSize";
    CookieWarningReason2["WarnDomainNonASCII"] = "WarnDomainNonASCII";
    CookieWarningReason2["WarnThirdPartyPhaseout"] = "WarnThirdPartyPhaseout";
    CookieWarningReason2["WarnCrossSiteRedirectDowngradeChangesInclusion"] = "WarnCrossSiteRedirectDowngradeChangesInclusion";
    CookieWarningReason2["WarnDeprecationTrialMetadata"] = "WarnDeprecationTrialMetadata";
    CookieWarningReason2["WarnThirdPartyCookieHeuristic"] = "WarnThirdPartyCookieHeuristic";
  })(CookieWarningReason = Audits2.CookieWarningReason || (Audits2.CookieWarningReason = {}));
  let CookieOperation;
  ((CookieOperation2) => {
    CookieOperation2["SetCookie"] = "SetCookie";
    CookieOperation2["ReadCookie"] = "ReadCookie";
  })(CookieOperation = Audits2.CookieOperation || (Audits2.CookieOperation = {}));
  let InsightType;
  ((InsightType2) => {
    InsightType2["GitHubResource"] = "GitHubResource";
    InsightType2["GracePeriod"] = "GracePeriod";
    InsightType2["Heuristics"] = "Heuristics";
  })(InsightType = Audits2.InsightType || (Audits2.InsightType = {}));
  let PerformanceIssueType;
  ((PerformanceIssueType2) => {
    PerformanceIssueType2["DocumentCookie"] = "DocumentCookie";
  })(PerformanceIssueType = Audits2.PerformanceIssueType || (Audits2.PerformanceIssueType = {}));
  let MixedContentResolutionStatus;
  ((MixedContentResolutionStatus2) => {
    MixedContentResolutionStatus2["MixedContentBlocked"] = "MixedContentBlocked";
    MixedContentResolutionStatus2["MixedContentAutomaticallyUpgraded"] = "MixedContentAutomaticallyUpgraded";
    MixedContentResolutionStatus2["MixedContentWarning"] = "MixedContentWarning";
  })(MixedContentResolutionStatus = Audits2.MixedContentResolutionStatus || (Audits2.MixedContentResolutionStatus = {}));
  let MixedContentResourceType;
  ((MixedContentResourceType2) => {
    MixedContentResourceType2["Audio"] = "Audio";
    MixedContentResourceType2["Beacon"] = "Beacon";
    MixedContentResourceType2["CSPReport"] = "CSPReport";
    MixedContentResourceType2["Download"] = "Download";
    MixedContentResourceType2["EventSource"] = "EventSource";
    MixedContentResourceType2["Favicon"] = "Favicon";
    MixedContentResourceType2["Font"] = "Font";
    MixedContentResourceType2["Form"] = "Form";
    MixedContentResourceType2["Frame"] = "Frame";
    MixedContentResourceType2["Image"] = "Image";
    MixedContentResourceType2["Import"] = "Import";
    MixedContentResourceType2["JSON"] = "JSON";
    MixedContentResourceType2["Manifest"] = "Manifest";
    MixedContentResourceType2["Ping"] = "Ping";
    MixedContentResourceType2["PluginData"] = "PluginData";
    MixedContentResourceType2["PluginResource"] = "PluginResource";
    MixedContentResourceType2["Prefetch"] = "Prefetch";
    MixedContentResourceType2["Resource"] = "Resource";
    MixedContentResourceType2["Script"] = "Script";
    MixedContentResourceType2["ServiceWorker"] = "ServiceWorker";
    MixedContentResourceType2["SharedWorker"] = "SharedWorker";
    MixedContentResourceType2["SpeculationRules"] = "SpeculationRules";
    MixedContentResourceType2["Stylesheet"] = "Stylesheet";
    MixedContentResourceType2["Track"] = "Track";
    MixedContentResourceType2["Video"] = "Video";
    MixedContentResourceType2["Worker"] = "Worker";
    MixedContentResourceType2["XMLHttpRequest"] = "XMLHttpRequest";
    MixedContentResourceType2["XSLT"] = "XSLT";
  })(MixedContentResourceType = Audits2.MixedContentResourceType || (Audits2.MixedContentResourceType = {}));
  let BlockedByResponseReason;
  ((BlockedByResponseReason2) => {
    BlockedByResponseReason2["CoepFrameResourceNeedsCoepHeader"] = "CoepFrameResourceNeedsCoepHeader";
    BlockedByResponseReason2["CoopSandboxedIFrameCannotNavigateToCoopPage"] = "CoopSandboxedIFrameCannotNavigateToCoopPage";
    BlockedByResponseReason2["CorpNotSameOrigin"] = "CorpNotSameOrigin";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByDip";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip";
    BlockedByResponseReason2["CorpNotSameSite"] = "CorpNotSameSite";
    BlockedByResponseReason2["SRIMessageSignatureMismatch"] = "SRIMessageSignatureMismatch";
  })(BlockedByResponseReason = Audits2.BlockedByResponseReason || (Audits2.BlockedByResponseReason = {}));
  let HeavyAdResolutionStatus;
  ((HeavyAdResolutionStatus2) => {
    HeavyAdResolutionStatus2["HeavyAdBlocked"] = "HeavyAdBlocked";
    HeavyAdResolutionStatus2["HeavyAdWarning"] = "HeavyAdWarning";
  })(HeavyAdResolutionStatus = Audits2.HeavyAdResolutionStatus || (Audits2.HeavyAdResolutionStatus = {}));
  let HeavyAdReason;
  ((HeavyAdReason2) => {
    HeavyAdReason2["NetworkTotalLimit"] = "NetworkTotalLimit";
    HeavyAdReason2["CpuTotalLimit"] = "CpuTotalLimit";
    HeavyAdReason2["CpuPeakLimit"] = "CpuPeakLimit";
  })(HeavyAdReason = Audits2.HeavyAdReason || (Audits2.HeavyAdReason = {}));
  let ContentSecurityPolicyViolationType;
  ((ContentSecurityPolicyViolationType2) => {
    ContentSecurityPolicyViolationType2["KInlineViolation"] = "kInlineViolation";
    ContentSecurityPolicyViolationType2["KEvalViolation"] = "kEvalViolation";
    ContentSecurityPolicyViolationType2["KURLViolation"] = "kURLViolation";
    ContentSecurityPolicyViolationType2["KSRIViolation"] = "kSRIViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesSinkViolation"] = "kTrustedTypesSinkViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesPolicyViolation"] = "kTrustedTypesPolicyViolation";
    ContentSecurityPolicyViolationType2["KWasmEvalViolation"] = "kWasmEvalViolation";
  })(ContentSecurityPolicyViolationType = Audits2.ContentSecurityPolicyViolationType || (Audits2.ContentSecurityPolicyViolationType = {}));
  let SharedArrayBufferIssueType;
  ((SharedArrayBufferIssueType2) => {
    SharedArrayBufferIssueType2["TransferIssue"] = "TransferIssue";
    SharedArrayBufferIssueType2["CreationIssue"] = "CreationIssue";
  })(SharedArrayBufferIssueType = Audits2.SharedArrayBufferIssueType || (Audits2.SharedArrayBufferIssueType = {}));
  let SharedDictionaryError;
  ((SharedDictionaryError2) => {
    SharedDictionaryError2["UseErrorCrossOriginNoCorsRequest"] = "UseErrorCrossOriginNoCorsRequest";
    SharedDictionaryError2["UseErrorDictionaryLoadFailure"] = "UseErrorDictionaryLoadFailure";
    SharedDictionaryError2["UseErrorMatchingDictionaryNotUsed"] = "UseErrorMatchingDictionaryNotUsed";
    SharedDictionaryError2["UseErrorUnexpectedContentDictionaryHeader"] = "UseErrorUnexpectedContentDictionaryHeader";
    SharedDictionaryError2["WriteErrorCossOriginNoCorsRequest"] = "WriteErrorCossOriginNoCorsRequest";
    SharedDictionaryError2["WriteErrorDisallowedBySettings"] = "WriteErrorDisallowedBySettings";
    SharedDictionaryError2["WriteErrorExpiredResponse"] = "WriteErrorExpiredResponse";
    SharedDictionaryError2["WriteErrorFeatureDisabled"] = "WriteErrorFeatureDisabled";
    SharedDictionaryError2["WriteErrorInsufficientResources"] = "WriteErrorInsufficientResources";
    SharedDictionaryError2["WriteErrorInvalidMatchField"] = "WriteErrorInvalidMatchField";
    SharedDictionaryError2["WriteErrorInvalidStructuredHeader"] = "WriteErrorInvalidStructuredHeader";
    SharedDictionaryError2["WriteErrorInvalidTTLField"] = "WriteErrorInvalidTTLField";
    SharedDictionaryError2["WriteErrorNavigationRequest"] = "WriteErrorNavigationRequest";
    SharedDictionaryError2["WriteErrorNoMatchField"] = "WriteErrorNoMatchField";
    SharedDictionaryError2["WriteErrorNonIntegerTTLField"] = "WriteErrorNonIntegerTTLField";
    SharedDictionaryError2["WriteErrorNonListMatchDestField"] = "WriteErrorNonListMatchDestField";
    SharedDictionaryError2["WriteErrorNonSecureContext"] = "WriteErrorNonSecureContext";
    SharedDictionaryError2["WriteErrorNonStringIdField"] = "WriteErrorNonStringIdField";
    SharedDictionaryError2["WriteErrorNonStringInMatchDestList"] = "WriteErrorNonStringInMatchDestList";
    SharedDictionaryError2["WriteErrorInvalidMatchDestList"] = "WriteErrorInvalidMatchDestList";
    SharedDictionaryError2["WriteErrorNonStringMatchField"] = "WriteErrorNonStringMatchField";
    SharedDictionaryError2["WriteErrorNonTokenTypeField"] = "WriteErrorNonTokenTypeField";
    SharedDictionaryError2["WriteErrorRequestAborted"] = "WriteErrorRequestAborted";
    SharedDictionaryError2["WriteErrorShuttingDown"] = "WriteErrorShuttingDown";
    SharedDictionaryError2["WriteErrorTooLongIdField"] = "WriteErrorTooLongIdField";
    SharedDictionaryError2["WriteErrorUnsupportedType"] = "WriteErrorUnsupportedType";
  })(SharedDictionaryError = Audits2.SharedDictionaryError || (Audits2.SharedDictionaryError = {}));
  let SRIMessageSignatureError;
  ((SRIMessageSignatureError2) => {
    SRIMessageSignatureError2["MissingSignatureHeader"] = "MissingSignatureHeader";
    SRIMessageSignatureError2["MissingSignatureInputHeader"] = "MissingSignatureInputHeader";
    SRIMessageSignatureError2["InvalidSignatureHeader"] = "InvalidSignatureHeader";
    SRIMessageSignatureError2["InvalidSignatureInputHeader"] = "InvalidSignatureInputHeader";
    SRIMessageSignatureError2["SignatureHeaderValueIsNotByteSequence"] = "SignatureHeaderValueIsNotByteSequence";
    SRIMessageSignatureError2["SignatureHeaderValueIsParameterized"] = "SignatureHeaderValueIsParameterized";
    SRIMessageSignatureError2["SignatureHeaderValueIsIncorrectLength"] = "SignatureHeaderValueIsIncorrectLength";
    SRIMessageSignatureError2["SignatureInputHeaderMissingLabel"] = "SignatureInputHeaderMissingLabel";
    SRIMessageSignatureError2["SignatureInputHeaderValueNotInnerList"] = "SignatureInputHeaderValueNotInnerList";
    SRIMessageSignatureError2["SignatureInputHeaderValueMissingComponents"] = "SignatureInputHeaderValueMissingComponents";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentType"] = "SignatureInputHeaderInvalidComponentType";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentName"] = "SignatureInputHeaderInvalidComponentName";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidHeaderComponentParameter"] = "SignatureInputHeaderInvalidHeaderComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidDerivedComponentParameter"] = "SignatureInputHeaderInvalidDerivedComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderKeyIdLength"] = "SignatureInputHeaderKeyIdLength";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidParameter"] = "SignatureInputHeaderInvalidParameter";
    SRIMessageSignatureError2["SignatureInputHeaderMissingRequiredParameters"] = "SignatureInputHeaderMissingRequiredParameters";
    SRIMessageSignatureError2["ValidationFailedSignatureExpired"] = "ValidationFailedSignatureExpired";
    SRIMessageSignatureError2["ValidationFailedInvalidLength"] = "ValidationFailedInvalidLength";
    SRIMessageSignatureError2["ValidationFailedSignatureMismatch"] = "ValidationFailedSignatureMismatch";
    SRIMessageSignatureError2["ValidationFailedIntegrityMismatch"] = "ValidationFailedIntegrityMismatch";
    SRIMessageSignatureError2["SignatureBaseUnknownDerivedComponent"] = "SignatureBaseUnknownDerivedComponent";
    SRIMessageSignatureError2["SignatureBaseMissingHeader"] = "SignatureBaseMissingHeader";
    SRIMessageSignatureError2["SignatureBaseInvalidUnencodedDigest"] = "SignatureBaseInvalidUnencodedDigest";
    SRIMessageSignatureError2["SignatureBaseUnsupportedComponent"] = "SignatureBaseUnsupportedComponent";
  })(SRIMessageSignatureError = Audits2.SRIMessageSignatureError || (Audits2.SRIMessageSignatureError = {}));
  let UnencodedDigestError;
  ((UnencodedDigestError2) => {
    UnencodedDigestError2["MalformedDictionary"] = "MalformedDictionary";
    UnencodedDigestError2["UnknownAlgorithm"] = "UnknownAlgorithm";
    UnencodedDigestError2["IncorrectDigestType"] = "IncorrectDigestType";
    UnencodedDigestError2["IncorrectDigestLength"] = "IncorrectDigestLength";
  })(UnencodedDigestError = Audits2.UnencodedDigestError || (Audits2.UnencodedDigestError = {}));
  let ConnectionAllowlistError;
  ((ConnectionAllowlistError2) => {
    ConnectionAllowlistError2["InvalidHeader"] = "InvalidHeader";
    ConnectionAllowlistError2["MoreThanOneList"] = "MoreThanOneList";
    ConnectionAllowlistError2["ItemNotInnerList"] = "ItemNotInnerList";
    ConnectionAllowlistError2["InvalidAllowlistItemType"] = "InvalidAllowlistItemType";
    ConnectionAllowlistError2["ReportingEndpointNotToken"] = "ReportingEndpointNotToken";
    ConnectionAllowlistError2["InvalidUrlPattern"] = "InvalidUrlPattern";
    ConnectionAllowlistError2["IFrameAttributeLoosensEmbeddingRequirement"] = "IFrameAttributeLoosensEmbeddingRequirement";
    ConnectionAllowlistError2["InvalidAllowConnectionAllowlistFrom"] = "InvalidAllowConnectionAllowlistFrom";
    ConnectionAllowlistError2["EmbeddingRequirementNotSatisfied"] = "EmbeddingRequirementNotSatisfied";
  })(ConnectionAllowlistError = Audits2.ConnectionAllowlistError || (Audits2.ConnectionAllowlistError = {}));
  let GenericIssueErrorType;
  ((GenericIssueErrorType2) => {
    GenericIssueErrorType2["FormLabelForNameError"] = "FormLabelForNameError";
    GenericIssueErrorType2["FormDuplicateIdForInputError"] = "FormDuplicateIdForInputError";
    GenericIssueErrorType2["FormInputWithNoLabelError"] = "FormInputWithNoLabelError";
    GenericIssueErrorType2["FormAutocompleteAttributeEmptyError"] = "FormAutocompleteAttributeEmptyError";
    GenericIssueErrorType2["FormEmptyIdAndNameAttributesForInputError"] = "FormEmptyIdAndNameAttributesForInputError";
    GenericIssueErrorType2["FormAriaLabelledByToNonExistingIdError"] = "FormAriaLabelledByToNonExistingIdError";
    GenericIssueErrorType2["FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = "FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
    GenericIssueErrorType2["FormLabelHasNeitherForNorNestedInputError"] = "FormLabelHasNeitherForNorNestedInputError";
    GenericIssueErrorType2["FormLabelForMatchesNonExistingIdError"] = "FormLabelForMatchesNonExistingIdError";
    GenericIssueErrorType2["FormInputHasWrongButWellIntendedAutocompleteValueError"] = "FormInputHasWrongButWellIntendedAutocompleteValueError";
    GenericIssueErrorType2["ResponseWasBlockedByORB"] = "ResponseWasBlockedByORB";
    GenericIssueErrorType2["NavigationEntryMarkedSkippable"] = "NavigationEntryMarkedSkippable";
    GenericIssueErrorType2["BackUINavigationWouldSkipAd"] = "BackUINavigationWouldSkipAd";
    GenericIssueErrorType2["AutofillAndManualTextPolicyControlledFeaturesInfo"] = "AutofillAndManualTextPolicyControlledFeaturesInfo";
    GenericIssueErrorType2["AutofillPolicyControlledFeatureInfo"] = "AutofillPolicyControlledFeatureInfo";
    GenericIssueErrorType2["ManualTextPolicyControlledFeatureInfo"] = "ManualTextPolicyControlledFeatureInfo";
    GenericIssueErrorType2["FormModelContextParameterMissingTitleAndDescription"] = "FormModelContextParameterMissingTitleAndDescription";
    GenericIssueErrorType2["FormModelContextMissingToolName"] = "FormModelContextMissingToolName";
    GenericIssueErrorType2["FormModelContextMissingToolDescription"] = "FormModelContextMissingToolDescription";
    GenericIssueErrorType2["FormModelContextRequiredParameterMissingName"] = "FormModelContextRequiredParameterMissingName";
    GenericIssueErrorType2["FormModelContextParameterMissingName"] = "FormModelContextParameterMissingName";
  })(GenericIssueErrorType = Audits2.GenericIssueErrorType || (Audits2.GenericIssueErrorType = {}));
  let ClientHintIssueReason;
  ((ClientHintIssueReason2) => {
    ClientHintIssueReason2["MetaTagAllowListInvalidOrigin"] = "MetaTagAllowListInvalidOrigin";
    ClientHintIssueReason2["MetaTagModifiedHTML"] = "MetaTagModifiedHTML";
  })(ClientHintIssueReason = Audits2.ClientHintIssueReason || (Audits2.ClientHintIssueReason = {}));
  let FederatedAuthRequestIssueReason;
  ((FederatedAuthRequestIssueReason2) => {
    FederatedAuthRequestIssueReason2["ShouldEmbargo"] = "ShouldEmbargo";
    FederatedAuthRequestIssueReason2["TooManyRequests"] = "TooManyRequests";
    FederatedAuthRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    FederatedAuthRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    FederatedAuthRequestIssueReason2["WellKnownBlockedByConnectionAllowlist"] = "WellKnownBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    FederatedAuthRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    FederatedAuthRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    FederatedAuthRequestIssueReason2["ConfigNotInWellKnown"] = "ConfigNotInWellKnown";
    FederatedAuthRequestIssueReason2["WellKnownTooBig"] = "WellKnownTooBig";
    FederatedAuthRequestIssueReason2["ConfigHttpNotFound"] = "ConfigHttpNotFound";
    FederatedAuthRequestIssueReason2["ConfigNoResponse"] = "ConfigNoResponse";
    FederatedAuthRequestIssueReason2["ConfigBlockedByConnectionAllowlist"] = "ConfigBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["ConfigInvalidResponse"] = "ConfigInvalidResponse";
    FederatedAuthRequestIssueReason2["ConfigInvalidContentType"] = "ConfigInvalidContentType";
    FederatedAuthRequestIssueReason2["IdpNotPotentiallyTrustworthy"] = "IdpNotPotentiallyTrustworthy";
    FederatedAuthRequestIssueReason2["DisabledInSettings"] = "DisabledInSettings";
    FederatedAuthRequestIssueReason2["DisabledInFlags"] = "DisabledInFlags";
    FederatedAuthRequestIssueReason2["ErrorFetchingSignin"] = "ErrorFetchingSignin";
    FederatedAuthRequestIssueReason2["InvalidSigninResponse"] = "InvalidSigninResponse";
    FederatedAuthRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    FederatedAuthRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    FederatedAuthRequestIssueReason2["AccountsBlockedByConnectionAllowlist"] = "AccountsBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    FederatedAuthRequestIssueReason2["AccountsListEmpty"] = "AccountsListEmpty";
    FederatedAuthRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    FederatedAuthRequestIssueReason2["IdTokenHttpNotFound"] = "IdTokenHttpNotFound";
    FederatedAuthRequestIssueReason2["IdTokenNoResponse"] = "IdTokenNoResponse";
    FederatedAuthRequestIssueReason2["IdTokenBlockedByConnectionAllowlist"] = "IdTokenBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["IdTokenInvalidResponse"] = "IdTokenInvalidResponse";
    FederatedAuthRequestIssueReason2["IdTokenIdpErrorResponse"] = "IdTokenIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenCrossSiteIdpErrorResponse"] = "IdTokenCrossSiteIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenInvalidRequest"] = "IdTokenInvalidRequest";
    FederatedAuthRequestIssueReason2["IdTokenInvalidContentType"] = "IdTokenInvalidContentType";
    FederatedAuthRequestIssueReason2["ErrorIdToken"] = "ErrorIdToken";
    FederatedAuthRequestIssueReason2["Canceled"] = "Canceled";
    FederatedAuthRequestIssueReason2["RpPageNotVisible"] = "RpPageNotVisible";
    FederatedAuthRequestIssueReason2["SilentMediationFailure"] = "SilentMediationFailure";
    FederatedAuthRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthRequestIssueReason2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
    FederatedAuthRequestIssueReason2["ReplacedByActiveMode"] = "ReplacedByActiveMode";
    FederatedAuthRequestIssueReason2["RelyingPartyOriginIsOpaque"] = "RelyingPartyOriginIsOpaque";
    FederatedAuthRequestIssueReason2["TypeNotMatching"] = "TypeNotMatching";
    FederatedAuthRequestIssueReason2["UiDismissedNoEmbargo"] = "UiDismissedNoEmbargo";
    FederatedAuthRequestIssueReason2["CorsError"] = "CorsError";
    FederatedAuthRequestIssueReason2["SuppressedBySegmentationPlatform"] = "SuppressedBySegmentationPlatform";
  })(FederatedAuthRequestIssueReason = Audits2.FederatedAuthRequestIssueReason || (Audits2.FederatedAuthRequestIssueReason = {}));
  let FederatedAuthUserInfoRequestIssueReason;
  ((FederatedAuthUserInfoRequestIssueReason2) => {
    FederatedAuthUserInfoRequestIssueReason2["NotSameOrigin"] = "NotSameOrigin";
    FederatedAuthUserInfoRequestIssueReason2["NotIframe"] = "NotIframe";
    FederatedAuthUserInfoRequestIssueReason2["NotPotentiallyTrustworthy"] = "NotPotentiallyTrustworthy";
    FederatedAuthUserInfoRequestIssueReason2["NoAPIPermission"] = "NoApiPermission";
    FederatedAuthUserInfoRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthUserInfoRequestIssueReason2["NoAccountSharingPermission"] = "NoAccountSharingPermission";
    FederatedAuthUserInfoRequestIssueReason2["InvalidConfigOrWellKnown"] = "InvalidConfigOrWellKnown";
    FederatedAuthUserInfoRequestIssueReason2["InvalidAccountsResponse"] = "InvalidAccountsResponse";
    FederatedAuthUserInfoRequestIssueReason2["NoReturningUserFromFetchedAccounts"] = "NoReturningUserFromFetchedAccounts";
  })(FederatedAuthUserInfoRequestIssueReason = Audits2.FederatedAuthUserInfoRequestIssueReason || (Audits2.FederatedAuthUserInfoRequestIssueReason = {}));
  let EmailVerificationRequestIssueReason;
  ((EmailVerificationRequestIssueReason2) => {
    EmailVerificationRequestIssueReason2["InvalidEmail"] = "InvalidEmail";
    EmailVerificationRequestIssueReason2["DnsFetchFailed"] = "DnsFetchFailed";
    EmailVerificationRequestIssueReason2["DnsInvalidRecord"] = "DnsInvalidRecord";
    EmailVerificationRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    EmailVerificationRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    EmailVerificationRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["WellKnownMissingIssuanceEndpoint"] = "WellKnownMissingIssuanceEndpoint";
    EmailVerificationRequestIssueReason2["WellKnownIssuanceEndpointCrossOrigin"] = "WellKnownIssuanceEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["WellKnownUnsupportedSigningAlgorithm"] = "WellKnownUnsupportedSigningAlgorithm";
    EmailVerificationRequestIssueReason2["TokenHttpNotFound"] = "TokenHttpNotFound";
    EmailVerificationRequestIssueReason2["TokenNoResponse"] = "TokenNoResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidResponse"] = "TokenInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidContentType"] = "TokenInvalidContentType";
    EmailVerificationRequestIssueReason2["TokenMalformedSdJwt"] = "TokenMalformedSdJwt";
    EmailVerificationRequestIssueReason2["TokenInvalidSdJwt"] = "TokenInvalidSdJwt";
    EmailVerificationRequestIssueReason2["KeyBindingSigningFailed"] = "KeyBindingSigningFailed";
    EmailVerificationRequestIssueReason2["RpOriginIsOpaque"] = "RpOriginIsOpaque";
    EmailVerificationRequestIssueReason2["WellKnownMissingAccountsEndpoint"] = "WellKnownMissingAccountsEndpoint";
    EmailVerificationRequestIssueReason2["UserLoggedOut"] = "UserLoggedOut";
    EmailVerificationRequestIssueReason2["WellKnownAccountsEndpointCrossOrigin"] = "WellKnownAccountsEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    EmailVerificationRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    EmailVerificationRequestIssueReason2["AccountsEmptyList"] = "AccountsEmptyList";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownHttpNotFound"] = "EmailVerificationWellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownNoResponse"] = "EmailVerificationWellKnownNoResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidResponse"] = "EmailVerificationWellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidContentType"] = "EmailVerificationWellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["JwksHttpNotFound"] = "JwksHttpNotFound";
    EmailVerificationRequestIssueReason2["JwksInvalidResponse"] = "JwksInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtUnsupportedHeaderAlg"] = "TokenVerificationSdJwtUnsupportedHeaderAlg";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidTyp"] = "TokenVerificationSdJwtInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIss"] = "TokenVerificationSdJwtMissingIss";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIat"] = "TokenVerificationSdJwtMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingCnf"] = "TokenVerificationSdJwtMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingEmail"] = "TokenVerificationSdJwtMissingEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuedAt"] = "TokenVerificationSdJwtInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuer"] = "TokenVerificationSdJwtInvalidIssuer";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtJwksMissingKeys"] = "TokenVerificationSdJwtJwksMissingKeys";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtSignatureFailed"] = "TokenVerificationSdJwtSignatureFailed";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmailVerified"] = "TokenVerificationSdJwtInvalidEmailVerified";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmail"] = "TokenVerificationSdJwtInvalidEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidHolderKey"] = "TokenVerificationSdJwtInvalidHolderKey";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidTyp"] = "TokenVerificationKbInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingAud"] = "TokenVerificationKbMissingAud";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingNonce"] = "TokenVerificationKbMissingNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingIat"] = "TokenVerificationKbMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingSdHash"] = "TokenVerificationKbMissingSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidIssuedAt"] = "TokenVerificationKbInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidAudience"] = "TokenVerificationKbInvalidAudience";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidNonce"] = "TokenVerificationKbInvalidNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidSdHash"] = "TokenVerificationKbInvalidSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingCnf"] = "TokenVerificationKbMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationKbSignatureFailed"] = "TokenVerificationKbSignatureFailed";
  })(EmailVerificationRequestIssueReason = Audits2.EmailVerificationRequestIssueReason || (Audits2.EmailVerificationRequestIssueReason = {}));
  let PartitioningBlobURLInfo;
  ((PartitioningBlobURLInfo2) => {
    PartitioningBlobURLInfo2["BlockedCrossPartitionFetching"] = "BlockedCrossPartitionFetching";
    PartitioningBlobURLInfo2["EnforceNoopenerForNavigation"] = "EnforceNoopenerForNavigation";
  })(PartitioningBlobURLInfo = Audits2.PartitioningBlobURLInfo || (Audits2.PartitioningBlobURLInfo = {}));
  let ElementAccessibilityIssueReason;
  ((ElementAccessibilityIssueReason2) => {
    ElementAccessibilityIssueReason2["DisallowedSelectChild"] = "DisallowedSelectChild";
    ElementAccessibilityIssueReason2["DisallowedOptGroupChild"] = "DisallowedOptGroupChild";
    ElementAccessibilityIssueReason2["NonPhrasingContentOptionChild"] = "NonPhrasingContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentOptionChild"] = "InteractiveContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentLegendChild"] = "InteractiveContentLegendChild";
    ElementAccessibilityIssueReason2["InteractiveContentSummaryDescendant"] = "InteractiveContentSummaryDescendant";
  })(ElementAccessibilityIssueReason = Audits2.ElementAccessibilityIssueReason || (Audits2.ElementAccessibilityIssueReason = {}));
  let StyleSheetLoadingIssueReason;
  ((StyleSheetLoadingIssueReason2) => {
    StyleSheetLoadingIssueReason2["LateImportRule"] = "LateImportRule";
    StyleSheetLoadingIssueReason2["RequestFailed"] = "RequestFailed";
  })(StyleSheetLoadingIssueReason = Audits2.StyleSheetLoadingIssueReason || (Audits2.StyleSheetLoadingIssueReason = {}));
  let PropertyRuleIssueReason;
  ((PropertyRuleIssueReason2) => {
    PropertyRuleIssueReason2["InvalidSyntax"] = "InvalidSyntax";
    PropertyRuleIssueReason2["InvalidInitialValue"] = "InvalidInitialValue";
    PropertyRuleIssueReason2["InvalidInherits"] = "InvalidInherits";
    PropertyRuleIssueReason2["InvalidName"] = "InvalidName";
  })(PropertyRuleIssueReason = Audits2.PropertyRuleIssueReason || (Audits2.PropertyRuleIssueReason = {}));
  let UserReidentificationIssueType;
  ((UserReidentificationIssueType2) => {
    UserReidentificationIssueType2["BlockedFrameNavigation"] = "BlockedFrameNavigation";
    UserReidentificationIssueType2["BlockedSubresource"] = "BlockedSubresource";
    UserReidentificationIssueType2["NoisedCanvasReadback"] = "NoisedCanvasReadback";
  })(UserReidentificationIssueType = Audits2.UserReidentificationIssueType || (Audits2.UserReidentificationIssueType = {}));
  let PermissionElementIssueType;
  ((PermissionElementIssueType2) => {
    PermissionElementIssueType2["InvalidType"] = "InvalidType";
    PermissionElementIssueType2["FencedFrameDisallowed"] = "FencedFrameDisallowed";
    PermissionElementIssueType2["CspFrameAncestorsMissing"] = "CspFrameAncestorsMissing";
    PermissionElementIssueType2["PermissionsPolicyBlocked"] = "PermissionsPolicyBlocked";
    PermissionElementIssueType2["PaddingRightUnsupported"] = "PaddingRightUnsupported";
    PermissionElementIssueType2["PaddingBottomUnsupported"] = "PaddingBottomUnsupported";
    PermissionElementIssueType2["InsetBoxShadowUnsupported"] = "InsetBoxShadowUnsupported";
    PermissionElementIssueType2["RequestInProgress"] = "RequestInProgress";
    PermissionElementIssueType2["UntrustedEvent"] = "UntrustedEvent";
    PermissionElementIssueType2["RegistrationFailed"] = "RegistrationFailed";
    PermissionElementIssueType2["TypeNotSupported"] = "TypeNotSupported";
    PermissionElementIssueType2["InvalidTypeActivation"] = "InvalidTypeActivation";
    PermissionElementIssueType2["SecurityChecksFailed"] = "SecurityChecksFailed";
    PermissionElementIssueType2["ActivationDisabled"] = "ActivationDisabled";
    PermissionElementIssueType2["GeolocationDeprecated"] = "GeolocationDeprecated";
    PermissionElementIssueType2["InvalidDisplayStyle"] = "InvalidDisplayStyle";
    PermissionElementIssueType2["NonOpaqueColor"] = "NonOpaqueColor";
    PermissionElementIssueType2["LowContrast"] = "LowContrast";
    PermissionElementIssueType2["FontSizeTooSmall"] = "FontSizeTooSmall";
    PermissionElementIssueType2["FontSizeTooLarge"] = "FontSizeTooLarge";
    PermissionElementIssueType2["InvalidSizeValue"] = "InvalidSizeValue";
    PermissionElementIssueType2["NonSecureContext"] = "NonSecureContext";
    PermissionElementIssueType2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
  })(PermissionElementIssueType = Audits2.PermissionElementIssueType || (Audits2.PermissionElementIssueType = {}));
  let InspectorIssueCode;
  ((InspectorIssueCode2) => {
    InspectorIssueCode2["CookieIssue"] = "CookieIssue";
    InspectorIssueCode2["MixedContentIssue"] = "MixedContentIssue";
    InspectorIssueCode2["BlockedByResponseIssue"] = "BlockedByResponseIssue";
    InspectorIssueCode2["HeavyAdIssue"] = "HeavyAdIssue";
    InspectorIssueCode2["ContentSecurityPolicyIssue"] = "ContentSecurityPolicyIssue";
    InspectorIssueCode2["SharedArrayBufferIssue"] = "SharedArrayBufferIssue";
    InspectorIssueCode2["CorsIssue"] = "CorsIssue";
    InspectorIssueCode2["QuirksModeIssue"] = "QuirksModeIssue";
    InspectorIssueCode2["PartitioningBlobURLIssue"] = "PartitioningBlobURLIssue";
    InspectorIssueCode2["NavigatorUserAgentIssue"] = "NavigatorUserAgentIssue";
    InspectorIssueCode2["GenericIssue"] = "GenericIssue";
    InspectorIssueCode2["DeprecationIssue"] = "DeprecationIssue";
    InspectorIssueCode2["ClientHintIssue"] = "ClientHintIssue";
    InspectorIssueCode2["FederatedAuthRequestIssue"] = "FederatedAuthRequestIssue";
    InspectorIssueCode2["BounceTrackingIssue"] = "BounceTrackingIssue";
    InspectorIssueCode2["CookieDeprecationMetadataIssue"] = "CookieDeprecationMetadataIssue";
    InspectorIssueCode2["StylesheetLoadingIssue"] = "StylesheetLoadingIssue";
    InspectorIssueCode2["FederatedAuthUserInfoRequestIssue"] = "FederatedAuthUserInfoRequestIssue";
    InspectorIssueCode2["PropertyRuleIssue"] = "PropertyRuleIssue";
    InspectorIssueCode2["SharedDictionaryIssue"] = "SharedDictionaryIssue";
    InspectorIssueCode2["ElementAccessibilityIssue"] = "ElementAccessibilityIssue";
    InspectorIssueCode2["SRIMessageSignatureIssue"] = "SRIMessageSignatureIssue";
    InspectorIssueCode2["UnencodedDigestIssue"] = "UnencodedDigestIssue";
    InspectorIssueCode2["ConnectionAllowlistIssue"] = "ConnectionAllowlistIssue";
    InspectorIssueCode2["UserReidentificationIssue"] = "UserReidentificationIssue";
    InspectorIssueCode2["PermissionElementIssue"] = "PermissionElementIssue";
    InspectorIssueCode2["PerformanceIssue"] = "PerformanceIssue";
    InspectorIssueCode2["SelectivePermissionsInterventionIssue"] = "SelectivePermissionsInterventionIssue";
    InspectorIssueCode2["EmailVerificationRequestIssue"] = "EmailVerificationRequestIssue";
    InspectorIssueCode2["LazyLoadImageIssue"] = "LazyLoadImageIssue";
  })(InspectorIssueCode = Audits2.InspectorIssueCode || (Audits2.InspectorIssueCode = {}));
  let GetEncodedResponseRequestEncoding;
  ((GetEncodedResponseRequestEncoding2) => {
    GetEncodedResponseRequestEncoding2["Webp"] = "webp";
    GetEncodedResponseRequestEncoding2["Jpeg"] = "jpeg";
    GetEncodedResponseRequestEncoding2["Png"] = "png";
  })(GetEncodedResponseRequestEncoding = Audits2.GetEncodedResponseRequestEncoding || (Audits2.GetEncodedResponseRequestEncoding = {}));
})(Audits || (Audits = {}));
var Autofill;
((Autofill2) => {
  let FillingStrategy;
  ((FillingStrategy2) => {
    FillingStrategy2["AutocompleteAttribute"] = "autocompleteAttribute";
    FillingStrategy2["AutofillInferred"] = "autofillInferred";
  })(FillingStrategy = Autofill2.FillingStrategy || (Autofill2.FillingStrategy = {}));
})(Autofill || (Autofill = {}));
var BackgroundService;
((BackgroundService2) => {
  let ServiceName;
  ((ServiceName2) => {
    ServiceName2["BackgroundFetch"] = "backgroundFetch";
    ServiceName2["BackgroundSync"] = "backgroundSync";
    ServiceName2["PushMessaging"] = "pushMessaging";
    ServiceName2["Notifications"] = "notifications";
    ServiceName2["PaymentHandler"] = "paymentHandler";
    ServiceName2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
  })(ServiceName = BackgroundService2.ServiceName || (BackgroundService2.ServiceName = {}));
})(BackgroundService || (BackgroundService = {}));
var BluetoothEmulation;
((BluetoothEmulation2) => {
  let CentralState;
  ((CentralState2) => {
    CentralState2["Absent"] = "absent";
    CentralState2["PoweredOff"] = "powered-off";
    CentralState2["PoweredOn"] = "powered-on";
  })(CentralState = BluetoothEmulation2.CentralState || (BluetoothEmulation2.CentralState = {}));
  let GATTOperationType;
  ((GATTOperationType2) => {
    GATTOperationType2["Connection"] = "connection";
    GATTOperationType2["Discovery"] = "discovery";
  })(GATTOperationType = BluetoothEmulation2.GATTOperationType || (BluetoothEmulation2.GATTOperationType = {}));
  let CharacteristicWriteType;
  ((CharacteristicWriteType2) => {
    CharacteristicWriteType2["WriteDefaultDeprecated"] = "write-default-deprecated";
    CharacteristicWriteType2["WriteWithResponse"] = "write-with-response";
    CharacteristicWriteType2["WriteWithoutResponse"] = "write-without-response";
  })(CharacteristicWriteType = BluetoothEmulation2.CharacteristicWriteType || (BluetoothEmulation2.CharacteristicWriteType = {}));
  let CharacteristicOperationType;
  ((CharacteristicOperationType2) => {
    CharacteristicOperationType2["Read"] = "read";
    CharacteristicOperationType2["Write"] = "write";
    CharacteristicOperationType2["SubscribeToNotifications"] = "subscribe-to-notifications";
    CharacteristicOperationType2["UnsubscribeFromNotifications"] = "unsubscribe-from-notifications";
  })(CharacteristicOperationType = BluetoothEmulation2.CharacteristicOperationType || (BluetoothEmulation2.CharacteristicOperationType = {}));
  let DescriptorOperationType;
  ((DescriptorOperationType2) => {
    DescriptorOperationType2["Read"] = "read";
    DescriptorOperationType2["Write"] = "write";
  })(DescriptorOperationType = BluetoothEmulation2.DescriptorOperationType || (BluetoothEmulation2.DescriptorOperationType = {}));
})(BluetoothEmulation || (BluetoothEmulation = {}));
var Browser;
((Browser2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Browser2.WindowState || (Browser2.WindowState = {}));
  let PermissionType;
  ((PermissionType2) => {
    PermissionType2["Ar"] = "ar";
    PermissionType2["AudioCapture"] = "audioCapture";
    PermissionType2["AutomaticFullscreen"] = "automaticFullscreen";
    PermissionType2["BackgroundFetch"] = "backgroundFetch";
    PermissionType2["BackgroundSync"] = "backgroundSync";
    PermissionType2["CameraPanTiltZoom"] = "cameraPanTiltZoom";
    PermissionType2["CapturedSurfaceControl"] = "capturedSurfaceControl";
    PermissionType2["ClipboardReadWrite"] = "clipboardReadWrite";
    PermissionType2["ClipboardSanitizedWrite"] = "clipboardSanitizedWrite";
    PermissionType2["DisplayCapture"] = "displayCapture";
    PermissionType2["DurableStorage"] = "durableStorage";
    PermissionType2["Geolocation"] = "geolocation";
    PermissionType2["HandTracking"] = "handTracking";
    PermissionType2["IdleDetection"] = "idleDetection";
    PermissionType2["KeyboardLock"] = "keyboardLock";
    PermissionType2["LocalFonts"] = "localFonts";
    PermissionType2["LocalNetwork"] = "localNetwork";
    PermissionType2["LocalNetworkAccess"] = "localNetworkAccess";
    PermissionType2["LoopbackNetwork"] = "loopbackNetwork";
    PermissionType2["Midi"] = "midi";
    PermissionType2["MidiSysex"] = "midiSysex";
    PermissionType2["Nfc"] = "nfc";
    PermissionType2["Notifications"] = "notifications";
    PermissionType2["PaymentHandler"] = "paymentHandler";
    PermissionType2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
    PermissionType2["PointerLock"] = "pointerLock";
    PermissionType2["ProtectedMediaIdentifier"] = "protectedMediaIdentifier";
    PermissionType2["Sensors"] = "sensors";
    PermissionType2["SmartCard"] = "smartCard";
    PermissionType2["SpeakerSelection"] = "speakerSelection";
    PermissionType2["StorageAccess"] = "storageAccess";
    PermissionType2["TopLevelStorageAccess"] = "topLevelStorageAccess";
    PermissionType2["VideoCapture"] = "videoCapture";
    PermissionType2["Vr"] = "vr";
    PermissionType2["WakeLockScreen"] = "wakeLockScreen";
    PermissionType2["WakeLockSystem"] = "wakeLockSystem";
    PermissionType2["WebAppInstallation"] = "webAppInstallation";
    PermissionType2["WebPrinting"] = "webPrinting";
    PermissionType2["WindowManagement"] = "windowManagement";
  })(PermissionType = Browser2.PermissionType || (Browser2.PermissionType = {}));
  let PermissionSetting;
  ((PermissionSetting2) => {
    PermissionSetting2["Granted"] = "granted";
    PermissionSetting2["Denied"] = "denied";
    PermissionSetting2["Prompt"] = "prompt";
  })(PermissionSetting = Browser2.PermissionSetting || (Browser2.PermissionSetting = {}));
  let BrowserCommandId;
  ((BrowserCommandId2) => {
    BrowserCommandId2["OpenTabSearch"] = "openTabSearch";
    BrowserCommandId2["CloseTabSearch"] = "closeTabSearch";
    BrowserCommandId2["OpenGlic"] = "openGlic";
  })(BrowserCommandId = Browser2.BrowserCommandId || (Browser2.BrowserCommandId = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["AllowAndName"] = "allowAndName";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Browser2.SetDownloadBehaviorRequestBehavior || (Browser2.SetDownloadBehaviorRequestBehavior = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Browser2.DownloadProgressEventState || (Browser2.DownloadProgressEventState = {}));
})(Browser || (Browser = {}));
var CSS;
((CSS2) => {
  let StyleSheetOrigin;
  ((StyleSheetOrigin2) => {
    StyleSheetOrigin2["Injected"] = "injected";
    StyleSheetOrigin2["UserAgent"] = "user-agent";
    StyleSheetOrigin2["Inspector"] = "inspector";
    StyleSheetOrigin2["Regular"] = "regular";
  })(StyleSheetOrigin = CSS2.StyleSheetOrigin || (CSS2.StyleSheetOrigin = {}));
  let CSSRuleType;
  ((CSSRuleType2) => {
    CSSRuleType2["MediaRule"] = "MediaRule";
    CSSRuleType2["SupportsRule"] = "SupportsRule";
    CSSRuleType2["ContainerRule"] = "ContainerRule";
    CSSRuleType2["LayerRule"] = "LayerRule";
    CSSRuleType2["ScopeRule"] = "ScopeRule";
    CSSRuleType2["StyleRule"] = "StyleRule";
    CSSRuleType2["StartingStyleRule"] = "StartingStyleRule";
    CSSRuleType2["NavigationRule"] = "NavigationRule";
  })(CSSRuleType = CSS2.CSSRuleType || (CSS2.CSSRuleType = {}));
  let CSSMediaSource;
  ((CSSMediaSource2) => {
    CSSMediaSource2["MediaRule"] = "mediaRule";
    CSSMediaSource2["ImportRule"] = "importRule";
    CSSMediaSource2["LinkedSheet"] = "linkedSheet";
    CSSMediaSource2["InlineSheet"] = "inlineSheet";
  })(CSSMediaSource = CSS2.CSSMediaSource || (CSS2.CSSMediaSource = {}));
  let CSSAtRuleType;
  ((CSSAtRuleType2) => {
    CSSAtRuleType2["FontFace"] = "font-face";
    CSSAtRuleType2["FontFeatureValues"] = "font-feature-values";
    CSSAtRuleType2["FontPaletteValues"] = "font-palette-values";
    CSSAtRuleType2["CounterStyle"] = "counter-style";
  })(CSSAtRuleType = CSS2.CSSAtRuleType || (CSS2.CSSAtRuleType = {}));
  let CSSAtRuleSubsection;
  ((CSSAtRuleSubsection2) => {
    CSSAtRuleSubsection2["Swash"] = "swash";
    CSSAtRuleSubsection2["Annotation"] = "annotation";
    CSSAtRuleSubsection2["Ornaments"] = "ornaments";
    CSSAtRuleSubsection2["Stylistic"] = "stylistic";
    CSSAtRuleSubsection2["Styleset"] = "styleset";
    CSSAtRuleSubsection2["CharacterVariant"] = "character-variant";
  })(CSSAtRuleSubsection = CSS2.CSSAtRuleSubsection || (CSS2.CSSAtRuleSubsection = {}));
})(CSS || (CSS = {}));
var CacheStorage;
((CacheStorage2) => {
  let CachedResponseType;
  ((CachedResponseType2) => {
    CachedResponseType2["Basic"] = "basic";
    CachedResponseType2["Cors"] = "cors";
    CachedResponseType2["Default"] = "default";
    CachedResponseType2["Error"] = "error";
    CachedResponseType2["OpaqueResponse"] = "opaqueResponse";
    CachedResponseType2["OpaqueRedirect"] = "opaqueRedirect";
  })(CachedResponseType = CacheStorage2.CachedResponseType || (CacheStorage2.CachedResponseType = {}));
})(CacheStorage || (CacheStorage = {}));
var DOM;
((DOM2) => {
  let PseudoType;
  ((PseudoType2) => {
    PseudoType2["FirstLine"] = "first-line";
    PseudoType2["FirstLetter"] = "first-letter";
    PseudoType2["Checkmark"] = "checkmark";
    PseudoType2["Before"] = "before";
    PseudoType2["After"] = "after";
    PseudoType2["ExpandIcon"] = "expand-icon";
    PseudoType2["PickerIcon"] = "picker-icon";
    PseudoType2["InterestButton"] = "interest-button";
    PseudoType2["Marker"] = "marker";
    PseudoType2["Backdrop"] = "backdrop";
    PseudoType2["Column"] = "column";
    PseudoType2["Selection"] = "selection";
    PseudoType2["SearchText"] = "search-text";
    PseudoType2["TargetText"] = "target-text";
    PseudoType2["SpellingError"] = "spelling-error";
    PseudoType2["GrammarError"] = "grammar-error";
    PseudoType2["Highlight"] = "highlight";
    PseudoType2["FirstLineInherited"] = "first-line-inherited";
    PseudoType2["ScrollMarker"] = "scroll-marker";
    PseudoType2["ScrollMarkerGroup"] = "scroll-marker-group";
    PseudoType2["ScrollButton"] = "scroll-button";
    PseudoType2["Scrollbar"] = "scrollbar";
    PseudoType2["ScrollbarThumb"] = "scrollbar-thumb";
    PseudoType2["ScrollbarButton"] = "scrollbar-button";
    PseudoType2["ScrollbarTrack"] = "scrollbar-track";
    PseudoType2["ScrollbarTrackPiece"] = "scrollbar-track-piece";
    PseudoType2["ScrollbarCorner"] = "scrollbar-corner";
    PseudoType2["Resizer"] = "resizer";
    PseudoType2["InputListButton"] = "input-list-button";
    PseudoType2["ViewTransition"] = "view-transition";
    PseudoType2["ViewTransitionGroup"] = "view-transition-group";
    PseudoType2["ViewTransitionImagePair"] = "view-transition-image-pair";
    PseudoType2["ViewTransitionGroupChildren"] = "view-transition-group-children";
    PseudoType2["ViewTransitionOld"] = "view-transition-old";
    PseudoType2["ViewTransitionNew"] = "view-transition-new";
    PseudoType2["Placeholder"] = "placeholder";
    PseudoType2["FileSelectorButton"] = "file-selector-button";
    PseudoType2["DetailsContent"] = "details-content";
    PseudoType2["Picker"] = "picker";
    PseudoType2["SelectListbox"] = "select-listbox";
    PseudoType2["PermissionIcon"] = "permission-icon";
    PseudoType2["OverscrollAreaParent"] = "overscroll-area-parent";
    PseudoType2["OverscrollBackdrop"] = "overscroll-backdrop";
    PseudoType2["Skeleton"] = "skeleton";
  })(PseudoType = DOM2.PseudoType || (DOM2.PseudoType = {}));
  let ShadowRootType;
  ((ShadowRootType2) => {
    ShadowRootType2["UserAgent"] = "user-agent";
    ShadowRootType2["Open"] = "open";
    ShadowRootType2["Closed"] = "closed";
  })(ShadowRootType = DOM2.ShadowRootType || (DOM2.ShadowRootType = {}));
  let CompatibilityMode;
  ((CompatibilityMode2) => {
    CompatibilityMode2["QuirksMode"] = "QuirksMode";
    CompatibilityMode2["LimitedQuirksMode"] = "LimitedQuirksMode";
    CompatibilityMode2["NoQuirksMode"] = "NoQuirksMode";
  })(CompatibilityMode = DOM2.CompatibilityMode || (DOM2.CompatibilityMode = {}));
  let PhysicalAxes;
  ((PhysicalAxes2) => {
    PhysicalAxes2["Horizontal"] = "Horizontal";
    PhysicalAxes2["Vertical"] = "Vertical";
    PhysicalAxes2["Both"] = "Both";
  })(PhysicalAxes = DOM2.PhysicalAxes || (DOM2.PhysicalAxes = {}));
  let LogicalAxes;
  ((LogicalAxes2) => {
    LogicalAxes2["Inline"] = "Inline";
    LogicalAxes2["Block"] = "Block";
    LogicalAxes2["Both"] = "Both";
  })(LogicalAxes = DOM2.LogicalAxes || (DOM2.LogicalAxes = {}));
  let ScrollOrientation;
  ((ScrollOrientation2) => {
    ScrollOrientation2["Horizontal"] = "horizontal";
    ScrollOrientation2["Vertical"] = "vertical";
  })(ScrollOrientation = DOM2.ScrollOrientation || (DOM2.ScrollOrientation = {}));
  let EnableRequestIncludeWhitespace;
  ((EnableRequestIncludeWhitespace2) => {
    EnableRequestIncludeWhitespace2["None"] = "none";
    EnableRequestIncludeWhitespace2["All"] = "all";
  })(EnableRequestIncludeWhitespace = DOM2.EnableRequestIncludeWhitespace || (DOM2.EnableRequestIncludeWhitespace = {}));
  let GetElementByRelationRequestRelation;
  ((GetElementByRelationRequestRelation2) => {
    GetElementByRelationRequestRelation2["PopoverTarget"] = "PopoverTarget";
    GetElementByRelationRequestRelation2["InterestTarget"] = "InterestTarget";
    GetElementByRelationRequestRelation2["CommandFor"] = "CommandFor";
  })(GetElementByRelationRequestRelation = DOM2.GetElementByRelationRequestRelation || (DOM2.GetElementByRelationRequestRelation = {}));
})(DOM || (DOM = {}));
var DOMDebugger;
((DOMDebugger2) => {
  let DOMBreakpointType;
  ((DOMBreakpointType2) => {
    DOMBreakpointType2["SubtreeModified"] = "subtree-modified";
    DOMBreakpointType2["AttributeModified"] = "attribute-modified";
    DOMBreakpointType2["NodeRemoved"] = "node-removed";
  })(DOMBreakpointType = DOMDebugger2.DOMBreakpointType || (DOMDebugger2.DOMBreakpointType = {}));
  let CSPViolationType;
  ((CSPViolationType2) => {
    CSPViolationType2["TrustedtypeSinkViolation"] = "trustedtype-sink-violation";
    CSPViolationType2["TrustedtypePolicyViolation"] = "trustedtype-policy-violation";
  })(CSPViolationType = DOMDebugger2.CSPViolationType || (DOMDebugger2.CSPViolationType = {}));
})(DOMDebugger || (DOMDebugger = {}));
var DigitalCredentials;
((DigitalCredentials2) => {
  let VirtualWalletAction;
  ((VirtualWalletAction2) => {
    VirtualWalletAction2["Respond"] = "respond";
    VirtualWalletAction2["Decline"] = "decline";
    VirtualWalletAction2["Wait"] = "wait";
    VirtualWalletAction2["Clear"] = "clear";
  })(VirtualWalletAction = DigitalCredentials2.VirtualWalletAction || (DigitalCredentials2.VirtualWalletAction = {}));
})(DigitalCredentials || (DigitalCredentials = {}));
var Emulation;
((Emulation2) => {
  let ScreenOrientationType;
  ((ScreenOrientationType2) => {
    ScreenOrientationType2["PortraitPrimary"] = "portraitPrimary";
    ScreenOrientationType2["PortraitSecondary"] = "portraitSecondary";
    ScreenOrientationType2["LandscapePrimary"] = "landscapePrimary";
    ScreenOrientationType2["LandscapeSecondary"] = "landscapeSecondary";
  })(ScreenOrientationType = Emulation2.ScreenOrientationType || (Emulation2.ScreenOrientationType = {}));
  let DisplayFeatureOrientation;
  ((DisplayFeatureOrientation2) => {
    DisplayFeatureOrientation2["Vertical"] = "vertical";
    DisplayFeatureOrientation2["Horizontal"] = "horizontal";
  })(DisplayFeatureOrientation = Emulation2.DisplayFeatureOrientation || (Emulation2.DisplayFeatureOrientation = {}));
  let DevicePostureType;
  ((DevicePostureType2) => {
    DevicePostureType2["Continuous"] = "continuous";
    DevicePostureType2["Folded"] = "folded";
  })(DevicePostureType = Emulation2.DevicePostureType || (Emulation2.DevicePostureType = {}));
  let VirtualTimePolicy;
  ((VirtualTimePolicy2) => {
    VirtualTimePolicy2["Advance"] = "advance";
    VirtualTimePolicy2["Pause"] = "pause";
    VirtualTimePolicy2["PauseIfNetworkFetchesPending"] = "pauseIfNetworkFetchesPending";
  })(VirtualTimePolicy = Emulation2.VirtualTimePolicy || (Emulation2.VirtualTimePolicy = {}));
  let SensorType;
  ((SensorType2) => {
    SensorType2["AbsoluteOrientation"] = "absolute-orientation";
    SensorType2["Accelerometer"] = "accelerometer";
    SensorType2["AmbientLight"] = "ambient-light";
    SensorType2["Gravity"] = "gravity";
    SensorType2["Gyroscope"] = "gyroscope";
    SensorType2["LinearAcceleration"] = "linear-acceleration";
    SensorType2["Magnetometer"] = "magnetometer";
    SensorType2["RelativeOrientation"] = "relative-orientation";
  })(SensorType = Emulation2.SensorType || (Emulation2.SensorType = {}));
  let PressureSource;
  ((PressureSource2) => {
    PressureSource2["Cpu"] = "cpu";
  })(PressureSource = Emulation2.PressureSource || (Emulation2.PressureSource = {}));
  let PressureState;
  ((PressureState2) => {
    PressureState2["Nominal"] = "nominal";
    PressureState2["Fair"] = "fair";
    PressureState2["Serious"] = "serious";
    PressureState2["Critical"] = "critical";
  })(PressureState = Emulation2.PressureState || (Emulation2.PressureState = {}));
  let DisabledImageType;
  ((DisabledImageType2) => {
    DisabledImageType2["Avif"] = "avif";
    DisabledImageType2["Jxl"] = "jxl";
    DisabledImageType2["Webp"] = "webp";
  })(DisabledImageType = Emulation2.DisabledImageType || (Emulation2.DisabledImageType = {}));
  let SetDeviceMetricsOverrideRequestScrollbarType;
  ((SetDeviceMetricsOverrideRequestScrollbarType2) => {
    SetDeviceMetricsOverrideRequestScrollbarType2["Overlay"] = "overlay";
    SetDeviceMetricsOverrideRequestScrollbarType2["Default"] = "default";
  })(SetDeviceMetricsOverrideRequestScrollbarType = Emulation2.SetDeviceMetricsOverrideRequestScrollbarType || (Emulation2.SetDeviceMetricsOverrideRequestScrollbarType = {}));
  let SetEmitTouchEventsForMouseRequestConfiguration;
  ((SetEmitTouchEventsForMouseRequestConfiguration2) => {
    SetEmitTouchEventsForMouseRequestConfiguration2["Mobile"] = "mobile";
    SetEmitTouchEventsForMouseRequestConfiguration2["Desktop"] = "desktop";
  })(SetEmitTouchEventsForMouseRequestConfiguration = Emulation2.SetEmitTouchEventsForMouseRequestConfiguration || (Emulation2.SetEmitTouchEventsForMouseRequestConfiguration = {}));
  let SetEmulatedVisionDeficiencyRequestType;
  ((SetEmulatedVisionDeficiencyRequestType2) => {
    SetEmulatedVisionDeficiencyRequestType2["None"] = "none";
    SetEmulatedVisionDeficiencyRequestType2["BlurredVision"] = "blurredVision";
    SetEmulatedVisionDeficiencyRequestType2["ReducedContrast"] = "reducedContrast";
    SetEmulatedVisionDeficiencyRequestType2["Achromatopsia"] = "achromatopsia";
    SetEmulatedVisionDeficiencyRequestType2["Deuteranopia"] = "deuteranopia";
    SetEmulatedVisionDeficiencyRequestType2["Protanopia"] = "protanopia";
    SetEmulatedVisionDeficiencyRequestType2["Tritanopia"] = "tritanopia";
  })(SetEmulatedVisionDeficiencyRequestType = Emulation2.SetEmulatedVisionDeficiencyRequestType || (Emulation2.SetEmulatedVisionDeficiencyRequestType = {}));
  let SetCPUPerformanceOverrideRequestPerformanceTier;
  ((SetCPUPerformanceOverrideRequestPerformanceTier2) => {
    SetCPUPerformanceOverrideRequestPerformanceTier2["Unknown"] = "unknown";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Low"] = "low";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Mid"] = "mid";
    SetCPUPerformanceOverrideRequestPerformanceTier2["High"] = "high";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Ultra"] = "ultra";
  })(SetCPUPerformanceOverrideRequestPerformanceTier = Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier || (Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier = {}));
})(Emulation || (Emulation = {}));
var Extensions;
((Extensions2) => {
  let StorageArea;
  ((StorageArea2) => {
    StorageArea2["Session"] = "session";
    StorageArea2["Local"] = "local";
    StorageArea2["Sync"] = "sync";
    StorageArea2["Managed"] = "managed";
  })(StorageArea = Extensions2.StorageArea || (Extensions2.StorageArea = {}));
})(Extensions || (Extensions = {}));
var FedCm;
((FedCm2) => {
  let LoginState;
  ((LoginState2) => {
    LoginState2["SignIn"] = "SignIn";
    LoginState2["SignUp"] = "SignUp";
  })(LoginState = FedCm2.LoginState || (FedCm2.LoginState = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["AccountChooser"] = "AccountChooser";
    DialogType2["AutoReauthn"] = "AutoReauthn";
    DialogType2["ConfirmIdpLogin"] = "ConfirmIdpLogin";
    DialogType2["Error"] = "Error";
  })(DialogType = FedCm2.DialogType || (FedCm2.DialogType = {}));
  let DialogButton;
  ((DialogButton2) => {
    DialogButton2["ConfirmIdpLoginContinue"] = "ConfirmIdpLoginContinue";
    DialogButton2["ErrorGotIt"] = "ErrorGotIt";
    DialogButton2["ErrorMoreDetails"] = "ErrorMoreDetails";
  })(DialogButton = FedCm2.DialogButton || (FedCm2.DialogButton = {}));
  let AccountUrlType;
  ((AccountUrlType2) => {
    AccountUrlType2["TermsOfService"] = "TermsOfService";
    AccountUrlType2["PrivacyPolicy"] = "PrivacyPolicy";
  })(AccountUrlType = FedCm2.AccountUrlType || (FedCm2.AccountUrlType = {}));
})(FedCm || (FedCm = {}));
var Fetch;
((Fetch2) => {
  let RequestStage;
  ((RequestStage2) => {
    RequestStage2["Request"] = "Request";
    RequestStage2["Response"] = "Response";
  })(RequestStage = Fetch2.RequestStage || (Fetch2.RequestStage = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Fetch2.AuthChallengeSource || (Fetch2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Fetch2.AuthChallengeResponseResponse || (Fetch2.AuthChallengeResponseResponse = {}));
})(Fetch || (Fetch = {}));
var HeadlessExperimental;
((HeadlessExperimental2) => {
  let ScreenshotParamsFormat;
  ((ScreenshotParamsFormat2) => {
    ScreenshotParamsFormat2["Jpeg"] = "jpeg";
    ScreenshotParamsFormat2["Png"] = "png";
    ScreenshotParamsFormat2["Webp"] = "webp";
  })(ScreenshotParamsFormat = HeadlessExperimental2.ScreenshotParamsFormat || (HeadlessExperimental2.ScreenshotParamsFormat = {}));
})(HeadlessExperimental || (HeadlessExperimental = {}));
var IndexedDB;
((IndexedDB2) => {
  let KeyType;
  ((KeyType2) => {
    KeyType2["Number"] = "number";
    KeyType2["String"] = "string";
    KeyType2["Date"] = "date";
    KeyType2["Array"] = "array";
  })(KeyType = IndexedDB2.KeyType || (IndexedDB2.KeyType = {}));
  let KeyPathType;
  ((KeyPathType2) => {
    KeyPathType2["Null"] = "null";
    KeyPathType2["String"] = "string";
    KeyPathType2["Array"] = "array";
  })(KeyPathType = IndexedDB2.KeyPathType || (IndexedDB2.KeyPathType = {}));
})(IndexedDB || (IndexedDB = {}));
var Input3;
((Input5) => {
  let GestureSourceType;
  ((GestureSourceType2) => {
    GestureSourceType2["Default"] = "default";
    GestureSourceType2["Touch"] = "touch";
    GestureSourceType2["Mouse"] = "mouse";
  })(GestureSourceType = Input5.GestureSourceType || (Input5.GestureSourceType = {}));
  let MouseButton;
  ((MouseButton2) => {
    MouseButton2["None"] = "none";
    MouseButton2["Left"] = "left";
    MouseButton2["Middle"] = "middle";
    MouseButton2["Right"] = "right";
    MouseButton2["Back"] = "back";
    MouseButton2["Forward"] = "forward";
  })(MouseButton = Input5.MouseButton || (Input5.MouseButton = {}));
  let DispatchDragEventRequestType;
  ((DispatchDragEventRequestType2) => {
    DispatchDragEventRequestType2["DragEnter"] = "dragEnter";
    DispatchDragEventRequestType2["DragOver"] = "dragOver";
    DispatchDragEventRequestType2["Drop"] = "drop";
    DispatchDragEventRequestType2["DragCancel"] = "dragCancel";
  })(DispatchDragEventRequestType = Input5.DispatchDragEventRequestType || (Input5.DispatchDragEventRequestType = {}));
  let DispatchKeyEventRequestType;
  ((DispatchKeyEventRequestType2) => {
    DispatchKeyEventRequestType2["KeyDown"] = "keyDown";
    DispatchKeyEventRequestType2["KeyUp"] = "keyUp";
    DispatchKeyEventRequestType2["RawKeyDown"] = "rawKeyDown";
    DispatchKeyEventRequestType2["Char"] = "char";
  })(DispatchKeyEventRequestType = Input5.DispatchKeyEventRequestType || (Input5.DispatchKeyEventRequestType = {}));
  let DispatchMouseEventRequestType;
  ((DispatchMouseEventRequestType2) => {
    DispatchMouseEventRequestType2["MousePressed"] = "mousePressed";
    DispatchMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    DispatchMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    DispatchMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(DispatchMouseEventRequestType = Input5.DispatchMouseEventRequestType || (Input5.DispatchMouseEventRequestType = {}));
  let DispatchMouseEventRequestPointerType;
  ((DispatchMouseEventRequestPointerType2) => {
    DispatchMouseEventRequestPointerType2["Mouse"] = "mouse";
    DispatchMouseEventRequestPointerType2["Pen"] = "pen";
  })(DispatchMouseEventRequestPointerType = Input5.DispatchMouseEventRequestPointerType || (Input5.DispatchMouseEventRequestPointerType = {}));
  let DispatchTouchEventRequestType;
  ((DispatchTouchEventRequestType2) => {
    DispatchTouchEventRequestType2["TouchStart"] = "touchStart";
    DispatchTouchEventRequestType2["TouchEnd"] = "touchEnd";
    DispatchTouchEventRequestType2["TouchMove"] = "touchMove";
    DispatchTouchEventRequestType2["TouchCancel"] = "touchCancel";
  })(DispatchTouchEventRequestType = Input5.DispatchTouchEventRequestType || (Input5.DispatchTouchEventRequestType = {}));
  let EmulateTouchFromMouseEventRequestType;
  ((EmulateTouchFromMouseEventRequestType2) => {
    EmulateTouchFromMouseEventRequestType2["MousePressed"] = "mousePressed";
    EmulateTouchFromMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    EmulateTouchFromMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    EmulateTouchFromMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(EmulateTouchFromMouseEventRequestType = Input5.EmulateTouchFromMouseEventRequestType || (Input5.EmulateTouchFromMouseEventRequestType = {}));
})(Input3 || (Input3 = {}));
var LayerTree;
((LayerTree2) => {
  let ScrollRectType;
  ((ScrollRectType2) => {
    ScrollRectType2["RepaintsOnScroll"] = "RepaintsOnScroll";
    ScrollRectType2["TouchEventHandler"] = "TouchEventHandler";
    ScrollRectType2["WheelEventHandler"] = "WheelEventHandler";
  })(ScrollRectType = LayerTree2.ScrollRectType || (LayerTree2.ScrollRectType = {}));
})(LayerTree || (LayerTree = {}));
var Log;
((Log2) => {
  let LogEntrySource;
  ((LogEntrySource2) => {
    LogEntrySource2["XML"] = "xml";
    LogEntrySource2["Javascript"] = "javascript";
    LogEntrySource2["Network"] = "network";
    LogEntrySource2["Storage"] = "storage";
    LogEntrySource2["Appcache"] = "appcache";
    LogEntrySource2["Rendering"] = "rendering";
    LogEntrySource2["Security"] = "security";
    LogEntrySource2["Deprecation"] = "deprecation";
    LogEntrySource2["Worker"] = "worker";
    LogEntrySource2["Violation"] = "violation";
    LogEntrySource2["Intervention"] = "intervention";
    LogEntrySource2["Recommendation"] = "recommendation";
    LogEntrySource2["Other"] = "other";
  })(LogEntrySource = Log2.LogEntrySource || (Log2.LogEntrySource = {}));
  let LogEntryLevel;
  ((LogEntryLevel2) => {
    LogEntryLevel2["Verbose"] = "verbose";
    LogEntryLevel2["Info"] = "info";
    LogEntryLevel2["Warning"] = "warning";
    LogEntryLevel2["Error"] = "error";
  })(LogEntryLevel = Log2.LogEntryLevel || (Log2.LogEntryLevel = {}));
  let LogEntryCategory;
  ((LogEntryCategory2) => {
    LogEntryCategory2["Cors"] = "cors";
  })(LogEntryCategory = Log2.LogEntryCategory || (Log2.LogEntryCategory = {}));
  let ViolationSettingName;
  ((ViolationSettingName2) => {
    ViolationSettingName2["LongTask"] = "longTask";
    ViolationSettingName2["LongLayout"] = "longLayout";
    ViolationSettingName2["BlockedEvent"] = "blockedEvent";
    ViolationSettingName2["BlockedParser"] = "blockedParser";
    ViolationSettingName2["DiscouragedAPIUse"] = "discouragedAPIUse";
    ViolationSettingName2["Handler"] = "handler";
    ViolationSettingName2["RecurringHandler"] = "recurringHandler";
  })(ViolationSettingName = Log2.ViolationSettingName || (Log2.ViolationSettingName = {}));
})(Log || (Log = {}));
var Media;
((Media2) => {
  let PlayerMessageLevel;
  ((PlayerMessageLevel2) => {
    PlayerMessageLevel2["Error"] = "error";
    PlayerMessageLevel2["Warning"] = "warning";
    PlayerMessageLevel2["Info"] = "info";
    PlayerMessageLevel2["Debug"] = "debug";
  })(PlayerMessageLevel = Media2.PlayerMessageLevel || (Media2.PlayerMessageLevel = {}));
})(Media || (Media = {}));
var Memory;
((Memory2) => {
  let PressureLevel;
  ((PressureLevel2) => {
    PressureLevel2["Moderate"] = "moderate";
    PressureLevel2["Critical"] = "critical";
  })(PressureLevel = Memory2.PressureLevel || (Memory2.PressureLevel = {}));
})(Memory || (Memory = {}));
var Network2;
((Network3) => {
  let ResourceType2;
  ((ResourceType3) => {
    ResourceType3["Document"] = "Document";
    ResourceType3["Stylesheet"] = "Stylesheet";
    ResourceType3["Image"] = "Image";
    ResourceType3["Media"] = "Media";
    ResourceType3["Font"] = "Font";
    ResourceType3["Script"] = "Script";
    ResourceType3["TextTrack"] = "TextTrack";
    ResourceType3["XHR"] = "XHR";
    ResourceType3["Fetch"] = "Fetch";
    ResourceType3["Prefetch"] = "Prefetch";
    ResourceType3["EventSource"] = "EventSource";
    ResourceType3["WebSocket"] = "WebSocket";
    ResourceType3["Manifest"] = "Manifest";
    ResourceType3["SignedExchange"] = "SignedExchange";
    ResourceType3["Ping"] = "Ping";
    ResourceType3["CSPViolationReport"] = "CSPViolationReport";
    ResourceType3["Preflight"] = "Preflight";
    ResourceType3["FedCM"] = "FedCM";
    ResourceType3["Other"] = "Other";
  })(ResourceType2 = Network3.ResourceType || (Network3.ResourceType = {}));
  let ErrorReason;
  ((ErrorReason2) => {
    ErrorReason2["Failed"] = "Failed";
    ErrorReason2["Aborted"] = "Aborted";
    ErrorReason2["TimedOut"] = "TimedOut";
    ErrorReason2["AccessDenied"] = "AccessDenied";
    ErrorReason2["ConnectionClosed"] = "ConnectionClosed";
    ErrorReason2["ConnectionReset"] = "ConnectionReset";
    ErrorReason2["ConnectionRefused"] = "ConnectionRefused";
    ErrorReason2["ConnectionAborted"] = "ConnectionAborted";
    ErrorReason2["ConnectionFailed"] = "ConnectionFailed";
    ErrorReason2["NameNotResolved"] = "NameNotResolved";
    ErrorReason2["InternetDisconnected"] = "InternetDisconnected";
    ErrorReason2["AddressUnreachable"] = "AddressUnreachable";
    ErrorReason2["BlockedByClient"] = "BlockedByClient";
    ErrorReason2["BlockedByResponse"] = "BlockedByResponse";
  })(ErrorReason = Network3.ErrorReason || (Network3.ErrorReason = {}));
  let ConnectionType;
  ((ConnectionType2) => {
    ConnectionType2["None"] = "none";
    ConnectionType2["Cellular2g"] = "cellular2g";
    ConnectionType2["Cellular3g"] = "cellular3g";
    ConnectionType2["Cellular4g"] = "cellular4g";
    ConnectionType2["Bluetooth"] = "bluetooth";
    ConnectionType2["Ethernet"] = "ethernet";
    ConnectionType2["Wifi"] = "wifi";
    ConnectionType2["Wimax"] = "wimax";
    ConnectionType2["Other"] = "other";
  })(ConnectionType = Network3.ConnectionType || (Network3.ConnectionType = {}));
  let CookieSameSite;
  ((CookieSameSite2) => {
    CookieSameSite2["Strict"] = "Strict";
    CookieSameSite2["Lax"] = "Lax";
    CookieSameSite2["None"] = "None";
  })(CookieSameSite = Network3.CookieSameSite || (Network3.CookieSameSite = {}));
  let CookiePriority;
  ((CookiePriority2) => {
    CookiePriority2["Low"] = "Low";
    CookiePriority2["Medium"] = "Medium";
    CookiePriority2["High"] = "High";
  })(CookiePriority = Network3.CookiePriority || (Network3.CookiePriority = {}));
  let CookieSourceScheme;
  ((CookieSourceScheme2) => {
    CookieSourceScheme2["Unset"] = "Unset";
    CookieSourceScheme2["NonSecure"] = "NonSecure";
    CookieSourceScheme2["Secure"] = "Secure";
  })(CookieSourceScheme = Network3.CookieSourceScheme || (Network3.CookieSourceScheme = {}));
  let ResourcePriority;
  ((ResourcePriority2) => {
    ResourcePriority2["VeryLow"] = "VeryLow";
    ResourcePriority2["Low"] = "Low";
    ResourcePriority2["Medium"] = "Medium";
    ResourcePriority2["High"] = "High";
    ResourcePriority2["VeryHigh"] = "VeryHigh";
  })(ResourcePriority = Network3.ResourcePriority || (Network3.ResourcePriority = {}));
  let RenderBlockingBehavior;
  ((RenderBlockingBehavior2) => {
    RenderBlockingBehavior2["Blocking"] = "Blocking";
    RenderBlockingBehavior2["InBodyParserBlocking"] = "InBodyParserBlocking";
    RenderBlockingBehavior2["NonBlocking"] = "NonBlocking";
    RenderBlockingBehavior2["NonBlockingDynamic"] = "NonBlockingDynamic";
    RenderBlockingBehavior2["PotentiallyBlocking"] = "PotentiallyBlocking";
  })(RenderBlockingBehavior = Network3.RenderBlockingBehavior || (Network3.RenderBlockingBehavior = {}));
  let RequestReferrerPolicy;
  ((RequestReferrerPolicy2) => {
    RequestReferrerPolicy2["UnsafeUrl"] = "unsafe-url";
    RequestReferrerPolicy2["NoReferrerWhenDowngrade"] = "no-referrer-when-downgrade";
    RequestReferrerPolicy2["NoReferrer"] = "no-referrer";
    RequestReferrerPolicy2["Origin"] = "origin";
    RequestReferrerPolicy2["OriginWhenCrossOrigin"] = "origin-when-cross-origin";
    RequestReferrerPolicy2["SameOrigin"] = "same-origin";
    RequestReferrerPolicy2["StrictOrigin"] = "strict-origin";
    RequestReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strict-origin-when-cross-origin";
  })(RequestReferrerPolicy = Network3.RequestReferrerPolicy || (Network3.RequestReferrerPolicy = {}));
  let CertificateTransparencyCompliance;
  ((CertificateTransparencyCompliance2) => {
    CertificateTransparencyCompliance2["Unknown"] = "unknown";
    CertificateTransparencyCompliance2["NotCompliant"] = "not-compliant";
    CertificateTransparencyCompliance2["Compliant"] = "compliant";
  })(CertificateTransparencyCompliance = Network3.CertificateTransparencyCompliance || (Network3.CertificateTransparencyCompliance = {}));
  let BlockedReason;
  ((BlockedReason2) => {
    BlockedReason2["Other"] = "other";
    BlockedReason2["Csp"] = "csp";
    BlockedReason2["MixedContent"] = "mixed-content";
    BlockedReason2["Origin"] = "origin";
    BlockedReason2["Inspector"] = "inspector";
    BlockedReason2["Integrity"] = "integrity";
    BlockedReason2["SubresourceFilter"] = "subresource-filter";
    BlockedReason2["ContentType"] = "content-type";
    BlockedReason2["CoepFrameResourceNeedsCoepHeader"] = "coep-frame-resource-needs-coep-header";
    BlockedReason2["CoopSandboxedIframeCannotNavigateToCoopPage"] = "coop-sandboxed-iframe-cannot-navigate-to-coop-page";
    BlockedReason2["CorpNotSameOrigin"] = "corp-not-same-origin";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-dip";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep-and-dip";
    BlockedReason2["CorpNotSameSite"] = "corp-not-same-site";
    BlockedReason2["SriMessageSignatureMismatch"] = "sri-message-signature-mismatch";
  })(BlockedReason = Network3.BlockedReason || (Network3.BlockedReason = {}));
  let CorsError;
  ((CorsError2) => {
    CorsError2["DisallowedByMode"] = "DisallowedByMode";
    CorsError2["InvalidResponse"] = "InvalidResponse";
    CorsError2["WildcardOriginNotAllowed"] = "WildcardOriginNotAllowed";
    CorsError2["MissingAllowOriginHeader"] = "MissingAllowOriginHeader";
    CorsError2["MultipleAllowOriginValues"] = "MultipleAllowOriginValues";
    CorsError2["InvalidAllowOriginValue"] = "InvalidAllowOriginValue";
    CorsError2["AllowOriginMismatch"] = "AllowOriginMismatch";
    CorsError2["InvalidAllowCredentials"] = "InvalidAllowCredentials";
    CorsError2["CorsDisabledScheme"] = "CorsDisabledScheme";
    CorsError2["PreflightInvalidStatus"] = "PreflightInvalidStatus";
    CorsError2["PreflightDisallowedRedirect"] = "PreflightDisallowedRedirect";
    CorsError2["PreflightWildcardOriginNotAllowed"] = "PreflightWildcardOriginNotAllowed";
    CorsError2["PreflightMissingAllowOriginHeader"] = "PreflightMissingAllowOriginHeader";
    CorsError2["PreflightMultipleAllowOriginValues"] = "PreflightMultipleAllowOriginValues";
    CorsError2["PreflightInvalidAllowOriginValue"] = "PreflightInvalidAllowOriginValue";
    CorsError2["PreflightAllowOriginMismatch"] = "PreflightAllowOriginMismatch";
    CorsError2["PreflightInvalidAllowCredentials"] = "PreflightInvalidAllowCredentials";
    CorsError2["PreflightMissingAllowExternal"] = "PreflightMissingAllowExternal";
    CorsError2["PreflightInvalidAllowExternal"] = "PreflightInvalidAllowExternal";
    CorsError2["InvalidAllowMethodsPreflightResponse"] = "InvalidAllowMethodsPreflightResponse";
    CorsError2["InvalidAllowHeadersPreflightResponse"] = "InvalidAllowHeadersPreflightResponse";
    CorsError2["MethodDisallowedByPreflightResponse"] = "MethodDisallowedByPreflightResponse";
    CorsError2["HeaderDisallowedByPreflightResponse"] = "HeaderDisallowedByPreflightResponse";
    CorsError2["RedirectContainsCredentials"] = "RedirectContainsCredentials";
    CorsError2["InsecureLocalNetwork"] = "InsecureLocalNetwork";
    CorsError2["InvalidLocalNetworkAccess"] = "InvalidLocalNetworkAccess";
    CorsError2["NoCorsRedirectModeNotFollow"] = "NoCorsRedirectModeNotFollow";
    CorsError2["LocalNetworkAccessPermissionDenied"] = "LocalNetworkAccessPermissionDenied";
  })(CorsError = Network3.CorsError || (Network3.CorsError = {}));
  let ServiceWorkerResponseSource;
  ((ServiceWorkerResponseSource2) => {
    ServiceWorkerResponseSource2["CacheStorage"] = "cache-storage";
    ServiceWorkerResponseSource2["HttpCache"] = "http-cache";
    ServiceWorkerResponseSource2["FallbackCode"] = "fallback-code";
    ServiceWorkerResponseSource2["Network"] = "network";
  })(ServiceWorkerResponseSource = Network3.ServiceWorkerResponseSource || (Network3.ServiceWorkerResponseSource = {}));
  let TrustTokenParamsRefreshPolicy;
  ((TrustTokenParamsRefreshPolicy2) => {
    TrustTokenParamsRefreshPolicy2["UseCached"] = "UseCached";
    TrustTokenParamsRefreshPolicy2["Refresh"] = "Refresh";
  })(TrustTokenParamsRefreshPolicy = Network3.TrustTokenParamsRefreshPolicy || (Network3.TrustTokenParamsRefreshPolicy = {}));
  let TrustTokenOperationType;
  ((TrustTokenOperationType2) => {
    TrustTokenOperationType2["Issuance"] = "Issuance";
    TrustTokenOperationType2["Redemption"] = "Redemption";
    TrustTokenOperationType2["Signing"] = "Signing";
  })(TrustTokenOperationType = Network3.TrustTokenOperationType || (Network3.TrustTokenOperationType = {}));
  let AlternateProtocolUsage;
  ((AlternateProtocolUsage2) => {
    AlternateProtocolUsage2["AlternativeJobWonWithoutRace"] = "alternativeJobWonWithoutRace";
    AlternateProtocolUsage2["AlternativeJobWonRace"] = "alternativeJobWonRace";
    AlternateProtocolUsage2["MainJobWonRace"] = "mainJobWonRace";
    AlternateProtocolUsage2["MappingMissing"] = "mappingMissing";
    AlternateProtocolUsage2["Broken"] = "broken";
    AlternateProtocolUsage2["DnsAlpnH3JobWonWithoutRace"] = "dnsAlpnH3JobWonWithoutRace";
    AlternateProtocolUsage2["DnsAlpnH3JobWonRace"] = "dnsAlpnH3JobWonRace";
    AlternateProtocolUsage2["UnspecifiedReason"] = "unspecifiedReason";
  })(AlternateProtocolUsage = Network3.AlternateProtocolUsage || (Network3.AlternateProtocolUsage = {}));
  let ServiceWorkerRouterSource;
  ((ServiceWorkerRouterSource2) => {
    ServiceWorkerRouterSource2["Network"] = "network";
    ServiceWorkerRouterSource2["Cache"] = "cache";
    ServiceWorkerRouterSource2["FetchEvent"] = "fetch-event";
    ServiceWorkerRouterSource2["RaceNetworkAndFetchHandler"] = "race-network-and-fetch-handler";
    ServiceWorkerRouterSource2["RaceNetworkAndCache"] = "race-network-and-cache";
  })(ServiceWorkerRouterSource = Network3.ServiceWorkerRouterSource || (Network3.ServiceWorkerRouterSource = {}));
  let InitiatorType;
  ((InitiatorType2) => {
    InitiatorType2["Parser"] = "parser";
    InitiatorType2["Script"] = "script";
    InitiatorType2["Preload"] = "preload";
    InitiatorType2["SignedExchange"] = "SignedExchange";
    InitiatorType2["Preflight"] = "preflight";
    InitiatorType2["FedCM"] = "FedCM";
    InitiatorType2["Other"] = "other";
  })(InitiatorType = Network3.InitiatorType || (Network3.InitiatorType = {}));
  let SetCookieBlockedReason;
  ((SetCookieBlockedReason2) => {
    SetCookieBlockedReason2["SecureOnly"] = "SecureOnly";
    SetCookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    SetCookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    SetCookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    SetCookieBlockedReason2["UserPreferences"] = "UserPreferences";
    SetCookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    SetCookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    SetCookieBlockedReason2["SyntaxError"] = "SyntaxError";
    SetCookieBlockedReason2["SchemeNotSupported"] = "SchemeNotSupported";
    SetCookieBlockedReason2["OverwriteSecure"] = "OverwriteSecure";
    SetCookieBlockedReason2["InvalidDomain"] = "InvalidDomain";
    SetCookieBlockedReason2["InvalidPrefix"] = "InvalidPrefix";
    SetCookieBlockedReason2["UnknownError"] = "UnknownError";
    SetCookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    SetCookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    SetCookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    SetCookieBlockedReason2["DisallowedCharacter"] = "DisallowedCharacter";
    SetCookieBlockedReason2["NoCookieContent"] = "NoCookieContent";
  })(SetCookieBlockedReason = Network3.SetCookieBlockedReason || (Network3.SetCookieBlockedReason = {}));
  let CookieBlockedReason;
  ((CookieBlockedReason2) => {
    CookieBlockedReason2["SecureOnly"] = "SecureOnly";
    CookieBlockedReason2["NotOnPath"] = "NotOnPath";
    CookieBlockedReason2["DomainMismatch"] = "DomainMismatch";
    CookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    CookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    CookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    CookieBlockedReason2["UserPreferences"] = "UserPreferences";
    CookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    CookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    CookieBlockedReason2["UnknownError"] = "UnknownError";
    CookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    CookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    CookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    CookieBlockedReason2["PortMismatch"] = "PortMismatch";
    CookieBlockedReason2["SchemeMismatch"] = "SchemeMismatch";
    CookieBlockedReason2["AnonymousContext"] = "AnonymousContext";
  })(CookieBlockedReason = Network3.CookieBlockedReason || (Network3.CookieBlockedReason = {}));
  let CookieExemptionReason;
  ((CookieExemptionReason2) => {
    CookieExemptionReason2["None"] = "None";
    CookieExemptionReason2["UserSetting"] = "UserSetting";
    CookieExemptionReason2["EnterprisePolicy"] = "EnterprisePolicy";
    CookieExemptionReason2["StorageAccess"] = "StorageAccess";
    CookieExemptionReason2["TopLevelStorageAccess"] = "TopLevelStorageAccess";
    CookieExemptionReason2["Scheme"] = "Scheme";
    CookieExemptionReason2["SameSiteNoneCookiesInSandbox"] = "SameSiteNoneCookiesInSandbox";
  })(CookieExemptionReason = Network3.CookieExemptionReason || (Network3.CookieExemptionReason = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Network3.AuthChallengeSource || (Network3.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Network3.AuthChallengeResponseResponse || (Network3.AuthChallengeResponseResponse = {}));
  let SignedExchangeErrorField;
  ((SignedExchangeErrorField2) => {
    SignedExchangeErrorField2["SignatureSig"] = "signatureSig";
    SignedExchangeErrorField2["SignatureIntegrity"] = "signatureIntegrity";
    SignedExchangeErrorField2["SignatureCertUrl"] = "signatureCertUrl";
    SignedExchangeErrorField2["SignatureCertSha256"] = "signatureCertSha256";
    SignedExchangeErrorField2["SignatureValidityUrl"] = "signatureValidityUrl";
    SignedExchangeErrorField2["SignatureTimestamps"] = "signatureTimestamps";
  })(SignedExchangeErrorField = Network3.SignedExchangeErrorField || (Network3.SignedExchangeErrorField = {}));
  let DirectSocketDnsQueryType;
  ((DirectSocketDnsQueryType2) => {
    DirectSocketDnsQueryType2["Ipv4"] = "ipv4";
    DirectSocketDnsQueryType2["Ipv6"] = "ipv6";
  })(DirectSocketDnsQueryType = Network3.DirectSocketDnsQueryType || (Network3.DirectSocketDnsQueryType = {}));
  let LocalNetworkAccessRequestPolicy;
  ((LocalNetworkAccessRequestPolicy2) => {
    LocalNetworkAccessRequestPolicy2["Allow"] = "Allow";
    LocalNetworkAccessRequestPolicy2["BlockFromInsecureToMorePrivate"] = "BlockFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["WarnFromInsecureToMorePrivate"] = "WarnFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["PermissionBlock"] = "PermissionBlock";
    LocalNetworkAccessRequestPolicy2["PermissionWarn"] = "PermissionWarn";
  })(LocalNetworkAccessRequestPolicy = Network3.LocalNetworkAccessRequestPolicy || (Network3.LocalNetworkAccessRequestPolicy = {}));
  let IPAddressSpace;
  ((IPAddressSpace2) => {
    IPAddressSpace2["Loopback"] = "Loopback";
    IPAddressSpace2["Local"] = "Local";
    IPAddressSpace2["Public"] = "Public";
    IPAddressSpace2["Unknown"] = "Unknown";
  })(IPAddressSpace = Network3.IPAddressSpace || (Network3.IPAddressSpace = {}));
  let CrossOriginOpenerPolicyValue;
  ((CrossOriginOpenerPolicyValue2) => {
    CrossOriginOpenerPolicyValue2["SameOrigin"] = "SameOrigin";
    CrossOriginOpenerPolicyValue2["SameOriginAllowPopups"] = "SameOriginAllowPopups";
    CrossOriginOpenerPolicyValue2["RestrictProperties"] = "RestrictProperties";
    CrossOriginOpenerPolicyValue2["UnsafeNone"] = "UnsafeNone";
    CrossOriginOpenerPolicyValue2["SameOriginPlusCoep"] = "SameOriginPlusCoep";
    CrossOriginOpenerPolicyValue2["RestrictPropertiesPlusCoep"] = "RestrictPropertiesPlusCoep";
    CrossOriginOpenerPolicyValue2["NoopenerAllowPopups"] = "NoopenerAllowPopups";
  })(CrossOriginOpenerPolicyValue = Network3.CrossOriginOpenerPolicyValue || (Network3.CrossOriginOpenerPolicyValue = {}));
  let CrossOriginEmbedderPolicyValue;
  ((CrossOriginEmbedderPolicyValue2) => {
    CrossOriginEmbedderPolicyValue2["None"] = "None";
    CrossOriginEmbedderPolicyValue2["Credentialless"] = "Credentialless";
    CrossOriginEmbedderPolicyValue2["RequireCorp"] = "RequireCorp";
  })(CrossOriginEmbedderPolicyValue = Network3.CrossOriginEmbedderPolicyValue || (Network3.CrossOriginEmbedderPolicyValue = {}));
  let ContentSecurityPolicySource;
  ((ContentSecurityPolicySource2) => {
    ContentSecurityPolicySource2["HTTP"] = "HTTP";
    ContentSecurityPolicySource2["Meta"] = "Meta";
  })(ContentSecurityPolicySource = Network3.ContentSecurityPolicySource || (Network3.ContentSecurityPolicySource = {}));
  let ReportStatus;
  ((ReportStatus2) => {
    ReportStatus2["Queued"] = "Queued";
    ReportStatus2["Pending"] = "Pending";
    ReportStatus2["MarkedForRemoval"] = "MarkedForRemoval";
    ReportStatus2["Success"] = "Success";
  })(ReportStatus = Network3.ReportStatus || (Network3.ReportStatus = {}));
  let DeviceBoundSessionWithUsageUsage;
  ((DeviceBoundSessionWithUsageUsage2) => {
    DeviceBoundSessionWithUsageUsage2["NotInScope"] = "NotInScope";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotAllowed"] = "InScopeRefreshNotAllowed";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshNotPossible"] = "ProactiveRefreshNotPossible";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshAttempted"] = "ProactiveRefreshAttempted";
    DeviceBoundSessionWithUsageUsage2["Deferred"] = "Deferred";
  })(DeviceBoundSessionWithUsageUsage = Network3.DeviceBoundSessionWithUsageUsage || (Network3.DeviceBoundSessionWithUsageUsage = {}));
  let DeviceBoundSessionUrlRuleRuleType;
  ((DeviceBoundSessionUrlRuleRuleType2) => {
    DeviceBoundSessionUrlRuleRuleType2["Exclude"] = "Exclude";
    DeviceBoundSessionUrlRuleRuleType2["Include"] = "Include";
  })(DeviceBoundSessionUrlRuleRuleType = Network3.DeviceBoundSessionUrlRuleRuleType || (Network3.DeviceBoundSessionUrlRuleRuleType = {}));
  let DeviceBoundSessionFetchResult;
  ((DeviceBoundSessionFetchResult2) => {
    DeviceBoundSessionFetchResult2["Success"] = "Success";
    DeviceBoundSessionFetchResult2["SigningKeyGenerationError"] = "SigningKeyGenerationError";
    DeviceBoundSessionFetchResult2["AttestationKeyGenerationError"] = "AttestationKeyGenerationError";
    DeviceBoundSessionFetchResult2["SigningError"] = "SigningError";
    DeviceBoundSessionFetchResult2["TransientSigningError"] = "TransientSigningError";
    DeviceBoundSessionFetchResult2["ServerRequestedTermination"] = "ServerRequestedTermination";
    DeviceBoundSessionFetchResult2["InvalidSessionId"] = "InvalidSessionId";
    DeviceBoundSessionFetchResult2["InvalidChallenge"] = "InvalidChallenge";
    DeviceBoundSessionFetchResult2["TooManyChallenges"] = "TooManyChallenges";
    DeviceBoundSessionFetchResult2["InvalidFetcherUrl"] = "InvalidFetcherUrl";
    DeviceBoundSessionFetchResult2["InvalidRefreshUrl"] = "InvalidRefreshUrl";
    DeviceBoundSessionFetchResult2["TransientHttpError"] = "TransientHttpError";
    DeviceBoundSessionFetchResult2["ScopeOriginSameSiteMismatch"] = "ScopeOriginSameSiteMismatch";
    DeviceBoundSessionFetchResult2["RefreshUrlSameSiteMismatch"] = "RefreshUrlSameSiteMismatch";
    DeviceBoundSessionFetchResult2["MismatchedSessionId"] = "MismatchedSessionId";
    DeviceBoundSessionFetchResult2["MissingScope"] = "MissingScope";
    DeviceBoundSessionFetchResult2["NoCredentials"] = "NoCredentials";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownUnavailable"] = "SubdomainRegistrationWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationUnauthorized"] = "SubdomainRegistrationUnauthorized";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownMalformed"] = "SubdomainRegistrationWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownUnavailable"] = "SessionProviderWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownUnavailable"] = "RelyingPartyWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["FederatedKeyThumbprintMismatch"] = "FederatedKeyThumbprintMismatch";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionUrl"] = "InvalidFederatedSessionUrl";
    DeviceBoundSessionFetchResult2["InvalidFederatedKey"] = "InvalidFederatedKey";
    DeviceBoundSessionFetchResult2["TooManyRelyingOriginLabels"] = "TooManyRelyingOriginLabels";
    DeviceBoundSessionFetchResult2["BoundCookieSetForbidden"] = "BoundCookieSetForbidden";
    DeviceBoundSessionFetchResult2["NetError"] = "NetError";
    DeviceBoundSessionFetchResult2["ProxyError"] = "ProxyError";
    DeviceBoundSessionFetchResult2["EmptySessionConfig"] = "EmptySessionConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsConfig"] = "InvalidCredentialsConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsType"] = "InvalidCredentialsType";
    DeviceBoundSessionFetchResult2["InvalidCredentialsEmptyName"] = "InvalidCredentialsEmptyName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookie"] = "InvalidCredentialsCookie";
    DeviceBoundSessionFetchResult2["PersistentHttpError"] = "PersistentHttpError";
    DeviceBoundSessionFetchResult2["RegistrationAttemptedChallenge"] = "RegistrationAttemptedChallenge";
    DeviceBoundSessionFetchResult2["InvalidScopeOrigin"] = "InvalidScopeOrigin";
    DeviceBoundSessionFetchResult2["ScopeOriginContainsPath"] = "ScopeOriginContainsPath";
    DeviceBoundSessionFetchResult2["RefreshInitiatorNotString"] = "RefreshInitiatorNotString";
    DeviceBoundSessionFetchResult2["RefreshInitiatorInvalidHostPattern"] = "RefreshInitiatorInvalidHostPattern";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecification"] = "InvalidScopeSpecification";
    DeviceBoundSessionFetchResult2["MissingScopeSpecificationType"] = "MissingScopeSpecificationType";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationDomain"] = "EmptyScopeSpecificationDomain";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationPath"] = "EmptyScopeSpecificationPath";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecificationType"] = "InvalidScopeSpecificationType";
    DeviceBoundSessionFetchResult2["InvalidScopeIncludeSite"] = "InvalidScopeIncludeSite";
    DeviceBoundSessionFetchResult2["MissingScopeIncludeSite"] = "MissingScopeIncludeSite";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByProvider"] = "FederatedNotAuthorizedByProvider";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByRelyingParty"] = "FederatedNotAuthorizedByRelyingParty";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownMalformed"] = "SessionProviderWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownHasProviderOrigin"] = "SessionProviderWellKnownHasProviderOrigin";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownMalformed"] = "RelyingPartyWellKnownMalformed";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownHasRelyingOrigins"] = "RelyingPartyWellKnownHasRelyingOrigins";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderSessionMissing"] = "InvalidFederatedSessionProviderSessionMissing";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionWrongProviderOrigin"] = "InvalidFederatedSessionWrongProviderOrigin";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieCreationTime"] = "InvalidCredentialsCookieCreationTime";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieName"] = "InvalidCredentialsCookieName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieParsing"] = "InvalidCredentialsCookieParsing";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieUnpermittedAttribute"] = "InvalidCredentialsCookieUnpermittedAttribute";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieInvalidDomain"] = "InvalidCredentialsCookieInvalidDomain";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookiePrefix"] = "InvalidCredentialsCookiePrefix";
    DeviceBoundSessionFetchResult2["InvalidScopeRulePath"] = "InvalidScopeRulePath";
    DeviceBoundSessionFetchResult2["InvalidScopeRuleHostPattern"] = "InvalidScopeRuleHostPattern";
    DeviceBoundSessionFetchResult2["ScopeRuleOriginScopedHostPatternMismatch"] = "ScopeRuleOriginScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["ScopeRuleSiteScopedHostPatternMismatch"] = "ScopeRuleSiteScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    DeviceBoundSessionFetchResult2["InvalidConfigJson"] = "InvalidConfigJson";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderFailedToRestoreKey"] = "InvalidFederatedSessionProviderFailedToRestoreKey";
    DeviceBoundSessionFetchResult2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    DeviceBoundSessionFetchResult2["SessionDeletedDuringRefresh"] = "SessionDeletedDuringRefresh";
    DeviceBoundSessionFetchResult2["CrossOriginRegistrationSiteNotIncluded"] = "CrossOriginRegistrationSiteNotIncluded";
    DeviceBoundSessionFetchResult2["InvalidPreProvisionedKeyInitiatorMissing"] = "InvalidPreProvisionedKeyInitiatorMissing";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyAccessNotGranted"] = "PreProvisionedKeyAccessNotGranted";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyNotFound"] = "PreProvisionedKeyNotFound";
    DeviceBoundSessionFetchResult2["AttestationCertificationError"] = "AttestationCertificationError";
    DeviceBoundSessionFetchResult2["AttestationSigningError"] = "AttestationSigningError";
  })(DeviceBoundSessionFetchResult = Network3.DeviceBoundSessionFetchResult || (Network3.DeviceBoundSessionFetchResult = {}));
  let RefreshEventDetailsRefreshResult;
  ((RefreshEventDetailsRefreshResult2) => {
    RefreshEventDetailsRefreshResult2["Refreshed"] = "Refreshed";
    RefreshEventDetailsRefreshResult2["InitializedService"] = "InitializedService";
    RefreshEventDetailsRefreshResult2["Unreachable"] = "Unreachable";
    RefreshEventDetailsRefreshResult2["ServerError"] = "ServerError";
    RefreshEventDetailsRefreshResult2["FatalError"] = "FatalError";
    RefreshEventDetailsRefreshResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    RefreshEventDetailsRefreshResult2["RefreshedAsWaiter"] = "RefreshedAsWaiter";
    RefreshEventDetailsRefreshResult2["TransientSigningError"] = "TransientSigningError";
    RefreshEventDetailsRefreshResult2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
  })(RefreshEventDetailsRefreshResult = Network3.RefreshEventDetailsRefreshResult || (Network3.RefreshEventDetailsRefreshResult = {}));
  let TerminationEventDetailsDeletionReason;
  ((TerminationEventDetailsDeletionReason2) => {
    TerminationEventDetailsDeletionReason2["Expired"] = "Expired";
    TerminationEventDetailsDeletionReason2["FailedToRestoreKey"] = "FailedToRestoreKey";
    TerminationEventDetailsDeletionReason2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    TerminationEventDetailsDeletionReason2["StoragePartitionCleared"] = "StoragePartitionCleared";
    TerminationEventDetailsDeletionReason2["ClearBrowsingData"] = "ClearBrowsingData";
    TerminationEventDetailsDeletionReason2["ServerRequested"] = "ServerRequested";
    TerminationEventDetailsDeletionReason2["InvalidSessionParams"] = "InvalidSessionParams";
    TerminationEventDetailsDeletionReason2["RefreshFatalError"] = "RefreshFatalError";
    TerminationEventDetailsDeletionReason2["DevTools"] = "DevTools";
  })(TerminationEventDetailsDeletionReason = Network3.TerminationEventDetailsDeletionReason || (Network3.TerminationEventDetailsDeletionReason = {}));
  let ChallengeEventDetailsChallengeResult;
  ((ChallengeEventDetailsChallengeResult2) => {
    ChallengeEventDetailsChallengeResult2["Success"] = "Success";
    ChallengeEventDetailsChallengeResult2["NoSessionId"] = "NoSessionId";
    ChallengeEventDetailsChallengeResult2["NoSessionMatch"] = "NoSessionMatch";
    ChallengeEventDetailsChallengeResult2["CantSetBoundCookie"] = "CantSetBoundCookie";
  })(ChallengeEventDetailsChallengeResult = Network3.ChallengeEventDetailsChallengeResult || (Network3.ChallengeEventDetailsChallengeResult = {}));
  let TrustTokenOperationDoneEventStatus;
  ((TrustTokenOperationDoneEventStatus2) => {
    TrustTokenOperationDoneEventStatus2["Ok"] = "Ok";
    TrustTokenOperationDoneEventStatus2["InvalidArgument"] = "InvalidArgument";
    TrustTokenOperationDoneEventStatus2["MissingIssuerKeys"] = "MissingIssuerKeys";
    TrustTokenOperationDoneEventStatus2["FailedPrecondition"] = "FailedPrecondition";
    TrustTokenOperationDoneEventStatus2["ResourceExhausted"] = "ResourceExhausted";
    TrustTokenOperationDoneEventStatus2["AlreadyExists"] = "AlreadyExists";
    TrustTokenOperationDoneEventStatus2["ResourceLimited"] = "ResourceLimited";
    TrustTokenOperationDoneEventStatus2["Unauthorized"] = "Unauthorized";
    TrustTokenOperationDoneEventStatus2["BadResponse"] = "BadResponse";
    TrustTokenOperationDoneEventStatus2["InternalError"] = "InternalError";
    TrustTokenOperationDoneEventStatus2["UnknownError"] = "UnknownError";
    TrustTokenOperationDoneEventStatus2["FulfilledLocally"] = "FulfilledLocally";
    TrustTokenOperationDoneEventStatus2["SiteIssuerLimit"] = "SiteIssuerLimit";
  })(TrustTokenOperationDoneEventStatus = Network3.TrustTokenOperationDoneEventStatus || (Network3.TrustTokenOperationDoneEventStatus = {}));
})(Network2 || (Network2 = {}));
var Overlay;
((Overlay2) => {
  let LineStylePattern;
  ((LineStylePattern2) => {
    LineStylePattern2["Dashed"] = "dashed";
    LineStylePattern2["Dotted"] = "dotted";
  })(LineStylePattern = Overlay2.LineStylePattern || (Overlay2.LineStylePattern = {}));
  let ContrastAlgorithm;
  ((ContrastAlgorithm2) => {
    ContrastAlgorithm2["Aa"] = "aa";
    ContrastAlgorithm2["Aaa"] = "aaa";
    ContrastAlgorithm2["Apca"] = "apca";
  })(ContrastAlgorithm = Overlay2.ContrastAlgorithm || (Overlay2.ContrastAlgorithm = {}));
  let ColorFormat;
  ((ColorFormat2) => {
    ColorFormat2["Rgb"] = "rgb";
    ColorFormat2["Hsl"] = "hsl";
    ColorFormat2["Hwb"] = "hwb";
    ColorFormat2["Hex"] = "hex";
  })(ColorFormat = Overlay2.ColorFormat || (Overlay2.ColorFormat = {}));
  let DisplayCutoutShape;
  ((DisplayCutoutShape2) => {
    DisplayCutoutShape2["Pill"] = "pill";
    DisplayCutoutShape2["Notch"] = "notch";
    DisplayCutoutShape2["Circle"] = "circle";
    DisplayCutoutShape2["Rectangle"] = "rectangle";
  })(DisplayCutoutShape = Overlay2.DisplayCutoutShape || (Overlay2.DisplayCutoutShape = {}));
  let InspectMode;
  ((InspectMode2) => {
    InspectMode2["SearchForNode"] = "searchForNode";
    InspectMode2["SearchForUAShadowDOM"] = "searchForUAShadowDOM";
    InspectMode2["CaptureAreaScreenshot"] = "captureAreaScreenshot";
    InspectMode2["None"] = "none";
  })(InspectMode = Overlay2.InspectMode || (Overlay2.InspectMode = {}));
})(Overlay || (Overlay = {}));
var PWA;
((PWA2) => {
  let DisplayMode;
  ((DisplayMode2) => {
    DisplayMode2["Standalone"] = "standalone";
    DisplayMode2["Browser"] = "browser";
  })(DisplayMode = PWA2.DisplayMode || (PWA2.DisplayMode = {}));
})(PWA || (PWA = {}));
var Page;
((Page2) => {
  let AdFrameType;
  ((AdFrameType2) => {
    AdFrameType2["None"] = "none";
    AdFrameType2["Child"] = "child";
    AdFrameType2["Root"] = "root";
  })(AdFrameType = Page2.AdFrameType || (Page2.AdFrameType = {}));
  let AdFrameExplanation;
  ((AdFrameExplanation2) => {
    AdFrameExplanation2["ParentIsAd"] = "ParentIsAd";
    AdFrameExplanation2["CreatedByAdScript"] = "CreatedByAdScript";
    AdFrameExplanation2["MatchedBlockingRule"] = "MatchedBlockingRule";
  })(AdFrameExplanation = Page2.AdFrameExplanation || (Page2.AdFrameExplanation = {}));
  let SecureContextType;
  ((SecureContextType2) => {
    SecureContextType2["Secure"] = "Secure";
    SecureContextType2["SecureLocalhost"] = "SecureLocalhost";
    SecureContextType2["InsecureScheme"] = "InsecureScheme";
    SecureContextType2["InsecureAncestor"] = "InsecureAncestor";
  })(SecureContextType = Page2.SecureContextType || (Page2.SecureContextType = {}));
  let CrossOriginIsolatedContextType;
  ((CrossOriginIsolatedContextType2) => {
    CrossOriginIsolatedContextType2["Isolated"] = "Isolated";
    CrossOriginIsolatedContextType2["NotIsolated"] = "NotIsolated";
    CrossOriginIsolatedContextType2["NotIsolatedFeatureDisabled"] = "NotIsolatedFeatureDisabled";
  })(CrossOriginIsolatedContextType = Page2.CrossOriginIsolatedContextType || (Page2.CrossOriginIsolatedContextType = {}));
  let GatedAPIFeatures;
  ((GatedAPIFeatures2) => {
    GatedAPIFeatures2["SharedArrayBuffers"] = "SharedArrayBuffers";
    GatedAPIFeatures2["SharedArrayBuffersTransferAllowed"] = "SharedArrayBuffersTransferAllowed";
    GatedAPIFeatures2["PerformanceMeasureMemory"] = "PerformanceMeasureMemory";
    GatedAPIFeatures2["PerformanceProfile"] = "PerformanceProfile";
  })(GatedAPIFeatures = Page2.GatedAPIFeatures || (Page2.GatedAPIFeatures = {}));
  let PermissionsPolicyFeature;
  ((PermissionsPolicyFeature2) => {
    PermissionsPolicyFeature2["Accelerometer"] = "accelerometer";
    PermissionsPolicyFeature2["AllScreensCapture"] = "all-screens-capture";
    PermissionsPolicyFeature2["AmbientLightSensor"] = "ambient-light-sensor";
    PermissionsPolicyFeature2["AriaNotify"] = "aria-notify";
    PermissionsPolicyFeature2["Autofill"] = "autofill";
    PermissionsPolicyFeature2["Autoplay"] = "autoplay";
    PermissionsPolicyFeature2["Bluetooth"] = "bluetooth";
    PermissionsPolicyFeature2["BrowsingTopics"] = "browsing-topics";
    PermissionsPolicyFeature2["Camera"] = "camera";
    PermissionsPolicyFeature2["CapturedSurfaceControl"] = "captured-surface-control";
    PermissionsPolicyFeature2["ChDpr"] = "ch-dpr";
    PermissionsPolicyFeature2["ChDeviceMemory"] = "ch-device-memory";
    PermissionsPolicyFeature2["ChDownlink"] = "ch-downlink";
    PermissionsPolicyFeature2["ChEct"] = "ch-ect";
    PermissionsPolicyFeature2["ChPrefersColorScheme"] = "ch-prefers-color-scheme";
    PermissionsPolicyFeature2["ChPrefersReducedMotion"] = "ch-prefers-reduced-motion";
    PermissionsPolicyFeature2["ChPrefersReducedTransparency"] = "ch-prefers-reduced-transparency";
    PermissionsPolicyFeature2["ChRtt"] = "ch-rtt";
    PermissionsPolicyFeature2["ChSaveData"] = "ch-save-data";
    PermissionsPolicyFeature2["ChUa"] = "ch-ua";
    PermissionsPolicyFeature2["ChUaArch"] = "ch-ua-arch";
    PermissionsPolicyFeature2["ChUaBitness"] = "ch-ua-bitness";
    PermissionsPolicyFeature2["ChUaHighEntropyValues"] = "ch-ua-high-entropy-values";
    PermissionsPolicyFeature2["ChUaPlatform"] = "ch-ua-platform";
    PermissionsPolicyFeature2["ChUaModel"] = "ch-ua-model";
    PermissionsPolicyFeature2["ChUaMobile"] = "ch-ua-mobile";
    PermissionsPolicyFeature2["ChUaFormFactors"] = "ch-ua-form-factors";
    PermissionsPolicyFeature2["ChUaFullVersion"] = "ch-ua-full-version";
    PermissionsPolicyFeature2["ChUaFullVersionList"] = "ch-ua-full-version-list";
    PermissionsPolicyFeature2["ChUaPlatformVersion"] = "ch-ua-platform-version";
    PermissionsPolicyFeature2["ChUaWow64"] = "ch-ua-wow64";
    PermissionsPolicyFeature2["ChViewportHeight"] = "ch-viewport-height";
    PermissionsPolicyFeature2["ChViewportWidth"] = "ch-viewport-width";
    PermissionsPolicyFeature2["ChWidth"] = "ch-width";
    PermissionsPolicyFeature2["ClipboardRead"] = "clipboard-read";
    PermissionsPolicyFeature2["ClipboardWrite"] = "clipboard-write";
    PermissionsPolicyFeature2["ComputePressure"] = "compute-pressure";
    PermissionsPolicyFeature2["ControlledFrame"] = "controlled-frame";
    PermissionsPolicyFeature2["CrossOriginIsolated"] = "cross-origin-isolated";
    PermissionsPolicyFeature2["DeferredFetch"] = "deferred-fetch";
    PermissionsPolicyFeature2["DeferredFetchMinimal"] = "deferred-fetch-minimal";
    PermissionsPolicyFeature2["DeviceAttributes"] = "device-attributes";
    PermissionsPolicyFeature2["DigitalCredentialsCreate"] = "digital-credentials-create";
    PermissionsPolicyFeature2["DigitalCredentialsGet"] = "digital-credentials-get";
    PermissionsPolicyFeature2["DirectSockets"] = "direct-sockets";
    PermissionsPolicyFeature2["DirectSocketsMulticast"] = "direct-sockets-multicast";
    PermissionsPolicyFeature2["DisplayCapture"] = "display-capture";
    PermissionsPolicyFeature2["DocumentDomain"] = "document-domain";
    PermissionsPolicyFeature2["EncryptedMedia"] = "encrypted-media";
    PermissionsPolicyFeature2["ExecutionWhileOutOfViewport"] = "execution-while-out-of-viewport";
    PermissionsPolicyFeature2["ExecutionWhileNotRendered"] = "execution-while-not-rendered";
    PermissionsPolicyFeature2["FocusWithoutUserActivation"] = "focus-without-user-activation";
    PermissionsPolicyFeature2["Fullscreen"] = "fullscreen";
    PermissionsPolicyFeature2["Frobulate"] = "frobulate";
    PermissionsPolicyFeature2["Gamepad"] = "gamepad";
    PermissionsPolicyFeature2["Geolocation"] = "geolocation";
    PermissionsPolicyFeature2["Gyroscope"] = "gyroscope";
    PermissionsPolicyFeature2["Haptics"] = "haptics";
    PermissionsPolicyFeature2["Hid"] = "hid";
    PermissionsPolicyFeature2["IdentityCredentialsGet"] = "identity-credentials-get";
    PermissionsPolicyFeature2["IdleDetection"] = "idle-detection";
    PermissionsPolicyFeature2["InterestCohort"] = "interest-cohort";
    PermissionsPolicyFeature2["KeyboardMap"] = "keyboard-map";
    PermissionsPolicyFeature2["LanguageDetector"] = "language-detector";
    PermissionsPolicyFeature2["LanguageModel"] = "language-model";
    PermissionsPolicyFeature2["LocalFonts"] = "local-fonts";
    PermissionsPolicyFeature2["LocalNetwork"] = "local-network";
    PermissionsPolicyFeature2["LocalNetworkAccess"] = "local-network-access";
    PermissionsPolicyFeature2["LoopbackNetwork"] = "loopback-network";
    PermissionsPolicyFeature2["Magnetometer"] = "magnetometer";
    PermissionsPolicyFeature2["ManualText"] = "manual-text";
    PermissionsPolicyFeature2["MediaPlaybackWhileNotVisible"] = "media-playback-while-not-visible";
    PermissionsPolicyFeature2["Microphone"] = "microphone";
    PermissionsPolicyFeature2["Midi"] = "midi";
    PermissionsPolicyFeature2["OnDeviceSpeechRecognition"] = "on-device-speech-recognition";
    PermissionsPolicyFeature2["OtpCredentials"] = "otp-credentials";
    PermissionsPolicyFeature2["Payment"] = "payment";
    PermissionsPolicyFeature2["PictureInPicture"] = "picture-in-picture";
    PermissionsPolicyFeature2["PrivateStateTokenIssuance"] = "private-state-token-issuance";
    PermissionsPolicyFeature2["PrivateStateTokenRedemption"] = "private-state-token-redemption";
    PermissionsPolicyFeature2["PublickeyCredentialsCreate"] = "publickey-credentials-create";
    PermissionsPolicyFeature2["PublickeyCredentialsGet"] = "publickey-credentials-get";
    PermissionsPolicyFeature2["Rewriter"] = "rewriter";
    PermissionsPolicyFeature2["ScreenWakeLock"] = "screen-wake-lock";
    PermissionsPolicyFeature2["Serial"] = "serial";
    PermissionsPolicyFeature2["SharedStorage"] = "shared-storage";
    PermissionsPolicyFeature2["SharedStorageSelectUrl"] = "shared-storage-select-url";
    PermissionsPolicyFeature2["SmartCard"] = "smart-card";
    PermissionsPolicyFeature2["SpeakerSelection"] = "speaker-selection";
    PermissionsPolicyFeature2["StorageAccess"] = "storage-access";
    PermissionsPolicyFeature2["SubApps"] = "sub-apps";
    PermissionsPolicyFeature2["Summarizer"] = "summarizer";
    PermissionsPolicyFeature2["SyncXhr"] = "sync-xhr";
    PermissionsPolicyFeature2["Tools"] = "tools";
    PermissionsPolicyFeature2["Translator"] = "translator";
    PermissionsPolicyFeature2["Unload"] = "unload";
    PermissionsPolicyFeature2["Usb"] = "usb";
    PermissionsPolicyFeature2["UsbUnrestricted"] = "usb-unrestricted";
    PermissionsPolicyFeature2["VerticalScroll"] = "vertical-scroll";
    PermissionsPolicyFeature2["WebAppInstallation"] = "web-app-installation";
    PermissionsPolicyFeature2["Webnn"] = "webnn";
    PermissionsPolicyFeature2["WebPrinting"] = "web-printing";
    PermissionsPolicyFeature2["WebShare"] = "web-share";
    PermissionsPolicyFeature2["WindowManagement"] = "window-management";
    PermissionsPolicyFeature2["Writer"] = "writer";
    PermissionsPolicyFeature2["XrSpatialTracking"] = "xr-spatial-tracking";
  })(PermissionsPolicyFeature = Page2.PermissionsPolicyFeature || (Page2.PermissionsPolicyFeature = {}));
  let PermissionsPolicyBlockReason;
  ((PermissionsPolicyBlockReason2) => {
    PermissionsPolicyBlockReason2["Header"] = "Header";
    PermissionsPolicyBlockReason2["IframeAttribute"] = "IframeAttribute";
    PermissionsPolicyBlockReason2["InFencedFrameTree"] = "InFencedFrameTree";
    PermissionsPolicyBlockReason2["InIsolatedApp"] = "InIsolatedApp";
  })(PermissionsPolicyBlockReason = Page2.PermissionsPolicyBlockReason || (Page2.PermissionsPolicyBlockReason = {}));
  let OriginTrialTokenStatus;
  ((OriginTrialTokenStatus2) => {
    OriginTrialTokenStatus2["Success"] = "Success";
    OriginTrialTokenStatus2["NotSupported"] = "NotSupported";
    OriginTrialTokenStatus2["Insecure"] = "Insecure";
    OriginTrialTokenStatus2["Expired"] = "Expired";
    OriginTrialTokenStatus2["WrongOrigin"] = "WrongOrigin";
    OriginTrialTokenStatus2["InvalidSignature"] = "InvalidSignature";
    OriginTrialTokenStatus2["Malformed"] = "Malformed";
    OriginTrialTokenStatus2["WrongVersion"] = "WrongVersion";
    OriginTrialTokenStatus2["FeatureDisabled"] = "FeatureDisabled";
    OriginTrialTokenStatus2["TokenDisabled"] = "TokenDisabled";
    OriginTrialTokenStatus2["FeatureDisabledForUser"] = "FeatureDisabledForUser";
    OriginTrialTokenStatus2["UnknownTrial"] = "UnknownTrial";
  })(OriginTrialTokenStatus = Page2.OriginTrialTokenStatus || (Page2.OriginTrialTokenStatus = {}));
  let OriginTrialStatus;
  ((OriginTrialStatus2) => {
    OriginTrialStatus2["Enabled"] = "Enabled";
    OriginTrialStatus2["ValidTokenNotProvided"] = "ValidTokenNotProvided";
    OriginTrialStatus2["OSNotSupported"] = "OSNotSupported";
    OriginTrialStatus2["TrialNotAllowed"] = "TrialNotAllowed";
  })(OriginTrialStatus = Page2.OriginTrialStatus || (Page2.OriginTrialStatus = {}));
  let OriginTrialUsageRestriction;
  ((OriginTrialUsageRestriction2) => {
    OriginTrialUsageRestriction2["None"] = "None";
    OriginTrialUsageRestriction2["Subset"] = "Subset";
  })(OriginTrialUsageRestriction = Page2.OriginTrialUsageRestriction || (Page2.OriginTrialUsageRestriction = {}));
  let TransitionType;
  ((TransitionType2) => {
    TransitionType2["Link"] = "link";
    TransitionType2["Typed"] = "typed";
    TransitionType2["Address_bar"] = "address_bar";
    TransitionType2["Auto_bookmark"] = "auto_bookmark";
    TransitionType2["Auto_subframe"] = "auto_subframe";
    TransitionType2["Manual_subframe"] = "manual_subframe";
    TransitionType2["Generated"] = "generated";
    TransitionType2["Auto_toplevel"] = "auto_toplevel";
    TransitionType2["Form_submit"] = "form_submit";
    TransitionType2["Reload"] = "reload";
    TransitionType2["Keyword"] = "keyword";
    TransitionType2["Keyword_generated"] = "keyword_generated";
    TransitionType2["Other"] = "other";
  })(TransitionType = Page2.TransitionType || (Page2.TransitionType = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["Alert"] = "alert";
    DialogType2["Confirm"] = "confirm";
    DialogType2["Prompt"] = "prompt";
    DialogType2["Beforeunload"] = "beforeunload";
  })(DialogType = Page2.DialogType || (Page2.DialogType = {}));
  let ClientNavigationReason;
  ((ClientNavigationReason2) => {
    ClientNavigationReason2["AnchorClick"] = "anchorClick";
    ClientNavigationReason2["FormSubmissionGet"] = "formSubmissionGet";
    ClientNavigationReason2["FormSubmissionPost"] = "formSubmissionPost";
    ClientNavigationReason2["HttpHeaderRefresh"] = "httpHeaderRefresh";
    ClientNavigationReason2["InitialFrameNavigation"] = "initialFrameNavigation";
    ClientNavigationReason2["MetaTagRefresh"] = "metaTagRefresh";
    ClientNavigationReason2["Other"] = "other";
    ClientNavigationReason2["PageBlockInterstitial"] = "pageBlockInterstitial";
    ClientNavigationReason2["Reload"] = "reload";
    ClientNavigationReason2["ScriptInitiated"] = "scriptInitiated";
  })(ClientNavigationReason = Page2.ClientNavigationReason || (Page2.ClientNavigationReason = {}));
  let ClientNavigationDisposition;
  ((ClientNavigationDisposition2) => {
    ClientNavigationDisposition2["CurrentTab"] = "currentTab";
    ClientNavigationDisposition2["NewTab"] = "newTab";
    ClientNavigationDisposition2["NewWindow"] = "newWindow";
    ClientNavigationDisposition2["Download"] = "download";
  })(ClientNavigationDisposition = Page2.ClientNavigationDisposition || (Page2.ClientNavigationDisposition = {}));
  let ReferrerPolicy;
  ((ReferrerPolicy2) => {
    ReferrerPolicy2["NoReferrer"] = "noReferrer";
    ReferrerPolicy2["NoReferrerWhenDowngrade"] = "noReferrerWhenDowngrade";
    ReferrerPolicy2["Origin"] = "origin";
    ReferrerPolicy2["OriginWhenCrossOrigin"] = "originWhenCrossOrigin";
    ReferrerPolicy2["SameOrigin"] = "sameOrigin";
    ReferrerPolicy2["StrictOrigin"] = "strictOrigin";
    ReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strictOriginWhenCrossOrigin";
    ReferrerPolicy2["UnsafeUrl"] = "unsafeUrl";
  })(ReferrerPolicy = Page2.ReferrerPolicy || (Page2.ReferrerPolicy = {}));
  let NavigationType;
  ((NavigationType2) => {
    NavigationType2["Navigation"] = "Navigation";
    NavigationType2["BackForwardCacheRestore"] = "BackForwardCacheRestore";
  })(NavigationType = Page2.NavigationType || (Page2.NavigationType = {}));
  let BackForwardCacheNotRestoredReason;
  ((BackForwardCacheNotRestoredReason2) => {
    BackForwardCacheNotRestoredReason2["NotPrimaryMainFrame"] = "NotPrimaryMainFrame";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabled"] = "BackForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["RelatedActiveContentsExist"] = "RelatedActiveContentsExist";
    BackForwardCacheNotRestoredReason2["HTTPStatusNotOK"] = "HTTPStatusNotOK";
    BackForwardCacheNotRestoredReason2["SchemeNotHTTPOrHTTPS"] = "SchemeNotHTTPOrHTTPS";
    BackForwardCacheNotRestoredReason2["Loading"] = "Loading";
    BackForwardCacheNotRestoredReason2["WasGrantedMediaAccess"] = "WasGrantedMediaAccess";
    BackForwardCacheNotRestoredReason2["DisableForRenderFrameHostCalled"] = "DisableForRenderFrameHostCalled";
    BackForwardCacheNotRestoredReason2["DomainNotAllowed"] = "DomainNotAllowed";
    BackForwardCacheNotRestoredReason2["HTTPMethodNotGET"] = "HTTPMethodNotGET";
    BackForwardCacheNotRestoredReason2["SubframeIsNavigating"] = "SubframeIsNavigating";
    BackForwardCacheNotRestoredReason2["Timeout"] = "Timeout";
    BackForwardCacheNotRestoredReason2["CacheLimit"] = "CacheLimit";
    BackForwardCacheNotRestoredReason2["JavaScriptExecution"] = "JavaScriptExecution";
    BackForwardCacheNotRestoredReason2["RendererProcessKilled"] = "RendererProcessKilled";
    BackForwardCacheNotRestoredReason2["RendererProcessCrashed"] = "RendererProcessCrashed";
    BackForwardCacheNotRestoredReason2["SchedulerTrackedFeatureUsed"] = "SchedulerTrackedFeatureUsed";
    BackForwardCacheNotRestoredReason2["ConflictingBrowsingInstance"] = "ConflictingBrowsingInstance";
    BackForwardCacheNotRestoredReason2["CacheFlushed"] = "CacheFlushed";
    BackForwardCacheNotRestoredReason2["ServiceWorkerVersionActivation"] = "ServiceWorkerVersionActivation";
    BackForwardCacheNotRestoredReason2["SessionRestored"] = "SessionRestored";
    BackForwardCacheNotRestoredReason2["ServiceWorkerPostMessage"] = "ServiceWorkerPostMessage";
    BackForwardCacheNotRestoredReason2["EnteredBackForwardCacheBeforeServiceWorkerHostAdded"] = "EnteredBackForwardCacheBeforeServiceWorkerHostAdded";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_SameSite"] = "RenderFrameHostReused_SameSite";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_CrossSite"] = "RenderFrameHostReused_CrossSite";
    BackForwardCacheNotRestoredReason2["ServiceWorkerClaim"] = "ServiceWorkerClaim";
    BackForwardCacheNotRestoredReason2["IgnoreEventAndEvict"] = "IgnoreEventAndEvict";
    BackForwardCacheNotRestoredReason2["HaveInnerContents"] = "HaveInnerContents";
    BackForwardCacheNotRestoredReason2["TimeoutPuttingInCache"] = "TimeoutPuttingInCache";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByLowMemory"] = "BackForwardCacheDisabledByLowMemory";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByCommandLine"] = "BackForwardCacheDisabledByCommandLine";
    BackForwardCacheNotRestoredReason2["NetworkRequestDatAPIpeDrainedAsBytesConsumer"] = "NetworkRequestDatapipeDrainedAsBytesConsumer";
    BackForwardCacheNotRestoredReason2["NetworkRequestRedirected"] = "NetworkRequestRedirected";
    BackForwardCacheNotRestoredReason2["NetworkRequestTimeout"] = "NetworkRequestTimeout";
    BackForwardCacheNotRestoredReason2["NetworkExceedsBufferLimit"] = "NetworkExceedsBufferLimit";
    BackForwardCacheNotRestoredReason2["NavigationCancelledWhileRestoring"] = "NavigationCancelledWhileRestoring";
    BackForwardCacheNotRestoredReason2["NotMostRecentNavigationEntry"] = "NotMostRecentNavigationEntry";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForPrerender"] = "BackForwardCacheDisabledForPrerender";
    BackForwardCacheNotRestoredReason2["UserAgentOverrideDiffers"] = "UserAgentOverrideDiffers";
    BackForwardCacheNotRestoredReason2["ForegroundCacheLimit"] = "ForegroundCacheLimit";
    BackForwardCacheNotRestoredReason2["ForwardCacheDisabled"] = "ForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["BrowsingInstanceNotSwapped"] = "BrowsingInstanceNotSwapped";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForDelegate"] = "BackForwardCacheDisabledForDelegate";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInMainFrame"] = "UnloadHandlerExistsInMainFrame";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInSubFrame"] = "UnloadHandlerExistsInSubFrame";
    BackForwardCacheNotRestoredReason2["ServiceWorkerUnregistration"] = "ServiceWorkerUnregistration";
    BackForwardCacheNotRestoredReason2["CacheControlNoStore"] = "CacheControlNoStore";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreCookieModified"] = "CacheControlNoStoreCookieModified";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreHTTPOnlyCookieModified"] = "CacheControlNoStoreHTTPOnlyCookieModified";
    BackForwardCacheNotRestoredReason2["NoResponseHead"] = "NoResponseHead";
    BackForwardCacheNotRestoredReason2["Unknown"] = "Unknown";
    BackForwardCacheNotRestoredReason2["ActivationNavigationsDisallowedForBug1234857"] = "ActivationNavigationsDisallowedForBug1234857";
    BackForwardCacheNotRestoredReason2["ErrorDocument"] = "ErrorDocument";
    BackForwardCacheNotRestoredReason2["FencedFramesEmbedder"] = "FencedFramesEmbedder";
    BackForwardCacheNotRestoredReason2["CookieDisabled"] = "CookieDisabled";
    BackForwardCacheNotRestoredReason2["HTTPAuthRequired"] = "HTTPAuthRequired";
    BackForwardCacheNotRestoredReason2["CookieFlushed"] = "CookieFlushed";
    BackForwardCacheNotRestoredReason2["BroadcastChannelOnMessage"] = "BroadcastChannelOnMessage";
    BackForwardCacheNotRestoredReason2["WebViewSettingsChanged"] = "WebViewSettingsChanged";
    BackForwardCacheNotRestoredReason2["WebViewJavaScriptObjectChanged"] = "WebViewJavaScriptObjectChanged";
    BackForwardCacheNotRestoredReason2["WebViewMessageListenerInjected"] = "WebViewMessageListenerInjected";
    BackForwardCacheNotRestoredReason2["WebViewSafeBrowsingAllowlistChanged"] = "WebViewSafeBrowsingAllowlistChanged";
    BackForwardCacheNotRestoredReason2["WebViewDocumentStartJavascriptChanged"] = "WebViewDocumentStartJavascriptChanged";
    BackForwardCacheNotRestoredReason2["WebSocket"] = "WebSocket";
    BackForwardCacheNotRestoredReason2["WebTransport"] = "WebTransport";
    BackForwardCacheNotRestoredReason2["WebRTC"] = "WebRTC";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoStore"] = "MainResourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoCache"] = "MainResourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoStore"] = "SubresourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoCache"] = "SubresourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["ContainsPlugins"] = "ContainsPlugins";
    BackForwardCacheNotRestoredReason2["DocumentLoaded"] = "DocumentLoaded";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestOthers"] = "OutstandingNetworkRequestOthers";
    BackForwardCacheNotRestoredReason2["RequestedMIDIPermission"] = "RequestedMIDIPermission";
    BackForwardCacheNotRestoredReason2["RequestedAudioCapturePermission"] = "RequestedAudioCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedVideoCapturePermission"] = "RequestedVideoCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedBackForwardCacheBlockedSensors"] = "RequestedBackForwardCacheBlockedSensors";
    BackForwardCacheNotRestoredReason2["RequestedBackgroundWorkPermission"] = "RequestedBackgroundWorkPermission";
    BackForwardCacheNotRestoredReason2["BroadcastChannel"] = "BroadcastChannel";
    BackForwardCacheNotRestoredReason2["WebXR"] = "WebXR";
    BackForwardCacheNotRestoredReason2["SharedWorker"] = "SharedWorker";
    BackForwardCacheNotRestoredReason2["SharedWorkerMessage"] = "SharedWorkerMessage";
    BackForwardCacheNotRestoredReason2["SharedWorkerWithNoActiveClient"] = "SharedWorkerWithNoActiveClient";
    BackForwardCacheNotRestoredReason2["WebLocks"] = "WebLocks";
    BackForwardCacheNotRestoredReason2["WebLocksContention"] = "WebLocksContention";
    BackForwardCacheNotRestoredReason2["WebHID"] = "WebHID";
    BackForwardCacheNotRestoredReason2["WebBluetooth"] = "WebBluetooth";
    BackForwardCacheNotRestoredReason2["WebShare"] = "WebShare";
    BackForwardCacheNotRestoredReason2["RequestedStorageAccessGrant"] = "RequestedStorageAccessGrant";
    BackForwardCacheNotRestoredReason2["WebNfc"] = "WebNfc";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestFetch"] = "OutstandingNetworkRequestFetch";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestXHR"] = "OutstandingNetworkRequestXHR";
    BackForwardCacheNotRestoredReason2["AppBanner"] = "AppBanner";
    BackForwardCacheNotRestoredReason2["Printing"] = "Printing";
    BackForwardCacheNotRestoredReason2["WebDatabase"] = "WebDatabase";
    BackForwardCacheNotRestoredReason2["PictureInPicture"] = "PictureInPicture";
    BackForwardCacheNotRestoredReason2["SpeechRecognizer"] = "SpeechRecognizer";
    BackForwardCacheNotRestoredReason2["IdleManager"] = "IdleManager";
    BackForwardCacheNotRestoredReason2["PaymentManager"] = "PaymentManager";
    BackForwardCacheNotRestoredReason2["SpeechSynthesis"] = "SpeechSynthesis";
    BackForwardCacheNotRestoredReason2["KeyboardLock"] = "KeyboardLock";
    BackForwardCacheNotRestoredReason2["WebOTPService"] = "WebOTPService";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestDirectSocket"] = "OutstandingNetworkRequestDirectSocket";
    BackForwardCacheNotRestoredReason2["InjectedJavascript"] = "InjectedJavascript";
    BackForwardCacheNotRestoredReason2["InjectedStyleSheet"] = "InjectedStyleSheet";
    BackForwardCacheNotRestoredReason2["KeepaliveRequest"] = "KeepaliveRequest";
    BackForwardCacheNotRestoredReason2["IndexedDBEvent"] = "IndexedDBEvent";
    BackForwardCacheNotRestoredReason2["Dummy"] = "Dummy";
    BackForwardCacheNotRestoredReason2["JsNetworkRequestReceivedCacheControlNoStoreResource"] = "JsNetworkRequestReceivedCacheControlNoStoreResource";
    BackForwardCacheNotRestoredReason2["WebRTCUsedWithCCNS"] = "WebRTCUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebTransportUsedWithCCNS"] = "WebTransportUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebSocketUsedWithCCNS"] = "WebSocketUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["SmartCard"] = "SmartCard";
    BackForwardCacheNotRestoredReason2["LiveMediaStreamTrack"] = "LiveMediaStreamTrack";
    BackForwardCacheNotRestoredReason2["UnloadHandler"] = "UnloadHandler";
    BackForwardCacheNotRestoredReason2["ParserAborted"] = "ParserAborted";
    BackForwardCacheNotRestoredReason2["ContentSecurityHandler"] = "ContentSecurityHandler";
    BackForwardCacheNotRestoredReason2["ContentWebAuthenticationAPI"] = "ContentWebAuthenticationAPI";
    BackForwardCacheNotRestoredReason2["ContentFileChooser"] = "ContentFileChooser";
    BackForwardCacheNotRestoredReason2["ContentSerial"] = "ContentSerial";
    BackForwardCacheNotRestoredReason2["ContentFileSystemAccess"] = "ContentFileSystemAccess";
    BackForwardCacheNotRestoredReason2["ContentMediaDevicesDispatcherHost"] = "ContentMediaDevicesDispatcherHost";
    BackForwardCacheNotRestoredReason2["ContentWebBluetooth"] = "ContentWebBluetooth";
    BackForwardCacheNotRestoredReason2["ContentWebUSB"] = "ContentWebUSB";
    BackForwardCacheNotRestoredReason2["ContentMediaSessionService"] = "ContentMediaSessionService";
    BackForwardCacheNotRestoredReason2["ContentScreenReader"] = "ContentScreenReader";
    BackForwardCacheNotRestoredReason2["ContentDiscarded"] = "ContentDiscarded";
    BackForwardCacheNotRestoredReason2["EmbedderPopupBlockerTabHelper"] = "EmbedderPopupBlockerTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingTriggeredPopupBlocker"] = "EmbedderSafeBrowsingTriggeredPopupBlocker";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingThreatDetails"] = "EmbedderSafeBrowsingThreatDetails";
    BackForwardCacheNotRestoredReason2["EmbedderAppBannerManager"] = "EmbedderAppBannerManager";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerViewerSource"] = "EmbedderDomDistillerViewerSource";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerSelfDeletingRequestDelegate"] = "EmbedderDomDistillerSelfDeletingRequestDelegate";
    BackForwardCacheNotRestoredReason2["EmbedderOomInterventionTabHelper"] = "EmbedderOomInterventionTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderOfflinePage"] = "EmbedderOfflinePage";
    BackForwardCacheNotRestoredReason2["EmbedderChromePasswordManagerClientBindCredentialManager"] = "EmbedderChromePasswordManagerClientBindCredentialManager";
    BackForwardCacheNotRestoredReason2["EmbedderPermissionRequestManager"] = "EmbedderPermissionRequestManager";
    BackForwardCacheNotRestoredReason2["EmbedderModalDialog"] = "EmbedderModalDialog";
    BackForwardCacheNotRestoredReason2["EmbedderExtensions"] = "EmbedderExtensions";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessaging"] = "EmbedderExtensionMessaging";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessagingForOpenPort"] = "EmbedderExtensionMessagingForOpenPort";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionSentMessageToCachedFrame"] = "EmbedderExtensionSentMessageToCachedFrame";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionFrame"] = "EmbedderExtensionFrame";
    BackForwardCacheNotRestoredReason2["EmbedderPrivilegedWebContents"] = "EmbedderPrivilegedWebContents";
    BackForwardCacheNotRestoredReason2["RequestedByWebViewClient"] = "RequestedByWebViewClient";
    BackForwardCacheNotRestoredReason2["PostMessageByWebViewClient"] = "PostMessageByWebViewClient";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreDeviceBoundSessionTerminated"] = "CacheControlNoStoreDeviceBoundSessionTerminated";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnModerateMemoryPressure"] = "CacheLimitPrunedOnModerateMemoryPressure";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnCriticalMemoryPressure"] = "CacheLimitPrunedOnCriticalMemoryPressure";
  })(BackForwardCacheNotRestoredReason = Page2.BackForwardCacheNotRestoredReason || (Page2.BackForwardCacheNotRestoredReason = {}));
  let BackForwardCacheNotRestoredReasonType;
  ((BackForwardCacheNotRestoredReasonType2) => {
    BackForwardCacheNotRestoredReasonType2["SupportPending"] = "SupportPending";
    BackForwardCacheNotRestoredReasonType2["PageSupportNeeded"] = "PageSupportNeeded";
    BackForwardCacheNotRestoredReasonType2["Circumstantial"] = "Circumstantial";
  })(BackForwardCacheNotRestoredReasonType = Page2.BackForwardCacheNotRestoredReasonType || (Page2.BackForwardCacheNotRestoredReasonType = {}));
  let CaptureScreenshotRequestFormat;
  ((CaptureScreenshotRequestFormat2) => {
    CaptureScreenshotRequestFormat2["Jpeg"] = "jpeg";
    CaptureScreenshotRequestFormat2["Png"] = "png";
    CaptureScreenshotRequestFormat2["Webp"] = "webp";
  })(CaptureScreenshotRequestFormat = Page2.CaptureScreenshotRequestFormat || (Page2.CaptureScreenshotRequestFormat = {}));
  let CaptureSnapshotRequestFormat;
  ((CaptureSnapshotRequestFormat2) => {
    CaptureSnapshotRequestFormat2["MHTML"] = "mhtml";
  })(CaptureSnapshotRequestFormat = Page2.CaptureSnapshotRequestFormat || (Page2.CaptureSnapshotRequestFormat = {}));
  let PrintToPDFRequestTransferMode;
  ((PrintToPDFRequestTransferMode2) => {
    PrintToPDFRequestTransferMode2["ReturnAsBase64"] = "ReturnAsBase64";
    PrintToPDFRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(PrintToPDFRequestTransferMode = Page2.PrintToPDFRequestTransferMode || (Page2.PrintToPDFRequestTransferMode = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Page2.SetDownloadBehaviorRequestBehavior || (Page2.SetDownloadBehaviorRequestBehavior = {}));
  let SetTouchEmulationEnabledRequestConfiguration;
  ((SetTouchEmulationEnabledRequestConfiguration2) => {
    SetTouchEmulationEnabledRequestConfiguration2["Mobile"] = "mobile";
    SetTouchEmulationEnabledRequestConfiguration2["Desktop"] = "desktop";
  })(SetTouchEmulationEnabledRequestConfiguration = Page2.SetTouchEmulationEnabledRequestConfiguration || (Page2.SetTouchEmulationEnabledRequestConfiguration = {}));
  let StartScreencastRequestFormat;
  ((StartScreencastRequestFormat2) => {
    StartScreencastRequestFormat2["Jpeg"] = "jpeg";
    StartScreencastRequestFormat2["Png"] = "png";
  })(StartScreencastRequestFormat = Page2.StartScreencastRequestFormat || (Page2.StartScreencastRequestFormat = {}));
  let SetWebLifecycleStateRequestState;
  ((SetWebLifecycleStateRequestState2) => {
    SetWebLifecycleStateRequestState2["Frozen"] = "frozen";
    SetWebLifecycleStateRequestState2["Active"] = "active";
  })(SetWebLifecycleStateRequestState = Page2.SetWebLifecycleStateRequestState || (Page2.SetWebLifecycleStateRequestState = {}));
  let SetSPCTransactionModeRequestMode;
  ((SetSPCTransactionModeRequestMode2) => {
    SetSPCTransactionModeRequestMode2["None"] = "none";
    SetSPCTransactionModeRequestMode2["AutoAccept"] = "autoAccept";
    SetSPCTransactionModeRequestMode2["AutoChooseToAuthAnotherWay"] = "autoChooseToAuthAnotherWay";
    SetSPCTransactionModeRequestMode2["AutoReject"] = "autoReject";
    SetSPCTransactionModeRequestMode2["AutoOptOut"] = "autoOptOut";
  })(SetSPCTransactionModeRequestMode = Page2.SetSPCTransactionModeRequestMode || (Page2.SetSPCTransactionModeRequestMode = {}));
  let SetRPHRegistrationModeRequestMode;
  ((SetRPHRegistrationModeRequestMode2) => {
    SetRPHRegistrationModeRequestMode2["None"] = "none";
    SetRPHRegistrationModeRequestMode2["AutoAccept"] = "autoAccept";
    SetRPHRegistrationModeRequestMode2["AutoReject"] = "autoReject";
  })(SetRPHRegistrationModeRequestMode = Page2.SetRPHRegistrationModeRequestMode || (Page2.SetRPHRegistrationModeRequestMode = {}));
  let FileChooserOpenedEventMode;
  ((FileChooserOpenedEventMode2) => {
    FileChooserOpenedEventMode2["SelectSingle"] = "selectSingle";
    FileChooserOpenedEventMode2["SelectMultiple"] = "selectMultiple";
  })(FileChooserOpenedEventMode = Page2.FileChooserOpenedEventMode || (Page2.FileChooserOpenedEventMode = {}));
  let FrameDetachedEventReason;
  ((FrameDetachedEventReason2) => {
    FrameDetachedEventReason2["Remove"] = "remove";
    FrameDetachedEventReason2["Swap"] = "swap";
  })(FrameDetachedEventReason = Page2.FrameDetachedEventReason || (Page2.FrameDetachedEventReason = {}));
  let FrameStartedNavigatingEventNavigationType;
  ((FrameStartedNavigatingEventNavigationType2) => {
    FrameStartedNavigatingEventNavigationType2["Reload"] = "reload";
    FrameStartedNavigatingEventNavigationType2["ReloadBypassingCache"] = "reloadBypassingCache";
    FrameStartedNavigatingEventNavigationType2["Restore"] = "restore";
    FrameStartedNavigatingEventNavigationType2["RestoreWithPost"] = "restoreWithPost";
    FrameStartedNavigatingEventNavigationType2["HistorySameDocument"] = "historySameDocument";
    FrameStartedNavigatingEventNavigationType2["HistoryDifferentDocument"] = "historyDifferentDocument";
    FrameStartedNavigatingEventNavigationType2["SameDocument"] = "sameDocument";
    FrameStartedNavigatingEventNavigationType2["DifferentDocument"] = "differentDocument";
  })(FrameStartedNavigatingEventNavigationType = Page2.FrameStartedNavigatingEventNavigationType || (Page2.FrameStartedNavigatingEventNavigationType = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Page2.DownloadProgressEventState || (Page2.DownloadProgressEventState = {}));
  let NavigatedWithinDocumentEventNavigationType;
  ((NavigatedWithinDocumentEventNavigationType2) => {
    NavigatedWithinDocumentEventNavigationType2["Fragment"] = "fragment";
    NavigatedWithinDocumentEventNavigationType2["HistoryAPI"] = "historyApi";
    NavigatedWithinDocumentEventNavigationType2["Other"] = "other";
  })(NavigatedWithinDocumentEventNavigationType = Page2.NavigatedWithinDocumentEventNavigationType || (Page2.NavigatedWithinDocumentEventNavigationType = {}));
})(Page || (Page = {}));
var Performance;
((Performance2) => {
  let EnableRequestTimeDomain;
  ((EnableRequestTimeDomain2) => {
    EnableRequestTimeDomain2["TimeTicks"] = "timeTicks";
    EnableRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(EnableRequestTimeDomain = Performance2.EnableRequestTimeDomain || (Performance2.EnableRequestTimeDomain = {}));
  let SetTimeDomainRequestTimeDomain;
  ((SetTimeDomainRequestTimeDomain2) => {
    SetTimeDomainRequestTimeDomain2["TimeTicks"] = "timeTicks";
    SetTimeDomainRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(SetTimeDomainRequestTimeDomain = Performance2.SetTimeDomainRequestTimeDomain || (Performance2.SetTimeDomainRequestTimeDomain = {}));
})(Performance || (Performance = {}));
var Preload;
((Preload2) => {
  let RuleSetErrorType;
  ((RuleSetErrorType2) => {
    RuleSetErrorType2["SourceIsNotJsonObject"] = "SourceIsNotJsonObject";
    RuleSetErrorType2["InvalidRulesSkipped"] = "InvalidRulesSkipped";
    RuleSetErrorType2["InvalidRulesetLevelTag"] = "InvalidRulesetLevelTag";
  })(RuleSetErrorType = Preload2.RuleSetErrorType || (Preload2.RuleSetErrorType = {}));
  let SpeculationAction;
  ((SpeculationAction2) => {
    SpeculationAction2["Prefetch"] = "Prefetch";
    SpeculationAction2["Prerender"] = "Prerender";
    SpeculationAction2["PrerenderUntilScript"] = "PrerenderUntilScript";
  })(SpeculationAction = Preload2.SpeculationAction || (Preload2.SpeculationAction = {}));
  let SpeculationTargetHint;
  ((SpeculationTargetHint2) => {
    SpeculationTargetHint2["Blank"] = "Blank";
    SpeculationTargetHint2["Self"] = "Self";
  })(SpeculationTargetHint = Preload2.SpeculationTargetHint || (Preload2.SpeculationTargetHint = {}));
  let PrerenderFinalStatus;
  ((PrerenderFinalStatus2) => {
    PrerenderFinalStatus2["Activated"] = "Activated";
    PrerenderFinalStatus2["Destroyed"] = "Destroyed";
    PrerenderFinalStatus2["LowEndDevice"] = "LowEndDevice";
    PrerenderFinalStatus2["InvalidSchemeRedirect"] = "InvalidSchemeRedirect";
    PrerenderFinalStatus2["InvalidSchemeNavigation"] = "InvalidSchemeNavigation";
    PrerenderFinalStatus2["NavigationRequestBlockedByCsp"] = "NavigationRequestBlockedByCsp";
    PrerenderFinalStatus2["MojoBinderPolicy"] = "MojoBinderPolicy";
    PrerenderFinalStatus2["RendererProcessCrashed"] = "RendererProcessCrashed";
    PrerenderFinalStatus2["RendererProcessKilled"] = "RendererProcessKilled";
    PrerenderFinalStatus2["Download"] = "Download";
    PrerenderFinalStatus2["TriggerDestroyed"] = "TriggerDestroyed";
    PrerenderFinalStatus2["NavigationNotCommitted"] = "NavigationNotCommitted";
    PrerenderFinalStatus2["NavigationBadHttpStatus"] = "NavigationBadHttpStatus";
    PrerenderFinalStatus2["ClientCertRequested"] = "ClientCertRequested";
    PrerenderFinalStatus2["NavigationRequestNetworkError"] = "NavigationRequestNetworkError";
    PrerenderFinalStatus2["CancelAllHostsForTesting"] = "CancelAllHostsForTesting";
    PrerenderFinalStatus2["DidFailLoad"] = "DidFailLoad";
    PrerenderFinalStatus2["Stop"] = "Stop";
    PrerenderFinalStatus2["SslCertificateError"] = "SslCertificateError";
    PrerenderFinalStatus2["LoginAuthRequested"] = "LoginAuthRequested";
    PrerenderFinalStatus2["UaChangeRequiresReload"] = "UaChangeRequiresReload";
    PrerenderFinalStatus2["BlockedByClient"] = "BlockedByClient";
    PrerenderFinalStatus2["AudioOutputDeviceRequested"] = "AudioOutputDeviceRequested";
    PrerenderFinalStatus2["MixedContent"] = "MixedContent";
    PrerenderFinalStatus2["TriggerBackgrounded"] = "TriggerBackgrounded";
    PrerenderFinalStatus2["MemoryLimitExceeded"] = "MemoryLimitExceeded";
    PrerenderFinalStatus2["DataSaverEnabled"] = "DataSaverEnabled";
    PrerenderFinalStatus2["TriggerUrlHasEffectiveUrl"] = "TriggerUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivatedBeforeStarted"] = "ActivatedBeforeStarted";
    PrerenderFinalStatus2["InactivePageRestriction"] = "InactivePageRestriction";
    PrerenderFinalStatus2["StartFailed"] = "StartFailed";
    PrerenderFinalStatus2["TimeoutBackgrounded"] = "TimeoutBackgrounded";
    PrerenderFinalStatus2["CrossSiteRedirectInInitialNavigation"] = "CrossSiteRedirectInInitialNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInInitialNavigation"] = "CrossSiteNavigationInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInInitialNavigation"] = "SameSiteCrossOriginRedirectNotOptInInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInInitialNavigation"] = "SameSiteCrossOriginNavigationNotOptInInInitialNavigation";
    PrerenderFinalStatus2["ActivationNavigationParameterMismatch"] = "ActivationNavigationParameterMismatch";
    PrerenderFinalStatus2["ActivatedInBackground"] = "ActivatedInBackground";
    PrerenderFinalStatus2["EmbedderHostDisallowed"] = "EmbedderHostDisallowed";
    PrerenderFinalStatus2["ActivationNavigationDestroyedBeforeSuccess"] = "ActivationNavigationDestroyedBeforeSuccess";
    PrerenderFinalStatus2["TabClosedByUserGesture"] = "TabClosedByUserGesture";
    PrerenderFinalStatus2["TabClosedWithoutUserGesture"] = "TabClosedWithoutUserGesture";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessCrashed"] = "PrimaryMainFrameRendererProcessCrashed";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessKilled"] = "PrimaryMainFrameRendererProcessKilled";
    PrerenderFinalStatus2["ActivationFramePolicyNotCompatible"] = "ActivationFramePolicyNotCompatible";
    PrerenderFinalStatus2["PreloadingDisabled"] = "PreloadingDisabled";
    PrerenderFinalStatus2["BatterySaverEnabled"] = "BatterySaverEnabled";
    PrerenderFinalStatus2["ActivatedDuringMainFrameNavigation"] = "ActivatedDuringMainFrameNavigation";
    PrerenderFinalStatus2["PreloadingUnsupportedByWebContents"] = "PreloadingUnsupportedByWebContents";
    PrerenderFinalStatus2["CrossSiteRedirectInMainFrameNavigation"] = "CrossSiteRedirectInMainFrameNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInMainFrameNavigation"] = "CrossSiteNavigationInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["MemoryPressureOnTrigger"] = "MemoryPressureOnTrigger";
    PrerenderFinalStatus2["MemoryPressureAfterTriggered"] = "MemoryPressureAfterTriggered";
    PrerenderFinalStatus2["PrerenderingDisabledByDevTools"] = "PrerenderingDisabledByDevTools";
    PrerenderFinalStatus2["SpeculationRuleRemoved"] = "SpeculationRuleRemoved";
    PrerenderFinalStatus2["ActivatedWithAuxiliaryBrowsingContexts"] = "ActivatedWithAuxiliaryBrowsingContexts";
    PrerenderFinalStatus2["MaxNumOfRunningEagerPrerendersExceeded"] = "MaxNumOfRunningEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningNonEagerPrerendersExceeded"] = "MaxNumOfRunningNonEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningEmbedderPrerendersExceeded"] = "MaxNumOfRunningEmbedderPrerendersExceeded";
    PrerenderFinalStatus2["PrerenderingUrlHasEffectiveUrl"] = "PrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["RedirectedPrerenderingUrlHasEffectiveUrl"] = "RedirectedPrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivationUrlHasEffectiveUrl"] = "ActivationUrlHasEffectiveUrl";
    PrerenderFinalStatus2["JavaScriptInterfaceAdded"] = "JavaScriptInterfaceAdded";
    PrerenderFinalStatus2["JavaScriptInterfaceRemoved"] = "JavaScriptInterfaceRemoved";
    PrerenderFinalStatus2["AllPrerenderingCanceled"] = "AllPrerenderingCanceled";
    PrerenderFinalStatus2["WindowClosed"] = "WindowClosed";
    PrerenderFinalStatus2["SlowNetwork"] = "SlowNetwork";
    PrerenderFinalStatus2["OtherPrerenderedPageActivated"] = "OtherPrerenderedPageActivated";
    PrerenderFinalStatus2["V8OptimizerDisabled"] = "V8OptimizerDisabled";
    PrerenderFinalStatus2["PrerenderFailedDuringPrefetch"] = "PrerenderFailedDuringPrefetch";
    PrerenderFinalStatus2["BrowsingDataRemoved"] = "BrowsingDataRemoved";
    PrerenderFinalStatus2["PrerenderHostReused"] = "PrerenderHostReused";
    PrerenderFinalStatus2["FormSubmitWhenPrerendering"] = "FormSubmitWhenPrerendering";
    PrerenderFinalStatus2["CrossDocumentRestart"] = "CrossDocumentRestart";
  })(PrerenderFinalStatus = Preload2.PrerenderFinalStatus || (Preload2.PrerenderFinalStatus = {}));
  let PreloadingStatus;
  ((PreloadingStatus2) => {
    PreloadingStatus2["Pending"] = "Pending";
    PreloadingStatus2["Running"] = "Running";
    PreloadingStatus2["Ready"] = "Ready";
    PreloadingStatus2["Success"] = "Success";
    PreloadingStatus2["Failure"] = "Failure";
    PreloadingStatus2["NotSupported"] = "NotSupported";
  })(PreloadingStatus = Preload2.PreloadingStatus || (Preload2.PreloadingStatus = {}));
  let PrefetchStatus;
  ((PrefetchStatus2) => {
    PrefetchStatus2["PrefetchAllowed"] = "PrefetchAllowed";
    PrefetchStatus2["PrefetchFailedIneligibleRedirect"] = "PrefetchFailedIneligibleRedirect";
    PrefetchStatus2["PrefetchFailedInvalidRedirect"] = "PrefetchFailedInvalidRedirect";
    PrefetchStatus2["PrefetchFailedMIMENotSupported"] = "PrefetchFailedMIMENotSupported";
    PrefetchStatus2["PrefetchFailedNetError"] = "PrefetchFailedNetError";
    PrefetchStatus2["PrefetchFailedNon2XX"] = "PrefetchFailedNon2XX";
    PrefetchStatus2["PrefetchEvictedAfterBrowsingDataRemoved"] = "PrefetchEvictedAfterBrowsingDataRemoved";
    PrefetchStatus2["PrefetchEvictedAfterCandidateRemoved"] = "PrefetchEvictedAfterCandidateRemoved";
    PrefetchStatus2["PrefetchEvictedForNewerPrefetch"] = "PrefetchEvictedForNewerPrefetch";
    PrefetchStatus2["PrefetchHeldback"] = "PrefetchHeldback";
    PrefetchStatus2["PrefetchIneligibleRetryAfter"] = "PrefetchIneligibleRetryAfter";
    PrefetchStatus2["PrefetchIsPrivacyDecoy"] = "PrefetchIsPrivacyDecoy";
    PrefetchStatus2["PrefetchIsStale"] = "PrefetchIsStale";
    PrefetchStatus2["PrefetchNotEligibleBlockedByConnectionAllowlist"] = "PrefetchNotEligibleBlockedByConnectionAllowlist";
    PrefetchStatus2["PrefetchNotEligibleBrowserContextOffTheRecord"] = "PrefetchNotEligibleBrowserContextOffTheRecord";
    PrefetchStatus2["PrefetchNotEligibleCrossOrigin"] = "PrefetchNotEligibleCrossOrigin";
    PrefetchStatus2["PrefetchNotEligibleDataSaverEnabled"] = "PrefetchNotEligibleDataSaverEnabled";
    PrefetchStatus2["PrefetchNotEligibleExistingProxy"] = "PrefetchNotEligibleExistingProxy";
    PrefetchStatus2["PrefetchNotEligibleHostIsNonUnique"] = "PrefetchNotEligibleHostIsNonUnique";
    PrefetchStatus2["PrefetchNotEligibleNonDefaultStoragePartition"] = "PrefetchNotEligibleNonDefaultStoragePartition";
    PrefetchStatus2["PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy"] = "PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy";
    PrefetchStatus2["PrefetchNotEligibleSchemeIsNotHttps"] = "PrefetchNotEligibleSchemeIsNotHttps";
    PrefetchStatus2["PrefetchNotEligibleUserHasCookies"] = "PrefetchNotEligibleUserHasCookies";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorker"] = "PrefetchNotEligibleUserHasServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler"] = "PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler";
    PrefetchStatus2["PrefetchNotEligibleRedirectFromServiceWorker"] = "PrefetchNotEligibleRedirectFromServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleRedirectToServiceWorker"] = "PrefetchNotEligibleRedirectToServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleBatterySaverEnabled"] = "PrefetchNotEligibleBatterySaverEnabled";
    PrefetchStatus2["PrefetchNotEligiblePreloadingDisabled"] = "PrefetchNotEligiblePreloadingDisabled";
    PrefetchStatus2["PrefetchNotFinishedInTime"] = "PrefetchNotFinishedInTime";
    PrefetchStatus2["PrefetchNotStarted"] = "PrefetchNotStarted";
    PrefetchStatus2["PrefetchNotUsedCookiesChanged"] = "PrefetchNotUsedCookiesChanged";
    PrefetchStatus2["PrefetchProxyNotAvailable"] = "PrefetchProxyNotAvailable";
    PrefetchStatus2["PrefetchResponseUsed"] = "PrefetchResponseUsed";
    PrefetchStatus2["PrefetchSuccessfulButNotUsed"] = "PrefetchSuccessfulButNotUsed";
    PrefetchStatus2["PrefetchNotUsedProbeFailed"] = "PrefetchNotUsedProbeFailed";
    PrefetchStatus2["PrefetchCancelledOnUserNavigation"] = "PrefetchCancelledOnUserNavigation";
  })(PrefetchStatus = Preload2.PrefetchStatus || (Preload2.PrefetchStatus = {}));
})(Preload || (Preload = {}));
var Security;
((Security2) => {
  let MixedContentType;
  ((MixedContentType2) => {
    MixedContentType2["Blockable"] = "blockable";
    MixedContentType2["OptionallyBlockable"] = "optionally-blockable";
    MixedContentType2["None"] = "none";
  })(MixedContentType = Security2.MixedContentType || (Security2.MixedContentType = {}));
  let SecurityState;
  ((SecurityState2) => {
    SecurityState2["Unknown"] = "unknown";
    SecurityState2["Neutral"] = "neutral";
    SecurityState2["Insecure"] = "insecure";
    SecurityState2["Secure"] = "secure";
    SecurityState2["Info"] = "info";
    SecurityState2["InsecureBroken"] = "insecure-broken";
  })(SecurityState = Security2.SecurityState || (Security2.SecurityState = {}));
  let SafetyTipStatus;
  ((SafetyTipStatus2) => {
    SafetyTipStatus2["BadReputation"] = "badReputation";
    SafetyTipStatus2["Lookalike"] = "lookalike";
  })(SafetyTipStatus = Security2.SafetyTipStatus || (Security2.SafetyTipStatus = {}));
  let CertificateErrorAction;
  ((CertificateErrorAction2) => {
    CertificateErrorAction2["Continue"] = "continue";
    CertificateErrorAction2["Cancel"] = "cancel";
  })(CertificateErrorAction = Security2.CertificateErrorAction || (Security2.CertificateErrorAction = {}));
})(Security || (Security = {}));
var ServiceWorker;
((ServiceWorker2) => {
  let ServiceWorkerVersionRunningStatus;
  ((ServiceWorkerVersionRunningStatus2) => {
    ServiceWorkerVersionRunningStatus2["Stopped"] = "stopped";
    ServiceWorkerVersionRunningStatus2["Starting"] = "starting";
    ServiceWorkerVersionRunningStatus2["Running"] = "running";
    ServiceWorkerVersionRunningStatus2["Stopping"] = "stopping";
  })(ServiceWorkerVersionRunningStatus = ServiceWorker2.ServiceWorkerVersionRunningStatus || (ServiceWorker2.ServiceWorkerVersionRunningStatus = {}));
  let ServiceWorkerVersionStatus;
  ((ServiceWorkerVersionStatus2) => {
    ServiceWorkerVersionStatus2["New"] = "new";
    ServiceWorkerVersionStatus2["Installing"] = "installing";
    ServiceWorkerVersionStatus2["Installed"] = "installed";
    ServiceWorkerVersionStatus2["Activating"] = "activating";
    ServiceWorkerVersionStatus2["Activated"] = "activated";
    ServiceWorkerVersionStatus2["Redundant"] = "redundant";
  })(ServiceWorkerVersionStatus = ServiceWorker2.ServiceWorkerVersionStatus || (ServiceWorker2.ServiceWorkerVersionStatus = {}));
  let ServiceWorkerRouterSourceType;
  ((ServiceWorkerRouterSourceType2) => {
    ServiceWorkerRouterSourceType2["Cache"] = "cache";
    ServiceWorkerRouterSourceType2["FetchEvent"] = "fetchEvent";
    ServiceWorkerRouterSourceType2["Network"] = "network";
    ServiceWorkerRouterSourceType2["RaceNetworkAndFetchHandler"] = "raceNetworkAndFetchHandler";
    ServiceWorkerRouterSourceType2["RaceNetworkAndCache"] = "raceNetworkAndCache";
    ServiceWorkerRouterSourceType2["SourceDict"] = "sourceDict";
  })(ServiceWorkerRouterSourceType = ServiceWorker2.ServiceWorkerRouterSourceType || (ServiceWorker2.ServiceWorkerRouterSourceType = {}));
})(ServiceWorker || (ServiceWorker = {}));
var SmartCardEmulation;
((SmartCardEmulation2) => {
  let ResultCode;
  ((ResultCode2) => {
    ResultCode2["Success"] = "success";
    ResultCode2["RemovedCard"] = "removed-card";
    ResultCode2["ResetCard"] = "reset-card";
    ResultCode2["UnpoweredCard"] = "unpowered-card";
    ResultCode2["UnresponsiveCard"] = "unresponsive-card";
    ResultCode2["UnsupportedCard"] = "unsupported-card";
    ResultCode2["ReaderUnavailable"] = "reader-unavailable";
    ResultCode2["SharingViolation"] = "sharing-violation";
    ResultCode2["NotTransacted"] = "not-transacted";
    ResultCode2["NoSmartcard"] = "no-smartcard";
    ResultCode2["ProtoMismatch"] = "proto-mismatch";
    ResultCode2["SystemCancelled"] = "system-cancelled";
    ResultCode2["NotReady"] = "not-ready";
    ResultCode2["Cancelled"] = "cancelled";
    ResultCode2["InsufficientBuffer"] = "insufficient-buffer";
    ResultCode2["InvalidHandle"] = "invalid-handle";
    ResultCode2["InvalidParameter"] = "invalid-parameter";
    ResultCode2["InvalidValue"] = "invalid-value";
    ResultCode2["NoMemory"] = "no-memory";
    ResultCode2["Timeout"] = "timeout";
    ResultCode2["UnknownReader"] = "unknown-reader";
    ResultCode2["UnsupportedFeature"] = "unsupported-feature";
    ResultCode2["NoReadersAvailable"] = "no-readers-available";
    ResultCode2["ServiceStopped"] = "service-stopped";
    ResultCode2["NoService"] = "no-service";
    ResultCode2["CommError"] = "comm-error";
    ResultCode2["InternalError"] = "internal-error";
    ResultCode2["ServerTooBusy"] = "server-too-busy";
    ResultCode2["Unexpected"] = "unexpected";
    ResultCode2["Shutdown"] = "shutdown";
    ResultCode2["UnknownCard"] = "unknown-card";
    ResultCode2["Unknown"] = "unknown";
  })(ResultCode = SmartCardEmulation2.ResultCode || (SmartCardEmulation2.ResultCode = {}));
  let ShareMode;
  ((ShareMode2) => {
    ShareMode2["Shared"] = "shared";
    ShareMode2["Exclusive"] = "exclusive";
    ShareMode2["Direct"] = "direct";
  })(ShareMode = SmartCardEmulation2.ShareMode || (SmartCardEmulation2.ShareMode = {}));
  let Disposition;
  ((Disposition2) => {
    Disposition2["LeaveCard"] = "leave-card";
    Disposition2["ResetCard"] = "reset-card";
    Disposition2["UnpowerCard"] = "unpower-card";
    Disposition2["EjectCard"] = "eject-card";
  })(Disposition = SmartCardEmulation2.Disposition || (SmartCardEmulation2.Disposition = {}));
  let ConnectionState;
  ((ConnectionState2) => {
    ConnectionState2["Absent"] = "absent";
    ConnectionState2["Present"] = "present";
    ConnectionState2["Swallowed"] = "swallowed";
    ConnectionState2["Powered"] = "powered";
    ConnectionState2["Negotiable"] = "negotiable";
    ConnectionState2["Specific"] = "specific";
  })(ConnectionState = SmartCardEmulation2.ConnectionState || (SmartCardEmulation2.ConnectionState = {}));
  let Protocol;
  ((Protocol2) => {
    Protocol2["T0"] = "t0";
    Protocol2["T1"] = "t1";
    Protocol2["Raw"] = "raw";
  })(Protocol = SmartCardEmulation2.Protocol || (SmartCardEmulation2.Protocol = {}));
})(SmartCardEmulation || (SmartCardEmulation = {}));
var Storage;
((Storage2) => {
  let StorageType;
  ((StorageType2) => {
    StorageType2["Cookies"] = "cookies";
    StorageType2["File_systems"] = "file_systems";
    StorageType2["Indexeddb"] = "indexeddb";
    StorageType2["Local_storage"] = "local_storage";
    StorageType2["Shader_cache"] = "shader_cache";
    StorageType2["Websql"] = "websql";
    StorageType2["Service_workers"] = "service_workers";
    StorageType2["Cache_storage"] = "cache_storage";
    StorageType2["Storage_buckets"] = "storage_buckets";
    StorageType2["All"] = "all";
    StorageType2["Other"] = "other";
  })(StorageType = Storage2.StorageType || (Storage2.StorageType = {}));
  let StorageBucketsDurability;
  ((StorageBucketsDurability2) => {
    StorageBucketsDurability2["Relaxed"] = "relaxed";
    StorageBucketsDurability2["Strict"] = "strict";
  })(StorageBucketsDurability = Storage2.StorageBucketsDurability || (Storage2.StorageBucketsDurability = {}));
})(Storage || (Storage = {}));
var SystemInfo;
((SystemInfo2) => {
  let SubsamplingFormat;
  ((SubsamplingFormat2) => {
    SubsamplingFormat2["Yuv420"] = "yuv420";
    SubsamplingFormat2["Yuv422"] = "yuv422";
    SubsamplingFormat2["Yuv444"] = "yuv444";
  })(SubsamplingFormat = SystemInfo2.SubsamplingFormat || (SystemInfo2.SubsamplingFormat = {}));
  let ImageType;
  ((ImageType2) => {
    ImageType2["Jpeg"] = "jpeg";
    ImageType2["Webp"] = "webp";
    ImageType2["Unknown"] = "unknown";
  })(ImageType = SystemInfo2.ImageType || (SystemInfo2.ImageType = {}));
})(SystemInfo || (SystemInfo = {}));
var Target;
((Target2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Target2.WindowState || (Target2.WindowState = {}));
})(Target || (Target = {}));
var Tracing;
((Tracing2) => {
  let TraceConfigRecordMode;
  ((TraceConfigRecordMode2) => {
    TraceConfigRecordMode2["RecordUntilFull"] = "recordUntilFull";
    TraceConfigRecordMode2["RecordContinuously"] = "recordContinuously";
    TraceConfigRecordMode2["RecordAsMuchAsPossible"] = "recordAsMuchAsPossible";
    TraceConfigRecordMode2["EchoToConsole"] = "echoToConsole";
  })(TraceConfigRecordMode = Tracing2.TraceConfigRecordMode || (Tracing2.TraceConfigRecordMode = {}));
  let StreamFormat;
  ((StreamFormat2) => {
    StreamFormat2["Json"] = "json";
    StreamFormat2["Proto"] = "proto";
  })(StreamFormat = Tracing2.StreamFormat || (Tracing2.StreamFormat = {}));
  let StreamCompression;
  ((StreamCompression2) => {
    StreamCompression2["None"] = "none";
    StreamCompression2["Gzip"] = "gzip";
  })(StreamCompression = Tracing2.StreamCompression || (Tracing2.StreamCompression = {}));
  let MemoryDumpLevelOfDetail;
  ((MemoryDumpLevelOfDetail2) => {
    MemoryDumpLevelOfDetail2["Background"] = "background";
    MemoryDumpLevelOfDetail2["Light"] = "light";
    MemoryDumpLevelOfDetail2["Detailed"] = "detailed";
  })(MemoryDumpLevelOfDetail = Tracing2.MemoryDumpLevelOfDetail || (Tracing2.MemoryDumpLevelOfDetail = {}));
  let TracingBackend;
  ((TracingBackend2) => {
    TracingBackend2["Auto"] = "auto";
    TracingBackend2["Chrome"] = "chrome";
    TracingBackend2["System"] = "system";
  })(TracingBackend = Tracing2.TracingBackend || (Tracing2.TracingBackend = {}));
  let StartRequestTransferMode;
  ((StartRequestTransferMode2) => {
    StartRequestTransferMode2["ReportEvents"] = "ReportEvents";
    StartRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(StartRequestTransferMode = Tracing2.StartRequestTransferMode || (Tracing2.StartRequestTransferMode = {}));
})(Tracing || (Tracing = {}));
var WebAudio;
((WebAudio2) => {
  let ContextType;
  ((ContextType2) => {
    ContextType2["Realtime"] = "realtime";
    ContextType2["Offline"] = "offline";
  })(ContextType = WebAudio2.ContextType || (WebAudio2.ContextType = {}));
  let ContextState;
  ((ContextState2) => {
    ContextState2["Suspended"] = "suspended";
    ContextState2["Running"] = "running";
    ContextState2["Closed"] = "closed";
    ContextState2["Interrupted"] = "interrupted";
  })(ContextState = WebAudio2.ContextState || (WebAudio2.ContextState = {}));
  let ChannelCountMode;
  ((ChannelCountMode2) => {
    ChannelCountMode2["ClampedMax"] = "clamped-max";
    ChannelCountMode2["Explicit"] = "explicit";
    ChannelCountMode2["Max"] = "max";
  })(ChannelCountMode = WebAudio2.ChannelCountMode || (WebAudio2.ChannelCountMode = {}));
  let ChannelInterpretation;
  ((ChannelInterpretation2) => {
    ChannelInterpretation2["Discrete"] = "discrete";
    ChannelInterpretation2["Speakers"] = "speakers";
  })(ChannelInterpretation = WebAudio2.ChannelInterpretation || (WebAudio2.ChannelInterpretation = {}));
  let AutomationRate;
  ((AutomationRate2) => {
    AutomationRate2["ARate"] = "a-rate";
    AutomationRate2["KRate"] = "k-rate";
  })(AutomationRate = WebAudio2.AutomationRate || (WebAudio2.AutomationRate = {}));
})(WebAudio || (WebAudio = {}));
var WebAuthn;
((WebAuthn2) => {
  let AuthenticatorProtocol;
  ((AuthenticatorProtocol2) => {
    AuthenticatorProtocol2["U2f"] = "u2f";
    AuthenticatorProtocol2["Ctap2"] = "ctap2";
  })(AuthenticatorProtocol = WebAuthn2.AuthenticatorProtocol || (WebAuthn2.AuthenticatorProtocol = {}));
  let Ctap2Version;
  ((Ctap2Version2) => {
    Ctap2Version2["Ctap2_0"] = "ctap2_0";
    Ctap2Version2["Ctap2_1"] = "ctap2_1";
    Ctap2Version2["Ctap2_2"] = "ctap2_2";
  })(Ctap2Version = WebAuthn2.Ctap2Version || (WebAuthn2.Ctap2Version = {}));
  let AuthenticatorTransport;
  ((AuthenticatorTransport2) => {
    AuthenticatorTransport2["Usb"] = "usb";
    AuthenticatorTransport2["Nfc"] = "nfc";
    AuthenticatorTransport2["Ble"] = "ble";
    AuthenticatorTransport2["Cable"] = "cable";
    AuthenticatorTransport2["Hybrid"] = "hybrid";
    AuthenticatorTransport2["SmartCard"] = "smart-card";
    AuthenticatorTransport2["Internal"] = "internal";
  })(AuthenticatorTransport = WebAuthn2.AuthenticatorTransport || (WebAuthn2.AuthenticatorTransport = {}));
})(WebAuthn || (WebAuthn = {}));
var WebMCP;
((WebMCP2) => {
  let InvocationStatus;
  ((InvocationStatus2) => {
    InvocationStatus2["Completed"] = "Completed";
    InvocationStatus2["Canceled"] = "Canceled";
    InvocationStatus2["Error"] = "Error";
  })(InvocationStatus = WebMCP2.InvocationStatus || (WebMCP2.InvocationStatus = {}));
})(WebMCP || (WebMCP = {}));
var Debugger;
((Debugger2) => {
  let ScopeType;
  ((ScopeType2) => {
    ScopeType2["Global"] = "global";
    ScopeType2["Local"] = "local";
    ScopeType2["With"] = "with";
    ScopeType2["Closure"] = "closure";
    ScopeType2["Catch"] = "catch";
    ScopeType2["Block"] = "block";
    ScopeType2["Script"] = "script";
    ScopeType2["Eval"] = "eval";
    ScopeType2["Module"] = "module";
    ScopeType2["WasmExpressionStack"] = "wasm-expression-stack";
  })(ScopeType = Debugger2.ScopeType || (Debugger2.ScopeType = {}));
  let BreakLocationType;
  ((BreakLocationType2) => {
    BreakLocationType2["DebuggerStatement"] = "debuggerStatement";
    BreakLocationType2["Call"] = "call";
    BreakLocationType2["Return"] = "return";
  })(BreakLocationType = Debugger2.BreakLocationType || (Debugger2.BreakLocationType = {}));
  let ScriptLanguage;
  ((ScriptLanguage2) => {
    ScriptLanguage2["JavaScript"] = "JavaScript";
    ScriptLanguage2["WebAssembly"] = "WebAssembly";
  })(ScriptLanguage = Debugger2.ScriptLanguage || (Debugger2.ScriptLanguage = {}));
  let DebugSymbolsType;
  ((DebugSymbolsType2) => {
    DebugSymbolsType2["SourceMap"] = "SourceMap";
    DebugSymbolsType2["EmbeddedDWARF"] = "EmbeddedDWARF";
    DebugSymbolsType2["ExternalDWARF"] = "ExternalDWARF";
  })(DebugSymbolsType = Debugger2.DebugSymbolsType || (Debugger2.DebugSymbolsType = {}));
  let ContinueToLocationRequestTargetCallFrames;
  ((ContinueToLocationRequestTargetCallFrames2) => {
    ContinueToLocationRequestTargetCallFrames2["Any"] = "any";
    ContinueToLocationRequestTargetCallFrames2["Current"] = "current";
  })(ContinueToLocationRequestTargetCallFrames = Debugger2.ContinueToLocationRequestTargetCallFrames || (Debugger2.ContinueToLocationRequestTargetCallFrames = {}));
  let RestartFrameRequestMode;
  ((RestartFrameRequestMode2) => {
    RestartFrameRequestMode2["StepInto"] = "StepInto";
  })(RestartFrameRequestMode = Debugger2.RestartFrameRequestMode || (Debugger2.RestartFrameRequestMode = {}));
  let SetInstrumentationBreakpointRequestInstrumentation;
  ((SetInstrumentationBreakpointRequestInstrumentation2) => {
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptExecution"] = "beforeScriptExecution";
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptWithSourceMapExecution"] = "beforeScriptWithSourceMapExecution";
  })(SetInstrumentationBreakpointRequestInstrumentation = Debugger2.SetInstrumentationBreakpointRequestInstrumentation || (Debugger2.SetInstrumentationBreakpointRequestInstrumentation = {}));
  let SetPauseOnExceptionsRequestState;
  ((SetPauseOnExceptionsRequestState2) => {
    SetPauseOnExceptionsRequestState2["None"] = "none";
    SetPauseOnExceptionsRequestState2["Caught"] = "caught";
    SetPauseOnExceptionsRequestState2["Uncaught"] = "uncaught";
    SetPauseOnExceptionsRequestState2["All"] = "all";
  })(SetPauseOnExceptionsRequestState = Debugger2.SetPauseOnExceptionsRequestState || (Debugger2.SetPauseOnExceptionsRequestState = {}));
  let SetScriptSourceResponseStatus;
  ((SetScriptSourceResponseStatus2) => {
    SetScriptSourceResponseStatus2["Ok"] = "Ok";
    SetScriptSourceResponseStatus2["CompileError"] = "CompileError";
    SetScriptSourceResponseStatus2["BlockedByActiveGenerator"] = "BlockedByActiveGenerator";
    SetScriptSourceResponseStatus2["BlockedByActiveFunction"] = "BlockedByActiveFunction";
    SetScriptSourceResponseStatus2["BlockedByTopLevelEsModuleChange"] = "BlockedByTopLevelEsModuleChange";
  })(SetScriptSourceResponseStatus = Debugger2.SetScriptSourceResponseStatus || (Debugger2.SetScriptSourceResponseStatus = {}));
  let PausedEventReason;
  ((PausedEventReason2) => {
    PausedEventReason2["Ambiguous"] = "ambiguous";
    PausedEventReason2["Assert"] = "assert";
    PausedEventReason2["CSPViolation"] = "CSPViolation";
    PausedEventReason2["DebugCommand"] = "debugCommand";
    PausedEventReason2["DOM"] = "DOM";
    PausedEventReason2["EventListener"] = "EventListener";
    PausedEventReason2["Exception"] = "exception";
    PausedEventReason2["Instrumentation"] = "instrumentation";
    PausedEventReason2["OOM"] = "OOM";
    PausedEventReason2["Other"] = "other";
    PausedEventReason2["PromiseRejection"] = "promiseRejection";
    PausedEventReason2["XHR"] = "XHR";
    PausedEventReason2["Step"] = "step";
  })(PausedEventReason = Debugger2.PausedEventReason || (Debugger2.PausedEventReason = {}));
})(Debugger || (Debugger = {}));
var Runtime;
((Runtime6) => {
  let SerializationOptionsSerialization;
  ((SerializationOptionsSerialization2) => {
    SerializationOptionsSerialization2["Deep"] = "deep";
    SerializationOptionsSerialization2["Json"] = "json";
    SerializationOptionsSerialization2["IdOnly"] = "idOnly";
  })(SerializationOptionsSerialization = Runtime6.SerializationOptionsSerialization || (Runtime6.SerializationOptionsSerialization = {}));
  let DeepSerializedValueType;
  ((DeepSerializedValueType2) => {
    DeepSerializedValueType2["Undefined"] = "undefined";
    DeepSerializedValueType2["Null"] = "null";
    DeepSerializedValueType2["String"] = "string";
    DeepSerializedValueType2["Number"] = "number";
    DeepSerializedValueType2["Boolean"] = "boolean";
    DeepSerializedValueType2["Bigint"] = "bigint";
    DeepSerializedValueType2["Regexp"] = "regexp";
    DeepSerializedValueType2["Date"] = "date";
    DeepSerializedValueType2["Symbol"] = "symbol";
    DeepSerializedValueType2["Array"] = "array";
    DeepSerializedValueType2["Object"] = "object";
    DeepSerializedValueType2["Function"] = "function";
    DeepSerializedValueType2["Map"] = "map";
    DeepSerializedValueType2["Set"] = "set";
    DeepSerializedValueType2["Weakmap"] = "weakmap";
    DeepSerializedValueType2["Weakset"] = "weakset";
    DeepSerializedValueType2["Error"] = "error";
    DeepSerializedValueType2["Proxy"] = "proxy";
    DeepSerializedValueType2["Promise"] = "promise";
    DeepSerializedValueType2["Typedarray"] = "typedarray";
    DeepSerializedValueType2["Arraybuffer"] = "arraybuffer";
    DeepSerializedValueType2["Node"] = "node";
    DeepSerializedValueType2["Window"] = "window";
    DeepSerializedValueType2["Generator"] = "generator";
  })(DeepSerializedValueType = Runtime6.DeepSerializedValueType || (Runtime6.DeepSerializedValueType = {}));
  let RemoteObjectType;
  ((RemoteObjectType2) => {
    RemoteObjectType2["Object"] = "object";
    RemoteObjectType2["Function"] = "function";
    RemoteObjectType2["Undefined"] = "undefined";
    RemoteObjectType2["String"] = "string";
    RemoteObjectType2["Number"] = "number";
    RemoteObjectType2["Boolean"] = "boolean";
    RemoteObjectType2["Symbol"] = "symbol";
    RemoteObjectType2["Bigint"] = "bigint";
  })(RemoteObjectType = Runtime6.RemoteObjectType || (Runtime6.RemoteObjectType = {}));
  let RemoteObjectSubtype;
  ((RemoteObjectSubtype2) => {
    RemoteObjectSubtype2["Array"] = "array";
    RemoteObjectSubtype2["Null"] = "null";
    RemoteObjectSubtype2["Node"] = "node";
    RemoteObjectSubtype2["Regexp"] = "regexp";
    RemoteObjectSubtype2["Date"] = "date";
    RemoteObjectSubtype2["Map"] = "map";
    RemoteObjectSubtype2["Set"] = "set";
    RemoteObjectSubtype2["Weakmap"] = "weakmap";
    RemoteObjectSubtype2["Weakset"] = "weakset";
    RemoteObjectSubtype2["Iterator"] = "iterator";
    RemoteObjectSubtype2["Generator"] = "generator";
    RemoteObjectSubtype2["Error"] = "error";
    RemoteObjectSubtype2["Proxy"] = "proxy";
    RemoteObjectSubtype2["Promise"] = "promise";
    RemoteObjectSubtype2["Typedarray"] = "typedarray";
    RemoteObjectSubtype2["Arraybuffer"] = "arraybuffer";
    RemoteObjectSubtype2["Dataview"] = "dataview";
    RemoteObjectSubtype2["Webassemblymemory"] = "webassemblymemory";
    RemoteObjectSubtype2["Wasmvalue"] = "wasmvalue";
    RemoteObjectSubtype2["Trustedtype"] = "trustedtype";
  })(RemoteObjectSubtype = Runtime6.RemoteObjectSubtype || (Runtime6.RemoteObjectSubtype = {}));
  let ObjectPreviewType;
  ((ObjectPreviewType2) => {
    ObjectPreviewType2["Object"] = "object";
    ObjectPreviewType2["Function"] = "function";
    ObjectPreviewType2["Undefined"] = "undefined";
    ObjectPreviewType2["String"] = "string";
    ObjectPreviewType2["Number"] = "number";
    ObjectPreviewType2["Boolean"] = "boolean";
    ObjectPreviewType2["Symbol"] = "symbol";
    ObjectPreviewType2["Bigint"] = "bigint";
  })(ObjectPreviewType = Runtime6.ObjectPreviewType || (Runtime6.ObjectPreviewType = {}));
  let ObjectPreviewSubtype;
  ((ObjectPreviewSubtype2) => {
    ObjectPreviewSubtype2["Array"] = "array";
    ObjectPreviewSubtype2["Null"] = "null";
    ObjectPreviewSubtype2["Node"] = "node";
    ObjectPreviewSubtype2["Regexp"] = "regexp";
    ObjectPreviewSubtype2["Date"] = "date";
    ObjectPreviewSubtype2["Map"] = "map";
    ObjectPreviewSubtype2["Set"] = "set";
    ObjectPreviewSubtype2["Weakmap"] = "weakmap";
    ObjectPreviewSubtype2["Weakset"] = "weakset";
    ObjectPreviewSubtype2["Iterator"] = "iterator";
    ObjectPreviewSubtype2["Generator"] = "generator";
    ObjectPreviewSubtype2["Error"] = "error";
    ObjectPreviewSubtype2["Proxy"] = "proxy";
    ObjectPreviewSubtype2["Promise"] = "promise";
    ObjectPreviewSubtype2["Typedarray"] = "typedarray";
    ObjectPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    ObjectPreviewSubtype2["Dataview"] = "dataview";
    ObjectPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    ObjectPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    ObjectPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(ObjectPreviewSubtype = Runtime6.ObjectPreviewSubtype || (Runtime6.ObjectPreviewSubtype = {}));
  let PropertyPreviewType;
  ((PropertyPreviewType2) => {
    PropertyPreviewType2["Object"] = "object";
    PropertyPreviewType2["Function"] = "function";
    PropertyPreviewType2["Undefined"] = "undefined";
    PropertyPreviewType2["String"] = "string";
    PropertyPreviewType2["Number"] = "number";
    PropertyPreviewType2["Boolean"] = "boolean";
    PropertyPreviewType2["Symbol"] = "symbol";
    PropertyPreviewType2["Accessor"] = "accessor";
    PropertyPreviewType2["Bigint"] = "bigint";
  })(PropertyPreviewType = Runtime6.PropertyPreviewType || (Runtime6.PropertyPreviewType = {}));
  let PropertyPreviewSubtype;
  ((PropertyPreviewSubtype2) => {
    PropertyPreviewSubtype2["Array"] = "array";
    PropertyPreviewSubtype2["Null"] = "null";
    PropertyPreviewSubtype2["Node"] = "node";
    PropertyPreviewSubtype2["Regexp"] = "regexp";
    PropertyPreviewSubtype2["Date"] = "date";
    PropertyPreviewSubtype2["Map"] = "map";
    PropertyPreviewSubtype2["Set"] = "set";
    PropertyPreviewSubtype2["Weakmap"] = "weakmap";
    PropertyPreviewSubtype2["Weakset"] = "weakset";
    PropertyPreviewSubtype2["Iterator"] = "iterator";
    PropertyPreviewSubtype2["Generator"] = "generator";
    PropertyPreviewSubtype2["Error"] = "error";
    PropertyPreviewSubtype2["Proxy"] = "proxy";
    PropertyPreviewSubtype2["Promise"] = "promise";
    PropertyPreviewSubtype2["Typedarray"] = "typedarray";
    PropertyPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    PropertyPreviewSubtype2["Dataview"] = "dataview";
    PropertyPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    PropertyPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    PropertyPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(PropertyPreviewSubtype = Runtime6.PropertyPreviewSubtype || (Runtime6.PropertyPreviewSubtype = {}));
  let ConsoleAPICalledEventType;
  ((ConsoleAPICalledEventType2) => {
    ConsoleAPICalledEventType2["Log"] = "log";
    ConsoleAPICalledEventType2["Debug"] = "debug";
    ConsoleAPICalledEventType2["Info"] = "info";
    ConsoleAPICalledEventType2["Error"] = "error";
    ConsoleAPICalledEventType2["Warning"] = "warning";
    ConsoleAPICalledEventType2["Dir"] = "dir";
    ConsoleAPICalledEventType2["DirXML"] = "dirxml";
    ConsoleAPICalledEventType2["Table"] = "table";
    ConsoleAPICalledEventType2["Trace"] = "trace";
    ConsoleAPICalledEventType2["Clear"] = "clear";
    ConsoleAPICalledEventType2["StartGroup"] = "startGroup";
    ConsoleAPICalledEventType2["StartGroupCollapsed"] = "startGroupCollapsed";
    ConsoleAPICalledEventType2["EndGroup"] = "endGroup";
    ConsoleAPICalledEventType2["Assert"] = "assert";
    ConsoleAPICalledEventType2["Profile"] = "profile";
    ConsoleAPICalledEventType2["ProfileEnd"] = "profileEnd";
    ConsoleAPICalledEventType2["Count"] = "count";
    ConsoleAPICalledEventType2["TimeEnd"] = "timeEnd";
  })(ConsoleAPICalledEventType = Runtime6.ConsoleAPICalledEventType || (Runtime6.ConsoleAPICalledEventType = {}));
})(Runtime || (Runtime = {}));

// ../../front_end/panels/ai_assistance/components/ChatInput.ts
import * as AiAssistanceModel6 from "../../models/ai_assistance/ai_assistance.js";
import * as PanelsCommon4 from "../common/common.js";
import * as PanelUtils2 from "../utils/utils.js";
import * as Buttons3 from "../../ui/components/buttons/buttons.js";
import * as Input4 from "../../ui/components/input/input.js";
import * as Snackbars2 from "../../ui/components/snackbars/snackbars.js";
import * as UI3 from "../../ui/legacy/legacy.js";
import * as Lit6 from "../../ui/lit/lit.js";
import * as VisualLogging3 from "../../ui/visual_logging/visual_logging.js";

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
  border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
  border-radius: var(--sys-shape-corner-small);

  &:focus-within {
    outline: var(--sys-size-1) solid var(--sys-color-primary);
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
      border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
      background-color: var(--sys-color-cdt-base-container);
    }

    img {
      max-height: var(--sys-size-18);
      max-width: 100%;
      border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
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
      border: var(--sys-size-1) solid var(--sys-color-neutral-outline);

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
    border-right: var(--sys-size-1) solid var(--sys-color-divider);
    padding-right: var(--sys-size-5);

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
      outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
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
    border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
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
    margin-bottom: var(--sys-size-1);
  }
}

.chat-input-footer {
  display: flex;
  justify-content: center;
  padding-block: var(--sys-size-3);
  font: var(--sys-typescale-body5-regular);
  border-top: var(--sys-size-1) solid var(--sys-color-divider);
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

// ../../front_end/panels/ai_assistance/components/ImageResize.ts
var ImageResize_exports = {};
__export(ImageResize_exports, {
  compress: () => compress,
  setCompressImplementationForTest: () => setCompressImplementationForTest
});
var MAX_DIMENSION_PX = 1024;
var compressImplementation = realCompress;
function setCompressImplementationForTest(impl) {
  compressImplementation = impl ?? realCompress;
}
async function compress(file) {
  return await compressImplementation(file);
}
async function realCompress(file) {
  const bitmap = await createImageBitmap(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
      if (width > height) {
        height = Math.round(height * MAX_DIMENSION_PX / width);
        width = MAX_DIMENSION_PX;
      } else {
        width = Math.round(width * MAX_DIMENSION_PX / height);
        height = MAX_DIMENSION_PX;
      }
    }
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.8
    });
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error("Failed to read compressed blob"));
      reader.readAsDataURL(blob);
    });
    return {
      data: base64,
      mimeType: "image/jpeg"
    };
  } finally {
    bitmap.close();
  }
}

// ../../front_end/panels/ai_assistance/components/ChatInput.ts
var { html: html6, Directives: { createRef, ref: ref3 } } = Lit6;
var { widget: widget2 } = UI3.Widget;
var UIStrings2 = {
  /**
   * @description Label added to the text input to describe the context for screen readers. Not shown visibly on screen.
   */
  inputTextAriaDescription: "You can also use one of the suggested prompts above to start your conversation",
  /**
   * @description Label added to the button that reveals the selected context item in DevTools.
   */
  revealContextDescription: "Reveal the selected context item in DevTools",
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: "Learn about AI in DevTools"
};
var UIStringsNotTranslate2 = {
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
  pastConversation: "You\u2019re viewing a past conversation.",
  /**
   * @description Message displayed in toast in case of any failures while taking a screenshot of the page.
   */
  screenshotFailureMessage: "Failed to take a screenshot. Please try again.",
  /**
   * @description Message displayed in toast in case of any failures while uploading an image file as input.
   */
  uploadImageFailureMessage: "Failed to upload image. Please try again.",
  /**
   * @description Message displayed in toast in case of uploaded image being too large.
   */
  fileTooLargeMessage: "File is too large. Please select an image under 10MB.",
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
  removeContextStorage: "Remove storage from context",
  /**
   * @description Label added to the button that remove the currently selected context in AI Assistance panel.
   */
  removeContext: "Remove from context"
};
var str_2 = i18n5.i18n.registerUIStrings("panels/ai_assistance/components/ChatInput.ts", UIStrings2);
var i18nString2 = i18n5.i18n.getLocalizedString.bind(void 0, str_2);
var lockedString3 = i18n5.i18n.lockedString;
var SCREENSHOT_QUALITY = 80;
var JPEG_MIME_TYPE = "image/jpeg";
var SHOW_LOADING_STATE_TIMEOUT = 100;
var MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
var RELEVANT_DATA_LINK_CHAT_ID = "relevant-data-link-chat";
var RELEVANT_DATA_LINK_FOOTER_ID = "relevant-data-link-footer";
function getContextRemoveLabel(context) {
  if (context instanceof AiAssistanceModel6.FileContext.FileContext) {
    return lockedString3(UIStringsNotTranslate2.removeContextFile);
  }
  if (context instanceof AiAssistanceModel6.DOMNodeContext.DOMNodeContext) {
    return lockedString3(UIStringsNotTranslate2.removeContextElement);
  }
  if (context instanceof AiAssistanceModel6.RequestContext.RequestContext) {
    return lockedString3(UIStringsNotTranslate2.removeContextRequest);
  }
  if (context instanceof AiAssistanceModel6.PerformanceTraceContext.PerformanceTraceContext) {
    return lockedString3(UIStringsNotTranslate2.removeContextPerfInsight);
  }
  if (context instanceof AiAssistanceModel6.StorageContext.StorageContext) {
    return lockedString3(UIStringsNotTranslate2.removeContextStorage);
  }
  return lockedString3(UIStringsNotTranslate2.removeContext);
}
var DEFAULT_VIEW3 = (input, _output, target) => {
  const chatInputContainerCls = Lit6.Directives.classMap({
    "chat-input-container": true,
    "single-line-layout": !input.context,
    disabled: input.isTextInputDisabled
  });
  const renderRelevantDataDisclaimer = (tooltipId) => {
    const classes = Lit6.Directives.classMap({
      "chat-input-disclaimer": true,
      "hide-divider": !input.isLoading && input.blockedByCrossOrigin
    });
    return html6`
      <div class=${classes}>
        <button
          class="link"
          role="link"
          aria-details=${tooltipId}
          jslog=${VisualLogging3.link("open-ai-settings").track({
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
            jslog=${VisualLogging3.link("open-ai-settings").track({
      click: true
    })}
            @click=${() => {
      void UI3.ViewManager.ViewManager.instance().showView("chrome-ai");
    }}>${i18nString2(UIStrings2.learnAbout)}
          </button>
        </div></devtools-tooltip>
      </div>
    `;
  };
  Lit6.render(html6`
    <style>${Input4.textInputStyles}</style>
    <style>${chatInput_css_default}</style>
    ${input.isReadOnly ? html6`
        <div
          class="chat-readonly-container"
          jslog=${VisualLogging3.section("read-only")}
        >
          <span>${lockedString3(UIStringsNotTranslate2.pastConversation)}</span>
          <devtools-button
            aria-label=${lockedString3(UIStringsNotTranslate2.startNewChat)}
            class="chat-inline-button"
            @click=${input.onNewConversation}
            .data=${{
    variant: Buttons3.Button.Variant.TEXT,
    title: lockedString3(UIStringsNotTranslate2.startNewChat),
    jslogContext: "start-new-chat"
  }}
          >${lockedString3(UIStringsNotTranslate2.startNewChat)}</devtools-button>
        </div>` : html6`
        <form class="input-form" @submit=${input.onSubmit}>
          <div class=${chatInputContainerCls}>
            ${input.multimodalInputEnabled && input.imageInput && !input.isTextInputDisabled ? html6`
                <div class="image-input-container">
                  <devtools-button
                    aria-label=${lockedString3(UIStringsNotTranslate2.removeImageInputButtonTitle)}
                    @click=${input.onRemoveImageInput}
                    .data=${{
    variant: Buttons3.Button.Variant.ICON,
    size: Buttons3.Button.Size.MICRO,
    iconName: "cross",
    title: lockedString3(UIStringsNotTranslate2.removeImageInputButtonTitle)
  }}
                  ></devtools-button>
                  ${input.imageInput.isLoading ? html6`
                      <div class="loading">
                        <devtools-spinner></devtools-spinner>
                      </div>` : html6`
                      <img src="data:${input.imageInput.mimeType};base64, ${input.imageInput.data}" alt="Image input" />`}
                </div>` : Lit6.nothing}
            <textarea
              class="chat-input"
              .disabled=${input.isTextInputDisabled}
              wrap="hard"
              maxlength="10000"
              .value=${input.textInputValue}
              @keydown=${input.onTextAreaKeyDown}
              @paste=${input.onImagePaste}
              @dragover=${input.onImageDragOver}
              @drop=${input.onImageDrop}
              @input=${(event) => {
    input.onTextInputChange(event.target.value);
  }}
              placeholder=${input.inputPlaceholder}
              jslog=${VisualLogging3.textField("query").track({
    change: true,
    keydown: "Enter"
  })}
              aria-description=${i18nString2(UIStrings2.inputTextAriaDescription)}
              ${ref3(input.textAreaRef)}
            ></textarea>
            <div class="chat-input-actions">
              <div class="chat-input-actions-left">
                ${input.context ? html6`
                    <div class="select-element">
                      ${input.conversationType === AiAssistanceModel6.AiHistoryStorage.ConversationType.STYLING ? html6`
                          <devtools-button
                            .data=${{
    variant: Buttons3.Button.Variant.ICON_TOGGLE,
    size: Buttons3.Button.Size.SMALL,
    iconName: "select-element",
    toggledIconName: "select-element",
    toggleType: Buttons3.Button.ToggleType.PRIMARY,
    toggled: input.inspectElementToggled,
    title: lockedString3(UIStringsNotTranslate2.selectAnElement),
    jslogContext: "select-element",
    disabled: input.isTextInputDisabled
  }}
                            @click=${input.onInspectElementClick}
                          ></devtools-button>` : Lit6.nothing}
                      <div
                        class=${Lit6.Directives.classMap({
    "resource-link": true,
    disabled: !input.isContextSelected
  })}
                      >
                        ${input.context instanceof AiAssistanceModel6.DOMNodeContext.DOMNodeContext ? html6`
                              <devtools-widget
                                class="title"
                                ${widget2(PanelsCommon4.DOMLinkifier.DOMNodeLink, {
    node: input.context.getItem(),
    options: {
      disabled: !input.isContextSelected,
      hiddenClassList: input.context.getItem().classNames().filter(
        (className) => className.startsWith(AiAssistanceModel6.Injected.AI_ASSISTANCE_CSS_CLASS_NAME)
      ),
      ariaDescription: i18nString2(UIStrings2.revealContextDescription)
    }
  })}
                              ></devtools-widget>` : html6`
                          ${input.context instanceof AiAssistanceModel6.RequestContext.RequestContext ? PanelUtils2.PanelUtils.getIconForNetworkRequest(input.context.getItem()) : input.context instanceof AiAssistanceModel6.FileContext.FileContext ? PanelUtils2.PanelUtils.getIconForSourceFile(input.context.getItem()) : input.context instanceof AiAssistanceModel6.AccessibilityContext.AccessibilityContext ? html6`<devtools-icon class="icon" name="performance" title="Lighthouse"></devtools-icon>` : input.context instanceof AiAssistanceModel6.PerformanceTraceContext.PerformanceTraceContext ? html6`<devtools-icon class="icon" name="performance" title="Performance"></devtools-icon>` : input.context instanceof AiAssistanceModel6.StorageContext.StorageContext ? html6`<devtools-icon class="icon" name="table" title="Storage"></devtools-icon>` : Lit6.nothing}
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
                              aria-description=${i18nString2(UIStrings2.revealContextDescription)}
                            >${input.context.getTitle()}</span>`}
                        ${input.isContextSelected && input.onContextRemoved ? html6`
                                  <devtools-button
                                    title=${getContextRemoveLabel(input.context)}
                                    aria-label=${getContextRemoveLabel(input.context)}
                                    class="remove-context"
                                    .iconName=${"cross"}
                                    .size=${Buttons3.Button.Size.MICRO}
                                    .jslogContext=${"context-removed"}
                                    .variant=${Buttons3.Button.Variant.ICON}
                                    @click=${input.onContextRemoved}></devtools-button>` : Lit6.nothing}
                      ${!input.isContextSelected && input.onContextAdd ? html6`
                                    <devtools-button
                                      title=${lockedString3(UIStringsNotTranslate2.addContext)}
                                      aria-label=${lockedString3(UIStringsNotTranslate2.addContext)}
                                      class="add-context"
                                      .iconName=${"plus"}
                                      .size=${Buttons3.Button.Size.MICRO}
                                      .jslogContext=${"context-added"}
                                      .variant=${Buttons3.Button.Variant.ICON}
                                      @click=${input.onContextAdd}></devtools-button>` : Lit6.nothing}
                      </div>
                    </div>` : Lit6.nothing}
              </div>
              <div class="chat-input-actions-right">
                <div class="chat-input-disclaimer-container">
                  ${renderRelevantDataDisclaimer(RELEVANT_DATA_LINK_CHAT_ID)}
                </div>
                ${input.multimodalInputEnabled && !input.blockedByCrossOrigin ? html6`
                    ${input.uploadImageInputEnabled ? html6`
                        <devtools-button
                          class="chat-input-button"
                          aria-label=${lockedString3(UIStringsNotTranslate2.addImageButtonTitle)}
                          @click=${input.onImageUpload}
                          .data=${{
    variant: Buttons3.Button.Variant.ICON,
    size: Buttons3.Button.Size.REGULAR,
    disabled: input.isTextInputDisabled || input.imageInput?.isLoading,
    iconName: "add-photo",
    title: lockedString3(UIStringsNotTranslate2.addImageButtonTitle),
    jslogContext: "upload-image"
  }}
                        ></devtools-button>` : Lit6.nothing}
                    <devtools-button
                      class="chat-input-button"
                      aria-label=${lockedString3(UIStringsNotTranslate2.takeScreenshotButtonTitle)}
                      @click=${input.onTakeScreenshot}
                      .data=${{
    variant: Buttons3.Button.Variant.ICON,
    size: Buttons3.Button.Size.REGULAR,
    disabled: input.isTextInputDisabled || input.imageInput?.isLoading,
    iconName: "photo-camera",
    title: lockedString3(UIStringsNotTranslate2.takeScreenshotButtonTitle),
    jslogContext: "take-screenshot"
  }}
                    ></devtools-button>` : Lit6.nothing}
                ${input.isLoading ? html6`
                    <devtools-button
                      class="chat-input-button"
                      aria-label=${lockedString3(UIStringsNotTranslate2.cancelButtonTitle)}
                      @click=${input.onCancel}
                      .data=${{
    variant: Buttons3.Button.Variant.ICON,
    size: Buttons3.Button.Size.REGULAR,
    iconName: "record-stop",
    title: lockedString3(UIStringsNotTranslate2.cancelButtonTitle),
    jslogContext: "stop"
  }}
                    ></devtools-button>` : input.blockedByCrossOrigin ? html6`
                      <devtools-button
                        class="start-new-chat-button"
                        aria-label=${lockedString3(UIStringsNotTranslate2.startNewChat)}
                        @click=${input.onNewConversation}
                        .data=${{
    variant: Buttons3.Button.Variant.OUTLINED,
    size: Buttons3.Button.Size.SMALL,
    title: lockedString3(UIStringsNotTranslate2.startNewChat),
    jslogContext: "start-new-chat"
  }}
                      >${lockedString3(UIStringsNotTranslate2.startNewChat)}</devtools-button>` : html6`
                      <devtools-button
                        class="chat-input-button"
                        aria-label=${lockedString3(UIStringsNotTranslate2.sendButtonTitle)}
                        .data=${{
    type: "submit",
    variant: Buttons3.Button.Variant.ICON,
    size: Buttons3.Button.Size.REGULAR,
    disabled: input.isTextInputDisabled || input.isTextInputEmpty || input.imageInput?.isLoading,
    iconName: "send",
    title: lockedString3(UIStringsNotTranslate2.sendButtonTitle),
    jslogContext: "send"
  }}
                      ></devtools-button>`}
              </div>
            </div>
          </div>
        </form>`}
    <footer
      class=${Lit6.Directives.classMap({
    "chat-input-footer": true,
    "is-read-only": input.isReadOnly
  })}
      jslog=${VisualLogging3.section("footer")}
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
  conversationType = AiAssistanceModel6.AiHistoryStorage.ConversationType.STYLING;
  multimodalInputEnabled = false;
  uploadImageInputEnabled = false;
  isReadOnly = false;
  textInputValue = "";
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
      const maxLength = this.#textAreaRef.value.maxLength;
      const truncatedText = maxLength >= 0 ? text.substring(0, maxLength) : text;
      this.#textAreaRef.value.value = truncatedText;
      this.#textAreaRef.value.setSelectionRange(
        truncatedText.length,
        truncatedText.length
      );
      this.textInputValue = truncatedText;
      this.onTextChange(truncatedText);
    }
    this.performUpdate();
  }
  #isTextInputEmpty() {
    const text = this.#textAreaRef?.value?.value ?? this.textInputValue;
    return !text.trim();
  }
  onTextSubmit = () => {
  };
  onTextChange = () => {
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
    const prompts = AiAssistanceModel6.AiHistoryStorage.AiHistoryStorage.instance().getRecentPrompts();
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
    const mainTarget = SDK4.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      throw new Error("Could not find main target");
    }
    const model = mainTarget.model(SDK4.ScreenCaptureModel.ScreenCaptureModel);
    if (!model) {
      throw new Error("Could not find model");
    }
    const showLoadingTimeout = setTimeout(() => {
      this.#imageInput = { isLoading: true };
      this.performUpdate();
    }, SHOW_LOADING_STATE_TIMEOUT);
    const bytes = await model.captureScreenshot(
      Page.CaptureScreenshotRequestFormat.Jpeg,
      SCREENSHOT_QUALITY,
      SDK4.ScreenCaptureModel.ScreenshotMode.FROM_VIEWPORT
    );
    clearTimeout(showLoadingTimeout);
    if (bytes) {
      this.#imageInput = {
        isLoading: false,
        data: bytes,
        mimeType: JPEG_MIME_TYPE,
        inputType: AiAssistanceModel6.AiAgent.MultimodalInputType.SCREENSHOT
      };
      this.performUpdate();
      void this.updateComplete.then(() => {
        this.focusTextInput();
      });
    } else {
      this.#imageInput = void 0;
      this.performUpdate();
      Snackbars2.Snackbar.Snackbar.show({ message: lockedString3(UIStringsNotTranslate2.screenshotFailureMessage) });
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
    if (this.conversationType !== AiAssistanceModel6.AiHistoryStorage.ConversationType.STYLING) {
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
    if (this.conversationType !== AiAssistanceModel6.AiHistoryStorage.ConversationType.STYLING) {
      return;
    }
    event.preventDefault();
  };
  #handleImageDrop = (event) => {
    this.#handleImageDataTransferEvent(event.dataTransfer, event);
  };
  async #handleLoadImage(file) {
    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      Snackbars2.Snackbar.Snackbar.show({ message: lockedString3(UIStringsNotTranslate2.fileTooLargeMessage) });
      return;
    }
    const showLoadingTimeout = setTimeout(() => {
      this.#imageInput = { isLoading: true };
      this.performUpdate();
    }, SHOW_LOADING_STATE_TIMEOUT);
    try {
      const compressed = await compress(file);
      this.#imageInput = {
        isLoading: false,
        data: compressed.data,
        mimeType: compressed.mimeType,
        inputType: AiAssistanceModel6.AiAgent.MultimodalInputType.UPLOADED_IMAGE
      };
    } catch (err) {
      console.error("Failed to compress image:", err);
      this.#imageInput = void 0;
      Snackbars2.Snackbar.Snackbar.show({ message: lockedString3(UIStringsNotTranslate2.uploadImageFailureMessage) });
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
    this.#view = view ?? DEFAULT_VIEW3;
  }
  wasShown() {
    super.wasShown();
    SDK4.TargetManager.TargetManager.instance().addModelListener(
      SDK4.ResourceTreeModel.ResourceTreeModel,
      SDK4.ResourceTreeModel.Events.PrimaryPageChanged,
      this.#onPrimaryPageChanged,
      this
    );
  }
  willHide() {
    super.willHide();
    SDK4.TargetManager.TargetManager.instance().removeModelListener(
      SDK4.ResourceTreeModel.ResourceTreeModel,
      SDK4.ResourceTreeModel.Events.PrimaryPageChanged,
      this.#onPrimaryPageChanged,
      this
    );
  }
  #onPrimaryPageChanged() {
    this.#imageInput = void 0;
    this.performUpdate();
  }
  performUpdate() {
    this.#view(
      {
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
        textInputValue: this.textInputValue,
        textAreaRef: this.#textAreaRef,
        onContextClick: this.onContextClick,
        onInspectElementClick: this.onInspectElementClick,
        onImagePaste: this.#handleImagePaste,
        onNewConversation: this.onNewConversation,
        onTextInputChange: (text) => {
          this.textInputValue = text;
          this.onTextChange(text);
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
      },
      void 0,
      this.contentElement
    );
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
    const text = this.#textAreaRef.value?.value?.trim() ?? "";
    if (!text && !imageInput) {
      return;
    }
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
  margin-left: var(--sys-size-2);
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
  box-shadow: 0 var(--sys-size-1) var(--sys-color-cdt-base-container);

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

// ../../front_end/panels/ai_assistance/components/ExportForAgentsDialog.ts
var ExportForAgentsDialog_exports = {};
__export(ExportForAgentsDialog_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  ExportForAgentsDialog: () => ExportForAgentsDialog,
  StateType: () => StateType
});
import "../../ui/components/spinners/spinners.js";
import * as Host2 from "../../core/host/host.js";
import * as i18n7 from "../../core/i18n/i18n.js";
import * as Buttons4 from "../../ui/components/buttons/buttons.js";
import * as Snackbars3 from "../../ui/components/snackbars/snackbars.js";
import * as UI4 from "../../ui/legacy/legacy.js";
import * as Lit7 from "../../ui/lit/lit.js";
import * as VisualLogging4 from "../../ui/visual_logging/visual_logging.js";

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

    &:focus-visible {
      outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    }
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

// ../../front_end/panels/ai_assistance/components/ExportForAgentsDialog.ts
var { html: html7, render: render4 } = Lit7;
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
   * @description Label for the 'summary prompt' radio button in the export for agents dialog.
   */
  asPrompt: "Summary prompt",
  /**
   * @description Label for the 'full conversation' radio button in the export for agents dialog.
   */
  asMarkdown: "Full conversation",
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
var str_3 = i18n7.i18n.registerUIStrings("panels/ai_assistance/components/ExportForAgentsDialog.ts", UIStrings3);
var i18nString3 = i18n7.i18n.getLocalizedString.bind(void 0, str_3);
var StateType = /* @__PURE__ */ ((StateType2) => {
  StateType2["PROMPT"] = "prompt";
  StateType2["CONVERSATION"] = "conversation";
  return StateType2;
})(StateType || {});
var DEFAULT_STATE_TYPE = "prompt" /* PROMPT */;
var DEFAULT_VIEW4 = (input, _output, target) => {
  const isPrompt = input.state.activeType === "prompt" /* PROMPT */;
  const buttonText = isPrompt ? i18nString3(UIStrings3.copyToClipboard) : i18nString3(UIStrings3.saveAsMarkdown);
  const exportText = isPrompt ? input.state.promptText : input.state.conversationText;
  render4(html7`
    <style>${exportForAgentsDialog_css_default}</style>
    <div class="export-for-agents-dialog" jslog=${VisualLogging4.dialog("ai-export-for-agents")}>
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
            @change=${() => input.onStateChange("prompt" /* PROMPT */)}
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
            @change=${() => input.onStateChange("conversation" /* CONVERSATION */)}
          >
          ${i18nString3(UIStrings3.asMarkdown)}
        </label>
      </div>
      <main>
        ${isPrompt && input.state.isPromptLoading ? html7`
          <span class="prompt-loading">
            <devtools-spinner></devtools-spinner>
            ${i18nString3(UIStrings3.generatingSummary)}
          </span>
          ` : Lit7.nothing}
        ${isPrompt ? html7`<textarea class="prompt" readonly .value=${input.state.isPromptLoading ? "" : exportText}></textarea>` : html7`<textarea class="conversation" readonly .value=${exportText}></textarea>`}
      </main>
      <div class="disclaimer">${i18nString3(UIStrings3.disclaimer)}</div>
      <footer>
        <div class="right-buttons">
          <devtools-button
            @click=${input.onButtonClick}
            .jslogContext=${input.jslogContext}
            .variant=${Buttons4.Button.Variant.PRIMARY}
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
var ExportForAgentsDialog = class _ExportForAgentsDialog extends UI4.Widget.VBox {
  static #lastSelectedType = DEFAULT_STATE_TYPE;
  #view;
  #dialog;
  #state;
  #onConversationSaveAs;
  constructor(options, view = DEFAULT_VIEW4) {
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
      case "prompt" /* PROMPT */:
        jslogContext = "ai-export-for-agents.copy-to-clipboard";
        onButtonClick = (event) => {
          event.preventDefault();
          Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.#state.promptText);
          const snackbar = Snackbars3.Snackbar.Snackbar.show({
            message: i18nString3(UIStrings3.copiedToClipboard)
          });
          snackbar.setAttribute("aria-label", i18nString3(UIStrings3.copiedToClipboard));
          this.#dialog.hide();
        };
        break;
      case "conversation" /* CONVERSATION */:
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
  static show({
    promptText,
    markdownText,
    onConversationSaveAs
  }) {
    const dialog3 = new UI4.Dialog.Dialog();
    dialog3.setAriaLabel(i18nString3(UIStrings3.exportForAgents));
    dialog3.setOutsideClickCallback((ev) => {
      ev.consume(true);
      dialog3.hide();
    });
    dialog3.addCloseButton();
    dialog3.setSizeBehavior(UI4.GlassPane.SizeBehavior.MEASURE_CONTENT);
    dialog3.setDimmed(true);
    const exportDialog = new _ExportForAgentsDialog({ dialog: dialog3, promptText, markdownText, onConversationSaveAs });
    exportDialog.show(dialog3.contentElement);
    void exportDialog.updateComplete.then(() => {
      dialog3.show();
    });
  }
};

// ../../front_end/panels/ai_assistance/components/ChatView.ts
var {
  ref: ref4,
  repeat,
  classMap
} = Directives6;
var { widget: widget3 } = UI5.Widget;
var UIStringsNotTranslate3 = {
  /**
   * @description Text for the empty state of the AI assistance panel.
   */
  emptyStateText: "How can I help you?",
  /**
   * @description Text for the empty state of the Gemini panel.
   */
  emptyStateTextGemini: "Where should we start?"
};
var lockedString4 = i18n9.i18n.lockedString;
var SCROLL_ROUNDING_OFFSET2 = 1;
var DEFAULT_VIEW5 = (input, output, target) => {
  const chatUiClasses = classMap({
    "chat-ui": true,
    gemini: AiAssistanceModel7.AiUtils.isGeminiBranding()
  });
  const inputWidgetClasses = classMap({
    "chat-input-widget": true,
    sticky: !input.isReadOnly
  });
  render5(html8`
      <style>${chatView_css_default}</style>
      <div class=${chatUiClasses}>
        <main @scroll=${input.handleScroll} ${ref4((element) => {
    output.mainElement = element;
  })}>
          ${input.messages.length > 0 ? html8`
            <div class="messages-container" ${ref4(input.handleMessageContainerRef)}>
              ${repeat(input.messages, (message) => message.id, (message, index) => {
    const prevMessage = index > 0 ? input.messages[index - 1] : null;
    const prompt = message.entity === "model" /* MODEL */ && prevMessage?.entity === "user" /* USER */ ? prevMessage.text : "";
    return widget3(ChatMessage, {
      message,
      isLoading: input.isLoading && index === input.messages.length - 1,
      isReadOnly: input.isReadOnly,
      canShowFeedbackForm: input.canShowFeedbackForm,
      markdownRenderer: input.markdownRenderer,
      isLastMessage: index === input.messages.length - 1,
      isFirstMessage: index === 0,
      prompt,
      onSuggestionClick: input.handleSuggestionClick,
      onFeedbackSubmit: input.onFeedbackSubmit,
      onCopyResponseClick: input.onCopyResponseClick,
      onExportClick: input.exportForAgentsClick,
      walkthrough: {
        ...input.walkthrough
      }
    });
  })}
            </div>
          ` : html8`
            <div class="empty-state-container">
              <div class="header">
                <div class="icon">
                  <devtools-icon
                    name="smart-assistant"
                  ></devtools-icon>
                </div>
                ${AiAssistanceModel7.AiUtils.isGeminiBranding() ? html8`
                    <h1 class='greeting'>Hello</h1>
                    <p class='cta'>${lockedString4(UIStringsNotTranslate3.emptyStateTextGemini)}</p>
                  ` : html8`<h1>${lockedString4(UIStringsNotTranslate3.emptyStateText)}</h1>`}
              </div>
              <div class="empty-state-content">
                ${input.emptyStateSuggestions.map(({ title, jslogContext }) => {
    return html8`<devtools-button
                    class="suggestion"
                    @click=${() => input.handleSuggestionClick(title)}
                    .data=${{
      variant: Buttons5.Button.Variant.OUTLINED,
      size: Buttons5.Button.Size.REGULAR,
      title,
      jslogContext: jslogContext ?? "suggestion",
      disabled: input.isTextInputDisabled
    }}
                  >${title}</devtools-button>`;
  })}
              </div>
            </div>
          `}
          <devtools-widget class=${inputWidgetClasses} ${widget3(ChatInput, {
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
    textInputValue: input.textInputValue,
    onTextChange: input.onTextChange,
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
  constructor(props, view = DEFAULT_VIEW5) {
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
    Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
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
    this.#view(
      {
        ...this.#props,
        handleScroll: this.#handleScroll,
        handleSuggestionClick: this.#handleSuggestionClick,
        handleMessageContainerRef: this.#handleMessageContainerRef,
        exportForAgentsClick: this.#exportForAgentsClick.bind(this)
      },
      this.#output,
      this.#shadow
    );
  }
};
customElements.define("devtools-ai-chat-view", ChatView);

// ../../front_end/panels/ai_assistance/components/DisabledWidget.ts
var DisabledWidget_exports = {};
__export(DisabledWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW6,
  DisabledWidget: () => DisabledWidget
});
import * as Host4 from "../../core/host/host.js";
import * as i18n11 from "../../core/i18n/i18n.js";
import * as Root from "../../core/root/root.js";
import * as uiI18n from "../../ui/i18n/i18n.js";
import * as UI6 from "../../ui/legacy/legacy.js";
import { html as html9, render as render6 } from "../../ui/lit/lit.js";
import * as VisualLogging5 from "../../ui/visual_logging/visual_logging.js";

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

// ../../front_end/panels/ai_assistance/components/DisabledWidget.ts
var UIStrings4 = {
  /**
   * @description The error message when the user is not signed in to Chrome.
   */
  notLoggedIn: "This feature is only available when you are signed in to Chrome with your Google account",
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
var str_4 = i18n11.i18n.registerUIStrings("panels/ai_assistance/components/DisabledWidget.ts", UIStrings4);
var i18nString4 = i18n11.i18n.getLocalizedString.bind(void 0, str_4);
function renderAidaUnavailableContents(aidaAvailability) {
  switch (aidaAvailability) {
    case Host4.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL:
    case Host4.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED: {
      return html9`${i18nString4(UIStrings4.notLoggedIn)}`;
    }
    case Host4.AidaClient.AidaAccessPreconditions.NO_INTERNET: {
      return html9`${i18nString4(UIStrings4.offline)}`;
    }
  }
}
function renderConsentViewContents(hostConfig) {
  if (hostConfig.isOffTheRecord) {
    return html9`${i18nString4(UIStrings4.notAvailableInIncognitoMode)}`;
  }
  const settingsLink = document.createElement("span");
  settingsLink.textContent = i18nString4(UIStrings4.settingsLink);
  settingsLink.classList.add("link");
  UI6.ARIAUtils.markAsLink(settingsLink);
  settingsLink.addEventListener("click", () => {
    void UI6.ViewManager.ViewManager.instance().showView("chrome-ai");
  });
  settingsLink.setAttribute("jslog", `${VisualLogging5.action("open-ai-settings").track({ click: true })}`);
  let consentViewContents;
  if (hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(
      str_4,
      UIStrings4.turnOnForStylesRequestsPerformanceAndFiles,
      { PH1: settingsLink }
    );
  } else if (hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(str_4, UIStrings4.turnOnForStylesRequestsAndFiles, { PH1: settingsLink });
  } else if (hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
    consentViewContents = uiI18n.getFormatLocalizedString(str_4, UIStrings4.turnOnForStylesAndRequests, { PH1: settingsLink });
  } else {
    consentViewContents = uiI18n.getFormatLocalizedString(str_4, UIStrings4.turnOnForStyles, { PH1: settingsLink });
  }
  return html9`${consentViewContents}`;
}
var DEFAULT_VIEW6 = (input, _output, target) => {
  render6(
    html9`
      <style>
        ${disabledWidget_css_default}
      </style>
      <div class="disabled-view">
        <div class="disabled-view-icon-container">
          <devtools-icon name="smart-assistant"></devtools-icon>
        </div>
        <div>
          ${input.aidaAvailability === Host4.AidaClient.AidaAccessPreconditions.AVAILABLE ? renderConsentViewContents(input.hostConfig) : renderAidaUnavailableContents(input.aidaAvailability)}
        </div>
      </div>
    `,
    target
  );
};
var DisabledWidget = class extends UI6.Widget.Widget {
  aidaAvailability = Host4.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL;
  #view;
  constructor(element, view = DEFAULT_VIEW6) {
    super(element);
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    void this.requestUpdate();
  }
  performUpdate() {
    const hostConfig = Root.Runtime.hostConfig;
    this.#view(
      {
        aidaAvailability: this.aidaAvailability,
        hostConfig
      },
      {},
      this.contentElement
    );
  }
};

// ../../front_end/panels/ai_assistance/components/ExploreWidget.ts
var ExploreWidget_exports = {};
__export(ExploreWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW7,
  ExploreWidget: () => ExploreWidget
});
import * as i18n13 from "../../core/i18n/i18n.js";
import * as Root2 from "../../core/root/root.js";
import * as UI7 from "../../ui/legacy/legacy.js";
import { html as html10, render as render7 } from "../../ui/lit/lit.js";
import * as VisualLogging6 from "../../ui/visual_logging/visual_logging.js";

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
    border-top: var(--sys-size-1) solid var(--sys-color-divider);
    text-wrap: balance;
    text-align: center;

    p {
      margin: 0;
      padding: 0;
    }
  }
}

/*# sourceURL=${import.meta.resolve("././components/exploreWidget.css")} */`;

// ../../front_end/panels/ai_assistance/components/ExploreWidget.ts
var UIStringsNotTranslate4 = {
  /**
   * @description Text for the empty state of the AI assistance panel when there is no agent selected.
   */
  Explore: "Explore AI assistance",
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: "Learn about AI in DevTools"
};
var lockedString5 = i18n13.i18n.lockedString;
var DEFAULT_VIEW7 = (input, _output, target) => {
  function renderFeatureCardContent(featureCard) {
    return html10`Open
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
  render7(
    html10`
      <style>
        ${exploreWidget_css_default}
      </style>
      <div class="ai-assistance-explore-container">
        <div class="header">
          <div class="icon">
            <devtools-icon name="smart-assistant"></devtools-icon>
          </div>
          <h1>${lockedString5(UIStringsNotTranslate4.Explore)}</h1>
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
            >${lockedString5(UIStringsNotTranslate4.learnAbout)}
            </button>
          </p>
        </div>
        <div class="content">
          ${input.featureCards.map(
      (featureCard) => html10`
              <div class="feature-card">
                <div class="feature-card-icon">
                  <devtools-icon name=${featureCard.icon}></devtools-icon>
                </div>
                <div class="feature-card-content">
                  <h3>${featureCard.heading}</h3>
                  <p>${renderFeatureCardContent(featureCard)}</p>
                </div>
              </div>
            `
    )}
        </div>
      </div>
    `,
    target
  );
};
var ExploreWidget = class extends UI7.Widget.Widget {
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
    const config = Root2.Runtime.hostConfig;
    const featureCards = [];
    if (config.devToolsFreestyler?.enabled && UI7.ViewManager.ViewManager.instance().hasView("elements")) {
      featureCards.push({
        icon: "brush-2",
        heading: "CSS styles",
        jslogContext: "open-elements-panel",
        onClick: () => {
          void UI7.ViewManager.ViewManager.instance().showView(
            "elements"
          );
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
          void UI7.ViewManager.ViewManager.instance().showView(
            "network"
          );
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
          void UI7.ViewManager.ViewManager.instance().showView(
            "sources"
          );
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
          void UI7.ViewManager.ViewManager.instance().showView(
            "timeline"
          );
        },
        panelName: "Performance",
        text: "to ask about a trace item"
      });
    }
    this.#view(
      {
        featureCards
      },
      {},
      this.contentElement
    );
  }
};

// ../../front_end/panels/ai_assistance/components/OptInChangeDialog.ts
var OptInChangeDialog_exports = {};
__export(OptInChangeDialog_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW8,
  OptInChangeDialog: () => OptInChangeDialog
});
import * as i18n15 from "../../core/i18n/i18n.js";
import * as Root3 from "../../core/root/root.js";
import * as Buttons6 from "../../ui/components/buttons/buttons.js";
import * as UI8 from "../../ui/legacy/legacy.js";
import * as Lit8 from "../../ui/lit/lit.js";
import * as VisualLogging7 from "../../ui/visual_logging/visual_logging.js";

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

// ../../front_end/panels/ai_assistance/components/OptInChangeDialog.ts
var { html: html11, render: render8 } = Lit8;
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
var str_5 = i18n15.i18n.registerUIStrings("panels/ai_assistance/components/OptInChangeDialog.ts", UIStrings5);
var i18nString5 = i18n15.i18n.getLocalizedString.bind(void 0, str_5);
var DEFAULT_VIEW8 = (input, _output, target) => {
  const disclaimer = input.loggingEnabled ? i18nString5(UIStrings5.privacyDisclaimer) : i18nString5(UIStrings5.privacyDisclaimerEnterpriseNoLogging);
  render8(html11`
    <style>${optInChangeDialog_css_default}</style>
    <div class="opt-in-change-dialog" jslog=${VisualLogging7.dialog("ai-v2-opt-in-change-dialog")}>
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
            .variant=${Buttons6.Button.Variant.OUTLINED}
            .accessibleLabel=${i18nString5(UIStrings5.manageSettings)}
          >
            ${i18nString5(UIStrings5.manageSettings)}
          </devtools-button>
          <devtools-button
            @click=${input.onGotIt}
            .jslogContext=${"ai-assistance-v2-opt-in.got-it"}
            .variant=${Buttons6.Button.Variant.PRIMARY}
            .accessibleLabel=${i18nString5(UIStrings5.gotIt)}
          >
            ${i18nString5(UIStrings5.gotIt)}
          </devtools-button>
        </div>
      </footer>
    </div>
  `, target);
};
var OptInChangeDialog = class _OptInChangeDialog extends UI8.Widget.VBox {
  #view;
  #onGotIt;
  #onManageSettings;
  constructor(options, view = DEFAULT_VIEW8) {
    super();
    this.#onGotIt = options.onGotIt;
    this.#onManageSettings = options.onManageSettings;
    this.#view = view;
    this.requestUpdate();
  }
  performUpdate() {
    const loggingEnabled = Root3.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue !== Root3.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
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
    const dialog3 = new UI8.Dialog.Dialog();
    dialog3.setAriaLabel(i18nString5(UIStrings5.title));
    dialog3.setOutsideClickCallback((event) => event.consume(true));
    dialog3.setCloseOnEscape(false);
    dialog3.setSizeBehavior(UI8.GlassPane.SizeBehavior.MEASURE_CONTENT);
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

// ../../front_end/panels/ai_assistance/components/PerformanceAgentMarkdownRenderer.ts
import * as Common4 from "../../core/common/common.js";
import * as SDK5 from "../../core/sdk/sdk.js";
import * as Trace3 from "../../models/trace/trace.js";
import * as Lit9 from "../../ui/lit/lit.js";
import * as PanelsCommon5 from "../common/common.js";
var { html: html12 } = Lit9.StaticHtml;
var { until: until3 } = Lit9.Directives;
var PerformanceAgentMarkdownRenderer = class extends MarkdownRendererWithCodeBlock {
  constructor(mainFrameId = "", lookupEvent = () => null) {
    super();
    this.mainFrameId = mainFrameId;
    this.lookupEvent = lookupEvent;
  }
  templateForToken(token) {
    if (token.type === "link" && token.href.startsWith("#")) {
      if (token.href.startsWith("#node-")) {
        const nodeId = Number(token.href.replace("#node-", ""));
        return html12`<span>${until3(this.#linkifyNode(nodeId, token.text).then((node) => node || token.text), token.text)}</span>`;
      }
      const event = this.lookupEvent(token.href.slice(1));
      if (!event) {
        return html12`${token.text}`;
      }
      let label = token.text;
      let title = "";
      if (Trace3.Types.Events.isSyntheticNetworkRequest(event)) {
        title = event.args.data.url;
      } else {
        label += ` (${event.name})`;
      }
      return html12`<a href="#" draggable=false .title=${title} @click=${(e) => {
        e.stopPropagation();
        void Common4.Revealer.reveal(new SDK5.TraceObject.RevealableEvent(event));
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

// ../../front_end/panels/ai_assistance/ExportConversation.ts
var ExportConversation_exports = {};
__export(ExportConversation_exports, {
  saveToDisk: () => saveToDisk
});
import * as Platform4 from "../../core/platform/platform.js";
import * as TextUtils3 from "../../core/text_utils/text_utils.js";
import * as Workspace3 from "../../models/workspace/workspace.js";
async function saveToDisk(conversation) {
  const markdownContent = conversation.getConversationMarkdown();
  const contentData = new TextUtils3.ContentData.ContentData(markdownContent, false, "text/markdown");
  const titleFormatted = Platform4.StringUtilities.toSnakeCase(conversation.title || "");
  const prefix = "devtools_";
  const suffix = ".md";
  const maxTitleLength = 63 - prefix.length - suffix.length;
  const truncatedTitle = titleFormatted ? Platform4.StringUtilities.truncateToCodeUnitLength(titleFormatted, maxTitleLength) : "";
  const finalTitle = truncatedTitle || "conversation";
  const filename = `${prefix}${finalTitle}${suffix}`;
  await Workspace3.FileManager.FileManager.instance().save(filename, contentData, true);
  Workspace3.FileManager.FileManager.instance().close(filename);
}

// ../../front_end/panels/ai_assistance/AiAssistancePanel.ts
var { html: html13 } = Lit10;
var { widget: widget4 } = UI9.Widget;
var AI_ASSISTANCE_SEND_FEEDBACK = "https://crbug.com/364805393";
var AI_ASSISTANCE_HELP = "https://developer.chrome.com/docs/devtools/ai-assistance";
var WALKTHROUGH_SIDEBAR_BREAKPOINT = 700;
var WALKTHROUGH_SIDEBAR_INITIAL_WIDTH = 400;
var UIStrings6 = {
  /**
   * @description AI assistance UI text for creating a new chat.
   */
  newChat: "New chat",
  /**
   * @description AI assistance UI tooltip text for the help button.
   */
  help: "Help",
  /**
   * @description AI assistance UI tooltip text for the settings button (gear icon).
   */
  settings: "Settings",
  /**
   * @description AI assistance UI tooltip for sending feedback.
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
   * @description AI assistance UI text for selecting a history entry.
   */
  history: "History",
  /**
   * @description AI assistance UI text for deleting the current chat session from local history.
   */
  deleteChat: "Delete local chat",
  /**
   * @description AI assistance UI text for deleting all local history entries.
   */
  clearChatHistory: "Clear local chats",
  /**
   * @description AI assistance UI text explaining that the user has no past conversations.
   */
  noPastConversations: "No past conversations",
  /**
   * @description Placeholder text for an inactive text field. When active, it's used for the user's input to AI assistance.
   */
  followTheSteps: "Follow the steps above to ask a question",
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForEmptyState: "This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description The message shown in a toast when the response is copied to the clipboard.
   */
  responseCopiedToClipboard: "Response copied to clipboard"
};
var UIStringsNotTranslate5 = {
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
   * @description Placeholder text for the chat UI input when AIAgent2 is enabled.
   */
  inputPlaceholderForV2: "Ask a question (AIAgent2 enabled)",
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
  inputDisclaimer: "Chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Disclaimer text right after the chat input when enterprise logging is off.
   */
  inputDisclaimerEnterpriseNoLogging: "Chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google. The content submitted to and generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right."
};
var str_6 = i18n17.i18n.registerUIStrings("panels/ai_assistance/AiAssistancePanel.ts", UIStrings6);
var i18nString6 = i18n17.i18n.getLocalizedString.bind(void 0, str_6);
var lockedString6 = i18n17.i18n.lockedString;
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
    case AiAssistanceModel8.AiHistoryStorage.ConversationType.STYLING:
      return [
        { title: "What can you help me with?", jslogContext: "styling-default" },
        { title: "Why isn\u2019t this element visible?", jslogContext: "styling-default" },
        { title: "How do I center this element?", jslogContext: "styling-default" }
      ];
    case AiAssistanceModel8.AiHistoryStorage.ConversationType.FILE:
      return [
        { title: "What does this script do?", jslogContext: "file-default" },
        { title: "Is the script optimized for performance?", jslogContext: "file-default" },
        { title: "Does the script handle user input safely?", jslogContext: "file-default" }
      ];
    case AiAssistanceModel8.AiHistoryStorage.ConversationType.ACCESSIBILITY:
      return [
        { title: "How can I fix accessibility issues on my page?", jslogContext: "accessibility-default" },
        { title: "What accessibility issues exist on my page?", jslogContext: "accessibility-default" }
      ];
    case AiAssistanceModel8.AiHistoryStorage.ConversationType.NETWORK:
      return [
        { title: "Why is this network request taking so long?", jslogContext: "network-default" },
        { title: "Are there any security headers present?", jslogContext: "network-default" },
        { title: "Why is the request failing?", jslogContext: "network-default" }
      ];
    case AiAssistanceModel8.AiHistoryStorage.ConversationType.PERFORMANCE: {
      return [
        { title: "What performance issues exist with my page?", jslogContext: "performance-default" }
      ];
    }
    case AiAssistanceModel8.AiHistoryStorage.ConversationType.NONE: {
      return [
        { title: "What can you help me with?", jslogContext: "empty" },
        { title: "What performance issues exist on the page?", jslogContext: "empty" },
        { title: "What are the slowest network requests on this page?", jslogContext: "empty" }
      ];
    }
    case AiAssistanceModel8.AiHistoryStorage.ConversationType.STORAGE: {
      return [
        { title: "How is localStorage used on this page?", jslogContext: "storage-default" },
        { title: "How is sessionStorage used on this page?", jslogContext: "storage-default" },
        { title: "What cookies are stored for this page?", jslogContext: "storage-default" }
      ];
    }
    default:
      Platform5.assertNever(conversation.type, "Unknown conversation type");
  }
}
function createV2MarkdownRenderer(conversation) {
  const options = {};
  const primaryTarget = SDK6.TargetManager.TargetManager.instance().primaryPageTarget();
  const domModel = primaryTarget?.model(SDK6.DOMModel.DOMModel);
  const resourceTreeModel = primaryTarget?.model(SDK6.ResourceTreeModel.ResourceTreeModel);
  const context = conversation?.selectedContext;
  if (context instanceof AiAssistanceModel8.PerformanceTraceContext.PerformanceTraceContext) {
    const focus = context.getItem();
    options.mainFrameId = focus.parsedTrace.data.Meta.mainFrameId;
    options.lookupTraceEvent = focus.lookupEvent.bind(focus);
  } else {
    if (domModel) {
      options.mainDocumentURL = domModel.existingDocument()?.documentURL;
    }
    if (resourceTreeModel) {
      options.mainFrameId = resourceTreeModel.mainFrame?.id;
    }
  }
  return new AIv2MarkdownRenderer(options);
}
function getMarkdownRenderer(conversation) {
  if (conversation?.type === AiAssistanceModel8.AiHistoryStorage.ConversationType.PERFORMANCE && conversation.isReadOnly) {
    return new PerformanceAgentMarkdownRenderer();
  }
  if (Root4.Runtime.hostConfig.devToolsAiV2Architecture?.enabled && conversation && !conversation.isReadOnly) {
    return createV2MarkdownRenderer(conversation);
  }
  const context = conversation?.selectedContext;
  if (context instanceof AiAssistanceModel8.PerformanceTraceContext.PerformanceTraceContext) {
    const focus = context.getItem();
    return new PerformanceAgentMarkdownRenderer(focus.parsedTrace.data.Meta.mainFrameId, focus.lookupEvent.bind(focus));
  }
  if (conversation?.type === AiAssistanceModel8.AiHistoryStorage.ConversationType.PERFORMANCE) {
    return new PerformanceAgentMarkdownRenderer();
  }
  if (conversation?.type === AiAssistanceModel8.AiHistoryStorage.ConversationType.ACCESSIBILITY) {
    const domModel = SDK6.TargetManager.TargetManager.instance().primaryPageTarget()?.model(SDK6.DOMModel.DOMModel);
    const mainDocumentURL = domModel?.existingDocument()?.documentURL;
    return new AccessibilityAgentMarkdownRenderer(mainDocumentURL);
  }
  return new MarkdownRendererWithCodeBlock();
}
var ViewState = /* @__PURE__ */ ((ViewState2) => {
  ViewState2["DISABLED_VIEW"] = "disabled-view";
  ViewState2["CHAT_VIEW"] = "chat-view";
  ViewState2["EXPLORE_VIEW"] = "explore-view";
  return ViewState2;
})(ViewState || {});
function toolbarView(input) {
  return html13`
    <div class="toolbar-container" role="toolbar" jslog=${VisualLogging8.toolbar()}>
      <devtools-toolbar class="freestyler-left-toolbar" role="presentation">
      ${input.showChatActions ? html13`<devtools-button
          title=${i18nString6(UIStrings6.newChat)}
          aria-label=${i18nString6(UIStrings6.newChat)}
          .iconName=${"plus"}
          .jslogContext=${"freestyler.new-chat"}
          .variant=${Buttons7.Button.Variant.TOOLBAR}
          @click=${input.onNewChatClick}></devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-menu-button
          title=${i18nString6(UIStrings6.history)}
          aria-label=${i18nString6(UIStrings6.history)}
          .iconName=${"history"}
          .jslogContext=${"freestyler.history"}
          .populateMenuCall=${input.populateHistoryMenu}
        ></devtools-menu-button>` : Lit10.nothing}
        ${input.showActiveConversationActions ? html13`
          <devtools-button
              title=${i18nString6(UIStrings6.deleteChat)}
              aria-label=${i18nString6(UIStrings6.deleteChat)}
              .iconName=${"bin"}
              .jslogContext=${"freestyler.delete"}
              .variant=${Buttons7.Button.Variant.TOOLBAR}
              @click=${input.onDeleteClick}>
          </devtools-button>` : Lit10.nothing}
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
          .variant=${Buttons7.Button.Variant.TOOLBAR}
          @click=${input.onHelpClick}></devtools-button>
        <devtools-button
          title=${i18nString6(UIStrings6.settings)}
          aria-label=${i18nString6(UIStrings6.settings)}
          .iconName=${"gear"}
          .jslogContext=${"freestyler.settings"}
          .variant=${Buttons7.Button.Variant.TOOLBAR}
          @click=${input.onSettingsClick}></devtools-button>
      </devtools-toolbar>
    </div>
  `;
}
function defaultView(input, output, target) {
  function renderState() {
    switch (input.state) {
      case "chat-view" /* CHAT_VIEW */: {
        return html13`<devtools-ai-chat-view
          .props=${input.props}
          ${Lit10.Directives.ref((el) => {
          if (!el || !(el instanceof ChatView)) {
            return;
          }
          output.chatView = el;
        })}
        ></devtools-ai-chat-view>`;
      }
      case "explore-view" /* EXPLORE_VIEW */:
        return html13`<devtools-widget class="fill-panel" ${widget4(ExploreWidget)}>
                    </devtools-widget>`;
      case "disabled-view" /* DISABLED_VIEW */:
        return html13`<devtools-widget class="fill-panel" ${widget4(DisabledWidget, input.props)}>
                    </devtools-widget>`;
    }
  }
  const shouldShowWalkthrough = input.state === "chat-view" /* CHAT_VIEW */ && input.props.walkthrough.isExpanded;
  let walkthroughIsForLastMessage = false;
  if (input.state === "chat-view" /* CHAT_VIEW */) {
    const lastMessage = input.props.messages.at(-1);
    if (lastMessage && input.props.walkthrough.activeSidebarMessage?.id === lastMessage.id) {
      walkthroughIsForLastMessage = true;
    }
  }
  Lit10.render(html13`
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
        ${shouldShowWalkthrough ? html13`
          <devtools-widget slot="sidebar" ${widget4(WalkthroughView, {
    message: input.props.walkthrough.activeSidebarMessage,
    isLoading: input.props.isLoading && walkthroughIsForLastMessage,
    markdownRenderer: input.props.markdownRenderer,
    onToggle: input.props.walkthrough.onToggle
  })}></devtools-widget>` : Lit10.nothing}
      </devtools-split-view>
    </div>
  `, target);
}
function createDOMNodeContext(node) {
  if (!node) {
    return null;
  }
  return new AiAssistanceModel8.DOMNodeContext.DOMNodeContext(node);
}
function createFileContext(file) {
  if (!file) {
    return null;
  }
  return new AiAssistanceModel8.FileContext.FileContext(file);
}
function createAccessibilityContext(report) {
  if (!report) {
    return null;
  }
  return new AiAssistanceModel8.AccessibilityContext.AccessibilityContext(report.report);
}
function createRequestContext(request) {
  if (!request) {
    return null;
  }
  const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
  return new AiAssistanceModel8.RequestContext.RequestContext(request, calculator);
}
function createPerformanceTraceContext(focus) {
  if (!focus) {
    return null;
  }
  return new AiAssistanceModel8.PerformanceTraceContext.PerformanceTraceContext(focus);
}
function createStorageContext(item) {
  if (!item) {
    return null;
  }
  return new AiAssistanceModel8.StorageContext.StorageContext(item);
}
var panelInstance;
var AiAssistancePanel = class _AiAssistancePanel extends UI9.Panel.Panel {
  constructor(view = defaultView, { aidaClient, aidaAvailability }) {
    super(_AiAssistancePanel.panelName);
    this.view = view;
    this.registerRequiredCSS(aiAssistancePanel_css_default);
    this.#aiAssistanceEnabledSetting = this.#getAiAssistanceEnabledSetting();
    this.#aidaClient = aidaClient;
    this.#aidaAvailability = aidaAvailability;
    if (UI9.ActionRegistry.ActionRegistry.instance().hasAction("elements.toggle-element-search")) {
      this.#toggleSearchElementAction = UI9.ActionRegistry.ActionRegistry.instance().getAction("elements.toggle-element-search");
    }
  }
  static panelName = "freestyler";
  // NodeJS debugging does not have Elements panel, thus this action might not exist.
  #toggleSearchElementAction;
  #aidaClient;
  #conversationSummary;
  #viewOutput = {};
  #serverSideLoggingEnabled = isAiAssistanceServerSideLoggingEnabled();
  #aiAssistanceEnabledSetting;
  #changeManager = new AiAssistanceModel8.ChangeManager.ChangeManager();
  #mutex = new Common5.Mutex.Mutex();
  #conversation;
  #selectedFile = null;
  #selectedElement = null;
  #selectedPerformanceTrace = null;
  #selectedRequest = null;
  #selectedAccessibility = null;
  #selectedStorage = null;
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
  #textInputValue = "";
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
      }
    };
  }
  async #getPanelViewInput() {
    const blockedByAge = Root4.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    if (this.#aidaAvailability !== Host5.AidaClient.AidaAccessPreconditions.AVAILABLE || !this.#aiAssistanceEnabledSetting?.getIfNotDisabled() || blockedByAge) {
      return {
        state: "disabled-view" /* DISABLED_VIEW */,
        props: {
          aidaAvailability: this.#aidaAvailability
        }
      };
    }
    if (this.#conversation) {
      const emptyStateSuggestions = await getEmptyStateSuggestions(this.#conversation);
      const markdownRenderer = getMarkdownRenderer(this.#conversation);
      let onContextAdd = null;
      if (AiAssistanceModel8.AiUtils.isContextSelectionEnabled() && // Only add it the button if can have anything already selected
      this.#getConversationContext(this.#getDefaultConversationType())) {
        onContextAdd = this.#handleContextAdd.bind(this);
      }
      return {
        state: "chat-view" /* CHAT_VIEW */,
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
          inspectElementToggled: this.#toggleSearchElementAction?.toggled() ?? false,
          canShowFeedbackForm: this.#serverSideLoggingEnabled,
          multimodalInputEnabled: isAiAssistanceMultimodalInputEnabled() && this.#conversation.type === AiAssistanceModel8.AiHistoryStorage.ConversationType.STYLING,
          isTextInputDisabled: this.#isTextInputDisabled(),
          emptyStateSuggestions,
          inputPlaceholder: this.#getChatInputPlaceholder(),
          disclaimerText: this.#getDisclaimerText(),
          textInputValue: this.#textInputValue,
          onTextChange: (text) => {
            this.#textInputValue = text;
          },
          onExportConversation: this.#onExportConversationClick.bind(this),
          uploadImageInputEnabled: isAiAssistanceMultimodalUploadInputEnabled() && this.#conversation.type === AiAssistanceModel8.AiHistoryStorage.ConversationType.STYLING,
          markdownRenderer,
          conversationMarkdown: this.#conversation.getConversationMarkdown(),
          generateConversationSummary: async (markdown) => {
            if (!this.#conversationSummary) {
              this.#conversationSummary = new AiAssistanceModel8.ConversationSummary.ConversationSummary({
                aidaClient: this.#aidaClient,
                serverSideLoggingEnabled: this.#serverSideLoggingEnabled
              });
            }
            return await this.#conversationSummary.summarizeConversation(markdown);
          },
          onTextSubmit: async (text, imageInput, multimodalInputType) => {
            const submit = () => {
              Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceQuerySubmitted);
              void this.#startConversation(text, imageInput, multimodalInputType);
            };
            const seenSetting = Common5.Settings.Settings.instance().resolve(
              AiAssistanceModel8.AiUtils.aiAssistanceV2OptInChangeDialogSeenSettingDescriptor
            );
            if (!seenSetting.get()) {
              OptInChangeDialog.show({
                onGotIt: () => {
                  seenSetting.set(true);
                  submit();
                },
                onManageSettings: () => {
                  seenSetting.set(true);
                  this.#viewOutput.chatView?.setInputValue(text);
                  void UI9.ViewManager.ViewManager.instance().showView("chrome-ai");
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
          onContextRemoved: AiAssistanceModel8.AiUtils.isContextSelectionEnabled() ? this.#handleContextRemoved.bind(this) : null,
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
      state: "explore-view" /* EXPLORE_VIEW */
    };
  }
  // Responsive logic for Walkthrough
  onResize() {
    super.onResize();
    this.#updateWalkthroughResponsiveness();
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
    if (!this.#walkthrough.inlineExpandedMessages.some((m) => m.id === message.id)) {
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
    this.#walkthrough.inlineExpandedMessages = this.#walkthrough.inlineExpandedMessages.filter((m) => m.id !== message.id);
    if (this.#walkthrough.isInlined) {
      this.#walkthrough.isExpanded = this.#walkthrough.inlineExpandedMessages.length > 0;
      if (this.#walkthrough.activeSidebarMessage?.id === message.id) {
        this.#walkthrough.activeSidebarMessage = this.#walkthrough.inlineExpandedMessages.at(-1) ?? null;
      }
    } else {
      this.#walkthrough.isExpanded = false;
      this.#walkthrough.activeSidebarMessage = null;
    }
    this.requestUpdate();
  }
  #getAiAssistanceEnabledSetting() {
    return new AiAssistanceModel8.AiSetting.AiSetting(
      AiAssistanceModel8.AiUtils.aiAssistanceEnabledSettingDescriptor,
      Host5.AidaClient.HostConfigTracker.instance(),
      Common5.Settings.Settings.instance()
    );
  }
  static async instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!panelInstance || forceNew) {
      const aidaClient = new Host5.AidaClient.AidaClient();
      const aidaAvailability = Host5.AidaClient.HostConfigTracker.instance().aidaAvailability ?? await Host5.AidaClient.AidaClient.checkAccessPreconditions();
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
    const timelinePanel = UI9.Context.Context.instance().flavor(TimelinePanel2.TimelinePanel.TimelinePanel);
    if (timelinePanel === this.#timelinePanelInstance) {
      return;
    }
    this.#timelinePanelInstance?.removeEventListener(
      TimelinePanel2.TimelinePanel.Events.IS_VIEWING_TRACE,
      this.requestUpdate,
      this
    );
    this.#timelinePanelInstance = timelinePanel;
    if (this.#timelinePanelInstance) {
      this.#timelinePanelInstance.addEventListener(
        TimelinePanel2.TimelinePanel.Events.IS_VIEWING_TRACE,
        this.requestUpdate,
        this
      );
    }
  }
  async #handlePerformanceRecordAndReload() {
    return await TimelinePanel2.TimelinePanel.TimelinePanel.executeRecordAndReload();
  }
  async #handleLighthouseRun(overrides) {
    return await LighthousePanel2.LighthousePanel.LighthousePanel.executeLighthouseRecording({
      isAIControlled: true,
      ...overrides
    });
  }
  #getDefaultConversationType() {
    const { hostConfig } = Root4.Runtime;
    const viewManager = UI9.ViewManager.ViewManager.instance();
    const isElementsPanelVisible = viewManager.isViewVisible("elements");
    const isNetworkPanelVisible = viewManager.isViewVisible("network");
    const isSourcesPanelVisible = viewManager.isViewVisible("sources");
    const isPerformancePanelVisible = viewManager.isViewVisible("timeline");
    const isLighthousePanelVisible = viewManager.isViewVisible("lighthouse");
    const isApplicationPanelVisible = viewManager.isViewVisible("resources");
    let targetConversationType;
    if (isElementsPanelVisible && hostConfig.devToolsFreestyler?.enabled) {
      targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.STYLING;
    } else if (isNetworkPanelVisible && hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
      targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.NETWORK;
    } else if (isSourcesPanelVisible && hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
      targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.FILE;
    } else if (isPerformancePanelVisible && hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
      targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.PERFORMANCE;
    } else if (isLighthousePanelVisible && hostConfig.devToolsAiAssistanceAccessibilityAgent?.enabled) {
      targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.ACCESSIBILITY;
    } else if (isApplicationPanelVisible && hostConfig.devToolsAiAssistanceStorageAgent?.enabled) {
      targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.STORAGE;
    }
    if (AiAssistanceModel8.AiUtils.isContextSelectionEnabled() && !targetConversationType) {
      return AiAssistanceModel8.AiHistoryStorage.ConversationType.NONE;
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
    const conversation = targetConversationType ? new AiAssistanceModel8.AiConversation.AiConversation({
      type: targetConversationType,
      data: [],
      isReadOnly: false,
      aidaClient: this.#aidaClient,
      changeManager: this.#changeManager,
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
          conversation = new AiAssistanceModel8.AiConversation.AiConversation({
            type: conversationType,
            data: [],
            isReadOnly: false,
            aidaClient: this.#aidaClient,
            changeManager: this.#changeManager,
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
      if (this.#conversation.isEmpty && AiAssistanceModel8.AiUtils.isContextSelectionEnabled()) {
        const context = this.#getConversationContext(this.#getDefaultConversationType());
        this.#conversation.setContext(context);
      } else {
        const context = this.#getConversationContext(this.#conversation.type);
        if (context || !AiAssistanceModel8.AiUtils.isContextSelectionEnabled()) {
          this.#conversation.setContext(context);
        }
      }
    }
    this.requestUpdate();
  }
  wasShown() {
    super.wasShown();
    this.#viewOutput.chatView?.restoreScrollPosition();
    this.#viewOutput.chatView?.focusTextInput();
    this.#selectedElement = createDOMNodeContext(selectedElementFilter(UI9.Context.Context.instance().flavor(SDK6.DOMModel.DOMNode)));
    this.#selectedRequest = createRequestContext(UI9.Context.Context.instance().flavor(SDK6.NetworkRequest.NetworkRequest));
    this.#selectedPerformanceTrace = createPerformanceTraceContext(UI9.Context.Context.instance().flavor(AiAssistanceModel8.AIContext.AgentFocus));
    this.#selectedFile = createFileContext(UI9.Context.Context.instance().flavor(Workspace4.UISourceCode.UISourceCode));
    this.#selectedAccessibility = createAccessibilityContext(
      UI9.Context.Context.instance().flavor(LighthousePanel2.LighthousePanel.ActiveLighthouseReport)
    );
    this.#selectedStorage = createStorageContext(UI9.Context.Context.instance().flavor(AiAssistanceModel8.StorageItem.StorageItem));
    this.#updateConversationState(this.#conversation);
    AiAssistanceModel8.AiHistoryStorage.AiHistoryStorage.instance().addEventListener(
      AiAssistanceModel8.AiHistoryStorage.Events.HISTORY_DELETED,
      this.#onHistoryDeleted,
      this
    );
    this.#aiAssistanceEnabledSetting.addEventListener(
      AiAssistanceModel8.AiSetting.Events.CHANGED,
      this.requestUpdate,
      this
    );
    Host5.AidaClient.HostConfigTracker.instance().addEventListener(
      Host5.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
      this.#handleAidaAvailabilityChange
    );
    const initialAvailability = Host5.AidaClient.HostConfigTracker.instance().aidaAvailability;
    if (initialAvailability !== void 0) {
      this.#updateAidaAvailability(initialAvailability);
    }
    this.#toggleSearchElementAction?.addEventListener(UI9.ActionRegistration.Events.TOGGLED, this.requestUpdate, this);
    UI9.Context.Context.instance().addFlavorChangeListener(SDK6.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI9.Context.Context.instance().addFlavorChangeListener(
      SDK6.NetworkRequest.NetworkRequest,
      this.#handleNetworkRequestFlavorChange
    );
    UI9.Context.Context.instance().addFlavorChangeListener(
      AiAssistanceModel8.AIContext.AgentFocus,
      this.#handlePerformanceTraceFlavorChange
    );
    UI9.Context.Context.instance().addFlavorChangeListener(
      AiAssistanceModel8.StorageItem.StorageItem,
      this.#handleStorageItemFlavorChange
    );
    UI9.Context.Context.instance().addFlavorChangeListener(
      Workspace4.UISourceCode.UISourceCode,
      this.#handleUISourceCodeFlavorChange
    );
    UI9.Context.Context.instance().addFlavorChangeListener(
      LighthousePanel2.LighthousePanel.ActiveLighthouseReport,
      this.#handleLighthouseReportFlavorChange
    );
    UI9.ViewManager.ViewManager.instance().addEventListener(
      UI9.ViewManager.Events.VIEW_VISIBILITY_CHANGED,
      this.#selectDefaultAgentIfNeeded,
      this
    );
    SDK6.TargetManager.TargetManager.instance().addModelListener(
      SDK6.DOMModel.DOMModel,
      SDK6.DOMModel.Events.AttrModified,
      this.#handleDOMNodeAttrChange,
      this
    );
    SDK6.TargetManager.TargetManager.instance().addModelListener(
      SDK6.DOMModel.DOMModel,
      SDK6.DOMModel.Events.AttrRemoved,
      this.#handleDOMNodeAttrChange,
      this
    );
    UI9.Context.Context.instance().addFlavorChangeListener(
      TimelinePanel2.TimelinePanel.TimelinePanel,
      this.#bindTimelineTraceListener,
      this
    );
    this.#bindTimelineTraceListener();
    this.#selectDefaultAgentIfNeeded();
    Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistancePanelOpened);
  }
  willHide() {
    super.willHide();
    AiAssistanceModel8.AiHistoryStorage.AiHistoryStorage.instance().removeEventListener(
      AiAssistanceModel8.AiHistoryStorage.Events.HISTORY_DELETED,
      this.#onHistoryDeleted,
      this
    );
    this.#aiAssistanceEnabledSetting.removeEventListener(
      AiAssistanceModel8.AiSetting.Events.CHANGED,
      this.requestUpdate,
      this
    );
    Host5.AidaClient.HostConfigTracker.instance().removeEventListener(
      Host5.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
      this.#handleAidaAvailabilityChange
    );
    this.#toggleSearchElementAction?.removeEventListener(
      UI9.ActionRegistration.Events.TOGGLED,
      this.requestUpdate,
      this
    );
    UI9.Context.Context.instance().removeFlavorChangeListener(SDK6.DOMModel.DOMNode, this.#handleDOMNodeFlavorChange);
    UI9.Context.Context.instance().removeFlavorChangeListener(
      SDK6.NetworkRequest.NetworkRequest,
      this.#handleNetworkRequestFlavorChange
    );
    UI9.Context.Context.instance().removeFlavorChangeListener(
      AiAssistanceModel8.AIContext.AgentFocus,
      this.#handlePerformanceTraceFlavorChange
    );
    UI9.Context.Context.instance().removeFlavorChangeListener(
      AiAssistanceModel8.StorageItem.StorageItem,
      this.#handleStorageItemFlavorChange
    );
    UI9.Context.Context.instance().removeFlavorChangeListener(
      Workspace4.UISourceCode.UISourceCode,
      this.#handleUISourceCodeFlavorChange
    );
    UI9.Context.Context.instance().removeFlavorChangeListener(
      LighthousePanel2.LighthousePanel.ActiveLighthouseReport,
      this.#handleLighthouseReportFlavorChange
    );
    UI9.ViewManager.ViewManager.instance().removeEventListener(
      UI9.ViewManager.Events.VIEW_VISIBILITY_CHANGED,
      this.#selectDefaultAgentIfNeeded,
      this
    );
    UI9.Context.Context.instance().removeFlavorChangeListener(
      TimelinePanel2.TimelinePanel.TimelinePanel,
      this.#bindTimelineTraceListener,
      this
    );
    SDK6.TargetManager.TargetManager.instance().removeModelListener(
      SDK6.DOMModel.DOMModel,
      SDK6.DOMModel.Events.AttrModified,
      this.#handleDOMNodeAttrChange,
      this
    );
    SDK6.TargetManager.TargetManager.instance().removeModelListener(
      SDK6.DOMModel.DOMModel,
      SDK6.DOMModel.Events.AttrRemoved,
      this.#handleDOMNodeAttrChange,
      this
    );
    if (this.#timelinePanelInstance) {
      this.#timelinePanelInstance.removeEventListener(
        TimelinePanel2.TimelinePanel.Events.IS_VIEWING_TRACE,
        this.requestUpdate,
        this
      );
      this.#timelinePanelInstance = null;
    }
  }
  #updateAidaAvailability(aidaAvailability) {
    if (aidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = aidaAvailability;
      this.requestUpdate();
    }
  }
  #handleAidaAvailabilityChange = (ev) => {
    this.#updateAidaAvailability(ev.data);
  };
  #handleDOMNodeFlavorChange = (ev) => {
    if (this.#selectedElement?.getItem() === ev.data) {
      return;
    }
    this.#selectedElement = createDOMNodeContext(selectedElementFilter(ev.data));
    this.#updateConversationState(this.#conversation);
  };
  #handleStorageItemFlavorChange = (ev) => {
    if (this.#selectedStorage?.getItem() === ev.data) {
      return;
    }
    this.#selectedStorage = createStorageContext(ev.data);
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
    if (ev.data) {
      const calculator = NetworkPanel.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
      this.#selectedRequest = new AiAssistanceModel8.RequestContext.RequestContext(ev.data, calculator);
    } else {
      this.#selectedRequest = null;
    }
    this.#updateConversationState(this.#conversation);
  };
  #handlePerformanceTraceFlavorChange = (ev) => {
    if (this.#selectedPerformanceTrace?.getItem() === ev.data) {
      return;
    }
    this.#selectedPerformanceTrace = Boolean(ev.data) ? new AiAssistanceModel8.PerformanceTraceContext.PerformanceTraceContext(ev.data) : null;
    this.#updateConversationState(this.#conversation);
  };
  #handleUISourceCodeFlavorChange = (ev) => {
    const newFile = ev.data;
    if (!newFile || this.#selectedFile?.getItem() === newFile) {
      return;
    }
    this.#selectedFile = new AiAssistanceModel8.FileContext.FileContext(ev.data);
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
      Host5.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(markdown);
      Snackbars4.Snackbar.Snackbar.show({
        message: i18nString6(UIStrings6.responseCopiedToClipboard)
      });
    }
  }
  #handleSelectElementClick() {
    UI9.Context.Context.instance().setFlavor(
      Common5.ReturnToPanel.ReturnToPanelFlavor,
      new Common5.ReturnToPanel.ReturnToPanelFlavor(this.panelName)
    );
    void this.#toggleSearchElementAction?.execute();
  }
  #isTextInputDisabled() {
    if (this.#conversation && this.#conversation.isBlockedByOrigin) {
      return true;
    }
    if (!this.#conversation) {
      return true;
    }
    if (!this.#conversation.selectedContext && !AiAssistanceModel8.AiUtils.isContextSelectionEnabled()) {
      return true;
    }
    return false;
  }
  #shouldShowChatActions() {
    const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
    const isBlockedByAge = Root4.Runtime.hostConfig.aidaAvailability?.blockedByAge === true;
    if (!aiAssistanceSetting || isBlockedByAge) {
      return false;
    }
    if (this.#aidaAvailability === Host5.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL || this.#aidaAvailability === Host5.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED) {
      return false;
    }
    return true;
  }
  #getChatInputPlaceholder() {
    if (!this.#conversation) {
      return i18nString6(UIStrings6.followTheSteps);
    }
    if (this.#conversation && this.#conversation.isBlockedByOrigin) {
      return lockedString6(UIStringsNotTranslate5.crossOriginError);
    }
    if (Root4.Runtime.hostConfig.devToolsAiV2Architecture?.enabled) {
      return lockedString6(UIStringsNotTranslate5.inputPlaceholderForV2);
    }
    switch (this.#conversation.type) {
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.STYLING:
        return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate5.inputPlaceholderForStyling) : lockedString6(UIStringsNotTranslate5.inputPlaceholderForStylingNoContext);
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.FILE:
        return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate5.inputPlaceholderForFile) : lockedString6(UIStringsNotTranslate5.inputPlaceholderForFileNoContext);
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.NETWORK:
        return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate5.inputPlaceholderForNetwork) : lockedString6(UIStringsNotTranslate5.inputPlaceholderForNetworkNoContext);
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.PERFORMANCE: {
        const perfPanel = UI9.Context.Context.instance().flavor(TimelinePanel2.TimelinePanel.TimelinePanel);
        if (perfPanel?.hasActiveTrace()) {
          return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate5.inputPlaceholderForPerformanceTrace) : lockedString6(UIStringsNotTranslate5.inputPlaceholderForPerformanceTraceNoContext);
        }
        return lockedString6(UIStringsNotTranslate5.inputPlaceholderForPerformanceWithNoRecording);
      }
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.ACCESSIBILITY:
        return this.#conversation.selectedContext ? lockedString6(UIStringsNotTranslate5.inputPlaceholderForAccessibility) : lockedString6(UIStringsNotTranslate5.inputPlaceholderForAccessibilityNoContext);
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.STORAGE:
        return lockedString6(UIStringsNotTranslate5.inputPlaceholderForNoContext);
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.NONE:
        if (AiAssistanceModel8.AiUtils.isGeminiBranding()) {
          return lockedString6(UIStringsNotTranslate5.inputPlaceholderForNoContextBranded);
        }
        return lockedString6(UIStringsNotTranslate5.inputPlaceholderForNoContext);
    }
  }
  #getDisclaimerText() {
    if (!this.#conversation || this.#conversation.isReadOnly) {
      return i18nString6(UIStrings6.inputDisclaimerForEmptyState);
    }
    const loggingEnabled = Root4.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue !== Root4.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    if (loggingEnabled) {
      return lockedString6(UIStringsNotTranslate5.inputDisclaimer);
    }
    return lockedString6(UIStringsNotTranslate5.inputDisclaimerEnterpriseNoLogging);
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
    if (context instanceof AiAssistanceModel8.RequestContext.RequestContext) {
      const requestLocation = NetworkForward2.UIRequestLocation.UIRequestLocation.tab(
        context.getItem(),
        NetworkForward2.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT
      );
      return Common5.Revealer.reveal(requestLocation);
    }
    if (context instanceof AiAssistanceModel8.FileContext.FileContext) {
      return Common5.Revealer.reveal(context.getItem().uiLocation(0, 0));
    }
    if (context instanceof AiAssistanceModel8.PerformanceTraceContext.PerformanceTraceContext) {
      const focus = context.getItem();
      if (focus.callTree) {
        const event = focus.callTree.selectedNode?.event ?? focus.callTree.rootNode.event;
        const revealable = new SDK6.TraceObject.RevealableEvent(event);
        return Common5.Revealer.reveal(revealable);
      }
      if (focus.insight) {
        return Common5.Revealer.reveal(focus.insight);
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
    const isBrandedBuild = Boolean(Root4.Runtime.hostConfig.aidaAvailability?.enabled);
    const isBlockedByAge = Boolean(Root4.Runtime.hostConfig.aidaAvailability?.blockedByAge);
    const isAidaAvailable = Boolean(this.#aidaAvailability === Host5.AidaClient.AidaAccessPreconditions.AVAILABLE);
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
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromElementsPanelFloatingButton);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.STYLING;
        break;
      }
      case "freestyler.element-panel-context": {
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromElementsPanel);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.STYLING;
        break;
      }
      case "drjones.network-floating-button": {
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanelFloatingButton);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.NETWORK;
        break;
      }
      case "drjones.network-panel-context": {
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanel);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.NETWORK;
        break;
      }
      case "drjones.performance-panel-context": {
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromPerformancePanelCallTree);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.PERFORMANCE;
        break;
      }
      case "drjones.sources-floating-button": {
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanelFloatingButton);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.FILE;
        break;
      }
      case "drjones.sources-panel-context": {
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanel);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.FILE;
        break;
      }
      case "ai-assistance.storage-floating-button": {
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromApplicationPanelFloatingButton);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.STORAGE;
        break;
      }
      case "ai-assistance.application-panel-context": {
        Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceOpenedFromApplicationPanel);
        targetConversationType = AiAssistanceModel8.AiHistoryStorage.ConversationType.STORAGE;
        break;
      }
    }
    if (!targetConversationType) {
      return;
    }
    let conversation = this.#conversation;
    if (!this.#conversation || this.#conversation.type !== targetConversationType || this.#conversation.isEmpty) {
      conversation = new AiAssistanceModel8.AiConversation.AiConversation({
        type: targetConversationType,
        data: [],
        isReadOnly: false,
        aidaClient: this.#aidaClient,
        changeManager: this.#changeManager,
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
      Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.AiAssistanceQuerySubmitted);
      if (this.#conversation && this.#conversation.isBlockedByOrigin) {
        this.#handleNewChatRequest();
      }
      await this.#startConversation(predefinedPrompt);
    } else {
      this.#viewOutput.chatView?.focusTextInput();
    }
  }
  #populateHistoryMenu(contextMenu) {
    const history = AiAssistanceModel8.AiHistoryStorage.AiHistoryStorage.instance().getHistory();
    const activeId = this.#conversation?.id;
    for (const serialized of [...history].reverse()) {
      const isConversationEmpty = serialized.history.length === 0;
      if (isConversationEmpty) {
        continue;
      }
      const title = AiAssistanceModel8.AiConversation.AiConversation.titleForSerialized(serialized);
      if (!title) {
        continue;
      }
      contextMenu.defaultSection().appendCheckboxItem(title, () => {
        const conversation = AiAssistanceModel8.AiConversation.AiConversation.fromSerializedConversation(serialized);
        void this.#openHistoricConversation(conversation);
      }, { checked: activeId === serialized.id, jslogContext: "freestyler.history-item" });
    }
    const historyEmpty = contextMenu.defaultSection().items.length === 0;
    if (historyEmpty) {
      contextMenu.defaultSection().appendItem(i18nString6(UIStrings6.noPastConversations), () => {
      }, {
        disabled: true
      });
    }
    contextMenu.footerSection().appendItem(
      i18nString6(UIStrings6.clearChatHistory),
      () => {
        void AiAssistanceModel8.AiHistoryStorage.AiHistoryStorage.instance().deleteAll();
      },
      {
        disabled: historyEmpty
      }
    );
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
    void AiAssistanceModel8.AiHistoryStorage.AiHistoryStorage.instance().deleteHistoryEntry(this.#conversation.id);
    this.#updateConversationState();
    UI9.ARIAUtils.LiveAnnouncer.alert(i18nString6(UIStrings6.chatDeleted));
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
    this.#textInputValue = "";
    this.#updateConversationState();
    this.#resetWalkthrough();
    UI9.ARIAUtils.LiveAnnouncer.alert(i18nString6(UIStrings6.newChatCreated));
  }
  #cancel() {
    this.#runAbortController.abort();
    this.#runAbortController = new AbortController();
  }
  #getConversationContext(type) {
    switch (type) {
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.STYLING:
        return this.#selectedElement;
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.FILE:
        return this.#selectedFile;
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.NETWORK:
        return this.#selectedRequest;
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.PERFORMANCE:
        return this.#selectedPerformanceTrace;
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.ACCESSIBILITY:
        return this.#selectedAccessibility;
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.STORAGE:
        return this.#selectedStorage;
      case AiAssistanceModel8.AiHistoryStorage.ConversationType.NONE:
      case void 0:
        return null;
    }
  }
  #handleConversationContextChange = (data) => {
    if (data instanceof AiAssistanceModel8.FileContext.FileContext) {
      this.#selectedFile = data;
    } else if (data instanceof AiAssistanceModel8.DOMNodeContext.DOMNodeContext) {
      this.#selectedElement = data;
    } else if (data instanceof AiAssistanceModel8.RequestContext.RequestContext) {
      this.#selectedRequest = data;
    } else if (data instanceof AiAssistanceModel8.PerformanceTraceContext.PerformanceTraceContext) {
      this.#selectedPerformanceTrace = data;
    } else if (data instanceof AiAssistanceModel8.AccessibilityContext.AccessibilityContext) {
      this.#selectedAccessibility = data;
    } else if (data instanceof AiAssistanceModel8.StorageContext.StorageContext) {
      this.#selectedStorage = data;
    }
    void VisualLogging8.logFunctionCall(`context-change-${this.#conversation?.type}`);
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
            resolve(selectedElementFilter(UI9.Context.Context.instance().flavor(SDK6.DOMModel.DOMNode)));
            removeListeners();
          }, 50);
        }
      };
      const handleAbort = () => {
        resolve(null);
        removeListeners();
      };
      const removeListeners = () => {
        UI9.Context.Context.instance().removeFlavorChangeListener(SDK6.DOMModel.DOMNode, handleDOMNodeFlavorChange);
        this.#toggleSearchElementAction?.removeEventListener(
          UI9.ActionRegistration.Events.TOGGLED,
          handleInspectModeToggled
        );
        this.#runAbortController.signal.removeEventListener("abort", handleAbort);
      };
      UI9.Context.Context.instance().addFlavorChangeListener(SDK6.DOMModel.DOMNode, handleDOMNodeFlavorChange);
      this.#toggleSearchElementAction?.addEventListener(UI9.ActionRegistration.Events.TOGGLED, handleInspectModeToggled);
      this.#runAbortController.signal.addEventListener("abort", handleAbort, { once: true });
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
    let multimodalInput;
    if (isAiAssistanceMultimodalInputEnabled() && imageInput && multimodalInputType) {
      multimodalInput = {
        input: imageInput,
        id: crypto.randomUUID(),
        type: multimodalInputType
      };
    }
    void VisualLogging8.logFunctionCall(`start-conversation-${this.#conversation.type}`, "ui");
    await this.#doConversation(
      this.#conversation.run(
        text,
        {
          signal,
          multimodalInput
        }
      )
    );
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
        entity: "model" /* MODEL */,
        parts: [],
        id: crypto.randomUUID()
      };
      let step = { state: { type: "in_progress" } };
      this.#isLoading = true;
      let announcedAnswerLoading = false;
      let announcedAnswerReady = false;
      for await (const data of items) {
        switch (data.type) {
          case AiAssistanceModel8.AiAgent.ResponseType.USER_QUERY: {
            this.#messages.push({
              entity: "user" /* USER */,
              text: data.query,
              imageInput: data.imageInput,
              id: crypto.randomUUID()
            });
            systemMessage = {
              entity: "model" /* MODEL */,
              parts: [],
              id: crypto.randomUUID()
            };
            this.#messages.push(systemMessage);
            const isSidebarWalkthroughOpen = this.#walkthrough.isExpanded && !this.#walkthrough.isInlined;
            if (isSidebarWalkthroughOpen) {
              this.#openWalkthrough(systemMessage);
            }
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.QUERYING: {
            step = { state: { type: "in_progress" } };
            if (!systemMessage.parts.length) {
              commitStep();
            }
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.CONTEXT: {
            step.title = lockedString6(UIStringsNotTranslate5.analyzingData);
            step.contextDetails = data.details;
            step.widgets = data.widgets;
            step.state = { type: "completed" };
            commitStep();
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.TITLE: {
            step.title = data.title;
            commitStep();
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.THOUGHT: {
            step.state = { type: "completed" };
            step.thought = data.thought;
            commitStep();
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.SUGGESTIONS: {
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
          case AiAssistanceModel8.AiAgent.ResponseType.SIDE_EFFECT: {
            step.code ??= data.code;
            step.state = {
              type: "needs_approval",
              sideEffectDialog: {
                description: data.description,
                onAnswer: (result) => {
                  data.confirm(result);
                  step.state = { type: "completed" };
                  this.requestUpdate();
                }
              }
            };
            commitStep();
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.ACTION: {
            step.state = data.canceled ? { type: "canceled" } : { type: "completed" };
            step.code ??= data.code;
            step.output ??= data.output;
            step.widgets ??= data.widgets;
            commitStep();
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.ANSWER: {
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
            if (data.widgets) {
              systemMessage.parts.push({
                type: "widget",
                widgets: data.widgets
              });
            }
            if (systemMessage.parts.length > 1) {
              const firstPart = systemMessage.parts[0];
              if (firstPart.type === "step" && firstPart.step.state.type === "in_progress" && !firstPart.step.thought && !firstPart.step.code && !firstPart.step.contextDetails) {
                systemMessage.parts.shift();
              }
            }
            step.state = { type: "completed" };
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.ERROR: {
            systemMessage.error = data.error;
            const lastPart = systemMessage.parts.at(-1);
            if (lastPart?.type === "step") {
              const lastStep = lastPart.step;
              if (data.error === AiAssistanceModel8.AiAgent.ErrorType.ABORT) {
                lastStep.state = { type: "canceled" };
              } else if (lastStep.state.type === "in_progress") {
                systemMessage.parts.pop();
              }
            }
            if (data.error === AiAssistanceModel8.AiAgent.ErrorType.BLOCK) {
              const lastPart2 = systemMessage.parts.at(-1);
              if (lastPart2?.type === "answer") {
                systemMessage.parts.pop();
              }
            }
            break;
          }
          case AiAssistanceModel8.AiAgent.ResponseType.CONTEXT_CHANGE: {
            this.#handleConversationContextChange(data.context);
            step.state = { type: "completed" };
            step.widgets = data.widgets;
            commitStep();
            step = { state: { type: "in_progress" } };
            break;
          }
        }
        if (!this.#conversation?.isReadOnly) {
          this.requestUpdate();
          if (data.type === AiAssistanceModel8.AiAgent.ResponseType.CONTEXT || data.type === AiAssistanceModel8.AiAgent.ResponseType.SIDE_EFFECT) {
            this.#viewOutput.chatView?.scrollToBottom();
          }
          switch (data.type) {
            case AiAssistanceModel8.AiAgent.ResponseType.CONTEXT:
              UI9.ARIAUtils.LiveAnnouncer.status(lockedString6(UIStringsNotTranslate5.analyzingData));
              break;
            case AiAssistanceModel8.AiAgent.ResponseType.ANSWER: {
              if (!data.complete && !announcedAnswerLoading) {
                announcedAnswerLoading = true;
                UI9.ARIAUtils.LiveAnnouncer.status(lockedString6(UIStringsNotTranslate5.answerLoading));
              } else if (data.complete && !announcedAnswerReady) {
                announcedAnswerReady = true;
                UI9.ARIAUtils.LiveAnnouncer.status(lockedString6(UIStringsNotTranslate5.answerReady));
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
        contentParts.push(AiAssistanceModel8.AiConversation.generateContextDetailsMarkdown(step.contextDetails));
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
      case "drjones.sources-panel-context":
      case "ai-assistance.storage-floating-button":
      case "ai-assistance.application-panel-context": {
        void (async () => {
          const view = UI9.ViewManager.ViewManager.instance().view(
            AiAssistancePanel.panelName
          );
          if (!view) {
            return;
          }
          await UI9.ViewManager.ViewManager.instance().showView(
            AiAssistancePanel.panelName
          );
          const minDrawerSize = UI9.InspectorView.InspectorView.instance().totalSize() / 4;
          if (UI9.InspectorView.InspectorView.instance().drawerSize() < minDrawerSize) {
            UI9.InspectorView.InspectorView.instance().setDrawerSize(minDrawerSize);
          }
          const widget5 = await view.widget();
          void widget5.handleAction(actionId, opts);
        })();
        return true;
      }
    }
    return false;
  }
};
function isAiAssistanceMultimodalUploadInputEnabled() {
  return isAiAssistanceMultimodalInputEnabled() && Boolean(Root4.Runtime.hostConfig.devToolsFreestyler?.multimodalUploadInput);
}
function isAiAssistanceMultimodalInputEnabled() {
  return Boolean(Root4.Runtime.hostConfig.devToolsFreestyler?.multimodal);
}
function isAiAssistanceServerSideLoggingEnabled() {
  return !Root4.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}

// ../../front_end/panels/ai_assistance/ExternalHandler.ts
var ExternalHandler_exports = {};
__export(ExternalHandler_exports, {
  getMatchingFlavorContext: () => getMatchingFlavorContext,
  handleExternalAIRequest: () => handleExternalAIRequest
});
import * as Host6 from "../../core/host/host.js";
import * as SDK7 from "../../core/sdk/sdk.js";
import * as AiAssistanceModel9 from "../../models/ai_assistance/ai_assistance.js";
import * as NetworkTimeCalculator from "../../models/network_time_calculator/network_time_calculator.js";
import * as UI10 from "../../ui/legacy/legacy.js";
function resolveConversationType(contextType) {
  switch (contextType) {
    case "NETWORK_REQUEST":
      return AiAssistanceModel9.AiHistoryStorage.ConversationType.NETWORK;
    default:
      return AiAssistanceModel9.AiHistoryStorage.ConversationType.NONE;
  }
}
function getMatchingFlavorContext(contextOptions) {
  if (!contextOptions?.contextIdentifier) {
    return null;
  }
  if (contextOptions.type === "NETWORK_REQUEST") {
    const raw = UI10.Context.Context.instance().flavor(SDK7.NetworkRequest.NetworkRequest);
    if (raw) {
      if (raw.name() !== contextOptions.contextIdentifier && raw.url() !== contextOptions.contextIdentifier) {
        return null;
      }
      return new AiAssistanceModel9.RequestContext.RequestContext(
        raw,
        new NetworkTimeCalculator.NetworkTransferTimeCalculator()
      );
    }
  }
  return null;
}
async function handleExternalAIRequest(options) {
  localStorage.setItem("aiAssistanceStructuredLogEnabled", "true");
  localStorage.removeItem("aiAssistanceStructuredLog");
  const conversationType = resolveConversationType(options.context?.type);
  const aidaClient = new Host6.AidaClient.AidaClient();
  const conversation = new AiAssistanceModel9.AiConversation.AiConversation({
    type: conversationType,
    data: [],
    isReadOnly: false,
    aidaClient
  });
  const resolvedContext = getMatchingFlavorContext(options.context);
  if (resolvedContext) {
    conversation.setContext(resolvedContext);
  }
  for (const prompt of options.prompts) {
    await Array.fromAsync(conversation.run(prompt));
  }
  const logsRaw = localStorage.getItem("aiAssistanceStructuredLog");
  return logsRaw ? JSON.parse(logsRaw) : [];
}
globalThis.handleExternalAIRequest = handleExternalAIRequest;
export {
  AIv2MarkdownRenderer,
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
  ExternalHandler_exports as ExternalHandler,
  ImageResize_exports as ImageResize,
  MarkdownRendererWithCodeBlock,
  OptInChangeDialog_exports as OptInChangeDialog,
  ViewState,
  WalkthroughUtils_exports as WalkthroughUtils,
  WalkthroughView_exports as WalkthroughView,
  getResponseMarkdown
};
//# sourceMappingURL=ai_assistance.js.map
