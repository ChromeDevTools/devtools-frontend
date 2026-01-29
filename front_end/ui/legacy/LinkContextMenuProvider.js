// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as UIHelpers from '../helpers/helpers.js';
import { Link } from '../kit/kit.js';
import { copyLinkAddressLabel, openLinkExternallyLabel, } from './UIUtils.js';
/**
 * We can move this next to the Link after
 * the context menu is decoupled from the legacy bundle
 */
export class LinkContextMenuProvider {
    appendApplicableItems(_event, contextMenu, target) {
        let targetNode = target;
        while (targetNode && !(targetNode instanceof Link)) {
            targetNode = targetNode.parentNodeOrShadowHost();
        }
        if (!targetNode?.href) {
            return;
        }
        const node = targetNode;
        contextMenu.revealSection().appendItem(openLinkExternallyLabel(), () => {
            if (node.href) {
                UIHelpers.openInNewTab(node.href);
            }
        }, { jslogContext: 'open-in-new-tab' });
        contextMenu.revealSection().appendItem(copyLinkAddressLabel(), () => {
            if (node.href) {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(node.href);
            }
        }, { jslogContext: 'copy-link-address' });
    }
}
//# sourceMappingURL=LinkContextMenuProvider.js.map