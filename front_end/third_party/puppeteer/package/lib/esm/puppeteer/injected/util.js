const HIDDEN_VISIBILITY_VALUES = ['hidden', 'collapse'];
/**
 * @internal
 */
export const checkVisibility = (node, visible) => {
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
function isBoundingBoxEmpty(element) {
    const rect = element.getBoundingClientRect();
    return rect.width === 0 || rect.height === 0;
}
/**
 * @internal
 */
export function* deepChildren(root) {
    var _a;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    for (; node; node = walker.nextNode()) {
        yield (_a = node.shadowRoot) !== null && _a !== void 0 ? _a : node;
    }
}
/**
 * @internal
 */
export function* deepDescendents(root) {
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
//# sourceMappingURL=util.js.map