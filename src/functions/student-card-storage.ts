export type StudentCardData = {
  studentId: string;
  name?: string;
  studentRegistration?: string;
  semesterLabel?: string;
  currentPeriod?: string;
  courseLabel?: string;
  courseVersion?: string;
  authenticationCode?: string;
  authenticationUrl?: string;
  validityDays?: number;
  totalCredits?: number;
  totalWorkloadHours?: number;
};

type StoredStudentCardData = {
  data: StudentCardData;
  expiresAt: number;
};

const STORAGE_KEY = "student-card";

export function getStudentCardStorageKey() {
  return STORAGE_KEY;
}

export function readStoredStudentCard(): StudentCardData | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredStudentCardData;

    if (!parsed?.data || !parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeStoredStudentCard(data: StudentCardData) {
  if (typeof window === "undefined") return;
  if (!data.validityDays || data.validityDays <= 0) return;

  const expiresAt = Date.now() + data.validityDays * 24 * 60 * 60 * 1000;
  const payload: StoredStudentCardData = { data, expiresAt };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredStudentCard() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
