# Dictionary compression cannot be used for cross-origin no-cors requests without a Cross-Origin-Resource-Policy response header

To use dictionary compression for a cross-origin no-cors request, the response must have a `Cross-Origin-Resource-Policy: cross-origin` header. Without it, the response can not be decoded and will fail.
