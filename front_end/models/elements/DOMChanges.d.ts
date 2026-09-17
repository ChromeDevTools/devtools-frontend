import type * as SDK from '../../core/sdk/sdk.js';
import type * as ChangeTracker from '../change_tracker/change_tracker.js';
type Tracker = ChangeTracker.ChangeTracker.ChangeTracker | undefined;
/**
 * Maximum number of characters of page controlled data (tag names, attribute names and values,
 * text node values and HTML) that a change description embeds. The inspected page fully controls
 * these strings and `Changed HTML from ... to ...` in particular can otherwise hold on to the
 * entire subtree of an element.
 */
export declare const MAX_VALUE_LENGTH = 100;
export interface AttributeEdit {
    /** Name of the edited attribute, or an empty string when a new attribute is added. */
    attributeName: string;
    /** Raw attribute text before the edit, if there was any. */
    oldText: string | null;
    /** Raw attribute text the user committed. Empty when the attribute is removed. */
    newText: string;
}
export declare function trackAttributeEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined, edit: AttributeEdit): void;
export declare function trackTagNameEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined, oldTagName: string, newTagName: string): void;
export declare function trackTextNodeEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined, oldText: string, newText: string): void;
export declare function trackNodeRemoval(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined): void;
export declare function trackHTMLEdit(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined, oldValue: string, newValue: string): void;
export declare function trackVisibilityToggle(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined, hidden: boolean): void;
export declare function trackNodeDuplication(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined): void;
export declare function trackNodeMove(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined, directionUp: boolean): void;
export declare function trackNodeDrop(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined): void;
export declare function trackNodePaste(tracker: Tracker, node: SDK.DOMModel.DOMNode, selector: string | undefined, isCut: boolean): void;
export {};
