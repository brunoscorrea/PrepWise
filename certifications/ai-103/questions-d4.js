/* AI-103 practice questions — Domain 4: Implement text analysis solutions (10–15%).
   Original learning content, not Microsoft exam questions. Verified against the official study
   guide and Microsoft Learn on 2026-11-19 ("verified" on each question). */
'use strict';
(() => {
  const V = '2026-11-19';
  const q = (o) => window.AI103.questions.push({ verified: V, ...o });

  // 4.1.1 Extract entities, topics, summaries and structured JSON
  q({ id: 'AI103-D4-001', obj: '4.1.1', topic: 'Entity extraction', diff: 'easy', type: 'single', scenario: true,
    q: 'A news app must recognise people, organisations and locations in articles with a prebuilt, predictable API. What should you use?',
    opts: ['Named entity recognition (NER) in Azure Language', 'Image generation', 'Speech synthesis', 'Batch deployment of an embeddings model'],
    ans: [0],
    exp: 'Azure Language named entity recognition identifies and categorises entities such as people, organisations and locations in text.',
    why: ['', 'Image generation creates pictures.', 'Speech synthesis creates audio.', 'Embeddings produce vectors, not labelled entities.'],
    hint: 'Prebuilt entity detection.', feat: 'Named entity recognition', ref: 'ner' });
  q({ id: 'AI103-D4-002', obj: '4.1.1', topic: 'Structured JSON', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You prompt a model to extract the supplier, total and due date from emails, but the JSON sometimes has missing or renamed keys. What fixes this?',
    opts: ['Structured outputs with a strict JSON schema', 'Higher temperature', 'Asking politely for JSON', 'A shorter email'],
    ans: [0],
    exp: 'Structured outputs make the model follow the JSON schema you supply, with strict enabled, so field names and types are consistent.',
    why: ['', 'Higher temperature reduces consistency.', 'Instructions alone don\'t guarantee a schema.', 'Shorter input doesn\'t enforce a format.'],
    hint: 'Enforce, don\'t request.', feat: 'Structured outputs', ref: 'structuredOutputs' });
  q({ id: 'AI103-D4-003', obj: '4.1.1', topic: 'Summarisation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Legal wants summaries built only from sentences that actually appear in a contract, with their positions, for traceability. Which summarisation type fits?',
    opts: ['Extractive summarisation', 'Abstractive summarisation', 'Translation', 'Key phrase extraction only'],
    ans: [0],
    exp: 'Extractive summarisation selects salient sentences from the source text, together with their positions. Abstractive summarisation writes new sentences.',
    why: ['', 'Abstractive summaries paraphrase, so sentences aren\'t verbatim.', 'Translation changes language.', 'Key phrases aren\'t a summary.'],
    hint: 'Verbatim sentences.', feat: 'Summarization', ref: 'summarization' });
  q({ id: 'AI103-D4-004', obj: '4.1.1', topic: 'Topics', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Thousands of support tickets need their main talking points pulled out quickly for a dashboard. Which prebuilt feature fits?',
    opts: ['Key phrase extraction in Azure Language', 'Document translation', 'Custom speech', 'Image moderation'],
    ans: [0],
    exp: 'Key phrase extraction identifies the main concepts in text, which suits quick topic overviews at scale.',
    why: ['', 'Translation changes language.', 'Custom speech improves speech recognition.', 'Image moderation scans images.'],
    hint: 'Main points of the text.', feat: 'Key phrase extraction', ref: 'keyPhrases' });

  // 4.1.2 Detect sentiment, tone, safety issues and sensitive content
  q({ id: 'AI103-D4-005', obj: '4.1.2', topic: 'Sensitive content', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Before storing chat transcripts, you must find and redact phone numbers, emails and ID numbers. Which capability fits?',
    opts: ['PII detection in Azure Language with redaction', 'Language detection', 'Summarisation', 'Text-to-speech'],
    ans: [0],
    exp: 'PII detection identifies, classifies and redacts sensitive data across text, conversations and native documents, with options for entity types and masking styles.',
    why: ['', 'Language detection identifies the language.', 'Summaries can still contain PII.', 'Text-to-speech creates audio.'],
    hint: 'Find and mask personal data.', feat: 'PII detection', ref: 'pii' });
  q({ id: 'AI103-D4-006', obj: '4.1.2', topic: 'Sentiment', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Product reviews say "great camera, terrible battery". You need sentiment per product feature, not just per review. Which feature fits?',
    opts: ['Opinion mining (aspect-based sentiment)', 'Document-level sentiment only', 'Language detection', 'NER'],
    ans: [0],
    exp: 'Opinion mining links sentiment to specific aspects, such as camera and battery, within a review.',
    why: ['', 'Document-level sentiment mixes both opinions.', 'Language detection doesn\'t score sentiment.', 'NER finds entities, not opinions about them.'],
    hint: 'Sentiment about each aspect.', feat: 'Opinion mining', ref: 'sentiment' });
  q({ id: 'AI103-D4-007', obj: '4.1.2', topic: 'Sentiment', diff: 'advanced', type: 'single', scenario: true,
    q: 'You\'re designing a new sentiment pipeline that will run for many years. What does Microsoft announce about sentiment analysis and opinion mining in Azure Language?',
    opts: ['They retire on 31 March 2029, and new projects should use Microsoft Foundry instead', 'They gain new features until 2035', 'They\'re only available in the US', 'They already stopped working'],
    ans: [0],
    exp: 'Sentiment analysis and opinion mining retire from Azure Language on 31 March 2029. Microsoft advises migrating existing workloads and directing new projects to Microsoft Foundry.',
    why: ['', 'A retirement date has been announced.', 'Availability isn\'t limited to the US.', 'They still work until the retirement date.'],
    hint: 'Check the retirement notice.', feat: 'Azure Language', ref: 'sentiment' });
  q({ id: 'AI103-D4-008', obj: '4.1.2', topic: 'Safety', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A forum must detect hateful and violent text in user posts at several severity levels. Which service fits?',
    opts: ['Azure AI Content Safety text moderation', 'Azure Translator', 'Key phrase extraction', 'Custom speech'],
    ans: [0],
    exp: 'Azure AI Content Safety detects harmful content such as hate and violence in text and images, with severity levels you can tune.',
    why: ['', 'Translator translates.', 'Key phrases summarise topics.', 'Custom speech improves recognition.'],
    hint: 'Moderation for text.', feat: 'Content Safety', ref: 'contentSafety' });

  // 4.1.3 Translate text with Azure Translator or LLM-powered flows
  q({ id: 'AI103-D4-009', obj: '4.1.3', topic: 'Translation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Marketing copy must be translated with a formal tone and the company\'s preferred terminology. Which Azure Translator option supports this?',
    opts: ['LLM-based translation with tone controls and adaptive custom translation using reference translations', 'Standard NMT with no options', 'Transliteration', 'Language detection'],
    ans: [0],
    exp: 'Translator supports choosing an LLM deployment instead of standard NMT. LLM translation adds tone variants (formal, informal, neutral) and adaptive custom translation with up to five reference translations or an adaptive dataset.',
    why: ['', 'Standard NMT doesn\'t offer tone variants.', 'Transliteration converts scripts, not tone.', 'Language detection identifies the language.'],
    hint: 'Tone and terminology need the LLM option.', feat: 'Azure Translator', ref: 'textTranslation' });
  q({ id: 'AI103-D4-010', obj: '4.1.3', topic: 'Translation', diff: 'advanced', type: 'single', scenario: true,
    q: 'What is required to use LLM-based translation in Azure Translator?',
    opts: ['A Microsoft Foundry resource with a supported LLM deployment', 'A Speech resource', 'A Content Safety resource only', 'Nothing beyond a standard Translator key'],
    ans: [0],
    exp: 'Using LLM-based translation requires a Microsoft Foundry resource. You select an LLM deployment instead of standard NMT based on quality, cost and scenario.',
    why: ['', 'Speech is for audio.', 'Content Safety isn\'t a translation engine.', 'LLM translation needs a Foundry resource.'],
    hint: 'The LLM has to be deployed somewhere.', feat: 'Azure Translator', ref: 'textTranslation' });
  q({ id: 'AI103-D4-011', obj: '4.1.3', topic: 'Translation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Hundreds of Word and PDF manuals must be translated while keeping their layout and formatting. Which feature fits?',
    opts: ['Translator document translation (asynchronous batch, with Blob Storage containers)', 'Text translation of copied paragraphs', 'Speech translation', 'Key phrase extraction'],
    ans: [0],
    exp: 'Document translation translates whole documents while preserving their structure and format. Asynchronous batch translation handles many and large files, using Azure Blob Storage containers for source and output.',
    why: ['', 'Copying text loses formatting.', 'Speech translation is for audio.', 'Key phrases aren\'t translation.'],
    hint: 'Whole documents, formatting intact.', feat: 'Document translation', ref: 'documentTranslation' });
  q({ id: 'AI103-D4-012', obj: '4.1.3', topic: 'Translation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Japanese product names must be shown in Latin script for a European site, without translating their meaning. Which Translator operation fits?',
    opts: ['Transliteration', 'Translation to French', 'Language detection', 'Summarisation'],
    ans: [0],
    exp: 'Transliteration converts text from one script to another for supported language pairs, without translating meaning.',
    why: ['', 'Translation changes the words\' language.', 'Detection identifies the language only.', 'Summarisation shortens text.'],
    hint: 'Change the script, not the language.', feat: 'Transliteration', ref: 'textTranslation' });

  // 4.1.4 Customise language model outputs for domain tasks
  q({ id: 'AI103-D4-013', obj: '4.1.4', topic: 'Domain customisation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Compliance summaries must always use the same five headings and regulatory terms. Prompt instructions and few-shot examples still produce inconsistent formats. What should you consider next?',
    opts: ['Supervised fine-tuning on high-quality example summaries', 'Raising temperature', 'Removing the examples', 'Switching to speech output'],
    ans: [0],
    exp: 'Start with prompt engineering. Consider fine-tuning when you need consistent style and format that prompt engineering alone can\'t reliably achieve. Supervised fine-tuning trains on labelled examples.',
    why: ['', 'Temperature increases variation.', 'Examples usually help consistency.', 'Speech doesn\'t fix format.'],
    hint: 'Prompting has reached its limit.', feat: 'Fine-tuning', ref: 'fineTuning' });
  q({ id: 'AI103-D4-014', obj: '4.1.4', topic: 'Domain customisation', diff: 'advanced', type: 'single', scenario: true,
    q: 'A domain extraction task needs current regulatory definitions that change monthly, plus a consistent output format. Which combination fits?',
    opts: ['RAG for the current definitions plus a structured output schema (and fine-tuning only if format still drifts)', 'Fine-tuning alone on last year\'s definitions', 'A larger model with no grounding', 'Translation'],
    ans: [0],
    exp: 'Prompt engineering, RAG and fine-tuning are complementary. RAG grounds answers in current domain data, structured outputs enforce format, and fine-tuning addresses style and format consistency if needed.',
    why: ['', 'Fine-tuned facts go stale monthly.', 'Without grounding, the model can\'t know new definitions.', 'Translation doesn\'t extract.'],
    hint: 'Facts from retrieval, format from the schema.', feat: 'Optimisation strategies', ref: 'promptEngineering' });
  q({ id: 'AI103-D4-015', obj: '4.1.4', topic: 'Domain customisation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A model keeps giving casual, chatty compliance summaries. What is the first, cheapest change to try?',
    opts: ['A system message that sets the role, audience, tone and required structure', 'Fine-tuning a new model', 'Buying provisioned throughput', 'Adding an OCR skill'],
    ans: [0],
    exp: 'System messages set the model\'s role, tone and constraints. Prompt engineering is the starting point before more expensive options such as fine-tuning.',
    why: ['', 'Fine-tuning costs more and comes later.', 'Capacity doesn\'t change tone.', 'OCR reads images.'],
    hint: 'Start with the prompt.', feat: 'System messages', ref: 'promptEngineering' });

  // 4.2.1 Speech to text and text to speech for agentic interactions
  q({ id: 'AI103-D4-016', obj: '4.2.1', topic: 'Speech to text', diff: 'intermediate', type: 'match', scenario: false,
    q: 'Match each transcription need to the Azure Speech mode.',
    pairs: [
      ['Live captions with intermediate results during a call', 'Real-time transcription'],
      ['A quick, synchronous transcript of a short recorded clip', 'Fast transcription'],
      ['Overnight processing of thousands of recorded calls', 'Batch transcription'],
    ],
    exp: 'Azure Speech supports real-time transcription with intermediate results, fast synchronous transcription with predictable latency, and asynchronous batch transcription for large volumes of recorded audio.',
    hint: 'Live, quick, bulk.', feat: 'Speech to text', ref: 'speechToText' });
  q({ id: 'AI103-D4-017', obj: '4.2.1', topic: 'Text to speech', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A voice agent must pause, emphasise certain words and use a specific voice style. How do you control this with Azure Speech text to speech?',
    opts: ['Speech Synthesis Markup Language (SSML)', 'A plain text file', 'An OCR skill', 'A scoring profile'],
    ans: [0],
    exp: 'SSML lets you control voice, style, pauses, emphasis and pronunciation in synthesized speech.',
    why: ['', 'Plain text gives no prosody control.', 'OCR reads images.', 'Scoring profiles tune search.'],
    hint: 'Markup for speech.', feat: 'SSML', ref: 'ssml' });
  q({ id: 'AI103-D4-018', obj: '4.2.1', topic: 'Speech agents', diff: 'advanced', type: 'single', scenario: true,
    q: 'You connect the Azure Speech MCP server to a Foundry agent so it can transcribe audio files and save generated speech. What must you provide?',
    opts: ['A SAS URL for an Azure Blob Storage container the server can read from and write to', 'A Translator key', 'A Content Understanding analyzer', 'Nothing; files stay in the prompt'],
    ans: [0],
    exp: 'The Speech MCP server saves generated audio to a Blob Storage container and can transcribe audio from public URLs or a container accessed with a SAS URL. You supply the container SAS URL when you connect it.',
    why: ['', 'Translator isn\'t used for this.', 'Content Understanding isn\'t required.', 'Audio files are stored in Blob Storage, not the prompt.'],
    hint: 'Where do the audio files live?', feat: 'Azure Speech MCP server', ref: 'speech' });

  // 4.2.2 Speech as an agent modality, including custom speech
  q({ id: 'AI103-D4-019', obj: '4.2.2', topic: 'Voice agents', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You want a low-latency, speech-to-speech voice agent without orchestrating speech recognition, a generative model and text-to-speech yourself. What should you use?',
    opts: ['The Voice Live API', 'Batch transcription', 'Document translation', 'Key phrase extraction'],
    ans: [0],
    exp: 'The Voice Live API is fully managed. It integrates speech recognition, generative AI and text to speech for low-latency speech-to-speech interactions, and you don\'t deploy or manage the generative models yourself.',
    why: ['', 'Batch is offline and asynchronous.', 'Document translation handles files.', 'Key phrases analyse text.'],
    hint: 'One managed API for voice conversations.', feat: 'Voice Live API', ref: 'voiceLive' });
  q({ id: 'AI103-D4-020', obj: '4.2.2', topic: 'Custom speech', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A medical voice agent misrecognises drug names and specialist terms. What improves recognition accuracy?',
    opts: ['A custom speech model trained and evaluated with domain data', 'A faster TTS voice', 'Higher temperature on the LLM', 'Image detail high'],
    ans: [0],
    exp: 'Custom speech lets you evaluate and improve speech recognition accuracy for your domain. Custom models can be used for real-time speech to text, speech translation and batch transcription.',
    why: ['', 'TTS affects output, not recognition.', 'Temperature affects generation.', 'Image detail is a vision setting.'],
    hint: 'Improve the recogniser for your vocabulary.', feat: 'Custom speech', ref: 'customSpeech' });
  q({ id: 'AI103-D4-021', obj: '4.2.2', topic: 'Voice agents', diff: 'advanced', type: 'single', scenario: true,
    q: 'Besides audio output, what else can the Voice Live API return to a voice agent app?',
    opts: ['Avatar visuals and action triggers', 'Vector embeddings of documents', 'Search index statistics', 'Translated PDF files'],
    ans: [0],
    exp: 'With the Voice Live API, developers provide audio input and receive audio output, avatar visuals and action triggers with minimal latency.',
    why: ['', 'Embeddings come from embedding models.', 'Index statistics come from search.', 'PDF translation is document translation.'],
    hint: 'Think about what a voice assistant shows and does.', feat: 'Voice Live API', ref: 'voiceLive' });

  // 4.2.3 Multimodal reasoning from audio inputs
  q({ id: 'AI103-D4-022', obj: '4.2.3', topic: 'Audio reasoning', diff: 'intermediate', type: 'single', scenario: true,
    q: 'You want a generative model to transcribe a spoken question, reason about it and reply, all within your Foundry app. Which models fit?',
    opts: ['Speech-capable generative models, such as audio models from the gpt-4o family in the Foundry catalog', 'Image generation models', 'Embeddings models only', 'Document Intelligence prebuilt models'],
    ans: [0],
    exp: 'Foundry includes speech-capable generative models, such as models from the gpt-4o family, that can transcribe speech and synthesize speech, so apps can work with audio input and output.',
    why: ['', 'Image models create pictures.', 'Embeddings don\'t process audio.', 'Document Intelligence reads documents.'],
    hint: 'Generative models that hear and speak.', feat: 'Audio models', ref: 'modelsOverview' });
  q({ id: 'AI103-D4-023', obj: '4.2.3', topic: 'Audio reasoning', diff: 'advanced', type: 'single', scenario: true,
    q: 'Customer calls must be analysed for complaints and summarised. Which pipeline is a sound design?',
    opts: ['Transcribe the audio (batch or a speech-capable model), then analyse and summarise the transcript, and redact PII before storage', 'Send the audio to Translator', 'Run OCR on the audio file', 'Use image moderation on the audio'],
    ans: [0],
    exp: 'Audio reasoning pipelines convert speech to text, then apply language analysis such as summarisation, and protect sensitive data with PII redaction. Conversation summarisation also accepts conversational input.',
    why: ['', 'Translator works on text.', 'OCR reads images.', 'Image moderation scans images.'],
    hint: 'Hear, understand, protect.', feat: 'Audio pipelines', ref: 'summarization' });
  q({ id: 'AI103-D4-024', obj: '4.2.3', topic: 'Audio reasoning', diff: 'intermediate', type: 'single', scenario: false,
    q: 'Which Azure Language summarisation input type accepts conversations, including speech-derived input?',
    opts: ['Conversation summarisation', 'Text summarisation of plain text blocks only', 'Key phrase extraction', 'Transliteration'],
    ans: [0],
    exp: 'Text summarisation accepts plain text blocks. Conversation summarisation accepts conversational input, including speech audio signals, and native document summarisation accepts documents.',
    why: ['', 'Text summarisation only accepts plain text blocks.', 'Key phrases aren\'t summaries.', 'Transliteration converts scripts.'],
    hint: 'A dialogue, not a document.', feat: 'Conversation summarization', ref: 'summarization' });

  // 4.2.4 Translate speech into other languages
  q({ id: 'AI103-D4-025', obj: '4.2.4', topic: 'Speech translation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'A conference app must take live English audio and return Spanish text and synthesized Spanish speech. Which capability fits?',
    opts: ['Azure Speech real-time speech translation', 'Document translation', 'Batch transcription only', 'Key phrase extraction'],
    ans: [0],
    exp: 'Standard speech translation takes an input audio stream in a source language and returns translated text, synthesized speech, or both in the target language.',
    why: ['', 'Document translation handles files.', 'Batch transcription doesn\'t translate in real time.', 'Key phrases don\'t translate.'],
    hint: 'Audio in, another language out.', feat: 'Speech translation', ref: 'speechTranslation' });
  q({ id: 'AI103-D4-026', obj: '4.2.4', topic: 'Speech translation', diff: 'advanced', type: 'single', scenario: true,
    q: 'Your speech translation app misrecognises company product names before translating them. What improves the input stage?',
    opts: ['Use a custom speech model, which can be used for speech translation', 'Increase TTS speed', 'Disable translation', 'Use image detail high'],
    ans: [0],
    exp: 'Custom speech models improve recognition accuracy and can be used for real-time speech to text, speech translation and batch transcription.',
    why: ['', 'TTS speed doesn\'t affect recognition.', 'Disabling translation removes the feature.', 'Image detail is for vision.'],
    hint: 'Fix recognition first.', feat: 'Custom speech', ref: 'customSpeech' });
  q({ id: 'AI103-D4-027', obj: '4.2.4', topic: 'Speech translation', diff: 'intermediate', type: 'single', scenario: true,
    q: 'Your agent receives spoken requests in many languages and must answer in the caller\'s language. Which design uses language models with Foundry Tools?',
    opts: ['Transcribe and translate the speech with Azure Speech, let the model reason in one language, then translate and synthesize the reply', 'Ask callers to use English only', 'Use OCR on recordings', 'Use image moderation'],
    ans: [0],
    exp: 'Speech translation and synthesis in Foundry Tools convert between languages, while a language model handles the reasoning. This keeps the agent logic consistent across languages.',
    why: ['', 'Excluding languages isn\'t a solution.', 'OCR reads images.', 'Image moderation is unrelated.'],
    hint: 'Translate in, reason, translate out.', feat: 'Speech translation', ref: 'speechTranslation' });
})();
