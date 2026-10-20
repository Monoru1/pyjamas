import { redirect } from 'next/navigation';
import { createClient } from './server';

export async function createAdminClient() {
  const db = await createClient();
  const {data:{user},error} = await db.auth.getUser();
  if(error || !user) redirect('/admin/login');
  const {data:allowed,error:roleError} = await db.rpc('is_admin');
  if(roleError || !allowed) redirect('/admin/login');
  return db;
}

export async function createManagerClient() {
  const db=await createAdminClient();
  const {data:{user}}=await db.auth.getUser();
  const {data:profile,error}=await db.from('profiles').select('role').eq('id',user!.id).maybeSingle();
  if(error || !profile || !['super_admin','admin'].includes(String(profile.role))) throw new Error('Cette opération est réservée à la propriétaire ou à un responsable.');
  return db;
}
