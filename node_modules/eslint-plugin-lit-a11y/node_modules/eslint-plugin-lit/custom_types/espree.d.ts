declare module 'espree' {
  export function parse(
    code: string,
    options?: Partial<{
      ecmaVersion: number;
      comment: boolean;
      tokens: boolean;
      range: boolean;
      loc: boolean;
    }>
  ): import('estree').Node;
}
