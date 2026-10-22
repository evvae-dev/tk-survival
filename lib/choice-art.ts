import type { Choice } from './event-engine';
import type { Artwork } from './artwork';
export type ChoiceArt=Artwork;
export function choiceArt(choice:Pick<Choice,'title'|'artwork'>):ChoiceArt|null{return choice.artwork??null;}
