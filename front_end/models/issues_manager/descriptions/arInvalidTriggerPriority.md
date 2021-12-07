# Ensure the "priority" query parameter for an attribution redirect is a valid number

The priority associated with an attribution was defaulted to `0`.
This happens if the `priority` query parameter provided in the `.well-known` redirect is not a
valid 64-bit signed integer.
