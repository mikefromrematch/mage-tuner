# MAGE Tuner

A guitar/bass tuner with two modes:

- **Full mode**: dial, LED strip, string buttons, tuning presets, input picker, A4 reference.
- **Desktop mode**: a slim strip that floats above other windows. Its background
  is see-through and you set the opacity yourself. You can also make it click-through, so it sits over your
  DAW while you record and your clicks go to the DAW underneath.

## Run it

You need Node.js 18 or newer.

```bash
git clone https://github.com/mikefromrematch/mage-tuner
cd mage-tuner
npm install
npm start
```

The first time, allow microphone access. On macOS that's under System Settings → Privacy & Security → Microphone.

## Using it

| Action | How |
|---|---|
| Switch to desktop mode | **Desktop mode** button, or `Ctrl/Cmd + Alt + Shift + T` from any app |
| Back to full mode | Hover the strip → **Expand**, or the same shortcut |
| Background opacity | Hover the strip → slider (all the way left = fully transparent) |
| Click-through | Hover → **Click-through**, or `Ctrl/Cmd + Alt + Shift + C` from any app |
| Turn click-through off | Click **Turn off click-through** on the strip (it stays clickable), click MAGE Tuner in the Dock/taskbar, use **Tuner → Click-through** in the menu bar (Mac), or the shortcut |
| Move the strip | Turn click-through off, then drag it |
| Lock to one string | Tap a string button (tap again to go back to auto) |
| Audio interface | Pick it under **Input**. Echo cancellation, noise suppression and auto-gain are turned off so the pitch reads accurately |

The tuner saves your settings and window positions for each mode.

## Files

- `index.html`: the whole tuner (UI + YIN pitch detection). It also works in a browser by itself, with no transparency.
- `main.js`: Electron window: transparent, frameless, always-on-top, click-through, global shortcuts.
- `preload.js`: a small bridge between the page and the window.

## Test builds

Every push to `main` runs **Build test apps** in GitHub Actions. That workflow builds an
unsigned `.dmg` (macOS) and a `.exe` installer (Windows). Download them from the run's
**Artifacts** section.

To build on your own machine instead:

```bash
npm run dist
```

The Mac build is only ad-hoc signed (no paid Apple Developer ID), so macOS blocks the first launch.
Click **Done**, then go to **System Settings → Privacy & Security** and click **Open Anyway**.

If an older download says *"MAGE Tuner is damaged and can't be opened"*, run:

```bash
xattr -cr "/Applications/MAGE Tuner.app"
codesign --force --deep --sign - "/Applications/MAGE Tuner.app"
```
Windows SmartScreen may show a warning too; choose **More info → Run anyway**.

## Notes

- On Linux, transparency needs a compositing window manager. Most modern desktops have one.
- Tuner range is about 28 Hz to 1.4 kHz, which covers 5-string bass low B up through the high frets of a guitar.
