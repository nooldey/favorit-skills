---
name: directing-stickman-videos
description: "Turn copy, notes, articles, or topics into a one-minute stick-figure video with Simplified Chinese (Putonghua) narration by default. Use when the user wants a stick-figure explainer, motivational short, kinetic line-animation video, or a video-generation prompt package, and prefers Chinese-style (中国风) humanistic scenes. Produces a director's proposal, six standalone generation prompts, then optionally renders and stitches the clips with WorkBuddy VideoGen."
license: MIT
agent_created: true
---

# Directing Stickman Videos

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then six standalone prompts for approximately ten-second clips (Phase B). After approval, optionally render the clips with WorkBuddy VideoGen and stitch them into one continuous one-minute video (Phase C). Preserve the source's meaning while strengthening its hook, progression, and closing callback.

## Setup gate

Require these before planning:

- source material
- aspect ratio: `16:9`, `9:16`, or `1:1`
- theme: light (white background, black figure) or dark (black background, white figure)

Narration language defaults to `简体中文普通话` (Simplified Chinese Putonghua). Treat it as a known default and do not ask unless the user requests a different language. Scene humanistic style defaults to `中国风` (Chinese style); keep this bias unless the user overrides it.

If anything is missing, ask for all missing items in one concise message and stop. Never select an aspect ratio, theme, narration language, or style silently. Do not re-ask choices already supplied.

Urgency, generation cost, client pressure, and requests to "pick normal settings" do not waive this gate.

## Workflow

1. Read `references/storyboard-template.md` and produce Phase A with 简体中文普通话旁白 and an optional English reference translation (write the plan explanation in the user's language).
2. Stop after the director's proposal and request explicit approval.
3. If the user changes ratio, theme, narration, scene structure, or global style, recompose Phase A and request approval again.
4. Only after approval of the current Phase A, read `references/video-prompt-contract.md` and produce Phase B.
5. Use `references/examples.md` only when a concrete end-to-end example would resolve ambiguity.
6. (Optional, recommended) After presenting Phase B, render and stitch via Phase C.

Topic approval, schedule pressure, or approval of an older draft is not approval of the current Phase A.

## Output rules

- Target 130–150 中文旁白词（约 55–65 秒口语）across six clips.
- Give each clip three timed beats, at least four relevant visual devices, and a visual change every two to three seconds.
- Keep character proportions, line weight, theme, and narrator consistent.
- Limit the video to three saturated accent colors. Name them only with ordinary descriptive words such as vivid red, electric blue, or warm gold.
- Never place hexadecimal, RGB, HSL, Pantone, or other technical color notation inside a model prompt. Treat palette choices as visual art direction, never visible content.
- For the light theme, request a flat, uniform, digitally pure-white canvas and forbid gray or off-white tint, texture, gradients, shadows, lighting, bloom, fog, and three-dimensional background depth. Do not express the white as a color code.
- Make each model prompt self-contained and repeat all critical locks.
- Treat narration as audio-only. Quote exact dialogue and forbid alteration, repetition, captions, subtitles, or visual transcription.
- Default generated clips to no visible words, letters, numbers, interface copy, or technical annotations. Make cards and notifications icon-only. Put any optional two-to-five-word overlay in a separate post-production note, never inside the generation prompt.
- Match every clip ending to the next clip opening.
- Bias scene humanistic elements toward `中国风` (Chinese style): express it through line-art metaphors and iconography — an unrolling scroll, a red seal stamp (印章), a hanging lantern, an ink-brush stroke, a mountain-and-water silhouette, lattice windows — and through accent-color semantics, rather than photographic ink textures that would break the flat monochrome canvas rule. Keep the minimalist stick-figure line art and all production locks intact.
- Do not invent unsupported facts, statistics, quotations, or product claims.

## Revision rules

Recompose rather than rename:

- `16:9`: stage action across left, center, and right; use lateral tracking and negative space.
- `9:16`: use depth, stacked motion, vertical reveals, and interface-safe placement.
- `1:1`: use compact central composition and shorter travel paths.

Theme changes invert background and base line art while preserving accent semantics and contrast. A global change invalidates prior approval.

## Phase C — Render and stitch (WorkBuddy execution)

This phase is specific to WorkBuddy and turns the prompt package into actual video.

1. For each of the six approved prompts, call the **VideoGen** tool (text-to-video) with the prompt text as the `prompt` argument. If the tool accepts a duration parameter, request approximately ten seconds; otherwise accept its native clip length. Save each result to a working folder, e.g. `./stickman-clips/clip1.mp4` … `clip6.mp4`.
2. Concatenate the six clips with the bundled helper:
   - `python scripts/stitch.py ./stickman-clips ./stickman-clips/final.mp4`
   - The script prefers a bundled ffmpeg (`imageio-ffmpeg`) so no system ffmpeg is required. If neither is available, it reports the missing dependency instead of failing silently.
3. If stitching is declined or fails, deliver the six clips individually and list the optional overlay phrases for post-production.

Keep every clip's locked character, palette, and narration consistent across renders. Re-run an individual clip if its style drifts from the locks. Note that independent text-to-video generations may vary slightly in voice and motion; recommend adding one continuous external voiceover and BGM during final assembly for maximum consistency.

For 简体中文普通话 narration, VideoGen may not emit reliable Chinese speech. When it does not, generate the visuals per the prompts and add a separate Chinese TTS voiceover track (简体中文普通话) during final assembly, keeping the spoken text exactly as written in Phase A.

## Final check

Apply the checklist in the loaded reference. Repair any failed condition before responding.
