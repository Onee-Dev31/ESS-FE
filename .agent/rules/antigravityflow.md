---
trigger: always_on
---

Antigravity Rule: UI & Logic Connectivity Analysis
Core Instruction: Before modifying UI components, you must perform a "Gravity Walk" across the Triple-Link (HTML, SCSS, TS) to ensure structural integrity.

TS as the Brain (Controller):

Start with the .ts file to identify @Input(), @Output(), and Variables.

Trace where data comes from (Services) and how it’s prepared for the template.

HTML as the Skeleton (Structure):

Read the .html to see how TS variables are bound ({{ data }}).

Identify Event Bindings ((click)) that pull the flow back into the TS logic.

Check for shared components/directives being reused.

SCSS as the Skin (Appearance):

Analyze the .scss to find "Shared Gravity" like global variables, mixins, or design tokens.

Check if styles are scoped or if they inherit from a parent "Gravity" (Global Styles).

Cross-Reference Analysis:

Before making a change, summarize: "If I change this TS variable, it affects these HTML elements and potentially triggers these SCSS states (like [class.active])."

Instruction for AI: Always confirm the relationship between the Logic (TS), Template (HTML), and Style (SCSS) before proposing a UI fix.

