# plainer

A style editor for academic and technical prose in English, Arabic and
Spanish. It shows every change with the reason for it, so you decide one
by one, rather than handing back a rewritten block.

Five ways to read a passage:

- **Copy edit** — every change marked in the text with its reason in the
  margin, accepted or undone one at a time.
- **How it reads** — where a reader slows down or stops, plus four
  judgements on a 1–5 scale. Readability is calculated from the text, so
  it does not move between runs.
- **Claims and logic** — what kind of statement each sentence is, which
  claims have nothing behind them, and whether the passage contradicts
  itself.
- **Debate** — the strongest honest case for the central claim and the
  strongest against it, written separately so neither is a straw man.
- **Peer review** — three referees on method, contribution, and claims
  against evidence.

It does not target AI detectors. It edits for the reader.

## Running it

Open `index.html`. That is the whole thing: one file, no build step, no
server. React is loaded from a CDN; everything else is in the file.

To put it online, drop `index.html` in any static host — GitHub Pages,
Netlify, Cloudflare Pages.

## The API key

There is no server, so the page uses **your own Anthropic API key**,
which you can create at https://console.anthropic.com/settings/keys

The key is kept in this browser's `localStorage` and attached to
requests to `api.anthropic.com` only. It is not sent anywhere else and
there is nowhere else for it to go — there is no backend.

Be clear about what that means: a key held in a browser can be read by
anything able to run script on the page. Use a key you can revoke, watch
your usage, and never paste a key into a page you did not build or
cannot read. Every request you make is billed to your own account.

To remove the key, clear site data for this page in your browser, or run
`localStorage.removeItem('plainer:key')` in the console.

## What it remembers

Your decisions are kept in this browser: which kinds of change you keep
rejecting, wording you have put back, terms you marked as off limits,
and a log of passages for the progress view. Kept per language, since a
phrase you defended in Arabic says nothing about your English. There is
a panel that shows all of it and a button that wipes it. Nothing leaves
the browser.

## Rebuilding

`index.html` is generated. The sources are `app.jsx` (the application)
and `shim.jsx` (the key gate and browser storage), compiled together:

    npx esbuild bundle.jsx --loader:.jsx=jsx --jsx=transform \
      --jsx-factory=React.createElement --jsx-fragment=React.Fragment \
      --minify --outfile=app.min.js

then inlined into the page template.

## Licence

MIT.
