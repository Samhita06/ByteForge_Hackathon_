import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Monitor, Moon, Palette, Sun, UserRound } from 'lucide-react';
import { api } from '../services/apiClient.js';
import { Card } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select, Textarea } from '../components/ui/input.jsx';
import { Skeleton } from '../components/feedback/skeleton.jsx';
import { ErrorState } from '../components/feedback/empty-state.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { useTheme } from '../app/theme-context.js';

const themeOptions = [
  { value: 'light', label: 'Light', description: 'A crisp, bright workspace.', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'A calm, low-glare workspace.', icon: Moon },
  { value: 'system', label: 'System', description: 'Follow your device preference.', icon: Monitor },
];

export function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { preference, resolvedTheme, setThemePreference } = useTheme();
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api.get('/api/profile') });
  const form = useForm({
    defaultValues: {
      display_name: '',
      username: '',
      bio: '',
      niche: '',
      primary_platform: 'instagram',
      reporting_currency: 'INR',
    },
  });

  useEffect(() => {
    if (profile.data?.data) {
      const row = profile.data.data;
      form.reset({
        display_name: row.display_name || '',
        username: row.username || '',
        bio: row.bio || '',
        niche: row.niche || '',
        primary_platform: row.primary_platform || 'instagram',
        reporting_currency: row.reporting_currency || 'INR',
      });
    }
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (body) => api.patch('/api/profile', { ...body, username: body.username || null }),
    onSuccess: () => toast.push('Profile saved', 'success'),
    onError: (err) => toast.push(err.message, 'error'),
  });

  if (profile.isLoading) return <SettingsSkeleton />;
  if (profile.isError) return <ErrorState message={profile.error.message} onRetry={profile.refetch} />;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section>
        <p className="text-sm font-medium text-slate-500">Your account and preferences</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Settings</h2>
        <p className="mt-2 text-sm text-slate-500">Manage creator profile details and how ByteForge looks.</p>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="p-4 sm:p-6">
          <div className="mb-6 flex items-start gap-3 border-b border-line pb-5">
            <span className="rounded-xl bg-accent/10 p-2.5 text-accent">
              <UserRound size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-ink">Creator profile</h3>
              <p className="mt-1 truncate text-xs text-slate-500">Signed in as {user?.email}</p>
            </div>
          </div>

          <form
            className="space-y-5"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Display name"
                htmlFor="display_name"
                error={form.formState.errors.display_name?.message}
              >
                <Input
                  id="display_name"
                  placeholder="Your creator name"
                  {...form.register('display_name', { required: 'Display name is required' })}
                />
              </Field>
              <Field label="Username" htmlFor="username">
                <Input id="username" placeholder="Optional handle" {...form.register('username')} />
              </Field>
              <Field label="Niche" htmlFor="niche">
                <Input id="niche" placeholder="e.g. Food, beauty, gaming" {...form.register('niche')} />
              </Field>
              <Field label="Primary platform" htmlFor="primary_platform">
                <Select id="primary_platform" {...form.register('primary_platform')}>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Reporting currency" htmlFor="reporting_currency">
                <Input
                  id="reporting_currency"
                  maxLength={3}
                  placeholder="INR"
                  {...form.register('reporting_currency')}
                />
              </Field>
            </div>

            <Field label="Bio" htmlFor="bio">
              <Textarea
                id="bio"
                rows={4}
                placeholder="A short introduction about your work."
                {...form.register('bio')}
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-xs text-slate-500">Profile changes are saved to your account.</p>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="rounded-xl bg-accent-2/10 p-2.5 text-accent-2">
              <Palette size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">Appearance</h3>
              <p className="mt-1 text-xs text-slate-500">Choose how ByteForge is displayed on this device.</p>
            </div>
          </div>

          <div className="space-y-2" role="group" aria-label="Theme preference">
            {themeOptions.map(({ value, label, description, icon: Icon }) => {
              const selected = preference === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setThemePreference(value)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selected
                      ? 'border-accent/50 bg-accent/5'
                      : 'border-line bg-card hover:bg-panel'
                  }`}
                >
                  <span className={`rounded-lg p-2 ${selected ? 'bg-accent/10 text-accent' : 'bg-panel text-slate-500'}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
                  </span>
                  {selected ? <Check size={17} className="shrink-0 text-accent" /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl bg-panel px-3.5 py-3 text-xs text-slate-500">
            {preference === 'system'
              ? `System preference is currently ${resolvedTheme}.`
              : `${labelizeTheme(preference)} theme is selected.`}
            <span className="mt-1 block">Your preference is stored in this browser.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading settings" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Skeleton className="h-[34rem]" />
        <Skeleton className="h-[26rem]" />
      </div>
    </div>
  );
}

function labelizeTheme(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
