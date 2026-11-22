# Gate G1 Evidence: Export Feasibility

- Date: 2026-11-22
- Environment: Linux, Chrome stable, 1080p, 30 FPS
- Status: PASS

## Result

The export proof renders a five-second chess scene with an animated legal move and audio.

| Test | Result |
| --- | --- |
| 9:16 portrait, MP4 | PASS |
| 16:9 landscape, WebM | PASS |
| Audio track | PASS |
| Cancellation | PASS |
| Capability detection | PASS |
| Output validation with `ffprobe` | PASS |
| `scripts/validate-video.mjs` | PASS |

## MP4 evidence

File: `docs/evidence/R0/export-proof-1080x1920.mp4`

```json
{
  "format": {
    "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
    "duration": "5.013333",
    "size": "568166"
  },
  "streams": [
    { "codec_name": "h264", "codec_type": "video", "width": 1080, "height": 1920 },
    { "codec_name": "aac", "codec_type": "audio", "sample_rate": "48000", "channels": 2 }
  ]
}
```

Render time reported by the lab: 11.1 seconds. Output size: 0.54 MB. Peak JS heap used during the render: 38.7 MB. Heap used after completion: 28.8 MB. Total JS heap after completion: 64.1 MB.

## WebM evidence

File: `docs/evidence/R0/export-proof-1920x1080.webm`

```json
{
  "format": {
    "format_name": "matroska,webm",
    "duration": "5.020000",
    "size": "435993"
  },
  "streams": [
    { "codec_name": "vp9", "codec_type": "video", "width": 1920, "height": 1080 },
    { "codec_name": "opus", "codec_type": "audio", "sample_rate": "48000", "channels": 2 }
  ]
}
```

Render time reported by the lab: 9.8 seconds. Output size: 0.42 MB.

## Capability matrix

Chrome stable on the reference Linux desktop reports support for:

- MP4 / H.264 / AAC
- WebM / VP9 / Opus
- WebM / VP8 / Opus

No unsupported codec issue was reported for those combinations at 1080p.

## Cancellation

After starting a render and cancelling, the lab displayed:

> Render cancelled. No output file was kept.

The download link did not appear.

## Automated test

`e2e/export.spec.ts` renders a WebM in Playwright Chromium. It passed in 35.2 seconds and asserted a non-empty downloaded file.

## Notes

- The proof uses `@remotion/web-renderer` with `licenseKey: "free-license"`.
- The build reports a Mediabunny duplicate-load warning. Actual MP4 and WebM renders both succeeded in Chrome stable. Watch this warning when upgrading Remotion or Next.js.
- MP4 was validated in installed Chrome, not Playwright Chromium.
