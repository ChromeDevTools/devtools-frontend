// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './components/components.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Lit from '../../ui/lit/lit.js';
const { html } = Lit;
export async function sdkNodeToAXTreeNodes(sdkNode, frameManager = SDK.FrameManager.FrameManager.instance()) {
    const treeNodeData = sdkNode;
    if (sdkNode.isLeafNode()) {
        return [{
                treeNodeData,
                id: sdkNode.getNodeId(),
            }];
    }
    return [{
            treeNodeData,
            children: async () => {
                const childNodes = await sdkNode.getChildren(frameManager);
                const childTreeNodes = await Promise.all(childNodes.map(childNode => sdkNodeToAXTreeNodes(childNode, frameManager)));
                return childTreeNodes.flat(1);
            },
            id: sdkNode.getNodeId(),
        }];
}
export function accessibilityNodeRenderer(node) {
    const sdkNode = node.treeNodeData;
    const name = sdkNode.name()?.value || '';
    const role = sdkNode.role()?.value || '';
    const properties = sdkNode.properties() || [];
    const ignored = sdkNode.ignored();
    const id = sdkNode.getNodeId();
    return html `<devtools-accessibility-tree-node .data=${{
        name, role, ignored, properties, id,
    }}></devtools-accessibility-tree-node>`;
}
//# sourceMappingURL=AccessibilityTreeUtils.js.map