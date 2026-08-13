"use client";

import { useEffect, useRef } from "react";
import type { IsoDate, Prospect, ProspectPatch } from "@/types/prospect";
import { formatDate } from "@/lib/date";
import {
  COMPANY_TYPE_LABELS,
  CONTACT_SOURCE_LABELS,
} from "@/lib/prospects/constants";
import { deriveAction } from "@/lib/prospects/urgency";
import { toCompanyType, toContactSource } from "@/lib/prospects/storage";
import { Field, controlClass } from "@/components/ui/Field";
import { StatusSelect } from "./StatusSelect";
import { UrgencyDot } from "./UrgencyDot";

interface ProspectDetailProps {
  prospect: Prospect;
  today: IsoDate;
  onPatch: (id: string, patch: ProspectPatch) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** `<input type="date">` and textareas hand back "" for cleared fields. */
function orUndefined(value: string): string | undefined {
  return value === "" ? undefined : value;
}

export function ProspectDetail({
  prospect,
  today,
  onPatch,
  onDelete,
  onClose,
}: ProspectDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const action = deriveAction(prospect, today);

  // Move focus into the panel whenever a different prospect is opened.
  useEffect(() => {
    panelRef.current?.focus();
  }, [prospect.id]);

  const patch = (changes: ProspectPatch) => onPatch(prospect.id, changes);

  const setNextAction = (changes: {
    description?: string;
    dueDate?: string;
  }) => {
    const description = changes.description ?? prospect.nextAction?.description ?? "";
    const dueDate =
      changes.dueDate === undefined ? prospect.nextAction?.dueDate : orUndefined(changes.dueDate);

    // An action with no description is not an action.
    if (description.trim() === "") {
      patch({ nextAction: undefined });
      return;
    }
    patch({ nextAction: dueDate ? { description, dueDate } : { description } });
  };

  return (
    <>
      {/* Backdrop only matters on small screens, where the panel covers the table. */}
      <div
        className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prospect-detail-title"
        tabIndex={-1}
        className="border-border bg-background fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l shadow-xl outline-none sm:max-w-lg"
      >
        <header className="border-border flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2
              id="prospect-detail-title"
              className="truncate text-base font-semibold"
            >
              {prospect.companyName || "Untitled prospect"}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs">
              <UrgencyDot level={action.level} />
              <span className="text-muted">{action.label}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-border hover:bg-surface-hover shrink-0 rounded-md border px-2 py-1 text-xs"
          >
            Close <kbd className="text-muted ml-1">Esc</kbd>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                patch({
                  dateContacted: today,
                  status: prospect.status === "new" ? "contacted" : prospect.status,
                })
              }
              className="border-border hover:bg-surface-hover rounded-md border px-2.5 py-1.5 text-xs font-medium"
            >
              Log contact today
            </button>
            <button
              type="button"
              onClick={() => patch({ dateFollowedUp: today })}
              className="border-border hover:bg-surface-hover rounded-md border px-2.5 py-1.5 text-xs font-medium"
            >
              Log follow-up today
            </button>
            {prospect.contactEmail ? (
              <a
                href={`mailto:${prospect.contactEmail}`}
                className="border-border hover:bg-surface-hover rounded-md border px-2.5 py-1.5 text-xs font-medium"
              >
                Email
              </a>
            ) : null}
            {prospect.website ? (
              <a
                href={prospect.website}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border hover:bg-surface-hover rounded-md border px-2.5 py-1.5 text-xs font-medium"
              >
                Website ↗
              </a>
            ) : null}
          </div>

          <Field label="Status" htmlFor="detail-status">
            <StatusSelect
              id="detail-status"
              value={prospect.status}
              onChange={(status) => patch({ status })}
            />
          </Field>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">
              Next action
            </legend>
            <Field label="What needs doing" htmlFor="detail-next-action">
              <input
                id="detail-next-action"
                type="text"
                value={prospect.nextAction?.description ?? ""}
                placeholder="e.g. Send pricing reply"
                onChange={(event) =>
                  setNextAction({ description: event.target.value })
                }
                className={controlClass}
              />
            </Field>
            <Field
              label="Due"
              htmlFor="detail-next-due"
              hint="Leave empty for no deadline."
            >
              <input
                id="detail-next-due"
                type="date"
                value={prospect.nextAction?.dueDate ?? ""}
                disabled={!prospect.nextAction}
                onChange={(event) => setNextAction({ dueDate: event.target.value })}
                className={controlClass}
              />
            </Field>
          </fieldset>

          <Field label="Response" htmlFor="detail-response">
            <textarea
              id="detail-response"
              rows={3}
              value={prospect.response ?? ""}
              placeholder="What they said back"
              onChange={(event) =>
                patch({ response: orUndefined(event.target.value) })
              }
              className={controlClass}
            />
          </Field>

          <Field label="Personalization angle" htmlFor="detail-angle">
            <textarea
              id="detail-angle"
              rows={2}
              value={prospect.personalizationAngle ?? ""}
              placeholder="The specific hook for this company"
              onChange={(event) =>
                patch({ personalizationAngle: orUndefined(event.target.value) })
              }
              className={controlClass}
            />
          </Field>

          <Field label="Notes" htmlFor="detail-notes">
            <textarea
              id="detail-notes"
              rows={4}
              value={prospect.notes ?? ""}
              onChange={(event) =>
                patch({ notes: orUndefined(event.target.value) })
              }
              className={controlClass}
            />
          </Field>

          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">
              Dates
            </legend>
            <Field label="Contacted" htmlFor="detail-contacted">
              <input
                id="detail-contacted"
                type="date"
                value={prospect.dateContacted ?? ""}
                onChange={(event) =>
                  patch({ dateContacted: orUndefined(event.target.value) })
                }
                className={controlClass}
              />
            </Field>
            <Field label="Followed up" htmlFor="detail-followed">
              <input
                id="detail-followed"
                type="date"
                value={prospect.dateFollowedUp ?? ""}
                onChange={(event) =>
                  patch({ dateFollowedUp: orUndefined(event.target.value) })
                }
                className={controlClass}
              />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">
              Company
            </legend>
            <Field label="Company name" htmlFor="detail-company">
              <input
                id="detail-company"
                type="text"
                value={prospect.companyName}
                onChange={(event) => patch({ companyName: event.target.value })}
                className={controlClass}
              />
            </Field>
            <Field label="Website" htmlFor="detail-website">
              <input
                id="detail-website"
                type="url"
                value={prospect.website ?? ""}
                placeholder="https://"
                onChange={(event) =>
                  patch({ website: orUndefined(event.target.value) })
                }
                className={controlClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" htmlFor="detail-city">
                <input
                  id="detail-city"
                  type="text"
                  value={prospect.city}
                  onChange={(event) => patch({ city: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field label="Country" htmlFor="detail-country">
                <input
                  id="detail-country"
                  type="text"
                  value={prospect.country}
                  onChange={(event) => patch({ country: event.target.value })}
                  className={controlClass}
                />
              </Field>
            </div>
            <Field label="Company type" htmlFor="detail-type">
              <select
                id="detail-type"
                value={prospect.companyType}
                onChange={(event) => {
                  const next = toCompanyType(event.target.value);
                  if (next) patch({ companyType: next });
                }}
                className={`${controlClass} cursor-pointer`}
              >
                {Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">
              Contact
            </legend>
            <Field label="Contact name" htmlFor="detail-contact-name">
              <input
                id="detail-contact-name"
                type="text"
                value={prospect.contactName ?? ""}
                onChange={(event) =>
                  patch({ contactName: orUndefined(event.target.value) })
                }
                className={controlClass}
              />
            </Field>
            <Field label="Contact email" htmlFor="detail-contact-email">
              <input
                id="detail-contact-email"
                type="email"
                value={prospect.contactEmail ?? ""}
                onChange={(event) =>
                  patch({ contactEmail: orUndefined(event.target.value) })
                }
                className={controlClass}
              />
            </Field>
            <Field label="Contact source" htmlFor="detail-source">
              <select
                id="detail-source"
                value={prospect.contactSource}
                onChange={(event) => {
                  const next = toContactSource(event.target.value);
                  if (next) patch({ contactSource: next });
                }}
                className={`${controlClass} cursor-pointer`}
              >
                {Object.entries(CONTACT_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>

          <div className="border-border flex items-center justify-between border-t pt-4">
            <p className="text-muted text-xs">
              Added {formatDate(prospect.dateAdded)}
            </p>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${prospect.companyName || "this prospect"}? This cannot be undone.`,
                  )
                ) {
                  onDelete(prospect.id);
                }
              }}
              className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
