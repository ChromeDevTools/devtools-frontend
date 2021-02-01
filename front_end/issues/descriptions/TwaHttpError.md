# Ensure navigation within Trusted Web Activity doesn’t lead to a missing page

Dead link (404 or 5xx status code) encountered when navigating within the verified origin.

In order to provide a seamless experience on par with native apps, it is important for navigations within the verified origin in a Trusted Web Activity not result in broken links or internal errors.

Please make sure your app doesn’t have 404 or 5xx errors, or use a service worker fetch event fallback response to handle the errors.
