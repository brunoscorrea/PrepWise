/* =========================================================
   Built-in certification profile: Microsoft MD-102.
   Exam outline: certifications/md-102/meta.js (skills measured as of
   27 October 2026, checked 18 November 2026).
   Study plan: 4 weeks by default, Monday–Friday 60 min, Saturday 3 h
   (practical lab), Sunday 2.5 h (revision and assessment) = 10.5 h a week.
   Time is allocated by the official domain weightings:
   D1 ≈ 8 h, D2 ≈ 9 h, D3 ≈ 6 h, D4 ≈ 5 h, D5 ≈ 4 h of new-content study,
   plus weekly revision, assessments and a final mock exam.
   ========================================================= */
'use strict';
(() => {
  const B = window.MD102;
  if (!B) { console.warn('MD-102 bank missing'); return; }
  const R = B.refs; const LN = B.learn;
  const L = (k) => { const v = LN[k] || R[k]; if (!v) throw new Error(`MD-102 plan link "${k}" missing`); return { title: v[1], url: v[0], type: LN[k] ? 'learn' : 'docs' }; };
  const targets = [60, 60, 60, 60, 60, 180, 150];
  const S = (day, topic, kind, objs, links, exercise) => ({ day, topic, kind, plannedMin: targets[day], objs, links: links.map(L), exercise });

  const weeks = [
    {
      title: 'Device identity, enrolment and compliance',
      objectives: [
        'Choose between Microsoft Entra join, registration and hybrid join, and build dynamic device groups',
        'Configure enrolment settings, restrictions and automatic Windows enrolment',
        'Enrol Apple devices (APNs, user enrolment, Apple Business Manager) and Android devices (Android Enterprise, Knox, zero-touch)',
        'Delegate administration with Intune and Windows 365 roles, scope tags and multi-admin approval',
        'Build compliance policies and Conditional Access, and configure WHfB, Windows LAPS and local groups',
        'Score 85%+ on the Domain 1 quiz',
      ],
      sessions: [
        S(0, 'Device join types, joining and registering, dynamic device groups', 'study', ['1.1.1', '1.1.2', '1.1.3', '1.1.4'], ['mEntraDevices', 'mDeviceIdentity', 'deviceIdentity', 'deviceSettings', 'dynamicGroups'],
          'Create two dynamic device groups: all Autopilot devices ([ZTDid]) and devices with group tag "Sales" ([OrderID]:Sales). Review Microsoft Entra device settings (who can join, device limit, LAPS).'),
        S(1, 'Enrolment settings, restrictions and automatic Windows enrolment', 'study', ['1.2.1', '1.2.2'], ['mEnrollment', 'enrollmentGuide', 'enrollmentRestrictions', 'deviceLimit', 'autoEnroll'],
          'Practical scenario (Intune enrolment): set MDM user scope to a pilot group, create a platform restriction that blocks personal Windows devices and raise the device limit to 10. Enrol a test VM.'),
        S(2, 'Apple enrolment: APNs, account driven user enrolment and Apple Business Manager', 'study', ['1.2.3', '1.2.5'], ['mEnrollment', 'apnsCert', 'userEnrollment', 'abm', 'abmMac'],
          'Create (or review) the Apple MDM push certificate with a shared Apple ID. Write the ADE token and enrolment profile steps from memory, including "Setup Assistant with modern authentication".'),
        S(3, 'Android Enterprise enrolment, Knox Mobile Enrollment and zero-touch', 'study', ['1.2.4', '1.2.6'], ['mEnrollment', 'androidGuide', 'androidFullyManaged', 'androidDedicated', 'androidCope', 'knox', 'zeroTouch', 'enrollTroubleshoot'],
          'Connect Managed Google Play (lab tenant) and create a fully managed and a dedicated (shared device mode) enrolment profile. Note which method suits each scenario.'),
        S(4, 'Intune and Windows 365 roles, scope tags and multi-admin approval', 'study', ['1.3.1', '1.3.2', '1.3.3'], ['mRbac', 'rbac', 'scopeTags', 'maa', 'w365Rbac'],
          'Create a custom Intune role for regional help desk with a "Europe" scope tag and scope group. Create a multi-admin approval access policy for scripts and submit a test change.'),
        S(5, 'Lab: compliance, Conditional Access, Windows Hello for Business, Windows LAPS and local groups', 'practical', ['1.3.4', '1.3.5', '1.3.6', '1.3.7', '1.3.8'], ['mCompliance', 'compliance', 'noncompliance', 'caCompliance', 'whfb', 'lapsPolicy', 'accountProtection'],
          'Practical scenario (compliance and Conditional Access): create a Windows compliance policy (BitLocker, Defender, OS version) with actions for noncompliance, then a report-only Conditional Access policy that requires a compliant device. Deploy a LAPS policy and read the password in the Microsoft Entra admin center. Restrict local Administrators with "Add (Replace)".'),
        S(6, 'Weekly revision and Domain 1 assessment (Domain quiz: Device infrastructure)', 'assessment', ['1.1', '1.2', '1.3'], ['pathInfra'],
          'Run Quiz Centre > Domain quiz > Device infrastructure in exam mode, then review every explanation you got wrong and bookmark weak topics.'),
      ],
    },
    {
      title: 'Autopilot, Windows 365 and configuration',
      objectives: [
        'Choose between Autopilot profiles and device preparation, and between deployment modes',
        'Deploy Windows with Autopilot, ESP and naming templates; plan Windows 11 upgrades and Windows Backup',
        'Provision Windows 365 Cloud PCs (provisioning policies, network connections, images)',
        'Create configuration profiles for Windows, Android, iOS/iPadOS, macOS and specialty devices, with filters and enrolment time grouping',
        'Use Intune Suite: EPM, Enterprise App Catalog, Remote Help, Cloud PKI, Tunnel for MAM, Advanced Analytics',
        'Score 85%+ on the Domain 2 quiz',
      ],
      sessions: [
        S(0, 'Autopilot profiles vs device preparation, deployment modes and naming', 'study', ['2.1.1', '2.1.2', '2.1.3'], ['mAutopilot', 'autopilot', 'devicePrepCompare', 'userDriven', 'preProvision', 'selfDeploying'],
          'Build a comparison table: Autopilot profile vs device preparation (registration, join types, pre-provisioning) and user-driven vs pre-provisioning vs self-deploying (requirements and use cases).'),
        S(1, 'Autopilot deployment, Enrollment Status Page, Windows 11 upgrades and Windows Backup', 'study', ['2.1.4', '2.1.5', '2.1.6', '2.1.8'], ['mAutopilot', 'autopilotRegister', 'esp', 'featureUpdates', 'windowsBackup'],
          'Practical scenario (Windows Autopilot): import a VM hardware hash, assign a user-driven profile with name template CON-%SERIAL% and an ESP that blocks on two apps. Deploy it and time the OOBE.'),
        S(2, 'Windows 365 Cloud PCs: provisioning policies, network connections and images', 'study', ['2.1.7'], ['mW365', 'w365', 'w365Provisioning', 'w365Anc', 'w365Images'],
          'Draw the provisioning flow for Microsoft hosted network vs Azure network connection (hybrid join). List the image requirements for a custom image.'),
        S(3, 'Windows configuration profiles: settings catalog, ADMX import and Group Policy analytics', 'study', ['2.2.1'], ['mProfiles', 'configProfiles', 'settingsCatalog', 'admx', 'gpAnalytics'],
          'Practical scenario (device configuration): export a GPO as XML, import it into Group Policy analytics, migrate the supported settings to a settings catalog profile and import one third-party ADMX.'),
        S(4, 'Android, iOS/iPadOS, macOS and specialty device profiles; filters and enrolment time grouping', 'study', ['2.2.2', '2.2.3', '2.2.4', '2.2.5', '2.2.6'], ['mProfiles', 'androidProfiles', 'iosProfiles', 'macProfiles', 'oemConfig', 'filters', 'etg'],
          'Create an assignment filter for corporate-owned devices and apply it to a profile assigned to All users. Note which iOS settings are supervised-only.'),
        S(5, 'Lab: Intune Suite — EPM, Enterprise App Catalog, Remote Help, Cloud PKI, Tunnel for MAM, Advanced Analytics', 'practical', ['2.3.1', '2.3.2', '2.3.3', '2.3.4', '2.3.5', '2.3.6'], ['pathSuite', 'mEpm', 'mEac', 'mRemoteHelp', 'mCloudPki', 'mTunnel', 'mAdvSignals'],
          'With an Intune Suite trial: create EPM elevation settings and a user-confirmed rule for one tool, deploy an Enterprise App Catalog app, and set up a Cloud PKI root and issuing CA with a SCEP profile. Without a trial, write the configuration steps for each.'),
        S(6, 'Weekly revision and Domain 2 assessment (Domain quiz: Manage & maintain)', 'assessment', ['2.1', '2.2', '2.3'], ['pathManage'],
          'Run Quiz Centre > Domain quiz > Manage & maintain in exam mode and a Weak Areas quiz. Record the score as this week\'s assessment.'),
      ],
    },
    {
      title: 'Remote actions, endpoint security and updates',
      objectives: [
        'Perform single and bulk remote actions, rotate BitLocker and LAPS secrets, run device queries and collect diagnostics',
        'Create antivirus, disk encryption, firewall, ASR, baseline and App Control policies',
        'Integrate and onboard Defender for Endpoint and triage incidents',
        'Plan and manage Windows update rings, feature and quality updates, Autopatch and Hotpatch',
        'Manage Apple and Android updates, Delivery Optimization and update reports',
        'Score 85%+ on the mid-programme assessment',
      ],
      sessions: [
        S(0, 'Remote and bulk device actions, secret rotation, device query and diagnostics', 'study', ['2.4.1', '2.4.2', '2.4.3', '2.4.4', '2.4.5', '2.4.6', '2.4.7'], ['mMaintain', 'mTroubleshoot', 'remoteActions', 'bulkActions', 'bitlockerRotate', 'lapsActions', 'deviceQuery', 'collectDiagnostics'],
          'Run Sync, Rotate local admin password and Collect diagnostics on a test device. Use the Troubleshooting pane for a test user and list what it shows.'),
        S(1, 'Antivirus, disk encryption (BitLocker and FileVault) and firewall policies', 'study', ['3.1.1', '3.1.2', '3.1.3'], ['mEncryption', 'avPolicy', 'diskEncryption', 'encryption', 'filevault', 'firewall'],
          'Practical scenario (endpoint security): create a silent BitLocker policy for Microsoft Entra joined devices, enable self-service key recovery and check the encryption report.'),
        S(2, 'Attack surface reduction, security baselines and App Control for Business', 'study', ['3.1.4', '3.1.5', '3.1.8'], ['mDefender', 'asr', 'baselines', 'appControl'],
          'Deploy three ASR rules in Audit mode and the Windows security baseline to a pilot group. Find and resolve any setting conflict.'),
        S(3, 'Defender for Endpoint integration, EDR policies, onboarding and incident triage', 'study', ['3.1.6', '3.1.7'], ['mAtp', 'mdeIntune', 'edr', 'mdeOnboard'],
          'Turn on the Intune connection in both portals, onboard a VM with an EDR policy ("Auto from connector") and add machine risk to a compliance policy.'),
        S(4, 'Update planning, update rings, feature and quality updates, Autopatch and Hotpatch', 'study', ['3.2.1', '3.2.2', '3.2.3'], ['mUpdates', 'wufb', 'updateRings', 'expedite', 'autopatch', 'hotpatch'],
          'Design three update rings (pilot, early, broad) with deferrals, deadlines and grace periods. Note the Hotpatch prerequisites and baseline months.'),
        S(5, 'Lab: Apple and Android updates, Delivery Optimization, update reports; then Win32 app packaging', 'practical', ['3.2.4', '3.2.5', '3.2.6', '3.2.7', '4.1.1', '4.1.2'], ['appleUpdates', 'zebraLifeguard', 'deliveryOpt', 'updateReports', 'mDeployApps', 'win32Prep'],
          'Create a DDM software update policy for iOS, a Delivery Optimization profile and review update reports. Then package an app with IntuneWinAppUtil.exe, add it as a Win32 app with a detection rule and deploy it.'),
        S(6, 'Weekly revision and mid-programme assessment (Standard quiz, 25 questions)', 'assessment', ['2.4', '3.1', '3.2'], ['pathProtect'],
          'Run a Standard quiz (25 questions, exam mode) and the Week 3 revision quiz. Review explanations and add notes for any topic below 85%.'),
      ],
    },
    {
      title: 'Apps, automation, monitoring and final mock',
      objectives: [
        'Deploy and troubleshoot Win32, LOB, Store, Apple and Android apps, and Microsoft 365 Apps (including during Autopilot)',
        'Configure Quiet Time, app protection, Conditional Access for app protection and app configuration policies',
        'Automate Intune with PowerShell and Microsoft Graph, custom compliance and Security Copilot agents',
        'Use reports, Endpoint analytics, Remediations, tenant status and alerts',
        'Complete the final mock exam and list remaining knowledge gaps',
      ],
      sessions: [
        S(0, 'App deployment: Win32 supersedence, LOB, Store apps, Quiet Time, Apple and Android stores', 'study', ['4.1.2', '4.1.3', '4.1.8'], ['mAppLifecycle', 'win32', 'storeApps', 'quietTime', 'vpp', 'managedPlay'],
          'Practical scenario (application deployment): deploy a Microsoft Store app (new), approve an app in Managed Google Play and configure supersedence between two versions of your Win32 app.'),
        S(1, 'Microsoft 365 Apps: deployment, policies, ODT, Autopilot and the Apps admin center', 'study', ['4.1.4', '4.1.5', '4.1.6', '4.1.7'], ['mDeployApps', 'm365Apps', 'cloudPolicy', 'odt', 'm365AppsAdmin'],
          'Write an ODT configuration.xml (64-bit, Monthly Enterprise, no Access, remove MSI) and a Cloud Policy that blocks internet macros.'),
        S(2, 'App monitoring and troubleshooting; app protection policies for BYOD', 'study', ['4.1.9', '4.2.1'], ['mAppPerf', 'mAppProtection', 'appMonitor', 'appTroubleshoot', 'app', 'appFramework'],
          'Create iOS and Android app protection policies at framework level 2. Review the IME logs from your Win32 test deployment.'),
        S(3, 'Conditional Access for app protection and app configuration policies', 'study', ['4.2.2', '4.2.3'], ['mAppProtection', 'appCa', 'appConfig'],
          'Create a report-only Conditional Access policy for iOS/Android with "Require app protection policy" and an Outlook managed-apps configuration that allows only organisation accounts.'),
        S(4, 'Automation: PowerShell, Microsoft Graph, custom compliance and Security Copilot agents', 'study', ['5.1.1', '5.1.2', '5.1.3', '5.1.4', '5.1.5'], ['mAutomation', 'mCopilot', 'graphIntune', 'graphPs', 'copilotAgents', 'customCompliance'],
          'Practical scenario (PowerShell and Graph automation): use Connect-MgGraph and Get-MgDeviceManagementManagedDevice to list devices not synced for 30 days and export them to CSV. Create a custom compliance script and JSON rules file. Read the Security Copilot agents overview (some features may be in preview).'),
        S(5, 'Lab: reporting, Endpoint analytics, Remediations, tenant health and alerts', 'practical', ['5.2.1', '5.2.2', '5.2.3', '5.2.4', '5.2.5', '5.2.6'], ['mPerformance', 'mReporting', 'mTenantHealth', 'endpointAnalytics', 'remediations', 'startupPerf', 'reportsExport', 'tenantStatus', 'intuneLogs'],
          'Practical scenario (Endpoint Analytics): enrol devices in Endpoint analytics, create a baseline and deploy one detection/remediation package. Export a compliance report with Graph, check Tenant status and send Intune logs to Log Analytics with an alert rule for noncompliant devices. Finish with a Weak Areas quiz.'),
        S(6, 'Final mock exam (50 questions, weighted by domain) and gap review', 'assessment', ['1.1', '2.1', '3.1', '4.1', '5.1'], ['course'],
          'Take Quiz Centre > Full Mock Exam in exam mode (timed). Review every incorrect answer, update your weak-topics list and plan targeted revision before booking the exam.'),
      ],
    },
  ];

  window.PrepWiseBuiltins = window.PrepWiseBuiltins || [];
  window.PrepWiseBuiltins.push({
    certification: {
      id: 'md-102',
      code: 'MD-102',
      name: 'Microsoft 365 Endpoint Administrator',
      provider: 'Microsoft',
      description: 'Microsoft Certified: Endpoint Administrator Associate. Deploy, configure, secure, manage and monitor devices and client apps with Microsoft Intune, Windows Autopilot, Windows 365, Defender for Endpoint and Microsoft Entra ID. Outline: skills measured as of 27 October 2026 (checked 18 November 2026).',
      website: 'https://learn.microsoft.com/en-us/credentials/certifications/m365-endpoint-administrator/',
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
        weekSections: { 1: ['1.1', '1.2', '1.3'], 2: ['2.1', '2.2', '2.3'], 3: ['2.4', '3.1', '3.2'], 4: ['4.1', '4.2', '5.1', '5.2'] },
        modes: { mock: { count: 50, minutes: 100 }, final: { count: 60, minutes: 120 } },
        seed: 'md102',
        disclaimer: 'Original practice questions written against the official MD-102 skills outline (skills measured as of 27 October 2026). They aren\'t Microsoft exam questions and aren\'t taken from exam dumps. Intune changes often, and Security Copilot agent features may be in preview, so always check the linked Microsoft Learn page. Readiness scores are a study aid, not a prediction of your exam result.',
      },
      plan: { dailyTargets: targets, studyDays: [true, true, true, true, true, true, true], weeks },
      resources: [
        { id: 'study-guide', title: 'Official MD-102 study guide (skills measured as of 27 Oct 2026)', url: B.studyGuideUrl, type: 'study-guide', notes: 'Skills measured, domain weightings and change log. Checked 18 November 2026.' },
        { id: 'exam-page', title: 'MD-102 exam page', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/md-102/', type: 'documentation', notes: 'Scheduling, languages and the free self-paced learning paths.' },
        { id: 'course', title: LN.course[1], url: LN.course[0], type: 'course', notes: 'Instructor-led course outline; the learning paths below are its free self-paced equivalent.' },
        { id: 'lp-infra', title: LN.pathInfra[1], url: LN.pathInfra[0], type: 'course', notes: 'Domain 1' },
        { id: 'lp-manage', title: LN.pathManage[1], url: LN.pathManage[0], type: 'course', notes: 'Domain 2' },
        { id: 'lp-suite', title: LN.pathSuite[1], url: LN.pathSuite[0], type: 'course', notes: 'Domain 2 (Intune Suite)' },
        { id: 'lp-cloudpc', title: LN.pathCloudPc[1], url: LN.pathCloudPc[0], type: 'course', notes: 'Domain 2 (Windows 365)' },
        { id: 'lp-protect', title: LN.pathProtect[1], url: LN.pathProtect[0], type: 'course', notes: 'Domain 3' },
        { id: 'lp-apps', title: LN.pathApps[1], url: LN.pathApps[0], type: 'course', notes: 'Domain 4' },
        { id: 'lp-automate', title: LN.pathAutomate[1], url: LN.pathAutomate[0], type: 'course', notes: 'Domain 5' },
        { id: 'lp-ops', title: LN.pathOps[1], url: LN.pathOps[0], type: 'course', notes: 'Domains 1 and 5' },
        { id: 'practice', title: 'Free Microsoft practice assessment for MD-102', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/md-102/practice/assessment?assessment-type=practice&assessmentId=76', type: 'practice-test', notes: 'Official practice questions from Microsoft.' },
        { id: 'intune-docs', title: 'Microsoft Intune documentation', url: 'https://learn.microsoft.com/en-us/intune/', type: 'documentation', notes: '' },
        { id: 'autopilot-docs', title: 'Windows Autopilot documentation', url: 'https://learn.microsoft.com/en-us/autopilot/', type: 'documentation', notes: '' },
        { id: 'exam-readiness', title: 'Exam Readiness Zone videos', url: 'https://learn.microsoft.com/en-us/shows/exam-readiness-zone/', type: 'video', notes: '' },
        { id: 'sandbox', title: 'Exam sandbox (try the exam interface)', url: 'https://aka.ms/examdemo', type: 'practice-test', notes: '' },
        { id: 'intune-trial', title: 'Microsoft Intune free trial (lab tenant)', url: 'https://learn.microsoft.com/en-us/intune/fundamentals/free-trial-sign-up', type: 'lab', notes: 'Use a trial or developer tenant and test VMs for labs, never production.' },
        { id: 'scoring', title: 'Exam scoring and score reports', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exam-scoring-reports', type: 'documentation', notes: '' },
      ],
    },
    questions: () => B.questions.map((q) => ({ ...q, cert: 'md-102' })),
  });
})();
