import type { SupabaseClient } from "@supabase/supabase-js";
import type { Todo } from "@/types";

type TodoComplexity = Todo["complexity"];

interface TodoRow {
  id: string;
  user_id: string;
  description: string;
  complexity: number;
  deadline: string;
  created_at: string;
}

export function guessComplexity(description: string): TodoComplexity {
  const length = description.trim().length;
  if (length < 20) return 1;
  if (length < 50) return 2;
  if (length < 200) return 3;
  if (length < 1000) return 4;
  return 5;
}

function asComplexity(value: number): TodoComplexity | null {
  switch (value) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return value;
    default:
      return null;
  }
}

export async function listTodos(supabase: SupabaseClient, userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("id, user_id, description, complexity, deadline, created_at")
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("deadline", { ascending: true })
    .order("complexity", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as TodoRow[]).map((row) => {
    const complexity = asComplexity(row.complexity);
    if (!complexity) {
      throw new Error("Unexpected todo complexity");
    }
    return {
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      complexity,
      deadline: row.deadline,
      created_at: row.created_at,
    };
  });
}

export async function insertTodo(
  supabase: SupabaseClient,
  userId: string,
  input: { description: string; complexity: number; deadline: string },
): Promise<string | null> {
  const complexity = asComplexity(input.complexity);
  if (!complexity) {
    return "Complexity must be an integer from 1 to 5";
  }

  const { error } = await supabase.from("todos").insert({
    user_id: userId,
    description: input.description.trim(),
    complexity,
    deadline: input.deadline,
  });

  return error?.message ?? null;
}
