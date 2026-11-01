# ReLoop Frontend Design Guidance

- Use `$frontend-design` when creating pages or components, or when visually redesigning an existing screen. Start from the user, task, and product domain; follow the approved ReLoop visual identity.
- Use `$web-design-guidelines` for UX, accessibility, and interface validation reviews. Fetch the current official guidelines as required by that skill before each review.
- Preserve the existing Next.js architecture, route ownership, API contracts, business behavior, and ReLoop brand. Treat visual polish as separate from functional usability and accessibility requirements.
- Prefer existing reusable components, CSS tokens, typography, and layout patterns. Avoid unnecessary dependencies and excessive animation; respect reduced-motion preferences, keyboard access, and visible focus.
- Keep interface copy clear for Chinese-speaking cross-border merchants; maintain the established Chinese/English behavior where a workflow supports both.
- Visual-design tasks must not modify backend APIs, database logic or schemas, persistence, or authentication. Raise contract or behavior changes separately with the owning teammate.
