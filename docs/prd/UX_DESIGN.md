# UX Design Document
# ClippyJS Browser-Based AI Assistant

**Version:** 1.0.0
**Date:** February 2026
**Status:** Draft

---

## Design Philosophy

### Core Principles

1. **Nostalgic but Modern**: Evokes classic Clippy charm with contemporary polish
2. **Helpful, Not Annoying**: Proactive assistance that respects user agency
3. **Contextually Aware**: Actions and suggestions relevant to current page/user state
4. **Accessible by Default**: WCAG 2.1 AA compliant from day one
5. **Performant**: Lightweight, fast, no perceived impact on page performance

---

## Visual Design

### Character Design

The Clippy character should feel familiar but refreshed:

| Element | Classic | Modern Interpretation |
|---------|---------|----------------------|
| Shape | Wire paperclip | Same iconic shape with subtle 3D depth |
| Eyes | Large, expressive | Same, with anti-aliased rendering |
| Animation | Sprite-based | Smooth CSS/SVG animations |
| Size | ~100x100px | Responsive: 60-120px based on viewport |
| Color | Metallic silver/gray | Theme-aware (light/dark mode) |

### Agent Variants

All classic agents available with updated styling:

```
┌─────────────────────────────────────────────────────────────┐
│  Clippy          Bonzi          Merlin         Rover       │
│  ┌───┐          ┌───┐         ┌───┐         ┌───┐         │
│  │ ○ │          │ ○ │         │ ○ │         │ ○ │         │
│  │ ○ │          └───┘         └───┘         └───┘         │
│  └───┘          Purple         Wizard         Dog          │
│  Paperclip      Gorilla         Hat           Brown        │
└─────────────────────────────────────────────────────────────┘
```

### Color Palette

#### Light Theme
```
Primary:        #0078D4 (Microsoft Blue)
Secondary:      #FFD700 (Classic Gold - highlights)
Background:     #FFFFFF
Surface:        #F5F5F5
Text Primary:   #1A1A1A
Text Secondary: #666666
Accent:         #107C10 (Success Green)
Warning:        #FFB900 (Caution Yellow)
Error:          #D13438 (Alert Red)
```

#### Dark Theme
```
Primary:        #60CDFF (Light Blue)
Secondary:      #FFD700 (Classic Gold)
Background:     #1A1A1A
Surface:        #2D2D2D
Text Primary:   #FFFFFF
Text Secondary: #B3B3B3
Accent:         #6BB700 (Success Green)
Warning:        #FFB900 (Caution Yellow)
Error:          #FF6B6B (Alert Red)
```

### Typography

```
Font Family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             Roboto, Oxygen-Sans, Ubuntu, sans-serif

Headings:    Semi-bold (600)
Body:        Regular (400)
Captions:    Regular (400), smaller size

Chat Input:  16px (prevents iOS zoom on focus)
Chat Text:   14-16px
Balloon:     13-14px
```

---

## UI Components

### 1. Agent Display

#### Idle State

```
┌─────────────────────────────────┐
│                                 │
│     [Viewport/Content]          │
│                                 │
│                                 │
│                      ┌───┐      │
│                      │ ○ │  ← Agent in corner
│                      │ ○ │     │
│                      └───┘      │
│                                 │
└─────────────────────────────────┘
```

**Behavior:**
- Idle animation every 30-60 seconds (stretch, blink, look around)
- Subtle bounce when user hovers
- No text bubble in idle state (minimal intrusion)

#### Active State (Chat Panel Open)

```
┌─────────────────────────────────┐
│                                 │
│     [Viewport/Content]          │
│                                 │
│                      ┌────────────────┐
│                      │     Chat       │
│                      │    Panel       │
│                      │                │
│                      │ ┌────────────┐ │
│                      │ │ Type here  │ │
│                      │ └────────────┘ │
│                      └────────────────┘
│                      ┌───┐              │
│                      │ ○ │ ← Agent      │
│                      └───┘   positioned │
│                              near panel │
└─────────────────────────────────┘
```

### 2. Chat Panel

#### Design Specifications

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐   │
│  │ ○ Clippy                    ✕ │   │  ← Header (40px)
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │   [Conversation History]        │   │  ← Messages area
│  │                                 │   │     (flexible height)
│  │   User: How do I...            │   │
│  │                                 │   │
│  │   ┌─────────────────────┐     │   │
│  │   │ Clippy response...  │     │   │
│  │   └─────────────────────┘     │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔘  Type your message...    ➤  │   │  ← Input area (48px)
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘

Width: 320-380px (responsive)
Max Height: 500px
Border Radius: 16px
Shadow: 0 8px 32px rgba(0,0,0,0.12)
```

#### Message Bubbles

**User Message:**
```
┌──────────────────────────────┐
│ How do I fill out this form? │  ← Aligned right
└──────────────────────────────┘     Background: Primary color
                                     Text: White
                                     Border Radius: 16px 16px 4px 16px
```

**Assistant Message:**
```
┌──────────────────────────────────────────────┐
│ I can help you with that! This form has 5    │
│ required fields. Let me highlight them for   │
│ you...                                       │
│                                              │
│ ┌────────────┐ ┌────────────┐               │
│ │ Highlight  │ │ Explain    │               │  ← Action buttons
│ │ Fields     │ │ Required   │               │
│ └────────────┘ └────────────┘               │
└──────────────────────────────────────────────┘
  Background: Surface color
  Text: Primary text color
  Border Radius: 16px 16px 16px 4px
```

### 3. Speech Balloon

#### Standard Balloon

```
         ◄── Agent position
        ╱
       ╱
┌──────────────────────────────┐
│                              │
│  It looks like you're        │
│  writing a letter. Would     │
│  you like help?              │
│                              │
│  ┌────────┐ ┌────────────┐  │
│  │  Yes   │ │ No thanks  │  │
│  └────────┘ └────────────┘  │
│                              │
└──────────────────────────────┘
```

#### Balloon Variants

| Type | Use Case | Actions |
|------|----------|---------|
| **Question** | Yes/No prompts | Yes, No |
| **Help Offer** | Proactive assistance | Accept, Dismiss, Later |
| **Notification** | Information only | OK, Got it |
| **Error** | Something went wrong | Retry, Report, Dismiss |
| **Tip** | Contextual tip | Try it, Got it |

### 4. Quick Actions Menu

```
                    ┌───┐
                    │ ○ │  ← Click on Clippy
                    └───┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  What can I do here?    │  ← Frequently used actions
         │  ─────────────────────  │
         │  ❓ What's on this page? │
         │  📝 Help with form       │
         │  🔍 Find something       │
         │  💡 Give me a tip        │
         │  ─────────────────────  │
         │  ⚙️ Settings             │
         └─────────────────────────┘
```

---

## Animations

### Entrance Animation

```
Frame 1-10:  Slide up from bottom-right
Frame 11-20: Stretch animation (excited to appear)
Frame 21-30: Settle into idle pose
Frame 31+:   Subtle idle animation
```

### Idle Animations

| Animation | Duration | Frequency | Description |
|-----------|----------|-----------|-------------|
| Blink | 150ms | Random 3-8s | Quick eye blink |
| Look Around | 1s | Random 15-30s | Eyes scan left/right |
| Stretch | 800ms | Random 30-60s | Full body stretch |
| Bounce | 400ms | On hover | Excited bounce |
| Think | 2s | When processing | Thoughtful pose with balloon |

### Transition Animations

| Transition | Duration | Easing |
|------------|----------|--------|
| Show/Hide Chat Panel | 250ms | ease-out |
| Balloon Appear | 200ms | spring(0.8) |
| Balloon Dismiss | 150ms | ease-in |
| Position Move | 300ms | ease-in-out |
| Theme Change | 200ms | linear |

### Motion Preferences

```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  .clippy-agent,
  .clippy-balloon,
  .clippy-panel {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## Responsive Design

### Breakpoints

| Viewport | Agent Size | Chat Panel | Position |
|----------|------------|------------|----------|
| Mobile (< 480px) | 48px | Full-width bottom sheet | Fixed |
| Tablet (480-768px) | 64px | 320px width | Fixed |
| Desktop (768-1200px) | 80px | 360px width | Fixed |
| Large (> 1200px) | 100px | 380px width | Draggable |

### Mobile Layout

```
┌─────────────────────────────┐
│                             │
│   [Page Content]            │
│                             │
│                             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │   Chat Panel            │ │  ← Bottom sheet
│ │   (Full Width)          │ │     Swipe down to dismiss
│ │                         │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ Type message...     │ │ │
│ │ └─────────────────────┘ │ │
│ └─────────────────────────┘ │
│  ┌──┐                       │
│  │○ │ ← Small agent         │
│  └──┘   indicator           │
└─────────────────────────────┘
```

### Desktop Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   [Page Content - Full Width]                           │
│                                                         │
│                                                         │
│                                      ┌────────────────┐ │
│                                      │   Chat Panel   │ │
│                                      │                │ │
│                                      │                │ │
│                                      └────────────────┘ │
│                                      ┌───┐              │
│                                      │ ○ │              │
│                                      └───┘              │
└─────────────────────────────────────────────────────────┘
```

---

## Accessibility

### Focus Management

```
1. Tab to Clippy Agent → Focus ring appears
2. Enter/Space → Opens chat panel, focus moves to input
3. Tab → Cycles through panel elements
4. Escape → Closes panel, returns focus to agent
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus to next element |
| Shift+Tab | Move focus to previous element |
| Enter | Activate focused element |
| Space | Activate focused element |
| Escape | Close panel/balloon |
| Arrow Up | Scroll chat history up |
| Arrow Down | Scroll chat history down |

### Screen Reader Announcements

```html
<!-- Region landmarks -->
<div role="region" aria-label="Clippy Assistant">
  <div role="button" aria-label="Open Clippy chat" tabindex="0">
    <!-- Agent -->
  </div>
</div>

<!-- Chat panel -->
<div role="dialog" aria-label="Clippy chat">
  <div role="log" aria-live="polite" aria-label="Chat messages">
    <!-- Messages -->
  </div>
  
  <input 
    type="text" 
    aria-label="Type your message"
    placeholder="Type your message..."
  />
</div>

<!-- Proactive suggestion -->
<div role="alert" aria-live="assertive">
  It looks like you're having trouble. Would you like help?
</div>
```

### Color Contrast

All text meets WCAG AA requirements:
- Large text (18px+): 3:1 minimum
- Normal text: 4.5:1 minimum
- Interactive elements: 3:1 for UI components

---

## Interaction States

### Agent States

| State | Visual | Behavior |
|-------|--------|----------|
| **Idle** | Neutral pose | Periodic idle animations |
| **Hover** | Slight bounce, eyes follow cursor | Tooltip shows "Chat with Clippy" |
| **Active** | Attentive pose | Connected to chat panel |
| **Thinking** | Thoughtful pose, thinking animation | Processing user message |
| **Speaking** | Animated, balloon visible | Delivering response |
| **Alerting** | Attention-getting animation | Proactive suggestion |
| **Minimized** | Small, corner position | Reduced visual footprint |

### Button States

```
┌──────────────┐
│    Default   │  ← Normal state
└──────────────┘

┌──────────────┐
│ ▶  Hover  ◀  │  ← Hover: Slight lift, border highlight
└──────────────┘

┌──────────────┐
│   [Focus]    │  ← Focus: 2px outline ring
└──────────────┘

┌──────────────┐
│   Pressed    │  ← Active: Slight indent
└──────────────┘

┌──────────────┐
│   Loading... │  ← Loading: Spinner, disabled
└──────────────┘

┌──────────────┐
│   Disabled   │  ← Disabled: 50% opacity
└──────────────┘
```

---

## User Flows

### Flow 1: First-Time User Experience

```
1. Page loads → Clippy appears in corner (idle)
2. After 30s idle OR user activity → Clippy speaks:
   "Hi! I'm Clippy. I can help you with this page. Click me anytime!"
3. User clicks Clippy → Chat panel opens
4. Clippy greets: "Hello! What would you like help with today?"
5. Quick actions shown → User selects or types question
6. Response delivered → Suggestions for next steps
```

### Flow 2: Proactive Form Assistance

```
1. User navigates to form-heavy page
2. Clippy detects forms, waits for user interaction
3. User focuses on first field, then hesitates (>15s without input)
4. Clippy appears with balloon:
   "This form has 5 required fields. Would you like me to guide you through it?"
5. User clicks "Yes" → Clippy highlights first required field
6. "Start with your email address here. This will be used for..."
7. User completes field → Clippy moves to next field
8. Continue until form complete or user dismisses
```

### Flow 3: Page Navigation Help

```
1. User is on e-commerce product page
2. User asks: "Where can I find similar products?"
3. Clippy analyzes page → Identifies "Related Products" section
4. Clippy responds: "I found a 'Related Products' section below. 
   Would you like me to scroll there?"
5. User confirms → Clippy scrolls smoothly to section
6. Section highlighted briefly → "Here are similar products!"
```

### Flow 4: Error Recovery

```
1. User submits form → Validation error occurs
2. Clippy detects error state → Balloon appears:
   "Oops! It looks like something went wrong. 
   The email field needs a valid email address."
3. Error field highlighted → Clippy points to it
4. User corrects → Clippy: "That looks better! Try submitting again."
```

---

## Settings & Preferences

### Settings Panel

```
┌─────────────────────────────────────┐
│  ⚙️ Clippy Settings                 │
├─────────────────────────────────────┤
│                                     │
│  Agent                              │
│  ┌─────────────────────────────┐   │
│  │ Clippy  ▼                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Behavior                           │
│  ┌─────────────────────────────┐   │
│  │ Proactive Assistance: ON    │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Intrusion Level: Medium  ▼  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Appearance                         │
│  ┌─────────────────────────────┐   │
│  │ Theme: Auto  ▼              │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Position: Bottom Right  ▼   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Privacy                            │
│  ┌─────────────────────────────┐   │
│  │ Allow page context: ON      │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Save conversation: ON       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     Clear History           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─────────────────────────────────  │
│  Version 1.0.0 • Privacy Policy     │
└─────────────────────────────────────┘
```

---

## Error States

### Network Error

```
┌────────────────────────────────────┐
│  ⚠️ Connection Issue               │
│                                    │
│  I'm having trouble connecting     │
│  right now. Please check your      │
│  internet connection.              │
│                                    │
│  ┌────────────┐ ┌──────────────┐  │
│  │   Retry    │ │  Dismiss     │  │
│  └────────────┘ └──────────────┘  │
└────────────────────────────────────┘
```

### Rate Limited

```
┌────────────────────────────────────┐
│  ⏳ Please Wait                    │
│                                    │
│  I've reached my limit for now.    │
│  Please try again in a few         │
│  minutes.                          │
│                                    │
│  ┌────────────┐                   │
│  │    OK      │                   │
│  └────────────┘                   │
└────────────────────────────────────┘
```

### Permission Denied

```
┌────────────────────────────────────┐
│  🔒 Permission Required            │
│                                    │
│  To help you better, I need        │
│  permission to understand this     │
│  page.                             │
│                                    │
│  ┌────────────────────────────┐   │
│  │   Grant Permission         │   │
│  └────────────────────────────┘   │
│  ┌────────────────────────────┐   │
│  │   Continue Limited         │   │
│  └────────────────────────────┘   │
└────────────────────────────────────┘
```

---

## Design Tokens

```css
/* Spacing */
--clippy-spacing-xs: 4px;
--clippy-spacing-sm: 8px;
--clippy-spacing-md: 16px;
--clippy-spacing-lg: 24px;
--clippy-spacing-xl: 32px;

/* Typography */
--clippy-font-size-xs: 12px;
--clippy-font-size-sm: 14px;
--clippy-font-size-md: 16px;
--clippy-font-size-lg: 18px;
--clippy-font-size-xl: 24px;

/* Border Radius */
--clippy-radius-sm: 4px;
--clippy-radius-md: 8px;
--clippy-radius-lg: 16px;
--clippy-radius-full: 9999px;

/* Shadows */
--clippy-shadow-sm: 0 2px 4px rgba(0,0,0,0.08);
--clippy-shadow-md: 0 4px 12px rgba(0,0,0,0.12);
--clippy-shadow-lg: 0 8px 32px rgba(0,0,0,0.16);

/* Z-Index Scale */
--clippy-z-balloon: 9998;
--clippy-z-agent: 9999;
--clippy-z-panel: 10000;
--clippy-z-modal: 10001;
--clippy-z-tooltip: 10002;

/* Transitions */
--clippy-transition-fast: 150ms ease;
--clippy-transition-normal: 250ms ease;
--clippy-transition-slow: 400ms ease;
```

---

## Implementation Notes

### Shadow DOM Isolation

All Clippy elements must be rendered in Shadow DOM to prevent style conflicts:

```javascript
const shadow = element.attachShadow({ mode: 'closed' });

// Inject styles into shadow
const style = document.createElement('style');
style.textContent = CLIPPY_STYLES;
shadow.appendChild(style);

// Render components in shadow
shadow.appendChild(agentElement);
shadow.appendChild(panelElement);
```

### Animation Performance

Use CSS transforms and opacity for animations to ensure 60fps:

```css
/* Good - Hardware accelerated */
.clippy-agent {
  transform: translateY(0);
  transition: transform 0.25s ease-out;
}

.clippy-agent.entering {
  transform: translateY(-100px);
}

/* Avoid - Triggers layout */
.clippy-agent {
  top: 0;
  transition: top 0.25s ease-out; /* Causes reflow */
}
```

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Feb 2026 | Design Team | Initial UX design |
