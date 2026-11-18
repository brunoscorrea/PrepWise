/* AI-103 practice questions — Domain 5: Implement information extraction solutions (10–15%).
   Original learning content, not Microsoft exam questions. Verified against the official study
   guide and Microsoft Learn on 2026-11-19 ("verified" on each question). */
'use strict';
(() => {
  const V = '2026-11-19';
  const q = (o) => window.AI103.questions.push({ verified: V, ...o });

  // 5.1.1 Ingest and index content
  q({ id: 'AI103-D5-001', obj: '5.1.1', topic: 'Ingestion', diff: 'easy', type: 'single', scenario: true,
    q: 'You want Azure AI Search (Foundry IQ) to pull documents from Blob Storage into an index on a schedule, without writing ingestion code. What do you configure?',
    opts: ['An indexer with a Blob Storage data source and the index as destination', 'A push API client that uploads every document', 'A knowledge store', 'A scoring profile'],
    ans: [0],
    exp: 'An indexer is a crawler that pulls data from a supported data source into an index using field mappings (the pull model). You can run it on demand or on a schedule.',
    why: ['', 'Push requires your own code.', 'A knowledge store holds enrichment output in Azure Storage.', 'Scoring profiles tune ranking.'],
    hint: 'Pull, not push.', feat: 'Indexers', ref: 'indexers' });
  q({ id: 'AI103-D5-002', obj: '5.1.1', topic: 'Ingestion', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your source data changes every minute, and the index must reflect changes almost immediately. Why might an indexer not fit?',
    opts: ['Indexer schedules run at most every five minutes, so you push changes with the API instead', 'Indexers can\'t read Blob Storage', 'Indexers delete data after each run', 'Indexers only work with images'],
    ans: [0],
    exp: 'Indexers can run as often as every five minutes. More frequent updates require a push model that sends data to the index as it changes.',
    why: ['', 'Blob Storage is a supported source.', 'Indexers don\'t delete data after runs.', 'Indexers handle many content types.'],
    hint: 'Check the minimum schedule interval.', feat: 'Indexers', ref: 'indexers' });
  q({ id: 'AI103-D5-003', obj: '5.1.1', topic: 'Ingestion', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Large manuals must be searchable with vectors. Why do you chunk them during ingestion?',
    opts: ['Unless documents are small, chunking is needed to meet embedding models\' token input limits', 'Chunking makes documents read-only', 'Embedding models require images', 'Chunking replaces the index'],
    ans: [0],
    exp: 'Data chunking isn\'t a hard requirement, but unless documents are small it\'s needed to meet embedding models\' token input requirements. Integrated vectorization can chunk and embed during indexing.',
    why: ['', 'Chunking doesn\'t change permissions.', 'Embedding models accept text.', 'Chunks are stored in the index.'],
    hint: 'Embedding models have input limits.', feat: 'Integrated vectorization', ref: 'integratedVectorization' });
  q({ id: 'AI103-D5-004', obj: '5.1.1', topic: 'Ingestion', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Training videos and recorded calls must become searchable alongside documents. What is a sound ingestion approach?',
    opts: ['Convert them into text and structured descriptions first (for example with Content Understanding), then index that content', 'Index the raw media bytes as text', 'Rename the files with keywords', 'Skip them; media can\'t be searched'],
    ans: [0],
    exp: 'Content Understanding turns multimodal inputs, including video and audio, into clean Markdown and structured fields that can be indexed for retrieval.',
    why: ['', 'Raw bytes aren\'t meaningful text.', 'File names carry little content.', 'Media becomes searchable once converted.'],
    hint: 'Make media into text first.', feat: 'Multimodal ingestion', ref: 'cuOverview' });

  // 5.1.2 Semantic, hybrid and vector search for grounding
  q({ id: 'AI103-D5-005', obj: '5.1.2', topic: 'Hybrid search', diff: 'intermediate', type: 'single', scenario: false,
    q: 'How does hybrid search in Azure AI Search combine full-text and vector results?',
    opts: ['It runs both queries in parallel and merges results with Reciprocal Rank Fusion (RRF)', 'It runs vector search only when keyword search returns nothing', 'It averages the raw scores', 'It uses the semantic ranker only'],
    ans: [0],
    exp: 'Hybrid search runs full-text and vector search in parallel and merges the results using Reciprocal Rank Fusion.',
    why: ['', 'Both run every time.', 'RRF merges by rank, not raw scores.', 'The semantic ranker is optional reranking.'],
    hint: 'Parallel, then rank fusion.', feat: 'Hybrid search', ref: 'hybridSearch' });
  q({ id: 'AI103-D5-006', obj: '5.1.2', topic: 'Vector search', diff: 'intermediate', type: 'single', scenario: false,
    q: 'What does a vector query return in Azure AI Search?',
    opts: ['The k nearest neighbours to the query vector', 'Every document containing the exact words', 'Documents sorted by date', 'Only the first document indexed'],
    ans: [0],
    exp: 'Vector search uses a nearest-neighbours algorithm and returns the requested k nearest neighbours (kNN) to the query vector.',
    why: ['', 'That\'s keyword search behaviour.', 'Sorting by date isn\'t similarity.', 'Results are ranked by similarity.'],
    hint: 'Similarity in vector space.', feat: 'Vector search', ref: 'vectorSearch' });
  q({ id: 'AI103-D5-007', obj: '5.1.2', topic: 'Vector search', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your app sends text queries, but the index uses vector fields. You don\'t want to call an embeddings model in your own code at query time. What should you configure?',
    opts: ['A vectorizer (integrated vectorization) so the search service encodes the query', 'A scoring profile', 'An OCR skill', 'A knowledge store'],
    ans: [0],
    exp: 'With integrated vectorization, the search service can encode the query text into a vector at query time, so fewer operations are implemented manually.',
    why: ['', 'Scoring profiles don\'t create vectors.', 'OCR reads images during indexing.', 'Knowledge stores hold enrichment output.'],
    hint: 'Let the service embed the query.', feat: 'Integrated vectorization', ref: 'integratedVectorization' });
  q({ id: 'AI103-D5-008', obj: '5.1.2', topic: 'Semantic ranker', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Hybrid results are relevant, but the very best passage is often third. Which feature reorders the top results by meaning before grounding?',
    opts: ['Semantic ranking', 'Transliteration', 'Batch transcription', 'Image moderation'],
    ans: [0],
    exp: 'Semantic ranking rescores the top results using language-understanding models, which improves the passages you pass to the model for grounding.',
    why: ['', 'Transliteration converts scripts.', 'Batch transcription converts audio.', 'Image moderation scans images.'],
    hint: 'Rerank by meaning.', feat: 'Semantic ranker', ref: 'semanticRanker' });

  // 5.1.3 Enrichment with custom or built-in skills
  q({ id: 'AI103-D5-009', obj: '5.1.3', topic: 'Skills', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Scanned PDFs and photos in Blob Storage contain printed and handwritten text that must be searchable. Which built-in skill fits?',
    opts: ['The OCR skill', 'The custom Web API skill only', 'A scoring profile', 'A vectorizer'],
    ans: [0],
    exp: 'The OCR skill recognises printed and handwritten text in image files during indexing, using Azure Vision in Foundry Tools.',
    why: ['', 'A custom skill is for your own logic.', 'Scoring profiles tune ranking.', 'Vectorizers embed text.'],
    hint: 'Read text from images.', feat: 'OCR skill', ref: 'ocrSkill' });
  q({ id: 'AI103-D5-010', obj: '5.1.3', topic: 'Skills', diff: 'advanced', type: 'single', scenario: true,
    q: 'Structured PDFs with headings, tables and images should be chunked by section, keeping image positions for multimodal RAG. Which skill fits?',
    opts: ['The Document Layout skill', 'The OCR skill alone', 'Key phrase extraction', 'Language detection'],
    ans: [0],
    exp: 'The Document Layout skill uses Document Intelligence to detect structure and produce Markdown or text, including image extraction with location metadata, which helps chunking by layout and multimodal RAG.',
    why: ['', 'OCR reads text but doesn\'t preserve section structure.', 'Key phrases don\'t structure documents.', 'Language detection identifies the language.'],
    hint: 'Structure-aware extraction.', feat: 'Document Layout skill', ref: 'layoutSkill' });
  q({ id: 'AI103-D5-011', obj: '5.1.3', topic: 'Skills', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You need a proprietary part-number lookup during enrichment that no built-in skill provides. What should you add to the skillset?',
    opts: ['A custom Web API skill that calls your own HTTP endpoint', 'A second index', 'A scoring profile', 'A knowledge store'],
    ans: [0],
    exp: 'The custom Web API skill lets a skillset call your own web API endpoint during enrichment, so you can add logic that built-in skills don\'t cover.',
    why: ['', 'Another index doesn\'t enrich data.', 'Scoring profiles tune ranking.', 'Knowledge stores hold output.'],
    hint: 'Bring your own enrichment logic.', feat: 'Custom Web API skill', ref: 'customSkill' });
  q({ id: 'AI103-D5-012', obj: '5.1.3', topic: 'Knowledge store', diff: 'advanced', type: 'single', scenario: true,
    q: 'Analysts want the AI-enriched output of your skillset in Azure Storage for Power BI analysis, separate from the search index. What do you configure?',
    opts: ['A knowledge store with projections to tables, objects or files', 'A second indexer schedule', 'Semantic ranking', 'A Foundry IQ knowledge base'],
    ans: [0],
    exp: 'A knowledge store is secondary storage in Azure Storage (tables, blobs or both) holding skillset outputs for downstream analysis. There\'s no search query support for it, and it\'s separate from knowledge bases used for agentic retrieval.',
    why: ['', 'Schedules don\'t create storage outputs.', 'Semantic ranking orders results.', 'Knowledge bases serve agentic retrieval, not analytics storage.'],
    hint: 'Enriched data in Azure Storage.', feat: 'Knowledge store', ref: 'knowledgeStore' });

  // 5.1.4 RAG ingestion flow with documents and OCR
  q({ id: 'AI103-D5-013', obj: '5.1.4', topic: 'RAG ingestion', diff: 'intermediate', type: 'order', scenario: false,
    q: 'Put a RAG ingestion flow for scanned and digital documents in order.',
    opts: ['Connect the data source (for example Blob Storage) with an indexer', 'Extract text with OCR or layout analysis', 'Split content into chunks', 'Generate embeddings for each chunk', 'Write chunks and vectors to the search index'],
    exp: 'Ingestion pulls documents in, extracts text (OCR for scans, layout for structure), chunks it, embeds each chunk and stores the results in the index for retrieval.',
    hint: 'Get it, read it, cut it, embed it, store it.', feat: 'RAG ingestion', ref: 'integratedVectorization' });
  q({ id: 'AI103-D5-014', obj: '5.1.4', topic: 'RAG ingestion', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your RAG app can\'t answer questions about scanned invoices, though digital PDFs work fine. What is most likely missing from ingestion?',
    opts: ['OCR, so text inside images is extracted', 'A higher temperature', 'A second Foundry project', 'Speech translation'],
    ans: [0],
    exp: 'Scanned documents are images, so their text must be extracted with OCR (or layout analysis) during ingestion before it can be chunked and indexed.',
    why: ['', 'Temperature affects generation, not ingestion.', 'Projects don\'t extract text.', 'There\'s no audio.'],
    hint: 'Scans are pictures of text.', feat: 'OCR', ref: 'ocrSkill' });
  q({ id: 'AI103-D5-015', obj: '5.1.4', topic: 'RAG ingestion', diff: 'advanced', type: 'single', scenario: true,
    q: 'You want to minimise the custom code for chunking and embedding during ingestion and query. Which feature helps most?',
    opts: ['Integrated vectorization', 'A larger chunk size only', 'Manual embedding scripts', 'A knowledge store'],
    ans: [0],
    exp: 'Integrated vectorization adds chunking and vector conversion to indexing and query time, speeding up development and reducing maintenance.',
    why: ['', 'Chunk size doesn\'t remove the code.', 'Manual scripts are the code you\'re trying to avoid.', 'Knowledge stores hold enrichment output.'],
    hint: 'Let the service chunk and embed.', feat: 'Integrated vectorization', ref: 'integratedVectorization' });
  q({ id: 'AI103-D5-016', obj: '5.1.4', topic: 'RAG ingestion', diff: 'advanced', type: 'single', scenario: true,
    q: 'PDFs mix text with diagrams, and answers should reference the diagram near the related text. Which ingestion choice helps?',
    opts: ['Layout-aware extraction that keeps image location metadata (Document Layout skill), with images verbalised for indexing', 'Plain text extraction that drops images', 'Indexing only file names', 'Translating every PDF'],
    ans: [0],
    exp: 'The Document Layout skill extracts text and images with location metadata, so image proximity to related content is preserved, which helps RAG and multimodal search.',
    why: ['', 'Dropping images loses the diagrams.', 'File names carry no content.', 'Translation doesn\'t preserve image context.'],
    hint: 'Keep pictures next to their text.', feat: 'Document Layout skill', ref: 'layoutSkill' });

  // 5.1.5 Connect retrieval pipelines to workflows and agent tools
  q({ id: 'AI103-D5-017', obj: '5.1.5', topic: 'Retrieval for agents', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Several agents must ground answers in the same retrieval pipeline over SharePoint, Blob Storage and an existing index. What do you connect them to?',
    opts: ['A Foundry IQ knowledge base with those knowledge sources', 'A separate copy of the data per agent', 'Code Interpreter', 'Speech translation'],
    ans: [0],
    exp: 'A knowledge base groups knowledge sources (such as SharePoint, Blob Storage, OneLake or existing indexes). Multiple agents share it, and agentic retrieval returns grounded answers with citations.',
    why: ['', 'Copies drift and multiply work.', 'Code Interpreter runs code.', 'Speech translation is for audio.'],
    hint: 'One shared retrieval layer.', feat: 'Foundry IQ', ref: 'foundryIq' });
  q({ id: 'AI103-D5-018', obj: '5.1.5', topic: 'Retrieval for agents', diff: 'intermediate', type: 'single', scenario: true,
    q: 'An agent should query your existing Azure AI Search index directly as a tool. What do you add?',
    opts: ['The Foundry IQ (Azure AI Search) tool connected to the index', 'A Translator connection', 'A batch deployment', 'An image generation model'],
    ans: [0],
    exp: 'You can connect a Foundry IQ (Azure AI Search) index to Foundry agents as a tool, so the agent retrieves from it during conversations.',
    why: ['', 'Translator translates.', 'Batch is bulk inference.', 'Image generation creates images.'],
    hint: 'The index becomes a tool.', feat: 'Azure AI Search tool', ref: 'aiSearchTool' });
  q({ id: 'AI103-D5-019', obj: '5.1.5', topic: 'Retrieval in workflows', diff: 'advanced', type: 'single', scenario: true,
    q: 'In a Foundry workflow, a retrieval step must feed its results into a later decision node. How is that data passed?',
    opts: ['Through workflow variables that capture node and agent outputs', 'Through email', 'Through the agent\'s display name', 'It can\'t be passed between nodes'],
    ans: [0],
    exp: 'Workflows move data with variables: outputs from agents and other nodes are captured in variables that drive later decisions such as routing.',
    why: ['', 'Email isn\'t a workflow data path.', 'Names don\'t carry data.', 'Variables carry data between nodes.'],
    hint: 'Workflows have state.', feat: 'Foundry workflows', ref: 'workflows' });

  // 5.2.1 Multimodal pipelines combining OCR, layout analysis and field extraction
  q({ id: 'AI103-D5-020', obj: '5.2.1', topic: 'Document extraction', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You must extract vendor, total and line items from invoices of many layouts, with minimal training. What should you try first?',
    opts: ['The prebuilt invoice model in Document Intelligence (or a Content Understanding prebuilt analyzer)', 'Train a custom template model', 'Write regular expressions per vendor', 'Use speech to text'],
    ans: [0],
    exp: 'Document Intelligence prebuilt models extract data from common document types such as invoices, receipts, tax forms and IDs without training. Content Understanding also offers prebuilt analyzers.',
    why: ['', 'Template models need consistent layouts and labelled training.', 'Per-vendor regex doesn\'t scale.', 'There\'s no audio.'],
    hint: 'Start prebuilt.', feat: 'Document Intelligence prebuilt models', ref: 'diModels' });
  q({ id: 'AI103-D5-021', obj: '5.2.1', topic: 'Document extraction', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your industry-specific forms vary in layout between versions. Which Document Intelligence custom model does Microsoft recommend where supported?',
    opts: ['A custom neural model', 'A custom template model', 'prebuilt-read only', 'No model; manual entry'],
    ans: [0],
    exp: 'Custom template models rely on a consistent visual template, so layout variance hurts accuracy. Where the language and scenario support it, Microsoft recommends custom neural models for higher accuracy.',
    why: ['', 'Template models suit static, identical layouts.', 'Read extracts text but not your custom fields.', 'Manual entry doesn\'t scale.'],
    hint: 'Layouts vary.', feat: 'Custom neural models', ref: 'diCustom' });
  q({ id: 'AI103-D5-022', obj: '5.2.1', topic: 'Document extraction', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You need text, tables, selection marks and document structure from forms, but no specific business fields. Which prebuilt model fits?',
    opts: ['prebuilt-layout', 'prebuilt-invoice', 'prebuilt-idDocument', 'A custom neural model'],
    ans: [0],
    exp: 'The layout model extracts text, tables, selection marks and document structure. Invoice and ID models target specific business documents.',
    why: ['', 'Invoice extracts invoice fields.', 'ID document extracts identity fields.', 'Custom models need training for business fields.'],
    hint: 'Structure, not business fields.', feat: 'Layout model', ref: 'diLayout' });

  // 5.2.2 Clean, grounded representations with Content Understanding
  q({ id: 'AI103-D5-023', obj: '5.2.2', topic: 'Content Understanding', diff: 'intermediate', type: 'single', scenario: true,
    q: 'An agent needs messy multimodal inputs (scans, photos, recordings) turned into predictable inputs for reasoning. What does Content Understanding provide?',
    opts: ['Clean Markdown representations and, when needed, schema-aligned fields with confidence scores and grounding', 'Only image thumbnails', 'Only translated text', 'Only audio files'],
    ans: [0],
    exp: 'Content Understanding turns messy multimodal inputs into predictable, standardised inputs: clean Markdown for reasoning and knowledge workflows, and schema-aligned fields with confidence and grounding for automation.',
    why: ['', 'It does more than thumbnails.', 'Translation is a different service.', 'It produces text and fields.'],
    hint: 'Markdown and fields.', feat: 'Content Understanding', ref: 'cuOverview' });
  q({ id: 'AI103-D5-024', obj: '5.2.2', topic: 'Content Understanding', diff: 'advanced', type: 'single', scenario: true,
    q: 'Which statement about Content Understanding confidence scores is accurate?',
    opts: ['They\'re supported for the document modality and range from 0 to 1 per field', 'They\'re available for every modality, including video', 'They\'re always 1', 'They replace grounding'],
    ans: [0],
    exp: 'Confidence scores provide reliability estimates from 0 to 1 for extracted field values. Microsoft notes that confidence scores are only supported for the document modality.',
    why: ['', 'They\'re only supported for documents.', 'Scores vary with reliability.', 'Grounding and confidence work together.'],
    hint: 'Check which modality supports them.', feat: 'Content Understanding', ref: 'cuWhatsNew' });
  q({ id: 'AI103-D5-025', obj: '5.2.2', topic: 'Content Understanding', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You want to choose between Document Intelligence and Content Understanding for a new processing project. Where do you get Microsoft\'s decision guidance?',
    opts: ['The "Choose the right Azure AI tool for document processing" guidance', 'The model router overview', 'The batch API guide', 'The Teams admin center'],
    ans: [0],
    exp: 'Microsoft publishes guidance comparing document-processing tools, including Document Intelligence and Content Understanding, to help you choose for each scenario.',
    why: ['', 'Model router chooses generative models.', 'Batch covers bulk inference.', 'Teams admin is unrelated.'],
    hint: 'There\'s a comparison guide.', feat: 'Document processing', ref: 'cuChoose' });

  // 5.2.3 Analyzers for structured or Markdown outputs
  q({ id: 'AI103-D5-026', obj: '5.2.3', topic: 'Analyzers', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each downstream need to the Content Understanding output format.',
    pairs: [
      ['Search and retrieval for RAG', 'Markdown'],
      ['Automation and analytics with a fixed schema', 'Structured JSON fields'],
      ['Auditable decisions that need to know how reliable each extracted value is', 'Confidence scores and grounding for each field'],
    ],
    exp: 'Content Understanding outputs Markdown for search and retrieval scenarios, or structured JSON that matches your schema for automation and analytics. Schema-aligned fields come with confidence scores and grounding, so agents can automate decisions with auditability.',
    hint: 'Text for retrieval, fields for automation.', feat: 'Content Understanding analyzers', ref: 'cuOverview' });
  q({ id: 'AI103-D5-027', obj: '5.2.3', topic: 'Analyzers', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You define a custom analyzer field but aren\'t sure whether it should be extracted, classified or generated. What does current Content Understanding do?',
    opts: ['The extraction method is optional; the service selects the best approach for each field', 'You must always set the method or the analyzer fails', 'It only supports extract', 'It only supports classify'],
    ans: [0],
    exp: 'In current versions the extraction method is optional, and Content Understanding automatically selects the best approach for each field, which reduces configuration effort.',
    why: ['', 'The method is optional now.', 'Classify and generate are also supported.', 'Extract and generate are also supported.'],
    hint: 'The service can decide.', feat: 'Content Understanding analyzers', ref: 'cuWhatsNew' });
  q({ id: 'AI103-D5-028', obj: '5.2.3', topic: 'Analyzers', diff: 'advanced', type: 'single', scenario: true,
    q: 'For RAG over structured documents where tables, sections and reading order matter, which extraction approach does Microsoft describe?',
    opts: ['Layout-aware extraction (rather than faster text-only extraction)', 'Text-only extraction for every case', 'Image generation', 'Speech synthesis'],
    ans: [0],
    exp: 'Use layout-aware extraction for structured documents where tables, sections and reading order matter. Faster text-only extraction produces clean Markdown for simpler RAG and ingestion scenarios.',
    why: ['', 'Text-only loses table and section structure.', 'Generation creates images.', 'Synthesis creates audio.'],
    hint: 'Structure matters here.', feat: 'Content Understanding', ref: 'cuDocument' });
})();
