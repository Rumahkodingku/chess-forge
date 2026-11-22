export type AnalysisBoardTheme = "forge" | "classic";

export function boardThemeFromSetting(
  value: string | undefined,
): AnalysisBoardTheme {
  return value === "classic" ? "classic" : "forge";
}
