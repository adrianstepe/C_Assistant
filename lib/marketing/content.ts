/**
 * Landing page copy, kept out of the components so it can be reviewed and
 * edited as prose rather than hunted through JSX.
 */

export interface TimelineEntry {
  time: string;
  event: string;
  /** Marks the moment the lead is effectively lost. */
  lost?: boolean;
}

/** The concrete story in the problem section. */
export const PROBLEM_TIMELINE: readonly TimelineEntry[] = [
  {
    time: "Fri, 16:50",
    event:
      "“Do you cover office cleaning in Salford? We need a quote for a 2,000 sq ft unit.”",
  },
  {
    time: "Fri, 17:30",
    event: "Everyone is on site or finishing the week. Nobody sees it.",
  },
  {
    time: "Mon, 09:20",
    event: "Your supervisor spots it between two site visits.",
  },
  {
    time: "Mon, 11:05",
    event: "You reply asking for size, frequency and access times.",
  },
  {
    time: "Wed",
    event: "No answer. They took the two firms that replied on Friday.",
    lost: true,
  },
];

export interface WorkflowStep {
  title: string;
  description: string;
}

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    title: "Enquiry arrives",
    description:
      "Someone asks for a quote through your website, at any hour of the day.",
  },
  {
    title: "The assistant replies",
    description:
      "Straight away, in your company’s name: no queue, no voicemail.",
  },
  {
    title: "It asks what you’d ask",
    description:
      "Size, frequency, access times, sites, start date. The details a price depends on.",
  },
  {
    title: "The answers get structured",
    description:
      "Free text becomes fields: service, floor area, schedule, contact.",
  },
  {
    title: "You get a lead you can quote",
    description:
      "A complete summary lands with your team, ready to price or bin.",
  },
];

export interface Benefit {
  title: string;
  description: string;
}

export const BENEFITS: readonly Benefit[] = [
  {
    title: "Reply while they’re still reading",
    description:
      "Enquiries get an answer in seconds instead of the next working morning, when the shortlist is often already formed.",
  },
  {
    title: "Ask what actually prices a job",
    description:
      "Floor area, frequency, access windows, number of sites, washrooms. The questions your estimator would ask, asked every time.",
  },
  {
    title: "Stop retyping the same five answers",
    description:
      "Do you cover this area? Are you insured? Can you work evenings? Answered consistently, without pulling anyone off site.",
  },
  {
    title: "Cover evenings and weekends",
    description:
      "Enquiries sent after 5pm or on a Sunday get the same response as one sent at 10am on Tuesday.",
  },
  {
    title: "Hand staff a brief, not a riddle",
    description:
      "Your team opens a structured summary rather than three vague lines and a phone number.",
  },
  {
    title: "See which enquiries are worth chasing",
    description:
      "A one-off 400 sq ft office and a five-site contract stop looking identical in your inbox.",
  },
];

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

export const HOW_IT_WORKS: readonly HowItWorksStep[] = [
  {
    number: "01",
    title: "Connect",
    description:
      "Add the assistant to your existing website. No rebuild, no new enquiry form for your customers to learn.",
  },
  {
    number: "02",
    title: "Customise",
    description:
      "Tell it the services you offer, the areas you cover and the questions you always ask. It works from your rules, not generic ones.",
  },
  {
    number: "03",
    title: "Receive qualified enquiries",
    description:
      "Structured leads arrive by email, with the full conversation attached if you want to read it.",
  },
];

export const AUDIENCE_FITS: readonly string[] = [
  "Commercial and contract cleaning companies",
  "Office and workplace cleaning specialists",
  "Facilities management firms with a cleaning arm",
  "Teams handling enquiries for more than one site",
];

/** Being straight about poor fit does more for credibility than another claim. */
export const AUDIENCE_MISFITS: readonly string[] = [
  "Domestic-only cleaning, where enquiries look very different",
  "Businesses that take all work by phone and never by web form",
  "Jobs you would never price without a site visit first",
];
