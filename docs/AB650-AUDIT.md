# AB-650 question bank audit (bank 2.0.0, verified 19 November 2026)

Every question in the AB-650 bank was checked against official Microsoft sources:

- the [AB-650 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-650) (skills measured are unchanged; the page was last updated 27 July 2026 and shows no separate "skills measured as of" date, so that date is used),
- the three official AB-650 learning paths on Microsoft Learn (18 modules, unit text read on 19 November 2026),
- the Microsoft Learn documentation page each question references (151 pages fetched on 19 November 2026; moved pages updated to their live address and title).

No exam dumps or unofficial sources were used. Where the documentation doesn't state something, the question no longer claims it.

## Result

| | Count | What it means |
|---|---|---|
| Retained | 146 | Checked and accurate; text unchanged (references updated where the page moved). |
| Modified | 15 | Same skill and same correct answer; wording, explanation, distractor or reference corrected. |
| Replaced | 6 | The correct answer or the premise changed. The old ID is retired and mapped to a new question. |
| Added | 2 | New questions for the two objectives that had only one question. |
| **Bank** | **169** | 146 + 15 + 6 + 2 (D1 41, D2 67, D3 61). Was 167. |

Every question now has an objective (`obj`), an official reference and `verified: '2026-11-19'`.

## Replaced questions

| Old ID | New ID | Why |
|---|---|---|
| D2-035 | D2-067 | User-risk policies now use the **Require risk remediation** grant control. The old answer ("secure password change with MFA") is the previous terminology. |
| D3-015 | D3-061 | The **AI Reader** role now exists as the view-only counterpart of AI Administrator, so Global Reader is no longer the best answer to "can see Copilot settings but not change them". |
| D3-017 | D3-062 | The fixed two-role split in the old answer isn't what the documentation describes; linked Copilot settings each have their own role requirements (for example release preferences). |
| D3-018 | D3-063 | The documentation doesn't state the default the old question relied on. The new question tests what it does state: the Cowork Browsing tenant setting and the Edge browsing policies that apply. |
| D3-046 | D3-064 | The documentation describes registration, admin approval and consent for Agent 365 tools, not one permission per MCP server on the Agent 365 application. |
| D3-055 | D3-065 | Cost Management splits roles: AI Administrator or License Administrator manage policies; Global Administrator or Billing Administrator manage billing methods. |

**Learner data:** quiz history and statistics for retired IDs stay stored (they no longer count toward readiness because the question isn't in the bank). Bookmarks on a retired question move to its replacement the first time the Quiz Centre opens. See `exam.retired` in `certifications/ab-650/meta.js`.

## Modified questions

| ID | Change |
|---|---|
| D1-018 | A distractor claimed Cowork was "generally available", which the documentation doesn't say. Replaced with neutral text. |
| D2-006 | Reference moved from an archived page to the current Microsoft Entra group-settings cmdlets page; explanation names `EnableGroupCreation` and `GroupCreationAllowedGroupId`. |
| D2-013 | Explanation adds the AI Reader role. |
| D3-001 | Uses the current **Microsoft Copilot readiness report** name; explains that it shows licence, update channel and app usage rather than one "ready" status. |
| D3-011 | Explanation corrected: acronyms can take up to a day to appear in Copilot Search. |
| D3-022 | Claude model availability updated: off by default in the EU, EFTA and UK; not in GCC High, DoD or sovereign clouds; non-federal GCC customers have an opt-in since July 2026. |
| D3-023 | Uses current connector terms: synced connectors with tenant or **self-serve** configuration (not "personal" connectors), federated connectors over MCP. |
| D3-025 | Federated connectors are controlled through Agents > Settings > Agent and plugin access. |
| D3-033, D3-036 | Copilot Studio Lite is now **Microsoft Copilot Agent Builder**. |
| D3-038 | Registry sync is now **Connected platforms** in Agent 365. |
| D3-045 | BYO MCP server flow described as documented (preview; request, review and Entra consent). |
| D3-056 | Reference and explanation: the Copilot usage report has up to 72 hours of latency. |
| D3-058 | Notes that the Copilot Control System is now publicly titled **Copilot controls**. |
| D3-060 | Reference and explanation: Service health is incident evidence, not proof of end-to-end Copilot health. |

## Course material

The paid Udemy course is no longer referenced. The plan, resources and "Continue course" link now use the free [AB-650T00 Microsoft Learn course](https://learn.microsoft.com/en-us/training/courses/ab-650t00), its three learning paths and 18 modules, and the study guide. Existing users keep their links and topics if they changed them; only app-provided defaults are updated (see [CERTIFICATION-PROFILES.md](CERTIFICATION-PROFILES.md#source-of-truth-and-content-upgrades)).

## Not fully verifiable

- The study guide shows no "skills measured as of" date; the page's last update (27 July 2026) is recorded as `skillsAsOf`.
- Free Microsoft 365 or Azure trial availability isn't documented on the pages used, so the plan makes no free-tier claims.
