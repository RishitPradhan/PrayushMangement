import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NotificationsClient } from '@/components/notifications/NotificationsClient'

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  return (
    <div className="py-6 animate-fade-in">
      <NotificationsClient initialNotifications={notifications ?? []} />
    </div>
  )
}
