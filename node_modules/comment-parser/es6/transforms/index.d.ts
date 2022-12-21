import { Block } from '../primitives';
export declare type Transform = (Block: Block) => Block;
export declare function flow(...transforms: Transform[]): Transform;
