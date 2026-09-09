import { dirname } from "node:path";

const LINK = /<link[^>]*>/g;
const HREF = /href="([^"]*)"/;
const COMMENT = /\/\*[\s\S]*?\*\//g;
const PRELUDE = /[^{}]*\{/g;
const CLASS = /\.[\w-]+/g;
const BARE = /^\.[\w-]+$/;

export const STYLESHEET = 'rel="stylesheet"';

const hrefOf = (tag: string): string => {
  const href = HREF.exec(tag)?.[1];
  if (href === undefined)
    throw new Error(`${tag} links a stylesheet with no href`);
  return href;
};

export const linked = (html: string): readonly string[] =>
  [...html.matchAll(LINK)]
    .filter(([tag]) => tag.includes(STYLESHEET))
    .map(([tag]) => hrefOf(tag));

export const beside = (html: string, href: string): string =>
  `${dirname(html)}/${href.startsWith("/") ? href.slice(1) : href}`;

export const ruledIn = (css: string): readonly string[] =>
  [...css.replace(COMMENT, " ").matchAll(PRELUDE)].flatMap(([prelude]) => {
    if (prelude.trimStart().startsWith("@")) return [];
    return [...prelude.matchAll(CLASS)].map(([named]) => named.slice(1));
  });

export const bareIn = (css: string): readonly string[] =>
  [...css.replace(COMMENT, " ").matchAll(PRELUDE)].flatMap(([prelude]) =>
    prelude
      .slice(0, -1)
      .split(",")
      .map((one) => one.trim())
      .filter((one) => BARE.test(one))
      .map((one) => one.slice(1)),
  );
