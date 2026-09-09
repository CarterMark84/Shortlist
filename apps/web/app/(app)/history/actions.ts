'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

/**
 * Delete a search and, by cascade, its results.
 *
 * No ownership check is needed here: the RLS delete policy only matches rows
 * where `user_id = auth.uid()`, so another user's id simply deletes nothing.
 */
export async function deleteSearch(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (id.length === 0) return;

  const supabase = await createClient();
  await supabase.from('searches').delete().eq('id', id);

  revalidatePath('/history');
  revalidatePath('/search');
}
