import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const PUBLIC = "apps/web/public";
const SOURCE = `${PUBLIC}/icon.svg`;
const RASTERS = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];
const FAVICON_SIZE = 32;

const icoOf = (png, size) => {
  const header = Buffer.alloc(6 + 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
};

const rendered = async (page, svg, size) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="data:image/svg+xml;base64,${svg.toString("base64")}" alt="">`,
  );
  return page.screenshot({ omitBackground: true, type: "png" });
};

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const svg = readFileSync(SOURCE);
for (const raster of RASTERS)
  writeFileSync(
    `${PUBLIC}/${raster.file}`,
    await rendered(page, svg, raster.size),
  );
writeFileSync(
  `${PUBLIC}/favicon.ico`,
  icoOf(await rendered(page, svg, FAVICON_SIZE), FAVICON_SIZE),
);
await browser.close();
