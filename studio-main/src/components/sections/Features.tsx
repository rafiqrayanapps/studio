import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutTemplate, RefreshCw, Zap } from 'lucide-react';

const features = [
  {
    icon: <LayoutTemplate className="w-8 h-8 text-primary" />,
    title: 'Familiar Interface',
    description: 'No learning curve. Jump right back into the workflow you already know and love.',
  },
  {
    icon: <RefreshCw className="w-8 h-8 text-primary" />,
    title: 'Consistent Updates',
    description: 'We regularly update the app to ensure it stays exactly the same, with minor bug fixes.',
  },
  {
    icon: <Zap className="w-8 h-8 text-primary" />,
    title: 'Enhanced Performance',
    description: 'Enjoy the same experience, but faster. We have optimized everything under the hood.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-card">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Why Choose The Same App?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Because you know what to expect. And we deliver.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="items-center">
                <div className="p-4 bg-primary/10 rounded-full">{feature.icon}</div>
                <CardTitle className="font-headline pt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
