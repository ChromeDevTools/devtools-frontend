"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepDescendents = exports.deepChildren = exports.checkVisibility = void 0;
const HIDDEN_VISIBILITY_VALUES = ['hidden', 'collapse'];
/**
 * @internal
 */
const checkVisibility = (node, visible) => {
    if (!node) {
        return visible === false;
    }
    if (visible === undefined) {
        return node;
    }
    const element = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node);
    const style = window.getComputedStyle(element);
    const isVisible = style &&
        !HIDDEN_VISIBILITY_VALUES.includes(style.visibility) &&
        !isBoundingBoxEmpty(element);
    return visible === isVisible ? node : false;
};
exports.checkVisibility = checkVisibility;
function isBoundingBoxEmpty(element) {
    const rect = element.getBoundingClientRect();
    return rect.width === 0 || rect.height === 0;
}
/**
 * @internal
 */
function* deepChildren(root) {
    var _a;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    for (; node; node = walker.nextNode()) {
        yield (_a = node.shadowRoot) !== null && _a !== void 0 ? _a : node;
    }
}
exports.deepChildren = deepChildren;
/**
 * @internal
 */
function* deepDescendents(root) {
    const walkers = [document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)];
    let walker;
    while ((walker = walkers.shift())) {
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.shadowRoot) {
                yield node;
                continue;
            }
            walkers.push(document.createTreeWalker(node.shadowRoot, NodeFilter.SHOW_ELEMENT));
            yield node.shadowRoot;
        }
    }
}
exports.deepDescendents = deepDescendents;
//# sourceMappingURL=util.js.map