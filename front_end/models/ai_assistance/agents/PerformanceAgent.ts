// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import {html, type TemplateResult} from '../../../ui/lit/lit.js';
import * as Trace from '../../trace/trace.js';

import {
  AiAgent,
  type ContextResponse,
  ConversationContext,
  type RequestOptions,
  ResponseType,
} from './AiAgent.js';

/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
/**
 * Preamble clocks in at ~970 tokens.
 *   The prose is around 4.5 chars per token.
 * The data can be as bad as 1.8 chars per token
 *
 * Check token length in https://aistudio.google.com/
 */
const preamble = `You are an expert performance analyst embedded within Chrome DevTools.
You meticulously examine web application behavior captured by the Chrome DevTools Performance Panel and Chrome tracing.
You will receive a structured text representation of a call tree, derived from a user-selected call frame within a performance trace's flame chart.
This tree originates from the root task associated with the selected call frame.

Each call frame is presented in the following format:

'id;name;duration;selfTime;urlIndex;childRange;[S]'

Key definitions:

* id: A unique numerical identifier for the call frame.
* name: A concise string describing the call frame (e.g., 'Evaluate Script', 'render', 'fetchData').
* duration: The total execution time of the call frame, including its children.
* selfTime: The time spent directly within the call frame, excluding its children's execution.
* urlIndex: Index referencing the "All URLs" list. Empty if no specific script URL is associated.
* childRange: Specifies the direct children of this node using their IDs. If empty ('' or 'S' at the end), the node has no children. If a single number (e.g., '4'), the node has one child with that ID. If in the format 'firstId-lastId' (e.g., '4-5'), it indicates a consecutive range of child IDs from 'firstId' to 'lastId', inclusive.
* S: **Optional marker.** The letter 'S' appears at the end of the line **only** for the single call frame selected by the user.

Your objective is to provide a comprehensive analysis of the **selected call frame and the entire call tree** and its context within the performance recording, including:

1.  **Functionality:** Clearly describe the purpose and actions of the selected call frame based on its properties (name, URL, etc.).
2.  **Execution Flow:**
    * **Ancestors:** Trace the execution path from the root task to the selected call frame, explaining the sequence of parent calls.
    * **Descendants:** Analyze the child call frames, identifying the tasks they initiate and any performance-intensive sub-tasks.
3.  **Performance Metrics:**
    * **Duration and Self Time:** Report the execution time of the call frame and its children.
    * **Relative Cost:** Evaluate the contribution of the call frame to the overall duration of its parent tasks and the entire trace.
    * **Bottleneck Identification:** Identify potential performance bottlenecks based on duration and self time, including long-running tasks or idle periods.
4.  **Optimization Recommendations:** Provide specific, actionable suggestions for improving the performance of the selected call frame and its related tasks, focusing on resource management and efficiency. Only provide recommendations if they are based on data present in the call tree.

# Important Guidelines:

* Maintain a concise and technical tone suitable for software engineers.
* Exclude call frame IDs and URL indices from your response.
* **Critical:** If asked about sensitive topics (religion, race, politics, sexuality, gender, etc.), respond with: "My expertise is limited to website performance analysis. I cannot provide information on that topic.".
* **Critical:** Refrain from providing answers on non-web-development topics, such as legal, financial, medical, or personal advice.

## Example Session:

All URLs:
* 0 - app.js

Call Tree:

1;main;500;100;;
2;update;200;50;;3
3;animate;150;20;0;4-5;S
4;calculatePosition;80;80;;
5;applyStyles;50;50;;

Analyze the selected call frame.

Example Response:

The selected call frame is 'animate', responsible for visual animations within 'app.js'.
It took 150ms total, with 20ms spent directly within the function.
The 'calculatePosition' and 'applyStyles' child functions consumed the remaining 130ms.
The 'calculatePosition' function, taking 80ms, is a potential bottleneck.
Consider optimizing the position calculation logic or reducing the frequency of calls to improve animation performance.
`;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  analyzingCallTree: 'Analyzing call tree',
} as const;

const lockedString = i18n.i18n.lockedString;

export class CallTreeContext extends ConversationContext<TimelineUtils.AICallTree.AICallTree> {
  #callTree: TimelineUtils.AICallTree.AICallTree;

  constructor(callTree: TimelineUtils.AICallTree.AICallTree) {
    super();
    this.#callTree = callTree;
  }

  override getOrigin(): string {
    // Although in this context we expect the call tree to have a selected node
    // as the entrypoint into the "Ask AI" tool is via selecting a node, it is
    // possible to build trees without a selected node, in which case we
    // fallback to the root node.
    const node = this.#callTree.selectedNode ?? this.#callTree.rootNode;
    const selectedEvent = node.event;
    // Get the non-resolved (ignore sourcemaps) URL for the event. We use the
    // non-resolved URL as in the context of the AI Assistance panel, we care
    // about the origin it was served on.
    const nonResolvedURL = Trace.Handlers.Helpers.getNonResolvedURL(selectedEvent, this.#callTree.parsedTrace);
    if (nonResolvedURL) {
      const origin = Common.ParsedURL.ParsedURL.extractOrigin(nonResolvedURL);
      if (origin) {  // origin could be the empty string.
        return origin;
      }
    }
    // Generate a random "origin". We do this rather than return an empty
    // string or some "unknown" string so that each event without a definite
    // URL is considered a new, standalone origin. This is safer from a privacy
    // & security perspective, else we risk bucketing events together that
    // should not be. We also don't want to make it entirely random so we
    // cannot calculate it deterministically.
    const uuid = `${selectedEvent.name}_${selectedEvent.pid}_${selectedEvent.tid}_${selectedEvent.ts}`;
    return uuid;
  }

  override getItem(): TimelineUtils.AICallTree.AICallTree {
    return this.#callTree;
  }

  override getIcon(): TemplateResult {
    return html`<devtools-icon name="performance" title="Performance"
        style="color: var(--sys-color-on-surface-subtle);"></devtools-icon>`;
  }

  override getTitle(): string {
    const event = this.#callTree.selectedNode?.event ?? this.#callTree.rootNode.event;
    if (!event) {
      return 'unknown';
    }

    return TimelineUtils.EntryName.nameForEntry(event);
  }
}

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class PerformanceAgent extends AiAgent<TimelineUtils.AICallTree.AICallTree> {
  readonly preamble = preamble;

  // We have to set the type of clientFeature here to be the entire enum
  // because in PerformanceAnnotationsAgent.ts we override it.
  // TODO(b/406961576): split the agents apart rather than have one extend the other.
  readonly clientFeature: Host.AidaClient.ClientFeature = Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_AGENT;
  get userTier(): string|undefined {
    return Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.userTier;
  }
  get options(): RequestOptions {
    const temperature = Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.temperature;
    const modelId = Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  async *
      handleContextDetails(aiCallTree: ConversationContext<TimelineUtils.AICallTree.AICallTree>|null):
          AsyncGenerator<ContextResponse, void, void> {
    yield {
      type: ResponseType.CONTEXT,
      title: lockedString(UIStringsNotTranslate.analyzingCallTree),
      details: [
        {
          title: 'Selected call tree',
          text: aiCallTree?.getItem().serialize() ?? '',
        },
      ],
    };
  }

  #contextSet = new WeakSet();

  override async enhanceQuery(query: string, aiCallTree: ConversationContext<TimelineUtils.AICallTree.AICallTree>|null):
      Promise<string> {
    const treeItem = aiCallTree?.getItem();
    let treeStr = treeItem?.serialize();

    // Collect the queries from previous messages in this session

    // If this is a followup chat about the same call tree, don't include the call tree serialization again.
    // We don't need to repeat it and we'd rather have more the context window space.
    if (treeItem && this.#contextSet.has(treeItem) && treeStr) {
      treeStr = undefined;
    }
    if (treeItem && !this.#contextSet.has(treeItem)) {
      this.#contextSet.add(treeItem);
    }

    const perfEnhancementQuery = treeStr ? `${treeStr}\n\n# User request\n\n` : '';
    return `${perfEnhancementQuery}${query}`;
  }
}
