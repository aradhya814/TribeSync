import Anthropic from '@anthropic-ai/sdk'

type ClaudeModel = 'haiku' | 'sonnet'

type CallClaudeOptions = {
  model?: ClaudeModel
  maxTokens?: number
  system?: string
}

const modelByAlias: Record<ClaudeModel, string> = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

export async function callClaude(prompt: string, options: CallClaudeOptions = {}) {
  const response = await anthropic.messages.create({
    model: modelByAlias[options.model ?? 'haiku'],
    max_tokens: options.maxTokens ?? 1024,
    system: options.system,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}
