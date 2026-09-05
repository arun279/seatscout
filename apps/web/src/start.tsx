import { createRoot } from "react-dom/client";
import { browserAddress, browserClock, browserSeatScout } from "./browser.js";
import { rememberedBy, Root } from "./root.js";

export const startApp = async () => {
  const mount = document.getElementById("app");
  if (mount === null) throw new Error("the page has nothing to mount into");
  const seatscout = browserSeatScout();
  const remembered = await rememberedBy(seatscout);
  const root = createRoot(mount);
  root.render(
    <Root
      seatscout={seatscout}
      address={browserAddress()}
      clock={browserClock()}
      remembered={remembered}
    />,
  );
  return root;
};
