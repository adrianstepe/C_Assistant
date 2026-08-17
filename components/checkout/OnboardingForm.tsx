"use client";

import { useRef, useState } from "react";
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
 * Nothing is persisted — there is no database in this application yet. Rather
 * than implying otherwise, the form validates locally and then hands the
 * customer their answers in a form they can actually send. Wiring this to a
 * server is a contained change: replace `handleSubmit`'s success branch.
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
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

    setSummary(buildSummary(values));
    setCopied(false);
    track({
      name: "onboarding_submitted",
      properties: { hasWebsite: values.website.trim() !== "" },
    });
  }

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (summary) {
    const mailto = `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(
      `Setup details: ${values.companyName.trim()}`,
    )}&body=${encodeURIComponent(summary)}`;

    return (
      <div className="border-hairline rounded-lg border bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">
          Your setup details are ready
        </h2>
        <p className="text-slate-body mt-2 text-sm leading-relaxed">
          We haven&rsquo;t built the part that stores this yet, so nothing has
          been sent anywhere. Send it across and we&rsquo;ll start configuring{" "}
          {BRAND.name}.
        </p>

        <pre className="border-hairline bg-mist mt-5 overflow-x-auto rounded-lg border px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap text-ink">
          {summary}
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
            onClick={() => setSummary(null)}
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

      <button type="submit" className={`${primaryButton} mt-7 w-full sm:w-auto`}>
        Continue
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
