import type { UpstreamSeat } from "../source/seat-map.js";

export interface Capture<Body> {
  readonly capturedAt: string;
  readonly request: { readonly method: string; readonly path: string };
  readonly status: number;
  readonly body: Body;
}

export interface CapturedSeat extends UpstreamSeat {
  readonly row: number;
  readonly column: number;
  readonly sellIndividuallyWithinSeatBlock: boolean;
  readonly attributes: {
    readonly messageHeader?: string;
    readonly messageBody?: string;
  };
  readonly areaCode: string;
  readonly areaId: string;
}

export interface CapturedSeatMap {
  readonly chainCode: string;
  readonly tmsId: string;
  readonly theaterName: string;
  readonly auditoriumId: number;
  readonly showtimeId: string;
  readonly seats: readonly CapturedSeat[];
  readonly backgroundSvg: string;
  readonly backgroundWidth: number;
  readonly backgroundHeight: number;
  readonly mapOffsetX: number;
  readonly mapOffsetY: number;
  readonly totalWidth: number;
  readonly totalHeight: number;
  readonly maxTicketLimit: number;
}

export interface CapturedUpstreamError {
  readonly id: string;
  readonly message: string;
}

export interface CapturedShowtime {
  readonly id: number;
  readonly type: string;
  readonly expired: boolean;
  readonly isSoldOut: boolean;
  readonly ticketingJumpPageURL: string;
}

interface CapturedAmenityGroup {
  readonly amenityString: string;
  readonly hasReservedSeating: boolean;
  readonly movieVariantId: number;
  readonly showtimes: readonly CapturedShowtime[];
}

interface CapturedVariant {
  readonly filmFormatHeader: string;
  readonly amenityGroups: readonly CapturedAmenityGroup[];
}

export interface CapturedShowtimeGrouping {
  readonly theaterShowtimes: {
    readonly date: string;
    readonly theaters: readonly {
      readonly id: string;
      readonly formattedID: string;
      readonly name: string;
      readonly chainCode: string;
      readonly variants: readonly CapturedVariant[];
    }[];
  };
}

export interface CapturedTheaterMovieShowtimes {
  readonly viewModel: {
    readonly movies: readonly {
      readonly id: number;
      readonly title: string;
      readonly variants: readonly CapturedVariant[];
    }[];
  };
}

export interface CapturedNearbyTheaters {
  readonly theaters: readonly {
    readonly id: string;
    readonly formattedID: string;
    readonly name: string;
    readonly chainCode: string;
    readonly chainName: string;
    readonly isTicketing: boolean;
    readonly hasReservedSeating: boolean;
  }[];
}

export interface CorpusManifest {
  readonly files: readonly string[];
  readonly seatMaps: readonly {
    readonly file: string;
    readonly chain: string;
    readonly httpStatus: number;
    readonly auditoriumId: number | null;
    readonly seatsInArray?: number;
    readonly rawSeatStatusCounts?: Readonly<Record<string, number | undefined>>;
  }[];
}
