import type { GameEvent } from './event-engine';
import type { Artwork } from './artwork';
export function sceneArt(event: Pick<GameEvent,'id'|'state'|'historical'>): Artwork|null {
 return event.historical?.flow?.nodes.find(node=>node.id===event.state.flowProgress?.nodeId)?.data.artwork??null;
}
export function sceneArtwork(_id:string,_node?:string,artwork?:Artwork|null):Artwork|null{return artwork??null;}
