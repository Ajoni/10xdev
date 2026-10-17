import { useState, type ReactNode } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SAMPLE_DEADLINE = "2026-10-20T12:00:00.000Z";

function Specimen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-foreground text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

function SpecimenCard({ children }: { children: ReactNode }) {
  return <Card className="w-full max-w-xl gap-0 p-8">{children}</Card>;
}

function AddTodoControl({
  className,
  disabled = false,
  type = "button",
}: {
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button type={type} disabled={disabled} className={cn("w-full", className)}>
      <span className="flex items-center gap-2">
        <Plus className="size-4" />
        Add todo
      </span>
    </Button>
  );
}

function DescriptionField({ id, error }: { id: string; error?: string }) {
  const [value, setValue] = useState("");

  return (
    <FormField
      id={id}
      label="Description"
      value={value}
      onChange={(next) => {
        setValue(next);
      }}
      placeholder="What needs doing?"
      error={error}
      icon={<ClipboardList className="size-4" />}
    />
  );
}

export default function TodoStateSink() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <h1 className="text-foreground text-center text-2xl font-bold">Todo states</h1>

      <Specimen title="Default">
        <SpecimenCard>
          <p className="text-foreground mb-6 text-center text-2xl font-bold">Todos</p>
          <ol className="mb-6 space-y-3">
            <li className="border-border rounded-lg border px-4 py-3">
              <p className="break-words">Prepare the weekly update</p>
              <p className="text-muted-foreground mt-1 text-sm">Complexity 2</p>
              <time className="text-muted-foreground mt-1 block text-sm" dateTime={SAMPLE_DEADLINE}>
                {SAMPLE_DEADLINE}
              </time>
            </li>
          </ol>
          <form method="get" action="/dev/todo-states" className="space-y-4">
            <DescriptionField id="description-default" />
            <SubmitButton pendingText="Adding..." icon={<Plus className="size-4" />}>
              Add todo
            </SubmitButton>
          </form>
        </SpecimenCard>
      </Specimen>

      <Specimen title="Hover">
        <SpecimenCard>
          <AddTodoControl className="bg-primary/90" />
        </SpecimenCard>
      </Specimen>

      <Specimen title="Focus-visible">
        <SpecimenCard>
          <AddTodoControl className="border-ring ring-ring/50 ring-[3px]" />
        </SpecimenCard>
      </Specimen>

      <Specimen title="Submit disabled">
        <SpecimenCard>
          <AddTodoControl type="submit" disabled />
        </SpecimenCard>
      </Specimen>

      <Specimen title="Submit loading">
        <SpecimenCard>
          <form method="get" action="/dev/todo-states">
            <SubmitButton pending pendingText="Adding..." icon={<Plus className="size-4" />}>
              Add todo
            </SubmitButton>
          </form>
        </SpecimenCard>
      </Specimen>

      <Specimen title="Error">
        <SpecimenCard>
          <div className="space-y-4">
            <DescriptionField id="description-error" error="Description is required" />
            <ServerError message="Could not load todos" />
          </div>
        </SpecimenCard>
      </Specimen>

      <Specimen title="Empty">
        <SpecimenCard>
          <p className="text-muted-foreground mb-6 text-sm">No todos yet.</p>
        </SpecimenCard>
      </Specimen>

      <Specimen title="Field disabled">
        <SpecimenCard>
          <p className="text-foreground text-sm">
            N/A: the product does not disable description, complexity, or deadline
          </p>
        </SpecimenCard>
      </Specimen>

      <Specimen title="List loading">
        <SpecimenCard>
          <p className="text-foreground text-sm">N/A: the page awaits listTodos before HTML</p>
        </SpecimenCard>
      </Specimen>
    </div>
  );
}
