# Browser cache busting: how this project avoids stale content

Written as a reference for future-me and for reuse in other static-site
projects. Explains the problem we hit, the two fixes we layered on top of
each other, and why both are needed.

## The problem

After every deploy, browsers (Safari and Chrome both did this) kept
serving an old cached copy of `index.html`, `tools.html`, or the `.js`
files — even though the server had new content and even though the
server was already sending `Cache-Control: public, max-age=0,
must-revalidate`. Browsers don't always honor revalidation contracts
consistently, especially across tab restores, back/forward navigation,
and disk cache reuse. Relying on the browser to "do the right thing" with
cache headers alone wasn't reliable enough.

The fix is two independent techniques stacked together: one that makes
staleness *structurally impossible* for JS/CSS (cache-busting via the
URL itself), and one that tells every cache in the path (browser, CDN,
proxies) exactly how to behave for each type of file (`_headers`).

## Approach 1: cache-busting via versioned URLs

**The core idea:** a browser cache is keyed by the full URL, including
the query string. `app.js?v=abc123` and `app.js?v=def456` are two
completely separate cache entries as far as the browser is concerned —
so if the URL changes, there is nothing to "get stale." This sidesteps
browser cache-policy bugs/quirks entirely, because the browser was never
asked to reuse or revalidate anything — it just sees a URL it's never
fetched before.

**Why not hand-bump `?v=1`, `?v=2`, ...?** Works, but you have to
remember to do it on every deploy, and it's easy to forget (we did,
twice, mid-project). The fix: derive the version from the git commit
hash automatically, since a new commit already means "content changed."

**The chicken-and-egg problem:** if you bake the commit hash directly
into a tracked file and commit it, that commit's hash is calculated
*before* the file exists in its final form — so the hash in the file is
always one commit behind, and every commit touches the HTML just to
update a version number, cluttering history.

**The fix we used:** keep a placeholder in the source file that's
committed to git (`?v=__VERSION__`), and only substitute the real commit
hash into a *temporary* copy at deploy time — never committed.

`index.html` / `tools.html` (as checked into git):
```html
<script src="app.js?v=__VERSION__"></script>
```

`deploy.sh`:
```bash
#!/bin/bash
set -e
cd "$(dirname "$0")"

VERSION=$(git rev-parse --short HEAD)
FILES=(index.html tools.html)

restore() {
  for f in "${FILES[@]}"; do
    [ -f "$f.bak" ] && mv "$f.bak" "$f"
  done
}
trap restore EXIT

for f in "${FILES[@]}"; do
  cp "$f" "$f.bak"
  sed -i '' "s/__VERSION__/$VERSION/g" "$f"
done

wrangler pages deploy . --project-name myip --branch main "$@"
```

What happens when you run `./deploy.sh`:
1. Back up `index.html`/`tools.html` to `.bak`.
2. Replace `__VERSION__` in the real files with the current short commit
   hash (e.g. `019121c`).
3. Deploy — Cloudflare now serves `app.js?v=019121c`.
4. `trap restore EXIT` puts the placeholder files back, whether the
   deploy succeeded or failed, so `git status` is clean immediately
   after — the substituted hash never gets committed.

Net effect: every commit automatically gets a permanently-cached,
uniquely-versioned set of asset URLs, with zero manual bookkeeping and
zero git history noise.

## Approach 2: the `_headers` file

**What it is:** a plain-text file named `_headers` at the project root.
No build step required — Cloudflare Pages reads it at deploy time and
attaches the listed HTTP headers to matching response paths. (Netlify
supports the same file format, if that's ever relevant.)

**Syntax:** a path pattern on its own line, followed by indented
`Header: value` lines that apply to it.

Ours:
```
/
  Cache-Control: no-cache

/tools
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache

/tools.html
  Cache-Control: no-cache

/app.js
  Cache-Control: public, max-age=31536000, immutable

/tools.js
  Cache-Control: public, max-age=31536000, immutable

/format.js
  Cache-Control: public, max-age=31536000, immutable

/i18n.js
  Cache-Control: public, max-age=31536000, immutable

/style.css
  Cache-Control: public, max-age=31536000, immutable

/api/*
  Cache-Control: no-store
```

**What each directive actually means** (this is the part worth
remembering — the names are misleading):
- `no-cache` — despite the name, this *allows* caching. It means "cache
  it, but revalidate with the server before every use" (a conditional
  request with `If-None-Match`/ETag). If unchanged, the server replies
  `304 Not Modified` and the cached body is reused — fast, no
  re-download, but always confirmed fresh. Used on the HTML pages: they
  change on every deploy, so we always want to check.
- `no-store` — the strict one. Don't cache this response *at all*,
  anywhere, ever. Used on `/api/*` because IP/WHOIS/DNS lookups are live
  data — caching a WHOIS result would show you stale network info after
  a VPN swap.
- `public, max-age=31536000, immutable` — cache this for a year and
  never even ask the server if it's still valid. `immutable` is a
  browser-only hint (Firefox/Safari especially) that skips the
  revalidation request even on a hard refresh. Safe *only* because the
  URL already changes via `?v=<hash>` on every deploy — there is nothing
  to invalidate, since a content change always means a new URL.

**Why keep both approaches instead of picking one:** versioned URLs are
the stronger guarantee for assets (they don't depend on any cache
implementation behaving correctly), but they only solve the problem for
files you control and reference by URL — they don't help the *HTML
itself* (that page you navigate to that references the file). `_headers`
covers that gap, and also governs any intermediate cache (Cloudflare's
own edge cache, corporate proxies) that the browser-only versioning
trick can't reach. Together: HTML always revalidates, JS/CSS/assets
never even need to, and API responses are never cached anywhere.

## Reusing this in a future project

1. Copy `deploy.sh`, adjusting `FILES=(...)` to list whichever HTML
   files reference your versioned assets, and the `--project-name` flag.
2. In those HTML files, append `?v=__VERSION__` to every `<script src>`
   and `<link href>` you control.
3. Copy `_headers`, adjusting the asset filenames to match your project,
   keeping the same three-tier pattern: `no-cache` on HTML entry points,
   `immutable` on versioned static assets, `no-store` on any live/API
   routes.
4. Deploy with `./deploy.sh` instead of calling `wrangler pages deploy`
   directly.
5. Add `*.bak` to `.gitignore` (deploy.sh's temp backup files).

No build tool, bundler, or framework required — this works for any
static site with plain HTML/JS/CSS.
