// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as UIHelpers from '../helpers/helpers.js';
import {Link} from '../kit/kit.js';

import type {ContextMenu, Provider} from './ContextMenu.js';
import {
  copyLinkAddressLabel,
  openLinkExternallyLabel,
} from './UIUtils.js';
import {XLink} from './XLink.js';

/**
 * We can move this next to the Link after
 * the x-link is removed and the context menu
 * is decoupled from the legacy bundle
 */
export class LinkContextMenuProvider implements Provider<Node> {
  appendApplicableItems(_event: Event, contextMenu: ContextMenu, target: Node): void {
    let targetNode: Node|null = target;
    while (targetNode && !(targetNode instanceof XLink || targetNode instanceof Link)) {
      targetNode = targetNode.parentNodeOrShadowHost();
    }
    if (!targetNode?.href) {
      return;
    }
    const node: XLink|Link = targetNode;
    contextMenu.revealSection().appendItem(openLinkExternallyLabel(), () => {
      if (node.href) {
        UIHelpers.openInNewTab(node.href);
      }
    }, {jslogContext: 'open-in-new-tab'});
    contextMenu.revealSection().appendItem(copyLinkAddressLabel(), () => {
      if (node.href) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(node.href);
      }
    }, {jslogContext: 'copy-link-address'});
  }
}
