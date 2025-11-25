import { Parser } from './Parser.js'
import {
  jsdocGrammar, jsdocNamePathGrammar,
  jsdocNamePathSpecialGrammar, jsdocNameGrammar
} from './grammars/jsdocGrammar.js'
import {
  closureGrammar, closureNamePathGrammar,
  closureNamePathSpecialGrammar, closureNameGrammar
} from './grammars/closureGrammar.js'
import {
  typescriptGrammar, typescriptNamePathGrammar,
  typescriptNamePathSpecialGrammar, typescriptNameGrammar
} from './grammars/typescriptGrammar.js'
import { assertResultIsNotReservedWord } from './assertTypes.js'
import type { RootResult } from './result/RootResult.js'
import { Lexer } from './lexer/Lexer.js'
import { rules, looseRules } from './lexer/LexerRules.js'

export type ParseMode = 'closure' | 'jsdoc' | 'typescript'

/**
 * This function parses the given expression in the given mode and produces a {@link RootResult}.
 * @param expression
 * @param mode
 */
export function parse (
  expression: string, mode: ParseMode,
  {
    module = true,
    strictMode = true,
    asyncFunctionBody = true,
    classContext = false,
    computedPropertyParser
  }: {
    module?: boolean,
    strictMode?: boolean,
    asyncFunctionBody?: boolean,
    classContext?: boolean,
    computedPropertyParser?: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Actual API
      text: string, options?: any
    ) => unknown
  } = {}
): RootResult {
  let parser: Parser
  switch (mode) {
    case 'closure':
      parser = new Parser(closureGrammar, Lexer.create(looseRules, expression), undefined, {
        module,
        strictMode,
        asyncFunctionBody,
        classContext
      })
      break
    case 'jsdoc':
      parser = new Parser(jsdocGrammar, Lexer.create(looseRules, expression), undefined, {
        module,
        strictMode,
        asyncFunctionBody,
        classContext
      })
      break
    case 'typescript':
      parser = new Parser(
        typescriptGrammar,
        Lexer.create(rules, expression),
        undefined,
        {
          module,
          strictMode,
          asyncFunctionBody,
          classContext,
          externalParsers: {
            computedPropertyParser
          }
        }
      )
      break
  }

  const result = parser.parse()

  return assertResultIsNotReservedWord(parser, result)
}

/**
 * This function tries to parse the given expression in multiple modes and returns the first successful
 * {@link RootResult}. By default it tries `'typescript'`, `'closure'` and `'jsdoc'` in this order. If
 * no mode was successful it throws the error that was produced by the last parsing attempt.
 * @param expression
 * @param modes
 */
export function tryParse (
  expression: string,
  modes: ParseMode[] = ['typescript', 'closure', 'jsdoc'],
  {
    module = true,
    strictMode = true,
    asyncFunctionBody = true,
    classContext = false,
  }: {
    module?: boolean,
    strictMode?: boolean,
    asyncFunctionBody?: boolean,
    classContext?: boolean,
  } = {}
): RootResult {
  let error
  for (const mode of modes) {
    try {
      return parse(expression, mode, {
        module,
        strictMode,
        asyncFunctionBody,
        classContext
      })
    } catch (e) {
      error = e
    }
  }
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Ok
  throw error
}


/**
 * This function parses the given expression in the given mode and produces a name path.
 * @param expression
 * @param mode
 */
export function parseNamePath (
  expression: string, mode: ParseMode, {
    includeSpecial = false
  }: {
    includeSpecial?: boolean
  } = {}
): RootResult {
  switch (mode) {
    case 'closure':
      return (new Parser(
        includeSpecial ? closureNamePathSpecialGrammar : closureNamePathGrammar,
        Lexer.create(looseRules, expression)
      )).parse()
    case 'jsdoc':
      return (new Parser(
        includeSpecial ? jsdocNamePathSpecialGrammar : jsdocNamePathGrammar,
        Lexer.create(looseRules, expression)
      )).parse()
    case 'typescript': {
      return (new Parser(
        includeSpecial ? typescriptNamePathSpecialGrammar : typescriptNamePathGrammar,
        Lexer.create(rules, expression)
      )).parse()
    }
  }
}

/**
 * This function parses the given expression in the given mode and produces a name.
 * @param expression
 * @param mode
 */
export function parseName (
  expression: string, mode: ParseMode
): RootResult {
  switch (mode) {
    case 'closure':
      return (new Parser(closureNameGrammar, Lexer.create(looseRules, expression))).parse()
    case 'jsdoc':
      return (new Parser(jsdocNameGrammar, Lexer.create(looseRules, expression))).parse()
    case 'typescript':
      return (new Parser(
        typescriptNameGrammar,
        Lexer.create(rules, expression)
      )).parse()
  }
}
