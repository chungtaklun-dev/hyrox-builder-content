import { chromium } from "playwright";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "posts");
const OUTPUT_ROOT = path.join(ROOT, "docs", "generated");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function validatePost(post, filename) {
  if (!post || typeof post !== "object") throw new Error(`${filename}: expected an object`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug ?? "")) {
    throw new Error(`${filename}: slug must use lowercase letters, numbers and hyphens`);
  }
  if (!Array.isArray(post.slides) || post.slides.length === 0) {
    throw new Error(`${filename}: slides must be a non-empty array`);
  }

  const allowed = new Set(["cover", "point", "cta"]);
  post.slides.forEach((slide, index) => {
    if (!allowed.has(slide.type)) {
      throw new Error(`${filename}: slide ${index + 1} has an unsupported type`);
    }
  });
}

function slideMarkup(slide, index, total) {
  const eyebrow = slide.eyebrow
    ? `<div class="eyebrow">${escapeHtml(slide.eyebrow)}</div>`
    : "";
  const number = slide.number
    ? `<div class="number">${escapeHtml(slide.number)}</div>`
    : "";
  const title = slide.title
    ? `<h1>${escapeHtml(slide.title)}</h1>`
    : "";
  const subtitle = slide.subtitle
    ? `<p>${escapeHtml(slide.subtitle)}</p>`
    : "";
  const handle = slide.handle
    ? `<div class="handle">${escapeHtml(slide.handle)}</div>`
    : "";

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<style>
  :root {
    --ink: #0b0b0b;
    --paper: #f4f0e6;
    --yellow: #f5df18;
  }
  * { box-sizing: border-box; }
  html, body {
    width: 1080px;
    height: 1350px;
    margin: 0;
    overflow: hidden;
    background: var(--paper);
  }
  body {
    font-family: "Noto Sans CJK TC", "Noto Sans TC", sans-serif;
    color: var(--ink);
  }
  .slide {
    position: relative;
    width: 1080px;
    height: 1350px;
    padding: 88px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background:
      linear-gradient(135deg, transparent 0 70%, rgba(245,223,24,.36) 70% 84%, transparent 84%),
      var(--paper);
  }
  .slide::before {
    content: "";
    position: absolute;
    inset: 28px;
    border: 5px solid var(--ink);
    pointer-events: none;
  }
  .brand {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font: 800 26px/1 "Noto Sans CJK TC", sans-serif;
    letter-spacing: .11em;
    text-transform: uppercase;
  }
  .brand-mark {
    width: 54px;
    height: 18px;
    background: var(--yellow);
    border: 3px solid var(--ink);
  }
  .content {
    position: relative;
    z-index: 1;
    max-width: 900px;
  }
  .eyebrow, .number {
    display: inline-block;
    background: var(--yellow);
    border: 4px solid var(--ink);
    padding: 14px 22px;
    margin-bottom: 38px;
    font-weight: 900;
    font-size: 38px;
    line-height: 1;
  }
  .number {
    font-size: 76px;
    min-width: 150px;
    text-align: center;
  }
  h1 {
    margin: 0;
    font-size: 104px;
    line-height: 1.08;
    letter-spacing: -.045em;
    font-weight: 900;
    white-space: pre-line;
  }
  p {
    margin: 42px 0 0;
    max-width: 850px;
    font-size: 47px;
    line-height: 1.38;
    font-weight: 650;
    white-space: pre-line;
  }
  .slide.point h1 { font-size: 88px; }
  .slide.cta {
    background: var(--ink);
    color: var(--paper);
  }
  .slide.cta::before { border-color: var(--yellow); }
  .slide.cta .brand-mark { border-color: var(--paper); }
  .slide.cta h1 { font-size: 108px; color: var(--yellow); }
  .handle {
    margin-top: 52px;
    font-size: 48px;
    font-weight: 800;
  }
  .footer {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: end;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: .06em;
  }
  .rule {
    width: 132px;
    height: 12px;
    background: var(--yellow);
  }
</style>
</head>
<body>
  <main class="slide ${escapeHtml(slide.type)}">
    <header class="brand">
      <span>HYBRID RACE NOTES</span>
      <span class="brand-mark" aria-hidden="true"></span>
    </header>
    <section class="content">
      ${eyebrow}
      ${number}
      ${title}
      ${subtitle}
      ${handle}
    </section>
    <footer class="footer">
      <span>@hyrox_builder</span>
      <span class="rule" aria-hidden="true"></span>
      <span>${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
    </footer>
  </main>
</body>
</html>`;
}

await mkdir(OUTPUT_ROOT, { recursive: true });
const filenames = (await readdir(POSTS_DIR))
  .filter((name) => name.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b, "en"));

if (filenames.length === 0) {
  console.log("No JSON posts found.");
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 1
});

try {
  for (const filename of filenames) {
    const post = JSON.parse(await readFile(path.join(POSTS_DIR, filename), "utf8"));
    validatePost(post, filename);
    const outputDir = path.join(OUTPUT_ROOT, post.slug);
    await mkdir(outputDir, { recursive: true });

    for (const [index, slide] of post.slides.entries()) {
      await page.setContent(slideMarkup(slide, index, post.slides.length), {
        waitUntil: "load"
      });
      await page.evaluate(() => document.fonts.ready);
      const outputPath = path.join(
        outputDir,
        `${String(index + 1).padStart(2, "0")}.png`
      );
      await page.screenshot({
        path: outputPath,
        type: "png",
        animations: "disabled"
      });
      console.log(`Rendered ${path.relative(ROOT, outputPath)}`);
    }
  }
} finally {
  await browser.close();
}
