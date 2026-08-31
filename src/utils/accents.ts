export const NEO_ACCENTS = ["pink", "cyan", "purple", "orange"] as const;

export type NeoAccent = (typeof NEO_ACCENTS)[number];

export const accentAt = (index: number): NeoAccent => NEO_ACCENTS[index % NEO_ACCENTS.length];
