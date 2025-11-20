
import { KeyEvent } from '../types';

// Simulates a "Bot" attack with perfect, non-human timing (0 variance)
// or a "Replay" attack that mimics a human but too perfectly repeating.
export const generateBotKeystrokes = (currentTimestamp: number): KeyEvent[] => {
  const sentence = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG";
  const baseDelay = 100; // 100ms exact delay (Inhuman perfection)
  
  const events: KeyEvent[] = [];
  
  // Generate a burst of 5 keys
  for(let i=0; i<5; i++) {
    const char = sentence[Math.floor(Math.random() * sentence.length)];
    const t = currentTimestamp + (i * baseDelay);
    
    events.push({
      key: char,
      code: `Key${char.toUpperCase()}`,
      timestamp: t,
      type: 'down',
      isSynthetic: true
    });
    
    events.push({
      key: char,
      code: `Key${char.toUpperCase()}`,
      timestamp: t + 50, // Exactly 50ms dwell time (Machine like)
      type: 'up',
      isSynthetic: true
    });
  }
  
  return events;
};
