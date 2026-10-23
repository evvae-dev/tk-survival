import type { GameEvent } from './event-engine';
import type { Artwork } from './artwork';
export function sceneArt(event: Pick<GameEvent,'id'|'state'|'historical'>): Artwork {
 const art=event.historical?.flow?.nodes.find(node=>node.id===event.state.flowProgress?.nodeId)?.data.artwork;
 if(art && !art.src.startsWith('/art/characters/'))return art;
 const previous=event.state.decisions.at(-1)?.artwork;
 return previous && !previous.src.startsWith('/art/characters/') ? previous : {src:'/art/choices/strategy.png',alt:'군영 주변의 지형과 지도를 살피며 다음 행동을 생각하는 주인공'};
}
export function sceneArtwork(_id:string,_node?:string,artwork?:Artwork|null):Artwork|null{return artwork??null;}
