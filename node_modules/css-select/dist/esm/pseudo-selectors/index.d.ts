import { type PseudoSelector } from "css-what";
import type { CompiledQuery, CompileToken, InternalOptions } from "../types.js";
import { aliases } from "./aliases.js";
import { filters } from "./filters.js";
import { pseudos } from "./pseudos.js";
export { filters, pseudos, aliases };
export declare function compilePseudoSelector<Node, ElementNode extends Node>(next: CompiledQuery<ElementNode>, selector: PseudoSelector, options: InternalOptions<Node, ElementNode>, context: Node[] | undefined, compileToken: CompileToken<Node, ElementNode>): CompiledQuery<ElementNode>;
//# sourceMappingURL=index.d.ts.map