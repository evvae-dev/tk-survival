import type { Stats } from '@/lib/game';
import { statLabels } from '@/lib/game';

const paths: Record<keyof Stats, string> = {
  leadership: 'M5 21V3 M5 4h14l-3 5 3 5H5',
  strength: 'M5 20 19 4l1 5-5 1 M4 16l5 4 M3 21l3-3',
  intelligence: 'M9 18v3h6v-3 M8 15a7 7 0 1 1 8 0l-1 3H9z',
  politics: 'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h4',
  charisma: 'M12 20 4 12a5 5 0 0 1 8-6 5 5 0 0 1 8 6z',
};
export default function AbilityIcon({ ability }: { ability: keyof Stats }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={statLabels[ability]}><path d={paths[ability]}/></svg>;
}
