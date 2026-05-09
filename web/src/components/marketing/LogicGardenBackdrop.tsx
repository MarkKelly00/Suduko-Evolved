import { GlowOrb } from '@/components/ui/GlowOrb';
import { cn } from '@/lib/utils';

interface LogicGardenBackdropProps {
  className?: string;
  /** When true, renders the subtle grid layer. */
  grid?: boolean;
}

/**
 * Atmospheric backdrop for marketing sections. Three soft glow orbs + an
 * optional faint logic-grid layer. Pure CSS — no animation, so it sits
 * happily under reduced-motion preferences.
 */
export function LogicGardenBackdrop({ className, grid = true }: LogicGardenBackdropProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        className,
      )}
    >
      {grid && (
        <div className="absolute inset-0 logic-grid-bg [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      )}
      <GlowOrb
        color="blue"
        size={620}
        intensity={0.16}
        className="-top-40 -left-40"
      />
      <GlowOrb
        color="teal"
        size={520}
        intensity={0.14}
        className="top-1/3 -right-40"
      />
      <GlowOrb
        color="gold"
        size={480}
        intensity={0.12}
        className="bottom-0 left-1/3"
      />
    </div>
  );
}
