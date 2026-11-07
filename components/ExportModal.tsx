'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Download,
  BookOpen,
  FileArchive,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ImagePlus,
  Trash2,
  HardDriveDownload,
  HardDriveUpload,
  Layers,
} from 'lucide-react';
import {
  Chapter,
  CustomFontRecord,
  DEFAULT_THINKING_LEVEL,
  GlossaryEntry,
  InstructionProfile,
  NovelProject,
  QAValidationRules,
  ReaderHighlight,
  ReaderSettings,
  ThinkingLevelOption,
} from '@/lib/types';
import {
  ExportContentLanguage,
  generateEpub33Blob,
  generateMergedTxtBlob,
  generateNotebookLmExport,
  generatePrefixedTxtZipBlob,
  generateProjectBackupZipV5,
  NotebookLmMode,
  OutputEncoding,
  parseProjectBackupZipV5,
  planNotebookLmOutputs,
  safeFilename,
  TitleSource,
} from '@/lib/file-engine';
import { scanChapterQA } from '@/lib/qa-scanner';
import { safeFetchJson } from '@/lib/logger';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  novel: NovelProject;
  chapters: Chapter[];
  selectedChapterIds: Set<string>;
  selectedModel: string;
  thinkingLevel?: ThinkingLevelOption;
  qaRules?: QAValidationRules;
  glossary: GlossaryEntry[];
  instructions: InstructionProfile[];
  highlights: ReaderHighlight[];
  customFonts: CustomFontRecord[];
  readerSettings: ReaderSettings;
  customBannedWords: string[];
  onUpdateNovel: (updatedNovel: NovelProject) => Promise<void>;
  onUpdateChaptersBulk: (updated: Chapter[]) => Promise<void>;
  onRestoreBackupProject: (restored: {
    novel: NovelProject;
    chapters: Chapter[];
    glossary: GlossaryEntry[];
    instructions: InstructionProfile[];
    highlights: ReaderHighlight[];
    customFonts?: CustomFontRecord[];
    readerSettings?: ReaderSettings;
  }) => Promise<void>;
}

const CJK_CHECK = /[\u4E00-\u9FFF\u3400-\u4DBF]/;

export default function ExportModal({
  isOpen,
  onClose,
  novel,
  chapters,
  selectedChapterIds,
  selectedModel,
  thinkingLevel = DEFAULT_THINKING_LEVEL,
  qaRules,
  glossary,
  instructions,
  highlights,
  customFonts,
  readerSettings,
  customBannedWords,
  onUpdateNovel,
  onUpdateChaptersBulk,
  onRestoreBackupProject,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<'ebook' | 'backup_v5'>('ebook');
  const [format, setFormat] = useState<
    'epub33' | 'notebooklm' | 'zip_txt' | 'merged_txt'
  >('epub33');
  const [scope, setScope] = useState<'all' | 'translated' | 'ticked'>('all');
  const [mode, setMode] = useState<ExportContentLanguage>('vi_only');
  const [titleSource, setTitleSource] = useState<TitleSource>('auto');
  const [outputEncoding, setOutputEncoding] = useState<OutputEncoding>('utf-8');
  const [notebookMode, setNotebookMode] = useState<NotebookLmMode>('chunks');
  const [chunkSize, setChunkSize] = useState<number>(50);
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [translatingTitles, setTranslatingTitles] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const hasRangeFilter = Boolean(rangeStart.trim() || rangeEnd.trim());

  const targetChapters = useMemo(() => {
    let baseList = chapters;
    if (scope === 'ticked') {
      baseList = chapters.filter((c) => selectedChapterIds.has(c.id));
    } else if (scope === 'translated') {
      baseList = chapters.filter(
        (c) =>
          c.status === 'translated' ||
          c.status === 'edited' ||
          Boolean(c.translatedContent.trim())
      );
    }

    const startNum =
      rangeStart.trim() !== '' ? parseInt(rangeStart.trim(), 10) : null;
    const endNum =
      rangeEnd.trim() !== '' ? parseInt(rangeEnd.trim(), 10) : null;

    if (
      (startNum !== null && !Number.isNaN(startNum)) ||
      (endNum !== null && !Number.isNaN(endNum))
    ) {
      baseList = baseList.filter((c) => {
        if (startNum !== null && !Number.isNaN(startNum) && c.chapterNumber < startNum) {
          return false;
        }
        if (endNum !== null && !Number.isNaN(endNum) && c.chapterNumber > endNum) {
          return false;
        }
        return true;
      });
    }

    return baseList;
  }, [chapters, scope, selectedChapterIds, rangeStart, rangeEnd]);

  const notebookLmPreviewPlans = useMemo(() => {
    if (format !== 'notebooklm' || targetChapters.length === 0) return [];
    const bookName =
      mode === 'raw_only' && novel.originalTitle
        ? novel.originalTitle
        : novel.title;
    return planNotebookLmOutputs(targetChapters, {
      bookTitle: bookName,
      mode: notebookMode,
      chunkSize: Math.max(1, chunkSize || 50),
      contentLanguage: mode,
      titleSource,
      outputEncoding,
      hasRangeFilter,
    });
  }, [
    format,
    targetChapters,
    mode,
    novel.originalTitle,
    novel.title,
    notebookMode,
    chunkSize,
    titleSource,
    outputEncoding,
    hasRangeFilter,
  ]);

  const chaptersMissingViTitle = useMemo(() => {
    if (mode === 'raw_only') return [];
    return targetChapters.filter(
      (c) =>
        !c.titleTranslated.trim() ||
        c.titleTranslated.trim() === c.titleRaw.trim() ||
        CJK_CHECK.test(c.titleTranslated)
    );
  }, [targetChapters, mode]);

  if (!isOpen) return null;

  const handleUploadCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const updatedNovel: NovelProject = {
      ...novel,
      coverDataBase64: dataBase64,
      coverMimeType: file.type || 'image/jpeg',
      coverFileName: file.name,
      updatedAt: Date.now(),
    };
    await onUpdateNovel(updatedNovel);
    setStatusMessage(`Đã lưu ảnh bìa EPUB "${file.name}" vào dự án!`);
    e.target.value = '';
  };

  const handleRemoveCoverImage = async () => {
    const updatedNovel: NovelProject = {
      ...novel,
      coverDataBase64: undefined,
      coverMimeType: undefined,
      coverFileName: undefined,
      updatedAt: Date.now(),
    };
    await onUpdateNovel(updatedNovel);
    setStatusMessage('Đã gỡ ảnh bìa EPUB khỏi dự án.');
  };

  const handleTranslateAllMissingTitles = async () => {
    if (chaptersMissingViTitle.length === 0) return;
    setTranslatingTitles(true);
    setStatusMessage(
      `Đang dịch tự động ${chaptersMissingViTitle.length} tiêu đề chương sang tiếng Việt...`
    );

    const updatedList: Chapter[] = [];
    const glossarySnippet = novel.includeGlossary
      ? glossary
          .filter((g) => g.enabled !== false)
          .slice(0, 80)
          .map((g) => `${g.sourceTerm} = ${g.targetTerm}`)
          .join('\n')
      : '';

    for (const ch of chaptersMissingViTitle) {
      try {
        const res = await safeFetchJson<{ resultText?: string }>(
          '/api/editor/assist',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'translate_title',
              selectedText: ch.titleRaw,
              rawReference: `Số thứ tự chương: ${ch.chapterNumber}.${
                glossarySnippet ? `\nTừ điển:\n${glossarySnippet}` : ''
              }`,
              model: selectedModel,
              thinkingLevel: thinkingLevel || DEFAULT_THINKING_LEVEL,
              includeGlossary: Boolean(novel.includeGlossary),
            }),
          },
          {
            scope: 'AI_EDITOR',
            label: `Dịch tiêu đề Chương #${ch.orderPrefix} (${ch.titleRaw.slice(0, 30)})`,
          }
        );
        if (res.ok && res.data?.resultText) {
          const nextCh: Chapter = {
            ...ch,
            titleTranslated: res.data.resultText.trim(),
            updatedAt: new Date().getTime(),
          };
          nextCh.qaReport = scanChapterQA(
            nextCh,
            customBannedWords,
            qaRules,
            novel.includeGlossary ? glossary : undefined
          );
          updatedList.push(nextCh);
        }
      } catch {
        // Continue next title
      }
    }

    if (updatedList.length > 0) {
      await onUpdateChaptersBulk(updatedList);
      setStatusMessage(
        `Đã dịch hoàn tất ${updatedList.length} tiêu đề chương sang tiếng Việt!`
      );
    } else {
      setStatusMessage('Không thể dịch tự động tiêu đề lúc này.');
    }
    setTranslatingTitles(false);
  };

  const handleDownloadExport = async () => {
    if (targetChapters.length === 0) return;
    setExporting(true);
    setStatusMessage('Đang đóng gói tệp xuất bản...');
    try {
      const displayBookTitle =
        mode === 'raw_only' && novel.originalTitle
          ? novel.originalTitle
          : novel.title;
      const safeBookName = safeFilename(displayBookTitle);

      let blob: Blob;
      let fileName: string;

      if (format === 'epub33') {
        blob = await generateEpub33Blob(novel, targetChapters, mode, {
          titleSource,
          language: mode === 'raw_only' ? 'zh-CN' : 'vi',
        });
        fileName = `${safeBookName}.epub`;
      } else if (format === 'notebooklm') {
        const res = await generateNotebookLmExport(targetChapters, {
          bookTitle: displayBookTitle,
          mode: notebookMode,
          chunkSize: Math.max(1, chunkSize || 50),
          contentLanguage: mode,
          titleSource,
          outputEncoding,
          hasRangeFilter,
        });
        blob = res.blob;
        fileName = res.filename;
      } else if (format === 'zip_txt') {
        blob = await generatePrefixedTxtZipBlob(
          targetChapters,
          mode,
          outputEncoding,
          titleSource
        );
        fileName = `${safeBookName}_Chapters_TXT.zip`;
      } else {
        blob = generateMergedTxtBlob(
          novel,
          targetChapters,
          mode,
          outputEncoding,
          titleSource
        );
        fileName = `${safeBookName}_Full.txt`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(`Đã xuất thành công tệp ${fileName}!`);
    } catch (err) {
      setStatusMessage(`Lỗi khi xuất tệp: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadBackupZipV5 = async () => {
    setExporting(true);
    setStatusMessage('Đang đóng gói bản sao lưu dự án (.ZIP Backup v5)...');
    try {
      const blob = await generateProjectBackupZipV5({
        novel,
        chapters,
        glossary,
        instructions,
        highlights,
        customFonts,
        readerSettings,
      });
      const safeBookName = novel.title
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, '_');
      const fileName = `${safeBookName}_Backup_v5.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(`Đã tải xuống bản sao lưu dự án ${fileName}!`);
    } catch (err) {
      setStatusMessage(`Lỗi sao lưu dự án: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreFromBackupFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoringBackup(true);
    setStatusMessage(`Đang đọc và phục hồi dự án từ tệp ${file.name}...`);
    try {
      const parsed = await parseProjectBackupZipV5(file);
      await onRestoreBackupProject(parsed);
      setStatusMessage(
        `Phục hồi thành công dự án "${parsed.novel.title}" (${parsed.chapters.length} chương, ${parsed.glossary.length} thuật ngữ, ${parsed.highlights.length} highlight)!`
      );
    } catch (err) {
      setStatusMessage(`Lỗi phục hồi dự án: ${(err as Error).message}`);
    } finally {
      setRestoringBackup(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#E5DEC9] bg-[#FBF8F1] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DEC9] bg-[#F3EFE6] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8C2D19] text-white">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1C1917]">
                Xuất Bản Ebook EPUB 3.3 + NCX, Gộp Nguồn NotebookLM &amp; Sao Lưu (.ZIP v5)
              </h2>
              <p className="text-xs text-[#605A52]">
                Đóng gói EPUB chuẩn (Mục lục kép nav.xhtml + toc.ncx), chia gói 50 chương cho NotebookLM, hoặc sao lưu dự án
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#605A52] hover:bg-[#E5DEC9]/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E5DEC9] bg-[#F3EFE6]/60 px-6">
          <button
            onClick={() => setActiveTab('ebook')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
              activeTab === 'ebook'
                ? 'border-[#8C2D19] text-[#8C2D19]'
                : 'border-transparent text-[#605A52] hover:text-[#1C1917]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            1. Xuất Bản EPUB 3.3, Gộp Nguồn NotebookLM &amp; Kho .TXT
          </button>
          <button
            onClick={() => setActiveTab('backup_v5')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
              activeTab === 'backup_v5'
                ? 'border-[#8C2D19] text-[#8C2D19]'
                : 'border-transparent text-[#605A52] hover:text-[#1C1917]'
            }`}
          >
            <HardDriveDownload className="h-4 w-4" />
            2. Sao Lưu &amp; Phục Hồi Dự Án (.ZIP Backup v5)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {activeTab === 'ebook' ? (
            <>
              {/* Format Selection */}
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-[#605A52] uppercase">
                  1. Chọn định dạng tệp xuất bản
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div
                    onClick={() => setFormat('epub33')}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      format === 'epub33'
                        ? 'border-[#8C2D19] bg-[#8C2D19]/8'
                        : 'border-[#E5DEC9] bg-white hover:border-[#C9B99A]'
                    }`}
                  >
                    <BookOpen className="h-5 w-5 text-[#8C2D19]" />
                    <h4 className="mt-2 text-xs font-bold text-[#1C1917]">
                      Ebook EPUB 3.3 + NCX (.epub)
                    </h4>
                    <p className="mt-1 text-[11px] text-[#605A52]">
                      Chuẩn Apple Books, Kindle, Kobo với ảnh bìa, Mục lục kép nav.xhtml + toc.ncx &amp; chống lặp số 1. 第1章.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormat('notebooklm')}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      format === 'notebooklm'
                        ? 'border-[#8C2D19] bg-[#8C2D19]/8'
                        : 'border-[#E5DEC9] bg-white hover:border-[#C9B99A]'
                    }`}
                  >
                    <Layers className="h-5 w-5 text-[#8C2D19]" />
                    <h4 className="mt-2 text-xs font-bold text-[#1C1917]">
                      Gộp Nguồn NotebookLM (.zip/.txt)
                    </h4>
                    <p className="mt-1 text-[11px] text-[#605A52]">
                      Chia gói N chương (ví dụ 50 chương/file TênTruyện[0-49].txt) kèm file TXT tổng cho NotebookLM / AI.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormat('zip_txt')}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      format === 'zip_txt'
                        ? 'border-[#8C2D19] bg-[#8C2D19]/8'
                        : 'border-[#E5DEC9] bg-white hover:border-[#C9B99A]'
                    }`}
                  >
                    <FileArchive className="h-5 w-5 text-[#8C2D19]" />
                    <h4 className="mt-2 text-xs font-bold text-[#1C1917]">
                      Gói .ZIP từng chương .TXT
                    </h4>
                    <p className="mt-1 text-[11px] text-[#605A52]">
                      Giữ nguyên tên tệp XXXX_Tiêu đề.txt đúng thứ tự gốc.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormat('merged_txt')}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      format === 'merged_txt'
                        ? 'border-[#8C2D19] bg-[#8C2D19]/8'
                        : 'border-[#E5DEC9] bg-white hover:border-[#C9B99A]'
                    }`}
                  >
                    <FileText className="h-5 w-5 text-[#8C2D19]" />
                    <h4 className="mt-2 text-xs font-bold text-[#1C1917]">
                      1 Tệp .TXT Gộp Toàn Bộ
                    </h4>
                    <p className="mt-1 text-[11px] text-[#605A52]">
                      Gộp tất cả các chương đã chọn vào 1 tệp .TXT duy nhất.
                    </p>
                  </div>
                </div>
              </div>

              {/* NotebookLM Chunking Configuration */}
              {format === 'notebooklm' && (
                <div className="rounded-xl border border-[#C9B99A] bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-[#8C2D19]">
                      Cấu hình Chia Gói Nguồn Cho NotebookLM / LLM
                    </h4>
                    <span className="font-mono text-[11px] text-[#605A52]">
                      Sẽ tạo {notebookLmPreviewPlans.length} tệp TXT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-[#1C1917]">
                        Chế độ đóng gói:
                      </label>
                      <select
                        value={notebookMode}
                        onChange={(e) =>
                          setNotebookMode(e.target.value as NotebookLmMode)
                        }
                        className="w-full rounded-lg border border-[#E5DEC9] bg-[#FBF8F1] px-3 py-2 text-xs text-[#1C1917]"
                      >
                        <option value="chunks">
                          Chỉ chia gói N chương (TênTruyện[0-49].txt → .ZIP)
                        </option>
                        <option value="both">
                          Cả file TXT tổng + các gói N chương (.ZIP)
                        </option>
                        <option value="big">
                          Chỉ 1 file TXT gộp toàn bộ (.TXT)
                        </option>
                      </select>
                    </div>

                    {notebookMode !== 'big' && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#1C1917]">
                          Số chương mỗi gói:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          value={chunkSize}
                          onChange={(e) =>
                            setChunkSize(
                              Math.max(1, parseInt(e.target.value, 10) || 50)
                            )
                          }
                          className="w-full rounded-lg border border-[#E5DEC9] bg-[#FBF8F1] px-3 py-2 font-mono text-xs text-[#1C1917]"
                        />
                      </div>
                    )}
                  </div>

                  {notebookLmPreviewPlans.length > 0 && (
                    <div className="rounded-lg border border-[#E5DEC9] bg-[#FBF8F1] p-2.5 text-[11px] text-[#605A52]">
                      <div className="font-semibold text-[#1C1917] mb-1">
                        Xem trước danh sách tệp trong gói xuất ({notebookLmPreviewPlans.length} tệp):
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {notebookLmPreviewPlans.slice(0, 30).map((p, i) => (
                          <span
                            key={i}
                            className="rounded border border-[#E5DEC9] bg-white px-2 py-0.5 font-mono text-[11px] text-[#8C2D19]"
                          >
                            {p.filename} ({p.chapters.length} ch)
                          </span>
                        ))}
                        {notebookLmPreviewPlans.length > 30 && (
                          <span className="px-1 py-0.5 text-[11px]">
                            … và {notebookLmPreviewPlans.length - 30} tệp nữa
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EPUB Cover Image Upload & Preview */}
              {format === 'epub33' && (
                <div className="rounded-xl border border-[#E5DEC9] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {novel.coverDataBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={novel.coverDataBase64}
                          alt="EPUB Cover"
                          className="h-20 w-14 rounded-md border border-[#C9B99A] object-cover shadow-xs"
                        />
                      ) : (
                        <div className="flex h-20 w-14 flex-col items-center justify-center rounded-md border border-dashed border-[#C9B99A] bg-[#FBF8F1] text-[10px] text-[#605A52]">
                          <span>Chưa có</span>
                          <span>Bìa sách</span>
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-[#1C1917]">
                          Ảnh Bìa Sách EPUB (Cover Image — Lưu bền vững theo dự án)
                        </h4>
                        <p className="mt-0.5 text-[11px] text-[#605A52]">
                          Ảnh bìa (.JPG / .PNG) sẽ được nhúng vào trang đầu tiên{' '}
                          <code className="font-mono text-[#8C2D19]">OEBPS/cover.xhtml</code> và đính kèm trong gói sao lưu .ZIP v5.
                        </p>
                        {novel.coverFileName && (
                          <p className="mt-1 font-mono text-[11px] font-semibold text-[#1E6F50]">
                            Đang dùng: {novel.coverFileName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleUploadCoverImage}
                        className="hidden"
                      />
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9B99A] bg-[#FBF8F1] px-3 py-1.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F3EFE6]"
                      >
                        <ImagePlus className="h-3.5 w-3.5 text-[#8C2D19]" />
                        {novel.coverDataBase64 ? 'Đổi ảnh bìa' : 'Tải ảnh bìa lên'}
                      </button>
                      {novel.coverDataBase64 && (
                        <button
                          onClick={handleRemoveCoverImage}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Gỡ bìa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Scope, Range, Language Mode, Title Source & Encoding */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#1C1917]">
                    2. Phạm vi chương cần xuất
                  </label>
                  <select
                    value={scope}
                    onChange={(e) =>
                      setScope(e.target.value as 'all' | 'translated' | 'ticked')
                    }
                    className="w-full rounded-lg border border-[#E5DEC9] bg-white px-3 py-2 text-xs text-[#1C1917]"
                  >
                    <option value="all">
                      Tất cả các chương ({chapters.length} chương)
                    </option>
                    <option value="translated">
                      Chỉ các chương đã dịch (
                      {chapters.filter((c) => c.translatedContent.trim()).length}{' '}
                      chương)
                    </option>
                    <option value="ticked">
                      Chỉ các chương đang Tick ({selectedChapterIds.size} chương)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#1C1917]">
                    3. Khoảng số thứ tự chương (Tùy chọn)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      placeholder="Từ (VD: 0)"
                      className="w-full rounded-lg border border-[#E5DEC9] bg-white px-2.5 py-2 font-mono text-xs text-[#1C1917]"
                    />
                    <span className="text-xs text-[#605A52]">→</span>
                    <input
                      type="number"
                      min={0}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      placeholder="Đến (VD: 99)"
                      className="w-full rounded-lg border border-[#E5DEC9] bg-white px-2.5 py-2 font-mono text-xs text-[#1C1917]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#1C1917]">
                    4. Ngôn ngữ nội dung xuất
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ExportContentLanguage)}
                    className="w-full rounded-lg border border-[#E5DEC9] bg-white px-3 py-2 text-xs text-[#1C1917]"
                  >
                    <option value="vi_only">
                      Thuần Tiếng Việt (Bản dịch — Mặc định)
                    </option>
                    <option value="raw_only">
                      Nguyên tác Tiếng Trung (Raw — Cho NotebookLM / Đọc Raw)
                    </option>
                    <option value="bilingual">
                      Song ngữ Trung - Việt (Đối chiếu từng đoạn)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#1C1917]">
                    5. Nguồn tiêu đề chương
                  </label>
                  <select
                    value={titleSource}
                    onChange={(e) => setTitleSource(e.target.value as TitleSource)}
                    className="w-full rounded-lg border border-[#E5DEC9] bg-white px-3 py-2 text-xs text-[#1C1917]"
                  >
                    <option value="auto">
                      Tự động (Khử dòng tiêu đề lặp ở đầu chương)
                    </option>
                    <option value="saved">Luôn dùng tiêu đề chương đã lưu</option>
                    <option value="first-line">
                      Lấy dòng đầu tiên trong nội dung chương
                    </option>
                  </select>
                </div>

                {format !== 'epub33' && (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold text-[#1C1917]">
                      6. Bảng mã xuất tệp .TXT (Encoding)
                    </label>
                    <select
                      value={outputEncoding}
                      onChange={(e) =>
                        setOutputEncoding(e.target.value as OutputEncoding)
                      }
                      className="w-full rounded-lg border border-[#E5DEC9] bg-white px-3 py-2 text-xs text-[#1C1917]"
                    >
                      <option value="utf-8">
                        UTF-8 (Chuẩn khuyến nghị cho NotebookLM, Web &amp; Điện thoại)
                      </option>
                      <option value="utf-8-sig">
                        UTF-8 có BOM (utf-8-sig — Tương thích Notepad Windows cũ)
                      </option>
                      <option value="utf-16le">
                        UTF-16LE (có BOM)
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* Chapter Title Translation Verification Card */}
              {mode !== 'raw_only' && (
                <div className="rounded-xl border border-[#E5DEC9] bg-white p-4">
                  {chaptersMissingViTitle.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" />
                        <div>
                          <h4 className="text-xs font-bold text-[#B45309]">
                            Phát hiện {chaptersMissingViTitle.length}/
                            {targetChapters.length} chương chưa dịch tiêu đề sang tiếng Việt
                          </h4>
                          <p className="mt-0.5 text-[11px] text-[#605A52]">
                            Bạn có thể bấm nút bên cạnh để AI dịch sạch 100% tiêu đề chương trước khi đóng gói Mục lục.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleTranslateAllMissingTitles}
                        disabled={translatingTitles}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#B45309] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#92400E] disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {translatingTitles
                          ? 'Đang dịch tiêu đề...'
                          : `AI Dịch ${chaptersMissingViTitle.length} Tiêu Đề Ngay`}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#1E6F50]">
                      <CheckCircle2 className="h-4 w-4" />
                      100% Tiêu đề chương trong danh sách xuất đã được dịch sang tiếng Việt!
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* TAB 2: PROJECT BACKUP & RESTORE (.ZIP BACKUP V5) */
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1917]">
                      Sao Lưu Toàn Bộ Dự Án Ra Tệp .ZIP (Chuẩn Backup v5)
                    </h3>
                    <p className="mt-1 text-xs text-[#605A52]">
                      Đóng gói đầy đủ: <code className="font-mono">manifest.json</code>, thư mục chương gốc{' '}
                      <code className="font-mono">source/</code>, bản dịch{' '}
                      <code className="font-mono">translation/</code>, dữ liệu căn đoạn{' '}
                      <code className="font-mono">alignment/</code>, toàn bộ Preset Dịch &amp; Biên tập AI, Từ điển Glossary, Highlight &amp; Ghi chú đọc truyện, Phông chữ cá nhân và Ảnh bìa EPUB.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 font-mono text-[11px] text-[#8C2D19]">
                      <span className="rounded bg-[#F3EFE6] px-2 py-0.5">
                        {chapters.length} chương
                      </span>
                      <span className="rounded bg-[#F3EFE6] px-2 py-0.5">
                        {glossary.length} mục Glossary
                      </span>
                      <span className="rounded bg-[#F3EFE6] px-2 py-0.5">
                        {instructions.length} Preset AI
                      </span>
                      <span className="rounded bg-[#F3EFE6] px-2 py-0.5">
                        {highlights.length} Highlight/Ghi chú
                      </span>
                      <span className="rounded bg-[#F3EFE6] px-2 py-0.5">
                        {customFonts.length} Font local
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadBackupZipV5}
                    disabled={exporting}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#8C2D19] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#722211] disabled:opacity-50"
                  >
                    <HardDriveDownload className="h-4 w-4" />
                    {exporting ? 'Đang đóng gói...' : 'Xuất Gói Sao Lưu (.ZIP v5)'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#E5DEC9] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1917]">
                      Phục Hồi Dự Án Từ Tệp Sao Lưu (.ZIP Backup v5)
                    </h3>
                    <p className="mt-1 text-xs text-[#605A52]">
                      Khôi phục nguyên trạng một bộ truyện đã sao lưu (bao gồm cả cấu trúc chương, bản dịch, Block ID alignment, Glossary, Preset, Highlight và Bìa EPUB) vào trình duyệt.
                    </p>
                  </div>
                  <div>
                    <input
                      ref={backupInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      onChange={handleRestoreFromBackupFile}
                      className="hidden"
                    />
                    <button
                      onClick={() => backupInputRef.current?.click()}
                      disabled={restoringBackup}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#8C2D19] bg-[#FBF8F1] px-4 py-2.5 text-xs font-semibold text-[#8C2D19] hover:bg-[#F3EFE6] disabled:opacity-50"
                    >
                      <HardDriveUpload className="h-4 w-4" />
                      {restoringBackup
                        ? 'Đang phục hồi...'
                        : 'Chọn Tệp .ZIP Để Phục Hồi'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="rounded-lg bg-[#F3EFE6] px-4 py-2.5 text-xs font-medium text-[#1C1917]">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5DEC9] bg-[#F3EFE6] px-6 py-4">
          <span className="text-xs text-[#605A52]">
            {activeTab === 'ebook' ? (
              <>
                Số chương sẽ xuất: <strong>{targetChapters.length}</strong> chương
                {format === 'notebooklm' && notebookLmPreviewPlans.length > 0 && (
                  <>
                    {' '}
                    · Chia thành <strong>{notebookLmPreviewPlans.length}</strong> tệp
                  </>
                )}
              </>
            ) : (
              <>Định dạng sao lưu chuẩn: Mặc Hương Các Backup Schema v5.0</>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-[#605A52] hover:bg-[#E5DEC9]"
            >
              Đóng
            </button>
            {activeTab === 'ebook' && (
              <button
                onClick={handleDownloadExport}
                disabled={exporting || targetChapters.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8C2D19] px-5 py-2 text-xs font-semibold text-white hover:bg-[#722211] disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Đang xuất tệp...' : 'Tải Xuống Ngay'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
