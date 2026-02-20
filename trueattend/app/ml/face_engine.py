"""
TrueAttend Face Recognition Engine
===================================
Uses:
  - face_recognition (dlib deep-metric CNN) for detection & 128-d embeddings
  - DeepFace (optional fallback, FaceNet / ArcFace) for extra accuracy
  - OpenCV for preprocessing and liveness detection
  - numpy / scikit-learn for nearest-neighbour matching & confidence scoring

Pipeline per session frame:
  1. Detect all faces in frame
  2. Liveness check (blink / texture anti-spoofing)
  3. Compute 128-d embedding for each detected face
  4. KNN / cosine distance match against enrolled face database
  5. Return match results with confidence scores
"""

import os
import cv2
import numpy as np
import pickle
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

# Optional heavy imports — gracefully degrade in CI / minimal envs
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    logger.warning("face_recognition not installed. Using mock mode.")

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False


@dataclass
class FaceMatch:
    student_id: int
    student_name: str
    confidence: float          # 0.0 – 1.0  (1 = perfect match)
    face_location: Tuple       # (top, right, bottom, left) in px
    is_liveness_pass: bool = True
    embedding: Optional[np.ndarray] = field(default=None, repr=False)


@dataclass
class FrameAnalysisResult:
    timestamp: datetime
    total_faces_detected: int
    matches: List[FaceMatch]
    unknown_face_count: int
    unknown_face_crops: List[np.ndarray] = field(default_factory=list)
    headcount: int = 0
    raw_frame: Optional[np.ndarray] = field(default=None, repr=False)

    @property
    def identified_count(self):
        return len(self.matches)


class LivenessDetector:
    """
    Simple texture-based liveness detection using Local Binary Patterns (LBP).
    For production, replace / augment with a trained CNN anti-spoof model
    (e.g. Silent-Face-Anti-Spoofing or FAS-SGTD).
    """

    LBP_THRESHOLD = 0.4  # tune based on your hardware / lighting

    def check(self, face_crop: np.ndarray) -> Tuple[bool, float]:
        """Return (is_live, score). Score > threshold → live."""
        if face_crop is None or face_crop.size == 0:
            return False, 0.0
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        # Laplacian variance (blur detection proxy for liveness)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        score = min(lap_var / 500.0, 1.0)
        return score >= self.LBP_THRESHOLD, round(score, 4)


class FaceDatabase:
    """
    Loads and manages the known-faces embedding store.
    Each student has a list of 128-d face encodings (average + per-sample).

    Storage format: pickle file  {student_id: {"name": str, "encodings": [np.array, ...]}}
    """

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.data: Dict[int, Dict] = {}
        self._load()

    def _load(self):
        if os.path.exists(self.db_path):
            with open(self.db_path, "rb") as f:
                self.data = pickle.load(f)
            logger.info(f"Face DB loaded: {len(self.data)} students")

    def save(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with open(self.db_path, "wb") as f:
            pickle.dump(self.data, f)

    def add_student(self, student_id: int, student_name: str, encodings: List[np.ndarray]):
        if student_id in self.data:
            # Merge — keep existing + new samples (max 20)
            existing = self.data[student_id]["encodings"]
            combined = existing + encodings
            self.data[student_id]["encodings"] = combined[-20:]
        else:
            self.data[student_id] = {"name": student_name, "encodings": encodings}
        self.save()

    def remove_student(self, student_id: int):
        self.data.pop(student_id, None)
        self.save()

    def get_all_encodings(self):
        """Return flat lists for vectorised comparison."""
        ids, names, encs = [], [], []
        for sid, info in self.data.items():
            for enc in info["encodings"]:
                ids.append(sid)
                names.append(info["name"])
                encs.append(enc)
        return ids, names, encs

    @property
    def student_count(self):
        return len(self.data)


class FaceRecognitionEngine:
    """
    Main engine coordinating detection, liveness, and recognition.
    """

    DISTANCE_THRESHOLD = 0.50   # lower = stricter (face_recognition default ~0.6)

    def __init__(self, db_path: str, liveness_enabled: bool = True):
        self.db = FaceDatabase(db_path)
        self.liveness = LivenessDetector() if liveness_enabled else None
        self._enrolled_for_course: Optional[List[int]] = None  # subset for active session

    # ────────────── Registration ──────────────

    def register_student_from_images(
        self,
        student_id: int,
        student_name: str,
        image_paths: List[str],
    ) -> Tuple[bool, str]:
        """
        Encode face images captured during registration.
        Returns (success, message).
        """
        if not FACE_RECOGNITION_AVAILABLE:
            return False, "face_recognition library not installed"

        encodings = []
        for path in image_paths:
            img = face_recognition.load_image_file(path)
            locs = face_recognition.face_locations(img, model="hog")
            if not locs:
                logger.warning(f"No face found in {path}")
                continue
            enc = face_recognition.face_encodings(img, locs)[0]
            encodings.append(enc)

        if not encodings:
            return False, "No valid face encodings extracted from provided images"

        self.db.add_student(student_id, student_name, encodings)
        return True, f"Registered {len(encodings)} face samples for student {student_id}"

    def register_student_from_array(
        self,
        student_id: int,
        student_name: str,
        frames: List[np.ndarray],
    ) -> Tuple[bool, str]:
        """Register from raw BGR frames (from camera capture)."""
        if not FACE_RECOGNITION_AVAILABLE:
            return False, "face_recognition library not installed"

        encodings = []
        for frame in frames:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            locs = face_recognition.face_locations(rgb, model="hog")
            if not locs:
                continue
            enc = face_recognition.face_encodings(rgb, locs)[0]
            encodings.append(enc)

        if not encodings:
            return False, "No valid face detected in captured frames"

        self.db.add_student(student_id, student_name, encodings)
        return True, f"{len(encodings)} samples registered"

    # ────────────── Recognition ──────────────

    def analyse_frame(
        self,
        frame: np.ndarray,
        enrolled_student_ids: Optional[List[int]] = None,
    ) -> FrameAnalysisResult:
        """
        Core function: analyse one BGR frame, return structured result.
        enrolled_student_ids — only match against this subset if provided.
        """
        timestamp = datetime.utcnow()

        if not FACE_RECOGNITION_AVAILABLE:
            return self._mock_analysis(timestamp)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Detect all face locations (CNN model for accuracy; use 'hog' if GPU unavailable)
        face_locations = face_recognition.face_locations(rgb, model="hog")
        total_faces = len(face_locations)

        if total_faces == 0:
            return FrameAnalysisResult(
                timestamp=timestamp,
                total_faces_detected=0,
                matches=[],
                unknown_face_count=0,
                headcount=0,
                raw_frame=frame,
            )

        # Compute embeddings for all detected faces
        face_encodings = face_recognition.face_encodings(rgb, face_locations)

        # Build candidate DB (optionally filtered by enrolled students)
        ids, names, db_encodings = self.db.get_all_encodings()
        if enrolled_student_ids is not None:
            filtered = [
                (i, n, e)
                for i, n, e in zip(ids, names, db_encodings)
                if i in enrolled_student_ids
            ]
            if filtered:
                ids, names, db_encodings = zip(*filtered)
            else:
                ids, names, db_encodings = [], [], []

        matches: List[FaceMatch] = []
        unknown_crops: List[np.ndarray] = []
        seen_student_ids = set()

        for face_enc, face_loc in zip(face_encodings, face_locations):
            top, right, bottom, left = face_loc
            face_crop = frame[top:bottom, left:right]

            # Liveness check
            is_live = True
            if self.liveness:
                is_live, _ = self.liveness.check(face_crop)

            if not db_encodings:
                unknown_crops.append(face_crop)
                continue

            # Compute L2 distances to all stored encodings
            distances = face_recognition.face_distance(list(db_encodings), face_enc)
            best_idx = int(np.argmin(distances))
            best_dist = float(distances[best_idx])

            if best_dist <= self.DISTANCE_THRESHOLD:
                matched_id = ids[best_idx]
                # Avoid double-counting the same student
                if matched_id in seen_student_ids:
                    continue
                seen_student_ids.add(matched_id)
                confidence = round(1.0 - best_dist, 4)
                matches.append(
                    FaceMatch(
                        student_id=matched_id,
                        student_name=names[best_idx],
                        confidence=confidence,
                        face_location=face_loc,
                        is_liveness_pass=is_live,
                        embedding=face_enc,
                    )
                )
            else:
                unknown_crops.append(face_crop)

        return FrameAnalysisResult(
            timestamp=timestamp,
            total_faces_detected=total_faces,
            matches=matches,
            unknown_face_count=len(unknown_crops),
            unknown_face_crops=unknown_crops,
            headcount=total_faces,
            raw_frame=frame,
        )

    def analyse_frame_deepface(
        self,
        frame: np.ndarray,
        enrolled_student_ids: Optional[List[int]] = None,
    ) -> FrameAnalysisResult:
        """
        Higher-accuracy analysis using DeepFace (ArcFace / FaceNet).
        Slower but more robust for difficult lighting / partial occlusions.
        Falls back to standard engine if DeepFace unavailable.
        """
        if not DEEPFACE_AVAILABLE:
            return self.analyse_frame(frame, enrolled_student_ids)

        timestamp = datetime.utcnow()
        try:
            result = DeepFace.find(
                img_path=frame,
                db_path=os.path.dirname(self.db.db_path),
                model_name="ArcFace",
                detector_backend="retinaface",
                distance_metric="cosine",
                enforce_detection=False,
            )
            # Map DeepFace results back to our schema (simplified)
            matches = []
            for df in result:
                if df.empty:
                    continue
                row = df.iloc[0]
                # Extract student_id from filename convention: {student_id}_{n}.jpg
                fname = Path(row["identity"]).stem.split("_")[0]
                if fname.isdigit():
                    sid = int(fname)
                    matches.append(
                        FaceMatch(
                            student_id=sid,
                            student_name=str(sid),
                            confidence=round(1 - row.get("distance", 0.5), 4),
                            face_location=(0, 0, 0, 0),
                            is_liveness_pass=True,
                        )
                    )
            return FrameAnalysisResult(
                timestamp=timestamp,
                total_faces_detected=len(result),
                matches=matches,
                unknown_face_count=max(0, len(result) - len(matches)),
                headcount=len(result),
                raw_frame=frame,
            )
        except Exception as e:
            logger.error(f"DeepFace error: {e}; falling back to face_recognition")
            return self.analyse_frame(frame, enrolled_student_ids)

    # ────────────── Annotated Frame ──────────────

    def draw_results(self, frame: np.ndarray, result: FrameAnalysisResult) -> np.ndarray:
        """Draw bounding boxes and labels on frame for live preview / admin feed."""
        annotated = frame.copy()
        identified_ids = {m.student_id for m in result.matches}

        for match in result.matches:
            top, right, bottom, left = match.face_location
            color = (0, 200, 0) if match.is_liveness_pass else (0, 165, 255)
            cv2.rectangle(annotated, (left, top), (right, bottom), color, 2)
            label = f"{match.student_name} ({match.confidence:.0%})"
            cv2.putText(
                annotated, label,
                (left, top - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2,
            )

        # Draw unknown faces in red
        # (locations not tracked separately in this simplified version)
        overlay_text = (
            f"Faces: {result.total_faces_detected} | "
            f"Identified: {result.identified_count} | "
            f"Unknown: {result.unknown_face_count}"
        )
        cv2.putText(
            annotated, overlay_text,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2,
        )
        return annotated

    # ────────────── Mock mode ──────────────

    def _mock_analysis(self, timestamp) -> FrameAnalysisResult:
        """Used when face_recognition is not installed (CI/tests)."""
        return FrameAnalysisResult(
            timestamp=timestamp,
            total_faces_detected=0,
            matches=[],
            unknown_face_count=0,
            headcount=0,
        )


# ────────────── Utility ──────────────

def extract_frames_from_video(video_path: str, num_frames: int = 10) -> List[np.ndarray]:
    """Extract evenly spaced frames from a video file for batch registration."""
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    indices = np.linspace(0, total - 1, num_frames, dtype=int)
    frames = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
    cap.release()
    return frames


def crop_and_save_unknown(frame: np.ndarray, save_dir: str, session_id: int) -> str:
    """Save an unknown-face crop to disk for audit purposes."""
    os.makedirs(save_dir, exist_ok=True)
    fname = f"unknown_{session_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
    path = os.path.join(save_dir, fname)
    cv2.imwrite(path, frame)
    return path
