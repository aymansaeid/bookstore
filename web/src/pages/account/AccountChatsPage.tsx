import { useTranslation } from 'react-i18next';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { ButtonLink } from '@/shared/ui/Button/Button';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';

/**
 * «محادثاتي مع أفندي» (spec 5.9). The chat backend doesn't exist yet
 * (API guide §13), so this says so honestly instead of showing sample chats.
 */
export default function AccountChatsPage() {
  const { t } = useTranslation('account', { keyPrefix: 'chats' });
  return (
    <>
      <AccountHeader title={t('title')} />
      <div className={shared.empty}>
        <EffendiAvatar size={64} />
        <p>{t('text')}</p>
        <p className={shared.muted}>{t('soon')}</p>
        <ButtonLink to={paths.askEfendi} variant="ink" size="sm">
          {t('meet')}
        </ButtonLink>
      </div>
    </>
  );
}