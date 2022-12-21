import { Spec } from '../../primitives';
/**
 * Splits `spect.lines[].token.description` into other tokens,
 * and populates the spec.{tag, name, type, description}. Invoked in a chaing
 * with other tokens, operations listed above can be moved to separate tokenizers
 */
export declare type Tokenizer = (spec: Spec) => Spec;
