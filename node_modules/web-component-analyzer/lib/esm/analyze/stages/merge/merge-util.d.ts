import { JsDoc } from "../../types/js-doc";
import { ModifierKind } from "../../types/modifier-kind";
/**
 * Merges based on a name
 * @param entries
 * @param direction
 * @param getName
 * @param merge
 */
export declare function mergeNamedEntries<T>(entries: T[], getName: (entry: T) => string, merge?: (left: T, right: T) => T): T[];
/**
 * Merges two jsdocs
 * @param leftJsDoc
 * @param rightJsDoc
 */
export declare function mergeJsDoc(leftJsDoc: JsDoc | undefined, rightJsDoc: JsDoc | undefined): JsDoc | undefined;
/**
 * Merges modifiers
 * @param leftModifiers
 * @param rightModifiers
 */
export declare function mergeModifiers(leftModifiers: Set<ModifierKind> | undefined, rightModifiers: Set<ModifierKind> | undefined): Set<ModifierKind> | undefined;
/**
 * Merges entries using a "merge" callback
 * @param entries
 * @param isMergeable
 * @param merge
 */
//# sourceMappingURL=merge-util.d.ts.map