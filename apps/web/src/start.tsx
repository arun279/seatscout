import { createRoot } from "react-dom/client";
import { browserAddress, browserClock, browserSeatScout } from "./browser.js";
import { Root } from "./root.js";

export const startApp = () => {
  const mount = document.getElementById("app");
  if (mount === null) throw new Error("the page has nothing to mount into");
  const root = createRoot(mount);
  root.render(
    <Root
      seatscout={browserSeatScout()}
      address={browserAddress()}
      clock={browserClock()}
    />,
  );
  return root;
};
