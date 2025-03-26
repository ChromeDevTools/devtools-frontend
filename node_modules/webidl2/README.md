# webidl2.js

[![NPM version](https://badge.fury.io/js/webidl2.svg)](http://badge.fury.io/js/webidl2) [![Known Vulnerabilities](https://snyk.io/test/github/w3c/webidl2.js/badge.svg)](https://snyk.io/test/github/w3c/webidl2.js/)
[![Financial Contributors on Open Collective](https://opencollective.com/webidl2js/all/badge.svg?label=financial+contributors)](https://opencollective.com/webidl2js)

## Purpose

This is a parser for [Web IDL](https://heycam.github.io/webidl/), a language
[to specify web APIs in interoperable way](https://heycam.github.io/webidl/#introduction).
This library supports both Node.js and the browser environment.

Try the online checker [here](https://w3c.github.io/webidl2.js/checker/).

## Installation

Just the usual. For Node:

```Bash
npm install webidl2
```

In the browser without module support:

```HTML
<script src='./webidl2/dist/webidl2.js'></script>
```

## Documentation

WebIDL2 provides two functions: `parse` and `write`.

* `parse`: Converts a WebIDL string into a syntax tree.
* `write`: Converts a syntax tree into a WebIDL string. Useful for programmatic code
  modification.

In Node, that happens with:

```JS
const { parse, write, validate } = require("webidl2");
const tree = parse("string of WebIDL");
const text = write(tree);
const validation = validate(tree);
```

In the browser:
```HTML
<script>
  const tree = WebIDL2.parse("string of WebIDL");
  const text = WebIDL2.write(tree);
  const validation = WebIDL2.validate(tree);
</script>

<!-- Or when module is supported -->
<script type="module">
  import { parse, write, validate } from "./webidl2/index.js";
  const tree = parse("string of WebIDL");
  const text = write(tree);
  const validation = validate(tree);
</script>
```

`parse()` optionally takes an option bag with the following fields:

* `concrete`: Boolean indicating whether the result should include [EOF](#end-of-file)
   node or not.
* `productions`: An array with custom production functions. See [Custom productions](docs/custom-productions.md) for more information.
* `sourceName`: The source name, typically a filename. [Errors](#errors) and validation
   objects can indicate their origin if you pass a value.

`write()` optionally takes a "templates" object, whose properties are functions that process input in different ways (depending on what is needed for output). Every property is optional. Each property is documented below:

```js
var result = WebIDL2.write(tree, {
  templates: {
    /**
     * A function that receives syntax strings plus anything the templates returned.
     * The items are guaranteed to be ordered.
     * The returned value may be again passed to any template functions,
     * or it may also be the final return value of `write()`.
     * @param {any[]} items
     */
    wrap: items => items.join(""),
    /**
     * @param {string} t A trivia string, which includes whitespaces and comments.
     */
    trivia: t => t,
    /**
     * The identifier for a container type. For example, the `Foo` part of `interface Foo {};`.
     * @param {string} escaped The escaped raw name of the definition.
     * @param data The definition with the name
     * @param parent The parent of the definition, undefined if absent
     */
    name: (escaped, { data, parent }) => escaped,
    /**
     * Called for each type referece, e.g. `Window`, `DOMString`, or `unsigned long`.
     * @param escaped The referenced name. Typically string, but may also be the return
     *            value of `wrap()` if the name contains whitespace.
     * @param unescaped Unescaped reference.
     */
    reference: (escaped, unescaped) => escaped,
    /**
     * Called for each generic-form syntax, e.g. `sequence`, `Promise`, or `maplike`.
     * @param {string} name The keyword for syntax
     */
    generic: name => name,
    /**
     * Called for each nameless members, e.g. `stringifier` for `stringifier;` and `constructor` for `constructor();`
     * @param {string} name The keyword for syntax
     */
    nameless: (keyword, { data, parent }) => keyword,
    /**
     * Called only once for each types, e.g. `Document`, `Promise<DOMString>`, or `sequence<long>`.
     * @param type The `wrap()`ed result of references and syntatic bracket strings.
     */
    type: type => type,
    /**
     * Receives the return value of `reference()`. String if it's absent.
     */
    inheritance: inh => inh,
    /**
     * Called for each IDL type definition, e.g. an interface, an operation, or a typedef.
     * @param content The wrapped value of everything the definition contains.
     * @param data The original definition object
     * @param parent The parent of the definition, undefined if absent
     */
    definition: (content, { data, parent }) => content,
    /**
     * Called for each extended attribute annotation.
     * @param content The wrapped value of everything the annotation contains.
     */
    extendedAttribute: content => content,
    /**
     * The `Foo` part of `[Foo=Whatever]`.
     * @param ref The name of the referenced extended attribute name.
     */
    extendedAttributeReference: ref => ref
  }
});
```

"Wrapped value" here will all be raw strings when the `wrap()` callback is absent.

`validate()` receives an AST or an array of AST, and returns semantic errors as an
array of objects. Their fields are same as [errors](#errors) have, with one addition:

* `level`: `"error"` or `"warning"`.

```js
const validations = validate(tree);
for (const validation of validations) {
  console.log(validation.message);
}
// Validation error on line X: ...
// Validation error on line Y: ...
```

The validator function may provide an autofix function that modifies AST. You can
optionally call it to skip manual fixes, but make sure you review the result.

```js
const validations = validate(tree);
for (const validation of validations) {
  if (validation.autofix) {
    validation.autofix();
  }
}
write(tree); // magic!
```

### Errors

When there is a syntax error in the WebIDL, it throws an exception object with the following
properties:

* `message`: the error message with its context. Below is what it looks like.
   ```
   Syntax error at line 1 in callback-noparen.webidl, since `callback YourCall`:
   callback YourCall = undefined;
                                ^ Callback lacks parentheses for arguments
   ```
* `bareMessage`: the error message without any context description like below.
   ```
   Callback lacks parentheses for arguments
   ```
* `line`: the line at which the error occurred.
* `sourceName`: the source name you passed to `parse()`.
* `level`: `"error"` by default, can be `"warning"` for some validations for e.g. potential future deprecations.
* `ruleName`: Only for validations. Currently the followings are supported:
   * `attr-invalid-type`: Attributes cannot have sequences, records, nor dictionaries.
   * `dict-arg-default`: Optional dictionary type arguments must have a default value of `{}`.
   * `dict-arg-optional`: Dictionary type arguments must be optional if the type does not include a required field.
   * `no-nullable-dict-arg`: Dictionary arguments cannot be nullable.
   * `no-nullable-union-dict`: Nullable unions cannot include a dictionary type.
   * `constructor-member`: Constructors must use newer `constructor()` syntax.
   * `no-duplicate`: Types cannot have identical names.
   * `require-exposed`: Interfaces must explicitly expose themselves to specific contexts by `[Exposed]`.
   * `incomplete-op`: Regular or static operations must have both a return type and an identifier.
   * `no-cross-overload`: Overloading must be done within a single interface or namespace.
   * `no-constructible-global`: Interfaces with `[Global]` cannot have constructors.
   * `renamed-legacy`: Legacy extended attributes must use their new names.
   * `replace-void`: `void` type is replaced by `undefined` type.
   * `migrate-allowshared`: `[AllowShared] BufferSource` is replaced by `AllowSharedBufferSource`.
* `input`: a short peek at the text at the point where the error happened
* `tokens`: the five tokens at the point of error, as understood by the tokeniser
  (this is the same content as `input`, but seen from the tokeniser's point of view)

The exception also has a `toString()` method that hopefully should produce a decent
error message.

### AST (Abstract Syntax Tree)

The `parse()` method returns a tree object representing the parse tree of the IDL.
Comment and white space are not represented in the AST.

The root of this object is always an array of definitions (where definitions are
any of interfaces, dictionaries, callbacks, etc. — anything that can occur at the root
of the IDL).

### IDL Type

This structure is used in many other places (operation return types, argument types, etc.).
It captures a WebIDL type with a number of options. Types look like this and are typically
attached to a field called `idlType`:

```JS
{
  "type": "attribute-type",
  "generic": "",
  "idlType": "unsigned short",
  "nullable": false,
  "union": false,
  "extAttrs": [...]
}
```

Where the fields are as follows:

* `type`: String indicating where this type is used. Can be `null` if not applicable.
* `generic`: String indicating the generic type (e.g. "Promise", "sequence").
* `idlType`: String indicating the type name, or array of subtypes if the type is
  generic or a union.
* `nullable`: `true` if the type is nullable.
* `union`: Boolean indicating whether this is a union type or not.
* `extAttrs`: An array of [extended attributes](#extended-attributes).

### Interface

Interfaces look like this:

```JS
{
  "type": "interface",
  "name": "Animal",
  "partial": false,
  "members": [...],
  "inheritance": null,
  "extAttrs": [...]
}, {
  "type": "interface",
  "name": "Human",
  "partial": false,
  "members": [...],
  "inheritance": "Animal",
  "extAttrs": [...]
}
```

The fields are as follows:

* `type`: Always "interface".
* `name`: The name of the interface.
* `partial`: `true` if the type is a partial interface.
* `members`: An array of interface members (attributes, operations, etc.). Empty if there are none.
* `inheritance`: The name of an interface this one inherits from, `null` otherwise.
* `extAttrs`: An array of [extended attributes](#extended-attributes).

### Interface mixins

Interfaces mixins look like this:

```JS
{
  "type": "interface mixin",
  "name": "Animal",
  "inheritance": null,
  "partial": false,
  "members": [...],
  "extAttrs": [...]
}, {
  "type": "interface mixin",
  "name": "Human",
  "inheritance": null,
  "partial": false,
  "members": [...],
  "extAttrs": [...]
}
```

The fields are as follows:

* `type`: Always "interface mixin".
* `name`: The name of the interface mixin.
* `inheritance`: Always `null`.
* `partial`: `true if the type is a partial interface mixin.
* `members`: An array of interface members (attributes, operations, etc.). Empty if there are none.
* `extAttrs`: An array of [extended attributes](#extended-attributes).

### Namespace

Namespaces look like this:

```JS
{
  "type": "namespace",
  "name": "console",
  "inheritance": null,
  "partial": false,
  "members": [...],
  "extAttrs": [...]
}
```

The fields are as follows:

* `type`: Always "namespace".
* `name`: The name of the namespace.
* `inheritance`: Always `null`.
* `partial`: `true if the type is a partial namespace.
* `members`: An array of namespace members (attributes, constants, and operations). Empty if there are none.
* `extAttrs`: An array of [extended attributes](#extended-attributes).

### Callback Interfaces

These are captured by the same structure as [Interfaces](#interface) except that
their `type` field is "callback interface".

### Callback

A callback looks like this:

```JS
{
  "type": "callback",
  "name": "AsyncOperationCallback",
  "idlType": {
    "type": "return-type",
    "generic": "",
    "nullable": false,
    "union": false,
    "idlType": "undefined",
    "extAttrs": []
  },
  "arguments": [...],
  "extAttrs": []
}
```

The fields are as follows:

* `type`: Always "callback".
* `name`: The name of the callback.
* `idlType`: An [IDL Type](#idl-type) describing what the callback returns.
* `arguments`: A list of [arguments](#arguments), as in function paramters.
* `extAttrs`: An array of [extended attributes](#extended-attributes).

### Dictionary

A dictionary looks like this:

```JS
{
  "type": "dictionary",
  "name": "PaintOptions",
  "partial": false,
  "members": [{
    "type": "field",
    "name": "fillPattern",
    "required": false,
    "idlType": {
      "type": "dictionary-type",
      "generic": "",
      "nullable": true
      "union": false,
      "idlType": "DOMString",
      "extAttrs": []
    },
    "extAttrs": [],
    "default": {
      "type": "string",
      "value": "black"
    }
  }],
  "inheritance": null,
  "extAttrs": []
}
```

The fields are as follows:

* `type`: Always "dictionary".
* `name`: The dictionary name.
* `partial`: `true` if the type is a partial dictionary.
* `members`: An array of members (see below).
* `inheritance`: An object indicating which dictionary is being inherited from, `null` otherwise.
* `extAttrs`: An array of [extended attributes](#extended-attributes).

All the members are fields as follows:

* `type`: Always "field".
* `name`: The name of the field.
* `required`: `true` if the field is required.
* `idlType`: An [IDL Type](#idl-type) describing what field's type.
* `extAttrs`: An array of [extended attributes](#extended-attributes).
* `default`: A [default value](#default-and-const-values), or `null` if there is none.

### Enum

An enum looks like this:

```JS
{
  "type": "enum",
  "name": "MealType",
  "values": [
    {
      "type": "enum-value",
      "value": "rice"
    },
    {
      "type": "enum-value",
      "value": "noodles"
    },
    {
      "type": "enum-value",
      "value": "other"
    }
  ]
  "extAttrs": []
}
```

The fields are as follows:

* `type`: Always "enum".
* `name`: The enum's name.
* `values`: An array of values. The type of value is "enum-value".
* `extAttrs`: An array of [extended attributes](#extended-attributes).

### Typedef

A typedef looks like this:

```JS
{
  "type": "typedef",
  "idlType": {
    "type": "typedef-type",
    "generic": "sequence",
    "nullable": false,
    "union": false,
    "idlType": [
      {
        "type": "typedef-type",
        "generic": "",
        "nullable": false,
        "union": false,
        "idlType": "Point",
        "extAttrs": [...]
      }
    ],
    "extAttrs": [...]
  },
  "name": "PointSequence",
  "extAttrs": []
}
```


The fields are as follows:

* `type`: Always "typedef".
* `name`: The typedef's name.
* `idlType`: An [IDL Type](#idl-type) describing what typedef's type.
* `extAttrs`: An array of [extended attributes](#extended-attributes).

### Includes

An includes definition looks like this:

```JS
{
  "type": "includes",
  "target": "Node",
  "includes": "EventTarget",
  "extAttrs": []
}
```

The fields are as follows:

* `type`: Always "includes".
* `target`: The interface that includes an interface mixin.
* `includes`: The interface mixin that is being included by the target.
* `extAttrs`: An array of [extended attributes](#extended-attributes).

### Operation Member

An operation looks like this:

```JS
{
  "type": "operation",
  "special": "",
  "idlType": {
    "type": "return-type",
    "generic": "",
    "nullable": false,
    "union": false,
    "idlType": "undefined",
    "extAttrs": []
  },
  "name": "intersection",
  "arguments": [{
    "default": null,
    "optional": false,
    "variadic": true,
    "extAttrs": [],
    "idlType": {
      "type": "argument-type",
      "generic": "",
      "nullable": false,
      "union": false,
      "idlType": "long",
      "extAttrs": [...]
    },
    "name": "ints"
  }],
  "extAttrs": [],
  "parent": { ... }
}
```

The fields are as follows:

* `type`: Always "operation".
* `special`: One of `"getter"`, `"setter"`, `"deleter"`, `"static"`, `"stringifier"`, or `""`.
* `idlType`: An [IDL Type](#idl-type) of what the operation returns, if exists.
* `name`: The name of the operation if exists.
* `arguments`: An array of [arguments](#arguments) for the operation.
* `extAttrs`: An array of [extended attributes](#extended-attributes).
* `parent`: The container of this type as an Object.

### Constructor Operation Member

A constructor operation member looks like this:

```JS
{
  "type": "constructor",
  "arguments": [{
    "default": null,
    "optional": false,
    "variadic": true,
    "extAttrs": [],
    "idlType": {
      "type": "argument-type",
      "generic": "",
      "nullable": false,
      "union": false,
      "idlType": "long",
      "extAttrs": [...]
    },
    "name": "ints"
  }],
  "extAttrs": [],
  "parent": { ... }
}
```

The fields are as follows:

* `type`: Always "constructor".
* `arguments`: An array of [arguments](#arguments) for the constructor operation.
* `extAttrs`: An array of [extended attributes](#extended-attributes).
* `parent`: The container of this type as an Object.

### Attribute Member

An attribute member looks like this:

```JS
{
  "type": "attribute",
  "special": "",
  "readonly": false,
  "idlType": {
    "type": "attribute-type",
    "generic": "",
    "nullable": false,
    "union": false,
    "idlType": "any",
    "extAttrs": [...]
  },
  "name": "regexp",
  "extAttrs": [],
  "parent": { ... }
}
```

The fields are as follows:

* `type`: Always "attribute".
* `name`: The attribute's name.
* `special`: One of `"static"`, `"stringifier"`, `"inherit"`, or `""`.
* `readonly`: `true` if the attribute is read-only.
* `idlType`: An [IDL Type](#idl-type) for the attribute.
* `extAttrs`: An array of [extended attributes](#extended-attributes).
* `parent`: The container of this type as an Object.

### Constant Member

A constant member looks like this:

```JS
{
  "type": "const",
  "idlType": {
    "type": "const-type",
    "generic": "",
    "nullable": false,
    "union": false,
    "idlType": "boolean",
    "extAttrs": []
  },
  "name": "DEBUG",
  "value": {
    "type": "boolean",
    "value": false
  },
  "extAttrs": [],
  "parent": { ... }
}
```

The fields are as follows:

* `type`: Always "const".
* `idlType`: An [IDL Type](#idl-type) of the constant that represents a simple type, the type name.
* `name`: The name of the constant.
* `value`: The constant value as described by [Const Values](#default-and-const-values)
* `extAttrs`: An array of [extended attributes](#extended-attributes).
* `parent`: The container of this type as an Object.

### Arguments

The arguments (e.g. for an operation) look like this:

```JS
{
  "arguments": [{
    "type": "argument",
    "default": null,
    "optional": false,
    "variadic": true
    "extAttrs": []
    "idlType": {
      "type": "argument-type",
      "generic": "",
      "nullable": false,
      "union": false,
      "idlType": "float",
      "extAttrs": [...]
    },
    "name": "ints",
    "parent": { ... }
  }]
}
```

The fields are as follows:

* `default`: A [default value](#default-and-const-values), or `null` if there is none.
* `optional`: `true` if the argument is optional.
* `variadic`: `true` if the argument is variadic.
* `idlType`: An [IDL Type](#idl-type) describing the type of the argument.
* `name`: The argument's name.
* `extAttrs`: An array of [extended attributes](#extended-attributes).
* `parent`: The container of this type as an Object.

### Extended Attributes

Extended attribute container look like this:

```JS
{
  "extAttrs": [{
    "name": "PutForwards",
    "arguments": [...],
    "type": "extended-attribute",
    "rhs": {
      "type": "identifier",
      "value": "foo"
    },
    "parent": { ... }
  }]
}
```

The fields are as follows:

* `items`: An array of extended attributes.

Extended attributes look like this:

* `name`: The extended attribute's name.
* `arguments`: An array of [arguments](#arguments), if the extended
  attribute has a signature (e.g. `[Foo()]`) or if its right-hand side does (e.g.
  `[LegacyFactoryFunction=Name(DOMString blah)]`).
* `type`: Always `"extended-attribute"`.
* `rhs`: If there is a right-hand side, this will capture its `type` and `value`. The
  type can be one of the following:
   * `"identifier"`
   * `"identifier-list"`
   * `"string"`
   * `"string-list"`
   * `"decimal"`
   * `"decimal-list"`
   * `"integer"`
   * `"integer-list"`
   * `"*"`
* `parent`: The container of this type as an Object.

### Default and Const Values

Dictionary fields and operation arguments can take default values, and constants take
values, all of which have the following fields:

* `type`: One of `"string"`, `"number"`, `"boolean"`, `"null"`, `"Infinity"`, `"NaN"`, `"sequence"` or `"dictionary"`.

For `"boolean"`, `"string"`, `"number"`, and `"sequence"`:

* `value`: The value of the given type.  For string and number types, the value is given as a string.  For booleans, the possible values are `true` and `false`. For sequence, the only possible value is `[]`.

For `"Infinity"`:

* `negative`: Boolean indicating whether this is negative Infinity or not.

### `iterable<>`, `async iterable<>`, `maplike<>`, and `setlike<>` declarations

These appear as members of interfaces that look like this:

```JS
{
  "type": "maplike", // or "iterable" / "setlike"
  "idlType": /* One or two types */ ,
  "readonly": false, // only for maplike and setlike
  "async": false, // iterable can be async
  "arguments": [], // only for async iterable
  "extAttrs": [],
  "parent": { ... }
}
```

The fields are as follows:

* `type`: Always one of "iterable", "maplike" or "setlike".
* `idlType`: An array with one or more [IDL Types](#idl-type) representing the declared type arguments.
* `readonly`: `true` if the maplike or setlike is declared as read only.
* `async`: `true` if the type is async iterable.
* `arguments`: An array of arguments if exists, empty otherwise. Currently only `async iterable` supports the syntax.
* `extAttrs`: An array of [extended attributes](#extended-attributes).
* `parent`: The container of this type as an Object.

### End of file

```js
{
  "type": "eof",
  "value": ""
}
```

This type only appears as the last item of parser results, only if options.concrete is `true`.
This is needed for the writer to keep any comments or whitespaces at the end of file.

The fields are as follows:

* `type`: Always "eof"
* `value`: Always an empty string.

## Testing

### Running

The test runs with mocha and expect.js. Normally, running `npm test` in the root directory
should be enough once you're set up.


## Contributors

### Code Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/w3c/webidl2.js/graphs/contributors"><img src="https://opencollective.com/webidl2js/contributors.svg?width=890&button=false" /></a>

### Financial Contributors

Become a financial contributor and help us sustain our community. [[Contribute](https://opencollective.com/webidl2js/contribute)]

#### Individuals

<a href="https://opencollective.com/webidl2js"><img src="https://opencollective.com/webidl2js/individuals.svg?width=890"></a>

#### Organizations

Support this project with your organization. Your logo will show up here with a link to your website. [[Contribute](https://opencollective.com/webidl2js/contribute)]

<a href="https://opencollective.com/webidl2js/organization/0/website"><img src="https://opencollective.com/webidl2js/organization/0/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/1/website"><img src="https://opencollective.com/webidl2js/organization/1/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/2/website"><img src="https://opencollective.com/webidl2js/organization/2/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/3/website"><img src="https://opencollective.com/webidl2js/organization/3/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/4/website"><img src="https://opencollective.com/webidl2js/organization/4/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/5/website"><img src="https://opencollective.com/webidl2js/organization/5/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/6/website"><img src="https://opencollective.com/webidl2js/organization/6/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/7/website"><img src="https://opencollective.com/webidl2js/organization/7/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/8/website"><img src="https://opencollective.com/webidl2js/organization/8/avatar.svg"></a>
<a href="https://opencollective.com/webidl2js/organization/9/website"><img src="https://opencollective.com/webidl2js/organization/9/avatar.svg"></a>
