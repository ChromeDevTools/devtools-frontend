"use strict";
export function getRootNode(node) {
  const potentialRoot = node.getRootNode();
  if (!(potentialRoot instanceof Document || potentialRoot instanceof ShadowRoot)) {
    throw new Error(`Expected root of widget to be a document or shadowRoot, but was "${potentialRoot.nodeName}"`);
  }
  return potentialRoot;
}
//# sourceMappingURL=get-root-node.js.map
