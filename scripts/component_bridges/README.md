# Component bridges generation

We're building our web components in TypeScript but have to ensure that our legacy Closure code is happy and type-checks. See [Building bridges to a TypeScript world](https://docs.google.com/document/d/1qpa5QSSHrvvo_w73GV0hOJRug4N0_9JfFDw01d-NaCE/edit#heading=h.7nki9mck5t64) for more details.

If you'd like to generate a bridge for a given component, run:

```
npm run generate-bridge-file ./front_end/path/to/component.ts
```

This will generate `./front_end/path/to/component_bridge.js`.
_Do not modify this by hand!_.
If you change any types in `component.ts`, you should rerun this command (this will soon be enforced in a PRESUBMIT check).

## Details on the bridge

The bridges contain:

1. Any interfaces that are needed in Closure code. These are taken from the TypeScript source and converted as a `@typedef` that Closure can understand.
1. A class definition for the custom element in the form of `class X extends HTMLElement`. We use this class definition as a type in Closure land.
1. Any public methods defined in the component complete with JSDoc comments. Note that the function body is left empty.
1. A function named `createX`, where `X` is the name of the component, that calls `document.createElement('...')`.

## Debugging the bridges generation

The bridges code parses the component file to a TypeScript AST and walks through it looking for the particular parts of the code that are required.
The walking is done in `walk_tree.ts` which generates a state object which gets passed into `generate_closure.ts` which spits out JavaScript with JSDocs.
`value_for_type_node.ts` is able to take a single TypeScript node and convert it to the equivalent in Closure and this is used when generating interface definitions and JSDoc parameter comments.

You'll also find a suite of tests for this code in `test/unittests/scripts/component_bridges`.
These are _not_ run on CQ but please use them locally when making a change to the generation. You can run them with:

```
npm run generate-bridges-test
```

It's important to note that the bridge generation code is not exhaustive; there are various TypeScript types that it does not yet support or understand.
Rather than implement support for every node we're incrementally adding support as we need it.
You should get a loud error message explaining that you're using an unsupported type.
Feel free to make a CL to add support and if you'd like help reach out to one of the OWNERS.




