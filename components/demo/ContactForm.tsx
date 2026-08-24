"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ContactDetails } from "@/lib/ai/types";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/ai/extract";
import { Field, controlClass } from "@/components/ui/Field";
import { TypingDots } from "@/components/ui/TypingDots";

interface ContactFormProps {
  disabled: boolean;
  onSubmit: (contact: ContactDetails) => void;
  /**
   * The footer line, which must be true wherever the form renders. The public
   * demo stores nothing and says so; on a hosted capture page the submission
   * is the whole point, so the same sentence would be a lie on the page of a
   * paying customer.
   */
  footnote?: string;
}

type FieldErrors = Partial<Record<"name" | "email" | "phone", string>>;

/**
 * Inline contact card, rendered in place of the message box for the final step.
 *
 * A form rather than free text because this is the one point where the data
 * has to be right: an email typed into a chat box cannot be validated without
 * guessing, and guessing a customer's email is worse than asking properly.
 */
export function ContactForm({
  disabled,
  onSubmit,
  footnote = "This is a demonstration. Nothing is sent or stored anywhere.",
}: ContactFormProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const sending = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || sending.current) return;

    const found: FieldErrors = {};
    if (!isValidName(name)) found.name = "Please enter your name.";
    if (!isValidEmail(email)) {
      found.email = "Enter an email address like name@company.co.uk";
    }
    if (!isValidPhone(phone)) found.phone = "Enter a valid phone number, or leave it blank.";

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    sending.current = true;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      ...(company.trim() ? { company: company.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    });
    window.setTimeout(() => {
      sending.current = false;
    }, 0);
  }

  return (
    <div className="border-hairline border-t bg-white px-3 py-4 sm:px-4">
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name" htmlFor="contact-name">
            <input
              id="contact-name"
              type="text"
              value={name}
              autoComplete="name"
              disabled={disabled}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
              onChange={(event) => setName(event.target.value)}
              className={`${controlClass} min-h-11`}
            />
            {errors.name ? (
              <p id="contact-name-error" role="alert" className="text-xs font-medium text-rose-700">
                {errors.name}
              </p>
            ) : null}
          </Field>

          <Field label="Company (optional)" htmlFor="contact-company">
            <input
              id="contact-company"
              type="text"
              value={company}
              autoComplete="organization"
              disabled={disabled}
              onChange={(event) => setCompany(event.target.value)}
              className={`${controlClass} min-h-11`}
            />
          </Field>

          <Field label="Email" htmlFor="contact-email">
            <input
              id="contact-email"
              type="email"
              inputMode="email"
              value={email}
              autoComplete="email"
              disabled={disabled}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
              onChange={(event) => setEmail(event.target.value)}
              className={`${controlClass} min-h-11`}
            />
            {errors.email ? (
              <p id="contact-email-error" role="alert" className="text-xs font-medium text-rose-700">
                {errors.email}
              </p>
            ) : null}
          </Field>

          <Field label="Phone (optional)" htmlFor="contact-phone">
            <input
              id="contact-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              autoComplete="tel"
              disabled={disabled}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "contact-phone-error" : undefined}
              onChange={(event) => setPhone(event.target.value)}
              className={`${controlClass} min-h-11`}
            />
            {errors.phone ? (
              <p id="contact-phone-error" role="alert" className="text-xs font-medium text-rose-700">
                {errors.phone}
              </p>
            ) : null}
          </Field>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-body text-xs">{footnote}</p>
          <button
            type="submit"
            disabled={disabled}
            className="bg-brand inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-ink transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {disabled ? (
              <>
                Sending
                <TypingDots tone="muted" />
              </>
            ) : (
              "Send details"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
