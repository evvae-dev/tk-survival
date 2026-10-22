import index from '@/data/chapters/index.json';
export const CATALOG_EDITION = index.edition;
export const CHAPTER_ID = index.chapters[0].id;
export const SUPPORTED_CHAPTER_IDS: string[] = index.chapters.map(chapter => chapter.id);
export const supportedChapter = (id: string | undefined) => !!id && SUPPORTED_CHAPTER_IDS.includes(id);
export const chapterOrder = (id: string | undefined) => index.chapters.find(chapter => chapter.id === id)?.order ?? Number.MAX_SAFE_INTEGER;
export const chapterTitle = (id: string | undefined) => { const chapter = index.chapters.find(chapter => chapter.id === id); return chapter ? `${chapter.order}화 · ${chapter.title}` : '개별 사건'; };
