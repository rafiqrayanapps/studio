import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Basic',
    price: '$0',
    frequency: '/mo',
    description: 'The same basic features, for free, forever.',
    features: ['1 Project', 'Basic Analytics', 'Community Support'],
    isFeatured: false,
  },
  {
    name: 'Pro',
    price: '$15',
    frequency: '/mo',
    description: 'More of the same, but for professionals.',
    features: ['Unlimited Projects', 'Advanced Analytics', 'Priority Support', 'API Access'],
    isFeatured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    frequency: '',
    description: 'The same features, but tailored for your team.',
    features: ['All Pro features', 'Dedicated Account Manager', 'Custom Integrations', 'SLA'],
    isFeatured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Predictable Pricing</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No surprises. Just the same great value.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card key={plan.name} className={cn('flex flex-col', plan.isFeatured && 'border-primary ring-2 ring-primary shadow-lg')}>
              <CardHeader>
                <CardTitle className="font-headline">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.frequency}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="w-4 h-4 text-primary mr-2" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className={cn('w-full', plan.isFeatured ? 'bg-accent text-accent-foreground hover:bg-accent/90' : 'bg-primary')}>Choose Plan</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
