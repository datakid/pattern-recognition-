# Veritas Lens
On-device pattern recognition in vanilla JS. Nothing leaves the browser.

## Tabs (index.html)
- **Files · Forensics**: drop any mix of images, videos, audio and text files.
  - Batch dashboard (sticky): verdict distribution bar, counts, average reliability, verdict filter chips (Tagged AI / Leans AI / Inconclusive / Leans camera / Errors), type filter, filename search, sort (order, AI score ↑↓, reliability, type, name), expand/collapse all, batch CSV, clear.
  - Each file is a compact collapsible row: thumbnail, name, top signal, verdict pill, score and reliability. Expanding it shows the main drivers, image maps (original, ELA, noise residual), and the full checks table with direction, weight and reference.
  - Checks: C2PA, IPTC DigitalSourceType, PNG generator chunks, software tags, camera EXIF, a filename hint for big generators, noise statistics, FFT spectral peaks, CFA correlation, JPEG grid, generator dimensions. Plus video frame sampling and audio spectral analysis.
- **Text → Table** (js/text.js): tokenizer for amount, quantity+unit, percent, date, time, email, URL, phone, IP, ID, hashtag and mention.
  - Builds tables from delimited text, repeating key:value records, single key:value pairs, lines sharing the same token shape (header taken from the line above), and similar lines with varying labels.
  - Unchanging label words become column names. Values are normalized: SI units, ISO dates, currency codes, EU/US number formats.
  - Also produces an entity index. Junk lines are listed with the reason they were removed. Each table has CSV export and copy-to-clipboard.
- **References**: sources grouped by domain, showing which check each one supports and why.
- Themes: System / Light / Dark, saved in localStorage.

## Limits
SynthID cannot be decoded client-side. C2PA signatures are not verified. Scores are heuristics. The text engine is rule-based.

## Files
index.html, css/style.css, js/app.js (forensics, dashboard, references), js/text.js (text engine), favicon.svg. No data tables.

## Next steps
c2pa-js WASM verification, an optional local ONNX detector, and a user-defined column-merge UI in the text tab.