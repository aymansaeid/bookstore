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
  return (
    <>
      <AccountHeader title="محادثاتي مع أفندي" />
      <div className={shared.empty}>
        <EffendiAvatar size={64} />
        <p>ستُحفظ محادثاتك مع أفندي هنا، لتعود إليها وتكمل من حيث توقفت.</p>
        <p className={shared.muted}>المساعد الذكي قيد الإعداد، وسيصلك إشعار عند إطلاقه.</p>
        <ButtonLink to={paths.askEfendi} variant="ink" size="sm">
          تعرّف على أفندي
        </ButtonLink>
      </div>
    </>
  );
}
