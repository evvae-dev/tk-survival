export const CHAPTER_ID = 'chapter-5-1-yellow-turban';

export const SUPPORTED_CHAPTER_IDS = [CHAPTER_ID, 'chapter-5-2', 'chapter-5-3', 'chapter-5-4', 'chapter-5-5'];
export const supportedChapter = (id: string | undefined) => !!id && SUPPORTED_CHAPTER_IDS.includes(id);
