
import { KeyEvent, KeyMetrics, SessionMetrics, MouseEventData, MouseMetrics } from '../types';

// Privacy-preserving hash function (Simple DJB2 variant for demo)
const hashString = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
  }
  return (hash >>> 0).toString(16).substring(0, 6); // Return short hex
};

export const calculateMouseMetrics = (events: MouseEventData[]): MouseMetrics => {
  if (events.length < 2) {
    return { avgVelocity: 0, maxVelocity: 0, angularVelocity: 0, clicks: 0, tremorCount: 0 };
  }

  let totalDist = 0;
  let maxVel = 0;
  let totalAngleChange = 0;
  let tremors = 0;
  let prevAngle = 0;

  for (let i = 1; i < events.length; i++) {
    const p1 = events[i-1];
    const p2 = events[i];
    const dt = p2.timestamp - p1.timestamp;
    
    if (dt === 0) continue;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const vel = dist / dt;

    totalDist += dist;
    if (vel > maxVel) maxVel = vel;

    // Angle calculation
    const angle = Math.atan2(dy, dx);
    if (i > 1) {
        const dAngle = Math.abs(angle - prevAngle);
        totalAngleChange += dAngle;
        // High frequency small angle changes often indicate human tremor vs smooth bot curves
        if (dAngle > 0.1 && dist < 5) tremors++; 
    }
    prevAngle = angle;
  }

  const totalTime = events[events.length - 1].timestamp - events[0].timestamp;

  return {
    avgVelocity: totalTime > 0 ? totalDist / totalTime : 0,
    maxVelocity: maxVel,
    angularVelocity: totalTime > 0 ? totalAngleChange / totalTime : 0,
    clicks: 0, // Handled separately if needed
    tremorCount: tremors
  };
};

export const calculateMetrics = (
  keyEvents: KeyEvent[], 
  mouseEvents: MouseEventData[],
  privacyMode: boolean
): SessionMetrics => {
  const mouseMetrics = calculateMouseMetrics(mouseEvents);

  if (keyEvents.length === 0) {
    return {
      startTime: Date.now(),
      endTime: Date.now(),
      totalKeys: 0,
      wpm: 0,
      cpm: 0,
      accuracy: 100,
      avgDwellTime: 0,
      avgFlightTime: 0,
      backspaces: 0,
      rhythmVariance: 0,
      topKeys: [],
      mouseMetrics,
      privacyModeEnabled: privacyMode
    };
  }

  const startTime = keyEvents[0].timestamp;
  const endTime = keyEvents[keyEvents.length - 1].timestamp;
  const durationMinutes = (endTime - startTime) / 1000 / 60;

  // Map by key code to pair up/down events
  const keyMap: Record<string, { down?: number; totalDwell: number; count: number; errors: number }> = {};
  const flightTimes: number[] = [];
  let backspaceCount = 0;
  let lastUpTimestamp = 0;

  keyEvents.forEach((event, index) => {
    if (!keyMap[event.code]) {
      keyMap[event.code] = { totalDwell: 0, count: 0, errors: 0 };
    }

    if (event.key === 'Backspace' && event.type === 'down') {
      backspaceCount++;
      keyMap['Backspace'].errors++; // Technically backspace is a correction
    }

    if (event.type === 'down') {
      keyMap[event.code].down = event.timestamp;
      
      // Flight time: time from previous key UP to this key DOWN
      if (lastUpTimestamp > 0) {
        const flight = event.timestamp - lastUpTimestamp;
        if (flight < 2000) { // Ignore long pauses > 2s
            flightTimes.push(flight);
        }
      }
    } else if (event.type === 'up') {
      lastUpTimestamp = event.timestamp;
      if (keyMap[event.code].down) {
        const dwell = event.timestamp - keyMap[event.code].down!;
        keyMap[event.code].totalDwell += dwell;
        keyMap[event.code].count += 1;
        keyMap[event.code].down = undefined; // Reset for next press
      }
    }
  });

  // Calculate Averages
  const totalKeys = keyEvents.filter(e => e.type === 'down').length;
  const cpm = durationMinutes > 0 ? totalKeys / durationMinutes : 0;
  const wpm = cpm / 5;

  // Key specific metrics
  const allKeys: KeyMetrics[] = Object.entries(keyMap).map(([code, data]) => ({
    key: privacyMode ? hashString(code) : code.replace('Key', ''), // HASHING FOR PRIVACY
    count: data.count,
    avgDwellTime: data.count > 0 ? data.totalDwell / data.count : 0,
    errors: data.errors,
  }));

  const validDwells = allKeys.filter(k => k.avgDwellTime > 0).map(k => k.avgDwellTime);
  const globalAvgDwell = validDwells.length > 0 ? validDwells.reduce((a, b) => a + b, 0) / validDwells.length : 0;
  
  const globalAvgFlight = flightTimes.length > 0 ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length : 0;
  
  // Rhythm Variance (Standard Deviation of Flight Times)
  const variance = flightTimes.length > 0 
    ? Math.sqrt(flightTimes.reduce((sq, n) => sq + Math.pow(n - globalAvgFlight, 2), 0) / flightTimes.length) 
    : 0;

  const accuracy = Math.max(0, 100 - ((backspaceCount / totalKeys) * 100));

  return {
    startTime,
    endTime,
    totalKeys,
    wpm,
    cpm,
    accuracy,
    avgDwellTime: globalAvgDwell,
    avgFlightTime: globalAvgFlight,
    backspaces: backspaceCount,
    rhythmVariance: variance,
    topKeys: allKeys.sort((a, b) => b.count - a.count), // Returned all keys sorted by frequency
    mouseMetrics,
    privacyModeEnabled: privacyMode
  };
};
