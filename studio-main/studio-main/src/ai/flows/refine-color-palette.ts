// refine-color-palette.ts
'use server';

/**
 * @fileOverview Refines a color palette based on user adjustments or requests for adding/removing colors.
 *
 * - refineColorPalette - A function that handles the color palette refinement process.
 * - RefineColorPaletteInput - The input type for the refineColorPalette function, including the original palette and refinement instructions.
 * - RefineColorPaletteOutput - The return type for the refineColorPalette function, providing the refined color palette.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the schema for a color (hex code string)
const ColorSchema = z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/);

// Define the input schema
const RefineColorPaletteInputSchema = z.object({
  originalPalette: z.array(ColorSchema).describe('The original color palette to refine.'),
  instructions: z.string().describe('Instructions for refining the palette, such as adjusting hues, or adding/removing colors.'),
});
export type RefineColorPaletteInput = z.infer<typeof RefineColorPaletteInputSchema>;

// Define the output schema
const RefineColorPaletteOutputSchema = z.array(ColorSchema).describe('The refined color palette.');
export type RefineColorPaletteOutput = z.infer<typeof RefineColorPaletteOutputSchema>;

// Exported function to refine the color palette
export async function refineColorPalette(input: RefineColorPaletteInput): Promise<RefineColorPaletteOutput> {
  return refineColorPaletteFlow(input);
}

// Define the prompt
const refineColorPalettePrompt = ai.definePrompt({
  name: 'refineColorPalettePrompt',
  input: {schema: RefineColorPaletteInputSchema},
  output: {schema: RefineColorPaletteOutputSchema},
  prompt: `You are a color palette refinement expert. Given an original color palette and instructions on how to refine it, you will generate a refined color palette.

Original Palette:
{{#each originalPalette}}{{{this}}}
{{/each}}

Instructions: {{{instructions}}}

Please provide the refined color palette as a JSON array of hex codes. Do not include any other text in your response. Ensure that each hex code is a valid CSS hex code (e.g., #RRGGBB). Only provide the JSON, and nothing else.`,
});

// Define the flow
const refineColorPaletteFlow = ai.defineFlow(
  {
    name: 'refineColorPaletteFlow',
    inputSchema: RefineColorPaletteInputSchema,
    outputSchema: RefineColorPaletteOutputSchema,
  },
  async input => {
    const {output} = await refineColorPalettePrompt(input);
    // Attempt to parse the output as JSON; if it fails, return an empty array.
    try {
      return JSON.parse(output!.text) as RefineColorPaletteOutput;
    } catch (e) {
      console.error('Failed to parse JSON from the palette refinement prompt:', e);
      return [];
    }
  }
);
