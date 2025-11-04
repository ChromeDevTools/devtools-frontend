import * as UI from '../ui/legacy/legacy.js';
export declare function getMenu(action: () => void): UI.ContextMenu.ContextMenu;
export declare function getMenuForToolbarButton(button: UI.Toolbar.ToolbarMenuButton): UI.ContextMenu.ContextMenu;
export declare function findMenuItemWithLabel(section: UI.ContextMenu.Section, label: string): UI.ContextMenu.Item | undefined;
export declare function getMenuItemLabels(section: UI.ContextMenu.Section): string[];
export declare function getContextMenuForElement(element: Element, target?: Element): UI.ContextMenu.ContextMenu;
export declare function getMenuForShiftClick(element: Element): UI.ContextMenu.ContextMenu;
