# `prospects.csv`

The outreach list behind `/admin/leads`. This one file is the whole data
source: there is no database and no seed data. Replace it with a real export
and the tracker shows that list.

## Replacing it

Overwrite `prospects.csv` with your own file and reload the page. Keep the
header row — columns are matched by name, so their order does not matter and
columns you do not use can be left out entirely.

`/admin/leads` is rendered per request, so a saved file shows up on the next
reload. No build and no redeploy.

## Columns

Only `companyName` is required. Everything else is optional.

| Column | Notes |
| --- | --- |
| `companyName` | **Required.** A row without one is skipped. |
| `website` | Full URL. |
| `city` | |
| `country` | Defaults to `United Kingdom`. |
| `companyType` | One of `commercial_cleaning`, `office_cleaning`, `contract_cleaning`, `facilities_management`, `specialist_cleaning`, `window_cleaning`, `other`. Defaults to `commercial_cleaning`. |
| `contactName` | |
| `contactEmail` | |
| `contactSource` | One of `google_maps`, `company_website`, `linkedin`, `directory`, `trade_association`, `referral`, `other`. Defaults to `other`. |
| `notes` | Free text. |
| `personalizationAngle` | The hook for this specific company. |
| `status` | One of `new`, `contacted`, `replied`, `interested`, `demo_sent`, `proposal`, `won`, `lost`, `no_response`. Defaults to `new`. |
| `dateAdded` | `YYYY-MM-DD`. Defaults to today. |
| `dateContacted` | `YYYY-MM-DD`. |
| `dateFollowedUp` | `YYYY-MM-DD`. |
| `response` | What they said back. |
| `nextActionDescription` | The single next thing to do. |
| `nextActionDueDate` | `YYYY-MM-DD`. Drives the urgency colours. |
| `id` | Optional. Generated from the row number when absent. |

The three enum columns also accept the labels shown in the interface, so
`Demo Sent` works as well as `demo_sent`.

## Things worth knowing

- **Quote any field containing a comma**, and double the quotes inside it:
  `"Said ""maybe"", wants a call"`. Every spreadsheet does this for you on
  export.
- **A bad row does not lose the file.** Rows without a company name are
  skipped, unparseable dates are left blank, and unrecognised statuses fall
  back to a default. Each one is reported at the top of `/admin/leads` so it
  can be corrected rather than silently disappearing.
- **Edits made in the tracker do not come back here.** They are saved in the
  browser's local storage, and this file is never written to. "Reload from
  file" in the tracker discards those edits and re-reads this file, which is
  also how you pick up changes after replacing it.
- **This is a real prospect list, so it is personal data.** Keep it to
  business contact details, and remember it is covered by the retention
  commitments in the privacy notice.
