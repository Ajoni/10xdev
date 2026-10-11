import React, { useEffect, useState } from "react";
import { Calendar, CircleAlert, ClipboardList, Plus } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { guessComplexity } from "@/lib/todos";
import { cn } from "@/lib/utils";
import type { Todo } from "@/types";

interface Props {
  serverError?: string | null;
}

const COMPLEXITY_LEVELS = [1, 2, 3, 4, 5] as const;

function formatLocalClock(instant: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    return instant;
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = String(date.getFullYear());
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function isComplexity(value: number): value is Todo["complexity"] {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function toUtcInstant(localValue: string): string {
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
}

export default function WorkingList({ serverError }: Props) {
  const [description, setDescription] = useState("");
  const [complexity, setComplexity] = useState<Todo["complexity"]>(guessComplexity(""));
  const [complexityOverridden, setComplexityOverridden] = useState(false);
  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [errors, setErrors] = useState<{ description?: string; deadline?: string }>({});
  const deadlineUtc = deadlineLocal === "" ? "" : toUtcInstant(deadlineLocal);

  useEffect(() => {
    const list = document.getElementById("todo-list");
    if (!list) {
      return;
    }
    const clocks = list.querySelectorAll("time");
    for (const clock of clocks) {
      const instant = clock.getAttribute("datetime");
      if (!instant) {
        continue;
      }
      clock.textContent = formatLocalClock(instant);
    }
  }, []);

  function handleDescriptionChange(value: string) {
    setDescription(value);
    if (!complexityOverridden) {
      setComplexity(guessComplexity(value));
    }
    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  }

  function handleComplexityChange(value: string) {
    const next = Number(value);
    if (!isComplexity(next)) {
      return;
    }
    setComplexity(next);
    setComplexityOverridden(true);
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    const descriptionBlank = description.trim() === "";
    const deadlineMissing = deadlineLocal === "";
    if (!descriptionBlank && !deadlineMissing) {
      return;
    }
    event.preventDefault();
    setErrors({
      description: descriptionBlank ? "Description is required" : undefined,
      deadline: deadlineMissing ? "Deadline is required" : undefined,
    });
  }

  return (
    <form method="POST" action="/api/todos" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="description"
        label="Description"
        value={description}
        onChange={handleDescriptionChange}
        placeholder="What needs doing?"
        error={errors.description}
        icon={<ClipboardList className="size-4" />}
      />

      <div>
        <label htmlFor="complexity" className="mb-1 block text-sm text-blue-100/80">
          Complexity
        </label>
        <select
          id="complexity"
          name="complexity"
          value={complexity}
          onChange={(event) => {
            handleComplexityChange(event.target.value);
          }}
          className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
        >
          {COMPLEXITY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="deadline-local" className="mb-1 block text-sm text-blue-100/80">
          Deadline
        </label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40">
            <Calendar className="size-4" />
          </span>
          <input
            id="deadline-local"
            type="datetime-local"
            value={deadlineLocal}
            onChange={(event) => {
              setDeadlineLocal(event.target.value);
              if (errors.deadline) {
                setErrors((prev) => ({ ...prev, deadline: undefined }));
              }
            }}
            className={cn(
              "w-full rounded-lg border bg-slate-900 py-2 pr-3 pl-10 text-white [color-scheme:dark] focus:ring-2 focus:outline-none",
              errors.deadline ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-purple-400",
            )}
          />
        </div>
        {errors.deadline ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
            <CircleAlert className="size-3" />
            {errors.deadline}
          </p>
        ) : null}
      </div>

      <input type="hidden" name="deadline" value={deadlineUtc} readOnly />

      <ServerError message={serverError} />

      <SubmitButton pendingText="Adding..." icon={<Plus className="size-4" />}>
        Add todo
      </SubmitButton>
    </form>
  );
}
