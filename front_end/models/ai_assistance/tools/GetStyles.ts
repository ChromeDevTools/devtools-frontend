// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type {ComputedStyleAiWidget, FunctionCallHandlerResult, FunctionHandlerOptions} from '../agents/AiAgent.js';
import {DOMNodeContext} from '../contexts/DOMNodeContext.js';
import {debugLog} from '../debug.js';

import {type Tool, type ToolArgs, type ToolContext, ToolName} from './Tool.js';

export interface GetStylesArgs extends ToolArgs {
  elements: number[];
  styleProperties: string[];
  explanation: string;
}

export class GetStylesTool implements Tool<GetStylesArgs, unknown> {
  readonly name = ToolName.GET_STYLES;
  readonly description =
      `Get computed and source styles for one or multiple elements on the inspected page for multiple elements at once by uid.

**CRITICAL** An element uid is a number, not a selector.
**CRITICAL** Use selectors to refer to elements in the text output. Do not use uids.
**CRITICAL** Always provide the explanation argument to explain what and why you query.
**CRITICAL** You MUST provide a specific list of CSS property names. Do not use generic values like "all" or "*".`;

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetStylesArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: '',
    nullable: false,
    properties: {
      explanation: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Explain why you want to get styles',
        nullable: false,
      },
      elements: {
        type: Host.AidaClient.ParametersTypes.ARRAY,
        description: 'A list of element uids to get data for. These are numbers, not selectors.',
        items: {type: Host.AidaClient.ParametersTypes.INTEGER, description: 'An element uid.'},
        nullable: false,
      },
      styleProperties: {
        type: Host.AidaClient.ParametersTypes.ARRAY,
        description:
            'One or more specific CSS style property names to fetch. Generic values like "all" or "*" are not supported.',
        nullable: false,
        items: {
          type: Host.AidaClient.ParametersTypes.STRING,
          description: 'A CSS style property name to retrieve. For example, \'background-color\'.'
        }
      },
    },
    required: ['explanation', 'elements', 'styleProperties']
  };

  displayInfoFromArgs(params: GetStylesArgs): {
    title: string,
    thought: string,
    action: string,
  } {
    return {
      title: 'Reading computed and source styles',
      thought: params.explanation,
      action: `getStyles(${JSON.stringify(params.elements)}, ${JSON.stringify(params.styleProperties)})`,
    };
  }

  async handler(
      params: GetStylesArgs,
      context: ToolContext,
      _options?: FunctionHandlerOptions,
      ): Promise<FunctionCallHandlerResult<unknown>> {
    const widgets: ComputedStyleAiWidget[] = [];
    const result:
        Record<string, {computed: Record<string, string|undefined>, authored: Record<string, string|undefined>}> = {};

    const activeContext = context.conversationContext;
    if (!activeContext || !(activeContext instanceof DOMNodeContext)) {
      return {error: 'Error: Could not find the currently selected element.'};
    }

    const selectedNode = activeContext.getItem();
    if (!selectedNode) {
      return {error: 'Error: Could not find the currently selected element.'};
    }

    for (const uid of params.elements) {
      result[uid] = {computed: {}, authored: {}};
      debugLog(`Action to execute: uid=${uid}`);
      const node =
          new SDK.DOMModel.DeferredDOMNode(selectedNode.domModel().target(), uid as Protocol.DOM.BackendNodeId);
      const resolved = await node.resolvePromise();
      if (!resolved) {
        return {error: 'Error: Could not find the element with uid=' + uid};
      }
      const newContext = new DOMNodeContext(resolved);
      if (activeContext.getOrigin() !== newContext.getOrigin()) {
        return {error: 'Error: Node does not belong to the current origin.'};
      }
      const styles = await resolved.domModel().cssModel().getComputedStyle(resolved.id);
      if (!styles) {
        return {error: 'Error: Could not get computed styles.'};
      }
      const matchedStyles = await resolved.domModel().cssModel().getMatchedStyles(resolved.id);
      if (!matchedStyles) {
        return {error: 'Error: Could not get authored styles.'};
      }
      widgets.push({
        name: 'COMPUTED_STYLES',
        data: {
          computedStyles: styles,
          backendNodeId: node.backendNodeId(),
          matchedCascade: matchedStyles,
          properties: params.styleProperties,
        }
      });
      for (const prop of params.styleProperties) {
        result[uid].computed[prop] = styles.get(prop);
      }
      for (const style of matchedStyles.nodeStyles()) {
        for (const property of style.allProperties()) {
          if (!params.styleProperties.includes(property.name)) {
            continue;
          }
          const state = matchedStyles.propertyState(property);
          if (state === SDK.CSSMatchedStyles.PropertyState.ACTIVE) {
            result[uid].authored[property.name] = property.value;
          }
        }
      }
    }
    return {
      result: JSON.stringify(result, null, 2),
      widgets,
    };
  }
}
