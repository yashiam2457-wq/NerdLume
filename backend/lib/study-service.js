const crypto = require('crypto');

function firstLine(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || '';
}

function topicFromRequest(body) {
  return (
    firstLine(body.topic) ||
    firstLine(body.input) ||
    firstLine(body.text) ||
    firstLine(body.syllabus) ||
    'Untitled topic'
  ).slice(0, 80);
}

function buildNotes(topic, body) {
  const style = body.noteStyle || body.style || 'Cornell';
  const format = body.noteFormat || body.detail || 'Brief';
  return [
    `NERDYBRO NOTES`,
    `Topic: ${topic}`,
    `Style: ${style}`,
    `Format: ${format}`,
    '',
    '1) Definition',
    `• ${topic} is explained in a clean, exam-friendly way.`,
    '',
    '2) Core Ideas',
    '• Identify the concept',
    '• Break it into smaller parts',
    '• Connect theory with application',
    '',
    '3) Quick Revision',
    `• ${topic} is best revised through short summaries, examples, and practice questions.`,
    '',
    '4) Summary',
    `• ${topic} becomes easier when the key terms, steps, and use-cases are reviewed together.`
  ].join('\n');
}

function buildPractice(topic, body) {
  const practiceType = body.practiceType || 'Quiz';
  return [
    `NERDYBRO PRACTICE`,
    `Topic: ${topic}`,
    `Type: ${practiceType}`,
    '',
    'Q1. Define the topic in your own words.',
    'Q2. Write two key advantages or applications.',
    'Q3. Explain one common mistake students make.',
    'Q4. Give a short real-world example.',
    'Q5. State one memory trick for revision.',
    '',
    'Answer Key',
    `• ${topic} should be answered with concept, application, and example.`,
    `• ${practiceType} format can be adjusted later when the AI provider is connected.`
  ].join('\n');
}

function buildExplain(topic, body) {
  const explainType = body.explainType || 'theory';
  return [
    `NERDYBRO EXPLAIN MODE`,
    `Topic: ${topic}`,
    `Type: ${explainType}`,
    '',
    'Step 1: State the problem clearly.',
    'Step 2: Introduce the key formula, rule, or principle.',
    'Step 3: Work through the solution in small steps.',
    'Step 4: End with a short takeaway.',
    '',
    `This is a local fallback explanation for ${topic}.`,
    'It is structured so a future AI provider can replace the body content without changing the API contract.'
  ].join('\n');
}

function buildQuick(topic, body) {
  const quickMode = body.quickMode || 'assignment';
  const language = body.language || 'Python';
  return [
    `NERDYBRO ${quickMode.toUpperCase()}`,
    `Topic: ${topic}`,
    `Language: ${language}`,
    '',
    'Introduction',
    `This file covers the requirements, approach, code, and conclusion for ${topic}.`,
    '',
    'Implementation',
    `• Replace this template with the connected AI API output for ${topic}.`,
    '',
    'Conclusion',
    `The backend is ready for a real provider, but this local template keeps the app usable today.`
  ].join('\n');
}

function buildVideoNotes(topic, body) {
  return {
    videoId: body.videoId || '',
    sourceUrl: body.videoUrl || body.url || '',
    frames: [
      {
        time: '00:00',
        title: 'Introduction',
        notes: `The video introduces ${topic} and frames the main learning goal.`
      },
      {
        time: '02:10',
        title: 'Core Idea',
        notes: `The presenter explains the key concept behind ${topic} with a simple example.`
      },
      {
        time: '05:30',
        title: 'Worked Example',
        notes: `A worked example shows how ${topic} behaves in practice.`
      },
      {
        time: '08:15',
        title: 'Common Mistakes',
        notes: `The lesson calls out common mistakes students make while studying ${topic}.`
      },
      {
        time: '10:00',
        title: 'Recap',
        notes: `The recap reinforces the essential takeaways and next revision steps for ${topic}.`
      }
    ]
  };
}

function generateContent(body = {}) {
  const mode = String(body.mode || body.kind || 'notes').toLowerCase();
  const topic = topicFromRequest(body);
  const requestId = crypto.randomUUID();
  const generatedAt = new Date().toISOString();

  if (mode === 'video' || mode === 'video-notes') {
    const payload = buildVideoNotes(topic, body);
    return {
      requestId,
      generatedAt,
      provider: 'local-template',
      mode: 'video-notes',
      topic,
      output: payload.frames
        .map((frame) => `${frame.time} — ${frame.title}\n${frame.notes}`)
        .join('\n\n'),
      structured: payload
    };
  }

  if (mode === 'practice') {
    return {
      requestId,
      generatedAt,
      provider: 'local-template',
      mode,
      topic,
      output: buildPractice(topic, body)
    };
  }

  if (mode === 'explain') {
    return {
      requestId,
      generatedAt,
      provider: 'local-template',
      mode,
      topic,
      output: buildExplain(topic, body)
    };
  }

  if (mode === 'quick') {
    return {
      requestId,
      generatedAt,
      provider: 'local-template',
      mode,
      topic,
      output: buildQuick(topic, body)
    };
  }

  return {
    requestId,
    generatedAt,
    provider: 'local-template',
    mode: 'notes',
    topic,
    output: buildNotes(topic, body)
  };
}

module.exports = {
  generateContent
};
