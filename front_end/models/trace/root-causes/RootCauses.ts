// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';

import {LayoutShiftRootCauses} from './LayoutShift.js';

export type RootCauseProtocolInterface = {
  getInitiatorForRequest(url: string): Protocol.Network.Initiator|null,
  pushNodesByBackendIdsToFrontend(backendNodeIds: Protocol.DOM.BackendNodeId[]): Promise<Protocol.DOM.NodeId[]>,
  getNode(nodeId: Protocol.DOM.NodeId): Promise<Protocol.DOM.Node|null>,
  getComputedStyleForNode(nodeId: Protocol.DOM.NodeId): Promise<Protocol.CSS.CSSComputedStyleProperty[]>,
  getMatchedStylesForNode(nodeId: Protocol.DOM.NodeId): Promise<Protocol.CSS.GetMatchedStylesForNodeResponse>,
  fontFaceForSource(url: string): Protocol.CSS.FontFace|undefined,
};

export class RootCauses {
  readonly layoutShifts: LayoutShiftRootCauses;

  constructor(protocolInterface: RootCauseProtocolInterface) {
    this.layoutShifts = new LayoutShiftRootCauses(protocolInterface);
  }
}

export {LayoutShiftRootCauses} from './LayoutShift.js';
