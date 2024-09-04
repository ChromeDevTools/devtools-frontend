// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {type ContrastIssue} from './CSSOverviewCompletedView.js';
import {type UnusedDeclaration} from './CSSOverviewUnusedDeclarations.js';

export class OverviewController extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  currentUrl: string;
  constructor() {
    super();

    this.currentUrl = SDK.TargetManager.TargetManager.instance().inspectedURL();
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.INSPECTED_URL_CHANGED, this.#checkUrlAndResetIfChanged, this);
  }

  #checkUrlAndResetIfChanged(): void {
    if (this.currentUrl === SDK.TargetManager.TargetManager.instance().inspectedURL()) {
      return;
    }

    this.currentUrl = SDK.TargetManager.TargetManager.instance().inspectedURL();
    this.dispatchEventToListeners(Events.RESET);
  }
}

export type PopulateNodesEvent = {
  type: 'contrast',
  key: string,
  section: string|undefined,
  nodes: ContrastIssue[],
}|{
  type: 'color',
  color: string,
  section: string | undefined,
  nodes: {nodeId: Protocol.DOM.BackendNodeId}[],
}|{
  type: 'unused-declarations',
  declaration: string,
  nodes: UnusedDeclaration[],
}|{
  type: 'media-queries',
  text: string,
  nodes: Protocol.CSS.CSSMedia[],
}|{
  type: 'font-info',
  name: string,
  nodes: {nodeId: Protocol.DOM.BackendNodeId}[],
};

export type PopulateNodesEventNodes = PopulateNodesEvent['nodes'];
export type PopulateNodesEventNodeTypes = PopulateNodesEventNodes[0];

export const enum Events {
  REQUEST_OVERVIEW_START = 'RequestOverviewStart',
  REQUEST_NODE_HIGHLIGHT = 'RequestNodeHighlight',
  POPULATE_NODES = 'PopulateNodes',
  REQUEST_OVERVIEW_CANCEL = 'RequestOverviewCancel',
  OVERVIEW_COMPLETED = 'OverviewCompleted',
  RESET = 'Reset',
}

export type EventTypes = {
  [Events.REQUEST_OVERVIEW_START]: void,
  [Events.REQUEST_NODE_HIGHLIGHT]: number,
  [Events.POPULATE_NODES]: {payload: PopulateNodesEvent},
  [Events.REQUEST_OVERVIEW_CANCEL]: void,
  [Events.OVERVIEW_COMPLETED]: void,
  [Events.RESET]: void,
};
