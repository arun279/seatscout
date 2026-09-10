import { describe, expect, it } from "vitest";
import { seatMapBodyWithStatuses } from "./seat-map-body.js";

describe("a seat map body with statuses", () => {
  it("decodes valid seats and writes exactly the statuses read for them", () => {
    const read: string[] = [];
    const body = JSON.stringify({
      seats: [
        { id: "G6", status: "A" },
        { id: "G7", status: "R" },
      ],
    });

    expect(
      JSON.parse(
        seatMapBodyWithStatuses(body, (seat) => {
          read.push(`${seat.id}:${seat.status}`);
          return `${seat.status}!`;
        }),
      ),
    ).toEqual({
      seats: [
        { id: "G6", status: "A!" },
        { id: "G7", status: "R!" },
      ],
    });
    expect(read).toEqual(["G6:A", "G7:R"]);
  });

  it("refuses a body whose seats are not an array by returning it unchanged", () => {
    const body = JSON.stringify({ seats: "G6" });

    expect(seatMapBodyWithStatuses(body, () => "R")).toBe(body);
  });

  it("leaves a seat without a string id unchanged and unread", () => {
    const body = JSON.stringify({ seats: [{ id: 6, status: "A" }] });

    expect(JSON.parse(seatMapBodyWithStatuses(body, () => "R"))).toEqual({
      seats: [{ id: 6, status: "A" }],
    });
  });

  it("leaves a seat without a string status unchanged and unread", () => {
    const body = JSON.stringify({ seats: [{ id: "G6", status: null }] });

    expect(JSON.parse(seatMapBodyWithStatuses(body, () => "R"))).toEqual({
      seats: [{ id: "G6", status: null }],
    });
  });

  it("refuses a non-object value by returning it unchanged", () => {
    expect(seatMapBodyWithStatuses("null", () => "R")).toBe("null");
  });

  it("keeps extra seat fields and preserves status when none is supplied", () => {
    const body = JSON.stringify({
      seats: [{ id: "G6", status: "A", price: 12 }],
    });

    expect(JSON.parse(seatMapBodyWithStatuses(body, () => undefined))).toEqual({
      seats: [{ id: "G6", status: "A", price: 12 }],
    });
  });
});
