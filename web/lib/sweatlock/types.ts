export interface SweatLockAccount {
  id: string;
  user_id: string;
  balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
}

export interface SweatLockTransaction {
  id: string;
  user_id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

export interface ChallengeLog {
  id: string;
  user_id: string;
  transaction_id: string | null;
  reps_required: number;
  reps_completed: number;
  passed: boolean;
  duration_seconds: number | null;
  created_at: string;
}

export function repsRequired(amount: number): number {
  return Math.min(Math.ceil(amount * 0.5), 75);
}
