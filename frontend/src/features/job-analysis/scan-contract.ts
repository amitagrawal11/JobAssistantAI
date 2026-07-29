export function canAnalyzeDescription(description: string): boolean {
  return description.trim().length >= 20;
}
