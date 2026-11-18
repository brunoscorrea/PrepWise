/* AI-103 practice questions — Domain 2: Implement generative AI and agentic solutions (30–35%).
   Original learning content, not Microsoft exam questions. Verified against the official study
   guide and Microsoft Learn on 2026-11-19 ("verified" on each question). */
'use strict';
(() => {
  const V = '2026-11-19';
  const q = (o) => window.AI103.questions.push({ verified: V, ...o });

  // 2.1.1 Deploy and consume LLMs, small models, code models and multimodal models
  q({ id: 'AI103-D2-001', obj: '2.1.1', topic: 'Consume models', diff: 'easy', type: 'single', scenario: false,
    q: 'In Python, which call sends a prompt to a deployed model using the OpenAI Responses API?',
    opts: ['openai_client.responses.create(model="<deployment>", input="...")', 'project_client.agents.create_version(...)', 'openai_client.files.create(...)', 'DefaultAzureCredential().get_token(...)'],
    ans: [0],
    exp: 'The Responses API generates a response with responses.create, where model is the deployment name and input is the prompt or a list of messages.',
    why: ['', 'create_version defines an agent version; it doesn\'t generate a one-off response.', 'files.create uploads a file.', 'get_token obtains a credential token, not a response.'],
    hint: 'The API is named after what it returns.', feat: 'Responses API', ref: 'responses' });
  q({ id: 'AI103-D2-002', obj: '2.1.1', topic: 'Consume models', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You send an image of a whiteboard diagram and ask a vision-enabled model to explain it. How do you include the image in a Responses API request?',
    opts: ['As an image content part in the input message, either a URL or base64 data, alongside the text part', 'As the instructions parameter', 'As a file in Code Interpreter only', 'You can\'t send images to generative models'],
    ans: [0],
    exp: 'Vision-enabled models accept messages that combine text and image content parts. The image can be referenced by URL or embedded as base64 data.',
    why: ['', 'Instructions set behaviour; they don\'t carry the image.', 'Code Interpreter isn\'t required to view an image.', 'Vision-enabled models accept image input.'],
    hint: 'One message, two kinds of content.', feat: 'Vision-enabled models', ref: 'vision' });
  q({ id: 'AI103-D2-003', obj: '2.1.1', topic: 'Consume models', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A developer tool needs high-quality code generation and refactoring suggestions. How should you pick the model?',
    opts: ['Filter the Foundry model catalog by capability and compare candidates with benchmarks and your own evaluations', 'Pick the cheapest model in the catalog', 'Use an embeddings model', 'Use a speech model'],
    ans: [0],
    exp: 'The model catalog can be filtered by capabilities, deployment options and other attributes, and benchmarks compare quality, safety, cost and performance. Validate the shortlist with your own evaluation data.',
    why: ['', 'Price alone ignores quality for code tasks.', 'Embeddings models return vectors, not code.', 'Speech models handle audio.'],
    hint: 'Filter, compare, then test.', feat: 'Model catalog', ref: 'modelsOverview' });
  q({ id: 'AI103-D2-004', obj: '2.1.1', topic: 'Consume models', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your app streams a model\'s answer token by token to a chat UI. Which Responses API option enables this?',
    opts: ['stream=True, then iterate over the returned events', 'previous_response_id', 'max_output_tokens=1', 'store=False'],
    ans: [0],
    exp: 'Setting stream=True returns server-sent events that you iterate over to display output as it is generated.',
    why: ['', 'previous_response_id chains turns of a conversation.', 'Limiting output to one token truncates the answer.', 'store controls whether the response is stored, not streaming.'],
    hint: 'Events instead of one final payload.', feat: 'Responses API', ref: 'responses' });

  // 2.1.2 Implement RAG in an application
  q({ id: 'AI103-D2-005', obj: '2.1.2', topic: 'RAG', diff: 'easy', type: 'order', scenario: false,
    q: 'Put the steps of a basic retrieval-augmented generation request in order.',
    opts: ['Receive the user question', 'Retrieve relevant passages from the index', 'Add the passages to the prompt as grounding context', 'Generate the answer with citations to the retrieved sources'],
    exp: 'RAG retrieves relevant information, augments the prompt with it and generates a grounded response, which gives factual grounding and source transparency.',
    hint: 'Retrieve, augment, generate.', feat: 'RAG', ref: 'foundryIq' });
  q({ id: 'AI103-D2-006', obj: '2.1.2', topic: 'RAG', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A travel agency wants answers about its hotel catalogue to be factually accurate and current as prices change daily. Which strategy addresses accuracy?',
    opts: ['Ground the model with RAG over the live catalogue', 'Fine-tune the model on last month\'s catalogue', 'Raise the temperature', 'Shorten the system message'],
    ans: [0],
    exp: 'Microsoft\'s guidance: start with prompt engineering, add RAG when factual accuracy needs domain-specific data, and consider fine-tuning for consistent style and format. RAG keeps answers tied to current data.',
    why: ['', 'Fine-tuned knowledge goes stale as prices change.', 'Higher temperature increases randomness.', 'A shorter system message doesn\'t add facts.'],
    hint: 'The facts change daily.', feat: 'RAG', ref: 'promptEngineering' });
  q({ id: 'AI103-D2-007', obj: '2.1.2', topic: 'RAG', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your RAG app answers well, but users must only see content they\'re permitted to access in SharePoint. Which retrieval approach supports permission-aware answers?',
    opts: ['A Foundry IQ knowledge base, which enforces user permissions during agentic retrieval', 'Copying all files into one public container', 'Disabling citations', 'Using a larger model'],
    ans: [0],
    exp: 'Foundry IQ knowledge bases provide permission-aware responses: agentic retrieval enforces user permissions and returns grounded answers with citations.',
    why: ['', 'Copying content strips its permissions.', 'Hiding citations doesn\'t restrict content.', 'Model size has nothing to do with access control.'],
    hint: 'Who is allowed to see the source?', feat: 'Foundry IQ', ref: 'foundryIq' });
  q({ id: 'AI103-D2-008', obj: '2.1.2', topic: 'RAG', diff: 'intermediate', type: 'multi', scenario: true,
    q: 'Your RAG chatbot sometimes answers from general knowledge instead of the retrieved policy documents. Which TWO changes help?',
    opts: ['Instruct the model to answer only from the provided sources and to say when the answer isn\'t found', 'Evaluate groundedness on sample conversations to measure the problem', 'Increase temperature to 1.0', 'Remove the retrieved passages from the prompt'],
    ans: [0, 1],
    exp: 'Clear grounding instructions constrain the model to the sources, and groundedness evaluation measures whether responses are supported by the retrieved context.',
    why: ['', '', 'Higher temperature makes answers more random.', 'Removing passages leaves nothing to ground on.'],
    hint: 'Instruct, then measure.', feat: 'Grounding', ref: 'builtInEvaluators' });
  q({ id: 'AI103-D2-009', obj: '2.1.2', topic: 'RAG', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your app queries an Azure AI Search index with hybrid search. Answers improve when the top results are reordered by meaning before you add them to the prompt. What do you add?',
    opts: ['Semantic ranking on the hybrid results', 'A second embeddings model', 'Code Interpreter', 'A scoring profile on the vector field'],
    ans: [0],
    exp: 'Semantic ranking reranks an initial result set, including hybrid results, using models that understand meaning, which gives the generator the most relevant context.',
    why: ['', 'Another embedding model doesn\'t rerank results.', 'Code Interpreter runs code.', 'Scoring profiles boost fields; they aren\'t a semantic reranker.'],
    hint: 'Rerank before you augment.', feat: 'Semantic ranker', ref: 'semanticRanker' });

  // 2.1.3 Design workflows, tool-augmented flows and multistep reasoning pipelines
  q({ id: 'AI103-D2-010', obj: '2.1.3', topic: 'Workflows', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A support triage process must route tickets by an agent\'s structured output, escalate low-confidence cases to a person and loop over attachments. Which Foundry capability fits?',
    opts: ['A Foundry workflow combining agent nodes, logic, variables and human-in-the-loop steps', 'A single prompt with a longer system message', 'A batch deployment', 'Semantic ranking'],
    ans: [0],
    exp: 'Foundry workflows combine agents, conditional logic and human-in-the-loop escalation. Agent outputs are captured in variables that drive routing, escalation or loops, with Power Fx for expressions.',
    why: ['', 'One prompt can\'t enforce routing and escalation reliably.', 'Batch is for bulk asynchronous inference.', 'Semantic ranking orders search results.'],
    hint: 'Branches, loops and a human step.', feat: 'Foundry workflows', ref: 'workflows' });
  q({ id: 'AI103-D2-011', obj: '2.1.3', topic: 'Workflows', diff: 'intermediate', type: 'single', scenario: false,
    q: 'In a Foundry workflow, which language transforms data, evaluates conditions and iterates over items?',
    opts: ['Power Fx', 'KQL', 'T-SQL', 'Regular expressions only'],
    ans: [0],
    exp: 'Power Fx acts as a low-code "glue" language in workflows for data transformation, conditions and loops.',
    why: ['', 'KQL queries logs and telemetry.', 'T-SQL queries databases.', 'Regular expressions match patterns but aren\'t the workflow expression language.'],
    hint: 'The low-code expression language shared with Power Platform.', feat: 'Foundry workflows', ref: 'workflows' });
  q({ id: 'AI103-D2-012', obj: '2.1.3', topic: 'Tool-augmented flows', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your model must fetch a customer\'s order status from your system during a conversation. Which Responses API tool lets your application run that business logic and return the result?',
    opts: ['A function tool', 'web_search', 'file_search', 'code_interpreter'],
    ans: [0],
    exp: 'The function tool lets your application run custom business logic and return the result to the model. The model decides when to call it, your code executes it, and you submit the output.',
    why: ['', 'Web search finds public information.', 'File search answers from indexed documents.', 'Code Interpreter runs Python in a sandbox, not your order system.'],
    hint: 'Your code, your system.', feat: 'Function calling', ref: 'functionCalling' });
  q({ id: 'AI103-D2-013', obj: '2.1.3', topic: 'Multistep reasoning', diff: 'advanced', type: 'single', scenario: true,
    q: 'A compliance check must extract facts from a contract, then generate verification queries, then judge each fact. One large prompt keeps mixing these steps. What design helps?',
    opts: ['Break the task into sequential steps, each with a focused prompt whose output feeds the next', 'Use one prompt with higher temperature', 'Ask for the final verdict only', 'Remove the system message'],
    ans: [0],
    exp: 'Prompt engineering guidance recommends breaking tasks down, for example first extracting facts and then generating queries to verify them. A multistep pipeline makes each step easier to control and check.',
    why: ['', 'Temperature doesn\'t separate steps.', 'Skipping intermediate steps hides errors.', 'The system message sets behaviour; removing it doesn\'t structure the task.'],
    hint: 'Divide and verify.', feat: 'Prompt engineering', ref: 'promptEngineering' });

  // 2.1.4 Evaluate models and apps
  q({ id: 'AI103-D2-014', obj: '2.1.4', topic: 'Evaluation', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each evaluation goal to the evaluator.',
    pairs: [
      ['Detect fabricated content not supported by the retrieved documents', 'Groundedness'],
      ['Check that the answer addresses the question', 'Relevance'],
      ['Check that nothing critical from the reference answer is missing', 'Response Completeness'],
      ['Detect harmful hateful content', 'Hate and Unfairness'],
    ],
    exp: 'Groundedness targets fabrication, Relevance targets fit to the query, Response Completeness compares with ground truth, and risk and safety evaluators such as Hate and Unfairness target harmful content.',
    hint: 'Fabrication, fit, completeness, safety.', feat: 'Built-in evaluators', ref: 'builtInEvaluators' });
  q({ id: 'AI103-D2-015', obj: '2.1.4', topic: 'Evaluation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You want to run a batch of evaluations on a test dataset from code, with results stored in your Foundry project. What should you use?',
    opts: ['Cloud evaluation with the Microsoft Foundry SDK', 'Manual review in a spreadsheet', 'The model catalog benchmarks only', 'Content Understanding'],
    ans: [0],
    exp: 'Cloud evaluation with the Foundry SDK runs evaluators over datasets in your project, so results are stored and comparable across runs.',
    why: ['', 'Manual review doesn\'t scale or standardise metrics.', 'Benchmarks compare models generally, not your app on your data.', 'Content Understanding extracts content.'],
    hint: 'Run evaluators at scale from code.', feat: 'Cloud evaluation', ref: 'cloudEvaluation' });
  q({ id: 'AI103-D2-016', obj: '2.1.4', topic: 'Evaluation', diff: 'advanced', type: 'single', scenario: true,
    q: 'For a RAG application, which combination of evaluators does Microsoft suggest as a starting point?',
    opts: ['Retrieval, Groundedness, Relevance and content safety evaluators', 'BLEU, METEOR and Fluency', 'Only Fluency', 'Only Code Vulnerability'],
    ans: [0],
    exp: 'Microsoft\'s evaluator guidance for RAG applications combines Retrieval, Groundedness, Relevance and Content Safety. BLEU and METEOR suit translation scenarios.',
    why: ['', 'BLEU and METEOR are suggested for translation.', 'Fluency alone misses grounding and retrieval.', 'Code Vulnerability targets generated code.'],
    hint: 'Check retrieval, grounding, fit and safety.', feat: 'RAG evaluators', ref: 'builtInEvaluators' });
  q({ id: 'AI103-D2-017', obj: '2.1.4', topic: 'Evaluation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Before choosing between two candidate models, you want objective comparisons of quality, safety, cost and performance. Where do you start?',
    opts: ['Model benchmarks in the Foundry model catalog, then evaluation on your own data', 'The Azure status page', 'Agent Monitoring Dashboard', 'The billing invoice'],
    ans: [0],
    exp: 'Model benchmarks compare models across quality, safety, cost and performance. Confirm the choice with evaluations on your own data.',
    why: ['', 'The status page shows service health.', 'The dashboard monitors deployed agents.', 'Invoices come after you\'ve used a model.'],
    hint: 'Compare before you deploy.', feat: 'Model benchmarks', ref: 'modelsOverview' });

  // 2.1.5 Integrate generative workflows into applications using Foundry SDKs and connectors
  q({ id: 'AI103-D2-018', obj: '2.1.5', topic: 'Foundry SDK', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each task to the SDK that handles it.',
    pairs: [
      ['Generate responses with Responses or Chat Completions', 'OpenAI SDK'],
      ['Retrieve project connections, enable tracing and create agent versions', 'Foundry SDK (azure-ai-projects)'],
      ['Authenticate with Microsoft Entra ID tokens', 'azure-identity'],
    ],
    exp: 'The Foundry SDK gives access to project-level features such as connections, tracing, datasets, agents and evaluations. The OpenAI SDK handles model inference. azure-identity provides token credentials.',
    hint: 'Project features, inference, identity.', feat: 'Foundry SDKs', ref: 'sdkOverview' });
  q({ id: 'AI103-D2-019', obj: '2.1.5', topic: 'Foundry SDK', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You already have an AIProjectClient for your project. How do you get an OpenAI-compatible client for model calls?',
    opts: ['project_client.get_openai_client()', 'project_client.agents.list()', 'OpenAI() with no endpoint', 'project_client.connections.delete()'],
    ans: [0],
    exp: 'get_openai_client() returns an OpenAI-compatible client authenticated for your project, which you use with Responses or Chat Completions.',
    why: ['', 'agents.list returns agents.', 'Without an endpoint the client calls the public OpenAI service.', 'Deleting connections is unrelated.'],
    hint: 'The project client hands you an inference client.', feat: 'Foundry SDK', ref: 'sdkOverview' });
  q({ id: 'AI103-D2-020', obj: '2.1.5', topic: 'Foundry SDK', diff: 'easy', type: 'single', scenario: false,
    q: 'Which Python packages do you install to use the Foundry project client with Microsoft Entra ID authentication?',
    opts: ['azure-ai-projects and azure-identity', 'requests only', 'numpy and pandas', 'flask'],
    ans: [0],
    exp: 'azure-ai-projects provides AIProjectClient, and azure-identity provides credentials such as DefaultAzureCredential for token-based authentication.',
    why: ['', 'requests is a generic HTTP library.', 'numpy and pandas are data libraries.', 'Flask is a web framework.'],
    hint: 'Project client plus identity.', feat: 'Foundry SDK', ref: 'sdkOverview' });
  q({ id: 'AI103-D2-021', obj: '2.1.5', topic: 'Connectors', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your app should read the Azure AI Search endpoint and credentials configured for the project instead of storing them in app settings. What should it use?',
    opts: ['The project\'s connections through AIProjectClient', 'Environment variables copied from a developer\'s laptop', 'Hard-coded keys', 'The model catalog'],
    ans: [0],
    exp: 'The project client gives access to resource connections, so applications retrieve connection details from the project rather than duplicating secrets.',
    why: ['', 'Copied variables drift and leak.', 'Hard-coded keys are a security risk.', 'The catalog lists models.'],
    hint: 'The project already knows its connections.', feat: 'Project connections', ref: 'sdkOverview' });

  // 2.1.6 Configure an application to connect to a Foundry project
  q({ id: 'AI103-D2-022', obj: '2.1.6', topic: 'Connect to a project', diff: 'easy', type: 'single', scenario: false,
    q: 'Which value identifies a Foundry project when you create an AIProjectClient?',
    opts: ['The project endpoint, such as https://<resource>.services.ai.azure.com/api/projects/<project-name>', 'The subscription ID', 'The model name only', 'The tenant domain name'],
    ans: [0],
    exp: 'AIProjectClient takes the project endpoint and a credential. The endpoint has the form https://<resource>.services.ai.azure.com/api/projects/<project-name>.',
    why: ['', 'A subscription contains many resources.', 'A model name doesn\'t identify a project.', 'The tenant domain isn\'t a project address.'],
    hint: 'It\'s a URL ending in the project name.', feat: 'Project endpoint', ref: 'sdkOverview' });
  q({ id: 'AI103-D2-023', obj: '2.1.6', topic: 'Connect to a project', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You call an Azure OpenAI deployment with the OpenAI SDK and Microsoft Entra ID. Which token scope do you request with get_bearer_token_provider?',
    opts: ['https://ai.azure.com/.default', 'https://graph.microsoft.com/.default', 'https://management.azure.com/.default', 'https://storage.azure.com/.default'],
    ans: [0],
    exp: 'Microsoft Learn examples create a token provider with DefaultAzureCredential and the scope https://ai.azure.com/.default, then pass it as api_key to the OpenAI client.',
    why: ['', 'Graph tokens call Microsoft Graph.', 'Management tokens call Azure Resource Manager.', 'Storage tokens call Azure Storage.'],
    hint: 'The audience is the AI service.', feat: 'Keyless authentication', ref: 'responses' });
  q({ id: 'AI103-D2-024', obj: '2.1.6', topic: 'Connect to a project', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Which base URL format does the OpenAI SDK use for the Azure OpenAI v1 endpoint?',
    opts: ['https://<resource>.openai.azure.com/openai/v1/', 'https://api.openai.com/v1/', 'https://<resource>.blob.core.windows.net/', 'https://login.microsoftonline.com/'],
    ans: [0],
    exp: 'The Azure OpenAI v1 API is called at https://<resource>.openai.azure.com/openai/v1/, for example /responses or /chat/completions.',
    why: ['', 'This is the public OpenAI service.', 'This is Blob Storage.', 'This is the Microsoft Entra sign-in endpoint.'],
    hint: 'Your resource name, then /openai/v1/.', feat: 'Azure OpenAI endpoint', ref: 'responses' });
  q({ id: 'AI103-D2-025', obj: '2.1.6', topic: 'Connect to a project', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your code uses DefaultAzureCredential and works in Azure, but fails on a developer laptop with an authentication error. What should the developer do?',
    opts: ['Sign in with az login (or another supported developer credential) and have a Foundry role on the project', 'Paste an API key into DefaultAzureCredential', 'Disable TLS', 'Change the model deployment name'],
    ans: [0],
    exp: 'The code must run in an authenticated Azure session. Locally, sign in with the Azure CLI (az login), and make sure the account has a role such as Foundry User on the project.',
    why: ['', 'DefaultAzureCredential doesn\'t take an API key.', 'Disabling TLS is insecure and unrelated.', 'The deployment name doesn\'t affect authentication.'],
    hint: 'Where does the credential come from locally?', feat: 'DefaultAzureCredential', ref: 'sdkOverview' });
  q({ id: 'AI103-D2-026', obj: '2.1.6', topic: 'Connect to a project', diff: 'advanced', type: 'single', scenario: true,
    q: 'A multi-turn chat app using the Responses API must keep context between turns without resending the whole history. What should it pass on the next request?',
    opts: ['previous_response_id set to the previous response\'s ID (or a conversation object)', 'A higher max_output_tokens', 'stream=True', 'A new API key per turn'],
    ans: [0],
    exp: 'The Responses API manages conversation state. Pass previous_response_id, or use a conversation created with conversations.create, so the service supplies the earlier context.',
    why: ['', 'Output length doesn\'t carry context.', 'Streaming changes delivery, not state.', 'Credentials don\'t carry context.'],
    hint: 'Chain the responses.', feat: 'Conversation state', ref: 'responses' });

  // 2.2.1 Define agent roles, goals, conversation tracking and tool schemas
  q({ id: 'AI103-D2-027', obj: '2.2.1', topic: 'Agent design', diff: 'easy', type: 'single', scenario: false,
    q: 'Where do you define an agent\'s role, goals and constraints?',
    opts: ['In the agent\'s instructions', 'In the deployment\'s quota', 'In the tracing settings', 'In the model catalog'],
    ans: [0],
    exp: 'Instructions are the system prompt that defines the agent\'s role, goals and constraints.',
    why: ['', 'Quota controls throughput.', 'Tracing records behaviour.', 'The catalog lists models.'],
    hint: 'The agent\'s system prompt.', feat: 'Agent instructions', ref: 'agentService' });
  q({ id: 'AI103-D2-028', obj: '2.2.1', topic: 'Tool schemas', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your agent keeps calling the wrong function for refund requests. What most improves its tool choice?',
    opts: ['Clear function names, descriptions and parameter schemas that say exactly when to use each tool', 'Shorter, vaguer descriptions', 'Removing parameter types', 'A higher temperature'],
    ans: [0],
    exp: 'You define each function with its name, parameters and description, and the model uses them to decide when and how to call it. Precise descriptions and schemas improve tool selection.',
    why: ['', 'Vague descriptions make selection worse.', 'Types help the model produce valid arguments.', 'Temperature adds randomness.'],
    hint: 'The model reads the tool description.', feat: 'Function calling', ref: 'functionCalling' });
  q({ id: 'AI103-D2-029', obj: '2.2.1', topic: 'Conversation tracking', diff: 'intermediate', type: 'single', scenario: true,
    q: 'How does Microsoft Foundry Agent Service handle conversation state?',
    opts: ['Through the Responses API, which manages conversation context for you', 'Developers must resend every message manually', 'It stores nothing between turns', 'Only in browser local storage'],
    ans: [0],
    exp: 'Conversation states are securely managed through the Responses API, removing the need for manual state management.',
    why: ['', 'Manual history isn\'t required.', 'State is kept between turns.', 'The service manages state server-side.'],
    hint: 'The service manages state.', feat: 'Foundry Agent Service', ref: 'agentService' });
  q({ id: 'AI103-D2-030', obj: '2.2.1', topic: 'Agent design', diff: 'advanced', type: 'single', scenario: true,
    q: 'A long-running research agent sometimes stops early. What instruction guidance helps it know when it\'s finished?',
    opts: ['Define what counts as done and how the agent should verify its own work', 'Tell it to be brief', 'Remove all tools', 'Set reasoning effort to none'],
    ans: [0],
    exp: 'For agentic or research-heavy workflows, Microsoft advises defining what counts as done and how the model should verify its own work.',
    why: ['', 'Brevity doesn\'t define completion.', 'Removing tools limits the research.', 'No reasoning makes multistep work worse.'],
    hint: 'Give it a finish line and a self-check.', feat: 'Agent instructions', ref: 'reasoning' });
  q({ id: 'AI103-D2-031', obj: '2.2.1', topic: 'Agent design', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Using the Microsoft Agent Framework, what does the framework do with the custom Python functions you register as tools?',
    opts: ['Registers them and generates their schemas automatically so the model knows when and how to call them', 'Runs them only once at startup', 'Uploads them to the model catalog', 'Converts them to SQL'],
    ans: [0],
    exp: 'The framework registers the tools you provide and generates their schemas, so the model knows when and how to invoke them.',
    why: ['', 'Tools are called on demand during conversations.', 'Functions aren\'t catalogue models.', 'No SQL conversion takes place.'],
    hint: 'Schemas come for free.', feat: 'Microsoft Agent Framework', ref: 'agentFramework' });

  // 2.2.2 Build agents that integrate retrieval, function calling and memory
  q({ id: 'AI103-D2-032', obj: '2.2.2', topic: 'Function calling', diff: 'intermediate', type: 'order', scenario: false,
    q: 'Put the function-calling pattern for a Foundry agent in order.',
    opts: ['Define the function tools with names, parameters and purpose', 'Create the agent with those function definitions', 'Send a prompt; the agent requests a function call if needed', 'Your app runs the function and submits the output', 'The agent uses the output to complete its response'],
    exp: 'Function calling follows this pattern: define tools, create the agent, send a prompt, execute and return the output, then get the final response.',
    hint: 'The app, not the model, runs the function.', feat: 'Function calling', ref: 'functionCalling' });
  q({ id: 'AI103-D2-033', obj: '2.2.2', topic: 'Function calling', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your app waits for a slow back-end system before submitting a function output, and the run fails with "expired". Why?',
    opts: ['Runs expire 10 minutes after creation, so tool outputs must be submitted before then', 'Functions can only return integers', 'The agent needs a larger model', 'Function calling isn\'t supported in agents'],
    ans: [0],
    exp: 'Function calling documentation states that runs expire 10 minutes after creation. Submit tool outputs before they expire, or redesign long operations to be asynchronous.',
    why: ['', 'Functions can return structured data.', 'Model size doesn\'t affect run expiry.', 'Agents support function calling.'],
    hint: 'There is a clock on the run.', feat: 'Function calling', ref: 'functionCalling' });
  q({ id: 'AI103-D2-034', obj: '2.2.2', topic: 'Memory', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A support agent should remember a customer\'s preferred language and accessibility needs across separate conversations. What should you enable?',
    opts: ['Memory in Foundry Agent Service (user profile memory)', 'A longer max_output_tokens', 'A batch deployment', 'A new conversation each turn'],
    ans: [0],
    exp: 'User profile memory stores durable preferences such as language or accessibility needs, and is retrieved near the start of each conversation.',
    why: ['', 'Output length isn\'t memory.', 'Batch is for bulk jobs.', 'New conversations lose context.'],
    hint: 'Durable preferences across sessions.', feat: 'Agent memory', ref: 'memory' });
  q({ id: 'AI103-D2-035', obj: '2.2.2', topic: 'Retrieval', diff: 'intermediate', type: 'single', scenario: true,
    q: 'An agent must answer from an existing Azure AI Search index that other apps already use. Which tool connects it?',
    opts: ['The Foundry IQ (Azure AI Search) tool pointing at the index', 'File search with a new vector store copy', 'Code Interpreter', 'Web search'],
    ans: [0],
    exp: 'Agents can connect to an existing Foundry IQ (Azure AI Search) index as a tool, so they reuse the same governed index as other applications.',
    why: ['', 'A copy creates a second index to keep in sync.', 'Code Interpreter doesn\'t query indexes.', 'Web search reads public pages.'],
    hint: 'Reuse the index that already exists.', feat: 'Azure AI Search tool', ref: 'aiSearchTool' });
  q({ id: 'AI103-D2-036', obj: '2.2.2', topic: 'Memory', diff: 'advanced', type: 'single', scenario: true,
    q: 'With low-level memory APIs, how must you specify whose memories to read or write?',
    opts: ['Set the scope explicitly in each request', 'Memory is always global to all users', 'The model guesses the user', 'Scope can\'t be set'],
    ans: [0],
    exp: 'For low-level memory APIs you must set scope explicitly in each request. Automatic scope resolution from the caller\'s identity is only supported with the memory search tool and a user scope placeholder.',
    why: ['', 'Global memory would leak data between users.', 'Guessing identity would be unsafe.', 'Scope is a required concept.'],
    hint: 'Keep each user\'s memories separate.', feat: 'Agent memory', ref: 'memory' });

  // 2.2.3 Integrate agent tools: APIs, knowledge stores, search, content understanding, custom functions
  q({ id: 'AI103-D2-037', obj: '2.2.3', topic: 'Agent tools', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each tool source in the Foundry tool catalog to an example.',
    pairs: [
      ['Configured (built-in)', 'Code Interpreter and File Search'],
      ['Catalog', 'Bing Web Search, Azure AI Search, SharePoint and MCP servers'],
      ['Custom', 'Your own tools from OpenAPI specifications'],
    ],
    exp: 'Agents get tools from three places: configured built-in tools ready to use, catalog tools you add from a registry, and custom tools such as OpenAPI-based ones.',
    hint: 'Built in, added from a registry, or your own.', feat: 'Tool catalog', ref: 'agentService' });
  q({ id: 'AI103-D2-038', obj: '2.2.3', topic: 'MCP', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You want an agent to discover and use tools from an external service at runtime, without hard-coding each API or redeploying when tools change. What should you connect?',
    opts: ['An MCP server through the MCP tool', 'A static list of REST calls in the instructions', 'A larger context window', 'A batch deployment'],
    ans: [0],
    exp: 'Connecting to a Model Context Protocol server lets the agent dynamically discover and register tools at runtime, so it adapts as the toolset evolves.',
    why: ['', 'Static calls need redeployment.', 'Context size doesn\'t add tools.', 'Batch is unrelated.'],
    hint: 'Dynamic discovery.', feat: 'MCP tool', ref: 'mcp' });
  q({ id: 'AI103-D2-039', obj: '2.2.3', topic: 'MCP', diff: 'advanced', type: 'single', scenario: true,
    q: 'Which parameters identify an MCP server when you add it as a tool in code?',
    opts: ['server_label and server_url (optionally a project connection for authentication)', 'model and temperature', 'index_name and top_k', 'voice and locale'],
    ans: [0],
    exp: 'An MCP tool definition names the server (server_label) and its endpoint (server_url). A project connection can supply authentication, and require_approval and allowed_tools control behaviour.',
    why: ['', 'These configure generation.', 'These configure search.', 'These configure speech.'],
    hint: 'A label and a URL.', feat: 'MCP tool', ref: 'mcp' });
  q({ id: 'AI103-D2-040', obj: '2.2.3', topic: 'Agent tools', diff: 'intermediate', type: 'single', scenario: true,
    q: 'An insurance agent must pull structured fields from uploaded claim photos and forms before deciding next steps. Which service is designed to provide that analysis?',
    opts: ['Azure Content Understanding', 'Azure Translator', 'Azure Speech', 'Bing Web Search'],
    ans: [0],
    exp: 'Content Understanding analyses documents, images, video and audio into structured fields, which an agent can use as a tool.',
    why: ['', 'Translator translates text.', 'Speech handles audio and voices.', 'Web search reads public pages.'],
    hint: 'Turn photos and forms into fields.', feat: 'Content Understanding', ref: 'cuOverview' });
  q({ id: 'AI103-D2-041', obj: '2.2.3', topic: 'Agent tools', diff: 'advanced', type: 'single', scenario: true,
    q: 'An agent needs to call an existing Azure Function that implements pricing rules. Which statement is accurate?',
    opts: ['You can integrate it as a custom tool, for example through an OpenAPI specification or function calling', 'Agents can only use built-in tools', 'The function must be rewritten as an MCP server', 'Only Python functions are supported'],
    ans: [0],
    exp: 'Custom tools integrate business logic such as Azure Functions or OpenAPI-described APIs into Foundry Agent Service.',
    why: ['', 'Custom tools are supported.', 'MCP is one option, not a requirement.', 'Tools can call services written in any language over HTTP.'],
    hint: 'Existing logic, exposed as a tool.', feat: 'Custom tools', ref: 'openapi' });

  // 2.2.4 Implement orchestrated multi-agent solutions
  q({ id: 'AI103-D2-042', obj: '2.2.4', topic: 'Multi-agent', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each Agent Framework orchestration pattern to its best use.',
    pairs: [
      ['Concurrent', 'Send the same task to several agents at once and collect independent results'],
      ['Sequential', 'Pass output from one agent to the next in a fixed order'],
      ['Handoff', 'Transfer control to the right expert agent based on context'],
      ['Group chat', 'Shared conversation where a manager chooses who speaks next'],
      ['Magentic', 'A manager plans, delegates and adapts for open-ended problems'],
    ],
    exp: 'The Microsoft Agent Framework supports concurrent, sequential, handoff, group chat and magentic orchestration, each suited to a different collaboration style.',
    hint: 'Parallel, pipeline, routing, discussion, planning.', feat: 'Agent orchestration', ref: 'orchestrations' });
  q({ id: 'AI103-D2-043', obj: '2.2.4', topic: 'Multi-agent', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A front-door agent should route billing questions to a billing agent and technical faults to a support agent, with only one agent working at a time. Which pattern fits?',
    opts: ['Handoff', 'Concurrent', 'Group chat', 'Sequential'],
    ans: [0],
    exp: 'Handoff orchestration dynamically transfers control between agents based on context or rules, for escalation and expert routing where one agent works at a time.',
    why: ['', 'Concurrent runs agents in parallel.', 'Group chat has several agents conversing.', 'Sequential always uses a fixed order.'],
    hint: 'Route to the right expert.', feat: 'Handoff orchestration', ref: 'orchestrations' });
  q({ id: 'AI103-D2-044', obj: '2.2.4', topic: 'Multi-agent', diff: 'advanced', type: 'single', scenario: true,
    q: 'A market analysis needs a legal review, a financial review and a technical review of the same proposal, all independent of each other, as fast as possible. Which pattern fits?',
    opts: ['Concurrent', 'Sequential', 'Handoff', 'Magentic'],
    ans: [0],
    exp: 'Concurrent orchestration broadcasts the same task to multiple agents at once and collects their results independently, suiting parallel analysis.',
    why: ['', 'Sequential would make each review wait for the previous one.', 'Handoff gives control to one agent at a time.', 'Magentic adds planning overhead for an open-ended problem, which this isn\'t.'],
    hint: 'Independent and in parallel.', feat: 'Concurrent orchestration', ref: 'orchestrations' });
  q({ id: 'AI103-D2-045', obj: '2.2.4', topic: 'Multi-agent', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Agents built by different teams on different platforms must discover each other\'s capabilities and exchange tasks. Which protocol and artefact support this?',
    opts: ['The Agent-to-Agent (A2A) protocol with an Agent Card that describes skills and security schemes', 'SMTP email between agents', 'A shared Excel workbook', 'Semantic ranking'],
    ans: [0],
    exp: 'A2A lets agents communicate across environments. An Agent Card exposes an agent\'s skills and declares standard web security schemes such as OAuth 2.0 or API keys.',
    why: ['', 'Email isn\'t an agent protocol.', 'A workbook isn\'t a discovery mechanism.', 'Semantic ranking orders search results.'],
    hint: 'Agents publish a card describing themselves.', feat: 'A2A protocol', ref: 'a2a' });
  q({ id: 'AI103-D2-046', obj: '2.2.4', topic: 'Multi-agent', diff: 'advanced', type: 'single', scenario: false,
    q: 'How does the A2A protocol handle authentication between agents?',
    opts: ['It doesn\'t define its own mechanism; agents declare standard web security schemes in their Agent Card', 'It requires a shared password in every message', 'It uses Kerberos only', 'It needs no authentication'],
    ans: [0],
    exp: 'A2A doesn\'t define its own authentication. Agents declare standard web security schemes, such as OAuth 2.0 or API keys, in their Agent Card.',
    why: ['', 'Shared passwords aren\'t part of A2A.', 'A2A isn\'t tied to Kerberos.', 'Security schemes are declared.'],
    hint: 'It reuses familiar web security.', feat: 'A2A protocol', ref: 'a2a' });

  // 2.2.5 Autonomous or semiautonomous workflows with safeguards and approvals
  q({ id: 'AI103-D2-047', obj: '2.2.5', topic: 'Safeguards', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A triage workflow auto-replies when the agent is confident, but low-confidence answers must go to a person before sending. Which pattern implements this?',
    opts: ['A condition on the agent\'s structured confidence output that routes low-confidence cases to a human-in-the-loop step', 'Always auto-reply', 'Always send everything to a person', 'Lower the temperature'],
    ans: [0],
    exp: 'Workflows use agent outputs captured in variables to drive decisions such as escalation, combining automation with human-in-the-loop handling for uncertain cases.',
    why: ['', 'Full automation ignores uncertainty.', 'Escalating everything wastes the automation.', 'Temperature doesn\'t measure confidence.'],
    hint: 'Branch on confidence.', feat: 'Human-in-the-loop', ref: 'workflows' });
  q({ id: 'AI103-D2-048', obj: '2.2.5', topic: 'Safeguards', diff: 'advanced', type: 'multi', scenario: true,
    q: 'A semiautonomous agent manages cloud resources through MCP tools. Which TWO safeguards does Microsoft recommend for high-risk operations?',
    opts: ['Require approval for tools that write data or change resources', 'Review allowed_tools and approval settings when the server\'s tools or behaviour change', 'Trust tool descriptions from the provider', 'Give the agent subscription Owner'],
    ans: [0, 1],
    exp: 'Require approval for high-risk operations, and review allowed_tools, approval settings and connection permissions whenever the server changes.',
    why: ['', '', 'Provider descriptions should be treated as untrusted input.', 'Broad rights violate least privilege.'],
    hint: 'Approve and review.', feat: 'MCP approvals', ref: 'mcp' });
  q({ id: 'AI103-D2-049', obj: '2.2.5', topic: 'Safeguards', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Before approving an MCP tool call in your app, what should the reviewer check?',
    opts: ['The requested tool name and its arguments', 'Only the agent\'s display name', 'The model\'s training date', 'The project creation date'],
    ans: [0],
    exp: 'Microsoft\'s guidance is to review the requested tool name and arguments before you approve an MCP tool call.',
    why: ['', 'The name says nothing about the action.', 'Training date isn\'t relevant to this call.', 'Project age is irrelevant.'],
    hint: 'What exactly is about to happen?', feat: 'MCP approvals', ref: 'mcp' });
  q({ id: 'AI103-D2-050', obj: '2.2.5', topic: 'Safeguards', diff: 'advanced', type: 'single', scenario: true,
    q: 'Why is a human-in-the-loop approval before sensitive operations recommended as a security mitigation for agents?',
    opts: ['It gates actions that could cause harm if the agent is manipulated or wrong', 'It speeds up the agent', 'It reduces token cost', 'It replaces authentication'],
    ans: [0],
    exp: 'Mitigation strategies for agent security include sandboxing or gating sensitive operations behind human-in-the-loop approvals.',
    why: ['', 'Approvals add a step, they don\'t speed things up.', 'Approvals don\'t reduce tokens.', 'Authentication is still required.'],
    hint: 'A person catches mistakes and attacks.', feat: 'Agent security', ref: 'agentService' });

  // 2.2.6 Monitoring, agent evaluation and error analysis
  q({ id: 'AI103-D2-051', obj: '2.2.6', topic: 'Agent evaluation', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each agent evaluator to what it assesses.',
    pairs: [
      ['Intent Resolution', 'Whether the agent correctly understood what the user wanted'],
      ['Tool Call Accuracy', 'Whether the agent called the right tools with the right arguments'],
      ['Task Adherence', 'Whether the agent followed its instructions and task'],
      ['Task Completion', 'Whether the task succeeded end to end'],
    ],
    exp: 'Agent evaluators cover system-level outcomes (intent resolution, task adherence, task completion) and process quality (tool call accuracy, tool selection).',
    hint: 'Understand, act, comply, finish.', feat: 'Agent evaluators', ref: 'agentEvaluators' });
  q({ id: 'AI103-D2-052', obj: '2.2.6', topic: 'Error analysis', diff: 'advanced', type: 'single', scenario: true,
    q: 'Users report the agent gave a wrong refund amount. You want to see which tool it called, with which arguments, and what each step returned. Where do you look?',
    opts: ['The trace of that run in Application Insights or the Foundry tracing view', 'The model catalog', 'The deployment\'s quota page', 'The agent\'s display name history'],
    ans: [0],
    exp: 'Traces capture each step of an agent run, including tool calls, arguments, responses and timings, which is the evidence you need for error analysis.',
    why: ['', 'The catalog lists models.', 'Quota shows throughput limits.', 'Names don\'t show execution.'],
    hint: 'Replay the steps.', feat: 'Tracing', ref: 'tracing' });
  q({ id: 'AI103-D2-053', obj: '2.2.6', topic: 'Agent evaluation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your agent often picks a weather tool when asked about shipping times. Which evaluator focuses on this problem?',
    opts: ['Tool Selection (or Tool Call Accuracy)', 'Fluency', 'Coherence', 'BLEU'],
    ans: [0],
    exp: 'Tool Selection and Tool Call Accuracy are process evaluators that assess whether the agent chose and called the right tools.',
    why: ['', 'Fluency checks language quality.', 'Coherence checks logical flow.', 'BLEU compares against reference translations.'],
    hint: 'Was it the right tool?', feat: 'Agent evaluators', ref: 'agentEvaluators' });
  q({ id: 'AI103-D2-054', obj: '2.2.6', topic: 'Monitoring', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Which settings panel controls which telemetry, evaluations and security checks run for an agent and which charts the monitoring dashboard shows?',
    opts: ['The Monitor settings panel in the Agent Monitoring Dashboard', 'The model deployment\'s rate limit page', 'The project\'s RBAC page', 'The playground'],
    ans: [0],
    exp: 'The Monitor settings panel configures telemetry, evaluations and security checks for agents, which determines the dashboard charts and evaluations that run.',
    why: ['', 'Rate limits govern throughput.', 'RBAC governs access.', 'The playground is for interactive testing.'],
    hint: 'It lives with the dashboard.', feat: 'Agent monitoring', ref: 'agentMonitoring' });

  // 2.3.1 Tune generation behaviour
  q({ id: 'AI103-D2-055', obj: '2.3.1', topic: 'Parameters', diff: 'easy', type: 'single', scenario: true,
    q: 'Factual answers about hotel amenities vary too much between runs. Which parameter change helps?',
    opts: ['Lower the temperature (for example 0.2)', 'Raise the temperature to 0.9', 'Raise both temperature and top_p', 'Remove the system message'],
    ans: [0],
    exp: 'Lower temperature produces more focused, deterministic output, which suits factual tasks. Higher values suit creative tasks.',
    why: ['', 'Higher temperature increases variety.', 'Microsoft recommends adjusting temperature or top_p, not both.', 'The system message isn\'t a randomness control.'],
    hint: 'Less randomness for facts.', feat: 'Model parameters', ref: 'promptEngineering' });
  q({ id: 'AI103-D2-056', obj: '2.3.1', topic: 'Parameters', diff: 'intermediate', type: 'single', scenario: false,
    q: 'What is the general recommendation for adjusting temperature and top_p?',
    opts: ['Adjust one or the other, not both at the same time', 'Always set both to 1', 'Always set both to 0', 'They control output length'],
    ans: [0],
    exp: 'Both control randomness in different ways, so the general recommendation is to adjust either temperature or top_p, not both together.',
    why: ['', 'Defaults depend on the use case.', 'Zero for both isn\'t a general rule.', 'They control randomness, not length.'],
    hint: 'Two knobs for the same thing.', feat: 'Model parameters', ref: 'promptEngineering' });
  q({ id: 'AI103-D2-057', obj: '2.3.1', topic: 'Prompt engineering', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A model must output product descriptions in a strict house format. Instructions alone produce inconsistent results. What prompt technique should you try before fine-tuning?',
    opts: ['Few-shot examples that show the exact format', 'Higher temperature', 'Removing the instructions', 'Asking for longer answers'],
    ans: [0],
    exp: 'Few-shot learning shows the model examples of the desired output, which improves consistency. Consider fine-tuning only when prompt engineering can\'t reliably achieve the style and format.',
    why: ['', 'Higher temperature reduces consistency.', 'Instructions help.', 'Length isn\'t the problem.'],
    hint: 'Show, don\'t just tell.', feat: 'Few-shot prompting', ref: 'promptEngineering' });
  q({ id: 'AI103-D2-058', obj: '2.3.1', topic: 'Reasoning effort', diff: 'advanced', type: 'single', scenario: true,
    q: 'A voice assistant uses a reasoning model, and responses are too slow for a natural conversation. The tasks are simple lookups. What should you change?',
    opts: ['Lower reasoning_effort (for example none or low)', 'Raise reasoning_effort to high', 'Raise max_output_tokens', 'Add chain-of-thought instructions'],
    ans: [0],
    exp: 'reasoning_effort controls how much the model thinks before answering. Microsoft suggests none for latency-critical work such as voice and fast retrieval, and low for efficient reasoning with a modest latency increase.',
    why: ['', 'Higher effort increases latency.', 'More output tokens doesn\'t reduce thinking time.', 'Extra reasoning instructions add work.'],
    hint: 'Think less, answer faster.', feat: 'Reasoning models', ref: 'reasoning' });

  // 2.3.2 Model reflection, chain-of-thought evaluations, self-critique loops
  q({ id: 'AI103-D2-059', obj: '2.3.2', topic: 'Chain of thought', diff: 'intermediate', type: 'single', scenario: true,
    q: 'For a standard (non-reasoning) model, how can you make multistep answers easier to check and less error-prone?',
    opts: ['Ask the model to work step by step and show its reasoning before the final answer (chain-of-thought prompting)', 'Ask for the final answer only', 'Increase temperature', 'Remove examples'],
    ans: [0],
    exp: 'Chain-of-thought prompting asks the model to proceed step by step and present the steps. This reduces inaccuracy and makes the response easier to assess.',
    why: ['', 'Final-answer-only hides errors.', 'Temperature adds randomness.', 'Examples usually help.'],
    hint: 'Show the working.', feat: 'Chain-of-thought prompting', ref: 'promptEngineering' });
  q({ id: 'AI103-D2-060', obj: '2.3.2', topic: 'Reflection', diff: 'advanced', type: 'single', scenario: true,
    q: 'You use a reasoning model with the Responses API and want to review how it reasoned about a decision, for evaluation and debugging. What can you request?',
    opts: ['A reasoning summary through the reasoning summary parameter', 'The model\'s raw weights', 'A higher temperature', 'Chat history from other users'],
    ans: [0],
    exp: 'With the latest reasoning models and the Responses API, you can use the reasoning summary parameter to receive summaries of the model\'s chain-of-thought reasoning.',
    why: ['', 'Weights aren\'t available or useful here.', 'Temperature doesn\'t expose reasoning.', 'Other users\' data is irrelevant and private.'],
    hint: 'Ask for a summary of the thinking.', feat: 'Reasoning summaries', ref: 'reasoning' });
  q({ id: 'AI103-D2-061', obj: '2.3.2', topic: 'Self-critique', diff: 'advanced', type: 'order', scenario: false,
    q: 'Put a simple self-critique (reflection) loop in order.',
    opts: ['Generate a draft answer', 'Evaluate the draft against criteria, for example with an LLM judge or evaluator', 'Revise the draft using the critique', 'Stop when the draft meets the criteria or a retry limit is reached'],
    exp: 'Reflection loops generate, critique against defined criteria, revise, and stop on success or a limit. Defining what counts as done and how to verify the work keeps the loop bounded.',
    hint: 'Draft, judge, revise, stop.', feat: 'Self-critique loops', ref: 'reasoning' });
  q({ id: 'AI103-D2-062', obj: '2.3.2', topic: 'Self-critique', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You want one LLM-judge call to score fluency, coherence, intent resolution, task adherence, groundedness and task completion for each response in a critique loop. Which evaluator fits?',
    opts: ['Quality Grader (preview)', 'BLEU', 'Code Vulnerability', 'Document Retrieval'],
    ans: [0],
    exp: 'Quality Grader batches fluency, coherence, intent resolution, task adherence, groundedness and task completion into one LLM judge call.',
    why: ['', 'BLEU compares with reference translations.', 'Code Vulnerability inspects code.', 'Document Retrieval measures search results.'],
    hint: 'Many criteria, one judge call.', feat: 'Quality Grader', ref: 'builtInEvaluators' });

  // 2.3.3 Observability: tracing, token analytics, safety signals, latency
  q({ id: 'AI103-D2-063', obj: '2.3.3', topic: 'Observability', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Server-side tracing is on, but you also need to see your own application code around the agent call, such as pre-processing. What do you add?',
    opts: ['Client-side instrumentation in your application (OpenTelemetry-based)', 'A second model deployment', 'More quota', 'Semantic ranking'],
    ans: [0],
    exp: 'Start with server-side tracing. When you need visibility into your own application code, add client-side instrumentation as a second step.',
    why: ['', 'A deployment doesn\'t produce traces.', 'Quota doesn\'t add visibility.', 'Semantic ranking is a search feature.'],
    hint: 'Instrument your own code too.', feat: 'Tracing', ref: 'tracing' });
  q({ id: 'AI103-D2-064', obj: '2.3.3', topic: 'Observability', diff: 'advanced', type: 'single', scenario: true,
    q: 'A data analyst must query the traces stored in the project\'s connected Application Insights. Which role does tracing documentation require on that resource?',
    opts: ['Log Analytics Reader', 'Foundry Account Owner', 'Storage Blob Data Contributor', 'Cognitive Services User'],
    ans: [0],
    exp: 'Querying telemetry requires the Log Analytics Reader role on the connected Application Insights resource. If the tables are protected, Privileged Monitoring Data Reader is also needed.',
    why: ['', 'Account Owner manages Foundry, not telemetry queries.', 'This role reads blobs.', 'Cognitive Services roles don\'t grant telemetry queries.'],
    hint: 'Traces live in Log Analytics tables.', feat: 'Tracing', ref: 'tracing' });
  q({ id: 'AI103-D2-065', obj: '2.3.3', topic: 'Observability', diff: 'intermediate', type: 'multi', scenario: true,
    q: 'Which TWO signals would you track to find why an agent feels slow and expensive?',
    opts: ['Latency per step in traces (model calls versus tool calls)', 'Token usage per run', 'The agent\'s display name', 'The number of projects in the resource'],
    ans: [0, 1],
    exp: 'Latency breakdowns show where time goes, and token analytics show what drives cost. Both appear in traces and the monitoring dashboard.',
    why: ['', '', 'Names don\'t affect performance.', 'Project count isn\'t a performance signal.'],
    hint: 'Time and tokens.', feat: 'Observability', ref: 'agentMonitoring' });
  q({ id: 'AI103-D2-066', obj: '2.3.3', topic: 'Observability', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Security wants to know how often production responses trigger safety detections over time. What provides this signal?',
    opts: ['Continuous safety evaluation of sampled production traffic, shown in monitoring', 'The model card', 'Deployment names', 'The token price list'],
    ans: [0],
    exp: 'Continuous evaluation runs quality and safety evaluation on production traffic at a sampled rate, so safety signals appear as trends.',
    why: ['', 'Model cards describe a model, not your traffic.', 'Names carry no safety data.', 'Prices don\'t measure safety.'],
    hint: 'Sample and evaluate production.', feat: 'Continuous evaluation', ref: 'observability' });

  // 2.3.4 Orchestrate multiple models, flows, or hybrid LLM and rules engines
  q({ id: 'AI103-D2-067', obj: '2.3.4', topic: 'Hybrid orchestration', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Refunds over $500 must always follow a fixed approval policy, while the LLM drafts customer messages. How should you design this?',
    opts: ['Enforce the threshold with deterministic workflow logic (for example a Power Fx condition) and use the LLM only for drafting', 'Ask the LLM to decide whether to apply the policy', 'Fine-tune the LLM on the policy', 'Raise the temperature'],
    ans: [0],
    exp: 'Hybrid designs keep hard business rules in deterministic logic, such as workflow conditions, and use models where language generation adds value. Rules can\'t be talked around by a prompt.',
    why: ['', 'LLM decisions are probabilistic and can be manipulated.', 'Fine-tuning doesn\'t guarantee rule compliance.', 'Temperature adds randomness.'],
    hint: 'Hard rules belong in code or logic.', feat: 'Hybrid orchestration', ref: 'workflows' });
  q({ id: 'AI103-D2-068', obj: '2.3.4', topic: 'Multiple models', diff: 'advanced', type: 'single', scenario: true,
    q: 'Model router is serving your traffic. Which capacity does it use first for the model it selects?',
    opts: ['Your own deployments in the same Foundry resource: provisioned (PTU) first, then pay-as-you-go, with router-managed capacity for the rest', 'Only router-managed capacity', 'Only batch capacity', 'A random region'],
    ans: [0],
    exp: 'Model router serves the selected model from your own deployments in the same resource first (provisioned throughput, then pay-as-you-go), and router-managed capacity serves the rest (preview).',
    why: ['', 'It prefers capacity you already have.', 'Batch is asynchronous and separate.', 'Selection isn\'t random.'],
    hint: 'Use what you already pay for.', feat: 'Model router', ref: 'modelRouter' });
  q({ id: 'AI103-D2-069', obj: '2.3.4', topic: 'Multiple models', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A pipeline uses a small model to classify each request and sends only complex ones to a frontier model. What is the main benefit?',
    opts: ['Lower cost and latency for simple requests while keeping quality for hard ones', 'It removes the need for evaluation', 'It guarantees zero errors', 'It avoids authentication'],
    ans: [0],
    exp: 'Routing simple work to small, fast models and hard work to frontier models balances cost, latency and quality. You still evaluate the outcome.',
    why: ['', 'Evaluation is still needed.', 'No design guarantees zero errors.', 'Authentication still applies.'],
    hint: 'Right-size each request.', feat: 'Multi-model orchestration', ref: 'modelRouter' });
  q({ id: 'AI103-D2-070', obj: '2.3.4', topic: 'Flows', diff: 'intermediate', type: 'single', scenario: false,
    q: 'Why does a Foundry workflow keep both a visual and a YAML representation?',
    opts: ['So you can edit visually or in YAML for advanced configuration, version tracking and source control, with changes reflected in both', 'YAML is only a read-only export', 'The visual view is only for production', 'YAML replaces agents'],
    ans: [0],
    exp: 'Workflows have dual visual and YAML representations. Changes in either view are reflected in the other, and YAML supports advanced configuration, version tracking and source control.',
    why: ['', 'YAML is editable.', 'Both views are for authoring.', 'Agents are nodes within the workflow.'],
    hint: 'Two views of the same thing.', feat: 'Foundry workflows', ref: 'workflows' });
})();
