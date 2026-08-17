/**
 * The offer, in one place.
 *
 * Amounts are in pence so they can be compared with Stripe without floating
 * point surprises. Nothing here is secret: this file is safe to import from
 * client components, and the price *ids* live in the environment, not here.
 */

import { BRAND_NAME } from "@/lib/marketing/brand";

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

/**
 * Re-exported rather than redefined. There used to be a second product name
 * here, which is how the site ended up able to disagree with itself about what
 * it was selling.
 */
export { BRAND_NAME as PRODUCT_NAME } from "@/lib/marketing/brand";

export interface PlanFeature {
  title: string;
  description: string;
}

/**
 * What the customer actually gets. Deliberately mechanical: every line
 * describes something the product does, not an outcome it cannot guarantee.
 */
export const PLAN_FEATURES: readonly PlanFeature[] = [
  {
    title: "Enquiries answered on arrival",
    description:
      "Enquiries from your website get a reply straight away, at any hour, instead of waiting for someone to be free.",
  },
  {
    title: "The questions a price depends on",
    description:
      "Premises type, floor area, frequency, access times, what they have in place now, and anything unusual about the site.",
  },
  {
    title: "Structured enquiry capture",
    description:
      "Answers are turned into consistent fields rather than a paragraph of free text your team has to unpick.",
  },
  {
    title: "Enquiry notification",
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
  "Monthly rolling. There is no minimum term and no cancellation fee.",
  `Cancel whenever you like; ${BRAND_NAME} keeps running until the end of the month you have paid for.`,
  // REVIEW BEFORE LIVE CHARGING: neutral by design. The VAT treatment of these
  // sales has not been confirmed and depends on where the business is
  // established, its registration status and the customer's status. Do not
  // replace this with a definite statement (in either direction) until that is
  // settled — it is a factual tax claim customers rely on at the point of sale.
  "Prices shown are subject to any applicable taxes.",
];
