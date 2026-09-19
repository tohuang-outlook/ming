# Independent reference investigation — 2026-09-19

Evaluated [ying-rushi/cdestiny](https://github.com/ying-rushi/cdestiny) at commit `c86c012577d9cde126287d53c8a84411c02282a4`, with its independent Python formulas and `lunardate==0.2.2` calendar. The project's MIT code was inspected; it was not added as a runtime dependency or used to overwrite expected fixtures.

Ten preselected distinct birthdays were compared, with male gender, UTC+08 clock times, no true solar correction: 1990-01-15 12:00, 2000-08-16 03:00, 1985-06-12 10:00, 1978-11-03 16:00, 1960-04-08 06:00, 1995-09-20 20:00, 2005-12-23 08:00, 2012-03-01 14:00, 1949-10-01 09:00, 2024-06-10 18:00.

Results: all ten agreed on life/body palace branches. Four differed on all fourteen major-star placements; all ten differed on two auxiliary-star placements. Six therefore agreed on all fourteen major-star placements, but **none agreed on the full compared chart**. Its existing tests only assert nonempty basic fields rather than known expected positions. This candidate cannot establish a trusted oracle for this release; disagreements are unresolved and are not evidence that either entire engine is correct.

The raw per-case comparison is retained in `independent-comparison.json`. No mismatching case was omitted and no expected fixture was generated from the app's own output. The app keeps its existing `needs-verification` labels. Independent full-chart/domain review remains required for claims of verified calculation accuracy.
