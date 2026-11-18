/* =========================================================
   Built-in certification profile: Microsoft SC-300.
   Exam outline: certifications/sc-300/meta.js (skills measured as of
   28 October 2026, checked 18 November 2026).
   Study plan: 4 weeks by default, Monday–Friday 60 min, Saturday 3 h
   (practical lab), Sunday 2.5 h (revision and assessment) = 10.5 h a week.
   Time is allocated by the official domain weightings:
   D1 ≈ 8 h, D2 ≈ 9 h, D3 ≈ 8 h, D4 ≈ 7 h of new-content study, plus
   weekly revision, assessments and a final mock exam.
   ========================================================= */
'use strict';
(() => {
  const B = window.SC300;
  if (!B) { console.warn('SC-300 bank missing'); return; }
  const R = B.refs; const LN = B.learn;
  const L = (k) => { const v = LN[k] || R[k]; if (!v) throw new Error(`SC-300 plan link "${k}" missing`); return { title: v[1], url: v[0], type: LN[k] ? 'learn' : 'docs' }; };
  const targets = [60, 60, 60, 60, 60, 180, 150];
  const S = (day, topic, kind, objs, links, exercise) => ({ day, topic, kind, plannedMin: targets[day], objs, links: links.map(L), exercise });

  const weeks = [
    {
      title: 'User, external and hybrid identities',
      objectives: [
        'Choose built-in, custom and scoped (administrative unit) Microsoft Entra roles with least privilege',
        'Configure domains, company branding and tenant, user, group and device settings',
        'Manage users, groups, custom security attributes, licences and bulk operations with Microsoft Graph PowerShell',
        'Configure B2B collaboration, cross-tenant access and cross-tenant synchronisation',
        'Compare Connect Sync and Cloud Sync, and PHS, PTA, seamless SSO and federation',
        'Score 85%+ on the Domain 1 quiz',
      ],
      sessions: [
        S(0, 'Microsoft Entra roles, custom roles and administrative units', 'study', ['1.1.1', '1.1.2', '1.1.3', '1.1.4'], ['mInitial', 'roles', 'customRoles', 'au', 'restrictedAu'],
          'Create an administrative unit with a dynamic rule (user.city -eq "Sydney") and assign Helpdesk Administrator scoped to it. Sign in as that admin and confirm you can only reset passwords of Sydney users.'),
        S(1, 'Domains, company branding and tenant, user, group and device settings', 'study', ['1.1.5', '1.1.6', '1.1.7'], ['mInitial', 'customDomain', 'branding', 'userPermissions', 'deviceSettings'],
          'Add a test custom domain (verification can stay pending), configure company branding with a French browser-language variant, and set "Users can register applications" = No.'),
        S(2, 'Users, groups, custom security attributes and bulk operations', 'study', ['1.2.1', '1.2.2', '1.2.3', '1.2.4'], ['mIdentities', 'dynamicGroups', 'csa', 'bulkAdd', 'graphPs'],
          'Bulk-create 10 users from CSV, build a dynamic group for department = Sales, then use Connect-MgGraph and Get-MgUser -Filter to list them. Define one custom security attribute set and assign a value.'),
        S(3, 'Device join and registration, licensing and external collaboration settings', 'study', ['1.2.5', '1.2.6', '1.3.1', '1.3.2', '1.3.3'], ['mIdentities', 'devices', 'groupLicensing', 'externalCollab', 'b2bInvite'],
          'Assign a licence through a group and resolve a conflicting service plan. Restrict guest invitations to an allow list of domains and invite one guest.'),
        S(4, 'Cross-tenant access, cross-tenant sync and SAML/WS-Fed IdP federation', 'study', ['1.3.4', '1.3.5', '1.3.6'], ['mExternal', 'crossTenant', 'crossTenantB2B', 'ctSync', 'samlIdp'],
          'Practical scenario: Contoso trusts MFA from Fabrikam (inbound trust) and blocks outbound collaboration with every other tenant. Draw the default and organisational settings you would configure.'),
        S(5, 'Lab: hybrid identity — Connect Sync, Cloud Sync, PHS, PTA, seamless SSO, AD FS migration, Connect Health', 'practical', ['1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5', '1.4.6', '1.4.7'], ['mHybrid', 'connectSync', 'cloudSync', 'phs', 'pta', 'sso', 'stagedRollout', 'fedMigrate', 'connectHealth'],
          'If you have a lab AD DS: install Cloud Sync (or Connect Sync) with OU filtering and PHS, then use Staged Rollout for a pilot group. Without a lab, write a decision table: Connect Sync vs Cloud Sync, and PHS vs PTA vs federation, with when to use each.'),
        S(6, 'Weekly revision and Domain 1 assessment (Domain quiz: User identities)', 'assessment', ['1.1', '1.2', '1.3', '1.4'], ['pathIdentity'],
          'Re-read your notes, then run Quiz Centre > Domain quiz > User identities (25 questions, exam mode). Review every explanation you got wrong and bookmark weak topics.'),
      ],
    },
    {
      title: 'Authentication and Conditional Access',
      objectives: [
        'Plan authentication and manage methods in the Authentication methods policy (CBA, TAP, Authenticator, passkeys)',
        'Configure tenant-wide MFA settings, SSPR with writeback, Windows Hello for Business and Password Protection',
        'Revoke sessions and respond to a compromised account',
        'Design, test and troubleshoot Conditional Access (assignments, controls, session, device filters, CAE, authentication context, protected actions, templates)',
        'Configure user risk and sign-in risk policies in Conditional Access',
        'Score 85%+ on the Domain 2 quiz',
      ],
      sessions: [
        S(0, 'Authentication planning and methods: CBA, TAP, Authenticator, passkeys (FIDO2)', 'study', ['2.1.1', '2.1.2'], ['mMfa', 'authMethodsManage', 'tap', 'passkeys', 'cba', 'authStrength'],
          'Enable Temporary Access Pass and Passkey (FIDO2) for a pilot group. Issue a one-time TAP to a test user and register a passkey (Authenticator or security key) with it.'),
        S(1, 'Tenant-wide MFA settings, security defaults, SSPR and Windows Hello for Business', 'study', ['2.1.3', '2.1.4', '2.1.5'], ['mUserAuth', 'mfaSettings', 'securityDefaults', 'sspr', 'ssprWriteback', 'whfbCloudTrust'],
          'Turn on "Report suspicious activity", enable SSPR for a pilot group with two methods and test a reset from https://aka.ms/sspr.'),
        S(2, 'Session revocation, Password Protection and Microsoft Entra Kerberos', 'study', ['2.1.6', '2.1.7', '2.1.8'], ['mUserAuth', 'revoke', 'pwdProtection', 'pwdProtectionOnPrem', 'entraKerberos'],
          'Add three banned words to the custom banned password list and try to set a password that contains one. Revoke a test user\'s sessions with Revoke-MgUserSignInSession and observe the effect in Outlook on the web.'),
        S(3, 'Conditional Access planning, assignments and grant controls', 'study', ['2.2.1', '2.2.2', '2.2.3', '2.2.10'], ['mCa', 'caPlan', 'caConditions', 'caGrant', 'caTemplates'],
          'Create two emergency access exclusions, then build from templates: "Block legacy authentication" and "Require phishing-resistant MFA for admins" in report-only mode.'),
        S(4, 'Session controls, device filters, CAE, authentication context and protected actions', 'study', ['2.2.5', '2.2.6', '2.2.7', '2.2.8', '2.2.9'], ['mCa', 'sessionLifetime', 'deviceFilter', 'cae', 'authContext', 'protectedActions'],
          'Create an authentication context and protect "delete Conditional Access policy" as a protected action. Test the step-up prompt.'),
        S(5, 'Lab: Conditional Access troubleshooting and ID Protection risk policies', 'practical', ['2.2.4', '2.3.1', '2.3.2', '2.3.3', '2.3.4', '2.3.5'], ['mIdp', 'caWhatIf', 'caTroubleshoot', 'riskPoliciesConfigure', 'riskInvestigate', 'regCampaign', 'workloadRisk'],
          'Practical scenario: a user is blocked from SharePoint. Use What If and the sign-in log Conditional Access tab to explain why. Then create sign-in risk (MFA for medium+) and user risk (secure password change for high) Conditional Access policies in report-only, and an Authenticator registration campaign.'),
        S(6, 'Weekly revision and Domain 2 assessment (Domain quiz: Authentication & access)', 'assessment', ['2.1', '2.2', '2.3'], ['pathAuth'],
          'Run Quiz Centre > Domain quiz > Authentication & access (exam mode), then a Weak Areas quiz. Record the score as this week\'s assessment.'),
      ],
    },
    {
      title: 'Global Secure Access, workload identities and apps',
      objectives: [
        'Deploy the Global Secure Access client, Private Access, Internet Access and the Microsoft traffic profile',
        'Choose between managed identities, service principals, user accounts and gMSAs',
        'Configure enterprise apps: settings, roles, application proxy, SaaS SSO and provisioning, assignments, consent and collections',
        'Plan and create app registrations with credentials, API permissions and app roles',
        'Score 85%+ on the mid-programme assessment',
      ],
      sessions: [
        S(0, 'Global Secure Access: client, Private Access, Internet Access and Microsoft traffic profile', 'study', ['2.4.1', '2.4.2', '2.4.3', '2.4.4'], ['mGsa', 'gsa', 'gsaClient', 'privateAccess', 'quickAccess', 'webFilter', 'm365Profile'],
          'Enable the Microsoft traffic profile for a pilot group and, if you have a lab VM, install the client. Design a web content filtering policy that blocks Gambling and link it to a security profile.'),
        S(1, 'Workload identities: managed identities, service principals and gMSAs', 'study', ['3.1.1', '3.1.2', '3.1.3', '3.1.4'], ['mAzureAccess', 'mi', 'miUserAssigned', 'miToken', 'workloadIds', 'wif'],
          'Practical scenario: create a user-assigned managed identity, attach it to a VM or Function App, grant Key Vault Secrets User and read a secret with DefaultAzureCredential (or Invoke-RestMethod to IMDS).'),
        S(2, 'Enterprise apps: settings, admin roles, consent and collections', 'study', ['3.2.1', '3.2.2', '3.2.6', '3.2.7'], ['mEntApps', 'appProperties', 'delegateAppRoles', 'userConsent', 'adminConsentWorkflow', 'collections'],
          'Set user consent to "verified publishers, low-impact permissions", enable the admin consent workflow and request consent for a test app as a user. Create a My Apps collection.'),
        S(3, 'Enterprise apps: application proxy, SaaS SSO and provisioning, assignments and app roles', 'study', ['3.2.3', '3.2.4', '3.2.5'], ['mEntAppsImpl', 'appProxy', 'appProxyKcd', 'samlSso', 'provisioning', 'assignUsers'],
          'Add a gallery app (for example a free SaaS trial), configure SAML SSO, set "Assignment required" and assign two groups with different app roles.'),
        S(4, 'App registrations: planning, authentication and credentials', 'study', ['3.3.1', '3.3.2', '3.3.3'], ['mRegApps', 'appReg', 'appObjects', 'supportedAccounts', 'credentials', 'redirectUri'],
          'Register a single-tenant app, add an SPA redirect URI and a certificate credential. Compare the app registration and the enterprise application objects it created.'),
        S(5, 'Lab: API permissions, Microsoft Graph and app roles', 'practical', ['3.3.4', '3.3.5'], ['mAppReg', 'permissions', 'graphPermissions', 'appRoles'],
          'Practical scenario: add the delegated User.Read and application User.Read.All permissions, grant admin consent and call Graph with a client-credentials token (Postman or PowerShell). Define an app role "Reports.Export" for applications and grant it to a second app.'),
        S(6, 'Weekly revision and mid-programme assessment (Standard quiz, 25 questions)', 'assessment', ['2.4', '3.1', '3.2', '3.3'], ['pathApps'],
          'Run a Standard quiz (25 questions, exam mode), then the Week 3 revision quiz. Review explanations and add notes for any topic below 85%.'),
      ],
    },
    {
      title: 'Cloud app security, governance and final mock',
      objectives: [
        'Use Defender for Cloud Apps: cloud discovery, connected apps, app-enforced restrictions, App Control, access, session and OAuth policies, cloud app catalog',
        'Build catalogs and access packages with terms of use, external lifecycle and connected organisations',
        'Create and complete access reviews',
        'Configure PIM for Microsoft Entra roles, Azure resources and groups, approvals, audit and emergency access',
        'Route logs with diagnostic settings, query them with KQL, use workbooks and Identity Secure Score',
        'Complete the final mock exam and list remaining knowledge gaps',
      ],
      sessions: [
        S(0, 'Defender for Cloud Apps: discovery, connected apps, App Control, policies and the cloud app catalog', 'study', ['3.4.1', '3.4.2', '3.4.3', '3.4.4', '3.4.5', '3.4.6', '3.4.7'], ['mdca', 'cloudDiscovery', 'connectedApps', 'appEnforced', 'caac', 'sessionPolicy', 'oauthPolicy', 'sanction'],
          'Practical scenario: create a Conditional Access policy that routes a test app through App Control, then a session policy that blocks download of labelled files on unmanaged devices. Unsanction one discovered app.'),
        S(1, 'Entitlement management: catalogs, access packages, requests and connected organisations', 'study', ['4.1.1', '4.1.2', '4.1.3', '4.1.4', '4.1.6', '4.1.7'], ['mEntitlement', 'entitlement', 'catalogs', 'accessPackage', 'approveRequests', 'externalLifecycle', 'connectedOrg'],
          'Practical scenario: create a Marketing catalog and an access package (group + SharePoint site) for a connected organisation with one approval stage and 90-day expiry. Request it as a test user in My Access.'),
        S(2, 'Terms of use and access reviews', 'study', ['4.1.5', '4.2.1', '4.2.2', '4.2.3', '4.2.4'], ['mReviews', 'tou', 'createReview', 'completeReview', 'performReview'],
          'Create a terms of use for guests enforced by Conditional Access. Create an access review of guests in Microsoft 365 groups with auto-apply, then complete it as a reviewer.'),
        S(3, 'Privileged Identity Management and emergency access accounts', 'study', ['4.3.1', '4.3.2', '4.3.3', '4.3.4', '4.3.5', '4.3.6'], ['mPim', 'pim', 'pimRoleSettings', 'pimAzure', 'pimGroups', 'pimApprove', 'pimAudit', 'breakGlass'],
          'Practical scenario: make a test user eligible for Security Administrator with approval and 2-hour activation, activate it, approve it as another user and review the PIM audit history.'),
        S(4, 'Monitoring: sign-in, audit and provisioning logs, diagnostic settings, KQL, workbooks and Secure Score', 'study', ['4.4.1', '4.4.2', '4.4.3', '4.4.4', '4.4.5'], ['mMonitor', 'signInLogs', 'diagSettings', 'kql', 'workbooks', 'secureScore'],
          'Practical scenario: send sign-in and audit logs to Log Analytics and run KQL to find failed sign-ins by user and changes to privileged roles. Open the Conditional Access insights workbook and review Identity Secure Score.'),
        S(5, 'Lab: governance end to end, then Weak Areas quiz', 'practical', ['4.1', '4.2', '4.3', '4.4'], ['pathGov', 'accessPackage', 'pimGroups', 'kql'],
          'Practical scenario: give contractors JIT access through an access package that contains a PIM for Groups group, review it, and write a KQL alert query for emergency account sign-ins. Finish with a Weak Areas quiz.'),
        S(6, 'Final mock exam (50 questions, weighted by domain) and gap review', 'assessment', ['1.1', '2.1', '3.1', '4.1'], ['course'],
          'Take Quiz Centre > Full Mock Exam in exam mode (timed). Review every incorrect answer, update your weak-topics list and plan targeted revision before booking the exam.'),
      ],
    },
  ];

  window.PrepWiseBuiltins = window.PrepWiseBuiltins || [];
  window.PrepWiseBuiltins.push({
    certification: {
      id: 'sc-300',
      code: 'SC-300',
      name: 'Microsoft Identity and Access Administrator',
      provider: 'Microsoft',
      description: 'Microsoft Certified: Identity and Access Administrator Associate. Design, implement and operate identity and access management with Microsoft Entra ID: user and hybrid identities, authentication and Conditional Access, workload identities and apps, and identity governance. Outline: skills measured as of 28 October 2026 (checked 18 November 2026).',
      website: 'https://learn.microsoft.com/en-us/credentials/certifications/identity-and-access-administrator/',
      studyGuideUrl: B.studyGuideUrl,
      contentVersion: B.version,
      exam: {
        masteryTarget: 85,
        minCoverage: 0.6,
        passingScore: 700,
        passingScoreNote: 'Microsoft exams are scored from 1 to 1,000. 700 or greater is a pass.',
        domains: B.domains.map((d) => ({ id: String(d.id), short: d.short, title: d.title, weight: d.weight })),
        sections: B.sections,
        objectives: B.objectives,
        refs: B.refs,
        weekSections: { 1: ['1.1', '1.2', '1.3', '1.4'], 2: ['2.1', '2.2', '2.3'], 3: ['2.4', '3.1', '3.2', '3.3'], 4: ['3.4', '4.1', '4.2', '4.3', '4.4'] },
        modes: { mock: { count: 50, minutes: 100 }, final: { count: 60, minutes: 120 } },
        seed: 'sc300',
        disclaimer: 'Original practice questions written against the official SC-300 skills outline (skills measured as of 28 October 2026). They aren\'t Microsoft exam questions and aren\'t taken from exam dumps. Microsoft Entra features change often, so always check the linked Microsoft Learn page. Readiness scores are a study aid, not a prediction of your exam result.',
      },
      plan: { dailyTargets: targets, studyDays: [true, true, true, true, true, true, true], weeks },
      resources: [
        { id: 'study-guide', title: 'Official SC-300 study guide (skills measured as of 28 Oct 2026)', url: B.studyGuideUrl, type: 'study-guide', notes: 'Skills measured, domain weightings and change log. Checked 18 November 2026.' },
        { id: 'exam-page', title: 'SC-300 exam page', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/sc-300/', type: 'documentation', notes: 'Scheduling, languages and the free self-paced learning paths.' },
        { id: 'course', title: LN.course[1], url: LN.course[0], type: 'course', notes: 'Instructor-led course outline; the four learning paths below are its free self-paced equivalent.' },
        { id: 'lp-identity', title: LN.pathIdentity[1], url: LN.pathIdentity[0], type: 'course', notes: 'Domain 1' },
        { id: 'lp-auth', title: LN.pathAuth[1], url: LN.pathAuth[0], type: 'course', notes: 'Domain 2' },
        { id: 'lp-apps', title: LN.pathApps[1], url: LN.pathApps[0], type: 'course', notes: 'Domain 3' },
        { id: 'lp-gov', title: LN.pathGov[1], url: LN.pathGov[0], type: 'course', notes: 'Domain 4' },
        { id: 'practice', title: 'Free Microsoft practice assessment for SC-300', url: 'https://aka.ms/SC300-PA', type: 'practice-test', notes: 'Official practice questions from Microsoft.' },
        { id: 'entra-docs', title: 'Microsoft Entra documentation', url: 'https://learn.microsoft.com/en-us/entra/', type: 'documentation', notes: '' },
        { id: 'exam-prep-video', title: 'SC-300 Exam Prep videos', url: 'https://aka.ms/SC300-ExamPrep', type: 'video', notes: '' },
        { id: 'sandbox', title: 'Exam sandbox (try the exam interface)', url: 'https://aka.ms/examdemo', type: 'practice-test', notes: '' },
        { id: 'dev-tenant', title: 'Microsoft 365 Developer Program (lab tenant, if eligible)', url: 'https://developer.microsoft.com/en-us/microsoft-365/dev-program', type: 'lab', notes: 'Labs need Microsoft Entra ID P2 features; use a trial or developer tenant, never production.' },
        { id: 'scoring', title: 'Exam scoring and score reports', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exam-scoring-reports', type: 'documentation', notes: '' },
      ],
    },
    questions: () => B.questions.map((q) => ({ ...q, cert: 'sc-300' })),
  });
})();
