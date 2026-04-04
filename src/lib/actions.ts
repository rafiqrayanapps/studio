
'use server';

import {
  getDesignImprovementSuggestions,
  type DesignImprovementSuggestionsInput,
} from '@/ai/flows/design-improvement-suggestions';
import type { z } from 'zod';
import { DesignImprovementSuggestionsSchema } from './schemas';

export async function invokeAiSuggestions(data: z.infer<typeof DesignImprovementSuggestionsSchema>) {
  const validatedData = DesignImprovementSuggestionsSchema.safeParse(data);
  if (!validatedData.success) {
    return { success: false, error: 'Invalid input.' };
  }

  try {
    const result = await getDesignImprovementSuggestions(validatedData.data as DesignImprovementSuggestionsInput);
    return { success: true, suggestions: result.suggestions };
  } catch (error) {
    console.error('AI suggestion error:', error);
    return { success: false, error: 'Failed to get suggestions from AI. Please try again.' };
  }
}
