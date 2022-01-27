interface Array<T> {
  at(index: number): T|undefined;
  diffSig(oneSig: number): T|undefined;
}

interface ReadonlyArray<T> {
  at(index: number): T|undefined;
  diffSig(twoSig: number): T|undefined;
}
