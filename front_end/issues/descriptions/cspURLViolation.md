# Content Security Policy of your site blocks some resources because their origin is not included in the content security policy header

The Content Security Policy (CSP) improves the security of your site by defining a list of trusted sources and instructs the browser to only execute or render resources from this list. Some resources on your site can’t be accessed because their origin is not listed in the CSP.

To solve this, carefully check that all of the blocked resources listed below are trustworthy; if they are, include their sources in the content security policy of your site. You can set a policy as a HTTP header (recommended), or via an HTML `meta` tag.

⚠️ Never add a source you don’t trust to your site’s Content Security Policy. If you don’t trust the source, consider hosting resources on your own site instead.