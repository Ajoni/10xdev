import React, { useEffect, useState } from "react";
import { Calendar, CircleAlert, ClipboardList, Plus } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatLocalClock, toUtcInstant } from "@/lib/deadlines";
import { guessComplexity } from "@/lib/todos";
import { cn } from "@/lib/utils";
import type { Todo } from "@/types";

interface Props {
  serverError?: string | null;
}

const COMPLEXITY_LEVELS = [1, 2, 3, 4, 5] as const;

function isComplexity(value: number): value is Todo["complexity"] {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
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
        <Label htmlFor="complexity" className="mb-1">
          Complexity
        </Label>
        <Select name="complexity" value={String(complexity)} onValueChange={handleComplexityChange}>
          <SelectTrigger id="complexity" className="border-border bg-background text-foreground w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPLEXITY_LEVELS.map((level) => (
              <SelectItem key={level} value={String(level)}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="deadline-local" className="mb-1">
          Deadline
        </Label>
        <div className="relative">
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2">
            <Calendar className="size-4" />
          </span>
          <Input
            id="deadline-local"
            type="datetime-local"
            value={deadlineLocal}
            onChange={(event) => {
              setDeadlineLocal(event.target.value);
              if (errors.deadline) {
                setErrors((prev) => ({ ...prev, deadline: undefined }));
              }
            }}
            aria-invalid={errors.deadline ? true : undefined}
            className={cn("border-border bg-background text-foreground pl-10", errors.deadline && "border-destructive")}
          />
        </div>
        {errors.deadline ? (
          <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
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
