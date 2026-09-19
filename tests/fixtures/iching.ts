// Fixed, analytical cases: Zhouyi trigram pair definitions; no random outputs used as expectations.
export const ichingFixtures = [
  { values: [7, 7, 7, 7, 7, 7], original: 1, changed: 1 },
  { values: [8, 8, 8, 8, 8, 8], original: 2, changed: 2 },
  { values: [6, 6, 6, 6, 6, 6], original: 2, changed: 1 },
  { values: [9, 9, 9, 9, 9, 9], original: 1, changed: 2 },
  { values: [7, 8, 8, 8, 7, 8], original: 3, changed: 3 },
  { values: [8, 7, 8, 8, 8, 7], original: 4, changed: 4 },
  { values: [7, 7, 7, 8, 8, 8], original: 11, changed: 11 },
  { values: [8, 8, 8, 7, 7, 7], original: 12, changed: 12 },
  { values: [7, 8, 7, 8, 7, 8], original: 63, changed: 63 },
  { values: [8, 7, 8, 7, 8, 7], original: 64, changed: 64 },
  { values: [9, 7, 7, 7, 7, 7], original: 1, changed: 44 },
  { values: [7, 7, 7, 7, 7, 9], original: 1, changed: 43 },
];
