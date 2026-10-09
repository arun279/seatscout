import { blankTree } from "./blank-tree.js";

const [root] = process.argv.slice(2);
if (root === undefined) {
  process.stderr.write("usage: blank-index <directory>\n");
  process.exitCode = 2;
} else if (blankTree(root) === 0) {
  process.stderr.write(`${root} holds no script to blank\n`);
  process.exitCode = 1;
}
