# UI/UX Design System — Phantom Code Reviewer (PCR)

## 01. Product Identity

**Product:** PCR : Full form (Phantom Code Reviewer)
**Positioning:** An automated principal-level code review system for GitHub pull requests.

### Core visual idea

The landing page is not a conventional SaaS dashboard shown immediately.
It is a **cinematic visual narrative about the moment a developer realizes something is wrong with their code**.
The experience should feel:

- premium
- cinematic
- editorial
- technically sophisticated
- dark and atmospheric
- intentional
- slightly unsettling, without becoming horror-themed
- handcrafted by a strong product/design team

The visual language should combine:
**editorial typography + cinematic photography/3D imagery + controlled motion + real developer tooling.**
The provided visual references establish the direction:

- dark photographic compositions
- oversized editorial typography
- red/lava lighting
- floating or fractured physical objects
- paper/document fragments
- glass-like shards
- objects moving as the page scrolls
- strong foreground/background depth
- grain/noise used as texture
- visual transitions driven by scroll position

Do not copy the reference websites literally. Recreate the **quality, atmosphere, motion language, composition, and visual confidence** for a code-review product.

---

# 02. Non-Negotiable Anti-AI-Slop Rules

The site must **not** look like an AI-generated landing page.
Avoid visual patterns commonly associated with generic generated websites.

## Never use

- generic SaaS gradients filling the whole screen
- blue/purple neon everywhere
- random glowing blobs
- floating gradient orbs
- decorative 3D shapes with no narrative purpose
- excessive glassmorphism
- every section inside a card
- every element inside rounded containers
- huge `rounded-3xl` panels
- rainbow gradients
- excessive drop shadows
- excessive backdrop blur
- glowing borders on everything
- random particles everywhere
- generic AI robot imagery
- generic cyberpunk imagery
- stock-photo-looking developer scenes
- meaningless statistics
- fake testimonials
- fake logos
- fake terminal output added only for decoration
- excessive badges
- excessive icons
- emoji
- generic illustrations
- bouncy animations
- springy UI for everything
- scroll animation on every tiny element
- constant movement that makes the page tiring
- visual effects that reduce readability
- animation that exists only because Framer Motion is available

### The visual test

The page should communicate:

> **“This is a serious engineering product presented through an art-directed visual experience.”**

It should not communicate:

> **“AI generated a cool-looking SaaS website.”**

---

# 03. Visual Reference Translation

The uploaded references are inspiration for the **visual grammar**, not for literal duplication.

### Reference characteristics to preserve

#### Dark editorial scene

Use deep blacks, muted greens/charcoal, controlled highlights, and strong photographic contrast.

#### Burning / lava transition

The lava-red visual is especially useful for the PCR brand.
Interpret red as:

- danger
- detected defects
- critical review findings
- code instability
- the moment something is wrong

Red should therefore appear progressively rather than permanently dominating the entire website.

#### Paper/document fragments

Use paper-like fragments as a metaphor for:

- pull requests
- changed files
- code diffs
- review comments
- developer work

Fragments can drift, rotate, tear, or move with the scroll.

#### Glass shards

Use transparent/frosted fragments sparingly as transition objects.
They should feel physical and dimensional, not like decorative UI cards.

#### Moving objects

Movement should be attached to the narrative.
Objects can:

- drift vertically
- fall
- rotate slowly
- move toward/away from camera
- split apart
- transition between scenes

Do not randomly animate everything.

---

# 04. Brand Palette

### Base

```
Background Black   #030403
Deep Black         #050706
Surface Black      #0A0C0B
Elevated Surface   #101311
Border             #202523
Primary Text       #F3F5F2
Secondary Text     #A0A6A0
Muted Text         #707770
```

### Functional accent

```
Phantom Lava       #E33B2F
Deep Lava          #8F1812
Hot Highlight     #FF6A3D
Warning Amber      #D89A32
```

### Optional restrained cool accent

```
Phantom Indigo     #6366F1
```

Indigo is secondary.
The identity should **not become a purple SaaS theme**.

### Color principle

Red/lava is a **semantic signal**.
It represents:

- critical issue
- warning
- code failure
- security problem
- review attention

Do not use red simply to decorate ordinary UI.

---

# 05. Typography

Typography is one of the main visual assets.

## Editorial Display

Use an elegant high-contrast serif/editorial face.
Possible direction:

- Instrument Serif
- Cormorant-style editorial serif
- a strong system serif fallback

Use for:

- hero statements
- section titles
- cinematic narrative transitions
- major product statements

The typography should feel **expensive and editorial**, not corporate.

## Interface Typography

Use:

- Geist
- Inter
- SF-style system sans

Use for:

- navigation
- buttons
- metadata
- descriptions
- product UI

## Code Typography

Use:

- JetBrains Mono
- Geist Mono
- equivalent monospace

Use for:

- code
- diffs
- file paths
- line numbers
- issue identifiers

### Rule

Large serif type + compact technical sans/mono should create the visual contrast.
Do not use the serif font everywhere.

---

# 06. Hero — The Core Narrative

The hero should **not begin with a conventional SaaS headline**.
The user should enter a scene.

## Scene 01 — Developer

A developer is lying on grass / an open outdoor surface late at night.
They are coding on a laptop.
The environment is quiet and dark.
The laptop is the strongest light source.
The person should feel like a real developer, not a stock-photo model posing with a laptop.

### Important

The scene should be cinematic and art-directed.
Avoid:

- cliché hoodie hacker imagery
- RGB gaming laptop
- futuristic server-room imagery
- exaggerated cyberpunk aesthetics

---

# 07. Hero Scroll Sequence

The hero is a **scroll-driven visual narrative**.
Scrolling should move the story forward.
The page should feel almost like a film.

## Phase A — Calm

The developer is coding.
Laptop is visible.
Subtle environmental movement.
Minimal copy.
Possible editorial copy:

> **You wrote the code.**

Then:

> **You ran it.**

The result appears to take slightly too long.

---

## Phase B — Something Is Wrong

The user scrolls.
The developer waits.
A subtle loading/progress state appears on the laptop.
Nothing happens.
The atmosphere becomes slightly darker.
Sound is NOT required.
Motion should communicate anticipation.
Possible copy:

> **Something is taking too long.**

---

## Phase C — Error

The developer closes their eyes briefly.
The environment transitions toward darkness.
The normal scene disappears.
The screen remains visible for a moment.
Then:

```
RUN FAILED

SyntaxError
Unexpected token '}'

AuthService.java
Line 84
```

A small warning indicator appears on the laptop.
The warning must look like a real developer-tool warning, not a giant red sticker.

---

# 08. Phase D — The Fall

As the user continues scrolling:

- the camera feels as if it is falling
- the developer disappears into darkness
- the laptop remains a visual anchor
- surrounding objects drift away
- paper/code fragments begin appearing
- glass fragments begin entering the scene

The transition must be slow enough to understand.
Do not make it feel like a random animation.

---

# 09. Phase E — Lava Emerges

At first, almost complete darkness.
Then a faint red glow appears.
It grows gradually.
The environment begins revealing itself through **Phantom Lava light**.
The red is not a flat background.
It should behave like:

- reflected light
- smoke-lit atmosphere
- distant heat
- glowing cracks
- illuminated fragments

The user should feel that they are entering the internal world of a failing codebase.

---

# 10. Phase F — The Code Review Reveal

As the fall continues, the laptop screen becomes clearer.
A real review finding appears:

```
SECURITY REVIEW

AuthService.java:84

Potential authentication bypass

Severity
HIGH
```

Then:

```
Logic Agent
The branch can be bypassed when...
```

Then another issue can appear.
The important point:
**the product is revealed through the narrative.**
Do not immediately dump the complete dashboard UI into the hero.

---

# 11. Hero Messaging

The narrative should eventually resolve into a clear product statement.
Possible direction:

> **Your code can fail quietly.**
> **Your reviewer shouldn't.**

Alternative:

> **Before your code reaches production,**
> **let Phantom find what you missed.**

Keep the copy sharp.
Avoid generic phrases such as:

- “Supercharge your development”
- “Unlock the power of AI”
- “Revolutionize your workflow”
- “Next-generation code intelligence”

The copy should sound like a serious engineering product.

---

# 12. Hero CTA

Primary CTA:
**Connect GitHub**
Secondary:
**See how it works**
CTA styling:

- compact
- high contrast
- controlled radius
- subtle hover movement
- no giant glow
- no oversized pill

The GitHub action must feel like an actual product action.

---

# 13. Navigation

Navigation should stay restrained.

### Desktop

Left:
**PHANTOM**
or the PCR mark.
Center:

- Product
- Agents
- How it works

Right:

- Sign In
- Connect GitHub

The navbar may use a subtle translucent surface.
But:
**Do not turn it into a giant glass capsule.**
Use a thin backdrop/surface treatment with minimal blur.

---

# 14. Scroll Architecture

The landing page should be divided into **visual chapters**.
Suggested structure:

```
Chapter 01 — The Developer
Chapter 02 — The Failure
Chapter 03 — The Fall
Chapter 04 — The Review
Chapter 05 — Four Agents
Chapter 06 — From PR to Approval
Chapter 07 — Connect GitHub
```

Scrolling should act as the transition mechanism.

### Important

Scroll-driven animation is allowed because it is part of the narrative.
But it must be technically disciplined.
Do not use:

- dozens of simultaneous transforms
- heavy DOM effects
- continuous expensive blur
- complex scroll calculations on every element
- long chains of dependent animations

Prefer:

- CSS transforms
- `requestAnimationFrame` where appropriate
- Framer Motion only where useful
- transform/opacity-based transitions
- GPU-friendly animation properties

---

# 15. Motion Principles

Motion should feel **cinematic and weighted**, not playful.

### Good

- slow object drift
- controlled camera movement
- opacity fades
- subtle scale
- rotation of physical fragments
- parallax depth
- scene transitions
- progressive light changes

### Bad

- bounce
- elastic scaling
- aggressive spring motion
- spinning cards
- random floating icons
- endless particles
- exaggerated mouse-follow effects

### Timing

Prefer:

```
150–250ms
```

for normal UI interaction.
Use longer cinematic durations only for the hero narrative.

---

# 16. 3D / Physical Imagery

3D visuals are welcome **when they belong to the story**.
Appropriate:

- realistic laptop
- paper/code sheets
- glass fragments
- subtle environmental objects
- cinematic atmospheric geometry
- physical-looking code artifacts

Avoid:

- generic floating cubes
- glowing wireframe spheres
- arbitrary 3D blobs
- crypto-looking objects
- sci-fi holograms

Everything needs a reason to exist.

---

# 17. Texture & Grain

A controlled amount of film grain/noise can be used.
Purpose:

- unify generated/photographic assets
- create cinematic texture
- reduce sterile digital appearance

Keep grain subtle.
Never make the page look dirty or low-resolution.

---

# 18. AI Image Generation / Asset Direction

When generating hero assets, prioritize:

- cinematic photography
- physically believable lighting
- realistic materials
- natural human anatomy
- realistic laptop hardware
- strong composition
- shallow/deep depth as appropriate
- controlled color grading
- dark environments
- editorial art direction

Avoid obvious AI artifacts:

- distorted hands
- impossible laptops
- unreadable fake UI text
- extra limbs
- floating objects with impossible physics
- plastic-looking people
- excessive HDR
- overly smooth CGI surfaces

For code/text visible inside imagery, prefer rendering the actual code/UI in HTML/CSS over embedding text into a generated image.

---

# 19. AI Agent Section

After the cinematic introduction, transition into the actual product.

## Four agents

```
Logic
Syntax
Performance
Security
```

Each represents a real analysis capability.

### Presentation

Use a refined 2×2 grid.
Cards should feel like **product modules**, not decorative tiles.
Each card contains:

- agent name
- concise explanation
- realistic example
- severity/result
- subtle icon

### Example

```
SECURITY AGENT

Authentication bypass

HIGH

AuthService.java:84

The branch can be reached
without validating the token.
```

Keep the cards visually quiet.
Let the content do the work.

---

# 20. Code Review Product UI

The actual review interface is more important than the landing-page spectacle.
The dashboard should feel like a serious developer tool.

### Visual hierarchy

```
Repository
↓
Pull Request
↓
Changed Files
↓
Code Diff
↓
Findings
↓
Explanation
↓
Suggested Fix
```

Use:

- compact spacing
- thin dividers
- monospace code
- readable line numbers
- inline annotations
- clear severity
- restrained color

Do not put every finding into a giant rounded card.

---

# 21. Code Diff Style

Example:

```
- if (user != null) {
-     authorize(user);
- }

+ if (request != null) {
+     process(request);
+ }
```

Finding:

```
SECURITY AGENT
Authorization check removed from execution path.

Severity: HIGH
```

The review UI should look believable enough that a developer could imagine using it every day.

---

# 22. Glassmorphism Rules

Glass effects are allowed only where they serve the composition.
Use:

- subtle transparency
- low blur
- thin borders
- restrained highlights

Good use:

- navigation
- modal
- floating control
- physical glass fragment
- focused overlay

Bad use:

- entire page
- every card
- every button
- every section

The visual identity should survive even without blur.

---

# 23. Corner Radius System

Use a restrained radius language.

```
Small controls      6–8px
Cards               10–14px
Large panels        14–18px
Pills               only when semantically appropriate
```

Do not use large rounded corners on everything.
The product should feel technical and precise.

---

# 24. Borders and Shadows

Borders:

- low contrast by default
- slightly stronger on interaction
- accent only for important states

Shadows:

- soft
- subtle
- physically plausible

Do not use glowing borders as a substitute for hierarchy.
Hierarchy should come from:

1. typography
2. spacing
3. contrast
4. composition
5. surfaces
6. borders

---

# 25. Performance & Latency

This is a major requirement.
The cinematic design must **not make the product feel slow**.

### Avoid

- giant unoptimized videos
- massive background images
- unnecessary WebGL
- continuous high-cost blur
- constant particle simulation
- large canvas renders when CSS is sufficient
- layout-triggering animations
- expensive scroll event handlers
- unnecessary client-side libraries

### Prefer

- optimized WebP/AVIF assets
- lazy loading
- responsive image sizes
- transform/opacity animation
- code splitting
- progressive asset loading
- placeholder/skeleton where genuinely useful

### Perceived performance

Every interaction should acknowledge instantly.
For example:

```
Click
↓
Immediate visual feedback
↓
Loading state
↓
Progress
↓
Result
```

Never make the interface appear frozen.

---

# 26. Reduced Motion

Respect:

```
prefers-reduced-motion
```

When reduced motion is requested:

- disable cinematic camera movement
- reduce parallax
- remove large transforms
- retain opacity transitions where useful
- keep all functionality available

---

# 27. Responsive Design

Desktop can carry the full cinematic experience.
Mobile should preserve the narrative rather than blindly shrinking desktop.

### Mobile adjustments

- simplify the scene composition
- reduce moving objects
- reduce simultaneous parallax layers
- keep typography controlled
- move code panels into readable stacked layouts
- preserve the hero story
- avoid horizontal overflow

Do not make mobile feel like a broken desktop version.

---

# 28. Technical Implementation Direction

Preferred frontend stack:

```
React
TypeScript
Tailwind CSS
Framer Motion
```

Possible supporting tools where genuinely useful:

- Lenis for smooth scrolling, only if performance remains strong
- Three.js / WebGL only when the visual result genuinely requires it
- CSS 3D transforms for lightweight physical motion

Do not add libraries merely because they are popular.

---

# 29. Asset Strategy

Separate:

### Generated visual assets

Used for:

- cinematic hero scenes
- environmental imagery
- physical objects
- atmospheric backgrounds

### Real UI

Implemented directly in:

- HTML
- React
- CSS
- SVG

Do not bake the entire website into images.
The laptop screen can use generated imagery as a base scene, but the actual code/error UI should preferably be rendered as live HTML on top.

---

# 30. Interaction Details

Small interactions should feel precise.
Examples:

### Connect GitHub

Hover:

- slight surface lift
- tiny brightness change

Click:

- immediate pressed state
- loading indicator

### Review Finding

Hovering a finding:

- highlight related code lines
- reveal concise explanation
- avoid huge expansion animations

### Navigation

Use quick, quiet transitions.
Never make the interface wait for animation before performing the action.

---

# 31. Content Discipline

Keep copy concise.
Avoid:

- giant marketing paragraphs
- empty motivational language
- generic AI claims
- fake technical jargon
- repetitive descriptions

Every sentence should explain:

- what PCR does
- why it matters
- what it detected
- what the user can do next

---

# 32. Landing Page Conversion & Auth Flow

The landing page should have **multiple natural conversion points**, but never feel like a sales funnel.

## CTA Placement

### 1. Navigation

Persistent:
- `Sign In`
- `Connect GitHub`

### 2. Hero

Primary:
**Review my code**

Secondary:
**See how it works**

### 3. After the first meaningful review reveal

Once the user has seen a realistic finding:

**Review this PR**

This is the strongest mid-page conversion point because the user has now seen the product value.

### 4. After Four Agents

Use a quieter CTA:

**See a real review**

This should continue the product narrative rather than interrupt it.

### 5. Final section — after the complete scroll narrative

Do not abruptly end the page.

Use a dedicated final conversion scene:

> **Before your code reaches production,**
> **let Phantom find what you missed.**

Primary:
**Get started**

Secondary:
**Sign In**

Then:
**Connect GitHub**

## Final Auth Rule

Every conversion CTA should resolve intelligently:

```text
User clicks CTA
       ↓
Authenticated?
   ┌───┴────┐
  No       Yes
  ↓          ↓
Sign In /   GitHub connected?
Register      ┌───┴────┐
              No       Yes
              ↓          ↓
         Connect GitHub  Review flow
```

The authentication UI may open as a modal or dedicated route, but it must feel like part of the product rather than an unrelated external page.

After successful authentication, return the user to the action they originally requested. Do not make them manually repeat the CTA.

## CTA Discipline

Do not place a CTA in every section.

Recommended meaningful conversion points:
- Hero
- First real review finding
- Final section

The navigation provides persistent access to authentication.

---

# 34. Final Quality Gate

Before shipping the landing page, check all of these:

### Visual

- Does it feel art-directed?
- Does the imagery feel physical and believable?
- Is the red/lava progression meaningful?
- Are the objects moving for a reason?
- Is typography doing real visual work?
- Does the design still feel premium without glow?

### AI-Slop

- Are there random blobs?
- Too many gradients?
- Too many cards?
- Too many rounded containers?
- Too much glass?
- Too much purple?
- Too many icons?
- Too much animation?
- Any generic AI-looking imagery?
- Any meaningless UI?

If yes, remove it.

### Product

- Does the actual code review UI feel credible?
- Can a developer understand the product within seconds after the cinematic intro?
- Are severity and findings immediately understandable?
- Does GitHub connection feel like a real action?

### Performance

- Does scrolling remain smooth?
- Does the page respond instantly to interaction?
- Are heavy assets lazy-loaded?
- Is animation GPU-friendly?
- Does mobile remain usable?

---

# 33. Final Creative Direction

**Do not build a “cool AI website.”**
Build a **premium developer product with an art-directed cinematic introduction**.
The visual progression should feel like:

```
Developer
    ↓
Code
    ↓
Waiting
    ↓
Failure
    ↓
Darkness
    ↓
Fall
    ↓
Lava
    ↓
Warning
    ↓
Phantom
    ↓
Code Review
    ↓
Four Agents
    ↓
Trust
    ↓
Connect GitHub
```

The website should feel memorable because of **story, composition, typography, imagery, materiality, motion, and restraint**.
Not because of generic AI visual effects.

---

# 36. Implementation Sanity Check

The design is intentionally ambitious, but the implementation must remain realistic.

## What is realistic

- React + TypeScript + Tailwind
- Framer Motion for controlled transitions
- CSS transforms and opacity for most motion
- HTML/CSS-rendered code UI over cinematic imagery
- Lazy-loaded visual assets
- Responsive mobile simplification
- GitHub OAuth / App authorization as the real product connection
- Auth state determining CTA behavior

## What should not become a requirement

- Full 3D/WebGL for every chapter
- A physically simulated environment
- Frame-by-frame rendering of an entire movie
- Large background videos as the default implementation
- Dozens of independently animated DOM elements
- Authentication hidden behind multiple marketing steps

## Product priority

When visual complexity conflicts with product usability:

**Product action > readability > performance > cinematic effect.**

The cinematic layer introduces the product.
The actual review experience earns trust.
The CTA moves the user into the product with minimal friction.
