# A cross-origin no-cors response cannot be stored as a shared dictionary for future requests without a Cross-Origin-Resource-Policy response header

To store a response from a cross-origin no-cors request as a shared dictionary for future requests, the response must have a `Cross-Origin-Resource-Policy: cross-origin` header. Without it, the response will not be stored as a dictionary.
