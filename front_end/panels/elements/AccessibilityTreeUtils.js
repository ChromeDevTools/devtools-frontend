// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as ElementsComponents from './components/components.js';
const { html } = Lit;
const { widget } = UI.Widget;
export async function sdkNodeToAXTreeNodes(sdkNode) {
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
                const childNodes = await sdkNode.getChildren();
                const childTreeNodes = await Promise.all(childNodes.map(childNode => sdkNodeToAXTreeNodes(childNode)));
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
    return html `${widget(ElementsComponents.AccessibilityTreeNode.AccessibilityTreeNode, { name, role, ignored, properties })}`;
}
//# sourceMappingURL=AccessibilityTreeUtils.js.map