'use client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const testimonials = [
  {
    id: 'avatar1',
    name: 'Jane Doe',
    title: 'CEO, Same Old Company',
    quote: "It's exactly what we had before, which is perfect. No need to retrain anyone. A seamless... continuation.",
  },
  {
    id: 'avatar2',
    name: 'John Smith',
    title: 'Developer, Repetitive Tech',
    quote: 'I was expecting something new, but this is fine too. The performance is noticeably the same. Good job.',
  },
  {
    id: 'avatar3',
    name: 'Sam Wilson',
    title: 'Product Manager, Familiarity Inc.',
    quote: 'Our users love that they don\'t have to learn anything new. This app respects their time by not changing.',
  },
];

export default function Testimonials() {
  const avatarImages = PlaceHolderImages.filter((img) => img.id.startsWith('avatar'));

  return (
    <section id="testimonials" className="py-20 md:py-28 bg-card">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">What Our Users Say</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            They&apos;re saying the same things as before.
          </p>
        </div>
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full max-w-4xl mx-auto mt-16"
        >
          <CarouselContent>
            {testimonials.map((testimonial, index) => {
              const avatar = avatarImages.find((img) => img.id === testimonial.id);
              return (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card className="h-full flex flex-col justify-between">
                      <CardContent className="pt-6">
                        <p className="italic text-lg">"{testimonial.quote}"</p>
                      </CardContent>
                      <div className="p-6 pt-0 flex items-center gap-4">
                        <Avatar>
                          {avatar && <AvatarImage src={avatar.imageUrl} alt={testimonial.name} data-ai-hint={avatar.imageHint} />}
                          <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
}
