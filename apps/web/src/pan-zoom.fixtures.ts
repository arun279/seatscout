import { fireEvent } from "@testing-library/react";

export const MAP_ON_SCREEN = { left: 20, top: 100, width: 340 };

export const wrapper = (dialog: HTMLElement) => {
  const group = dialog.querySelector<SVGGElement>("svg > g");
  if (group === null) throw new Error("the map has no wrapping group");
  return group;
};

export const viewOf = (group: SVGElement) => {
  const [tx = 0, ty = 0, scale = 1] = (
    /translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/.exec(
      group.getAttribute("transform") ?? "",
    ) ?? []
  )
    .slice(1)
    .map(Number);
  return { tx, ty, scale };
};

export const scaleOf = (group: SVGElement) => viewOf(group).scale;

export const framedBy = (element: SVGElement) => {
  const [, , width = 1, height = 1] = (
    element.ownerSVGElement?.getAttribute("viewBox") ?? ""
  )
    .split(" ")
    .map(Number);
  return { width, height, perUnit: MAP_ON_SCREEN.width / width };
};

export const onScreen = function (this: SVGElement) {
  const { tx, ty, scale } = viewOf(this);
  const { height, perUnit } = framedBy(this);
  return new DOMRect(
    MAP_ON_SCREEN.left + tx * perUnit,
    MAP_ON_SCREEN.top + ty * perUnit,
    MAP_ON_SCREEN.width * scale,
    height * perUnit * scale,
  );
};

export const spanOf = (group: SVGElement, cell: Element) => {
  const { tx, ty, scale } = viewOf(group);
  const { height, perUnit } = framedBy(group);
  const [dx = 0, dy = 0] = (
    /translate\(([-\d.]+) ([-\d.]+)\)/.exec(
      group.firstElementChild?.getAttribute("transform") ?? "",
    ) ?? []
  )
    .slice(1)
    .map(Number);
  const at = (offset: number, along: number, shift: number) =>
    offset + (along + scale * shift) * perUnit;
  const x = Number(cell.getAttribute("x")) + dx;
  const y = Number(cell.getAttribute("y")) + dy;
  return {
    left: at(MAP_ON_SCREEN.left, tx, x),
    right: at(MAP_ON_SCREEN.left, tx, x + Number(cell.getAttribute("width"))),
    top: at(MAP_ON_SCREEN.top, ty, y),
    bottom: at(MAP_ON_SCREEN.top, ty, y + Number(cell.getAttribute("height"))),
    frame: {
      right: MAP_ON_SCREEN.left + MAP_ON_SCREEN.width,
      bottom: MAP_ON_SCREEN.top + height * perUnit,
    },
  };
};

export const underPointer = (
  group: SVGElement,
  client: { x: number; y: number },
) => {
  const { tx, ty, scale } = viewOf(group);
  const { perUnit } = framedBy(group);
  return {
    x: ((client.x - MAP_ON_SCREEN.left) / perUnit - tx) / scale,
    y: ((client.y - MAP_ON_SCREEN.top) / perUnit - ty) / scale,
  };
};

export const drag = (
  group: SVGElement,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  pointerId = 1,
) => {
  fireEvent.pointerDown(group, {
    pointerId,
    clientX: from.x,
    clientY: from.y,
  });
  fireEvent.pointerMove(group, { pointerId, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(group, { pointerId, clientX: to.x, clientY: to.y });
};
