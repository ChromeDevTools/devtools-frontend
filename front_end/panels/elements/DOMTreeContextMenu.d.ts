import * as UI from '../../ui/legacy/legacy.js';
import { ElementsTreeElement } from './ElementsTreeElement.js';
export declare function populateNodeContextMenu(contextMenu: UI.ContextMenu.ContextMenu, treeElement: ElementsTreeElement): Promise<void>;
export declare function showContextMenu(treeElement: ElementsTreeElement, event: Event): Promise<UI.ContextMenu.ContextMenu | undefined>;
