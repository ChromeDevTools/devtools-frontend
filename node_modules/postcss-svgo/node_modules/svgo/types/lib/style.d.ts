export function compareSpecificity(a: import("./types.js").Specificity, b: import("./types.js").Specificity): number;
export function collectStylesheet(root: import("./types.js").XastRoot): import("./types.js").Stylesheet;
export function computeStyle(stylesheet: import("./types.js").Stylesheet, node: import("./types.js").XastElement): import("./types.js").ComputedStyles;
export function includesAttrSelector(selector: csstree.ListItem<csstree.CssNode> | string, name: string, value?: string | null, traversed?: boolean): boolean;
import * as csstree from 'css-tree';
