# 💗 Heart Status — SillyTavern Extension

Tracks a character's **Trust / Arousal / Jealousy / Heart Score** during a roleplay and shows
it as an animated status card under each reply. This is the extension version of the old
"Heart Status" kit (a prompt + a regex script): it does both jobs by itself, and adds a settings
panel, change indicators, notifications and manual control.

## What it does

1. **Tells the model what to write.** Before every generation it injects the Info Board
   instruction, plus the *previous* board's values so the numbers keep moving gradually.
2. **Reads the board** the model writes (`<info_board> … </info_board>`) and replaces it in the
   chat with a card: rotating Heart Score ring, heartbeat pulse, ECG line, stat bars, date/time,
   location, thought and goal.
3. **Keeps the prompt small.** Older boards are removed from the prompt sent to the model; the
   latest one stays as the format example. Your saved chat is never changed.

The card has 3 themes (Dark Red, White Pink, White Gold). Click the coloured dots at the top of
any card, or use the Theme dropdown in the settings.

## Install

Copy the `heart-status` folder to:

```
SillyTavern/data/<your-user>/extensions/heart-status          (per user)
SillyTavern/public/scripts/extensions/third-party/heart-status (all users)
```

Or host it on GitHub and use **Extensions → Install extension** with the repository URL.
Reload SillyTavern, then open **Extensions** and find **Heart Status** in the settings list.

> ⚠️ If you used the old kit, **turn both parts off** or you will get double instructions and
> double cards: disable the `info-board` prompt in your preset / author's note, and disable the
> `💗 [Heart Status] FIX` script in **Extensions → Regex**.

## Settings

| Setting | What it does |
|---|---|
| Enable | Master switch. Off = no prompt, no cards. |
| Notify on big changes / threshold | Toast when Trust, Arousal, Jealousy or the Heart Score percentage moves by at least this many points in one reply. |
| Display | *Status card* replaces the board; *Raw text* leaves the model's output as written. |
| Theme | Dark Red / White Pink / White Gold. Applies to every card instantly and is remembered. |
| Collapse cards on older messages | Only the newest card is open. |
| Track Arousal / Track Jealousy | Turn a stat off everywhere: the prompt stops asking for it and the card hides it. |
| Remove older boards from the prompt | Saves tokens. The latest board is always kept. |
| Open panel / Re-render cards / Remove boards from chat | Utilities (see below). |

### Quick panel

Open it from the settings or from the **wand menu → Heart Status**.

- Current stats and relationship label.
- Heart Score history over the last 60 boards.
- **Adjust values for the next reply**: type new numbers for any stat and the model is told to
  start the next board from them. The adjustment is used once and expires as soon as the next
  board appears. Useful when the model's numbers drift.

### Card details

- Small ▲/▼ markers show the change since the previous board (or the model's own `40 → 62` trail).
- Missing fields are shown as “—” instead of breaking the card.
- Ranges: Trust / Arousal / Jealousy `0–100`, Heart Score `-1000–1000`. The percentage is
  `(score + 1000) / 20` unless the model writes its own.

## Board format

````
<info_board>
```
⏰ Time: 09:15 AM → 09:40 AM
🗓️ Date: Mon 03 Mar 2025 | Spring
📍 Location: Kitchen | 💡 Dim
🤝 Trust: 62
💓 Arousal: 40
🔥 Jealousy: 12
💗 Heart Score: 210 (61%)
🏷️ Relationship: Anna ↔ You: Close friends
💭 Thought: "I hope he stays a little longer."
🏆 Goal: Get him to stay for breakfast
```
</info_board>
````

The parser reads line by line, so it tolerates **bold** labels, a missing code fence, change
trails (`40 → 62`), extra text after a value, wrapped lines, and even a board squeezed onto one
line. It needs at least three recognised fields including Trust or Heart Score.

## What changed from the regex kit

- No regex to import and no strict field order.
- The theme is stored in SillyTavern's settings, not browser `localStorage`, so it follows you
  across devices. No JavaScript inside chat messages is needed.
- All text from the model is HTML-escaped before it goes into the card.
- The Trust bar now fills `0–100%`. The old card drew it as `50% + trust/2`, so Trust 0 showed a
  half-full bar.
- Values are calculated in code instead of CSS `calc()` inside SVG attributes.

## Files

```
heart-status/
├── manifest.json        extension manifest (declares the prompt filter)
├── index.js             entry point: settings, events, observer
├── config.js            defaults, themes, ranges
├── parser.js            <info_board> parser
├── history.js           reads boards from the chat, computes changes
├── prompts.js           prompt injection (instruction + current values)
├── render.js            card HTML
├── dom.js               swaps the raw board for the card
├── message-handler.js   rendering, notifications, prompt filter, cleanup
├── state.js             settings access and the one-shot manual adjustment
├── ui.js                settings drawer, quick panel, wand entry
├── notifications.js     toasts
├── diagnostics.js       throttled error logging
└── style.css            card, panel and settings styles
```

## Troubleshooting

- **No card, raw text visible** — the reply must contain a closed `<info_board>` block with at
  least three fields. Check that Display is set to *Status card* and that the extension is enabled.
- **Two cards** — the old regex script is still enabled; disable it in Extensions → Regex.
- **The model ignores the board** — check that the old `info-board` prompt is not also active and
  that nothing else in your preset tells it to skip extra headers.
- **Switching Display to Raw text reloads the chat.** That is how the original text is brought back.

## License

Personal-use roleplay tooling — adapt freely for your own SillyTavern setup.
