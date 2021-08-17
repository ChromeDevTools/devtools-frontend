# Ensure the trigger data doesn't exceed the 3-bit limit

The `trigger-data` query parameter of an attribution redirect was truncated to the lowest 3 bits, because it was exceeding the limit.
Replace the `trigger-data` parameter with an integer that respects the 3-bit limit, that is a number between 0 and 7.
