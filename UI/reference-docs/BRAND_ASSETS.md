# ReLoop brand-kit integration

The supplied `D:/ReLoop/BrandKit` contains 14 PNGs. All were visually inspected. No editable vector, Figma, layered artwork, or font source files were supplied.

| Supplied file | Classification | Use |
| --- | --- | --- |
| ChatGPT Image Oct 31, 2026, 02_10_51 AM-1.png | Transparent wordmark, 2172×724 | Official wordmark in navigation, sidebar, login |
| ChatGPT Image Oct 31, 2026, 02_10_53 AM-2.png | Transparent infinity, 1254×1254 | Compact application branding |
| ChatGPT Image Oct 31, 2026, 02_10_54 AM-3.png | Transparent 3D loop, 1448×1086 | Landing process graphic |
| ChatGPT Image Oct 31, 2026, 02_10_56 AM-4.png | Transparent waveform, 2172×724 | Workflow section decoration |
| Cover.png | Overview board | Identity reference only |
| 9d51480b-8083-4ec1-976e-e3972b008f53.png | Logo presentation | Logo reference only |
| e4f91e2b-e00c-4b40-9a5e-3dba426d001c.png | Typography board | Inter regular/medium/bold reference |
| 9eda0118-0d57-4648-bf28-e829bb3d3e90.png | Color board | Official token reference |
| 6ccefd85-2ac7-4594-8977-46800ffd9bc8.png | Website mockup | White space, CTA, hero and circular process placement |
| eba72ef5-6e58-4187-a910-0dda26a30524.png | Landscape hero board | Visual reference only |
| de272565-f7c2-43ac-828d-8ae328d49e18.png | Stationery mockup | Reference only |
| 2a16d495-86f9-47ea-99b4-9bfe1a0c902f.png | Social profile | Reference only; fictional metrics excluded |
| 4637674e-3010-4424-880c-ca40d9c6dd26.png | Social post mockups | Reference only; no screenshot UI or claim reuse |
| 91275f0f-6f97-4668-8784-e7f1e0c0fbb2.png | Testimonial concept | Reference only; quote and attribution excluded |

The four transparent originals are copied unchanged into `public/brand`. Logo derivatives trim transparent padding; dark-surface versions recolor the dark source pixels to white while retaining the lime and source alpha geometry. No font typesetting or path approximation recreates the logo. `scripts/prepare-brand-assets.cjs` records the transformation. The raster sources have some rough transparency edges; no editable/vector original was supplied.

Inter Latin is self-hosted with its SIL Open Font License. Chinese uses Microsoft YaHei / PingFang SC / Noto Sans CJK SC when available. No new UI kit is installed.

Priority: official brand identity, Spark workspace structure, Crypgo marketing composition. The six pages keep their local prototype state. A persistent mock-data label distinguishes workspace metrics and findings from actual results.
