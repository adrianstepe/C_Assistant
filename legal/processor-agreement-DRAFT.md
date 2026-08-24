# DATA PROCESSOR AGREEMENT (TEMPLATE)

<!--
REVIEW BEFORE LAUNCH - DRAFT, NOT EXECUTED.

This is a drafting aid referenced by the terms page and the privacy notice
(section 7). It is NOT an executed agreement and must not be treated as one.

Before any customer goes live, Adrians (or a lawyer) must:

  1. Read every bracketed [LIKE THIS] and fill or delete it.
  2. Confirm the retention numbers below match what the code enforces
     (lib/marketing/legal.ts: RETENTION_DAYS_AFTER_DELIVERY = 30,
     RETENTION_HARD_CEILING_DAYS = 90) and what the privacy notice states.
     If one changes, all three change together.
  3. NEON (ACTION): Neon's public materials do not publish the substance of
     its DPA - neon.com/dpa redirects into its Platform Terms, and its SCC /
     UK-transfer language is not publicly visible (verified August 2026).
     Before live enquiry traffic, obtain and file the executed Neon DPA and
     complete clause 15 / schedule 3 from it. Do not go live on the marketing
     copy alone.
  4. The 24-hour breach figure in clause 11 is a self-imposed commitment,
     tighter than the law requires: the ICO sets no fixed timescale for a
     processor telling its controller ("without undue delay"), but it does
     recommend agreeing and documenting timescales in the contract. 24 hours
     was chosen so the controller has realistic room inside its own 72-hour
     reporting deadline. It appears here, in the privacy notice (section 7),
     the terms page and the /security page - change all four together or not
     at all.
  5. Check governing law: drafted for Latvia to match the company's place of
     establishment; UK customers may push back - decide the position before,
     not after, the first objection.
  6. Record the signed instance somewhere retrievable; signing happens during
     manual onboarding, which is also when a copy goes to the customer.
-->

**Data Processor Agreement (template v0.2, August 2026)**

This Agreement applies where Stepe Digital SIA ([registered address],
company number 40203711274, "Processor") processes personal data on behalf
of the cleaning company named in schedule 1 ("Controller") in connection
with the Linwick enquiry assistant service.

It is written to satisfy Article 28(3) of the UK GDPR and EU GDPR, which
requires a written contract setting out: the subject matter and duration of
the processing; its nature and purpose; the type of personal data and
categories of data subjects; the controller's obligations and rights; and
the minimum terms listed in clauses 5 to 13 below. Sources: ICO, "What needs
to be included in the contract?" -
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/what-needs-to-be-included-in-the-contract/
(the same items appear as the ICO's on-page tick-box contract checklist at
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/contracts/
— the ICO publishes no separate downloadable contracts checklist).

**1. Details of the processing.**

   (a) **Subject matter:** enquiries submitted by prospective customers of
       Controller through Controller's hosted assistant page operated by
       Processor.
   (b) **Duration:** from the date Controller's assistant is switched live
       until Controller cancels the subscription, plus the retention tail in
       clause 2(e).
   (c) **Nature and purpose:** collection, transmission, structured storage
       and delivery of completed enquiries, so that Controller can respond
       to them and quote for work.
   (d) **Type of personal data:** contact details the enquirer chooses to
       give (name, email address, optionally company and phone number) and
       the content of their enquiry about cleaning work.
   (e) **Categories of data subjects:** prospective customers of Controller
       (adults making domestic or commercial cleaning enquiries).
   (f) **Controller's obligations and rights:** set out in clause 4.
   *Drafting note:* enquirers sometimes volunteer more than the above (health
   or access details, for instance). Controller decides how to handle such
   content after delivery; Processor stores and delivers it like any other
   enquiry content.

**2. Processing operations and retention.** Enquiries are received over
TLS, stored in the EU-region database named in schedule 3, delivered to the
mailbox Controller nominates, and deleted no later than **30 days after
successful delivery**, and in any event never kept longer than **90 days**
after receipt. Deletion runs automatically on a daily schedule in
Processor's code (`/api/retention`), not by intention.

**3. Documentation of instructions.** Controller's instructions consist of
this Agreement and the configuration choices Controller makes through
Processor's setup process. Instructions are documented in writing (which
includes email and saved configuration). Processor processes personal data
only on those documented instructions, including when making an
international transfer, unless required to do otherwise by applicable law;
in that case Processor informs Controller of the legal requirement before
processing unless the law prohibits it. Processor immediately informs
Controller if, in Processor's opinion, an instruction infringes the UK GDPR,
EU GDPR or related data protection law. [Source: Art. 28(3)(a) and final
sentence of Art. 28(3); see also the ICO page cited in the preamble.]

**4. Controller obligations and rights.** Controller determines the purpose
of the processing; provides the privacy information owed to enquirers on its
own website or wherever it publishes its assistant link; responds to data
subject requests as controller; and may issue documented instructions
consistent with this Agreement.

**5. Confidentiality.** Processor ensures that everyone it allows to process
personal data under this Agreement - employees, contractors, temporary and
agency workers included - is bound by a duty of confidence or under an
equivalent statutory duty. [Art. 28(3)(b)]

**6. Security.** Processor takes all measures required by Article 32
(appropriate technical and organisational measures), having regard to the
state of the art and the cost of implementation. Measures in force for this
service currently include: TLS encryption for data in transit, including
between Processor's application and the database; credentials held only in
deployment environment configuration; administrative access that fails
closed when unconfigured; de-duplication of stored records on unique event
ids so retries cannot corrupt delivery state; no third-party scripts on
capture pages; and scheduled secure deletion per clause 2. Processor keeps
these measures proportionate to the risk and will tell Controller before
reducing them. [Art. 28(3)(c)]

**7. Sub-processors.**
   (a) Processor engages only the sub-processors listed in schedule 3
       (general written authorisation).
   (b) Processor gives Controller at least **14 days' advance written
       notice** of any intended addition or replacement, giving Controller
       the chance to object. On objection the parties will discuss the
       concern in good faith; if unresolved, Controller may end the affected
       service without penalty.
   (c) Processor imposes the same data protection obligations set out in
       this Agreement on every sub-processor by written contract, offering
       an equivalent level of protection, and remains liable to Controller
       for a sub-processor's failure to perform those obligations.
   [Art. 28(3)(d) and Art. 28(4); ICO guidance as cited in the preamble]

**8. Data subject rights.** Taking into account the nature of the
processing, Processor assists Controller, with appropriate technical and
organisational measures, in responding to requests from individuals
exercising their rights (access, rectification, erasure, restriction,
objection, portability). Because all enquiry data sits in one queryable
store, Processor answers such requests by direct search and routes them
through the contacts in schedule 2. [Art. 28(3)(e)]

**9. Assistance generally.** Taking into account the nature of the
processing and the information available, Processor assists Controller in
meeting obligations to: keep personal data secure; notify personal data
breaches to the competent supervisory authority (including the UK Information
Commissioner's Office where the UK GDPR applies); notify breaches to data
subjects; carry out data protection impact assessments where required; and
consult the supervisory authority where a DPIA shows a high risk that cannot
be mitigated. [Art. 28(3)(f); ICO guidance as cited in the preamble]

**10. Personal data breaches.**
   (a) Processor notifies Controller without undue delay, and in any event
       **within 24 hours** of Processor becoming aware of a personal data
       breach affecting Controller's personal data. *(Self-imposed figure -
       see the reviewer's note 4 above; the law itself sets no fixed
       processor-to-controller timescale. The ICO recommends agreeing and
       documenting breach-reporting timescales in the contract, and notes
       most controllers contractually expect immediate notice -
       https://ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/toolkits/personal-data-breach-management/third-party-arrangements/
       ; see also ICO, "Personal data breaches: a guide" -
       https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/personal-data-breaches-a-guide/ )*
   (b) The notification includes, so far as known at the time: the nature of
       the breach (categories and approximate numbers of individuals and
       records concerned); a contact point; the likely consequences; and the
       measures taken or proposed, including mitigation. Processor provides
       information in phases where full detail is not immediately available,
       without further undue delay.
   (c) Processor keeps a record of all personal data breaches affecting
       Controller's personal data, whether or not notifiable.

**11. End of the contract.** On termination, Processor, at Controller's
choice, deletes or returns all personal data processed for Controller, and
deletes existing copies, unless applicable law requires storage. Deletion is
performed securely. Where data sits in backups, it is put beyond use
immediately and deleted on the backup system's next deletion cycle.
[Art. 28(3)(g); ICO guidance as cited in the preamble, including its
acceptance of deletion-cycle handling for backups.]

**12. Audits and inspections.** Processor makes available to Controller all
information necessary to demonstrate compliance with Article 28, and allows
for and contributes to audits and inspections carried out by Controller or
an auditor Controller mandates. At this service's scale audits are conducted
remotely, on reasonable notice, no more than once a year except after a
suspected incident; each party bears its own costs, except that Processor
bears the cost of an audit triggered by a breach attributable to Processor.
[Art. 28(3)(h)]

**13. Records.** Processor maintains records of all categories of processing
activities carried out for Controller as required by Article 30(2), and makes
them available to Controller on request. (The ICO notes Article 30(2), not
Article 28(3), is what compels record-keeping; it is included here for
completeness.)

**14. International transfers.** Processor does not transfer Controller's
personal data outside the UK or EEA without a valid transfer mechanism
(adequacy regulations, standard data protection clauses such as the EU
Standard Contractual Clauses together with the UK Addendum or IDTA, or a
certified framework recognised for UK purposes). Schedule 3 states, per
vendor, where data is processed and the mechanism relied on, sourced from
each vendor's published terms. [Chapter V UK GDPR / EU GDPR; ICO
international-transfers guidance -
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/a-brief-guide-to-international-transfers/ ]

**15. Liability.** [DELIBERATELY OPEN - negotiate with a lawyer once there
is a paying client: caps, exclusions, indemnities, and how they interact
with clause 7(c) liability for sub-processors.]

**16. Governing law.** Latvia. Courts of Latvia. [Confirm before first
signature - UK customers may object; see reviewer's note 5.]

---

**Schedule 1 - the Controller:** [customer name, address]

**Schedule 2 - notices:** Controller's nominated contact: [name, email].
Processor contact: adrians@stepedigital.com until an @linwick.co.uk mailbox
exists.

**Schedule 3 - authorised sub-processors (as at template date):**

| Vendor | Service | Where data is processed | Transfer mechanism | Published source |
|---|---|---|---|---|
| Vercel Inc. | Hosting and edge delivery of the site and capture pages | Primary processing facilities in the United States; edge network worldwide; functions region configurable (London/Frankfurt available) | Vercel DPA incorporating EU SCCs (2021/914); UK IDTA deemed entered into for UK transfers; Vercel certifies under the EU-US Data Privacy Framework including its UK Extension | https://vercel.com/legal/dpa ; https://vercel.com/docs/edge-network/regions ; https://vercel.com/legal/privacy-policy |
| Neon | Managed Postgres database (EU-region project) holding setup details and enquiries | Project pinned to one AWS region at creation (EU regions incl. eu-central-1 Frankfurt, eu-west-2 London) | **[ACTION - see reviewer's note 3]** Neon publishes regions docs but its DPA substance (SCC modules / UK mechanism) is not publicly verifiable; obtain executed DPA before live traffic | https://neon.com/docs/introduction/regions ; https://neon.com/platform-terms |
| Resend (Plus Five Five, Inc.) | Transactional delivery of completed enquiries from linwick.co.uk | Sending can route via EU (Ireland); ALL stored email data (content, metadata, logs) sits in the United States regardless of sending region | Resend DPA: EU SCCs (2021/914) deemed entered into; UK transfers covered by the UK Addendum to those SCCs; Resend states participation in the EU-US DPF including the UK Extension | https://resend.com/legal/dpa ; https://resend.com/docs/dashboard/domains/regions ; https://resend.com/security/gdpr |

Stripe Payments Europe Ltd / Stripe, Inc. handles subscription billing. It
processes payment data as an independent controller under its own terms and
is therefore not a sub-processor for enquiry data; it is listed here so the
picture is complete. Source: https://stripe.com/gb/legal/dpa

---

### Sources relied on in this draft (all free public pages)

- ICO, "What needs to be included in the contract?" (Article 28(3)
  requirements): https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/what-needs-to-be-included-in-the-contract/
- ICO, "Personal data breaches: a guide" (72-hour rule, processor duties):
  https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/personal-data-breaches-a-guide/
- ICO, "A brief guide to international transfers":
  https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/a-brief-guide-to-international-transfers/
- Vendor terms as tabulated in schedule 3.

**Signatures:** Processor: ____________________ Date ________
Controller: ____________________ Date ________
