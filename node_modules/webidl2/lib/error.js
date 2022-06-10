/**
 * @param {string} text
 */
function lastLine(text) {
  const splitted = text.split("\n");
  return splitted[splitted.length - 1];
}

function appendIfExist(base, target) {
  let result = base;
  if (target) {
    result += ` ${target}`;
  }
  return result;
}

function contextAsText(node) {
  const hierarchy = [node];
  while (node && node.parent) {
    const { parent } = node;
    hierarchy.unshift(parent);
    node = parent;
  }
  return hierarchy.map((n) => appendIfExist(n.type, n.name)).join(" -> ");
}

/**
 * @typedef {object} WebIDL2ErrorOptions
 * @property {"error" | "warning"} [level]
 * @property {Function} [autofix]
 * @property {string} [ruleName]
 *
 * @typedef {ReturnType<typeof error>} WebIDLErrorData
 *
 * @param {string} message error message
 * @param {*} position
 * @param {*} current
 * @param {*} message
 * @param {"Syntax" | "Validation"} kind error type
 * @param {WebIDL2ErrorOptions=} options
 */
function error(
  source,
  position,
  current,
  message,
  kind,
  { level = "error", autofix, ruleName } = {}
) {
  /**
   * @param {number} count
   */
  function sliceTokens(count) {
    return count > 0
      ? source.slice(position, position + count)
      : source.slice(Math.max(position + count, 0), position);
  }

  /**
   * @param {import("./tokeniser.js").Token[]} inputs
   * @param {object} [options]
   * @param {boolean} [options.precedes]
   * @returns
   */
  function tokensToText(inputs, { precedes } = {}) {
    const text = inputs.map((t) => t.trivia + t.value).join("");
    const nextToken = source[position];
    if (nextToken.type === "eof") {
      return text;
    }
    if (precedes) {
      return text + nextToken.trivia;
    }
    return text.slice(nextToken.trivia.length);
  }

  const maxTokens = 5; // arbitrary but works well enough
  const line =
    source[position].type !== "eof"
      ? source[position].line
      : source.length > 1
      ? source[position - 1].line
      : 1;

  const precedingLastLine = lastLine(
    tokensToText(sliceTokens(-maxTokens), { precedes: true })
  );

  const subsequentTokens = sliceTokens(maxTokens);
  const subsequentText = tokensToText(subsequentTokens);
  const subsequentFirstLine = subsequentText.split("\n")[0];

  const spaced = " ".repeat(precedingLastLine.length) + "^";
  const sourceContext = precedingLastLine + subsequentFirstLine + "\n" + spaced;

  const contextType = kind === "Syntax" ? "since" : "inside";
  const inSourceName = source.name ? ` in ${source.name}` : "";
  const grammaticalContext =
    current && current.name
      ? `, ${contextType} \`${current.partial ? "partial " : ""}${contextAsText(
          current
        )}\``
      : "";
  const context = `${kind} error at line ${line}${inSourceName}${grammaticalContext}:\n${sourceContext}`;
  return {
    message: `${context} ${message}`,
    bareMessage: message,
    context,
    line,
    sourceName: source.name,
    level,
    ruleName,
    autofix,
    input: subsequentText,
    tokens: subsequentTokens,
  };
}

/**
 * @param {string} message error message
 */
export function syntaxError(source, position, current, message) {
  return error(source, position, current, message, "Syntax");
}

/**
 * @param {string} message error message
 * @param {WebIDL2ErrorOptions} [options]
 */
export function validationError(
  token,
  current,
  ruleName,
  message,
  options = {}
) {
  options.ruleName = ruleName;
  return error(
    current.source,
    token.index,
    current,
    message,
    "Validation",
    options
  );
}
