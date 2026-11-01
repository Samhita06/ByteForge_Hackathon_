import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, ExternalLink, RefreshCw, Users, Video } from 'lucide-react';
import { api } from '../services/apiClient.js';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { ConfirmDialog } from '../components/feedback/confirm-dialog.jsx';
import { ErrorState, EmptyState } from '../components/feedback/empty-state.jsx';
import { Skeleton } from '../components/feedback/skeleton.jsx';
import { Badge, Card } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';

const connectionKey = (userId) => ['youtube-connection', userId];
const statisticsKey = (userId) => ['youtube-statistics', userId];

export function YouTubeInsightsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const connectionQuery = useQuery({
    queryKey: connectionKey(user?.id),
    queryFn: () => api.get('/api/integrations/youtube'),
    enabled: Boolean(user?.id),
  });
  const connection = connectionQuery.data?.data;
  const connected = connection?.connected === true;
  const statisticsQuery = useQuery({
    queryKey: statisticsKey(user?.id),
    queryFn: () => api.get('/api/integrations/youtube/stats'),
    enabled: Boolean(user?.id) && connected,
  });

  const connect = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/integrations/youtube/connect', {});
      const authorizationUrl = response?.data?.authorizationUrl;
      let destination;
      try {
        destination = new URL(authorizationUrl);
      } catch {
        throw new Error('The YouTube authorization link could not be created. Please try again.');
      }
      if (
        destination.protocol !== 'https:' ||
        destination.origin !== 'https://accounts.google.com' ||
        destination.pathname !== '/o/oauth2/v2/auth'
      ) {
        throw new Error('The YouTube authorization link was not valid. Please try again.');
      }
      return destination.toString();
    },
    onSuccess: (authorizationUrl) => window.location.assign(authorizationUrl),
    onError: (error) => toast.push(safeConnectError(error), 'error'),
  });

  const disconnect = useMutation({
    mutationFn: () => api.delete('/api/integrations/youtube'),
    onSuccess: async (response) => {
      const result = response?.data;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: connectionKey(user?.id) }),
        queryClient.invalidateQueries({ queryKey: statisticsKey(user?.id) }),
      ]);
      setConfirmDisconnect(false);

      if (result?.localDisconnected === false) {
        toast.push(
          `A newer YouTube connection was kept. ${revocationMessage(result?.providerRevocation)}`,
          'error',
        );
        return;
      }

      toast.push(
        result?.localDisconnected
          ? `Disconnected from ByteForge. ${revocationMessage(result?.providerRevocation)}`
          : 'The disconnect result could not be confirmed. Refresh the connection status.',
        result?.localDisconnected ? 'success' : 'error',
      );
    },
    onError: (error) => {
      toast.push(safeApiError(error), 'error');
    },
  });

  async function refreshInsights() {
    await connectionQuery.refetch();
    if (connected) await statisticsQuery.refetch();
  }

  if (connectionQuery.isLoading) return <YouTubeSkeleton />;
  if (connectionQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <ErrorState
          message={safeApiError(connectionQuery.error)}
          onRetry={connectionQuery.refetch}
        />
      </div>
    );
  }

  const channel = statisticsQuery.data?.data?.channel || connection?.channel;
  const statistics = statisticsQuery.data?.data?.statistics;
  const statsError = statisticsQuery.isError ? statisticsQuery.error : null;

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeading />

      {!connected ? (
        <EmptyState
          title="Connect your YouTube channel"
          description="View read-only channel insights in ByteForge. You can disconnect at any time."
          action={
            <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
              <Video size={17} />
              {connect.isPending ? 'Preparing secure connection…' : 'Connect YouTube'}
              {!connect.isPending ? <ExternalLink size={15} /> : null}
            </Button>
          }
        />
      ) : (
        <>
          <Card className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-6">
            <ChannelAvatar channel={channel} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-ink">
                  {channel?.title || 'Connected YouTube channel'}
                </h3>
                <Badge tone="green">Connected</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Read-only statistics from the channel authorized for your account.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={refreshInsights}
                disabled={connectionQuery.isFetching || statisticsQuery.isFetching}
              >
                <RefreshCw size={15} className={statisticsQuery.isFetching ? 'animate-spin' : ''} />
                Refresh
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
              </Button>
            </div>
          </Card>

          {statisticsQuery.isLoading ? (
            <StatisticsSkeleton />
          ) : statsError ? (
            <StatisticsError
              error={statsError}
              onRetry={statisticsQuery.refetch}
              onReconnect={() => connect.mutate()}
              reconnecting={connect.isPending}
            />
          ) : statisticsQuery.data?.data ? (
            <section aria-label="YouTube channel statistics">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  label="Subscribers"
                  value={
                    statistics?.hiddenSubscriberCount
                      ? 'Hidden by channel owner'
                      : formatCount(statistics?.subscriberCount)
                  }
                  icon={Users}
                  note={statistics?.hiddenSubscriberCount ? 'This metric is hidden on YouTube.' : null}
                />
                <MetricCard label="Videos" value={formatCount(statistics?.videoCount)} icon={Video} />
                <MetricCard label="Channel views" value={formatCount(statistics?.viewCount)} icon={Eye} />
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Statistics are provided by YouTube and may not update instantly.
              </p>
            </section>
          ) : (
            <ErrorState
              message="Channel statistics were not included in the response. Refresh to try again."
              onRetry={statisticsQuery.refetch}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect YouTube?"
        description="ByteForge will remove its saved YouTube connection and attempt to revoke Google access. If Google cannot confirm revocation, the result will be reported separately."
        confirmLabel="Disconnect"
        loading={disconnect.isPending}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={() => disconnect.mutate()}
      />
    </div>
  );
}

function PageHeading() {
  return (
    <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-medium text-slate-500">Read-only channel analytics</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">YouTube Insights</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Connect securely to see channel-level subscriber, video, and view counts. ByteForge never publishes
          videos or asks for channel credentials.
        </p>
      </div>
    </section>
  );
}

function ChannelAvatar({ channel }) {
  const thumbnailUrl = channel?.thumbnailUrl;
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent/10 text-accent">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <Video size={25} />
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, note }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-ink">{value}</p>
          {note ? <p className="mt-2 text-xs text-slate-500">{note}</p> : null}
        </div>
        <span className="rounded-xl bg-accent/10 p-2.5 text-accent">
          <Icon size={18} />
        </span>
      </div>
    </Card>
  );
}

function StatisticsError({ error, onRetry, onReconnect, reconnecting }) {
  if (error?.code === 'YOUTUBE_REAUTH_REQUIRED') {
    return (
      <StatusPanel
        title="YouTube authorization expired or was revoked"
        description="Reconnect your channel to grant read-only access again. Your ByteForge account remains available."
        action={
          <Button onClick={onReconnect} disabled={reconnecting}>
            <Video size={16} />
            {reconnecting ? 'Preparing…' : 'Reconnect YouTube'}
          </Button>
        }
      />
    );
  }
  if (error?.code === 'YOUTUBE_QUOTA_EXCEEDED') {
    return (
      <StatusPanel
        title="YouTube API quota reached"
        description="Your connection is still saved. Try refreshing later; other ByteForge features remain available."
        action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}
      />
    );
  }
  if (error?.code === 'YOUTUBE_CHANNEL_NOT_FOUND') {
    return (
      <StatusPanel
        title="No channel is available"
        description="The authorized Google account did not return a YouTube channel. Check the account and reconnect if needed."
        action={<Button variant="secondary" onClick={onReconnect}>Reconnect</Button>}
      />
    );
  }
  if (error?.code === 'YOUTUBE_NOT_CONNECTED') {
    return (
      <StatusPanel
        title="Connection needs to be refreshed"
        description="The saved channel credentials are no longer available. Reload the connection status or connect again."
        action={
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw size={15} /> Refresh
          </Button>
        }
      />
    );
  }
  return (
    <StatusPanel
      title="YouTube insights are temporarily unavailable"
      description="ByteForge is still available. Check your connection and try again later."
      action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}
    />
  );
}

function StatusPanel({ title, description, action }) {
  return (
    <Card
      role="status"
      className="border-[color:var(--warning)]/30 bg-[color-mix(in_srgb,var(--warning)_8%,var(--surface-card))] p-5 sm:p-6"
    >
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

function YouTubeSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading YouTube connection" aria-busy="true">
      <Skeleton className="h-28" />
      <Skeleton className="h-24" />
      <StatisticsSkeleton />
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading channel statistics" aria-busy="true">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}

function formatCount(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  const count = Number(value);
  return Number.isFinite(count) ? new Intl.NumberFormat().format(count) : 'Unavailable';
}

function revocationMessage(result) {
  const messages = {
    revoked: 'Google confirmed access revocation.',
    already_invalid: 'Google reported that the token was already invalid.',
    failed: 'Google could not confirm revocation. Review connected apps in your Google Account.',
    unknown: 'Google revocation could not be confirmed due to a network timeout. Review connected apps in your Google Account.',
    not_attempted: 'Google revocation was not attempted. Review connected apps in your Google Account.',
  };
  return messages[result] || 'Google revocation status was not confirmed.';
}

function safeConnectError(error) {
  if (error?.code === 'SERVICE_UNAVAILABLE') {
    return 'YouTube connection is not configured right now. Other ByteForge features are unaffected.';
  }
  return error?.message?.startsWith('The YouTube authorization link')
    ? error.message
    : 'Could not start YouTube authorization. Please try again.';
}

function safeApiError(error) {
  if (error?.code === 'SERVICE_UNAVAILABLE') {
    return 'YouTube integration is not configured or temporarily unavailable.';
  }
  if (error?.status === 401) return 'Your session needs to be refreshed. Sign in again to continue.';
  return 'Could not load YouTube connection status. ByteForge remains available; try again shortly.';
}
