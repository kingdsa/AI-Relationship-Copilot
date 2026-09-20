export type QuestionInstructions = string | Record<string, unknown> | unknown[]

export interface NoulQuestion {
  type: 'noul'
  instructions: QuestionInstructions
  criteria?: { true?: QuestionInstructions; false?: QuestionInstructions }
}

export interface ChoiceQuestion {
  type: 'choice'
  instructions: QuestionInstructions
  criteria: Record<string, string | null>
}

export interface ScoreQuestion {
  type: 'score'
  instructions: QuestionInstructions
  criteria: string[]
}

export type SystemOneQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion

export interface NoulAnswer {
  type: 'noul'
  noul: number
}

export interface ChoiceAnswer {
  type: 'choice'
  choice: string
  probabilities: Record<string, number>
  confidence: number
}

export interface ScoreAnswer {
  type: 'score'
  score: number
  legend: Record<string, string>
  probabilities: Record<string, number>
  confidence: number
}

export type SystemOneAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer

export interface SystemOneResponse {
  model: string
  answers: Record<string, SystemOneAnswer>
  usage?: { input_tokens: number; output_tokens: number }
}