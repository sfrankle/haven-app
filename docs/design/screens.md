# Haven Screen Archetypes

Version: 1.0
Scope: Layout intent and rules for each tab. Use these to avoid inventing new layout logic per feature. Detailed screen specs supersede the relevant archetype entry when they exist.

## A1. Tend — Primary Logging

Purpose: Complete a log action with minimal cognitive load.

Structure:
- Top: light orientation (date, optional neutral helper text)
- Middle: entry type grid
- Bottom: optional short recent activity

Rules:
- No analytics content on this screen
- No competing secondary CTAs
- Logging flows open as sheets (bottom sheet or full-screen depending on complexity)
- Back navigation returns to Tend and preserves scroll state
- Surface most-used entry types first when usage data is available

## A2. Trace — Chronological History

Purpose: Review past logs and open entry details.

Structure:
- Top: lightweight filters and date range
- Middle: entries grouped by date
- Bottom: bottom navigation

Rules:
- Optimise for fast scanning over dense metadata
- Non-judgmental empty state language
- Detail views preserve list scroll position on back

## A3. Weave — Patterns and Insights

Purpose: Explore correlations when the user chooses to.

Structure:
- Top: timeframe and filter controls
- Middle: insight cards with plain-language observations
- Bottom: optional explanatory guidance

Rules:
- Insights are observational, never prescriptive
- Show confidence/coverage clearly when available
- No celebratory or alarming visual treatment

## A4. Anchor — Grounding Support

Purpose: Offer a menu of supportive options based on current energy. *(Later milestone.)*

Structure:
- Energy-based sections: Low → Medium → High
- Each section: 3–6 immediate, concrete options
- Optional recent/pinned row (visually secondary)

Rules:
- Actions should be startable in one tap
- No analytics or streak content
- Abstract or motivational phrasing does not belong here

## A5. Settings

Purpose: Control preferences, data, and privacy.

Structure:
- Grouped settings sections
- Toggles and selectors
- Critical/destructive actions separated visually at bottom

Rules:
- Privacy and export controls are easy to locate
- Destructive actions require explicit confirmation
