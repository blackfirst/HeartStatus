# 💗 Heart Status — SillyTavern Extension

Tracks a character's **Trust / Arousal / Jealousy / Heart Score** (Arousal and Jealousy are always on) during a roleplay and shows
it as a status card under each reply. This is the extension version of the old
"Heart Status" kit (a prompt + a regex script): it does both jobs by itself, and adds a settings
panel, notifications and manual control — and keeps the raw board text out of your chat.

## What it does

1. **Tells the model what to write.** Before every generation it injects the Info Board
   instruction, plus the *previous* board's values so the numbers keep moving gradually.
2. **Reads the board** the model writes (`<info_board> … </info_board>`) and replaces it in the
   chat with a card: Heart Score ring, stat bars, date/time, location, thought and goal.
3. **Erases the board from the message (optional).** Once a reply is finished, the parsed
   values are moved into that message's `extra.heartStatus`. By default the raw
   `<info_board>…</info_board>` text is then deleted from `mes` (and the active swipe), so nothing
   is printed in the chat and editing or swiping a message never shows the raw block — the card
   still reads correctly because it comes from `extra.heartStatus`, not the visible text. This can
   be turned off in settings if you'd rather keep the raw text in the message.
4. **Showing the card is optional too.** By default the board renders as a card under the
   message, but you can turn that off and have the values tracked silently instead (still visible
   any time from the quick panel).
5. **Keeps the prompt small.** Once a board's text is captured/erased there's nothing left in the
   chat to trim; if you turn erasing off, older raw boards are automatically stripped from
   what's *sent to the model* (not your chat) to save tokens, with the latest one kept as a
   format example.

The card has 2 themes (Dark, Light), set from the Theme dropdown in
settings. It also colors the quick panel (see below).

## Install

**Repository:** https://github.com/blackfirst/HeartStatus.git — this one package includes
everything (prompt injection, parser, card, settings); you don't need anything else alongside it.

In SillyTavern, go to **Extensions → Install extension**, paste that URL, and reload. Or clone/
download it and copy the `heart-status` folder to:

```
SillyTavern/data/<your-user>/extensions/heart-status          (per user)
SillyTavern/public/scripts/extensions/third-party/heart-status (all users)
```

Reload SillyTavern, then open **Extensions** and find **Heart Status** in the settings list.

> ⚠️ **Already using the old separate "Heart Status" kit (prompt + regex script)?** This
> extension replaces both, so leaving the old ones on gives you double instructions and double
> cards. The first time this extension loads it **automatically disables the old regex script**
> for you (Extensions → Regex — you'll get a toast confirming it, if one was found). The old
> `info-board` prompt instruction, though, lives inside your own preset or author's note, and
> this extension can't safely edit arbitrary prompt text on its own — you'll get a one-time
> reminder toast to remove that part by hand.

## Settings

| Setting | What it does |
|---|---|
| Enable | Master switch. Off = no prompt, no cards. |
| Notify on big changes / threshold | Toast when Trust, Arousal, Jealousy or the Heart Score percentage moves by at least this many points in one reply. |
| **Show in chat (as a card)** | On = the board renders as a card under the message (default). Off = nothing is shown in the chat at all — stats are still tracked and readable from the quick panel. |
| **Remove board from message** | On = the raw `<info_board>` text is erased from the message once a reply finishes. Off = the raw text stays in the message (e.g. visible while editing); it's still hidden/replaced whenever it's displayed. **Default: off.** |
| Theme | Dark / Light. Applies to every card and the quick panel, and is remembered. |
| **Card open state** | Always open (default) / Always collapsed. This only sets the *starting* state each time a card is drawn — you can still click any card's `💗 Name's Status` line to open or close it by hand regardless of this setting. |
| **Compact card (mini row, tap to expand)** | On = each card collapses to a single row (small ring, name, relationship, inline Trust/Arousal/Jealousy). Tap the row to expand it in place and see Location/Thoughts/Goal, same as the full card. Off = the full card shows every time (default). |

These two switches are independent, so all four combinations work: card + keep raw text
(default), card + erased, hidden + keep raw text, or hidden + erased. Older messages that
still have a raw board embedded in their text (from before this version, or loaded from an older
backup) get swept and captured automatically when the chat opens, if "Remove board from message"
is on.

### Quick panel

Open it from the **wand menu → Heart Status**.

- Current stats and relationship label.
- Heart Score history over the last 60 boards.
- **Adjust values for the next reply**: type new numbers for any stat and the model is told to
  start the next board from them. The adjustment is used once and expires as soon as the next
  board appears. Useful when the model's numbers drift.

### Card details

- **Compact mode**: the row shows the Heart Score inside a small ring, the character's
  name, their relationship label, and Trust/Arousal/Jealousy inline. Tap anywhere on the
  row to expand it (no page reload, no re-generation) and see Location/Thoughts/Goal —
  tap again to collapse. Compact mode only changes what the *expanded* card looks like; whether cards start open
  or collapsed is set by **Card open state**.
- Missing fields are shown as “—” instead of breaking the card.
- Ranges: Trust / Arousal / Jealousy `0–100`, Heart Score `-1000–1000`. The percentage is
  always `(score + 1000) / 20`, worked out from the Heart Score itself — a percentage the model writes in the board is ignored, so the “Affection” bar and label always match the number in the middle. The Heart Score ring itself is always drawn as a full circle.

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
line. It needs at least three recognised fields including Trust or Heart Score. If the model
forgets the closing `</info_board>` tag, the parser still finds the fields — first by reading the
` ``` ` fence right after the opening tag, and if there isn't one, by reading a capped run of
lines after it, so a missing close can never swallow the rest of the reply.

## What changed from the regex kit

- No regex to import and no strict field order.
- The theme is stored in SillyTavern's settings, not browser `localStorage`, so it follows you
  across devices. No JavaScript inside chat messages is needed.
- All text from the model is HTML-escaped before it goes into the card.
- The Trust bar now fills `0–100%`. The old card drew it as `50% + trust/2`, so Trust 0 showed a
  half-full bar.
- The board is captured out of the message and erased from the message text, instead of just being
  hidden by the display — see "What it does" above.

## Files

```
heart-status/
├── manifest.json        extension manifest (declares the prompt filter)
├── index.js             entry point: settings, events, observer
├── config.js            defaults, themes, ranges
├── parser.js            <info_board> parser (tolerant of a missing closing tag)
├── history.js           reads boards (from extra.heartStatus, or the raw text as a fallback)
├── prompts.js           prompt injection (instruction + current values)
├── migrate.js           one-time cleanup of the old regex script for upgraders
├── render.js            card HTML
├── dom.js               swaps the raw board for the card
├── message-handler.js   rendering, notifications, prompt filter, capture-and-strip
├── state.js             settings access and the one-shot manual adjustment
├── ui.js                settings drawer, quick panel, wand entry
├── notifications.js     toasts
├── diagnostics.js       throttled error logging
└── style.css            card and panel styles
```

## Troubleshooting

- **Nothing shows in the chat** — first check "Show in chat" is on; if it is, the reply likely had
  no parseable board at all (no `<info_board>` tag, or fewer than three recognised fields).
- **Raw `<info_board>` text visible while editing a message** — expected if "Remove board from
  message" is off. If it's on and you still see raw text after generation is clearly
  finished, something failed to parse it — check the board has at least Trust or Heart Score plus
  two other fields.
- **Two cards** — this extension auto-disables the old regex script on first load, but if it
  didn't find it (different name, character-scoped script it can't see, etc.), disable it
  yourself under Extensions → Regex.
- **The model ignores the board** — check that the old `info-board` prompt is not also active and
  that nothing else in your preset tells it to skip extra headers.

## License

Personal-use roleplay tooling — adapt freely for your own SillyTavern setup.
