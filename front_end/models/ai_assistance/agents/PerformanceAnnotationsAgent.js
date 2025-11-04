// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import { AiAgent } from './AiAgent.js';
import { PerformanceTraceContext } from './PerformanceAgent.js';
const UIStringsNotTranslated = {
    analyzingCallTree: 'Analyzing call tree',
    /**
     * @description Shown when the agent is investigating network activity
     */
};
const lockedString = i18n.i18n.lockedString;
/**
 * Preamble clocks in at ~970 tokens.
 *   The prose is around 4.5 chars per token.
 * The data can be as bad as 1.8 chars per token
 *
 * Check token length in https://aistudio.google.com/
 */
const callTreePreamble = `You are an expert performance analyst embedded within Chrome DevTools.
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
export class PerformanceAnnotationsAgent extends AiAgent {
    preamble = callTreePreamble;
    get clientFeature() {
        return Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_ANNOTATIONS_AGENT;
    }
    get userTier() {
        return Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.userTier;
    }
    get options() {
        const temperature = Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.temperature;
        const modelId = Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.modelId;
        return {
            temperature,
            modelId,
        };
    }
    async *handleContextDetails(context) {
        if (!context) {
            return;
        }
        const focus = context.getItem();
        if (!focus.callTree) {
            throw new Error('unexpected context');
        }
        const callTree = focus.callTree;
        yield {
            type: "context" /* ResponseType.CONTEXT */,
            title: lockedString(UIStringsNotTranslated.analyzingCallTree),
            details: [
                {
                    title: 'Selected call tree',
                    text: callTree.serialize(),
                },
            ],
        };
    }
    async enhanceQuery(query, context) {
        if (!context) {
            return query;
        }
        const focus = context.getItem();
        if (!focus.callTree) {
            throw new Error('unexpected context');
        }
        const callTree = focus.callTree;
        const contextString = callTree.serialize();
        return `${contextString}\n\n# User request\n\n${query}`;
    }
    /**
     * Used in the Performance panel to automatically generate a label for a selected entry.
     */
    async generateAIEntryLabel(callTree) {
        const context = PerformanceTraceContext.fromCallTree(callTree);
        const response = await Array.fromAsync(this.run(AI_LABEL_GENERATION_PROMPT, { selected: context }));
        const lastResponse = response.at(-1);
        if (lastResponse && lastResponse.type === "answer" /* ResponseType.ANSWER */ && lastResponse.complete === true) {
            return lastResponse.text.trim();
        }
        throw new Error('Failed to generate AI entry label');
    }
}
const AI_LABEL_GENERATION_PROMPT = `## Instruction:
Generate a concise label (max 60 chars, single line) describing the *user-visible effect* of the selected call tree's activity, based solely on the provided call tree data.

## Strict Constraints:
- Output must be a single line of text.
- Maximum 60 characters.
- No full stops.
- Focus on user impact, not internal operations.
- Do not include the name of the selected event.
- Do not make assumptions about when the activity happened.
- Base the description only on the information present within the call tree data.
- Prioritize brevity.
- Only include third-party script names if their identification is highly confident.
- Very important: Only output the 60 character label text, your response will be used in full to show to the user as an annotation in the timeline.
`;
//# sourceMappingURL=PerformanceAnnotationsAgent.js.map