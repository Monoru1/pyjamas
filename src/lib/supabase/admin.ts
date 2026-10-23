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
  const {data:allowed,error}=await db.rpc('is_manager');
  if(error || !allowed) throw new Error('Cette opération est réservée à la propriétaire ou à un responsable.');
  return db;
}
