# DATA PROCESSOR AGREEMENT (TEMPLATE)

<!--
REVIEW BEFORE LAUNCH - DRAFT, NOT EXECUTED.

This is a drafting aid referenced by the terms page and the privacy notice
(section 7). It is NOT an executed agreement and must not be treated as one.

Before any customer goes live, Adrians (or a lawyer) must:

  1. Read every bracketed [LIKE THIS] and fill or delete it.
  2. Confirm the retention numbers below match what the code enforces
     (30 days after delivery, 90-day hard ceiling) and what the privacy
     notice states. If one changes, all three change together.
  3. Confirm the sub-processor list matches the providers actually in use
     (Vercel, the datastore vendor once chosen, the email vendor once
     chosen, Stripe controller-side).
  4. Check governing law: drafted for Latvia to match the company's place of
     establishment; UK customers may push back - decide the position before,
     not after, the first objection.
  5. Record the signed instance somewhere retrievable; signing happens during
     manual onboarding, which is also when a copy goes to the customer.
-->

**Data Processor Agreement (template v0.1, August 2026)**

This Agreement applies where Stepe Digital SIA ([registered address],
company number [40203711274], "Processor") processes personal data on behalf
of the cleaning company named in schedule 1 ("Controller") in connection with
the Linwick enquiry assistant service. It incorporates these Article 28(3)
terms:

1. **Subject matter.** Captured enquiries submitted through Controller's
   hosted assistant page operated by Processor.

2. **Duration.** From the date Controller's assistant is switched live until
   Controller cancels the subscription, plus the retention tail in clause 5.

3. **Nature and purpose.** Collection, transmission, structured storage and
   delivery of enquiries so that Controller can respond and quote.

4. **Categories of data subjects and data.** Prospective customers of
   Controller: contact details they choose to give (name, email, optionally
   company and phone) and the content of their enquiry about cleaning work.

5. **Processing operations and retention.** Enquiries are stored in an EU-region
   database, delivered to the mailbox Controller nominates, and deleted no
   later than **30 days after successful delivery**, and in any event never
   kept longer than **90 days** after receipt.

6. **Controller obligations.** Controller determines the purpose of the
   processing, provides the privacy information owed to data subjects on its
   own website or wherever it publishes the assistant link, and responds to
   data subject requests as controller.

7. **Processor obligations.** Processor processes only on Controller's
   documented instructions (configuring the assistant, delivering enquiries,
   and applying this Agreement's retention rules); ensures persons authorised
   to process are bound by confidentiality; assists Controller in responding
   to data subject requests, which are answered from the queryable store and
   routed through the contact address in schedule 2; maintains security
   measures proportionate to the risk (TLS in transit, access-controlled
   environment, secrets held in deployment configuration, no third-party
   scripts on capture pages); does not engage another processor without prior
   written notice to Controller and a right to object; notifies Controller
   without undue delay after becoming aware of a personal data breach;
   deletes or returns data per clause 5 at Controller's choice; and makes
   available information needed to demonstrate compliance.

8. **Sub-processors.** As at the date of this template: Vercel Inc. (hosting),
   [DATASTORE VENDOR] (EU-region database), [EMAIL VENDOR] (transactional
   email delivery from linwick.co.uk). Controller will be given advance
   notice of additions and a right to object.

9. **Transfers.** All processing takes place within the EEA. If that changes,
   a Chapter V transfer mechanism (Art. 46 GDPR) will be agreed in writing
   first.

10. **Governing law.** Latvia. [Confirm before first signature.]

**Schedule 1 - the Controller:** [customer name, address]

**Schedule 2 - notices:** Controller's nominated contact: [name, email].
Processor contact: adrians@stepedigital.com until an @linwick.co.uk mailbox
exists.

**Signatures:** Processor: ____________________ Date ________
Controller: ____________________ Date ________
