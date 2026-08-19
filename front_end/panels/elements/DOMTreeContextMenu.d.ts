import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ElementsTreeElement } from './ElementsTreeElement.js';
export declare function populateNodeContextMenu(contextMenu: UI.ContextMenu.ContextMenu, treeElement: ElementsTreeElement): Promise<void>;
export declare function showContextMenu(treeElement: ElementsTreeElement, event: Event, onSaveNodeToTempVariable?: (node: SDK.DOMModel.DOMNode) => void): Promise<UI.ContextMenu.ContextMenu | undefined>;
