import { ComponentCssPart } from "../../types/features/component-css-part";
import { ComponentCssProperty } from "../../types/features/component-css-property";
import { ComponentEvent } from "../../types/features/component-event";
import { ComponentMethod } from "../../types/features/component-method";
import { ComponentSlot } from "../../types/features/component-slot";
/**
 * Merges multiple slots
 * @param slots
 */
export declare function mergeSlots(slots: ComponentSlot[]): ComponentSlot[];
/**
 * Merges multiple css parts
 * @param cssParts
 */
export declare function mergeCssParts(cssParts: ComponentCssPart[]): ComponentCssPart[];
/**
 * Merges multiple css properties
 * @param cssProps
 */
export declare function mergeCssProperties(cssProps: ComponentCssProperty[]): ComponentCssProperty[];
/**
 * Merges multiple methods
 * @param methods
 */
export declare function mergeMethods(methods: ComponentMethod[]): ComponentMethod[];
/**
 * Merges multiple events
 * @param events
 */
export declare function mergeEvents(events: ComponentEvent[]): ComponentEvent[];
//# sourceMappingURL=merge-feature.d.ts.map