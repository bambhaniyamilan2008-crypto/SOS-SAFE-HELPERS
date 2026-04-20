'use server';
/**
 * @fileOverview This file defines a Genkit flow for activating an SOS alert via voice command.
 *
 * - activateSosByVoice - A function that handles the voice-activated SOS alert process.
 * - VoiceActivatedSosAlertInput - The input type for the activateSosByVoice function.
 * - VoiceActivatedSosAlertOutput - The return type for the activateSosByVoice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VoiceActivatedSosAlertInputSchema = z.object({
  spokenPhrase: z.string().describe('The phrase spoken by the user.'),
});
export type VoiceActivatedSosAlertInput = z.infer<typeof VoiceActivatedSosAlertInputSchema>;

const VoiceActivatedSosAlertOutputSchema = z.object({
  sosActivated: z.boolean().describe('True if an SOS alert should be activated, false otherwise.'),
  message: z.string().describe('A message explaining the outcome of the voice command.'),
});
export type VoiceActivatedSosAlertOutput = z.infer<typeof VoiceActivatedSosAlertOutputSchema>;

export async function activateSosByVoice(
  input: VoiceActivatedSosAlertInput
): Promise<VoiceActivatedSosAlertOutput> {
  return voiceActivatedSosAlertFlow(input);
}

const voiceActivatedSosAlertPrompt = ai.definePrompt({
  name: 'voiceActivatedSosAlertPrompt',
  input: { schema: VoiceActivatedSosAlertInputSchema },
  output: { schema: VoiceActivatedSosAlertOutputSchema },
  prompt: `You are an AI assistant designed to detect emergency voice commands. Your task is to determine if the user's spoken phrase indicates a request to activate an SOS alert. The primary activation phrase is 'HELP ME'.

If the spoken phrase is clearly 'HELP ME' or a very close variant, set 'sosActivated' to true and provide a confirmation message. Otherwise, set 'sosActivated' to false and provide a message indicating no SOS alert was detected.

Spoken Phrase: "{{{spokenPhrase}}}"`,
});

const voiceActivatedSosAlertFlow = ai.defineFlow(
  {
    name: 'voiceActivatedSosAlertFlow',
    inputSchema: VoiceActivatedSosAlertInputSchema,
    outputSchema: VoiceActivatedSosAlertOutputSchema,
  },
  async (input) => {
    const { output } = await voiceActivatedSosAlertPrompt(input);
    return output!;
  }
);
