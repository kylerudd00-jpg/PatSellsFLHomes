# Pat Sells FL Homes

Static website concept for Pat Magno's South Florida real estate brand.

## Local Preview

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

## Lead Capture

The lead forms submit to `/api/leads` first. If that endpoint is not available
or has no production delivery configured, the browser falls back to the existing
FormSubmit path so the static site still works.

Backend-ready files:

- `api/leads.js` - Vercel-style serverless adapter.
- `netlify/functions/leads.js` - Netlify function adapter.
- `api/_lead-handler.js` - shared validation, spam guard, attribution, and delivery logic.
- `netlify.toml` - routes `/api/leads` to the Netlify function.
- `.env.example` - optional webhook/FormSubmit environment variables.

Captured attribution includes form type, page URL, referrer, timestamp, and UTM
parameters. The endpoint validates name/email, ignores honeypot spam, rate
limits repeated submissions, and logs locally when no delivery credentials are
configured.

To connect a private delivery path later, copy `.env.example` to `.env` and set
`LEAD_WEBHOOK_URL`, `LEAD_FORWARD_URL`, or `FORMSUBMIT_EMAIL` in the deployment
environment.

## Video Assets

The hero reel was adapted from royalty-free Pexels clips:

- https://www.pexels.com/video/stunning-aerial-view-of-palm-beach-coastline-33983092/
- https://www.pexels.com/video/aerial-view-of-west-palm-beach-cityscape-33840196/
- https://www.pexels.com/video/aerial-view-of-west-palm-beach-coastline-33840195/

The page still images are exported frames from that local-market video reel.

## Headshot

The site currently uses a branded `PM` placeholder in the Meet Pat section. When Pat's real headshot is ready, replace the placeholder `advisor-photo` block in `index.html` with an image that points to the final asset.
