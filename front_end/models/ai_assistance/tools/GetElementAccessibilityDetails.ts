// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {DOMNodeContext} from '../contexts/DOMNodeContext.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type OriginLockCapability,
  type TargetCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

/**
 * Arguments for getting accessibility details of an element.
 */
export interface GetElementAccessibilityDetailsArgs extends ToolArgs {
  /**
   * The backend node ID of the element to inspect.
   */
  element: number;
  explanation: string;
}

/**
 * A tool that retrieves fine-grained accessibility properties (role, name, ARIA properties, focus state)
 * for a resolved element backend node ID. It also returns a DOM snapshot of the element's subtree.
 */
export class GetElementAccessibilityDetailsTool implements
    DataTool<GetElementAccessibilityDetailsArgs, string, BaseToolCapability&TargetCapability&OriginLockCapability> {
  readonly name: ToolName = ToolName.GET_ELEMENT_ACCESSIBILITY_DETAILS;
  readonly description: string =
      'Retrieves detailed accessibility properties (computed role, accessible name, name source, ARIA attributes, ignored state) and a DOM tree snapshot for an element by backend node ID.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetElementAccessibilityDetailsArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for getting element accessibility details.',
    nullable: false,
    properties: {
      explanation: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Reason for requesting accessibility details.',
        nullable: false,
      },
      element: {
        type: Host.AidaClient.ParametersTypes.INTEGER,
        description: 'The backend node ID of the element.',
        nullable: false,
      },
    },
    required: ['explanation', 'element'],
  };

  displayInfoFromArgs(params: GetElementAccessibilityDetailsArgs): {
    title: string,
    thought: string,
    action: string,
  } {
    return {
      title: 'Reading accessibility details',
      thought: params.explanation,
      action: `getElementAccessibilityDetails(${params.element})`,
    };
  }

  /**
   * Handles the request to retrieve accessibility details.
   *
   * Resolves the element backend node ID, validates its origin against the locked origin,
   * requests the AX subtree via AccessibilityModel, and maps the relevant attributes.
   */
  async handler(
      params: GetElementAccessibilityDetailsArgs,
      context: BaseToolCapability&TargetCapability&OriginLockCapability,
      ): Promise<DataHandlerResult<string>> {
    const establishedOrigin = context.getEstablishedOrigin();
    if (!establishedOrigin) {
      return {error: 'Error: Origin lock is not established.'};
    }

    const target = context.getTarget();
    if (!target) {
      return {error: 'Error: Inspected target not found.'};
    }

    // Resolve the backend node ID to an SDK DOMNode. We use DeferredDOMNode
    // because the backend node ID is the stable identifier received from external
    // sources (like Lighthouse audits), and we need to fetch the local node object to query it.
    const deferredNode = new SDK.DOMModel.DeferredDOMNode(target, params.element as Protocol.DOM.BackendNodeId);
    const resolved = await deferredNode.resolvePromise();
    if (!resolved) {
      return {error: 'Error: Could not resolve element by ID.'};
    }

    const nodeContext = new DOMNodeContext(resolved);
    // Security check: Ensure the element matches the active conversation's origin lock.
    if (!nodeContext.isOriginAllowed(establishedOrigin)) {
      return {error: 'Error: Node does not belong to the locked origin.'};
    }

    const axModel = target.model(SDK.AccessibilityModel.AccessibilityModel);
    if (!axModel) {
      return {error: 'Error: Accessibility model not found.'};
    }

    // Accessibility data is not loaded by default for all nodes to optimize performance.
    // We must explicitly request and load the accessibility subtree for the resolved node before querying.
    await axModel.requestAndLoadSubTreeToNode(resolved);
    const axNode = axModel.axNodeForDOMNode(resolved);
    if (!axNode) {
      return {error: 'Error: AX node details not found.'};
    }

    const result = {
      role: axNode.role()?.value,
      name: axNode.name()?.value,
      nameSource: axNode.name()?.sources?.[0]?.type,
      properties: axNode.properties()?.map(p => ({name: p.name, value: p.value?.value})) ?? [],
      ariaAttributes: resolved.attributes()
                          .filter(attr => attr.name.startsWith('aria-') || attr.name === 'role')
                          .reduce(
                              (acc, attr) => {
                                acc[attr.name] = attr.value;
                                return acc;
                              },
                              {} as Record<string, string>),
      isIgnored: axNode.ignored(),
      ignoredReasons: axNode.ignoredReasons()?.map(p => ({name: p.name, value: p.value?.value})) ?? [],
      backendNodeId: resolved.backendNodeId(),
    };

    // Take a snapshot of the resolved node's DOM structure. This is required
    // by the DOM_TREE UI widget to render the element's local tree in the AI response panel.
    const snapshot = await resolved.takeSnapshot();
    return {
      result: JSON.stringify(result, null, 2),
      widgets: [{
        name: 'DOM_TREE',
        data: {
          root: snapshot,
          title: i18n.i18n.lockedString('Element details'),
          accessibleRevealLabel: i18n.i18n.lockedString('Reveal element'),
        },
      }],
    };
  }
}
