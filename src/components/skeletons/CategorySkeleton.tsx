import { cn } from "@/lib/utils";

const CategorySkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "relative animate-pulse w-full rounded-2xl bg-primary/80 p-4 flex flex-col items-center justify-center",
        className
      )}
    >
      <div className="absolute top-2.5 right-2.5 h-5 w-10 rounded-full bg-primary-foreground/20" />
      <div className="h-6 w-20 rounded-md bg-primary-foreground/20" />
    </div>
  );
};

export default CategorySkeleton;
