declare module 'espree' {
  type Config = {
    ecmaVersion: number,
    comment: boolean,
    tokens: boolean,
    range: boolean,
    loc: boolean
  }
  function parse(code: string, config: Config): import('eslint').AST.Program;
}
