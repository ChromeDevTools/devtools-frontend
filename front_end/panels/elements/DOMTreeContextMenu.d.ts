import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type ElementsTreeWidget } from './ElementsTreeElement.js';
import type { DOMTreeWidget } from './ElementsTreeOutline.js';
export declare function populateNodeContextMenu(contextMenu: UI.ContextMenu.ContextMenu, domTreeWidget: DOMTreeWidget, domNode: SDK.DOMModel.DOMNode, targetWidget?: ElementsTreeWidget): Promise<void>;
export declare function showContextMenu(domTreeWidget: DOMTreeWidget, domNode: SDK.DOMModel.DOMNode, event: Event, targetWidget?: ElementsTreeWidget): Promise<UI.ContextMenu.ContextMenu | undefined>;
