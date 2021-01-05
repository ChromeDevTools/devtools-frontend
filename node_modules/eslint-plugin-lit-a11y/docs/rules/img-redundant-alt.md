# img-redundant-alt

Enforce img alt attribute does not contain the words image, picture, or photo. Screenreaders already announce img elements as an image. There is no need to use words such as image, photo, and/or picture.

## Rule Details

This rule takes one optional object argument of type object:

```json
{
  "rules": {
    "lit-a11y/img-redundant-alt": [
      2,
      {
        "words": ["Bild", "Foto"]
      }
    ]
  }
}
```

For the `words` option, these strings can be used to specify custom words that should be checked for in the alt prop, including `image`, `photo`, and `picture`. Useful for specifying words in other languages.

The rule will first check if `aria-hidden` is true to determine whether to enforce the rule. If the image is hidden, then rule will always succeed.

Examples of **incorrect** code for this rule:

```js
html` <img src="foo" alt="Photo of foo being weird." /> `;
html` <img src="foo" alt="Image of me at a bar!" /> `;
html` <img src="foo" alt="Picture of baz fixing a bug." /> `;
```

Examples of **correct** code for this rule:

```js
html` <img src="foo" alt="Foo eating a sandwich." /> `;
html` <img src="bar" aria-hidden alt="Picture of me taking a photo of an image" /> `; // Will pass because it is hidden.
html` <img src="baz" alt=${`Baz taking a ${photo}`} /> `; // This is valid since photo is a variable name.`
```

## Further Reading

- [WebAIM, Alternative Text](https://webaim.org/techniques/alttext/)
