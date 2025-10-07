import { type ParsletFunction } from './Parslet.js';
import type { SpecialNamePathType } from '../result/RootResult.js';
import type { Grammar } from '../grammars/Grammar.js';
export declare function createSpecialNamePathParslet({ pathGrammar, allowedTypes }: {
    allowedTypes: SpecialNamePathType[];
    pathGrammar: Grammar;
}): ParsletFunction;
