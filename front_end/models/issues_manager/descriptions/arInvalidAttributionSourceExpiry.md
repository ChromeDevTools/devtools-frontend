# Ensure attribution source expiry is a valid number

The expiry associated with an attribution source was defaulted to 30 days.
This happens if the provided value is not a valid 64-bit signed integer.
