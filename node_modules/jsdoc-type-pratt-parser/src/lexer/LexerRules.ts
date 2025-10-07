import type { Token, TokenType } from './Token.js'

type PartialToken = Omit<Token, 'startOfLine'>

export type Rule = (text: string) => PartialToken | null

function makePunctuationRule (type: TokenType): Rule {
  return text => {
    if (text.startsWith(type)) {
      return { type, text: type }
    } else {
      return null
    }
  }
}

function getQuoted (text: string): string | null {
  let position = 0
  let char = undefined
  const mark = text[0]
  let escaped = false

  if (mark !== '\'' && mark !== '"') {
    return null
  }

  while (position < text.length) {
    position++
    char = text[position]
    if (!escaped && char === mark) {
      position++
      break
    }
    escaped = !escaped && char === '\\'
  }

  if (char !== mark) {
    throw new Error('Unterminated String')
  }

  return text.slice(0, position)
}

/**
 * Gets a full template literal (enclosed in backticks)
 */
function getTemplateLiteral (text: string): string | null {
  let position = 0
  let char = undefined
  const mark = text[0]
  let escaped = false

  if (mark !== '`') {
    return null
  }

  while (position < text.length) {
    position++
    char = text[position]
    if (!escaped && char === mark) {
      position++
      break
    }
    escaped = !escaped && char === '\\'
  }

  if (char !== mark) {
    throw new Error('Unterminated template literal')
  }

  return text.slice(0, position)
}

/**
 * Gets the next literal (non-interpolation) portion of a text
 */
export function getTemplateLiteralLiteral (text: string): string | null {
  let position = 0
  let char = undefined
  const start = text[0]
  let escaped = false

  if (start === '`' || (start === '$' && text[1] === '{')) {
    return null
  }

  while (position < text.length) {
    position++
    char = text[position]
    if (!escaped && (char === '`' || (char === '$' && text[position + 1] === '{'))) {
      break
    }
    escaped = !escaped && char === '\\'
  }

  return text.slice(0, position)
}

const identifierStartRegex = /[$_\p{ID_Start}]|\\u\p{Hex_Digit}{4}|\\u\{0*(?:\p{Hex_Digit}{1,5}|10\p{Hex_Digit}{4})\}/u
const identifierContinueRegex = /[$\p{ID_Continue}\u200C\u200D]|\\u\p{Hex_Digit}{4}|\\u\{0*(?:\p{Hex_Digit}{1,5}|10\p{Hex_Digit}{4})\}/u
const identifierContinueRegexLoose = /[$\-\p{ID_Continue}\u200C\u200D]|\\u\p{Hex_Digit}{4}|\\u\{0*(?:\p{Hex_Digit}{1,5}|10\p{Hex_Digit}{4})\}/u

function makeGetIdentifier (
  identifierContinueRegex: RegExp
) {
  return function (text: string): string | null {
    let char = text[0]
    if (!identifierStartRegex.test(char)) {
      return null
    }
    let position = 1
    do {
      char = text[position]
      if (!identifierContinueRegex.test(char)) {
        break
      }
      position++
    } while (position < text.length)
    return text.slice(0, position)
  }
}

const numberRegex = /^(-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?))/
const looseNumberRegex = /^(NaN|-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?|Infinity))/

function getGetNumber (numberRegex: RegExp) {
  return function getNumber (text: string): string | null {
    return numberRegex.exec(text)?.[0] ?? null
  }
}

const looseIdentifierRule: Rule = text => {
  const value = makeGetIdentifier(identifierContinueRegexLoose)(text)
  if (value == null) {
    return null
  }

  return {
    type: 'Identifier',
    text: value
  }
}

const identifierRule: Rule = text => {
  const value = makeGetIdentifier(identifierContinueRegex)(text)
  if (value == null) {
    return null
  }

  return {
    type: 'Identifier',
    text: value
  }
}

function makeKeyWordRule (type: TokenType): Rule {
  return text => {
    if (!text.startsWith(type)) {
      return null
    }
    const prepends = text[type.length]
    if (prepends !== undefined && identifierContinueRegex.test(prepends)) {
      return null
    }
    return {
      type,
      text: type
    }
  }
}

const stringValueRule: Rule = text => {
  const value = getQuoted(text)
  if (value == null) {
    return null
  }
  return {
    type: 'StringValue',
    text: value
  }
}

const templateLiteralRule: Rule = text => {
  const value = getTemplateLiteral(text)
  if (value == null) {
    return null
  }
  return {
    type: 'TemplateLiteral',
    text: value
  }
}

const eofRule: Rule = text => {
  if (text.length > 0) {
    return null
  }
  return {
    type: 'EOF',
    text: ''
  }
}

const numberRule: Rule = text => {
  const value = getGetNumber(numberRegex)(text)
  if (value === null) {
    return null
  }
  return {
    type: 'Number',
    text: value
  }
}

const looseNumberRule: Rule = text => {
  const value = getGetNumber(looseNumberRegex)(text)
  if (value === null) {
    return null
  }
  return {
    type: 'Number',
    text: value
  }
}

/**
 * Will be processed highest precedence first
 */
export const rules: Rule[] = [
  eofRule,
  makePunctuationRule('=>'),
  makePunctuationRule('('),
  makePunctuationRule(')'),
  makePunctuationRule('{'),
  makePunctuationRule('}'),
  makePunctuationRule('['),
  makePunctuationRule(']'),
  makePunctuationRule('|'),
  makePunctuationRule('&'),
  makePunctuationRule('<'),
  makePunctuationRule('>'),
  makePunctuationRule(','),
  makePunctuationRule(';'),
  makePunctuationRule('*'),
  makePunctuationRule('?'),
  makePunctuationRule('!'),
  makePunctuationRule('='),
  makePunctuationRule(':'),
  makePunctuationRule('...'),
  makePunctuationRule('.'),
  makePunctuationRule('#'),
  makePunctuationRule('~'),
  makePunctuationRule('/'),
  makePunctuationRule('@'),
  makeKeyWordRule('undefined'),
  makeKeyWordRule('null'),
  makeKeyWordRule('function'),
  makeKeyWordRule('this'),
  makeKeyWordRule('new'),
  makeKeyWordRule('module'),
  makeKeyWordRule('event'),
  makeKeyWordRule('extends'),
  makeKeyWordRule('external'),
  makeKeyWordRule('infer'),
  makeKeyWordRule('typeof'),
  makeKeyWordRule('keyof'),
  makeKeyWordRule('readonly'),
  makeKeyWordRule('import'),
  makeKeyWordRule('is'),
  makeKeyWordRule('in'),
  makeKeyWordRule('asserts'),
  numberRule,
  identifierRule,
  stringValueRule,
  templateLiteralRule
]

export const looseRules: Rule[] = rules.toSpliced(
  -4, 2, looseNumberRule, looseIdentifierRule
)
