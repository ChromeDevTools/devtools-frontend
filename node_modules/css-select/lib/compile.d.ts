import { InternalSelector } from "./types";
import type { CompiledQuery, InternalOptions } from "./types";
/**
 * Compiles a selector to an executable function.
 *
 * @param selector Selector to compile.
 * @param options Compilation options.
 * @param context Optional context for the selector.
 */
export declare function compile<Node, ElementNode extends Node>(selector: string, options: InternalOptions<Node, ElementNode>, context?: ElementNode[]): CompiledQuery<ElementNode>;
export declare function compileUnsafe<Node, ElementNode extends Node>(selector: string, options: InternalOptions<Node, ElementNode>, context?: ElementNode[] | ElementNode): CompiledQuery<ElementNode>;
export declare function compileToken<Node, ElementNode extends Node>(token: InternalSelector[][], options: InternalOptions<Node, ElementNode>, context?: ElementNode[] | ElementNode): CompiledQuery<ElementNode>;
//# sourceMappingURL=compile.d.ts.map