/**
 * Maps all nodes to their parent node recursively.
 *
 * @param {import('../types.js').XastParent} node
 * @returns {Map<import('../types.js').XastNode, import('../types.js').XastParent>}
 */
export function mapNodesToParents(node: import("../types.js").XastParent): Map<import("../types.js").XastNode, import("../types.js").XastParent>;
