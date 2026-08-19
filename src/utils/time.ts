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

// Convert "6:00 PM - 4:00 AM" into { checkIn: "18:00", checkOut: "04:00" }
export function parseScheduleToTimes(scheduleStr: string): { checkIn: string; checkOut: string } | null {
  if (!scheduleStr) return null;
  try {
    const parts = scheduleStr.split('-').map(s => s.trim());
    if (parts.length < 2) return null;

    const convertTo24 = (timePart: string): string | null => {
      const match = timePart.match(/(\d+):?(\d*)\s*(AM|PM)/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3].toUpperCase();

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const checkIn = convertTo24(parts[0]);
    const checkOut = convertTo24(parts[1]);

    if (checkIn && checkOut) {
      return { checkIn, checkOut };
    }
  } catch (e) {
    console.error('Failed to parse schedule:', e);
  }
  return null;
}
