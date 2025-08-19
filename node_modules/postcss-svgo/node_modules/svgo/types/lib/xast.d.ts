export function querySelectorAll(node: import("./types.js").XastParent, selector: string, parents?: Map<import("./types.js").XastNode, import("./types.js").XastParent> | undefined): import("./types.js").XastChild[];
export function querySelector(node: import("./types.js").XastParent, selector: string, parents?: Map<import("./types.js").XastNode, import("./types.js").XastParent> | undefined): import("./types.js").XastChild | null;
export function matches(node: import("./types.js").XastElement, selector: string, parents?: Map<import("./types.js").XastNode, import("./types.js").XastParent> | undefined): boolean;
export function detachNodeFromParent(node: import("./types.js").XastChild, parentNode: import("./types.js").XastParent): void;
