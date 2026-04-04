'use server';

/**
 * @fileOverview AI-powered tool that analyzes the replicated design and code implementation against the original website, providing suggestions for improvements.
 *
 * - getDesignImprovementSuggestions - A function that provides design improvement suggestions.
 * - DesignImprovementSuggestionsInput - The input type for the getDesignImprovementSuggestions function.
 * - DesignImprovementSuggestionsOutput - The return type for the getDesignImprovementSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DesignImprovementSuggestionsInputSchema = z.object({
  originalWebsiteDescription: z
    .string()
    .describe('A detailed description of the original website design.'),
  replicatedDesignDescription: z
    .string()
    .describe('A detailed description of the replicated website design.'),
  codeImplementation: z.string().describe('The code implementation of the replicated design.'),
});
export type DesignImprovementSuggestionsInput = z.infer<typeof DesignImprovementSuggestionsInputSchema>;

const DesignImprovementSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggestions for design improvements.'),
});
export type DesignImprovementSuggestionsOutput = z.infer<typeof DesignImprovementSuggestionsOutputSchema>;

export async function getDesignImprovementSuggestions(
  input: DesignImprovementSuggestionsInput
): Promise<DesignImprovementSuggestionsOutput> {
  return designImprovementSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'designImprovementSuggestionsPrompt',
  input: {schema: DesignImprovementSuggestionsInputSchema},
  output: {schema: DesignImprovementSuggestionsOutputSchema},
  prompt: `You are an expert web developer with a keen eye for design.

You will be provided with a description of the original website design, a description of the replicated design, and the code implementation of the replicated design.

Your task is to analyze the replicated design and code implementation against the original website and provide a list of suggestions for improvements to ensure a pixel-perfect likeness.

Original Website Description: {{{originalWebsiteDescription}}}
Replicated Design Description: {{{replicatedDesignDescription}}}
Code Implementation: {{{codeImplementation}}}

Suggestions:
`, // Ensure the AI knows how to format the response.
});

const designImprovementSuggestionsFlow = ai.defineFlow(
  {
    name: 'designImprovementSuggestionsFlow',
    inputSchema: DesignImprovementSuggestionsInputSchema,
    outputSchema: DesignImprovementSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
