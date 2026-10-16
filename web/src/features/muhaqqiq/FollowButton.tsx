import { useLocation, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { Button } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';

import { useFollowedIds, useToggleFollow } from './follows';

/** «تابع المحقّق» (spec 5.9 «تنبيهات المحققين»). Guests go to login and come back. */
export function FollowButton({ muhaqqiqId }: { muhaqqiqId: number }) {
  const { status } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const following = useFollowedIds().has(muhaqqiqId);
  const toggle = useToggleFollow();

  return (
    <Button
      variant={following ? 'glass' : 'gold'}
      size="sm"
      aria-pressed={status === 'authenticated' ? following : undefined}
      disabled={toggle.isPending}
      onClick={() => {
        if (status !== 'authenticated') {
          void navigate(paths.loginWithReturn(location.pathname));
          return;
        }
        toggle.mutate({ id: muhaqqiqId, following });
      }}
    >
      <Icon name={following ? 'check' : 'bell'} size={18} />
      {following ? 'تتابعه' : 'تابع المحقّق'}
    </Button>
  );
}
