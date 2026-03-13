import type { Node, Edge } from '@xyflow/react'

// ─── Flow Templates ──────────────────────────────────────────────────────────
// Pre-built FlowFile definitions that load instantly (no LLM call).
// Each template showcases different node combinations and architectural patterns.

export interface FlowTemplate {
  id: string
  name: string
  desc: string
  category: 'starter' | 'creative' | 'engineering' | 'data' | 'agents' | 'advanced'
  icon: string
  nodes: Node[]
  edges: Edge[]
}

// ─── Helper: create an animated edge ─────────────────────────────────────────
function e(id: string, source: string, target: string, sourceHandle = 'out', targetHandle = 'in'): Edge {
  return { id, source, sourceHandle, target, targetHandle, animated: true }
}

// ─── Helper: create a node ──────────────────────────────────────────────────
function n(id: string, type: string, x: number, y: number, data: Record<string, unknown>): Node {
  return { id, type, position: { x, y }, data }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═════════════════════════════════════════════════════════════════════════════

export const FLOW_TEMPLATES: FlowTemplate[] = [

  // ──────────────────────────────────────────────────────────────────────────
  // STARTER
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'simple-chat',
    name: 'Simple Chat',
    desc: 'The "Hello World" — one input, one model, one output',
    category: 'starter',
    icon: '💬',
    nodes: [
      n('input-1', 'textInput', 80, 200, { label: 'Your Question', value: 'What are the three laws of thermodynamics? Explain each in one sentence.' }),
      n('sys-1', 'systemPrompt', 80, 40, { label: 'System', value: 'You are a concise, knowledgeable science tutor. Answer clearly and precisely.' }),
      n('model-1', 'model', 420, 120, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.7, output: '', status: 'idle' }),
      n('output-1', 'textOutput', 760, 160, { value: '' }),
    ],
    edges: [
      e('e1', 'input-1', 'model-1', 'out', 'user'),
      e('e2', 'sys-1', 'model-1', 'out', 'system'),
      e('e3', 'model-1', 'output-1'),
    ],
  },

  {
    id: 'prompt-chain',
    name: 'Two-Step Chain',
    desc: 'Model A generates → Model B refines — the foundation of chaining',
    category: 'starter',
    icon: '🔗',
    nodes: [
      n('input-1', 'textInput', 60, 180, { label: 'Topic', value: 'The future of quantum computing' }),
      n('sys-draft', 'systemPrompt', 60, 30, { label: 'Drafter', value: 'Write a rough 3-paragraph essay draft on the given topic. Be creative and include bold predictions.' }),
      n('model-draft', 'model', 380, 100, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.9, output: '', status: 'idle' }),
      n('sys-refine', 'systemPrompt', 380, 320, { label: 'Editor', value: 'You are a meticulous editor. Refine the following draft: fix grammar, sharpen arguments, improve flow. Keep the same length.' }),
      n('model-refine', 'model', 720, 200, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.3, output: '', status: 'idle' }),
      n('output-1', 'textOutput', 1060, 240, { value: '' }),
    ],
    edges: [
      e('e1', 'input-1', 'model-draft', 'out', 'user'),
      e('e2', 'sys-draft', 'model-draft', 'out', 'system'),
      e('e3', 'model-draft', 'model-refine', 'out', 'user'),
      e('e4', 'sys-refine', 'model-refine', 'out', 'system'),
      e('e5', 'model-refine', 'output-1'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CREATIVE
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'parallel-perspectives',
    name: 'Parallel Perspectives',
    desc: 'Three models debate the same question from different angles, then a synthesizer merges them',
    category: 'creative',
    icon: '🎭',
    nodes: [
      n('question', 'textInput', 60, 260, { label: 'Debate Topic', value: 'Should AI systems be granted legal personhood?' }),
      n('sys-opt', 'systemPrompt', 60, 40, { label: 'Optimist', value: 'You are a techno-optimist. Argue passionately FOR the given topic. Use concrete examples and forward-thinking logic.' }),
      n('sys-skep', 'systemPrompt', 60, 480, { label: 'Skeptic', value: 'You are a cautious skeptic. Argue thoughtfully AGAINST the given topic. Cite risks, historical precedent, and ethical concerns.' }),
      n('sys-phil', 'systemPrompt', 60, 700, { label: 'Philosopher', value: 'You are a neutral philosopher. Analyze the given topic from first principles — what are the deeper questions being asked? Do not take a side.' }),
      n('model-opt', 'model', 400, 80, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.8, output: '', status: 'idle' }),
      n('model-skep', 'model', 400, 350, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.8, output: '', status: 'idle' }),
      n('model-phil', 'model', 400, 620, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.8, output: '', status: 'idle' }),
      n('combine-top', 'concat', 740, 200, { separator: '\n\n--- SKEPTIC ---\n\n' }),
      n('combine-all', 'concat', 940, 380, { separator: '\n\n--- PHILOSOPHER ---\n\n' }),
      n('sys-synth', 'systemPrompt', 940, 100, { label: 'Synthesizer', value: 'You have received three different perspectives on a debate topic (Optimist, Skeptic, Philosopher). Write a brilliant 4-paragraph synthesis that:\n1. Identifies the strongest point from each perspective\n2. Finds surprising common ground\n3. Proposes a nuanced conclusion that none of the three reached alone' }),
      n('model-synth', 'model', 1240, 280, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.6, output: '', status: 'idle' }),
      n('output-1', 'textOutput', 1560, 320, { value: '' }),
    ],
    edges: [
      e('e1', 'question', 'model-opt', 'out', 'user'),
      e('e2', 'sys-opt', 'model-opt', 'out', 'system'),
      e('e3', 'question', 'model-skep', 'out', 'user'),
      e('e4', 'sys-skep', 'model-skep', 'out', 'system'),
      e('e5', 'question', 'model-phil', 'out', 'user'),
      e('e6', 'sys-phil', 'model-phil', 'out', 'system'),
      e('e7', 'model-opt', 'combine-top', 'out', 'a'),
      e('e8', 'model-skep', 'combine-top', 'out', 'b'),
      e('e9', 'combine-top', 'combine-all', 'out', 'a'),
      e('e10', 'model-phil', 'combine-all', 'out', 'b'),
      e('e11', 'combine-all', 'model-synth', 'out', 'user'),
      e('e12', 'sys-synth', 'model-synth', 'out', 'system'),
      e('e13', 'model-synth', 'output-1'),
    ],
  },

  {
    id: 'story-forge',
    name: 'Story Forge',
    desc: 'Generates characters, setting, and plot in parallel, then weaves a short story',
    category: 'creative',
    icon: '📖',
    nodes: [
      n('genre', 'textInput', 60, 280, { label: 'Genre & Theme', value: 'Solarpunk mystery set in a floating city powered by bioluminescent algae' }),
      n('sys-chars', 'systemPrompt', 60, 40, { label: 'Character Designer', value: 'Create 2-3 compelling characters for the given genre/setting. For each: name, role, key trait, secret motivation. Be vivid and specific.' }),
      n('sys-world', 'systemPrompt', 60, 500, { label: 'World Builder', value: 'Design the setting for the given genre. Describe: the physical environment, technology level, social structure, and one unique rule of this world. Make it feel lived-in.' }),
      n('model-chars', 'model', 400, 100, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.9, output: '', status: 'idle' }),
      n('model-world', 'model', 400, 420, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.9, output: '', status: 'idle' }),
      n('combine-1', 'concat', 730, 260, { separator: '\n\n=== SETTING ===\n\n' }),
      n('sys-story', 'systemPrompt', 730, 40, { label: 'Author', value: 'Using the characters and setting provided, write the opening scene (500-700 words) of a gripping story. Start in media res — drop us into the action. Use sensory details and sharp dialogue.' }),
      n('model-story', 'model', 1050, 180, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.85, output: '', status: 'idle' }),
      n('output-1', 'textOutput', 1380, 220, { value: '' }),
    ],
    edges: [
      e('e1', 'genre', 'model-chars', 'out', 'user'),
      e('e2', 'sys-chars', 'model-chars', 'out', 'system'),
      e('e3', 'genre', 'model-world', 'out', 'user'),
      e('e4', 'sys-world', 'model-world', 'out', 'system'),
      e('e5', 'model-chars', 'combine-1', 'out', 'a'),
      e('e6', 'model-world', 'combine-1', 'out', 'b'),
      e('e7', 'combine-1', 'model-story', 'out', 'user'),
      e('e8', 'sys-story', 'model-story', 'out', 'system'),
      e('e9', 'model-story', 'output-1'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ENGINEERING
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'code-review-pipeline',
    name: 'Code Review Pipeline',
    desc: 'Analyzes code for bugs, then security issues, then suggests improvements — three-pass review',
    category: 'engineering',
    icon: '🔍',
    nodes: [
      n('code', 'textInput', 60, 240, { label: 'Code to Review', value: 'function processPayment(amount, userId) {\n  const user = db.query("SELECT * FROM users WHERE id = " + userId);\n  if (amount > 0) {\n    user.balance -= amount;\n    db.update(user);\n    log("Payment processed: " + amount);\n    return { success: true };\n  }\n}' }),
      n('sys-bugs', 'systemPrompt', 60, 20, { label: 'Bug Hunter', value: 'You are an expert bug hunter. Analyze the code for:\n- Logic errors and edge cases\n- Null/undefined risks\n- Race conditions\n- Missing error handling\nList each bug with severity (critical/major/minor) and line reference.' }),
      n('model-bugs', 'model', 440, 80, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.2, output: '', status: 'idle' }),
      n('sys-sec', 'systemPrompt', 440, 440, { label: 'Security Auditor', value: 'You are a security auditor (OWASP certified). Analyze the code for:\n- Injection vulnerabilities (SQL, XSS, command)\n- Authentication/authorization flaws\n- Data exposure risks\n- Input validation issues\nRate each finding: CRITICAL / HIGH / MEDIUM / LOW.' }),
      n('model-sec', 'model', 440, 320, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.2, output: '', status: 'idle' }),
      n('combine-1', 'concat', 780, 180, { separator: '\n\n🔒 SECURITY AUDIT:\n\n' }),
      n('sys-improve', 'systemPrompt', 780, 420, { label: 'Improver', value: 'Given the original code and the bug/security analysis, write an IMPROVED version of the code that:\n1. Fixes ALL identified issues\n2. Adds proper error handling\n3. Follows best practices\n4. Includes brief inline comments explaining each fix\n\nOutput only the improved code.' }),
      n('model-improve', 'model', 1100, 260, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.3, output: '', status: 'idle' }),
      n('output-1', 'textOutput', 1420, 300, { value: '' }),
    ],
    edges: [
      e('e1', 'code', 'model-bugs', 'out', 'user'),
      e('e2', 'sys-bugs', 'model-bugs', 'out', 'system'),
      e('e3', 'code', 'model-sec', 'out', 'user'),
      e('e4', 'sys-sec', 'model-sec', 'out', 'system'),
      e('e5', 'model-bugs', 'combine-1', 'out', 'a'),
      e('e6', 'model-sec', 'combine-1', 'out', 'b'),
      e('e7', 'combine-1', 'model-improve', 'out', 'user'),
      e('e8', 'sys-improve', 'model-improve', 'out', 'system'),
      e('e9', 'model-improve', 'output-1'),
    ],
  },

  {
    id: 'explain-like-5',
    name: 'ELI5 Ladder',
    desc: 'Explains a concept at 3 levels: expert → college → five-year-old, using prompt templates',
    category: 'engineering',
    icon: '🪜',
    nodes: [
      n('topic', 'textInput', 60, 200, { label: 'Concept', value: 'How does public-key cryptography work?' }),
      n('template-1', 'promptTemplate', 60, 400, { template: 'Explain {{concept}} at an expert level. Use precise technical terminology, cite relevant papers or algorithms, assume deep domain knowledge.' }),
      n('template-2', 'promptTemplate', 500, 400, { template: 'Explain {{concept}} for a college sophomore. Use analogies, avoid jargon, but maintain accuracy. About 150 words.' }),
      n('template-3', 'promptTemplate', 940, 400, { template: 'Explain {{concept}} to a five-year-old. Use a fun story or analogy involving toys, animals, or food. Make it delightful. Under 100 words.' }),
      n('model-1', 'model', 340, 120, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.5, output: '', status: 'idle' }),
      n('model-2', 'model', 780, 120, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.7, output: '', status: 'idle' }),
      n('model-3', 'model', 1220, 120, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.9, output: '', status: 'idle' }),
      n('out-expert', 'textOutput', 340, 340, { value: '' }),
      n('out-college', 'textOutput', 780, 340, { value: '' }),
      n('out-eli5', 'textOutput', 1220, 340, { value: '' }),
    ],
    edges: [
      e('e1', 'topic', 'template-1', 'out', 'concept'),
      e('e2', 'topic', 'template-2', 'out', 'concept'),
      e('e3', 'topic', 'template-3', 'out', 'concept'),
      e('e4', 'template-1', 'model-1', 'out', 'user'),
      e('e5', 'template-2', 'model-2', 'out', 'user'),
      e('e6', 'template-3', 'model-3', 'out', 'user'),
      e('e7', 'model-1', 'out-expert'),
      e('e8', 'model-2', 'out-college'),
      e('e9', 'model-3', 'out-eli5'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // DATA
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'api-summarizer',
    name: 'API → Extract → Summarize',
    desc: 'Fetches a public API, extracts key data with JSON path, then summarizes with an LLM',
    category: 'data',
    icon: '🌐',
    nodes: [
      n('http-1', 'httpRequest', 60, 140, { method: 'GET', url: 'https://api.spacexdata.com/v4/launches/latest', headers: '', body: '' }),
      n('extract-name', 'jsonExtract', 400, 60, { path: 'name' }),
      n('extract-details', 'jsonExtract', 400, 200, { path: 'details' }),
      n('extract-success', 'jsonExtract', 400, 340, { path: 'success' }),
      n('template-1', 'promptTemplate', 720, 140, { template: 'Summarize this SpaceX launch in 2-3 exciting sentences for a space enthusiast newsletter:\n\nMission: {{name}}\nSuccess: {{success}}\nDetails: {{details}}' }),
      n('sys-1', 'systemPrompt', 720, 380, { label: 'Newsletter Writer', value: 'You write thrilling space news. Be accurate but make it exciting. Include one forward-looking sentence about what this means for space exploration.' }),
      n('model-1', 'model', 1060, 220, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.7, output: '', status: 'idle' }),
      n('output-1', 'textOutput', 1380, 260, { value: '' }),
    ],
    edges: [
      e('e1', 'http-1', 'extract-name', 'out', 'in'),
      e('e2', 'http-1', 'extract-details', 'out', 'in'),
      e('e3', 'http-1', 'extract-success', 'out', 'in'),
      e('e4', 'extract-name', 'template-1', 'out', 'name'),
      e('e5', 'extract-details', 'template-1', 'out', 'details'),
      e('e6', 'extract-success', 'template-1', 'out', 'success'),
      e('e7', 'template-1', 'model-1', 'out', 'user'),
      e('e8', 'sys-1', 'model-1', 'out', 'system'),
      e('e9', 'model-1', 'output-1'),
    ],
  },

  {
    id: 'data-transformer',
    name: 'Code Transform Pipeline',
    desc: 'Fetches JSON data, transforms it with JavaScript, then analyzes the result with an LLM',
    category: 'data',
    icon: '⚡',
    nodes: [
      n('http-1', 'httpRequest', 60, 150, { method: 'GET', url: 'https://jsonplaceholder.typicode.com/users', headers: '', body: '' }),
      n('code-1', 'codeRunner', 400, 100, { code: '// Parse user data and create a summary\nconst users = JSON.parse(input);\nconst summary = users.map(u => {\n  return `${u.name} (${u.company.name}) - ${u.address.city}`;\n}).join("\\n");\nreturn `Found ${users.length} users:\\n\\n${summary}`;' }),
      n('sys-1', 'systemPrompt', 400, 360, { label: 'Analyst', value: 'You are a data analyst. Given a list of users and their companies, provide:\n1. Geographic distribution analysis\n2. Company name patterns\n3. Interesting observations\nBe concise and insightful.' }),
      n('model-1', 'model', 760, 180, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.5, output: '', status: 'idle' }),
      n('output-1', 'textOutput', 1080, 220, { value: '' }),
    ],
    edges: [
      e('e1', 'http-1', 'code-1', 'out', 'in'),
      e('e2', 'code-1', 'model-1', 'out', 'user'),
      e('e3', 'sys-1', 'model-1', 'out', 'system'),
      e('e4', 'model-1', 'output-1'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // AGENTS
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'self-critique-loop',
    name: 'Self-Critique Loop',
    desc: 'Model writes, critic evaluates, writer revises — with persistent memory of past critiques',
    category: 'agents',
    icon: '🔄',
    nodes: [
      n('task', 'textInput', 60, 200, { label: 'Writing Task', value: 'Write a compelling cover letter for a senior software engineer applying to a climate tech startup. They have 8 years of experience in distributed systems.' }),
      n('memory-1', 'conversationBuffer', 60, 420, { maxMessages: 10, messages: [] }),
      n('combine-ctx', 'concat', 340, 260, { separator: '\n\n--- Previous feedback (if any) ---\n\n' }),
      n('sys-writer', 'systemPrompt', 340, 40, { label: 'Writer', value: 'Write or revise based on the task. If previous feedback is provided, carefully address EACH point. Your writing should be professional, genuine, and specific.' }),
      n('model-writer', 'model', 660, 140, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.7, output: '', status: 'idle' }),
      n('sys-critic', 'systemPrompt', 660, 440, { label: 'Critic', value: 'Critically evaluate this writing. Score it 1-10 and provide:\n1. What works well (keep these)\n2. What needs improvement (be specific)\n3. One concrete suggestion that would elevate this from good to great\nBe honest but constructive.' }),
      n('model-critic', 'model', 980, 320, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.4, output: '', status: 'idle' }),
      n('out-draft', 'textOutput', 980, 80, { value: '' }),
      n('out-critique', 'textOutput', 1280, 360, { value: '' }),
    ],
    edges: [
      e('e1', 'task', 'combine-ctx', 'out', 'a'),
      e('e2', 'memory-1', 'combine-ctx', 'out', 'b'),
      e('e3', 'combine-ctx', 'model-writer', 'out', 'user'),
      e('e4', 'sys-writer', 'model-writer', 'out', 'system'),
      e('e5', 'model-writer', 'out-draft'),
      e('e6', 'model-writer', 'model-critic', 'out', 'user'),
      e('e7', 'sys-critic', 'model-critic', 'out', 'system'),
      e('e8', 'model-critic', 'memory-1', 'out', 'in'),
      e('e9', 'model-critic', 'out-critique'),
    ],
  },

  {
    id: 'sentiment-router',
    name: 'Sentiment Router',
    desc: 'Classifies input as positive/negative, routes to specialized response handlers',
    category: 'agents',
    icon: '🔀',
    nodes: [
      n('input-1', 'textInput', 60, 200, { label: 'Customer Message', value: 'I\'ve been a loyal customer for 5 years and this is the worst experience I\'ve ever had. My order arrived damaged and nobody will help me!' }),
      n('sys-classify', 'systemPrompt', 60, 20, { label: 'Classifier', value: 'Classify the sentiment of this message. Respond with EXACTLY one word: "positive" or "negative". Nothing else.' }),
      n('model-classify', 'model', 380, 100, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.1, output: '', status: 'idle' }),
      n('router', 'conditional', 680, 160, { mode: 'contains', pattern: 'positive' }),
      n('sys-pos', 'systemPrompt', 680, 0, { label: 'Happy Path', value: 'The customer is happy! Respond warmly: thank them, reinforce their positive experience, and subtly suggest they share their experience or try a related product.' }),
      n('sys-neg', 'systemPrompt', 680, 380, { label: 'Recovery Agent', value: 'The customer is upset. Respond with:\n1. Genuine empathy (acknowledge their specific frustration)\n2. Take ownership (no deflecting)\n3. Concrete resolution (specific steps you\'ll take)\n4. A goodwill gesture\nBe human, not corporate.' }),
      n('model-pos', 'model', 1000, 40, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.7, output: '', status: 'idle' }),
      n('model-neg', 'model', 1000, 340, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.5, output: '', status: 'idle' }),
      n('out-pos', 'textOutput', 1320, 80, { value: '' }),
      n('out-neg', 'textOutput', 1320, 380, { value: '' }),
      n('var-set', 'variableStore', 680, 540, { varName: 'last_sentiment', mode: 'set' }),
    ],
    edges: [
      e('e1', 'input-1', 'model-classify', 'out', 'user'),
      e('e2', 'sys-classify', 'model-classify', 'out', 'system'),
      e('e3', 'model-classify', 'router', 'out', 'in'),
      e('e4', 'router', 'model-pos', 'true', 'user'),
      e('e5', 'sys-pos', 'model-pos', 'out', 'system'),
      e('e6', 'router', 'model-neg', 'false', 'user'),
      e('e7', 'sys-neg', 'model-neg', 'out', 'system'),
      e('e8', 'model-pos', 'out-pos'),
      e('e9', 'model-neg', 'out-neg'),
      e('e10', 'model-classify', 'var-set', 'out', 'in'),
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ADVANCED
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: 'research-synthesizer',
    name: 'Research Synthesizer',
    desc: 'Generates research questions, answers each, then synthesizes a comprehensive report',
    category: 'advanced',
    icon: '🔬',
    nodes: [
      n('topic', 'textInput', 60, 260, { label: 'Research Topic', value: 'The impact of microplastics on human gut microbiome health' }),
      n('sys-questions', 'systemPrompt', 60, 40, { label: 'Question Generator', value: 'Given the research topic, generate exactly 3 focused research sub-questions that together would provide a comprehensive understanding. Format as:\nQ1: ...\nQ2: ...\nQ3: ...\nMake each question address a different dimension (mechanism, evidence, implications).' }),
      n('model-questions', 'model', 400, 120, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.6, output: '', status: 'idle' }),
      n('code-split', 'codeRunner', 700, 120, { code: '// Split the 3 questions and return them formatted for research\nconst lines = input.split("\\n").filter(l => l.trim().startsWith("Q"));\nreturn lines.map(l => l.replace(/^Q\\d+:\\s*/, "")).join("\\n---SPLIT---\\n");' }),
      n('sys-research', 'systemPrompt', 700, 380, { label: 'Researcher', value: 'You are a research scientist. For each question below, provide a well-reasoned 150-word answer based on current scientific understanding. Cite specific studies or mechanisms where possible. If the questions are separated by ---SPLIT---, answer ALL of them with clear headings.' }),
      n('model-research', 'model', 1020, 220, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.4, output: '', status: 'idle' }),
      n('sys-synth', 'systemPrompt', 1020, 460, { label: 'Report Writer', value: 'Synthesize the research answers into a cohesive 400-word executive summary. Structure:\n1. Opening statement (1 sentence capturing the key finding)\n2. Mechanism & Evidence (what we know and how)\n3. Current Impact (what this means today)\n4. Future Outlook (what to watch for)\n5. Key Takeaway (one sentence a policymaker could act on)\nWrite for an informed non-specialist audience.' }),
      n('model-synth', 'model', 1340, 300, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.5, output: '', status: 'idle' }),
      n('output-1', 'textOutput', 1660, 340, { value: '' }),
    ],
    edges: [
      e('e1', 'topic', 'model-questions', 'out', 'user'),
      e('e2', 'sys-questions', 'model-questions', 'out', 'system'),
      e('e3', 'model-questions', 'code-split', 'out', 'in'),
      e('e4', 'code-split', 'model-research', 'out', 'user'),
      e('e5', 'sys-research', 'model-research', 'out', 'system'),
      e('e6', 'model-research', 'model-synth', 'out', 'user'),
      e('e7', 'sys-synth', 'model-synth', 'out', 'system'),
      e('e8', 'model-synth', 'output-1'),
    ],
  },

  {
    id: 'model-arena',
    name: 'Model Arena',
    desc: 'Same prompt to 3 different models — compare quality, speed, and style side-by-side',
    category: 'advanced',
    icon: '⚔️',
    nodes: [
      n('prompt', 'textInput', 60, 220, { label: 'Challenge Prompt', value: 'Write a haiku about a programmer debugging at 3 AM. Then explain the metaphor in one sentence.' }),
      n('sys-shared', 'systemPrompt', 60, 40, { label: 'Shared System', value: 'You are a creative writer. Follow the instructions precisely. Be original and surprising.' }),
      n('model-a', 'model', 420, 40, { model: 'anthropic/claude-sonnet-4-6', systemPrompt: '', temperature: 0.8, output: '', status: 'idle' }),
      n('model-b', 'model', 420, 220, { model: 'openai/gpt-4o', systemPrompt: '', temperature: 0.8, output: '', status: 'idle' }),
      n('model-c', 'model', 420, 400, { model: 'google/gemini-2.5-flash-preview', systemPrompt: '', temperature: 0.8, output: '', status: 'idle' }),
      n('out-a', 'textOutput', 780, 60, { value: '' }),
      n('out-b', 'textOutput', 780, 240, { value: '' }),
      n('out-c', 'textOutput', 780, 420, { value: '' }),
      n('note-1', 'note', 780, 560, { text: '⚔️ MODEL ARENA\nCompare the outputs side-by-side!\nWhich model was most creative?\nWhich followed instructions best?\nWhich had the best metaphor?', color: 'Purple' }),
    ],
    edges: [
      e('e1', 'prompt', 'model-a', 'out', 'user'),
      e('e2', 'prompt', 'model-b', 'out', 'user'),
      e('e3', 'prompt', 'model-c', 'out', 'user'),
      e('e4', 'sys-shared', 'model-a', 'out', 'system'),
      e('e5', 'sys-shared', 'model-b', 'out', 'system'),
      e('e6', 'sys-shared', 'model-c', 'out', 'system'),
      e('e7', 'model-a', 'out-a'),
      e('e8', 'model-b', 'out-b'),
      e('e9', 'model-c', 'out-c'),
    ],
  },

  {
    id: 'meta-prompt-engineer',
    name: 'Meta-Prompt Engineer',
    desc: 'An LLM that writes better prompts — describe what you want, get an optimized system prompt back',
    category: 'advanced',
    icon: '🧬',
    nodes: [
      n('goal', 'textInput', 60, 200, { label: 'What do you want the AI to do?', value: 'I need an AI that helps non-technical founders write clear technical specifications for their MVP. It should ask clarifying questions and output a structured spec document.' }),
      n('sys-meta', 'systemPrompt', 60, 20, { label: 'Prompt Engineer', value: 'You are an expert prompt engineer. Given a description of what someone wants an AI to do, write the PERFECT system prompt for that use case.\n\nYour output should:\n1. Start with a clear role definition\n2. Include specific behavioral instructions\n3. Define the output format\n4. Add guardrails and edge case handling\n5. Include 1-2 few-shot examples\n\nOutput ONLY the system prompt text, ready to paste.' }),
      n('model-meta', 'model', 420, 100, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.5, output: '', status: 'idle' }),
      n('sys-test', 'systemPrompt', 420, 380, { label: 'Test Runner', value: 'You are a QA engineer testing AI system prompts. Given a system prompt, evaluate it on:\n- Clarity (is the role obvious?)\n- Completeness (does it cover edge cases?)\n- Specificity (are instructions actionable?)\n- Format (does it define output structure?)\nScore 1-10 for each, then suggest ONE improvement.' }),
      n('model-test', 'model', 760, 300, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.3, output: '', status: 'idle' }),
      n('out-prompt', 'textOutput', 760, 60, { value: '' }),
      n('out-eval', 'textOutput', 1080, 340, { value: '' }),
      n('var-save', 'variableStore', 760, 520, { varName: 'best_prompt', mode: 'set' }),
    ],
    edges: [
      e('e1', 'goal', 'model-meta', 'out', 'user'),
      e('e2', 'sys-meta', 'model-meta', 'out', 'system'),
      e('e3', 'model-meta', 'out-prompt'),
      e('e4', 'model-meta', 'model-test', 'out', 'user'),
      e('e5', 'sys-test', 'model-test', 'out', 'system'),
      e('e6', 'model-test', 'out-eval'),
      e('e7', 'model-meta', 'var-save', 'out', 'in'),
    ],
  },

  {
    id: 'language-bridge',
    name: 'Universal Translator',
    desc: 'Translates to 4 languages in parallel with cultural adaptation notes',
    category: 'creative',
    icon: '🌍',
    nodes: [
      n('text', 'textInput', 60, 300, { label: 'Text to Translate', value: 'Our product launch exceeded expectations. We\'re thrilled to announce 50,000 users in the first week, and the community feedback has been incredibly positive.' }),
      n('sys-fr', 'systemPrompt', 60, 40, { label: 'French', value: 'Translate to French. After the translation, add a brief [Cultural note] about any phrases you adapted for French business culture.' }),
      n('sys-es', 'systemPrompt', 60, 560, { label: 'Spanish', value: 'Translate to Spanish (Latin American). After the translation, add a brief [Cultural note] about any phrases you adapted.' }),
      n('sys-ja', 'systemPrompt', 500, 40, { label: 'Japanese', value: 'Translate to Japanese. Use appropriate keigo (polite business Japanese). After the translation, add a brief [Cultural note] about formality choices.' }),
      n('sys-ar', 'systemPrompt', 500, 560, { label: 'Arabic', value: 'Translate to Modern Standard Arabic. After the translation, add a brief [Cultural note] about any adaptations for Arabic business communication.' }),
      n('model-fr', 'model', 340, 120, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.3, output: '', status: 'idle' }),
      n('model-es', 'model', 340, 440, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.3, output: '', status: 'idle' }),
      n('model-ja', 'model', 780, 120, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.3, output: '', status: 'idle' }),
      n('model-ar', 'model', 780, 440, { model: 'openrouter/auto', systemPrompt: '', temperature: 0.3, output: '', status: 'idle' }),
      n('out-fr', 'textOutput', 1100, 60, { value: '' }),
      n('out-es', 'textOutput', 1100, 240, { value: '' }),
      n('out-ja', 'textOutput', 1100, 400, { value: '' }),
      n('out-ar', 'textOutput', 1100, 560, { value: '' }),
    ],
    edges: [
      e('e1', 'text', 'model-fr', 'out', 'user'),
      e('e2', 'sys-fr', 'model-fr', 'out', 'system'),
      e('e3', 'text', 'model-es', 'out', 'user'),
      e('e4', 'sys-es', 'model-es', 'out', 'system'),
      e('e5', 'text', 'model-ja', 'out', 'user'),
      e('e6', 'sys-ja', 'model-ja', 'out', 'system'),
      e('e7', 'text', 'model-ar', 'out', 'user'),
      e('e8', 'sys-ar', 'model-ar', 'out', 'system'),
      e('e9', 'model-fr', 'out-fr'),
      e('e10', 'model-es', 'out-es'),
      e('e11', 'model-ja', 'out-ja'),
      e('e12', 'model-ar', 'out-ar'),
    ],
  },
]

export const TEMPLATE_CATEGORIES = [
  { id: 'starter', label: '🌱 Starter', desc: 'Learn the basics' },
  { id: 'creative', label: '🎨 Creative', desc: 'Writing & ideation' },
  { id: 'engineering', label: '⚙️ Engineering', desc: 'Code & analysis' },
  { id: 'data', label: '📊 Data', desc: 'APIs & transforms' },
  { id: 'agents', label: '🤖 Agents', desc: 'Memory & routing' },
  { id: 'advanced', label: '🚀 Advanced', desc: 'Complex architectures' },
] as const
