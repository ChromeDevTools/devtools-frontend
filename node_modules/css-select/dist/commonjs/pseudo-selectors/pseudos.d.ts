import type { PseudoSelector } from "css-what";
import type { InternalOptions } from "../types.js";
type Pseudo = <Node, ElementNode extends Node>(elem: ElementNode, options: InternalOptions<Node, ElementNode>, subselect?: string | null) => boolean;
export declare const pseudos: Record<string, Pseudo>;
export declare function verifyPseudoArgs<T extends Array<unknown>>(func: (...args: T) => boolean, name: string, subselect: PseudoSelector["data"], argIndex: number): void;
export {};
//# sourceMappingURL=pseudos.d.ts.map