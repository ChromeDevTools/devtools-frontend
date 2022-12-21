import { Block } from '../primitives';

export type Transform = (Block: Block) => Block;

export function flow(...transforms: Transform[]): Transform {
  return (block: Block): Block =>
    transforms.reduce((block, t) => t(block), block);
}
