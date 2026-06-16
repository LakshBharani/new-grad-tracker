export const STATUS_LABELS: Record<string, string> = {
  INTERESTED: "Interested",
  APPLIED: "Applied",
  OA: "OA",
  PHONE_SCREEN: "Phone Screen",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const STATUS_COLORS: Record<string, string> = {
  INTERESTED: "#6b7280",
  APPLIED: "#3b82f6",
  OA: "#f59e0b",
  PHONE_SCREEN: "#8b5cf6",
  INTERVIEW: "#06b6d4",
  OFFER: "#22c55e",
  REJECTED: "#ef4444",
  WITHDRAWN: "#9ca3af",
};

export const STATUS_ORDER: string[] = [
  "INTERESTED",
  "APPLIED",
  "OA",
  "PHONE_SCREEN",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

// Stages that represent a scheduled event (interview, assessment, etc.)
// — these prompt for an optional date & time.
export const EVENT_STAGES: string[] = ["OA", "PHONE_SCREEN", "INTERVIEW"];

// Stages where "which round" matters (used for the round stepper + Sankey).
export const INTERVIEW_STAGES: string[] = ["PHONE_SCREEN", "INTERVIEW"];

export type ListingWithMeta = {
  id: string;
  addedById: string;
  company: string;
  role: string;
  link: string;
  jobType: string;
  listingNotes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  addedBy: { id: string; name: string; email: string };
  // Applications on this listing by all users
  applications: UserApplicationRow[];
};

export type UserApplicationRow = {
  id: string;
  userId: string;
  listingId: string;
  status: string;
  hasReferral: boolean;
  referralFrom: string | null;
  notes: string | null;
  appliedAt: string | null;
  eventAt: string | null;
  interviewRound: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
};
