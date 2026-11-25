import type { StaffId } from '../../types/shop';

export type RoastCardAspect = 'square' | 'story';

export interface RoastCardPayload {
  staffId: StaffId;
  speakerName: string;
  speakerRole: string;
  portraitSrc: string;
  moodLabel: string;
  tierBadge?: string;
  promptHeading: string;
  promptText: string;
  roastText: string;
  footerNote?: string;
  source: 'dialogue' | 'diagnostics';
}
