import type { Choice } from './event-engine';
import type { Artwork } from './artwork';
export type ChoiceArt=Artwork;
export function choiceArt(choice:Pick<Choice,'title'|'artwork'>):ChoiceArt {
 return choice.artwork && !choice.artwork.src.startsWith('/art/characters/') ? choice.artwork : {src:'/art/choices/strategy.png',alt:'군영의 지도와 주변 상황을 살펴 행동을 준비하는 주인공'};
}
