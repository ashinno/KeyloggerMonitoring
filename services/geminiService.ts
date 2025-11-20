
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SessionMetrics, AnalysisResponse } from "../types";
import { UserProfile } from "./persistence";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY not found in environment");
    return new GoogleGenAI({ apiKey });
}

export const analyzeActivity = async (
  metrics: SessionMetrics, 
  screenBase64: string | null,
  userProfile: UserProfile | null
): Promise<AnalysisResponse | null> => {
  const ai = getClient();

  const parts: any[] = [];
  
  if (screenBase64) {
    const base64Data = screenBase64.split(',')[1];
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Data
      }
    });
  }

  // Construct Profile Context
  let profileContext = "STATUS: NO HISTORICAL PROFILE (First Session / Incognito)";
  if (userProfile) {
    profileContext = `
    [TRUSTED BIOMETRIC BASELINE]
    - Established WPM: ${userProfile.avgWpm}
    - Established Flight Time: ${userProfile.avgFlightTime} ms
    - Established Mouse Velocity: ${userProfile.avgMouseVelocity} px/ms
    - Total Sessions Analyzed: ${userProfile.totalSessions}
    `;
  }

  const promptText = `
    SYSTEM_ROLE: Advanced Biometric Forensics Engine & Cyber-Psychology Analyst.
    OBJECTIVE: Detect synthetic input injection (Bots/Scripts/Macros) vs. organic human behavior via multi-modal analysis, and verify identity consistency.

    --- LIVE TELEMETRY SNAPSHOT ---

    [MODALITY A: KEYSTROKE DYNAMICS]
    - Typing Speed: ${metrics.wpm.toFixed(1)} WPM
    - Flight Time (Key Latency): ${metrics.avgFlightTime.toFixed(1)} ms
    - Dwell Time (Key Hold): ${metrics.avgDwellTime.toFixed(1)} ms
    - Rhythm Variance (Standard Deviation): ${metrics.rhythmVariance.toFixed(2)} ms
    - Error Rate (Corrections/Backspaces): ${metrics.backspaces} events
    - Data Privacy State: ${metrics.privacyModeEnabled ? "HASHED (Content Hidden)" : "RAW (Content Visible)"}

    [MODALITY B: POINTER BALLISTICS]
    - Avg Velocity: ${metrics.mouseMetrics.avgVelocity.toFixed(4)} px/ms
    - Angular Velocity: ${metrics.mouseMetrics.angularVelocity.toFixed(4)} rad/ms
    - Jitter/Tremor Events: ${metrics.mouseMetrics.tremorCount} (Organic micro-movements)

    ${profileContext}

    --- FORENSIC ANALYSIS DIRECTIVES ---

    1. **ADVERSARIAL PATTERN RECOGNITION (BOT DETECTION)**:
       You must act as a Red Team analyst looking for specific synthetic artifacts.
       - **Entropy Analysis (The "Pink Noise" Test)**: Humans have natural, chaotic variability (1/f noise). 
         * IF Rhythm Variance < 5ms AND WPM > 60: HIGH PROBABILITY OF SCRIPT (Fixed delay injection).
         * IF Rhythm Variance is exactly 0: CERTAIN BOT.
       - **Latency Quantization (The "Mechanical Dwell" Artifact)**: 
         * Check if Dwell Time aligns perfectly with integers (e.g., 50.0ms, 100.0ms). This indicates \`sleep()\` functions.
         * Organic dwell times are usually normally distributed around 70-120ms.
       - **Pointer Ballistics (The "Linear Path" Artifact)**: 
         * IF Mouse Avg Velocity > 1.0 px/ms BUT Angular Velocity < 0.01 rad/ms: ROBOTIC LINEAR INTERPOLATION. Humans arc their mouse movements; bots move in straight lines.
       - **The "Superhuman" Efficiency**: 
         * IF WPM > 150 AND Backspaces == 0: MATHEMATICALLY IMPROBABLE for sustained human typing.
       - **Headless Injection (The "Ghost Cursor")**: 
         * IF Total Keys > 50 AND Mouse Velocity == 0 AND Tremor Count == 0: DOM INJECTION / HEADLESS BROWSER.

    2. **CONTINUOUS AUTHENTICATION (ZERO TRUST)**:
       - Compare current telemetry against the [TRUSTED BIOMETRIC BASELINE].
       - **Fatigue vs Intruder**: Lower WPM with higher Flight Time might be fatigue. Higher WPM with significantly lower Flight Time suggests a different user (Intruder).
       - **Deviation Threshold**: A deviation > 30% in core metrics (Dwell/Flight) triggers a Trust Penalty.

    3. **CONTEXTUAL VISUAL ANALYSIS**:
       - Look at the provided screen snapshot (if available). 
       - **Correlation**: Does the visual activity (e.g., coding, chat, browsing) match the typing intensity? 
       - **Anomaly**: High typing speed on a static screen (like a video player or desktop) suggests background script activity.

    --- RESPONSE REQUIREMENTS ---

    Based on the above heuristics, generate a JSON assessment.
    - **RiskScore**: 0 (Safe) to 100 (Critical Threat/Bot).
    - **TrustAdjustment**: Reward organic consistency (+5 to +10), Penalize anomalies (-20 to -50).
    - **IsBotDetected**: Set TRUE only if heuristics strongly suggest synthetic input (Low Variance, Linear Mouse, etc.).
    - **CurrentActivity**: Describe what the user is likely doing (e.g. "Coding in Python", "Writing Email", "Idle", "Script Injection Detected").
    - **Summary**: A technical justification using the metrics provided (e.g. "Detected 0ms variance in flight time...").
  `;

  parts.push({ text: promptText });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
        currentActivity: { type: Type.STRING, description: "Activity description based on screen and typing context" },
        focusLevel: { type: Type.STRING, enum: ["High", "Medium", "Low", "Distracted"] },
        riskScore: { type: Type.INTEGER, description: "0-100. High score = High probability of bot or unauthorized user." },
        trustScoreAdjustment: { type: Type.INTEGER, description: "Integer to modify trust score. Negative for anomalies." },
        summary: { type: Type.STRING, description: "Technical justification for the decision." },
        isBotDetected: { type: Type.BOOLEAN },
        detectedApps: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["currentActivity", "focusLevel", "riskScore", "trustScoreAdjustment", "summary", "isBotDetected", "detectedApps"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) return null;
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini Backend Error:", error);
    return null;
  }
};
