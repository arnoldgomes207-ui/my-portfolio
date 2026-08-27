# My Portfolio — Arnold J Gomes

A single-page, responsive developer portfolio.

## Files
- `index.html` — page structure and content
- `style.css` — all styling, including responsive breakpoints
- `developer.png`, `img.avif` — your existing images (keep them in this same folder)
- `resume.pdf` — **add your own resume PDF here** so the "Download Resume"
  button and the footer "Resume" link work. Until you add it, those links
  will 404.

## feactures
- Nav links, footer links, and the hero image now actually work — the nav
  and footer scroll to real sections on the page (`#home`, `#about`,
  `#skills`, `#projects`, `#contact`) instead of pointing to routes that
  don't exist on a static site.
- Added a mobile hamburger menu — the old responsive breakpoint
  (`max-width: 60px`) never actually triggered, so the site was never
  responsive. Breakpoints now kick in at 1024px, 768px, and 480px.
- Added **About**, **Projects**, and a real **Skills** grid (the old
  "vertical line" layout collapsed on small screens).
- Unified all buttons into one `.btn` system (`primary`, `secondary`,
  `ghost`) so styling is consistent everywhere.
- Cleaned up the footer: real navigation links, social links, and an
  auto-updating copyright year — instead of three duplicate, non-clickable
  lists.
- Added keyboard focus states and respects `prefers-reduced-motion` for
  accessibility.


