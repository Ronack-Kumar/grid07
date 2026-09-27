# GRID07 — MASTER FULL-STACK PRODUCT BUILD

You are the primary senior software engineer, AI engineer, product designer, UI/UX designer, and QA engineer responsible for building GRID07 inside this repository.

Your job is NOT merely to redesign the existing project.

Your job is to **build GRID07 into a complete, functional, polished, production-quality application from end to end**.

You have full responsibility for inspecting the existing repository, understanding what already exists, preserving useful implementation, completing missing functionality, building the frontend, implementing the product workflows, integrating the backend, and verifying the finished application.

Do not stop at a mockup.

Do not create fake functionality just to make the UI look complete.

The final result must be a genuinely working GRID07 application.

---

# 1. NON-NEGOTIABLE PRINCIPLE

Before writing code, inspect the entire repository.

The repository is the source of truth for:

- existing architecture
- implemented functionality
- API contracts
- database structure
- existing AI logic
- existing routing logic
- existing frontend
- existing dependencies
- existing configuration
- existing tests
- project documentation

Do not assume the project is empty.

Do not blindly rewrite working code.

Do not blindly preserve broken or obsolete code either.

Determine what should be:

- kept
- improved
- refactored
- completed
- replaced
- removed

Then implement the complete product.

Do not ask me to make architectural decisions that can reasonably be determined by inspecting the project.

---

# 2. WHAT GRID07 IS

GRID07 is an AI-driven system focused on intelligent routing, persona-aware processing, contextual reasoning, and autonomous content generation.

The system should not feel like a generic AI chatbot.

The product should expose the underlying GRID07 intelligence through a coherent application.

The core concepts of GRID07 include:

1. Semantic/persona routing.
2. Embedding-based similarity.
3. Cosine similarity scoring.
4. Threshold-based routing decisions.
5. Autonomous content processing.
6. Search decision-making.
7. Web-search integration where required.
8. Content generation.
9. Context-aware reasoning.
10. Reasoning over the original post/content.
11. Reasoning over comments/context.
12. Reasoning over the latest human response.
13. Prompt-injection defense.
14. Immutable persona/system instructions.
15. Separation between trusted system/persona instructions and untrusted external content.

Inspect the existing repository to determine the exact implementation of these concepts and preserve/improve them.

Do not simplify GRID07 into a generic chatbot.

---

# 3. PRODUCT GOAL

Build GRID07 as a complete application where a user can interact with the system through a polished interface and observe/use the underlying AI pipeline.

The product should make the intelligence understandable.

A user should be able to understand:

- what GRID07 is doing
- why a route was selected
- what context was considered
- whether additional information/search was required
- how the system processed the request
- what response/content was generated
- what safety mechanisms were applied

Where appropriate, expose useful reasoning metadata without exposing private chain-of-thought.

Never expose hidden chain-of-thought, system prompts, API keys, secrets, or protected internal instructions.

Expose **safe, user-facing reasoning summaries and structured decision metadata**, such as:

- selected persona/route
- similarity score
- threshold result
- search required/not required
- sources used
- processing stages
- safety checks
- final result

---

# 4. COMPLETE PRODUCT — NOT JUST FRONTEND

You must implement whatever is necessary for GRID07 to function end-to-end.

This includes, where missing:

- frontend
- backend
- API routes
- services
- database integration
- models
- validation
- error handling
- AI pipeline integration
- routing
- configuration
- state management
- authentication if the existing product requires it
- persistence where appropriate
- testing

Do not create disconnected UI screens that do not work.

Every important interface must connect to real functionality.

If an existing backend capability exists, use it.

If a required backend capability is missing, implement it using the project's architecture and dependencies.

---

# 5. FIRST PHASE — DEEP REPOSITORY ANALYSIS

Before implementing the product, inspect:

- README
- all package files
- frontend source
- backend source
- API routes
- services
- database/schema
- AI/LLM code
- embedding code
- routing code
- search code
- persona definitions
- security logic
- tests
- configuration
- environment examples
- legacy code

Understand the complete execution flow.

Map:

USER INPUT
→ semantic processing
→ embedding/similarity
→ routing
→ context gathering
→ search decision
→ search if required
→ content/reasoning generation
→ safety validation
→ final result

If the actual architecture differs, use the actual architecture rather than forcing this diagram.

---

# 6. SEMANTIC ROUTING SYSTEM

The routing system is a core GRID07 capability.

Build/preserve a robust semantic routing mechanism.

Where applicable:

1. Convert the incoming content/request into an embedding.
2. Compare it against available persona/route representations.
3. Calculate similarity using cosine similarity or the repository's established method.
4. Apply routing thresholds.
5. Select the most appropriate route/persona.
6. Handle low-confidence cases safely.

The UI should be able to display safe routing information such as:

- selected route
- confidence/similarity
- threshold status
- alternative routes where useful
- routing outcome

Do not expose sensitive internal prompts.

---

# 7. PERSONA SYSTEM

Personas/routes should be treated as first-class product concepts where applicable.

Each persona should have:

- identity
- purpose
- behavioral definition
- routing representation
- appropriate constraints
- safe system instructions

Persona instructions must remain protected.

External user content must never be allowed to overwrite or modify trusted persona/system instructions.

Implement strong separation between:

TRUSTED INSTRUCTIONS

and

UNTRUSTED CONTENT.

---

# 8. PROMPT-INJECTION DEFENSE

GRID07 must treat external content as untrusted.

This includes:

- user-generated content
- posts
- comments
- retrieved web pages
- search results
- imported text
- generated content from external sources

Implement/retain defenses against prompt injection.

Look for attempts to:

- override system instructions
- modify persona behavior
- reveal hidden instructions
- reveal secrets
- change security rules
- manipulate routing
- force unsafe actions

Do not rely on a single regex if a stronger architecture is appropriate.

Use layered defenses.

The exact implementation should be determined after inspecting the existing security architecture.

---

# 9. AUTONOMOUS CONTENT ENGINE

Implement the autonomous content workflow where appropriate.

The system should determine:

1. What content/request it received.
2. Which route/persona is appropriate.
3. Whether external information is needed.
4. Whether a search should be performed.
5. What information is relevant.
6. How the information should be incorporated.
7. How the final content should be generated.
8. How the final output should be validated.

The system should not blindly search every time.

It should make an appropriate search/no-search decision.

---

# 10. SEARCH SYSTEM

If search functionality is part of the existing GRID07 design:

Implement a clean search workflow.

The system should:

- determine whether search is necessary
- perform search when required
- collect relevant sources
- normalize useful information
- pass only relevant trusted context into generation
- display sources to the user when appropriate

Do not fabricate search results.

If search is unavailable because required credentials/configuration are missing, provide a clear configuration/error state rather than pretending search occurred.

---

# 11. CONTEXTUAL REASONING

GRID07 must be capable of using contextual information appropriately.

Where applicable, context can include:

- original post/content
- previous comments
- latest human response
- relevant retrieved information
- current request

The system should process context in the correct order and distinguish:

- original content
- historical context
- latest user/human input
- external retrieved information
- trusted system instructions

Do not allow untrusted context to override system-level behavior.

---

# 12. OUTPUT GENERATION

The generated output must be based on:

- selected persona/route
- relevant context
- retrieved information when required
- user intent
- system constraints

Avoid generic AI output.

The result should be appropriate for the selected persona and actual context.

The frontend should make the generated result easy to:

- read
- copy
- regenerate where supported
- inspect
- understand

---

# 13. COMPLETE APPLICATION UX

Build a real application around these capabilities.

Do not make the entire product one giant form.

Design a coherent information architecture.

Depending on the existing functionality, the application should have appropriate areas such as:

- Home
- Workspace
- Routing
- Content generation
- Context/reasoning workspace
- History
- Results
- Personas/routes
- System status
- Settings

Do not add pages merely because this list contains them.

Only create pages that make sense for the actual GRID07 product.

---

# 14. LANDING PAGE

Create an exceptional public-facing landing page.

The landing page should immediately communicate:

- what GRID07 is
- what problem it solves
- how the system works
- why semantic routing/contextual intelligence matters
- what users can do with it

Do not create generic marketing copy.

The copy should accurately describe GRID07.

---

# 15. HERO SECTION

Build a premium hero.

Include:

- GRID07 identity
- strong headline
- concise explanation
- primary CTA
- secondary CTA if appropriate
- interactive product visualization

The hero visualization should represent actual GRID07 architecture.

For example:

INPUT
→ SEMANTIC ROUTER
→ PERSONA
→ CONTEXT
→ SEARCH
→ REASONING
→ OUTPUT

If the actual architecture differs, represent the actual architecture.

---

# 16. HERO VISUAL DESIGN

Make the hero visually impressive.

Use sophisticated visual concepts such as:

- nodes
- connections
- flowing data
- subtle grids
- dynamic system states
- animated routing paths
- contextual panels
- system status indicators

Do not turn it into visual noise.

The animation must communicate the product.

---

# 17. LANDING PAGE SECTIONS

Create appropriate sections explaining the product.

Potential sections include:

- How GRID07 works
- Semantic routing
- Persona intelligence
- Contextual reasoning
- Autonomous search
- Safety/security
- Architecture
- Example workflow
- Product interface preview
- Technical capabilities
- CTA

Only use sections that correspond to real product functionality.

---

# 18. APPLICATION FRONTEND DESIGN

The application UI should feel like a premium AI product.

Do NOT use:

- generic dashboard templates
- excessive cards
- excessive glassmorphism
- random gradients
- excessive neon
- huge meaningless blobs
- unnecessary rounded containers
- childish animations
- generic AI illustrations

Create a distinctive GRID07 identity.

The visual language should communicate:

- intelligence
- routing
- networks
- systems
- context
- precision
- AI infrastructure

---

# 19. DESIGN SYSTEM

Create a reusable design system.

Define:

- colors
- typography
- spacing
- radii
- borders
- shadows
- surfaces
- buttons
- inputs
- cards
- badges
- tabs
- tooltips
- dialogs
- dropdowns
- notifications
- status indicators

Use reusable components.

Do not duplicate styles unnecessarily.

---

# 20. ANIMATIONS

Animations are an important part of the product.

Use purposeful motion throughout the application.

Include where appropriate:

- page transitions
- staggered entrances
- route animations
- flowing connection lines
- hover states
- active states
- loading transitions
- result generation states
- modal transitions
- toast transitions
- navigation transitions

Animations should feel:

- smooth
- fast
- premium
- intentional

Do not animate every element.

Respect:

`prefers-reduced-motion`.

---

# 21. INTERACTIVE AI PIPELINE

Create a visually impressive interactive representation of the GRID07 pipeline.

Users should be able to understand the current processing state.

For example:

Input
↓
Semantic Analysis
↓
Routing
↓
Context
↓
Search
↓
Generation
↓
Validation
↓
Result

Each stage can show:

- pending
- active
- completed
- skipped
- failed

Where appropriate, allow users to inspect safe metadata about a stage.

This should be connected to actual application state rather than being a fake animation.

---

# 22. ROUTING VISUALIZATION

Create an interactive routing visualization where useful.

Show:

- available routes/personas
- selected route
- similarity/confidence
- routing threshold
- selected path

Use animation to make the route understandable.

Do not expose hidden system prompts.

---

# 23. PROCESSING STATES

For AI operations, create excellent processing states.

Instead of simply displaying:

"Loading..."

show contextual states such as:

- Analyzing input
- Evaluating semantic similarity
- Selecting route
- Gathering context
- Deciding whether search is required
- Retrieving information
- Generating response
- Validating output

Only display stages that correspond to actual operations.

Do not fake processing stages.

---

# 24. RESULT EXPERIENCE

Generated results should have a polished presentation.

Include appropriate:

- copy action
- regenerate action
- metadata
- selected persona
- routing information
- sources
- validation status
- timestamp/history if applicable

Make the result easy to understand and interact with.

---

# 25. HISTORY/PERSISTENCE

If the application architecture supports persistence, implement a useful history system.

Allow users to see previous:

- requests
- routes
- generated results
- searches
- sessions

Do not store sensitive information unnecessarily.

Respect existing privacy/security architecture.

---

# 26. RESPONSIVE DESIGN

The entire application must be responsive.

Support:

- desktop
- laptop
- tablet
- mobile

Do not simply shrink the desktop layout.

Create mobile-specific layout behavior where necessary.

Ensure:

- no horizontal overflow
- no clipped content
- usable navigation
- readable typography
- usable forms
- accessible controls
- functional visualizations

---

# 27. ACCESSIBILITY

Implement:

- semantic HTML
- keyboard navigation
- visible focus states
- accessible labels
- correct button semantics
- sufficient contrast
- accessible dialogs
- form labels
- reduced-motion support

Accessibility is part of the implementation, not an optional polish step.

---

# 28. LOADING / EMPTY / ERROR / SUCCESS STATES

Every important asynchronous workflow needs proper UI states.

Implement:

### Loading
Skeletons or meaningful processing UI.

### Empty
Explain what is empty and what the user should do.

### Error
Explain the problem and provide recovery where possible.

### Success
Clearly communicate successful completion.

Never leave users staring at a blank screen.

---

# 29. FRONTEND/BACKEND INTEGRATION

Connect the UI to real APIs.

Do not hardcode fake responses.

Inspect:

- API routes
- request payloads
- response models
- authentication
- validation
- error responses

Build a clean API client/service layer where appropriate.

Handle:

- timeouts
- network failures
- malformed responses
- server errors
- validation failures

---

# 30. DATABASE

If GRID07 requires persistence and the current implementation is incomplete:

Implement the required database functionality using the existing project architecture.

Do not introduce a new database technology without a strong reason.

Create appropriate:

- models
- migrations
- indexes
- relationships
- validation

Avoid storing secrets or unnecessary sensitive data.

---

# 31. SECURITY

Perform a security review while implementing.

Check:

- secrets
- environment variables
- authentication
- authorization
- XSS
- injection
- prompt injection
- unsafe HTML
- unsafe URLs
- user input
- API exposure
- database access
- external content

Use the installed Security Guidance plugin where useful.

Never expose:

- API keys
- hidden system prompts
- private credentials
- internal secrets
- chain-of-thought

---

# 32. PERFORMANCE

Optimize the product.

Avoid:

- unnecessary rerenders
- expensive animation loops
- excessive DOM
- unnecessary API calls
- huge dependencies
- unnecessary client-side computation

Use lazy loading where useful.

Keep animations performant.

---

# 33. DOCUMENTATION

Use Context7 whenever current library/framework documentation is required.

Do not guess APIs when authoritative documentation is available.

Do not perform unnecessary dependency upgrades.

Inspect the existing CLAUDE.md.

If it is missing, create appropriate project instructions containing:

- architecture
- development commands
- conventions
- important constraints
- testing
- environment setup

---

# 34. TESTING

Implement or improve tests for important functionality.

Test:

- routing
- similarity calculations
- threshold behavior
- persona selection
- search decision
- context handling
- prompt-injection defenses
- API endpoints
- validation
- important frontend workflows

Use the project's existing testing framework.

Do not invent a completely new testing stack unless necessary.

---

# 35. REAL BROWSER QA

Use the browser/Playwright capability available through Antigravity.

Actually run the application.

Inspect the rendered UI.

Test:

- landing page
- navigation
- CTA
- workspace
- routing
- generation
- context workflow
- results
- errors
- loading states
- responsive layouts

Do not simply inspect source code and claim the interface works.

If something breaks:

1. reproduce it
2. identify the cause
3. fix it
4. rerun
5. verify again

---

# 36. VISUAL QA

Perform a final visual review.

Look specifically for:

- poor spacing
- weak hierarchy
- inconsistent components
- excessive gradients
- excessive shadows
- bad typography
- alignment issues
- awkward empty areas
- mobile problems
- animation glitches
- poor contrast
- generic/template appearance

If the result looks mediocre, improve it.

Do not settle for the first functional version.

---

# 37. CODE QUALITY

Keep the implementation maintainable.

Avoid:

- giant components
- duplicated logic
- magic numbers
- dead code
- unused dependencies
- unnecessary abstractions
- temporary debug code

Use reusable components where appropriate.

Do not over-engineer.

---

# 38. LEGACY CODE

Inspect legacy code only when necessary to understand historical behavior.

Do not blindly migrate legacy architecture.

Prefer the current architecture unless the legacy implementation contains essential functionality that should be properly reimplemented.

---

# 39. NO FAKE FEATURES

This is critical.

Do NOT create:

- fake API responses
- fake AI results
- fake search results
- fake database records
- fake processing states
- fake analytics
- fake authentication
- fake integrations

If a feature cannot operate because external configuration/credentials are missing:

Implement the feature correctly and provide a clear configuration/error state.

Do not pretend it works.

---

# 40. PRODUCT COHERENCE

Every page must feel like part of the same product.

Maintain consistent:

- typography
- spacing
- colors
- interaction patterns
- animation language
- component styling
- navigation
- terminology

GRID07 should feel like one unified system.

---

# 41. IMPLEMENTATION STRATEGY

Work through the project in this order:

## Phase 1 — Discovery

Inspect the complete repository.

Understand architecture and existing functionality.

## Phase 2 — Architecture

Determine what must be preserved, completed, refactored, or implemented.

## Phase 3 — Backend/Core

Complete missing core functionality required for a working GRID07.

## Phase 4 — Design System

Establish the visual foundation.

## Phase 5 — Application

Build the complete application UI.

## Phase 6 — Landing Page

Build the public-facing product experience.

## Phase 7 — AI Visualizations

Connect routing/context/processing visualizations to real state.

## Phase 8 — Animation

Add purposeful motion and microinteractions.

## Phase 9 — Responsive

Optimize all major screens.

## Phase 10 — Testing

Run tests, type checking, linting, builds.

## Phase 11 — Browser QA

Run the real application and test important workflows.

## Phase 12 — Visual QA

Inspect and polish.

## Phase 13 — Final Cleanup

Remove debug artifacts, dead code and unnecessary dependencies.

---

# 42. IMPORTANT AUTONOMOUS EXECUTION RULE

Do not stop after planning.

Do not stop after creating the UI.

Do not stop after creating the backend.

Do not stop after the first successful build.

Continue until the complete product has been implemented and verified.

When you encounter a problem:

- investigate
- fix
- test
- continue

Do not ask me to manually fix normal implementation problems.

Use your judgment as a senior engineer.

---

# 43. DEFINITION OF DONE

GRID07 is complete only when:

- the application starts successfully
- the frontend works
- backend/API functionality works
- core GRID07 routing works
- semantic similarity works
- persona routing works
- contextual processing works
- search workflow works where configured
- content generation works where configured
- prompt-injection defenses remain active
- trusted persona/system instructions remain protected
- results are presented properly
- important state transitions work
- landing page is complete
- application UI is complete
- responsive design works
- animations work
- accessibility is reasonable
- loading states exist
- error states exist
- empty states exist
- tests/build/type checks pass where applicable
- browser QA has been performed
- obvious UI issues have been fixed
- no fake functionality has been introduced

---

# 44. FINAL REPORT

Only after completing the implementation, provide a concise report containing:

## Implemented

What was built.

## GRID07 Core

What happened to the routing, persona, context, search, generation and security systems.

## Frontend

Pages/components/features implemented.

## Design

Design system, visual identity, animations and responsive behavior.

## Backend

Actual backend/API/database changes.

## Testing

Actual commands executed and their results.

## Browser QA

Actual user flows tested.

## Remaining Issues

Only genuine issues that cannot reasonably be resolved in the current environment.

Do not claim a test passed if you did not run it.

---

# FINAL COMMAND

Now take ownership of GRID07.

Inspect the repository first.

Understand the existing implementation.

Then BUILD the complete product.

Do not merely redesign it.

Do not merely document it.

Do not create a prototype.

Do not create fake functionality.

Implement the actual end-to-end GRID07 system with:

- real functionality
- real integrations
- real routing
- real AI processing
- real frontend
- real application workflows
- premium UI/UX
- exceptional landing page
- sophisticated animations
- responsive design
- accessibility
- security
- testing
- browser verification
- final visual polish

Use the existing repository as the technical source of truth while using this specification as the product and quality target.

Continue working until the definition of done is satisfied.