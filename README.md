# Vibecade

The public page for Vibecade, a free phone-controlled arcade projected onto six street windows at 2051 Harrison St, San Francisco. Static files only: no build step, no dependencies, no external fonts, CDNs or trackers.

## Files

- `index.html`: the page. Sections: hero street scene, playable demo, how to visit, the sixteen-game lineup, the build, neighbors.
- `style.css`: layout and look. System font stacks only.
- `arcade.js`: everything that moves.
  - `SIMS`: sixteen small game simulations drawn on canvas. Fireflies, Volley and Neon Blocks accept input and are playable in the demo; the rest are animated previews.
  - `Street`: the hero scene. Sky, building, six windows running simulations, people on the sidewalk.
  - `clock`: one shared time of day (3 pm to 12:30 am) that drives the hero scene, the status chip and the neighbors timeline. Dusk is approximated from the date.
  - Opt-in sound (WebAudio), off by default.
- `404.html`: a small firefly game. Its links use the `/vibecade/` path that GitHub Pages serves from.
- `assets/`: favicon, share image (`og.png`), and a static illustration used when JavaScript is off.

## Behavior to keep

- Works from a subpath with relative URLs.
- With JavaScript off the page is still complete; the canvas scene falls back to a static illustration and the time controls stay hidden.
- With reduced motion on, nothing animates on its own; the scene redraws only when the time changes, and the demo runs only while someone is playing.
- The previews are labelled as stylized illustrations, not screenshots, and the demo is labelled as written for this page.
- Search for `CONTACT_EMAIL` in `index.html` for the one place to add a public email.

## Getting involved

Live at https://meawoppl.github.io/vibecade/. Questions, neighbor feedback and offers to help are all welcome: [open an issue](https://github.com/meawoppl/vibecade/issues/new). Ideas for new window games are especially welcome.

Collaborators: join the [Signal group](https://signal.group/#CjQKIG5qwFueCF-qaqTOhioCcmi90DtzoE_8ovRh37-499NJEhBf-iJCNDYFJZxIAXBF0kiO).

## Checking changes

Serve the directory with any static server and open it at phone and desktop widths. The page should show no console errors and no horizontal scroll, the time slider should move through four states (resting, speakers, phones only, dark), each demo game should respond to the arrow keys and space bar after pressing Start, and tapping a game card should open its detail sheet.
