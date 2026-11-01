import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient.js';
import { Card } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select, Textarea } from '../components/ui/input.jsx';
import { PageSkeleton } from '../components/feedback/skeleton.jsx';
import { ErrorState } from '../components/feedback/empty-state.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';

export function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
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

  if (profile.isLoading) return <PageSkeleton />;
  if (profile.isError) return <ErrorState message={profile.error.message} onRetry={profile.refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Settings</h1>
        <p className="text-sm text-slate-600">Signed in as {user?.email}</p>
      </div>
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <Field label="Display name" htmlFor="display_name">
            <Input id="display_name" {...form.register('display_name', { required: true })} />
          </Field>
          <Field label="Username" htmlFor="username">
            <Input id="username" {...form.register('username')} />
          </Field>
          <Field label="Niche" htmlFor="niche">
            <Input id="niche" {...form.register('niche')} />
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
            <Input id="reporting_currency" maxLength={3} {...form.register('reporting_currency')} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Bio" htmlFor="bio">
              <Textarea id="bio" rows={4} {...form.register('bio')} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
