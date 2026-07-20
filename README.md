# hyrox-builder-content

A minimal, deterministic carousel renderer for Traditional Chinese and Cantonese social content. It uses HTML/CSS and Playwright Chromium to create 1080 × 1350 PNG files.

## Add a carousel

Create a JSON file under `posts/`:

```json
{
  "slug": "my-post-slug",
  "slides": [
    {
      "type": "cover",
      "eyebrow": "短標題",
      "title": "主標題"
    },
    {
      "type": "point",
      "number": "01",
      "title": "重點",
      "subtitle": "補充內容"
    },
    {
      "type": "cta",
      "title": "Save 低再睇",
      "handle": "Follow @hyrox_builder"
    }
  ]
}
```

The `slug` must contain only lowercase letters, numbers and hyphens. Supported slide types are `cover`, `point` and `cta`.

## Render locally

Node.js 20 or later is recommended.

```bash
npm install
npx playwright install chromium
npm run render
```

PNG files are written to:

```text
docs/generated/<post-slug>/01.png
docs/generated/<post-slug>/02.png
...
```

For correct Traditional Chinese rendering, install a Noto CJK font on the machine. The GitHub Actions workflow installs `fonts-noto-cjk` automatically.

## Automatic rendering

A push to `main` that changes `posts/**`, `scripts/**`, `package.json`, or the workflow triggers `.github/workflows/render.yml`. The workflow:

1. installs Node.js, Noto CJK fonts and Playwright Chromium;
2. renders every JSON post;
3. commits changed PNG files under `docs/generated/` back to the repository.

The workflow uses only GitHub Actions and repository write permission. It requires no paid services or secrets.

## Visual policy

The renderer uses an original black, off-white and safety-yellow hybrid-racing style. Do not add official HYROX logos or copyrighted athlete photographs.
