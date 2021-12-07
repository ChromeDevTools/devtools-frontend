# Ensure the "event-source-trigger-data" query parameter for an attribution redirect is a valid number

The event-source trigger data associated with an attribution was defaulted to `0`.
This happens if the `event-source-trigger-data` query parameter provided in the `.well-known`
redirect is not a valid 64-bit unsigned integer.

Note that even if a valid integer is provided, only the lowest 1-bit of the
`event-source-trigger-data` query parameter is recorded, with a 5% chance of the 1 bit being
noised.
