# Ensure the event source trigger data doesn't exceed the 1-bit limit

The `event-source-trigger-data` query parameter of an attribution redirect was truncated to the lowest 1 bit, because it was exceeding the limit.
Replace the `event-source-trigger-data` parameter with an integer that respects the 1-bit limit, that is a number between 0 and 1.
