import type { APIRoute } from "astro";
import { markTodoDone } from "@/lib/todos";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/todos");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/todos?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const error = await markTodoDone(supabase, user.id, context.params.id ?? "");
  if (error) {
    return context.redirect(`/todos?error=${encodeURIComponent(error)}`);
  }

  return context.redirect("/todos");
};
