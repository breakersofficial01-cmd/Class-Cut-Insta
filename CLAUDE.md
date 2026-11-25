# Breaking School — Class-Cut → Instagram Reel factory

Breaking School is a Bangla edtech brand (HSC/admission level: জীববিজ্ঞান, রসায়ন, পদার্থবিজ্ঞান …).
This repo turns landscape class clips (16:9) into vertical 1080×1920 Reels for
Instagram, TikTok, YouTube Shorts and Facebook Reels.

**The owner's expectation: they send only a video (optionally with some text), and you deliver the
finished reel without asking for anything else.** Use the defaults below for whatever they don't give.

## Workflow when the user sends a video

1. Find the video. Uploads land in `~/.claude/uploads/<session>/…mp4`. Copy it to
   `input/<slug>.mp4` (slug = short English/romanized topic name, e.g. `torunasthi`).
   Skip committing an input over ~50 MB; put it in `.gitignore` instead.
2. Get the text:
   - If the user gave text, use it **verbatim** (only add highlight markup).
   - If a field is missing, write it yourself in the same tone. To learn the topic,
     extract frames (`ffmpeg -ss N -i in.mp4 -frames:v 1 f.jpg` at several points) and read the
     board/on-screen titles. The board usually shows the topic (e.g. "তরুণাস্থি") and series
     (e.g. "MCQ BOOSTER", "MCQ PROBLEM").
3. Write `reels/<slug>.json` (copy `reels/torunasthi.json` as the starting point).
4. Render: `node scripts/make-reel.js reels/<slug>.json` → `output/<slug>.mp4` + `output/<slug>-preview.jpg`.
5. **Look at the preview image yourself** (Read tool) before sending. Check: no text overflowing
   or wrapping badly, Bangla conjuncts correct, nothing covering important parts.
6. Send the MP4 and the preview to the user (SendUserFile), and list the exact text you used so they can
   correct any of it in one message.
7. Commit `reels/`, `input/`, `output/` and push.

## Text fields (reels/*.json)

| Field | Meaning | Default when user doesn't give it |
|---|---|---|
| `tag` | small amber pill under the logo | `<বিষয়> \| <অধ্যায়>` e.g. `জীববিজ্ঞান \| দৃঢ়তা প্রদান ও চলন` |
| `headline` | big title | `<span class="en">MCQ Type :</span> <span class="hl">টপিক</span>` |
| `card` | optional white summary card `{title, lines[]}` | omit (only use if the user gives key points; max 3 lines) |
| `cta` | outlined amber box | `পুরো ক্লাস ও <span class="hl">দাগানো বই</span> কমেন্টে👇` |
| `footer` | follow line | `এমন টাইপভিত্তিক MCQ Solving এর জন্য ফলো করো <span class="brand">Breaking School</span>` |
| `start`/`end` | trim, seconds | full video |
| `videoY` | top of the video strip, px | `640` |
| `logo` | always | `assets/breaking-school-logo.svg` |
| `template` | always | `breaking-school` |

Markup: `<span class="hl">…</span>` = amber highlight (+underline in headline);
`<span class="en">…</span>` = English in Poppins inside the headline; `<span class="brand">…</span>` = amber brand name.
Highlight only 1–2 key words per line. Use Unicode sub/superscripts directly (CO₂, H⁺).

## Locked design decisions (approved by the owner — don't change without being asked)

- Canvas 1080×1920, H.264 high CRF 18, AAC 192k, 30 fps, `+faststart`. Keep original audio.
- Layout top→bottom: logo (top 80px, 430px wide) → subject tag pill → headline → video strip
  (full width, 1080×608, amber 8px lines above and below) → [optional card] → CTA box → footer.
- Colors: near-black background with subtle amber/green glows; accent amber `#FFB21E`
  (matches the logo); text white.
- Fonts (bundled in `assets/fonts`, no network needed): Hind Siliguri 500/600/700 for Bangla,
  Poppins 700/800 for English. Emoji via system Noto Color Emoji.
- Bottom ~300px stays clear on purpose — Instagram's caption/buttons cover it.
- All text visible from frame 1 (no animation) unless asked.
- The reference used to start the look was another academy's reel; we deliberately did **not** copy
  their text or branding — never put other brands' names, logos or URLs in our reels.

## Technical notes

- Text is rendered by Chromium (Playwright) into a transparent PNG, then composited with ffmpeg.
  **Never use ffmpeg `drawtext` for Bangla** — it breaks যুক্তাক্ষর (conjuncts).
- Playwright + Chromium and ffmpeg are pre-installed in Claude Code cloud sessions
  (`require('playwright')` works; don't run `playwright install`).
- To change the look for everyone, edit `templates/breaking-school.html`. For a new series with a
  different look, add a new template file and set `template` in the JSON.

## When the owner gives feedback

Apply it, re-render, and if it's a general preference (not one-off), update the defaults/locked
decisions in this file in the same commit so future sessions follow it.

## Files

- `templates/breaking-school.html` — the design (placeholders filled by the script)
- `scripts/make-reel.js` — render pipeline
- `reels/*.json` — one config per reel (history of everything published)
- `assets/` — logo, fonts
- `reel-brief-template.md` — optional form the owner can fill in
