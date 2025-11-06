# Enforces attribute naming conventions

Attributes are always treated lowercase, but it is common to have camelCase
property names. In these situations, an explicit lowercase attribute should
be supplied.

Further, camelCase names should ideally be exposed as kebab-case attributes.

## Rule Details

This rule enforces that all lit properties have equivalent lower case attributes
exposed.

The following patterns are considered warnings:

```ts
// Using decorators:

@property() camelCaseName: string;

// Using a getter:

static get properties() {
  return {
    camelCaseName2: {type: String}
  };
}
```

The following patterns are not warnings:

```ts
@property({attribute: 'camel-case-name'})
camelCaseName: string;

@property({attribute: 'camel-case-other-name'})
camelCaseName: string;

@property()
lower: string;
```

## Options

### `convention`

You can specify a `convention` to enforce a particular naming convention
on element attributes.

The available values are:

- `none` (default, no convention is enforced)
- `kebab`
- `snake`

For example for a property named `camelCaseProp`, expected attribute names are:

| Convention | Attribute            |
|------------|----------------------|
| none       | any lower case value |
| kebab      | camel-case-prop      |
| snake      | camel_case_prop      |

The following patterns are considered warnings with `{"convention": "kebab"}`
specified:

```ts
// Should have an attribute set to `camel-case-name`
@property() camelCaseName: string;

// Attribute should match the property name when a convention is set
@property({attribute: 'camel-case-other-name'})
camelCaseName: string;
```

The following patterns are not warnings with `{"convention": "kebab"}`
specified:

```ts
@property({attribute: 'camel-case-name'})
camelCaseName: string;

@property({attribute: false})
camelCaseName: string;

@property()
lower: string;
```

## When Not To Use It

If you prefer other naming conventions for attributes, this rule should not
be used.
