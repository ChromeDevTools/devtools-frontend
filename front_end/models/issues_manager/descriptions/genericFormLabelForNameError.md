# Incorrect use of <label for=FORM_ELEMENT>

The label's for attribute refers to a `form` field by its `name`, not its `id`. This might prevent the browser from correctly autofilling the `form` and a11y from working correctly.

To fix this issue, refer to `form` fields by their `id` attribute.
