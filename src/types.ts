export interface Todo {
  id: string;
  user_id: string;
  description: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  /** UTC ISO-8601 instant. */
  deadline: string;
  /** UTC ISO-8601 instant. */
  created_at: string;
}
