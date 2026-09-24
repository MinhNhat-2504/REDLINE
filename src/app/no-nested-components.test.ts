import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// A component declared inside another component's body is a brand-new component
// type on every render, so React unmounts and remounts it each time the parent
// updates. For a label that is only wasteful. For an <input type="range"> it
// meant the element under the pointer was destroyed after the first step of a
// drag: the policy sliders could be clicked but not dragged, and nothing in the
// type checker, the build or the other tests could see it.
const root = __dirname;
const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".tsx") && !name.includes(".test.")) files.push(path);
  }
};
walk(root);

// An indented `function Capitalised(` — a declaration that is not at module level.
const NESTED_COMPONENT = /^[ \t]+function [A-Z][A-Za-z0-9]*[ \t]*[(<]/;

describe("components are declared at module level", () => {
  it("finds the source files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("has no capitalised function declared inside another function", () => {
    const nested = files.flatMap(file =>
      readFileSync(file, "utf8").split("\n")
        .map((line, i) => ({ line, at: `${relative(root, file).split(sep).join("/")}:${i + 1}` }))
        .filter(({ line }) => NESTED_COMPONENT.test(line))
        .map(({ line, at }) => `${at}  ${line.trim()}`));
    expect(nested, "hoist these to module scope").toEqual([]);
  });
});
