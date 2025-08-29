# An `unencoded-digest` header contains a digest with an invalid type.

[`unencoded-digest`](unencodedDigestHeader) headers must be formatted as a
[Dictionary](sfDictionary), wherein each member's label specifies the hashing
algorithm, and the value is a [Byte Sequence](sfByteSequence) containing the
digest. The digest delivered with this response did not deliver the digest as a
byte sequence.

For example, if the body was "Hello, world.":

```
// Correctly formatted header:
Unencoded-Digest: sha-256=:+MO/YqmqPm/BYZwlDkir51GTc9Pt9BvmLrXcRRma8u8=:

// Incorrectly formatted header (quotes rather than colons):
Unencoded-Digest: sha-256="+MO/YqmqPm/BYZwlDkir51GTc9Pt9BvmLrXcRRma8u8="
```
