import type * as SDK from '../../core/sdk/sdk.js';
import type * as ChangeTracker from '../change_tracker/change_tracker.js';
export interface StylePropertyEdit {
    /** Rule header or selector containing the property (e.g. 'element.style' or '.btn:hover'). */
    ruleHeader?: string;
    /** Property name before the edit, or an empty string when a new property is added. */
    oldName: string;
    /** Property value before the edit (including '!important' if present). */
    oldValue: string;
    /** Committed property name, or an empty string when the property is removed. */
    newName: string;
    /** Committed property value (including '!important' if present). */
    newValue: string;
}
export interface StylePropertyToggle {
    /** Rule header or selector containing the property (e.g. 'element.style' or '.btn:hover'). */
    ruleHeader?: string;
    name: string;
    value: string;
    /** Whether the property is now disabled. */
    disabled: boolean;
}
export declare function trackStylePropertyEdit(tracker: ChangeTracker.ChangeTracker.ChangeTracker | undefined, node: SDK.DOMModel.DOMNode, edit: StylePropertyEdit): void;
export declare function trackStylePropertyToggle(tracker: ChangeTracker.ChangeTracker.ChangeTracker | undefined, node: SDK.DOMModel.DOMNode, toggle: StylePropertyToggle): void;
