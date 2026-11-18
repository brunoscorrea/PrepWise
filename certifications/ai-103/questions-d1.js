/* AI-103 practice questions — Domain 1: Plan and manage an Azure AI solution (25–30%).
   Original learning content, not Microsoft exam questions. Verified against the official study
   guide and Microsoft Learn on 2026-11-19 ("verified" on each question). */
'use strict';
(() => {
  const V = '2026-11-19';
  const q = (o) => window.AI103.questions.push({ verified: V, ...o });

  // 1.1.1 Choose an appropriate model for each task
  q({ id: 'AI103-D1-001', obj: '1.1.1', topic: 'Model selection', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A support team wants to extract invoice numbers, totals and supplier names from scanned invoices every day. Accuracy must be predictable and costs low. What should you use first?',
    opts: ['A prebuilt model in Azure Document Intelligence (or Content Understanding) in Foundry Tools', 'A large reasoning model prompted to read each scanned invoice', 'Fine-tuning a frontier LLM on invoice images', 'Model router with the full model pool'],
    ans: [0],
    exp: 'Foundry Tools are prebuilt APIs and models for common tasks. Microsoft notes they can be more cost-effective and predictable than relying on a general-purpose generative model. Document Intelligence and Content Understanding both offer prebuilt analyzers for invoices.',
    why: ['', 'A general LLM can read invoices but is less predictable and usually costs more per document than a prebuilt extractor.', 'Fine-tuning is expensive and unnecessary when a prebuilt invoice model exists.', 'Model router chooses among generative models. It doesn\'t provide structured invoice extraction.'],
    hint: 'Is there a prebuilt capability for exactly this task?', feat: 'Foundry Tools', ref: 'foundryTools' });
  q({ id: 'AI103-D1-002', obj: '1.1.1', topic: 'Model selection', diff: 'easy', type: 'single', scenario: true,
    q: 'A mobile field-inspection app must classify short text notes on cheap, fast infrastructure with low latency. The task is simple and well defined. Which model category fits best?',
    opts: ['A small language model', 'The largest available frontier reasoning model', 'An image generation model', 'A speech-to-text model'],
    ans: [0],
    exp: 'Small language models handle well-scoped tasks such as classification with lower latency and cost than frontier models. Reserve large reasoning models for problems that need deep multistep reasoning.',
    why: ['', 'A frontier reasoning model adds cost and latency that a simple classification task doesn\'t need.', 'Image generation creates pictures. It doesn\'t classify text.', 'Speech-to-text converts audio. The input here is already text.'],
    hint: 'Match model size to task complexity.', feat: 'Foundry Models', ref: 'modelsOverview' });
  q({ id: 'AI103-D1-003', obj: '1.1.1', topic: 'Model selection', diff: 'intermediate', type: 'single', scenario: true,
    q: 'An insurer\'s app receives a photo of vehicle damage plus a typed description and must explain whether the damage matches the description. Which model capability is required?',
    opts: ['A multimodal (vision-enabled) model that accepts image and text input', 'A text-only small language model', 'An embeddings model', 'A text-to-speech voice'],
    ans: [0],
    exp: 'Vision-enabled generative models take images together with text, and can reason about what they see, for example whether an object is damaged.',
    why: ['', 'A text-only model can\'t look at the photo.', 'Embeddings models produce vectors for search. They don\'t generate explanations.', 'Text-to-speech produces audio, not image understanding.'],
    hint: 'Two kinds of input arrive together.', feat: 'Vision-enabled models', ref: 'vision' });
  q({ id: 'AI103-D1-004', obj: '1.1.1', topic: 'Model selection', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your chat app gets a mix of trivial questions and hard multistep problems. You want simple prompts served by small, fast models and hard ones by frontier models, without writing routing logic. What should you deploy?',
    opts: ['Model router', 'One provisioned deployment of the largest model', 'A batch deployment', 'Two deployments and a random 50/50 load balancer'],
    ans: [0],
    exp: 'Model router is a single deployment that picks the model best suited to each prompt. Simple prompts go to small, fast models, and prompts that need deep reasoning or complex tool use go to frontier models. You call one model name.',
    why: ['', 'One large model overspends on trivial prompts.', 'Batch is for asynchronous jobs with a 24-hour target, not interactive chat.', 'Random balancing ignores prompt complexity.'],
    hint: 'You want the platform to decide per prompt.', feat: 'Model router', ref: 'modelRouter' });

  // 1.1.2 Choose the appropriate Foundry services
  q({ id: 'AI103-D1-005', obj: '1.1.2', topic: 'Foundry services', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each requirement to the Foundry service that best fits it.',
    pairs: [
      ['Ground several agents in the same governed, multi-source company knowledge', 'Foundry IQ knowledge base'],
      ['Run a multistep business process with branching, loops and human input', 'Foundry workflows'],
      ['Extract fields from forms, images, video and audio into structured output', 'Azure Content Understanding'],
      ['Generate chat responses from a deployed model', 'Foundry Models with the Responses API'],
    ],
    exp: 'Foundry IQ knowledge bases give agents shared, permission-aware grounding. Workflows orchestrate nodes such as agents, logic and human input. Content Understanding analyses multimodal content into fields. Deployed Foundry Models generate responses through the Responses API.',
    hint: 'Think: knowledge, process, extraction, generation.', feat: 'Microsoft Foundry', ref: 'whatIsFoundry' });
  q({ id: 'AI103-D1-006', obj: '1.1.2', topic: 'Foundry services', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Five departmental agents each built their own RAG pipeline over overlapping SharePoint and Blob Storage content, and answers drift between them. What should you use so every agent shares one improved knowledge layer?',
    opts: ['A Foundry IQ knowledge base that all the agents connect to', 'A separate vector store per agent', 'Fine-tuning each agent\'s model on the documents', 'Larger context windows so each agent reads every document'],
    ans: [0],
    exp: 'Foundry IQ removes the need to build custom RAG for every agent. You create knowledge bases with knowledge sources such as SharePoint and Blob Storage, and any agent can use them. Improving a knowledge base benefits every connected agent.',
    why: ['', 'Per-agent stores keep the duplication that causes drift.', 'Fine-tuning shapes style and format. It isn\'t a reliable way to keep facts current.', 'Huge prompts are costly and still unmanaged per agent.'],
    hint: 'One shared knowledge layer, many consumers.', feat: 'Foundry IQ', ref: 'foundryIq' });
  q({ id: 'AI103-D1-007', obj: '1.1.2', topic: 'Foundry services', diff: 'easy', type: 'single', scenario: false,
    q: 'Which Foundry Tool provides prebuilt APIs for sentiment analysis, entity extraction and summarisation of text?',
    opts: ['Azure Language in Foundry Tools', 'Azure Speech in Foundry Tools', 'Azure Translator in Foundry Tools', 'Azure Document Intelligence in Foundry Tools'],
    ans: [0],
    exp: 'Azure Language provides models and APIs to analyse natural language text, including entity extraction, sentiment analysis and summarisation.',
    why: ['', 'Speech handles speech to text and text to speech.', 'Translator translates text between languages.', 'Document Intelligence extracts fields from documents such as invoices.'],
    hint: 'The input is plain text and you want insights from it.', feat: 'Foundry Tools', ref: 'foundryTools' });
  q({ id: 'AI103-D1-008', obj: '1.1.2', topic: 'Foundry services', diff: 'advanced', type: 'single', scenario: true,
    q: 'A product team needs an agent that answers time-sensitive questions about competitors\' public announcements, with citations. Training data is months old. Which capability should you add?',
    opts: ['A web grounding tool, such as the web search tool or Web IQ', 'A larger model with a later training cut-off', 'A Foundry IQ knowledge base over internal SharePoint only', 'A batch deployment'],
    ans: [0],
    exp: 'Web grounding retrieves current public evidence at run time, so the agent can answer time-sensitive questions without retraining. Clear grounding instructions and checking citations remain essential.',
    why: ['', 'Any model\'s training data still has a cut-off date.', 'Internal SharePoint doesn\'t contain competitors\' public news.', 'Batch is for large asynchronous jobs, not live web grounding.'],
    hint: 'The facts you need are public and new.', feat: 'Web search tool', ref: 'webSearchTool' });

  // 1.1.3 Choose an appropriate method for retrieval and indexing
  q({ id: 'AI103-D1-009', obj: '1.1.3', topic: 'Retrieval method', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Users search product manuals with both exact part numbers ("XR-4410") and natural-language questions ("why does the pump rattle?"). Which retrieval approach handles both best?',
    opts: ['Hybrid search that runs keyword and vector queries together and merges results with Reciprocal Rank Fusion', 'Vector search only', 'Keyword search only', 'Sending all manuals in every prompt'],
    ans: [0],
    exp: 'Hybrid search runs full-text and vector queries in parallel and merges them with Reciprocal Rank Fusion. Keyword matching catches exact identifiers, and vector similarity catches meaning.',
    why: ['', 'Vectors can miss exact identifiers such as part numbers.', 'Keyword search misses paraphrased questions.', 'Sending everything is costly and degrades answer quality.'],
    hint: 'Some queries need exact matches, others need meaning.', feat: 'Hybrid search', ref: 'hybridSearch' });
  q({ id: 'AI103-D1-010', obj: '1.1.3', topic: 'Retrieval method', diff: 'advanced', type: 'single', scenario: true,
    q: 'A complex question needs facts from several indexed sources and benefits from being split into focused sub-queries before retrieval. Which retrieval method is designed for this?',
    opts: ['Agentic retrieval through a knowledge base', 'A single vector query with a larger k', 'A scoring profile', 'Increasing the chunk size'],
    ans: [0],
    exp: 'Agentic retrieval orchestrates query-time work across the selected knowledge sources: it plans focused sub-queries, retrieves relevant content, enforces permissions and returns grounded results with citations.',
    why: ['', 'More results from one query doesn\'t decompose the question.', 'Scoring profiles boost fields. They don\'t plan sub-queries.', 'Bigger chunks change granularity, not query planning.'],
    hint: 'The question has several parts.', feat: 'Agentic retrieval', ref: 'agenticRetrieval' });
  q({ id: 'AI103-D1-011', obj: '1.1.3', topic: 'Retrieval method', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your index returns relevant chunks, but the best ones often appear fifth or sixth. You want a language-understanding model to reorder the top results by meaning. What should you enable?',
    opts: ['Semantic ranking', 'A larger vector dimension', 'An OCR skill', 'A knowledge store'],
    ans: [0],
    exp: 'Semantic ranking rescores an initial result set using language models that understand meaning, which moves the most relevant results to the top.',
    why: ['', 'Vector dimensions are fixed by the embedding model and don\'t rerank results.', 'OCR extracts text from images during indexing.', 'A knowledge store persists enrichment output. It doesn\'t rank queries.'],
    hint: 'Results are retrieved; their order is the problem.', feat: 'Semantic ranker', ref: 'semanticRanker' });
  q({ id: 'AI103-D1-012', obj: '1.1.3', topic: 'Retrieval method', diff: 'easy', type: 'single', scenario: true,
    q: 'A prototype agent must answer questions over 20 uploaded PDFs, and you don\'t want to manage a search service. Which tool fits?',
    opts: ['The file search tool with a vector store', 'An Azure AI Search indexer with a custom skillset', 'Code Interpreter', 'A fine-tuned model'],
    ans: [0],
    exp: 'The file search tool lets you upload files to a vector store and attach it to an agent, which then answers from those files. It suits small, self-contained document sets.',
    why: ['', 'A full indexing pipeline is more than a 20-file prototype needs.', 'Code Interpreter runs Python. It isn\'t built for document retrieval.', 'Fine-tuning doesn\'t give grounded answers with sources.'],
    hint: 'Small document set, minimal infrastructure.', feat: 'File search tool', ref: 'fileSearch' });

  // 1.1.4 memory, tool and knowledge integration services
  q({ id: 'AI103-D1-013', obj: '1.1.4', topic: 'Agent memory', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each memory type in Foundry Agent Service to what it stores.',
    pairs: [
      ['User profile memory', 'Durable preferences such as language or accessibility needs'],
      ['Chat summary memory', 'Distilled summaries of earlier conversation topics'],
      ['Procedural memory', 'Reusable how-to routines inferred from past interactions'],
    ],
    exp: 'Memory in Foundry Agent Service extracts three types of long-term memory. User profile memory is retrieved near the start of a conversation, chat summary memory per turn, and procedural memory when a recurring task comes up.',
    hint: 'Who the user is, what you discussed, how you do things.', feat: 'Agent memory', ref: 'memory' });
  q({ id: 'AI103-D1-014', obj: '1.1.4', topic: 'Agent tools', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Platform admins want to add, remove or update the tools that 30 agents use, without changing or redeploying agent code. What should they use?',
    opts: ['A toolbox that agents reach through one MCP-compatible endpoint, with versioning', 'A copy of each tool definition in every agent', 'A separate MCP server per agent', 'Hard-coded REST calls in each agent'],
    ans: [0],
    exp: 'A toolbox is a managed resource. Agents connect to one MCP-compatible endpoint, and admins manage tools centrally. Promoting a new default version makes it available to every consuming agent without code changes.',
    why: ['', 'Per-agent copies need 30 code changes for every update.', 'Separate servers multiply the work.', 'Hard-coded calls require redeployment.'],
    hint: 'One managed endpoint, versioned centrally.', feat: 'Toolbox', ref: 'toolbox' });
  q({ id: 'AI103-D1-015', obj: '1.1.4', topic: 'Agent tools', diff: 'intermediate', type: 'single', scenario: true,
    q: 'An agent must calculate statistics and draw a chart from an uploaded CSV file. Which built-in tool fits?',
    opts: ['Code Interpreter', 'File search', 'Web search', 'An OpenAPI tool'],
    ans: [0],
    exp: 'Code Interpreter lets the model write and run Python in a sandbox for calculations, data analysis and charts.',
    why: ['', 'File search retrieves passages. It doesn\'t compute statistics.', 'Web search finds public information.', 'An OpenAPI tool calls an existing HTTP API, which this task doesn\'t need.'],
    hint: 'The agent must run code.', feat: 'Code Interpreter', ref: 'codeInterpreter' });
  q({ id: 'AI103-D1-016', obj: '1.1.4', topic: 'Agent tools', diff: 'advanced', type: 'multi', scenario: true,
    q: 'An HR agent must look up leave balances in an internal REST API that already has an OpenAPI 3 specification, and must not store secrets in code. Which TWO choices fit?',
    opts: ['Add the API as an OpenAPI tool', 'Authenticate with a project managed identity connection that has the least-privileged role on the API', 'Paste the API key into the agent instructions', 'Use Code Interpreter to call the API'],
    ans: [0, 1],
    exp: 'OpenAPI tools connect existing HTTP APIs described by an OpenAPI specification. They support anonymous, API key and project managed identity authentication. A managed identity connection with a least-privileged role avoids secrets.',
    why: ['', '', 'Instructions are visible to the model and aren\'t a secret store.', 'Code Interpreter runs sandboxed Python and isn\'t the supported way to call your API.'],
    hint: 'There is a spec, and no secrets may be stored.', feat: 'OpenAPI tool', ref: 'openapi' });

  // 1.2.1 Design Azure infrastructure
  q({ id: 'AI103-D1-017', obj: '1.2.1', topic: 'Foundry architecture', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Three teams build separate AI apps. Security wants networking, security and model deployments governed in one place, while each team works in isolation. How should you structure Foundry?',
    opts: ['One Foundry resource for governance with a separate project per team', 'One project shared by all teams', 'A separate Azure subscription per developer', 'No Foundry resource, only individual model endpoints'],
    ans: [0],
    exp: 'Foundry uses a layered architecture: a top-level Foundry resource where you manage governance settings such as networking, security and model deployments, and projects for development isolation.',
    why: ['', 'A shared project removes isolation between teams.', 'Per-developer subscriptions fragment governance.', 'Loose endpoints lose central governance and project features.'],
    hint: 'Governance at the top, isolation underneath.', feat: 'Foundry architecture', ref: 'architecture' });
  q({ id: 'AI103-D1-018', obj: '1.2.1', topic: 'Foundry architecture', diff: 'advanced', type: 'single', scenario: true,
    q: 'Agents must reach private data sources and approved PaaS services without traffic leaving your network boundary. How does Foundry support this for agents?',
    opts: ['Virtual network injection of the agent client into a customer-managed subnet, using private endpoints', 'A public endpoint protected only by an API key', 'Running every agent on a developer laptop', 'Disabling all tools'],
    ans: [0],
    exp: 'For network isolation, Foundry injects the Agent client into a customer-managed virtual network subnet. Outbound calls to Azure PaaS resources go over private endpoints and Private Link, keeping traffic within your network boundaries.',
    why: ['', 'Keys don\'t keep traffic private.', 'Laptops aren\'t a production network design.', 'Removing tools removes the capability instead of securing it.'],
    hint: 'Where does the agent\'s outbound traffic start?', feat: 'Network isolation', ref: 'privateLink' });
  q({ id: 'AI103-D1-019', obj: '1.2.1', topic: 'Foundry architecture', diff: 'easy', type: 'single', scenario: false,
    q: 'In Foundry\'s architecture, which resources are typically connected to support projects with storage, search and secrets?',
    opts: ['Azure Storage, Azure AI Search and Azure Key Vault', 'Exchange Online, SharePoint and Teams', 'Azure Virtual Desktop and Intune', 'Azure DevOps boards'],
    ans: [0],
    exp: 'Foundry organises AI workloads into a top-level Foundry resource, projects, and connected Azure services for storage, search and secrets management.',
    why: ['', 'These are Microsoft 365 workloads, not Foundry dependencies.', 'These are device and desktop services.', 'Boards track work items.'],
    hint: 'Storage, search, secrets.', feat: 'Foundry architecture', ref: 'architecture' });

  // 1.2.2 Choose appropriate deployment options
  q({ id: 'AI103-D1-020', obj: '1.2.2', topic: 'Deployment types', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A European bank requires that inference data is processed only within the EU, but it wants higher default quota than a single-region deployment. Which deployment type fits?',
    opts: ['Data Zone Standard', 'Global Standard', 'Developer', 'Global Batch'],
    ans: [0],
    exp: 'Data Zone Standard routes traffic only to datacenters in the Microsoft-defined data zone (US, EU or APAC) and has higher default quota than geography-based types.',
    why: ['', 'Global types may process data in any Azure region.', 'Developer deployments are for evaluating fine-tuned models and have no SLA.', 'Global Batch may also process data in any region and is asynchronous.'],
    hint: 'EU-only processing, but more than one region.', feat: 'Deployment types', ref: 'deploymentTypes' });
  q({ id: 'AI103-D1-021', obj: '1.2.2', topic: 'Deployment types', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Each night you must classify 2 million product descriptions. Results are needed within a day, and cost matters more than latency. Which option fits?',
    opts: ['A Global Batch deployment', 'A provisioned deployment', 'A Global Standard deployment called synchronously', 'Model router'],
    ans: [0],
    exp: 'Batch processes large asynchronous jobs with a 24-hour target turnaround at 50% less cost than Global Standard, using a separate enqueued-token quota so online workloads aren\'t disrupted.',
    why: ['', 'Provisioned capacity suits steady high-volume online traffic and costs more for occasional bulk jobs.', 'Synchronous calls consume online quota and cost more.', 'Model router routes interactive prompts. It doesn\'t discount bulk jobs.'],
    hint: 'Large, non-interactive, cost-sensitive.', feat: 'Batch', ref: 'batch' });
  q({ id: 'AI103-D1-022', obj: '1.2.2', topic: 'Deployment types', diff: 'advanced', type: 'single', scenario: true,
    q: 'A contact-centre assistant has steady, high-volume traffic and needs predictable latency with reserved capacity. Which deployment category fits?',
    opts: ['Provisioned (for example Global or Data Zone Provisioned)', 'Standard pay-per-token only', 'Batch', 'Developer'],
    ans: [0],
    exp: 'Provisioned types reserve model processing capacity (PTUs) for predictable throughput and lower latency variance. Standard types are best-effort.',
    why: ['', 'Standard is best-effort and can return 429 under load.', 'Batch is asynchronous.', 'Developer has no SLA.'],
    hint: 'Reserved capacity, predictable latency.', feat: 'Provisioned throughput', ref: 'ptu' });
  q({ id: 'AI103-D1-023', obj: '1.2.2', topic: 'Deployment types', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your provisioned deployment occasionally hits 100% utilisation during spikes and returns 429 errors. You want overflow requests served automatically instead of failing. What should you configure?',
    opts: ['Spillover to a standard deployment in the same Foundry resource', 'A larger max_output_tokens value', 'A batch job for spikes', 'Disable rate limits'],
    ans: [0],
    exp: 'Spillover is an optional provisioned-deployment setting that routes overflow requests to a corresponding standard deployment in the same Foundry resource when the provisioned deployment is fully used.',
    why: ['', 'More output tokens increases load.', 'Batch isn\'t suitable for interactive traffic.', 'Rate limits can\'t be disabled.'],
    hint: 'Where should the overflow go?', feat: 'Spillover', ref: 'ptu' });

  // 1.2.3 Configure model and agent deployments
  q({ id: 'AI103-D1-024', obj: '1.2.3', topic: 'Agent deployment', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You change an agent\'s instructions and tools in code and want to keep the previous configuration available for rollback. Which Foundry SDK call creates the new configuration?',
    opts: ['project_client.agents.create_version(...) with a PromptAgentDefinition', 'openai_client.chat.completions.create(...)', 'project_client.get_openai_client()', 'DefaultAzureCredential()'],
    ans: [0],
    exp: 'In the Foundry SDK, agents are versioned: agents.create_version registers a new version of an agent from a definition such as PromptAgentDefinition (model, instructions, tools). Earlier versions remain available.',
    why: ['', 'Chat completions generate a response. They don\'t define an agent.', 'get_openai_client returns a client for inference.', 'This creates a credential, not an agent.'],
    hint: 'Agents in Foundry are versioned.', feat: 'Foundry SDK', ref: 'agentService' });
  q({ id: 'AI103-D1-025', obj: '1.2.3', topic: 'Agent deployment', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your team has existing agent code in a custom framework and wants Foundry to host and scale it. Which agent type fits?',
    opts: ['A hosted agent', 'A prompt agent', 'A Copilot Studio agent', 'A batch deployment'],
    ans: [0],
    exp: 'Foundry supports prompt agents, which you define and Foundry runs, and hosted agents, where you package your own code and Foundry hosts and scales it.',
    why: ['', 'Prompt agents are declarative definitions, not your packaged code.', 'Copilot Studio is a different platform.', 'Batch is a model deployment type for asynchronous jobs.'],
    hint: 'You bring the code; Foundry runs it.', feat: 'Hosted agents', ref: 'agentService' });
  q({ id: 'AI103-D1-026', obj: '1.2.3', topic: 'Model deployment', diff: 'easy', type: 'single', scenario: false,
    q: 'When you deploy a model in Foundry, which value do client applications use to call that specific deployment?',
    opts: ['The deployment name', 'The model provider\'s company name', 'The Azure subscription ID only', 'The region name'],
    ans: [0],
    exp: 'Applications reference a model deployment by its deployment name (for example, the model parameter in Responses API calls), together with the project or resource endpoint.',
    why: ['', 'The provider name doesn\'t identify a deployment.', 'A subscription can contain many deployments.', 'Many deployments can exist in one region.'],
    hint: 'What did you name it when you deployed it?', feat: 'Model deployments', ref: 'sdkOverview' });
  q({ id: 'AI103-D1-027', obj: '1.2.3', topic: 'Agent publishing', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You want a Foundry agent available to colleagues in Microsoft Teams and Microsoft 365 Copilot with minimal setup. What should you do?',
    opts: ['Publish it from the Foundry portal, which provisions Azure Bot Service and the Microsoft Entra registrations', 'Rebuild it in Power Automate', 'Email the agent endpoint to users', 'Deploy it as a batch job'],
    ans: [0],
    exp: 'Direct publishing from the Foundry portal provisions Azure Bot Service and creates the necessary Microsoft Entra ID registrations. You can publish with a shared scope for testing or an organisation scope for broad distribution.',
    why: ['', 'A rebuild is unnecessary.', 'Users can\'t consume a raw endpoint in Teams.', 'Batch doesn\'t make an agent conversational.'],
    hint: 'There is a direct publishing workflow.', feat: 'Publish to Microsoft 365', ref: 'publishCopilot' });

  // 1.2.4 CI/CD
  q({ id: 'AI103-D1-028', obj: '1.2.4', topic: 'CI/CD', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Every pull request that changes your Foundry agent must run quality and safety checks before merging. Which capability is designed for this?',
    opts: ['The Foundry evaluation GitHub Action for offline agent evaluation in CI/CD', 'Manual testing in the playground after release', 'A larger deployment', 'Turning on tracing only'],
    ans: [0],
    exp: 'The GitHub Action enables offline evaluation of Foundry agents within CI/CD pipelines, so you find problems and improve before an update reaches production.',
    why: ['', 'Testing after release finds problems too late.', 'Capacity doesn\'t evaluate quality.', 'Tracing records behaviour but doesn\'t gate a pull request.'],
    hint: 'Shift evaluation left into the pipeline.', feat: 'Evaluation in CI/CD', ref: 'evalGithubAction' });
  q({ id: 'AI103-D1-029', obj: '1.2.4', topic: 'CI/CD', diff: 'advanced', type: 'order', scenario: false,
    q: 'Put a typical CI/CD flow for a Foundry agent change in order.',
    opts: ['Commit the agent definition and evaluation dataset to source control', 'The pipeline creates a new agent version in a test project', 'The pipeline runs evaluations (quality and safety) against the new version', 'Promote or publish the version only if evaluation thresholds pass'],
    exp: 'Treat agent definitions and test data as code, create a new version in a non-production project, evaluate it automatically, and promote only when results meet your thresholds.',
    hint: 'Version, test, gate, release.', feat: 'Evaluation in CI/CD', ref: 'evalGithubAction' });
  q({ id: 'AI103-D1-030', obj: '1.2.4', topic: 'CI/CD', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your pipeline must call Foundry without storing secrets. Which authentication approach fits?',
    opts: ['Microsoft Entra ID with a workload identity, such as a federated credential or managed identity, granted a Foundry role', 'An API key in a pipeline variable visible in logs', 'A personal account password', 'No authentication'],
    ans: [0],
    exp: 'Keyless authentication with Microsoft Entra ID avoids secrets. The pipeline\'s workload identity gets a least-privileged Foundry role, and the Foundry SDK authenticates with token credentials.',
    why: ['', 'Keys are secrets that can leak.', 'Personal credentials break least privilege and fail with MFA.', 'Foundry requires authentication.'],
    hint: 'No secrets in the pipeline.', feat: 'Keyless authentication', ref: 'rbac' });

  // 1.3.1 quotas, scaling, rate limits and costs
  q({ id: 'AI103-D1-031', obj: '1.3.1', topic: 'Quotas', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your app sends bursts of 30 requests in the first second of each minute to a deployment rated 600 RPM, and some requests return 429 even though the per-minute total is under 600. Why?',
    opts: ['Rate limits are evaluated over short intervals, such as 1 or 10 seconds, so bursts exceed the expected rate', 'RPM limits only apply to batch deployments', 'The deployment is in the wrong region', 'Each request also needs its own quota approval'],
    ans: [0],
    exp: 'The rate limit expects requests to be evenly distributed. Azure OpenAI evaluates the incoming rate over short periods, so a 600-RPM deployment allows about 10 requests per second. Bursts above that get 429.',
    why: ['', 'RPM applies to online deployments.', 'Region doesn\'t cause burst throttling.', 'There is no per-request approval.'],
    hint: 'Spread the requests out.', feat: 'Rate limits', ref: 'quota' });
  q({ id: 'AI103-D1-032', obj: '1.3.1', topic: 'Quotas', diff: 'easy', type: 'single', scenario: false,
    q: 'When a standard deployment reaches its tokens-per-minute (TPM) limit, what does the client receive?',
    opts: ['HTTP 429 until token capacity becomes available', 'HTTP 500 for the rest of the day', 'Silently truncated responses', 'A redirect to another model'],
    ans: [0],
    exp: 'The assigned TPM is enforced as a rate limit. Further requests receive HTTP 429 until capacity is available, so clients should retry with backoff.',
    why: ['', '500 indicates a server error, not throttling.', 'Responses aren\'t silently truncated because of quota.', 'There is no automatic redirect unless you configure spillover for provisioned deployments.'],
    hint: 'Throttling has its own status code.', feat: 'Quota', ref: 'quota' });
  q({ id: 'AI103-D1-033', obj: '1.3.1', topic: 'Quotas', diff: 'intermediate', type: 'multi', scenario: true,
    q: 'Your chat app keeps hitting 429 errors at peak. Which TWO actions address this directly?',
    opts: ['Implement retry with exponential backoff, honouring retry-after where provided', 'Request more quota (TPM) or move the deployment to a type with higher default quota, such as Global Standard', 'Lower the temperature parameter', 'Turn off content filters'],
    ans: [0, 1],
    exp: 'Retries with backoff smooth over short throttling, and more quota (or a type with higher default quota) raises the ceiling. Global Standard offers the highest default quota.',
    why: ['', '', 'Temperature changes randomness, not throughput.', 'Safety filters don\'t cause rate limiting.'],
    hint: 'Handle throttling, then raise the limit.', feat: 'Quota', ref: 'quota' });
  q({ id: 'AI103-D1-034', obj: '1.3.1', topic: 'Cost', diff: 'advanced', type: 'single', scenario: true,
    q: 'A summarisation agent\'s costs doubled after a prompt change, while traffic stayed flat. What should you check first?',
    opts: ['Token usage per request in traces or the monitoring dashboard, especially input and output tokens', 'The number of Foundry projects', 'The Azure region\'s time zone', 'The agent\'s display name'],
    ans: [0],
    exp: 'Cost tracks tokens. Token analytics in traces and the Agent Monitoring Dashboard show whether the new prompt increased input or output tokens per request.',
    why: ['', 'Project count doesn\'t drive token cost.', 'Time zone is irrelevant.', 'Names don\'t affect cost.'],
    hint: 'What do you pay for?', feat: 'Token analytics', ref: 'agentMonitoring' });

  // 1.3.2 Monitor model performance, drift, safety events and grounding quality
  q({ id: 'AI103-D1-035', obj: '1.3.2', topic: 'Monitoring', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You need ongoing visibility into token usage, latency, success rates and evaluation results for an agent\'s production traffic. Where should you look?',
    opts: ['The Agent Monitoring Dashboard in Foundry', 'The model catalog', 'The Azure pricing calculator', 'The agent\'s instructions'],
    ans: [0],
    exp: 'The Agent Monitoring Dashboard tracks operational metrics and evaluation results for agents, including token usage, latency, success rates and evaluation outcomes for production traffic.',
    why: ['', 'The catalog lists models to deploy.', 'The calculator estimates prices before deployment.', 'Instructions define behaviour, not telemetry.'],
    hint: 'Operational metrics plus evaluations, in production.', feat: 'Agent monitoring', ref: 'agentMonitoring' });
  q({ id: 'AI103-D1-036', obj: '1.3.2', topic: 'Monitoring', diff: 'advanced', type: 'single', scenario: true,
    q: 'Users say a RAG app\'s answers increasingly include claims not found in the retrieved documents. Which evaluator directly measures this in production samples?',
    opts: ['Groundedness', 'Fluency', 'BLEU', 'Coherence'],
    ans: [0],
    exp: 'Groundedness measures how well the response is grounded in the retrieved context. A falling groundedness score signals fabrication.',
    why: ['', 'Fluency measures readability, not factual support.', 'BLEU compares text with a reference translation.', 'Coherence measures logical flow, not support from sources.'],
    hint: 'Is the answer supported by the context?', feat: 'Evaluators', ref: 'builtInEvaluators' });
  q({ id: 'AI103-D1-037', obj: '1.3.2', topic: 'Monitoring', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Leadership wants to know whether production responses are drifting in quality and safety over time, not just once at launch. What is the right approach?',
    opts: ['Run continuous evaluations on sampled production traffic and track the results over time', 'Evaluate once before launch and never again', 'Only count requests', 'Ask users to email complaints'],
    ans: [0],
    exp: 'Observability in Foundry includes evaluating production traffic continuously, so changes in quality or safety show up as trends you can act on.',
    why: ['', 'One-off evaluation can\'t show drift.', 'Volume says nothing about quality.', 'Complaints are anecdotal and late.'],
    hint: 'Drift is a trend over time.', feat: 'Observability', ref: 'observability' });

  // 1.3.3 Monitor data ingestion quality, search index health and relevance
  q({ id: 'AI103-D1-038', obj: '1.3.3', topic: 'Index health', diff: 'intermediate', type: 'single', scenario: true,
    q: 'New documents stopped appearing in search results two days ago. Where should you look first?',
    opts: ['The indexer status and execution history, including errors and warnings', 'The semantic ranker configuration', 'The model deployment\'s temperature', 'The agent\'s display name'],
    ans: [0],
    exp: 'Monitor indexer status in the Azure portal or with the Get Indexer Status API. Execution history shows failed runs, errors and warnings that explain missing documents.',
    why: ['', 'Ranking can\'t surface documents that were never indexed.', 'Temperature affects generation, not indexing.', 'Names don\'t affect ingestion.'],
    hint: 'Were the documents ingested at all?', feat: 'Indexers', ref: 'indexers' });
  q({ id: 'AI103-D1-039', obj: '1.3.3', topic: 'Relevance', diff: 'advanced', type: 'single', scenario: true,
    q: 'After changing the chunking strategy, you want to measure whether retrieval still finds the right passages for a labelled set of questions. Which evaluator fits?',
    opts: ['Document Retrieval (or Retrieval) evaluation against ground truth', 'Fluency', 'Code Vulnerability', 'Violence'],
    ans: [0],
    exp: 'Document Retrieval measures the accuracy of retrieval results given ground truth, and Retrieval measures how effectively relevant information is retrieved. Both target the search step, not the generated answer.',
    why: ['', 'Fluency rates writing quality.', 'Code Vulnerability inspects generated code.', 'Violence is a safety evaluator.'],
    hint: 'Measure the search step, not the prose.', feat: 'RAG evaluators', ref: 'builtInEvaluators' });
  q({ id: 'AI103-D1-040', obj: '1.3.3', topic: 'Relevance', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Results from the "title" field should count more than matches in the body text. What should you configure in the index?',
    opts: ['A scoring profile that boosts the title field', 'A larger embeddings model', 'An OCR skill', 'Spillover'],
    ans: [0],
    exp: 'Scoring profiles boost specific fields or attributes to surface more relevant results.',
    why: ['', 'Embedding size doesn\'t weight specific fields.', 'OCR extracts text from images.', 'Spillover is a deployment setting.'],
    hint: 'Weight one field more heavily.', feat: 'Scoring profiles', ref: 'scoringProfiles' });

  // 1.3.4 Configure security
  q({ id: 'AI103-D1-041', obj: '1.3.4', topic: 'Security', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A developer must build and run agents in a Foundry project, but must not manage the Foundry resource or assign roles broadly. Which built-in role fits?',
    opts: ['Foundry User (previously Azure AI User)', 'Foundry Account Owner', 'Owner on the subscription', 'Cognitive Services Contributor'],
    ans: [0],
    exp: 'Foundry User grants reader access to the project and resource plus the data actions for building in the project. Microsoft recently renamed the Foundry roles; Azure AI User is the previous name. Microsoft advises against the Cognitive Services roles for Foundry scenarios.',
    why: ['', 'Account Owner manages projects and resources, which is more than needed.', 'Subscription Owner is far too broad.', 'Cognitive Services roles target AI Services resources directly and don\'t apply to Foundry scenarios.'],
    hint: 'Least privilege for a builder.', feat: 'Foundry RBAC', ref: 'rbac' });
  q({ id: 'AI103-D1-042', obj: '1.3.4', topic: 'Security', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Security requires that no Foundry Tools call can use an API key. What should you configure?',
    opts: ['Disable local authentication so only Microsoft Entra ID authentication is accepted', 'Rotate keys every week', 'Store keys in a config file', 'Use HTTP instead of HTTPS'],
    ans: [0],
    exp: 'Disabling local authentication enforces Microsoft Entra authentication and centralised identity control instead of keys.',
    why: ['', 'Rotation still allows key use.', 'Keys in files are a leak risk.', 'HTTP weakens security.'],
    hint: 'Turn keys off altogether.', feat: 'Keyless authentication', ref: 'disableLocalAuth' });
  q({ id: 'AI103-D1-043', obj: '1.3.4', topic: 'Security', diff: 'advanced', type: 'single', scenario: true,
    q: 'A Foundry project must be reachable only from your corporate network, with no public internet access. What should you configure?',
    opts: ['Set public network access to Disabled and use a private endpoint', 'Allow all networks and rely on keys', 'Enable CORS for all origins', 'Change the region'],
    ans: [0],
    exp: 'The public network access (PNA) flag controls inbound access. Disabled requires a private endpoint, and "Enabled from selected IP addresses" is a middle option.',
    why: ['', 'Keys don\'t restrict network paths.', 'CORS concerns browsers, not network isolation.', 'Region doesn\'t make a resource private.'],
    hint: 'Block public access, then add a private path.', feat: 'Network isolation', ref: 'privateLink' });
  q({ id: 'AI103-D1-044', obj: '1.3.4', topic: 'Security', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your Python app running on Azure must call a Foundry project without keys. Which code pattern fits?',
    opts: ['AIProjectClient(endpoint=..., credential=DefaultAzureCredential()) with the app\'s managed identity granted a Foundry role', 'Hard-code the key in the source', 'Pass the subscription ID as the credential', 'Use anonymous access'],
    ans: [0],
    exp: 'The Foundry SDK accepts token credentials. DefaultAzureCredential picks up the app\'s managed identity in Azure, or your az login session locally.',
    why: ['', 'Hard-coded keys leak.', 'A subscription ID isn\'t a credential.', 'Projects require authentication.'],
    hint: 'Let the identity library find a token.', feat: 'Foundry SDK', ref: 'sdkOverview' });

  // 1.4.1 safety filters, guardrails, risk detection, content moderation
  q({ id: 'AI103-D1-045', obj: '1.4.1', topic: 'Guardrails', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each guardrail intervention point to what it scans.',
    pairs: [
      ['User input', 'The prompt sent to the model or agent'],
      ['Tool call (agents only)', 'The action and data the agent proposes to send to a tool'],
      ['Tool response (agents only)', 'The content returned from a tool to the agent'],
      ['Output', 'The final completion returned to the user'],
    ],
    exp: 'Guardrails consist of controls. Each control defines a risk to detect, the intervention points to scan and the action to take. Tool call and tool response apply to agents only and are in preview.',
    hint: 'Follow the data from user to tool and back.', feat: 'Guardrails', ref: 'guardrails' });
  q({ id: 'AI103-D1-046', obj: '1.4.1', topic: 'Guardrails', diff: 'advanced', type: 'single', scenario: true,
    q: 'For the Violence risk, you want to block only high-severity content and allow low and medium. Which blocking level should the control use?',
    opts: ['Low', 'Medium', 'High', 'Off'],
    ans: [0],
    exp: 'Blocking levels name how sensitive the control is. Low blocks high-severity content only and is the least restrictive. Medium blocks medium and high, and High blocks low, medium and high.',
    why: ['', 'Medium also blocks medium-severity content.', 'High blocks every severity level.', 'Off blocks nothing, though detection can still be annotated.'],
    hint: 'The level names the threshold, not the content severity.', feat: 'Blocking levels', ref: 'guardrails' });
  q({ id: 'AI103-D1-047', obj: '1.4.1', topic: 'Guardrails', diff: 'advanced', type: 'single', scenario: true,
    q: 'An agent uses a model that has a strict guardrail, and the agent is assigned a different, more permissive guardrail. Which guardrail determines what is detected for the agent?',
    opts: ['The agent\'s guardrail, which fully overrides the model\'s guardrail', 'The model\'s guardrail always wins', 'Both apply and the stricter one wins', 'Neither; agents have no guardrails'],
    ans: [0],
    exp: 'Risks are detected in an agent based on the guardrail assigned to the agent, not the guardrail of its underlying model. The agentic guardrail fully overrides the model\'s guardrail.',
    why: ['', 'The model guardrail applies to direct model use, not the agent.', 'There is no automatic "stricter wins" merge.', 'Agents in Foundry Agent Service support guardrails.'],
    hint: 'Check which resource the guardrail is assigned to.', feat: 'Agent guardrails', ref: 'guardrails' });
  q({ id: 'AI103-D1-048', obj: '1.4.1', topic: 'Guardrails', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Users try to override your assistant\'s system instructions with "ignore all previous instructions" prompts. Which capability detects these user prompt attacks?',
    opts: ['Prompt Shields', 'Protected material detection', 'Groundedness detection', 'Semantic ranking'],
    ans: [0],
    exp: 'Prompt Shields detect user prompt attacks (jailbreaks) and document attacks (indirect prompt injection) before they reach the model.',
    why: ['', 'Protected material finds copyrighted text or code in outputs.', 'Groundedness checks responses against sources.', 'Semantic ranking orders search results.'],
    hint: 'The attack is in the user\'s prompt.', feat: 'Prompt Shields', ref: 'promptShields' });

  // 1.4.2 Responsible AI instrumentation
  q({ id: 'AI103-D1-049', obj: '1.4.2', topic: 'Evaluators', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each evaluator to what it measures.',
    pairs: [
      ['Coherence', 'Logical consistency and flow of responses'],
      ['Relevance', 'How relevant the response is to the query'],
      ['Indirect Attack (XPIA)', 'Whether the response fell for an injection hidden in retrieved context'],
      ['Ungrounded Attributes', 'Fabricated or erroneous information inferred about users'],
    ],
    exp: 'Foundry\'s built-in evaluators cover general quality (coherence, fluency), RAG quality (groundedness, relevance, retrieval) and risk and safety (for example indirect attack and ungrounded attributes).',
    hint: 'Quality versus safety evaluators.', feat: 'Built-in evaluators', ref: 'builtInEvaluators' });
  q({ id: 'AI103-D1-050', obj: '1.4.2', topic: 'Evaluators', diff: 'advanced', type: 'single', scenario: true,
    q: 'You want a pass/fail groundedness check without deploying a judge model. Which evaluator fits?',
    opts: ['Groundedness Pro, which uses Azure AI Content Safety', 'Groundedness, which uses a model-based judgment', 'Fluency', 'F1 score'],
    ans: [0],
    exp: 'Groundedness Pro (preview) uses Azure AI Content Safety and returns a binary pass/fail without requiring a model deployment. The standard Groundedness evaluator returns a 1–5 score using a model-based judgment.',
    why: ['', 'Standard Groundedness needs a judge model deployment.', 'Fluency doesn\'t test grounding.', 'F1 compares tokens with a reference answer.'],
    hint: 'No judge model available.', feat: 'Groundedness Pro', ref: 'builtInEvaluators' });
  q({ id: 'AI103-D1-051', obj: '1.4.2', topic: 'Red teaming', diff: 'advanced', type: 'single', scenario: true,
    q: 'Before launch, you want to automatically probe your app with adversarial attack strategies and get an Attack Success Rate. What should you use?',
    opts: ['The AI Red Teaming Agent, which uses PyRIT attack strategies and safety evaluations', 'Model router', 'The batch API', 'Semantic ranking'],
    ans: [0],
    exp: 'The AI Red Teaming Agent builds on Microsoft\'s open-source PyRIT framework and Foundry\'s risk and safety evaluations. It probes your system and scores attack-response pairs to produce metrics such as Attack Success Rate (ASR).',
    why: ['', 'Model router chooses models.', 'Batch runs bulk inference.', 'Semantic ranking orders search results.'],
    hint: 'Automated adversarial probing.', feat: 'AI Red Teaming Agent', ref: 'redTeaming' });
  q({ id: 'AI103-D1-052', obj: '1.4.2', topic: 'Evaluators', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your coding assistant generates Python snippets for customers. Which evaluator should you add to catch insecure code?',
    opts: ['Code Vulnerability', 'Coherence', 'Relevance', 'Response Completeness'],
    ans: [0],
    exp: 'The Code Vulnerability evaluator identifies security issues in generated code.',
    why: ['', 'Coherence checks flow.', 'Relevance checks answer-to-question fit.', 'Completeness checks missing information against ground truth.'],
    hint: 'The risk is in the code itself.', feat: 'Safety evaluators', ref: 'builtInEvaluators' });

  // 1.4.3 Auditing: trace logging, provenance metadata, approval workflows
  q({ id: 'AI103-D1-053', obj: '1.4.3', topic: 'Tracing', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You need traces of every agent run, with the least effort and no code changes, for any agent hosted in Foundry. What should you do?',
    opts: ['Connect an Application Insights resource to the project to enable server-side tracing', 'Add print statements to the agent', 'Export the model weights', 'Turn on batch mode'],
    ans: [0],
    exp: 'Server-side tracing is the recommended starting point. Foundry enables it automatically after you connect Application Insights to the project, with no code changes. Add client-side instrumentation later for your own application code.',
    why: ['', 'Print statements aren\'t structured, central traces.', 'Weights have nothing to do with tracing.', 'Batch is a deployment type.'],
    hint: 'Connect a telemetry store.', feat: 'Tracing', ref: 'tracing' });
  q({ id: 'AI103-D1-054', obj: '1.4.3', topic: 'Provenance', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Compliance asks how people can verify that an image was generated by your app\'s Azure OpenAI image model. What provides this?',
    opts: ['Content Credentials based on the C2PA specification, included with generated images', 'The image file name', 'An EXIF comment you add manually', 'The Azure region'],
    ans: [0],
    exp: 'AI-generated images from Azure OpenAI include Content Credentials, a tamper-evident way to disclose the origin and history of content, based on the C2PA open specification.',
    why: ['', 'File names are easily changed.', 'Manual comments aren\'t tamper-evident.', 'Regions don\'t mark content.'],
    hint: 'Tamper-evident provenance metadata.', feat: 'Content Credentials', ref: 'contentCredentials' });
  q({ id: 'AI103-D1-055', obj: '1.4.3', topic: 'Approvals', diff: 'advanced', type: 'single', scenario: true,
    q: 'An agent connects to an MCP server whose tools can change customer records. Every call to those tools must be approved by a person and recorded. What should you configure?',
    opts: ['require_approval set to always on the MCP tool, with the approval decision submitted by your app and captured in traces', 'A longer timeout', 'A larger model', 'Fewer instructions'],
    ans: [0],
    exp: 'MCP tools support approval settings. With require_approval set to always, the run pauses until your app submits an approval, and tracing records the tool calls. Microsoft recommends requiring approval for high-risk operations, especially tools that write data.',
    why: ['', 'Timeouts don\'t add human approval.', 'Model size doesn\'t create an approval flow.', 'Instructions alone aren\'t an enforceable control.'],
    hint: 'Pause the tool call until a person approves.', feat: 'MCP approvals', ref: 'mcp' });

  // 1.4.4 Govern agent behaviour: oversight modes, constraints, tool-access controls
  q({ id: 'AI103-D1-056', obj: '1.4.4', topic: 'Tool access', diff: 'advanced', type: 'single', scenario: true,
    q: 'An MCP server exposes 25 tools, but your agent should only ever use the three read-only ones. Which control limits this?',
    opts: ['Set allowed_tools on the MCP tool to the three read-only tools', 'Describe the restriction in the user prompt', 'Increase max_output_tokens', 'Disable tracing'],
    ans: [0],
    exp: 'allowed_tools restricts which tools from an MCP server the agent can use. Microsoft advises reviewing allowed_tools, approval settings and connection permissions when the server changes, and treating provider descriptions as untrusted.',
    why: ['', 'A prompt isn\'t an enforced boundary.', 'Token limits don\'t restrict tools.', 'Tracing records behaviour; it doesn\'t restrict it.'],
    hint: 'An allow list on the tool definition.', feat: 'MCP tool access', ref: 'mcp' });
  q({ id: 'AI103-D1-057', obj: '1.4.4', topic: 'Oversight', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Which statement reflects Microsoft\'s guidance on trusting MCP server tool descriptions?',
    opts: ['Treat provider-supplied descriptions as untrusted input and enforce permissions and approvals independently of the model', 'Tool descriptions are verified by Microsoft and can be trusted', 'Descriptions control the agent\'s permissions', 'Descriptions are ignored by the model'],
    ans: [0],
    exp: 'Microsoft advises connecting only to trusted providers, reviewing changes, and enforcing permissions and approval requirements independently of model-generated decisions.',
    why: ['', 'Descriptions aren\'t a security guarantee.', 'Permissions come from connections and roles, not descriptions.', 'The model uses descriptions to decide when to call tools.'],
    hint: 'Assume the description could be malicious.', feat: 'MCP security', ref: 'mcp' });
  q({ id: 'AI103-D1-058', obj: '1.4.4', topic: 'Oversight', diff: 'advanced', type: 'single', scenario: true,
    q: 'An agent proposes to send customer data to an external tool. You want harmful or sensitive content in that proposed tool call detected before it leaves. Which guardrail intervention point applies?',
    opts: ['Tool call', 'User input', 'Output', 'None; guardrails can\'t see tool calls'],
    ans: [0],
    exp: 'The tool call intervention point (preview, agents only) scans the action and data the agent proposes to send to a tool, so a control can act before the call executes.',
    why: ['', 'User input scans the prompt, not the agent\'s tool call.', 'Output scans the final response.', 'Agent guardrails support tool call and tool response points.'],
    hint: 'Scan what the agent is about to send.', feat: 'Guardrails', ref: 'guardrails' });
  q({ id: 'AI103-D1-059', obj: '1.4.4', topic: 'Oversight', diff: 'intermediate', type: 'multi', scenario: true,
    q: 'A semiautonomous procurement agent can raise purchase orders. Which TWO controls keep a human in charge of high-impact actions?',
    opts: ['Require approval before the tool that submits orders runs', 'Limit the agent to the specific tools it needs', 'Give the agent Owner rights on the subscription', 'Remove tracing to reduce latency'],
    ans: [0, 1],
    exp: 'Human approval for high-impact tools and least-privilege tool access constrain what the agent can do on its own. Tracing should stay on for auditing.',
    why: ['', '', 'Broad rights increase the blast radius.', 'Tracing supports oversight and auditing.'],
    hint: 'Approve, and limit.', feat: 'Agent oversight', ref: 'mcp' });
})();
