import { ParsletFunction } from './Parslet';
import { Grammar } from '../grammars/Grammar';
export declare function createObjectParslet({ objectFieldGrammar, allowKeyTypes }: {
    objectFieldGrammar: Grammar;
    allowKeyTypes: boolean;
}): ParsletFunction;
