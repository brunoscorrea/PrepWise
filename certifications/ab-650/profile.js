/* =========================================================
   Built-in certification profile: Microsoft AB-650.
   Source of truth: Microsoft Learn — the official study guide, the certification
   page and the three official AB-650 learning paths (see meta.js `source`).
   Study plan: 4 weeks by default, Monday–Friday 60 min, Saturday 3 h (practical lab),
   Sunday 2.5 h (revision and assessment) = 10.5 h a week. New-content time follows
   the official domain weightings: D1 ≈ 7 h (22%), D2 ≈ 13.5 h (42%), D3 ≈ 11.5 h (36%),
   plus weekly revision, assessments and a final mock exam.
   Every link is free public Microsoft Learn content. Labs say when they need a test
   tenant or licences that cost money; each has a no-tenant alternative.
   ========================================================= */
'use strict';
(() => {
  const B = window.AB650;
  if (!B) { console.warn('AB-650 bank missing'); return; }
  const R = B.refs; const LN = B.learn;
  const L = (k) => { const v = LN[k] || R[k]; if (!v) throw new Error(`AB-650 plan link "${k}" missing`); return { title: v[1], url: v[0], type: LN[k] ? 'learn' : 'docs' }; };
  const targets = [60, 60, 60, 60, 60, 180, 150];
  const S = (day, topic, kind, objs, links, exercise) => ({ day, topic, kind, plannedMin: targets[day], objs, links: links.map(L), exercise });
  const NO_TENANT = 'No test tenant? Work through the module\'s exercise unit, which walks through the same steps, and write down each setting and where it lives.';

  const weeks = [
    {
      title: 'Microsoft 365 tenant and workloads',
      objectives: [
        'Configure tenant branding, domains and organisational settings',
        'Manage Microsoft 365 and AI service licences, including group-based licensing and pay-as-you-go',
        'Configure Microsoft 365 Backup, network connectivity insights and Service health notifications',
        'Manage mailboxes, teams, Copilot in Teams meetings and SharePoint sites',
        'Prepare SharePoint and OneDrive for Copilot with SharePoint Advanced Management',
        'Score 85%+ on the Domain 1 quiz',
      ],
      sessions: [
        S(0, 'Tenant branding, domains and organisational settings', 'study', ['1.1.1', '1.1.2', '1.1.3'], ['pathTenant', 'mTenant', 'orgTheme', 'entraBranding', 'addDomain', 'releaseOptions'],
          `Sketch where each setting lives: Microsoft 365 custom theme vs Entra company branding, the domain verification and DNS records, and Standard vs Targeted release. ${NO_TENANT}`),
        S(1, 'Licences for Microsoft 365 and AI services, billing and Microsoft 365 Backup', 'study', ['1.1.4', '1.1.5', '1.1.6'], ['mLicense', 'mHealth', 'groupLicensing', 'copilotReqs', 'backupSetup'],
          'Build a licensing plan for a 50-person pilot: which licences are assigned by group, which AI services are pay-as-you-go, and which roles and Azure rights pay-as-you-go setup needs. Note: Microsoft 365 Backup is billed by consumption through an Azure subscription.'),
        S(2, 'Network connectivity insights and Service health', 'study', ['1.1.7', '1.1.8'], ['mHealth', 'networkInsights', 'networkPrinciples', 'serviceHealth', 'messageCenter'],
          'Write a one-page runbook: where to check an outage (Service health), a planned change (Message center) and a slow branch office (Network connectivity), and how to send incident email notifications to the on-call team.'),
        S(3, 'Mailboxes, shared mailboxes and Microsoft Teams, including Copilot in meetings', 'study', ['1.2.1', '1.2.2', '1.2.3'], ['mExchangeTeams', 'sharedMailbox', 'sharedMailboxAbout', 'teamsManage', 'teamsCopilot'],
          `Decide the permissions for a shared mailbox (Full Access, Send As) and the meeting policy and organiser options for a confidential board meeting where Copilot may help but no transcript is kept. ${NO_TENANT}`),
        S(4, 'Microsoft Entra users, guests and external access', 'study', ['2.1.1', '2.1.2'], ['pathGovern', 'mIdentities', 'addUsers', 'restoreUser', 'externalCollab', 'crossTenant'],
          'Write the offboarding steps for a dismissed employee (block sign-in, revoke sessions, keep data) and an external-collaboration design that allows only two partner domains and trusts partner MFA.'),
        S(5, 'Lab: SharePoint sites and SharePoint Advanced Management for Copilot', 'practical', ['1.2.4', '1.2.5'], ['mSharePoint', 'spSharing', 'dag', 'rcd', 'rac', 'rss', 'msSearch'],
          'With a test tenant: create a team site and a communication site, set site-level sharing more restrictive than the organisation, run a data access governance report, and apply Restricted Content Discovery to one site. Without one: complete the module\'s exercises and the "choose the right control" unit, then map each oversharing scenario to DAG, site access review, RAC or RCD.'),
        S(6, 'Weekly revision and Domain 1 assessment (Domain quiz: Tenants & workloads)', 'assessment', ['1.1', '1.2'], ['pathTenant'],
          'Re-read your notes, then run Quiz Centre > Domain quiz > Tenants & workloads (exam mode). Review every explanation you got wrong and bookmark weak topics.'),
      ],
    },
    {
      title: 'Identity, authentication and Defender for Office 365',
      objectives: [
        'Manage groups, admin roles with PIM, administrative units, contacts and bulk changes with Microsoft Graph PowerShell',
        'Configure authentication methods, Password Protection and SSPR, and troubleshoot sign-ins',
        'Design and test Conditional Access with ID Protection and MFA',
        'Manage Defender for Office 365 alerts, threat policies, investigations and attack simulation training',
        'Score 85%+ on the Domain 2 quiz',
      ],
      sessions: [
        S(0, 'Groups, admin roles, PIM and administrative units', 'study', ['2.1.3', '2.1.4', '2.1.5'], ['mIdentities', 'm365Groups', 'dynamicGroups', 'adminRoles', 'pim', 'au'],
          'Design least-privilege admin access for a helpdesk that resets Melbourne users\' passwords only: an administrative unit, a scoped role, and PIM settings (eligible, 4-hour activation, MFA and justification) for Exchange administrators.'),
        S(1, 'Contacts and bulk management with Microsoft Graph PowerShell', 'study', ['2.1.6', '2.1.7'], ['mIdentities', 'mailContacts', 'graphPs', 'graphLicenses', 'bulkUsers'],
          'Write (don\'t run) a Microsoft Graph PowerShell script that connects with the right scopes, finds a SkuId with Get-MgSubscribedSku, sets usage location and assigns a licence. Decide when a person should be a mail contact, a guest or a user.'),
        S(2, 'Authentication methods, Password Protection and SSPR', 'study', ['2.2.1', '2.2.2', '2.2.3'], ['pathGovern', 'mAuth', 'authMethods', 'authStrengths', 'tap', 'passwordProtection', 'sspr'],
          'Plan a passwordless rollout: Temporary Access Pass for new hires, a registration campaign for Microsoft Authenticator, a custom banned password list and SSPR with writeback for synced users.'),
        S(3, 'Troubleshoot sign-ins, Conditional Access and ID Protection', 'study', ['2.2.4', '2.2.5'], ['mAuth', 'signInLogs', 'caWhatIf', 'caReportOnly', 'emergencyAccess', 'riskRemediation'],
          `Draft three policies in report-only mode: block legacy authentication, require phishing-resistant MFA for admins, and a user-risk policy with Require risk remediation. Exclude emergency access accounts and test with the What If tool. ${NO_TENANT}`),
        S(4, 'Defender for Office 365: alerts and threat policies', 'study', ['2.3.1', '2.3.2'], ['mDefender', 'presetPolicies', 'antiPhishing', 'safeLinks', 'safeAttachments', 'alertPolicies'],
          'Compare the Standard and Strict preset security policies, then list which anti-phishing, Safe Links and Safe Attachments settings protect executives from impersonation and weaponised links.'),
        S(5, 'Lab: investigate email threats and run attack simulation training', 'practical', ['2.3.3', '2.3.4'], ['mDefender', 'threatExplorer', 'zap', 'air', 'attackSim', 'attackSimRun'],
          'With Defender for Office 365 Plan 2 in a test tenant: use Threat Explorer to find a test message and remediate it, then create a Credential Harvest simulation with assigned training. Without it: complete the module exercises and write the response steps for a phishing campaign that reached 400 mailboxes.'),
        S(6, 'Weekly revision and Domain 2 assessment (Domain quiz: Govern & secure)', 'assessment', ['2.1', '2.2', '2.3'], ['pathGovern'],
          'Run Quiz Centre > Domain quiz > Govern & secure (exam mode, 25 questions). Review every wrong answer and its Microsoft Learn reference before next week.'),
      ],
    },
    {
      title: 'Microsoft Purview and Copilot enablement',
      objectives: [
        'Identify requirements for DLP, information protection and data lifecycle management, including Copilot',
        'Review DLP alerts and monitor AI activity with DSPM for AI',
        'Assess tenant and data readiness for Copilot and manage web search and Copilot Search',
        'Configure Copilot settings, third-party AI providers, Copilot connectors and Copilot Cowork',
        'Score 85%+ on this week\'s revision quiz',
      ],
      sessions: [
        S(0, 'Sensitive information types, sensitivity labels and label policies', 'study', ['2.4.2'], ['mInfoProtection', 'sit', 'labels', 'labelPolicies', 'containerLabels', 'autoLabel'],
          'Design a label taxonomy (General, Confidential, Highly Confidential) with a default label, mandatory labelling and container settings for confidential teams. Note which usage rights let Copilot summarise encrypted content.'),
        S(1, 'DLP policies for Microsoft 365, endpoints and Copilot, and DLP alerts', 'study', ['2.4.1', '2.4.4'], ['mDlp', 'dlp', 'dlpCopilot', 'dlpEndpoint', 'dlpAlerts', 'dlpSimulation'],
          'Write a DLP policy plan: credit-card detection in simulation mode first, a Microsoft 365 Copilot location rule for "Highly Confidential" items, and an alert threshold that avoids noise.'),
        S(2, 'Retention, records and DSPM for AI', 'study', ['2.4.3', '2.4.5'], ['mDlp', 'retention', 'retentionLabels', 'retentionCopilot', 'dspmAi'],
          'Resolve a conflict between a 1-year deletion policy and a 5-year retention policy using the principles of retention, and list what DSPM for AI shows and how long new policies take to collect data.'),
        S(3, 'Copilot readiness: tenant readiness and data readiness', 'study', ['3.1.1', '3.1.2'], ['pathAi', 'mCopilotRollout', 'copilotReadiness', 'copilotReqs', 'samCopilot', 'copilotPrivacy'],
          'Plan a phased Copilot rollout: readiness report checks, an oversharing clean-up (DAG reports, site access reviews, RCD/RAC) and a pilot group.'),
        S(4, 'Copilot settings, web search, Copilot Search, AI providers, connectors and Cowork', 'study', ['3.1.3', '3.1.4', '3.1.5', '3.1.6', '3.1.7', '3.1.8', '3.1.9'], ['mCopilotSettings', 'webSearch', 'copilotSearchAdmin', 'copilotSettings', 'anthropic', 'connectors', 'cowork'],
          'Make a settings decision table for a regulated tenant: web search policy scope, acronyms for Copilot Search, self-service purchases, release preferences, Claude models (default by region), federated connectors and Cowork browser use.'),
        S(5, 'Lab: make data and settings Copilot-ready', 'practical', ['3.1.2', '3.1.5', '2.4.1', '2.4.5'], ['mCopilotRollout', 'mCopilotSettings', 'mDlp', 'dspmAi', 'dlpCopilot'],
          'With a test tenant: review DSPM for AI recommendations, create a DLP policy for the Microsoft 365 Copilot location in simulation mode and review the Copilot settings catalog. Copilot licences cost money, so most of this works without them. Without a tenant: complete the exercises in the two Copilot modules and the DLP-for-Copilot exercise.'),
        S(6, 'Weekly revision and assessment (Week revision quiz)', 'assessment', ['2.4', '3.1'], ['pathAi'],
          'Run Quiz Centre > Week revision for week 3 in exam mode, then a Weak Areas quiz. Bookmark anything you still get wrong.'),
      ],
    },
    {
      title: 'Agents, Agent 365, monitoring and final mock',
      objectives: [
        'Manage agent identities with Microsoft Entra Agent ID: lifecycle, sponsors, owners, access packages and Conditional Access',
        'Configure agent settings and manage the agent registry, requests and installation',
        'Manage tools and monitor, protect and govern agents with Agent 365',
        'Monitor AI costs, usage reports, adoption and service health with Copilot controls',
        'Complete the final mock exam and list the gaps to revise before booking',
      ],
      sessions: [
        S(0, 'Agent identities with Microsoft Entra Agent ID', 'study', ['3.2.1', '3.2.2', '3.2.3'], ['mAgentId', 'agentGovernance', 'agentIdManage', 'agentOwners', 'agentSponsorTasks'],
          'Draw the Agent ID objects (blueprint, blueprint principal, agent identity, agent user) and plan sponsor transfer with Lifecycle Workflows, a 90-day access package and an emergency Conditional Access block for all agent identities.'),
        S(1, 'Agent settings, the agent registry and requests', 'study', ['3.2.4', '3.2.5', '3.2.6', '3.2.7'], ['mRegistry', 'mA365Govern', 'agentSettings', 'agentRegistry', 'registrySync', 'agentActions'],
          `List what each Agent settings control does (allowed agent types, sharing, user access, templates) and walk through approving a publish request and installing a custom agent for one group. ${NO_TENANT}`),
        S(2, 'Agent 365 tools and agent activity', 'study', ['3.2.8', '3.3.1'], ['mRegistry', 'mA365Monitor', 'agentTools', 'toolingServers', 'a365', 'a365Observability'],
          'Write the review checklist for a bring-your-own MCP server request and explain what approval and consent do and don\'t prove. List what Agent 365 shows for Microsoft-built and third-party agents.'),
        S(3, 'Protect sensitive data and evaluate compliance gaps with Agent 365', 'study', ['3.3.2', '3.3.3'], ['mA365Govern', 'purviewA365', 'a365DataSecurity'],
          'Note which Purview protections are on automatically for Agent 365 agent instances, and plan the response to an unused agent that touches sensitive data.'),
        S(4, 'Monitor costs, usage, adoption and service health for AI services', 'study', ['3.4.1', '3.4.2', '3.4.3', '3.4.4'], ['mMonitorAi', 'mLicense', 'costManagement', 'creditsReport', 'copilotUsage', 'ccs', 'serviceHealth'],
          'Build a monthly AI-services review: Cost Management policies and roles, Copilot credits and usage reports (and their 72-hour latency), the Copilot Dashboard for leaders, and Service health as incident evidence.'),
        S(5, 'Lab: Agent 365 governance end to end, then a timed Domain 3 quiz', 'practical', ['3.2', '3.3', '3.4'], ['pathAi', 'mA365Monitor', 'mA365Govern'],
          'Agent 365 needs a qualifying licence, so most learners use the module exercises: set up a policy template, assign owners, block an agent, manage tools and view audit logs. Then run Quiz Centre > Domain quiz > AI services in exam mode.'),
        S(6, 'Final mock exam and identify knowledge gaps', 'assessment', ['1.1', '1.2', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '3.4'], ['course', 'pathTenant', 'pathGovern', 'pathAi'],
          'Take Quiz Centre > Final mock (60 questions, 120 minutes) in exam mode. Review every explanation, then list the objectives below 85% and revise them on Microsoft Learn before booking the exam. Try the exam sandbox to get used to the interface.'),
      ],
    },
  ];

  window.PrepWiseBuiltins = window.PrepWiseBuiltins || [];
  window.PrepWiseBuiltins.push({
    certification: {
      id: 'ab-650',
      code: 'AB-650',
      name: 'Administering Microsoft 365 and AI Services',
      provider: 'Microsoft',
      description: 'Microsoft 365 administration with a focus on securing and governing AI services: tenants and workloads, identity and access, Defender for Office 365, Microsoft Purview, Microsoft 365 Copilot and Agent 365. Built on the official Microsoft Learn study guide and learning paths.',
      website: B.source.certification,
      studyGuideUrl: B.studyGuideUrl,
      contentVersion: B.version,
      source: B.source,
      exam: {
        masteryTarget: 85,
        minCoverage: 0.6,
        passingScore: 700,
        passingScoreNote: 'Microsoft exams are scored from 1 to 1,000. 700 or greater is a pass.',
        domains: B.domains.map((d) => ({ id: String(d.id), short: d.short, title: d.title, weight: d.weight })),
        sections: B.sections,
        objectives: B.objectives,
        refs: { ...B.refs, ...B.learn },
        retired: B.retired,
        // Which study-guide sections each programme week covers (used by Week revision quizzes)
        weekSections: { 1: ['1.1', '1.2', '2.1'], 2: ['2.1', '2.2', '2.3'], 3: ['2.4', '3.1'], 4: ['3.2', '3.3', '3.4'] },
        modes: { mock: { count: 50, minutes: 100 }, final: { count: 60, minutes: 120 } },
        seed: 'ab650',
        disclaimer: 'Original practice questions written against the official AB-650 study guide and verified against Microsoft Learn (see "Last verified" on each explanation). They aren\'t Microsoft exam questions and aren\'t taken from exam dumps. AI and agent features change often, so always check the linked Microsoft Learn page. Readiness scores are a study aid, not a prediction of your exam result.',
      },
      plan: {
        dailyTargets: targets,
        studyDays: [true, true, true, true, true, true, true],
        weeks,
      },
      resources: [
        { id: 'study-guide', title: 'Official AB-650 study guide', url: B.studyGuideUrl, type: 'study-guide', notes: 'Skills measured, domain weightings and links. The source of truth for this certification.' },
        { id: 'cert-page', title: 'Microsoft 365 Certified: Microsoft 365 and AI Services Administrator Associate', url: B.source.certification, type: 'documentation', notes: 'Certification and exam details, scheduling, renewal and the practice assessment.' },
        { id: 'learn-course', title: LN.course[1], url: LN.course[0], type: 'course', notes: 'Free on Microsoft Learn. Groups the three official learning paths in study order.' },
        { id: 'path-tenant', title: LN.pathTenant[1], url: LN.pathTenant[0], type: 'course', notes: 'Domain 1 · 5 modules.' },
        { id: 'path-govern', title: LN.pathGovern[1], url: LN.pathGovern[0], type: 'course', notes: 'Domain 2 · 5 modules.' },
        { id: 'path-ai', title: LN.pathAi[1], url: LN.pathAi[0], type: 'course', notes: 'Domain 3 · 7 modules.' },
        { id: 'exam-sandbox', title: 'Exam sandbox (try the exam interface)', url: 'https://aka.ms/examdemo', type: 'practice-test', notes: '' },
        { id: 'scoring', title: 'Exam scoring and score reports', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exam-scoring-reports', type: 'documentation', notes: '' },
        { id: 'docs-m365', title: 'Microsoft 365 documentation', url: 'https://learn.microsoft.com/en-us/microsoft-365/', type: 'documentation', notes: 'Product documentation linked from the study guide.' },
        { id: 'docs-copilot', title: 'Microsoft Copilot documentation for admins', url: 'https://learn.microsoft.com/en-us/copilot/', type: 'documentation', notes: '' },
        { id: 'docs-agent365', title: 'Microsoft Agent 365 documentation', url: 'https://learn.microsoft.com/en-us/microsoft-agent-365/', type: 'documentation', notes: '' },
      ],
    },
    questions: () => B.questions.map((q) => ({ ...q, cert: 'ab-650' })),
    // Upgrading stored data from AB-650 content 1.x (Udemy-based plan) — see app.js upgradeBuiltinContent.
    migrate: {
      removeResourceHosts: ['udemy.com'],
      courseUrlPattern: 'udemy\\.com',
      oldWeeks: [
        { title: 'Microsoft 365 foundations and identity', topics: ['Microsoft 365 fundamentals and cloud architecture', 'Tenant management and configuration', 'Users, groups and licensing', 'Microsoft Entra ID and administrative roles', 'Identity synchronisation', 'Complete relevant lectures and practical simulations', 'Hands-on exercises and revision quiz'] },
        { title: 'Security and authentication', topics: ['Authentication methods and MFA', 'Conditional Access', 'Enterprise applications and application access', 'External identities and guest access', 'Microsoft 365 security administration', 'Complete security lectures and practical simulations', 'Practical scenarios and a 20-question assessment'] },
        { title: 'Workloads, governance and compliance', topics: ['Exchange Online', 'SharePoint and OneDrive', 'Microsoft 365 workloads', 'Microsoft Purview and compliance', 'Data Loss Prevention and information protection', 'Complete relevant lectures and practical simulations', 'Revision and practical assessment'] },
        { title: 'Copilot, AI agents and final revision', topics: ['Microsoft 365 Copilot architecture', 'Copilot security and governance', 'Microsoft Entra Agent ID', 'Agent 365 and agent governance', 'AI services administration', 'Complete remaining lectures and practical simulations', 'Final mock exam and identify knowledge gaps'] },
      ],
    },
  });
})();
