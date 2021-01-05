# eslint-plugin-lit-a11y

Accessibility linting plugin for lit-html.

Most of the rules are ported from [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), and made to work with [lit-html](https://lit-html.polymer-project.org/) templates and custom elements.

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-lit-a11y`:

```
$ npm install eslint-plugin-lit-a11y --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-lit-a11y` globally.

## Usage

Add `lit-a11y` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": ["lit-a11y"]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "lit-a11y/rule-name": 2
  }
}
```

## Configuration

You may also extend the recommended configuration like so:

```json
{
  "extends": ["plugin:lit-a11y/recommended"]
}
```

By default, any tagged template literal that starts with `html` is linted. Example:

```js
html`<img />`;
```

It could be the case, however, that you're using multiple rendering libraries in a project, like for example [`htm`](https://github.com/developit/htm), which also uses a `html` tagged template literal, but has a slightly different syntax than lit-html. In this case you can specify the following option, to make sure only lit-html tagged template literals are linted:

```json
{
  "settings": {
    "litHtmlSources": true
  }
}
```

This will cause the plugin to lint _only_ `html` tagged template literals that are imported from either `'lit-html'` or `'lit-element'`.

If you're importing lit-html from a package that re-exports lit-html, like for example `@apollo-elements/lit-apollo`, you can specify `@apollo-elements/lit-apollo` as a valid litHtmlSource like so:

```json
{
  "settings": {
    "litHtmlSources": ["@apollo-elements/lit-apollo"]
  }
}
```

## Supported Rules

- [lit-a11y/accessible-emoji](./docs/rules/accessible-emoji.md)
- [lit-a11y/alt-text](./docs/rules/alt-text.md)
- [lit-a11y/anchor-has-content](./docs/rules/anchor-has-content.md)
- [lit-a11y/anchor-is-valid](./docs/rules/anchor-is-valid.md)
- [lit-a11y/aria-activedescendant-has-tabindex](./docs/rules/aria-activedescendant-has-tabindex.md)
- [lit-a11y/aria-attr-valid-value](./docs/rules/aria-attr-valid-value.md)
- [lit-a11y/aria-attrs](./docs/rules/aria-attrs.md)
- [lit-a11y/aria-role](./docs/rules/aria-role.md)
- [lit-a11y/aria-unsupported-elements](./docs/rules/aria-unsupported-elements.md)
- [lit-a11y/autocomplete-valid](./docs/rules/autocomplete-valid.md)
- [lit-a11y/click-events-have-key-events](./docs/rules/click-events-have-key-events.md)
- [lit-a11y/heading-has-content](./docs/rules/heading-has-content.md)
- [lit-a11y/iframe-title](./docs/rules/iframe-title.md)
- [lit-a11y/img-redundant-alt](./docs/rules/img-redundant-alt.md)
- [lit-a11y/mouse-events-have-key-events](./docs/rules/mouse-events-have-key-events.md)
- [lit-a11y/no-access-key](./docs/rules/no-access-key.md)
- [lit-a11y/no-autofocus](./docs/rules/no-autofocus.md)
- [lit-a11y/no-distracting-elements](./docs/rules/no-distracting-elements.md)
- [lit-a11y/no-invalid-change-handler](./docs/rules/no-invalid-change-handler.md)
- [lit-a11y/no-redundant-role](./docs/rules/no-redundant-role.md)
- [lit-a11y/role-has-required-aria-attrs](./docs/rules/role-has-required-aria-attrs.md)
- [lit-a11y/role-supports-aria-attr](./docs/rules/role-supports-aria-attr.md)
- [lit-a11y/scope](./docs/rules/scope.md)
- [lit-a11y/tabindex-no-positive](./docs/rules/tabindex-no-positive.md)
