# Green Snake Quest

A mobile-friendly Snake game for GitHub Pages. No build tools, server, or API keys are required.

## Publish on GitHub Pages

1. Download and unzip `green-snake-quest.zip`.
2. Create or open the separate repository `green-snake-quest` at `https://github.com/hhoomanhmn-netizen/green-snake-quest`.
3. Upload **all files** from the unzipped folder, including the icon images and `manifest.webmanifest`.
4. Commit the changes to the `main` branch.
5. Open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/(root)**, then Save.
6. Wait a minute or two. Your site should be at:
   `https://hhoomanhmn-netizen.github.io/ps5-watcher/`

Keep this game in its own `green-snake-quest` repository. Do not upload these files into your PS5 Watcher repository. Its URL will be:
`https://hhoomanhmn-netizen.github.io/green-snake-quest/`

## Controls
- Keyboard: arrow keys or WASD
- iPhone/iPad: swipe on the board or tap the directional buttons
- Space: pause/resume

## How it works
- Eat apples to grow and earn persistent apple currency.
- Colliding with a wall, obstacle, or your own body ends the run.
- Clear regular levels by eating the required number of apples.
- Every 10th level is a boss level with a unique boss theme and escalating hazards.
- Buy permanent upgrades in the shop. The wide-arena upgrade affects the actual board grid and all map/spawn/collision calculations.
- Progress, best run, wallet and upgrades are saved in the browser using localStorage.

The game is entirely client-side. GitHub Pages can host it, but player progress is stored separately in each browser/device.
