import { type ParsletFunction } from './Parslet.js';
import type { Grammar } from '../grammars/Grammar.js';
export declare function createObjectParslet({ signatureGrammar, objectFieldGrammar, allowKeyTypes }: {
    signatureGrammar?: Grammar;
    objectFieldGrammar: Grammar;
    allowKeyTypes: boolean;
}): ParsletFunction;
