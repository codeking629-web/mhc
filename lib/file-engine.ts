import JSZip from 'jszip';
import { Chapter, NovelProject } from './types';

export type InputEncoding =
  | 'auto'
  | 'utf-8'
  | 'utf-16le'
  | 'utf-16be'
  | 'gb18030';

export type OutputEncoding = 'utf-8' | 'utf-8-sig' | 'utf-16le';

export type TitleSource = 'auto' | 'saved' | 'first-line';

export type ExportContentLanguage = 'vi_only' | 'raw_only' | 'bilingual';

export type NotebookLmMode = 'chunks' | 'big' | 'both';

/**
 * Decode an ArrayBuffer or Uint8Array into text with selectable InputEncoding
 * ('auto' detects UTF-8 BOM, UTF-16LE/BE BOM, strict UTF-8, then falls back to GB18030/GBK).
 */
export function decodeTextWithEncoding(
  input: ArrayBuffer | Uint8Array,
  encoding: InputEncoding = 'auto'
): string {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  const decode = (name: string) =>
    new TextDecoder(name, { fatal: true }).decode(data);

  try {
    if (encoding !== 'auto') {
      return decode(encoding).replace(/^\uFEFF/, '');
    }
    if (
      data.length >= 3 &&
      data[0] === 0xef &&
      data[1] === 0xbb &&
      data[2] === 0xbf
    ) {
      return new TextDecoder('utf-8').decode(data.subarray(3));
    }
    if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
      return decode('utf-16le').replace(/^\uFEFF/, '');
    }
    if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
      return decode('utf-16be').replace(/^\uFEFF/, '');
    }
    try {
      return decode('utf-8').replace(/^\uFEFF/, '');
    } catch {
      return decode('gb18030').replace(/^\uFEFF/, '');
    }
  } catch {
    throw new Error(
      `Không đọc được văn bản với bảng mã "${encoding}". Hãy thử đổi sang Tự động (Auto) hoặc GB18030.`
    );
  }
}

/**
 * Decode an ArrayBuffer into text, auto-detecting UTF-8 vs GB18030/GBK
 * (very common for Chinese raw .txt files).
 */
export function decodeChineseTextBuffer(
  buffer: ArrayBuffer,
  encoding: InputEncoding = 'auto'
): string {
  return decodeTextWithEncoding(buffer, encoding);
}

export const decodeSmartTextBuffer = decodeChineseTextBuffer;

/**
 * Encode text into Uint8Array supporting UTF-8, UTF-8 with BOM (utf-8-sig), and UTF-16LE with BOM.
 */
export function encodeTextWithEncoding(
  text: string,
  encoding: OutputEncoding = 'utf-8'
): Uint8Array {
  if (encoding === 'utf-16le') {
    const bytes = new Uint8Array(2 + text.length * 2);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, 0xfeff, true);
    for (let i = 0; i < text.length; i++) {
      view.setUint16(2 + i * 2, text.charCodeAt(i), true);
    }
    return bytes;
  }
  return new TextEncoder().encode(
    (encoding === 'utf-8-sig' ? '\uFEFF' : '') + text
  );
}

/**
 * Sanitize filenames for Windows/macOS/Linux (including reserved device names CON, PRN, AUX, NUL, COM1..9, LPT1..9).
 */
export function safeFilename(value: string, fallback = 'truyen'): string {
  let name =
    value
      .replace(/^\uFEFF+/, '')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/[ .]+$/g, '')
      .trim() || fallback;
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)) {
    name = '_' + name;
  }
  return name;
}

/**
 * Strip illegal XML control characters before building XHTML/OPF/NCX.
 */
export function cleanXml(value: string): string {
  return value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/g, '');
}

/**
 * Remove duplicate first-line chapter title if the .txt body starts with the exact same title.
 */
export function cleanRawChapterBody(rawText: string, titleRaw: string): string {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd());

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    const cleanTitle = titleRaw.trim();
    if (
      firstLine === cleanTitle ||
      firstLine.replace(/[！!？?。，,\s]/g, '') ===
        cleanTitle.replace(/[！!？?。，,\s]/g, '')
    ) {
      lines.shift();
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
    }
  }

  return lines.join('\n').trim();
}

/**
 * Parse a filename like "0001_第1章 他惊人的毅力并无观众.txt"
 * extracting orderPrefix ("0001"), chapterNumber (1), and titleRaw ("第1章 他惊人的毅力并无观众").
 */
export function parsePrefixedFileName(
  fileName: string,
  fallbackIndex: number
): {
  orderPrefix: string;
  chapterNumber: number;
  titleRaw: string;
} {
  const baseName = fileName.replace(/\.txt$/i, '').trim();
  const match = baseName.match(/^(\d{1,6})[_.\-\s]+(.+)$/);

  if (match) {
    const prefix = match[1].padStart(4, '0');
    const restTitle = match[2].trim();
    // Try extracting chapter number from 第X章 or prefix
    const chNumMatch = restTitle.match(/第(\d+)[章回节卷]/);
    const chapterNumber = chNumMatch ? parseInt(chNumMatch[1], 10) : parseInt(match[1], 10);
    return {
      orderPrefix: prefix,
      chapterNumber: Number.isNaN(chapterNumber) ? fallbackIndex : chapterNumber,
      titleRaw: restTitle,
    };
  }

  // Fallback if no numeric prefix before _
  const numStart = baseName.match(/^(\d+)/);
  const orderNumber = numStart ? parseInt(numStart[1], 10) : fallbackIndex;
  return {
    orderPrefix: String(orderNumber).padStart(4, '0'),
    chapterNumber: orderNumber,
    titleRaw: baseName,
  };
}

/**
 * Parse a folder, multi-selection of .TXT files, or a .ZIP archive containing numbered .TXT chapters.
 * Also detects duplicate chapter numbers (e.g. 01 vs 0001) and warns on missing chapter gaps in the middle.
 */
export async function parseFolderOrZipTxtFiles(
  files: File[],
  novelId: string,
  existingCount = 0,
  encoding: InputEncoding = 'auto'
): Promise<{
  chapters: Chapter[];
  warnings: string[];
}> {
  const entries: {
    name: string;
    read: () => Promise<Uint8Array>;
  }[] = [];
  let ignoredCount = 0;
  let totalBytes = 0;

  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      for (const item of Object.values(zip.files)) {
        if (item.dir || item.name.startsWith('__MACOSX/')) continue;
        const baseName = item.name.split('/').pop() || item.name;
        if (/\.txt$/i.test(baseName)) {
          entries.push({
            name: baseName,
            read: () => item.async('uint8array'),
          });
        } else {
          ignoredCount++;
        }
      }
    } else if (/\.txt$/i.test(file.name)) {
      entries.push({
        name: file.name,
        read: async () => new Uint8Array(await file.arrayBuffer()),
      });
    } else {
      ignoredCount++;
    }
  }

  if (entries.length === 0) {
    throw new Error(
      'Không tìm thấy tệp chương .TXT nào trong thư mục hoặc gói .ZIP đã chọn.'
    );
  }

  // Sort by filename natural numeric order first
  entries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );

  const chapters: Chapter[] = [];
  const seenNumbers = new Map<number, string>();
  const duplicateMessages: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const bytes = await entry.read();
    totalBytes += bytes.byteLength;
    if (totalBytes > 256 * 1024 * 1024) {
      throw new Error(
        'Bộ chương vượt quá 256 MB sau giải nén. Hãy chia nhỏ hoặc nhập theo từng phần.'
      );
    }

    const fullText = decodeTextWithEncoding(bytes, encoding);
    const { orderPrefix, chapterNumber, titleRaw } = parsePrefixedFileName(
      entry.name,
      existingCount + i + 1
    );

    const numericPrefixMatch = entry.name.match(/^(\d+)/);
    if (numericPrefixMatch) {
      const prefixNum = parseInt(numericPrefixMatch[1], 10);
      if (seenNumbers.has(prefixNum)) {
        duplicateMessages.push(
          `Trùng số thứ tự #${prefixNum}: "${seenNumbers.get(prefixNum)}" và "${entry.name}"`
        );
      } else {
        seenNumbers.set(prefixNum, entry.name);
      }
    }

    const firstNonEmptyLine =
      fullText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 0) || titleRaw;

    const finalTitleRaw =
      titleRaw && titleRaw.length > 0 ? titleRaw : firstNonEmptyLine;
    const cleanedBody = cleanRawChapterBody(fullText, finalTitleRaw);

    chapters.push({
      id: `ch-${novelId}-${orderPrefix}-${Date.now()}-${i}`,
      novelId,
      orderPrefix,
      chapterNumber,
      fileNameOriginal: entry.name,
      titleRaw: finalTitleRaw,
      titleTranslated: '',
      rawContent: cleanedBody,
      translatedContent: '',
      charCount: cleanedBody.replace(/\s+/g, '').length,
      status: 'raw',
      updatedAt: Date.now(),
    });
  }

  chapters.sort((a, b) =>
    a.orderPrefix.localeCompare(b.orderPrefix, undefined, { numeric: true })
  );

  const warnings: string[] = [...duplicateMessages];

  // Detect missing chapter number gaps in the middle
  const orderedNums = Array.from(seenNumbers.keys()).sort((a, b) => a - b);
  if (orderedNums.length >= 2) {
    let missingCount = 0;
    const missingPreview: number[] = [];
    for (let i = 1; i < orderedNums.length; i++) {
      const diff = orderedNums[i] - orderedNums[i - 1] - 1;
      if (diff > 0) {
        missingCount += diff;
        for (
          let n = orderedNums[i - 1] + 1;
          n < orderedNums[i] && missingPreview.length < 20;
          n++
        ) {
          missingPreview.push(n);
        }
      }
    }
    if (missingCount > 0) {
      warnings.push(
        `Thiếu ${missingCount} số thứ tự giữa các chương: ${missingPreview.join(', ')}${
          missingCount > 20 ? '…' : ''
        }. Bạn vẫn có thể nạp các chương hiện có.`
      );
    }
  }

  if (ignoredCount > 0) {
    warnings.push(
      `Đã bỏ qua ${ignoredCount} tệp không phải định dạng .TXT chương truyện.`
    );
  }

  return { chapters, warnings };
}

/**
 * Parse a folder or multi-selection of .TXT files (XXXX_Title.txt).
 */
export async function parseFolderTxtFiles(
  files: File[],
  novelId: string,
  existingCount = 0,
  encoding: InputEncoding = 'auto'
): Promise<Chapter[]> {
  const res = await parseFolderOrZipTxtFiles(
    files,
    novelId,
    existingCount,
    encoding
  );
  return res.chapters;
}

export interface SmartSplitConfig {
  startNumber: number;
  digits: number;
  includePrologue: boolean;
  prologueTitle: string;
  removeTitleLine: boolean;
  isDirtySource: boolean;
}

export interface SmartSplitChapterItem {
  id: number;
  orderPrefix: string;
  chapterNumber: number;
  filename: string;
  rawTitle: string;
  title: string;
  subtitle: string;
  titleLineRemoved: boolean;
  content: string;
  lineCount: number;
  charCount: number;
  isPrologue: boolean;
  warning?: string;
}

const SMART_CHAPTER_REGEX =
  /^\s*(第\s*[0-9〇零一二三四五六七八九十百千万两]+\s*[章节回]|序章|chapter\s+\d+)(?:\s*[:：\-—–~._]?\s*(.*))?$/i;

const SEPARATORS_CLEAN = /^[\s=\-*~_—–…·•●○◇◈★☆※#]{3,}$/;
const SEPARATORS_DIRTY = /^[\s=\-*~_—–…·•●○◇◈★☆※#oO0xX+<>|\\/]{3,}$/;

/**
 * Smart chapter header detector ported from trình-tách-chương-truyện.
 * Filters out narrative sentences that happen to start with "第...章" when isDirtySource is true.
 */
export function matchSmartChapterHeader(
  line: string,
  isDirtySource: boolean
): { title: string; subtitle: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const maxLength = isDirtySource ? 60 : 80;
  if (trimmed.length > maxLength) return null;

  const match = trimmed.match(SMART_CHAPTER_REGEX);
  if (!match) return null;

  const title = match[1].trim();
  const subtitle = (match[2] || '').trim();

  if (isDirtySource && subtitle) {
    // Sentence starting right after "第X章" without spacing or separator (e.g. "第一章的内容...")
    if (
      /^[的了是在有和与及或但而却便就都也还又再更最很太只才刚正已曾将要会能可み]/.test(
        subtitle
      )
    ) {
      const rawAfterTitle = trimmed.slice(match[1].length);
      if (!/^[\s:：\-—–~._]/.test(rawAfterTitle)) {
        return null;
      }
    }

    // Ends with narrative punctuation
    if (/[。；，、]$/.test(subtitle)) {
      return null;
    }

    // Contains too many sentence punctuation marks
    const punctCount = (subtitle.match(/[，。；！？,.;!?]/g) || []).length;
    if (punctCount >= 2) {
      return null;
    }

    // Subtitle too long without spaces
    if (subtitle.length > 35 && !subtitle.includes(' ')) {
      return null;
    }
  }

  return { title, subtitle };
}

export function isSmartSeparatorLine(
  line: string,
  isDirtySource = true
): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return isDirtySource
    ? SEPARATORS_DIRTY.test(trimmed)
    : SEPARATORS_CLEAN.test(trimmed);
}

export function cleanAndCollapseSmartLines(
  lines: string[],
  keepFirstLineAsTitle: boolean,
  isDirtySource = true
): { cleanedLines: string[]; content: string } {
  const result: string[] = [];
  let startIndex = 0;

  let titleLine: string | null = null;
  if (keepFirstLineAsTitle && lines.length > 0) {
    titleLine = lines[0].trimEnd();
    startIndex = 1;
  }

  let emptyCount = 0;
  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    if (isSmartSeparatorLine(rawLine, isDirtySource)) {
      continue;
    }

    const rtrimmed = rawLine.trimEnd();
    const isBlank = rtrimmed.trim() === '';

    if (isBlank) {
      emptyCount++;
      if (emptyCount <= 1) {
        result.push('');
      }
    } else {
      emptyCount = 0;
      result.push(rtrimmed);
    }
  }

  let bodyStart = 0;
  while (bodyStart < result.length && result[bodyStart] === '') {
    bodyStart++;
  }

  let bodyEnd = result.length - 1;
  while (bodyEnd >= bodyStart && result[bodyEnd] === '') {
    bodyEnd--;
  }

  const trimmedBody = result.slice(bodyStart, bodyEnd + 1);
  const finalLines: string[] = [];
  if (titleLine !== null) {
    finalLines.push(titleLine);
    if (trimmedBody.length > 0) {
      finalLines.push('');
    }
  }
  finalLines.push(...trimmedBody);

  return {
    cleanedLines: finalLines,
    content: finalLines.join('\n'),
  };
}

/**
 * Smart chapter splitter ported from trình-tách-chương-truyện.
 */
export function splitChaptersSmart(
  text: string,
  config: SmartSplitConfig
): SmartSplitChapterItem[] {
  if (!text || !text.trim()) return [];

  const lines = text.replace(/^\uFEFF/, '').split(/\r\n?|\n/);
  const startNum =
    Number.isSafeInteger(config.startNumber) && config.startNumber >= 0
      ? config.startNumber
      : 0;
  const digits =
    Number.isSafeInteger(config.digits) &&
    config.digits >= 1 &&
    config.digits <= 12
      ? config.digits
      : 4;

  const chapters: SmartSplitChapterItem[] = [];
  let currentChapterIndex = startNum;
  let currentTitle = '';
  let currentSubtitle = '';
  let currentRawTitle = '';
  let currentLines: string[] = [];
  let isPrologueActive = true;
  let prologueLines: string[] = [];

  const formatIndex = (index: number): string =>
    String(index).padStart(digits, '0');
  const makeFilename = (indexStr: string, rawTitle: string): string =>
    safeFilename(`${indexStr}_${rawTitle || 'Chương'}.txt`);

  const buildWarning = (charCount: number, isPrologue: boolean) => {
    if (isPrologue) return undefined;
    if (charCount < 100) {
      return 'Chương quá ngắn (< 100 chữ) — Có thể tiêu đề bị tách nhầm';
    }
    if (charCount > 15000) {
      return 'Chương rất dài (> 15.000 chữ) — Có thể sót tiêu đề chương bị lỗi raw';
    }
    return undefined;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = matchSmartChapterHeader(line, config.isDirtySource);

    if (headerMatch) {
      const isDuplicate =
        !isPrologueActive &&
        headerMatch.title.replace(/\s+/g, '') ===
          currentTitle.replace(/\s+/g, '');

      if (isDuplicate) {
        continue;
      }

      if (isPrologueActive) {
        const cleanedPrologue = cleanAndCollapseSmartLines(
          prologueLines,
          false,
          config.isDirtySource
        );
        const prologueText = cleanedPrologue.content;
        if (prologueText && config.includePrologue) {
          const indexStr = formatIndex(currentChapterIndex);
          const pTitle = config.prologueTitle.trim() || 'Lời mở đầu';
          const charCount = prologueText.replace(/\s+/g, '').length;
          chapters.push({
            id: currentChapterIndex,
            orderPrefix: indexStr,
            chapterNumber: currentChapterIndex,
            filename: makeFilename(indexStr, pTitle),
            rawTitle: pTitle,
            title: '',
            subtitle: pTitle,
            titleLineRemoved: true,
            content: prologueText,
            lineCount: cleanedPrologue.cleanedLines.length,
            charCount,
            isPrologue: true,
          });
          currentChapterIndex++;
        } else if (prologueText && !config.includePrologue) {
          currentLines = [...prologueLines];
        }
        isPrologueActive = false;
      } else {
        const cleanedChapter = cleanAndCollapseSmartLines(
          currentLines,
          !config.removeTitleLine,
          config.isDirtySource
        );
        const chapterContent = cleanedChapter.content;
        const indexStr = formatIndex(currentChapterIndex);
        const charCount = chapterContent.replace(/\s+/g, '').length;
        chapters.push({
          id: currentChapterIndex,
          orderPrefix: indexStr,
          chapterNumber: currentChapterIndex,
          filename: makeFilename(indexStr, currentRawTitle.trim()),
          rawTitle: currentRawTitle.trim(),
          title: currentTitle,
          subtitle: currentSubtitle,
          titleLineRemoved: config.removeTitleLine,
          content: chapterContent,
          lineCount: cleanedChapter.cleanedLines.length,
          charCount,
          isPrologue: false,
          warning: buildWarning(charCount, false),
        });
        currentChapterIndex++;
        currentLines = [];
      }

      currentTitle = headerMatch.title;
      currentSubtitle = headerMatch.subtitle;
      currentRawTitle = line.trim();

      if (!config.removeTitleLine) {
        currentLines.unshift(line);
      }
    } else {
      if (isPrologueActive) {
        prologueLines.push(line);
      } else {
        currentLines.push(line);
      }
    }
  }

  if (isPrologueActive) {
    const cleanedPrologue = cleanAndCollapseSmartLines(
      prologueLines,
      false,
      config.isDirtySource
    );
    const prologueText = cleanedPrologue.content;
    if (prologueText) {
      const indexStr = formatIndex(currentChapterIndex);
      const pTitle = config.prologueTitle.trim() || 'Lời mở đầu';
      const charCount = prologueText.replace(/\s+/g, '').length;
      chapters.push({
        id: currentChapterIndex,
        orderPrefix: indexStr,
        chapterNumber: currentChapterIndex,
        filename: makeFilename(indexStr, pTitle),
        rawTitle: pTitle,
        title: '',
        subtitle: pTitle,
        titleLineRemoved: true,
        content: prologueText,
        lineCount: cleanedPrologue.cleanedLines.length,
        charCount,
        isPrologue: true,
      });
    }
  } else {
    const cleanedChapter = cleanAndCollapseSmartLines(
      currentLines,
      !config.removeTitleLine,
      config.isDirtySource
    );
    const chapterContent = cleanedChapter.content;
    if (chapterContent || currentTitle) {
      const indexStr = formatIndex(currentChapterIndex);
      const charCount = chapterContent.replace(/\s+/g, '').length;
      chapters.push({
        id: currentChapterIndex,
        orderPrefix: indexStr,
        chapterNumber: currentChapterIndex,
        filename: makeFilename(indexStr, currentRawTitle.trim()),
        rawTitle: currentRawTitle.trim(),
        title: currentTitle,
        subtitle: currentSubtitle,
        titleLineRemoved: config.removeTitleLine,
        content: chapterContent,
        lineCount: cleanedChapter.cleanedLines.length,
        charCount,
        isPrologue: false,
        warning: buildWarning(charCount, false),
      });
    }
  }

  return chapters;
}

/**
 * Export split chapters directly to a .ZIP file (like trình-tách-chương-truyện).
 */
export async function generateSplitChaptersZipBlob(
  items: { filename: string; content: string }[],
  outputEncoding: OutputEncoding = 'utf-8'
): Promise<Blob> {
  const zip = new JSZip();
  for (const item of items) {
    zip.file(
      safeFilename(item.filename),
      encodeTextWithEncoding(item.content, outputEncoding),
      { createFolders: false }
    );
  }
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export function getSmartSplitSampleText(): string {
  return `Lời giới thiệu: Đây là một cuốn tiểu thuyết mẫu được thiết kế để kiểm tra công cụ tách chương truyện thông minh.
Phần mở đầu này sẽ được tách thành một file riêng tên là "Lời mở đầu" nếu bạn bật tùy chọn "Tách riêng Lời mở đầu".
Nếu tắt, nó sẽ được gộp vào chương đầu tiên.

====================

第1章 惊人的毅力
Trời vừa hửng sáng, sương mù giăng kín lối đi trên núi Thanh Sơn.
Lâm Phong mang theo một thanh kiếm rỉ sét, rảo bước nhanh về phía trước.
Trong câu văn này có nhắc tới 第一章的内容 rất hay nhưng vì là câu văn kể chuyện nên chế độ Nguồn bẩn sẽ không tách nhầm!

--------------------

第2章 踏上征途
Sau khi cứu chữa cho Tuyết Nhi, Lâm Phong biết được cô là truyền nhân duy nhất của phái Băng Tâm.
"Chúng ta phải rời khỏi đây ngay lập tức," Tuyết Nhi thều thào nói.

第 三 章 突破重围
(Lưu ý: Chương này sử dụng số thứ tự bằng chữ Hán để kiểm tra khả năng nhận diện chữ Hán của bộ tách).
Lâm Phong rút kiếm, vận dụng kiếm pháp gia truyền để ứng phó. Sau một hồi chiến đấu kịch liệt, chàng đã bảo vệ an toàn cho cả hai.`;
}

export interface RegexSplitPreviewItem {
  orderPrefix: string;
  chapterNumber: number;
  titleRaw: string;
  rawContent: string;
  charCount: number;
  warning?: string;
}

/**
 * Split a single merged .TXT file into chapters using a custom user Regex.
 */
export function splitMergedTxtByRegex(
  fullText: string,
  regexPattern: string,
  startOrderIndex = 1
): {
  items: RegexSplitPreviewItem[];
  error?: string;
} {
  let lineRegex: RegExp;
  try {
    lineRegex = new RegExp(regexPattern, 'u');
  } catch (err) {
    return {
      items: [],
      error: `Biểu thức Regex không hợp lệ: ${(err as Error).message}`,
    };
  }

  const lines = fullText.replace(/\r\n/g, '\n').split('\n');
  const rawChapters: { title: string; bodyLines: string[] }[] = [];
  let currentChapter: { title: string; bodyLines: string[] } | null = null;
  const prologueLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length <= 120 && lineRegex.test(trimmed)) {
      if (currentChapter) {
        rawChapters.push(currentChapter);
      } else if (prologueLines.join('\n').trim().length > 80) {
        rawChapters.push({
          title: '第0章 序章 / Mở đầu',
          bodyLines: [...prologueLines],
        });
      }
      currentChapter = { title: trimmed, bodyLines: [] };
    } else {
      if (currentChapter) {
        currentChapter.bodyLines.push(line);
      } else {
        prologueLines.push(line);
      }
    }
  }

  if (currentChapter) {
    rawChapters.push(currentChapter);
  } else if (rawChapters.length === 0 && fullText.trim().length > 0) {
    rawChapters.push({
      title: '第1章 Toàn văn',
      bodyLines: lines,
    });
  }

  const items: RegexSplitPreviewItem[] = rawChapters.map((ch, idx) => {
    const isZeroPrologue = idx === 0 && ch.title.includes('第0章');
    const num = isZeroPrologue ? 0 : startOrderIndex + (rawChapters[0]?.title.includes('第0章') ? idx - 1 : idx);
    const orderPrefix = String(Math.max(0, num)).padStart(4, '0');
    const body = ch.bodyLines.join('\n').trim();
    const charCount = body.replace(/\s+/g, '').length;

    let warning: string | undefined;
    if (charCount < 100) {
      warning = 'Chương quá ngắn (< 100 chữ) — Có thể dòng tiêu đề bị tách nhầm';
    } else if (charCount > 15000) {
      warning = 'Chương rất dài (> 15.000 chữ) — Có thể sót tiêu đề chương bị lỗi raw';
    }

    return {
      orderPrefix,
      chapterNumber: Math.max(0, num),
      titleRaw: ch.title,
      rawContent: body,
      charCount,
      warning,
    };
  });

  return { items };
}

/**
 * Parse an uploaded .EPUB file on the client using JSZip.
 */
export async function parseEpubFile(
  file: File,
  novelId: string,
  startIndex = 1
): Promise<{
  bookTitle?: string;
  author?: string;
  chapters: Chapter[];
}> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // 1. Find OPF path from META-INF/container.xml
  let opfPath = '';
  const containerFile = zip.file('META-INF/container.xml');
  if (containerFile) {
    const containerXml = await containerFile.async('string');
    const match = containerXml.match(/full-path=["']([^"']+)["']/i);
    if (match) opfPath = match[1];
  }

  if (!opfPath) {
    const allFiles = Object.keys(zip.files);
    opfPath = allFiles.find((f) => f.toLowerCase().endsWith('.opf')) || '';
  }

  const opfDir = opfPath.includes('/')
    ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1)
    : '';

  let bookTitle = file.name.replace(/\.epub$/i, '');
  let author = '';
  const orderedHrefs: string[] = [];

  if (opfPath && zip.file(opfPath)) {
    const opfXml = await zip.file(opfPath)!.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(opfXml, 'application/xml');

    const titleEl = doc.querySelector('title, dc\\:title');
    if (titleEl?.textContent) bookTitle = titleEl.textContent.trim();

    const creatorEl = doc.querySelector('creator, dc\\:creator');
    if (creatorEl?.textContent) author = creatorEl.textContent.trim();

    const manifestMap = new Map<string, string>();
    doc.querySelectorAll('manifest > item').forEach((item) => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type') || '';
      if (id && href && (mediaType.includes('html') || href.match(/\.(x?html|htm)$/i))) {
        manifestMap.set(id, opfDir + decodeURIComponent(href));
      }
    });

    doc.querySelectorAll('spine > itemref').forEach((ref) => {
      const idref = ref.getAttribute('idref');
      if (idref && manifestMap.has(idref)) {
        orderedHrefs.push(manifestMap.get(idref)!);
      }
    });
  }

  if (orderedHrefs.length === 0) {
    // Fallback: all html/xhtml files sorted naturally
    Object.keys(zip.files)
      .filter((k) => /\.(x?html|htm)$/i.test(k) && !/nav|toc|cover/i.test(k))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .forEach((k) => orderedHrefs.push(k));
  }

  const chapters: Chapter[] = [];
  let chCounter = startIndex;

  for (let i = 0; i < orderedHrefs.length; i++) {
    const href = orderedHrefs[i];
    const zipEntry = zip.file(href) || zip.file(decodeURIComponent(href));
    if (!zipEntry) continue;

    const htmlContent = await zipEntry.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Skip navigation or tiny cover pages
    if (doc.querySelector('nav[epub\\:type="toc"], nav#toc')) continue;

    const headingEl = doc.querySelector('h1, h2, h3, title');
    let titleRaw = headingEl?.textContent?.trim() || '';

    const paragraphs: string[] = [];
    const pElements = doc.querySelectorAll('p, div.paragraph');
    if (pElements.length > 0) {
      pElements.forEach((p) => {
        const t = p.textContent?.trim();
        if (t) paragraphs.push(t);
      });
    } else {
      const bodyText = doc.body?.innerText || doc.body?.textContent || '';
      bodyText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((l) => paragraphs.push(l));
    }

    const rawBody = paragraphs.join('\n').trim();
    if (rawBody.length < 20 && !titleRaw) continue;

    if (!titleRaw) {
      titleRaw = paragraphs[0] || `第${chCounter}章`;
    }

    const cleanedBody = cleanRawChapterBody(rawBody, titleRaw);
    const orderPrefix = String(chCounter).padStart(4, '0');

    chapters.push({
      id: `ch-${novelId}-${orderPrefix}-${Date.now()}-${i}`,
      novelId,
      orderPrefix,
      chapterNumber: chCounter,
      fileNameOriginal: `${orderPrefix}_${titleRaw}.txt`,
      titleRaw,
      titleTranslated: '',
      rawContent: cleanedBody,
      translatedContent: '',
      charCount: cleanedBody.replace(/\s+/g, '').length,
      status: 'raw',
      updatedAt: Date.now(),
    });
    chCounter++;
  }

  return { bookTitle, author, chapters };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Ensure chapter has a clean Vietnamese title when exporting.
 * Converts basic "第X章" patterns if untranslated or uses existing titleTranslated.
 */
export function ensureExportVietnameseTitle(chapter: Chapter): string {
  const translated = (chapter.titleTranslated || '').trim();
  if (translated.length > 0) {
    return translated;
  }
  const raw = (chapter.titleRaw || '').trim();
  const replaced = raw.replace(
    /^第([0-9零一二三四五六七八九十百千万]+)[章回节卷]\s*/,
    `Chương ${chapter.chapterNumber}: `
  );
  return replaced || `Chương ${chapter.chapterNumber}`;
}

/**
 * Choose chapter title and whether to omit the first body line if it duplicates the title.
 * Ported from trình-tách-chương-truyện (chapterText.ts) and adapted for mhc's Vietnamese + Raw modes.
 */
export function chooseChapterExportTitle(
  chapter: Chapter,
  contentLanguage: ExportContentLanguage = 'vi_only',
  titleSource: TitleSource = 'auto'
): { title: string; omitFirstLine: boolean } {
  const body =
    contentLanguage === 'raw_only'
      ? chapter.rawContent || ''
      : chapter.translatedContent || chapter.rawContent || '';

  const firstNonEmpty =
    body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) || '';

  const storedTitle =
    contentLanguage === 'raw_only'
      ? (chapter.titleRaw || '').trim() || `第${chapter.chapterNumber}章`
      : ensureExportVietnameseTitle(chapter);

  if (titleSource === 'first-line' && firstNonEmpty && firstNonEmpty.length <= 200) {
    return { title: firstNonEmpty, omitFirstLine: true };
  }

  const norm = (s: string) =>
    s
      .normalize('NFKC')
      .replace(/[！!？?。，,.:：\-—–\s]/g, '')
      .toLowerCase();

  const isFirstLineDuplicate =
    Boolean(firstNonEmpty) &&
    firstNonEmpty.length <= 240 &&
    (norm(firstNonEmpty) === norm(storedTitle) ||
      norm(firstNonEmpty) === norm(chapter.titleRaw || '') ||
      norm(firstNonEmpty) === norm(chapter.titleTranslated || ''));

  return {
    title: storedTitle,
    omitFirstLine: isFirstLineDuplicate,
  };
}

export interface Epub33ExportOptions {
  titleSource?: TitleSource;
  language?: string;
}

/**
 * Generate a strict W3C EPUB 3.3 + EPUB 2 Dual-TOC compliant e-book (.epub Blob).
 * Includes:
 * - Uncompressed `mimetype` as first entry
 * - `META-INF/container.xml`
 * - `OEBPS/package.opf` (version="3.0", dcterms:modified, spine toc="ncx")
 * - `OEBPS/nav.xhtml` (EPUB 3.3 HTML5 Navigation Document with epub:type="toc" & list-style: none !important)
 * - `OEBPS/toc.ncx` (EPUB 2 NCX Table of Contents for Kindle/Kobo/legacy readers)
 * - `OEBPS/style.css` (with text-align: justify and anti-numbering TOC rules)
 * - `OEBPS/chapter_XXXX.xhtml` for each chapter (with cleanXml sanitization)
 */
export async function generateEpub33Blob(
  novel: NovelProject,
  chapters: Chapter[],
  mode: ExportContentLanguage = 'vi_only',
  options?: Epub33ExportOptions
): Promise<Blob> {
  const zip = new JSZip();
  const titleSource = options?.titleSource || 'auto';
  const langCode =
    options?.language?.trim() || (mode === 'raw_only' ? 'zh-CN' : 'vi');

  // 1. mimetype MUST be first and uncompressed (STORE)
  zip.file('mimetype', 'application/epub+zip', {
    compression: 'STORE',
    createFolders: false,
  });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml, { createFolders: false });

  // 3. OEBPS/style.css (Always Justify + anti-auto-numbering TOC rules from trình-tách-chương-truyện)
  const listStyle =
    'list-style: none !important; list-style-type: none !important; margin: 0; padding-left: 0;';
  const itemStyle =
    'list-style: none !important; list-style-type: none !important; margin: 0.45em 0;';
  const styleCss = `@charset "UTF-8";
body {
  font-family: "Literata", "Noto Serif", "Songti SC", "SimSun", Georgia, serif;
  line-height: 1.8;
  margin: 5% 6%;
  color: #1C1917;
  text-align: justify;
  text-justify: inter-word;
}
h1.chapter-title {
  font-size: 1.45em;
  font-weight: 700;
  text-align: center;
  margin: 1.4em 0 1.1em 0;
  line-height: 1.35;
  color: #8C2D19;
  border-bottom: 1px solid #E5DEC9;
  padding-bottom: 0.6em;
  page-break-after: avoid;
}
p {
  text-align: justify;
  text-justify: inter-word;
  text-indent: 1.5em;
  margin: 0 0 0.85em 0;
  line-height: 1.85;
}
p.raw-cn {
  color: #6B7280;
  font-size: 0.9em;
  text-indent: 0;
  margin-bottom: 0.25em;
}
p.empty {
  text-indent: 0;
  margin: 0.4em 0;
}
nav[epub|type~="toc"] ol, nav#toc ol {
  ${listStyle}
}
nav[epub|type~="toc"] li, nav#toc li {
  ${itemStyle}
}
nav[epub|type~="toc"] li::marker, nav#toc li::marker {
  content: "" !important;
}
nav#toc a {
  text-decoration: none;
  color: #1C1917;
}`;
  zip.file('OEBPS/style.css', styleCss, { createFolders: false });

  // 4. Build Chapter XHTML files & Optional Cover Page
  const manifestItems: string[] = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="css" href="style.css" media-type="text/css"/>`,
  ];
  const spineItems: string[] = [];

  const bookDisplayTitle = cleanXml(
    mode === 'raw_only' && novel.originalTitle
      ? novel.originalTitle
      : novel.title || 'Truyện'
  );

  // Embed EPUB Cover if present on NovelProject
  if (novel.coverDataBase64 && novel.coverDataBase64.includes('base64,')) {
    const isPng =
      novel.coverMimeType?.includes('png') ||
      novel.coverDataBase64.startsWith('data:image/png');
    const ext = isPng ? 'png' : 'jpg';
    const mime = isPng ? 'image/png' : 'image/jpeg';
    const base64Raw = novel.coverDataBase64.split('base64,')[1];
    if (base64Raw) {
      zip.file(`OEBPS/images/cover.${ext}`, base64Raw, { base64: true });
      const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(langCode)}" lang="${escapeXml(langCode)}">
<head>
  <meta charset="UTF-8"/>
  <title>Bìa sách - ${escapeXml(bookDisplayTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
  <style type="text/css">
    body { margin: 0; padding: 0; text-align: center; }
    .cover-wrap { display: flex; align-items: center; justify-content: center; height: 98vh; }
    .cover-wrap img { max-width: 100%; max-height: 96vh; object-fit: contain; }
  </style>
</head>
<body epub:type="cover">
  <div class="cover-wrap">
    <img src="images/cover.${ext}" alt="${escapeXml(bookDisplayTitle)}"/>
  </div>
</body>
</html>`;
      zip.file('OEBPS/cover.xhtml', coverXhtml, { createFolders: false });
      manifestItems.push(
        `<item id="cover-image" href="images/cover.${ext}" media-type="${mime}" properties="cover-image"/>`,
        `<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>`
      );
      spineItems.push(`<itemref idref="cover-page"/>`);
    }
  }

  spineItems.push(`<itemref idref="nav"/>`);
  const navLinks: string[] = [];
  const ncxPoints: string[] = [];

  chapters.forEach((ch, idx) => {
    const fileId = `ch_${ch.orderPrefix}_${idx}`;
    const fileName = `chapter_${ch.orderPrefix}_${idx}.xhtml`;
    const chosen = chooseChapterExportTitle(ch, mode, titleSource);
    const chapterTitle = cleanXml(chosen.title);

    const rawLines = (ch.rawContent || '')
      .split(/\r?\n/)
      .map((l) => cleanXml(l).trim())
      .filter(Boolean);
    const viLines = (ch.translatedContent || ch.rawContent || '')
      .split(/\r?\n/)
      .map((l) => cleanXml(l).trim())
      .filter(Boolean);

    let bodyHtml = '';
    if (mode === 'bilingual') {
      const maxLen = Math.max(viLines.length, rawLines.length);
      for (let i = 0; i < maxLen; i++) {
        if (rawLines[i]) {
          bodyHtml += `    <p class="raw-cn">${escapeXml(rawLines[i])}</p>\n`;
        }
        if (viLines[i]) {
          bodyHtml += `    <p>${escapeXml(viLines[i])}</p>\n`;
        }
      }
    } else {
      const sourceLines = mode === 'raw_only' ? rawLines : viLines;
      const filteredLines = chosen.omitFirstLine
        ? sourceLines.slice(1)
        : sourceLines;
      bodyHtml =
        filteredLines.map((p) => `    <p>${escapeXml(p)}</p>`).join('\n') ||
        '    <p class="empty">&#160;</p>';
    }

    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(langCode)}" lang="${escapeXml(langCode)}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(chapterTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body epub:type="bodymatter chapter">
  <section epub:type="chapter">
    <h1 class="chapter-title">${escapeXml(chapterTitle)}</h1>
${bodyHtml}
  </section>
</body>
</html>`;

    zip.file(`OEBPS/${fileName}`, chapterXhtml, { createFolders: false });
    manifestItems.push(
      `<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`
    );
    spineItems.push(`<itemref idref="${fileId}"/>`);
    navLinks.push(
      `        <li style="${itemStyle}"><a href="${fileName}" style="white-space: pre-wrap;">${escapeXml(chapterTitle)}</a></li>`
    );
    ncxPoints.push(
      `    <navPoint id="nav-${idx}" playOrder="${idx + 1}"><navLabel><text>${escapeXml(chapterTitle)}</text></navLabel><content src="${fileName}"/></navPoint>`
    );
  });

  // 5. OEBPS/nav.xhtml (EPUB 3.3 Navigation Document)
  const tocHeading = mode === 'raw_only' ? '目录' : 'Mục Lục';
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(langCode)}" lang="${escapeXml(langCode)}">
<head>
  <meta charset="UTF-8"/>
  <title>${tocHeading} - ${escapeXml(bookDisplayTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc" role="doc-toc">
    <h1 class="chapter-title">${tocHeading} — ${escapeXml(bookDisplayTitle)}</h1>
    <ol style="${listStyle}">
${navLinks.join('\n')}
    </ol>
  </nav>
</body>
</html>`;
  zip.file('OEBPS/nav.xhtml', navXhtml, { createFolders: false });

  // 6. OEBPS/toc.ncx (EPUB 2 Navigation Center eXtended for backward compatibility)
  const pubId = `urn:uuid:${novel.id}-${Date.now()}`;
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(pubId)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(bookDisplayTitle)}</text></docTitle>
  <navMap>
${ncxPoints.join('\n')}
  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', tocNcx, { createFolders: false });

  // 7. OEBPS/package.opf (W3C EPUB 3.3 Specification + NCX Spine attribute)
  const modifiedIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const packageOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${escapeXml(langCode)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${escapeXml(pubId)}</dc:identifier>
    <dc:title>${escapeXml(bookDisplayTitle)}</dc:title>
    <dc:creator>${escapeXml(cleanXml(novel.author || 'Khuyết danh'))}</dc:creator>
    <dc:language>${escapeXml(langCode)}</dc:language>
    <dc:description>${escapeXml(cleanXml(novel.description || novel.originalTitle || ''))}</dc:description>
    <meta property="dcterms:modified">${modifiedIso}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
  zip.file('OEBPS/package.opf', packageOpf, { createFolders: false });

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Format a single chapter's plain text for merged/chunked/individual TXT export.
 */
export function formatChapterPlainText(
  ch: Chapter,
  mode: ExportContentLanguage = 'vi_only',
  titleSource: TitleSource = 'auto'
): string {
  if (mode === 'bilingual') {
    const titleVi = ensureExportVietnameseTitle(ch);
    const viLines = (ch.translatedContent || '').split(/\r?\n/).filter(Boolean);
    const cnLines = (ch.rawContent || '').split(/\r?\n/).filter(Boolean);
    const max = Math.max(viLines.length, cnLines.length);
    const pairs: string[] = [];
    for (let i = 0; i < max; i++) {
      if (cnLines[i]) pairs.push(cnLines[i]);
      if (viLines[i]) pairs.push(viLines[i]);
      pairs.push('');
    }
    return `${titleVi}\n[${ch.titleRaw}]\n\n${pairs.join('\n').trim()}`;
  }

  const chosen = chooseChapterExportTitle(ch, mode, titleSource);
  const rawBody =
    mode === 'raw_only'
      ? (ch.rawContent || '').trim()
      : (ch.translatedContent || ch.rawContent || '').trim();

  const lines = rawBody.split(/\r?\n/);
  const bodyText = (chosen.omitFirstLine ? lines.slice(1) : lines)
    .join('\n')
    .trim();

  return bodyText ? `${chosen.title}\n\n${bodyText}` : chosen.title;
}

/**
 * Generate a .ZIP archive of individual .TXT files preserving the exact prefix `XXXX_Chương X - Title.txt`
 */
export async function generatePrefixedTxtZipBlob(
  chapters: Chapter[],
  mode: ExportContentLanguage = 'vi_only',
  outputEncoding: OutputEncoding = 'utf-8',
  titleSource: TitleSource = 'auto'
): Promise<Blob> {
  const zip = new JSZip();

  for (const ch of chapters) {
    const chosen = chooseChapterExportTitle(ch, mode, titleSource);
    const fileName = safeFilename(`${ch.orderPrefix}_${chosen.title}.txt`);
    const body = `${formatChapterPlainText(ch, mode, titleSource)}\n`;

    zip.file(fileName, encodeTextWithEncoding(body, outputEncoding), {
      createFolders: false,
    });
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Generate a single merged .TXT file for selected chapters.
 */
export function generateMergedTxtBlob(
  novel: NovelProject,
  chapters: Chapter[],
  mode: ExportContentLanguage = 'vi_only',
  outputEncoding: OutputEncoding = 'utf-8',
  titleSource: TitleSource = 'auto'
): Blob {
  const blocks = chapters.map((ch) =>
    formatChapterPlainText(ch, mode, titleSource)
  );
  const fullText = `${blocks.join('\n\n\n')}\n`;
  const encoded = encodeTextWithEncoding(fullText, outputEncoding);
  return new Blob([encoded as BlobPart], {
    type: 'text/plain;charset=utf-8',
  });
}

export interface NotebookLmExportOptions {
  bookTitle: string;
  mode: NotebookLmMode; // 'chunks' | 'big' | 'both'
  chunkSize: number; // default 50
  contentLanguage: ExportContentLanguage; // 'vi_only' | 'raw_only' | 'bilingual'
  titleSource: TitleSource; // 'auto' | 'saved' | 'first-line'
  outputEncoding: OutputEncoding; // 'utf-8' | 'utf-8-sig' | 'utf-16le'
  hasRangeFilter?: boolean;
}

export interface NotebookLmPlannedFile {
  filename: string;
  chapters: Chapter[];
  kind: 'big' | 'chunk';
}

/**
 * Plan output TXT files for NotebookLM / LLM chunking (ported from trình-tách-chương-truyện exporters.ts).
 */
export function planNotebookLmOutputs(
  chapters: Chapter[],
  options: NotebookLmExportOptions
): NotebookLmPlannedFile[] {
  if (chapters.length === 0) return [];
  const name = safeFilename(options.bookTitle || 'truyen');
  const chunkSize =
    Number.isSafeInteger(options.chunkSize) && options.chunkSize >= 1
      ? options.chunkSize
      : 50;

  const firstNum = chapters[0].chapterNumber;
  const lastNum = chapters[chapters.length - 1].chapterNumber;

  const plans: NotebookLmPlannedFile[] = [];

  if (options.mode === 'big' || options.mode === 'both') {
    const bigName = options.hasRangeFilter
      ? safeFilename(`${name}[${firstNum}-${lastNum}].txt`)
      : safeFilename(`${name}.txt`);
    plans.push({
      filename: bigName,
      chapters,
      kind: 'big',
    });
  }

  if (options.mode === 'chunks' || options.mode === 'both') {
    for (let i = 0; i < chapters.length; i += chunkSize) {
      const slice = chapters.slice(i, i + chunkSize);
      const startN = slice[0].chapterNumber;
      const endN = slice[slice.length - 1].chapterNumber;
      plans.push({
        filename: safeFilename(`${name}[${startN}-${endN}].txt`),
        chapters: slice,
        kind: 'chunk',
      });
    }
  }

  return plans;
}

/**
 * Build NotebookLM / LLM export (either a single .txt Blob when mode === 'big', or a .zip Blob of chunked .txt files).
 */
export async function generateNotebookLmExport(
  chapters: Chapter[],
  options: NotebookLmExportOptions
): Promise<{ blob: Blob; filename: string }> {
  const plans = planNotebookLmOutputs(chapters, options);
  if (plans.length === 0) {
    throw new Error('Không có chương nào trong phạm vi đã chọn để xuất.');
  }

  const name = safeFilename(options.bookTitle || 'truyen');

  if (options.mode === 'big' && plans.length === 1) {
    const text = `${plans[0].chapters
      .map((ch) =>
        formatChapterPlainText(ch, options.contentLanguage, options.titleSource)
      )
      .join('\n\n\n')}\n`;
    const bytes = encodeTextWithEncoding(text, options.outputEncoding);
    return {
      blob: new Blob([bytes as BlobPart], { type: 'text/plain;charset=utf-8' }),
      filename: plans[0].filename,
    };
  }

  const zip = new JSZip();
  for (const plan of plans) {
    const text = `${plan.chapters
      .map((ch) =>
        formatChapterPlainText(ch, options.contentLanguage, options.titleSource)
      )
      .join('\n\n\n')}\n`;
    const bytes = encodeTextWithEncoding(text, options.outputEncoding);
    zip.file(plan.filename, bytes, { createFolders: false });
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    blob: zipBlob,
    filename: `${name}_notebooklm.zip`,
  };
}

/**
 * Full Project Backup (.ZIP v5 format compatible with Xưởng Dịch Hán Việt / Mặc Hương Các):
 * Contains manifest.json, source/{id}.txt, translation/{id}.txt, reader-fonts/, cover/, presets, glossary, highlights.
 */
export async function generateProjectBackupZipV5(params: {
  novel: NovelProject;
  chapters: Chapter[];
  instructions: import('./types').InstructionProfile[];
  glossary: import('./types').GlossaryEntry[];
  highlights: import('./types').ReaderHighlight[];
  customFonts: import('./types').CustomFontRecord[];
  readerSettings: import('./types').ReaderSettings;
}): Promise<Blob> {
  const {
    novel,
    chapters,
    instructions,
    glossary,
    highlights,
    customFonts,
    readerSettings,
  } = params;
  const zip = new JSZip();

  let coverFilename = '';
  if (novel.coverDataBase64 && novel.coverDataBase64.includes('base64,')) {
    const isPng =
      novel.coverMimeType?.includes('png') ||
      novel.coverDataBase64.startsWith('data:image/png');
    const ext = isPng ? 'png' : 'jpg';
    coverFilename = `cover/cover.${ext}`;
    const rawBase64 = novel.coverDataBase64.split('base64,')[1];
    if (rawBase64) {
      zip.file(coverFilename, rawBase64, { base64: true });
    }
  }

  for (const ch of chapters) {
    zip.file(
      `source/${ch.id}.txt`,
      `${ch.titleRaw}\n\n${ch.rawContent || ''}`
    );
    if (ch.translatedContent || ch.titleTranslated) {
      zip.file(
        `translation/${ch.id}.txt`,
        `${ch.titleTranslated || ''}\n\n${ch.translatedContent || ''}`
      );
    }
  }

  const fontMetaList = customFonts.map((f) => {
    const base64Part = f.dataBase64.includes('base64,')
      ? f.dataBase64.split('base64,')[1]
      : f.dataBase64;
    zip.file(`reader-fonts/${f.id}_${f.fileName}`, base64Part, {
      base64: true,
    });
    return {
      id: f.id,
      name: f.name,
      fileName: f.fileName,
      mimeType: f.mimeType,
      createdAt: f.createdAt,
    };
  });

  const manifest = {
    format: 'xuong-dich-han-viet-backup',
    version: 5,
    exportedAt: new Date().toISOString(),
    project: {
      ...novel,
      coverDataBase64: undefined, // stored in cover/cover.ext
    },
    presets: instructions.filter((i) => i.role !== 'editorial'),
    editorialPresets: instructions.filter((i) => i.role === 'editorial'),
    glossary,
    readerHighlights: highlights,
    readerFonts: fontMetaList,
    settings: { readerSettings },
    coverFilename,
    chapters: chapters.map((c) => ({
      ...c,
      rawContent: '', // stored in source/{id}.txt
      translatedContent: '', // stored in translation/{id}.txt
    })),
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Restore a Full Project Backup (.ZIP v5) into a new local NovelProject without overwriting existing projects.
 */
export async function parseProjectBackupZipV5(file: File): Promise<{
  novel: NovelProject;
  chapters: Chapter[];
  glossary: import('./types').GlossaryEntry[];
  instructions: import('./types').InstructionProfile[];
  highlights: import('./types').ReaderHighlight[];
}> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) {
    throw new Error('Gói .ZIP không hợp lệ: Thiếu tệp manifest.json.');
  }

  const manifest = JSON.parse(await manifestEntry.async('string'));
  if (!manifest || !manifest.project || !Array.isArray(manifest.chapters)) {
    throw new Error('Cấu trúc manifest.json trong gói Backup không hợp lệ.');
  }

  const newNovelId = `novel-restore-${Date.now()}`;
  let coverDataBase64: string | undefined;
  let coverMimeType: string | undefined;

  if (manifest.coverFilename && zip.file(manifest.coverFilename)) {
    const b64 = await zip.file(manifest.coverFilename)!.async('base64');
    const isPng = manifest.coverFilename.toLowerCase().endsWith('.png');
    coverMimeType = isPng ? 'image/png' : 'image/jpeg';
    coverDataBase64 = `data:${coverMimeType};base64,${b64}`;
  }

  const restoredNovel: NovelProject = {
    ...manifest.project,
    id: newNovelId,
    title: `${manifest.project.title || 'Dự án'} (Phục hồi)`,
    coverDataBase64,
    coverMimeType,
    includeGlossary: Boolean(manifest.project.includeGlossary),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const chapterIdMap = new Map<string, string>();
  const restoredChapters: Chapter[] = [];

  for (let i = 0; i < manifest.chapters.length; i++) {
    const chMeta = manifest.chapters[i];
    const oldId = chMeta.id;
    const newChId = `ch-${newNovelId}-${chMeta.orderPrefix || String(i).padStart(4, '0')}-${i}`;
    chapterIdMap.set(oldId, newChId);

    let rawContent = chMeta.rawContent || '';
    const srcFile = zip.file(`source/${oldId}.txt`);
    if (srcFile) {
      const fullSrc = await srcFile.async('string');
      rawContent = cleanRawChapterBody(fullSrc, chMeta.titleRaw || '');
    }

    let translatedContent = chMeta.translatedContent || '';
    let titleTranslated = chMeta.titleTranslated || '';
    const trFile = zip.file(`translation/${oldId}.txt`);
    if (trFile) {
      const fullTr = await trFile.async('string');
      const lines = fullTr.replace(/\r\n/g, '\n').split('\n');
      const firstLine = (lines[0] || '').trim();
      if (!titleTranslated && firstLine) {
        titleTranslated = firstLine;
        translatedContent = lines.slice(1).join('\n').trim();
      } else {
        translatedContent = cleanRawChapterBody(fullTr, titleTranslated);
      }
    }

    restoredChapters.push({
      ...chMeta,
      id: newChId,
      novelId: newNovelId,
      titleTranslated,
      rawContent,
      translatedContent,
      charCount: rawContent.replace(/\s+/g, '').length,
      updatedAt: Date.now(),
    });
  }

  const restoredGlossary: import('./types').GlossaryEntry[] = (
    manifest.glossary || []
  ).map((g: import('./types').GlossaryEntry, idx: number) => ({
    ...g,
    id: `gl-${newNovelId}-${Date.now()}-${idx}`,
    novelId: newNovelId,
  }));

  const allPresets = [
    ...(manifest.presets || []),
    ...(manifest.editorialPresets || []),
  ];
  const restoredInstructions: import('./types').InstructionProfile[] =
    allPresets.map((p: import('./types').InstructionProfile) => ({
      ...p,
      autoUpdate: false, // Protect restored presets from auto-overwriting
    }));

  const restoredHighlights: import('./types').ReaderHighlight[] = (
    manifest.readerHighlights || []
  ).map((h: import('./types').ReaderHighlight, idx: number) => ({
    ...h,
    id: `hl-${newNovelId}-${Date.now()}-${idx}`,
    novelId: newNovelId,
    chapterId: chapterIdMap.get(h.chapterId) || h.chapterId,
  }));

  return {
    novel: restoredNovel,
    chapters: restoredChapters,
    glossary: restoredGlossary,
    instructions: restoredInstructions,
    highlights: restoredHighlights,
  };
}

