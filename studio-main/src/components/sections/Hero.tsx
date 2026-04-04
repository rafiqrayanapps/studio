import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

export default function Hero() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');

  return (
    <section className="container grid lg:grid-cols-2 gap-12 items-center py-20 md:py-32">
      <div className="flex flex-col items-start space-y-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline leading-tight tracking-tighter">
          We&apos;ve Built The Same App, Again.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
          Experience the familiar, reimagined. Our app delivers the same great
          features you love, now with a fresh new look and enhanced performance.
        </p>
        <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          Get Started for Free
        </Button>
      </div>
      <div className="w-full h-auto rounded-lg overflow-hidden shadow-2xl">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            data-ai-hint={heroImage.imageHint}
            width={1200}
            height={800}
            className="object-cover w-full h-full"
          />
        )}
      </div>
    </section>
  );
}
