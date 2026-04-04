'use server';

/**
 * @fileOverview Generates a color palette from an uploaded image.
 *
 * - generatePaletteFromImage - A function that handles the color palette generation process.
 * - GeneratePaletteFromImageInput - The input type for the generatePaletteFromImage function.
 * - GeneratePaletteFromImageOutput - The return type for the generatePaletteFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePaletteFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo to extract colors from, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type GeneratePaletteFromImageInput = z.infer<typeof GeneratePaletteFromImageInputSchema>;

const GeneratePaletteFromImageOutputSchema = z.object({
  palette: z.array(z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/)).describe('An array of hex codes representing the color palette.'),
});
export type GeneratePaletteFromImageOutput = z.infer<typeof GeneratePaletteFromImageOutputSchema>;

export async function generatePaletteFromImage(input: GeneratePaletteFromImageInput): Promise<GeneratePaletteFromImageOutput> {
  return generatePaletteFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePaletteFromImagePrompt',
  input: {schema: GeneratePaletteFromImageInputSchema},
  output: {schema: GeneratePaletteFromImageOutputSchema},
  prompt: `You are an expert color palette generator.  You will take an image as input, and extract the
dominant colors from the image to create a color palette.  You will respond with a JSON array of hex codes
representing the color palette.

Consider a visually appealing and harmonious palette. Limit the palette to a maximum of 6 colors.

Image: {{media url=photoDataUri}}
`,
});

const generatePaletteFromImageFlow = ai.defineFlow(
  {
    name: 'generatePaletteFromImageFlow',
    inputSchema: GeneratePaletteFromImageInputSchema,
    outputSchema: GeneratePaletteFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
