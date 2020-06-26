export const Acorn = {};
/**
 * @constructor
 */
Acorn.Tokenizer = function() {
  /** @type {function():!Token} */
  this.getToken;
};

/**
 * @constructor
 */
Acorn.TokenType = function() {
  /** @type {string} */
  this.label;
  /** @type {(string|undefined)} */
  this.keyword;
};

/**
 * @typedef {{type: !Acorn.TokenType, value: string, start: number, end: number}}
 */
export let Token;

/**
 * @typedef {{type: string, value: string, start: number, end: number}}
 */
export let Comment;

/**
 * @param {string} text
 * @param {Object.<string, boolean>} options
 * @return {!ESTree.Node}
 */
export function parse(text, options) {}

/**
 * @param {string} text
 * @param {Object.<string, boolean>} options
 * @return {!Acorn.Tokenizer}
 */
export function tokenizer(text, options) {}

export class Parser {
  /**
   * @param {...Object} plugins
   * @return {Object}
   */
  static extend(plugins) {}
}

export const tokTypes = {
  _true: new Acorn.TokenType(),
  _false: new Acorn.TokenType(),
  _null: new Acorn.TokenType(),
  num: new Acorn.TokenType(),
  regexp: new Acorn.TokenType(),
  string: new Acorn.TokenType(),
  name: new Acorn.TokenType(),
  eof: new Acorn.TokenType()
};
