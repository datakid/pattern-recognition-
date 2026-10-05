# Veritas Lens
On-device pattern recognition in vanilla JS. Nothing leaves the browser.

## Goal
Answer one question honestly: what can be measured about this file or text, and how much does each measurement prove? Only objective signals change the score. Subjective or easily forged cues are shown with 0 weight.

## Tabs (index.html)
- **Files · Forensics**
  - **C2PA** (js/provenance.js): JUMBF extraction from JPEG APP11, PNG caBX, WebP/RIFF and BMFF uuid boxes (MP4, MOV, HEIF, AVIF); CBOR decoding; assertions, actions, digitalSourceType, ingredients, manifest count. The COSE_Sign1 signature is verified with WebCrypto (ES256/384/512, PS256/384/512, Ed25519) against the leaf X.509 certificate, and the c2pa.hash.data content hash is recomputed with exclusions. Tested against the official c2pa-rs fixture: signature valid, hash match.
  - **JPEG** (js/jpeg.js): DQT parsing, IJG quality fit, standard vs custom table cross-checked against EXIF, subsampling, progressive mode, restart markers, EXIF thumbnail, 8×8 DCT grid alignment, double-quantization periodicity, JPEG ghost curve and map.
  - **Pixel checks**: noise residual σ, kurtosis, noise uniformity, flat-area ratio, 1D and 2D residual FFT, CFA correlation, block periodicity, histogram comb gaps, colour diversity, copy-move clones, generator dimensions. Checks are switched off automatically when they can't be trusted: CFA with chroma subsampling, and noise after downscaling or editing software.
  - **Video**: frame sampling, fixed-pattern noise carried across frames, texture shimmer between adjacent frames in still areas, brightness flicker, C2PA in BMFF.
  - **Audio**: bandwidth, spectral flatness, loudness variation, crest factor, stereo correlation, C2PA.
  - **Scoring**: score limited to 15–85 without a provenance tag; damped when signals disagree. Reliability drops with screenshots, low JPEG quality, double compression, a lost DCT grid, or tampering. A verified C2PA AI tag scores 50 points; a tampered one scores 15.
  - Batch dashboard with filters, search, sort and CSV export.
- **Text → Table** (js/text.js): typed tokens with validation (Luhn, IBAN mod-97, calendar dates, IP ranges, coordinates, email). Tables from delimited text, key:value records and repeating line shapes; numeric column stats and MAD outlier flags.
- **References**: comparison with online detectors (trained classifiers, provenance verifiers, vendor watermark tools, forensic toolkits, AI-text detectors) plus the sources behind every check.

## Design
One set of tokens (radius, font sizes, gap, pill shape) for every control: tabs, theme switch, buttons, chips, selects with a custom chevron, search inputs, textarea, disclosure arrows, file-card chevrons, scrollbars, audio/video players and the drop zone.

## Limits
- C2PA certificates are not checked against the C2PA trust list or for revocation.
- BMFF box hashes are not recomputed.
- SynthID cannot be decoded client-side.
- There is no trained classifier, so many clean generated images without tags will show as Inconclusive.
- The text tab does not judge AI authorship, on purpose.

## Files
index.html, css/style.css, js/app.js, js/provenance.js, js/jpeg.js, js/text.js, favicon.svg, images/logo.jpg. No data tables.

## Next steps
Bundle the C2PA trust list for chain validation, recompute BMFF hashes, add an optional local ONNX classifier shown as a separate, clearly labelled signal, and add a PRNU camera-fingerprint comparison from user-supplied reference photos.
