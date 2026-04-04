import { z } from 'zod';

export const DesignImprovementSuggestionsSchema = z.object({
  originalWebsiteDescription: z.string().min(50, {
    message: 'Please provide a detailed description of the original website (at least 50 characters).',
  }),
  replicatedDesignDescription: z.string().min(50, {
    message: 'Please provide a detailed description of your replicated design (at least 50 characters).',
  }),
  codeImplementation: z.string().min(100, {
    message: 'Please provide a substantial code snippet for analysis (at least 100 characters).',
  }),
});
