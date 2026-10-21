import { useId, useRef, useState } from 'react';

import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextField } from '@/shared/ui/form/Field';

import { type AdminBook, adminBooksApi, BOOK_LIMITS } from '../api';
import { useBookMutation } from '../queries';

import local from './BookImages.module.css';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Up to 8 images; the cover shows in listings (API §10 /books/{id}/images). */
export function BookImages({ book }: { book: AdminBook }) {
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const images = [...book.images].sort((a, b) => a.displayOrder - b.displayOrder);
  const full = images.length >= BOOK_LIMITS.maxImages;

  const upload = useBookMutation(
    book.id,
    async ({ f, alt }: { f: File; alt: string }) => {
      await adminBooksApi.uploadImage(book.id, f, alt);
      return undefined;
    },
    'رُفعت الصورة.',
  );
  const remove = useBookMutation(
    book.id,
    (imageId: number) => adminBooksApi.deleteImage(book.id, imageId),
    'حُذفت الصورة.',
  );
  const cover = useBookMutation(
    book.id,
    (imageId: number) => adminBooksApi.setCover(book.id, imageId),
    'تغيّر الغلاف.',
  );
  const reorder = useBookMutation(
    book.id,
    (ids: number[]) => adminBooksApi.reorderImages(book.id, ids),
    null,
  );
  const busy = upload.isPending || remove.isPending || cover.isPending || reorder.isPending;

  const move = (index: number, by: -1 | 1) => {
    const ids = images.map((image) => image.id);
    const target = index + by;
    const a = ids[index];
    const b = ids[target];
    if (a === undefined || b === undefined) return;
    ids[index] = b;
    ids[target] = a;
    reorder.mutate(ids);
  };

  return (
    <div className={local.wrap}>
      {images.length === 0 ? (
        <p className={local.empty}>لا صور بعد. أول صورة ترفعها تصبح الغلاف.</p>
      ) : (
        <ol className={local.grid}>
          {images.map((image, index) => (
            <li key={image.id} className={local.item}>
              <div className={local.frame}>
                <img src={image.url} alt={image.altText ?? ''} loading="lazy" />
                {image.isCover && <span className={local.coverTag}>الغلاف</span>}
              </div>
              <p className={local.alt}>
                {image.altText === null || image.altText === '' ? 'بلا وصف' : image.altText}
              </p>
              <div className={local.tools}>
                <button
                  type="button"
                  className={local.tool}
                  aria-label="تقديم الصورة"
                  disabled={busy || index === 0}
                  onClick={() => {
                    move(index, -1);
                  }}
                >
                  →
                </button>
                <button
                  type="button"
                  className={local.tool}
                  aria-label="تأخير الصورة"
                  disabled={busy || index === images.length - 1}
                  onClick={() => {
                    move(index, 1);
                  }}
                >
                  ←
                </button>
                {!image.isCover && (
                  <button
                    type="button"
                    className={local.textTool}
                    disabled={busy}
                    onClick={() => {
                      cover.mutate(image.id);
                    }}
                  >
                    اجعلها الغلاف
                  </button>
                )}
                <button
                  type="button"
                  className={local.textTool}
                  disabled={busy}
                  onClick={() => {
                    remove.mutate(image.id);
                  }}
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form
        className={local.upload}
        onSubmit={(event) => {
          event.preventDefault();
          setProblem(null);
          if (!file) return;
          upload.mutate(
            { f: file, alt: altText.trim() || book.title },
            {
              onSuccess: () => {
                setFile(null);
                setAltText('');
                if (fileRef.current) fileRef.current.value = '';
              },
            },
          );
        }}
      >
        <p className={local.uploadTitle}>
          رفع صورة ({formatCount(images.length)} / {formatCount(BOOK_LIMITS.maxImages)})
        </p>
        {problem && <FormAlert>{problem}</FormAlert>}
        <label htmlFor={fileId} className={local.fileLabel}>
          الملف: JPEG أو PNG أو WebP، حتى ٥ ميغابايت
        </label>
        <input
          ref={fileRef}
          id={fileId}
          className={local.file}
          type="file"
          accept={TYPES.join(',')}
          disabled={full || busy}
          onChange={(event) => {
            const chosen = event.target.files?.[0] ?? null;
            setProblem(null);
            if (chosen && !TYPES.includes(chosen.type)) {
              setProblem('الصيغة غير مدعومة. استخدم JPEG أو PNG أو WebP.');
              setFile(null);
              return;
            }
            if (chosen && chosen.size > BOOK_LIMITS.maxImageBytes) {
              setProblem('الصورة أكبر من ٥ ميغابايت.');
              setFile(null);
              return;
            }
            setFile(chosen);
          }}
        />
        <TextField
          label="وصف الصورة لقارئات الشاشة"
          hint="مثل «غلاف زاد المعاد، الطبعة الكاملة». يُستخدم العنوان إن تركته فارغاً."
          maxLength={300}
          value={altText}
          disabled={full}
          onChange={(event) => {
            setAltText(event.target.value);
          }}
        />
        <Button type="submit" variant="ink" size="sm" disabled={!file || busy || full}>
          {upload.isPending ? 'جارٍ الرفع…' : 'رفع الصورة'}
        </Button>
        {full && <p className={local.empty}>وصلت إلى الحد الأقصى: ٨ صور. احذف صورة لرفع أخرى.</p>}
      </form>
    </div>
  );
}