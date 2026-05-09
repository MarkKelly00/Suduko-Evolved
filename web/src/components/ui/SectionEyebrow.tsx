import { cn } from '@/lib/utils';

interface SectionEyebrowProps {
  children: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionEyebrow({ children, align = 'left', className }: SectionEyebrowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {align === 'center' && (
        <span className="h-px w-8 bg-[var(--color-divider)]" aria-hidden />
      )}
      <span className="section-eyebrow">{children}</span>
      <span className="h-px w-8 bg-[var(--color-divider)]" aria-hidden />
    </div>
  );
}
