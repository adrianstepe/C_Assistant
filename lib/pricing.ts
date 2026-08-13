/**
 * The offer, in one place.
 *
 * Amounts are in pence so they can be compared with Stripe without floating
 * point surprises. Nothing here is secret — this file is safe to import from
 * client components, and the price *ids* live in the environment, not here.
 */

export interface Money {
  /** Pence. */
  amount: number;
  currency: "GBP";
}

function formatMoney({ amount, currency }: Money): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

export const SETUP_FEE: Money = { amount: 14_900, currency: "GBP" };
export const MONTHLY_FEE: Money = { amount: 7_900, currency: "GBP" };

export const SETUP_FEE_LABEL = formatMoney(SETUP_FEE);
export const MONTHLY_FEE_LABEL = formatMoney(MONTHLY_FEE);

export const PRODUCT_NAME = "AI Quote Assistant";

export interface PlanFeature {
  title: string;
  description: string;
}

/**
 * What the customer actually gets. Deliberately mechanical — every line
 * describes something the product does, not an outcome it cannot guarantee.
 */
export const PLAN_FEATURES: readonly PlanFeature[] = [
  {
    title: "Instant handling of incoming enquiries",
    description:
      "Enquiries from your website get a reply straight away, at any hour, instead of waiting for someone to be free.",
  },
  {
    title: "Qualification questions",
    description:
      "The assistant asks the things a price depends on — premises, size, frequency, access times, current arrangement.",
  },
  {
    title: "Structured lead capture",
    description:
      "Answers are turned into consistent fields rather than a paragraph of free text your team has to unpick.",
  },
  {
    title: "Lead notification",
    description:
      "Each completed enquiry is emailed to whoever you nominate, with the full conversation attached.",
  },
  {
    title: "Customised to your business",
    description:
      "We set it up with your services, the areas you cover and the questions you always ask, before it goes live.",
  },
  {
    title: "Ongoing maintenance and support",
    description:
      "Hosting, updates and changes to your questions are included for as long as you subscribe.",
  },
];

/** Plain-English terms. Shown next to the price, not buried in a footer. */
export const PLAN_TERMS: readonly string[] = [
  `${SETUP_FEE_LABEL} setup is charged once, on your first invoice, and covers configuration and going live.`,
  `${MONTHLY_FEE_LABEL} per month starts at the same time and recurs monthly until you cancel.`,
  "Monthly rolling — there is no minimum term and no cancellation fee.",
  "Cancel whenever you like; the assistant keeps running until the end of the month you have paid for.",
  "Prices exclude VAT.",
];
