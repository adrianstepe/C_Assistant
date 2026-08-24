"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BRAND } from "@/lib/marketing/brand";
import { track } from "@/lib/analytics";
import {
  isFilled,
  isValidEmail,
  isValidName,
  isValidPhone,
  isValidWebsite,
} from "@/lib/validation";
import { Field, controlClass } from "@/components/ui/Field";
import { primaryButton, secondaryButton } from "@/components/marketing/primitives";

/**
 * Setup questionnaire shown after checkout.
 *
 * The success branch of `handleSubmit` posts the answers to `/api/setup`,
 * where they are stored as an inactive customer row ready for manual
 * activation — no more copy-paste-into-email handoff. If the POST fails
 * (datastore down, offline, rate limited), the old behaviour is kept as the
 * fallback: the answers are laid out ready to send by email, because losing
 * a brand-new customer's details to a bad hour would be worse than a
 * low-tech fallback.
 */

interface FormValues {
  companyName: string;
  website: string;
  contactName: string;
  email: string;
  phone: string;
  leadEmail: string;
  serviceAreas: string;
  services: string;
  notes: string;
}

type FieldKey = keyof FormValues;
type Errors = Partial<Record<FieldKey, string>>;

const EMPTY: FormValues = {
  companyName: "",
  website: "",
  contactName: "",
  email: "",
  phone: "",
  leadEmail: "",
  serviceAreas: "",
  services: "",
  notes: "",
};

const LABELS: Record<FieldKey, string> = {
  companyName: "Company name",
  website: "Website",
  contactName: "Contact name",
  email: "Email",
  phone: "Phone",
  leadEmail: "Send enquiries to",
  serviceAreas: "Service areas",
  services: "Typical cleaning services",
  notes: "Anything else",
};

function validate(values: FormValues): Errors {
  const errors: Errors = {};
  if (!isFilled(values.companyName, 120)) {
    errors.companyName = "Tell us the name of your business.";
  }
  if (!isValidName(values.contactName)) {
    errors.contactName = "Enter the name of our main contact.";
  }
  if (!isValidEmail(values.email)) {
    errors.email = "Enter an email address like name@company.co.uk";
  }
  if (!isValidWebsite(values.website)) {
    errors.website = "Enter a web address like yourcompany.co.uk";
  }
  if (!isValidPhone(values.phone)) {
    errors.phone = "Enter a valid phone number, or leave it blank.";
  }
  if (values.leadEmail.trim() !== "" && !isValidEmail(values.leadEmail)) {
    errors.leadEmail = "Enter a valid email address, or leave it blank.";
  }
  if (!isFilled(values.serviceAreas, 400)) {
    errors.serviceAreas = "Which towns, cities or postcodes do you cover?";
  }
  if (!isFilled(values.services, 400)) {
    errors.services = "List the cleaning work you take on.";
  }
  return errors;
}

/** The order fields appear in the form; drives focus and the summary. */
const FIELD_ORDER: readonly FieldKey[] = [
  "companyName",
  "website",
  "contactName",
  "email",
  "phone",
  "leadEmail",
  "serviceAreas",
  "services",
  "notes",
];

function buildSummary(values: FormValues): string {
  return FIELD_ORDER
    .filter((key) => values[key].trim() !== "")
    .map((key) => `${LABELS[key]}: ${values[key].trim()}`)
    .join("\n");
}

export function OnboardingForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [received, setReceived] = useState<string | null>(null);
  // The email fallback, shown only when the POST could not go through.
  const [fallbackSummary, setFallbackSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const mountedAt = useRef<number>(0);
  const attemptEventId = useRef<string>("");

  // Set on mount rather than during render: `Date.now()` is impure.
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  function update(key: FieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);

    // Focus the first problem *as it appears on screen*, not the first one the
    // validator happened to find.
    const firstInvalid = FIELD_ORDER.find((key) => found[key]);
    if (firstInvalid) {
      formRef.current
        ?.querySelector<HTMLElement>(`#onboarding-${firstInvalid}`)
        ?.focus();
      return;
    }

    void submit();
  }

  /** The success branch. One stable id per attempt so a retry after a
   *  failure can never store the submission twice. */
  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setFallbackSummary(null);
    if (!attemptEventId.current) {
      attemptEventId.current = `set_${crypto.randomUUID()}`;
    }
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          values,
          eventId: attemptEventId.current,
          meta: { elapsedMs: Date.now() - mountedAt.current },
          // Honeypot: a real person never sees or fills this.
          companyWebsite: honeypotRef.current?.value ?? "",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { slug?: string }
        | null;
      if (!response.ok || !payload?.slug) throw new Error(`setup POST returned ${response.status}`);
      track({
        name: "onboarding_submitted",
        properties: { hasWebsite: values.website.trim() !== "" },
      });
      setReceived(payload.slug);
    } catch {
      // Keep the answers in front of the customer with the old handoff as a
      // fallback rather than dead-ending them.
      setFallbackSummary(buildSummary(values));
      setReceived(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function copySummary() {
    if (!fallbackSummary) return;
    try {
      await navigator.clipboard.writeText(fallbackSummary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (received) {
    return (
      <div className="border-hairline rounded-lg border bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">
          Setup details received
        </h2>
        <p className="text-slate-body mt-2 text-sm leading-relaxed">
          Thank you. Everything {BRAND.name} needs is stored and waiting for a
          person to check it against your subscription and switch your
          assistant on. We&rsquo;ll confirm your link,
          {" "}
          <span className="font-mono text-xs">linwick.co.uk/c/{received}</span>,
          by email before anything goes live.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setReceived(null);
              setCopied(false);
            }}
            className={`${secondaryButton} w-full sm:w-auto`}
          >
            Edit answers
          </button>
        </div>
      </div>
    );
  }

  if (fallbackSummary) {
    const mailto = `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(
      `Setup details: ${values.companyName.trim()}`,
    )}&body=${encodeURIComponent(fallbackSummary)}`;

    return (
      <div className="border-hairline rounded-lg border bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">
          We couldn&rsquo;t submit that automatically
        </h2>
        <p className="text-slate-body mt-2 text-sm leading-relaxed">
          Nothing was lost. Send your answers across by email instead and
          we&rsquo;ll start configuring {BRAND.name}.
        </p>

        <pre className="border-hairline bg-mist mt-5 overflow-x-auto rounded-lg border px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap text-ink">
          {fallbackSummary}
        </pre>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={mailto}
            onClick={() =>
              track({
                name: "cta_clicked",
                properties: { id: "send_setup_details", location: "success" },
              })
            }
            className={`${primaryButton} w-full sm:w-auto`}
          >
            Send by email
          </a>
          <button
            type="button"
            onClick={() => void copySummary()}
            className={`${secondaryButton} w-full sm:w-auto`}
          >
            {copied ? "Copied" : "Copy details"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFallbackSummary(null);
              setCopied(false);
            }}
            className="text-slate-body hover:text-ink rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Edit answers
          </button>
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="border-hairline rounded-lg border bg-white p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-ink">
        Set up {BRAND.name}
      </h2>
      <p className="text-slate-body mt-2 text-sm leading-relaxed">
        This is everything we need to configure it for your business. It takes
        about two minutes.
      </p>

      {errorCount > 0 ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {errorCount === 1
            ? "One answer needs checking before you can send this."
            : `${errorCount} answers need checking before you can send this.`}
        </p>
      ) : null}

      {/* Honeypot: hidden from people; a filled field means the submission is
          dropped server-side without storing anything. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="onboarding-company-website">
          Leave this field empty
        </label>
        <input
          ref={honeypotRef}
          id="onboarding-company-website"
          type="text"
          name="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <fieldset className="mt-6">
        <legend className="text-xs font-semibold tracking-[0.12em] text-ink uppercase">
          Your business
        </legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            id="companyName"
            required
            value={values.companyName}
            error={errors.companyName}
            autoComplete="organization"
            onChange={update}
          />
          <TextField
            id="website"
            value={values.website}
            error={errors.website}
            placeholder="yourcompany.co.uk"
            autoComplete="url"
            onChange={update}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-xs font-semibold tracking-[0.12em] text-ink uppercase">
          Who we&rsquo;ll deal with
        </legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            id="contactName"
            required
            value={values.contactName}
            error={errors.contactName}
            autoComplete="name"
            onChange={update}
          />
          <TextField
            id="email"
            required
            type="email"
            value={values.email}
            error={errors.email}
            autoComplete="email"
            onChange={update}
          />
          <TextField
            id="phone"
            type="tel"
            value={values.phone}
            error={errors.phone}
            autoComplete="tel"
            onChange={update}
          />
          <TextField
            id="leadEmail"
            type="email"
            value={values.leadEmail}
            error={errors.leadEmail}
            hint="Leave blank to use the address above."
            onChange={update}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-xs font-semibold tracking-[0.12em] text-ink uppercase">
          What {BRAND.name} needs to know
        </legend>
        <div className="mt-4 grid gap-4">
          <AreaField
            id="serviceAreas"
            required
            rows={2}
            value={values.serviceAreas}
            error={errors.serviceAreas}
            hint="Towns, cities or postcode areas you cover."
            onChange={update}
          />
          <AreaField
            id="services"
            required
            rows={3}
            value={values.services}
            error={errors.services}
            hint="For example: office cleaning, communal areas, washroom services, one-off deep cleans."
            onChange={update}
          />
          <AreaField
            id="notes"
            rows={3}
            value={values.notes}
            error={errors.notes}
            hint="Anything you always ask customers, work you don't take on, or how you'd like enquiries formatted."
            onChange={update}
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className={`${primaryButton} mt-7 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {submitting ? "Sending" : "Continue"}
      </button>
    </form>
  );
}

interface BaseFieldProps {
  id: FieldKey;
  value: string;
  error?: string;
  hint?: string;
  required?: boolean;
  onChange: (key: FieldKey, value: string) => void;
}

function TextField({
  id,
  value,
  error,
  hint,
  required,
  type = "text",
  placeholder,
  autoComplete,
  onChange,
}: BaseFieldProps & {
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const fieldId = `onboarding-${id}`;
  return (
    <Field
      label={required ? LABELS[id] : `${LABELS[id]} (optional)`}
      htmlFor={fieldId}
      hint={error ? undefined : hint}
    >
      <input
        id={fieldId}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        onChange={(event) => onChange(id, event.target.value)}
        className={`${controlClass} min-h-11`}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </Field>
  );
}

function AreaField({
  id,
  value,
  error,
  hint,
  required,
  rows = 3,
  onChange,
}: BaseFieldProps & { rows?: number }) {
  const fieldId = `onboarding-${id}`;
  return (
    <Field
      label={required ? LABELS[id] : `${LABELS[id]} (optional)`}
      htmlFor={fieldId}
      hint={error ? undefined : hint}
    >
      <textarea
        id={fieldId}
        rows={rows}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        onChange={(event) => onChange(id, event.target.value)}
        className={controlClass}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </Field>
  );
}
