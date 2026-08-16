export function calculateWorkingTime(checkIn: string, checkOut: string): string | null {
  if (!checkIn || !checkOut) return null;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return null;

  let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Crosses midnight

  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  
  return `${h}h ${m}m`;
}
