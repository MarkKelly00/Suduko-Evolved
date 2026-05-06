export interface World {
  id: string;
  name: string;
  /** Short tagline shown under the world title on the map. */
  tagline: string;
  /** Hex color used for ambient theming on this world's map. */
  themeColor: string;
  levelCount: number;
}

export const WORLD_1: World = {
  id: 'world1',
  name: 'Logic Garden',
  tagline: 'Where reason blooms.',
  themeColor: '#5BD6A8',
  levelCount: 30,
};

export const WORLDS: World[] = [WORLD_1];
