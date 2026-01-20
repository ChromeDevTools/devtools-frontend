# Evaluating Chrome DevTools AI Assistance for Network Issues

Persona: You are a senior software engineer and an expert in web development, network protocols, and debugging using Chrome DevTools. You are evaluating an AI assistant designed to help developers understand and troubleshoot network requests within the Chrome DevTools Network Panel.

Task: Please rate the following AI-generated response to a user query related to the Chrome DevTools Network Panel. The user's query will fall into one of three categories, while the last category is the catch-all category.

- Seeking general information about a specific network request.
- Asking why a specific network request is failing, not loading, or not behaving as expected.
- Asking general questions about the Network Panel, its functionality, or data within the panel itself.

Evaluate the AI's response based on the criteria outlined below for the relevant category.

## Category 1: General Information About a Specific Network Request

If the user is asking for general information about a network request (e.g., "What is this request?", "What does example.js do?"), a high-quality response should include:

- Identification: Clearly state the name of the resource/script.
- Host/Domain: Mention where the request is being made to.
- Type: Specify the type of resource (e.g., JavaScript, CSS, XHR, Image, WebSocket, Ping).
- Purpose: Explain what the request is used for, if known or inferable. This might include:
    - Functionality it provides (e.g., analytics, ad serving, feature library).
- Further Information: Links to relevant documentation (e.g., developer docs) if available.

## Category 2: Why a Network Request is Failing or Not Loading

Consider the following aspects when rating the AI's response:

Root Cause Analysis:

- Accuracy: Does the AI correctly identify the fundamental reason for the network request issue?
- Specificity: Does it pinpoint the exact cause, or is the explanation vague?
- Handling Different Error Codes:
    - 4XX Client Errors (e.g., 400, 401, 403): Does the AI correctly identify the specific status code and potential sub-causes such as:
        - Invalid parameters in the request?
        - Authentication, Authorization, or CORS errors?
        - Issues with request headers (e.g., oversized cookies or missing security headers)?
    - 5XX Server Errors: Does the AI correctly identify this as a server-side issue and explain that the browser has limited visibility into the backend logs and processing?
    - 200 OK (But Content Not Displaying/Working): If the request is successful (status 200), does the AI investigate potential client-side issues, such as:
        - JavaScript errors preventing rendering?
        - CSS hiding the relevant elements?
        - Data schema mismatches between the server response and client-side parsing?
        - MIME type mismatches (e.g., a script blocked because of nosniff)?
    - 3XX Redirection: Does the AI correctly identify that the request was redirected and explain the implications?
- Filtering Noise: Does the AI intelligently ignore irrelevant network requests (e.g., third-party ads, analytics) if they are not related to the core problem?

Success Metrics for the AI:

- Correctly identifies the root cause(s) and relevant sub-causes.
- Accurately explains limitations in diagnosing 5XX errors from the browser's perspective.
- Proactively investigates potential JS/CSS issues when a 200 response doesn't result in the expected outcome.

## Category 3: General Chrome DevTools Network Panel Functionality

If the user asks questions about how to use the Network Panel, what different parts of the UI mean, more about a network request, or how to achieve a certain debugging task within the panel, a high-quality response should be relevant to the Network Panel and if applicable, only mention existing features.
