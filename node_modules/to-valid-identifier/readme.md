# to-valid-identifier

> Convert a string to a valid [JavaScript identifier](https://developer.mozilla.org/docs/Glossary/Identifier)

## Install

```sh
npm install to-valid-identifier
```

## Usage

```js
import toValidIdentifier from 'to-valid-identifier';

toValidIdentifier('foo');
//=> 'foo'

toValidIdentifier('foo-bar');
//=> 'foo$j$bar'

toValidIdentifier('$');
//=> '$a$'

toValidIdentifier('undefined');
//=> '$_undefined$'
```

## API

### toValidIdentifier(string)

Convert the given string to a valid JavaScript identifier.

Different inputs will always generate unique identifiers.

## Use cases

- **Code Generation:** Automate safe variable naming in scripts, avoiding syntax errors from invalid characters.
- **Compilers/Transpilers:** Essential for non-JavaScript languages compiling to JavaScript, ensuring that identifiers are compliant.
- **Dynamic Function Names:** Generate unique and valid function names from dynamic content such as user inputs or database fields.
- **API Wrappers:** Convert API response properties into valid JavaScript object keys for easier access.
- **Template Processing:** Ensure template placeholders are converted to valid JavaScript identifiers when replaced with dynamic values.

## Related

- [is-identifier](https://github.com/sindresorhus/is-identifier) - Check if a string is a valid JavaScript identifier
