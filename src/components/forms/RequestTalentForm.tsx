"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check } from "lucide-react";
import { enquirySchema, type EnquiryInput, NEED_OPTIONS } from "@/lib/enquiry";
import { Button } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <>
            <span className="text-danger" aria-hidden="true">
              {" "}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-sm text-danger"
        >
          <AlertCircle className="size-4 flex-none" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function RequestTalentForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    mode: "onBlur",
  });
  const [submitted, setSubmitted] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");
      setSubmitted(true);
    } catch {
      setError("root", {
        message:
          "Something went wrong sending your request. Please try again, or email us directly.",
      });
    }
  });

  if (submitted) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="form-success"
      >
        <span className="grid size-11 place-items-center rounded-full bg-success text-white">
          <Check className="size-6" aria-hidden="true" />
        </span>
        <h3 className="text-h3 font-[540]">Request received.</h3>
        <p className="text-muted">
          Thanks — we&apos;ve got your details. A recruiter will be in touch
          within <Placeholder>one business day</Placeholder>. (This is a demo
          form; nothing was actually sent.)
        </p>
      </div>
    );
  }

  const describe = (field: keyof EnquiryInput) =>
    errors[field] ? `${field}-error` : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {errors.root && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-btn border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          <AlertCircle className="size-4 flex-none" aria-hidden="true" />
          {errors.root.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name?.message}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="form-input"
            aria-invalid={!!errors.name}
            aria-describedby={describe("name")}
            {...register("name")}
          />
        </Field>
        <Field
          id="company"
          label="Company"
          required
          error={errors.company?.message}
        >
          <input
            id="company"
            type="text"
            autoComplete="organization"
            className="form-input"
            aria-invalid={!!errors.company}
            aria-describedby={describe("company")}
            {...register("company")}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="Email" required error={errors.email?.message}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="form-input"
            aria-invalid={!!errors.email}
            aria-describedby={describe("email")}
            {...register("email")}
          />
        </Field>
        <Field id="phone" label="Phone" error={errors.phone?.message}>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="form-input"
            {...register("phone")}
          />
        </Field>
      </div>

      <Field
        id="need"
        label="What you need"
        required
        error={errors.need?.message}
      >
        <select
          id="need"
          defaultValue=""
          className="form-input"
          aria-invalid={!!errors.need}
          aria-describedby={describe("need")}
          {...register("need")}
        >
          <option value="" disabled>
            Select one…
          </option>
          {NEED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="details" label="Role / details" error={errors.details?.message}>
        <textarea
          id="details"
          rows={4}
          placeholder="The role, must-haves, and anything else that matters."
          className="form-input"
          {...register("details")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="location" label="Location">
          <input
            id="location"
            type="text"
            placeholder="Austin, Round Rock, …"
            className="form-input"
            {...register("location")}
          />
        </Field>
        <Field id="timeline" label="Timeline">
          <input
            id="timeline"
            type="text"
            placeholder="ASAP, 2 weeks, …"
            className="form-input"
            {...register("timeline")}
          />
        </Field>
      </div>

      <div className="mt-2 flex flex-col gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="self-start disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Sending…" : "Send Request"}
        </Button>
        <p className="text-sm text-muted">
          You&apos;ll hear back within <Placeholder>one business day</Placeholder>
          .
        </p>
      </div>
    </form>
  );
}
