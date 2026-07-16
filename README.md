**English** | [简体中文](README.zh-CN.md)

# MyIP — Personal IP Address Detector

A personal, ad-free clone of [ip.sb](https://ip.sb): shows your IP address,
ISP, ASN, and location, plus WHOIS, ASN, and DNS lookup tools. No ads, no
tracking, no third-party GeoIP database.

**Live:** https://myip.1000600.xyz

## Features

- **IP detail card** — address, hostname (reverse DNS), ISP, organization,
  ASN, country/region/city, timezone, coordinates, edge colo. Sourced
  entirely from Cloudflare's edge `cf` object, zero external API calls.
- **WHOIS / RDAP lookup** — for an IP or domain, routed directly to the
  correct regional registry (ARIN/RIPE/APNIC/LACNIC/AFRINIC) or TLD
  registry using IANA's official bootstrap files, instead of going through
  a third-party proxy that bot-blocks Cloudflare Workers.
- **ASN lookup** — via Team Cymru's DNS-based ASN records (same
  DNS-over-HTTPS technique as the DNS tool, no flaky third-party HTTP API).
- **DNS record lookup** — A/AAAA/MX/TXT/NS/CNAME/SOA via Cloudflare's
  DNS-over-HTTPS resolver.
- **English / 简体中文 language switcher** — persisted in `localStorage`,
  falls back to browser language. Country names render fully spelled out
  (via `Intl.DisplayNames`) in whichever language is selected.
- **Human-readable results** — WHOIS/ASN/DNS results render as label/value
  tables, with a collapsible "Raw JSON" section for the full data.

## Tech stack

Plain HTML/CSS/JS — no framework, no build step. Backend is a handful of
[Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
(`functions/api/*.js`).

## Project structure

```
myip/
├── index.html          # IP detail card (home page)
├── tools.html           # WHOIS/ASN + DNS lookup tools
├── style.css
├── app.js                # renders the IP card
├── tools.js              # wires up the lookup forms/tabs
├── format.js             # turns RDAP/DNS JSON into readable tables
├── i18n.js                # EN/ZH translations + country-name helper
├── functions/api/
│   ├── whoami.js         # your IP/ASN/ISP/location + reverse DNS
│   ├── whois.js           # RDAP lookup (IANA bootstrap routing)
│   ├── asn.js              # ASN lookup (Team Cymru DNS)
│   └── dns.js               # DNS record lookup (Cloudflare DoH)
├── deploy.sh              # deploy wrapper — see CACHING.md
├── _headers                # Cloudflare Pages cache-control rules
└── wrangler.toml
```

## Local development

```bash
wrangler pages dev .
```

## Deployment

```bash
./deploy.sh
```

Don't call `wrangler pages deploy` directly — `deploy.sh` also stamps the
current git commit hash into the static asset URLs so browsers never serve
a stale cached copy after a deploy. See [CACHING.md](CACHING.md) for the
full explanation of how that works and why it's needed.

## Documentation

- [CACHING.md](CACHING.md) ([中文](CACHING.zh-CN.md)) — the cache-busting
  strategy (git-hash auto-versioning + the `_headers` file): why it exists,
  how each piece works, and how to reuse the pattern in other static-site
  projects.
