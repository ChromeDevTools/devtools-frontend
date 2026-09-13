import type { CompiledQuery, InternalOptions } from "../types.js";
type Filter = <Node, ElementNode extends Node>(next: CompiledQuery<ElementNode>, text: string, options: InternalOptions<Node, ElementNode>, context?: Node[]) => CompiledQuery<ElementNode>;
export declare const filters: Record<string, Filter>;
export {};
//# sourceMappingURL=filters.d.ts.map