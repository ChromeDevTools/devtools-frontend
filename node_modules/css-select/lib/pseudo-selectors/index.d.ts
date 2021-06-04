import type { CompiledQuery, InternalOptions, CompileToken } from "../types";
import type { PseudoSelector } from "css-what";
import { filters } from "./filters";
import { pseudos } from "./pseudos";
export { filters, pseudos };
export declare function compilePseudoSelector<Node, ElementNode extends Node>(next: CompiledQuery<ElementNode>, selector: PseudoSelector, options: InternalOptions<Node, ElementNode>, context: ElementNode[] | undefined, compileToken: CompileToken<Node, ElementNode>): CompiledQuery<ElementNode>;
//# sourceMappingURL=index.d.ts.map