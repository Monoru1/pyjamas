'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() { const router = useRouter(); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); setError(''); const form = new FormData(e.currentTarget); const { error } = await createClient().auth.signInWithPassword({ email: String(form.get('email')), password: String(form.get('password')) }); if (error) { setError('Identifiants incorrects.'); setLoading(false); return; } router.replace('/admin'); router.refresh(); } return <form onSubmit={submit} className="login-form"><label>Adresse e-mail<input required name="email" type="email" autoComplete="email" placeholder="alice@lamaisonduconfort.com" /></label><label>Mot de passe<input required name="password" type="password" autoComplete="current-password" placeholder="••••••••" /></label>{error && <p className="login-error">{error}</p>}<button disabled={loading}>{loading ? 'Connexion…' : 'Ouvrir le studio'}</button></form>; }
