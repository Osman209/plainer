# plainer
https://osman209.github.io/plainer/
A style editor for academic and technical prose in English and Arabic.
It shows every change with the reason for it, so you decide one
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

## Four review choices

- **ChatGPT — manual**: works on GitHub Pages or by opening `index.html`.
  No API key or backend is needed. Start any review, copy the request from
  the dialog into ChatGPT, then paste the JSON response back. Plainer
  displays the same edits and reasons with individual accept/undo controls.
  Keep Plainer open during the exchange. Long drafts, Debate and Peer
  review require several exchanges. Nothing is sent to ChatGPT automatically.
- **OpenAI API**: runs through the local server using Responses API.
- **Claude API**: runs through the same server using Anthropic Messages API.
- **Claude — manual**: the same copy-and-paste workflow, opening Claude
  instead of ChatGPT. No API key is required; the service's account limits apply.

Choose English or Arabic in the top bar. The selection is saved in this
browser and controls labels, settings, messages, direction and review language.
Switching languages preserves the draft and returns to the editor.

## Import documents

Choose or drop one PDF, Word (.docx), or UTF-8 TXT file, up to 10 MB.
Text is extracted in the browser and appended to the existing draft.
Dismiss the filename without deleting your draft. DOC files must first be
saved as DOCX; scanned PDFs require OCR elsewhere. Formatting is not imported.
Use GitHub Pages or the local server for PDF imports; browsers restrict PDF
modules when opening HTML directly from disk.

Static hosting must include `index.html`, `mammoth.browser.js`,
`pdf.min.mjs`, and `pdf.worker.min.mjs`. `npm run build` prepares these files.

The selector disables API providers until their server configuration is
available. The manual option remains available even without a server.
Provider changes are disabled while a model request is pending.

## Local setup (Windows, macOS or Linux)

Install Node.js 22 or newer. In the project folder:

```sh
npm install
```

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`).
Open `.env` locally in a text editor and fill only the provider you want:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=your-available-model-id
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-4-6
PORT=3000
```

For OpenAI, choose a model supported by Responses API and available to your
API account. Both key and model are required to enable that provider.
Leave unused keys blank. Never paste real keys into issues or commit them.

```sh
npm start
```

Open http://127.0.0.1:3000. Restart the server after changing `.env`.
The server itself runs on your computer without a hosting subscription;
model API requests are billed by the configured provider. Manual mode
makes no model API requests from Plainer.

## Hosting and keys

GitHub Pages serves the manual mode only. It cannot run `server.mjs`.
The included server deliberately listens on **127.0.0.1 only** and rejects
foreign origins/hosts. It is for personal local use, not public deployment.
A public API-backed edition needs authentication, per-user quotas and
HTTPS hosting before exposing paid provider credentials through a service.

Provider keys stay in server environment variables. They are never returned
to the browser. This version removes the old `plainer:key` localStorage
entry; reconfigure Claude in `.env` if upgrading from the browser-key version.
Do not put `.env` in GitHub Pages or any static public folder.

## What it remembers and sends

Editing preferences and the progress log remain in this browser's
localStorage, per language. They can be inspected and cleared in the app.
A review sends the selected passage and its editing instructions, including
relevant preferences, to the selected API provider through the local server.
Manual mode prepares that information for you to copy into ChatGPT or Claude yourself.
There is no automatic synchronization between devices or ChatGPT chats.

## Development

`app.jsx` contains the editor. `shim.jsx` contains storage, the provider
selector, the common transport and manual exchange dialog. The app's six
model call sites all use that transport. `server.mjs` validates requests,
keeps credentials on the server and normalizes both providers' responses.

```sh
npm run build
npm test
```

The reproducible build combines both JSX sources and inserts the compiled
code into `index.template.html` to produce `index.html`. Commit the generated
page alongside its sources for GitHub Pages. React still loads from a CDN.
Tests use mocked provider responses and do not incur API charges.

Repeated source text inside one edit chunk is treated as ambiguous and
reported as unmatched rather than silently modifying the first occurrence.

## Licence

MIT.
