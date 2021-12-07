# Ensure the "dedup-key" query parameter for an attribution redirect is a valid number

The dedup key associated with an attribution was defaulted to `null`.
This happens if the `dedup-key` query parameter provided in the `.well-known` redirect is not a
valid 64-bit signed integer.
