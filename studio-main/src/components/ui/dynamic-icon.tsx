'use client';
import { icons, type LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const LucideIcon = icons[name as keyof typeof icons];

  if (!LucideIcon) {
    // Return a default icon or null if the name is invalid
    return null; 
  }

  return <LucideIcon {...props} />;
};

export default DynamicIcon;

    