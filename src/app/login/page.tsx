"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_CONFIG } from "@/lib/config";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/deals");
    } else {
      setError("パスワードが違います");
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedMsg("");
    const res = await fetch("/api/seed", { method: "POST" });
    const data = await res.json();
    setSeedMsg(data.message || "完了");
    setSeeding(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-96 space-y-5">
        <h1 className="text-2xl font-bold text-center">{APP_CONFIG.appName}</h1>
        <p className="text-xs text-gray-400 text-center">{APP_CONFIG.description}</p>
        <div>
          <label className="block text-sm font-medium mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            autoFocus
            placeholder="パスワードを入力"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          ログイン
        </button>

        <div className="border-t pt-4">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="w-full text-sm text-gray-500 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {seeding ? "投入中..." : "デモデータを投入"}
          </button>
          {seedMsg && <p className="text-xs text-emerald-600 text-center mt-2">{seedMsg}</p>}
          <p className="text-[10px] text-gray-400 text-center mt-1">
            初回のみ：デフォルトパスワードは「{APP_CONFIG.defaultPassword}」
          </p>
        </div>
      </form>
    </div>
  );
}
