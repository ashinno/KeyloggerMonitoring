"""
Cybersecurity Thesis Context:

Why Isolation Forests (Unsupervised) instead of naive averages?

- Keystroke dynamics and pointer telemetry are high-variance, non-stationary.
  Averages collapse distribution structure and miss multi-modal patterns.
- Isolation Forest explicitly models the notion of "few and different" by
  isolating anomalies through random partitioning. It requires no labeled
  adversarial data, which is crucial when bot behaviors evolve.
- Unsupervised detection respects privacy constraints: we train on aggregate
  feature vectors rather than raw timelines, and encrypt raw batches at rest.

Bot heuristics implemented here complement IF by catching adversarial edge
cases (perfect timing, linear high-velocity mouse movement) that are unlikely
for humans.
"""

from __future__ import annotations

import math
from typing import Dict, List, Tuple, Optional

# Lazy imports to improve startup resilience in constrained environments
try:
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover
    np = None  # type: ignore

try:
    from sklearn.ensemble import IsolationForest  # type: ignore
    from joblib import dumps as joblib_dumps, loads as joblib_loads  # type: ignore
except Exception:  # pragma: no cover
    IsolationForest = None  # type: ignore
    joblib_dumps = None  # type: ignore
    joblib_loads = None  # type: ignore

from app.core.config import settings


class BiometricEngine:
    def __init__(self) -> None:
        self.model: Optional[IsolationForest] = None  # type: ignore

    def load_model_blob(self, blob: bytes) -> None:
        if joblib_loads is None:
            raise RuntimeError("Joblib not available to load model blob")
        self.model = joblib_loads(blob)  # type: ignore

    def dump_model_blob(self) -> bytes:
        if self.model is None:
            raise RuntimeError("Model not trained")
        if joblib_dumps is None:
            raise RuntimeError("Joblib not available to dump model blob")
        return joblib_dumps(self.model)  # type: ignore

    def fit_baseline(self, n_samples: int = 512) -> None:
        """
        Train a default baseline IsolationForest using synthetic human-like
        distributions. This is used when no per-user profile is available yet.

        Cybersecurity Thesis: We avoid training on raw encrypted logs to
        minimize exposure. Instead, we rely on aggregate features or synthetic
        priors until genuine, consented profiles are present.
        """
        if np is None or IsolationForest is None:
            # Fallback stub: model remains None; predict() will still operate
            # but only with heuristic bot checks and a neutral risk.
            return
        rng = np.random.default_rng(42)
        avg_flight = rng.normal(loc=120, scale=40, size=n_samples)  # ms
        avg_dwell = rng.normal(loc=90, scale=30, size=n_samples)    # ms
        rhythm_var = rng.gamma(shape=2.0, scale=25.0, size=n_samples)
        mouse_vel = rng.normal(loc=350, scale=150, size=n_samples)  # px/s
        X = np.vstack([avg_flight, avg_dwell, rhythm_var, mouse_vel]).T
        self.model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)  # type: ignore
        self.model.fit(X)  # type: ignore

    def extract_features(self, payload: Dict) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Convert raw keystrokes/mouse events into feature vector:
        [AvgFlightTime, AvgDwellTime, RhythmVariance, MouseVelocity]

        Expected payload structure:
        {
          "keystrokes": [ {"type": "keydown"|"keyup", "key": "A", "timestamp": 1699999999.123}, ... ],
          "mouse": [ {"x": 100, "y": 200, "timestamp": 1699999999.456}, ... ]
        }
        """
        if np is None:
            raise RuntimeError("NumPy is not available; please install dependencies")
        ks = payload.get("keystrokes", [])
        ms = payload.get("mouse", [])

        # Dwell time: keydown -> keyup duration
        down_times: Dict[str, List[float]] = {}
        dwell_durations: List[float] = []
        for e in ks:
            t = float(e.get("timestamp", 0))
            ty = e.get("type")
            k = e.get("key")
            if ty == "keydown":
                down_times.setdefault(k, []).append(t)
            elif ty == "keyup":
                arr = down_times.get(k)
                if arr:
                    start = arr.pop(0)
                    dwell_durations.append(max(0.0, (t - start) * 1000.0))  # ms

        avg_dwell = float(np.mean(dwell_durations)) if dwell_durations else 0.0

        # Flight time: time between consecutive keydown events
        keydown_ts: List[float] = [float(e.get("timestamp", 0)) for e in ks if e.get("type") == "keydown"]
        keydown_ts.sort()
        flights = [max(0.0, (b - a) * 1000.0) for a, b in zip(keydown_ts[:-1], keydown_ts[1:])]
        avg_flight = float(np.mean(flights)) if flights else 0.0
        rhythm_var = float(np.var(flights)) if flights else 0.0

        # Mouse velocity and angular velocity
        mouse_velocities: List[float] = []
        angle_changes: List[float] = []
        for (a, b) in zip(ms[:-1], ms[1:]):
            dt = max(1e-6, float(b.get("timestamp", 0)) - float(a.get("timestamp", 0)))
            dx = float(b.get("x", 0)) - float(a.get("x", 0))
            dy = float(b.get("y", 0)) - float(a.get("y", 0))
            dist = math.hypot(dx, dy)
            mouse_velocities.append(dist / dt)  # px/s
            angle_a = math.atan2(dy, dx)
            # Use previous segment when available for angle delta
            if len(angle_changes) > 0:
                prev_angle = angle_changes[-1]
                angle_changes.append(abs(angle_a - prev_angle))
            else:
                angle_changes.append(angle_a)

        avg_mouse_vel = float(np.mean(mouse_velocities)) if mouse_velocities else 0.0
        # Approximate angular velocity as mean absolute angle change per segment
        if len(angle_changes) > 1:
            # remove the initial angle value placeholder
            diffs = [abs(angle_changes[i] - angle_changes[i - 1]) for i in range(1, len(angle_changes))]
            angular_velocity = float(np.mean(diffs))
        else:
            angular_velocity = 0.0

        X = np.array([avg_flight, avg_dwell, rhythm_var, avg_mouse_vel], dtype=float)
        extras = {
            "avg_flight": avg_flight,
            "avg_dwell": avg_dwell,
            "rhythm_variance": rhythm_var,
            "mouse_velocity": avg_mouse_vel,
            "angular_velocity": angular_velocity,
        }
        return X, extras

    def predict(self, X: np.ndarray) -> Tuple[int, float]:
        """
        Return label (-1 outlier, 1 inlier) and a risk score (0..100).
        Risk calibration: IsolationForest decision_function yields anomaly scores
        (higher is less anomalous). We invert and scale to 0..100 for UI.
        """
        if IsolationForest is None or self.model is None:
            # Fallback: neutral label and moderate risk
            return 1, 50.0
        # decision_function: higher => normal, lower => anomalous
        score = float(self.model.decision_function([X])[0])  # type: ignore
        label = int(self.model.predict([X])[0])  # type: ignore
        # Map score to risk: lower score => higher risk
        risk = max(0.0, min(100.0, 50.0 - score * 100.0))
        return label, risk

    def detect_bot(self, extras: Dict[str, float]) -> bool:
        """
        Adversarial heuristics:
        - Perfect timing: rhythm variance == 0.0 => likely scripted bot.
        - Linear high-velocity mouse movement: very high speed with near-zero
          angular change => non-human automation.
        """
        if extras.get("rhythm_variance", 0.0) == 0.0:
            return True
        mouse_v = extras.get("mouse_velocity", 0.0)
        ang_v = extras.get("angular_velocity", 0.0)
        if mouse_v >= settings.BOT_LINEAR_MOUSE_VELOCITY_THRESHOLD and ang_v <= settings.BOT_ANGULAR_VELOCITY_EPSILON:
            return True
        return False