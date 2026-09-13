import type { AttributeAction, AttributeSelector } from "css-what";
import type { CompiledQuery, InternalOptions } from "./types.js";
/**
 * Attribute selectors
 */
export declare const attributeRules: Record<AttributeAction, <Node, ElementNode extends Node>(next: CompiledQuery<ElementNode>, data: AttributeSelector, options: InternalOptions<Node, ElementNode>) => CompiledQuery<ElementNode>>;
//# sourceMappingURL=attributes.d.ts.map