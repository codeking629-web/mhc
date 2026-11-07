'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  FolderUp,
  FileText,
  BookOpen,
  Globe,
  X,
  Check,
  AlertTriangle,
  Sparkles,
  Upload,
  Download,
  FileArchive,
  Wand2,
  Code2,
  Eye,
} from 'lucide-react';
import { Chapter } from '@/lib/types';
import {
  cleanRawChapterBody,
  decodeTextWithEncoding,
  generateSplitChaptersZipBlob,
  getSmartSplitSampleText,
  InputEncoding,
  parseEpubFile,
  parseFolderOrZipTxtFiles,
  safeFilename,
  splitChaptersSmart,
  splitMergedTxtByRegex,
} from '@/lib/file-engine';
import { REGEX_SPLIT_PRESETS } from '@/lib/seed-data';
import { safeFetchJson } from '@/lib/logger';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  novelId: string;
  existingChapterCount: number;
  onImportChapters: (
    chapters: Chapter[],
    detectedBookMeta?: { title?: string; author?: string }
  ) => Promise<void>;
}

export default function ImportModal({
  isOpen,
  onClose,
  novelId,
  existingChapterCount,
  onImportChapters,
}: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<
    'folder_txt' | 'epub' | 'merged_txt' | 'paste_url'
  >('folder_txt');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shared Input Encoding for TXT / ZIP
  const [inputEncoding, setInputEncoding] = useState<InputEncoding>('auto');

  // Tab 1: Folder / Multiple TXT / ZIP files (XXXX_Title.txt)
  const [folderParsedChapters, setFolderParsedChapters] = useState<Chapter[]>([]);
  const [folderWarnings, setFolderWarnings] = useState<string[]>([]);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const multiFilesInputRef = useRef<HTMLInputElement | null>(null);
  const zipFileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 2: EPUB
  const [epubParsedChapters, setEpubParsedChapters] = useState<Chapter[]>([]);
  const [epubMeta, setEpubMeta] = useState<{ title?: string; author?: string }>({});

  // Tab 3: Single Merged TXT (Smart Splitter OR Custom Regex)
  const [splitEngineMode, setSplitEngineMode] = useState<'smart' | 'regex'>('smart');
  const [mergedRawText, setMergedRawText] = useState('');
  const [mergedFileName, setMergedFileName] = useState('');
  const [mergedFileBuffer, setMergedFileBuffer] = useState<ArrayBuffer | null>(null);
  const [customRegex, setCustomRegex] = useState(REGEX_SPLIT_PRESETS[0].pattern);
  const [startOrderNumber, setStartOrderNumber] = useState(
    existingChapterCount > 0 ? existingChapterCount + 1 : 0
  );
  const [smartDigits, setSmartDigits] = useState(4);
  const [smartIncludePrologue, setSmartIncludePrologue] = useState(true);
  const [smartPrologueTitle, setSmartPrologueTitle] = useState('Lời mở đầu');
  const [smartRemoveTitleLine, setSmartRemoveTitleLine] = useState(false);
  const [smartIsDirtySource, setSmartIsDirtySource] = useState(true);
  const [previewSelectedIdx, setPreviewSelectedIdx] = useState<number | null>(null);

  // Tab 4: Paste Raw or URL
  const [pasteTitleRaw, setPasteTitleRaw] = useState('');
  const [pasteContentRaw, setPasteContentRaw] = useState('');
  const [pasteOrderPrefix, setPasteOrderPrefix] = useState(
    String(existingChapterCount + 1).padStart(4, '0')
  );
  const [chapterUrl, setChapterUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const splitPreview = useMemo(() => {
    if (!mergedRawText.trim()) {
      return {
        items: [] as {
          orderPrefix: string;
          chapterNumber: number;
          filename: string;
          titleRaw: string;
          rawContent: string;
          charCount: number;
          isPrologue?: boolean;
          warning?: string;
        }[],
        error: undefined as string | undefined,
      };
    }

    if (splitEngineMode === 'smart') {
      try {
        const smartItems = splitChaptersSmart(mergedRawText, {
          startNumber: startOrderNumber,
          digits: smartDigits,
          includePrologue: smartIncludePrologue,
          prologueTitle: smartPrologueTitle,
          removeTitleLine: smartRemoveTitleLine,
          isDirtySource: smartIsDirtySource,
        });
        return {
          items: smartItems.map((ch) => ({
            orderPrefix: ch.orderPrefix,
            chapterNumber: ch.chapterNumber,
            filename: ch.filename,
            titleRaw: ch.rawTitle,
            rawContent: ch.content,
            charCount: ch.charCount,
            isPrologue: ch.isPrologue,
            warning: ch.warning,
          })),
          error: undefined,
        };
      } catch (err) {
        return {
          items: [],
          error: (err as Error).message || 'Lỗi khi tách chương thông minh.',
        };
      }
    }

    const res = splitMergedTxtByRegex(mergedRawText, customRegex, startOrderNumber);
    return {
      items: res.items.map((item) => ({
        orderPrefix: item.orderPrefix,
        chapterNumber: item.chapterNumber,
        filename: safeFilename(`${item.orderPrefix}_${item.titleRaw}.txt`),
        titleRaw: item.titleRaw,
        rawContent: item.rawContent,
        charCount: item.charCount,
        isPrologue: false,
        warning: item.warning,
      })),
      error: res.error,
    };
  }, [
    mergedRawText,
    splitEngineMode,
    startOrderNumber,
    smartDigits,
    smartIncludePrologue,
    smartPrologueTitle,
    smartRemoveTitleLine,
    smartIsDirtySource,
    customRegex,
  ]);

  if (!isOpen) return null;

  const handleFolderOrFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setFolderWarnings([]);
    setStatusMessage(`Đang phân tích ${fileList.length} tệp đầu vào...`);
    try {
      const files = Array.from(fileList);
      const { chapters, warnings } = await parseFolderOrZipTxtFiles(
        files,
        novelId,
        existingChapterCount,
        inputEncoding
      );
      setFolderParsedChapters(chapters);
      setFolderWarnings(warnings);
      setStatusMessage(
        `Đã nhận diện thành công ${chapters.length.toLocaleString()} chương theo thứ tự prefix XXXX.`
      );
    } catch (err) {
      setErrorMessage((err as Error).message || 'Lỗi khi đọc thư mục / gói .ZIP');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleConfirmFolderImport = async () => {
    if (folderParsedChapters.length === 0) return;
    setIsProcessing(true);
    try {
      await onImportChapters(folderParsedChapters);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEpubSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Đang giải nén và phân tích cấu trúc EPUB "${file.name}"...`);
    try {
      const res = await parseEpubFile(file, novelId, existingChapterCount + 1);
      if (res.chapters.length === 0) {
        setErrorMessage('Không tìm thấy chương nội dung nào trong file EPUB.');
      } else {
        setEpubParsedChapters(res.chapters);
        setEpubMeta({ title: res.bookTitle, author: res.author });
        setStatusMessage(
          `Đã bóc tách ${res.chapters.length} chương từ sách "${
            res.bookTitle || file.name
          }".`
        );
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Lỗi khi đọc file EPUB.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEpubImport = async () => {
    if (epubParsedChapters.length === 0) return;
    setIsProcessing(true);
    try {
      await onImportChapters(epubParsedChapters, epubMeta);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergedTxtSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      setMergedFileBuffer(buffer);
      const text = decodeTextWithEncoding(buffer, inputEncoding);
      setMergedRawText(text);
      setMergedFileName(file.name);
      setPreviewSelectedIdx(0);
      setStatusMessage(
        `Đã tải file "${file.name}" (${text.length.toLocaleString()} ký tự). Hãy kiểm tra danh sách chương tách bên dưới.`
      );
    } catch (err) {
      setErrorMessage((err as Error).message || 'Không thể đọc file .txt');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleEncodingChangeForMergedTxt = (newEncoding: InputEncoding) => {
    setInputEncoding(newEncoding);
    if (mergedFileBuffer) {
      try {
        const redecoded = decodeTextWithEncoding(mergedFileBuffer, newEncoding);
        setMergedRawText(redecoded);
        setErrorMessage(null);
      } catch (err) {
        setErrorMessage((err as Error).message);
      }
    }
  };

  const handleLoadSampleMergedText = () => {
    const sample = getSmartSplitSampleText();
    setMergedFileBuffer(null);
    setMergedRawText(sample);
    setMergedFileName('truyen_mau.txt');
    setPreviewSelectedIdx(0);
    setErrorMessage(null);
    setStatusMessage('Đã nạp văn bản mẫu để kiểm tra bộ tách chương thông minh.');
  };

  const handleDownloadSplitZipNow = async () => {
    if (splitPreview.items.length === 0) return;
    setIsProcessing(true);
    try {
      const blob = await generateSplitChaptersZipBlob(
        splitPreview.items.map((item) => ({
          filename: item.filename,
          content: item.rawContent,
        })),
        'utf-8'
      );
      const baseBookName = safeFilename(
        mergedFileName.replace(/\.txt$/i, '') || 'truyen_da_tach'
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseBookName}_split.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(
        `Đã tải xuống gói "${baseBookName}_split.zip" (${splitPreview.items.length.toLocaleString()} chương)!`
      );
    } catch (err) {
      setErrorMessage((err as Error).message || 'Không thể đóng gói .ZIP.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmMergedTxtImport = async () => {
    if (splitPreview.items.length === 0) return;
    setIsProcessing(true);
    try {
      const chapters: Chapter[] = splitPreview.items.map((item, idx) => {
        const cleanedBody = cleanRawChapterBody(item.rawContent, item.titleRaw);
        return {
          id: `ch-${novelId}-${item.orderPrefix}-${Date.now()}-${idx}`,
          novelId,
          orderPrefix: item.orderPrefix,
          chapterNumber: item.chapterNumber,
          fileNameOriginal: item.filename,
          titleRaw: item.titleRaw,
          titleTranslated: '',
          rawContent: cleanedBody,
          translatedContent: '',
          charCount: cleanedBody.replace(/\s+/g, '').length,
          status: 'raw',
          updatedAt: Date.now(),
        };
      });
      await onImportChapters(chapters);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!chapterUrl.trim()) return;
    setIsFetchingUrl(true);
    setErrorMessage(null);
    try {
      const res = await safeFetchJson<{
        titleRaw?: string;
        rawContent?: string;
        error?: string;
      }>(
        '/api/fetch-url',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: chapterUrl.trim() }),
        },
        {
          scope: 'FETCH_URL',
          label: `Tải chương từ URL (${chapterUrl.trim().slice(0, 60)})`,
        }
      );
      if (!res.ok || !res.data || res.data.error) {
        throw new Error(
          res.data?.error || res.errorMessage || 'Không thể lấy chương từ URL'
        );
      }
      setPasteTitleRaw(res.data.titleRaw || '第1章');
      setPasteContentRaw(res.data.rawContent || '');
      setStatusMessage('Đã tải thành công nội dung chương từ URL.');
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleConfirmPasteImport = async () => {
    if (!pasteContentRaw.trim()) {
      setErrorMessage('Vui lòng dán nội dung chương tiếng Trung.');
      return;
    }
    setIsProcessing(true);
    try {
      const lines = pasteContentRaw.trim().split(/\r?\n/);
      const inferredTitle =
        pasteTitleRaw.trim() || lines[0]?.trim() || `第${existingChapterCount + 1}章`;
      const cleanedBody = cleanRawChapterBody(pasteContentRaw, inferredTitle);
      const prefix = pasteOrderPrefix.trim().padStart(4, '0');
      const num = parseInt(prefix, 10) || existingChapterCount + 1;

      const newChapter: Chapter = {
        id: `ch-${novelId}-${prefix}-${Date.now()}`,
        novelId,
        orderPrefix: prefix,
        chapterNumber: num,
        fileNameOriginal: `${prefix}_${inferredTitle}.txt`,
        titleRaw: inferredTitle,
        titleTranslated: '',
        rawContent: cleanedBody,
        translatedContent: '',
        charCount: cleanedBody.replace(/\s+/g, '').length,
        status: 'raw',
        updatedAt: Date.now(),
      };
      await onImportChapters([newChapter]);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#E4DFD7] bg-[#FAF8F5] text-[#1C1917] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4DFD7] bg-[#F2EFE9] px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1C1917]">
              Nhập &amp; Tách Chương Truyện Đa Nguồn
            </h2>
            <p className="text-xs text-[#6B635B]">
              Hỗ trợ Thư mục / Gói .ZIP chương .TXT (XXXX_Tên_chương.txt) · Sách .EPUB ·
              Trình Tách Chương Thông Minh (Nguồn bẩn / Nguồn sạch / Regex) · Dán trực tiếp / URL
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B635B] hover:bg-[#E4DFD7] hover:text-[#1C1917]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E4DFD7] bg-[#F2EFE9]/60 px-6 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('folder_txt');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'folder_txt'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#FAF8F5] rounded-t-lg'
                : 'border-transparent text-[#6B635B] hover:text-[#1C1917]'
            }`}
          >
            <FolderUp className="h-4 w-4" />
            1. Thư Mục / Gói .ZIP (.TXT)
          </button>
          <button
            onClick={() => {
              setActiveTab('epub');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'epub'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#FAF8F5] rounded-t-lg'
                : 'border-transparent text-[#6B635B] hover:text-[#1C1917]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            2. File .EPUB Nguyên Bộ
          </button>
          <button
            onClick={() => {
              setActiveTab('merged_txt');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'merged_txt'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#FAF8F5] rounded-t-lg'
                : 'border-transparent text-[#6B635B] hover:text-[#1C1917]'
            }`}
          >
            <Wand2 className="h-4 w-4" />
            3. Tách File .TXT Gộp (Thông Minh / Regex)
          </button>
          <button
            onClick={() => {
              setActiveTab('paste_url');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'paste_url'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#FAF8F5] rounded-t-lg'
                : 'border-transparent text-[#6B635B] hover:text-[#1C1917]'
            }`}
          >
            <Globe className="h-4 w-4" />
            4. Dán Raw / Lấy Từ URL
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && !errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
              <Check className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* TAB 1: FOLDER / MULTI TXT / ZIP */}
          {activeTab === 'folder_txt' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-[#C83E31]/40 bg-[#F2EFE9]/50 p-6 text-center">
                <FolderUp className="mx-auto h-10 w-10 text-[#C83E31]" />
                <h3 className="mt-2 text-sm font-semibold text-[#1C1917]">
                  Chọn Thư Mục, Nhiều File .TXT hoặc Gói .ZIP chứa chương (ví dụ: 0001_第1章 ....txt)
                </h3>
                <p className="mt-1 text-xs text-[#6B635B]">
                  Tự động nhận diện prefix số thứ tự (0000, 0001, 0002...), quét cả thư mục con trong .ZIP,
                  kiểm tra thiếu chương ở giữa / trùng số thứ tự và hỗ trợ đa bảng mã.
                </p>

                <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                  <span className="font-medium text-[#6B635B]">Bảng mã đọc file:</span>
                  <select
                    value={inputEncoding}
                    onChange={(e) => setInputEncoding(e.target.value as InputEncoding)}
                    className="rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1C1917]"
                  >
                    <option value="auto">Tự động (UTF-8 / GB18030 / UTF-16)</option>
                    <option value="utf-8">UTF-8</option>
                    <option value="gb18030">GB18030 / GBK (Tiếng Trung)</option>
                    <option value="utf-16le">UTF-16LE</option>
                    <option value="utf-16be">UTF-16BE</option>
                  </select>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    // @ts-expect-error webkitdirectory is standard for folder upload
                    webkitdirectory="true"
                    directory="true"
                    onChange={handleFolderOrFilesSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#C83E31] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#B03226]"
                  >
                    <FolderUp className="h-4 w-4" />
                    Chọn Nguyên Thư Mục (Folder)
                  </button>

                  <input
                    ref={zipFileInputRef}
                    type="file"
                    accept=".zip,application/zip"
                    multiple
                    onChange={handleFolderOrFilesSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => zipFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#C83E31] bg-white px-4 py-2.5 text-xs font-semibold text-[#C83E31] hover:bg-[#C83E31]/5"
                  >
                    <FileArchive className="h-4 w-4" />
                    Chọn File .ZIP Chứa Chương .TXT
                  </button>

                  <input
                    ref={multiFilesInputRef}
                    type="file"
                    accept=".txt,.zip"
                    multiple
                    onChange={handleFolderOrFilesSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => multiFilesInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#D5CFC4] bg-white px-4 py-2.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F2EFE9]"
                  >
                    <Upload className="h-4 w-4" />
                    Chọn Nhiều File .TXT Lẻ
                  </button>
                </div>
              </div>

              {folderWarnings.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  {folderWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {folderParsedChapters.length > 0 && (
                <div className="rounded-lg border border-[#E4DFD7] bg-white">
                  <div className="flex items-center justify-between border-b border-[#E4DFD7] bg-[#F2EFE9] px-4 py-2.5 text-xs font-semibold">
                    <span>
                      Xem trước danh sách chương ({folderParsedChapters.length.toLocaleString()}{' '}
                      chương)
                    </span>
                    <span className="font-mono-num text-[#6B635B]">
                      Prefix: {folderParsedChapters[0]?.orderPrefix} →{' '}
                      {folderParsedChapters[folderParsedChapters.length - 1]?.orderPrefix}
                    </span>
                  </div>
                  <div className="max-h-60 divide-y divide-[#E4DFD7] overflow-y-auto text-xs">
                    {folderParsedChapters.slice(0, 120).map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between px-4 py-2 hover:bg-[#FAF8F5]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono-num font-semibold text-[#C83E31]">
                            [{ch.orderPrefix}]
                          </span>
                          <span className="truncate font-medium text-[#1C1917]">
                            {ch.titleRaw}
                          </span>
                        </div>
                        <span className="font-mono-num text-[#6B635B] shrink-0 ml-3">
                          {ch.charCount.toLocaleString()} chữ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EPUB */}
          {activeTab === 'epub' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-[#C83E31]/40 bg-[#F2EFE9]/50 p-6 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-[#C83E31]" />
                <h3 className="mt-2 text-sm font-semibold text-[#1C1917]">
                  Tải lên sách điện tử .EPUB tiếng Trung
                </h3>
                <p className="mt-1 text-xs text-[#6B635B]">
                  Hệ thống tự động đọc mục lục OPF/NCX, trích xuất từng chương theo đúng
                  thứ tự và gán mã thứ tự XXXX đồng bộ.
                </p>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#C83E31] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#B03226]">
                  <Upload className="h-4 w-4" />
                  <span>Chọn File .EPUB</span>
                  <input
                    type="file"
                    accept=".epub"
                    onChange={handleEpubSelected}
                    className="hidden"
                  />
                </label>
              </div>

              {epubParsedChapters.length > 0 && (
                <div className="rounded-lg border border-[#E4DFD7] bg-white">
                  <div className="flex items-center justify-between border-b border-[#E4DFD7] bg-[#F2EFE9] px-4 py-2.5 text-xs font-semibold">
                    <span>
                      {epubMeta.title || 'Sách EPUB'} · {epubParsedChapters.length} chương
                    </span>
                    <span className="text-[#6B635B]">{epubMeta.author}</span>
                  </div>
                  <div className="max-h-60 divide-y divide-[#E4DFD7] overflow-y-auto text-xs">
                    {epubParsedChapters.slice(0, 100).map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between px-4 py-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono-num font-semibold text-[#C83E31]">
                            [{ch.orderPrefix}]
                          </span>
                          <span className="truncate font-medium">{ch.titleRaw}</span>
                        </div>
                        <span className="font-mono-num text-[#6B635B] shrink-0">
                          {ch.charCount.toLocaleString()} chữ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MERGED TXT WITH SMART SPLITTER OR CUSTOM REGEX */}
          {activeTab === 'merged_txt' && (
            <div className="space-y-4">
              {/* Top Upload Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4DFD7] bg-[#F2EFE9]/60 p-4">
                <div>
                  <h3 className="text-xs font-bold text-[#1C1917]">
                    Trình Tách Chương Truyện Từ 1 File .TXT Gộp (Thông Minh / Regex)
                  </h3>
                  <p className="text-xs text-[#6B635B]">
                    Tách 1 file .TXT lớn thành các chương đánh số thứ tự chuẩn — có thể nạp
                    thẳng vào kệ sách hoặc tải ngay gói <code className="font-mono">.ZIP</code> chương đã tách về máy.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={inputEncoding}
                    onChange={(e) =>
                      handleEncodingChangeForMergedTxt(e.target.value as InputEncoding)
                    }
                    className="rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-2 text-xs font-medium text-[#1C1917]"
                  >
                    <option value="auto">Mã hóa: Tự động</option>
                    <option value="utf-8">UTF-8</option>
                    <option value="gb18030">GB18030 / GBK</option>
                    <option value="utf-16le">UTF-16LE</option>
                    <option value="utf-16be">UTF-16BE</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleLoadSampleMergedText}
                    className="rounded-lg border border-[#D5CFC4] bg-white px-3 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#FAF8F5]"
                  >
                    Dùng văn bản mẫu
                  </button>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#C83E31] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B03226]">
                    <Upload className="h-4 w-4" />
                    <span>
                      {mergedFileName ? 'Đổi File .TXT Khác' : 'Chọn 1 File .TXT Gộp'}
                    </span>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleMergedTxtSelected}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Engine Mode Selector + Options */}
              <div className="rounded-lg border border-[#E4DFD7] bg-white p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DFD7] pb-3">
                  <div className="inline-flex rounded-lg border border-[#D5CFC4] bg-[#F2EFE9] p-1">
                    <button
                      type="button"
                      onClick={() => setSplitEngineMode('smart')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        splitEngineMode === 'smart'
                          ? 'bg-[#C83E31] text-white shadow-xs'
                          : 'text-[#6B635B] hover:text-[#1C1917]'
                      }`}
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Bộ Tách Thông Minh (Nguồn bẩn / Nguồn sạch)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitEngineMode('regex')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        splitEngineMode === 'regex'
                          ? 'bg-[#C83E31] text-white shadow-xs'
                          : 'text-[#6B635B] hover:text-[#1C1917]'
                      }`}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      Biểu Thức Regex Tùy Chỉnh
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#6B635B]">Số bắt đầu:</span>
                      <input
                        type="number"
                        min={0}
                        value={startOrderNumber}
                        onChange={(e) =>
                          setStartOrderNumber(
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          )
                        }
                        className="w-16 rounded border border-[#D5CFC4] px-2 py-1 font-mono-num text-xs"
                      />
                    </div>
                    {splitEngineMode === 'smart' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#6B635B]">Chữ số đệm:</span>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={smartDigits}
                          onChange={(e) =>
                            setSmartDigits(
                              Math.min(
                                8,
                                Math.max(1, parseInt(e.target.value, 10) || 4)
                              )
                            )
                          }
                          className="w-14 rounded border border-[#D5CFC4] px-2 py-1 font-mono-num text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {splitEngineMode === 'smart' ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex items-start gap-2.5 rounded-lg border border-[#E4DFD7] bg-[#FAF8F5] p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smartIsDirtySource}
                        onChange={(e) => setSmartIsDirtySource(e.target.checked)}
                        className="mt-0.5 rounded border-[#D5CFC4] text-[#C83E31]"
                      />
                      <div>
                        <div className="text-xs font-semibold text-[#1C1917]">
                          Chế độ Nguồn bẩn (Lọc câu văn có chữ &quot;第...章&quot; &amp; dòng rác)
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#6B635B]">
                          Tránh tách nhầm khi trong đoạn văn kể chuyện nhắc tới &quot;第1章...&quot;,
                          đồng thời tự động xóa các dòng phân cách <code className="font-mono">===</code>,{' '}
                          <code className="font-mono">---</code>, <code className="font-mono">oOo</code>.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-lg border border-[#E4DFD7] bg-[#FAF8F5] p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smartRemoveTitleLine}
                        onChange={(e) => setSmartRemoveTitleLine(e.target.checked)}
                        className="mt-0.5 rounded border-[#D5CFC4] text-[#C83E31]"
                      />
                      <div>
                        <div className="text-xs font-semibold text-[#1C1917]">
                          Xóa dòng tiêu đề chương khỏi nội dung file xuất
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#6B635B]">
                          Giữ tên chương ở tên file, chỉ lưu phần thân văn bản bên trong.
                        </div>
                      </div>
                    </label>

                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E4DFD7] bg-[#FAF8F5] p-3 sm:col-span-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smartIncludePrologue}
                          onChange={(e) => setSmartIncludePrologue(e.target.checked)}
                          className="rounded border-[#D5CFC4] text-[#C83E31]"
                        />
                        <div>
                          <div className="text-xs font-semibold text-[#1C1917]">
                            Tách riêng phần Lời mở đầu / Văn án (trước Chương 1)
                          </div>
                          <div className="text-[11px] text-[#6B635B]">
                            Nếu tắt, đoạn văn án đầu file sẽ được gộp vào Chương 1.
                          </div>
                        </div>
                      </label>

                      {smartIncludePrologue && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6B635B] whitespace-nowrap">
                            Tên mở đầu:
                          </span>
                          <input
                            type="text"
                            value={smartPrologueTitle}
                            onChange={(e) => setSmartPrologueTitle(e.target.value)}
                            placeholder="Lời mở đầu"
                            className="w-36 rounded border border-[#D5CFC4] bg-white px-2.5 py-1 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={customRegex}
                      onChange={(e) => setCustomRegex(e.target.value)}
                      placeholder="Nhập biểu thức Regex..."
                      className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 font-mono-num text-xs text-[#1C1917] focus:border-[#C83E31] focus:outline-none"
                    />

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-[#6B635B]">
                        Chọn nhanh mẫu Regex trị raw lỗi:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {REGEX_SPLIT_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setCustomRegex(preset.pattern)}
                            className={`text-left rounded-lg border p-2.5 transition-colors ${
                              customRegex === preset.pattern
                                ? 'border-[#C83E31] bg-[#C83E31]/5'
                                : 'border-[#E4DFD7] hover:bg-[#FAF8F5]'
                            }`}
                          >
                            <div className="text-xs font-semibold text-[#1C1917]">
                              {preset.label}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[#6B635B]">
                              {preset.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Split Preview + Chapter Inspector */}
              {mergedRawText && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="rounded-lg border border-[#E4DFD7] bg-white lg:col-span-7">
                    <div className="flex items-center justify-between border-b border-[#E4DFD7] bg-[#F2EFE9] px-4 py-2.5 text-xs font-semibold">
                      <span>
                        Kết quả tách chương:{' '}
                        <strong className="text-[#C83E31]">
                          {splitPreview.items.length.toLocaleString()} chương
                        </strong>
                      </span>
                      <span className="text-[#6B635B]">
                        Cảnh báo độ dài:{' '}
                        {splitPreview.items.filter((i) => i.warning).length} chương
                      </span>
                    </div>
                    {splitPreview.error ? (
                      <div className="p-4 text-xs text-red-600">{splitPreview.error}</div>
                    ) : (
                      <div className="max-h-64 divide-y divide-[#E4DFD7] overflow-y-auto text-xs">
                        {splitPreview.items.slice(0, 200).map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewSelectedIdx(idx)}
                            className={`flex cursor-pointer items-center justify-between px-4 py-2 transition-colors ${
                              previewSelectedIdx === idx
                                ? 'bg-[#C83E31]/10'
                                : 'hover:bg-[#FAF8F5]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono-num font-semibold text-[#C83E31]">
                                  [{item.orderPrefix}]
                                </span>
                                {item.isPrologue && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                    Mở đầu
                                  </span>
                                )}
                                <span className="truncate font-medium">
                                  {item.titleRaw}
                                </span>
                              </div>
                              {item.warning && (
                                <div className="mt-0.5 text-[11px] text-amber-700">
                                  ⚠ {item.warning}
                                </div>
                              )}
                            </div>
                            <span className="font-mono-num text-[#6B635B] ml-3 shrink-0">
                              {item.charCount.toLocaleString()} chữ
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Chapter Content Viewer */}
                  <div className="flex flex-col rounded-lg border border-[#E4DFD7] bg-white lg:col-span-5">
                    <div className="flex items-center justify-between border-b border-[#E4DFD7] bg-[#F2EFE9] px-3.5 py-2.5 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 truncate">
                        <Eye className="h-3.5 w-3.5 text-[#C83E31]" />
                        {previewSelectedIdx !== null &&
                        splitPreview.items[previewSelectedIdx]
                          ? splitPreview.items[previewSelectedIdx].filename
                          : 'Xem trước nội dung chương'}
                      </span>
                    </div>
                    <div className="max-h-64 flex-1 overflow-y-auto p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#1C1917]">
                      {previewSelectedIdx !== null &&
                      splitPreview.items[previewSelectedIdx]
                        ? splitPreview.items[previewSelectedIdx].rawContent.slice(0, 3000)
                        : 'Bấm vào một chương bên trái để kiểm tra nội dung sau khi tách.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PASTE RAW OR FETCH URL */}
          {activeTab === 'paste_url' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#E4DFD7] bg-white p-4 space-y-3">
                <label className="block text-xs font-semibold text-[#1C1917]">
                  Lấy tự động từ URL trang truyện tiếng Trung (Tùy chọn):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={chapterUrl}
                    onChange={(e) => setChapterUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 text-xs focus:border-[#C83E31] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={isFetchingUrl || !chapterUrl.trim()}
                    onClick={handleFetchFromUrl}
                    className="rounded-lg bg-[#1C1917] px-4 py-2 text-xs font-semibold text-white hover:bg-[#332E2A] disabled:opacity-50"
                  >
                    {isFetchingUrl ? 'Đang tải...' : 'Lấy Nội Dung'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Mã thứ tự (Prefix XXXX)
                  </label>
                  <input
                    type="text"
                    value={pasteOrderPrefix}
                    onChange={(e) => setPasteOrderPrefix(e.target.value)}
                    placeholder="0006"
                    className="w-full rounded-lg border border-[#D5CFC4] bg-white px-3 py-2 font-mono-num text-xs"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Tiêu đề chương tiếng Trung (Để trống sẽ tự lấy dòng đầu tiên)
                  </label>
                  <input
                    type="text"
                    value={pasteTitleRaw}
                    onChange={(e) => setPasteTitleRaw(e.target.value)}
                    placeholder="Ví dụ: 第6章 信任非错"
                    className="w-full rounded-lg border border-[#D5CFC4] bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Nội dung chương tiếng Trung (Raw):
                </label>
                <textarea
                  rows={9}
                  value={pasteContentRaw}
                  onChange={(e) => setPasteContentRaw(e.target.value)}
                  placeholder="Dán toàn bộ văn bản chữ Hán của chương vào đây..."
                  className="w-full rounded-lg border border-[#D5CFC4] bg-white p-3 text-sm leading-relaxed focus:border-[#C83E31] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4DFD7] bg-[#F2EFE9] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D5CFC4] bg-white px-4 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#FAF8F5]"
          >
            Đóng
          </button>

          {activeTab === 'folder_txt' && (
            <button
              type="button"
              disabled={isProcessing || folderParsedChapters.length === 0}
              onClick={handleConfirmFolderImport}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C83E31] px-5 py-2 text-xs font-semibold text-white hover:bg-[#B03226] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                Nạp {folderParsedChapters.length.toLocaleString()} Chương Vào Truyện
              </span>
            </button>
          )}

          {activeTab === 'epub' && (
            <button
              type="button"
              disabled={isProcessing || epubParsedChapters.length === 0}
              onClick={handleConfirmEpubImport}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C83E31] px-5 py-2 text-xs font-semibold text-white hover:bg-[#B03226] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                Nạp {epubParsedChapters.length.toLocaleString()} Chương EPUB
              </span>
            </button>
          )}

          {activeTab === 'merged_txt' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isProcessing || splitPreview.items.length === 0}
                onClick={handleDownloadSplitZipNow}
                className="inline-flex items-center gap-2 rounded-lg border border-[#C83E31] bg-white px-4 py-2 text-xs font-semibold text-[#C83E31] hover:bg-[#C83E31]/5 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>
                  Tải Ngay .ZIP ({splitPreview.items.length.toLocaleString()} chương)
                </span>
              </button>
              <button
                type="button"
                disabled={isProcessing || splitPreview.items.length === 0}
                onClick={handleConfirmMergedTxtImport}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C83E31] px-5 py-2 text-xs font-semibold text-white hover:bg-[#B03226] disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  Xác Nhận Tách &amp; Nạp {splitPreview.items.length.toLocaleString()} Chương Vào Kệ
                </span>
              </button>
            </div>
          )}

          {activeTab === 'paste_url' && (
            <button
              type="button"
              disabled={isProcessing || !pasteContentRaw.trim()}
              onClick={handleConfirmPasteImport}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C83E31] px-5 py-2 text-xs font-semibold text-white hover:bg-[#B03226] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>Thêm Chương Mới</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
