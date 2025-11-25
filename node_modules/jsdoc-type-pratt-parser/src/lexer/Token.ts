export type TokenType =
  '('
  | ')'
  | '['
  | ']'
  | '{'
  | '}'
  | '|'
  | '&'
  | '<'
  | '>'
  | ';'
  | ','
  | '*'
  | '?'
  | '!'
  | '='
  | ':'
  | '.'
  | '@'
  | '#'
  | '~'
  | '/'
  | '=>'
  | '...'
  | 'null'
  | 'undefined'
  | 'function'
  | 'this'
  | 'new'
  | 'module'
  | 'event'
  | 'extends'
  | 'external'
  | 'typeof'
  | 'keyof'
  | 'readonly'
  | 'import'
  | 'infer'
  | 'is'
  | 'in'
  | 'asserts'
  | 'Identifier'
  | 'StringValue'
  | 'TemplateLiteral'
  | 'Number'
  | 'EOF'

export interface Token {
  type: TokenType
  text: string
  startOfLine: boolean
}

export const baseNameTokens: TokenType[] = [
  'module', 'keyof', 'event', 'external',
  'readonly', 'is',
  'typeof', 'in',
  'null', 'undefined', 'function', 'asserts', 'infer',
  'extends', 'import'
]

export const reservedWordsAsRootTSTypes = [
  'false',
  'null',
  'true',
  'void'
]

// May not be needed
export const reservedWordsAsTSTypes = [
  ...reservedWordsAsRootTSTypes,
  'extends',
  'import',
  'in',
  'new',
  'this',
  'typeof'
]

export const reservedWords = {
  always: [
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'null',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with'
  ],
  strictMode: [
    'let',
    'static',
    'yield'
  ],
  moduleOrAsyncFunctionBodies: [
    'await'
  ]
}

export const futureReservedWords = {
  always: ['enum'],
  strictMode: [
    'implements',
    'interface',
    'package',
    'private',
    'protected',
    'public'
  ]
}

export const strictModeNonIdentifiers = [
  'arguments',
  'eval'
];
