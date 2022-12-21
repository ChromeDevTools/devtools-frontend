import { Line, Spec } from '../primitives';
import { Tokenizer } from './tokenizers/index';
export declare type Parser = (source: Line[]) => Spec;
export interface Options {
    tokenizers: Tokenizer[];
}
export default function getParser({ tokenizers }: Options): Parser;
