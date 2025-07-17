import { __esmMin } from "../rolldown-runtime.js";
import { LINEBREAKS, createRule, init_ast, init_create_rule, isHashbangComment } from "../utils.js";
import { escapeStringRegexp, init_escape_string_regexp } from "../vendor.js";
/**
* Escapes the control characters of a given string.
* @param s A string to escape.
* @returns An escaped string.
*/
function escape(s) {
	return `(?:${escapeStringRegexp(s)})`;
}
/**
* Escapes the control characters of a given string.
* And adds a repeat flag.
* @param s A string to escape.
* @returns An escaped string.
*/
function escapeAndRepeat(s) {
	return `${escape(s)}+`;
}
/**
* Parses `markers` option.
* If markers don't include `"*"`, this adds `"*"` to allow JSDoc comments.
* @param [markers] A marker list.
* @returns A marker list.
*/
function parseMarkersOption(markers) {
	if (!markers.includes("*")) return markers.concat("*");
	return markers;
}
/**
* Creates string pattern for exceptions.
* Generated pattern:
*
* 1. A space or an exception pattern sequence.
* @param exceptions An exception pattern list.
* @returns A regular expression string for exceptions.
*/
function createExceptionsPattern(exceptions) {
	let pattern = "";
	/**
	* A space or an exception pattern sequence.
	* []                 ==> "\s"
	* ["-"]              ==> "(?:\s|\-+$)"
	* ["-", "="]         ==> "(?:\s|(?:\-+|=+)$)"
	* ["-", "=", "--=="] ==> "(?:\s|(?:\-+|=+|(?:\-\-==)+)$)" ==> https://jex.im/regulex/#!embed=false&flags=&re=(%3F%3A%5Cs%7C(%3F%3A%5C-%2B%7C%3D%2B%7C(%3F%3A%5C-%5C-%3D%3D)%2B)%24)
	*/
	if (exceptions.length === 0) pattern += "\\s";
	else {
		pattern += "(?:\\s|";
		if (exceptions.length === 1) pattern += escapeAndRepeat(exceptions[0]);
		else {
			pattern += "(?:";
			pattern += exceptions.map(escapeAndRepeat).join("|");
			pattern += ")";
		}
		pattern += `(?:$|[${Array.from(LINEBREAKS).join("")}]))`;
	}
	return pattern;
}
/**
* Creates RegExp object for `always` mode.
* Generated pattern for beginning of comment:
*
* 1. First, a marker or nothing.
* 2. Next, a space or an exception pattern sequence.
* @param markers A marker list.
* @param exceptions An exception pattern list.
* @returns A RegExp object for the beginning of a comment in `always` mode.
*/
function createAlwaysStylePattern(markers, exceptions) {
	let pattern = "^";
	/**
	* A marker or nothing.
	* ["*"]            ==> "\*?"
	* ["*", "!"]       ==> "(?:\*|!)?"
	* ["*", "/", "!<"] ==> "(?:\*|\/|(?:!<))?" ==> https://jex.im/regulex/#!embed=false&flags=&re=(%3F%3A%5C*%7C%5C%2F%7C(%3F%3A!%3C))%3F
	*/
	if (markers.length === 1) pattern += escape(markers[0]);
	else {
		pattern += "(?:";
		pattern += markers.map(escape).join("|");
		pattern += ")";
	}
	pattern += "?";
	pattern += createExceptionsPattern(exceptions);
	return new RegExp(pattern, "u");
}
/**
* Creates RegExp object for `never` mode.
* Generated pattern for beginning of comment:
*
* 1. First, a marker or nothing (captured).
* 2. Next, a space or a tab.
* @param markers A marker list.
* @returns A RegExp object for `never` mode.
*/
function createNeverStylePattern(markers) {
	const pattern = `^(${markers.map(escape).join("|")})?[ \t]+`;
	return new RegExp(pattern, "u");
}
var spaced_comment_default;
var init_spaced_comment = __esmMin(() => {
	init_ast();
	init_create_rule();
	init_escape_string_regexp();
	spaced_comment_default = createRule({
		name: "spaced-comment",
		meta: {
			type: "layout",
			docs: { description: "Enforce consistent spacing after the `//` or `/*` in a comment" },
			fixable: "whitespace",
			schema: [{
				type: "string",
				enum: ["always", "never"]
			}, {
				type: "object",
				properties: {
					exceptions: {
						type: "array",
						items: { type: "string" }
					},
					markers: {
						type: "array",
						items: { type: "string" }
					},
					line: {
						type: "object",
						properties: {
							exceptions: {
								type: "array",
								items: { type: "string" }
							},
							markers: {
								type: "array",
								items: { type: "string" }
							}
						},
						additionalProperties: false
					},
					block: {
						type: "object",
						properties: {
							exceptions: {
								type: "array",
								items: { type: "string" }
							},
							markers: {
								type: "array",
								items: { type: "string" }
							},
							balanced: {
								type: "boolean",
								default: false
							}
						},
						additionalProperties: false
					}
				},
				additionalProperties: false
			}],
			messages: {
				unexpectedSpaceAfterMarker: "Unexpected space or tab after marker ({{refChar}}) in comment.",
				expectedExceptionAfter: "Expected exception block, space or tab after '{{refChar}}' in comment.",
				unexpectedSpaceBefore: "Unexpected space or tab before '*/' in comment.",
				unexpectedSpaceAfter: "Unexpected space or tab after '{{refChar}}' in comment.",
				expectedSpaceBefore: "Expected space or tab before '*/' in comment.",
				expectedSpaceAfter: "Expected space or tab after '{{refChar}}' in comment."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const requireSpace = context.options[0] !== "never";
			/**
			* Parse the second options.
			* If markers don't include `"*"`, it's added automatically for JSDoc
			* comments.
			*/
			const config = context.options[1] || {};
			const balanced = config.block && config.block.balanced;
			const styleRules = ["block", "line"].reduce((rule, type) => {
				const nodeType = type;
				const markers = parseMarkersOption(config[nodeType] && config[nodeType]?.markers || config.markers || []);
				const exceptions = config[nodeType] && config[nodeType]?.exceptions || config.exceptions || [];
				const endNeverPattern = "[ 	]+$";
				rule[nodeType] = {
					beginRegex: requireSpace ? createAlwaysStylePattern(markers, exceptions) : createNeverStylePattern(markers),
					endRegex: balanced && requireSpace ? new RegExp(`${createExceptionsPattern(exceptions)}$`, "u") : new RegExp(endNeverPattern, "u"),
					hasExceptions: exceptions.length > 0,
					captureMarker: new RegExp(`^(${markers.map(escape).join("|")})`, "u"),
					markers: new Set(markers)
				};
				return rule;
			}, {});
			/**
			* Reports a beginning spacing error with an appropriate message.
			* @param node A comment node to check.
			* @param messageId An error message to report.
			* @param match An array of match results for markers.
			* @param refChar Character used for reference in the error message.
			*/
			function reportBegin(node, messageId, match, refChar) {
				const type = node.type.toLowerCase();
				const commentIdentifier = type === "block" ? "/*" : "//";
				context.report({
					node,
					fix(fixer) {
						const start = node.range[0];
						let end = start + 2;
						if (requireSpace) {
							if (match) end += match[0].length;
							return fixer.insertTextAfterRange([start, end], " ");
						}
						if (match) end += match[0].length;
						return fixer.replaceTextRange([start, end], commentIdentifier + (match && match[1] ? match[1] : ""));
					},
					messageId,
					data: { refChar }
				});
			}
			/**
			* Reports an ending spacing error with an appropriate message.
			* @param node A comment node to check.
			* @param messageId An error message to report.
			* @param match An array of the matched whitespace characters.
			*/
			function reportEnd(node, messageId, match) {
				context.report({
					node,
					fix(fixer) {
						if (requireSpace) return fixer.insertTextAfterRange([node.range[0], node.range[1] - 2], " ");
						const end = node.range[1] - 2;
						let start = end;
						if (match) start -= match[0].length;
						return fixer.replaceTextRange([start, end], "");
					},
					messageId
				});
			}
			/**
			* Reports a given comment if it's invalid.
			* @param node a comment node to check.
			*/
			function checkCommentForSpace(node) {
				const type = node.type.toLowerCase();
				const rule = styleRules[type];
				const commentIdentifier = type === "block" ? "/*" : "//";
				if (node.value.length === 0 || rule.markers.has(node.value)) return;
				if (type === "line" && (node.value.startsWith("/ <reference") || node.value.startsWith("/ <amd"))) return;
				const beginMatch = rule.beginRegex.exec(node.value);
				const endMatch = rule.endRegex.exec(node.value);
				if (requireSpace) {
					if (!beginMatch) {
						const hasMarker = rule.captureMarker.exec(node.value);
						const marker = hasMarker ? commentIdentifier + hasMarker[0] : commentIdentifier;
						if (rule.hasExceptions) reportBegin(node, "expectedExceptionAfter", hasMarker, marker);
						else reportBegin(node, "expectedSpaceAfter", hasMarker, marker);
					}
					if (balanced && type === "block" && !endMatch) reportEnd(node, "expectedSpaceBefore", null);
				} else {
					if (beginMatch) if (!beginMatch[1]) reportBegin(node, "unexpectedSpaceAfter", beginMatch, commentIdentifier);
					else reportBegin(node, "unexpectedSpaceAfterMarker", beginMatch, beginMatch[1]);
					if (balanced && type === "block" && endMatch) reportEnd(node, "unexpectedSpaceBefore", endMatch);
				}
			}
			return { Program() {
				const comments = sourceCode.getAllComments();
				comments.filter((token) => !isHashbangComment(token)).forEach(checkCommentForSpace);
			} };
		}
	});
});
export { init_spaced_comment, spaced_comment_default };
