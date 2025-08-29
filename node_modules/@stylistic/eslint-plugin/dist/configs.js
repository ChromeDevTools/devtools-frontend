import { __esmMin } from "./rolldown-runtime.js";
import { createAllConfigs, init_configs_all, init_utils, warnDeprecation } from "./utils.js";
import { array_bracket_newline_default, init_array_bracket_newline } from "./rules/array-bracket-newline.js";
import { array_bracket_spacing_default, init_array_bracket_spacing } from "./rules/array-bracket-spacing.js";
import { array_element_newline_default, init_array_element_newline } from "./rules/array-element-newline.js";
import { arrow_parens_default, init_arrow_parens } from "./rules/arrow-parens.js";
import { arrow_spacing_default, init_arrow_spacing } from "./rules/arrow-spacing.js";
import { block_spacing_default, init_block_spacing } from "./rules/block-spacing.js";
import { brace_style_default, init_brace_style } from "./rules/brace-style.js";
import { comma_dangle_default, init_comma_dangle } from "./rules/comma-dangle.js";
import { comma_spacing_default, init_comma_spacing } from "./rules/comma-spacing.js";
import { comma_style_default, init_comma_style } from "./rules/comma-style.js";
import { computed_property_spacing_default, init_computed_property_spacing } from "./rules/computed-property-spacing.js";
import { curly_newline_default, init_curly_newline } from "./rules/curly-newline.js";
import { dot_location_default, init_dot_location } from "./rules/dot-location.js";
import { eol_last_default, init_eol_last } from "./rules/eol-last.js";
import { function_call_argument_newline_default, init_function_call_argument_newline } from "./rules/function-call-argument-newline.js";
import { function_call_spacing_default, init_function_call_spacing } from "./rules/function-call-spacing.js";
import { function_paren_newline_default, init_function_paren_newline } from "./rules/function-paren-newline.js";
import { generator_star_spacing_default, init_generator_star_spacing } from "./rules/generator-star-spacing.js";
import { implicit_arrow_linebreak_default, init_implicit_arrow_linebreak } from "./rules/implicit-arrow-linebreak.js";
import { indent_binary_ops_default, init_indent_binary_ops } from "./rules/indent-binary-ops.js";
import { indent_default, init_indent } from "./rules/indent.js";
import { init_jsx_child_element_spacing, jsx_child_element_spacing_default } from "./rules/jsx-child-element-spacing.js";
import { init_jsx_closing_bracket_location, jsx_closing_bracket_location_default } from "./rules/jsx-closing-bracket-location.js";
import { init_jsx_closing_tag_location, jsx_closing_tag_location_default } from "./rules/jsx-closing-tag-location.js";
import { init_jsx_curly_brace_presence, jsx_curly_brace_presence_default } from "./rules/jsx-curly-brace-presence.js";
import { init_jsx_curly_newline, jsx_curly_newline_default } from "./rules/jsx-curly-newline.js";
import { init_jsx_curly_spacing, jsx_curly_spacing_default } from "./rules/jsx-curly-spacing.js";
import { init_jsx_equals_spacing, jsx_equals_spacing_default } from "./rules/jsx-equals-spacing.js";
import { init_jsx_first_prop_new_line, jsx_first_prop_new_line_default } from "./rules/jsx-first-prop-new-line.js";
import { init_jsx_function_call_newline, jsx_function_call_newline_default } from "./rules/jsx-function-call-newline.js";
import { init_jsx_indent_props, jsx_indent_props_default } from "./rules/jsx-indent-props.js";
import { init_jsx_indent, jsx_indent_default } from "./rules/jsx-indent.js";
import { init_jsx_max_props_per_line, jsx_max_props_per_line_default } from "./rules/jsx-max-props-per-line.js";
import { init_jsx_newline, jsx_newline_default } from "./rules/jsx-newline.js";
import { init_jsx_one_expression_per_line, jsx_one_expression_per_line_default } from "./rules/jsx-one-expression-per-line.js";
import { init_jsx_pascal_case, jsx_pascal_case_default } from "./rules/jsx-pascal-case.js";
import { init_jsx_props_no_multi_spaces, jsx_props_no_multi_spaces_default } from "./rules/jsx-props-no-multi-spaces.js";
import { init_jsx_quotes, jsx_quotes_default } from "./rules/jsx-quotes.js";
import { init_jsx_self_closing_comp, jsx_self_closing_comp_default } from "./rules/jsx-self-closing-comp.js";
import { init_jsx_sort_props, jsx_sort_props_default } from "./rules/jsx-sort-props.js";
import { init_jsx_tag_spacing, jsx_tag_spacing_default } from "./rules/jsx-tag-spacing.js";
import { init_jsx_wrap_multilines, jsx_wrap_multilines_default } from "./rules/jsx-wrap-multilines.js";
import { init_key_spacing, key_spacing_default } from "./rules/key-spacing.js";
import { init_keyword_spacing, keyword_spacing_default } from "./rules/keyword-spacing.js";
import { init_line_comment_position, line_comment_position_default } from "./rules/line-comment-position.js";
import { init_linebreak_style, linebreak_style_default } from "./rules/linebreak-style.js";
import { init_lines_around_comment, lines_around_comment_default } from "./rules/lines-around-comment.js";
import { init_lines_between_class_members, lines_between_class_members_default } from "./rules/lines-between-class-members.js";
import { init_max_len, max_len_default } from "./rules/max-len.js";
import { init_max_statements_per_line, max_statements_per_line_default } from "./rules/max-statements-per-line.js";
import { init_member_delimiter_style, member_delimiter_style_default } from "./rules/member-delimiter-style.js";
import { init_multiline_comment_style, multiline_comment_style_default } from "./rules/multiline-comment-style.js";
import { init_multiline_ternary, multiline_ternary_default } from "./rules/multiline-ternary.js";
import { init_new_parens, new_parens_default } from "./rules/new-parens.js";
import { init_newline_per_chained_call, newline_per_chained_call_default } from "./rules/newline-per-chained-call.js";
import { init_no_confusing_arrow, no_confusing_arrow_default } from "./rules/no-confusing-arrow.js";
import { init_no_extra_parens, no_extra_parens_default } from "./rules/no-extra-parens.js";
import { init_no_extra_semi, no_extra_semi_default } from "./rules/no-extra-semi.js";
import { init_no_floating_decimal, no_floating_decimal_default } from "./rules/no-floating-decimal.js";
import { init_no_mixed_operators, no_mixed_operators_default } from "./rules/no-mixed-operators.js";
import { init_no_mixed_spaces_and_tabs, no_mixed_spaces_and_tabs_default } from "./rules/no-mixed-spaces-and-tabs.js";
import { init_no_multi_spaces, no_multi_spaces_default } from "./rules/no-multi-spaces.js";
import { init_no_multiple_empty_lines, no_multiple_empty_lines_default } from "./rules/no-multiple-empty-lines.js";
import { init_no_tabs, no_tabs_default } from "./rules/no-tabs.js";
import { init_no_trailing_spaces, no_trailing_spaces_default } from "./rules/no-trailing-spaces.js";
import { init_no_whitespace_before_property, no_whitespace_before_property_default } from "./rules/no-whitespace-before-property.js";
import { init_nonblock_statement_body_position, nonblock_statement_body_position_default } from "./rules/nonblock-statement-body-position.js";
import { init_object_curly_newline, object_curly_newline_default } from "./rules/object-curly-newline.js";
import { init_object_curly_spacing, object_curly_spacing_default } from "./rules/object-curly-spacing.js";
import { init_object_property_newline, object_property_newline_default } from "./rules/object-property-newline.js";
import { init_one_var_declaration_per_line, one_var_declaration_per_line_default } from "./rules/one-var-declaration-per-line.js";
import { init_operator_linebreak, operator_linebreak_default } from "./rules/operator-linebreak.js";
import { init_padded_blocks, padded_blocks_default } from "./rules/padded-blocks.js";
import { init_padding_line_between_statements, padding_line_between_statements_default } from "./rules/padding-line-between-statements.js";
import { init_quote_props, quote_props_default } from "./rules/quote-props.js";
import { init_quotes, quotes_default } from "./rules/quotes.js";
import { init_rest_spread_spacing, rest_spread_spacing_default } from "./rules/rest-spread-spacing.js";
import { init_semi_spacing, semi_spacing_default } from "./rules/semi-spacing.js";
import { init_semi_style, semi_style_default } from "./rules/semi-style.js";
import { init_semi, semi_default } from "./rules/semi.js";
import { init_space_before_blocks, space_before_blocks_default } from "./rules/space-before-blocks.js";
import { init_space_before_function_paren, space_before_function_paren_default } from "./rules/space-before-function-paren.js";
import { init_space_in_parens, space_in_parens_default } from "./rules/space-in-parens.js";
import { init_space_infix_ops, space_infix_ops_default } from "./rules/space-infix-ops.js";
import { init_space_unary_ops, space_unary_ops_default } from "./rules/space-unary-ops.js";
import { init_spaced_comment, spaced_comment_default } from "./rules/spaced-comment.js";
import { init_switch_colon_spacing, switch_colon_spacing_default } from "./rules/switch-colon-spacing.js";
import { init_template_curly_spacing, template_curly_spacing_default } from "./rules/template-curly-spacing.js";
import { init_template_tag_spacing, template_tag_spacing_default } from "./rules/template-tag-spacing.js";
import { init_type_annotation_spacing, type_annotation_spacing_default } from "./rules/type-annotation-spacing.js";
import { init_type_generic_spacing, type_generic_spacing_default } from "./rules/type-generic-spacing.js";
import { init_type_named_tuple_spacing, type_named_tuple_spacing_default } from "./rules/type-named-tuple-spacing.js";
import { init_wrap_iife, wrap_iife_default } from "./rules/wrap-iife.js";
import { init_wrap_regex, wrap_regex_default } from "./rules/wrap-regex.js";
import { init_yield_star_spacing, yield_star_spacing_default } from "./rules/yield-star-spacing.js";
var rules_default;
var init_rules = __esmMin(() => {
	init_array_bracket_newline();
	init_array_bracket_spacing();
	init_array_element_newline();
	init_arrow_parens();
	init_arrow_spacing();
	init_block_spacing();
	init_brace_style();
	init_comma_dangle();
	init_comma_spacing();
	init_comma_style();
	init_computed_property_spacing();
	init_curly_newline();
	init_dot_location();
	init_eol_last();
	init_function_call_argument_newline();
	init_function_call_spacing();
	init_function_paren_newline();
	init_generator_star_spacing();
	init_implicit_arrow_linebreak();
	init_indent_binary_ops();
	init_indent();
	init_jsx_child_element_spacing();
	init_jsx_closing_bracket_location();
	init_jsx_closing_tag_location();
	init_jsx_curly_brace_presence();
	init_jsx_curly_newline();
	init_jsx_curly_spacing();
	init_jsx_equals_spacing();
	init_jsx_first_prop_new_line();
	init_jsx_function_call_newline();
	init_jsx_indent_props();
	init_jsx_indent();
	init_jsx_max_props_per_line();
	init_jsx_newline();
	init_jsx_one_expression_per_line();
	init_jsx_pascal_case();
	init_jsx_props_no_multi_spaces();
	init_jsx_quotes();
	init_jsx_self_closing_comp();
	init_jsx_sort_props();
	init_jsx_tag_spacing();
	init_jsx_wrap_multilines();
	init_key_spacing();
	init_keyword_spacing();
	init_line_comment_position();
	init_linebreak_style();
	init_lines_around_comment();
	init_lines_between_class_members();
	init_max_len();
	init_max_statements_per_line();
	init_member_delimiter_style();
	init_multiline_comment_style();
	init_multiline_ternary();
	init_new_parens();
	init_newline_per_chained_call();
	init_no_confusing_arrow();
	init_no_extra_parens();
	init_no_extra_semi();
	init_no_floating_decimal();
	init_no_mixed_operators();
	init_no_mixed_spaces_and_tabs();
	init_no_multi_spaces();
	init_no_multiple_empty_lines();
	init_no_tabs();
	init_no_trailing_spaces();
	init_no_whitespace_before_property();
	init_nonblock_statement_body_position();
	init_object_curly_newline();
	init_object_curly_spacing();
	init_object_property_newline();
	init_one_var_declaration_per_line();
	init_operator_linebreak();
	init_padded_blocks();
	init_padding_line_between_statements();
	init_quote_props();
	init_quotes();
	init_rest_spread_spacing();
	init_semi_spacing();
	init_semi_style();
	init_semi();
	init_space_before_blocks();
	init_space_before_function_paren();
	init_space_in_parens();
	init_space_infix_ops();
	init_space_unary_ops();
	init_spaced_comment();
	init_switch_colon_spacing();
	init_template_curly_spacing();
	init_template_tag_spacing();
	init_type_annotation_spacing();
	init_type_generic_spacing();
	init_type_named_tuple_spacing();
	init_wrap_iife();
	init_wrap_regex();
	init_yield_star_spacing();
	rules_default = {
		"array-bracket-newline": array_bracket_newline_default,
		"array-bracket-spacing": array_bracket_spacing_default,
		"array-element-newline": array_element_newline_default,
		"arrow-parens": arrow_parens_default,
		"arrow-spacing": arrow_spacing_default,
		"block-spacing": block_spacing_default,
		"brace-style": brace_style_default,
		"comma-dangle": comma_dangle_default,
		"comma-spacing": comma_spacing_default,
		"comma-style": comma_style_default,
		"computed-property-spacing": computed_property_spacing_default,
		"curly-newline": curly_newline_default,
		"dot-location": dot_location_default,
		"eol-last": eol_last_default,
		"function-call-argument-newline": function_call_argument_newline_default,
		"function-call-spacing": function_call_spacing_default,
		"function-paren-newline": function_paren_newline_default,
		"generator-star-spacing": generator_star_spacing_default,
		"implicit-arrow-linebreak": implicit_arrow_linebreak_default,
		"indent": indent_default,
		"indent-binary-ops": indent_binary_ops_default,
		"jsx-child-element-spacing": jsx_child_element_spacing_default,
		"jsx-closing-bracket-location": jsx_closing_bracket_location_default,
		"jsx-closing-tag-location": jsx_closing_tag_location_default,
		"jsx-curly-brace-presence": jsx_curly_brace_presence_default,
		"jsx-curly-newline": jsx_curly_newline_default,
		"jsx-curly-spacing": jsx_curly_spacing_default,
		"jsx-equals-spacing": jsx_equals_spacing_default,
		"jsx-first-prop-new-line": jsx_first_prop_new_line_default,
		"jsx-function-call-newline": jsx_function_call_newline_default,
		"jsx-indent": jsx_indent_default,
		"jsx-indent-props": jsx_indent_props_default,
		"jsx-max-props-per-line": jsx_max_props_per_line_default,
		"jsx-newline": jsx_newline_default,
		"jsx-one-expression-per-line": jsx_one_expression_per_line_default,
		"jsx-pascal-case": jsx_pascal_case_default,
		"jsx-props-no-multi-spaces": jsx_props_no_multi_spaces_default,
		"jsx-quotes": jsx_quotes_default,
		"jsx-self-closing-comp": jsx_self_closing_comp_default,
		"jsx-sort-props": jsx_sort_props_default,
		"jsx-tag-spacing": jsx_tag_spacing_default,
		"jsx-wrap-multilines": jsx_wrap_multilines_default,
		"key-spacing": key_spacing_default,
		"keyword-spacing": keyword_spacing_default,
		"line-comment-position": line_comment_position_default,
		"linebreak-style": linebreak_style_default,
		"lines-around-comment": lines_around_comment_default,
		"lines-between-class-members": lines_between_class_members_default,
		"max-len": max_len_default,
		"max-statements-per-line": max_statements_per_line_default,
		"member-delimiter-style": member_delimiter_style_default,
		"multiline-comment-style": multiline_comment_style_default,
		"multiline-ternary": multiline_ternary_default,
		"new-parens": new_parens_default,
		"newline-per-chained-call": newline_per_chained_call_default,
		"no-confusing-arrow": no_confusing_arrow_default,
		"no-extra-parens": no_extra_parens_default,
		"no-extra-semi": no_extra_semi_default,
		"no-floating-decimal": no_floating_decimal_default,
		"no-mixed-operators": no_mixed_operators_default,
		"no-mixed-spaces-and-tabs": no_mixed_spaces_and_tabs_default,
		"no-multi-spaces": no_multi_spaces_default,
		"no-multiple-empty-lines": no_multiple_empty_lines_default,
		"no-tabs": no_tabs_default,
		"no-trailing-spaces": no_trailing_spaces_default,
		"no-whitespace-before-property": no_whitespace_before_property_default,
		"nonblock-statement-body-position": nonblock_statement_body_position_default,
		"object-curly-newline": object_curly_newline_default,
		"object-curly-spacing": object_curly_spacing_default,
		"object-property-newline": object_property_newline_default,
		"one-var-declaration-per-line": one_var_declaration_per_line_default,
		"operator-linebreak": operator_linebreak_default,
		"padded-blocks": padded_blocks_default,
		"padding-line-between-statements": padding_line_between_statements_default,
		"quote-props": quote_props_default,
		"quotes": quotes_default,
		"rest-spread-spacing": rest_spread_spacing_default,
		"semi": semi_default,
		"semi-spacing": semi_spacing_default,
		"semi-style": semi_style_default,
		"space-before-blocks": space_before_blocks_default,
		"space-before-function-paren": space_before_function_paren_default,
		"space-in-parens": space_in_parens_default,
		"space-infix-ops": space_infix_ops_default,
		"space-unary-ops": space_unary_ops_default,
		"spaced-comment": spaced_comment_default,
		"switch-colon-spacing": switch_colon_spacing_default,
		"template-curly-spacing": template_curly_spacing_default,
		"template-tag-spacing": template_tag_spacing_default,
		"type-annotation-spacing": type_annotation_spacing_default,
		"type-generic-spacing": type_generic_spacing_default,
		"type-named-tuple-spacing": type_named_tuple_spacing_default,
		"wrap-iife": wrap_iife_default,
		"wrap-regex": wrap_regex_default,
		"yield-star-spacing": yield_star_spacing_default
	};
});
var plugin, plugin_default;
var init_plugin = __esmMin(() => {
	init_rules();
	plugin = { rules: rules_default };
	plugin_default = plugin;
});
function customize(options = {}) {
	const { arrowParens = false, blockSpacing = true, braceStyle = "stroustrup", commaDangle = "always-multiline", indent = 2, jsx = true, pluginName = "@stylistic", quoteProps = "consistent-as-needed", quotes = "single", semi = false, severity = "error" } = options;
	let rules = {
		"@stylistic/array-bracket-spacing": [severity, "never"],
		"@stylistic/arrow-parens": [
			severity,
			arrowParens ? "always" : "as-needed",
			{ requireForBlockBody: true }
		],
		"@stylistic/arrow-spacing": [severity, {
			after: true,
			before: true
		}],
		"@stylistic/block-spacing": [severity, blockSpacing ? "always" : "never"],
		"@stylistic/brace-style": [
			severity,
			braceStyle,
			{ allowSingleLine: true }
		],
		"@stylistic/comma-dangle": [severity, commaDangle],
		"@stylistic/comma-spacing": [severity, {
			after: true,
			before: false
		}],
		"@stylistic/comma-style": [severity, "last"],
		"@stylistic/computed-property-spacing": [
			severity,
			"never",
			{ enforceForClassMembers: true }
		],
		"@stylistic/dot-location": [severity, "property"],
		"@stylistic/eol-last": severity,
		"@stylistic/generator-star-spacing": [severity, {
			after: true,
			before: false
		}],
		"@stylistic/indent": [
			severity,
			indent,
			{
				ArrayExpression: 1,
				CallExpression: { arguments: 1 },
				flatTernaryExpressions: false,
				FunctionDeclaration: {
					body: 1,
					parameters: 1,
					returnType: 1
				},
				FunctionExpression: {
					body: 1,
					parameters: 1,
					returnType: 1
				},
				ignoreComments: false,
				ignoredNodes: [
					"TSUnionType",
					"TSIntersectionType",
					"TSTypeParameterInstantiation",
					"FunctionExpression > .params[decorators.length > 0]",
					"FunctionExpression > .params > :matches(Decorator, :not(:first-child))"
				],
				ImportDeclaration: 1,
				MemberExpression: 1,
				ObjectExpression: 1,
				offsetTernaryExpressions: true,
				outerIIFEBody: 1,
				SwitchCase: 1,
				tabLength: indent === "tab" ? 4 : indent,
				VariableDeclarator: 1
			}
		],
		"@stylistic/indent-binary-ops": [severity, indent],
		"@stylistic/key-spacing": [severity, {
			afterColon: true,
			beforeColon: false
		}],
		"@stylistic/keyword-spacing": [severity, {
			after: true,
			before: true
		}],
		"@stylistic/lines-between-class-members": [
			severity,
			"always",
			{ exceptAfterSingleLine: true }
		],
		"@stylistic/max-statements-per-line": [severity, { max: 1 }],
		"@stylistic/member-delimiter-style": [severity, {
			multiline: {
				delimiter: semi ? "semi" : "none",
				requireLast: semi
			},
			multilineDetection: "brackets",
			overrides: { interface: { multiline: {
				delimiter: semi ? "semi" : "none",
				requireLast: semi
			} } },
			singleline: { delimiter: semi ? "semi" : "comma" }
		}],
		"@stylistic/multiline-ternary": [severity, "always-multiline"],
		"@stylistic/new-parens": severity,
		"@stylistic/no-extra-parens": [severity, "functions"],
		"@stylistic/no-floating-decimal": severity,
		"@stylistic/no-mixed-operators": [severity, {
			allowSamePrecedence: true,
			groups: [
				[
					"==",
					"!=",
					"===",
					"!==",
					">",
					">=",
					"<",
					"<="
				],
				["&&", "||"],
				["in", "instanceof"]
			]
		}],
		"@stylistic/no-mixed-spaces-and-tabs": severity,
		"@stylistic/no-multi-spaces": severity,
		"@stylistic/no-multiple-empty-lines": [severity, {
			max: 1,
			maxBOF: 0,
			maxEOF: 0
		}],
		"@stylistic/no-tabs": indent === "tab" ? "off" : severity,
		"@stylistic/no-trailing-spaces": severity,
		"@stylistic/no-whitespace-before-property": severity,
		"@stylistic/object-curly-spacing": [severity, "always"],
		"@stylistic/operator-linebreak": [severity, "before"],
		"@stylistic/padded-blocks": [severity, {
			blocks: "never",
			classes: "never",
			switches: "never"
		}],
		"@stylistic/quote-props": [severity, quoteProps],
		"@stylistic/quotes": [
			severity,
			quotes,
			{
				allowTemplateLiterals: "always",
				avoidEscape: false
			}
		],
		"@stylistic/rest-spread-spacing": [severity, "never"],
		"@stylistic/semi": [severity, semi ? "always" : "never"],
		"@stylistic/semi-spacing": [severity, {
			after: true,
			before: false
		}],
		"@stylistic/space-before-blocks": [severity, "always"],
		"@stylistic/space-before-function-paren": [severity, {
			anonymous: "always",
			asyncArrow: "always",
			named: "never"
		}],
		"@stylistic/space-in-parens": [severity, "never"],
		"@stylistic/space-infix-ops": severity,
		"@stylistic/space-unary-ops": [severity, {
			nonwords: false,
			words: true
		}],
		"@stylistic/spaced-comment": [
			severity,
			"always",
			{
				block: {
					balanced: true,
					exceptions: ["*"],
					markers: ["!"]
				},
				line: {
					exceptions: ["/", "#"],
					markers: ["/"]
				}
			}
		],
		"@stylistic/template-curly-spacing": severity,
		"@stylistic/template-tag-spacing": [severity, "never"],
		"@stylistic/type-annotation-spacing": [severity, {}],
		"@stylistic/type-generic-spacing": severity,
		"@stylistic/type-named-tuple-spacing": severity,
		"@stylistic/wrap-iife": [
			severity,
			"any",
			{ functionPrototypeMethods: true }
		],
		"@stylistic/yield-star-spacing": [severity, {
			after: true,
			before: false
		}],
		...jsx ? {
			"@stylistic/jsx-closing-bracket-location": severity,
			"@stylistic/jsx-closing-tag-location": severity,
			"@stylistic/jsx-curly-brace-presence": [severity, { propElementValues: "always" }],
			"@stylistic/jsx-curly-newline": severity,
			"@stylistic/jsx-curly-spacing": [severity, "never"],
			"@stylistic/jsx-equals-spacing": severity,
			"@stylistic/jsx-first-prop-new-line": severity,
			"@stylistic/jsx-function-call-newline": [severity, "multiline"],
			"@stylistic/jsx-indent-props": [severity, indent],
			"@stylistic/jsx-max-props-per-line": [severity, {
				maximum: 1,
				when: "multiline"
			}],
			"@stylistic/jsx-one-expression-per-line": [severity, { allow: "single-child" }],
			"@stylistic/jsx-quotes": severity,
			"@stylistic/jsx-tag-spacing": [severity, {
				afterOpening: "never",
				beforeClosing: "never",
				beforeSelfClosing: "always",
				closingSlash: "never"
			}],
			"@stylistic/jsx-wrap-multilines": [severity, {
				arrow: "parens-new-line",
				assignment: "parens-new-line",
				condition: "parens-new-line",
				declaration: "parens-new-line",
				logical: "parens-new-line",
				prop: "parens-new-line",
				propertyValue: "parens-new-line",
				return: "parens-new-line"
			}]
		} : {}
	};
	if (pluginName !== "@stylistic") {
		const regex = /^@stylistic\//;
		rules = Object.fromEntries(Object.entries(rules).map(([ruleName, ruleConfig]) => [ruleName.replace(regex, `${pluginName}/`), ruleConfig]));
	}
	return {
		plugins: { [pluginName]: plugin_default },
		rules
	};
}
var init_customize = __esmMin(() => {
	init_plugin();
});
var config, disable_legacy_default;
var init_disable_legacy = __esmMin(() => {
	config = { rules: {
		"array-bracket-newline": 0,
		"array-bracket-spacing": 0,
		"array-element-newline": 0,
		"arrow-parens": 0,
		"arrow-spacing": 0,
		"block-spacing": 0,
		"brace-style": 0,
		"comma-dangle": 0,
		"comma-spacing": 0,
		"comma-style": 0,
		"computed-property-spacing": 0,
		"dot-location": 0,
		"eol-last": 0,
		"func-call-spacing": 0,
		"function-call-argument-newline": 0,
		"function-paren-newline": 0,
		"generator-star-spacing": 0,
		"implicit-arrow-linebreak": 0,
		"indent": 0,
		"jsx-quotes": 0,
		"key-spacing": 0,
		"keyword-spacing": 0,
		"linebreak-style": 0,
		"lines-around-comment": 0,
		"lines-between-class-members": 0,
		"max-len": 0,
		"max-statements-per-line": 0,
		"multiline-ternary": 0,
		"new-parens": 0,
		"newline-per-chained-call": 0,
		"no-confusing-arrow": 0,
		"no-extra-parens": 0,
		"no-extra-semi": 0,
		"no-floating-decimal": 0,
		"no-mixed-operators": 0,
		"no-mixed-spaces-and-tabs": 0,
		"no-multi-spaces": 0,
		"no-multiple-empty-lines": 0,
		"no-tabs": 0,
		"no-trailing-spaces": 0,
		"no-whitespace-before-property": 0,
		"nonblock-statement-body-position": 0,
		"object-curly-newline": 0,
		"object-curly-spacing": 0,
		"object-property-newline": 0,
		"one-var-declaration-per-line": 0,
		"operator-linebreak": 0,
		"padded-blocks": 0,
		"padding-line-between-statements": 0,
		"quote-props": 0,
		"quotes": 0,
		"rest-spread-spacing": 0,
		"semi": 0,
		"semi-spacing": 0,
		"semi-style": 0,
		"space-before-blocks": 0,
		"space-before-function-paren": 0,
		"space-in-parens": 0,
		"space-infix-ops": 0,
		"space-unary-ops": 0,
		"spaced-comment": 0,
		"switch-colon-spacing": 0,
		"template-curly-spacing": 0,
		"template-tag-spacing": 0,
		"wrap-iife": 0,
		"wrap-regex": 0,
		"yield-star-spacing": 0,
		"@typescript-eslint/block-spacing": 0,
		"@typescript-eslint/brace-style": 0,
		"@typescript-eslint/comma-dangle": 0,
		"@typescript-eslint/comma-spacing": 0,
		"@typescript-eslint/func-call-spacing": 0,
		"@typescript-eslint/indent": 0,
		"@typescript-eslint/key-spacing": 0,
		"@typescript-eslint/keyword-spacing": 0,
		"@typescript-eslint/lines-around-comment": 0,
		"@typescript-eslint/lines-between-class-members": 0,
		"@typescript-eslint/member-delimiter-style": 0,
		"@typescript-eslint/no-extra-parens": 0,
		"@typescript-eslint/no-extra-semi": 0,
		"@typescript-eslint/object-curly-spacing": 0,
		"@typescript-eslint/padding-line-between-statements": 0,
		"@typescript-eslint/quotes": 0,
		"@typescript-eslint/semi": 0,
		"@typescript-eslint/space-before-blocks": 0,
		"@typescript-eslint/space-before-function-paren": 0,
		"@typescript-eslint/space-infix-ops": 0,
		"@typescript-eslint/type-annotation-spacing": 0,
		"react/jsx-child-element-spacing": 0,
		"react/jsx-closing-bracket-location": 0,
		"react/jsx-closing-tag-location": 0,
		"react/jsx-curly-brace-presence": 0,
		"react/jsx-curly-newline": 0,
		"react/jsx-curly-spacing": 0,
		"react/jsx-equals-spacing": 0,
		"react/jsx-first-prop-new-line": 0,
		"react/jsx-indent": 0,
		"react/jsx-indent-props": 0,
		"react/jsx-max-props-per-line": 0,
		"react/jsx-newline": 0,
		"react/jsx-one-expression-per-line": 0,
		"react/jsx-props-no-multi-spaces": 0,
		"react/self-closing-comp": 0,
		"react/jsx-sort-props": 0,
		"react/jsx-tag-spacing": 0,
		"react/jsx-wrap-multilines": 0
	} };
	disable_legacy_default = config;
});
var allConfigsIgnore, all, recommended, configs;
var init_configs = __esmMin(() => {
	init_utils();
	init_configs_all();
	init_plugin();
	init_customize();
	init_disable_legacy();
	allConfigsIgnore = [/^jsx-/, /^curly-newline$/];
	all = /* @__PURE__ */ createAllConfigs(plugin_default, "@stylistic", (name) => !allConfigsIgnore.some((re) => re.test(name)));
	recommended = /* @__PURE__ */ customize();
	configs = new Proxy({
		"disable-legacy": disable_legacy_default,
		"customize": customize,
		"recommended": recommended,
		"recommended-flat": recommended,
		"all": all,
		"all-flat": all
	}, { get(target, p, receiver) {
		const prop = p.toString();
		if (prop.endsWith("-flat")) warnDeprecation(`config("${prop}")`, `"${prop.replace("-flat", "")}"`);
		return Reflect.get(target, p, receiver);
	} });
});
export { configs, init_configs, init_plugin, plugin_default };
