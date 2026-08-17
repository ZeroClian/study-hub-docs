import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const docsRoot = path.resolve("docs");

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".vuepress" || entry.name === "dist") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(entryPath)));
    else if (entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

async function walkRenderedHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkRenderedHtml(entryPath)));
    else if (entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

function validateFences(file, source) {
  const lines = source.split(/\r?\n/);
  const errors = [];
  let open = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^(\s*)(`{3,}|~{3,})(.*)$/.exec(line);

    if (!open) {
      if (match) {
        open = {
          character: match[2][0],
          length: match[2].length,
          indent: match[1].length,
          info: match[3].trim(),
          line: index + 1,
          content: [],
        };
      }
      continue;
    }

    if (
      match &&
      match[2][0] === open.character &&
      match[2].length >= open.length &&
      match[3].trim() === ""
    ) {
      const nonEmptyContent = open.content.filter((content) => content.trim());
      const minimumContentIndent = nonEmptyContent.length
        ? Math.min(...nonEmptyContent.map((content) => content.match(/^\s*/)[0].length))
        : open.indent;

      if (open.indent > 0 && minimumContentIndent < open.indent) {
        errors.push(
          `${open.line}-${index + 1}: fenced block content is less indented than its opening fence`,
        );
      }
      open = null;
      continue;
    }

    open.content.push(line);
  }

  if (open) errors.push(`${open.line}: unclosed ${open.character.repeat(open.length)} fence`);
  return errors;
}

function validateFrontmatter(file, source) {
  if (!source.startsWith("---\n") || !/^---\n[\s\S]*?\n---\n/.test(source)) {
    return ["missing YAML frontmatter"];
  }
  return [];
}

function validateRootRelativeLinks(source) {
  const errors = [];
  let fence = null;

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }

    if (fence) continue;

    const linkPattern = /(?<!!)\[[^\]]+\]\((\/(?!\/)[^)\s]+)\)/g;
    for (const match of line.matchAll(linkPattern)) {
      errors.push(
        `${index + 1}: root-relative internal link ${match[1]} bypasses the GitHub Pages project base`,
      );
    }
  }

  return errors;
}

async function validateRenderedRegression() {
  const errors = [];
  const distRoot = path.resolve("docs/.vuepress/dist");
  const builtVue = path.join(distRoot, "frontend/vue.html");
  try {
    await access(builtVue);
  } catch {
    if (process.env.REQUIRE_RENDERED === "true") {
      errors.push("rendered site: expected build output is missing");
    }
    return errors;
  }

  const html = await readFile(builtVue, "utf8");
  const moduleExports = /<span[^>]*>module<\/span>[\s\S]{0,2000}?<span[^>]*>exports<\/span>/.exec(html);
  if (!moduleExports) {
    errors.push("rendered frontend/vue.html: expected module.exports example is missing");
  } else {
    const before = html.slice(0, moduleExports.index);
    const codeStart = before.lastIndexOf('<div class="language-js');
    const paragraphStart = before.lastIndexOf("<p>");
    if (codeStart < paragraphStart || html.includes("<p>module.exports")) {
      errors.push("rendered frontend/vue.html: module.exports escaped its code block");
    }
  }

  const projectBase = "/study-hub-docs/";
  const canonicalSite = "https://zeroclian.github.io/study-hub-docs/";
  const robots = await readFile(path.join(distRoot, "robots.txt"), "utf8");
  if (!robots.includes(`Sitemap: ${canonicalSite}sitemap.xml`)) {
    errors.push("rendered robots.txt: sitemap URL does not match the canonical GitHub Pages site");
  }

  const sitemap = await readFile(path.join(distRoot, "sitemap.xml"), "utf8");
  if (!sitemap.includes(`<loc>${canonicalSite}</loc>`)) {
    errors.push("rendered sitemap.xml: canonical GitHub Pages home URL is missing");
  }
  if (robots.includes("zeroclian.cn") || sitemap.includes("zeroclian.cn")) {
    errors.push("rendered metadata: stale zeroclian.cn custom domain remains");
  }

  try {
    await access(path.join(distRoot, "CNAME"));
    errors.push("rendered site: stale custom-domain CNAME remains");
  } catch {
    // The canonical deployment uses the default GitHub Pages project URL.
  }

  for (const file of await walkRenderedHtml(distRoot)) {
    const rendered = await readFile(file, "utf8");
    const invalidUrls = new Set();
    for (const match of rendered.matchAll(/(?:href|src)="(\/(?!\/)[^"]+)"/g)) {
      if (!match[1].startsWith(projectBase)) invalidUrls.add(match[1]);
    }
    for (const url of invalidUrls) {
      errors.push(
        `${path.relative(distRoot, file)}: rendered URL ${url} bypasses the GitHub Pages project base`,
      );
    }
  }

  return errors;
}

const failures = [];
for (const file of (await walk(docsRoot)).sort()) {
  const relative = path.relative(process.cwd(), file);
  const source = await readFile(file, "utf8");
  for (const error of [
    ...validateFrontmatter(file, source),
    ...validateFences(file, source),
    ...validateRootRelativeLinks(source),
  ]) {
    failures.push(`${relative}:${error}`);
  }
}

failures.push(...(await validateRenderedRegression()));

if (failures.length) {
  console.error("Documentation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Documentation validation passed.");
}
