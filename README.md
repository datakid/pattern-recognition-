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
- **Writing check** (js/writing.js, shown at the top of the Text · Writing tab): English, 150+ words, 6+ sentences. Signals: self-disclosure or template residue (strong), post-2022 marker vocabulary (Kobak 2024, Liang 2024), stock phrases, sentence-length burstiness, paragraph uniformity, informal slips, leftover Markdown and repeated openers. Contractions, em dashes and lexical diversity are shown but not scored. Score is limited to 15–85 unless the text discloses itself; reliability is capped at 65%. Test results: a typical assistant paragraph scored 79 (Leans AI-style), a casual human note 31 (Leans human-style).
- **Camera match** (js/prnu.js, in the Files tab): PRNU sensor fingerprint built with a maximum-likelihood estimate from reference photos; tests other photos with PCE over a 512 px centre crop and all 4 rotations; threshold PCE 60. Synthetic test: same sensor PCE ≈ 10⁵, different sensor 6.7.
- **C2PA trust**: certificate chain signatures are verified, then matched against the bundled official C2PA conformance trust list (trust/c2pa-trust-list.pem). MP4/MOV BMFF hashes (v1/v2, top-level exclusions) are recomputed for unfragmented files under 400 MB.
- **Text → Table** (js/text.js): typed tokens with validation (Luhn, IBAN mod-97, calendar dates, IP ranges, coordinates, email). Tables from delimited text, key:value records and repeating line shapes; numeric column stats and MAD outlier flags.
- **References**: comparison with online detectors (trained classifiers, provenance verifiers, vendor watermark tools, forensic toolkits, AI-text detectors) plus the sources behind every check.

## Design
One set of tokens (radius, font sizes, gap, pill shape, three control heights: 24, 32 and 38 px) for every control: tabs, theme switch, buttons, chips, badges, custom dropdowns (js/dropdown.js, replacing the native select popup), search inputs, textarea, disclosure arrows, scrollbars, audio/video players and the drop zone. Dropdown buttons, file-card chevrons and disclosure arrows share one chevron shape. Dropdowns support arrow keys, Home/End, type-ahead, Enter and Escape. Scrollbars and media players follow the in-app theme, not only the OS setting. File pickers are keyboard-focusable with the same focus ring as every other control.

## Limits
- C2PA revocation (OCSP/CRL) is not checked, and the trust list is a snapshot that must be refreshed by hand.
- BMFF hashes with nested exclusions or Merkle trees (fragmented MP4) are reported as unchecked.
- The writing check has no language-model perplexity, works only in English, and can be fooled by paraphrasing.
- Camera match needs original, uncropped, unresized files.
- SynthID cannot be decoded client-side.
- There is no trained classifier, so many clean generated images without tags will show as Inconclusive.
- The text tab does not judge AI authorship, on purpose.

## Files
index.html, css/style.css, js/app.js, js/provenance.js, js/jpeg.js, js/writing.js, js/text.js, js/prnu.js, js/dropdown.js, trust/c2pa-trust-list.pem, favicon.svg, images/logo.jpg. No data tables.

## Next steps
Nested BMFF exclusions, an OCSP revocation check (needs a CORS-enabled responder), more languages for the writing check, and saving camera fingerprints in localStorage.
