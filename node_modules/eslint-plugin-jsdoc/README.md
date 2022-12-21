<a name="user-content-eslint-plugin-jsdoc"></a>
<a name="eslint-plugin-jsdoc"></a>
# eslint-plugin-jsdoc

[![NPM version](https://img.shields.io/npm/v/eslint-plugin-jsdoc.svg?style=flat-square)](https://www.npmjs.org/package/eslint-plugin-jsdoc)
[![Travis build status](https://img.shields.io/travis/gajus/eslint-plugin-jsdoc/master.svg?style=flat-square)](https://travis-ci.org/gajus/eslint-plugin-jsdoc)
[![js-canonical-style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Discord Chat](https://img.shields.io/badge/chat-on%20disord-green.svg?logo=discord)](https://discord.gg/kFFy3nc)

JSDoc linting rules for ESLint.

* [eslint-plugin-jsdoc](#user-content-eslint-plugin-jsdoc)
    * [Installation](#user-content-eslint-plugin-jsdoc-installation)
    * [Configuration](#user-content-eslint-plugin-jsdoc-configuration)
    * [Options](#user-content-eslint-plugin-jsdoc-options)
    * [Settings](#user-content-eslint-plugin-jsdoc-settings)
        * [Allow tags (`@private` or `@internal`) to disable rules for that comment block](#user-content-eslint-plugin-jsdoc-settings-allow-tags-private-or-internal-to-disable-rules-for-that-comment-block)
        * [`maxLines` and `minLines`](#user-content-eslint-plugin-jsdoc-settings-maxlines-and-minlines)
        * [Mode](#user-content-eslint-plugin-jsdoc-settings-mode)
        * [Alias Preference](#user-content-eslint-plugin-jsdoc-settings-alias-preference)
        * [`@override`/`@augments`/`@extends`/`@implements`/`@ignore` Without Accompanying `@param`/`@description`/`@example`/`@returns`/`@throws`/`@yields`](#user-content-eslint-plugin-jsdoc-settings-override-augments-extends-implements-ignore-without-accompanying-param-description-example-returns-throws-yields)
        * [Settings to Configure `check-types` and `no-undefined-types`](#user-content-eslint-plugin-jsdoc-settings-settings-to-configure-check-types-and-no-undefined-types)
        * [`structuredTags`](#user-content-eslint-plugin-jsdoc-settings-structuredtags)
    * [Advanced](#user-content-eslint-plugin-jsdoc-advanced)
        * [AST and Selectors](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
    * [Rules](#user-content-eslint-plugin-jsdoc-rules)
        * [`check-access`](#user-content-eslint-plugin-jsdoc-rules-check-access)
        * [`check-alignment`](#user-content-eslint-plugin-jsdoc-rules-check-alignment)
        * [`check-examples`](#user-content-eslint-plugin-jsdoc-rules-check-examples)
        * [`check-indentation`](#user-content-eslint-plugin-jsdoc-rules-check-indentation)
        * [`check-line-alignment`](#user-content-eslint-plugin-jsdoc-rules-check-line-alignment)
        * [`check-param-names`](#user-content-eslint-plugin-jsdoc-rules-check-param-names)
        * [`check-property-names`](#user-content-eslint-plugin-jsdoc-rules-check-property-names)
        * [`check-syntax`](#user-content-eslint-plugin-jsdoc-rules-check-syntax)
        * [`check-tag-names`](#user-content-eslint-plugin-jsdoc-rules-check-tag-names)
        * [`check-types`](#user-content-eslint-plugin-jsdoc-rules-check-types)
        * [`check-values`](#user-content-eslint-plugin-jsdoc-rules-check-values)
        * [`empty-tags`](#user-content-eslint-plugin-jsdoc-rules-empty-tags)
        * [`implements-on-classes`](#user-content-eslint-plugin-jsdoc-rules-implements-on-classes)
        * [`match-description`](#user-content-eslint-plugin-jsdoc-rules-match-description)
        * [`match-name`](#user-content-eslint-plugin-jsdoc-rules-match-name)
        * [`multiline-blocks`](#user-content-eslint-plugin-jsdoc-rules-multiline-blocks)
        * [`newline-after-description`](#user-content-eslint-plugin-jsdoc-rules-newline-after-description)
        * [`no-bad-blocks`](#user-content-eslint-plugin-jsdoc-rules-no-bad-blocks)
        * [`no-defaults`](#user-content-eslint-plugin-jsdoc-rules-no-defaults)
        * [`no-missing-syntax`](#user-content-eslint-plugin-jsdoc-rules-no-missing-syntax)
        * [`no-multi-asterisks`](#user-content-eslint-plugin-jsdoc-rules-no-multi-asterisks)
        * [`no-restricted-syntax`](#user-content-eslint-plugin-jsdoc-rules-no-restricted-syntax)
        * [`no-types`](#user-content-eslint-plugin-jsdoc-rules-no-types)
        * [`no-undefined-types`](#user-content-eslint-plugin-jsdoc-rules-no-undefined-types)
        * [`require-asterisk-prefix`](#user-content-eslint-plugin-jsdoc-rules-require-asterisk-prefix)
        * [`require-description-complete-sentence`](#user-content-eslint-plugin-jsdoc-rules-require-description-complete-sentence)
        * [`require-description`](#user-content-eslint-plugin-jsdoc-rules-require-description)
        * [`require-example`](#user-content-eslint-plugin-jsdoc-rules-require-example)
        * [`require-file-overview`](#user-content-eslint-plugin-jsdoc-rules-require-file-overview)
        * [`require-hyphen-before-param-description`](#user-content-eslint-plugin-jsdoc-rules-require-hyphen-before-param-description)
        * [`require-jsdoc`](#user-content-eslint-plugin-jsdoc-rules-require-jsdoc)
        * [`require-param-description`](#user-content-eslint-plugin-jsdoc-rules-require-param-description)
        * [`require-param-name`](#user-content-eslint-plugin-jsdoc-rules-require-param-name)
        * [`require-param-type`](#user-content-eslint-plugin-jsdoc-rules-require-param-type)
        * [`require-param`](#user-content-eslint-plugin-jsdoc-rules-require-param)
        * [`require-property`](#user-content-eslint-plugin-jsdoc-rules-require-property)
        * [`require-property-description`](#user-content-eslint-plugin-jsdoc-rules-require-property-description)
        * [`require-property-name`](#user-content-eslint-plugin-jsdoc-rules-require-property-name)
        * [`require-property-type`](#user-content-eslint-plugin-jsdoc-rules-require-property-type)
        * [`require-returns-check`](#user-content-eslint-plugin-jsdoc-rules-require-returns-check)
        * [`require-returns-description`](#user-content-eslint-plugin-jsdoc-rules-require-returns-description)
        * [`require-returns-type`](#user-content-eslint-plugin-jsdoc-rules-require-returns-type)
        * [`require-returns`](#user-content-eslint-plugin-jsdoc-rules-require-returns)
        * [`require-throws`](#user-content-eslint-plugin-jsdoc-rules-require-throws)
        * [`require-yields`](#user-content-eslint-plugin-jsdoc-rules-require-yields)
        * [`require-yields-check`](#user-content-eslint-plugin-jsdoc-rules-require-yields-check)
        * [`sort-tags`](#user-content-eslint-plugin-jsdoc-rules-sort-tags)
        * [`tag-lines`](#user-content-eslint-plugin-jsdoc-rules-tag-lines)
        * [`text-escaping`](#user-content-eslint-plugin-jsdoc-rules-text-escaping)
        * [`valid-types`](#user-content-eslint-plugin-jsdoc-rules-valid-types)


<a name="user-content-eslint-plugin-jsdoc-installation"></a>
<a name="eslint-plugin-jsdoc-installation"></a>
## Installation

Install [ESLint](https://www.github.com/eslint/eslint) either locally or
globally.

```sh
npm install --save-dev eslint
```

If you have installed `ESLint` globally, you have to install JSDoc plugin
globally too. Otherwise, install it locally.

```sh
npm install --save-dev eslint-plugin-jsdoc
```

<a name="user-content-eslint-plugin-jsdoc-configuration"></a>
<a name="eslint-plugin-jsdoc-configuration"></a>
## Configuration

Add `plugins` section to [.eslintrc.*](https://eslint.org/docs/user-guide/configuring#configuration-file-formats)
and specify `eslint-plugin-jsdoc` as a plugin.

```json
{
    "plugins": [
        "jsdoc"
    ]
}
```

Finally, enable all of the rules that you would like to use.

```javascript
{
    "rules": {
        "jsdoc/check-access": 1, // Recommended
        "jsdoc/check-alignment": 1, // Recommended
        "jsdoc/check-examples": 1,
        "jsdoc/check-indentation": 1,
        "jsdoc/check-line-alignment": 1,
        "jsdoc/check-param-names": 1, // Recommended
        "jsdoc/check-property-names": 1, // Recommended
        "jsdoc/check-syntax": 1,
        "jsdoc/check-tag-names": 1, // Recommended
        "jsdoc/check-types": 1, // Recommended
        "jsdoc/check-values": 1, // Recommended
        "jsdoc/empty-tags": 1, // Recommended
        "jsdoc/implements-on-classes": 1, // Recommended
        "jsdoc/match-description": 1,
        "jsdoc/multiline-blocks": 1, // Recommended
        "jsdoc/newline-after-description": 1, // Recommended
        "jsdoc/no-bad-blocks": 1,
        "jsdoc/no-defaults": 1,
        "jsdoc/no-missing-syntax": 1,
        "jsdoc/no-multi-asterisks": 1, // Recommended
        "jsdoc/no-restricted-syntax": 1,
        "jsdoc/no-types": 1,
        "jsdoc/no-undefined-types": 1, // Recommended
        "jsdoc/require-asterisk-prefix": 1,
        "jsdoc/require-description": 1,
        "jsdoc/require-description-complete-sentence": 1,
        "jsdoc/require-example": 1,
        "jsdoc/require-file-overview": 1,
        "jsdoc/require-hyphen-before-param-description": 1,
        "jsdoc/require-jsdoc": 1, // Recommended
        "jsdoc/require-param": 1, // Recommended
        "jsdoc/require-param-description": 1, // Recommended
        "jsdoc/require-param-name": 1, // Recommended
        "jsdoc/require-param-type": 1, // Recommended
        "jsdoc/require-property": 1, // Recommended
        "jsdoc/require-property-description": 1, // Recommended
        "jsdoc/require-property-name": 1, // Recommended
        "jsdoc/require-property-type": 1, // Recommended
        "jsdoc/require-returns": 1, // Recommended
        "jsdoc/require-returns-check": 1, // Recommended
        "jsdoc/require-returns-description": 1, // Recommended
        "jsdoc/require-returns-type": 1, // Recommended
        "jsdoc/require-throws": 1,
        "jsdoc/require-yields": 1, // Recommended
        "jsdoc/require-yields-check": 1, // Recommended
        "jsdoc/tag-lines": 1, // Recommended
        "jsdoc/valid-types": 1 // Recommended
    }
}
```

Or you can simply add the following to [.eslintrc.*](https://eslint.org/docs/user-guide/configuring#configuration-file-formats),
which enables the rules commented above as "recommended":


```json
{
  "extends": ["plugin:jsdoc/recommended"]
}
```

You can then selectively add to or override the recommended rules.

<a name="user-content-eslint-plugin-jsdoc-options"></a>
<a name="eslint-plugin-jsdoc-options"></a>
## Options

Rules may, as per the [ESLint user guide](https://eslint.org/docs/user-guide/configuring), have their own individual options. In `eslint-plugin-jsdoc`, a few options,
such as, `exemptedBy` and `contexts`, may be used across different rules.

`eslint-plugin-jsdoc` options, if present, are generally in the form of an
object supplied as the second argument in an array after the error level
(any exceptions to this format are explained within that rule's docs).

```js
// `.eslintrc.js`
{
  rules: {
    'jsdoc/require-example': [
        // The Error level should be `error`, `warn`, or `off` (or 2, 1, or 0)
        'error',
        // The options vary by rule, but are generally added to an options
        //  object as follows:
        {
          checkConstructors: true,
          exemptedBy: ['type']
        }
    ]
  }
}
```

<a name="user-content-eslint-plugin-jsdoc-settings"></a>
<a name="eslint-plugin-jsdoc-settings"></a>
## Settings

<a name="user-content-eslint-plugin-jsdoc-settings-allow-tags-private-or-internal-to-disable-rules-for-that-comment-block"></a>
<a name="eslint-plugin-jsdoc-settings-allow-tags-private-or-internal-to-disable-rules-for-that-comment-block"></a>
### Allow tags (<code>@private</code> or <code>@internal</code>) to disable rules for that comment block

- `settings.jsdoc.ignorePrivate` - Disables all rules for the comment block
  on which a `@private` tag (or `@access private`) occurs. Defaults to
  `false`. Note: This has no effect with the rule `check-access` (whose
  purpose is to check access modifiers) or `empty-tags` (which checks
  `@private` itself).
- `settings.jsdoc.ignoreInternal` - Disables all rules for the comment block
  on which a `@internal` tag occurs. Defaults to `false`. Note: This has no
  effect with the rule `empty-tags` (which checks `@internal` itself).

<a name="user-content-eslint-plugin-jsdoc-settings-maxlines-and-minlines"></a>
<a name="eslint-plugin-jsdoc-settings-maxlines-and-minlines"></a>
### <code>maxLines</code> and <code>minLines</code>

One can use `minLines` and `maxLines` to indicate how many line breaks
(if any) will be checked to find a jsdoc comment block before the given
code block. These settings default to `0` and `1` respectively.

In conjunction with the `require-jsdoc` rule, these settings can
be enforced so as to report problems if a jsdoc block is not found within
the specified boundaries. The settings are also used in the fixer to determine
how many line breaks to add when a block is missing.

<a name="user-content-eslint-plugin-jsdoc-settings-mode"></a>
<a name="eslint-plugin-jsdoc-settings-mode"></a>
### Mode

- `settings.jsdoc.mode` - Set to `typescript`, `closure`, or `jsdoc` (the
  default unless the `@typescript-eslint` parser is in use in which case
  `typescript` will be the default).
  Note that if you do not wish to use separate `.eslintrc.*` files for a
  project containing both JavaScript and TypeScript, you can also use
  [`overrides`](https://eslint.org/docs/user-guide/configuring). You may also
  set to `"permissive"` to try to be as accommodating to any of the styles,
  but this is not recommended. Currently is used for the following:
  - `check-tag-names`: Determine valid tags and aliases
  - `no-undefined-types`: Only check `@template` for types in "closure" and
    "typescript" modes
  - `check-syntax`: determines aspects that may be enforced
  - `valid-types`: in non-Closure mode, `@extends`, `@package` and access tags
     (e.g., `@private`) with a bracketed type are reported as are missing
     names with `@typedef`
  - For type/namepath-checking rules, determine which tags will be checked for
    types/namepaths (Closure allows types on some tags which the others do not,
    so these tags will additionally be checked in "closure" mode)
  - For type-checking rules, impacts parsing of types (through
    [jsdoc-type-pratt-parser](https://github.com/simonseyock/jsdoc-type-pratt-parser)
    dependency)
  - Check preferred tag names
  - Disallows namepath on `@interface` for "closure" mode in `valid-types` (and
      avoids checking in other rules)

<a name="user-content-eslint-plugin-jsdoc-settings-alias-preference"></a>
<a name="eslint-plugin-jsdoc-settings-alias-preference"></a>
### Alias Preference

Use `settings.jsdoc.tagNamePreference` to configure a preferred alias name for
a JSDoc tag. The format of the configuration is:
`<primary tag name>: <preferred alias name>`, e.g.

```json
{
    "rules": {},
    "settings": {
        "jsdoc": {
            "tagNamePreference": {
                "param": "arg",
                "returns": "return"
            }
        }
    }
}
```

Note: ESLint does not allow settings to have keys which conflict with
`Object.prototype` e.g. `'constructor'`. To work around this, you can use the
key `'tag constructor'`.

One may also use an object with a `message` and `replacement`.

The following will report the message
`@extends is to be used over @augments as it is more evocative of classes than @augments`
upon encountering `@augments`.

```json
{
    "rules": {},
    "settings": {
        "jsdoc": {
            "tagNamePreference": {
                "augments": {
                  "message": "@extends is to be used over @augments as it is more evocative of classes than @augments",
                  "replacement": "extends"
                }
            }
        }
    }
}
```

If one wishes to reject a normally valid tag, e.g., `@todo`, one may set the
tag to `false`:

```json
{
    "rules": {},
    "settings": {
        "jsdoc": {
            "tagNamePreference": {
                "todo": false
            }
        }
    }
}
```

A project wishing to ensure no blocks are left excluded from entering the
documentation, might wish to prevent the `@ignore` tag in the above manner.

Or one may set the targeted tag to an object with a custom `message`, but
without a `replacement` property:

```json
{
    "rules": {},
    "settings": {
        "jsdoc": {
            "tagNamePreference": {
                "todo": {
                  "message": "We expect immediate perfection, so don't leave to-dos in your code."
                }
            }
        }
    }
}
```

Note that the preferred tags indicated in the
`settings.jsdoc.tagNamePreference` map will be assumed to be defined by
`check-tag-names`.

See `check-tag-names` for how that fact can be used to set an alias to itself
to allow both the alias and the default (since aliases are otherwise not
permitted unless used in `tagNamePreference`).

<a name="user-content-eslint-plugin-jsdoc-settings-alias-preference-default-preferred-aliases"></a>
<a name="eslint-plugin-jsdoc-settings-alias-preference-default-preferred-aliases"></a>
#### Default Preferred Aliases

The defaults in `eslint-plugin-jsdoc` (for tags which offer
aliases) are as follows:

- `@abstract` (over `@virtual`)
- `@augments` (over `@extends`)
- `@class` (over `@constructor`)
- `@constant` (over `@const`)
- `@default` (over `@defaultvalue`)
- `@description` (over `@desc`)
- `@external` (over `@host`)
- `@file` (over `@fileoverview`, `@overview`)
- `@fires` (over `@emits`)
- `@function` (over `@func`, `@method`)
- `@member` (over `@var`)
- `@param` (over `@arg`, `@argument`)
- `@property` (over `@prop`)
- `@returns` (over `@return`)
- `@throws` (over `@exception`)
- `@yields` (over `@yield`)

This setting is utilized by the the rule for tag name checking
(`check-tag-names`) as well as in the `@param` and `@require` rules:

- `check-param-names`
- `check-tag-names`
- `require-hyphen-before-param-description`
- `require-description`
- `require-param`
- `require-param-description`
- `require-param-name`
- `require-param-type`
- `require-returns`
- `require-returns-check`
- `require-returns-description`
- `require-returns-type`

<a name="user-content-eslint-plugin-jsdoc-settings-override-augments-extends-implements-ignore-without-accompanying-param-description-example-returns-throws-yields"></a>
<a name="eslint-plugin-jsdoc-settings-override-augments-extends-implements-ignore-without-accompanying-param-description-example-returns-throws-yields"></a>
### <code>@override</code>/<code>@augments</code>/<code>@extends</code>/<code>@implements</code>/<code>@ignore</code> Without Accompanying <code>@param</code>/<code>@description</code>/<code>@example</code>/<code>@returns</code>/<code>@throws</code>/<code>@yields</code>

The following settings allows the element(s) they reference to be omitted
on the JSDoc comment block of the function or that of its parent class
for any of the "require" rules (i.e., `require-param`, `require-description`,
`require-example`, `require-returns`, `require-throws`, `require-yields`).

* `settings.jsdoc.ignoreReplacesDocs` (`@ignore`) - Defaults to `true`
* `settings.jsdoc.overrideReplacesDocs` (`@override`) - Defaults to `true`
* `settings.jsdoc.augmentsExtendsReplacesDocs` (`@augments` or its alias
    `@extends`) - Defaults to `false`.
* `settings.jsdoc.implementsReplacesDocs` (`@implements`) - Defaults to `false`

The format of the configuration is as follows:

```json
{
    "rules": {},
    "settings": {
        "jsdoc": {
            "ignoreReplacesDocs": true,
            "overrideReplacesDocs": true,
            "augmentsExtendsReplacesDocs": true,
            "implementsReplacesDocs": true
        }
    }
}
```

<a name="user-content-eslint-plugin-jsdoc-settings-settings-to-configure-check-types-and-no-undefined-types"></a>
<a name="eslint-plugin-jsdoc-settings-settings-to-configure-check-types-and-no-undefined-types"></a>
### Settings to Configure <code>check-types</code> and <code>no-undefined-types</code>

- `settings.jsdoc.preferredTypes` An option map to indicate preferred
  or forbidden types (if default types are indicated here, these will
  have precedence over the default recommendations for `check-types`).
  The keys of this map are the types to be replaced (or forbidden).
  These keys may include:
  1. The "ANY" type, `*`
  1. The pseudo-type `[]` which we use to denote the parent (array)
    types used in the syntax `string[]`, `number[]`, etc.
  1. The pseudo-type `.<>` (or `.`) to represent the format `Array.<value>`
    or `Object.<key, value>`
  1. The pseudo-type `<>` to represent the format `Array<value>` or
    `Object<key, value>`
  1. A plain string type, e.g., `MyType`
  1. A plain string type followed by one of the above pseudo-types (except
    for `[]` which is always assumed to be an `Array`), e.g., `Array.`, or
    `SpecialObject<>`.

  If a bare pseudo-type is used, it will match all parent types of that form.
  If a pseudo-type prefixed with a type name is used, it will only match
  parent types of that form and type name.

  The values can be:
  - `false` to forbid the type
  - a string to indicate the type that should be preferred in its place
    (and which `fix` mode can replace); this can be one of the formats
    of the keys described above.
    - Note that the format will not be changed unless you use a pseudo-type
      in the replacement. (For example, `'Array.<>': 'MyArray'` will change
      `Array.<string>` to `MyArray.<string>`, preserving the dot. To get rid
      of the dot, you must use the pseudo-type with `<>`, i.e.,
      `'Array.<>': 'MyArray<>'`, which will change `Array.<string>` to
      `MyArray<string>`).
    - If you use a _bare_ pseudo-type in the replacement (e.g.,
      `'MyArray.<>': '<>'`), the type will be converted to the format
      of the pseudo-type without changing the type name. For example,
      `MyArray.<string>` will become `MyArray<string>` but `Array.<string>`
      will not be modified.
  - an object with:
    - the key `message` to provide a specific error message
      when encountering the discouraged type.
      - The message string will have the substrings with special meaning,
        `{{tagName}}` and `{{tagValue}}`, replaced with their
        corresponding value.
    - an optional key `replacement` with either of the following values:
      - a string type to be preferred in its place (and which `fix` mode
        can replace)
      - `false` (for forbidding the type)
    - an optional key `skipRootChecking` (for `check-types`) to allow for this
      type in the context of a root (i.e., a parent object of some child type)

Note that the preferred types indicated as targets in
`settings.jsdoc.preferredTypes` map will be assumed to be defined by
`no-undefined-types`.

See the option of `check-types`, `unifyParentAndChildTypeChecks`, for
how the keys of `preferredTypes` may have `<>` or `.<>` (or just `.`)
appended and its bearing on whether types are checked as parents/children
only (e.g., to match `Array` if the type is `Array` vs. `Array.<string>`).

Note that if a value is present both as a key and as a value, neither the
key nor the value will be reported. Thus in `check-types`, this fact can
be used to allow both `object` and `Object` if one has a `preferredTypes`
key `object: 'Object'` and `Object: 'object'`.

<a name="user-content-eslint-plugin-jsdoc-settings-structuredtags"></a>
<a name="eslint-plugin-jsdoc-settings-structuredtags"></a>
### <code>structuredTags</code>

An object indicating tags whose types and names/namepaths (whether defining or
referencing namepaths) will be checked, subject to configuration. If the tags
have predefined behavior or `allowEmptyNamepaths` behavior, this option will
override that behavior for any specified tags, though this option can also be
used for tags without predefined behavior. Its keys are tag names and its
values are objects with the following optional properties:
  - `name` - String set to one of the following:
    - `"text"` - When a name is present, plain text will be allowed in the
      name position (non-whitespace immediately after the tag and whitespace),
      e.g., in `@throws This is an error`, "This" would normally be the name,
      but "text" allows non-name text here also. This is the default.
    - `"namepath-defining"` - As with `namepath-referencing`, but also
      indicates the tag adds a namepath to definitions, e.g., to prevent
      `no-undefined-types` from reporting references to that namepath.
    - `"namepath-referencing"` - This will cause any name position to be
      checked to ensure it is a valid namepath. You might use this to ensure
      that tags which normally allow free text, e.g., `@see` will instead
      require a namepath.
    - `false` - This will disallow any text in the name position.
  - `type`:
      - `true` - Allows valid types within brackets. This is the default.
      - `false` - Explicitly disallows any brackets or bracketed type. You
        might use this with `@throws` to suggest that only free form text
        is being input or with `@augments` (for jsdoc mode) to disallow
        Closure-style bracketed usage along with a required namepath.
      - (An array of strings) - A list of permissible types.
  - `required` - Array of one of the following (defaults to an empty array,
      meaning none are required):
    - One or both of the following strings (if both are included, then both
      are required):
      - `"name"` - Indicates that a name position is required (not just that
        if present, it is a valid namepath). You might use this with `see`
        to insist that a value (or namepath, depending on the `name` value)
        is always present.
      - `"type"` - Indicates that the type position (within curly brackets)
        is required (not just that if present, it is a valid type). You
        might use this with `@throws` or `@typedef` which might otherwise
        normally have their types optional. See the type groups 3-5 above.
    - `"typeOrName"` - Must have either type (e.g., `@throws {aType}`) or
        name (`@throws Some text`); does not require that both exist but
        disallows just an empty tag.

<a name="user-content-eslint-plugin-jsdoc-advanced"></a>
<a name="eslint-plugin-jsdoc-advanced"></a>
## Advanced

<a name="user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors"></a>
<a name="eslint-plugin-jsdoc-advanced-ast-and-selectors"></a>
### AST and Selectors

For various rules, one can add to the environments to which the rule applies
by using the `contexts` option.

This option works with [ESLint's selectors](https://eslint.org/docs/developer-guide/selectors) which are [esquery](https://github.com/estools/esquery/#readme)
expressions one may use to target a specific node type or types, including
subsets of the type(s) such as nodes with certain children or attributes.

These expressions are used within ESLint plugins to find those parts of
your files' code which are of interest to check. However, in
`eslint-plugin-jsdoc`, we also allow you to use these selectors to define
additional contexts where you wish our own rules to be applied.

<a name="user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors-contexts-format"></a>
<a name="eslint-plugin-jsdoc-advanced-ast-and-selectors-contexts-format"></a>
#### <code>contexts</code> format

While at their simplest, these can be an array of string selectors, one can
also supply an object with `context` (in place of the string) and one of two
properties:

1. For `require-jsdoc`, there are also `inlineCommentBlock` and
    `minLineCount` properties. See that rule for details.
1. For `no-missing-syntax` and `no-restricted-syntax`, there is also a
    `message` property which allows customization of the message to be shown
    when the rule is triggered.
1. For `no-missing-syntax`, there is also a `minimum` property. See that rule.
1. For other rules, there is a `comment` property which adds to the `context`
    in requiring that the `comment` AST condition is also met, e.g., to
    require that certain tags are present and/or or types and type operators
    are in use. Note that this AST (either for `Jsdoc*` or `JsdocType*` AST)
    has not been standardized and should be considered experimental.
    Note that this property might also become obsolete if parsers begin to
    include JSDoc-structured AST. A
    [parser](https://github.com/brettz9/jsdoc-eslint-parser/) is available
    which aims to support comment AST as
    a first class citizen where comment/comment types can be used anywhere
    within a normal AST selector but this should only be considered
    experimental. When using such a parser, you need not use `comment` and
    can just use a plain string context. The determination of the node on
    which the comment is attached is based more on actual location than
    semantics (e.g., it will be attached to a `VariableDeclaration` if above
    that rather than to the `FunctionExpression` it is fundamentally
    describing). See
    [@es-joy/jsdoccomment](https://github.com/es-joy/jsdoccomment)
    for the precise structure of the comment (and comment type) nodes.

<a name="user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors-discovering-available-ast-definitions"></a>
<a name="eslint-plugin-jsdoc-advanced-ast-and-selectors-discovering-available-ast-definitions"></a>
#### Discovering available AST definitions

To know all of the AST definitions one may target, it will depend on the
[parser](https://eslint.org/docs/user-guide/configuring#specifying-parser)
you are using with ESLint (e.g., `espree` is the default parser for ESLint,
and this follows [EStree AST](https://github.com/estree/estree) but
to support the the latest experimental features of JavaScript, one may use
`@babel/eslint-parser` or to be able to have one's rules (including JSDoc rules)
apply to TypeScript, one may use `@typescript-eslint/parser`, etc.

So you can look up a particular parser to see its rules, e.g., browse through
the [ESTree docs](https://github.com/estree/estree) as used by Espree or see
ESLint's [overview of the structure of AST](https://eslint.org/docs/developer-guide/working-with-custom-parsers#the-ast-specification).

However, it can sometimes be even more helpful to get an idea of AST by just
providing some of your JavaScript to the wonderful
[AST Explorer](https://astexplorer.net/) tool and see what AST is built out
of your code. You can set the tool to the specific parser which you are using.

<a name="user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors-uses-tips-for-ast"></a>
<a name="eslint-plugin-jsdoc-advanced-ast-and-selectors-uses-tips-for-ast"></a>
#### Uses/Tips for AST

And if you wish to introspect on the AST of code within your projects, you can
use [eslint-plugin-query](https://github.com/brettz9/eslint-plugin-query).
Though it also works as a plugin, you can use it with its own CLI, e.g.,
to search your files for matching esquery selectors, optionally showing
it as AST JSON.

Tip: If you want to more deeply understand not just the resulting AST tree
structures for any given code but also the syntax for esquery selectors so
that you can, for example, find only those nodes with a child of a certain
type, you can set the "Transform" feature to ESLint and test out
esquery selectors in place of the selector expression (e.g., replace
`'VariableDeclaration > VariableDeclarator > Identifier[name="someVar"]'` as
we have
[here](https://astexplorer.net/#/gist/71a93130c19599d6f197bddb29c13a59/latest))
to the selector you wish so as to get messages reported in the bottom right
pane which match your [esquery](https://github.com/estools/esquery/#readme)
selector).

<a name="user-content-eslint-plugin-jsdoc-rules"></a>
<a name="eslint-plugin-jsdoc-rules"></a>
## Rules

<a name="user-content-eslint-plugin-jsdoc-rules-check-access"></a>
<a name="eslint-plugin-jsdoc-rules-check-access"></a>
### <code>check-access</code>

Checks that `@access` tags use one of the following values:

- "package", "private", "protected", "public"

Also reports:

- Mixing of `@access` with `@public`, `@private`, `@protected`, or `@package`
  on the same doc block.
- Use of multiple instances of `@access` (or the `@public`, etc. style tags)
  on the same doc block.

|||
|---|---|
|Context|everywhere|
|Tags|`@access`|
|Recommended|false|
|Settings||
|Options||

The following patterns are considered problems:

````js
/**
 * @access foo
 */
function quux (foo) {

}
// Message: Missing valid JSDoc @access level.

/**
 * @access foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignorePrivate":true}}
// Message: Missing valid JSDoc @access level.

/**
 * @accessLevel foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"access":"accessLevel"}}}
// Message: Missing valid JSDoc @accessLevel level.

/**
 * @access
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"access":false}}}
// Message: Unexpected tag `@access`

class MyClass {
  /**
   * @access
   */
  myClassField = 1
}
// Message: Missing valid JSDoc @access level.

/**
 * @access public
 * @public
 */
function quux (foo) {

}
// Message: The @access tag may not be used with specific access-control tags (@package, @private, @protected, or @public).

/**
 * @access public
 * @access private
 */
function quux (foo) {

}
// Message: At most one access-control tag may be present on a jsdoc block.

/**
 * @access public
 * @access private
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignorePrivate":true}}
// Message: At most one access-control tag may be present on a jsdoc block.

/**
 * @public
 * @private
 */
function quux (foo) {

}
// Message: At most one access-control tag may be present on a jsdoc block.

/**
 * @public
 * @private
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignorePrivate":true}}
// Message: At most one access-control tag may be present on a jsdoc block.

/**
 * @public
 * @public
 */
function quux (foo) {

}
// Message: At most one access-control tag may be present on a jsdoc block.
````

The following patterns are not considered problems:

````js
/**
 *
 */
function quux (foo) {

}

/**
 * @access public
 */
function quux (foo) {

}

/**
 * @accessLevel package
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"access":"accessLevel"}}}

class MyClass {
  /**
   * @access private
   */
  myClassField = 1
}

/**
 * @public
 */
function quux (foo) {

}

/**
 * @private
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignorePrivate":true}}
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-alignment"></a>
<a name="eslint-plugin-jsdoc-rules-check-alignment"></a>
### <code>check-alignment</code>

Reports invalid alignment of JSDoc block asterisks.

|||
|---|---|
|Context|everywhere|
|Tags|N/A|
|Recommended|true|

The following patterns are considered problems:

````js
/**
  * @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// Message: Expected JSDoc block to be aligned.

/**
  * @param {Number} foo
 */
function quux (foo) {
	// with tabs
}
// Message: Expected JSDoc block to be aligned.

/**
  * @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// Message: Expected JSDoc block to be aligned.

/**
* @param {Number} foo
*/
function quux (foo) {
  // with spaces
}
// Message: Expected JSDoc block to be aligned.

/**
 * @param {Number} foo
  */
function quux (foo) {

}
// Message: Expected JSDoc block to be aligned.

 /**
 * @param {Number} foo
 */
function quux (foo) {

}
// Message: Expected JSDoc block to be aligned.

 /**
  * @param {Number} foo
 */
function quux (foo) {

}
// Message: Expected JSDoc block to be aligned.

/**
  * @param {Number} foo
  */
 function quux (foo) {

 }
// Message: Expected JSDoc block to be aligned.

/**
   * A jsdoc not attached to any node.
 */
// Message: Expected JSDoc block to be aligned.

class Foo {
  /**
   *  Some method
    * @param a
   */
  quux(a) {}
}
// Message: Expected JSDoc block to be aligned.
````

The following patterns are not considered problems:

````js
/**
 * Desc
 *
 * @param {Number} foo
 */
function quux (foo) {

}

/**
 * Desc
 *
 * @param {{
  foo: Bar,
  bar: Baz
 * }} foo
 *
 */
function quux (foo) {

}

/*  <- JSDoc must start with 2 stars.
  *    So this is unchecked.
 */
function quux (foo) {}

/**
  * @param {Number} foo
  * @private
 */
function quux (foo) {
  // with spaces
}
// Settings: {"jsdoc":{"ignorePrivate":true}}

/**
  * @param {Number} foo
  * @access private
 */
function quux (foo) {
  // with spaces
}
// Settings: {"jsdoc":{"ignorePrivate":true}}
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-examples"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples"></a>
### <code>check-examples</code>

> **NOTE**: This rule currently does not work in ESLint 8 (we are waiting for
> [issue 14745](https://github.com/eslint/eslint/issues/14745)).

Ensures that (JavaScript) examples within JSDoc adhere to ESLint rules. Also
has options to lint the default values of optional `@param`/`@arg`/`@argument`
and `@property`/`@prop` tags or the values of `@default`/`@defaultvalue` tags.

<a name="user-content-eslint-plugin-jsdoc-rules-check-examples-options-1"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples-options-1"></a>
#### Options

The options below all default to no-op/`false` except as noted.

<a name="user-content-eslint-plugin-jsdoc-rules-check-examples-options-1-captionrequired"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples-options-1-captionrequired"></a>
##### <code>captionRequired</code>

JSDoc specs use of an optional `<caption>` element at the beginning of
`@example`.

The option `captionRequired` insists on a `<caption>` being present at
the beginning of any `@example`.

Used only for `@example`.

<a name="user-content-eslint-plugin-jsdoc-rules-check-examples-options-1-examplecoderegex-and-rejectexamplecoderegex"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples-options-1-examplecoderegex-and-rejectexamplecoderegex"></a>
##### <code>exampleCodeRegex</code> and <code>rejectExampleCodeRegex</code>

JSDoc does not specify a formal means for delimiting code blocks within
`@example` (it uses generic syntax highlighting techniques for its own
syntax highlighting). The following options determine whether a given
`@example` tag will have the `check-examples` checks applied to it:

* `exampleCodeRegex` - Regex which whitelists lintable
  examples. If a parenthetical group is used, the first one will be used,
  so you may wish to use `(?:...)` groups where you do not wish the
  first such group treated as one to include. If no parenthetical group
  exists or matches, the whole matching expression will be used.
  An example might be ````"^```(?:js|javascript)([\\s\\S]*)```\s*$"````
  to only match explicitly fenced JavaScript blocks. Defaults to only
  using the `u` flag, so to add your own flags, encapsulate your
  expression as a string, but like a literal, e.g., ````/```js.*```/gi````.
  Note that specifying a global regular expression (i.e., with `g`) will
  allow independent linting of matched blocks within a single `@example`.
* `rejectExampleCodeRegex` - Regex blacklist which rejects
  non-lintable examples (has priority over `exampleCodeRegex`). An example
  might be ```"^`"``` to avoid linting fenced blocks which may indicate
  a non-JavaScript language. See `exampleCodeRegex` on how to add flags
  if the default `u` is not sufficient.

If neither is in use, all examples will be matched. Note also that even if
`captionRequired` is not set, any initial `<caption>` will be stripped out
before doing the regex matching.

<a name="user-content-eslint-plugin-jsdoc-rules-check-examples-options-1-paddedindent"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples-options-1-paddedindent"></a>
##### <code>paddedIndent</code>

This integer property allows one to add a fixed amount of whitespace at the
beginning of the second or later lines of the example to be stripped so as
to avoid linting issues with the decorative whitespace. For example, if set
to a value of `4`, the initial whitespace below will not trigger `indent`
rule errors as the extra 4 spaces on each subsequent line will be stripped
out before evaluation.

```js
/**
 * @example
 *     anArray.filter((a) => {
 *       return a.b;
 *     });
 */
```

Only applied to `@example` linting.

<a name="user-content-eslint-plugin-jsdoc-rules-check-examples-options-1-reportunuseddisabledirectives"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples-options-1-reportunuseddisabledirectives"></a>
##### <code>reportUnusedDisableDirectives</code>

If not set to `false`, `reportUnusedDisableDirectives` will report disabled
directives which are not used (and thus not needed). Defaults to `true`.
Corresponds to ESLint's [`--report-unused-disable-directives`](https://eslint.org/docs/user-guide/command-line-interface#--report-unused-disable-directives).

Inline ESLint config within `@example` JavaScript is allowed (or within
`@default`, etc.), though the disabling of ESLint directives which are not
needed by the resolved rules will be reported as with the ESLint
`--report-unused-disable-directives` command.

<a name="user-content-eslint-plugin-jsdoc-rules-check-examples-options-for-determining-eslint-rule-applicability-allowinlineconfig-nodefaultexamplerules-matchingfilename-configfile-checkeslintrc-and-baseconfig"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples-options-for-determining-eslint-rule-applicability-allowinlineconfig-nodefaultexamplerules-matchingfilename-configfile-checkeslintrc-and-baseconfig"></a>
#### Options for Determining ESLint Rule Applicability (<code>allowInlineConfig</code>, <code>noDefaultExampleRules</code>, <code>matchingFileName</code>, <code>configFile</code>, <code>checkEslintrc</code>, and <code>baseConfig</code>)

The following options determine which individual ESLint rules will be
applied to the JavaScript found within the `@example` tags (as determined
to be applicable by the above regex options) or for the other tags checked by
`checkDefaults`, `checkParams`, or `checkProperties` options. They are ordered
by decreasing precedence:

* `allowInlineConfig` - If not set to `false`, will allow
  inline config within the `@example` to override other config. Defaults
  to `true`.
* `noDefaultExampleRules` - Setting to `true` will disable the
  default rules which are expected to be troublesome for most documentation
  use. See the section below for the specific default rules.
* `configFile` - A config file. Corresponds to ESLint's [`-c`](https://eslint.org/docs/user-guide/command-line-interface#-c---config).
* `matchingFileName` - Option for a file name (even non-existent) to trigger
  specific rules defined in one's config; usable with ESLint `.eslintrc.*`
  `overrides` -> `files` globs, to apply a desired subset of rules with
  `@example` (besides allowing for rules specific to examples, this option
  can be useful for enabling reuse of the same rules within `@example` as
  with JavaScript Markdown lintable by
  [other plugins](https://github.com/eslint/eslint-plugin-markdown), e.g.,
  if one sets `matchingFileName` to `dummy.md/*.js` so that `@example`
  rules will follow rules for fenced JavaScript blocks within one's Markdown
  rules). (In ESLint 6's processor API and `eslint-plugin-markdown` < 2, one
  would instead use `dummy.md`.) For `@example` only.
* `matchingFileNameDefaults` - As with `matchingFileName` but for use with
  `checkDefaults` and defaulting to `.jsdoc-defaults` as extension.
* `matchingFileNameParams` - As with `matchingFileName` but for use with
  `checkParams` and defaulting to `.jsdoc-params` as extension.
* `matchingFileNameProperties` As with `matchingFileName` but for use with
  `checkProperties` and defaulting to `.jsdoc-properties` as extension.
* `checkEslintrc` - Defaults to `true` in adding rules
  based on an `.eslintrc.*` file. Setting to `false` corresponds to
  ESLint's [`--no-eslintrc`](https://eslint.org/docs/user-guide/command-line-interface#--no-eslintrc).
  If `matchingFileName` is set, this will automatically be `true` and
  will use the config corresponding to that file. If `matchingFileName` is
  not set and this value is set to `false`, the `.eslintrc.*` configs will
  not be checked. If `matchingFileName` is not set, and this is unset or
  set to `true`, the `.eslintrc.*` configs will be checked as though the file
  name were the same as the file containing the example, with any file
  extension changed to `".md/*.js"` (and if there is no file extension,
  `"dummy.md/*.js"` will be the result). This allows convenient sharing of
  similar rules with often also context-free Markdown as well as use of
  `overrides` as described under `matchingFileName`. Note that this option
  (whether set by `matchingFileName` or set manually to `true`) may come at
  somewhat of a performance penalty as the file's existence is checked by
  eslint.
* `baseConfig` - Set to an object of rules with the same schema
  as `.eslintrc.*` for defaults.

<a name="user-content-eslint-plugin-jsdoc-rules-check-examples-options-for-determining-eslint-rule-applicability-allowinlineconfig-nodefaultexamplerules-matchingfilename-configfile-checkeslintrc-and-baseconfig-rules-disabled-by-default-unless-nodefaultexamplerules-is-set-to-true"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples-options-for-determining-eslint-rule-applicability-allowinlineconfig-nodefaultexamplerules-matchingfilename-configfile-checkeslintrc-and-baseconfig-rules-disabled-by-default-unless-nodefaultexamplerules-is-set-to-true"></a>
##### Rules Disabled by Default Unless <code>noDefaultExampleRules</code> is Set to <code>true</code>

* `eol-last` - Insisting that a newline "always" be at the end is less likely
  to be desired in sample code as with the code file convention.
* `no-console` - This rule is unlikely to have inadvertent temporary debugging
  within examples.
* `no-multiple-empty-lines` - This rule may be problematic for projects which
  use an initial newline just to start an example. Also, projects may wish to
  use extra lines within examples just for easier illustration
  purposes.
* `no-undef` - Many variables in examples will be `undefined`.
* `no-unused-vars` - It is common to define variables for clarity without
  always using them within examples.
* `padded-blocks` - It can generally look nicer to pad a little even if one's
  code follows more stringency as far as block padding.
* `jsdoc/require-file-overview` - Shouldn't check example for jsdoc blocks.
* `jsdoc/require-jsdoc` - Wouldn't expect jsdoc blocks within jsdoc blocks.
* `import/no-unresolved` - One wouldn't generally expect example paths to
  resolve relative to the current JavaScript file as one would with real code.
* `import/unambiguous` - Snippets in examples are likely too short to always
  include full import/export info.
* `node/no-missing-import` - See `import/no-unresolved`.
* `node/no-missing-require` -  See `import/no-unresolved`.

For `checkDefaults`, `checkParams`, and `checkProperties`, the following
expression-oriented rules will be used by default as well:

* `quotes` - Will insist on "double".
* `semi` - Will insist on "never".
* `strict` - Disabled.
* `no-empty-function` - Disabled.
* `no-new` - Disabled.
* `no-unused-expressions` - Disabled.
* `chai-friendly/no-unused-expressions` - Disabled.

<a name="user-content-eslint-plugin-jsdoc-rules-check-examples-options-for-determining-eslint-rule-applicability-allowinlineconfig-nodefaultexamplerules-matchingfilename-configfile-checkeslintrc-and-baseconfig-options-for-checking-other-than-example-checkdefaults-checkparams-or-checkproperties"></a>
<a name="eslint-plugin-jsdoc-rules-check-examples-options-for-determining-eslint-rule-applicability-allowinlineconfig-nodefaultexamplerules-matchingfilename-configfile-checkeslintrc-and-baseconfig-options-for-checking-other-than-example-checkdefaults-checkparams-or-checkproperties"></a>
##### Options for checking other than <code>@example</code> (<code>checkDefaults</code>, <code>checkParams</code>, or <code>checkProperties</code>)

* `checkDefaults` - Whether to check the values of `@default`/`@defaultvalue` tags
* `checkParams` - Whether to check `@param`/`@arg`/`@argument` default values
* `checkProperties` - Whether to check `@property`/`@prop` default values

|||
|---|---|
|Context|everywhere|
|Tags|`example`|
|Recommended|false|
|Options| *See above* |

The following patterns are considered problems:

````js
/**
 * @example alert('hello')
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"no-alert":2,"semi":["error","always"]}},"checkEslintrc":false}]
// Message: @example error (no-alert): Unexpected alert.

/**
 * @example alert('hello')
 */
class quux {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"no-alert":2,"semi":["error","always"]}},"checkEslintrc":false}]
// Message: @example error (no-alert): Unexpected alert.

/**
 * @example ```js
 alert('hello');
 ```
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["error","never"]}},"checkEslintrc":false,"exampleCodeRegex":"```js([\\s\\S]*)```"}]
// Message: @example error (semi): Extra semicolon.

/**
 * @example
 *
 * ```js alert('hello'); ```
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["error","never"]}},"checkEslintrc":false,"exampleCodeRegex":"```js ([\\s\\S]*)```"}]
// Message: @example error (semi): Extra semicolon.

/**
 * @example
 * ```js alert('hello'); ```
 */
var quux = {

};
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["error","never"]}},"checkEslintrc":false,"exampleCodeRegex":"```js ([\\s\\S]*)```"}]
// Message: @example error (semi): Extra semicolon.

/**
 * @example ```
 * js alert('hello'); ```
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["error","never"]}},"checkEslintrc":false,"exampleCodeRegex":"```\njs ([\\s\\S]*)```"}]
// Message: @example error (semi): Extra semicolon.

/**
 * @example <b>Not JavaScript</b>
 */
function quux () {

}
/**
 * @example quux2();
 */
function quux2 () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["error","never"]}},"checkEslintrc":false,"rejectExampleCodeRegex":"^\\s*<.*>\\s*$"}]
// Message: @example error (semi): Extra semicolon.

/**
 * @example
 * quux(); // does something useful
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"no-undef":["error"]}},"checkEslintrc":false,"noDefaultExampleRules":true}]
// Message: @example error (no-undef): 'quux' is not defined.

/**
 * @example <caption>Valid usage</caption>
 * quux(); // does something useful
 *
 * @example
 * quux('random unwanted arg'); // results in an error
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"captionRequired":true,"checkEslintrc":false}]
// Message: Caption is expected for examples.

/**
 * @example  quux();
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"indent":["error"]}},"checkEslintrc":false,"noDefaultExampleRules":false}]
// Message: @example error (indent): Expected indentation of 0 spaces but found 1.

/**
 * @example test() // eslint-disable-line semi
 */
function quux () {}
// "jsdoc/check-examples": ["error"|"warn", {"checkEslintrc":false,"noDefaultExampleRules":true,"reportUnusedDisableDirectives":true}]
// Message: @example error: Unused eslint-disable directive (no problems were reported from 'semi').

/**
 * @example
 test() // eslint-disable-line semi
 */
function quux () {}
// "jsdoc/check-examples": ["error"|"warn", {"allowInlineConfig":false,"baseConfig":{"rules":{"semi":["error","always"]}},"checkEslintrc":false,"noDefaultExampleRules":true}]
// Message: @example error (semi): Missing semicolon.

/**
 * @example const j = 5;
 * quux2();
 */
function quux2 () {

}
// "jsdoc/check-examples": ["error"|"warn", {"matchingFileName":"../../jsdocUtils.js"}]
// Message: @example warning (id-length): Identifier name 'j' is too short (< 2).

/**
 * @example const k = 5;
 * quux2();
 */
function quux2 () {

}
// "jsdoc/check-examples": ["error"|"warn", {"configFile":".eslintrc.json","matchingFileName":"../../jsdocUtils.js"}]
// Message: @example warning (id-length): Identifier name 'k' is too short (< 2).

/**
 * @example const m = 5;
 * quux2();
 */
function quux2 () {

}
// Message: @example warning (id-length): Identifier name 'm' is too short (< 2).

/**
 * @example const i = 5;
 *   quux2()
 */
function quux2 () {

}
// "jsdoc/check-examples": ["error"|"warn", {"paddedIndent":2}]
// Message: @example warning (id-length): Identifier name 'i' is too short (< 2).

/**
 * @example
 * const i = 5;
 * quux2()
 */
function quux2 () {

}
// Message: @example warning (id-length): Identifier name 'i' is too short (< 2).

/**
 * @example const idx = 5;
 * quux2()
 */
function quux2 () {

}
// "jsdoc/check-examples": ["error"|"warn", {"matchingFileName":"dummy.js"}]
// Message: @example error (semi): Missing semicolon.

/**
 * @example const idx = 5;
 *
 * quux2()
 */
function quux2 () {

}
// "jsdoc/check-examples": ["error"|"warn", {"matchingFileName":"dummy.js"}]
// Message: @example error (semi): Missing semicolon.

/**
 * @example const idx = 5;
 *
 * quux2()
 */
function quux2 () {

}
// "jsdoc/check-examples": ["error"|"warn", {"checkEslintrc":false,"matchingFileName":"dummy.js"}]
// Message: @example error: Parsing error: The keyword 'const' is reserved

/**
 * @example // begin
 alert('hello')
 // end
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["warn","always"]}},"checkEslintrc":false,"exampleCodeRegex":"// begin[\\s\\S]*// end","noDefaultExampleRules":true}]
// Message: @example warning (semi): Missing semicolon.

/**
 * @typedef {string} Foo
 * @example <caption></caption>
 * 'foo'
 */
// "jsdoc/check-examples": ["error"|"warn", {"captionRequired":true,"checkEslintrc":false}]
// Message: Caption is expected for examples.

/**
 * @example
 * const list: number[] = [1, 2, 3]
 * quux(list);
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"parser":"@typescript-eslint/parser","parserOptions":{"ecmaVersion":6},"rules":{"semi":["error","always"]}},"checkEslintrc":false}]
// Message: @example error (semi): Missing semicolon.

/**
 * @example
 * const test = something.find((_) => {
 *   return _
 * });
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"parserOptions":{"ecmaVersion":6},"rules":{"semi":["error","always"]}}}]
// Message: @example error (semi): Missing semicolon.

/**
 * @example <caption>Say `Hello!` to the user.</caption>
 * First, import the function:
 *
 * ```js
 * import popup from './popup'
 * const aConstInSameScope = 5;
 * ```
 *
 * Then use it like this:
 *
 * ```js
 * const aConstInSameScope = 7;
 * popup('Hello!')
 * ```
 *
 * Here is the result on macOS:
 *
 * ![Screenshot](path/to/screenshot.jpg)
 */
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"parserOptions":{"ecmaVersion":2015,"sourceType":"module"},"rules":{"semi":["error","always"]}},"checkEslintrc":false,"exampleCodeRegex":"/^```(?:js|javascript)\\n([\\s\\S]*?)```$/gm"}]
// Message: @example error (semi): Missing semicolon.

/**
 * @example // begin
 alert('hello')
 // end
 * And here is another example:
 // begin
 alert('there')
 // end
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["warn","always"]}},"checkEslintrc":false,"exampleCodeRegex":"/\\/\\/ begin[\\s\\S]*?// end/g","noDefaultExampleRules":true}]
// Message: @example warning (semi): Missing semicolon.

/**
 * @example
 *   quux();
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"indent":["error"]}},"checkEslintrc":false,"noDefaultExampleRules":false}]
// Message: @example error (indent): Expected indentation of 0 spaces but found 2.

/**
 * @default 'abc'
 */
const str = 'abc';
// "jsdoc/check-examples": ["error"|"warn", {"checkDefaults":true}]
// Message: @default error (quotes): Strings must use doublequote.

/**
 * @param {myType} [name='abc']
 */
function quux () {
}
// "jsdoc/check-examples": ["error"|"warn", {"checkParams":true}]
// Message: @param error (quotes): Strings must use doublequote.

/**
 * @property {myType} [name='abc']
 */
const obj = {};
// "jsdoc/check-examples": ["error"|"warn", {"checkProperties":true}]
// Message: @property error (quotes): Strings must use doublequote.

/**
 * Test function.
 *
 * @example <caption>functionName (paramOne: string, paramTwo?: any,
 * paramThree?: any): boolean</caption> test()
 *
 * @param {string} paramOne Parameter description.
 * @param {any} [paramTwo] Parameter description.
 * @param {any} [paramThree] Parameter description.
 * @returns {boolean} Return description.
 */
const functionName = function (paramOne, paramTwo,
  paramThree) {
  return false;
};
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"parserOptions":{"ecmaVersion":2015,"sourceType":"module"},"rules":{"semi":["error","always"]}},"captionRequired":true,"checkEslintrc":false}]
// Message: @example error (semi): Missing semicolon.
````

The following patterns are not considered problems:

````js
/**
 * @example ```js
 alert('hello');
 ```
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["error","always"]}},"checkEslintrc":false,"exampleCodeRegex":"```js([\\s\\S]*)```"}]

/**
 * @example ```js
 alert('hello');
 ```
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["error","always"]}},"checkEslintrc":false,"exampleCodeRegex":"/```js([\\s\\S]*)```/"}]

/**
 * @example
 * // arbitrary example content
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"checkEslintrc":false}]

/**
 * @example
 * quux(); // does something useful
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"no-undef":["error"]}},"checkEslintrc":false,"noDefaultExampleRules":false}]

/**
 * @example quux();
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"indent":["error"]}},"checkEslintrc":false,"noDefaultExampleRules":false}]

/**
 * @example <caption>Valid usage</caption>
 * quux(); // does something useful
 *
 * @example <caption>Invalid usage</caption>
 * quux('random unwanted arg'); // results in an error
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"captionRequired":true,"checkEslintrc":false}]

/**
 * @example test() // eslint-disable-line semi
 */
function quux () {}
// "jsdoc/check-examples": ["error"|"warn", {"checkEslintrc":false,"noDefaultExampleRules":true,"reportUnusedDisableDirectives":false}]

/**
 * @example
 test() // eslint-disable-line semi
 */
function quux () {}
// "jsdoc/check-examples": ["error"|"warn", {"allowInlineConfig":true,"baseConfig":{"rules":{"semi":["error","always"]}},"checkEslintrc":false,"noDefaultExampleRules":true}]

/**
 * @example ```js
 alert('hello')
 ```
 */
var quux = {

};
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"semi":["error","never"]}},"checkEslintrc":false,"exampleCodeRegex":"```js([\\s\\S]*)```"}]

/**
 * @example
 * foo(function (err) {
 *     throw err;
 * });
 */
function quux () {}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"indent":["error"]}},"checkEslintrc":false,"noDefaultExampleRules":false}]

/**
 * @example
 * const list: number[] = [1, 2, 3];
 * quux(list);
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"parser":"@typescript-eslint/parser","parserOptions":{"ecmaVersion":6},"rules":{"semi":["error","always"]}},"checkEslintrc":false}]

/**
 * @example const ident = 5;
 *   quux2();
 *   bar();
 */
function quux2 () {

}
// "jsdoc/check-examples": ["error"|"warn", {"paddedIndent":2}]

/**
 * @example
 * function quux() {
 *     bar();
 * }
 */
function quux () {

}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"rules":{"indent":["error"]}},"checkEslintrc":false,"noDefaultExampleRules":false}]

// Comment
a();

export default {};

/**
 *
 */
function f () {

}

/**
 * Does quux
 * @example
 * // Do it!
 * quux();
 */
function quux () {
}
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"plugins":["jsdoc"],"rules":{"jsdoc/require-file-overview":["error"]}},"checkEslintrc":false,"noDefaultExampleRules":false}]

/**
 * @default "abc"
 */
const str = 'abc';
// "jsdoc/check-examples": ["error"|"warn", {"checkDefaults":true}]

/**
 * @default
 */
const str = 'abc';
// "jsdoc/check-examples": ["error"|"warn", {"checkDefaults":true}]

/**
 * @param {myType} [name="abc"]
 */
function quux () {
}
// "jsdoc/check-examples": ["error"|"warn", {"checkParams":true}]

/**
 * @param {myType} name
 */
function quux () {
}
// "jsdoc/check-examples": ["error"|"warn", {"checkParams":true}]

/**
 * @property {myType} [name="abc"]
 */
const obj = {};
// "jsdoc/check-examples": ["error"|"warn", {"checkProperties":true}]

/**
 * @property {myType} [name]
 */
const obj = {};
// "jsdoc/check-examples": ["error"|"warn", {"checkProperties":true}]

/**
 * @default 'abc'
 */
const str = 'abc';
// "jsdoc/check-examples": ["error"|"warn", {"checkDefaults":false,"matchingFileNameDefaults":"dummy.js"}]

/**
 * @param {myType} [name='abc']
 */
function quux () {
}
// "jsdoc/check-examples": ["error"|"warn", {"checkParams":false,"matchingFileNameParams":"dummy.js"}]

/**
 * @property {myType} [name='abc']
 */
const obj = {};
// "jsdoc/check-examples": ["error"|"warn", {"checkProperties":false,"matchingFileNameProperties":"dummy.js"}]

/**
 * Test function.
 *
 * @example <caption>functionName (paramOne: string, paramTwo?: any,
 * paramThree?: any): boolean</caption> test();
 *
 * @param {string} paramOne Parameter description.
 * @param {any} [paramTwo] Parameter description.
 * @param {any} [paramThree] Parameter description.
 * @returns {boolean} Return description.
 */
const functionName = function (paramOne, paramTwo,
  paramThree) {
  return false;
};
// "jsdoc/check-examples": ["error"|"warn", {"baseConfig":{"parserOptions":{"ecmaVersion":2015,"sourceType":"module"},"rules":{"semi":["error","always"]}},"captionRequired":true,"checkEslintrc":false}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-indentation"></a>
<a name="eslint-plugin-jsdoc-rules-check-indentation"></a>
### <code>check-indentation</code>

Reports invalid padding inside JSDoc blocks.

Ignores parts enclosed in Markdown "code block"'s. For example,
the following description is not reported:

```js
/**
 * Some description:
 * ```html
 * <section>
 *   <title>test</title>
 * </section>
 * ```
 */
```

<a name="user-content-eslint-plugin-jsdoc-rules-check-indentation-options-2"></a>
<a name="eslint-plugin-jsdoc-rules-check-indentation-options-2"></a>
#### Options

This rule has an object option.

<a name="user-content-eslint-plugin-jsdoc-rules-check-indentation-options-2-excludetags"></a>
<a name="eslint-plugin-jsdoc-rules-check-indentation-options-2-excludetags"></a>
##### <code>excludeTags</code>

Array of tags (e.g., `['example', 'description']`) whose content will be
"hidden" from the `check-indentation` rule. Defaults to `['example']`.

By default, the whole JSDoc block will be checked for invalid padding.
That would include `@example` blocks too, which can get in the way
of adding full, readable examples of code without ending up with multiple
linting issues.

When disabled (by passing `excludeTags: []` option), the following code *will*
report a padding issue:

```js
/**
 * @example
 * anArray.filter((a) => {
 *   return a.b;
 * });
 */
```

|||
|---|---|
|Context|everywhere|
|Tags|N/A|
|Recommended|false|
|Options| `excludeTags` |

The following patterns are considered problems:

````js
/**  foo */
function quux () {

}
// Message: There must be no indentation.

/**
 * foo
 *
 * @param bar
 *  baz
 */
function quux () {

}
// Message: There must be no indentation.

/**
 * Foo
 *   bar
 */
class Moo {}
// Message: There must be no indentation.

/**
 * foo
 *
 * @example
 * anArray.filter((a) => {
 *   return a.b;
 * });
 */
function quux () {

}
// "jsdoc/check-indentation": ["error"|"warn", {"excludeTags":[]}]
// Message: There must be no indentation.

/**
 * foo
 *
 * @example
 *   aaaa
 * @returns
 *   eeee
 */
function quux () {

}
// Message: There must be no indentation.

/**
 * foo
 * ```html
 * <section>
 *   <title>test</title>
 * </section>
 * ```
 * @returns
 *   eeee
 */
function quux () {

}
// Message: There must be no indentation.

/**
 * foo
 * ```   aaaa```
 * @returns
 *   eeee
 */
function quux () {

}
// Message: There must be no indentation.

/**
* @example <caption>
* Here is a long
*   indented summary of this
* example
* </caption>
* ```js
* function hi () {
*   alert('Hello');
* }
* ```
*/
// "jsdoc/check-indentation": ["error"|"warn", {"excludeTags":[]}]
// Message: There must be no indentation.

/**
* @example <caption>
* Here is a long
* summary of this
* example
* </caption>
* // Code is not wrapped into fenced code block
* function hi () {
*   alert('Hello');
* }
*/
// "jsdoc/check-indentation": ["error"|"warn", {"excludeTags":[]}]
// Message: There must be no indentation.
````

The following patterns are not considered problems:

````js
/**
 * foo
 *
 * @param bar
 * baz
 */
function quux () {

}

/*** foo */
function quux () {

}

/**
 * foo
 *
 * @example
 * anArray.filter((a) => {
 *   return a.b;
 * });
 */
function quux () {

}

/**
 * foo
 *
 * @example
 * anArray.filter((a) => {
 *   return a.b;
 * });
 * @returns
 *   eeee
 */
function quux () {

}
// "jsdoc/check-indentation": ["error"|"warn", {"excludeTags":["example","returns"]}]

/**
 * foo
 * ```html
 * <section>
 *   <title>test</title>
 * </section>
 * ```
 * @returns eeee
 */
function quux () {

}

/**
 * foo
 * ```   aaaa```
 * @returns eeee
 */
function quux () {

}

/**
* @example <caption>
* Here is a long
* summary of this
* example
* </caption>
* ```js
* function hi () {
*   alert('Hello');
* }
* ```
*/
// "jsdoc/check-indentation": ["error"|"warn", {"excludeTags":[]}]

/**
 * @example
 * ```
 * @MyDecorator({
 *   myOptions: 42
 * })
 * export class MyClass {}
 * ```
 */
function MyDecorator(options: { myOptions: number }) {
  return (Base: Function) => {};
}
// "jsdoc/check-indentation": ["error"|"warn", {"excludeTags":["example","MyDecorator"]}]

/**
 * @example ```
 * @MyDecorator({
 *   myOptions: 42
 * })
 * export class MyClass {}
 * ```
 */
function MyDecorator(options: { myOptions: number }) {
  return (Base: Function) => {};
}
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-line-alignment"></a>
<a name="eslint-plugin-jsdoc-rules-check-line-alignment"></a>
### <code>check-line-alignment</code>

Reports invalid alignment of JSDoc block lines. This is a
[standard recommended to WordPress code](https://make.wordpress.org/core/handbook/best-practices/inline-documentation-standards/javascript/#aligning-comments),
for example.

<a name="user-content-eslint-plugin-jsdoc-rules-check-line-alignment-options-3"></a>
<a name="eslint-plugin-jsdoc-rules-check-line-alignment-options-3"></a>
#### Options

This rule allows one optional string argument. If it is `"always"` then a
problem is raised when the lines are not aligned. If it is `"never"` then
a problem should be raised when there is more than one space between each
line's parts. Defaults to `"never"`.

Note that in addition to alignment, both options will ensure at least one
space is present after the asterisk delimiter.

After the string, an options object is allowed with the following properties.

<a name="user-content-eslint-plugin-jsdoc-rules-check-line-alignment-options-3-tags"></a>
<a name="eslint-plugin-jsdoc-rules-check-line-alignment-options-3-tags"></a>
##### <code>tags</code>

Use this to change the tags which are sought for alignment changes. *Currently*
*only works with the "never" option.* Defaults to an array of
`['param', 'arg', 'argument', 'property', 'prop', 'returns', 'return']`.

<a name="user-content-eslint-plugin-jsdoc-rules-check-line-alignment-options-3-customspacings"></a>
<a name="eslint-plugin-jsdoc-rules-check-line-alignment-options-3-customspacings"></a>
##### <code>customSpacings</code>

An object with any of the following keys set to an integer. Affects spacing:

- `postDelimiter` - after the asterisk (e.g., `*   @param`)
- `postTag` - after the tag (e.g., `* @param  `)
- `postType` - after the type (e.g., `* @param {someType}   `)
- `postName` - after the name (e.g., `* @param {someType} name   `)

If a spacing is not defined, it defaults to one.

|||
|---|---|
|Context|everywhere|
|Options|(a string matching `"always" or "never"` and optional object with `tags` and `customSpacings`)|
|Tags|`param`, `property`, `returns` and others added by `tags`|
|Aliases|`arg`, `argument`, `prop`, `return`|
|Recommended|false|

The following patterns are considered problems:

````js
/**
 * Function description.
 *
 * @param {string} lorem Description.
 * @param {int} sit Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * With tabs.
 *
 * @param {string} lorem Description.
 * @param {int} sit Description multi words.
 */
    const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param {string} lorem - Description.
 * @param {int} sit - Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param {string} lorem Description.
 * @param {int} sit Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param  {string} lorem Description.
 *  @param {int}    sit   Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param  {string} lorem Description.
  * @param {int}    sit   Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param  {string} lorem Description.
 * @param  {int}    sit   Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param {string} lorem Description.
 * @param {int} sit Description multi words.
 */
function fn( lorem, sit ) {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

const object = {
  /**
   * Function description.
   *
   * @param {string} lorem Description.
   * @param {int} sit Description multi words.
   */
  fn( lorem, sit ) {}
}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

class ClassName {
  /**
   * Function description.
   *
   * @param {string} lorem Description.
   * @param {int} sit Description multi words.
   */
  fn( lorem, sit ) {}
}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @arg {string} lorem Description.
 * @arg {int} sit Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * @namespace
 * @property {object} defaults Description.
 * @property {int} defaults.lorem Description multi words.
 */
const config = {
    defaults: {
        lorem: 1
    }
}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * My object.
 *
 * @typedef {Object} MyObject
 *
 * @property {string} lorem Description.
 * @property {int} sit Description multi words.
 */
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * My object.
 *
 * @typedef {Object} MyObject
 *
 * @property {{a: number, b: string, c}} lorem Description.
 * @property {Object.<string, Class>} sit Description multi words.
 * @property {Object.<string, Class>} amet Description} weird {multi} {{words}}.
 * @property {Object.<string, Class>} dolor
 */
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * My object.
 *
 * @typedef {Object} MyObject
 *
 * @property {{a: number, b: string, c}} lorem Description.
 * @property {Object.<string, Class>} sit Description multi words.
 * @property {Object.<string, Class>} amet Description} weird {multi} {{words}}.
 * @property {Object.<string, Class>} dolor
 */
// "jsdoc/check-line-alignment": ["error"|"warn", "always",{"tags":["typedef","property"]}]
// Message: Expected JSDoc block lines to be aligned.

/**
 * My function.
 *
 * @param {string} lorem  Description.
 * @param {int}    sit    Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never"]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * My function.
 *
 * @param {string} lorem Description.
 * @param   {int}    sit   Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never"]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * My function.
 *
 * @param {string} lorem Description.
 * @param   {int}    sit
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never"]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * My function.
 *
 * @param {string} lorem Description.
 * @param   {int}    sit
 */
const fn = ( lorem, sit ) => {}
// Message: Expected JSDoc block lines to not be aligned.

/**
 * Function description.
 *
 * @param {string} lorem Description.
 * @param {int} sit Description multi
   line without *.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * My function.
 *
 * @param {string} lorem Description.
 * @param   {int}    sit
 *
 * @return  {string}  Return description
 *    with multi line, but don't touch.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always",{"tags":["param"]}]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Only return doc.
 *
 * @return {boolean}  Return description.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param  {object}  options  Options object for each OS.
 * @return {boolean}          True = success, false = failed to create the icon
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never"]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param {object} options Options object for each OS.
 * @return {boolean}          True = success, false = failed to create the icon
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never"]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param {object} options Options object for each OS.
 * @return  True = success, false = failed to create the icon
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never"]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param  options Options object for each OS.
 * @return True = success, false = failed to create the icon
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never"]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param {object} options Options object for each OS.
 * @param {object} other Other.
 * @return  True = success, false = failed to create the icon
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never",{"tags":["param","return"]}]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * Returns the value stored in the process.env for a given
 * environment variable.
 *
 * @param  {string} withPercents    '%USERNAME%'
 * @param  {string} withoutPercents 'USERNAME'
 * @return {string}                 'bob' || '%USERNAME%'
 */
function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never"]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * Function description
 *           description with post delimiter.
 *
 * @param {string} lorem Description.
 * @param {int}    sit   Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param  {string} lorem Description.
 * @param  {int}    sit   Description multi words.
 *
 * @return {string}       Return description.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always",{"customSpacings":{"postDelimiter":2,"postTag":3,"postType":2}}]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param  {string} lorem Description.
 * @param  {int}    sit   Description multi words.
 *
 * @return {string}       Return description.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always",{"customSpacings":{"postName":3}}]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 *  @param   {string}  lorem Description.
 * @param {int} sit Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never",{"customSpacings":{"postDelimiter":2,"postTag":3,"postType":2}}]
// Message: Expected JSDoc block lines to not be aligned.

/**
 * Function description.
 *
 * @param {string} lorem   Description.
 * @param {int} sit Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never",{"customSpacings":{"postName":3}}]
// Message: Expected JSDoc block lines to not be aligned.


       /**\r
        * Function description.\r
        *\r
        * @param {string} lorem Description.\r
        * @param {int} sit Description multi words.\r
        * @param {string} sth   Multi\r
        *                       line description.\r
        */\r
       const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.

/**
 * Function description.
 *
 * @param {string} lorem Description.
 * @param {int} sit Description multi
 *   line with asterisks.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
// Message: Expected JSDoc block lines to be aligned.
````

The following patterns are not considered problems:

````js
/**
 * Function description.
 *
 * @param {string} lorem Description.
 * @param {int}    sit   Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * With tabs.
 *
 * @param {string} lorem Description.
 * @param {int}    sit   Description multi words.
 */
    const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @param {string} lorem - Description.
 * @param {int}    sit   - Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * @param {string} lorem Description.
 * @param {int}    sit
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * @param {int}    sit
 * @param {string} lorem Description.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * No params.
 */
const fn = () => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @param {string} lorem Description.
 * @param {int}    sit   Description multi words.
 */
function fn( lorem, sit ) {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

const object = {
  /**
   * Function description.
   *
   * @param {string} lorem Description.
   * @param {int}    sit   Description multi words.
   */
  fn( lorem, sit ) {},
}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

class ClassName {
  /**
   * Function description.
   *
   * @param {string} lorem Description.
   * @param {int}    sit   Description multi words.
   */
  fn( lorem, sit ) {}
}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @arg {string} lorem Description.
 * @arg {int}    sit   Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * @namespace
 * @property {object} defaults       Description.
 * @property {int}    defaults.lorem Description multi words.
 */
const config = {
    defaults: {
        lorem: 1
    }
}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * My object.
 *
 * @typedef {Object} MyObject
 *
 * @property {string} lorem Description.
 * @property {int}    sit   Description multi words.
 */
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * My object.
 *
 * @typedef {Object} MyObject
 *
 * @property {{a: number, b: string, c}} lorem Description.
 * @property {Object.<string, Class>}    sit   Description multi words.
 * @property {Object.<string, Class>}    amet  Description} weird {multi} {{words}}.
 * @property {Object.<string, Class>}    dolor
 */
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * My object.
 *
 * @typedef  {Object}                    MyObject
 *
 * @property {{a: number, b: string, c}} lorem    Description.
 * @property {Object.<string, Class>}    sit      Description multi words.
 * @property {Object.<string, Class>}    amet     Description} weird {multi} {{words}}.
 * @property {Object.<string, Class>}    dolor
 */
// "jsdoc/check-line-alignment": ["error"|"warn", "always",{"tags":["typedef","property"]}]

/**
 * My object.
 *
 * @template                             T
 * @template                             W,X,Y,Z
 * @template {string}                    K               - K must be a string or string literal
 * @template {{ serious(): string }}     Seriousalizable - must have a serious method
 *
 * @param    {{a: number, b: string, c}} lorem           Description.
 */
// "jsdoc/check-line-alignment": ["error"|"warn", "always",{"tags":["template","param"]}]

/** @param {number} lorem */
const fn = ( lorem ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param  {object}  options Options object for each OS.
 * @return {boolean}         True = success, false = failed to create the icon
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param  {object}  options Options object for each OS.
 * @return {boolean}
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Only return doc.
 *
 * @return {boolean} Return description.
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Not validating without option.
 *
 * @param {string} lorem Description.
 * @param {int} sit Description multi words.
 */
const fn = ( lorem, sit ) => {}

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param {object} options Options object for each OS.
 * @return {boolean} True = success, false = failed to create the icon
 */
function quux (options) {}

/**
 * Creates OS based shortcuts for files, folders, and applications.
 *
 * @param {object} options Options object for each OS.
 * @param {object} other Other.
 * @return  True = success, false = failed to create the icon
 */
 function quux () {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never",{"tags":["param"]}]

/**
 * @param parameter Description.
 */
function func(parameter){

}

/**
 * Function description
 *           description with post delimiter.
 *
 * @param {string} lorem Description.
 * @param {int}    sit   Description multi words.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always",{"preserveMainDescriptionPostDelimiter":true}]

/**
 * Function description.
 *
 *  @param    {string}  lorem Description.
 *  @param    {int}     sit   Description multi words.
 *
 *  @return   {string}        Return description.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always",{"customSpacings":{"postDelimiter":2,"postTag":3,"postType":2}}]

/**
 * Function description.
 *
 *  @param   {string}  lorem Description.
 *  @param   {int}  sit Description multi words.
 *
 *  @return   {string}  Return description.
 */
const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "never",{"customSpacings":{"postDelimiter":2,"postTag":3,"postType":2}}]

/**
 * @param {{
 *        ids: number[]
 *        }}            params
 */
const fn = ({ids}) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]


       /**\r
        * Function description.\r
        *\r
        * @param {string} lorem Description.\r
        * @param {int}    sit   Description multi words.\r
        * @param {string} sth   Multi\r
        *                       line description.\r
        */\r
       const fn = ( lorem, sit ) => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @param lorem Description.
 * @param sit   Description multi words.
 */
const fn = ( lorem, sit ) => {};

/**
 * Function description.
 *
 * @return Return description.
 */
const fn2 = () => {}
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @param lorem Description.
 * @param sit   Description multi words.
 * @return      Return description.
 */
const fn = ( lorem, sit ) => {};

/**
 * Function description.
 *
 * @param lorem Description.
 * @param sit   Description multi words.
 * @returns     Return description.
 */
const fn2 = ( lorem, sit ) => {};

/**
 * Function description.
 *
 * @param a Description.
 * @param b Description multi words.
 * @returns Return description.
 */
const fn3 = ( a, b ) => {};
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @argument lorem Description.
 * @return         Return description.
 */
const fn = ( lorem ) => {};

/**
 * Function description.
 *
 * @argument lorem Description.
 * @returns        Return description.
 */
const fn2 = ( lorem ) => {};
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @arg a   Description.
 * @returns Return description.
 */
const fn = ( a ) => {};
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @arg   lorem Description.
 * @param sit   Return description.
 */
const fn = ( lorem, sit ) => {};
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]

/**
 * Function description.
 *
 * @arg      a Description.
 * @argument b Second description.
 * @returns    Return description.
 */
const fn = ( a, b ) => {};
// "jsdoc/check-line-alignment": ["error"|"warn", "always"]
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names"></a>
### <code>check-param-names</code>

Ensures that parameter names in JSDoc are matched by corresponding items in
the function declaration.

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-destructuring"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-destructuring"></a>
#### Destructuring

Note that by default the rule will not report parameters present on the docs
but non-existing on the function signature when an object rest property is part
of that function signature since the seemingly non-existing properties might
actually be a part of the object rest property.

```js
/**
 * @param options
 * @param options.foo
 */
function quux ({foo, ...extra}) {}
```

To require that `extra` be documented--and that any extraneous properties
get reported--e.g., if there had been a `@param options.bar` above--you
can use the `checkRestProperty` option which insists that the rest
property be documented (and that there be no other implicit properties).
Note, however, that jsdoc [does not appear](https://github.com/jsdoc/jsdoc/issues/1773)
to currently support syntax or output to distinguish rest properties from
other properties, so in looking at the docs alone without looking at the
function signature, the disadvantage of enabling this option is that it
may appear that there is an actual property named `extra`.

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-options-4"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-options-4"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-options-4-checkrestproperty"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-options-4-checkrestproperty"></a>
##### <code>checkRestProperty</code>

See the "Destructuring" section. Defaults to `false`.

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-options-4-checktypespattern"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-options-4-checktypespattern"></a>
##### <code>checkTypesPattern</code>

See `require-param` under the option of the same name.

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-options-4-enablefixer"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-options-4-enablefixer"></a>
##### <code>enableFixer</code>

Set to `true` to auto-remove `@param` duplicates (based on identical
names).

Note that this option will remove duplicates of the same name even if
the definitions do not match in other ways (e.g., the second param will
be removed even if it has a different type or description).

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-options-4-allowextratrailingparamdocs"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-options-4-allowextratrailingparamdocs"></a>
##### <code>allowExtraTrailingParamDocs</code>

If set to `true`, this option will allow extra `@param` definitions (e.g.,
representing future expected or virtual params) to be present without needing
their presence within the function signature. Other inconsistencies between
`@param`'s and present function parameters will still be reported.

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-options-4-checkdestructured"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-options-4-checkdestructured"></a>
##### <code>checkDestructured</code>

Whether to check destructured properties. Defaults to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-options-4-usedefaultobjectproperties"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-options-4-usedefaultobjectproperties"></a>
##### <code>useDefaultObjectProperties</code>

Set to `true` if you wish to avoid reporting of child property documentation
where instead of destructuring, a whole plain object is supplied as default
value but you wish its keys to be considered as signalling that the properties
are present and can therefore be documented. Defaults to `false`.

<a name="user-content-eslint-plugin-jsdoc-rules-check-param-names-options-4-disableextrapropertyreporting"></a>
<a name="eslint-plugin-jsdoc-rules-check-param-names-options-4-disableextrapropertyreporting"></a>
##### <code>disableExtraPropertyReporting</code>

Whether to check for extra destructured properties. Defaults to `false`. Change
to `true` if you want to be able to document properties which are not actually
destructured. Keep as `false` if you expect properties to be documented in
their own types. Note that extra properties will always be reported if another
item at the same level is destructured as destructuring will prevent other
access and this option is only intended to permit documenting extra properties
that are available and actually used in the function.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`|
|Options|`allowExtraTrailingParamDocs`, `checkDestructured`, `checkRestProperty`, `checkTypesPattern`, `useDefaultObjectProperties`, `disableExtraPropertyReporting`|
|Tags|`param`|
|Aliases|`arg`, `argument`|
|Recommended|true|
The following patterns are considered problems:

````js
/**
 * @param Foo
 */
function quux (foo = 'FOO') {

}
// Message: Expected @param names to be "foo". Got "Foo".

/**
 * @arg Foo
 */
function quux (foo = 'FOO') {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"arg"}}}
// Message: Expected @arg names to be "foo". Got "Foo".

/**
 * @param Foo
 */
function quux (foo) {

}
// Message: Expected @param names to be "foo". Got "Foo".

/**
 * @param Foo.Bar
 */
function quux (foo) {

}
// Message: @param path declaration ("Foo.Bar") appears before any real parameter.

/**
 * @param foo
 * @param Foo.Bar
 */
function quux (foo) {

}
// Message: @param path declaration ("Foo.Bar") root node name ("Foo") does not match previous real parameter name ("foo").

/**
 * Assign the project to a list of employees.
 * @param {string} employees[].name - The name of an employee.
 * @param {string} employees[].department - The employee's department.
 */
function assign (employees) {

};
// Message: @param path declaration ("employees[].name") appears before any real parameter.

/**
 * Assign the project to a list of employees.
 * @param {string} employees[].name - The name of an employee.
 * @param {string} employees[].name - The employee's department.
 */
function assign (employees) {

};
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "employees[].name"

/**
 * @param foo
 * @param foo.bar
 * @param bar
 */
function quux (bar, foo) {

}
// Message: Expected @param names to be "bar, foo". Got "foo, bar".

/**
 * @param foo
 * @param bar
 */
function quux (foo) {

}
// Message: @param "bar" does not match an existing function parameter.

/**
 * @param foo
 * @param foo
 */
function quux (foo) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "foo"

class bar {
    /**
     * @param foo
     * @param foo
     */
    quux (foo) {

    }
}
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "foo"

/**
 * @param foo
 * @param foo
 */
function quux (foo, bar) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "foo"

/**
 * @param foo
 * @param foo
 */
function quux (foo, foo) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "foo"

/**
 * @param cfg
 * @param cfg.foo
 * @param cfg.foo
 */
function quux ({foo}) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "cfg.foo"

/**
 * @param cfg
 * @param cfg.foo
 * @param cfg.foo
 */
function quux ({foo}) {

}
// Message: Duplicate @param "cfg.foo"

/**
 * @param cfg
 * @param cfg.foo
 */
function quux ({foo, bar}) {

}
// Message: Missing @param "cfg.bar"

/**
 * @param cfg
 * @param cfg.foo
 * @param [cfg.foo]
 * @param baz
 */
function quux ({foo}, baz) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "cfg.foo"

/**
 * @param cfg
 * @param cfg.foo
 * @param [cfg.foo="with a default"]
 * @param baz
 */
function quux ({foo, bar}, baz) {

}
// Message: Missing @param "cfg.bar"

/**
 * @param cfg
 * @param cfg.foo
 * @param [cfg.foo="with a default"]
 * @param baz
 */
function quux ({foo}, baz) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "cfg.foo"

/**
 * @param cfg
 * @param [cfg.foo="with a default"]
 * @param baz
 */
function quux ({foo, bar}, baz) {

}
// Message: Missing @param "cfg.bar"

/**
 * @param args
 */
function quux ({a, b}) {

}
// Message: Missing @param "args.a"

/**
 * @param args
 */
function quux ({a, b} = {}) {

}
// Message: Missing @param "args.a"

export class SomeClass {
  /**
   * @param prop
   */
  constructor(private property: string) {}
}
// Message: Expected @param names to be "property". Got "prop".

export class SomeClass {
  /**
   * @param prop
   * @param prop.foo
   */
  constructor(prop: { foo: string, bar: string }) {}
}
// Message: Missing @param "prop.bar"

export class SomeClass {
  /**
   * @param prop
   * @param prop.foo
   * @param prop.bar
   */
  constructor(options: { foo: string, bar: string }) {}
}
// Message: @param "prop" does not match parameter name "options"

export class SomeClass {
  /**
   * @param options
   * @param options.foo
   * @param options.bar
   */
  constructor(options: { foo: string }) {}
}
// Message: @param "options.bar" does not exist on options

/**
 * @param foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":false}}}
// Message: Unexpected tag `@param`

/**
 * @param {Error} error Exit code
 * @param {number} [code = 1] Exit code
 */
function quux (error, cde = 1) {
};
// Message: Expected @param names to be "error, cde". Got "error, code".

/**
 * @param foo
 */
function quux ([a, b] = []) {

}
// Message: Missing @param "foo."0""

/**
 * @param options
 * @param options.foo
 */
function quux ({foo, ...extra}) {
}
// "jsdoc/check-param-names": ["error"|"warn", {"checkRestProperty":true}]
// Message: Missing @param "options.extra"

/**
 * @param cfg
 * @param cfg.foo
 * @param cfg.bar
 * @param cfg.extra
 */
function quux ({foo, ...extra}) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"checkRestProperty":true}]
// Message: @param "cfg.bar" does not exist on cfg

/**
 * Converts an SVGRect into an object.
 * @param {SVGRect} bbox - a SVGRect
 */
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};
// "jsdoc/check-param-names": ["error"|"warn", {"checkTypesPattern":"SVGRect"}]
// Message: Missing @param "bbox.x"

/**
 * Converts an SVGRect into an object.
 * @param {object} bbox - a SVGRect
 */
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};
// Message: Missing @param "bbox.x"

module.exports = class GraphQL {
  /**
   * @param fetchOptions
   * @param cacheKey
   */
  fetch = ({ url, ...options }, cacheKey) => {
  }
};
// "jsdoc/check-param-names": ["error"|"warn", {"checkRestProperty":true}]
// Message: Missing @param "fetchOptions.url"

/**
 * Testing
 *
 * @param options
 * @param options.one One
 * @param options.two Two
 * @param options.four Four
 */
function testingEslint(options: {
  one: string;
  two: string;
  three: string;
}): string {
  return one + two + three;
}
// Message: Missing @param "options.three"

/**
 *
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"name":false,"required":["name"]}}}}
// Message: Cannot add "name" to `require` with the tag's `name` set to `false`

/**
 * @param root
 * @param foo
 */
function quux ({foo, bar}, baz) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"checkDestructured":false}]
// Message: Expected @param names to be "root, baz". Got "root, foo".

/**
 * Description.
 * @param {Object} options
 * @param {FooBar} foo
 */
function quux ({ foo: { bar } }) {}
// Message: Missing @param "options.foo"

/**
 * Description.
 * @param {Object} options
 * @param options.foo
 */
function quux ({ foo: { bar } }) {}
// Message: Missing @param "options.foo.bar"

/**
 * Description.
 * @param {object} options Options.
 * @param {object} options.foo A description.
 * @param {object} options.foo.bar
 */
function foo({ foo: { bar: { baz } }}) {}
// Message: Missing @param "options.foo.bar.baz"

/**
* Returns a number.
* @param {Object} props Props.
* @param {Object} props.prop Prop.
* @param {string} props.prop.a String.
* @param {string} props.prop.b String.
* @return {number} A number.
*/
export function testFn1 ({ prop = { a: 1, b: 2 } }) {
}
// "jsdoc/check-param-names": ["error"|"warn", {"useDefaultObjectProperties":false}]
// Message: @param "props.prop.a" does not exist on props

/**
 * @param {object} cfg
 * @param {string} cfg.foo
 * @param {string} cfg.bar
 * @param {object} cfg.extra
 */
function quux ({foo}) {

}
// Message: @param "cfg.bar" does not exist on cfg

/**
 * @param {object} cfg
 * @param {string} cfg.foo
 * @param {string} cfg.bar
 * @param {object} cfg.extra
 */
function quux ({foo}) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"disableExtraPropertyReporting":true}]
// Message: @param "cfg.bar" does not exist on cfg

/**
 * @param {object} root
 * @param {object} root.cfg
 * @param {object} root.cfg.a
 * @param {string} root.cfg.a.foo
 * @param {string} root.cfg.a.bar
 * @param {object} root.cfg.a.extra
 */
function quux ({cfg: {a: {foo}}}) {

}
// Message: @param "root.cfg.a.bar" does not exist on root

/**
 * @param {object} root
 * @param {object} root.cfg
 * @param {object} root.cfg.a
 * @param {string} root.cfg.a.foo
 * @param {string} root.cfg.a.bar
 * @param {object} root.cfg.a.extra
 */
function quux ({cfg: {a: {foo}}}) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"disableExtraPropertyReporting":true}]
// Message: @param "root.cfg.a.bar" does not exist on root

/**
 * @param {object} root
 * @param {object} root.cfg
 * @param {string} root.cfg.foo
 * @param {string} root.cfg.bar
 * @param {object} root.cfg.extra
 */
function quux ({cfg}) {

}
// Message: @param "root.cfg.foo" does not exist on root

/**
 * @param foo
 * @param foo
 *   on another line
 */
function quux (foo) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @param "foo"

/**
 * @param barr This is the description of bar. Oops, we misspelled "bar" as "barr".
 */
declare function foo(bar: number) {}
// Message: Expected @param names to be "bar". Got "barr".
````

The following patterns are not considered problems:

````js
/**
 *
 */
function quux (foo) {

}

/**
 * @param foo
 */
function quux (foo) {

}

/**
 * @param foo
 * @param bar
 */
function quux (foo, bar) {

}

/**
 * @param foo
 * @param bar
 */
function quux (foo, bar, baz) {

}

/**
 * @param foo
 * @param foo.foo
 * @param bar
 */
function quux (foo, bar) {

}

/**
 * @param args
 */
function quux (...args) {

}

/**
 * @param foo
 * @param foo.a
 * @param foo.b
 */
function quux ({a, b}) {

}

/**
 * @param foo
 * @param foo.a
 * @param foo.b
 */
function quux ({"a": A, b}) {

}

/**
 * @param foo
 * @param foo."a"
 * @param foo.b
 */
function quux ({a: A, b}) {

}

/**
 * @param foo
 * @param foo."a-b"
 * @param foo.b
 */
function quux ({"a-b": A, b}) {

}

/**
 * @param foo
 * @param foo.bar
 * @param foo.baz
 * @param bar
 */
function quux (foo, bar) {

}

/**
 * Assign the project to a list of employees.
 * @param {object[]} employees - The employees who are responsible for the project.
 * @param {string} employees[].name - The name of an employee.
 * @param {string} employees[].department - The employee's department.
 */
function assign (employees) {

};

export class SomeClass {
  /**
   * @param property
   */
  constructor(private property: string) {}
}

export class SomeClass {
  /**
   * @param options
   * @param options.foo
   * @param options.bar
   */
  constructor(options: { foo: string, bar: string }) {}
}

export class SomeClass {
  /**
   * @param options
   * @param options.foo
   * @param options.bar
   */
  constructor({ foo, bar }: { foo: string, bar: string }) {}
}

export class SomeClass {
  /**
   * @param options
   * @param options.foo
   * @param options.bar
   */
  constructor({ foo, bar }: { foo: string, bar: string }) {}
}

/**
 * @param {Error} error Exit code
 * @param {number} [code = 1] Exit code
 */
function quux (error, code = 1) {
};

/**
 * @param foo
 * @param bar
 */
function quux (foo) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"allowExtraTrailingParamDocs":true}]

/**
 * @param cfg
 * @param cfg.foo
 * @param baz
 */
function quux ({foo}, baz) {

}

/**
 * @param cfg
 * @param cfg.foo
 * @param cfg2
 */
function quux ({foo}, cfg2) {

}

/**
 * @param cfg
 * @param cfg.foo
 * @param baz
 * @param baz.cfg
 */
function quux ({foo}, {cfg}) {

}

/**
 * @param options
 * @param options.foo
 */
function quux ({foo, ...extra}) {
}

/**
 * @param foo
 * @param bar
 */
function quux (foo, bar, ...extra) {

}

/**
* Converts an SVGRect into an object.
* @param {SVGRect} bbox - a SVGRect
*/
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};

/**
* Converts an SVGRect into an object.
* @param {SVGRect} bbox - a SVGRect
*/
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};

/**
* Converts an SVGRect into an object.
* @param {object} bbox - a SVGRect
*/
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};
// "jsdoc/check-param-names": ["error"|"warn", {"checkTypesPattern":"SVGRect"}]

class CSS {
  /**
   * Set one or more CSS properties for the set of matched elements.
   *
   * @param {Object} propertyObject - An object of property-value pairs to set.
   */
  setCssObject(propertyObject: {[key: string]: string | number}): void {
  }
}

/**
 * Logs a string.
 *
 * @param input - String to output.
 */
export default function (input: {
  [foo: string]: { a: string; b: string };
}): void {
  input;
}

export class Thing {
  foo: any;

  /**
   * @param {} C
   */
  constructor(C: { new (): any }) {
    this.foo = new C();
  }
}

/**
 * @param foo
 * @param root
 */
function quux (foo, {bar}) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"checkDestructured":false}]

class A {
  /**
   * Show a prompt.
   * @param hideButton true if button should be hidden, false otherwise
   * @param onHidden delegate to call when the prompt is hidden
   */
  public async showPrompt(hideButton: boolean, onHidden: {(): void}): Promise<void>
  {
  }
}

/**
 * Description.
 * @param {Object} options Options.
 * @param {FooBar} options.foo foo description.
 */
function quux ({ foo: { bar }}) {}

/**
 * Description.
 * @param {FooBar} options
 * @param {Object} options.foo
 */
function quux ({ foo: { bar } }) {}
// "jsdoc/check-param-names": ["error"|"warn", {"checkTypesPattern":"FooBar"}]

/**
 * Description.
 * @param {Object} options
 * @param {FooBar} options.foo
 * @param {FooBar} options.baz
 */
function quux ({ foo: { bar }, baz: { cfg } }) {}

/**
 * Item
 *
 * @param {object} props
 * @param {object} props.data - case data
 * @param {string} props.data.className - additional css class
 * @param props.val
 */
export default function Item({
  data: {
    className,
  } = {},
  val = 4
}) {
}

/**
 * @param obj
 * @param obj.data
 * @param obj.data."0"
 * @param obj.data."1"
 * @param obj.data."2"
 * @param obj.defaulting
 * @param obj.defaulting."0"
 * @param obj.defaulting."1"
 */
function Item({
  data: [foo, bar, ...baz],
  defaulting: [quux, xyz] = []
}) {
}

/**
* Returns a number.
* @param {Object} props Props.
* @param {Object} props.prop Prop.
* @param {string} props.prop.a String.
* @param {string} props.prop.b String.
* @return {number} A number.
*/
export function testFn1 ({ prop = { a: 1, b: 2 } }) {
}
// "jsdoc/check-param-names": ["error"|"warn", {"useDefaultObjectProperties":true}]

/**
 * @param {object} root
 * @param {object} root.cfg
 * @param {string} root.cfg.foo
 * @param {string} root.cfg.bar
 * @param {object} root.cfg.extra
 */
function quux ({cfg}) {

}
// "jsdoc/check-param-names": ["error"|"warn", {"disableExtraPropertyReporting":true}]

class A {
    /**
     * @param cfg
     * @param cfg.abc
     */
    constructor({
        [new.target.prop]: cX,
        abc
    }) {
    }
}

/**
 * @param root
 * @param root."0" Ignored
 * @param root."1" Our "b"
 */
const foo = ([, b]) => b;

/**
 * @param arg1 This is the description for arg1.
 */
function foo(this: void, arg1: number): void;

declare global {
  /**
   * @param arg1 This is the number for foo.
   */
  function foo(this: void, arg1: number): void;
}

declare global {
  /**
   * @param r Range is 0-1.
   * @param g Range is 0-1.
   * @param b Range is 0-1.
   */
  function Color(
    this: void,
    r: float,
    g: float,
    b: float,
  ): Color;
}

/**
 * @param this desc
 * @param bar number to return
 * @returns number returned back to caller
 */
function foo(this: T, bar: number): number {
  console.log(this.name);
  return bar;
}
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-property-names"></a>
<a name="eslint-plugin-jsdoc-rules-check-property-names"></a>
### <code>check-property-names</code>

Ensures that property names in JSDoc are not duplicated on the same block
and that nested properties have defined roots.

<a name="user-content-eslint-plugin-jsdoc-rules-check-property-names-options-5"></a>
<a name="eslint-plugin-jsdoc-rules-check-property-names-options-5"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-check-property-names-options-5-enablefixer-1"></a>
<a name="eslint-plugin-jsdoc-rules-check-property-names-options-5-enablefixer-1"></a>
##### <code>enableFixer</code>

Set to `true` to auto-remove `@property` duplicates (based on
identical names).

Note that this option will remove duplicates of the same name even if
the definitions do not match in other ways (e.g., the second property will
be removed even if it has a different type or description).

|||
|---|---|
|Context|Everywhere|
|Options|`enableFixer`|
|Tags|`property`|
|Aliases|`prop`|
|Recommended|true|

The following patterns are considered problems:

````js
/**
 * @typedef (SomeType) SomeTypedef
 * @property Foo.Bar
 */
// Message: @property path declaration ("Foo.Bar") appears before any real property.

/**
 * @typedef (SomeType) SomeTypedef
 * @property foo
 * @property Foo.Bar
 */
// Message: @property path declaration ("Foo.Bar") root node name ("Foo") does not match previous real property name ("foo").

/**
 * Assign the project to a list of employees.
 * @typedef (SomeType) SomeTypedef
 * @property {string} employees[].name - The name of an employee.
 * @property {string} employees[].department - The employee's department.
 */
// Message: @property path declaration ("employees[].name") appears before any real property.

/**
 * Assign the project to a list of employees.
 * @typedef (SomeType) SomeTypedef
 * @property {string} employees[].name - The name of an employee.
 * @property {string} employees[].name - The employee's department.
 */
// "jsdoc/check-property-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @property "employees[].name"

/**
 * @typedef (SomeType) SomeTypedef
 * @property foo
 * @property foo
 */
// "jsdoc/check-property-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @property "foo"

/**
 * @typedef (SomeType) SomeTypedef
 * @property foo
 * @property foo
 */
// Message: Duplicate @property "foo"

/**
 * @typedef (SomeType) SomeTypedef
 * @property cfg
 * @property cfg.foo
 * @property cfg.foo
 */
function quux ({foo, bar}) {

}
// "jsdoc/check-property-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @property "cfg.foo"

class Test {
    /**
     * @typedef (SomeType) SomeTypedef
     * @property cfg
     * @property cfg.foo
     * @property cfg.foo
     */
    quux ({foo, bar}) {

    }
}
// "jsdoc/check-property-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @property "cfg.foo"

/**
 * @typedef (SomeType) SomeTypedef
 * @property cfg
 * @property cfg.foo
 * @property [cfg.foo]
 * @property baz
 */
function quux ({foo, bar}, baz) {

}
// "jsdoc/check-property-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @property "cfg.foo"

/**
 * @typedef (SomeType) SomeTypedef
 * @property cfg
 * @property cfg.foo
 * @property [cfg.foo="with a default"]
 * @property baz
 */
function quux ({foo, bar}, baz) {

}
// "jsdoc/check-property-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @property "cfg.foo"

/**
 * @typedef (SomeType) SomeTypedef
 * @prop foo
 * @prop foo
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":"prop"}}}
// "jsdoc/check-property-names": ["error"|"warn", {"enableFixer":true}]
// Message: Duplicate @prop "foo"

/**
 * @typedef (SomeType) SomeTypedef
 * @property foo
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":false}}}
// Message: Unexpected tag `@property`
````

The following patterns are not considered problems:

````js
/**
 *
 */

/**
 * @typedef (SomeType) SomeTypedef
 * @property foo
 */

/**
 * @typedef (SomeType) SomeTypedef
 * @prop foo
 */

/**
 * @typedef (SomeType) SomeTypedef
 * @property foo
 * @property bar
 */

/**
 * @typedef (SomeType) SomeTypedef
 * @property foo
 * @property foo.foo
 * @property bar
 */

/**
 * Assign the project to a list of employees.
 * @typedef (SomeType) SomeTypedef
 * @property {object[]} employees - The employees who are responsible for the project.
 * @property {string} employees[].name - The name of an employee.
 * @property {string} employees[].department - The employee's department.
 */

/**
 * @typedef (SomeType) SomeTypedef
 * @property {Error} error Exit code
 * @property {number} [code = 1] Exit code
 */

/**
 * @namespace (SomeType) SomeNamespace
 * @property {Error} error Exit code
 * @property {number} [code = 1] Exit code
 */

/**
 * @class
 * @property {Error} error Exit code
 * @property {number} [code = 1] Exit code
 */
function quux (code = 1) {
  this.error = new Error('oops');
  this.code = code;
}

/**
 * @typedef (SomeType) SomeTypedef
 * @property foo
 * @property foo.bar
 * @property foo.baz
 * @property bar
 */
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-syntax"></a>
<a name="eslint-plugin-jsdoc-rules-check-syntax"></a>
### <code>check-syntax</code>

Reports against syntax not encouraged for the mode (e.g., Google Closure
Compiler in "jsdoc" or "typescript" mode). Note that this rule will not check
for types that are wholly invalid for a given mode, as that is covered by
`valid-types`.

Currently checks against:

- Use of `=` in "jsdoc" or "typescript" mode

Note that "jsdoc" actually allows Closure syntax, but with another
option available for optional parameters (enclosing the name in brackets), the
rule is enforced (except under "permissive" and "closure" modes).

|||
|---|---|
|Context|everywhere|
|Tags|N/A|
|Recommended|false|

The following patterns are considered problems:

````js
/**
 * @param {string=} foo
 */
function quux (foo) {

}
// Message: Syntax should not be Google Closure Compiler style.
````

The following patterns are not considered problems:

````js
/**
 * @param {string=} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @param {string} [foo]
 */
function quux (foo) {

}

/**
 *
 */
function quux (foo) {

}
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-tag-names"></a>
<a name="eslint-plugin-jsdoc-rules-check-tag-names"></a>
### <code>check-tag-names</code>

Reports invalid block tag names.

Valid [JSDoc 3 Block Tags](https://jsdoc.app/#block-tags) are:

```
abstract
access
alias
async
augments
author
borrows
callback
class
classdesc
constant
constructs
copyright
default
deprecated
description
enum
event
example
exports
external
file
fires
function
generator
global
hideconstructor
ignore
implements
inheritdoc
inner
instance
interface
kind
lends
license
listens
member
memberof
memberof!
mixes
mixin
module
name
namespace
override
package
param
private
property
protected
public
readonly
requires
returns
see
since
static
summary
this
throws
todo
tutorial
type
typedef
variation
version
yields
```

`modifies` is also supported (see [source](https://github.com/jsdoc/jsdoc/blob/master/packages/jsdoc/lib/jsdoc/tag/dictionary/definitions.js#L594))
but is undocumented.

The following synonyms are also recognized if you set them in
`tagNamePreference` as a key (or replacement):

```
arg
argument
const
constructor
defaultvalue
desc
emits
exception
extends
fileoverview
func
host
method
overview
prop
return
var
virtual
yield
```

If you wish to allow in certain cases both a primary tag name and its
alias(es), you can set a normally non-preferred tag name to itself to indicate
that you want to allow both the default tag (in this case `@returns`) and a
non-default (in this case `return`):

```js
"tagNamePreference": {
    "return": "return",
}
```

Because the tags indicated as replacements in
`settings.jsdoc.tagNamePreference` will automatically be considered as valid,
the above works.

Likewise are the tag keys of `settings.jsdoc.structuredTags` automatically
considered as valid (as their defining an expected structure for tags implies
the tags may be used).

For [TypeScript](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html#supported-jsdoc)
(or Closure), when `settings.jsdoc.mode` is set to `typescript` or `closure`,
one may also use the following:

```
template
```

And for [Closure](https://github.com/google/closure-compiler/wiki/Annotating-JavaScript-for-the-Closure-Compiler),
when `settings.jsdoc.mode` is set to `closure`, one may use the following (in
addition to the jsdoc and TypeScript tags–though replacing `returns` with
`return`):

```
define (synonym of `const` per jsdoc source)
dict
export
externs
final
implicitCast (casing distinct from that recognized by jsdoc internally)
inheritDoc (casing distinct from that recognized by jsdoc internally)
noalias
nocollapse
nocompile
noinline
nosideeffects
polymer
polymerBehavior
preserve
record (synonym of `interface` per jsdoc source)
struct
suppress
unrestricted
```

...and these undocumented tags which are only in [source](https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/parsing/Annotation.java):

```
closurePrimitive
customElement
expose
hidden
idGenerator
meaning
mixinClass
mixinFunction
ngInject
owner
typeSummary
wizaction
```

<a name="user-content-eslint-plugin-jsdoc-rules-check-tag-names-options-6"></a>
<a name="eslint-plugin-jsdoc-rules-check-tag-names-options-6"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-check-tag-names-options-6-definedtags"></a>
<a name="eslint-plugin-jsdoc-rules-check-tag-names-options-6-definedtags"></a>
##### <code>definedTags</code>

Use an array of `definedTags` strings to configure additional, allowed tags.
The format is as follows:

```json
{
  "definedTags": ["note", "record"]
}
```

<a name="user-content-eslint-plugin-jsdoc-rules-check-tag-names-jsxtags"></a>
<a name="eslint-plugin-jsdoc-rules-check-tag-names-jsxtags"></a>
#### <code>jsxTags</code>

If this is set to `true`, all of the following tags used to control JSX output are allowed:

```
jsx
jsxFrag
jsxImportSource
jsxRuntime
```

For more information, see the [babel documentation](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx).


|||
|---|---|
|Context|everywhere|
|Tags|N/A|
|Recommended|true|
|Options|`definedTags`|
|Settings|`tagNamePreference`, `mode`|

The following patterns are considered problems:

````js
/** @typoo {string} */
let a;
// Message: Invalid JSDoc tag name "typoo".

/** @typoo {string} */
let a;
// Settings: {"jsdoc":{"structuredTags":{"parameter":{"name":"namepath-referencing","required":["type","name"],"type":true}}}}
// Message: Invalid JSDoc tag name "typoo".

/**
 * @Param
 */
function quux () {

}
// Message: Invalid JSDoc tag name "Param".

/**
 * @foo
 */
function quux () {

}
// Message: Invalid JSDoc tag name "foo".

/**
 * @arg foo
 */
function quux (foo) {

}
// Message: Invalid JSDoc tag (preference). Replace "arg" JSDoc tag with "param".

/**
 * @param foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"arg"}}}
// Message: Invalid JSDoc tag (preference). Replace "param" JSDoc tag with "arg".

/**
 * @constructor foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"tag constructor":"cons"}}}
// Message: Invalid JSDoc tag (preference). Replace "constructor" JSDoc tag with "cons".

/**
 * @arg foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"arg":"somethingDifferent"}}}
// Message: Invalid JSDoc tag (preference). Replace "arg" JSDoc tag with "somethingDifferent".

/**
 * @param foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"parameter"}}}
// Message: Invalid JSDoc tag (preference). Replace "param" JSDoc tag with "parameter".

/**
 * @bar foo
 */
function quux (foo) {

}
// Message: Invalid JSDoc tag name "bar".

/**
 * @baz @bar foo
 */
function quux (foo) {

}
// "jsdoc/check-tag-names": ["error"|"warn", {"definedTags":["bar"]}]
// Message: Invalid JSDoc tag name "baz".

/**
 * @bar
 * @baz
 */
function quux (foo) {

}
// "jsdoc/check-tag-names": ["error"|"warn", {"definedTags":["bar"]}]
// Message: Invalid JSDoc tag name "baz".

/**
 * @todo
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"todo":false}}}
// Message: Blacklisted tag found (`@todo`)

/**
 * @todo
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"todo":{"message":"Please resolve to-dos or add to the tracker"}}}}
// Message: Please resolve to-dos or add to the tracker

/**
 * @todo
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"todo":{"message":"Please use x-todo instead of todo","replacement":"x-todo"}}}}
// Message: Please use x-todo instead of todo

/**
 * @todo
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"todo":{"message":"Please use x-todo instead of todo","replacement":"x-todo"}}}}
// Message: Please use x-todo instead of todo

/**
 * @todo
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"todo":55}}}
// Message: Invalid `settings.jsdoc.tagNamePreference`. Values must be falsy, a string, or an object.

/**
 * @property {object} a
 * @prop {boolean} b
 */
function quux () {

}
// Message: Invalid JSDoc tag (preference). Replace "prop" JSDoc tag with "property".

/**
 * @abc foo
 * @abcd bar
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"abc":"abcd"}}}
// "jsdoc/check-tag-names": ["error"|"warn", {"definedTags":["abcd"]}]
// Message: Invalid JSDoc tag (preference). Replace "abc" JSDoc tag with "abcd".

/**
 * @abc
 * @abcd
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"abc":"abcd"}}}
// Message: Invalid JSDoc tag (preference). Replace "abc" JSDoc tag with "abcd".

/**
 * @returns
 */
function quux (foo) {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Invalid JSDoc tag (preference). Replace "returns" JSDoc tag with "return".

/** 
 * @modifies
 * @abstract
 * @access
 * @alias
 * @async
 * @augments
 * @author
 * @borrows
 * @callback
 * @class
 * @classdesc
 * @constant
 * @constructs
 * @copyright
 * @default
 * @deprecated
 * @description
 * @enum
 * @event
 * @example
 * @exports
 * @external
 * @file
 * @fires
 * @function
 * @generator
 * @global
 * @hideconstructor
 * @ignore
 * @implements
 * @inheritdoc
 * @inheritDoc
 * @inner
 * @instance
 * @interface
 * @kind
 * @lends
 * @license
 * @listens
 * @member
 * @memberof
 * @memberof!
 * @mixes
 * @mixin
 * @module
 * @name
 * @namespace
 * @override
 * @package
 * @param
 * @private
 * @property
 * @protected
 * @public
 * @readonly
 * @requires
 * @returns
 * @see
 * @since
 * @static
 * @summary
 * @this
 * @throws
 * @todo
 * @tutorial
 * @type
 * @typedef
 * @variation
 * @version
 * @yields
 */
function quux (foo) {}
// Settings: {"jsdoc":{"mode":"badMode"}}
// Message: Unrecognized value `badMode` for `settings.jsdoc.mode`.

/** 
 * @modifies
 * @abstract
 * @access
 * @alias
 * @async
 * @augments
 * @author
 * @borrows
 * @callback
 * @class
 * @classdesc
 * @constant
 * @constructs
 * @copyright
 * @default
 * @deprecated
 * @description
 * @enum
 * @event
 * @example
 * @exports
 * @external
 * @file
 * @fires
 * @function
 * @generator
 * @global
 * @hideconstructor
 * @ignore
 * @implements
 * @inheritdoc
 * @inheritDoc
 * @inner
 * @instance
 * @interface
 * @kind
 * @lends
 * @license
 * @listens
 * @member
 * @memberof
 * @memberof!
 * @mixes
 * @mixin
 * @module
 * @name
 * @namespace
 * @override
 * @package
 * @param
 * @private
 * @property
 * @protected
 * @public
 * @readonly
 * @requires
 * @returns
 * @see
 * @since
 * @static
 * @summary
 * @this
 * @throws
 * @todo
 * @tutorial
 * @type
 * @typedef
 * @variation
 * @version
 * @yields
 * @internal
 * @template
 */
function quux (foo) {}
// Message: Invalid JSDoc tag name "internal".

/** 
 * @externs
 */
function quux (foo) {}
// Message: Invalid JSDoc tag name "externs".

/** @jsx h */
/** @jsxFrag Fragment */
/** @jsxImportSource preact */
/** @jsxRuntime automatic */
// Message: Invalid JSDoc tag name "jsx".

/**
 * @constructor
 */
function Test() {
  this.works = false;
}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":"return"}}}
// Message: Invalid JSDoc tag (preference). Replace "constructor" JSDoc tag with "class".
````

The following patterns are not considered problems:

````js
/**
 * @param foo
 */
function quux (foo) {

}

/**
 * @memberof! foo
 */
function quux (foo) {

}

/**
 * @arg foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"arg"}}}

/**
 * @parameter foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"structuredTags":{"parameter":{"name":"namepath-referencing","required":["type","name"],"type":true}}}}

/**
 * @bar foo
 */
function quux (foo) {

}
// "jsdoc/check-tag-names": ["error"|"warn", {"definedTags":["bar"]}]

/**
 * @baz @bar foo
 */
function quux (foo) {

}
// "jsdoc/check-tag-names": ["error"|"warn", {"definedTags":["baz","bar"]}]

/**
 * @baz @bar foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"baz","returns":{"message":"Prefer `bar`","replacement":"bar"},"todo":false}}}

/**
 * @returns
 */
function quux (foo) {}

/**
 * @return
 */
function quux (foo) {}
// Settings: {"jsdoc":{"mode":"closure"}}

/** 
 * @modifies
 * @abstract
 * @access
 * @alias
 * @async
 * @augments
 * @author
 * @borrows
 * @callback
 * @class
 * @classdesc
 * @constant
 * @constructs
 * @copyright
 * @default
 * @deprecated
 * @description
 * @enum
 * @event
 * @example
 * @exports
 * @external
 * @file
 * @fires
 * @function
 * @generator
 * @global
 * @hideconstructor
 * @ignore
 * @implements
 * @inheritdoc
 * @inheritDoc
 * @inner
 * @instance
 * @interface
 * @kind
 * @lends
 * @license
 * @listens
 * @member
 * @memberof
 * @memberof!
 * @mixes
 * @mixin
 * @module
 * @name
 * @namespace
 * @override
 * @package
 * @param
 * @private
 * @property
 * @protected
 * @public
 * @readonly
 * @requires
 * @returns
 * @see
 * @since
 * @static
 * @summary
 * @this
 * @throws
 * @todo
 * @tutorial
 * @type
 * @typedef
 * @variation
 * @version
 * @yields
 */
function quux (foo) {}

/** 
 * @modifies
 * @abstract
 * @access
 * @alias
 * @async
 * @augments
 * @author
 * @borrows
 * @callback
 * @class
 * @classdesc
 * @constant
 * @constructs
 * @copyright
 * @default
 * @deprecated
 * @description
 * @enum
 * @event
 * @example
 * @exports
 * @external
 * @file
 * @fires
 * @function
 * @generator
 * @global
 * @hideconstructor
 * @ignore
 * @implements
 * @inheritdoc
 * @inheritDoc
 * @inner
 * @instance
 * @interface
 * @kind
 * @lends
 * @license
 * @listens
 * @member
 * @memberof
 * @memberof!
 * @mixes
 * @mixin
 * @module
 * @name
 * @namespace
 * @override
 * @package
 * @param
 * @private
 * @property
 * @protected
 * @public
 * @readonly
 * @requires
 * @returns
 * @see
 * @since
 * @static
 * @summary
 * @this
 * @throws
 * @todo
 * @tutorial
 * @type
 * @typedef
 * @variation
 * @version
 * @yields
 * @internal
 * @template
 */
function quux (foo) {}
// Settings: {"jsdoc":{"mode":"typescript"}}

/** 
 * @externs
 */
function quux (foo) {}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 *
 */
function quux (foo) {

}

/**
 * @todo
 */
function quux () {

}

/**
 * @extends Foo
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"augments":{"message":"@extends is to be used over @augments.","replacement":"extends"}}}}

/**
 * (Set tag name preference to itself to get aliases to
 *   work along with main tag name.)
 * @augments Bar
 * @extends Foo
 */
function quux () {
}
// Settings: {"jsdoc":{"tagNamePreference":{"extends":"extends"}}}

/**
 * Registers the `target` class as a transient dependency; each time the dependency is resolved a new instance will be created.
 *
 * @param target - The class / constructor function to register as transient.
 *
 * @example ```ts
@transient()
class Foo { }
```
 * @param Time for a new tag
 */
export function transient<T>(target?: T): T {
  // ...
}

/** @jsx h */
/** @jsxFrag Fragment */
/** @jsxImportSource preact */
/** @jsxRuntime automatic */
// "jsdoc/check-tag-names": ["error"|"warn", {"jsxTags":true}]

/**
 * @internal
 */
// Settings: {"jsdoc":{"mode":"typescript"}}
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-types"></a>
<a name="eslint-plugin-jsdoc-rules-check-types"></a>
### <code>check-types</code>

Reports invalid types.

By default, ensures that the casing of native types is the same as in this
list:

```
undefined
null
boolean
number
bigint
string
symbol
object (For TypeScript's sake, however, using `Object` when specifying child types on it like `Object<string, number>`)
Array
Function
Date
RegExp
```

<a name="user-content-eslint-plugin-jsdoc-rules-check-types-options-7"></a>
<a name="eslint-plugin-jsdoc-rules-check-types-options-7"></a>
#### Options

`check-types` allows one option:

- An option object:
  - with the key `noDefaults` to insist that only the supplied option type
    map is to be used, and that the default preferences (such as "string"
    over "String") will not be enforced. The option's default is `false`.
  - with the key `exemptTagContexts` which will avoid reporting when a
    bad type is found on a specified tag. Set to an array of objects with
    a key `tag` set to the tag to exempt, and a `types` key which can
    either be `true` to indicate that any types on that tag will be allowed,
    or to an array of strings which will only allow specific bad types.
    If an array of strings is given, these must match the type exactly,
    e.g., if you only allow `"object"`, it will not allow
    `"object<string, string>"`. Note that this is different from the
    behavior of `settings.jsdoc.preferredTypes`. This option is useful
    for normally restricting generic types like `object` with
    `preferredTypes`, but allowing `typedef` to indicate that its base
    type is `object`.
  - with the key `unifyParentAndChildTypeChecks` which will treat
    `settings.jsdoc.preferredTypes` keys such as `SomeType` as matching
    not only child types such as an unadorned `SomeType` but also
    `SomeType<aChildType>`, `SomeType.<aChildType>`, or if `SomeType` is
    `Array` (or `[]`), it will match `aChildType[]`. If this is `false` or
    unset, the former format will only apply to types which are not parent
    types/unions whereas the latter formats will only apply for parent
    types/unions. The special types `[]`, `.<>` (or `.`), and `<>`
    act only as parent types (and will not match a bare child type such as
    `Array` even when unified, though, as mentioned, `Array` will match
    say `string[]` or `Array.<string>` when unified). The special type
    `*` is only a child type. Note that there is no detection of parent
    and child type together, e.g., you cannot specify preferences for
    `string[]` specifically as distinct from say `number[]`, but you can
    target both with `[]` or the child types `number` or `string`.

If a value is present both as a key and as a value, neither the key nor the
value will be reported. Thus one can use this fact to allow both `object`
and `Object`, for example. Note that in "typescript" mode, this is the default
behavior.

See also the documentation on `settings.jsdoc.preferredTypes` which impacts
the behavior of `check-types`.

Note that if there is an error [parsing](https://github.com/jsdoc-type-pratt-parser/jsdoc-type-pratt-parser)
types for a tag, the function will silently ignore that tag, leaving it to
the `valid-types` rule to report parsing errors.

<a name="user-content-eslint-plugin-jsdoc-rules-check-types-why-not-capital-case-everything"></a>
<a name="eslint-plugin-jsdoc-rules-check-types-why-not-capital-case-everything"></a>
#### Why not capital case everything?

Why are `boolean`, `number` and `string` exempt from starting with a capital
letter? Let's take `string` as an example. In Javascript, everything is an
object. The `String` object has prototypes for string functions such as
`.toUpperCase()`.

Fortunately we don't have to write `new String()` everywhere in our code.
Javascript will automatically wrap string primitives into string Objects when
we're applying a string function to a string primitive. This way the memory
footprint is a tiny little bit smaller, and the
[GC](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)) has
less work to do.

So in a sense, there are two types of strings in Javascript:
1. `{string}` literals, also called primitives
2. `{String}` Objects.

We use the primitives because it's easier to write and uses less memory.
`{String}` and `{string}` are technically both valid, but they are not the same.

```js
new String('lard') // String {0: "l", 1: "a", 2: "r", 3: "d", length: 4}
'lard' // "lard"
new String('lard') === 'lard' // false
```

To make things more confusing, there are also object literals (like `{}`) and
`Object` objects. But object literals are still static `Object`s and `Object`
objects are instantiated objects. So an object primitive is still an `Object`
object.

However, `Object.create(null)` objects are not `instanceof Object`, however, so
in the case of such a plain object we lower-case to indicate possible support
for these objects. Also, nowadays, TypeScript also discourages use of `Object`
as a lone type. However, one additional complexity is that TypeScript allows and
actually [currently requires](https://github.com/microsoft/TypeScript/issues/20555)
`Object` (with the initial upper-case) if used in the syntax
`Object.<keyType, valueType>` or `Object<keyType, valueType`, perhaps to
adhere to that which [JSDoc documents](https://jsdoc.app/tags-type.html).

So, for optimal compatibility with TypeScript (especially since TypeScript
tools can be used on plain JavaScript with JSDoc), we are now requiring this
TypeScript approach by default (if you set `object` type `preferredTypes` in
TypeScript mode, the defaults will not apply).

Basically, for primitives, we want to define the type as a primitive, because
that's what we use in 99.9% of cases. For everything else, we use the type
rather than the primitive. Otherwise it would all just be `{object}` (with the
additional exception of the special case of `Object.<>` just mentioned).

In short: It's not about consistency, rather about the 99.9% use case. (And
some functions might not even support the objects if they are checking for
identity.)

type name | `typeof` | check-types | testcase
--|--|--|--
**Array** | object | **Array** | `([]) instanceof Array` -> `true`
**Function** | function | **Function** | `(function f () {}) instanceof Function` -> `true`
**Date** | object | **Date** | `(new Date()) instanceof Date` -> `true`
**RegExp** | object | **RegExp** | `(new RegExp(/.+/)) instanceof RegExp` -> `true`
Object | **object** | **object** | `({}) instanceof Object` -> `true` but `Object.create(null) instanceof Object` -> `false`
Boolean | **boolean** | **boolean** | `(true) instanceof Boolean` -> **`false`**
Number | **number** | **number** | `(41) instanceof Number` -> **`false`**
String | **string** | **string** | `("test") instanceof String` -> **`false`**

If you define your own tags and don't wish their bracketed portions checked
for types, you can use `settings.jsdoc.structuredTags` with a tag `type` of
`false`. If you set their `type` to an array, only those values will be
permitted.

|||
|---|---|
|Context|everywhere|
|Tags|`augments`, `class`, `constant`, `enum`, `implements`, `member`, `module`, `namespace`, `param`, `property`, `returns`, `throws`, `type`, `typedef`, `yields`|
|Aliases|`constructor`, `const`, `extends`, `var`, `arg`, `argument`, `prop`, `return`, `exception`, `yield`|
|Closure-only|`package`, `private`, `protected`, `public`, `static`|
|Recommended|true|
|Options|`noDefaults`, `exemptTagContexts`, `unifyParentAndChildTypeChecks`|
|Settings|`preferredTypes`, `mode`, `structuredTags`|

The following patterns are considered problems:

````js
/**
 * @param {abc} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"abc":100}}}
// Message: Invalid `settings.jsdoc.preferredTypes`. Values must be falsy, a string, or an object.

/**
 * @param {Number} foo
 */
function quux (foo) {

}
// Message: Invalid JSDoc @param "foo" type "Number"; prefer: "number".

/**
 * @arg {Number} foo
 */
function quux (foo) {

}
// Message: Invalid JSDoc @arg "foo" type "Number"; prefer: "number".

/**
 * @returns {Number} foo
 * @throws {Number} foo
 */
function quux () {

}
// Message: Invalid JSDoc @returns type "Number"; prefer: "number".

/**
 * @param {(Number | string | Boolean)=} foo
 */
function quux (foo, bar, baz) {

}
// Message: Invalid JSDoc @param "foo" type "Number"; prefer: "number".

/**
 * @param {Array.<Number | String>} foo
 */
function quux (foo, bar, baz) {

}
// Message: Invalid JSDoc @param "foo" type "Number"; prefer: "number".

/**
 * @param {(Number | String)[]} foo
 */
function quux (foo, bar, baz) {

}
// Message: Invalid JSDoc @param "foo" type "Number"; prefer: "number".

/**
 * @param {abc} foo
 */
function qux(foo) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":"Abc","string":"Str"}}}
// Message: Invalid JSDoc @param "foo" type "abc"; prefer: "Abc".

/**
 * @param {abc} foo
 */
function qux(foo) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":{"replacement":"Abc"},"string":"Str"}}}
// Message: Invalid JSDoc @param "foo" type "abc"; prefer: "Abc".

/**
 * @param {abc} foo
 */
function qux(foo) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":{"message":"Messed up JSDoc @{{tagName}}{{tagValue}} type \"abc\"; prefer: \"Abc\".","replacement":"Abc"},"string":"Str"}}}
// Message: Messed up JSDoc @param "foo" type "abc"; prefer: "Abc".

/**
 * @param {abc} foo
 * @param {cde} bar
 * @param {object} baz
 */
function qux(foo, bar, baz) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":{"message":"Messed up JSDoc @{{tagName}}{{tagValue}} type \"abc\"; prefer: \"Abc\".","replacement":"Abc"},"cde":{"message":"More messed up JSDoc @{{tagName}}{{tagValue}} type \"cde\"; prefer: \"Cde\".","replacement":"Cde"},"object":"Object"}}}
// Message: Messed up JSDoc @param "foo" type "abc"; prefer: "Abc".

/**
 * @param {abc} foo
 */
function qux(foo) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":{"message":"Messed up JSDoc @{{tagName}}{{tagValue}} type \"abc\".","replacement":false},"string":"Str"}}}
// Message: Messed up JSDoc @param "foo" type "abc".

/**
 * @param {abc} foo
 */
function qux(foo) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":{"message":"Messed up JSDoc @{{tagName}}{{tagValue}} type \"abc\"."},"string":"Str"}}}
// Message: Messed up JSDoc @param "foo" type "abc".

/**
 * @param {abc} foo
 * @param {Number} bar
 */
function qux(foo, bar) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":"Abc","string":"Str"}}}
// "jsdoc/check-types": ["error"|"warn", {"noDefaults":true}]
// Message: Invalid JSDoc @param "foo" type "abc"; prefer: "Abc".

/**
 * @param {abc} foo
 * @param {Number} bar
 */
function qux(foo, bar) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":"Abc","string":"Str"}}}
// Message: Invalid JSDoc @param "foo" type "abc"; prefer: "Abc".

/**
 * @param {abc} foo
 */
function qux(foo) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":false,"string":"Str"}}}
// Message: Invalid JSDoc @param "foo" type "abc".

/**
 * @param {abc} foo
 */
function qux(foo) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":false}}}
// Message: Invalid JSDoc @param "foo" type "abc".

/**
 * @param {*} baz
 */
function qux(baz) {
}
// Settings: {"jsdoc":{"preferredTypes":{"*":false,"abc":"Abc","string":"Str"}}}
// Message: Invalid JSDoc @param "baz" type "*".

/**
 * @param {*} baz
 */
function qux(baz) {
}
// Settings: {"jsdoc":{"preferredTypes":{"*":"aaa","abc":"Abc","string":"Str"}}}
// Message: Invalid JSDoc @param "baz" type "*"; prefer: "aaa".

/**
 * @param {abc} foo
 * @param {Number} bar
 */
function qux(foo, bar) {
}
// Settings: {"jsdoc":{"preferredTypes":{"abc":"Abc","string":"Str"}}}
// Message: Invalid JSDoc @param "foo" type "abc"; prefer: "Abc".

/**
 * @param {Array} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array":"GenericArray"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "GenericArray".

/**
 * @param {Array} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array":"GenericArray","Array.<>":"GenericArray"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "GenericArray".

/**
 * @param {Array.<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array.<>":"GenericArray"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "GenericArray".

/**
 * @param {Array<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array<>":"GenericArray"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "GenericArray".

/**
 * @param {string[]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"[]":"SpecialTypeArray"}}}
// Message: Invalid JSDoc @param "foo" type "[]"; prefer: "SpecialTypeArray".

/**
 * @param {string[]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"[]":"SpecialTypeArray"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "[]"; prefer: "SpecialTypeArray".

/**
 * @param {string[]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array":"SpecialTypeArray"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "SpecialTypeArray".

/**
 * @param {object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject","object.<>":"GenericObject"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject","object<>":"GenericObject"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object.<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object.<>":"GenericObject"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object<>":"GenericObject"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object.<string, number>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object.<>":"GenericObject"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object<string, number>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object<>":"GenericObject"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object.<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":false}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "object".

/**
 * @param {object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":false}}}
// Message: Invalid JSDoc @param "foo" type "object".

/**
 * @param {object.<string, number>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 * @param {object<string, number>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "GenericObject".

/**
 *
 * @param {string[][]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"[]":"Array."}}}
// Message: Invalid JSDoc @param "foo" type "[]"; prefer: "Array.".

/**
 *
 * @param {string[][]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"[]":"Array.<>"}}}
// Message: Invalid JSDoc @param "foo" type "[]"; prefer: "Array.<>".

/**
 *
 * @param {string[][]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"[]":"Array<>"}}}
// Message: Invalid JSDoc @param "foo" type "[]"; prefer: "Array<>".

/**
 *
 * @param {object.<string, object.<string, string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object.":"Object"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "Object".

/**
 *
 * @param {object.<string, object.<string, string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object.":"Object<>"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "Object<>".

/**
 *
 * @param {object<string, object<string, string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object<>":"Object."}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "Object.".

/**
 *
 * @param {Array.<Array.<string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array.":"[]"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "[]".

/**
 *
 * @param {Array.<Array.<string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array.":"Array<>"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "Array<>".

/**
 *
 * @param {Array.<Array.<string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array.":"<>"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "<>".

/**
 *
 * @param {Array.<MyArray.<string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array.":"<>"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "<>".

/**
 *
 * @param {Array.<MyArray.<string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"MyArray.":"<>"}}}
// Message: Invalid JSDoc @param "foo" type "MyArray"; prefer: "<>".

/**
 *
 * @param {Array<Array<string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"<>":"Array."}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "Array.".

/**
 *
 * @param {Array<Array<string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array":"Array."}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "Array.".

/**
 *
 * @param {Array<Array<string>>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"<>":"[]"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "[]".

/** @typedef {String} foo */
// Message: Invalid JSDoc @typedef "foo" type "String"; prefer: "string".

/**
 * @this {array}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Invalid JSDoc @this type "array"; prefer: "Array".

/**
 * @export {array}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Invalid JSDoc @export type "array"; prefer: "Array".

/**
 * @typedef {object} foo
 * @property {object} bar
 */
// Settings: {"jsdoc":{"preferredTypes":{"object":"Object"}}}
// "jsdoc/check-types": ["error"|"warn", {"exemptTagContexts":[{"tag":"typedef","types":true}]}]
// Message: Invalid JSDoc @property "bar" type "object"; prefer: "Object".

/** @typedef {object} foo */
// Settings: {"jsdoc":{"preferredTypes":{"object":"Object"}}}
// "jsdoc/check-types": ["error"|"warn", {"exemptTagContexts":[{"tag":"typedef","types":["array"]}]}]
// Message: Invalid JSDoc @typedef "foo" type "object"; prefer: "Object".

/**
 * @typedef {object} foo
 * @property {object} bar
 */
// Settings: {"jsdoc":{"preferredTypes":{"object":"Object"}}}
// "jsdoc/check-types": ["error"|"warn", {"exemptTagContexts":[{"tag":"typedef","types":["object"]}]}]
// Message: Invalid JSDoc @property "bar" type "object"; prefer: "Object".

/** @typedef {object<string, string>} foo */
// Settings: {"jsdoc":{"preferredTypes":{"object<>":"Object<>"}}}
// "jsdoc/check-types": ["error"|"warn", {"exemptTagContexts":[{"tag":"typedef","types":["object"]}]}]
// Message: Invalid JSDoc @typedef "foo" type "object"; prefer: "Object<>".

/**
 * @param {Array<number | undefined>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array.<>":"[]","Array<>":"[]"}}}
// Message: Invalid JSDoc @param "foo" type "Array"; prefer: "[]".

/**
 * @typedef {object} foo
 */
function a () {}

/**
 * @typedef {Object<string>} foo
 */
function b () {}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"object":"Object"}}}
// Message: Invalid JSDoc @typedef "foo" type "object"; prefer: "Object".

/**
 * @aCustomTag {Number} foo
 */
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":true}}}}
// Message: Invalid JSDoc @aCustomTag "foo" type "Number"; prefer: "number".

/**
 * @aCustomTag {Number} foo
 */
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":["otherType","anotherType"]}}}}
// Message: Invalid JSDoc @aCustomTag "foo" type "Number"; prefer: ["otherType","anotherType"].

/**
 * @param {Object[]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"Object":"object"}}}
// Message: Invalid JSDoc @param "foo" type "Object"; prefer: "object".

/**
 * @param {object.<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"object.<>":"Object"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "Object".

/**
 * @param {object.<string, number>} foo
 */
function quux (foo) {
}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"Object":"object","object.<>":"Object<>","Object.<>":"Object<>","object<>":"Object<>"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "Object<>".

/**
 * @param {Object.<string, number>} foo
 */
function quux (foo) {
}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"Object":"object","object.<>":"Object<>","Object.<>":"Object<>","object<>":"Object<>"}}}
// Message: Invalid JSDoc @param "foo" type "Object"; prefer: "Object<>".

/**
 * @param {object<string, number>} foo
 */
function quux (foo) {
}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"Object":"object","object.<>":"Object<>","Object.<>":"Object<>","object<>":"Object<>"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "Object<>".

/**
 * @param {object.<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"Object":"object","object.<>":"Object<>","Object.<>":"Object<>","object<>":"Object<>"}}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "Object<>".

/**
 * @param {object.<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"mode":"typescript"}}
// Message: Invalid JSDoc @param "foo" type "object"; prefer: "Object<>".

/**
 *
 * @param {Object} param
 * @return {Object | String}
 */
function abc(param) {
  if (param.a)
    return {};
  return 'abc';
}
// Message: Invalid JSDoc @param "param" type "Object"; prefer: "object".

/**
 * @param {object} root
 * @param {number} root.a
 * @param {object} b
 */
function a () {}
// Settings: {"jsdoc":{"preferredTypes":{"object":{"skipRootChecking":true}}}}
// Message: Invalid JSDoc @param "b" type "object".
````

The following patterns are not considered problems:

````js
/**
 * @param {number} foo
 * @param {Bar} bar
 * @param {*} baz
 */
function quux (foo, bar, baz) {

}

/**
 * @arg {number} foo
 * @arg {Bar} bar
 * @arg {*} baz
 */
function quux (foo, bar, baz) {

}

/**
 * @param {(number | string | boolean)=} foo
 */
function quux (foo, bar, baz) {

}

/**
 * @param {typeof bar} foo
 */
function qux(foo) {
}

/**
 * @param {import('./foo').bar.baz} foo
 */
function qux(foo) {
}

/**
 * @param {(x: number, y: string) => string} foo
 */
function qux(foo) {
}

/**
 * @param {() => string} foo
 */
function qux(foo) {
}

/**
 * @returns {Number} foo
 * @throws {Number} foo
 */
function quux () {

}
// "jsdoc/check-types": ["error"|"warn", {"noDefaults":true}]

/**
 * @param {Object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"Object"}}}

/**
 * @param {Array} foo
 */
function quux (foo) {

}

/**
 * @param {Array.<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array":"GenericArray"}}}

/**
 * @param {Array<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array":"GenericArray"}}}

/**
 * @param {string[]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array":"SpecialTypeArray","Array.<>":"SpecialTypeArray","Array<>":"SpecialTypeArray"}}}

/**
 * @param {string[]} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array.<>":"SpecialTypeArray","Array<>":"SpecialTypeArray"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]

/**
 * @param {Array} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"[]":"SpecialTypeArray"}}}

/**
 * @param {Array} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"[]":"SpecialTypeArray"}}}
// "jsdoc/check-types": ["error"|"warn", {"unifyParentAndChildTypeChecks":true}]

/**
 * @param {Array} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array.<>":"GenericArray"}}}

/**
 * @param {Array} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"Array<>":"GenericArray"}}}

/**
 * @param {object} foo
 */
function quux (foo) {

}

/**
 * @param {object.<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}

/**
 * @param {object<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}

/**
 * @param {object.<string, number>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}

/**
 * @param {object<string, number>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object":"GenericObject"}}}

/**
 * @param {object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object.<>":"GenericObject"}}}

/**
 * @param {object} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"preferredTypes":{"object<>":"GenericObject"}}}

/**
 * @param {Number<} Ignore the error as not a validating rule
 */
function quux (foo) {

}

/** @param {function(...)} callback The function to invoke. */
var subscribe = function(callback) {};

/**
 * @this {Array}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @export {Array}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}

/** @type {new() => EntityBase} */

/** @typedef {object} foo */
// Settings: {"jsdoc":{"preferredTypes":{"object":"Object"}}}
// "jsdoc/check-types": ["error"|"warn", {"exemptTagContexts":[{"tag":"typedef","types":true}]}]

/** @typedef {object<string, string>} foo */
// Settings: {"jsdoc":{"preferredTypes":{"object":"Object"}}}

/** @typedef {object<string, string>} foo */
// Settings: {"jsdoc":{"preferredTypes":{"object<>":"Object<>"}}}
// "jsdoc/check-types": ["error"|"warn", {"exemptTagContexts":[{"tag":"typedef","types":["object<string, string>"]}]}]

/**
 * @typedef {object} foo
 */

 /**
  * @typedef {Object} foo
  */
// Settings: {"jsdoc":{"preferredTypes":{"object":"Object","Object":"object"}}}

/**
 * @typedef {object} foo
 */
function a () {}

/**
 * @typedef {Object} foo
 */
function b () {}
// Settings: {"jsdoc":{"preferredTypes":{"object":"Object","Object":"object"}}}

/**
 * @typedef {object} foo
 */
function a () {}

/**
 * @typedef {Object<string>} foo
 */
function b () {}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @aCustomTag {Number} foo
 */
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":false}}}}

/**
 * @aCustomTag {otherType} foo
 */
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":["otherType","anotherType"]}}}}

/**
 * @aCustomTag {anotherType|otherType} foo
 */
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":["otherType","anotherType"]}}}}

/**
 * Bad types handled by `valid-types` instead.
 * @param {str(} foo
 */
function quux (foo) {

}

/**
 * @param {Object<string>} foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @typedef {object} foo
 */
function a () {}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"Object":"object","object.<>":"Object<>","object<>":"Object<>"}}}

/**
 * @typedef {Object<string, number>} foo
 */
function a () {}
// Settings: {"jsdoc":{"mode":"typescript","preferredTypes":{"Object":"object","object.<>":"Object<>","object<>":"Object<>"}}}

/**
 * Does something.
 *
 * @param {Object<string,string>} spec - Foo.
 */
function foo(spec) {
    return spec;
}

foo()

/**
 * @param {object} root
 * @param {number} root.a
 */
function a () {}
// Settings: {"jsdoc":{"preferredTypes":{"object":{"message":"Won't see this message","skipRootChecking":true}}}}
````


<a name="user-content-eslint-plugin-jsdoc-rules-check-values"></a>
<a name="eslint-plugin-jsdoc-rules-check-values"></a>
### <code>check-values</code>

This rule checks the values for a handful of tags:

1. `@version` - Checks that there is a present and valid
    [semver](https://semver.org/) version value.
2. `@since` - As with `@version`
3. `@license` - Checks that there is a present and valid SPDX identifier
    or is present within an `allowedLicenses` option.
4. `@author` - Checks that there is a value present, and if the option
    `allowedAuthors` is present, ensure that the author value is one
    of these array items.
5. `@variation` - If `numericOnlyVariation` is set, will checks that there
    is a value present, and that it is an integer (otherwise, jsdoc allows any
    value).
6. `@kind` - Insists that it be one of the allowed values: 'class',
    'constant', 'event', 'external', 'file', 'function', 'member', 'mixin',
    'module', 'namespace', 'typedef',

<a name="user-content-eslint-plugin-jsdoc-rules-check-values-options-8"></a>
<a name="eslint-plugin-jsdoc-rules-check-values-options-8"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-check-values-options-8-allowedauthors"></a>
<a name="eslint-plugin-jsdoc-rules-check-values-options-8-allowedauthors"></a>
##### <code>allowedAuthors</code>

An array of allowable author values. If absent, only non-whitespace will
be checked for.

<a name="user-content-eslint-plugin-jsdoc-rules-check-values-options-8-allowedlicenses"></a>
<a name="eslint-plugin-jsdoc-rules-check-values-options-8-allowedlicenses"></a>
##### <code>allowedLicenses</code>

An array of allowable license values or `true` to allow any license text.
If present as an array, will be used in place of SPDX identifiers.

<a name="user-content-eslint-plugin-jsdoc-rules-check-values-options-8-licensepattern"></a>
<a name="eslint-plugin-jsdoc-rules-check-values-options-8-licensepattern"></a>
##### <code>licensePattern</code>

A string to be converted into a `RegExp` (with `u` flag) and whose first
parenthetical grouping, if present, will match the portion of the license
description to check (if no grouping is present, then the whole portion
matched will be used). Defaults to `/([^\n\r]*)/gu`, i.e., the SPDX expression
is expected before any line breaks.

Note that the `/` delimiters are optional, but necessary to add flags.

Defaults to using the `u` flag, so to add your own flags, encapsulate
your expression as a string, but like a literal, e.g., `/^mit$/ui`.

<a name="user-content-eslint-plugin-jsdoc-rules-check-values-options-8-numericonlyvariation"></a>
<a name="eslint-plugin-jsdoc-rules-check-values-options-8-numericonlyvariation"></a>
##### <code>numericOnlyVariation</code>

Whether to enable validation that `@variation` must be a number. Defaults to
`false`.

|||
|---|---|
|Context|everywhere|
|Tags|`@version`, `@since`, `@kind`, `@license`, `@author`, `@variation`|
|Recommended|true|
|Options|`allowedAuthors`, `allowedLicenses`, `licensePattern`|
|Settings|`tagNamePreference`|

The following patterns are considered problems:

````js
/**
 * @version
 */
function quux (foo) {

}
// Message: Missing JSDoc @version value.

/**
 * @version 3.1
 */
function quux (foo) {

}
// Message: Invalid JSDoc @version: "3.1".

/**
 * @kind
 */
function quux (foo) {

}
// Message: Missing JSDoc @kind value.

/**
 * @kind -3
 */
function quux (foo) {

}
// Message: Invalid JSDoc @kind: "-3"; must be one of: class, constant, event, external, file, function, member, mixin, module, namespace, typedef.

/**
 * @variation -3
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"numericOnlyVariation":true}]
// Message: Invalid JSDoc @variation: "-3".

/**
 * @since
 */
function quux (foo) {

}
// Message: Missing JSDoc @since value.

/**
 * @since 3.1
 */
function quux (foo) {

}
// Message: Invalid JSDoc @since: "3.1".

/**
 * @license
 */
function quux (foo) {

}
// Message: Missing JSDoc @license value.

/**
 * @license FOO
 */
function quux (foo) {

}
// Message: Invalid JSDoc @license: "FOO"; expected SPDX expression: https://spdx.org/licenses/.

/**
 * @license FOO
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"allowedLicenses":["BAR","BAX"]}]
// Message: Invalid JSDoc @license: "FOO"; expected one of BAR, BAX.

/**
 * @license MIT-7
 * Some extra text...
 */
function quux (foo) {

}
// Message: Invalid JSDoc @license: "MIT-7"; expected SPDX expression: https://spdx.org/licenses/.

/**
 * @license (MIT OR GPL-2.5)
 */
function quux (foo) {

}
// Message: Invalid JSDoc @license: "(MIT OR GPL-2.5)"; expected SPDX expression: https://spdx.org/licenses/.

/**
 * @license MIT
 * Some extra text
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"licensePattern":"[\\s\\S]*"}]
// Message: Invalid JSDoc @license: "MIT
Some extra text"; expected SPDX expression: https://spdx.org/licenses/.

/**
 * @author
 */
function quux (foo) {

}
// Message: Missing JSDoc @author value.

/**
 * @author Brett Zamir
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"allowedAuthors":["Gajus Kuizinas","golopot"]}]
// Message: Invalid JSDoc @author: "Brett Zamir"; expected one of Gajus Kuizinas, golopot.

/**
 * @variation
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"numericOnlyVariation":true}]
// Message: Missing JSDoc @variation value.

/**
 * @variation 5.2
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"numericOnlyVariation":true}]
// Message: Invalid JSDoc @variation: "5.2".

/**
 * @license license-prefix Oops
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"licensePattern":"(?<=license-prefix ).*"}]
// Message: Invalid JSDoc @license: "Oops"; expected SPDX expression: https://spdx.org/licenses/.

/**
 * @license Oops
 * Copyright 2022
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"licensePattern":"^([^\n]+)\nCopyright"}]
// Message: Invalid JSDoc @license: "Oops"; expected SPDX expression: https://spdx.org/licenses/.
````

The following patterns are not considered problems:

````js
/**
 * @version 3.4.1
 */
function quux (foo) {

}

/**
 * @version      3.4.1
 */
function quux (foo) {

}

/**
 * @since 3.4.1
 */
function quux (foo) {

}

/**
 * @since      3.4.1
 */
function quux (foo) {

}

/**
 * @license MIT
 */
function quux (foo) {

}

/**
 * @license MIT
 * Some extra text...
 */
function quux (foo) {

}

/**
 * @license (MIT OR GPL-2.0)
 */
function quux (foo) {

}

/**
 * @license FOO
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"allowedLicenses":["FOO","BAR","BAX"]}]

/**
 * @license FOO
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"allowedLicenses":true}]

/**
 * @license MIT
 * Some extra text
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"licensePattern":"[^\n]*"}]

/**
 * @author Gajus Kuizinas
 */
function quux (foo) {

}

/**
 * @author Brett Zamir
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"allowedAuthors":["Gajus Kuizinas","golopot","Brett Zamir"]}]

/**
 * @variation 3
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"numericOnlyVariation":true}]

/**
 * @variation abc
 */
function quux (foo) {

}

/**
 * @module test
 * @license MIT\r
 */
'use strict';

/**
 * @kind function
 */
function quux (foo) {

}

/**
 * @license license-prefix MIT
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"licensePattern":"(?<=license-prefix )MIT|GPL3.0"}]

/**
 * @license
 * Copyright 2022
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"licensePattern":"^([^\n]+)(?!\nCopyright)"}]

/**
 * @license MIT
 * Copyright 2022
 */
function quux (foo) {

}
// "jsdoc/check-values": ["error"|"warn", {"licensePattern":"^([^\n]+)\nCopyright"}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-empty-tags"></a>
<a name="eslint-plugin-jsdoc-rules-empty-tags"></a>
### <code>empty-tags</code>

Expects the following tags to be empty of any content:

- `@abstract`
- `@async`
- `@generator`
- `@global`
- `@hideconstructor`
- `@ignore`
- `@inheritdoc`
- `@inner`
- `@instance`
- `@internal` (used by TypeScript)
- `@override`
- `@readonly`

The following will also be expected to be empty unless `settings.jsdoc.mode`
is set to "closure" (which allows types).

- `@package`
- `@private`
- `@protected`
- `@public`
- `@static`

Note that `@private` will still be checked for content by this rule even with
`settings.jsdoc.ignorePrivate` set to `true` (a setting which normally
causes rules not to take effect).

Similarly, `@internal` will still be checked for content by this rule even with
`settings.jsdoc.ignoreInternal` set to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-empty-tags-options-9"></a>
<a name="eslint-plugin-jsdoc-rules-empty-tags-options-9"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-empty-tags-options-9-tags-1"></a>
<a name="eslint-plugin-jsdoc-rules-empty-tags-options-9-tags-1"></a>
##### <code>tags</code>

If you want additional tags to be checked for their descriptions, you may
add them within this option.

```js
{
  'jsdoc/empty-tags': ['error', {tags: ['event']}]
}
```

|||
|---|---|
|Context|everywhere|
|Tags| `abstract`, `async`, `generator`, `global`, `hideconstructor`, `ignore`, `inheritdoc`, `inner`, `instance`, `internal`, `override`, `readonly`, `package`, `private`, `protected`, `public`, `static` and others added by `tags`|
|Recommended|true|
|Options|`tags`|
The following patterns are considered problems:

````js
/**
 * @abstract extra text
 */
function quux () {

}
// Message: @abstract should be empty.

/**
 * @interface extra text
 */
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: @interface should be empty.

class Test {
    /**
     * @abstract extra text
     */
    quux () {

    }
}
// Message: @abstract should be empty.

/**
 * @abstract extra text
 * @inheritdoc
 * @async out of place
 */
function quux () {

}
// Message: @abstract should be empty.

/**
 * @event anEvent
 */
function quux () {

}
// "jsdoc/empty-tags": ["error"|"warn", {"tags":["event"]}]
// Message: @event should be empty.

/**
 * @private {someType}
 */
function quux () {

}
// Message: @private should be empty.

/**
 * @internal {someType}
 */
function quux () {

}
// Message: @internal should be empty.

/**
 * @private {someType}
 */
function quux () {

}
// Settings: {"jsdoc":{"ignorePrivate":true}}
// Message: @private should be empty.
````

The following patterns are not considered problems:

````js
/**
 * @abstract
 */
function quux () {

}

/**
 *
 */
function quux () {

}

/**
 * @param aName
 */
function quux () {

}

/**
 * @abstract
 * @inheritdoc
 * @async
 */
function quux () {

}

/**
 * @private {someType}
 */
function quux () {

}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @private
 */
function quux () {

}

/**
 * @internal
 */
function quux () {

}

/**
 * Create an array.
 *
 * @private
 *
 * @param {string[]} [elem] - Elements to make an array of.
 * @param {boolean} [clone] - Optionally clone nodes.
 * @returns {string[]} The array of nodes.
 */
function quux () {}
````


<a name="user-content-eslint-plugin-jsdoc-rules-implements-on-classes"></a>
<a name="eslint-plugin-jsdoc-rules-implements-on-classes"></a>
### <code>implements-on-classes</code>

Reports an issue with any non-constructor function using `@implements`.

Constructor functions, whether marked with `@class`, `@constructs`, or being
an ES6 class constructor, will not be flagged.

To indicate that a function follows another function's signature, one might
instead use `@type` to indicate the `@function` or `@callback` to which the
function is adhering.

<a name="user-content-eslint-plugin-jsdoc-rules-implements-on-classes-options-10"></a>
<a name="eslint-plugin-jsdoc-rules-implements-on-classes-options-10"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-implements-on-classes-options-10-contexts"></a>
<a name="eslint-plugin-jsdoc-rules-implements-on-classes-options-10-contexts"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.

Overrides the default contexts (see below). Set to `"any"` if you want
the rule to apply to any jsdoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., `@callback` or `@function` (or its aliases `@func` or
`@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`implements` (prevented)|
|Recommended|true|
|Options|`contexts`|

The following patterns are considered problems:

````js
/**
 * @implements {SomeClass}
 */
function quux () {

}
// Message: @implements used on a non-constructor function

/**
 * @implements {SomeClass}
 */
function quux () {

}
// "jsdoc/implements-on-classes": ["error"|"warn", {"contexts":["any"]}]
// Message: @implements used on a non-constructor function

/**
 * @function
 * @implements {SomeClass}
 */
function quux () {

}
// "jsdoc/implements-on-classes": ["error"|"warn", {"contexts":["any"]}]
// Message: @implements used on a non-constructor function

/**
 * @callback
 * @implements {SomeClass}
 */
// "jsdoc/implements-on-classes": ["error"|"warn", {"contexts":["any"]}]
// Message: @implements used on a non-constructor function

/**
 * @implements {SomeClass}
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"implements":false}}}
// Message: Unexpected tag `@implements`

class Foo {
    /**
     * @implements {SomeClass}
     */
    constructor() {}

    /**
     * @implements {SomeClass}
     */
    bar() {}
}
// "jsdoc/implements-on-classes": ["error"|"warn", {"contexts":["MethodDefinition"]}]
// Message: @implements used on a non-constructor function

class Foo {
    /**
     * @implements {SomeClass}
     */
    constructor() {}

    /**
     * @implements {SomeClass}
     */
    bar() {}
}
// "jsdoc/implements-on-classes": ["error"|"warn", {"contexts":["any"]}]
// Message: @implements used on a non-constructor function
````

The following patterns are not considered problems:

````js
/**
 * @implements {SomeClass}
 * @class
 */
function quux () {

}

/**
 * @implements {SomeClass}
 * @class
 */
function quux () {

}
// "jsdoc/implements-on-classes": ["error"|"warn", {"contexts":["any"]}]

/**
 * @implements {SomeClass}
 */
// "jsdoc/implements-on-classes": ["error"|"warn", {"contexts":["any"]}]

/**
 * @implements {SomeClass}
 * @constructor
 */
function quux () {

}

/**
 *
 */
class quux {
  /**
   * @implements {SomeClass}
   */
  constructor () {

  }
}

/**
 *
 */
const quux = class {
  /**
   * @implements {SomeClass}
   */
  constructor () {

  }
}

/**
 *
 */
function quux () {

}

/**
 *
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"implements":false}}}

/**
 * @function
 * @implements {SomeClass}
 */

/**
 * @callback
 * @implements {SomeClass}
 */
````


<a name="user-content-eslint-plugin-jsdoc-rules-match-description"></a>
<a name="eslint-plugin-jsdoc-rules-match-description"></a>
### <code>match-description</code>

Enforces a regular expression pattern on descriptions.

The default is this basic expression to match English sentences (Support
for Unicode upper case may be added in a future version when it can be handled
by our supported Node versions):

``^\n?([A-Z`\\d_][\\s\\S]*[.?!`]\\s*)?$``

Applies to the jsdoc block description and `@description` (or `@desc`)
by default but the `tags` option (see below) may be used to match other tags.

The default (and all regex options) defaults to using (only) the `u` flag, so
to add your own flags, encapsulate your expression as a string, but like a
literal, e.g., `/[A-Z].*\\./ui`.

Note that `/` delimiters are optional, but necessary to add flags (besides
`u`).

Also note that the default or optional regular expressions is *not*
case-insensitive unless one opts in to add the `i` flag.

You can add the `s` flag if you want `.` to match newlines. Note, however,
that the trailing newlines of a description will not be matched.

<a name="user-content-eslint-plugin-jsdoc-rules-match-description-options-11"></a>
<a name="eslint-plugin-jsdoc-rules-match-description-options-11"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-match-description-options-11-matchdescription"></a>
<a name="eslint-plugin-jsdoc-rules-match-description-options-11-matchdescription"></a>
##### <code>matchDescription</code>

You can supply your own expression to override the default, passing a
`matchDescription` string on the options object.

```js
{
  'jsdoc/match-description': ['error', {matchDescription: '[A-Z].*\\.'}]
}
```

<a name="user-content-eslint-plugin-jsdoc-rules-match-description-options-11-message"></a>
<a name="eslint-plugin-jsdoc-rules-match-description-options-11-message"></a>
##### <code>message</code>

You may provide a custom default message by using the following format:

```js
{
  'jsdoc/match-description': ['error', {
    message: 'The default description should begin with a capital letter.'
  }]
}
```

This can be overridden per tag or for the main block description by setting
`message` within `tags` or `mainDescription`, respectively.

<a name="user-content-eslint-plugin-jsdoc-rules-match-description-options-11-tags-2"></a>
<a name="eslint-plugin-jsdoc-rules-match-description-options-11-tags-2"></a>
##### <code>tags</code>

If you want different regular expressions to apply to tags, you may use
the `tags` option object:

```js
{
  'jsdoc/match-description': ['error', {tags: {
    param: '\\- [A-Z].*\\.',
    returns: '[A-Z].*\\.'
  }}]
}
```

In place of a string, you can also add `true` to indicate that a particular
tag should be linted with the `matchDescription` value (or the default).

```js
{
  'jsdoc/match-description': ['error', {tags: {
    param: true,
    returns: true
  }}]
}
```

Alternatively, you may supply an object with a `message` property to indicate
the error message for that tag.

```js
{
  'jsdoc/match-description': ['error', {tags: {
    param: {message: 'Begin with a hyphen', match: '\\- [A-Z].*\\.'},
    returns: {message: 'Capitalize for returns (the default)', match: true}
  }}]
}
```

The tags `@param`/`@arg`/`@argument` and `@property`/`@prop` will be properly
parsed to ensure that the matched "description" text includes only the text
after the name.

All other tags will treat the text following the tag name, a space, and
an optional curly-bracketed type expression (and another space) as part of
its "description" (e.g., for `@returns {someType} some description`, the
description is `some description` while for `@some-tag xyz`, the description
is `xyz`).

<a name="user-content-eslint-plugin-jsdoc-rules-match-description-options-11-maindescription"></a>
<a name="eslint-plugin-jsdoc-rules-match-description-options-11-maindescription"></a>
##### <code>mainDescription</code>

If you wish to override the main block description without changing the
default `match-description` (which can cascade to the `tags` with `true`),
you may use `mainDescription`:

```js
{
  'jsdoc/match-description': ['error', {
    mainDescription: '[A-Z].*\\.',
    tags: {
      param: true,
      returns: true
    }
  }]
}
```

There is no need to add `mainDescription: true`, as by default, the main
block description (and only the main block description) is linted, though you
may disable checking it by setting it to `false`.

You may also provide an object with `message`:

```js
{
  'jsdoc/match-description': ['error', {
    mainDescription: {
      message: 'Capitalize first word of JSDoc block descriptions',
      match: '[A-Z].*\\.'
    },
    tags: {
      param: true,
      returns: true
    }
  }]
}
```

<a name="user-content-eslint-plugin-jsdoc-rules-match-description-options-11-contexts-1"></a>
<a name="eslint-plugin-jsdoc-rules-match-description-options-11-contexts-1"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
(e.g., `ClassDeclaration` for ES6
classes). Overrides the default contexts (see below). Set to `"any"` if you
want the rule to apply to any jsdoc block throughout your files.

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|docblock and `@description` by default but more with `tags`|
|Aliases|`@desc`|
|Recommended|false|
|Settings||
|Options|`contexts`, `tags` (accepts tags with names and optional type such as 'param', 'arg', 'argument', 'property', and 'prop', and accepts arbitrary list of other tags with an optional type (but without names), e.g., 'returns', 'return'), `mainDescription`, `matchDescription`|

The following patterns are considered problems:

````js
/**
 * foo.
 */
const q = class {

}
// "jsdoc/match-description": ["error"|"warn", {"contexts":["ClassExpression"]}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * foo.
 */
const q = class {

}
// "jsdoc/match-description": ["error"|"warn", {"contexts":["ClassExpression"],"message":"Needs to begin with a capital letter and end with an end mark."}]
// Message: Needs to begin with a capital letter and end with an end mark.

/**
 * foo.
 */
// "jsdoc/match-description": ["error"|"warn", {"contexts":["any"]}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * foo.
 */
// "jsdoc/match-description": ["error"|"warn", {"contexts":["any"]}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * foo.
 */
const q = {

};
// "jsdoc/match-description": ["error"|"warn", {"contexts":["ObjectExpression"]}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * foo.
 */
function quux () {

}
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo)
 */
function quux () {

}
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * тест.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"matchDescription":"[А-Я][А-я]+\\."}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * тест.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"matchDescription":"[А-Я][А-я]+\\.","message":"Needs to begin with a capital letter and end with an end mark."}]
// Message: Needs to begin with a capital letter and end with an end mark.

/**
 * Abc.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"mainDescription":"[А-Я][А-я]+\\.","tags":{"param":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Abc.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"mainDescription":{"match":"[А-Я][А-я]+\\.","message":"Needs to begin with a Cyrillic capital letter and end with a period."},"tags":{"param":true}}]
// Message: Needs to begin with a Cyrillic capital letter and end with a period.

/**
 * Foo
 */
function quux () {

}
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @param foo foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"param":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @template Abc, Def foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"template":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @prop foo foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"prop":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @summary foo.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"summary":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @author
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"author":".+"}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @x-tag
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"x-tag":".+"}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @description foo foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"description":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo
 *
 * @param foo foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"mainDescription":"^[a-zA-Z]*\\s*$","tags":{"param":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo
 *
 * @param foo foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"mainDescription":{"match":"^[a-zA-Z]*\\s*$","message":"Letters only"},"tags":{"param":{"match":true,"message":"Needs to begin with a capital letter and end with a period."}}}]
// Message: Needs to begin with a capital letter and end with a period.

/**
 * Foo
 *
 * @param foo foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"mainDescription":false,"tags":{"param":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @param foo bar
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"param":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * {@see Foo.bar} buz
 */
function quux (foo) {

}
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @returns {number} foo
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"returns":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo.
 *
 * @returns foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"returns":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * lorem ipsum dolor sit amet, consectetur adipiscing elit. pellentesque elit diam,
 * iaculis eu dignissim sed, ultrices sed nisi. nulla at ligula auctor, consectetur neque sed,
 * tincidunt nibh. vivamus sit amet vulputate ligula. vivamus interdum elementum nisl,
 * vitae rutrum tortor semper ut. morbi porta ante vitae dictum fermentum.
 * proin ut nulla at quam convallis gravida in id elit. sed dolor mauris, blandit quis ante at,
 * consequat auctor magna. duis pharetra purus in porttitor mollis.
 */
function longDescription (foo) {

}
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * @arg {number} foo - Foo
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"arg":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * @argument {number} foo - Foo
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"argument":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * @return {number} foo
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"return":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Returns bar.
 *
 * @return {number} bar
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"return":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * @param notRet
 * @returns Тест.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"param":"[А-Я][А-я]+\\."}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * @description notRet
 * @returns Тест.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"description":"[А-Я][А-я]+\\."}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * foo.
 */
class quux {

}
// "jsdoc/match-description": ["error"|"warn", {"contexts":["ClassDeclaration"]}]
// Message: JSDoc description does not satisfy the regex pattern.

class MyClass {
  /**
   * Abc
   */
  myClassField = 1
}
// "jsdoc/match-description": ["error"|"warn", {"contexts":["PropertyDefinition"]}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * foo.
 */
interface quux {

}
// "jsdoc/match-description": ["error"|"warn", {"contexts":["TSInterfaceDeclaration"]}]
// Message: JSDoc description does not satisfy the regex pattern.

const myObject = {
  /**
   * Bad description
   */
  myProp: true
};
// "jsdoc/match-description": ["error"|"warn", {"contexts":["Property"]}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * @param foo Foo bar
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"param":true}}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Foo bar
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}
// Message: JSDoc description does not satisfy the regex pattern.

/**
 * Description with extra new line
 *
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"matchDescription":"[\\s\\S]*\\S$"}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 *
 * This function does lots of things.
 */
 function quux () {

 }
// "jsdoc/match-description": ["error"|"warn", {"matchDescription":"^\\S[\\s\\S]*\\S$"}]
// Message: JSDoc description does not satisfy the regex pattern.

/**
 *
 * @param
 */
// "jsdoc/match-description": ["error"|"warn", {"contexts":["any"],"matchDescription":"^\\S[\\s\\S]*\\S$"}]
// Message: JSDoc description does not satisfy the regex pattern.

/** Does something very important. */
function foo(): string;
// "jsdoc/match-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[endLine=0]"}],"matchDescription":"^\\S[\\s\\S]*\\S$"}]
// Message: JSDoc description does not satisfy the regex pattern.
````

The following patterns are not considered problems:

````js
/**
 *
 */

/**
 *
 */
 function quux () {

 }

/**
 * @param foo - Foo.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"param":true}}]

/**
 * Foo.
 */
function quux () {

}

/**
 * Foo.
 * Bar.
 */
function quux () {

}

/**
 * Foo.
 *
 * Bar.
 */
function quux () {

}

/**
 * Foo.
 *
 * Bar.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"message":"This won't be shown"}]

/**
 * Тест.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"matchDescription":"[А-Я][А-я]+\\."}]

/**
 * @param notRet
 * @returns Тест.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"returns":"[А-Я][А-я]+\\."}}]

/**
 * @param notRet
 * @description Тест.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"description":"[А-Я][А-я]+\\."}}]

/**
 * Foo
 * bar.
 */
function quux () {

}

/**
 * @returns Foo bar.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"returns":true}}]

/**
 * @returns {type1} Foo bar.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"returns":true}}]

/**
 * @description Foo bar.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"description":true}}]

/**
 * @description Foo
 * bar.
 * @param
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"description":true}}]

/** @description Foo bar. */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"description":true}}]

/**
 * @description Foo
 * bar.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"description":true}}]

/**
 * Foo. {@see Math.sin}.
 */
function quux () {

}

/**
 * Foo {@see Math.sin} bar.
 */
function quux () {

}

/**
 * Foo?
 *
 * Bar!
 *
 * Baz:
 *   1. Foo.
 *   2. Bar.
 */
function quux () {

}

/**
 * Hello:
 * World.
 */
function quux () {

}

/**
 * Hello: world.
 */
function quux () {

}

/**
 * Foo
 * Bar.
 */
function quux () {

}

/**
 * Foo.
 *
 * foo.
 */
function quux () {

}

/**
 * foo.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"mainDescription":false}]

/**
 * foo.
 */
class quux {

}

/**
 * foo.
 */
class quux {

}
// "jsdoc/match-description": ["error"|"warn", {"mainDescription":true}]

class MyClass {
  /**
   * Abc.
   */
  myClassField = 1
}
// "jsdoc/match-description": ["error"|"warn", {"contexts":["PropertyDefinition"]}]

/**
 * Foo.
 */
interface quux {

}
// "jsdoc/match-description": ["error"|"warn", {"contexts":["TSInterfaceDeclaration"]}]

const myObject = {
  /**
   * Bad description
   */
  myProp: true
};
// "jsdoc/match-description": ["error"|"warn", {"contexts":[]}]

/**
 * foo.
 */
const q = class {

}
// "jsdoc/match-description": ["error"|"warn", {"contexts":[]}]

/**
 * foo.
 */
const q = {

};
// "jsdoc/match-description": ["error"|"warn", {"contexts":[]}]

/**
 * @description foo.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"param":true}}]

/**
 * Foo.
 *
 * @summary Foo.
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"summary":true}}]

/**
 * Foo.
 *
 * @author Somebody
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"author":".+"}}]

/**
 * Foo.
 *
 * @x-tag something
 */
function quux () {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"x-tag":".+"}}]

/**
 * Foo.
 *
 * @prop foo Foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"prop":true}}]

/**
 * @param foo Foo bar.
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}

/**
 *
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}

/**
 * Foo.
 *
 * @template Abc, Def Foo.
 */
function quux (foo) {

}
// "jsdoc/match-description": ["error"|"warn", {"tags":{"template":true}}]

/**
 * Enable or disable plugin.
 *
 * When enabling with this function, the script will be attached to the `document` if:.
 * - the script runs in browser context.
 * - the `document` doesn't have the script already attached.
 * - the `loadScript` option is set to `true`.
 * @param enabled `true` to enable, `false` to disable. Default: `true`.
 */
// "jsdoc/match-description": ["error"|"warn", {"contexts":["any"],"mainDescription":"/^[A-Z`-].*\\.$/us","matchDescription":"^([A-Z`-].*(\\.|:)|-\\s.*)$","tags":{"param":true,"returns":true}}]

/**
 * @constructor
 * @todo Ok.
 */
function quux () {
}
// "jsdoc/match-description": ["error"|"warn", {"mainDescription":false,"tags":{"todo":true}}]

/** Does something very important. */
function foo(): string;
// "jsdoc/match-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[endLine!=0]"}],"matchDescription":"^\\S[\\s\\S]*\\S$"}]

/**
 * This is my favorite function, foo.
 *
 * @returns Nothing.
 */
function foo(): void;
// "jsdoc/match-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[endLine!=0]:not(:has(JsdocTag))"}],"matchDescription":"^\\S[\\s\\S]*\\S$"}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-match-name"></a>
<a name="eslint-plugin-jsdoc-rules-match-name"></a>
### <code>match-name</code>

Reports the name portion of a JSDoc tag if matching or not matching
a given regular expression.

Note that some tags do not possess names and anything appearing to be a
name will actually be part of the description (e.g., for
`@returns {type} notAName`). If you are defining your own tags, see the
`structuredTags` setting (if `name: false`, this rule will not apply to
that tag).

<a name="user-content-eslint-plugin-jsdoc-rules-match-name-options-12"></a>
<a name="eslint-plugin-jsdoc-rules-match-name-options-12"></a>
#### Options

A single options object with the following properties:

<a name="user-content-eslint-plugin-jsdoc-rules-match-name-options-12-match"></a>
<a name="eslint-plugin-jsdoc-rules-match-name-options-12-match"></a>
##### <code>match</code>

`match` is a required option containing an array of objects which determine
the conditions whereby a name is reported as being problematic.

These objects can have any combination of the following groups of optional
properties, all of which act to confine one another:

- `tags` - This array should include tag names or `*` to indicate the
  match will apply for all tags (except as confined by any context
  properties). If `*` is not used, then these rules will only apply to
  the specified tags. If `tags` is omitted, then `*` is assumed.

- `allowName` - Indicates which names are allowed for the given tag (or `*`).
    Accepts a string regular expression (optionally wrapped between two
    `/` delimiters followed by optional flags) used to match the name.
- `disallowName` - As with `allowName` but indicates names that are not
    allowed.
- `replacement` - If `disallowName` is supplied and this value is present, it
    will replace the matched `disallowName` text.

- `context` - AST to confine the allowing or disallowing to jsdoc blocks
    associated with a particular context. See the
    ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
    section of our README for more on the expected format.
- `comment` - As with `context` but AST for the JSDoc block comment and types

- `message` - An optional custom message to use when there is a match.

Note that `comment`, even if targeting a specific tag, is used to match the
whole block. So if a `comment` finds its specific tag, it may still apply
fixes found by the likes of `disallowName` even when a different tag has the
disallowed name. An alternative is to ensure that `comment` finds the specific
tag of the desired tag and/or name and no `disallowName` (or `allowName`) is
supplied. In such a case, only one error will be reported, but no fixer will
be applied, however.

|||
|---|---|
|Context|everywhere|
|Tags|(The tags specified by `tags`, including any tag if `*` is set)|
|Recommended|false|
|Settings|`structuredTags`|
|Options|`match`|

The following patterns are considered problems:

````js
/**
 * @param opt_a
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^opt_/i"}]}]
// Message: Only allowing names not matching `/^opt_/i` but found "opt_a".

/**
 * @param opt_a
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^opt_/i","replacement":""}]}]
// Message: Only allowing names not matching `/^opt_/i` but found "opt_a".

/**
 * @param a
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"allowName":"/^[a-z]+$/i"}]}]
// Message: Only allowing names matching `/^[a-z]+$/i` but found "opt_b".

/**
 * @param arg
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"allowName":"/^[a-z]+$/i","disallowName":"/^arg/i"}]}]
// Message: Only allowing names not matching `/^arg/i` but found "arg".

/**
 * @param opt_a
 * @param arg
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^arg$/i"},{"disallowName":"/^opt_/i"}]}]
// Message: Only allowing names not matching `/^opt_/i` but found "opt_a".

/**
 * @property opt_a
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^opt_/i","tags":["param"]}]}]
// Message: Only allowing names not matching `/^opt_/i` but found "opt_b".

/**
 * @someTag opt_a
 * @param opt_b
 */
// Settings: {"jsdoc":{"structuredTags":{"someTag":{"name":"namepath-defining"}}}}
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^opt_/i","tags":["param"]}]}]
// Message: Only allowing names not matching `/^opt_/i` but found "opt_b".

/**
 * @property opt_a
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^opt_/i","tags":["*"]}]}]
// Message: Only allowing names not matching `/^opt_/i` but found "opt_a".

/**
 * @param opt_a
 * @param opt_b
 */
function quux () {
}
// "jsdoc/match-name": ["error"|"warn", {"match":[{"context":"FunctionDeclaration","disallowName":"/^opt_/i"}]}]
// Message: Only allowing names not matching `/^opt_/i` but found "opt_a".

/**
 * @property opt_a
 * @param {Bar|Foo} opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"comment":"JsdocBlock:has(JsdocTag[tag=\"param\"][name=/opt_/] > JsdocTypeUnion:has(JsdocTypeName[value=\"Bar\"]:nth-child(1)))"}]}]
// Message: Prohibited context for "opt_a".

/**
 * @property opt_a
 * @param {Bar|Foo} opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"comment":"JsdocBlock:has(JsdocTag[tag=\"param\"][name=/opt_/] > JsdocTypeUnion:has(JsdocTypeName[value=\"Bar\"]:nth-child(1)))","message":"Don't use `opt_` prefixes with Bar|..."}]}]
// Message: Don't use `opt_` prefixes with Bar|...

/**
 * @param opt_a
 * @param opt_b
 */
function quux () {}
// "jsdoc/match-name": ["error"|"warn", ]
// Message: Rule `no-restricted-syntax` is missing a `match` option.

/**
 * @param {
 *   someType
 * } opt_a
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^opt_/i","replacement":""}]}]
// Message: Only allowing names not matching `/^opt_/i` but found "opt_a".
````

The following patterns are not considered problems:

````js
/**
 * @param opt_a
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^arg/i"}]}]

/**
 * @param a
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"allowName":"/^[a-z_]+$/i"}]}]

/**
 * @param someArg
 * @param anotherArg
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"allowName":"/^[a-z]+$/i","disallowName":"/^arg/i"}]}]

/**
 * @param elem1
 * @param elem2
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^arg$/i"},{"disallowName":"/^opt_/i"}]}]

/**
 * @someTag opt_a
 * @param opt_b
 */
// Settings: {"jsdoc":{"structuredTags":{"someTag":{"name":"namepath-defining"}}}}
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^opt_/i","tags":["property"]}]}]

/**
 * @property opt_a
 * @param opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"disallowName":"/^arg/i","tags":["*"]}]}]

/**
 * @param opt_a
 * @param opt_b
 */
class A {
}
// "jsdoc/match-name": ["error"|"warn", {"match":[{"context":"FunctionDeclaration","disallowName":"/^opt_/i"}]}]

/**
 * @property opt_a
 * @param {Foo|Bar} opt_b
 */
// "jsdoc/match-name": ["error"|"warn", {"match":[{"comment":"JsdocBlock:has(JsdocTag[tag=\"param\"]:has(JsdocTypeUnion:has(JsdocTypeName[value=\"Bar\"]:nth-child(1))))","disallowName":"/^opt_/i"}]}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks"></a>
### <code>multiline-blocks</code>

Controls how and whether jsdoc blocks can be expressed as single or multiple
line blocks.

Note that if you set `noSingleLineBlocks` and `noMultilineBlocks` to `true`
and configure them in a certain manner, you might effectively be prohibiting
all jsdoc blocks!

Also allows for preventing text at the very beginning or very end of blocks.

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13"></a>
#### Options

A single options object with the following properties.

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13-nozerolinetext-defaults-to-true"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13-nozerolinetext-defaults-to-true"></a>
##### <code>noZeroLineText</code> (defaults to <code>true</code>)

For multiline blocks, any non-whitespace text immediately after the `/**` and
space will be reported. (Text after a newline is not reported.)

`noMultilineBlocks` will have priority over this rule if it applies.

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13-nofinallinetext-defaults-to-true"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13-nofinallinetext-defaults-to-true"></a>
##### <code>noFinalLineText</code> (defaults to <code>true</code>)

For multiline blocks, any non-whitespace text preceding the `*/` on the final
line will be reported. (Text preceding a newline is not reported.)

`noMultilineBlocks` will have priority over this rule if it applies.

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13-nosinglelineblocks-defaults-to-false"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13-nosinglelineblocks-defaults-to-false"></a>
##### <code>noSingleLineBlocks</code> (defaults to <code>false</code>)

If this is `true`, any single line blocks will be reported, except those which
are whitelisted in `singleLineTags`.

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13-singlelinetags-defaults-to-lends-type"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13-singlelinetags-defaults-to-lends-type"></a>
##### <code>singleLineTags</code> (defaults to <code>[&#39;lends&#39;, &#39;type&#39;]</code>)

An array of tags which can nevertheless be allowed as single line blocks when
`noSingleLineBlocks` is set.  You may set this to a empty array to
cause all single line blocks to be reported. If `'*'` is present, then
the presence of a tag will allow single line blocks (but not if a tag is
missing).

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13-nomultilineblocks-defaults-to-false"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13-nomultilineblocks-defaults-to-false"></a>
##### <code>noMultilineBlocks</code> (defaults to <code>false</code>)

Requires that jsdoc blocks are restricted to single lines only unless impacted
by the options `minimumLengthForMultiline`, `multilineTags`, or
`allowMultipleTags`.

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13-minimumlengthformultiline-defaults-to-not-being-in-effect"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13-minimumlengthformultiline-defaults-to-not-being-in-effect"></a>
##### <code>minimumLengthForMultiline</code> (defaults to not being in effect)

If `noMultilineBlocks` is set with this numeric option, multiline blocks will
be permitted if containing at least the given amount of text.

If not set, multiline blocks will not be permitted regardless of length unless
a relevant tag is present and `multilineTags` is set.

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13-multilinetags-defaults-to"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13-multilinetags-defaults-to"></a>
##### <code>multilineTags</code> (defaults to <code>[&#39;*&#39;]</code>)

If `noMultilineBlocks` is set with this option, multiline blocks may be allowed
regardless of length as long as a tag or a tag of a certain type is present.

If `*` is included in the array, the presence of a tags will allow for
multiline blocks (but not when without any tags unless the amount of text is
over an amount specified by `minimumLengthForMultiline`).

If the array does not include `*` but lists certain tags, the presence of
such a tag will cause multiline blocks to be allowed.

You may set this to an empty array to prevent any tag from permitting multiple
lines.

<a name="user-content-eslint-plugin-jsdoc-rules-multiline-blocks-options-13-allowmultipletags-defaults-to-true"></a>
<a name="eslint-plugin-jsdoc-rules-multiline-blocks-options-13-allowmultipletags-defaults-to-true"></a>
##### <code>allowMultipleTags</code> (defaults to <code>true</code>)

If `noMultilineBlocks` is set to `true` with this option and multiple tags are
found in a block, an error will not be reported.

Since multiple-tagged lines cannot be collapsed into a single line, this option
prevents them from being reported. Set to `false` if you really want to report
any blocks.

This option will also be applied when there is a block description and a single
tag (since a description cannot precede a tag on a single line, and also
cannot be reliably added after the tag either).

|||
|---|---|
|Context|everywhere|
|Tags|Any (though `singleLineTags` and `multilineTags` control the application)|
|Recommended|true|
|Settings||
|Options|`noZeroLineText`, `noSingleLineBlocks`, `singleLineTags`, `noMultilineBlocks`, `minimumLengthForMultiline`, `multilineTags`, `allowMultipleTags`, `noFinalLineText`|

The following patterns are considered problems:

````js
/** Reported up here
 * because the rest is multiline
 */
// Message: Should have no text on the "0th" line (after the `/**`).

/** Reported up here
 * because the rest is multiline
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noZeroLineText":true}]
// Message: Should have no text on the "0th" line (after the `/**`).

/** @abc {aType} aName Reported up here
 * because the rest is multiline
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noZeroLineText":true}]
// Message: Should have no text on the "0th" line (after the `/**`).

/** @tag */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noSingleLineBlocks":true}]
// Message: Single line blocks are not permitted by your configuration.

/** @tag {someType} */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noSingleLineBlocks":true}]
// Message: Single line blocks are not permitted by your configuration.

/** @tag {someType} aName */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noSingleLineBlocks":true}]
// Message: Single line blocks are not permitted by your configuration.

/** @tag */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noSingleLineBlocks":true,"singleLineTags":["someOtherTag"]}]
// Message: Single line blocks are not permitted by your configuration.

/** desc */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noSingleLineBlocks":true,"singleLineTags":["*"]}]
// Message: Single line blocks are not permitted by your configuration.

/**
 * Desc.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/** desc
 *
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/** desc
 *
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noMultilineBlocks":true,"noSingleLineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration but fixing would result in a single line block which you have prohibited with `noSingleLineBlocks`.

/**
 *
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/**
 * This is not long enough to be permitted.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"minimumLengthForMultiline":100,"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/**
 * This is not long enough to be permitted.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"allowMultipleTags":true,"minimumLengthForMultiline":100,"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/**
 * This has the wrong tags so is not permitted.
 * @notTheRightTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"allowMultipleTags":false,"multilineTags":["onlyThisIsExempted"],"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration but the block has a description with a tag.

/**
 * This has too many tags so cannot be fixed ot a single line.
 * @oneTag
 * @anotherTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"allowMultipleTags":false,"multilineTags":[],"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration but the block has multiple tags.

/**
 * This has a tag and description so cannot be fixed ot a single line.
 * @oneTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"allowMultipleTags":false,"multilineTags":[],"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration but the block has a description with a tag.

/**
 * This has no tags so is not permitted.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"multilineTags":["*"],"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/**
 * This has the wrong tags so is not permitted.
 * @notTheRightTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"allowMultipleTags":false,"minimumLengthForMultiline":500,"multilineTags":["onlyThisIsExempted"],"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration but the block has a description with a tag.

/**
 * @lends This can be safely fixed to a single line.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"multilineTags":[],"noMultilineBlocks":true,"noSingleLineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/**
 * @type {aType} This can be safely fixed to a single line.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"multilineTags":[],"noMultilineBlocks":true,"noSingleLineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/**
 * @aTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"multilineTags":[],"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/**
 * This is a problem when single and multiline are blocked.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noMultilineBlocks":true,"noSingleLineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration but fixing would result in a single line block which you have prohibited with `noSingleLineBlocks`.

/** This comment is bad
 * It should not have text on line zero
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"minimumLengthForMultiline":50,"noMultilineBlocks":true,"noZeroLineText":true}]
// Message: Should have no text on the "0th" line (after the `/**`).

/**
 * @lends This can be safely fixed
 * to a single
 * line. */
// "jsdoc/multiline-blocks": ["error"|"warn", {"multilineTags":[],"noMultilineBlocks":true}]
// Message: Multiline jsdoc blocks are prohibited by your configuration.

/**
 * @someTag {aType} with Description */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noFinalLineBlocks":true}]
// Message: Should have no text on the final line (before the `*/`).

/**
 * Description */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noFinalLineBlocks":true}]
// Message: Should have no text on the final line (before the `*/`).
````

The following patterns are not considered problems:

````js
/** Not reported */

/**
 *  Not reported
 */

/** Reported up here
 * because the rest is multiline
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noZeroLineText":false}]

/** @tag */

/** @lends */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noSingleLineBlocks":true}]

/** @tag */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noSingleLineBlocks":true,"singleLineTags":["tag"]}]

/** @tag */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noSingleLineBlocks":true,"singleLineTags":["*"]}]

/**
 *
 */

/**
 *
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noMultilineBlocks":false}]

/** Test */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noMultilineBlocks":true}]

/**
 * This is long enough to be permitted by our config.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"minimumLengthForMultiline":25,"noMultilineBlocks":true}]

/**
 * This is long enough to be permitted by our config.
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"minimumLengthForMultiline":50,"noMultilineBlocks":true}]

/**
 * This has the right tag so is permitted.
 * @theRightTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"multilineTags":["theRightTag"],"noMultilineBlocks":true}]

/** This has no tags but is single line so is not permitted. */
// "jsdoc/multiline-blocks": ["error"|"warn", {"multilineTags":["*"],"noMultilineBlocks":true}]

/**
 * This has the wrong tags so is not permitted.
 * @notTheRightTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"minimumLengthForMultiline":10,"multilineTags":["onlyThisIsExempted"],"noMultilineBlocks":true}]

/**
 * This has the wrong tags so is not permitted.
 * @theRightTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"minimumLengthForMultiline":500,"multilineTags":["theRightTag"],"noMultilineBlocks":true}]

/** tag */

/**
 * @lends This is ok per multiline
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noMultilineBlocks":true,"noSingleLineBlocks":true}]

/**
 * This has too many tags so cannot be fixed ot a single line.
 * @oneTag
 * @anotherTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"multilineTags":[],"noMultilineBlocks":true}]

/**
 * This has too many tags so cannot be fixed ot a single line.
 * @oneTag
 * @anotherTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"allowMultipleTags":true,"multilineTags":[],"noMultilineBlocks":true}]

/**
 * This has a tag and description so cannot be fixed ot a single line.
 * @oneTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"allowMultipleTags":true,"multilineTags":[],"noMultilineBlocks":true}]

/**
 * This has a tag and description so cannot be fixed ot a single line.
 * @oneTag
 */
// "jsdoc/multiline-blocks": ["error"|"warn", {"allowMultipleTags":false,"multilineTags":["oneTag"],"noMultilineBlocks":true}]

/** @someTag with Description */
// "jsdoc/multiline-blocks": ["error"|"warn", {"noFinalLineBlocks":true}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-newline-after-description"></a>
<a name="eslint-plugin-jsdoc-rules-newline-after-description"></a>
### <code>newline-after-description</code>

Enforces a consistent padding of the block description.

<a name="user-content-eslint-plugin-jsdoc-rules-newline-after-description-options-14"></a>
<a name="eslint-plugin-jsdoc-rules-newline-after-description-options-14"></a>
#### Options

This rule allows one optional string argument. If it is `"always"` then a
problem is raised when there is no newline after the description. If it is
`"never"` then a problem is raised when there is a newline after the
description. The default value is `"always"`.

|||
|---|---|
|Context|everywhere|
|Tags|N/A (doc block)|
|Options|(a string matching `"always" or "never"`)|
|Recommended|true|

The following patterns are considered problems:

````js
/**
 * Foo.
 *
 * Foo.
 * @foo
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "always"]
// Message: There must be a newline after the description of the JSDoc block.

/**
 * Foo.
 * @foo
 *
 * Foo.
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "always"]
// Message: There must be a newline after the description of the JSDoc block.

/**
 * Foo.
 *
 * Foo.
 * @foo
 */
function quux () {

}
// Message: There must be a newline after the description of the JSDoc block.

/**
 * Bar.
 *
 * Bar.
 *
 * @bar
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "never"]
// Message: There must be no newline after the description of the JSDoc block.

/**
 * Bar.
 *
 * @bar
 *
 * Bar.
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "never"]
// Message: There must be no newline after the description of the JSDoc block.


         /**\r
          * Bar.\r
          *\r
          * Bar.\r
          *\r
          * @bar\r
          */\r
         function quux () {\r

         }
// "jsdoc/newline-after-description": ["error"|"warn", "never"]
// Message: There must be no newline after the description of the JSDoc block.

/**
 * A.
 *
 * @typedef {object} A
 * @prop {boolean} a A.
 */
// "jsdoc/newline-after-description": ["error"|"warn", "never"]
// Message: There must be no newline after the description of the JSDoc block.

/**
 * A.
 * @typedef {object} A
 * @prop {boolean} a A.
 */
// "jsdoc/newline-after-description": ["error"|"warn", "always"]
// Message: There must be a newline after the description of the JSDoc block.


     /**\r
      * Service for fetching symbols.\r
      * @param {object} $http - Injected http helper.\r
      * @param {object} $q - Injected Promise api helper.\r
      * @param {object} $location - Injected window location object.\r
      * @param {object} REPORT_DIALOG_CONSTANTS - Injected handle.\r
      */
// Message: There must be a newline after the description of the JSDoc block.

/** An example function.
 *
 * @returns {number} An example number.
 */
function example() {
  return 42;
}
// "jsdoc/newline-after-description": ["error"|"warn", "never"]
// Message: There must be no newline after the description of the JSDoc block.

/** An example function.
 * @returns {number} An example number.
 */
function example() {
  return 42;
}
// "jsdoc/newline-after-description": ["error"|"warn", "always"]
// Message: There must be a newline after the description of the JSDoc block.
````

The following patterns are not considered problems:

````js
/**
 * Foo.
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "always"]

/**
 * Bar.
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "never"]

/**
 * Foo.
 *
 * @foo
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "always"]

/**
 * Bar.
 * @bar
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "never"]


     /**\r
      * @foo\r
      * Test \r
      * abc \r
      * @bar \r
      */


     /**\r
      * \r
      * @foo\r
      * Test \r
      * abc \r
      * @bar \r
      */

/***
 *
 */
function quux () {

}
// "jsdoc/newline-after-description": ["error"|"warn", "always"]

/**\r
 * Parses query string to object containing URL parameters\r
 * \r
 * @param queryString\r
 * Input string\r
 * \r
 * @returns\r
 * Object containing URL parameters\r
 */\r
export function parseQueryString(queryString: string): { [key: string]: string } {    // <-- Line 10 that fails\r

}

/** An example function.
 *
 * @returns {number} An example number.
 */
function example() {
  return 42;
}

/** An example function.
 * @returns {number} An example number.
 */
function example() {
  return 42;
}
// "jsdoc/newline-after-description": ["error"|"warn", "never"]
````


<a name="user-content-eslint-plugin-jsdoc-rules-no-bad-blocks"></a>
<a name="eslint-plugin-jsdoc-rules-no-bad-blocks"></a>
### <code>no-bad-blocks</code>

This rule checks for multi-line-style comments which fail to meet the
criteria of a jsdoc block, namely that it should begin with two and only two
asterisks, but which appear to be intended as jsdoc blocks due to the presence
of whitespace followed by whitespace or asterisks, and
an at-sign (`@`) and some non-whitespace (as with a jsdoc block tag).

<a name="user-content-eslint-plugin-jsdoc-rules-no-bad-blocks-options-15"></a>
<a name="eslint-plugin-jsdoc-rules-no-bad-blocks-options-15"></a>
#### Options

Takes an optional options object with the following.

<a name="user-content-eslint-plugin-jsdoc-rules-no-bad-blocks-options-15-ignore"></a>
<a name="eslint-plugin-jsdoc-rules-no-bad-blocks-options-15-ignore"></a>
##### <code>ignore</code>

An array of directives that will not be reported if present at the beginning of
a multi-comment block and at-sign `/* @`.

Defaults to `['ts-check', 'ts-expect-error', 'ts-ignore', 'ts-nocheck']`
(some directives [used by TypeScript](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html#ts-check)).

<a name="user-content-eslint-plugin-jsdoc-rules-no-bad-blocks-options-15-preventallmultiasteriskblocks"></a>
<a name="eslint-plugin-jsdoc-rules-no-bad-blocks-options-15-preventallmultiasteriskblocks"></a>
##### <code>preventAllMultiAsteriskBlocks</code>

A boolean (defaulting to `false`) which if `true` will prevent all
JSDoc-like blocks with more than two initial asterisks even those without
apparent tag content.

|||
|---|---|
|Context|Everywhere|
|Tags|N/A|
|Recommended|false|
|Options|`ignore`, `preventAllMultiAsteriskBlocks`|

The following patterns are considered problems:

````js
/*
 * @param foo
 */
function quux (foo) {

}
// Message: Expected JSDoc-like comment to begin with two asterisks.

/*
 * @property foo
 */
// Message: Expected JSDoc-like comment to begin with two asterisks.

function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"name":false,"required":["name"]}}}}
// Message: Cannot add "name" to `require` with the tag's `name` set to `false`

/* @ts-ignore */
// "jsdoc/no-bad-blocks": ["error"|"warn", {"ignore":[]}]
// Message: Expected JSDoc-like comment to begin with two asterisks.

/*
 * Some description.
 *
 * @returns {string} Some string
 */
function echo() {
  return 'Something';
}
// Message: Expected JSDoc-like comment to begin with two asterisks.

/***
 * @param foo
 */
function quux (foo) {

}
// Message: Expected JSDoc-like comment to begin with two asterisks.

/***
 *
 */
function quux (foo) {

}
// "jsdoc/no-bad-blocks": ["error"|"warn", {"preventAllMultiAsteriskBlocks":true}]
// Message: Expected JSDoc-like comment to begin with two asterisks.
````

The following patterns are not considered problems:

````js
/**
 * @property foo
 */

/**
 * @param foo
 */
 function quux () {

 }

function quux () {

}

/* This could just be intended as a regular multiline comment,
   so don't report this */
function quux () {

}

/* Just a regular multiline comment with an `@` but not appearing
    like a tag in a jsdoc-block, so don't report */
function quux () {

}

/* @ts-check */

/* @ts-expect-error */

/* @ts-ignore */

/* @ts-nocheck */

/* */

/** */

/* @custom */
// "jsdoc/no-bad-blocks": ["error"|"warn", {"ignore":["custom"]}]

/***
 * This is not JSDoc because of the 3 asterisks, but
 * is allowed without `preventAllMultiAsteriskBlocks`, as
 * some might wish normal multiline comments.
 */
function quux (foo) {

}

/***/
````


<a name="user-content-eslint-plugin-jsdoc-rules-no-defaults"></a>
<a name="eslint-plugin-jsdoc-rules-no-defaults"></a>
### <code>no-defaults</code>

This rule reports defaults being used on the relevant portion of `@param`
or `@default`. It also optionally reports the presence of the
square-bracketed optional arguments at all.

The rule is intended to prevent the indication of defaults on tags where
this would be redundant with ES6 default parameters (or for `@default`,
where it would be redundant with the context to which the `@default`
tag is attached).

Unless your `@default` is on a function, you will need to set `contexts`
to an appropriate context, including, if you wish, "any".

<a name="user-content-eslint-plugin-jsdoc-rules-no-defaults-options-16"></a>
<a name="eslint-plugin-jsdoc-rules-no-defaults-options-16"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-no-defaults-options-16-nooptionalparamnames"></a>
<a name="eslint-plugin-jsdoc-rules-no-defaults-options-16-nooptionalparamnames"></a>
##### <code>noOptionalParamNames</code>

Set this to `true` to report the presence of optional parameters. May be
used if the project is insisting on optionality being indicated by
the presence of ES6 default parameters (bearing in mind that such
"defaults" are only applied when the supplied value is missing or
`undefined` but not for `null` or other "falsey" values).

<a name="user-content-eslint-plugin-jsdoc-rules-no-defaults-options-16-contexts-2"></a>
<a name="eslint-plugin-jsdoc-rules-no-defaults-options-16-contexts-2"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
Overrides the default contexts (see below). Set to `"any"` if you want
the rule to apply to any jsdoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., `@callback` or `@function` (or its aliases `@func` or
`@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`param`, `default`|
|Aliases|`arg`, `argument`, `defaultvalue`|
|Recommended|false|
|Options|`contexts`, `noOptionalParamNames`|

The following patterns are considered problems:

````js
/**
 * @param {number} [foo="7"]
 */
function quux (foo) {

}
// Message: Defaults are not permitted on @param.

class Test {
    /**
     * @param {number} [foo="7"]
     */
    quux (foo) {

    }
}
// Message: Defaults are not permitted on @param.

/**
 * @param {number} [foo="7"]
 */
function quux (foo) {

}
// "jsdoc/no-defaults": ["error"|"warn", {"noOptionalParamNames":true}]
// Message: Optional param names are not permitted on @param.

/**
 * @arg {number} [foo="7"]
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"arg"}}}
// Message: Defaults are not permitted on @arg.

/**
 * @param {number} [foo="7"]
 */
function quux (foo) {

}
// "jsdoc/no-defaults": ["error"|"warn", {"contexts":["any"]}]
// Message: Defaults are not permitted on @param.

/**
 * @function
 * @param {number} [foo="7"]
 */
// "jsdoc/no-defaults": ["error"|"warn", {"contexts":["any"]}]
// Message: Defaults are not permitted on @param.

/**
 * @callback
 * @param {number} [foo="7"]
 */
// "jsdoc/no-defaults": ["error"|"warn", {"contexts":["any"]}]
// Message: Defaults are not permitted on @param.

/**
 * @default {}
 */
const a = {};
// "jsdoc/no-defaults": ["error"|"warn", {"contexts":["any"]}]
// Message: Default values are not permitted on @default.

/**
 * @defaultvalue {}
 */
const a = {};
// Settings: {"jsdoc":{"tagNamePreference":{"default":"defaultvalue"}}}
// "jsdoc/no-defaults": ["error"|"warn", {"contexts":["any"]}]
// Message: Default values are not permitted on @defaultvalue.
````

The following patterns are not considered problems:

````js
/**
 * @param foo
 */
function quux (foo) {

}

/**
 * @param {number} foo
 */
function quux (foo) {

}

/**
 * @param foo
 */
// "jsdoc/no-defaults": ["error"|"warn", {"contexts":["any"]}]

/**
 * @function
 * @param {number} foo
 */

/**
 * @callback
 * @param {number} foo
 */

/**
 * @param {number} foo
 */
function quux (foo) {

}
// "jsdoc/no-defaults": ["error"|"warn", {"noOptionalParamNames":true}]

/**
 * @default
 */
const a = {};
// "jsdoc/no-defaults": ["error"|"warn", {"contexts":["any"]}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-no-missing-syntax"></a>
<a name="eslint-plugin-jsdoc-rules-no-missing-syntax"></a>
### <code>no-missing-syntax</code>

This rule lets you report if certain always expected comment structures are
missing.

This (along with `no-restricted-syntax`) is a bit similar to Schematron for
XML or jsontron for JSON--you can validate expectations of there being
arbitrary structures.

This differs from the rule of the same name in
[`eslint-plugin-query`](https://github.com/brettz9/eslint-plugin-query)
in that this rule always looks for a comment above a structure (whether or not
you have a `comment` condition).

This rule might be especially useful with [`overrides`](https://eslint.org/docs/user-guide/configuring/configuration-files#how-do-overrides-work)
where you need only require tags and/or types within specific directories
(e.g., to enforce that a plugins or locale directory always has a certain form
of export and comment therefor).

In addition to being generally useful for precision in requiring contexts,
it is hoped that the ability to specify required tags on structures can
be used for requiring `@type` or other types for a minimalist yet adequate
specification of types which can be used to compile JavaScript+JSDoc (JJ)
to WebAssembly (e.g., by converting it to TypeSscript and then using
AssemblyScript to convert to WebAssembly). (It may be possible that one
will need to require types with certain structures beyond function
declarations and the like, as well as optionally requiring specification
of number types.)

Note that you can use selectors which make use of negators like `:not()`
including with asterisk, e.g., `*:not(FunctionDeclaration)` to indicate types
which are not adequate to satisfy a condition, e.g.,
`FunctionDeclaration:not(FunctionDeclaration[id.name="ignoreMe"])` would
not report if there were only a function declaration of the name "ignoreMe"
(though it would report by function declarations of other names).

<a name="user-content-eslint-plugin-jsdoc-rules-no-missing-syntax-options-17"></a>
<a name="eslint-plugin-jsdoc-rules-no-missing-syntax-options-17"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-no-missing-syntax-options-17-contexts-3"></a>
<a name="eslint-plugin-jsdoc-rules-no-missing-syntax-options-17-contexts-3"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.

Use the `minimum` property (defaults to 1) to indicate how many are required
for the rule to be reported.

Use the `message` property to indicate the specific error to be shown when an
error is reported for that context being found missing. You may use
`{{context}}` and `{{comment}}` with such messages.

Set to `"any"` if you want the rule to apply to any jsdoc block throughout
your files (as is necessary for finding function blocks not attached to a
function declaration or expression, i.e., `@callback` or `@function` (or its
aliases `@func` or `@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|None except those indicated by `contexts`|
|Tags|Any if indicated by AST|
|Recommended|false|
|Options|`contexts`|

The following patterns are considered problems:

````js
/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(1))","context":"FunctionDeclaration"}]}]
// Message: Syntax is required: FunctionDeclaration with JsdocBlock[postDelimiter=""]:has(JsdocTypeUnion > JsdocTypeName[value="Foo"]:nth-child(1))

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"FunctionDeclaration"},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(1))","context":"FunctionDeclaration"}]}]
// Message: Syntax is required: FunctionDeclaration with JsdocBlock[postDelimiter=""]:has(JsdocTypeUnion > JsdocTypeName[value="Foo"]:nth-child(1))

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"any"},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(1))","context":":function"}]}]
// Message: Syntax is required: :function with JsdocBlock[postDelimiter=""]:has(JsdocTypeUnion > JsdocTypeName[value="Foo"]:nth-child(1))

/**
 * @private
 * Object holding values of some custom enum
 */
const MY_ENUM = Object.freeze({
  VAL_A: "myvala"
} as const);
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[tag=/private|protected/])","context":":declaration","message":"Requiring private/protected tags here"},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[tag=\"enum\"])","context":"any","message":"@enum required on declarations"}]}]
// Message: @enum required on declarations

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(1))","context":"FunctionDeclaration","message":"Problematically missing function syntax: `{{context}}` with `{{comment}}`."}]}]
// Message: Problematically missing function syntax: `FunctionDeclaration` with `JsdocBlock[postDelimiter=""]:has(JsdocTypeUnion > JsdocTypeName[value="Foo"]:nth-child(1))`.

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":["FunctionDeclaration"]}]
// Message: Syntax is required: FunctionDeclaration

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// Message: Rule `no-missing-syntax` is missing a `context` option.

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"FunctionDeclaration","minimum":2}]}]
// Message: Syntax is required: FunctionDeclaration with JsdocBlock[postDelimiter=""]:has(JsdocTypeUnion > JsdocTypeName[value="Bar"]:nth-child(1))

/**
 * @param ab
 * @param cd
 */
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Require names matching `/^opt_/i`."}]}]
// Message: Require names matching `/^opt_/i`.

/**
 * @param ab
 * @param cd
 */
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","message":"Require names matching `/^opt_/i`."}]}]
// Message: Require names matching `/^opt_/i`.

/**
 * @param ab
 * @param cd
 */
function quux () {}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Require names matching `/^opt_/i`."}]}]
// Message: Require names matching `/^opt_/i`.
````

The following patterns are not considered problems:

````js
/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"FunctionDeclaration"}]}]

/**
 * @implements {Bar|Foo}
 */
function quux () {

}

/**
 * @implements {Bar|Foo}
 */
function bar () {

}

/**
 * @implements {Bar|Foo}
 */
function baz () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"FunctionDeclaration","minimum":2}]}]

/**
 * @param opt_a
 * @param opt_b
 */
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Require names matching `/^opt_/i`."}]}]

/**
 * @param opt_a
 * @param opt_b
 */
function quux () {}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Require names matching `/^opt_/i`."}]}]

/**
 * @param opt_a
 * @param opt_b
 */
function quux () {}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","message":"Require names matching `/^opt_/i`."}]}]

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"FunctionDeclaration"},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(2))","context":"FunctionDeclaration"}]}]

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-missing-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"any"},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(2))","context":"FunctionDeclaration"}]}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-no-multi-asterisks"></a>
<a name="eslint-plugin-jsdoc-rules-no-multi-asterisks"></a>
### <code>no-multi-asterisks</code>

Prevents use of multiple asterisks at the beginning of lines.

Note that if you wish to prevent multiple asterisks at the very beginning of
the jsdoc block, you should use `no-bad-blocks` (as that is not proper jsdoc
and that rule is for catching blocks which only seem like jsdoc).

<a name="user-content-eslint-plugin-jsdoc-rules-no-multi-asterisks-options-18"></a>
<a name="eslint-plugin-jsdoc-rules-no-multi-asterisks-options-18"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-no-multi-asterisks-options-18-allowwhitespace-defaults-to-false"></a>
<a name="eslint-plugin-jsdoc-rules-no-multi-asterisks-options-18-allowwhitespace-defaults-to-false"></a>
##### <code>allowWhitespace</code> (defaults to <code>false</code>)

Set to `true` if you wish to allow asterisks after a space (as with Markdown):

```js
/**
 * *bold* text
 */
```

<a name="user-content-eslint-plugin-jsdoc-rules-no-multi-asterisks-options-18-preventatmiddlelines-defaults-to-true"></a>
<a name="eslint-plugin-jsdoc-rules-no-multi-asterisks-options-18-preventatmiddlelines-defaults-to-true"></a>
##### <code>preventAtMiddleLines</code> (defaults to <code>true</code>)

Prevent the likes of this:

```js
/**
 *
 **
 */
```

<a name="user-content-eslint-plugin-jsdoc-rules-no-multi-asterisks-options-18-preventatend-defaults-to-true"></a>
<a name="eslint-plugin-jsdoc-rules-no-multi-asterisks-options-18-preventatend-defaults-to-true"></a>
##### <code>preventAtEnd</code> (defaults to <code>true</code>)

Prevent the likes of this:

```js
/**
 *
 *
 **/
```

|||
|---|---|
|Context|everywhere|
|Tags|(any)|
|Recommended|true|
|Settings||
|Options|`preventAtEnd`, `preventAtMiddleLines`|

The following patterns are considered problems:

````js
/**
 *
 **
 */
// Message: Should be no multiple asterisks on middle lines.

/**
 *
 **
 */
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"preventAtMiddleLines":true}]
// Message: Should be no multiple asterisks on middle lines.

/**
 *
 **
 */
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"preventAtEnd":false}]
// Message: Should be no multiple asterisks on middle lines.

/**
 * With a description
 * @tag {SomeType} and a tag with details
 **
 */
// Message: Should be no multiple asterisks on middle lines.

/**
 **
 *
 */
// Message: Should be no multiple asterisks on middle lines.

/**
 * Desc.
 *
 **/
// Message: Should be no multiple asterisks on end lines.

/**
 * Desc.
 *
 **/
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"preventAtEnd":true}]
// Message: Should be no multiple asterisks on end lines.

/**
 * Desc.
 *
 abc * **/
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"preventAtEnd":true}]
// Message: Should be no multiple asterisks on end lines.

/**
 * Desc.
 *
 **/
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"preventAtMiddleLines":false}]
// Message: Should be no multiple asterisks on end lines.

/** Desc. **/
// Message: Should be no multiple asterisks on end lines.

/** @someTag name desc. **/
// Message: Should be no multiple asterisks on end lines.

/** abc * */
// Message: Should be no multiple asterisks on end lines.

/**
 * Preserve user's whitespace when fixing (though one may also
 *   use an align rule)
 *
 * */
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"preventAtEnd":true}]
// Message: Should be no multiple asterisks on end lines.

/**
 * The method does 2 things:
 * * Thing 1
 * * Thing 2
 */
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"allowWhitespace":false}]
// Message: Should be no multiple asterisks on middle lines.

/**
 * This muti-line comment contains some
 * *non-standard bold* syntax
 */
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"allowWhitespace":false}]
// Message: Should be no multiple asterisks on middle lines.

/** Desc. **/
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"allowWhitespace":true}]
// Message: Should be no multiple asterisks on end lines.
````

The following patterns are not considered problems:

````js
/**
 *
 * Desc. ***
 */

/**
 * Desc. ***
 *
 */

/**
 * Desc.
 *
 * sth */

/**
 **
 *
 */
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"preventAtMiddleLines":false}]

/**
 *
 *
 **/
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"preventAtEnd":false}]

/**
 * With a desc.
 * and ***
 */

/**
 * and ***
 * With a desc.
 */

/**
 * With a desc.
 * With a desc.
 * Desc. */

/**
 * With a description
 * @tag {SomeType} and a tag with details
 *
 */

/** abc */
function foo() {
    //
}

/** foo */
function foo(): void {
    //
}

/** @aTag abc */
function foo() {
    //
}

/**
 * **Bold**
 */

/**
 * Preserve user's bold statement when fixing.
 *
 * **Bold example:** Hi there.
 */

/**
 * The method does 2 things:
 * * Thing 1
 * * Thing 2
 */
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"allowWhitespace":true}]

/**
 * This muti-line comment contains some
 * *non-standard bold* syntax
 */
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"allowWhitespace":true}]

/** abc */
function foo() {
    //
}
// "jsdoc/no-multi-asterisks": ["error"|"warn", {"allowWhitespace":true}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-no-restricted-syntax"></a>
<a name="eslint-plugin-jsdoc-rules-no-restricted-syntax"></a>
### <code>no-restricted-syntax</code>

Reports when certain comment structures are present.

Note that this rule differs from ESLint's [no-restricted-syntax](https://eslint.org/docs/rules/no-restricted-syntax)
rule in expecting values within a single options object's
`contexts` property, and with the property `context` being used in place of
`selector` (as well as allowing for `comment`). The format also differs from
the format expected by [`eslint-plugin-query`](https://github.com/brettz9/eslint-plugin-query).

Unlike those rules, this is specific to finding comments attached to
structures, (whether or not you add a specific `comment` condition).

Note that if your parser supports comment AST (as [jsdoc-eslint-parser](https://github.com/brettz9/jsdoc-eslint-parser)
is designed to do), you can just use ESLint's rule.

<a name="user-content-eslint-plugin-jsdoc-rules-no-restricted-syntax-options-19"></a>
<a name="eslint-plugin-jsdoc-rules-no-restricted-syntax-options-19"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-no-restricted-syntax-options-19-contexts-4"></a>
<a name="eslint-plugin-jsdoc-rules-no-restricted-syntax-options-19-contexts-4"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.

Use the `message` property to indicate the specific error to be shown when an
error is reported for that context being found.

Set to `"any"` if you want the rule to apply to any jsdoc block throughout
your files (as is necessary for finding function blocks not attached to a
function declaration or expression, i.e., `@callback` or `@function` (or its
aliases `@func` or `@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|None except those indicated by `contexts`|
|Tags|Any if indicated by AST|
|Recommended|false|
|Options|`contexts`|

The following patterns are considered problems:

````js
/**
 *
 */
function quux () {

}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":["FunctionDeclaration"]}]
// Message: Syntax is restricted: FunctionDeclaration

/**
 *
 */
function quux () {

}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"context":"FunctionDeclaration","message":"Oops: `{{context}}`."}]}]
// Message: Oops: `FunctionDeclaration`.

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"FunctionDeclaration"}]}]
// Message: Syntax is restricted: FunctionDeclaration with JsdocBlock[postDelimiter=""]:has(JsdocTypeUnion > JsdocTypeName[value="Bar"]:nth-child(1))

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(1))","context":"FunctionDeclaration","message":"The foo one: {{context}}."},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"FunctionDeclaration","message":"The bar one: {{context}}."}]}]
// Message: The bar one: FunctionDeclaration.

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"FunctionDeclaration","message":"The bar one: {{context}}."},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(1))","context":"FunctionDeclaration","message":"The foo one: {{context}}."}]}]
// Message: The bar one: FunctionDeclaration.

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// Message: Rule `no-restricted-syntax` is missing a `context` option.

/**
 * @param opt_a
 * @param opt_b
 */
function a () {}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"FunctionDeclaration","message":"Only allowing names not matching `/^opt_/i`."}]}]
// Message: Only allowing names not matching `/^opt_/i`.

/**
 * @param opt_a
 * @param opt_b
 */
function a () {}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Only allowing names not matching `/^opt_/i`."}]}]
// Message: Only allowing names not matching `/^opt_/i`.

/**
 * @param opt_a
 * @param opt_b
 */
function a () {}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","message":"Only allowing names not matching `/^opt_/i`."}]}]
// Message: Only allowing names not matching `/^opt_/i`.

/**
 * @param opt_a
 * @param opt_b
 */
function a () {}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/not-this/])","context":"any","message":"Only allowing names not matching `/^not-this/i`."},{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Only allowing names not matching `/^opt_/i`."}]}]
// Message: Only allowing names not matching `/^opt_/i`.

/**
 * @param opt_a
 * @param opt_b
 */
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Only allowing names not matching `/^opt_/i`."}]}]
// Message: Only allowing names not matching `/^opt_/i`.

/**
 * @enum {String}
 * Object holding values of some custom enum
 */
const MY_ENUM = Object.freeze({
  VAL_A: "myvala"
} as const);
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag ~ JsdocTag[tag=/private|protected/])","context":"any","message":"Access modifier tags must come first"},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[tag=\"enum\"])","context":":declaration","message":"@enum not allowed on declarations"}]}]
// Message: @enum not allowed on declarations

/** @type {React.FunctionComponent<{ children: React.ReactNode }>}*/
const MyComponent = ({ children }) => {
   return children;
}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[tag=\"type\"]:has([value=/FunctionComponent/]))","context":"any","message":"The `FunctionComponent` type is not allowed. Please use `FC` instead."}]}]
// Message: The `FunctionComponent` type is not allowed. Please use `FC` instead.

/** Some text and more */
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[descriptionStartLine=0][descriptionEndLine=0]","context":"any","message":"Requiring descriptive text on 0th line only"}]}]
// Message: Requiring descriptive text on 0th line only

/** Some text and
* more
*/
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[descriptionStartLine=0][hasPreterminalDescription=0]","context":"any","message":"Requiring descriptive text on 0th line and no preterminal description"}]}]
// Message: Requiring descriptive text on 0th line and no preterminal description

/** Some text
* @param sth Param text followed by no newline */
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[descriptionStartLine=0][hasPreterminalTagDescription=1]","context":"any","message":"Requiring descriptive text on 0th line but no preterminal description"}]}]
// Message: Requiring descriptive text on 0th line but no preterminal description
````

The following patterns are not considered problems:

````js
/**
 *
 */
function quux () {

}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":["FunctionExpression"]}]

/**
 * @implements {Bar|Foo}
 */
function quux () {

}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Foo\"]:nth-child(1))","context":"FunctionDeclaration"}]}]

/**
 * @param ab
 * @param cd
 */
function a () {}
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Only allowing names not matching `/^opt_/i`."}]}]

/**
 * @param ab
 * @param cd
 */
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","context":"any","message":"Only allowing names not matching `/^opt_/i`."}]}]

/**
 * @param ab
 * @param cd
 */
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[name=/opt_/])","message":"Only allowing names not matching `/^opt_/i`."}]}]

/**
 * @enum {String}
 * Object holding values of some custom enum
 */
const MY_ENUM = Object.freeze({
  VAL_A: "myvala"
} as const);
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag ~ JsdocTag[tag=/private|protected/])","context":"any","message":"Access modifier tags must come first"},{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[tag=\"enum\"])","context":":declaration:not(TSEnumDeclaration):not(:has(ObjectExpression)), :function","message":"@enum is only allowed on potential enum types"}]}]

/**
 * @param {(...args: any[]) => any} fn
 * @returns {(...args: any[]) => any}
 */
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[tag=\"type\"]:has([value=/FunctionComponent/]))","context":"any","message":"The `FunctionComponent` type is not allowed. Please use `FC` instead."}]}]

/** Does something very important. */
function foo(): string;
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[endLine=0][description!=/^\\S[\\s\\S]*\\S\\s$/]"}]}]

/** Some text and more */
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[descriptionStartLine=0][descriptionEndLine=1]","context":"any","message":"Requiring descriptive text on 0th line and no final newline"}]}]

/** Some text and
* more */
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[descriptionStartLine=0][hasPreterminalDescription=0]","context":"any","message":"Requiring descriptive text on 0th line and no preterminal description"}]}]

/** Some text
* @param sth Param text followed by newline
*/
// "jsdoc/no-restricted-syntax": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[descriptionStartLine=0][hasPreterminalTagDescription=1]","context":"any","message":"Requiring descriptive text on 0th line but no preterminal description"}]}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-no-types"></a>
<a name="eslint-plugin-jsdoc-rules-no-types"></a>
### <code>no-types</code>

This rule reports types being used on `@param` or `@returns`.

The rule is intended to prevent the indication of types on tags where
the type information would be redundant with TypeScript.

<a name="user-content-eslint-plugin-jsdoc-rules-no-types-options-20"></a>
<a name="eslint-plugin-jsdoc-rules-no-types-options-20"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-no-types-options-20-contexts-5"></a>
<a name="eslint-plugin-jsdoc-rules-no-types-options-20-contexts-5"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
Overrides the default contexts (see below). Set to `"any"` if you want
the rule to apply to any jsdoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., `@callback` or `@function` (or its aliases `@func` or
`@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`param`, `returns`|
|Aliases|`arg`, `argument`, `return`|
|Recommended|false|
|Options|`contexts`|

The following patterns are considered problems:

````js
/**
 * @param {number} foo
 */
function quux (foo) {

}
// Message: Types are not permitted on @param.

class quux {
  /**
   * @param {number} foo
   */
  bar (foo) {

  }
}
// Message: Types are not permitted on @param.

/**
 * @param {number} foo
 */
function quux (foo) {

}
// "jsdoc/no-types": ["error"|"warn", {"contexts":["any"]}]
// Message: Types are not permitted on @param.

class quux {
  /**
   * @param {number} foo
   */
  quux (foo) {

  }
}
// "jsdoc/no-types": ["error"|"warn", {"contexts":["any"]}]
// Message: Types are not permitted on @param.

/**
 * @function
 * @param {number} foo
 */
// "jsdoc/no-types": ["error"|"warn", {"contexts":["any"]}]
// Message: Types are not permitted on @param.

/**
 * @callback
 * @param {number} foo
 */
// "jsdoc/no-types": ["error"|"warn", {"contexts":["any"]}]
// Message: Types are not permitted on @param.

/**
 * @returns {number}
 */
function quux () {

}
// Message: Types are not permitted on @returns.

/**
 * Beep
 * Boop
 *
 * @returns {number}
 */
function quux () {

}
// Message: Types are not permitted on @returns.
````

The following patterns are not considered problems:

````js
/**
 * @param foo
 */
function quux (foo) {

}

/**
 * @param foo
 */
// "jsdoc/no-types": ["error"|"warn", {"contexts":["any"]}]

/**
 * @function
 * @param {number} foo
 */

/**
 * @callback
 * @param {number} foo
 */

/*** Oops that's too many asterisks by accident **/
function a () {}
````


<a name="user-content-eslint-plugin-jsdoc-rules-no-undefined-types"></a>
<a name="eslint-plugin-jsdoc-rules-no-undefined-types"></a>
### <code>no-undefined-types</code>

Checks that types in jsdoc comments are defined. This can be used to check
unimported types.

When enabling this rule, types in jsdoc comments will resolve as used
variables, i.e. will not be marked as unused by `no-unused-vars`.

In addition to considering globals found in code (or in ESLint-indicated
`globals`) as defined, the following tags will also be checked for
name(path) definitions to also serve as a potential "type" for checking
the tag types in the table below:

`@callback`, `@class` (or `@constructor`), `@constant` (or `@const`),
`@event`, `@external` (or `@host`), `@function` (or `@func` or `@method`),
`@interface`, `@member` (or `@var`), `@mixin`, `@name`, `@namespace`,
`@template` (for "closure" or "typescript" `settings.jsdoc.mode` only),
`@typedef`.

The following tags will also be checked but only when the mode is `closure`:

`@package`, `@private`, `@protected`, `@public`, `@static`

The following types are always considered defined.

- `null`, `undefined`, `void`, `string`, `boolean`, `object`,
  `function`, `symbol`
- `number`, `bigint`, `NaN`, `Infinity`
- `any`, `*`, `never`, `unknown`, `const`
- `this`, `true`, `false`
- `Array`, `Object`, `RegExp`, `Date`, `Function`

Note that preferred types indicated within `settings.jsdoc.preferredTypes` will
also be assumed to be defined.

Also note that if there is an error [parsing](https://github.com/jsdoc-type-pratt-parser/jsdoc-type-pratt-parser)
types for a tag, the function will silently ignore that tag, leaving it to
the `valid-types` rule to report parsing errors.

If you define your own tags, you can use `settings.jsdoc.structuredTags`
to indicate that a tag's `name` is "namepath-defining" (and should prevent
reporting on use of that namepath elsewhere) and/or that a tag's `type` is
`false` (and should not be checked for types). If the `type` is an array, that
array's items will be considered as defined for the purposes of that tag.

<a name="user-content-eslint-plugin-jsdoc-rules-no-undefined-types-options-21"></a>
<a name="eslint-plugin-jsdoc-rules-no-undefined-types-options-21"></a>
#### Options

An option object may have the following key:

- `definedTypes` - This array can be populated to indicate other types which
  are automatically considered as defined (in addition to globals, etc.).
  Defaults to an empty array.

|||
|---|---|
|Context|everywhere|
|Tags|`augments`, `class`, `constant`, `enum`, `implements`, `member`, `module`, `namespace`, `param`, `property`, `returns`, `throws`, `type`, `typedef`, `yields`|
|Aliases|`constructor`, `const`, `extends`, `var`, `arg`, `argument`, `prop`, `return`, `exception`, `yield`|
|Closure-only|`package`, `private`, `protected`, `public`, `static`|
|Recommended|true|
|Options|`definedTypes`|
|Settings|`preferredTypes`, `mode`, `structuredTags`|

The following patterns are considered problems:

````js
/**
 * @param {HerType} baz - Foo.
 */
function quux(foo, bar, baz) {

}
// Settings: {"jsdoc":{"preferredTypes":{"HerType":1000}}}
// Message: Invalid `settings.jsdoc.preferredTypes`. Values must be falsy, a string, or an object.

/**
 * @param {HerType} baz - Foo.
 */
function quux(foo, bar, baz) {

}
// Settings: {"jsdoc":{"preferredTypes":{"HerType":false}}}
// Message: The type 'HerType' is undefined.

/**
 * @param {strnig} foo - Bar.
 */
function quux(foo) {

}
// Message: The type 'strnig' is undefined.

/**
 * @param {MyType} foo - Bar.
 * @param {HisType} bar - Foo.
 */
function quux(foo, bar) {

}
// "jsdoc/no-undefined-types": ["error"|"warn", {"definedTypes":["MyType"]}]
// Message: The type 'HisType' is undefined.

/**
 * @param {MyType} foo - Bar.
 * @param {HisType} bar - Foo.
 * @param {HerType} baz - Foo.
 */
function quux(foo, bar, baz) {

}
// Settings: {"jsdoc":{"preferredTypes":{"hertype":{"replacement":"HerType"}}}}
// "jsdoc/no-undefined-types": ["error"|"warn", {"definedTypes":["MyType"]}]
// Message: The type 'HisType' is undefined.

 /**
  * @param {MyType} foo - Bar.
  * @param {HisType} bar - Foo.
  * @param {HerType} baz - Foo.
  */
function quux(foo, bar, baz) {

}
// Settings: {"jsdoc":{"preferredTypes":{"hertype":{"replacement":false},"histype":"HisType"}}}
// "jsdoc/no-undefined-types": ["error"|"warn", {"definedTypes":["MyType"]}]
// Message: The type 'HerType' is undefined.

/**
 * @template TEMPLATE_TYPE
 * @param {WRONG_TEMPLATE_TYPE} bar
 */
function foo (bar) {
};
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: The type 'WRONG_TEMPLATE_TYPE' is undefined.

class Foo {
  /**
   * @return {TEMPLATE_TYPE}
   */
  bar () {
  }
}
// Message: The type 'TEMPLATE_TYPE' is undefined.

class Foo {
  /**
   * @return {TEMPLATE_TYPE}
   */
  invalidTemplateReference () {
  }
}

/**
 * @template TEMPLATE_TYPE
 */
class Bar {
  /**
   * @return {TEMPLATE_TYPE}
   */
  validTemplateReference () {
  }
}
// Settings: {"jsdoc":{"mode":"typescript"}}
// Message: The type 'TEMPLATE_TYPE' is undefined.

/**
 * @type {strnig}
 */
var quux = {

};
// Message: The type 'strnig' is undefined.

/**
 * @template TEMPLATE_TYPE_A, TEMPLATE_TYPE_B
 */
class Foo {
  /**
   * @param {TEMPLATE_TYPE_A} baz
   * @return {TEMPLATE_TYPE_B}
   */
  bar (baz) {
  }
}
// Message: The type 'TEMPLATE_TYPE_A' is undefined.

/**
 * @param {...VAR_TYPE} varargs
 */
function quux (varargs) {
}
// Message: The type 'VAR_TYPE' is undefined.

/**
 * @this {Navigator}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: The type 'Navigator' is undefined.

/**
 * @export {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: The type 'SomeType' is undefined.

/**
 * @aCustomTag {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":true}}}}
// Message: The type 'SomeType' is undefined.

/**
 * @aCustomTag {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":["aType","anotherType"]}}}}
// Message: The type 'SomeType' is undefined.

/**
 * @namepathDefiner SomeType
 */
/**
 * @type {SomeType}
 */
// Settings: {"jsdoc":{"structuredTags":{"namepathDefiner":{"name":"namepath-referencing"}}}}
// Message: The type 'SomeType' is undefined.

/**
 * @namepathDefiner SomeType
 */
/**
 * @type {SomeType}
 */
// Message: The type 'SomeType' is undefined.

/**
 * @template abc TEMPLATE_TYPE
 * @param {TEMPLATE_TYPE} bar
 */
function foo (bar) {
};
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: The type 'TEMPLATE_TYPE' is undefined.

/**
 * @suppress {visibility}
 */
function foo () {
}
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// Message: The type 'visibility' is undefined.

/**
* @typedef Todo
* @property description
* @property otherStuff
*/
/**
 * @type {Omit<Todo, "description">}
 */
const a = new Todo();
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// Message: The type 'Omit' is undefined.
````

The following patterns are not considered problems:

````js
/**
 * @param {string} foo - Bar.
 */
function quux(foo) {

}

/**
 * @param {Promise} foo - Bar.
 */
function quux(foo) {

}

class MyClass {}

/**
 * @param {MyClass} foo - Bar.
 */
function quux(foo) {
  console.log(foo);
}

quux(0);

const MyType = require('my-library').MyType;

/**
 * @param {MyType} foo - Bar.
 */
  function quux(foo) {

}

const MyType = require('my-library').MyType;

/**
 * @param {MyType} foo - Bar.
 */
  function quux(foo) {

}

const MyType = require('my-library').MyType;

/**
 * @param {MyType} foo - Bar.
 */
  function quux(foo) {

}

import {MyType} from 'my-library';

/**
 * @param {MyType} foo - Bar.
 * @param {object<string, number>} foo
 * @param {Array<string>} baz
 */
  function quux(foo, bar, baz) {

}

/*globals MyType*/

/**
 * @param {MyType} foo - Bar.
 * @param {HisType} bar - Foo.
 */
  function quux(foo, bar) {

}

/**
 * @typedef {object} hello
 * @property {string} a - a.
 */

/**
 * @param {hello} foo
 */
function quux(foo) {

}

/**
 * @param {Array<syntaxError} foo
 */
function quux(foo) {

}

/**
 * Callback test.
 *
 * @callback addStuffCallback
 * @param {String} sum - An test integer.
 */
/**
 * Test Eslint.
 *
 * @param {addStuffCallback} callback - A callback to run.
 */
function testFunction(callback) {
  callback();
}

/**
 *
 *
 */
function foo () {

}

/**
 * @param {MyType} foo - Bar.
 * @param {HisType} bar - Foo.
 */
function quux(foo, bar) {

}
// "jsdoc/no-undefined-types": ["error"|"warn", {"definedTypes":["MyType","HisType"]}]

/**
 * @param {MyType} foo - Bar.
 * @param {HisType} bar - Foo.
 * @param {HerType} baz - Foo.
 */
function quux(foo, bar, baz) {

}
// Settings: {"jsdoc":{"preferredTypes":{"hertype":{"replacement":"HerType"},"histype":"HisType"}}}
// "jsdoc/no-undefined-types": ["error"|"warn", {"definedTypes":["MyType"]}]

/**
 * @param {MyType} foo - Bar.
 * @param {HisType} bar - Foo.
 * @param {HerType} baz - Foo.
 */
function quux(foo, bar, baz) {

}
// Settings: {"jsdoc":{"preferredTypes":{"hertype":{"replacement":"HerType<>"},"histype":"HisType.<>"}}}
// "jsdoc/no-undefined-types": ["error"|"warn", {"definedTypes":["MyType"]}]

/**
 * @template TEMPLATE_TYPE
 * @param {TEMPLATE_TYPE} bar
 * @return {TEMPLATE_TYPE}
 */
function foo (bar) {
};
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @template TEMPLATE_TYPE
 */
class Foo {
  /**
   * @return {TEMPLATE_TYPE}
   */
  bar () {
  }
}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @template TEMPLATE_TYPE
 */
class Foo {
  /**
   * @return {TEMPLATE_TYPE}
   */
  bar () {}

  /**
   * @return {TEMPLATE_TYPE}
   */
  baz () {}
}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @template TEMPLATE_TYPE_A, TEMPLATE_TYPE_B
 */
class Foo {
  /**
   * @param {TEMPLATE_TYPE_A} baz
   * @return {TEMPLATE_TYPE_B}
   */
  bar (baz) {
  }
}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @template TEMPLATE_TYPE_A, TEMPLATE_TYPE_B - Some description
 */
class Foo {
  /**
   * @param {TEMPLATE_TYPE_A} baz
   * @return {TEMPLATE_TYPE_B}
   */
  bar (baz) {
  }
}
// Settings: {"jsdoc":{"mode":"closure"}}

/****/

/* */

/*** */

/**
 *
 */
function quux () {

}

/**
 * @typedef {object} BaseObject
 */
/**
 * Run callback when hooked method is called.
 *
 * @template {BaseObject} T
 * @param {T} obj - object whose method should be hooked.
 * @param {string} method - method which should be hooked.
 * @param {(sender: T) => void} callback - callback which should
 * be called when the hooked method was invoked.
 */
function registerEvent(obj, method, callback) {

}
// Settings: {"jsdoc":{"mode":"typescript"}}

 /**
 * @param {...} varargs
 */
function quux (varargs) {
}

/**
 * @param {...number} varargs
 */
function quux (varargs) {
}

class Navigator {}
/**
 * @this {Navigator}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}

class SomeType {}
/**
 * @export {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @template T
 * @param {T} arg
 */
function example(arg) {

  /** @param {T} */
  function inner(x) {
  }
}
// Settings: {"jsdoc":{"mode":"closure"}}

const init = () => {
  /**
   * Makes request
   * @returns {Promise}
   */
  function request() {
    return Promise.resolve('success');
  }
};

/** Gets a Promise resolved with a given value.
 *
 * @template ValueType
 * @param {ValueType} value Value to resolve.
 * @returns {Promise<ValueType>} Promise resolved with value.
 */
exports.resolve1 = function resolve1(value) {
  return Promise.resolve(value);
};
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * A function returning the same type as its argument.
 *
 * @template ValueType
 * @typedef {ValueType} ValueFunc
 */
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @aCustomTag {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":false}}}}

/**
 * @aCustomTag {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":["aType","SomeType"]}}}}

/**
 * @namepathDefiner SomeType
 */
/**
 * @type {SomeType}
 */
// Settings: {"jsdoc":{"structuredTags":{"namepathDefiner":{"name":"namepath-defining"}}}}

class Test {
  /**
   * Method.
   *
   * @returns {this} Return description.
   */
  method (): this {
    return this;
  }
}

/**
 * Bad types ignored here and handled instead by `valid-types`.
 * @param {string(} foo - Bar.
 */
function quux(foo) {

}

/**
 * @template T
 * @param {T} arg
 * @returns {[T]}
 */
function genericFunctionExample(arg) {
  const result = /** @type {[T]} */ (new Array());
  result[0] = arg;
  return result;
}
// Settings: {"jsdoc":{"mode":"closure"}}

/** @typedef QDigestNode */
class A {
  /**
   * @template {object} T
   * @param {(node: QDigestNode) => T} callback
   * @returns {T[]}
   */
  map(callback) {
    /** @type {T[]} */
    let vals;
    return vals;
  }
}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @template T
 * @param {T} arg
 */
function example(arg) {

  /** @param {T} */
  function inner(x) {
  }
}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @suppress {visibility}
 */
function foo () {
}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @template T
 */
export class Foo {
  // cast to T
  getType() {
    const x = "hello";
    const y = /** @type {T} */ (x);
    return y;
  }
}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @type {const}
 */
const a = 'string';

/**
* @typedef Todo
* @property description
* @property otherStuff
*/
/**
 * @type {Omit<Todo, "description">}
 */
const a = new Todo();
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @template A, [B=SomeDefault]
 */
class Foo {
  /**
   * @param {A} baz
   * @return {B}
   */
  bar (baz) {
  }
}
// Settings: {"jsdoc":{"mode":"typescript"}}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-asterisk-prefix"></a>
<a name="eslint-plugin-jsdoc-rules-require-asterisk-prefix"></a>
### <code>require-asterisk-prefix</code>

Requires that each JSDoc line starts with an `*`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-asterisk-prefix-options-22"></a>
<a name="eslint-plugin-jsdoc-rules-require-asterisk-prefix-options-22"></a>
#### Options

This rule allows an optional string argument. If it is `"always"` then a
problem is raised when there is no asterisk prefix on a given jsdoc line. If
it is `"never"` then a problem is raised when there is an asterisk present.
The default value is `"always"`. You may also set the default to `"any"`
and use the `tags` option to apply to specific tags only.

After the string option, one may add an object with the following.

<a name="user-content-eslint-plugin-jsdoc-rules-require-asterisk-prefix-options-22-tags-3"></a>
<a name="eslint-plugin-jsdoc-rules-require-asterisk-prefix-options-22-tags-3"></a>
##### <code>tags</code>

If you want different values to apply to specific tags, you may use
the `tags` option object. The keys are `always`, `never`, or `any` and
the values are arrays of tag names or the special value `*description`
which applies to the main jsdoc block description.

```js
{
  'jsdoc/require-asterisk-prefix': ['error', 'always', {
    tags: {
      always: ['*description'],
      any: ['example', 'license'],
      never: ['copyright']
    }
  }]
}
```

|||
|---|---|
|Context|everywhere|
|Tags|All or as limited by the `tags` option|
|Options|(a string matching `"always"|"never"` and optional object with `tags`)|

The following patterns are considered problems:

````js

/**
 @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// Message: Expected JSDoc line to have the prefix.


/**
 @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "any",{"tags":{"always":["param"]}}]
// Message: Expected JSDoc line to have the prefix.


/**
 * Desc

 */
function quux (foo) {
  // with spaces
}
// Message: Expected JSDoc line to have the prefix.


/**
 *
 Desc
 */
function quux (foo) {
  // with spaces
}
// Message: Expected JSDoc line to have the prefix.


/**
 * Desc
 *
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "never"]
// Message: Expected JSDoc line to have no prefix.


/**
 @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "always",{"tags":{"any":["someOtherTag"]}}]
// Message: Expected JSDoc line to have the prefix.


/**
 * @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "never",{"tags":{"always":["someOtherTag"]}}]
// Message: Expected JSDoc line to have no prefix.


/**
 * @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "always",{"tags":{"never":["param"]}}]
// Message: Expected JSDoc line to have no prefix.


/**
 @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "never",{"tags":{"always":["param"]}}]
// Message: Expected JSDoc line to have the prefix.

/**
  @param {Number} foo
 */function quux (foo) {
  // with spaces
}
// Message: Expected JSDoc line to have the prefix.


/**
 * @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "never"]
// Message: Expected JSDoc line to have no prefix.

/**
  *@param {Number} foo
 */function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "never"]
// Message: Expected JSDoc line to have no prefix.
````

The following patterns are not considered problems:

````js
/**
 * Desc
 *
 * @param {Number} foo
 *   This is more comment.
 */
function quux (foo) {

}

/**
 * Desc
 *
 * @param {{
 * foo: Bar,
 * bar: Baz
 * }} foo
 *
 */
function quux (foo) {

}

/*  <- JSDoc must start with 2 stars.
 So this is unchecked.
 */
function quux (foo) {}

/** @param {Number} foo */
function quux (foo) {
  // with spaces
}


/**
 @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "always",{"tags":{"any":["param"]}}]


/**
 * @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "never",{"tags":{"always":["param"]}}]


/**
 * @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "always",{"tags":{"never":["someOtherTag"]}}]


/**
 @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "always",{"tags":{"never":["param"]}}]


/**
 @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "never",{"tags":{"always":["someOtherTag"]}}]


/**
 * Desc
 *
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "never",{"tags":{"any":["*description"]}}]


/**
 * Desc

 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "always",{"tags":{"any":["*description"]}}]


/**
 @param {Number} foo
 */
function quux (foo) {
  // with spaces
}
// "jsdoc/require-asterisk-prefix": ["error"|"warn", "any",{"tags":{"always":["someOtherTag"]}}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-description-complete-sentence"></a>
<a name="eslint-plugin-jsdoc-rules-require-description-complete-sentence"></a>
### <code>require-description-complete-sentence</code>

Requires that block description, explicit `@description`, and
`@param`/`@returns` tag descriptions are written in complete sentences, i.e.,

* Description must start with an uppercase alphabetical character.
* Paragraphs must start with an uppercase alphabetical character.
* Sentences must end with a period.
* Every line in a paragraph (except the first) which starts with an uppercase
  character must be preceded by a line ending with a period.
* A colon or semi-colon followed by two line breaks is still part of the
  containing paragraph (unlike normal dual line breaks).
* Text within inline tags `{...}` are not checked for sentence divisions.
* Periods after items within the `abbreviations` option array are not treated
  as sentence endings.

<a name="user-content-eslint-plugin-jsdoc-rules-require-description-complete-sentence-options-23"></a>
<a name="eslint-plugin-jsdoc-rules-require-description-complete-sentence-options-23"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-require-description-complete-sentence-options-23-tags-4"></a>
<a name="eslint-plugin-jsdoc-rules-require-description-complete-sentence-options-23-tags-4"></a>
##### <code>tags</code>

If you want additional tags to be checked for their descriptions, you may
add them within this option.

```js
{
  'jsdoc/require-description-complete-sentence': ['error', {
    tags: ['see', 'copyright']
  }]
}
```

The tags `@param`/`@arg`/`@argument` and `@property`/`@prop` will be properly
parsed to ensure that the checked "description" text includes only the text
after the name.

All other tags will treat the text following the tag name, a space, and
an optional curly-bracketed type expression (and another space) as part of
its "description" (e.g., for `@returns {someType} some description`, the
description is `some description` while for `@some-tag xyz`, the description
is `xyz`).

<a name="user-content-eslint-plugin-jsdoc-rules-require-description-complete-sentence-options-23-abbreviations"></a>
<a name="eslint-plugin-jsdoc-rules-require-description-complete-sentence-options-23-abbreviations"></a>
##### <code>abbreviations</code>

You can provide an `abbreviations` options array to avoid such strings of text
being treated as sentence endings when followed by dots. The `.` is not
necessary at the end of the array items.

<a name="user-content-eslint-plugin-jsdoc-rules-require-description-complete-sentence-options-23-newlinebeforecapsassumesbadsentenceend"></a>
<a name="eslint-plugin-jsdoc-rules-require-description-complete-sentence-options-23-newlinebeforecapsassumesbadsentenceend"></a>
##### <code>newlineBeforeCapsAssumesBadSentenceEnd</code>

When `false` (the new default), we will not assume capital letters after
newlines are an incorrect way to end the sentence (they may be proper
nouns, for example).

|||
|---|---|
|Context|everywhere|
|Tags|doc block, `param`, `returns`, `description`, `property`, `summary`, `file`, `classdesc`, `todo`, `deprecated`, `throws`, 'yields' and others added by `tags`|
|Aliases|`arg`, `argument`, `return`, `desc`, `prop`, `fileoverview`, `overview`, `exception`, `yield`|
|Recommended|false|
|Options|`tags`, `abbreviations`, `newlineBeforeCapsAssumesBadSentenceEnd`|
The following patterns are considered problems:

````js
/**
 * foo.
 */
function quux () {

}
// Message: Sentence should start with an uppercase character.

/**
 * foo?
 */
function quux () {

}
// Message: Sentence should start with an uppercase character.

/**
 * @description foo.
 */
function quux () {

}
// Message: Sentence should start with an uppercase character.

/**
 * Foo)
 */
function quux () {

}
// Message: Sentence must end with a period.

/**
 * `foo` is a variable
 */
function quux () {

}
// Message: Sentence must end with a period.

/**
 * Foo.
 *
 * foo.
 */
function quux () {

}
// Message: Sentence should start with an uppercase character.

/**
 * тест.
 */
function quux () {

}
// Message: Sentence should start with an uppercase character.

/**
 * Foo
 */
function quux () {

}
// Message: Sentence must end with a period.

/**
 * Foo
 * Bar.
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"newlineBeforeCapsAssumesBadSentenceEnd":true}]
// Message: A line of text is started with an uppercase character, but preceding line does not end the sentence.

/**
 * Foo.
 *
 * @param foo foo.
 */
function quux (foo) {

}
// Message: Sentence should start with an uppercase character.

/**
 * Foo.
 *
 * @param foo bar
 */
function quux (foo) {

}
// Message: Sentence should start with an uppercase character.

/**
 * {@see Foo.bar} buz
 */
function quux (foo) {

}
// Message: Sentence should start with an uppercase character.

/**
 * Foo.
 *
 * @returns {number} foo
 */
function quux (foo) {

}
// Message: Sentence should start with an uppercase character.

/**
 * Foo.
 *
 * @returns foo.
 */
function quux (foo) {

}
// Message: Sentence should start with an uppercase character.

/**
 * lorem ipsum dolor sit amet, consectetur adipiscing elit. pellentesque elit diam,
 * iaculis eu dignissim sed, ultrices sed nisi. nulla at ligula auctor, consectetur neque sed,
 * tincidunt nibh. vivamus sit amet vulputate ligula. vivamus interdum elementum nisl,
 * vitae rutrum tortor semper ut. morbi porta ante vitae dictum fermentum.
 * proin ut nulla at quam convallis gravida in id elit. sed dolor mauris, blandit quis ante at,
 * consequat auctor magna. duis pharetra purus in porttitor mollis.
 */
function longDescription (foo) {

}
// Message: Sentence should start with an uppercase character.

/**
 * @arg {number} foo - Foo
 */
function quux (foo) {

}
// Message: Sentence must end with a period.

/**
 * @argument {number} foo - Foo
 */
function quux (foo) {

}
// Message: Sentence must end with a period.

/**
 * @return {number} foo
 */
function quux (foo) {

}
// Message: Sentence should start with an uppercase character.

/**
 * Returns bar.
 *
 * @return {number} bar
 */
function quux (foo) {

}
// Message: Sentence should start with an uppercase character.

/**
 * @throws {object} Hello World
 * hello world
*/
// Message: Sentence must end with a period.

/**
 * @summary Foo
 */
function quux () {

}
// Message: Sentence must end with a period.

/**
 * @throws {SomeType} Foo
 */
function quux () {

}
// Message: Sentence must end with a period.

/**
 * @see Foo
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"tags":["see"]}]
// Message: Sentence must end with a period.

/**
 * @param foo Foo bar
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"tags":["param"]}]
// Message: Sentence must end with a period.

/**
 * Sorry, but this isn't a complete sentence, Mr.
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr"]}]
// Message: Sentence must end with a period.

/**
 * Sorry, but this isn't a complete sentence Mr.
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr."]}]
// Message: Sentence must end with a period.

/**
 * Sorry, but this isn't a complete sentence Mr. 
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr"]}]
// Message: Sentence must end with a period.

/**
 * Sorry, but this isn't a complete sentence Mr. and Mrs.
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr","Mrs"]}]
// Message: Sentence must end with a period.

/**
 * This is a complete sentence. But this isn't, Mr.
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr"]}]
// Message: Sentence must end with a period.

/**
 * This is a complete Mr. sentence. But this isn't, Mr.
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr"]}]
// Message: Sentence must end with a period.

/**
 * This is a complete Mr. sentence.
 */
function quux () {

}
// Message: Sentence should start with an uppercase character.

/**
 * This is fun, i.e. enjoyable, but not superlatively so, e.g. not
 * super, wonderful, etc..
 */
function quux () {

}
// Message: Sentence should start with an uppercase character.

/**
 * Do not have dynamic content; e.g. homepage. Here a simple unique id
 * suffices.
 */
 function quux () {

 }
// Message: Sentence should start with an uppercase character.

/**
 * Implements support for the
 * Swahili voice synthesizer.
 */
function speak() {
}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"newlineBeforeCapsAssumesBadSentenceEnd":true}]
// Message: A line of text is started with an uppercase character, but preceding line does not end the sentence.

/**
 * Foo.
 *
 * @template TempA, TempB foo.
 */
function quux (foo) {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"tags":["template"]}]
// Message: Sentence should start with an uppercase character.
````

The following patterns are not considered problems:

````js
/**
 * @param foo - Foo.
 */
function quux () {

}

/**
 * Foo.
 */
function quux () {

}

/**
 * Foo.
 * Bar.
 */
function quux () {

}

/**
 * Foo.
 *
 * Bar.
 */
function quux () {

}

/**
 * Тест.
 */
function quux () {

}

/**
 * Foo
 * bar.
 */
function quux () {

}

/**
 * @returns Foo bar.
 */
function quux () {

}

/**
 * Foo. {@see Math.sin}.
 */
function quux () {

}

/**
 * Foo {@see Math.sin} bar.
 */
function quux () {

}

/**
 * Foo?
 *
 * Bar!
 *
 * Baz:
 *   1. Foo.
 *   2. Bar.
 */
function quux () {

}

/**
 * Hello:
 * World.
 */
function quux () {

}

/**
 * Hello: world.
 */
function quux () {

}

/**
 *
 */
function quux () {

}

/**
 * @description Foo.
 */
function quux () {

}

/**
 * `foo` is a variable.
 */
function quux () {

}

/**
 * Foo.
 *
 * `foo`.
 */
function quux () {

}

/**
 * @param foo - `bar`.
 */
function quux () {

}

/**
 * @returns {number} `foo`.
 */
function quux () {

}

/**
 * Foo
 * `bar`.
 */
function quux () {

}

/**
 * @example Foo
 */
function quux () {

}

/**
 * @see Foo
 */
function quux () {

}

/**
 * Foo.
 *
 * @param foo Foo.
 */
function quux (foo) {

}

/**
 * Foo.
 *
 * @param foo Foo.
 */
function quux (foo) {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"tags":["param"]}]

/**
 * @param foo Foo bar.
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"tags":["param"]}]

/**
 *
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}

/**
* We stop loading Items when we have loaded:
*
* 1) The main Item;
* 2) All its variants.
*/

/**
 * This method is working on 2 steps.
 *
 * | Step | Comment     |
 * |------|-------------|
 * |   1  | do it       |
 * |   2  | do it again |
 */

/**
 * This is something that
 * I want to test.
 */
function quux () {

}

/**
 * When making HTTP requests, the
 * URL is super important.
 */
function quux () {

}

/**
 * Sorry, but this isn't a complete sentence, Mr.
 */
function quux () {

}

/**
 * Sorry, but this isn't a complete sentence Mr..
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr."]}]

/**
 * Sorry, but this isn't a complete sentence Mr. 
 */
function quux () {

}

/**
 * Sorry, but this isn't a complete sentence Mr. and Mrs..
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr","Mrs"]}]

/**
 * This is a complete sentence aMr.
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr"]}]

/**
 * This is a complete sentence. But this isn't, Mr.
 */
function quux () {

}

/**
 * This is a complete Mr. Sentence. But this isn't, Mr.
 */
function quux () {

}

/**
 * This is a complete Mr. sentence.
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["Mr"]}]

/**
 * This is fun, i.e. enjoyable, but not superlatively so, e.g. not
 * super, wonderful, etc..
 */
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["etc","e.g.","i.e."]}]


**
* Do not have dynamic content; e.g. homepage. Here a simple unique id
* suffices.
*/
function quux () {

}
// "jsdoc/require-description-complete-sentence": ["error"|"warn", {"abbreviations":["etc","e.g.","i.e."]}]

/**
 * Implements support for the
 * Swahili voice synthesizer.
 */
function speak() {
}

/**
 * @param foo
 *
 * @returns {void}
 */
export default (foo) => {
  foo()
}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-description"></a>
<a name="eslint-plugin-jsdoc-rules-require-description"></a>
### <code>require-description</code>

Requires that all functions have a description.

* All functions must have an implicit description (e.g., text above tags) or
  have the option `descriptionStyle` set to `tag` (requiring `@description`
  (or `@desc` if that is set as your preferred tag name)).
* Every jsdoc block description (or `@description` tag if `descriptionStyle`
  is `"tag"`) must have a non-empty description that explains the purpose of
  the method.

<a name="user-content-eslint-plugin-jsdoc-rules-require-description-options-24"></a>
<a name="eslint-plugin-jsdoc-rules-require-description-options-24"></a>
#### Options

An options object may have any of the following properties:

- `contexts` - Set to an array of strings representing the AST context
  where you wish the rule to be applied (e.g., `ClassDeclaration` for ES6
  classes). Overrides the default contexts (see below).  Set to `"any"` if
  you want the rule to apply to any jsdoc block throughout your files.
- `exemptedBy` - Array of tags (e.g., `['type']`) whose presence on the
    document block avoids the need for a `@description`. Defaults to an
    array with `inheritdoc`. If you set this array, it will overwrite the
    default, so be sure to add back `inheritdoc` if you wish its presence
    to cause exemption of the rule.
- `descriptionStyle` - Whether to accept implicit descriptions (`"body"`) or
    `@description` tags (`"tag"`) as satisfying the rule. Set to `"any"` to
    accept either style. Defaults to `"body"`.
- `checkConstructors` - A value indicating whether `constructor`s should be
    checked. Defaults to `true`.
- `checkGetters` - A value indicating whether getters should be checked.
    Defaults to `true`.
- `checkSetters` - A value indicating whether setters should be checked.
    Defaults to `true`.

|          |                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Context  | `ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled |
| Tags     | `description` or jsdoc block                                                                                  |
| Aliases  | `desc`                                                                                                        |
| Recommended | false |
| Options  | `contexts`, `exemptedBy`, `descriptionStyle`, `checkConstructors`, `checkGetters`, `checkSetters`             |
| Settings | `ignoreReplacesDocs`, `overrideReplacesDocs`, `augmentsExtendsReplacesDocs`, `implementsReplacesDocs`                               |

The following patterns are considered problems:

````js
/**
 *
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 *
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"any"}]
// Message: Missing JSDoc block description or @description declaration.

/**
 *
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"body"}]
// Message: Missing JSDoc block description.

/**
 * @desc Not a blank description
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"body"}]
// Message: Remove the @desc tag to leave a plain block description or add additional description text above the @desc line.

/**
 * @description Not a blank description
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"body"}]
// Message: Remove the @description tag to leave a plain block description or add additional description text above the @description line.

/**
 *
 */
class quux {

}
// "jsdoc/require-description": ["error"|"warn", {"contexts":["ClassDeclaration"],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 *
 */
// "jsdoc/require-description": ["error"|"warn", {"contexts":["any"],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 *
 */
class quux {

}
// "jsdoc/require-description": ["error"|"warn", {"contexts":["ClassDeclaration"],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 *
 */
class quux {

}
// "jsdoc/require-description": ["error"|"warn", {"contexts":["ClassDeclaration"],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 * @description
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description description.

/**
 *
 */
interface quux {

}
// "jsdoc/require-description": ["error"|"warn", {"contexts":["TSInterfaceDeclaration"],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 *
 */
var quux = class {

};
// "jsdoc/require-description": ["error"|"warn", {"contexts":["ClassExpression"],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 *
 */
var quux = {

};
// "jsdoc/require-description": ["error"|"warn", {"contexts":["ObjectExpression"],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 * @someDesc
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":{"message":"Please avoid `{{tagName}}`; use `{{replacement}}` instead","replacement":"someDesc"}}}}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]
// Message: Missing JSDoc @someDesc description.

/**
 * @description
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]
// Message: Unexpected tag `@description`

/**
 * @description
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"any"}]
// Message: Missing JSDoc block description or @description declaration.

/**
 *
 */
function quux () {
}
// "jsdoc/require-description": ["error"|"warn", {"exemptedBy":["notPresent"]}]
// Message: Missing JSDoc block description.

class TestClass {
  /**
   *
   */
  constructor() { }
}
// Message: Missing JSDoc block description.

class TestClass {
  /**
   *
   */
  constructor() { }
}
// "jsdoc/require-description": ["error"|"warn", {"checkConstructors":true}]
// Message: Missing JSDoc block description.

class TestClass {
  /**
   *
   */
  get Test() { }
}
// Message: Missing JSDoc block description.

class TestClass {
  /**
   *
   */
  get Test() { }
}
// "jsdoc/require-description": ["error"|"warn", {"checkGetters":true}]
// Message: Missing JSDoc block description.

class TestClass {
  /**
   *
   */
  set Test(value) { }
}
// Message: Missing JSDoc block description.

class TestClass {
  /**
   *
   */
  set Test(value) { }
}
// "jsdoc/require-description": ["error"|"warn", {"checkSetters":true}]
// Message: Missing JSDoc block description.

/**
 *
 */
class Foo {
    /**
     *
     */
    constructor() {}

    /**
     *
     */
    bar() {}
}
// "jsdoc/require-description": ["error"|"warn", {"checkConstructors":false,"contexts":["MethodDefinition"]}]
// Message: Missing JSDoc block description.

/**
 * @implements {Bar}
 */
class quux {

}
// Settings: {"jsdoc":{"implementsReplacesDocs":false}}
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[rawType=\"Bar\"])","context":"ClassDeclaration"}],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 * Has some
 *   description already.
 * @implements {Bar}
 */
class quux {

}
// Settings: {"jsdoc":{"implementsReplacesDocs":false}}
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[rawType=\"Bar\"])","context":"ClassDeclaration"}],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 * @implements {Bar
 *   | Foo}
 */
class quux {

}
// Settings: {"jsdoc":{"implementsReplacesDocs":false}}
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTypeUnion > JsdocTypeName[value=\"Bar\"]:nth-child(1))","context":"ClassDeclaration"}],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 * @implements {Bar}
 */
class quux {

}
// Settings: {"jsdoc":{"implementsReplacesDocs":false}}
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[tag=\"implements\"])","context":"ClassDeclaration"}],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.

/**
 * @implements {Bar}
 */
class quux {

}
// Settings: {"jsdoc":{"implementsReplacesDocs":false}}
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[tag=\"implements\"])","context":"any"}],"descriptionStyle":"tag"}]
// Message: Missing JSDoc @description declaration.
````

The following patterns are not considered problems:

````js
/**
 *
 */

/**
 * @description
 * // arbitrary description content
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]

/**
 * @description
 * quux(); // does something useful
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]

/**
 * @description <caption>Valid usage</caption>
 * quux(); // does something useful
 *
 * @description <caption>Invalid usage</caption>
 * quux('random unwanted arg'); // results in an error
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]

/**
 *
 */
class quux {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]

/**
 *
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"contexts":["ClassDeclaration"]}]

/**
 * @type {MyCallback}
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"exemptedBy":["type"]}]

/**
 *
 */
interface quux {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]

interface quux {
  /**
   * If the thing should be checked.
   */
  checked?: boolean
}
// "jsdoc/require-description": ["error"|"warn", {"contexts":["TSPropertySignature"]}]

/**
 *
 */
var quux = class {

};
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]

/**
 *
 */
var quux = {

};
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]

/**
 * Has an implicit description
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"body"}]

/**
 * Has an implicit description
 */
function quux () {

}

/**
 * Has an implicit description
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"any"}]

/**
 * @description Has an explicit description
 */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"any"}]

/**
 *
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"description":false}}}

class TestClass {
  /**
   * Test.
   */
  constructor() { }
}

class TestClass {
  /**
   *
   */
  constructor() { }
}
// "jsdoc/require-description": ["error"|"warn", {"checkConstructors":false}]

class TestClass {
  /**
   * Test.
   */
  get Test() { }
}

class TestClass {
  /**
   *
   */
  get Test() { }
}
// "jsdoc/require-description": ["error"|"warn", {"checkGetters":false}]

class TestClass {
  /**
   * Test.
   */
  set Test(value) { }
}

class TestClass {
  /**
   *
   */
  set Test(value) { }
}
// "jsdoc/require-description": ["error"|"warn", {"checkSetters":false}]

/**
 * Multi
 * line
 */
function quux () {

}

/** Single line */
function quux () {

}

/** @description something */
function quux () {

}
// "jsdoc/require-description": ["error"|"warn", {"descriptionStyle":"tag"}]

/**
 * @implements {Bar}
 */
class quux {

}
// Settings: {"jsdoc":{"implementsReplacesDocs":false}}
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=/\\s{4}/]:has(JsdocTag[rawType=\"class\"])","context":"ClassDeclaration"}],"descriptionStyle":"tag"}]

/**
 * Has some
 *   description already.
 */
class quux {

}
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[rawType=\"{Bar}\"])","context":"ClassDeclaration"}],"descriptionStyle":"tag"}]

/**
 * Has some
 *   description already.
 */
class quux {

}
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[rawType=\"{Bar}\"])","context":"any"}],"descriptionStyle":"tag"}]

/**
 * Has some
 *   description already.
 */
// "jsdoc/require-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock[postDelimiter=\"\"]:has(JsdocTag[rawType=\"{Bar}\"])","context":"any"}],"descriptionStyle":"tag"}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-example"></a>
<a name="eslint-plugin-jsdoc-rules-require-example"></a>
### <code>require-example</code>

Requires that all functions have examples.

* All functions must have one or more `@example` tags.
* Every example tag must have a non-empty description that explains the
  method's usage.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-options-25"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-options-25"></a>
#### Options

This rule has an object option.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-options-25-exemptedby"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-options-25-exemptedby"></a>
##### <code>exemptedBy</code>

Array of tags (e.g., `['type']`) whose presence on the document
block avoids the need for an `@example`. Defaults to an array with
`inheritdoc`. If you set this array, it will overwrite the default,
so be sure to add back `inheritdoc` if you wish its presence to cause
exemption of the rule.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-options-25-exemptnoarguments"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-options-25-exemptnoarguments"></a>
##### <code>exemptNoArguments</code>

Boolean to indicate that no-argument functions should not be reported for
missing `@example` declarations.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-options-25-contexts-6"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-options-25-contexts-6"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
(e.g., `ClassDeclaration` for ES6
classes). Overrides the default contexts (see below). Set to `"any"` if you
want the rule to apply to any jsdoc block throughout your files.

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-options-25-checkconstructors"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-options-25-checkconstructors"></a>
##### <code>checkConstructors</code>

A value indicating whether `constructor`s should be checked.
Defaults to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-options-25-checkgetters"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-options-25-checkgetters"></a>
##### <code>checkGetters</code>

A value indicating whether getters should be checked. Defaults to `false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-options-25-checksetters"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-options-25-checksetters"></a>
##### <code>checkSetters</code>

A value indicating whether setters should be checked. Defaults to `false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-options-25-enablefixer-2"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-options-25-enablefixer-2"></a>
##### <code>enableFixer</code>

A boolean on whether to enable the fixer (which adds an empty `@example` block).
Defaults to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-example-fixer"></a>
<a name="eslint-plugin-jsdoc-rules-require-example-fixer"></a>
#### Fixer

The fixer for `require-example` will add an empty `@example`, but it will still
report a missing example description after this is added.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`example`|
|Recommended|false|
|Options|`exemptedBy`, `exemptNoArguments`, `contexts`, `checkConstructors`, `checkGetters`, `checkSetters`, `enableFixer`|
|Settings|`ignoreReplacesDocs`, `overrideReplacesDocs`, `augmentsExtendsReplacesDocs`, `implementsReplacesDocs`|

The following patterns are considered problems:

````js
/**
 *
 */
function quux () {

}
// Message: Missing JSDoc @example declaration.

/**
 *
 */
function quux (someParam) {

}
// "jsdoc/require-example": ["error"|"warn", {"exemptNoArguments":true}]
// Message: Missing JSDoc @example declaration.

/**
 *
 */
function quux () {

}
// Message: Missing JSDoc @example declaration.

/**
 * @example
 */
function quux () {

}
// Message: Missing JSDoc @example description.

/**
 * @constructor
 */
function quux () {

}
// Message: Missing JSDoc @example declaration.

/**
 * @constructor
 * @example
 */
function quux () {

}
// Message: Missing JSDoc @example description.

/**
 *
 */
class quux {

}
// "jsdoc/require-example": ["error"|"warn", {"contexts":["ClassDeclaration"]}]
// Message: Missing JSDoc @example declaration.

/**
 *
 */
// "jsdoc/require-example": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @example declaration.

/**
 *
 */
function quux () {
}
// "jsdoc/require-example": ["error"|"warn", {"exemptedBy":["notPresent"]}]
// Message: Missing JSDoc @example declaration.

class TestClass {
  /**
   *
   */
  get Test() { }
}
// "jsdoc/require-example": ["error"|"warn", {"checkGetters":true}]
// Message: Missing JSDoc @example declaration.

class TestClass {
  /**
   * @example
   */
  get Test() { }
}
// "jsdoc/require-example": ["error"|"warn", {"checkGetters":true}]
// Message: Missing JSDoc @example description.

class TestClass {
  /**
   *
   */
  set Test(value) { }
}
// "jsdoc/require-example": ["error"|"warn", {"checkSetters":true}]
// Message: Missing JSDoc @example declaration.

class TestClass {
  /**
   * @example
   */
  set Test(value) { }
}
// "jsdoc/require-example": ["error"|"warn", {"checkSetters":true}]
// Message: Missing JSDoc @example description.

/**
 *
 */
function quux (someParam) {

}
// "jsdoc/require-example": ["error"|"warn", {"enableFixer":true}]
// Message: Missing JSDoc @example declaration.

/**
 *
 */
function quux (someParam) {

}
// "jsdoc/require-example": ["error"|"warn", {"enableFixer":false}]
// Message: Missing JSDoc @example declaration.
````

The following patterns are not considered problems:

````js
/**
 *
 */

/**
 * @example
 * // arbitrary example content
 */
function quux () {

}

/**
 * @example
 * quux(); // does something useful
 */
function quux () {

}

/**
 * @example <caption>Valid usage</caption>
 * quux(); // does something useful
 *
 * @example <caption>Invalid usage</caption>
 * quux('random unwanted arg'); // results in an error
 */
function quux () {

}

/**
 * @constructor
 */
function quux () {

}
// "jsdoc/require-example": ["error"|"warn", {"checkConstructors":false}]

/**
 * @constructor
 * @example
 */
function quux () {

}
// "jsdoc/require-example": ["error"|"warn", {"checkConstructors":false}]

class Foo {
  /**
   *
   */
  constructor () {

  }
}
// "jsdoc/require-example": ["error"|"warn", {"checkConstructors":false}]

/**
 * @inheritdoc
 */
function quux () {

}

/**
 * @type {MyCallback}
 */
function quux () {

}
// "jsdoc/require-example": ["error"|"warn", {"exemptedBy":["type"]}]

/**
 * @example Some example code
 */
class quux {

}
// "jsdoc/require-example": ["error"|"warn", {"contexts":["ClassDeclaration"]}]

/**
 *
 */
function quux () {

}
// "jsdoc/require-example": ["error"|"warn", {"contexts":["ClassDeclaration"]}]

class TestClass {
  /**
   *
   */
  get Test() { }
}

class TestClass {
  /**
   * @example
   */
  get Test() { }
}

class TestClass {
  /**
   * @example Test
   */
  get Test() { }
}
// "jsdoc/require-example": ["error"|"warn", {"checkGetters":true}]

class TestClass {
  /**
   *
   */
  set Test(value) { }
}

class TestClass {
  /**
   * @example
   */
  set Test(value) { }
}
// "jsdoc/require-example": ["error"|"warn", {"checkSetters":false}]

class TestClass {
  /**
   * @example Test
   */
  set Test(value) { }
}
// "jsdoc/require-example": ["error"|"warn", {"checkSetters":true}]

/**
 *
 */
function quux () {

}
// "jsdoc/require-example": ["error"|"warn", {"exemptNoArguments":true}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-file-overview"></a>
<a name="eslint-plugin-jsdoc-rules-require-file-overview"></a>
### <code>require-file-overview</code>

Checks that:

1. All files have a `@file`, `@fileoverview`, or `@overview` tag.
2. Duplicate file overview tags within a given file will be reported
3. File overview tags will be reported which are not, as per
  [the docs](https://jsdoc.app/tags-file.html), "at the beginning of
  the file"–where beginning of the file is interpreted in this rule
  as being when the overview tag is not preceded by anything other than
  a comment.

<a name="user-content-eslint-plugin-jsdoc-rules-require-file-overview-options-26"></a>
<a name="eslint-plugin-jsdoc-rules-require-file-overview-options-26"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-require-file-overview-options-26-tags-5"></a>
<a name="eslint-plugin-jsdoc-rules-require-file-overview-options-26-tags-5"></a>
##### <code>tags</code>

The keys of this object are tag names, and the values are configuration
objects indicating what will be checked for these whole-file tags.

Each configuration object has the following boolean keys (which default
to `false` when this option is supplied): `mustExist`, `preventDuplicates`,
`initialCommentsOnly`. These correspond to the three items above.

When no `tags` is present, the default is:

```json
{
  "file": {
    "initialCommentsOnly": true,
    "mustExist": true,
    "preventDuplicates": true,
  }
}
```

You can add additional tag names and/or override `file` if you supply this
option, e.g., in place of or in addition to `file`, giving other potential
file global tags like `@license`, `@copyright`, `@author`, `@module` or
`@exports`, optionally restricting them to a single use or preventing them
from being preceded by anything besides comments.

For example:

```js
{
  "license": {
    "mustExist": true,
    "preventDuplicates": true,
  }
}
```

This would require one and only one `@license` in the file, though because
`initialCommentsOnly` is absent and defaults to `false`, the `@license`
can be anywhere.

In the case of `@license`, you can use this rule along with the
`check-values` rule (with its `allowedLicenses` or `licensePattern` options),
to enforce a license whitelist be present on every JS file.

Note that if you choose to use `preventDuplicates` with `license`, you still
have a way to allow multiple licenses for the whole page by using the SPDX
"AND" expression, e.g., `@license (MIT AND GPL-3.0)`.

Note that the tag names are the main jsdoc tag name, so you should use `file`
in this configuration object regardless of whether you have configured
`fileoverview` instead of `file` on `tagNamePreference` (i.e., `fileoverview`
will be checked, but you must use `file` on the configuration object).

|||
|---|---|
|Context|Everywhere|
|Tags|`file`; others when `tags` set|
|Aliases|`fileoverview`, `overview`|
|Recommended|false|
|Options|`tags`|

The following patterns are considered problems:

````js

// Message: Missing @file


// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"file":{"initialCommentsOnly":true,"mustExist":true,"preventDuplicates":true}}}]
// Message: Missing @file


// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"file":{"mustExist":true}}}]
// Message: Missing @file


// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"author":{"initialCommentsOnly":false,"mustExist":true,"preventDuplicates":false}}}]
// Message: Missing @author

/**
 *
 */
// Message: Missing @file

/**
 *
 */
function quux () {}
// Message: Missing @file

/**
 *
 */
function quux () {}
// Settings: {"jsdoc":{"tagNamePreference":{"file":"fileoverview"}}}
// Message: Missing @fileoverview

/**
 *
 */
function quux () {}
// Settings: {"jsdoc":{"tagNamePreference":{"file":"overview"}}}
// Message: Missing @overview

/**
 *
 */
function quux () {}
// Settings: {"jsdoc":{"tagNamePreference":{"file":false}}}
// Message: `settings.jsdoc.tagNamePreference` cannot block @file for the `require-file-overview` rule

/**
 *
 */
function quux () {}
// Settings: {"jsdoc":{"tagNamePreference":{"file":false}}}
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"file":{"initialCommentsOnly":false,"mustExist":true,"preventDuplicates":false}}}]
// Message: `settings.jsdoc.tagNamePreference` cannot block @file for the `require-file-overview` rule

/**
 *
 */
function quux () {}
// Settings: {"jsdoc":{"tagNamePreference":{"file":{"message":"Don't use file"}}}}
// Message: `settings.jsdoc.tagNamePreference` cannot block @file for the `require-file-overview` rule

/**
 * @param a
 */
function quux (a) {}
// Message: Missing @file

/**
 * @param a
 */
function quux (a) {}

/**
 * @param b
 */
function bar (b) {}
// Message: Missing @file

/**
 * @file
 */

 /**
  * @file
  */
// Message: Duplicate @file

/**
 * @copyright
 */

 /**
  * @copyright
  */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"copyright":{"initialCommentsOnly":false,"mustExist":false,"preventDuplicates":true}}}]
// Message: Duplicate @copyright

function quux () {
}
/**
 * @file
 */
// Message: @file should be at the beginning of the file

function quux () {
}
/**
 * @license
 */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"license":{"initialCommentsOnly":true,"mustExist":false,"preventDuplicates":false}}}]
// Message: @license should be at the beginning of the file

function quux () {
}
/**
 * @license
 */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"license":{"initialCommentsOnly":true}}}]
// Message: @license should be at the beginning of the file

/**
 * @file
 */

/**
 * @file
 */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"file":{"initialCommentsOnly":true,"preventDuplicates":true}}}]
// Message: Duplicate @file
````

The following patterns are not considered problems:

````js
/**
 * @file
 */

/**
 * @file
 */

/**
 * @file
 */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"license":{"initialCommentsOnly":true,"preventDuplicates":true}}}]

// Ok preceded by comment
/**
 * @file
 */

/**
 * @fileoverview
 */
// Settings: {"jsdoc":{"tagNamePreference":{"file":"fileoverview"}}}

/**
 * @overview
 */
// Settings: {"jsdoc":{"tagNamePreference":{"file":"overview"}}}

/**
 * @file Description of file
 */

/**
 * @file Description of file
 */
function quux () {
}

/**
 *
 */

function quux () {
}
/**
 *
 */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"license":{"initialCommentsOnly":true,"mustExist":false,"preventDuplicates":false}}}]

function quux () {
}
/**
 *
 */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"license":{"initialCommentsOnly":false,"mustExist":false,"preventDuplicates":false}}}]

function quux () {
}
/**
 *
 */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"license":{"initialCommentsOnly":false,"mustExist":false,"preventDuplicates":true}}}]

/**
 * @license MIT
 */

 var a

 /**
  * @type {Array}
  */
// "jsdoc/require-file-overview": ["error"|"warn", {"tags":{"license":{"initialCommentsOnly":true,"mustExist":false,"preventDuplicates":false}}}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-hyphen-before-param-description"></a>
<a name="eslint-plugin-jsdoc-rules-require-hyphen-before-param-description"></a>
### <code>require-hyphen-before-param-description</code>

Requires (or disallows) a hyphen before the `@param` description.

<a name="user-content-eslint-plugin-jsdoc-rules-require-hyphen-before-param-description-options-27"></a>
<a name="eslint-plugin-jsdoc-rules-require-hyphen-before-param-description-options-27"></a>
#### Options

This rule takes one optional string argument and an optional options object.

If the string is `"always"` then a problem is raised when there is no hyphen
before the description. If it is `"never"` then a problem is raised when there
is a hyphen before the description. The default value is `"always"`.

The options object may have the following properties to indicate behavior for
other tags besides the `@param` tag (or the `@arg` tag if so set):

- `tags` - Object whose keys indicate different tags to check for the
  presence or absence of hyphens; the key value should be "always" or "never",
  indicating how hyphens are to be applied, e.g., `{property: 'never'}`
  to ensure `@property` never uses hyphens. A key can also be set as `*`, e.g.,
  `'*': 'always'` to apply hyphen checking to any tag (besides the preferred
  `@param` tag which follows the main string option setting and besides any
  other `tags` entries).

|||
|---|---|
|Context|everywhere|
|Tags|`param` and optionally other tags within `tags`|
|Aliases|`arg`, `argument`; potentially `prop` or other aliases|
|Recommended|false|
|Options|a string matching `"always" or "never"` followed by an optional object with a `tags` property|

The following patterns are considered problems:

````js
/**
 * @param foo Foo.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always"]
// Message: There must be a hyphen before @param description.

/**
 * @param foo Foo.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always",{"tags":{"*":"never"}}]
// Message: There must be a hyphen before @param description.

/**
 * @param foo Foo.
 * @returns {SomeType} - Hyphen here.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always",{"tags":{"*":"never","returns":"always"}}]
// Message: There must be a hyphen before @param description.

/**
 * @param foo Foo.
 */
function quux () {

}
// Message: There must be a hyphen before @param description.

/**
 * @param foo - Foo.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "never"]
// Message: There must be no hyphen before @param description.

/**
 * @param foo    - Foo.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "never"]
// Message: There must be no hyphen before @param description.

/**
 * @param foo - foo
 * @param foo foo
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always"]
// Message: There must be a hyphen before @param description.

/**
 * @param foo foo
 * bar
 * @param bar - bar
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always"]
// Message: There must be a hyphen before @param description.

/**
 * @param foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":false}}}
// Message: Unexpected tag `@param`

/**
 * @typedef {SomeType} ATypeDefName
 * @property foo Foo.
 */
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always",{"tags":{"property":"always"}}]
// Message: There must be a hyphen before @property description.

/**
 * @template TempA, TempB A desc.
 */
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always",{"tags":{"template":"always"}}]
// Message: There must be a hyphen before @template description.

/**
 * @typedef {SomeType} ATypeDefName
 * @property foo - Foo.
 */
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "never",{"tags":{"property":"never"}}]
// Message: There must be no hyphen before @property description.

/**
 * @param foo Foo.
 * @returns {SomeType} - A description.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always",{"tags":{"returns":"never"}}]
// Message: There must be a hyphen before @param description.
````

The following patterns are not considered problems:

````js
/**
 * @param foo - Foo.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always"]

/**
 * @param foo     - Foo.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always"]

/**
 * @param foo - Foo.
 * @returns {SomeType} A description.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always",{"tags":{"returns":"never"}}]

/**
 * @param foo Foo.
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "never"]

/**
 * @param foo
 */
function quux () {

}

/**
 *
 */
function quux () {

}
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always",{"tags":{"*":"always"}}]

/**
 * @typedef {SomeType} ATypeDefName
 * @property foo - Foo.
 */
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "always",{"tags":{"property":"always"}}]

/**
 * @typedef {SomeType} ATypeDefName
 * @property foo Foo.
 */
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "never",{"tags":{"property":"never"}}]

/**
 * @typedef {SomeType} ATypeDefName
 * @property foo - Foo.
 */
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "never",{"tags":{"*":"always"}}]

/** Entry point for module.
 *
 * @param {!Array<string>} argv Command-line arguments.
 */
function main(argv) {
};
// "jsdoc/require-hyphen-before-param-description": ["error"|"warn", "never"]
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc"></a>
### <code>require-jsdoc</code>

Checks for presence of jsdoc comments, on class declarations as well as
functions.

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28"></a>
#### Options

Accepts one optional options object with the following optional keys.

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-publiconly"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-publiconly"></a>
##### <code>publicOnly</code>

This option will insist that missing jsdoc blocks are only reported for
function bodies / class declarations that are exported from the module.
May be a boolean or object. If set to `true`, the defaults below will be
used. If unset, jsdoc block reporting will not be limited to exports.

This object supports the following optional boolean keys (`false` unless
otherwise noted):

- `ancestorsOnly` - Only check node ancestors to check if node is exported
- `esm` - ESM exports are checked for JSDoc comments (Defaults to `true`)
- `cjs` - CommonJS exports are checked for JSDoc comments  (Defaults to `true`)
- `window` - Window global exports are checked for JSDoc comments

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-require"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-require"></a>
##### <code>require</code>

An object with the following optional boolean keys which all default to
`false` except as noted, indicating the contexts where the rule will apply:

- `ArrowFunctionExpression`
- `ClassDeclaration`
- `ClassExpression`
- `FunctionDeclaration` (defaults to `true`)
- `FunctionExpression`
- `MethodDefinition`

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-contexts-7"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-contexts-7"></a>
##### <code>contexts</code>

Set this to an array of strings or objects representing the additional AST
contexts where you wish the rule to be applied (e.g., `Property` for
properties). If specified as an object, it should have a `context` property
and can have an `inlineCommentBlock` property which, if set to `true`, will
add an inline `/** */` instead of the regular, multi-line, indented jsdoc
block which will otherwise be added. Defaults to an empty array. Contexts
may also have their own `minLineCount` property.

Note that you may need to disable `require` items (e.g., `MethodDefinition`)
if you are specifying a more precise form in `contexts` (e.g., `MethodDefinition:not([accessibility="private"] > FunctionExpression`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-exemptemptyconstructors"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-exemptemptyconstructors"></a>
##### <code>exemptEmptyConstructors</code>

Default: true

When `true`, the rule will not report missing jsdoc blocks above constructors
with no parameters or return values (this is enabled by default as the class
name or description should be seen as sufficient to convey intent).

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-exemptemptyfunctions"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-exemptemptyfunctions"></a>
##### <code>exemptEmptyFunctions</code>

Default: false.

When `true`, the rule will not report missing jsdoc blocks above
functions/methods with no parameters or return values (intended where
function/method names are sufficient for themselves as documentation).

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-checkconstructors-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-checkconstructors-1"></a>
##### <code>checkConstructors</code>

A value indicating whether `constructor`s should be checked. Defaults to
`true`. When `true`, `exemptEmptyConstructors` may still avoid reporting when
no parameters or return values are found.

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-checkgetters-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-checkgetters-1"></a>
##### <code>checkGetters</code>

A value indicating whether getters should be checked. Besides setting as a
boolean, this option can be set to the string `"no-setter"` to indicate that
getters should be checked but only when there is no setter. This may be useful
if one only wishes documentation on one of the two accessors. Defaults to
`false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-checksetters-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-checksetters-1"></a>
##### <code>checkSetters</code>

A value indicating whether setters should be checked. Besides setting as a
boolean, this option can be set to the string `"no-getter"` to indicate that
setters should be checked but only when there is no getter. This may be useful
if one only wishes documentation on one of the two accessors. Defaults to
`false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-enablefixer-3"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-enablefixer-3"></a>
##### <code>enableFixer</code>

A boolean on whether to enable the fixer (which adds an empty jsdoc block).
Defaults to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-jsdoc-options-28-minlinecount"></a>
<a name="eslint-plugin-jsdoc-rules-require-jsdoc-options-28-minlinecount"></a>
##### <code>minLineCount</code>

An integer to indicate a minimum number of lines expected for a node in order
for it to require documentation. Defaults to `undefined`. This option will
apply to any context; see `contexts` for line counts per context.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `ClassDeclaration`, `ClassExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|N/A|
|Recommended|true|
|Options|`publicOnly`, `require`, `contexts`, `exemptEmptyConstructors`, `exemptEmptyFunctions`, `enableFixer`, `minLineCount`|

The following patterns are considered problems:

````js
/** This is comment */
export interface Foo {
  /** This is comment x2 */
  tom: string;
  catchJerry(): boolean;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true},"require":{"ClassDeclaration":true,"ClassExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

/** This is comment */
export interface Foo {
  /** This is comment x2 */
  tom: string;
  jerry: number;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true},"require":{"ClassDeclaration":true,"ClassExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

/** This is comment */
export interface Foo {
  bar(): string;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true}}]
// Message: Missing JSDoc comment.

/** This is comment */
export interface Foo {
  bar: string;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true,"esm":true}}]
// Message: Missing JSDoc comment.

/**
 * Foo interface documentation.
 */
export interface Foo extends Bar {
  /**
   * baz method documentation.
   */
  baz(): void;

  meow(): void;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSMethodSignature"],"publicOnly":{"ancestorsOnly":true}}]
// Message: Missing JSDoc comment.

function quux (foo) {

}
// Message: Missing JSDoc comment.

/**
 * @func myFunction
 */
function myFunction() {

}
// Settings: {"jsdoc":{"maxLines":3,"minLines":2}}
// Message: Missing JSDoc comment.

/**
 * @func myFunction
 */


function myFunction() {

}
// Settings: {"jsdoc":{"maxLines":2}}
// Message: Missing JSDoc comment.

/** @func myFunction */ function myFunction() {

}
// Settings: {"jsdoc":{"minLines":1}}
// Message: Missing JSDoc comment.

function myFunction() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"enableFixer":false}]
// Message: Missing JSDoc comment.

export var test = function () {

};
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

function test () {

}
export var test2 = test;
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionDeclaration":true}}]
// Message: Missing JSDoc comment.

export const test = () => {

};
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ArrowFunctionExpression":true}}]
// Message: Missing JSDoc comment.

export const test = () => {

};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["ArrowFunctionExpression"],"publicOnly":true}]
// Message: Missing JSDoc comment.

export const test = () => {

};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":[{"context":"ArrowFunctionExpression"}],"publicOnly":true}]
// Message: Missing JSDoc comment.

export let test = class {

};
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ClassExpression":true}}]
// Message: Missing JSDoc comment.

export default function () {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":false,"esm":true,"window":false},"require":{"FunctionDeclaration":true}}]
// Message: Missing JSDoc comment.

export default () => {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":false,"esm":true,"window":false},"require":{"ArrowFunctionExpression":true}}]
// Message: Missing JSDoc comment.

export default (function () {})
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":false,"esm":true,"window":false},"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

export default class {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":false,"esm":true,"window":false},"require":{"ClassDeclaration":true}}]
// Message: Missing JSDoc comment.

function quux (foo) {

}
// Message: Missing JSDoc comment.

function quux (foo) {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":true}]
// Message: Missing JSDoc comment.

function quux (foo) {

}
// Settings: {"jsdoc":{"minLines":2}}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":true}]
// Message: Missing JSDoc comment.

function myFunction() {}
// Message: Missing JSDoc comment.

/**
 * Description for A.
 */
class A {
   constructor(xs) {
        this.a = xs;
   }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

class A {
    /**
     * Description for constructor.
     * @param {object[]} xs - xs
     */
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

class A extends B {
    /**
     * Description for constructor.
     * @param {object[]} xs - xs
     */
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

export class A extends B {
    /**
     * Description for constructor.
     * @param {object[]} xs - xs
     */
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

export default class A extends B {
    /**
     * Description for constructor.
     * @param {object[]} xs - xs
     */
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

var myFunction = () => {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true}}]
// Message: Missing JSDoc comment.

var myFunction = () => () => {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true}}]
// Message: Missing JSDoc comment.

var foo = function() {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

const foo = {bar() {}}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

var foo = {bar: function() {}}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

function foo (abc) {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":false}]
// Message: Missing JSDoc comment.

function foo () {
  return true;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":false}]
// Message: Missing JSDoc comment.

module.exports = function quux () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

module.exports = function quux () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

module.exports = {
  method: function() {

  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

module.exports = {
  test: {
    test2: function() {

    }
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

module.exports = {
  test: {
    test2: function() {

    }
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

const test = module.exports = function () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

/**
*
*/
const test = module.exports = function () {

}

test.prototype.method = function() {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

const test = function () {

}
module.exports = {
  test: test
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

const test = () => {

}
module.exports = {
  test: test
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ArrowFunctionExpression":true}}]
// Message: Missing JSDoc comment.

class Test {
    method() {

    }
}
module.exports = Test;
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

export default function quux () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

export default function quux () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

function quux () {

}
export default quux;
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

export function test() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

export function test() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

var test = function () {

}
var test2 = 2;
export { test, test2 }
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

var test = function () {

}
export { test as test2 }
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

export default class A {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ClassDeclaration":true}}]
// Message: Missing JSDoc comment.

export default class A {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"ClassDeclaration":true}}]
// Message: Missing JSDoc comment.

var test = function () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"window":true},"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

window.test = function () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"window":true},"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

function test () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"window":true}}]
// Message: Missing JSDoc comment.

module.exports = function() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":true,"esm":false,"window":false},"require":{"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

export function someMethod() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":false,"esm":true,"window":false},"require":{"FunctionDeclaration":true}}]
// Message: Missing JSDoc comment.

export function someMethod() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":false,"esm":true,"window":false},"require":{"FunctionDeclaration":true}}]
// Message: Missing JSDoc comment.

const myObject = {
  myProp: true
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["Property"]}]
// Message: Missing JSDoc comment.

/**
 * Foo interface documentation.
 */
export interface Foo extends Bar {
  /**
   * baz method documentation.
   */
  baz(): void;

  meow(): void;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSMethodSignature"]}]
// Message: Missing JSDoc comment.

class MyClass {
  someProperty: boolean; // Flow type annotation.
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":true,"require":{"ClassDeclaration":true}}]
// Message: Missing JSDoc comment.

export default class Test {
  constructor(a) {
    this.a = a;
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ArrowFunctionExpression":false,"ClassDeclaration":false,"ClassExpression":false,"FunctionDeclaration":false,"FunctionExpression":false,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

export default class Test {
  constructor(a) {
    this.a = a;
  }
  private abc(a) {
    this.a = a;
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["MethodDefinition:not([accessibility=\"private\"]) > FunctionExpression"],"publicOnly":true,"require":{"ArrowFunctionExpression":false,"ClassDeclaration":false,"ClassExpression":false,"FunctionDeclaration":false,"FunctionExpression":false,"MethodDefinition":false}}]
// Message: Missing JSDoc comment.

e = function () {
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionDeclaration":false,"FunctionExpression":true}}]
// Message: Missing JSDoc comment.

/**
 *
 */
export class Class {
    test = 1;

    foo() {
        this.test = 2;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionDeclaration":false,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

class Dog {
  eat() {

  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionDeclaration":false,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

const hello = name => {
  document.body.textContent = "Hello, " + name + "!";
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true,"FunctionDeclaration":false}}]
// Message: Missing JSDoc comment.

export const loginSuccessAction = (): BaseActionPayload => ({ type: LOGIN_SUCCESSFUL });
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true,"FunctionDeclaration":false}}]
// Message: Missing JSDoc comment.

export type Container = {
  constants?: ObjByString;
  enums?: { [key in string]: TypescriptEnum };
  helpers?: { [key in string]: AnyFunction };
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSTypeAliasDeclaration",{"context":"TSPropertySignature","inlineCommentBlock":true}]}]
// Message: Missing JSDoc comment.

class Foo {
    constructor() {}

    bar() {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["MethodDefinition[key.name!=\"constructor\"]"],"require":{"ClassDeclaration":true}}]
// Message: Missing JSDoc comment.

class Example extends React.PureComponent {
  componentDidMount() {}

  render() {}

  someOtherMethod () {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["MethodDefinition:not([key.name=\"componentDidMount\"]):not([key.name=\"render\"])"],"require":{"ClassDeclaration":true}}]
// Message: Missing JSDoc comment.

function foo(arg: boolean): boolean {
  return arg;
}

function bar(arg: true): true;
function bar(arg: false): false;
function bar(arg: boolean): boolean {
  return arg;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSDeclareFunction:not(TSDeclareFunction + TSDeclareFunction)","FunctionDeclaration:not(TSDeclareFunction + FunctionDeclaration)"],"require":{"FunctionDeclaration":false}}]
// Message: Missing JSDoc comment.

export function foo(arg: boolean): boolean {
  return arg;
}

export function bar(arg: true): true;
export function bar(arg: false): false;
export function bar(arg: boolean): boolean {
  return arg;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["ExportNamedDeclaration[declaration.type=\"TSDeclareFunction\"]:not(ExportNamedDeclaration[declaration.type=\"TSDeclareFunction\"] + ExportNamedDeclaration[declaration.type=\"TSDeclareFunction\"])","ExportNamedDeclaration[declaration.type=\"FunctionDeclaration\"]:not(ExportNamedDeclaration[declaration.type=\"TSDeclareFunction\"] + ExportNamedDeclaration[declaration.type=\"FunctionDeclaration\"])"],"require":{"FunctionDeclaration":false}}]
// Message: Missing JSDoc comment.

module.exports.foo = (bar) => {
  return bar + "biz"
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":false,"require":{"ArrowFunctionExpression":true,"FunctionDeclaration":true,"FunctionExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

class Animal {

  #name: string;

  private species: string;

  public color: string;

  @SomeAnnotation('optionalParameter')
  tail: boolean;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["PropertyDefinition"]}]
// Message: Missing JSDoc comment.

@Entity('users')
export class User {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true}}]
// Message: Missing JSDoc comment.

/**
 *
 */
class Foo {
    constructor() {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyConstructors":false,"require":{"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

/**
 *
 */
class Foo {
    constructor(notEmpty) {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyConstructors":true,"require":{"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

/**
 *
 */
class Foo {
    constructor() {
        const notEmpty = true;
        return notEmpty;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyConstructors":true,"require":{"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

/**
 *
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"name":false,"required":["name"]}}}}
// Message: Cannot add "name" to `require` with the tag's `name` set to `false`

class Test {
  aFunc() {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkConstructors":false,"require":{"ArrowFunctionExpression":true,"ClassDeclaration":false,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

class Test {
  aFunc = () => {}
  anotherFunc() {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true,"ClassDeclaration":false,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

export enum testEnum {
  A, B
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSEnumDeclaration"],"publicOnly":true}]
// Message: Missing JSDoc comment.

export interface Test {
  aFunc: () => void;
  aVar: string;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration"],"publicOnly":true}]
// Message: Missing JSDoc comment.

export type testType = string | number;
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSTypeAliasDeclaration"],"publicOnly":true}]
// Message: Missing JSDoc comment.

export interface Foo {
    bar: number;
    baz: string;
    quux(): void;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSPropertySignature","TSMethodSignature"],"publicOnly":true}]
// Message: Missing JSDoc comment.

export class MyComponentComponent {
  @Output()
  public changed = new EventEmitter();

  public test = 'test';

  @Input()
  public value = new EventEmitter();
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["PropertyDefinition > Decorator[expression.callee.name=\"Input\"]"]}]
// Message: Missing JSDoc comment.

requestAnimationFrame(draw)

function bench() {
}
// Message: Missing JSDoc comment.

class Foo {
  set aName (val) {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkSetters":"no-getter","contexts":["MethodDefinition > FunctionExpression"]}]
// Message: Missing JSDoc comment.

class Foo {
  get aName () {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkGetters":"no-setter","contexts":["MethodDefinition > FunctionExpression"]}]
// Message: Missing JSDoc comment.

const obj = {
  get aName () {},
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkGetters":"no-setter","contexts":["Property > FunctionExpression"]}]
// Message: Missing JSDoc comment.

function comment () {
  return "comment";
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"enableFixer":true,"fixerMessage":" TODO: add comment"}]
// Message: Missing JSDoc comment.

function comment () {
  return "comment";
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["any",{"context":"FunctionDeclaration","inlineCommentBlock":true}],"fixerMessage":"TODO: add comment "}]
// Message: Missing JSDoc comment.

function comment () {
  return "comment";
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"enableFixer":false,"fixerMessage":" TODO: add comment"}]
// Message: Missing JSDoc comment.

export class InovaAutoCompleteComponent {
  public disabled = false;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["PropertyDefinition"],"publicOnly":true}]
// Message: Missing JSDoc comment.

export default (arg) => arg;
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ArrowFunctionExpression":true,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

export function outer() {
    function inner() {
        console.log('foo');
    }

    inner();
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ArrowFunctionExpression":true,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

export const outer = () => {
    const inner = () => {
        console.log('foo');
    };

    inner();
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ArrowFunctionExpression":true,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

/**
 *
 */
export class InovaAutoCompleteComponent {
  public disabled = false;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["PropertyDefinition"],"publicOnly":true}]
// Message: Missing JSDoc comment.

/**
* Some comment.
*/
export class Component {
    public foo?: number;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkConstructors":false,"contexts":["PropertyDefinition"],"publicOnly":true}]
// Message: Missing JSDoc comment.

class Utility {
    /**
     *
     */
    mthd() {
        return false;
    }
}

module.exports = Utility;
// "jsdoc/require-jsdoc": ["error"|"warn", {"enableFixer":false,"publicOnly":true,"require":{"ArrowFunctionExpression":true,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

/**
 *
 */
module.exports = class Utility {
  mthd() {
    return false;
  }
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"enableFixer":false,"publicOnly":true,"require":{"ArrowFunctionExpression":true,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":true,"MethodDefinition":true}}]
// Message: Missing JSDoc comment.

function quux () {
  return 3;
}

function b () {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"minLineCount":2}]
// Message: Missing JSDoc comment.

function quux () {
  return 3;
}

var a = {};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":[{"context":"FunctionDeclaration","minLineCount":2},{"context":"VariableDeclaration","minLineCount":2}],"require":{"FunctionDeclaration":false}}]
// Message: Missing JSDoc comment.

function quux () {
  return 3;
}

var a = {
  b: 1,
  c: 2
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":[{"context":"FunctionDeclaration","minLineCount":4},{"context":"VariableDeclaration","minLineCount":2}],"require":{"FunctionDeclaration":false}}]
// Message: Missing JSDoc comment.

class A {
  setId(newId: number): void {
    this.id = id;
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":[{"context":"MethodDefinition","minLineCount":3}],"require":{"ClassDeclaration":false,"FunctionExpression":false,"MethodDefinition":false}}]
// Message: Missing JSDoc comment.
````

The following patterns are not considered problems:

````js
interface FooBar {
  fooBar: string;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true}}]

/** This is comment */
interface FooBar {
  fooBar: string;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true}}]

/** This is comment */
export class Foo {
  someMethod() {
    interface FooBar {
      fooBar: string;
    }
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true}}]

/** This is comment */
function someFunction() {
  interface FooBar {
    fooBar: string;
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true}}]

/** This is comment */
export function foo() {
  interface bar {
    fooBar: string;
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration","TSMethodSignature","TSPropertySignature"],"publicOnly":{"ancestorsOnly":true}}]

/**
 *
 */

var array = [1,2,3];
array.forEach(function() {});

/**
 * @class MyClass
 **/
function MyClass() {}

/**
 Function doing something
 */
function myFunction() {}
/**
 Function doing something
 */
var myFunction = function() {};
/**
 Function doing something
 */
Object.myFunction = function () {};
var obj = {
   /**
    *  Function doing something
    **/
    myFunction: function () {} };

/**
 @func myFunction
 */
function myFunction() {}
/**
 @method myFunction
 */
function myFunction() {}
/**
 @function myFunction
 */
function myFunction() {}

/**
 @func myFunction
 */
var myFunction = function () {}
/**
 @method myFunction
 */
var myFunction = function () {}
/**
 @function myFunction
 */
var myFunction = function () {}

/**
 @func myFunction
 */
Object.myFunction = function() {}
/**
 @method myFunction
 */
Object.myFunction = function() {}
/**
 @function myFunction
 */
Object.myFunction = function() {}
(function(){})();

var object = {
  /**
   *  @func myFunction - Some function
   */
  myFunction: function() {} }
var object = {
  /**
   *  @method myFunction - Some function
   */
  myFunction: function() {} }
var object = {
  /**
   *  @function myFunction - Some function
   */
  myFunction: function() {} }

var array = [1,2,3];
array.filter(function() {});
Object.keys(this.options.rules || {}).forEach(function(name) {}.bind(this));
var object = { name: 'key'};
Object.keys(object).forEach(function() {})

/**
 * @func myFunction
 */

function myFunction() {

}
// Settings: {"jsdoc":{"maxLines":2,"minLines":0}}

/**
 * @func myFunction
 */


function myFunction() {

}
// Settings: {"jsdoc":{"maxLines":3,"minLines":0}}

/** @func myFunction */  function myFunction() {

}
// Settings: {"jsdoc":{"maxLines":0,"minLines":0}}

/**
 * @func myFunction
 */

function myFunction() {

}
// Settings: {"jsdoc":{"maxLines":3,"minLines":2}}

function myFunction() {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"FunctionDeclaration":false,"MethodDefinition":true}}]

var myFunction = function() {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"FunctionDeclaration":false,"MethodDefinition":true}}]

/**
 * Description for A.
 */
class A {
    /**
     * Description for constructor.
     * @param {object[]} xs - xs
     */
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]

/**
 * Description for A.
 */
class App extends Component {
    /**
     * Description for constructor.
     * @param {object[]} xs - xs
     */
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]

/**
 * Description for A.
 */
export default class App extends Component {
    /**
     * Description for constructor.
     * @param {object[]} xs - xs
     */
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]

/**
 * Description for A.
 */
export class App extends Component {
    /**
     * Description for constructor.
     * @param {object[]} xs - xs
     */
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true,"MethodDefinition":true}}]

class A {
    constructor(xs) {
        this.a = xs;
    }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":false,"MethodDefinition":false}}]

/**
* Function doing something
*/
var myFunction = () => {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true}}]

/**
* Function doing something
*/
var myFunction = function () {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true}}]

/**
* Function doing something
*/
var myFunction = () => {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":false}}]

/**
 Function doing something
*/
var myFunction = () => () => {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true}}]

setTimeout(() => {}, 10);
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":true}}]

/**
JSDoc Block
*/
var foo = function() {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionExpression":true}}]

const foo = {/**
JSDoc Block
*/
bar() {}}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionExpression":true}}]

var foo = {/**
JSDoc Block
*/
bar: function() {}}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionExpression":true}}]

var foo = { [function() {}]: 1 };
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"FunctionExpression":true}}]

function foo () {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":true}]

function foo () {
  return;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":true}]

const test = {};
/**
 * test
 */
 test.method = function () {

}
module.exports = {
  prop: { prop2: test.method }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

/**
 *
 */
function test() {

}

module.exports = {
  prop: { prop2: test }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

/**
 *
 */
test = function() {

}

module.exports = {
  prop: { prop2: test }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":true,"esm":false,"window":false},"require":{"FunctionExpression":true}}]

/**
 *
 */
test = function() {

}

exports.someMethod = {
  prop: { prop2: test }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":false,"esm":true,"window":false},"require":{"FunctionExpression":true}}]

/**
 *
 */
const test = () => {

}

module.exports = {
prop: { prop2: test }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ArrowFunctionExpression":true}}]

const test = () => {

}
module.exports = {
  prop: { prop2: test }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"ArrowFunctionExpression":true}}]

/**
 *
 */
window.test = function() {

}

module.exports = {
prop: window
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

test = function() {

}

/**
 *
 */
test = function() {

}

module.exports = {
prop: { prop2: test }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

test = function() {

}

test = 2;

module.exports = {
prop: { prop2: test }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

/**
 *
 */
function test() {

}

/**
 *
 */
test.prototype.method = function() {

}

module.exports = {
prop: { prop2: test }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

class Test {
  /**
   * Test
   */
  method() {

  }
}
module.exports = Test;
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"MethodDefinition":true}}]

/**
 *
 */
export default function quux () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

/**
 *
 */
export default function quux () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"FunctionExpression":true}}]

/**
 *
 */
function quux () {

}
export default quux;
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

function quux () {

}
export default quux;
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"FunctionExpression":true}}]

/**
 *
 */
export function test() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

/**
 *
 */
export function test() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"FunctionExpression":true}}]

/**
 *
 */
var test = function () {

}
var test2 = 2;
export { test, test2 }
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

/**
 *
 */
var test = function () {

}
export { test as test2 }
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

/**
 *
 */
export default class A {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"ancestorsOnly":true},"require":{"ClassDeclaration":true}}]

/**
 *
 */
var test = function () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"window":true},"require":{"FunctionExpression":true}}]

let test = function () {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"window":true},"require":{"FunctionExpression":true}}]

let test = class {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ClassExpression":false}}]

/**
 *
 */
let test = class {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"ClassExpression":true}}]

export function someMethod() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":true,"esm":false,"window":false},"require":{"FunctionDeclaration":true}}]

export function someMethod() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":true,"esm":false,"window":false},"require":{"FunctionDeclaration":true}}]

exports.someMethod = function() {

}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":{"cjs":false,"esm":true,"window":false},"require":{"FunctionExpression":true}}]

const myObject = {
  myProp: true
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":[]}]

function bear() {}
/**
 *
 */
function quux () {
}
export default quux;
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true,"require":{"FunctionExpression":true}}]

/**
 * This example interface is great!
 */
export interface Example {
  /**
   * My super test string!
   */
  test: string
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration"]}]

/**
 * This example interface is great!
 */
interface Example {
  /**
   * My super test string!
   */
  test: string
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSInterfaceDeclaration"]}]

/**
 * This example type is great!
 */
export type Example = {
  /**
   * My super test string!
   */
  test: string
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSTypeAliasDeclaration"]}]

/**
 * This example type is great!
 */
type Example = {
  /**
   * My super test string!
   */
  test: string
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSTypeAliasDeclaration"]}]

/**
 * This example enum is great!
 */
export enum Example {
  /**
   * My super test enum!
   */
  test = 123
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSEnumDeclaration"]}]

/**
 * This example enum is great!
 */
enum Example {
  /**
   * My super test enum!
   */
  test = 123
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSEnumDeclaration"]}]

const foo = {...{}};
function bar() {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":false,"publicOnly":true,"require":{"ArrowFunctionExpression":true,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":false,"MethodDefinition":true}}]

/**
 * Class documentation
 */
 @logged
export default class Foo {
 // ....
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyFunctions":false,"require":{"ClassDeclaration":true}}]

const a = {};
const b = {
  ...a
};

export default b;
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["ObjectExpression"],"exemptEmptyFunctions":false,"publicOnly":true}]

/**
 * Foo interface documentation.
 */
export interface Foo extends Bar {
  /**
   * baz method documentation.
   */
  baz(): void;

  /**
   * meow method documentation.
   */
  meow(): void;
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSMethodSignature"]}]

export default class Test {
  private abc(a) {
    this.a = a;
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["MethodDefinition:not([accessibility=\"private\"]) > FunctionExpression"],"publicOnly":true,"require":{"ArrowFunctionExpression":false,"ClassDeclaration":false,"ClassExpression":false,"FunctionDeclaration":false,"FunctionExpression":false,"MethodDefinition":false}}]

/**
 * Basic application controller.
 */
@Controller()
export class AppController {
  /**
   * Returns the application information.
   *
   * @returns ...
   */
  @Get('/info')
  public getInfo(): string {
    return 'OK';
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":false,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":false,"MethodDefinition":true}}]

/**
 * Entity to represent a user in the system.
 */
@Entity('users')
export class User {
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":false,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":false,"MethodDefinition":true}}]

/**
 * Entity to represent a user in the system.
 */
@Entity('users', getVal())
export class User {
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ArrowFunctionExpression":false,"ClassDeclaration":true,"ClassExpression":true,"FunctionDeclaration":true,"FunctionExpression":false,"MethodDefinition":true}}]

/**
 *
 */
class Foo {
    constructor() {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"exemptEmptyConstructors":true,"require":{"MethodDefinition":true}}]

/**
 *
 */
class Foo {
    constructor() {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkConstructors":false,"require":{"MethodDefinition":true}}]

class Foo {
  get aName () {}
  set aName (val) {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkGetters":"no-setter","checkSetters":false,"contexts":["MethodDefinition > FunctionExpression"]}]

const obj = {
  get aName () {},
  set aName (val) {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkGetters":"no-setter","checkSetters":false,"contexts":["Property > FunctionExpression"]}]

class Foo {
  set aName (val) {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkSetters":false,"contexts":["MethodDefinition > FunctionExpression"]}]

class Foo {
  get aName () {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkGetters":false,"contexts":["MethodDefinition > FunctionExpression"]}]

class Foo {
  /**
   *
   */
  set aName (val) {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkSetters":"no-getter","contexts":["MethodDefinition > FunctionExpression"]}]

class Foo {
  /**
   *
   */
  get aName () {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkGetters":"no-setter","contexts":["MethodDefinition > FunctionExpression"]}]

class Foo {
  get aName () {}
  set aName (val) {}
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"checkGetters":false,"checkSetters":"no-getter","contexts":["MethodDefinition > FunctionExpression"]}]

class Base {
  constructor() {
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["MethodDefinition"],"exemptEmptyConstructors":true}]

/**
 * This is a text.
 */
export function a(); // Reports an error
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["TSDeclareFunction"],"require":{"FunctionDeclaration":true}}]

/**
 * Foo
 */
export function foo(): void {
  function bar(): void {
    console.log('bar');
  }

  console.log('foo');
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"publicOnly":true}]

const foo = {
  bar: () => {
    // ...
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":[":not(Property) > ArrowFunctionExpression"],"require":{"ArrowFunctionExpression":false,"ClassDeclaration":true,"ClassExpression":true}}]

/** Defines the current user's settings. */
@Injectable({
  providedIn: 'root',
})
@State<Partial<UserSettingsStateModel>>
({
  name: 'userSettings',
  defaults: {
    isDev: !environment.production,
  },
})
export class UserSettingsState { }
// "jsdoc/require-jsdoc": ["error"|"warn", {"require":{"ClassDeclaration":true}}]

/**
 * Entity to represent a user in the system.
 */
@Entity('users')
export class User {
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":["Decorator"],"require":{"FunctionDeclaration":false}}]

  function quux () {
  return 3;
}

function b () {}
// "jsdoc/require-jsdoc": ["error"|"warn", {"minLineCount":4}]

function quux () {
  return 3;
}

var a = {
  b: 1,
  c: 2
};
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":[{"context":"FunctionDeclaration","minLineCount":4},{"context":"VariableDeclaration","minLineCount":5}],"require":{"FunctionDeclaration":false}}]

class A {
  setId(newId: number): void {
    this.id = id;
  }
}
// "jsdoc/require-jsdoc": ["error"|"warn", {"contexts":[{"context":"MethodDefinition","minLineCount":4}],"require":{"ClassDeclaration":false,"FunctionExpression":false,"MethodDefinition":false}}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-param-description"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-description"></a>
### <code>require-param-description</code>

Requires that each `@param` tag has a `description` value.

Will exempt destructured roots and their children if
`settings.exemptDestructuredRootsFromChecks` is set to `true` (e.g.,
`@param {object} props` will be exempted from requiring a description given
`function someFunc ({child1, child2})`).

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-description-options-29"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-description-options-29"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-description-options-29-setdefaultdestructuredrootdescription"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-description-options-29-setdefaultdestructuredrootdescription"></a>
##### <code>setDefaultDestructuredRootDescription</code>

Whether to set a default destructured root description. For example, you may
wish to avoid manually having to set the description for a `@param`
corresponding to a destructured root object as it should always be the same
type of object. Uses `defaultDestructuredRootDescription` for the description
string. Defaults to `false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-description-options-29-defaultdestructuredrootdescription"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-description-options-29-defaultdestructuredrootdescription"></a>
##### <code>defaultDestructuredRootDescription</code>

The description string to set by default for destructured roots. Defaults to
"The root object".

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-description-options-29-contexts-8"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-description-options-29-contexts-8"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
Overrides the default contexts (see below). Set to `"any"` if you want
the rule to apply to any jsdoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., `@callback` or `@function` (or its aliases `@func` or
`@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`param`|
|Aliases|`arg`, `argument`|
|Recommended|true|
|Options|`setDefaultDestructuredRootDescription`, `defaultDestructuredRootDescription`, `contexts`|
|Settings|`exemptDestructuredRootsFromChecks`|

The following patterns are considered problems:

````js
/**
 * @param foo
 */
function quux (foo) {

}
// Message: Missing JSDoc @param "foo" description.

/**
 * @param foo
 */
function quux (foo) {

}
// "jsdoc/require-param-description": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @param "foo" description.

/**
 * @function
 * @param foo
 */
// "jsdoc/require-param-description": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @param "foo" description.

/**
 * @callback
 * @param foo
 */
// "jsdoc/require-param-description": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @param "foo" description.

/**
 * @arg foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"arg"}}}
// Message: Missing JSDoc @arg "foo" description.

/**
 * @param foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":false}}}
// Message: Unexpected tag `@param`

/**
 * @param foo
 */
function quux (foo) {

}
// "jsdoc/require-param-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag:not([name=props]))","context":"FunctionDeclaration"}]}]
// Message: Missing JSDoc @param "foo" description.

/**
 * @param {number} foo Foo description
 * @param {object} root
 * @param {boolean} baz Baz description
 */
function quux (foo, {bar}, baz) {

}
// "jsdoc/require-param-description": ["error"|"warn", {"setDefaultDestructuredRootDescription":true}]
// Message: Missing root description for @param.

/**
 * @param {number} foo Foo description
 * @param {object} root
 * @param {boolean} baz Baz description
 */
function quux (foo, {bar}, baz) {

}
// "jsdoc/require-param-description": ["error"|"warn", {"defaultDestructuredRootDescription":"Root description","setDefaultDestructuredRootDescription":true}]
// Message: Missing root description for @param.

/**
 * @param {number} foo Foo description
 * @param {object} root
 * @param {boolean} baz Baz description
 */
function quux (foo, {bar}, baz) {

}
// "jsdoc/require-param-description": ["error"|"warn", {"setDefaultDestructuredRootDescription":false}]
// Message: Missing JSDoc @param "root" description.
````

The following patterns are not considered problems:

````js
/**
 *
 */
function quux (foo) {

}

/**
 * @param foo Foo.
 */
function quux (foo) {

}

/**
 * @param foo Foo.
 */
function quux (foo) {

}
// "jsdoc/require-param-description": ["error"|"warn", {"contexts":["any"]}]

/**
 * @function
 * @param foo
 */

/**
 * @callback
 * @param foo
 */

/**
 * @param props
 */
function quux (props) {

}
// "jsdoc/require-param-description": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag:not([name=props]))","context":"FunctionDeclaration"}]}]

/**
 * @param {number} foo Foo description
 * @param {object} root
 * @param {boolean} baz Baz description
 */
function quux (foo, {bar}, baz) {

}
// Settings: {"jsdoc":{"exemptDestructuredRootsFromChecks":true}}

/**
 * @param {number} foo Foo description
 * @param {object} root
 * @param {object} root.bar
 */
function quux (foo, {bar: {baz}}) {

}
// Settings: {"jsdoc":{"exemptDestructuredRootsFromChecks":true}}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-param-name"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-name"></a>
### <code>require-param-name</code>

Requires that all function parameters have names.

> The `@param` tag requires you to specify the name of the parameter you are documenting. You can also include the parameter's type, enclosed in curly brackets, and a description of the parameter.
>
> [JSDoc](https://jsdoc.app/tags-param.html#overview)

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-name-options-30"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-name-options-30"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-name-options-30-contexts-9"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-name-options-30-contexts-9"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
Overrides the default contexts (see below). Set to `"any"` if you want
the rule to apply to any jsdoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., `@callback` or `@function` (or its aliases `@func` or
`@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`param`|
|Aliases|`arg`, `argument`|
|Recommended|true|
|Options|`contexts`|

The following patterns are considered problems:

````js
/**
 * @param
 */
function quux (foo) {

}
// Message: There must be an identifier after @param type.

/**
 * @param {string}
 */
function quux (foo) {

}
// Message: There must be an identifier after @param tag.

/**
 * @param {string}
 */
function quux (foo) {

}
// "jsdoc/require-param-name": ["error"|"warn", {"contexts":["any"]}]
// Message: There must be an identifier after @param tag.

/**
 * @function
 * @param {string}
 */
// "jsdoc/require-param-name": ["error"|"warn", {"contexts":["any"]}]
// Message: There must be an identifier after @param tag.

/**
 * @callback
 * @param {string}
 */
// "jsdoc/require-param-name": ["error"|"warn", {"contexts":["any"]}]
// Message: There must be an identifier after @param tag.

/**
 * @param foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":false}}}
// Message: Unexpected tag `@param`
````

The following patterns are not considered problems:

````js
/**
 * @param foo
 */
function quux (foo) {

}

/**
 * @param foo
 */
function quux (foo) {

}
// "jsdoc/require-param-name": ["error"|"warn", {"contexts":["any"]}]

/**
 * @param {string} foo
 */
function quux (foo) {

}

/**
 * @function
 * @param
 */

/**
 * @callback
 * @param
 */

/**
 * @param {Function} [processor=data => data] A function to run
 */
function processData(processor) {
  return processor(data)
}

/** Example with multi-line param type.
*
* @param {function(
*   number
* )} cb Callback.
*/
function example(cb) {
  cb(42);
}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-param-type"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-type"></a>
### <code>require-param-type</code>

Requires that each `@param` tag has a `type` value.

Will exempt destructured roots and their children if
`settings.exemptDestructuredRootsFromChecks` is set to `true` (e.g.,
`@param props` will be exempted from requiring a type given
`function someFunc ({child1, child2})`).

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-type-options-31"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-type-options-31"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-type-options-31-setdefaultdestructuredroottype"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-type-options-31-setdefaultdestructuredroottype"></a>
##### <code>setDefaultDestructuredRootType</code>

Whether to set a default destructured root type. For example, you may wish
to avoid manually having to set the type for a `@param`
corresponding to a destructured root object as it is always going to be an
object. Uses `defaultDestructuredRootType` for the type string. Defaults to
`false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-type-options-31-defaultdestructuredroottype"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-type-options-31-defaultdestructuredroottype"></a>
##### <code>defaultDestructuredRootType</code>

The type string to set by default for destructured roots. Defaults to "object".

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-type-options-31-contexts-10"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-type-options-31-contexts-10"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
Overrides the default contexts (see below). Set to `"any"` if you want
the rule to apply to any jsdoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., `@callback` or `@function` (or its aliases `@func` or
`@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`param`|
|Aliases|`arg`, `argument`|
|Recommended|true|
|Options|`setDefaultDestructuredRootType`, `defaultDestructuredRootType`, `contexts`|
|Settings|`exemptDestructuredRootsFromChecks`|

The following patterns are considered problems:

````js
/**
 * @param foo
 */
function quux (foo) {

}
// Message: Missing JSDoc @param "foo" type.

/**
 * @param {a xxx
 */
function quux () {
}
// Message: Missing JSDoc @param "" type.

/**
 * @param foo
 */
function quux (foo) {

}
// "jsdoc/require-param-type": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @param "foo" type.

/**
 * @function
 * @param foo
 */
// "jsdoc/require-param-type": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @param "foo" type.

/**
 * @callback
 * @param foo
 */
// "jsdoc/require-param-type": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @param "foo" type.

/**
 * @arg foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"arg"}}}
// Message: Missing JSDoc @arg "foo" type.

/**
 * @param foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":false}}}
// Message: Unexpected tag `@param`

/**
 * @param {number} foo
 * @param root
 * @param {boolean} baz
 */
function quux (foo, {bar}, baz) {

}
// "jsdoc/require-param-type": ["error"|"warn", {"setDefaultDestructuredRootType":true}]
// Message: Missing root type for @param.

/**
 * @param {number} foo
 * @param root
 * @param {boolean} baz
 */
function quux (foo, {bar}, baz) {

}
// "jsdoc/require-param-type": ["error"|"warn", {"defaultDestructuredRootType":"Object","setDefaultDestructuredRootType":true}]
// Message: Missing root type for @param.

/**
 * @param {number} foo
 * @param root
 * @param {boolean} baz
 */
function quux (foo, {bar}, baz) {

}
// "jsdoc/require-param-type": ["error"|"warn", {"setDefaultDestructuredRootType":false}]
// Message: Missing JSDoc @param "root" type.
````

The following patterns are not considered problems:

````js
/**
 *
 */
function quux (foo) {

}

/**
 * @param {number} foo
 */
function quux (foo) {

}

/**
 * @param {number} foo
 */
function quux (foo) {

}
// "jsdoc/require-param-type": ["error"|"warn", {"contexts":["any"]}]

/**
 * @function
 * @param foo
 */

/**
 * @callback
 * @param foo
 */

/**
 * @param {number} foo
 * @param root
 * @param {boolean} baz
 */
function quux (foo, {bar}, baz) {

}
// Settings: {"jsdoc":{"exemptDestructuredRootsFromChecks":true}}

/**
 * @param {number} foo
 * @param root
 * @param root.bar
 */
function quux (foo, {bar: {baz}}) {

}
// Settings: {"jsdoc":{"exemptDestructuredRootsFromChecks":true}}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-param"></a>
<a name="eslint-plugin-jsdoc-rules-require-param"></a>
### <code>require-param</code>

Requires that all function parameters are documented.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-fixer-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-fixer-1"></a>
#### Fixer

Adds `@param <name>` for each tag present in the function signature but
missing in the jsdoc. Can be disabled by setting the `enableFixer`
option to `false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-fixer-1-destructured-object-and-array-naming"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-fixer-1-destructured-object-and-array-naming"></a>
##### Destructured object and array naming

When the fixer is applied to destructured objects, only the input name is
used.

So for:

```js
/**
 * @param cfg
 */
function quux ({foo: bar, baz: bax = 5}) {
}
```

...the fixed jsdoc will be:

```js
/**
* @param cfg
* @param cfg.foo
* @param cfg.baz
*/
```

This is because the input to the function is the relevant item for
understanding the function's input, not how the variable is renamed
for internal use (the signature itself documents that).

For destructured arrays, the input name is merely the array index.

So for:

```js
/**
 * @param cfg
 */
function quux ([foo, bar]) {
}
```

..the fixed jsdoc will be:

```js
/**
* @param cfg
* @param cfg."0"
* @param cfg."1"
*/
```

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-fixer-1-missing-root-fixing"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-fixer-1-missing-root-fixing"></a>
##### Missing root fixing

Note that unless `enableRootFixer` (or `enableFixer`) is set to `false`,
missing roots will be added and auto-incremented. The default behavior
is for "root" to be auto-inserted for missing roots, followed by a
0-based auto-incrementing number.

So for:

```js
function quux ({foo}, {bar}, {baz}) {
}
```

...the default jsdoc that would be added if the fixer is enabled would be:

```js
/**
* @param root0
* @param root0.foo
* @param root1
* @param root1.bar
* @param root2
* @param root2.baz
*/
```

The name of "root" can be configured with `unnamedRootBase` (which also allows
cycling through a list of multiple root names before there is need for any
numeric component).

And one can have the count begin at another number (e.g., `1`) by changing
`autoIncrementBase` from the default of `0`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-fixer-1-rest-element-restelement-insertions"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-fixer-1-rest-element-restelement-insertions"></a>
##### Rest Element (<code>RestElement</code>) insertions

The fixer will automatically report/insert
[jsdoc repeatable parameters](https://jsdoc.app/tags-param.html#multiple-types-and-repeatable-parameters)
if missing.

```js
/**
  * @param {GenericArray} cfg
  * @param {number} cfg."0"
 */
function baar ([a, ...extra]) {
  //
}
```

..becomes:

```js
/**
  * @param {GenericArray} cfg
  * @param {number} cfg."0"
  * @param {...any} cfg."1"
 */
function baar ([a, ...extra]) {
  //
}
```

Note that the type `any` is included since we don't know of any specific
type to use.

To disable such rest element insertions, set `enableRestElementFixer` to
`false`.

Note too that the following will be reported even though there is an item
corresponding to `extra`:

```js
/**
  * @param {GenericArray} cfg
  * @param {number} cfg."0"
  * @param {any} cfg."1"
 */
function baar ([a, ...extra]) {
  //
}
```

...because it does not use the `...` syntax in the type.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-fixer-1-object-rest-property-insertions"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-fixer-1-object-rest-property-insertions"></a>
##### Object Rest Property insertions

If the `checkRestProperty` option is set to `true` (`false` by default),
missing rest properties will be reported with documentation auto-inserted:

```js
/**
 * @param cfg
 * @param cfg.num
 */
function quux ({num, ...extra}) {
}
```

...becomes:

```js
/**
 * @param cfg
 * @param cfg.num
 * @param cfg.extra
 */
function quux ({num, ...extra}) {
}
```

You may wish to manually note in your jsdoc for `extra` that this is a
rest property, however, as jsdoc
[does not appear](https://github.com/jsdoc/jsdoc/issues/1773)
to currently support syntax or output to distinguish rest properties from
other properties, so in looking at the docs alone without looking at the
function signature, it may appear that there is an actual property named
`extra`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32"></a>
#### Options

An options object accepts the following optional properties:

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-enablefixer-4"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-enablefixer-4"></a>
##### <code>enableFixer</code>

Whether to enable the fixer. Defaults to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-enablerootfixer"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-enablerootfixer"></a>
##### <code>enableRootFixer</code>

Whether to enable the auto-adding of incrementing roots (see the "Fixer"
section). Defaults to `true`. Has no effect if `enableFixer` is set to
`false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-enablerestelementfixer"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-enablerestelementfixer"></a>
##### <code>enableRestElementFixer</code>

Whether to enable the rest element fixer (see
"Rest Element (`RestElement`) insertions"). Defaults to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-checkrestproperty-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-checkrestproperty-1"></a>
##### <code>checkRestProperty</code>

If set to `true`, will report (and add fixer insertions) for missing rest
properties. Defaults to `false`.

If set to `true`, note that you can still document the subproperties of the
rest property using other jsdoc features, e.g., `@typedef`:

```js
/**
 * @typedef ExtraOptions
 * @property innerProp1
 * @property innerProp2
 */

/**
 * @param cfg
 * @param cfg.num
 * @param {ExtraOptions} extra
 */
function quux ({num, ...extra}) {
}
```

Setting this option to `false` (the default) may be useful in cases where
you already have separate `@param` definitions for each of the properties
within the rest property.

For example, with the option disabled, this will not give an error despite
`extra` not having any definition:

```js
/**
 * @param cfg
 * @param cfg.num
 */
function quux ({num, ...extra}) {
}
```

Nor will this:

```js
/**
 * @param cfg
 * @param cfg.num
 * @param cfg.innerProp1
 * @param cfg.innerProp2
 */
function quux ({num, ...extra}) {
}
```

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-autoincrementbase"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-autoincrementbase"></a>
##### <code>autoIncrementBase</code>

Numeric to indicate the number at which to begin auto-incrementing roots.
Defaults to `0`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-unnamedrootbase"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-unnamedrootbase"></a>
##### <code>unnamedRootBase</code>

An array of root names to use in the fixer when roots are missing. Defaults
to `['root']`. Note that only when all items in the array besides the last
are exhausted will auto-incrementing occur. So, with
`unnamedRootBase: ['arg', 'config']`, the following:

```js
function quux ({foo}, [bar], {baz}) {
}
```

...will get the following jsdoc block added:

```js
/**
* @param arg
* @param arg.foo
* @param config0
* @param config0."0" (`bar`)
* @param config1
* @param config1.baz
*/
```

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-exemptedby-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-exemptedby-1"></a>
##### <code>exemptedBy</code>

Array of tags (e.g., `['type']`) whose presence on the document block
avoids the need for a `@param`. Defaults to an array with
`inheritdoc`. If you set this array, it will overwrite the default,
so be sure to add back `inheritdoc` if you wish its presence to cause
exemption of the rule.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-checktypespattern-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-checktypespattern-1"></a>
##### <code>checkTypesPattern</code>

When one specifies a type, unless it is of a generic type, like `object`
or `array`, it may be considered unnecessary to have that object's
destructured components required, especially where generated docs will
link back to the specified type. For example:

```js
/**
 * @param {SVGRect} bbox - a SVGRect
 */
export const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};
```

By default `checkTypesPattern` is set to
`/^(?:[oO]bject|[aA]rray|PlainObject|Generic(?:Object|Array))$/u`,
meaning that destructuring will be required only if the type of the `@param`
(the text between curly brackets) is a match for "Object" or "Array" (with or
without initial caps), "PlainObject", or "GenericObject", "GenericArray" (or
if no type is present). So in the above example, the lack of a match will
mean that no complaint will be given about the undocumented destructured
parameters.

Note that the `/` delimiters are optional, but necessary to add flags.

Defaults to using (only) the `u` flag, so to add your own flags, encapsulate
your expression as a string, but like a literal, e.g., `/^object$/ui`.

You could set this regular expression to a more expansive list, or you
could restrict it such that even types matching those strings would not
need destructuring.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-contexts-11"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-contexts-11"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
Overrides the default contexts (see below). May be useful for adding such as
`TSMethodSignature` in TypeScript or restricting the contexts
which are checked.

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-checkconstructors-2"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-checkconstructors-2"></a>
##### <code>checkConstructors</code>

A value indicating whether `constructor`s should be checked. Defaults to
`true`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-checkgetters-2"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-checkgetters-2"></a>
##### <code>checkGetters</code>

A value indicating whether getters should be checked. Defaults to `false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-checksetters-2"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-checksetters-2"></a>
##### <code>checkSetters</code>

A value indicating whether setters should be checked. Defaults to `false`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-checkdestructured-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-checkdestructured-1"></a>
##### <code>checkDestructured</code>

Whether to require destructured properties. Defaults to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-checkdestructuredroots"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-checkdestructuredroots"></a>
##### <code>checkDestructuredRoots</code>

Whether to check the existence of a corresponding `@param` for root objects
of destructured properties (e.g., that for `function ({a, b}) {}`, that there
is something like `@param myRootObj` defined that can correspond to
the `{a, b}` object parameter).

If `checkDestructuredRoots` is `false`, `checkDestructured` will also be
implied to be `false` (i.e., the inside of the roots will not be checked
either, e.g., it will also not complain if `a` or `b` do not have their own
documentation). Defaults to `true`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-param-options-32-usedefaultobjectproperties-1"></a>
<a name="eslint-plugin-jsdoc-rules-require-param-options-32-usedefaultobjectproperties-1"></a>
##### <code>useDefaultObjectProperties</code>

Set to `true` if you wish to expect documentation of properties on objects
supplied as default values. Defaults to `false`.

|          |                      |
| -------- | ----------------------------------------------------------------------------- |
| Context  | `ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled |
| Tags     | `param` |
| Aliases  | `arg`, `argument` |
|Recommended | true|
| Options  | `autoIncrementBase`, `checkDestructured`, `checkDestructuredRoots`, `contexts`, `enableFixer`, `enableRootFixer`, `enableRestElementFixer`, `checkRestProperty`, `exemptedBy`, `checkConstructors`, `checkGetters`, `checkSetters`, `checkTypesPattern`, `unnamedRootBase`, `useDefaultObjectProperties`|
| Settings | `ignoreReplacesDocs`, `overrideReplacesDocs`, `augmentsExtendsReplacesDocs`, `implementsReplacesDocs`|

The following patterns are considered problems:

````js
/**
 *
 */
function quux (foo) {

}
// Message: Missing JSDoc @param "foo" declaration.

/**
 *
 */
function quux (foo) {

}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["FunctionDeclaration"]}]
// Message: Missing JSDoc @param "foo" declaration.

/**
 *
 */
function quux ({foo}) {

}
// Message: Missing JSDoc @param "root0" declaration.

/**
 * @param foo
 */
function quux (foo, bar, {baz}) {

}
// "jsdoc/require-param": ["error"|"warn", {"checkDestructured":false}]
// Message: Missing JSDoc @param "bar" declaration.

/**
 * @param foo
 */
function quux (foo, bar, {baz}) {

}
// "jsdoc/require-param": ["error"|"warn", {"checkDestructuredRoots":false}]
// Message: Missing JSDoc @param "bar" declaration.

/**
 *
 */
function quux ({foo}) {

}
// "jsdoc/require-param": ["error"|"warn", {"enableFixer":false}]
// Message: Missing JSDoc @param "root0" declaration.

/**
 *
 */
function quux ({foo: bar = 5} = {}) {

}
// Message: Missing JSDoc @param "root0" declaration.

/**
 * @param
 */
function quux ({foo}) {

}
// Message: Missing JSDoc @param "root0" declaration.

/**
 * @param
 */
function quux ({foo}) {

}
// "jsdoc/require-param": ["error"|"warn", {"autoIncrementBase":1}]
// Message: Missing JSDoc @param "root1" declaration.

/**
 * @param options
 */
function quux ({foo}) {

}
// Message: Missing JSDoc @param "options.foo" declaration.

/**
 * @param
 */
function quux ({ foo, bar: { baz }}) {

}
// Message: Missing JSDoc @param "root0" declaration.

/**
 *
 */
function quux ({foo}, {bar}) {

}
// "jsdoc/require-param": ["error"|"warn", {"unnamedRootBase":["arg"]}]
// Message: Missing JSDoc @param "arg0" declaration.

/**
 *
 */
function quux ({foo}, {bar}) {

}
// "jsdoc/require-param": ["error"|"warn", {"unnamedRootBase":["arg","config"]}]
// Message: Missing JSDoc @param "arg" declaration.

/**
 *
 */
function quux ({foo}, {bar}) {

}
// "jsdoc/require-param": ["error"|"warn", {"enableRootFixer":false,"unnamedRootBase":["arg","config"]}]
// Message: Missing JSDoc @param "arg" declaration.

/**
 *
 */
function quux (foo, bar) {

}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @param foo
 */
function quux (foo, bar) {

}
// Message: Missing JSDoc @param "bar" declaration.

/**
 * @param bar
 */
function quux (foo, bar, baz) {

}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @param foo
 * @param bar
 */
function quux (foo, bar, baz) {

}
// Message: Missing JSDoc @param "baz" declaration.

/**
 * @param baz
 */
function quux (foo, bar, baz) {

}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @param
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"arg"}}}
// Message: Missing JSDoc @arg "foo" declaration.

/**
 * @param foo
 */
function quux (foo, bar) {

}
// Message: Missing JSDoc @param "bar" declaration.

/**
 * @override
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"overrideReplacesDocs":false}}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @ignore
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignoreReplacesDocs":false}}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @implements
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"implementsReplacesDocs":false}}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @augments
 */
function quux (foo) {

}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @extends
 */
function quux (foo) {

}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @override
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"overrideReplacesDocs":false}}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @ignore
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"ignoreReplacesDocs":false}}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @implements
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"implementsReplacesDocs":false}}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @augments
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @extends
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Message: Missing JSDoc @param "foo" declaration.

export class SomeClass {
  /**
   * @param property
   */
  constructor(private property: string, private foo: number) {}
}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @param
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":false}}}
// Message: Unexpected tag `@param`

/**
 *
 */
function quux ({bar, baz}, foo) {
}
// Message: Missing JSDoc @param "root0" declaration.

/**
 *
 */
function quux (foo, {bar, baz}) {
}
// Message: Missing JSDoc @param "foo" declaration.

/**
 *
 */
function quux ([bar, baz], foo) {
}
// Message: Missing JSDoc @param "root0" declaration.

/**
 *
 */
function quux (foo) {
}
// "jsdoc/require-param": ["error"|"warn", {"exemptedBy":["notPresent"]}]
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @inheritdoc
 */
function quux (foo) {

}
// "jsdoc/require-param": ["error"|"warn", {"exemptedBy":[]}]
// Message: Missing JSDoc @param "foo" declaration.

/**
 * @inheritdoc
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Missing JSDoc @param "foo" declaration.

/**
 * Assign the project to a list of employees.
 * @param {object[]} employees - The employees who are responsible for the project.
 * @param {string} employees[].name - The name of an employee.
 * @param {string} employees[].department - The employee's department.
 */
function assign (employees, name) {

};
// Message: Missing JSDoc @param "name" declaration.

interface ITest {
/**
 * Test description.
 */
TestMethod(id: number): void;
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSMethodSignature"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * A test class.
 */
abstract class TestClass
{
/**
 * A test method.
 */
abstract TestFunction(id);
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSEmptyBodyFunctionExpression"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * A test class.
 */
declare class TestClass
{
/**
 *
 */
TestMethod(id);
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSEmptyBodyFunctionExpression"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * A test function.
 */
declare let TestFunction: (id) => void;
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * A test function.
 */
let TestFunction: (id) => void;
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * A test function.
 */
function test(
  processor: (id: number) => string
) {
  return processor(10);
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * A test function.
 */
let test = (processor: (id: number) => string) =>
{
  return processor(10);
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

class TestClass {
  /**
  * A class property.
  */
  public Test: (id: number) => string;
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

class TestClass {
  /**
   * A class method.
   */
  public TestMethod(): (id: number) => string
  {
  }
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

interface TestInterface {
/**
 * An interface property.
 */
public Test: (id: number) => string;
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

interface TestInterface {
  /**
   * An interface method.
   */
  public TestMethod(): (id: number) => string;
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * A function with return type
 */
function test(): (id: number) => string;
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * A function with return type
 */
let test = (): (id: number) => string =>
{
  return (id) => `${id}`;
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]
// Message: Missing JSDoc @param "id" declaration.

/**
 * @param baz
 * @param options
 */
function quux (baz, {foo: bar}) {

}
// Message: Missing JSDoc @param "options.foo" declaration.

class Client {
  /**
   * Set collection data.
   * @param  {Object}   data                    The collection data object.
   * @param  {number}   data.last_modified
   * @param  {Object}   options            The options object.
   * @param  {Object}   [options.headers]       The headers object option.
   * @param  {Number}   [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Boolean}  [options.safe]          The safe option.
   * @param  {Boolean}  [options.patch]         The patch option.
   * @param  {Number}   [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async setData(
    data: { last_modified?: number },
    options: {
      headers?: Record<string, string>;
      safe?: boolean;
      retry?: number;
      patch?: boolean;
      last_modified?: number;
      permissions?: [];
    } = {}
  ) {}
}
// Message: Missing JSDoc @param "options.permissions" declaration.

/**
 *
 */
function quux (foo) {

}
// "jsdoc/require-param": ["error"|"warn", {"enableFixer":false}]
// Message: Missing JSDoc @param "foo" declaration.

class Client {
  /**
   * Set collection data.
   * @return {Promise<Object, Error>}
   */
  async setData(
    data: { last_modified?: number }
  ) {}
}
// Message: Missing JSDoc @param "data" declaration.

/**
 * @param cfg
 * @param cfg.num
 */
function quux ({num, ...extra}) {
}
// "jsdoc/require-param": ["error"|"warn", {"checkRestProperty":true}]
// Message: Missing JSDoc @param "cfg.extra" declaration.

/**
 * @param cfg
 * @param cfg.opts
 * @param cfg.opts.num
 */
function quux ({opts: {num, ...extra}}) {
}
// "jsdoc/require-param": ["error"|"warn", {"checkRestProperty":true}]
// Message: Missing JSDoc @param "cfg.opts.extra" declaration.

/**
 * @param {GenericArray} cfg
 * @param {number} cfg."0"
 */
function baar ([a, ...extra]) {
  //
}
// Message: Missing JSDoc @param "cfg."1"" declaration.

/**
 * @param a
 */
function baar (a, ...extra) {
  //
}
// Message: Missing JSDoc @param "extra" declaration.

/**
 * Converts an SVGRect into an object.
 * @param {SVGRect} bbox - a SVGRect
 */
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};
// "jsdoc/require-param": ["error"|"warn", {"checkTypesPattern":"SVGRect"}]
// Message: Missing JSDoc @param "bbox.x" declaration.

/**
 * Converts an SVGRect into an object.
 * @param {object} bbox - a SVGRect
 */
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};
// Message: Missing JSDoc @param "bbox.x" declaration.

module.exports = class GraphQL {
  /**
   * @param fetchOptions
   * @param cacheKey
   */
  fetch = ({ url, ...options }, cacheKey) => {
  }
};
// "jsdoc/require-param": ["error"|"warn", {"checkRestProperty":true}]
// Message: Missing JSDoc @param "fetchOptions.url" declaration.

(function() {
	/**
	 * A function.
	 */
	function f(param) {
		return !param;
	}
})();
// Message: Missing JSDoc @param "param" declaration.

/**
 * Description.
 * @param {Object} options
 * @param {Object} options.foo
 */
function quux ({ foo: { bar } }) {}
// Message: Missing JSDoc @param "options.foo.bar" declaration.

/**
 * Description.
 * @param {FooBar} options
 * @param {FooBar} options.foo
 */
function quux ({ foo: { bar } }) {}
// "jsdoc/require-param": ["error"|"warn", {"checkTypesPattern":"FooBar"}]
// Message: Missing JSDoc @param "options.foo.bar" declaration.

/**
 * Description.
 * @param {Object} options
 * @param {FooBar} foo
 */
function quux ({ foo: { bar } }) {}
// Message: Missing JSDoc @param "options.foo" declaration.

/**
 * Description.
 * @param {Object} options
 * @param options.foo
 */
function quux ({ foo: { bar } }) {}
// Message: Missing JSDoc @param "options.foo.bar" declaration.

/**
 * Description.
 * @param {object} options Options.
 * @param {object} options.foo A description.
 * @param {object} options.foo.bar
 */
function foo({ foo: { bar: { baz } }}) {}
// Message: Missing JSDoc @param "options.foo.bar.baz" declaration.

/**
* Returns a number.
* @param {Object} props Props.
* @param {Object} props.prop Prop.
* @return {number} A number.
*/
export function testFn1 ({ prop = { a: 1, b: 2 } }) {
}
// "jsdoc/require-param": ["error"|"warn", {"useDefaultObjectProperties":true}]
// Message: Missing JSDoc @param "props.prop.a" declaration.

/** Foo. */
function foo(a, b, c) {}
// Message: Missing JSDoc @param "a" declaration.

/**
 * @param foo Some number.
 * @param bar Some number.
 */
export function myPublicFunction(foo: number, bar: number, baz: number) {}
// "jsdoc/require-param": ["error"|"warn", {"contexts":[{"comment":"JsdocBlock:has(JsdocTag[tag=\"param\"])","context":"FunctionDeclaration"}]}]
// Message: Missing JSDoc @param "baz" declaration.
````

The following patterns are not considered problems:

````js
/**
 * @param foo
 */
function quux (foo) {

}

/**
 * @param root0
 * @param root0.foo
 */
function quux ({foo}) {

}

/**
 * @param root0
 * @param root0.foo
 * @param root1
 * @param root1.bar
 */
function quux ({foo}, {bar}) {

}

/**
 * @param arg0
 * @param arg0.foo
 * @param arg1
 * @param arg1.bar
 */
function quux ({foo}, {bar}) {

}
// "jsdoc/require-param": ["error"|"warn", {"unnamedRootBase":["arg"]}]

/**
 * @param arg
 * @param arg.foo
 * @param config0
 * @param config0.bar
 * @param config1
 * @param config1.baz
 */
function quux ({foo}, {bar}, {baz}) {

}
// "jsdoc/require-param": ["error"|"warn", {"unnamedRootBase":["arg","config"]}]

/**
 * @inheritdoc
 */
function quux (foo) {

}

/**
 * @inheritDoc
 */
function quux (foo) {

}

/**
 * @arg foo
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"param":"arg"}}}

/**
 * @override
 * @param foo
 */
function quux (foo) {

}

/**
 * @override
 */
function quux (foo) {

}

/**
 * @override
 */
class A {
  /**
    *
    */
  quux (foo) {

  }
}

/**
 * @override
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"overrideReplacesDocs":true}}

/**
 * @ignore
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignoreReplacesDocs":true}}

/**
 * @implements
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}

/**
 * @implements
 */
function quux (foo) {

}

/**
 * @implements
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"implementsReplacesDocs":true}}

/**
 * @implements
 * @param foo
 */
function quux (foo) {

}

/**
 * @augments
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"augmentsExtendsReplacesDocs":true}}

/**
 * @augments
 * @param foo
 */
function quux (foo) {

}

/**
 * @extends
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"augmentsExtendsReplacesDocs":true}}

/**
 * @extends
 * @param foo
 */
function quux (foo) {

}

/**
 * @augments
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"augmentsExtendsReplacesDocs":true}}

/**
 * @extends
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"augmentsExtendsReplacesDocs":true}}

/**
 * @override
 */
class A {
  /**
  * @param foo
  */
  quux (foo) {

  }
}

/**
 * @override
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"overrideReplacesDocs":true}}

/**
 * @ignore
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"ignoreReplacesDocs":true}}

/**
 * @implements
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"implementsReplacesDocs":true}}

/**
 * @implements
 */
class A {
  /**
   * @param foo
   */
  quux (foo) {

  }
}

/**
 * @augments
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"augmentsExtendsReplacesDocs":true}}

/**
 * @augments
 */
class A {
  /**
   * @param foo
   */
  quux (foo) {

  }
}

/**
 * @extends
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"augmentsExtendsReplacesDocs":true}}

/**
 * @extends
 */
class A {
  /**
   * @param foo
   */
  quux (foo) {

  }
}

/**
 * @augments
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"augmentsExtendsReplacesDocs":true}}

/**
 * @extends
 */
class A {
  /**
   *
   */
  quux (foo) {

  }
}
// Settings: {"jsdoc":{"augmentsExtendsReplacesDocs":true}}

/**
 * @internal
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignoreInternal":true}}

/**
 * @private
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignorePrivate":true}}

/**
 * @access private
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"ignorePrivate":true}}

// issue 182: optional chaining
/** @const {boolean} test */
const test = something?.find(_ => _)

/** @type {RequestHandler} */
function foo(req, res, next) {}

/**
 * @type {MyCallback}
 */
function quux () {

}
// "jsdoc/require-param": ["error"|"warn", {"exemptedBy":["type"]}]

/**
 * @override
 */
var A = class {
  /**
    *
    */
  quux (foo) {

  }
}

export class SomeClass {
  /**
   * @param property
   */
  constructor(private property: string) {}
}

/**
 * Assign the project to an employee.
 *
 * @param {object} employee - The employee who is responsible for the project.
 * @param {string} employee.name - The name of the employee.
 * @param {string} employee.department - The employee's department.
 */
function assign({name, department}) {
  // ...
}

export abstract class StephanPlugin<O, D> {

    /**
     * Called right after Stephan loads the plugin file.
     *
     * @example
     *```typescript
     * type Options = {
     *      verbose?: boolean;
     *      token?: string;
     * }
     * ```
     *
     * Note that your Options type should only have optional properties...
     *
     * @param args Arguments compiled and provided by StephanClient.
     * @param args.options The options as provided by the user, or an empty object if not provided.
     * @param args.client The options as provided by the user, or an empty object if not provided.
     * @param defaultOptions The default options as provided by the plugin, or an empty object.
     */
    public constructor({options, client}: {
        options: O;
        client: unknown;
    }, defaultOptions: D) {

    }
}

/**
 *
 */
function quux (foo) {

}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["ArrowFunctionExpression"]}]

/**
* A function with return type
*
* @param id
*/
let test = (): (id: number) => string =>
{
  return (id) => `${id}`;
}
// "jsdoc/require-param": ["error"|"warn", {"contexts":["TSFunctionType"]}]

/** @abstract */
class base {
/** @param {boolean} arg0 */
constructor(arg0) {}
}

class foo extends base {
/** @inheritDoc */
constructor(arg0) {
super(arg0);
this.arg0 = arg0;
}
}
// Settings: {"jsdoc":{"mode":"closure"}}

    export abstract class StephanPlugin<O, D> {

    /**
     * Called right after Stephan loads the plugin file.
     *
     * @example
     *```typescript
     * type Options = {
     *      verbose?: boolean;
     *      token?: string;
     * }
     * ```
     *
     * Note that your Options type should only have optional properties...
     *
     * @param args Arguments compiled and provided by StephanClient.
     * @param args.options The options as provided by the user, or an empty object if not provided.
     * @param args.client The options as provided by the user, or an empty object if not provided.
     * @param args.client.name The name of the client.
     * @param defaultOptions The default options as provided by the plugin, or an empty object.
     */
    public constructor({ options, client: { name } }: {
        options: O;
        client: { name: string };
    }, defaultOptions: D) {

    }
}

/**
* @param {string} cb
*/
function createGetter (cb) {
  return function (...args) {
    cb();
  };
}

/**
 * @param cfg
 * @param cfg.num
 */
function quux ({num, ...extra}) {
}

/**
  * @param {GenericArray} cfg
  * @param {number} cfg."0"
 */
function baar ([a, ...extra]) {
  //
}
// "jsdoc/require-param": ["error"|"warn", {"enableRestElementFixer":false}]

/**
  * @param a
 */
function baar (a, ...extra) {
  //
}
// "jsdoc/require-param": ["error"|"warn", {"enableRestElementFixer":false}]

/**
* Converts an SVGRect into an object.
* @param {SVGRect} bbox - a SVGRect
*/
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};

/**
* Converts an SVGRect into an object.
* @param {object} bbox - a SVGRect
*/
const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};
// "jsdoc/require-param": ["error"|"warn", {"checkTypesPattern":"SVGRect"}]

class CSS {
  /**
   * Set one or more CSS properties for the set of matched elements.
   *
   * @param {Object} propertyObject - An object of property-value pairs to set.
   */
  setCssObject(propertyObject: {[key: string]: string | number}): void {
  }
}

/**
 * @param foo
 * @param bar
 * @param cfg
 */
function quux (foo, bar, {baz}) {

}
// "jsdoc/require-param": ["error"|"warn", {"checkDestructured":false}]

/**
 * @param foo
 * @param bar
 */
function quux (foo, bar, {baz}) {

}
// "jsdoc/require-param": ["error"|"warn", {"checkDestructuredRoots":false}]

/**
 * @param root
 * @param root.foo
 */
function quux ({"foo": bar}) {

}

/**
 * @param root
 * @param root."foo"
 */
function quux ({foo: bar}) {

}

/**
 * Description.
 * @param {string} b Description `/**`.
 */
module.exports = function a(b) {
  console.info(b);
};

/**
 * Description.
 * @param {Object} options Options.
 * @param {FooBar} options.foo foo description.
 */
function quux ({ foo: { bar } }) {}

/**
 * Description.
 * @param {FooBar} options
 * @param {Object} options.foo
 */
function quux ({ foo: { bar } }) {}
// "jsdoc/require-param": ["error"|"warn", {"checkTypesPattern":"FooBar"}]

/**
 * @param obj
 * @param obj.data
 * @param obj.data."0"
 * @param obj.data."1"
 * @param obj.data."2"
 * @param obj.defaulting
 * @param obj.defaulting."0"
 * @param obj.defaulting."1"
 */
function Item({
  data: [foo, bar, ...baz],
  defaulting: [quux, xyz] = []
}) {
}

/**
* Returns a number.
* @param {Object} props Props.
* @param {Object} props.prop Prop.
* @return {number} A number.
*/
export function testFn1 ({ prop = { a: 1, b: 2 } }) {
}
// "jsdoc/require-param": ["error"|"warn", {"useDefaultObjectProperties":false}]

/**
 * @param this The this object
 * @param bar number to return
 * @returns number returned back to caller
 */
function foo(this: T, bar: number): number {
  console.log(this.name);
  return bar;
}

/**
 * @param bar number to return
 * @returns number returned back to caller
 */
function foo(this: T, bar: number): number {
  console.log(this.name);
  return bar;
}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-property"></a>
<a name="eslint-plugin-jsdoc-rules-require-property"></a>
### <code>require-property</code>

Requires that all `@typedef` and `@namespace` tags have `@property`
when their type is a plain `object`, `Object`, or `PlainObject`.

Note that any other type, including a subtype of object such as
`object<string, string>`, will not be reported.

<a name="user-content-eslint-plugin-jsdoc-rules-require-property-fixer-2"></a>
<a name="eslint-plugin-jsdoc-rules-require-property-fixer-2"></a>
#### Fixer

The fixer for `require-property` will add an empty `@property`.

|||
|---|---|
|Context|Everywhere|
|Tags|`typedef`, `namespace`|
|Recommended|true|

The following patterns are considered problems:

````js
/**
 * @typedef {object} SomeTypedef
 */
// Message: Missing JSDoc @property.

class Test {
    /**
     * @typedef {object} SomeTypedef
     */
    quux () {}
}
// Message: Missing JSDoc @property.

/**
 * @typedef {PlainObject} SomeTypedef
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":"prop"}}}
// Message: Missing JSDoc @prop.

/**
 * @namespace {Object} SomeName
 */
// Message: Missing JSDoc @property.
````

The following patterns are not considered problems:

````js
/**
 *
 */

/**
 * @property
 */

/**
 * @typedef {Object} SomeTypedef
 * @property {SomeType} propName Prop description
 */

/**
 * @typedef {object} SomeTypedef
 * @prop {SomeType} propName Prop description
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":"prop"}}}

/**
 * @typedef {object} SomeTypedef
 * @property
 * // arbitrary property content
 */

/**
 * @typedef {object<string, string>} SomeTypedef
 */

/**
 * @typedef {string} SomeTypedef
 */

/**
 * @namespace {object} SomeName
 * @property {SomeType} propName Prop description
 */

/**
 * @namespace {object} SomeName
 * @property
 * // arbitrary property content
 */

/**
 * @typedef {object} SomeTypedef
 * @property someProp
 * @property anotherProp This with a description
 * @property {anotherType} yetAnotherProp This with a type and desc.
 */
function quux () {

}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-property-description"></a>
<a name="eslint-plugin-jsdoc-rules-require-property-description"></a>
### <code>require-property-description</code>

Requires that each `@property` tag has a `description` value.

|||
|---|---|
|Context|everywhere|
|Tags|`property`|
|Aliases|`prop`|
|Recommended|true|

The following patterns are considered problems:

````js
/**
 * @typedef {SomeType} SomeTypedef
 * @property foo
 */
// Message: Missing JSDoc @property "foo" description.

/**
 * @typedef {SomeType} SomeTypedef
 * @prop foo
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":"prop"}}}
// Message: Missing JSDoc @prop "foo" description.

/**
 * @typedef {SomeType} SomeTypedef
 * @property foo
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":false}}}
// Message: Unexpected tag `@property`
````

The following patterns are not considered problems:

````js
/**
 * @typedef {SomeType} SomeTypedef
 */

/**
 * @typedef {SomeType} SomeTypedef
 * @property foo Foo.
 */

/**
 * @namespace {SomeType} SomeName
 * @property foo Foo.
 */

/**
 * @class
 * @property foo Foo.
 */

/**
 * Typedef with multi-line property type.
 *
 * @typedef {object} MyType
 * @property {function(
 *   number
 * )} numberEater Method which takes a number.
 */
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-property-name"></a>
<a name="eslint-plugin-jsdoc-rules-require-property-name"></a>
### <code>require-property-name</code>

Requires that all function `@property` tags have names.

|||
|---|---|
|Context|everywhere|
|Tags|`property`|
|Aliases|`prop`|
|Recommended|true|

The following patterns are considered problems:

````js
/**
 * @typedef {SomeType} SomeTypedef
 * @property
 */
// Message: There must be an identifier after @property type.

/**
 * @typedef {SomeType} SomeTypedef
 * @property {string}
 */
// Message: There must be an identifier after @property tag.

/**
 * @typedef {SomeType} SomeTypedef
 * @property foo
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":false}}}
// Message: Unexpected tag `@property`
````

The following patterns are not considered problems:

````js
/**
 * @typedef {SomeType} SomeTypedef
 * @property foo
 */

/**
 * @typedef {SomeType} SomeTypedef
 * @property {string} foo
 */

/**
 * @namespace {SomeType} SomeName
 * @property {string} foo
 */

/**
 * @class
 * @property {string} foo
 */
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-property-type"></a>
<a name="eslint-plugin-jsdoc-rules-require-property-type"></a>
### <code>require-property-type</code>

Requires that each `@property` tag has a `type` value.

|||
|---|---|
|Context|everywhere|
|Tags|`property`|
|Aliases|`prop`|
|Recommended|true|

The following patterns are considered problems:

````js
/**
 * @typedef {SomeType} SomeTypedef
 * @property foo
 */
// Message: Missing JSDoc @property "foo" type.

/**
 * @typedef {SomeType} SomeTypedef
 * @prop foo
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":"prop"}}}
// Message: Missing JSDoc @prop "foo" type.

/**
 * @typedef {SomeType} SomeTypedef
 * @property foo
 */
// Settings: {"jsdoc":{"tagNamePreference":{"property":false}}}
// Message: Unexpected tag `@property`
````

The following patterns are not considered problems:

````js
/**
 * @typedef {SomeType} SomeTypedef
 */

/**
 * @typedef {SomeType} SomeTypedef
 * @property {number} foo
 */

/**
 * @namespace {SomeType} SomeName
 * @property {number} foo
 */

/**
 * @class
 * @property {number} foo
 */
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-check"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-check"></a>
### <code>require-returns-check</code>

Requires a return statement (or non-`undefined` Promise resolve value) in
function bodies if a `@returns` tag (without a `void` or `undefined` type)
is specified in the function's JSDoc comment.

Will also report `@returns {void}` and `@returns {undefined}` if `exemptAsync`
is set to `false` and a non-`undefined` value is returned or a resolved value
is found. Also reports if `@returns {never}` is discovered with a return value.

Will also report if multiple `@returns` tags are present.

<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-check-options-33"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-check-options-33"></a>
#### Options

- `exemptGenerators`- Because a generator might be labeled as having a
  `IterableIterator` `@returns` value (along with an iterator type
  corresponding to the type of any `yield` statements), projects might wish to
  leverage `@returns` in generators even without a` return` statement. This
  option is therefore `true` by default in `typescript` mode (in "jsdoc" mode,
  one might be more likely to take advantage of `@yields`). Set it to `false`
  if you wish for a missing `return` to be flagged regardless.
- `exemptAsync` - By default, functions which return a `Promise` that are not
    detected as resolving with a non-`undefined` value and `async` functions
    (even ones that do not explicitly return a value, as these are returning a
    `Promise` implicitly) will be exempted from reporting by this rule.
    If you wish to insist that only `Promise`'s which resolve to
    non-`undefined` values or `async` functions with explicit `return`'s will
    be exempted from reporting (i.e., that `async` functions can be reported
    if they lack an explicit (non-`undefined`) `return` when a `@returns` is
    present), you can set `exemptAsync` to `false` on the options object.
- `reportMissingReturnForUndefinedTypes` - If `true` and no return or
    resolve value is found, this setting will even insist that reporting occur
    with `void` or `undefined` (including as an indicated `Promise` type).
    Unlike `require-returns`, with this option in the rule, one can
     *discourage* the labeling of `undefined` types. Defaults to `false`.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`|
|Tags|`returns`|
|Aliases|`return`|
|Options|`exemptAsync`, `reportMissingReturnForUndefinedTypes`|
|Recommended|true|

The following patterns are considered problems:

````js
/**
 * @returns
 */
function quux (foo) {

}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @return
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":"return"}}}
// Message: JSDoc @return declaration present but return expression not available in function.

/**
 * @returns
 */
const quux = () => {}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {undefined} Foo.
 * @returns {String} Foo.
 */
function quux () {

  return foo;
}
// Message: Found more than one @returns declaration.

const language = {
  /**
   * @param {string} name
   * @returns {string}
   */
  get name() {
    this._name = name;
  }
}
// Message: JSDoc @returns declaration present but return expression not available in function.

class Foo {
  /**
   * @returns {string}
   */
  bar () {
  }
}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":false}}}
// Message: Unexpected tag `@returns`

/**
 * @returns {string}
 */
function f () {
  function g() {
    return 'foo'
  }

  () => {
    return 5
  }
}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {Promise<void>}
 */
async function quux() {}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptAsync":false}]
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {IterableIterator<any>}
 */
function * quux() {}
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {IterableIterator<any>}
 */
function * quux() {}
// Settings: {"jsdoc":{"mode":"typescript"}}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptGenerators":false}]
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {Promise<void>}
 */
function quux() {
  return new Promise((resolve, reject) => {})
}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptAsync":false}]
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {Promise<void>}
 */
function quux() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    });
  })
}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptAsync":false}]
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * Description.
 * @returns {string}
 */
async function foo() {
  return new Promise(resolve => resolve());
}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptAsync":false}]
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * Description.
 * @returns {void}
 */
async function foo() {
  return new Promise(resolve => resolve());
}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptAsync":false,"reportMissingReturnForUndefinedTypes":true}]
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns { void } Foo.
 */
function quux () {}
// "jsdoc/require-returns-check": ["error"|"warn", {"reportMissingReturnForUndefinedTypes":true}]
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {never} Foo.
 */
function quux () {
  return undefined;
}
// Message: JSDoc @returns declaration set with "never" but return expression is present in function.

/**
 * @returns {never}
 */
function quux (foo) {
  return foo;
}
// Message: JSDoc @returns declaration set with "never" but return expression is present in function.

/**
 * Reads a test fixture.
 *
 * @param path The path to resolve relative to the fixture base. It will be normalized for the
 * operating system.
 *
 * @returns The file contents as buffer.
 */
export function readFixture(path: string): void;
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * Reads a test fixture.
 *
 * @param path The path to resolve relative to the fixture base. It will be normalized for the
 * operating system.
 *
 * @returns The file contents as buffer.
 */
export function readFixture(path: string);
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {SomeType}
 */
function quux (path) {
  if (true) {
    return;
  }
  return 15;
};
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * Reads a test fixture.
 *
 * @param path The path to resolve relative to the fixture base. It will be normalized for the
 * operating system.
 *
 * @returns The file contents as buffer.
 */
export function readFixture(path: string): void {
  return;
};
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {true}
 */
function quux () {
  if (true) {
    return true;
  }
}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {true}
 */
function quux () {
  if (true) {
  } else {
    return;
  }
}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {true}
 */
function quux (someVar) {
  switch (someVar) {
  case 1:
    return true;
  case 2:
    return;
  }
}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {boolean}
 */
const quux = (someVar) => {
  if (someVar) {
    return true;
  }
};
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {true}
 */
function quux () {
  try {
    return true;
  } catch (error) {
  }
}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {true}
 */
function quux () {
  try {
    return true;
  } catch (error) {
    return true;
  } finally {
    return;
  }
}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns {true}
 */
function quux () {
  if (true) {
    throw new Error('abc');
  }

  throw new Error('def');
}
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns Baz.
 */
function foo() {
    switch (true) {
        default:
            switch (false) {
                default: return;
            }
            return "baz";
    }
};
// Message: JSDoc @returns declaration present but return expression not available in function.

/**
 * @returns Baz.
 */
function foo() {
    switch (true) {
        default:
            switch (false) {
                default: return;
            }
            return "baz";
    }
};
// Message: JSDoc @returns declaration present but return expression not available in function.
````

The following patterns are not considered problems:

````js
/**
 * @returns Foo.
 */
function quux () {

  return foo;
}

/**
 * @returns {string} Foo.
 */
function quux () {

  return foo;
}

/**
 * @returns {string} Foo.
 */
function quux () {

  return foo;
}

/**
 *
 */
function quux () {
}

/**
 * @returns {*} Foo.
 */
const quux = () => foo;

/**
 * @returns {undefined} Foo.
 */
function quux () {}

/**
 * @returns { void } Foo.
 */
function quux () {}

/**
 * @returns {Promise<void>}
 */
async function quux() {}

/**
 * @returns {Promise<void>}
 */
const quux = async function () {}

/**
 * @returns {Promise<void>}
 */
const quux = async () => {}

/**
 * @returns Foo.
 * @abstract
 */
function quux () {
  throw new Error('must be implemented by subclass!');
}

/**
 * @returns Foo.
 * @virtual
 */
function quux () {
  throw new Error('must be implemented by subclass!');
}

/**
 * @returns Foo.
 * @constructor
 */
function quux () {
}

/**
 * @interface
 */
class Foo {
  /**
   * @returns {string}
   */
  bar () {
  }
}

/**
 * @record
 */
class Foo {
  /**
   * @returns {string}
   */
  bar () {
  }
}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @returns {undefined} Foo.
 */
function quux () {
}

/**
 * @returns {void} Foo.
 */
function quux () {
}

/**
 * @returns {void} Foo.
 */
function quux () {
  return undefined;
}

/**
 * @returns {never} Foo.
 */
function quux () {
}

/**
 * @returns {void} Foo.
 */
function quux () {
  return;
}

/**
 *
 */
function quux () {
  return undefined;
}

/**
 *
 */
function quux () {
  return;
}

/**
 * @returns {true}
 */
function quux () {
  try {
    return true;
  } catch (err) {
  }
  return true;
}

/**
 * @returns {true}
 */
function quux () {
  try {
  } finally {
    return true;
  }
  return true;
}

/**
 * @returns {true}
 */
function quux () {
  try {
    return true;
  } catch (err) {
  }
  return true;
}

/**
 * @returns {true}
 */
function quux () {
  try {
    something();
  } catch (err) {
    return true;
  }
  return true;
}

/**
 * @returns {true}
 */
function quux () {
  switch (true) {
  case 'abc':
    return true;
  }
  return true;
}

/**
 * @returns {true}
 */
function quux () {
  switch (true) {
  case 'abc':
    return true;
  }
  return true;
}

/**
 * @returns {true}
 */
function quux () {
  for (const i of abc) {
    return true;
  }
  return true;
}

/**
 * @returns {true}
 */
function quux () {
  for (const a in b) {
    return true;
  }
}

/**
 * @returns {true}
 */
function quux () {
  for (const a of b) {
    return true;
  }
}

/**
 * @returns {true}
 */
function quux () {
  loop: for (const a of b) {
    return true;
  }
}

/**
 * @returns {true}
 */
function quux () {
  for (let i=0; i<n; i+=1) {
    return true;
  }
}

/**
 * @returns {true}
 */
function quux () {
  while(true) {
    return true
  }
}

/**
 * @returns {true}
 */
function quux () {
  do {
    return true
  }
  while(true)
}

/**
 * @returns {true}
 */
function quux () {
  if (true) {
    return true;
  }
  return true;
}

/**
 * @returns {true}
 */
function quux () {
  var a = {};
  with (a) {
    return true;
  }
}

/**
 * @returns {true}
 */
function quux () {
  if (true) {
    return true;
  } else {
    return true;
  }
  return true;
}

/**
 * @returns {Promise<number>}
 */
async function quux() {
  return 5;
}

/**
 * @returns {Promise<number>}
 */
async function quux() {
  return 5;
}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptAsync":false}]

/**
 * @returns {Promise<void>}
 */
function quux() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    });
  })
}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptAsync":false}]

/**
 * Description.
 * @returns {void}
 */
async function foo() {
  return new Promise(resolve => resolve());
}
// "jsdoc/require-returns-check": ["error"|"warn", {"reportMissingReturnForUndefinedTypes":true}]

/**
 * @returns { void } Foo.
 */
function quux () {
  return undefined;
}
// "jsdoc/require-returns-check": ["error"|"warn", {"reportMissingReturnForUndefinedTypes":true}]

/**
 * @returns { string } Foo.
 */
function quux () {
  return 'abc';
}
// "jsdoc/require-returns-check": ["error"|"warn", {"reportMissingReturnForUndefinedTypes":true}]

/**
 * @returns {IterableIterator<any>}
 */
function * quux() {}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @returns {IterableIterator<any>}
 */
function * quux() {}
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// "jsdoc/require-returns-check": ["error"|"warn", {"exemptGenerators":true}]

/**
 * @param {unknown} val
 * @returns { asserts val is number }
 */
function assertNumber(val) {
  assert(typeof val === 'number');
}

/**
 * Reads a test fixture.
 *
 * @param path The path to resolve relative to the fixture base. It will be normalized for the
 * operating system.
 *
 * @returns The file contents as buffer.
 */
export function readFixture(path: string): Promise<Buffer>;

/**
 * Reads a test fixture.
 *
 * @param path The path to resolve relative to the fixture base. It will be normalized for the
 * operating system.
 *
 * @returns The file contents as buffer.
 */
export function readFixture(path: string): Promise<Buffer> {
  return new Promise(() => {});
}

/**
 * Reads a test fixture.
 *
 * @param path The path to resolve relative to the fixture base. It will be normalized for the
 * operating system.
 *
 * @returns {void} The file contents as buffer.
 */
export function readFixture(path: string);

/**
 * @returns {SomeType}
 */
function quux (path) {
  if (true) {
    return 5;
  }
  return 15;
};

/**
 * @returns {*} Foo.
 */
const quux = () => new Promise((resolve) => {
  resolve(3);
});

/**
 * @returns {*} Foo.
 */
const quux = function () {
  return new Promise((resolve) => {
    resolve(3);
  });
};

/**
 * @returns {true}
 */
function quux () {
  if (true) {
    return true;
  }

  throw new Error('Fail');
}

/**
 * @returns Baz.
 */
function foo() {
    switch (true) {
        default:
            switch (false) {
                default: break;
            }
            return "baz";
    }
};

/**
 * Return a V1 style query identifier.
 *
 * @param {string} id - The query identifier.
 * @returns {string} V1 style query identifier.
 */
function v1QueryId(id) {
    switch (id) {
        case 'addq':
        case 'aliq':
        case 'locq':
            return id.substring(3);
        case 'lost':
            return id.substring(4);
        default:
            return id;
    }
}

/**
 * Parses the required header fields for the given SIP message.
 *
 * @param {string} logPrefix - The log prefix.
 * @param {string} sipMessage - The SIP message.
 * @param {string[]} headers - The header fields to be parsed.
 * @returns {object} Object with parsed header fields.
 */
function parseSipHeaders(logPrefix, sipMessage, headers) {
    try {
        return esappSip.parseHeaders(sipMessage, headers);
    } catch (err) {
        logger.error(logPrefix, 'Failed to parse');
        return {};
    }
}

/**
 * @returns {true}
 */
function quux () {
  try {
  } catch (error) {
  } finally {
    return true;
  }
}

/** Returns true.
 *
 * @returns {boolean} true
 */
function getTrue() {
  try {
    return true;
  } finally {
    console.log('returning...');
  }
}

/**
 * Maybe return a boolean.
 * @returns {boolean|void} true, or undefined.
 */
function maybeTrue() {
  if (Math.random() > 0.5) {
    return true;
  }
}

/**
 * @param {AST} astNode
 * @returns {AST}
 */
const getTSFunctionComment = function (astNode) {
  switch (greatGrandparent.type) {
  case 'VariableDeclarator':
    if (greatGreatGrandparent.type === 'VariableDeclaration') {
      return greatGreatGrandparent;
    }

  default:
    return astNode;
  }
};

const f =
  /**
   * Description.
   *
   * @returns Result.
   */
  () => {
    return function () {};
  };

/**
 * Description.
 *
 * @returns Result.
 */
export function f(): string {
  return "";

  interface I {}
}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-description"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-description"></a>
### <code>require-returns-description</code>

Requires that the `@returns` tag has a `description` value. The error
will not be reported if the return value is `void` or `undefined`
or if it is `Promise<void>` or `Promise<undefined>`.

<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-description-options-34"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-description-options-34"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-description-options-34-contexts-12"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-description-options-34-contexts-12"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
Overrides the default contexts (see below). Set to `"any"` if you want
the rule to apply to any jsdoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., `@callback` or `@function` (or its aliases `@func` or
`@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`returns`|
|Aliases|`return`|
|Recommended|true|
|Options|`contexts`|

The following patterns are considered problems:

````js
/**
 * @returns
 */
function quux (foo) {

}
// Message: Missing JSDoc @returns description.

/**
 * @returns {string}
 */
function quux (foo) {

}
// Message: Missing JSDoc @returns description.

/**
 * @returns {string}
 */
function quux (foo) {

}
// "jsdoc/require-returns-description": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @returns description.

/**
 * @function
 * @returns {string}
 */
// "jsdoc/require-returns-description": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @returns description.

/**
 * @callback
 * @returns {string}
 */
// "jsdoc/require-returns-description": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @returns description.

/**
 * @return
 */
function quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":"return"}}}
// Message: Missing JSDoc @return description.

/**
 * @returns
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":false}}}
// Message: Unexpected tag `@returns`
````

The following patterns are not considered problems:

````js
/**
 *
 */
function quux () {

}

/**
 * @returns Foo.
 */
function quux () {

}

/**
 * @returns Foo.
 */
function quux () {

}
// "jsdoc/require-returns-description": ["error"|"warn", {"contexts":["any"]}]

/**
 * @returns {undefined}
 */
function quux () {

}

/**
 * @returns {void}
 */
function quux () {

}

/**
 * @returns {Promise<void>}
 */
function quux () {

}

/**
 * @returns {Promise<undefined>}
 */
function quux () {

}

/**
 * @function
 * @returns
 */

/**
 * @callback
 * @returns
 */
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-type"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-type"></a>
### <code>require-returns-type</code>

Requires that `@returns` tag has `type` value.

<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-type-options-35"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-type-options-35"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-type-options-35-contexts-13"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-type-options-35-contexts-13"></a>
##### <code>contexts</code>

Set this to an array of strings representing the AST context (or an object with
`context` and `comment` properties) where you wish the rule to be applied.
Overrides the default contexts (see below). Set to `"any"` if you want
the rule to apply to any jsdoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., `@callback` or `@function` (or its aliases `@func` or
`@method`) (including those associated with an `@interface`).

See the ["AST and Selectors"](#user-content-eslint-plugin-jsdoc-advanced-ast-and-selectors)
section of our README for more on the expected format.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled|
|Tags|`returns`|
|Aliases|`return`|
|Recommended|true|
|Options|`contexts`|

The following patterns are considered problems:

````js
/**
 * @returns
 */
function quux () {

}
// Message: Missing JSDoc @returns type.

/**
 * @returns Foo.
 */
function quux () {

}
// Message: Missing JSDoc @returns type.

/**
 * @returns Foo.
 */
function quux () {

}
// "jsdoc/require-returns-type": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @returns type.

/**
 * @function
 * @returns Foo.
 */
// "jsdoc/require-returns-type": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @returns type.

/**
 * @callback
 * @returns Foo.
 */
// "jsdoc/require-returns-type": ["error"|"warn", {"contexts":["any"]}]
// Message: Missing JSDoc @returns type.

/**
 * @return Foo.
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":"return"}}}
// Message: Missing JSDoc @return type.

/**
 * @returns
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":false}}}
// Message: Unexpected tag `@returns`
````

The following patterns are not considered problems:

````js
/**
 * @returns {number}
 */
function quux () {

}

/**
 * @returns {number}
 */
function quux () {

}
// "jsdoc/require-returns-type": ["error"|"warn", {"contexts":["any"]}]

/**
 * @function
 * @returns Foo.
 */

/**
 * @callback
 * @returns Foo.
 */
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-returns"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns"></a>
### <code>require-returns</code>

Requires that returns are documented.

Will also report if multiple `@returns` tags are present.

<a name="user-content-eslint-plugin-jsdoc-rules-require-returns-options-36"></a>
<a name="eslint-plugin-jsdoc-rules-require-returns-options-36"></a>
#### Options

- `checkConstructors` - A value indicating whether `constructor`s should
    be checked for `@returns` tags. Defaults to `false`.
- `checkGetters` - Boolean to determine whether getter methods should
    be checked for `@returns` tags. Defaults to `true`.
- `exemptedBy` - Array of tags (e.g., `['type']`) whose presence on the
    document block avoids the need for a `@returns`. Defaults to an array
    with `inheritdoc`. If you set this array, it will overwrite the default,
    so be sure to add back `inheritdoc` if you wish its presence to cause
    exemption of the rule.
- `forceRequireReturn` - Set to `true` to always insist on
    `@returns` documentation regardless of implicit or explicit `return`'s
    in the function. May be desired to flag that a project is aware of an
    `undefined`/`void` return. Defaults to `false`.
- `forceReturnsWithAsync` - By default `async` functions that do not explicitly
    return a value pass this rule as an `async` function will always return a
    `Promise`, even if the `Promise` resolves to void. You can force all
    `async` functions (including ones with an explicit `Promise` but no
    detected non-`undefined` `resolve` value) to require `@return`
    documentation by setting `forceReturnsWithAsync` to `true` on the options
    object. This may be useful for flagging that there has been consideration
    of return type. Defaults to `false`.
- `contexts` - Set this to an array of strings representing the AST context
    (or an object with `context` and `comment` properties) where you wish
    the rule to be applied.
    Overrides the default contexts (see below). Set to `"any"` if you want
    the rule to apply to any jsdoc block throughout your files (as is necessary
    for finding function blocks not attached to a function declaration or
    expression, i.e., `@callback` or `@function` (or its aliases `@func` or
    `@method`) (including those associated with an `@interface`). This
    rule will only apply on non-default contexts when there is such a tag
    present and the `forceRequireReturn` option is set or if the
    `forceReturnsWithAsync` option is set with a present `@async` tag
    (since we are not checking against the actual `return` values in these
    cases).

|          |         |
| -------- | ------- |
| Context  | `ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled |
| Tags     | `returns` |
| Aliases  | `return` |
|Recommended|true|
| Options  | `checkConstructors`, `checkGetters`, `contexts`, `exemptedBy`, `forceRequireReturn`, `forceReturnsWithAsync` |
| Settings | `ignoreReplacesDocs`, `overrideReplacesDocs`, `augmentsExtendsReplacesDocs`, `implementsReplacesDocs` |

The following patterns are considered problems:

````js
/**
 *
 */
function quux (foo) {

  return foo;
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
const foo = () => ({
  bar: 'baz'
})
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
const foo = bar=>({ bar })
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
const foo = bar => bar.baz()
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux (foo) {

  return foo;
}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":"return"}}}
// Message: Missing JSDoc @return declaration.

/**
 *
 */
async function quux() {
}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
const quux = async function () {}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
const quux = async () => {}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
async function quux () {}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
}
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"],"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 * @function
 */
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"],"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 * @callback
 */
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"],"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

const language = {
  /**
   * @param {string} name
   */
  get name() {
    return this._name;
  }
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
async function quux () {
}
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]
// Message: Missing JSDoc @returns declaration.

/**
 * @function
 * @async
 */
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"],"forceReturnsWithAsync":true}]
// Message: Missing JSDoc @returns declaration.

/**
 * @callback
 * @async
 */
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"],"forceReturnsWithAsync":true}]
// Message: Missing JSDoc @returns declaration.

/**
 * @returns {undefined}
 * @returns {void}
 */
function quux (foo) {

  return foo;
}
// Message: Found more than one @returns declaration.

/**
 * @returns
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"returns":false}}}
// Message: Unexpected tag `@returns`

/**
 * @param foo
 */
function quux (foo) {
  return 'bar';
}
// "jsdoc/require-returns": ["error"|"warn", {"exemptedBy":["notPresent"]}]
// Message: Missing JSDoc @returns declaration.

/**
 * @param {array} a
 */
async function foo(a) {
  return;
}
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]
// Message: Missing JSDoc @returns declaration.

/**
 * @param {array} a
 */
async function foo(a) {
  return Promise.all(a);
}
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]
// Message: Missing JSDoc @returns declaration.

class foo {
  /** gets bar */
  get bar() {
    return 0;
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"checkGetters":true}]
// Message: Missing JSDoc @returns declaration.

class TestClass {
  /**
   *
   */
  constructor() {
    return new Map();
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"checkConstructors":true}]
// Message: Missing JSDoc @returns declaration.

class TestClass {
  /**
   *
   */
  get Test() {
    return 0;
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"checkGetters":true}]
// Message: Missing JSDoc @returns declaration.

class quux {
  /**
   *
   */
  quux () {
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"],"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux (foo) {

  return new Promise(function (resolve, reject) {
    resolve(foo);
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux (foo) {

  return new Promise(function (resolve, reject) {
    setTimeout(() => {
      resolve(true);
    });
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux (foo) {

  return new Promise(function (resolve, reject) {
    foo(resolve);
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    while(true) {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    do {
      resolve(true);
    }
    while(true)
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    if (true) {
      resolve(true);
    }
    return;
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    if (true) {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  var a = {};
  return new Promise((resolve, reject) => {
    with (a) {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  var a = {};
  return new Promise((resolve, reject) => {
    try {
      resolve(true);
    } catch (err) {}
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  var a = {};
  return new Promise((resolve, reject) => {
    try {
    } catch (err) {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  var a = {};
  return new Promise((resolve, reject) => {
    try {
    } catch (err) {
    } finally {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  var a = {};
  return new Promise((resolve, reject) => {
    switch (a) {
    case 'abc':
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    if (true) {
      resolve();
    } else {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    for (let i = 0; i < 5 ; i++) {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    for (const i of obj) {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    for (const i in obj) {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    if (true) {
      return;
    } else {
      resolve(true);
    }
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    function a () {
      resolve(true);
    }
    a();
  });
}
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
function quux () {
  return new Promise();
}
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
async function quux () {
  return new Promise();
}
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]
// Message: Missing JSDoc @returns declaration.

/**
 *
 */
async function quux () {
  return new Promise((resolve, reject) => {});
}
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]
// Message: Missing JSDoc @returns declaration.

export class A {
  /**
   * Description.
   */
  public f(): string {
    return "";
  }
}

export interface B {
  /**
   * Description.
   */
  f(): string;

  /**
   * Description.
   */
  g: () => string;

  /**
   * Description.
   */
  h(): void;

  /**
   * Description.
   */
  i: () => void;
}

/**
 * Description.
 */
export function f(): string {
  return "";
}
// "jsdoc/require-returns": ["error"|"warn", {"contexts":[":not(BlockStatement) > FunctionDeclaration","MethodDefinition","TSMethodSignature","TSPropertySignature > TSTypeAnnotation > TSFunctionType"]}]
// Message: Missing JSDoc @returns declaration.

/**
 * @param ms time in millis
 */
export const sleep = (ms: number) =>
  new Promise<string>((res) => setTimeout(res, ms));
// Message: Missing JSDoc @returns declaration.

/**
 * @param ms time in millis
 */
export const sleep = (ms: number) => {
  return new Promise<string>((res) => setTimeout(res, ms));
};
// Message: Missing JSDoc @returns declaration.

/**
 * Reads a test fixture.
 */
export function readFixture(path: string): Promise<Buffer>;
// Message: Missing JSDoc @returns declaration.

/**
 * Reads a test fixture.
 */
export function readFixture(path: string): void;
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.

/**
 * Reads a test fixture.
 */
export function readFixture(path: string);
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]
// Message: Missing JSDoc @returns declaration.
````

The following patterns are not considered problems:

````js
/**
 * @returns Foo.
 */
function quux () {

  return foo;
}

/**
 * @returns Foo.
 */
function quux () {

  return foo;
}
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"]}]

/**
 *
 */
function quux () {
}

/**
 *
 */
function quux (bar) {
  bar.filter(baz => {
    return baz.corge();
  })
}

/**
 * @returns Array
 */
function quux (bar) {
  return bar.filter(baz => {
    return baz.corge();
  })
}

/**
 * @returns Array
 */
const quux = (bar) => bar.filter(({ corge }) => corge())

/**
 * @inheritdoc
 */
function quux (foo) {
}

/**
 * @override
 */
function quux (foo) {
}

/**
 * @constructor
 */
function quux (foo) {
  return true;
}

/**
 * @implements
 */
function quux (foo) {
  return true;
}

/**
 * @override
 */
function quux (foo) {

  return foo;
}

/**
 * @class
 */
function quux (foo) {
  return true;
}

/**
 * @constructor
 */
function quux (foo) {

}

/**
 * @returns {object}
 */
function quux () {

  return {a: foo};
}

/**
 * @returns {object}
 */
const quux = () => ({a: foo});

/**
 * @returns {object}
 */
const quux = () => {
  return {a: foo}
};

/**
 * @returns {void}
 */
function quux () {
}

/**
 * @returns {void}
 */
const quux = () => {

}

/**
 * @returns {undefined}
 */
function quux () {
}

/**
 * @returns {undefined}
 */
const quux = () => {

}

/**
 *
 */
function quux () {
}

/**
 *
 */
const quux = () => {

}

class Foo {
  /**
   *
   */
  constructor () {
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]

const language = {
  /**
   * @param {string} name
   */
  set name(name) {
    this._name = name;
  }
}

/**
 * @returns {void}
 */
function quux () {
}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]

/**
 * @returns {void}
 */
function quux () {
  return undefined;
}

/**
 * @returns {void}
 */
function quux () {
  return undefined;
}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]

/**
 * @returns {void}
 */
function quux () {
  return;
}

/**
 * @returns {void}
 */
function quux () {
}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]

/**
 * @returns {void}
 */
function quux () {
  return;
}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]

/** @type {RequestHandler} */
function quux (req, res , next) {
  return;
}

/**
 * @returns {Promise}
 */
async function quux () {
}
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]

/**
 * @returns {Promise}
 */
async function quux () {
}
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]

/**
 *
 */
async function quux () {}

/**
 *
 */
const quux = async function () {}

/**
 *
 */
const quux = async () => {}

/** foo class */
class foo {
  /** foo constructor */
  constructor () {
    // =>
    this.bar = true;
  }
}

export default foo;

/**
 *
 */
function quux () {
}
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]

/**
 * @type {MyCallback}
 */
function quux () {

}
// "jsdoc/require-returns": ["error"|"warn", {"exemptedBy":["type"]}]

/**
 * @param {array} a
 */
async function foo(a) {
  return;
}

/**
 *
 */
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"]}]

/**
 * @async
 */
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"]}]

/**
 * @function
 */
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]

/**
 * @callback
 */
// "jsdoc/require-returns": ["error"|"warn", {"forceRequireReturn":true}]

/**
 * @function
 * @async
 */
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]

/**
 * @callback
 * @async
 */
// "jsdoc/require-returns": ["error"|"warn", {"forceReturnsWithAsync":true}]

/**
 * @function
 */
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"],"forceReturnsWithAsync":true}]

/**
 * @callback
 */
// "jsdoc/require-returns": ["error"|"warn", {"contexts":["any"],"forceReturnsWithAsync":true}]

class foo {
  get bar() {
    return 0;
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"checkGetters":false}]

class foo {
  /** @returns zero */
  get bar() {
    return 0;
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"checkGetters":true}]

class foo {
  /** @returns zero */
  get bar() {
    return 0;
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"checkGetters":false}]

class TestClass {
  /**
   *
   */
  constructor() { }
}

class TestClass {
  /**
   * @returns A map.
   */
  constructor() {
    return new Map();
  }
}

class TestClass {
  /**
   *
   */
  constructor() { }
}
// "jsdoc/require-returns": ["error"|"warn", {"checkConstructors":false}]

class TestClass {
  /**
   *
   */
  get Test() { }
}

class TestClass {
  /**
   * @returns A number.
   */
  get Test() {
    return 0;
  }
}

class TestClass {
  /**
   *
   */
  get Test() {
    return 0;
  }
}
// "jsdoc/require-returns": ["error"|"warn", {"checkGetters":false}]

/**
 *
 */
function quux (foo) {

  return new Promise(function (resolve, reject) {
    resolve();
  });
}

/**
 *
 */
function quux (foo) {

  return new Promise(function (resolve, reject) {
    setTimeout(() => {
      resolve();
    });
  });
}

/**
 *
 */
function quux (foo) {

  return new Promise(function (resolve, reject) {
    foo();
  });
}

/**
 *
 */
function quux (foo) {

  return new Promise(function (resolve, reject) {
    abc((resolve) => {
      resolve(true);
    });
  });
}

/**
 *
 */
function quux (foo) {

  return new Promise(function (resolve, reject) {
    abc(function (resolve) {
      resolve(true);
    });
  });
}

/**
 *
 */
function quux () {
  return new Promise((resolve, reject) => {
    if (true) {
      resolve();
    }
  });
  return;
}

/**
 *
 */
function quux () {
  return new Promise();
}

/**
 * Description.
 */
async function foo() {
  return new Promise(resolve => resolve());
}

/**
 * @param {array} a
 */
async function foo(a) {
  return Promise.all(a);
}

/**
 * @param ms time in millis
 */
export const sleep = (ms: number) =>
  new Promise<void>((res) => setTimeout(res, ms));

/**
 * @param ms time in millis
 */
export const sleep = (ms: number) => {
  return new Promise<void>((res) => setTimeout(res, ms));
};

/**
 * Reads a test fixture.
 *
 * @returns The file contents as buffer.
 */
export function readFixture(path: string): Promise<Buffer>;

/**
 * Reads a test fixture.
 *
 * @returns {void}.
 */
export function readFixture(path: string): void;

/**
 * Reads a test fixture.
 */
export function readFixture(path: string): void;

/**
 * Reads a test fixture.
 */
export function readFixture(path: string);
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-throws"></a>
<a name="eslint-plugin-jsdoc-rules-require-throws"></a>
### <code>require-throws</code>

Requires that throw statements are documented.

Note that since throw statements within async functions end up as rejected
Promises, they are not considered as throw statements for the purposes of this
rule. See [issue 755](https://github.com/gajus/eslint-plugin-jsdoc/issues/755)
for our desire for a separate tag to document rejection types and see
[this discussion](https://stackoverflow.com/questions/50071115/typescript-promise-rejection-type)
on why TypeScript doesn't offer such a feature.

<a name="user-content-eslint-plugin-jsdoc-rules-require-throws-options-37"></a>
<a name="eslint-plugin-jsdoc-rules-require-throws-options-37"></a>
#### Options

- `exemptedBy` - Array of tags (e.g., `['type']`) whose presence on the
    document block avoids the need for a `@throws`. Defaults to an array
    with `inheritdoc`. If you set this array, it will overwrite the default,
    so be sure to add back `inheritdoc` if you wish its presence to cause
    exemption of the rule.
- `contexts` - Set this to an array of strings representing the AST context
    (or an object with `context` and `comment` properties) where you wish
    the rule to be applied.
    Overrides the default contexts (see below). Set to `"any"` if you want
    the rule to apply to any jsdoc block throughout your files (as is necessary
    for finding function blocks not attached to a function declaration or
    expression, i.e., `@callback` or `@function` (or its aliases `@func` or
    `@method`) (including those associated with an `@interface`).

```js
'jsdoc/require-throws': 'error',
```

| | |
| -------- | --- |
| Context  | `ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled |
| Tags     | `throws` |
| Aliases  | `exception` |
|Recommended|true|
| Options  | `contexts`, `exemptedBy` |
| Settings | `ignoreReplacesDocs`, `overrideReplacesDocs`, `augmentsExtendsReplacesDocs`, `implementsReplacesDocs` |

The following patterns are considered problems:

````js
/**
 *
 */
function quux (foo) {
  throw new Error('err')
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
const quux = function (foo) {
  throw new Error('err')
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
const quux = (foo) => {
  throw new Error('err')
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  while(true) {
    throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  do {
    throw new Error('err')
  } while(true)
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  for(var i = 0; i <= 10; i++) {
    throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  for(num in [1,2,3]) {
    throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  for(const num of [1,2,3]) {
    throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  for(const index in [1,2,3]) {
    throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  with(foo) {
    throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  if (true) {
    throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  if (false) {
    // do nothing
  } else {
    throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  try {
    throw new Error('err')
  } catch(e) {
    throw new Error(e.message)
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  try {
    // do nothing
  } finally {
    throw new Error(e.message)
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 *
 */
function quux (foo) {
  const a = 'b'
  switch(a) {
    case 'b':
      throw new Error('err')
  }
}
// Message: Missing JSDoc @throws declaration.

/**
 * @throws
 */
function quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"throws":false}}}
// Message: Unexpected tag `@throws`

/**
 *
 */
const directThrowAfterArrow = (b) => {
  const a = () => {};
  if (b) {
    throw new Error('oops')
  }
  return a;
};
// Message: Missing JSDoc @throws declaration.

/**
 * @throws {never}
 */
function quux (foo) {
  throw new Error('err')
}
// Message: JSDoc @throws declaration set to "never" but throw value found.
````

The following patterns are not considered problems:

````js
/**
 * @throws An error.
 */
function quux () {
  throw new Error('err')
}

/**
 *
 */
function quux (foo) {
  try {
    throw new Error('err')
  } catch(e) {}
}

/**
 * @throws {object}
 */
function quux (foo) {
  throw new Error('err')
}

/**
 * @inheritdoc
 */
function quux (foo) {
  throw new Error('err')
}

/**
 * @abstract
 */
function quux (foo) {
  throw new Error('err')
}

/**
 *
 */
function quux (foo) {
}

/**
 * @type {MyCallback}
 */
function quux () {
  throw new Error('err')
}
// "jsdoc/require-throws": ["error"|"warn", {"exemptedBy":["type"]}]

/**
 *
 */
const itself = (n) => n;

/**
 * Not tracking on nested function
 */
const nested = () => () => {throw new Error('oops');};

/**
 */
async function foo() {
  throw Error("bar");
}

/**
 * @throws {never}
 */
function quux (foo) {
}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-yields"></a>
<a name="eslint-plugin-jsdoc-rules-require-yields"></a>
### <code>require-yields</code>

Requires that yields are documented.

Will also report if multiple `@yields` tags are present.

See the `next`, `forceRequireNext`, and `nextWithGeneratorTag` options for an
option to expect a non-standard `@next` tag.

<a name="user-content-eslint-plugin-jsdoc-rules-require-yields-options-38"></a>
<a name="eslint-plugin-jsdoc-rules-require-yields-options-38"></a>
#### Options

- `exemptedBy` - Array of tags (e.g., `['type']`) whose presence on the
    document block avoids the need for a `@yields`. Defaults to an array
    with `inheritdoc`. If you set this array, it will overwrite the default,
    so be sure to add back `inheritdoc` if you wish its presence to cause
    exemption of the rule.
- `forceRequireYields` - Set to `true` to always insist on
    `@yields` documentation for generators even if there are only
    expressionless `yield` statements in the function. May be desired to flag
    that a project is aware of an `undefined`/`void` yield. Defaults to
    `false`.
- `contexts` - Set this to an array of strings representing the AST context
    (or an object with `context` and `comment` properties) where you wish
    the rule to be applied.
    Overrides the default contexts (see below). Set to `"any"` if you want
    the rule to apply to any jsdoc block throughout your files (as is necessary
    for finding function blocks not attached to a function declaration or
    expression, i.e., `@callback` or `@function` (or its aliases `@func` or
    `@method`) (including those associated with an `@interface`). This
    rule will only apply on non-default contexts when there is such a tag
    present and the `forceRequireYields` option is set or if the
    `withGeneratorTag` option is set with a present `@generator` tag
    (since we are not checking against the actual `yield` values in these
    cases).
- `withGeneratorTag` - If a `@generator` tag is present on a block, require
    `@yields`/`@yield`. Defaults to `true`. See `contexts` to `any` if you want
    to catch `@generator` with `@callback` or such not attached to a function.
- `next` - If `true`, this option will insist that any use of a `yield` return
    value (e.g., `const rv = yield;` or `const rv = yield value;`) has a
    (non-standard) `@next` tag (in addition to any `@yields` tag) so as to be
    able to document the type expected to be supplied into the iterator
    (the `Generator` iterator that is returned by the call to the generator
    function) to the iterator (e.g., `it.next(value)`). The tag will not be
    expected if the generator function body merely has plain `yield;` or
    `yield value;` statements without returning the values. Defaults to
    `false`.
- `forceRequireNext` - Set to `true` to always insist on
    `@next` documentation even if there are no `yield` statements in the
    function or none return values. May be desired to flag that a project is
    aware of the expected yield return being `undefined`. Defaults to `false`.
- `nextWithGeneratorTag` - If a `@generator` tag is present on a block, require
    (non-standard ) `@next` (see `next` option). This will require using `void`
    or `undefined` in cases where generators do not use the `next()`-supplied
    incoming `yield`-returned value. Defaults to `false`. See `contexts` to
    `any` if you want to catch `@generator` with `@callback` or such not
    attached to a function.

|||
|---|---|
|Context|Generator functions (`FunctionDeclaration`, `FunctionExpression`; others when `contexts` option enabled)|
|Tags|`yields`|
|Aliases|`yield`|
|Recommended|true|
| Options  | `contexts`,  `exemptedBy`, `withGeneratorTag`, `nextWithGeneratorTag`, `forceRequireYields`, `next` |
| Settings | `ignoreReplacesDocs`, `overrideReplacesDocs`, `augmentsExtendsReplacesDocs`, `implementsReplacesDocs` |

The following patterns are considered problems:

````js
/**
 *
 */
function * quux (foo) {

  yield foo;
}
// Message: Missing JSDoc @yields declaration.

/**
 * @yields
 */
function * quux (foo) {

  const retVal = yield foo;
}
// "jsdoc/require-yields": ["error"|"warn", {"next":true}]
// Message: Missing JSDoc @next declaration.

/**
 * @yields
 */
function * quux (foo) {

  const retVal = yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"next":true}]
// Message: Missing JSDoc @next declaration.

/**
 * @yields {void}
 */
function * quux () {
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireNext":true}]
// Message: Missing JSDoc @next declaration.

/**
 * @yields {void}
 */
function * quux () {
  yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireNext":true}]
// Message: Missing JSDoc @next declaration.

/**
 *
 */
function * quux (foo) {

  const a = yield foo;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux (foo) {
  yield foo;
}
// Settings: {"jsdoc":{"tagNamePreference":{"yields":"yield"}}}
// Message: Missing JSDoc @yield declaration.

/**
 * @yields
 */
function * quux (foo) {
  const val = yield foo;
}
// Settings: {"jsdoc":{"tagNamePreference":{"next":"yield-returns"}}}
// "jsdoc/require-yields": ["error"|"warn", {"next":true}]
// Message: Missing JSDoc @yield-returns declaration.

/**
 * @yields
 * @next
 */
function * quux () {
  const ret = yield 5;
}
// Settings: {"jsdoc":{"tagNamePreference":{"next":false}}}
// "jsdoc/require-yields": ["error"|"warn", {"next":true}]
// Message: Unexpected tag `@next`

/**
 *
 */
function * quux() {
  yield 5;
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux() {
  yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
const quux = async function * () {
  yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
async function * quux () {
  yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 * @function
 * @generator
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 * @callback
 * @generator
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 * @yields {undefined}
 * @yields {void}
 */
function * quux (foo) {

  return foo;
}
// Message: Found more than one @yields declaration.

/**
 * @yields
 */
function * quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"yields":false}}}
// Message: Unexpected tag `@yields`

/**
 * @param foo
 */
function * quux (foo) {
  yield 'bar';
}
// "jsdoc/require-yields": ["error"|"warn", {"exemptedBy":["notPresent"]}]
// Message: Missing JSDoc @yields declaration.

/**
 * @param {array} a
 */
async function * foo(a) {
  return;
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 * @param {array} a
 */
async function * foo(a) {
  yield Promise.all(a);
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

class quux {
  /**
   *
   */
  * quux () {
    yield;
  }
}
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"forceRequireYields":true}]
// Message: Missing JSDoc @yields declaration.

/**
 * @param {array} a
 */
async function * foo(a) {
  yield Promise.all(a);
}
// Message: Missing JSDoc @yields declaration.

/**
 * @generator
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"withGeneratorTag":true}]
// Message: Missing JSDoc @yields declaration.

/**
 * @generator
 * @yields
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"nextWithGeneratorTag":true}]
// Message: Missing JSDoc @next declaration.

/**
 *
 */
function * quux () {
  if (true) {
    yield;
  }
  yield true;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  try {
    yield true;
  } catch (err) {
  }
  yield;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  try {
  } finally {
    yield true;
  }
  yield;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  try {
    yield;
  } catch (err) {
  }
  yield true;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  try {
    something();
  } catch (err) {
    yield true;
  }
  yield;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  switch (true) {
  case 'abc':
    yield true;
  }
  yield;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  switch (true) {
  case 'abc':
    yield;
  }
  yield true;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  for (const i of abc) {
    yield true;
  }
  yield;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  for (const a in b) {
    yield true;
  }
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  for (let i=0; i<n; i+=1) {
    yield true;
  }
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  while(true) {
    yield true
  }
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  do {
    yield true
  }
  while(true)
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  if (true) {
    yield;
  }
  yield true;
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  if (true) {
    yield true;
  }
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  var a = {};
  with (a) {
    yield true;
  }
}
// Message: Missing JSDoc @yields declaration.

/**
 *
 */
function * quux () {
  if (true) {
    yield;
  } else {
    yield true;
  }
  yield;
}
// Message: Missing JSDoc @yields declaration.
````

The following patterns are not considered problems:

````js
/**
 * @yields Foo.
 */
function * quux () {

  yield foo;
}

/**
 * @yields Foo.
 */
function * quux () {

  yield foo;
}
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"]}]

/**
 *
 */
function * quux () {
}

/**
 *
 */
function * quux () {
  yield;
}

/**
 *
 */
function quux (bar) {
  bar.doSomething(function * (baz) {
    yield baz.corge();
  })
}

/**
 * @yields {Array}
 */
function * quux (bar) {
  yield bar.doSomething(function * (baz) {
    yield baz.corge();
  })
}

/**
 * @inheritdoc
 */
function * quux (foo) {
}

/**
 * @override
 */
function * quux (foo) {
}

/**
 * @constructor
 */
function * quux (foo) {
}

/**
 * @implements
 */
function * quux (foo) {
  yield;
}

/**
 * @override
 */
function * quux (foo) {

  yield foo;
}

/**
 * @class
 */
function * quux (foo) {
  yield foo;
}

/**
 * @constructor
 */
function * quux (foo) {
}

/**
 * @yields {object}
 */
function * quux () {

  yield {a: foo};
}

/**
 * @yields {void}
 */
function * quux () {
}

/**
 * @yields {undefined}
 */
function * quux () {
}

/**
 *
 */
function * quux () {
}

/**
 * @yields {void}
 */
function quux () {
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]

/**
 * @yields {void}
 * @next {void}
 */
function * quux () {
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireNext":true}]

/**
 * @yields {void}
 */
function * quux () {
  yield undefined;
}

/**
 * @yields {void}
 */
function * quux () {
  yield undefined;
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]

/**
 * @yields {void}
 */
function * quux () {
  yield;
}

/**
 * @yields {void}
 */
function * quux () {
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]

/**
 * @yields {void}
 */
function * quux () {
  yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]

/** @type {SpecialIterator} */
function * quux () {
  yield 5;
}

/**
 * @yields {Something}
 */
async function * quux () {
}
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]

/**
 *
 */
async function * quux () {}

/**
 *
 */
const quux = async function * () {}

/**
 * @type {MyCallback}
 */
function * quux () {
  yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"exemptedBy":["type"]}]

/**
 * @param {array} a
 */
async function * foo (a) {
  yield;
}

/**
 *
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"]}]

/**
 * @function
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"]}]

/**
 * @function
 */
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]

/**
 * @callback
 */
// "jsdoc/require-yields": ["error"|"warn", {"forceRequireYields":true}]

/**
 * @generator
 */
// "jsdoc/require-yields": ["error"|"warn", {"withGeneratorTag":true}]

/**
 * @generator
 */
// "jsdoc/require-yields": ["error"|"warn", {"nextWithGeneratorTag":true}]

/**
 * @generator
 * @yields
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"withGeneratorTag":true}]

/**
 * @generator
 * @yields
 * @next
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"nextWithGeneratorTag":true}]

/**
 * @generator
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"withGeneratorTag":false}]

/**
 * @generator
 * @yields
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"nextWithGeneratorTag":false}]

/**
 * @yields
 */
function * quux (foo) {

  const a = yield foo;
}

/**
 * @yields
 * @next
 */
function * quux (foo) {
  let a = yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"next":true}]

/**
 * @yields
 * @next
 */
function * quux (foo) {
  const a = yield foo;
}
// "jsdoc/require-yields": ["error"|"warn", {"next":true}]

/**
 *
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"nextWithGeneratorTag":true}]

/**
 *
 */
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"next":true}]

/**
 *
 */
function quux () {}
// "jsdoc/require-yields": ["error"|"warn", {"contexts":["any"],"next":true}]

/**
 * @yields {void}
 */
function * quux () {
  yield;
}
// "jsdoc/require-yields": ["error"|"warn", {"next":true}]

/**
 *
 */
function * quux (foo) {
  const a = function * bar () {
    yield foo;
  }
}
````


<a name="user-content-eslint-plugin-jsdoc-rules-require-yields-check"></a>
<a name="eslint-plugin-jsdoc-rules-require-yields-check"></a>
### <code>require-yields-check</code>

Ensures that if a `@yields` is present that a `yield` (or `yield` with a
value) is present in the function body (or that if a `@next` is present that
there is a `yield` with a return value present).

Please also note that JavaScript does allow generators not to have `yield`
(e.g., with just a return or even no explicit return), but if you want to
enforce that all generators (except wholly empty ones) have a `yield` in the
function body, you can use the ESLint
[`require-yield`](https://eslint.org/docs/rules/require-yield) rule. In
conjunction with this, you can also use the `checkGeneratorsOnly` option
as an optimization so that this rule won't need to do its own checking within
function bodies.

Will also report if multiple `@yields` tags are present.

<a name="user-content-eslint-plugin-jsdoc-rules-require-yields-check-options-39"></a>
<a name="eslint-plugin-jsdoc-rules-require-yields-check-options-39"></a>
#### Options

- `checkGeneratorsOnly` - Avoids checking the function body and merely insists
    that all generators have `@yields`. This can be an optimization with the
    ESLint `require-yield` rule, as that rule already ensures a `yield` is
    present in generators, albeit assuming the generator is not empty).
    Defaults to `false`.
- `next` - If `true`, this option will insist that any use of a (non-standard)
    `@next` tag (in addition to any `@yields` tag) will be matched by a `yield`
    which uses a return value in the body of the generator (e.g.,
    `const rv = yield;` or `const rv = yield value;`). This (non-standard)
    tag is intended to be used to indicate a type and/or description of
    the value expected to be supplied by the user when supplied to the iterator
    by its `next` method, as with `it.next(value)` (with the iterator being
    the `Generator` iterator that is returned by the call to the generator
    function). This option will report an error if the generator function body
    merely has plain `yield;` or `yield value;` statements without returning
    the values. Defaults to `false`.

|||
|---|---|
|Context|`ArrowFunctionExpression`, `FunctionDeclaration`, `FunctionExpression`|
|Tags|`yields`|
|Aliases|`yield`|
|Recommended|true|
|Options|`checkGeneratorsOnly`|
The following patterns are considered problems:

````js
/**
 * @yields
 */
function * quux (foo) {

}
// Message: JSDoc @yields declaration present but yield expression not available in function.

/**
 * @yields
 */
function quux (foo) {

}
// "jsdoc/require-yields-check": ["error"|"warn", {"checkGeneratorsOnly":true}]
// Message: JSDoc @yields declaration present but yield expression not available in function.

/**
 * @next
 */
function quux (foo) {

}
// "jsdoc/require-yields-check": ["error"|"warn", {"checkGeneratorsOnly":true,"next":true}]
// Message: JSDoc @next declaration present but yield expression with return value not available in function.

/**
 * @next {SomeType}
 */
function * quux (foo) {

}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]
// Message: JSDoc @next declaration present but yield expression with return value not available in function.

/**
 * @next {SomeType}
 */
function * quux (foo) {
  yield;
}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]
// Message: JSDoc @next declaration present but yield expression with return value not available in function.

/**
 * @next {SomeType}
 */
function * quux (foo) {
  yield 5;
}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]
// Message: JSDoc @next declaration present but yield expression with return value not available in function.

/**
 * @yield
 */
function * quux (foo) {

}
// Settings: {"jsdoc":{"tagNamePreference":{"yields":"yield"}}}
// Message: JSDoc @yield declaration present but yield expression not available in function.

/**
 * @yield-returns {Something}
 */
function * quux (foo) {
  yield;
}
// Settings: {"jsdoc":{"tagNamePreference":{"next":"yield-returns"}}}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]
// Message: JSDoc @yield-returns declaration present but yield expression with return value not available in function.

/**
 * @yields {undefined} Foo.
 * @yields {String} Foo.
 */
function * quux () {

  yield foo;
}
// Message: Found more than one @yields declaration.

class Foo {
  /**
   * @yields {string}
   */
  * bar () {
  }
}
// Message: JSDoc @yields declaration present but yield expression not available in function.

/**
 * @yields
 */
function * quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"yields":false}}}
// Message: Unexpected tag `@yields`

/**
 * @next
 */
function * quux () {

}
// Settings: {"jsdoc":{"tagNamePreference":{"next":false}}}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]
// Message: Unexpected tag `@next`

/**
 * @yields {string}
 */
function * f () {
  function * g() {
    yield 'foo'
  }
}
// Message: JSDoc @yields declaration present but yield expression not available in function.

/**
 * @yields {Promise<void>}
 */
async function * quux() {}
// Message: JSDoc @yields declaration present but yield expression not available in function.

/**
 * @yields {Promise<void>}
 */
const quux = async function * () {}
// Message: JSDoc @yields declaration present but yield expression not available in function.

/**
 * @yields {never} Foo.
 */
function * quux () {
  yield 5;
}
// Message: JSDoc @yields declaration set with "never" but yield expression is present in function.

/**
 * @next {never}
 */
function * quux (foo) {
  const a = yield;
}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]
// Message: JSDoc @next declaration set with "never" but yield expression with return value is present in function.
````

The following patterns are not considered problems:

````js
/**
 * @yields Foo.
 */
function * quux () {

  yield foo;
}

/**
 * @yields {string} Foo.
 */
function * quux () {

  yield foo;
}

/**
 * @yields {string} Foo.
 */
function * quux () {

  yield foo;
}

/**
 *
 */
function * quux () {
}

/**
 * @yields {undefined} Foo.
 */
function * quux () {}

/**
 * @yields { void } Foo.
 */
function quux () {}

/**
 * @yields Foo.
 * @abstract
 */
function * quux () {
  throw new Error('must be implemented by subclass!');
}

/**
 * @yields Foo.
 * @virtual
 */
function * quux () {
  throw new Error('must be implemented by subclass!');
}

/**
 * @yields Foo.
 * @constructor
 */
function * quux () {
}

/**
 * @interface
 */
class Foo {
  /**
   * @yields {string}
   */
  * bar () {
  }
}

/**
 * @record
 */
class Foo {
  /**
   * @yields {string}
   */
  * bar () {
  }
}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @yields {undefined} Foo.
 */
function * quux () {
}

/**
 * @yields {void} Foo.
 */
function * quux () {
}

/**
 * @yields {never} Foo.
 */
function * quux () {
}

/**
 * @yields {void} Foo.
 */
function * quux () {
  yield undefined;
}

/**
 * @yields {void} Foo.
 */
function * quux () {
  yield;
}

/**
 *
 */
function * quux () {
  yield undefined;
}

/**
 *
 */
function * quux () {
  yield;
}

/**
 * @yields {true}
 */
function * quux () {
  try {
    yield true;
  } catch (err) {
  }
  yield;
}

/**
 * @yields {true}
 */
function * quux () {
  try {
  } finally {
    yield true;
  }
  yield;
}

/**
 * @yields {true}
 */
function * quux () {
  try {
    yield;
  } catch (err) {
  }
  yield true;
}

/**
 * @yields {true}
 */
function * quux () {
  try {
    something();
  } catch (err) {
    yield true;
  }
  yield;
}

/**
 * @yields {true}
 */
function * quux () {
  switch (true) {
  case 'abc':
    yield true;
  }
  yield;
}

/**
 * @yields {true}
 */
function * quux () {
  switch (true) {
  case 'abc':
    yield;
  }
  yield true;
}

/**
 * @yields {true}
 */
function * quux () {
  for (const i of abc) {
    yield true;
  }
  yield;
}

/**
 * @yields {true}
 */
function * quux () {
  for (const a in b) {
    yield true;
  }
}

/**
 * @yields {true}
 */
function * quux () {
  for (let i=0; i<n; i+=1) {
    yield true;
  }
}

/**
 * @yields {true}
 */
function * quux () {
  while(true) {
    yield true
  }
}

/**
 * @yields {true}
 */
function * quux () {
  do {
    yield true
  }
  while(true)
}

/**
 * @yields {true}
 */
function * quux () {
  if (true) {
    yield;
  }
  yield true;
}

/**
 * @yields {true}
 */
function * quux () {
  if (true) {
    yield true;
  }
}

/**
 * @yields {true}
 */
function * quux () {
  var a = {};
  with (a) {
    yield true;
  }
}

/**
 * @yields {true}
 */
function * quux () {
  if (true) {
    yield;
  } else {
    yield true;
  }
  yield;
}

/**
 * @next {void}
 */
function * quux (foo) {

}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]

/**
 * @next {SomeType}
 */
function * quux (foo) {
  const a = yield;
}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]

/**
 * @next {SomeType}
 */
function * quux (foo) {
  const a = yield 5;
}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]

/**
 * @next {never}
 */
function * quux (foo) {

}
// "jsdoc/require-yields-check": ["error"|"warn", {"next":true}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-sort-tags"></a>
<a name="eslint-plugin-jsdoc-rules-sort-tags"></a>
### <code>sort-tags</code>

Sorts tags by a specified sequence according to tag name.

(Default order originally inspired by [`@homer0/prettier-plugin-jsdoc`](https://github.com/homer0/packages/tree/main/packages/public/prettier-plugin-jsdoc).)

<a name="user-content-eslint-plugin-jsdoc-rules-sort-tags-options-40"></a>
<a name="eslint-plugin-jsdoc-rules-sort-tags-options-40"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-sort-tags-options-40-tagsequence"></a>
<a name="eslint-plugin-jsdoc-rules-sort-tags-options-40-tagsequence"></a>
##### <code>tagSequence</code>

An array of tag names indicating the preferred sequence for sorting tags.

Tag names earlier in the list will be arranged first. The relative position of
tags of the same name will not be changed.

Tags not in the list will be sorted alphabetically at the end (or in place of
the pseudo-tag `-other` placed within `tagSequence`) if `alphabetizeExtras` is
enabled and in their order of appearance otherwise (so if you want all your
tags alphabetized, supply an empty array with `alphabetizeExtras` enabled).

Defaults to the array below.

Please note that this order is still experimental, so if you want to retain
a fixed order that doesn't change into the future, supply your own
`tagSequence`.

```js
[
  // Brief descriptions
  'summary',
  'typeSummary',

  // Module/file-level
  'module',
  'exports',
  'file',
  'fileoverview',
  'overview',

  // Identifying (name, type)
  'typedef',
  'interface',
  'record',
  'template',
  'name',
  'kind',
  'type',
  'alias',
  'external',
  'host',
  'callback',
  'func',
  'function',
  'method',
  'class',
  'constructor',

  // Relationships
  'modifies',
  'mixes',
  'mixin',
  'mixinClass',
  'mixinFunction',
  'namespace',
  'borrows',
  'constructs',
  'lends',
  'implements',
  'requires',

  // Long descriptions
  'desc',
  'description',
  'classdesc',
  'tutorial',
  'copyright',
  'license',

  // Simple annotations
  'const',
  'constant',
  'final',
  'global',
  'readonly',
  'abstract',
  'virtual',
  'var',
  'member',
  'memberof',
  'memberof!',
  'inner',
  'instance',
  'inheritdoc',
  'inheritDoc',
  'override',
  'hideconstructor',

  // Core function/object info
  'param',
  'arg',
  'argument',
  'prop',
  'property',
  'return',
  'returns',

  // Important behavior details
  'async',
  'generator',
  'default',
  'defaultvalue',
  'enum',
  'augments',
  'extends',
  'throws',
  'exception',
  'yield',
  'yields',
  'event',
  'fires',
  'emits',
  'listens',
  'this',

  // Access
  'static',
  'private',
  'protected',
  'public',
  'access',
  'package',

  '-other',

  // Supplementary descriptions
  'see',
  'example',

  // METADATA

  // Other Closure (undocumented) metadata
  'closurePrimitive',
  'customElement',
  'expose',
  'hidden',
  'idGenerator',
  'meaning',
  'ngInject',
  'owner',
  'wizaction',

  // Other Closure (documented) metadata
  'define',
  'dict',
  'export',
  'externs',
  'implicitCast',
  'noalias',
  'nocollapse',
  'nocompile',
  'noinline',
  'nosideeffects',
  'polymer',
  'polymerBehavior',
  'preserve',
  'struct',
  'suppress',
  'unrestricted',

  // @homer0/prettier-plugin-jsdoc metadata
  'category',

  // Non-Closure metadata
  'ignore',
  'author',
  'version',
  'variation',
  'since',
  'deprecated',
  'todo',
];
```

<a name="user-content-eslint-plugin-jsdoc-rules-sort-tags-options-40-alphabetizeextras"></a>
<a name="eslint-plugin-jsdoc-rules-sort-tags-options-40-alphabetizeextras"></a>
##### <code>alphabetizeExtras</code>

Defaults to `false`. Alphabetizes any items not within `tagSequence` after any
items within `tagSequence` (or in place of the special `-other` pseudo-tag)
are sorted.

|||
|---|---|
|Context|everywhere|
|Tags|any|
|Recommended|false|
|Settings||
|Options|`tagSequence`, `alphabetizeExtras`|

The following patterns are considered problems:

````js
/**
 * @returns {string}
 * @param b
 * @param a
 */
function quux () {}
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo

/**
 * Some description
 * @returns {string}
 * @param b
 * @param a
 */
function quux () {}
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo

/**
 * @returns {string}
 * @param b A long
 *   description
 * @param a
 */
function quux () {}
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo

/**
 * Some description
 * @returns {string}
 * @param b A long
 *   description
 * @param a
 */
function quux () {}
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo

/**
 * @param b A long
 *   description
 * @returns {string}
 * @param a
 */
function quux () {}
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo

/**
 * @def
 * @xyz
 * @abc
 */
function quux () {}
// "jsdoc/sort-tags": ["error"|"warn", {"alphabetizeExtras":true}]
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo

/**
 * @xyz
 * @def
 * @abc
 */
function quux () {}
// "jsdoc/sort-tags": ["error"|"warn", {"tagSequence":["def","xyz","abc"]}]
// Message: Tags are not in the prescribed order: def, xyz, abc

/**
 * @returns {string}
 * @ignore
 * @param b A long
 *   description
 * @param a
 * @module
 */
function quux () {}
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo

/**
 * @xyz
 * @abc
 * @abc
 * @def
 * @xyz
 */
function quux () {}
// "jsdoc/sort-tags": ["error"|"warn", {"alphabetizeExtras":true}]
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo

/**
 * @param b A long
 *   description
 * @module
 */
function quux () {}
// Message: Tags are not in the prescribed order: summary, typeSummary, module, exports, file, fileoverview, overview, typedef, interface, record, template, name, kind, type, alias, external, host, callback, func, function, method, class, constructor, modifies, mixes, mixin, mixinClass, mixinFunction, namespace, borrows, constructs, lends, implements, requires, desc, description, classdesc, tutorial, copyright, license, internal, const, constant, final, global, readonly, abstract, virtual, var, member, memberof, memberof!, inner, instance, inheritdoc, inheritDoc, override, hideconstructor, param, arg, argument, prop, property, return, returns, async, generator, default, defaultvalue, enum, augments, extends, throws, exception, yield, yields, event, fires, emits, listens, this, static, private, protected, public, access, package, -other, see, example, closurePrimitive, customElement, expose, hidden, idGenerator, meaning, ngInject, owner, wizaction, define, dict, export, externs, implicitCast, noalias, nocollapse, nocompile, noinline, nosideeffects, polymer, polymerBehavior, preserve, struct, suppress, unrestricted, category, ignore, author, version, variation, since, deprecated, todo
````

The following patterns are not considered problems:

````js
/**
 * @param b
 * @param a
 * @returns {string}
 */
function quux () {}

/**
 * @abc
 * @def
 * @xyz
 */
function quux () {}
// "jsdoc/sort-tags": ["error"|"warn", {"alphabetizeExtras":true}]

/**
 * @def
 * @xyz
 * @abc
 */
function quux () {}
// "jsdoc/sort-tags": ["error"|"warn", {"alphabetizeExtras":false}]

/**
 * @def
 * @xyz
 * @abc
 */
function quux () {}
// "jsdoc/sort-tags": ["error"|"warn", {"tagSequence":["def","xyz","abc"]}]

/** @def */
function quux () {}
````


<a name="user-content-eslint-plugin-jsdoc-rules-tag-lines"></a>
<a name="eslint-plugin-jsdoc-rules-tag-lines"></a>
### <code>tag-lines</code>

Enforces lines (or no lines) between tags.

<a name="user-content-eslint-plugin-jsdoc-rules-tag-lines-options-41"></a>
<a name="eslint-plugin-jsdoc-rules-tag-lines-options-41"></a>
#### Options

The first option is a single string set to "always", "never", or "any"
(defaults to "never").

"any" is only useful with `tags` (allowing non-enforcement of lines except
for particular tags) or with `dropEndLines`.

The second option is an object with the following optional properties.

<a name="user-content-eslint-plugin-jsdoc-rules-tag-lines-options-41-count-defaults-to-1"></a>
<a name="eslint-plugin-jsdoc-rules-tag-lines-options-41-count-defaults-to-1"></a>
##### <code>count</code> (defaults to 1)

Use with "always" to indicate the number of lines to require be present.

<a name="user-content-eslint-plugin-jsdoc-rules-tag-lines-options-41-noendlines-defaults-to-false"></a>
<a name="eslint-plugin-jsdoc-rules-tag-lines-options-41-noendlines-defaults-to-false"></a>
##### <code>noEndLines</code> (defaults to <code>false</code>)

Use with "always" to indicate the normal lines to be added after tags should
not be added after the final tag.

<a name="user-content-eslint-plugin-jsdoc-rules-tag-lines-options-41-dropendlines-defaults-to-false"></a>
<a name="eslint-plugin-jsdoc-rules-tag-lines-options-41-dropendlines-defaults-to-false"></a>
##### <code>dropEndLines</code> (defaults to <code>false</code>)

If defined, will drop end lines for the final tag only.

<a name="user-content-eslint-plugin-jsdoc-rules-tag-lines-options-41-tags-default-to-empty-object"></a>
<a name="eslint-plugin-jsdoc-rules-tag-lines-options-41-tags-default-to-empty-object"></a>
##### <code>tags</code> (default to empty object)

Overrides the default behavior depending on specific tags.

An object whose keys are tag names and whose values are objects with the
following keys:

1. `lines` - Set to `always`, `never`, or `any` to override.
2. `count` - Overrides main `count` (for "always")

|||
|---|---|
|Context|everywhere|
|Tags|Any|
|Recommended|true|
|Settings|N/A|
|Options|(a string matching `"always" or "never"` and optional object with `count` and `noEndLines`)|

The following patterns are considered problems:

````js
/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "always"]
// Message: Expected 1 line between tags but found 0

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"count":2}]
// Message: Expected 2 lines between tags but found 0

/**
 * Some description
 * @param {string} a
 *
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"count":2}]
// Message: Expected 2 lines between tags but found 1

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"noEndLines":true}]
// Message: Expected 1 line between tags but found 0

/**
 * Some description
 * @param {string} a
 *
 * @param {number} b
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "never"]
// Message: Expected no lines between tags

/**
 * Some description
 * @param {string} a
 *
 * @param {number} b
 *
 */
// Message: Expected no lines between tags

/**
 * Some description
 * @param {string} a
 *
 * @param {number} b
 * @param {number} c
 */
// "jsdoc/tag-lines": ["error"|"warn", "always"]
// Message: Expected 1 line between tags but found 0

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"tags":{"param":{"lines":"always"}}}]
// Message: Expected 1 line between tags but found 0

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"tags":{"param":{"lines":"always"}}}]
// Message: Expected 1 line between tags but found 0

/**
 * Some description
 * @param {string} a
 * @param {number} b
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"tags":{"param":{"lines":"never"}}}]
// Message: Expected no lines between tags

/**
 * Some description
 * @param {string} a
 *
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"count":2,"tags":{"param":{"lines":"always"}}}]
// Message: Expected 2 lines between tags but found 1

/**
 * Some description
 * @param {string} a
 *
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"count":5,"tags":{"param":{"count":2,"lines":"always"}}}]
// Message: Expected 2 lines between tags but found 1

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"tags":{"anotherTag":{"lines":"never"}}}]
// Message: Expected 1 line between tags but found 0

/**
 * Some description
 * @param {string} A broken up
 *
 * tag description.
 * @param {number} b
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "always"]
// Message: Expected 1 line between tags but found 0

/**
 * Some description
 * @param {number} b
 *
 * @returns {string} A broken up
 *
 * tag description.
 */
// "jsdoc/tag-lines": ["error"|"warn", "always"]
// Message: Expected 1 line between tags but found 0

/**
 * Some description
 * @param {string} a
 * @param {string} b
 *
 * @returns {SomeType} An extended
 * description.
 *
 * This is still part of `@returns`.
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "any",{"dropEndLines":true}]
// Message: Expected no trailing lines
````

The following patterns are not considered problems:

````js
/**
 * Some description
 * @param {string} a
 * @param {number} b
 */

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never"]

/**
 * @param {string} a
 *
 * @param {string} a
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"noEndLines":true}]

/**
 * @param {string} a
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"noEndLines":true}]

/** @param {number} b */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"noEndLines":true}]

/**
 * Some description
 * @param {string} a
 *
 * @param {number} b
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "always"]

/**
 * Some description
 * @param {string} a
 *
 *
 * @param {number} b
 *
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"count":2}]

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"tags":{"param":{"lines":"any"}}}]

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"tags":{"param":{"lines":"any"}}}]

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "always",{"tags":{"param":{"lines":"never"}}}]

/**
 * Some description
 * @param {number} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"tags":{"param":{"lines":"any"}}}]

/**
 * Some description
 * @param {number} a
 *
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"tags":{"param":{"lines":"any"}}}]

/**
 * Some description
 * @param {number} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"tags":{"param":{"lines":"never"}}}]

/**
 * Some description
 * @param {string} a
 *
 *
 * @param {number} b
 *
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"count":5,"tags":{"param":{"count":2,"lines":"always"}}}]

/**
 * Some description
 * @param {string} a
 * @param {number} b
 */
// "jsdoc/tag-lines": ["error"|"warn", "never",{"tags":{"anotherTag":{"lines":"always"}}}]

/**
 * Some description
 * @param {string} a
 *
 * This is still part of `@param`.
 * @returns {SomeType} An extended
 * description.
 */
// "jsdoc/tag-lines": ["error"|"warn", "never"]

/**
 * Some description
 * @param {string} a
 * @returns {SomeType} An extended
 * description.
 *
 * This is still part of `@returns`.
 */
// "jsdoc/tag-lines": ["error"|"warn", "never"]

/**
 * Some description
 * @param {string} a
 *
 * This is still part of `@param`.
 *
 * @returns {SomeType} An extended
 * description.
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "always"]

/**
 * Some description
 * @param {string} a
 *
 * @returns {SomeType} An extended
 * description.
 *
 * This is still part of `@returns`.
 *
 */
// "jsdoc/tag-lines": ["error"|"warn", "always"]

/**
 * Some description
 * @param {string} a
 * @param {string} b
 *
 * @returns {SomeType} An extended
 * description.
 *
 * This is still part of `@returns`.
 */
// "jsdoc/tag-lines": ["error"|"warn", "any",{"dropEndLines":true}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-text-escaping"></a>
<a name="eslint-plugin-jsdoc-rules-text-escaping"></a>
### <code>text-escaping</code>

This rule can auto-escape certain characters that are input within block and
tag descriptions.

This rule may be desirable if your text is known not to contain HTML or
Markdown and you therefore do not wish for it to be accidentally interpreted
as such by the likes of Visual Studio Code or if you wish to view it escaped
within it or your documentation.

<a name="user-content-eslint-plugin-jsdoc-rules-text-escaping-options-42"></a>
<a name="eslint-plugin-jsdoc-rules-text-escaping-options-42"></a>
#### Options

<a name="user-content-eslint-plugin-jsdoc-rules-text-escaping-options-42-escapehtml"></a>
<a name="eslint-plugin-jsdoc-rules-text-escaping-options-42-escapehtml"></a>
##### <code>escapeHTML</code>

This option escapes all `<` and `&` characters (except those followed by
whitespace which are treated as literals by Visual Studio Code).

<a name="user-content-eslint-plugin-jsdoc-rules-text-escaping-options-42-escapemarkdown"></a>
<a name="eslint-plugin-jsdoc-rules-text-escaping-options-42-escapemarkdown"></a>
##### <code>escapeMarkdown</code>

This option escapes the first backtick (`` ` ``) in a paired sequence.

|||
|---|---|
|Context|everywhere|
|Tags|``|
|Recommended|false|
|Settings||
|Options||

The following patterns are considered problems:

````js
/**
 * Some things to escape: <a> and &gt; and `test`
 */
// Message: You must include either `escapeHTML` or `escapeMarkdown`

/**
 * Some things to escape: <a> and &gt; and &#xabc; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]
// Message: You have unescaped HTML characters < or &

/**
 * Some things to escape: <a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeMarkdown":true}]
// Message: You have unescaped Markdown backtick sequences

/**
 * Some things to escape:
 * <a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]
// Message: You have unescaped HTML characters < or &

/**
 * Some things to escape:
 * <a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeMarkdown":true}]
// Message: You have unescaped Markdown backtick sequences

/**
 * @param {SomeType} aName Some things to escape: <a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]
// Message: You have unescaped HTML characters < or & in a tag

/**
 * @param {SomeType} aName Some things to escape: <a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeMarkdown":true}]
// Message: You have unescaped Markdown backtick sequences in a tag

/**
 * @param {SomeType} aName Some things to escape:
 * <a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]
// Message: You have unescaped HTML characters < or & in a tag

/**
 * @param {SomeType} aName Some things to escape:
 * <a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeMarkdown":true}]
// Message: You have unescaped Markdown backtick sequences in a tag
````

The following patterns are not considered problems:

````js
/**
 * Some things to escape: &lt;a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]

/**
 * Some things to escape: <a> and &gt; and \`test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeMarkdown":true}]

/**
 * Some things to escape: < and &
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]

/**
 * Some things to escape: `
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeMarkdown":true}]

/**
 * @param {SomeType} aName Some things to escape: &lt;a> and &gt; and `test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]

/**
 * @param {SomeType} aName Some things to escape: <a> and &gt; and \`test`
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeMarkdown":true}]

/**
 * @param {SomeType} aName Some things to escape: < and &
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]

/**
 * @param {SomeType} aName Some things to escape: `
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeMarkdown":true}]

/**
 * Nothing
 * to escape
 */
// "jsdoc/text-escaping": ["error"|"warn", {"escapeHTML":true}]
````


<a name="user-content-eslint-plugin-jsdoc-rules-valid-types"></a>
<a name="eslint-plugin-jsdoc-rules-valid-types"></a>
### <code>valid-types</code>

Requires all types to be valid JSDoc, Closure, or TypeScript compiler types
without syntax errors. Note that what determines a valid type is handled by
our type parsing engine, [jsdoc-type-pratt-parser](https://github.com/jsdoc-type-pratt-parser/jsdoc-type-pratt-parser),
using [`settings.jsdoc.mode`](#user-content-eslint-plugin-jsdoc-settings-mode) to
determine whether to use jsdoc-type-pratt-parser's "permissive" parsing or
the stricter "jsdoc", "typescript", "closure" modes.

The following tags have their "type" portions (the segment within brackets)
checked (though those portions may sometimes be confined to namepaths,
e.g., `@modifies`):

1. Tags with required types: `@type`, `@implements`
1. Tags with required types in Closure or TypeScript: `@this`,
    `@define` (Closure only)
1. Tags with optional types: `@enum`, `@member` (`@var`), `@typedef`,
  `@augments` (or `@extends`), `@class` (or `@constructor`), `@constant`
  (or `@const`), `@module` (module paths are not planned for TypeScript),
  `@namespace`, `@throws`, `@exception`, `@yields` (or `@yield`),
  `@modifies` (undocumented jsdoc); `@param` (`@arg`, `@argument`),
  `@property` (`@prop`), and `@returns` (`@return`) also fall into this
  category, but while this rule will check their type validity, we leave
  the requiring of the type portion to the rules `require-param-type`,
  `require-property-type`, and `require-returns-type`, respectively.
1. Tags with types that are available optionally in Closure: `@export`,
    `@package`, `@private`, `@protected`, `@public`, `@static`;
    `@template` (TypeScript also)
1. Tags with optional types that may take free text instead: `@throws`

The following tags have their name/namepath portion (the non-whitespace
text after the tag name) checked:

1. Name(path)-defining tags requiring namepath: `@event`, `@callback`,
    `@external`, `@host`, `@name`, `@typedef`, and `@template`
    (TypeScript/Closure only); `@param` (`@arg`, `@argument`) and `@property`
    (`@prop`) also fall into this category, but while this rule will check
    their namepath validity, we leave the requiring of the name portion
    to the rules `require-param-name` and `require-property-name`,
    respectively.
1. Name(path)-defining tags (which may have value without namepath or their
    namepath can be expressed elsewhere on the block):
    `@class`, `@constructor`, `@constant`, `@const`, `@function`, `@func`,
    `@method`, `@interface` (TypeScript tag only), `@member`, `@var`,
    `@mixin`, `@namespace`, `@module` (module paths are not planned for
    TypeScript)
1. Name(path)-pointing tags requiring namepath: `@alias`, `@augments`,
    `@extends`, `@lends`, `@memberof`, `@memberof!`, `@mixes`, `@this`
    (jsdoc only)
1. Name(path)-pointing tags (which may have value without namepath or their
    namepath can be expressed elsewhere on the block): `@listens`, `@fires`,
    `@emits`.
1. Name(path)-pointing tags which may have free text or a namepath: `@see`
1. Name(path)-pointing tags (multiple names in one): `@borrows`

...with the following applying to the above sets:

- Expect tags in set 1-4 to have a valid namepath if present
- Prevent sets 2 and 4 from being empty by setting `allowEmptyNamepaths` to
  `false` as these tags might have some indicative value without a path
  or may allow a name expressed elsewhere on the block (but sets 1 and 3 will
  always fail if empty)
- For the special case of set 6, i.e.,
  `@borrows <that namepath> as <this namepath>`,
  check that both namepaths are present and valid and ensure there is an `as `
  between them. In the case of `<this namepath>`, it can be preceded by
  one of the name path operators, `#`, `.`, or `~`.
- For the special case of `@memberof` and `@memberof!` (part of set 3), as
   per the [specification](https://jsdoc.app/tags-memberof.html), they also
   allow `#`, `.`, or `~` at the end (which is not allowed at the end of
   normal paths).

If you define your own tags, `settings.jsdoc.structuredTags` will allow
these custom tags to be checked, with the name portion of tags checked for
valid namepaths (based on the tag's `name` value), their type portions checked
for valid types (based on the tag's `type` value), and either portion checked
for presence (based on `false` `name` or `type` values or their `required`
value). See the setting for more details.

<a name="user-content-eslint-plugin-jsdoc-rules-valid-types-options-43"></a>
<a name="eslint-plugin-jsdoc-rules-valid-types-options-43"></a>
#### Options

- `allowEmptyNamepaths` (default: true) - Set to `false` to bulk disallow
  empty name paths with namepath groups 2 and 4 (these might often be
  expected to have an accompanying name path, though they have some
  indicative value without one; these may also allow names to be defined
  in another manner elsewhere in the block); you can use
  `settings.jsdoc.structuredTags` with the `required` key set to "name" if you
  wish to require name paths on a tag-by-tag basis.

|||
|---|---|
|Context|everywhere|
|Tags|For name only unless otherwise stated: `alias`, `augments`, `borrows`, `callback`, `class` (for name and type), `constant` (for name and type), `enum` (for type), `event`, `external`, `fires`, `function`, `implements` (for type), `interface`, `lends`, `listens`, `member` (for name and type),  `memberof`, `memberof!`, `mixes`, `mixin`, `modifies`, `module` (for name and type), `name`, `namespace` (for name and type), `param` (for name and type), `property` (for name and type), `returns` (for type), `see` (optionally for name), `this`, `throws` (for type), `type` (for type), `typedef` (for name and type), `yields` (for type)|
|Aliases|`extends`, `constructor`, `const`, `host`, `emits`, `func`, `method`, `var`, `arg`, `argument`, `prop`, `return`, `exception`, `yield`|
|Closure-only|For type only: `package`, `private`, `protected`, `public`, `static`|
|Recommended|true|
|Options|`allowEmptyNamepaths`|
|Settings|`mode`, `structuredTags`|

The following patterns are considered problems:

````js
/**
 * @param {Array<string} foo
 */
function quux() {

}
// Message: Syntax error in type: Array<string

/**
 * @memberof module:namespace.SomeClass<~
 */
function quux() {

}
// Message: Syntax error in namepath: module:namespace.SomeClass<~

/**
 * @param someParam<~
 */
function quux() {

}
// Message: Syntax error in namepath: someParam<~

/**
 * @memberof module:namespace.SomeClass~<
 */
function quux() {

}
// Message: Syntax error in namepath: module:namespace.SomeClass~<

/**
 * @borrows foo% as bar
 */
function quux() {

}
// Message: Syntax error in namepath: foo%

/**
 * @borrows #foo as bar
 */
function quux() {

}
// Message: Syntax error in namepath: #foo

/**
 * @borrows foo as bar%
 */
function quux() {

}
// Message: Syntax error in namepath: bar%

/**
 * @borrows foo
 */
function quux() {

}
// Message: @borrows must have an "as" expression. Found ""

/**
 * @see foo%
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"name":"namepath-referencing","required":["name"]}}}}
// Message: Syntax error in namepath: foo%

/**
 * @mixes module:namespace.SomeClass~
 */
function quux() {

}
// Message: Syntax error in namepath: module:namespace.SomeClass~

/**
 * @callback
 */
function quux() {

}
// "jsdoc/valid-types": ["error"|"warn", {"allowEmptyNamepaths":false}]
// Message: Tag @callback must have a name/namepath.

/**
 * @constant {str%ng}
 */
 const FOO = 'foo';
// Message: Syntax error in type: str%ng

/**
 * @typedef {str%ng} UserString
 */
// Message: Syntax error in type: str%ng

/**
 * @typedef {string} UserStr%ng
 */
// Message: Syntax error in namepath: UserStr%ng

/**
 * @this
 */
 class Bar {};
// "jsdoc/valid-types": ["error"|"warn", {"allowEmptyNamepaths":false}]
// Message: Tag @this must have either a type or namepath in "jsdoc" mode.

/**
 * @aCustomTag
 */
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"required":["typeOrNameRequired"]}}}}
// "jsdoc/valid-types": ["error"|"warn", {"allowEmptyNamepaths":false}]
// Message: Tag @aCustomTag must have either a type or namepath.

/**
 * @type
 */
 let foo;
// Message: Tag @type must have a type.

/**
 * @modifies {bar | foo<}
 */
function quux (foo, bar, baz) {}
// Message: Syntax error in type: bar | foo<

/**
 * @private {BadTypeChecked<}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Syntax error in type: BadTypeChecked<

/**
 * @this {BadTypeChecked<}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Syntax error in type: BadTypeChecked<

/**
 * @define
 */
 function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Tag @define must have a type in "closure" mode.

/**
 * @this
 */
 let foo;
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Tag @this must have a type in "closure" mode.

/**
 * Foo function.
 *
 * @param {[number, string]} bar - The bar array.
 */
function foo(bar) {}
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// Message: Syntax error in type: [number, string]

/**
 * @interface name<
 */
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// Message: Syntax error in namepath: name<

/**
 * @module name<
 */
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// Message: Syntax error in namepath: name<

/**
 * @module module:name<
 */
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// Message: Syntax error in namepath: module:name<

/**
 * @interface name
 */
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: @interface should not have a name in "closure" mode.

/**
 * @aCustomTag name
 */
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"name":false}}}}
// Message: @aCustomTag should not have a name.

/**
 * @typedef {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// "jsdoc/valid-types": ["error"|"warn", {"allowEmptyNamepaths":false}]
// Message: Tag @typedef must have a name/namepath in "jsdoc" mode.

/**
 * @private {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"jsdoc"}}
// Message: @private should not have a bracketed type in "jsdoc" mode.

/**
 * @aCustomTag {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"structuredTags":{"aCustomTag":{"type":false}}}}
// Message: @aCustomTag should not have a bracketed type.

/**
 * @see foo%
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"name":false,"required":["name"]}}}}
// Message: Cannot add "name" to `require` with the tag's `name` set to `false`

/**
 * @see foo%
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"required":["type"],"type":false}}}}
// Message: Cannot add "type" to `require` with the tag's `type` set to `false`

/**
 * @see foo%
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"name":false,"required":["typeOrNameRequired"]}}}}
// Message: Cannot add "typeOrNameRequired" to `require` with the tag's `name` set to `false`

/**
 * @see foo%
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"required":["typeOrNameRequired"],"type":false}}}}
// Message: Cannot add "typeOrNameRequired" to `require` with the tag's `type` set to `false`

/**
 * @template T<~, R
 * @param {function(!T): !R} parser
 * @return {function(!Array<!T>): !Array<!R>}
 */
parseArray = function(parser) {
    return function(array) {
        return array.map(parser);
    };
};
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Syntax error in namepath: T<~

/**
 * @template T, R<~
 * @param {function(!T): !R} parser
 * @return {function(!Array<!T>): !Array<!R>}
 */
parseArray = function(parser) {
    return function(array) {
        return array.map(parser);
    };
};
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Syntax error in namepath: R<~

/**
 * @template    T, R<~
 * @param {function(!T): !R} parser
 * @return {function(!Array<!T>): !Array<!R>}
 */
parseArray = function(parser) {
    return function(array) {
        return array.map(parser);
    };
};
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Syntax error in namepath: R<~

/**
 * @suppress
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Tag @suppress must have a type in "closure" mode.

/**
 * @suppress {visibility} sth
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: @suppress should not have a name in "closure" mode.

/**
 * @suppress {visibility|blah}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// Message: Syntax error in supresss type: blah

/**
 * @param {Object[]} employees
 * @param {string} employees[.name - The name of an employee.
 */
function quux () {}
// Message: Invalid name: unpaired brackets

/**
 * @param {Object[]} employees
 * @param {string} [] - The name of an employee.
 */
function quux () {}
// Message: Invalid name: empty name

/**
 * @param {Object[]} employees
 * @param {string} [] - The name of an employee.
 */
function quux () {}
// Message: Invalid name: empty name

/**
 * @param {string} [name=] - The name of an employee.
 */
function quux () {}
// Message: Invalid name: empty default value

/**
 * @param {string} [name==] - The name of an employee.
 */
function quux () {}
// Message: Invalid name: invalid default value syntax
````

The following patterns are not considered problems:

````js
/**
 * @param {Array<string>} foo
 */
function quux() {

}

/**
 * @param {string} foo
 */
function quux() {

}

/**
 * @param foo
 */
function quux() {

}

/**
 * @borrows foo as bar
 */
function quux() {

}

/**
 * @borrows foo as #bar
 */
function quux() {

}

/**
 * @see foo%
 */
function quux() {

}

/**
 * @alias module:namespace.SomeClass#event:ext_anevent
 */
function quux() {

}

/**
 * @callback foo
 */
function quux() {

}

/**
 * @callback
 */
function quux() {

}
// "jsdoc/valid-types": ["error"|"warn", {"allowEmptyNamepaths":true}]

/**
 * @class
 */
function quux() {

}

/**
 * @see {@link foo}
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"name":"namepath-referencing","required":["name"]}}}}

/**
 *
 * @fires module:namespace.SomeClass#event:ext_anevent
 */
function quux() {

}

/**
 * @memberof module:namespace.SomeClass~
 */
function quux() {

}

/**
 * @memberof! module:namespace.SomeClass.
 */
function quux() {

}

/**
 *
 */
function quux() {

}

/**
 * @aCustomTag
 */
function quux() {

}

/**
 * @constant {string}
 */
 const FOO = 'foo';

/**
 * @constant {string} FOO
 */
 const FOO = 'foo';

/**
 * @extends Foo
 */
 class Bar {};

/**
 * @extends Foo<String>
 */
 class Bar {};

/**
 * @extends {Foo<String>}
 */
 class Bar {};
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @typedef {number | string} UserDefinedType
 */

/**
 * @typedef {number | string}
 */
let UserDefinedGCCType;
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @modifies {foo | bar}
 */
function quux (foo, bar, baz) {}

/**
 * @this {Navigator}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @export {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @define {boolean}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @define
 */
 function quux () {}

/**
 * Foo function.
 *
 * @interface foo
 */
function foo(bar) {}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * Foo function.
 *
 * @param {[number, string]} bar - The bar array.
 */
function foo(bar) {}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * Foo function.
 *
 * @param {[number, string]} bar - The bar array.
 */
function foo(bar) {}

/**
 * Foo function.
 *
 * @param {[number, string]} bar - The bar array.
 */
function foo(bar) {}
// Settings: {"jsdoc":{"mode":"permissive"}}

/**
 * @typedef {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}
// "jsdoc/valid-types": ["error"|"warn", {"allowEmptyNamepaths":false}]

/**
 * @private {SomeType}
 */
function quux () {}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @param
 */
function quux() {

}
// "jsdoc/valid-types": ["error"|"warn", {"allowEmptyNamepaths":false}]

/**
 * @see
 */
function quux() {

}
// Settings: {"jsdoc":{"structuredTags":{"see":{"name":"namepath-referencing"}}}}

/**
 * @template T, R
 * @param {function(!T): !R} parser
 * @return {function(!Array<!T>): !Array<!R>}
 */
parseArray = function(parser) {
    return function(array) {
        return array.map(parser);
    };
};
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @template T, R<~
 * @param {function(!T): !R} parser
 * @return {function(!Array<!T>): !Array<!R>}
 */
parseArray = function(parser) {
    return function(array) {
        return array.map(parser);
    };
};
// Settings: {"jsdoc":{"mode":"jsdoc"}}

/**
 * @template {string} K - K must be a string or string literal
 * @template {{ serious: string }} Seriousalizable - must have a serious property
 * @param {K} key
 * @param {Seriousalizable} object
 */
function seriousalize(key, object) {
  // ????
}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @module foo/bar
 */

/**
 * @module module:foo/bar
 */

/**
 * @template invalid namepath,T Description
 */
function f() {}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * Description of complicated type.
 *
 * @template T Description of the T type parameter.
 * @template U - Like other tags, this can have an optional hyphen before the description.
 * @template V,W More parameters
 * @template W,X - Also with a hyphen
 */
type ComplicatedType<T, U, V, W, X> = never

/** Multi-line typedef for an options object type.
 *
 * @typedef {{
 *   prop: number
 * }} MyOptions
 */

/**
 * @extends {SomeType}
 */
class quux {}
// Settings: {"jsdoc":{"mode":"typescript"}}

/**
 * @suppress {visibility|underscore}
 */
function quux() {
}
// Settings: {"jsdoc":{"mode":"closure"}}

/**
 * @param {string} id
 * @param {Object} options
 * @param {boolean} options.isSet
 * @param {string} options.module
 */
function quux ( id, options ) {
}


/**
 * Assign the project to a list of employees.
 * @param {Object[]} employees - The employees who are responsible for the project.
 * @param {string} employees[].name - The name of an employee.
 * @param {string} employees[].department - The employee's department.
 */
function assign(employees) {
  // ...
}
// "jsdoc/valid-types": ["error"|"warn", {"allowEmptyNamepaths":true,"checkSeesForNamepaths":false}]
````


