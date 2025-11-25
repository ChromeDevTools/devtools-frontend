/**
Convert a string to a valid [JavaScript identifier](https://developer.mozilla.org/docs/Glossary/Identifier).

Different inputs will always generate unique identifiers.

@example
```
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
*/
export default function toValidIdentifier(value: string): string;
