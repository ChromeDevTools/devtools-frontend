interface StringConstructor {
  sprintf(format: string, ...var_arg: any): string;
  hashCode(id: string): number;
}

interface Array<T> {
  peekLast(): T | undefined;
  lowerBound(object: T, comparator: {(a:T, b:T):number}): number;
}

// Type alias for the Closure-supported ITemplateArray which is equivalent
// to TemplateStringsArray in TypeScript land
type ITemplateArray = TemplateStringsArray

interface String {
  trimEndWithMaxLength(maxLength: number): string;
}
