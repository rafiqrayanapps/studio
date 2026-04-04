'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { invokeAiSuggestions } from '@/lib/actions';
import { DesignImprovementSuggestionsSchema, type DesignImprovementSuggestionsInput } from '@/lib/schemas';
import { ScrollArea } from '../ui/scroll-area';

export default function AiSuggestions() {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<DesignImprovementSuggestionsInput>({
    resolver: zodResolver(DesignImprovementSuggestionsSchema),
    defaultValues: {
      originalWebsiteDescription: '',
      replicatedDesignDescription: '',
      codeImplementation: '',
    },
  });

  const onSubmit = async (data: DesignImprovementSuggestionsInput) => {
    setError(null);
    setSuggestions(null);
    const result = await invokeAiSuggestions(data);
    if (result.success) {
      setSuggestions(result.suggestions ?? []);
    } else {
      setError(result.error ?? 'An unknown error occurred.');
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            size="icon"
            aria-label="Get AI Suggestions"
          >
            <Bot className="h-7 w-7" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-headline text-2xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Design Improvement Suggestions
            </SheetTitle>
            <SheetDescription>
              Provide details about the original design and your replication to get AI-powered feedback.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow pr-6 -mr-6">
            <div className="py-4 space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="originalWebsiteDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Website Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the layout, colors, fonts, and key UI elements of the original website."
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="replicatedDesignDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Replicated Design Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your replicated version. What did you focus on? What challenges did you face?"
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="codeImplementation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Code Implementation</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Paste your component code (e.g., React with Tailwind CSS) here for analysis."
                            className="font-code"
                            rows={10}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Get Suggestions'
                    )}
                  </Button>
                </form>
              </Form>

              {isSubmitting && (
                 <div className="text-center text-muted-foreground pt-4">
                    <p>Our AI is analyzing your work. This may take a moment...</p>
                 </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                  <h4 className="font-bold">Error</h4>
                  <p>{error}</p>
                </div>
              )}

              {suggestions && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-xl font-bold font-headline">Here are your suggestions:</h3>
                  <ul className="list-disc list-inside space-y-2 p-4 bg-muted/50 rounded-md">
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
