/* =========================================================
   Built-in certification profile: Microsoft AB-650.
   Content comes from the official study guide:
   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-650
   The question bank (questions-d*.js) and objectives (meta.js) are loaded
   before this file and are used unchanged.
   ========================================================= */
'use strict';
(() => {
  const B = window.AB650;
  if (!B) { console.warn('AB-650 bank missing'); return; }

  // The original 4-week programme (study topics are editable in the app).
  const weeks = [
    {
      title: 'Microsoft 365 foundations and identity',
      topics: ['Microsoft 365 fundamentals and cloud architecture', 'Tenant management and configuration', 'Users, groups and licensing', 'Microsoft Entra ID and administrative roles', 'Identity synchronisation', 'Complete relevant lectures and practical simulations', 'Hands-on exercises and revision quiz'],
      sundayKind: 'revision',
      objectives: ['Explain the Microsoft 365 service model and cloud architecture', 'Configure core tenant settings and custom domains', 'Manage users, groups and licence assignment', 'Describe Entra ID admin roles and apply least privilege', 'Compare identity synchronisation options'],
    },
    {
      title: 'Security and authentication',
      topics: ['Authentication methods and MFA', 'Conditional Access', 'Enterprise applications and application access', 'External identities and guest access', 'Microsoft 365 security administration', 'Complete security lectures and practical simulations', 'Practical scenarios and a 20-question assessment'],
      sundayKind: 'assessment',
      objectives: ['Configure authentication methods and MFA', 'Design and test Conditional Access policies', 'Manage enterprise applications and app access', 'Configure external identities and guest access', 'Navigate Microsoft 365 security administration', 'Score 85%+ on the 20-question self-assessment'],
    },
    {
      title: 'Workloads, governance and compliance',
      topics: ['Exchange Online', 'SharePoint and OneDrive', 'Microsoft 365 workloads', 'Microsoft Purview and compliance', 'Data Loss Prevention and information protection', 'Complete relevant lectures and practical simulations', 'Revision and practical assessment'],
      sundayKind: 'assessment',
      objectives: ['Administer core Exchange Online settings', 'Manage SharePoint and OneDrive sharing and storage', 'Understand how the wider Microsoft 365 workloads fit together', 'Navigate Microsoft Purview compliance solutions', 'Configure DLP and sensitivity labels'],
    },
    {
      title: 'Copilot, AI agents and final revision',
      topics: ['Microsoft 365 Copilot architecture', 'Copilot security and governance', 'Microsoft Entra Agent ID', 'Agent 365 and agent governance', 'AI services administration', 'Complete remaining lectures and practical simulations', 'Final mock exam and identify knowledge gaps'],
      sundayKind: 'assessment',
      objectives: ['Explain Microsoft 365 Copilot architecture and data flow', 'Apply Copilot security and governance controls', 'Describe Microsoft Entra Agent ID', 'Understand Agent 365 and agent governance', 'Administer AI services settings', 'Complete a final mock exam and list knowledge gaps'],
    },
  ];
  const targets = [60, 60, 60, 60, 60, 180, 150];

  window.PrepWiseBuiltins = window.PrepWiseBuiltins || [];
  window.PrepWiseBuiltins.push({
    certification: {
      id: 'ab-650',
      code: 'AB-650',
      name: 'Administering Microsoft 365 and AI Services',
      provider: 'Microsoft',
      description: 'Microsoft 365 administration with a focus on securing and governing AI services: tenants and workloads, identity and access, Defender for Office 365, Microsoft Purview, Microsoft 365 Copilot and Agent 365.',
      website: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/ab-650',
      studyGuideUrl: B.studyGuideUrl,
      contentVersion: '1.1.0',
      exam: {
        masteryTarget: 85,
        minCoverage: 0.6,
        passingScore: 700,
        passingScoreNote: 'Microsoft exams are scored from 1 to 1,000. 700 or greater is a pass.',
        domains: B.domains.map((d) => ({ id: String(d.id), short: d.short, title: d.title, weight: d.weight })),
        sections: B.sections,
        objectives: B.objectives,
        refs: B.refs,
        // Which study-guide sections each programme week covers (used by Week revision quizzes)
        weekSections: { 1: ['1.1', '2.1'], 2: ['2.2', '2.3'], 3: ['1.2', '2.4'], 4: ['3.1', '3.2', '3.3', '3.4'] },
        modes: { mock: { count: 50, minutes: 100 }, final: { count: 60, minutes: 120 } },
        seed: 'ab650',
        disclaimer: 'These are original practice questions written against the official AB-650 skills outline. They aren\'t Microsoft exam questions. New AI and agent features change often, so always check the linked Microsoft Learn page.',
      },
      plan: {
        dailyTargets: targets,
        studyDays: [true, true, true, true, true, true, true],
        weeks: weeks.map((w) => ({
          title: w.title,
          objectives: w.objectives,
          sessions: w.topics.map((topic, di) => ({ day: di, topic, plannedMin: targets[di], kind: di < 5 ? 'study' : di === 5 ? 'practical' : w.sundayKind })),
        })),
      },
      resources: [
        { id: 'study-guide', title: 'Official AB-650 study guide', url: B.studyGuideUrl, type: 'study-guide', notes: 'Skills measured, domain weightings and Microsoft Learn links.' },
        { id: 'exam-page', title: 'AB-650 exam page', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/ab-650', type: 'documentation', notes: 'Scheduling, languages and free training.' },
        { id: 'udemy-ms100', title: 'Udemy course (MS-100 series)', url: 'https://www.udemy.com/course/ms100course/learn/lecture/57913107#content', type: 'course', notes: 'Main video course for the 4-week programme.' },
        { id: 'exam-sandbox', title: 'Exam sandbox (try the exam interface)', url: 'https://aka.ms/examdemo', type: 'practice-test', notes: '' },
        { id: 'scoring', title: 'Exam scoring and score reports', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exam-scoring-reports', type: 'documentation', notes: '' },
      ],
    },
    questions: () => B.questions,
  });
})();
