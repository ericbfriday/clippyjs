# @clippyjs/browser-parser

Browser page parsing utilities for ClippyJS Browser Assistant.

Extracts structured data from web pages including DOM elements, accessibility trees, forms, and navigation context.

Implementation in progress.

## FormAnalyzer

`FormAnalyzer` (in `src/interaction/form-analyzer.ts`) extracts form structure from the page and tags each analyzed form with a unique ID:

- IDs are generated with `crypto.randomUUID()` and use the format `form-<uuid>`.
- Note: `crypto.randomUUID()` is only exposed by browsers in secure contexts (HTTPS or `localhost`); it is unavailable on pages served over plain HTTP from other hosts.
