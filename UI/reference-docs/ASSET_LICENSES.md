# Asset Licenses

## Current brand assets and Inter

The user supplied the official ReLoop brand kit and authorized its integration. Four transparent PNGs are copied unchanged to `public/brand`: wordmark, infinity, 3D loop, and waveform. Source filenames and all reference-only boards are catalogued in BRAND_ASSETS.md. Light/dark logo derivatives retain the original alpha geometry; none is traced or re-typeset. No separate redistribution license was included in the brand kit.

Inter: Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter), SIL Open Font License 1.1. Full notice: `public/brand/Inter-OFL.txt`. The local Latin variable WOFF2 source is `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2`; license source is `https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt`. Chinese uses system fonts that are not redistributed.

The historical font notes below describe the earlier prototype. Inter replaces those external font requests in the current implementation.

## Supplied references

- Spark Admin v1.0.0 was supplied as `HTML UI/spark-admin-v1.0.0.zip`. Its README describes a Bootstrap 5 HTML dashboard, credits Spark Admin Dev, and states MIT coverage with ThemeWagon distribution. The archive listing did not show a separate license file. No Spark source code, images, icon fonts, or stylesheet are copied into this project.
- Crypgo v1.0.0 was supplied as `HTML UI/Crypgo-v1.0.0.zip`. Its README describes a Next.js/Tailwind template, credits Getnext.jsTemplates, and states MIT coverage with ThemeWagon distribution. No Crypgo source code, logos, crypto imagery, or fonts are copied into this project.

The README claims were recorded from the supplied packages; they are not a substitute for checking the exact license terms for redistributed template files. This prototype uses original JSX/CSS and a small inline line-icon set. The supplied Spark `assets/images/avatar.png` is copied to `public/spark-avatar.png` for the adapted sidebar profile because Spark's README states MIT coverage; retain the attribution and re-check the package terms before production redistribution.

## Fonts

The CSS requests DM Sans and Manrope from Google Fonts and keeps generic fallbacks. If network access is unavailable, browser/system sans-serif fonts are used. Before bundling font files in production, confirm the current font license and retain its required notice.
