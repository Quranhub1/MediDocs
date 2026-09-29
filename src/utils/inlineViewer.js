import { getDocument } from 'pdfjs-dist/legacy/build/pdf';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

export const fetchFileAsArrayBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch document: ${response.status}`);
  return await response.arrayBuffer();
};

export const renderPdf = async (source) => {
  const loadingTask = getDocument(source);
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    pages.push(canvas.toDataURL('image/png'));
  }
  return { pageCount, pages };
};

export const renderDocx = async (source) => {
  const arrayBuffer = source instanceof File || source instanceof Blob
    ? await readFileAsArrayBuffer(source)
    : source;
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return { html: result.value };
};

export const renderXlsx = async (source) => {
  const arrayBuffer = source instanceof File || source instanceof Blob
    ? await readFileAsArrayBuffer(source)
    : source;
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const html = XLSX.utils.sheet_to_html(worksheet);
  return { html, sheetName: firstSheetName };
};
