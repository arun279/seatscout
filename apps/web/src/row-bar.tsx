import type { AuditoriumMap, SeatRow } from "@seatscout/client";
import { rowTextOf } from "./auditorium-phrases.js";

interface RowBarProps {
  readonly row: SeatRow;
  readonly map: AuditoriumMap;
  readonly notice: string | null;
  readonly onPress: () => void;
}

export const RowBar = ({ row, map, notice, onPress }: RowBarProps) => (
  <button type="button" className="row-bar" onClick={onPress}>
    <span role="status">
      {notice ?? (
        <>
          {row.label !== null && <b>ROW {row.label}</b>}
          <span>{rowTextOf(row, map)}</span>
        </>
      )}
    </span>
  </button>
);
