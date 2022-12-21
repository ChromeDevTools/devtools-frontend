import { Block } from '../primitives';
export declare type Stringifier = (block: Block) => string;
export default function getStringifier(): Stringifier;
