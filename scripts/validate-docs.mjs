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

async function validateRenderedRegression() {
  const builtVue = path.resolve("docs/.vuepress/dist/frontend/vue.html");
  try {
    await access(builtVue);
  } catch {
    return [];
  }

  const html = await readFile(builtVue, "utf8");
  const moduleExports = /<span[^>]*>module<\/span>[\s\S]{0,2000}?<span[^>]*>exports<\/span>/.exec(html);
  if (!moduleExports) {
    return ["rendered frontend/vue.html: expected module.exports example is missing"];
  }

  const before = html.slice(0, moduleExports.index);
  const codeStart = before.lastIndexOf('<div class="language-js');
  const paragraphStart = before.lastIndexOf("<p>");
  if (codeStart < paragraphStart || html.includes("<p>module.exports")) {
    return ["rendered frontend/vue.html: module.exports escaped its code block"];
  }
  return [];
}

const failures = [];
for (const file of (await walk(docsRoot)).sort()) {
  const relative = path.relative(process.cwd(), file);
  const source = await readFile(file, "utf8");
  for (const error of [...validateFrontmatter(file, source), ...validateFences(file, source)]) {
    failures.push(`${relative}:${error}`);
  }
}

failures.push(...(await validateRenderedRegression()));

if (failures.length) {
  console.error("Markdown validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Markdown frontmatter and code fences are valid.");
}
