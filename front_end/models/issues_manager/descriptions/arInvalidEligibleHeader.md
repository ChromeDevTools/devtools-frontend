# Ensure that the `Attribution-Reporting-Eligible` header is valid

This page sent a request containing an `Attribution-Reporting-Eligible` header,
but the header value was not a valid structured dictionary, causing any source
or trigger registration in the response to be ignored.

The header should contain a structured dictionary as follows:

To allow the response to register an event source:
`Attribution-Reporting-Eligible: event-source`

To allow the response to register a trigger:
`Attribution-Reporting-Eligible: trigger`

To allow the response to register an event source or a trigger:
`Attribution-Reporting-Eligible: event-source, trigger`

To prevent the response from registering anything:
`Attribution-Reporting-Eligible: `
