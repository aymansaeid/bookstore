import { useState } from 'react';

import { authApi } from '@/features/auth/api';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { useCooldown } from '@/shared/lib/useCooldown';
import { buttonClass } from '@/shared/ui/Button/buttonClass';

import styles from './auth.module.css';

const COOLDOWN_SECONDS = 60;

/**
 * POST /resend-verification. Always 204; earlier links stop working and
 * repeats within 60 s send nothing (API §7), so the button cools down too.
 */
export function ResendVerification({ email, sentAt = 0 }: { email: string; sentAt?: number }) {
  const cooldown = useCooldown(COOLDOWN_SECONDS, sentAt);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setMessage(null);
    try {
      await authApi.resendVerification(email);
      setMessage('أرسلنا رابط تفعيل جديداً. تحقّق من صندوق الوارد ومجلد الرسائل غير المرغوب فيها.');
      cooldown.start();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.resend}>
      <button
        type="button"
        className={buttonClass('ghost', 'sm')}
        disabled={sending || cooldown.remaining > 0}
        onClick={() => {
          void send();
        }}
      >
        {cooldown.remaining > 0
          ? `أعد الإرسال بعد ${formatCount(cooldown.remaining)} ثانية`
          : 'أعد إرسال رابط التفعيل'}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
