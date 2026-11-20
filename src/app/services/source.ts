/** Where pages come from. */
export function buildUrl(manga: string, ch: number, pg: number) {
  return `https://images.mangafreak.me/mangas/${manga}/${manga}_${ch}/${manga}_${ch}_${pg}.jpg`;
}
