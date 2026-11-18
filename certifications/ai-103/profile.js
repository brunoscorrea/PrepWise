/* =========================================================
   Built-in certification profile: Microsoft AI-103.
   Exam AI-103: Developing AI Apps and Agents on Azure
   Certification: Microsoft Certified: Azure AI Apps and Agents Developer Associate
   Source of truth: Microsoft Learn — the official study guide (skills measured as of
   16 April 2026), the certification page and the four learning paths of course AI-103T00.
   Study plan: 4 weeks by default, Monday–Friday 60 min, Saturday 3 h (hands-on lab),
   Sunday 2.5 h (revision and assessment) = 10.5 h a week. New-content time follows the
   official weightings: D1 ≈ 8.8 h (28%), D2 ≈ 10.3 h (32%), D3 ≈ 4 h (13%), D4 ≈ 4 h (13%), D5 ≈ 4.8 h (15%).
   COSTS: Microsoft Learn content is free. The labs create Azure resources (Foundry, model
   deployments, Azure AI Search, Speech, Content Understanding, Document Intelligence) that
   are billed by usage. Every lab has a no-subscription alternative.
   ========================================================= */
'use strict';
(() => {
  const B = window.AI103;
  if (!B) { console.warn('AI-103 bank missing'); return; }
  const R = B.refs; const LN = B.learn;
  const L = (k) => { const v = LN[k] || R[k]; if (!v) throw new Error(`AI-103 plan link "${k}" missing`); return { title: v[1], url: v[0], type: LN[k] ? 'learn' : 'docs' }; };
  const targets = [60, 60, 60, 60, 60, 180, 150];
  const S = (day, topic, kind, objs, links, exercise) => ({ day, topic, kind, plannedMin: targets[day], objs, links: links.map(L), exercise });
  const COST = 'Costs money: this lab creates Azure resources billed by usage. Delete the resource group when you finish.';
  const NO_SUB = 'No Azure subscription? Read the module\'s exercise unit, study the code line by line and answer its knowledge check.';

  const weeks = [
    {
      title: 'Plan, deploy and secure Foundry solutions',
      objectives: [
        'Choose models (LLMs, small, multimodal) and Foundry services for each task',
        'Choose deployment types and configure model and agent deployments',
        'Connect an application to a Foundry project with the Foundry and OpenAI SDKs',
        'Secure, scale and monitor AI workloads: roles, keyless auth, private networking, quotas',
        'Configure guardrails and evaluators for responsible AI',
        'Score 85%+ on the Domain 1 quiz',
      ],
      sessions: [
        S(0, 'Plan AI development on Azure: Foundry, models and Foundry Tools', 'study', ['1.1.1', '1.1.2', '1.2.1'], ['pathGenAi', 'mPrepare', 'whatIsFoundry', 'architecture', 'foundryTools'],
          'Write a one-page decision table: for five tasks (chat, invoice extraction, captioning, sentiment, transcription), pick an LLM, small model, multimodal model or Foundry Tool and say why.'),
        S(1, 'Select, deploy and evaluate Foundry Models; deployment types', 'study', ['1.1.1', '1.2.2', '1.2.3', '2.1.1'], ['mModels', 'modelsOverview', 'deploymentTypes', 'ptu', 'batch', 'modelRouter'],
          'Compare Global Standard, Data Zone Standard, provisioned and batch for three workloads (EU-only chatbot, nightly classification, steady contact centre) and record your choice with the reason.'),
        S(2, 'Build a chat app with the Foundry SDK and the Responses API', 'study', ['2.1.5', '2.1.6', '2.2.1'], ['mSdk', 'sdkOverview', 'responses'],
          `Write the Python to create AIProjectClient with DefaultAzureCredential, get an OpenAI client, call responses.create and continue the conversation with previous_response_id. ${NO_SUB}`),
        S(3, 'Security and scale: Foundry roles, keyless auth, private networking, quotas and rate limits', 'study', ['1.3.1', '1.3.4', '1.2.4'], ['rbac', 'disableLocalAuth', 'privateLink', 'quota', 'evalGithubAction'],
          'Design access for a dev team (Foundry User), a pipeline (workload identity, no keys) and production (public network access disabled, private endpoint). Add a 429 retry strategy with backoff.'),
        S(4, 'Responsible generative AI: guardrails, Prompt Shields and evaluators', 'study', ['1.4.1', '1.4.2', '1.4.3', '1.4.4'], ['mResponsible', 'guardrails', 'promptShields', 'builtInEvaluators', 'redTeaming', 'contentCredentials'],
          'Configure (or sketch) a guardrail: blocking levels for each harm, document attack detection turned on, and the intervention points it scans. List the evaluators you would run before launch.'),
        S(5, 'Lab: deploy a model, call it from Python and apply a guardrail', 'practical', ['1.2.3', '2.1.6', '1.4.1', '1.3.2'], ['mModels', 'mSdk', 'mResponsible', 'tracing'],
          `${COST} Create a Foundry project, deploy a small chat model, call it from Python with keyless auth, connect Application Insights for tracing and test a guardrail in the playground. ${NO_SUB}`),
        S(6, 'Weekly revision and Domain 1 assessment (Domain quiz: Plan & manage)', 'assessment', ['1.1', '1.2', '1.3', '1.4'], ['pathGenAi'],
          'Re-read your notes, then run Quiz Centre > Domain quiz > Plan & manage in exam mode. Use the hints in practice mode for any topic you\'re unsure of.'),
      ],
    },
    {
      title: 'Generative apps, RAG and retrieval pipelines',
      objectives: [
        'Use tools in the Responses API: code interpreter, web search, file search and functions',
        'Optimise outputs with prompt engineering, RAG and fine-tuning; tune parameters and reasoning effort',
        'Evaluate apps for grounding, relevance, quality and safety; set up observability',
        'Build ingestion with indexers, skills, OCR, layout and integrated vectorization',
        'Ground answers with semantic, hybrid and vector search',
        'Score 85%+ on this week\'s revision quiz',
      ],
      sessions: [
        S(0, 'Generative AI apps that use tools; workflows and multistep reasoning', 'study', ['2.1.3', '1.1.4', '2.2.3'], ['mTools', 'functionCalling', 'codeInterpreter', 'fileSearch', 'webSearchTool'],
          'Write a Responses API request that uses a function tool for order status, and trace the loop: model asks, your code runs the function, you return the output.'),
        S(1, 'Optimise performance: prompt engineering, RAG and fine-tuning', 'study', ['2.3.1', '2.3.2', '2.1.2', '4.1.4'], ['mOptimize', 'promptEngineering', 'reasoning', 'structuredOutputs', 'fineTuning'],
          'Take one weak prompt and improve it three ways: system message, few-shot examples, then structured output. Note when you would add RAG and when fine-tuning.'),
        S(2, 'Evaluate and observe generative apps', 'study', ['2.1.4', '2.3.3', '1.3.2'], ['builtInEvaluators', 'cloudEvaluation', 'observability', 'tracing', 'agentMonitoring'],
          'Choose evaluators for a RAG app (retrieval, groundedness, relevance, safety) and define pass thresholds. Decide what the monitoring dashboard should alert on.'),
        S(3, 'Search for grounding: vector, hybrid and semantic ranking', 'study', ['5.1.2', '1.1.3', '1.3.3'], ['mKnowledgeMining', 'aiSearch', 'vectorSearch', 'hybridSearch', 'semanticRanker', 'scoringProfiles'],
          'For three query types (part numbers, natural-language questions, mixed), decide between keyword, vector and hybrid search, and when to add semantic ranking.'),
        S(4, 'Ingestion and enrichment: indexers, skills, OCR, layout and integrated vectorization', 'study', ['5.1.1', '5.1.3', '5.1.4', '1.3.3'], ['mKnowledgeMining', 'indexers', 'skillsets', 'ocrSkill', 'layoutSkill', 'integratedVectorization', 'knowledgeStore'],
          'Draw an ingestion pipeline for scanned and digital PDFs: data source, indexer, OCR or Document Layout skill, chunking, embedding, index, plus an optional knowledge store.'),
        S(5, 'Lab: implement a basic RAG solution and evaluate groundedness', 'practical', ['2.1.2', '5.1.4', '5.1.2'], ['mKnowledgeMining', 'mOptimize', 'integratedVectorization', 'builtInEvaluators'],
          `${COST} Index a few sample documents with integrated vectorization, query them with hybrid search from Python, ground a model\'s answer in the results and run a groundedness evaluation. ${NO_SUB}`),
        S(6, 'Weekly revision and assessment (Week revision quiz)', 'assessment', ['2.1', '2.3', '5.1'], ['pathGenAi', 'pathVision'],
          'Run Quiz Centre > Week revision for week 2 in exam mode, then a Weak Areas quiz.'),
      ],
    },
    {
      title: 'AI agents: tools, knowledge, workflows and orchestration',
      objectives: [
        'Build agents with instructions, tools, retrieval, function calling and memory',
        'Integrate MCP, OpenAPI and custom tools with approvals and allowed tools',
        'Ground agents with Foundry IQ knowledge bases and web knowledge',
        'Design workflows with human-in-the-loop safeguards and publish agents to Microsoft 365',
        'Orchestrate multi-agent solutions with Microsoft Agent Framework and A2A',
        'Score 85%+ on the Domain 2 quiz',
      ],
      sessions: [
        S(0, 'Develop agents with Foundry Agent Service and VS Code', 'study', ['2.2.1', '1.2.3', '2.2.6'], ['pathAgents', 'mAgents', 'agentService', 'agentEvaluators'],
          'Define an agent: role, goals, constraints, conversation approach and three tools with clear descriptions. Write the instruction that says what "done" means.'),
        S(1, 'Custom tools and MCP tools, with approvals and allowed tools', 'study', ['2.2.3', '1.4.4', '2.2.5'], ['mCustomTools', 'mMcp', 'openapi', 'mcp', 'toolbox'],
          'Plan an MCP connection: server_label, server_url, allowed_tools for read-only tools and require_approval for write tools. Add an OpenAPI tool with managed identity authentication.'),
        S(2, 'Knowledge for agents: Foundry IQ, memory and Web IQ', 'study', ['2.2.2', '1.1.4', '5.1.5'], ['mFoundryIq', 'mWebIq', 'foundryIq', 'agenticRetrieval', 'memory', 'aiSearchTool'],
          'Design a knowledge base with SharePoint and Blob Storage sources shared by two agents, and decide which memory types (user profile, chat summary, procedural) each agent needs. Note: Web IQ needs a paid Azure subscription.'),
        S(3, 'Workflows, human-in-the-loop and publishing to Microsoft 365', 'study', ['2.2.5', '2.1.3', '1.4.3', '2.3.4'], ['mWorkflows', 'mM365', 'workflows', 'publishCopilot'],
          'Sketch a support-triage workflow: agent node with structured output, Power Fx condition on confidence, human approval for low confidence, and a deterministic rule for refunds over a limit.'),
        S(4, 'Multi-agent orchestration with Microsoft Agent Framework and A2A', 'study', ['2.2.4', '2.3.4'], ['mAgentFramework', 'mMultiAgent', 'mA2a', 'orchestrations', 'a2a'],
          'Map five scenarios to concurrent, sequential, handoff, group chat and magentic orchestration, and describe what an Agent Card would publish for one of your agents.'),
        S(5, 'Lab: build an agent with tools, then trace and evaluate it', 'practical', ['2.2.2', '2.2.6', '2.3.3', '5.1.5'], ['mAgents', 'mCustomTools', 'tracing', 'agentEvaluators'],
          `${COST} Create an agent with a function tool and an MCP tool that requires approval, run a few conversations, inspect the traces and run intent resolution and tool call accuracy evaluators. ${NO_SUB}`),
        S(6, 'Weekly revision and Domain 2 assessment (Domain quiz: Generative AI & agents)', 'assessment', ['2.1', '2.2', '2.3'], ['pathAgents'],
          'Run Quiz Centre > Domain quiz > Generative AI & agents in exam mode. Review every tool, approval and orchestration question you missed.'),
      ],
    },
    {
      title: 'Vision, language, speech, extraction and final mock',
      objectives: [
        'Generate and edit images and videos; analyse images with multimodal models',
        'Extract visual and document content with Content Understanding and Document Intelligence',
        'Analyse and translate text with Azure Language, Translator and language models',
        'Build speech solutions: speech to text, text to speech, voice agents and speech translation',
        'Complete the final mock exam and list the gaps to revise before booking',
      ],
      sessions: [
        S(0, 'Image and video generation and editing', 'study', ['3.1.1', '3.1.2', '3.1.3', '3.1.4', '3.1.5'], ['pathVision', 'mImages', 'mVideo', 'imageGeneration', 'videoGeneration', 'contentCredentials'],
          'Write the steps for an inpainting edit (mask the same size as the image, plus a prompt) and the asynchronous Sora 2 job flow (submit, poll, download), including when to remix instead of regenerate.'),
        S(1, 'Multimodal understanding and responsible AI for visual content', 'study', ['3.2.1', '3.2.2', '3.2.3', '3.2.4', '3.3.1', '3.3.2', '3.3.3'], ['mVision', 'vision', 'contentSafety', 'promptShields'],
          'Write prompts for a concise caption, accessible alt text and an extended chart description, and choose the image detail level for each. List the defences against injected text in images.'),
        S(2, 'Content Understanding and Document Intelligence', 'study', ['3.2.5', '3.2.6', '3.2.7', '3.2.8', '5.2.1', '5.2.2', '5.2.3'], ['mCuImages', 'mCu', 'mCuApi', 'mDocIntel', 'cuOverview', 'cuVideo', 'diModels'],
          'Design an analyzer schema for product photos (extract, classify and generate fields) and choose between a prebuilt invoice model, a custom template model and a custom neural model for three document sets.'),
        S(3, 'Text analysis and translation', 'study', ['4.1.1', '4.1.2', '4.1.3', '4.1.4'], ['pathLanguage', 'mLanguage', 'mLanguageMcp', 'mTranslate', 'pii', 'textTranslation'],
          'Build a review-processing plan: language detection, PII redaction, key phrases, opinion mining (note its 2029 retirement) or a generative alternative, and LLM translation with a formal tone.'),
        S(4, 'Speech solutions and voice agents', 'study', ['4.2.1', '4.2.2', '4.2.3', '4.2.4'], ['mAudio', 'mSpeech', 'mSpeechMcp', 'mVoiceLive', 'speechToText', 'voiceLive', 'customSpeech'],
          'Choose real-time, fast or batch transcription for three scenarios, decide when custom speech is needed, and outline a Voice Live voice agent that answers in the caller\'s language.'),
        S(5, 'Lab: image, document and speech understanding, then domain quizzes 3–5', 'practical', ['3.2.5', '3.2.8', '4.2.1', '4.1.3'], ['mCuImages', 'mCuApi', 'mSpeech', 'mTranslate'],
          `${COST} Analyse an image and a document with Content Understanding (bring your own model deployments), transcribe a short audio file and translate a paragraph. Then run the Computer vision, Text analysis and Information extraction domain quizzes. ${NO_SUB}`),
        S(6, 'Final mock exam and identify knowledge gaps', 'assessment', ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '4.1', '4.2', '5.1', '5.2'], ['course', 'pathGenAi', 'pathAgents', 'pathLanguage', 'pathVision'],
          'Take Quiz Centre > Final mock (60 questions, 120 minutes) in exam mode. Review every explanation, list objectives below 85% and revise them on Microsoft Learn before booking the exam.'),
      ],
    },
  ];

  window.PrepWiseBuiltins = window.PrepWiseBuiltins || [];
  window.PrepWiseBuiltins.push({
    certification: {
      id: 'ai-103',
      code: 'AI-103',
      name: 'Developing AI Apps and Agents on Azure',
      provider: 'Microsoft',
      description: 'Microsoft Certified: Azure AI Apps and Agents Developer Associate. Build generative AI apps and agents with Microsoft Foundry and Python: models and deployments, RAG and search, agents and tools, multi-agent orchestration, responsible AI, vision, language, speech and information extraction.',
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
        weekSections: { 1: ['1.1', '1.2', '1.3', '1.4'], 2: ['2.1', '2.3', '5.1'], 3: ['2.2', '2.3'], 4: ['3.1', '3.2', '3.3', '4.1', '4.2', '5.2'] },
        modes: { mock: { count: 50, minutes: 100 }, final: { count: 60, minutes: 120 } },
        seed: 'ai103',
        disclaimer: 'Original practice questions written against the official AI-103 study guide (skills measured as of 16 April 2026) and verified against Microsoft Learn. They aren\'t Microsoft exam questions and aren\'t taken from exam dumps. Microsoft Foundry, its SDKs and preview features change often, so always check the linked Microsoft Learn page. Readiness scores are a study aid, not a prediction of your exam result.',
      },
      plan: { dailyTargets: targets, studyDays: [true, true, true, true, true, true, true], weeks },
      resources: [
        { id: 'study-guide', title: 'Official AI-103 study guide', url: B.studyGuideUrl, type: 'study-guide', notes: 'Skills measured (as of 16 April 2026), domain weightings and links. The source of truth for this certification.' },
        { id: 'cert-page', title: 'Microsoft Certified: Azure AI Apps and Agents Developer Associate', url: B.source.certification, type: 'documentation', notes: 'Certification and exam details, scheduling, renewal and the practice assessment.' },
        { id: 'learn-course', title: LN.course[1], url: LN.course[0], type: 'course', notes: 'Free on Microsoft Learn. Groups the four official learning paths.' },
        { id: 'path-genai', title: LN.pathGenAi[1], url: LN.pathGenAi[0], type: 'course', notes: '6 modules.' },
        { id: 'path-agents', title: LN.pathAgents[1], url: LN.pathAgents[0], type: 'course', notes: '10 modules.' },
        { id: 'path-language', title: LN.pathLanguage[1], url: LN.pathLanguage[0], type: 'course', notes: '7 modules.' },
        { id: 'path-vision', title: LN.pathVision[1], url: LN.pathVision[0], type: 'course', notes: '8 modules.' },
        { id: 'docs-foundry', title: R.whatIsFoundry[1], url: R.whatIsFoundry[0], type: 'documentation', notes: 'Microsoft Foundry documentation.' },
        { id: 'docs-agents', title: R.agentService[1], url: R.agentService[0], type: 'documentation', notes: '' },
        { id: 'docs-search', title: R.aiSearch[1], url: R.aiSearch[0], type: 'documentation', notes: '' },
        { id: 'docs-cu', title: R.cuOverview[1], url: R.cuOverview[0], type: 'documentation', notes: '' },
        { id: 'docs-tools', title: R.foundryTools[1], url: R.foundryTools[0], type: 'documentation', notes: 'Azure Language, Speech, Translator, Document Intelligence and Content Understanding.' },
        { id: 'exam-sandbox', title: 'Exam sandbox (try the exam interface)', url: 'https://aka.ms/examdemo', type: 'practice-test', notes: '' },
      ],
    },
    questions: () => B.questions.map((q) => ({ ...q, cert: 'ai-103' })),
  });
})();
