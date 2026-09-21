# 💗 Heart Status — SillyTavern Extension

Tracks a character's **Trust / Arousal / Jealousy / Heart Score** during a roleplay and shows it
as a status board under each reply. This is the extension version of the old "Heart Status" kit (a
prompt + a regex script): it does both jobs by itself, and adds a settings section.

## What it does

1. **Tells the model what to write.** Before every generation it injects the Info Board
   instruction, plus the *previous* board's values so the numbers keep moving gradually. This
   happens whenever **Enable** is on (see Settings).
2. **Reads the board** the model writes (`<info_board> … </info_board>`) and, in its place, shows
   a board: Heart Score ring, stat bars, date/time, location, thought and goal. The raw
   `<info_board>` text is left untouched inside the message itself (so editing/saving the chat
   still has the model's original text) — it's just hidden from view and replaced by the styled board
   visually.
3. **Styling the board is optional.** Turn "Enable Theme" off and the plain board is shown exactly
   as the model wrote it, instead of the styled board. The prompt is still sent either way.

Themes:
- 🌑🌕 Dark / Light
- 🏁 Racing Dark / Racing Light
- 🎤 Idol Stage Night / Idol Stage Day
- 📖 Library Night / Library Day
- 🖤 Demons / ✨ Gods

## Install

**Install:** https://github.com/blackfirst/HeartStatus.git — this one package includes
everything (prompt injection, parser, board, settings); you don't need anything else alongside it.

> ⚠️ **Already using the old separate "Heart Status" kit (prompt + regex script)?** This
> extension replaces both, so leaving the old ones on gives you double instructions and double
> boards. The first time this extension loads it **automatically disables the old regex script**
> for you (Extensions → Regex — you'll get a toast confirming it, if one was found). The old
> `info-board` prompt instruction, though, lives inside your own preset or author's note, and
> this extension can't safely edit arbitrary prompt text on its own — you'll get a one-time
> reminder toast to remove that part by hand.

## Settings

| Setting | What it does |
|---|---|
| **Enable** | Master switch. On = the board instruction is sent and the model writes a board on every reply. Off = Heart Status stops completely: no prompt is sent, no styled board is drawn, and any board already in the chat is shown as plain text. The options below are greyed out while it's off. |
| **Enable Theme** | On = the board is drawn styled with the theme. Off = the plain board is shown as the model wrote it. The prompt is still sent either way. Sits in the same group as Theme. When off, *Mini board* and *Board open state* are greyed out (they only shape the board). |
| Theme | Dark / Light / Racing (Dark) / Racing (Light) / Idol Stage (Night) / Idol Stage (Day) / Library (Night) / Library (Day) / Demons / Gods. Applies to every board and is remembered. |
| **Board open state** | Always open (default) / Always collapsed. This only sets the *starting* state each time a board is drawn — you can still click any board's `💗 Name's Status` line to open or close it by hand regardless of this setting. |
| **Mini board** | Off / On dropdown. On = each board collapses to a single row (small ring, name, relationship, inline Trust/Arousal/Jealousy). Tap the row to expand it in place and see Location/Thoughts/Goal, same as the full board. Off = the full board shows every time (default). See "Board details" below for how this looks per theme. |

### Board details

- **Mini board**: collapses the board to a one-row summary (ring, name, inline stats); tap to expand/collapse.
- Missing fields are shown as "—" instead of breaking the board.
- Ranges: Trust / Arousal / Jealousy `0–100`, Heart Score `-1000–1000`. The percentage is
  always `(score + 1000) / 20`, worked out from the Heart Score itself — a percentage the model writes in the board is ignored, so the "Affection" bar and label always match the number in the middle. The Heart Score ring itself is always drawn as a full circle.

## Board format

````
<info_board>
```
⏰ Time: 06:30 PM → 07:05 PM
🗓️ Date: Mon 03 Mar 2025 | Spring
📍 Location: Kitchen | 💡 Warm
🤝 Trust: 62
💓 Arousal: 40
🔥 Jealousy: 12
💗 Heart Score: 210 (61%)
🏷️ Relationship: {{char}} ↔ {{user}}: Close friends
💭 Thought: "I could get used to cooking side by side with {{user}}."
🏆 Goal: Finish cooking dinner together with {{user}}
```
</info_board>
````

The parser reads line by line, so it tolerates **bold** labels, a missing code fence, change
trails (`40 → 62`), extra text after a value, wrapped lines, and even a board squeezed onto one
line. It needs at least three recognised fields including Trust or Heart Score. If the model
forgets the closing `</info_board>` tag, the parser still finds the fields — first by reading the
` ``` ` fence right after the opening tag, and if there isn't one, by reading a capped run of
lines after it, so a missing close can never swallow the rest of the reply.

## What changed from the regex kit

- No regex to import and no strict field order.
- The theme is stored in SillyTavern's settings, not browser `localStorage`, so it follows you
  across devices. No JavaScript inside chat messages is needed.
- All text from the model is HTML-escaped before it goes into the board.
- The Trust bar now fills `0–100%`. The old board drew it as `50% + trust/2`, so Trust 0 showed a
  half-full bar.

## Files

```
heart-status/
├── manifest.json        extension manifest (declares the prompt filter)
├── index.js             entry point: settings, events, observer
├── config.js            defaults, themes, ranges
├── parser.js            <info_board> parser (tolerant of a missing closing tag)
├── history.js           reads boards straight from each message's text
├── prompts.js           prompt injection (instruction + current values)
├── migrate.js           one-time cleanup of the old regex script for upgraders
├── render.js            board HTML
├── dom.js               hides the raw board and shows the board in its place
├── message-handler.js   rendering and the prompt filter
├── state.js             settings and chat access
├── ui.js                settings drawer
├── notifications.js     toasts
├── diagnostics.js       throttled error logging
└── style.css            board and settings styles
```

## Troubleshooting

- **Nothing shows in the chat** — first check "Enable" and "Enable Theme" are on; if they
  are, the reply likely had no parseable board at all (no `<info_board>` tag, or fewer than
  three recognised fields).
- **Two boards** — this extension auto-disables the old regex script on first load, but if it
  didn't find it (different name, character-scoped script it can't see, etc.), disable it
  yourself under Extensions → Regex.
- **The model ignores the board** — check that the old `info-board` prompt is not also active and
  that nothing else in your preset tells it to skip extra headers.

## License

Personal-use roleplay tooling — adapt freely for your own SillyTavern setup.
