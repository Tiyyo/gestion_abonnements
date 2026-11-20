import { Caption } from '@/ui/text/typography';

export function FieldError({ message, center, onGlass }: { message?: string; center?: boolean; onGlass?: boolean }) {
  return message ? (
    <Caption color={onGlass ? 'onGlassDanger' : 'dangerText'} text={center ? 'center' : undefined} accessibilityLiveRegion="polite">
      {message}
    </Caption>
  ) : null;
}
