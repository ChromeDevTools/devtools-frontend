import type { CompiledQuery, InternalOptions, InternalSelector } from "./types.js";
export declare function compileToken<Node, ElementNode extends Node>(token: InternalSelector[][], options: InternalOptions<Node, ElementNode>, ctx?: Node[] | Node): CompiledQuery<ElementNode>;
//# sourceMappingURL=compile.d.ts.map