import type { ContextMenu, Provider } from './ContextMenu.js';
/**
 * We can move this next to the Link after
 * the context menu is decoupled from the legacy bundle
 */
export declare class LinkContextMenuProvider implements Provider<Node> {
    appendApplicableItems(_event: Event, contextMenu: ContextMenu, target: Node): void;
}
