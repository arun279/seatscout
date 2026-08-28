# Pre-registered expectations, fixed before the Reference Profile was implemented

This file is committed **before** any scoring code exists in this branch. `git log
--follow` on it and on `prototype/reference.mjs` shows the order. Nothing below was
written after seeing a score.

The rooms and their geometry were read first (`prototype/shape.mjs`,
`prototype/scale-check.mjs`, `prototype/rows.mjs`) because a prediction has to name
real seats. Reading geometry is not scoring.

## 1. The independent source of truth

Every quotation below was fetched on 2026-08-28 and is reproduced verbatim.

### S1. The reference position: SMPTE ST 202

SMPTE ST 202:2010, *Dubbing Stages (Mixing Rooms), Screening Rooms and Indoor
Theaters - B-Chain Electroacoustic Response*, clause 1
(https://www.normsplash.com/Samples/SMPTE/198769818/SMPTE-ST-202-2010-en.pdf):

> "The goal is to have constant perceived loudness and frequency response from
> installation to installation, and from position-to-position within an installation."

SMPTE ER 0994:2014, *TC-25CSS B-Chain Frequency and Temporal Response Analysis of
Theatres and Dubbing Stages*, clause 7.1.3 (https://www.smpte.org/hubfs/er0994-2014.pdf),
describing where ST 202 puts the microphones:

> "In the commercial and reference theatres, the far-field microphones were generally
> located as per the layout specified in SMPTE ST 202. The reference microphone location
> was 2/3 of the distance back from the screen along the longitudinal centerline."

Leembruggen and Newell, *Why does cinema sound quality mostly fail to realise its
potential*, Institute of Acoustics, reporting the same layout
(https://www.acousticdirections.com/wp-content/uploads/Leembruggen%20Newell%20RS%202015%20paper%20v2.pdf):

> "The reference microphone location was 2/3 back from the screen on the longitudinal
> centreline as shown in Figure 1, reproduced from (1)."

Dolby Laboratories, *Dolby Atmos Specifications*, clause 2.2
(https://professional.dolby.com/siteassets/cinema/dolby-audio-products/dolby-atmos-specifications.pdf):

> "Each screen speaker system and the associated amplifiers must have a maximum output
> capability of 105 dB continuous sound pressure level (SPL) at the reference listening
> position (RLP), a point two-thirds of the distance to the rear wall in the auditorium,
> typically on the center line of the screen."

### S2. The exclusion zones inside ST 202's own measurement area

SMPTE PDA webinar, *Cinema Sound Systems: Raising the Bar Through New Standards*, Brian
Vessa (Sony Pictures), 2013-03-12, slide "Current Standards: Highlights - Microphone
Placement Area", captioned "From SMPTE ST 202 Figure 4"
(https://soma.sbcc.edu/users/davega/FILMPRO_181_AUDIO_I/FILMPRO_181_03_Lecture_Notes/PLAYBACK_MIXING_ACHAIN_BCHAIN/A_THEATER_PLAYBACK_AB_THX_XCURVE/2013-03-12-Standards-Cinema_Audio-Vessa-v2.pdf):

> "Exhibition theater: Position 'S' and 4 others, or one mic moved to 5 positions
> - 3-4' high, > 6" above seat, > 3' apart
> - **> 16 feet from screen, > 5 feet from walls**
> - 90 degree angle (straight up)"

So the standard's own listening area excludes a band at the screen and a band at every
wall, the rear wall included.

### S3. THX

THX, *What is THX certified screen placement?*, https://www.thx.com/questions/thx-certified-screen-placement/:

> "To ensure the best possible viewing and listening experience, THX recommends having a
> well-designed room with an impressive screen size and a 36 degree viewing angle from
> the farthest seat in the auditorium."

Steve Martz, Director of Global Technology, THX, quoted in Vulture, 2016-10-21
(https://www.vulture.com/article/whats-the-best-seat-movie-theater-how-to-find.html):

> "This bundle of microphones includes a 'primary microphone' that is used to set
> playback levels, speaker timing, and other parameters that require a single location
> for measurements and calibration. To get the best possible sound, you want to sit as
> close as possible to where this mic is positioned: About two-thirds of the way back, in
> the center of the row."

> "THX designs every seat to be a good seat, but most people would do well to sit near
> the primary microphone position."

### S4. The lateral limit: SMPTE EG 18, and its status

SMPTE EG 18:1994 grew out of William Szabo, *Guidelines for the Design of Effective Cine
Theaters (Part I of a Proposed SMPTE Engineering Guideline)*, SMPTE Journal, January 1986
(https://www.biografmuseet.dk/format/bibliotek/high_impact/pdf/smpte.pdf):

> "For most viewers, physical discomfort occurs when the vertical viewing angle to the top
> of the screen exceeds 35°, and when the horizontal line of sight measured between a
> perpendicular to his seat and the centerline of the screen exceeds 15°."

and in its Appendix:

> "For the side seats, the lateral line of sight to the screen centerline, measured from a
> perpendicular to the seat row, should not exceed 15°."

**The 15° figure is an angle to the screen centreline, so it is a function of lateral
offset divided by distance to the screen, not of lateral offset alone.**

Also from the same document, on distortion:

> "This subject was treated in detail by Dr. Reubens Meister, who concluded that 45° was
> the limit of tolerable viewing-angle distortion."

**Status warning.** SMPTE EG 18:1994 was **withdrawn on 2003-03-26**. SMPTE's registry
entry (https://msrbot.io/docs/SMPTE.EG18.1994/, withdrawal notice at
https://pub.smpte.org/doc/eg18/eg0018-Withdrawal-Statement-2003-03-26.pdf) records:

> "This document was withdrawn as it contains information and recommendations
> inappropriate for modern theater designs."

The current maintained equivalents give a **larger** lateral limit. UNIC, *How to design a
cinema auditorium* (https://unic-cinemas.org/fileadmin/user_upload/Publications/UNIC_handbook_online_02_20__1_.pdf)
and EDCF, *A Best Practices Guide - Architecture - Viewing Conditions*
(http://www.edcf.net/edcf_docs/EDCF_ABestPracticesGuide_Architecture_ViewingConditions.pdf):

> "Horizontal viewing angle from any seat to the centre of the screen should be less than
> 45°. Good values: 1 ≤ n ≤ 1.2 or a ≤ 35°. Acceptable values: 1.2 > n ≤ 1.4 or
> 35° < a ≤ 45°. Unacceptable values: n > 1.4 or a > 45°."

### S5. The depth band: SMPTE ST 196

SMPTE ST 196:2003, clause 9, *Review room viewing conditions*
(https://www.drastic.tv/images/documentation/st0196-2003.pdf):

> "All observers in a review room shall be located within a standard observing area which
> shall be: a) within the limits of a 15° angle on either side of a perpendicular to the
> center of the screen, in both the horizontal and vertical planes; and b) at a distance
> of 3 picture heights ± 1 picture height from the screen."

Two things to note honestly. The clause is **normative for review rooms only**, not for
public cinemas; ST 196's theater clauses cover luminance, not seat position. And the 15°
here is measured from the perpendicular at the **centre of the screen**, which is the same
geometry as S4 read from the other end. It bounds depth as well as lateral: nothing nearer
than 2 picture heights, nothing further than 4.

## 2. What the standards say, as rules

R1. **The single best position is the centreline at two thirds of the distance from the
screen to the rear wall.** S1, four independent statements of it, one of them a current
manufacturer specification.

R2. **Off the centreline is worse, and the penalty is an angle, not a distance.** S4, S5.
The same lateral offset is more off-axis the nearer the seat is to the screen, because the
angle is offset over distance. A penalty that reads only |lateral| cannot express this.

R3. **The band nearest the screen is excluded outright.** S2 (> 16 ft), S5 (no nearer than
2 picture heights), S4 (35° vertical discomfort at the front).

R4. **The band nearest every wall is excluded, the rear wall included.** S2 (> 5 ft from
walls). This is the only standards basis found for a last-row penalty, and it applies with
equal force to the outermost seat of every row.

R5. **The front penalty is heavier than the back penalty.** Three sources exclude the
front band (S2, S4, S5); only one excludes the rear band (S2, and S5's 4 PH ceiling).
Only the front carries *physical discomfort* in S4. THX designs the back row to still meet
a 36° subtended angle (S3), so the back row is by design acceptable rather than bad.

R6. **Every seat is meant to be usable.** S3: "THX designs every seat to be a good seat."
The Profile should be ordering seats, not condemning them.

## 3. Room selection

Five rooms, five Chains, chosen off `manifest.json` for visible difference in shape. All
were plotted before any prediction was written.

| room | Chain | seats | rows | width/depth | why it is different |
|---|---|---|---|---|---|
| Strike + Reel Luxury Dine-In and XD, aud 1 | VZ | 46 | 5 | 1.41 | smallest room in the corpus; only 5 rows, so "two thirds back" has almost no resolution; accessible row sits mid-room |
| AMC Village on the Parkway 9, aud 1 | AMC | 294 | 10 | 1.89 | widest and shallowest; 32 seats per row over 10 rows; row index 5 is absent from the payload entirely |
| Alamo Drafthouse Lake Highlands, aud 1 | ALAM | 155 | 9 | 1.15 | numeric-only seat labels (`101`, `901`); rows 5-8 are offset 93.5 units right of the screen centreline while rows 1-3 sit 28.9 left of it |
| Angelika Film Center & Cafe, aud 5 | AFC | 300 | 15 | 0.81 | deepest room; the only one taller than it is wide; row letters skip I and O so the letter never matches the index past H |
| Cinemark West Plano and XD, aud 28 | CNMK | 304 | 14 | 1.67 | largest room; row indices 2 and 11 are absent; **and Cinemark is the one Chain that draws seats on a square lattice**, row pitch equal to column pitch, where the other ten draw row pitch at 1.9 to 2.3 times column pitch |

## 4. Two measurement facts established before predicting

Both from `prototype/scale-check.mjs` and `prototype/geometry-check.mjs` over all 42
captured maps.

F1. **A true viewing angle is not computable from this source.** `mapOffsetY`, the only
candidate for screen-to-first-row distance, ranges from 1.9 to 11.4 seat widths across the
corpus and is a constant 1.9 for all four Cinemark rooms. It is drawing whitespace for the
screen glyph, not a throw distance. And the maps are not to a common scale: ten Chains
draw row pitch at 1.90 to 2.29 times column pitch, which is physically plausible for
36-44 in row spacing against 19-22 in seats, while Cinemark draws 1.00 in all four rooms.
So neither the distance to the screen nor the ratio of depth to width survives across
Chains. **The 15° criterion cannot be evaluated as a literal angle.**

F2. **The screen centreline is `backgroundWidth / 2`.** Cinemark states it
(`<g class="Screen"><rect x="0" ... width="{backgroundWidth}"/>`); across all 42 maps the
seat block's own midpoint sits within 0.69 seat widths of it. Lateral is measured from
there and not from the seat array's extent, because a room can be asymmetric: Alamo Lake
Highlands rows 5-8 are 93.5 units, about 1.5 seat pitches, right of the centreline.

## 5. Predictions

Fixed now. Each is checkable mechanically against whatever ranking the Reference Profile
produces. "Reference row" means the row whose row-normalised depth is nearest 0.67;
because the screen-to-first-row and last-row-to-rear-wall distances are unmeasurable (F1),
the true reference lands within roughly one row either side of it, so P1 allows the
adjacent row.

| room | rows | reference row (depth) | adjacent rows allowed |
|---|---|---|---|
| VZ aud 1 | 5 | row 4, `D` (0.750) | row 3 (0.500), row 5 (1.000) |
| AMC aud 1 | 10 | row 8, `G` (0.687) | row 7 `F` (0.584), row 9 `H` (0.790) |
| ALAM aud 1 | 9 | row 6, `601` (0.640) | row 5 (0.524), row 7 (0.757) |
| AFC aud 5 | 15 | row 10, `K` (0.648) | row 9 `J` (0.577), row 11 `L` (0.718) |
| CNMK aud 28 | 14 | row 12, `K` (0.733) | row 10 `J` (0.600), row 13 `L` (0.800) |

**P1.** In every room the top-ranked bookable standard Seat lies in the reference row or
an adjacent row, and is one of the two seats nearest the screen centreline in that row.
(R1.)

**P2.** In every room, the centreline seat of row 1 ranks below the centreline seat of the
reference row. (R3.)

**P3.** In every room, the centreline seat of the last row ranks below the centreline seat
of the reference row. (R4.)

**P4.** In every room, the centreline seat of row 1 ranks **below** the centreline seat of
the last row. (R5. This is the prediction most likely to fail, and the one that tests
whether the front and last-row penalties are weighted against each other or just both
present.)

**P5.** In every room, the outermost seat of row 1 ranks below the outermost seat on the
same side of the last row. (R2: same lateral offset, larger angle nearer the screen. This
is the prediction that a separable score `f(depth) + g(|lateral|)` **cannot** satisfy,
because it would have to disagree with P4's own direction only if the depth term dominates
- so P4 and P5 together discriminate between a separable and a non-separable score.)

**P6.** Within every row of every room, score is monotone non-increasing in |lateral|:
moving outward from the centreline never improves a seat. (R1, R2.)

**P7.** Down the centreline of every room, score is single-peaked in depth, peaking at the
reference row: no second local maximum. (R1.)

**P8.** In Alamo Lake Highlands rows 5 to 8, the best seat of the row is the one nearest
`x = 800`, the screen centreline, and not the one nearest that row's own midpoint at
`x = 893.5`. (F2. A room-symmetric or row-centred normalisation fails this.)

**P9.** Across rooms, the top-ranked seat of the 46-seat VZ room and the top-ranked seat
of the 304-seat Cinemark room score within 10% of each other on the Profile's own scale.
Both are their room's reference position, and the spec requires Auditoriums to be
"compared on equal terms". If this fails, a single number is not comparable across rooms
and the ranking in the product is wrong even when each room's internal order is right.

**P10.** No accessible Seat (`type` of `wheelchair` or `companion`) appears in the top
ranks of any room. (Spec user story 22.)

## 6. How disagreement will be judged

Where the Profile and a prediction disagree, the prediction is not automatically right.
Each disagreement gets its own judgement, with the standard that supports it named, and
the possibility that the standard is being applied outside its scope taken seriously - S5
is normative for review rooms, and S4's document was withdrawn.
