"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (user) => { if (user) router.replace("/admin"); }), [router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const data = new FormData(event.currentTarget);
    try { await signInWithEmailAndPassword(auth, String(data.get("email")), String(data.get("password"))); router.replace("/admin"); }
    catch { setError("The email or password was not accepted."); }
    finally { setLoading(false); }
  }

  return <main className="auth-shell"><section className="auth-card"><Link className="brand" href="/"><span className="brand-mark">R</span><span>Russell&apos;s Mobile Blade Sharpening</span></Link><p className="eyebrow">Private owner area</p><h1>Owner login</h1><p>Sign in to view and manage appointments.</p>
    <form onSubmit={login} className="auth-form"><label><span>Email</span><input name="email" type="email" required /></label><label><span>Password</span><input name="password" type="password" required /></label>{error && <p className="form-error">{error}</p>}<button className="button primary" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button></form>
    <Link href="/" className="text-link">← Return to website</Link></section></main>;
}
