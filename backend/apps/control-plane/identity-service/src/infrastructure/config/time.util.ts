export function parseDurationToMilliseconds(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const quantity = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return quantity * multipliers[unit];
}
