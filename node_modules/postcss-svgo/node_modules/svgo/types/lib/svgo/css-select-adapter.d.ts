/**
 * @param {import('../types.js').XastParent} relativeNode
 * @param {Map<import('../types.js').XastNode, import('../types.js').XastParent>=} parents
 * @returns {Required<import('css-select').Options<import('../types.js').XastNode & { children?: any }, import('../types.js').XastElement>>['adapter']}
 */
export function createAdapter(relativeNode: import("../types.js").XastParent, parents?: Map<import("../types.js").XastNode, import("../types.js").XastParent> | undefined): Required<import("css-select").Options<import("../types.js").XastNode & {
    children?: any;
}, import("../types.js").XastElement>>["adapter"];
