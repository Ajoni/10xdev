import type { APIRoute } from "astro";
import { z } from "zod";
import { insertTodo } from "@/lib/todos";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const createTodoSchema = z.object({
  description: z.string().trim().min(1, { error: "Description is required" }),
  complexity: z.coerce
    .number()
    .int({ error: "Complexity must be an integer from 1 to 5" })
    .min(1, { error: "Complexity must be an integer from 1 to 5" })
    .max(5, { error: "Complexity must be an integer from 1 to 5" }),
  deadline: z.iso.datetime({ offset: true, error: "Deadline must be an absolute instant" }),
});

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/todos");
  }

  const form = await context.request.formData();
  const parsed = createTodoSchema.safeParse({
    description: form.get("description"),
    complexity: form.get("complexity"),
    deadline: form.get("deadline"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid todo";
    return context.redirect(`/todos?error=${encodeURIComponent(message)}`);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/todos?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const error = await insertTodo(supabase, user.id, parsed.data);
  if (error) {
    return context.redirect(`/todos?error=${encodeURIComponent(error)}`);
  }

  return context.redirect("/todos");
};
