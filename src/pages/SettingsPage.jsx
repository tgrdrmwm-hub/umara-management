import {
  DatabaseBackup,
  History,
  Mail,
  RotateCcw,
  Save,
  Server,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";

export function SettingsPage() {
  const { data, isLoading, error } = useAppData();
  const fileInputRef = useRef(null);
  const [settings, setSettings] = useState(() => ({
    company: localStorage.getItem("umara_company") ?? "UMARA TAX",
    smtp: localStorage.getItem("umara_smtp") ?? "smtp.umara.tax",
    email:
      localStorage.getItem("umara_email") ||
      import.meta.env.VITE_MAIL_SENDER_FROM_EMAIL ||
      "MS_noreply@test-p7kx4xw0ny7g9yjr.mlsender.net",
    resendApiKey:
      localStorage.getItem("umara_mail_sender_api_key") ||
      localStorage.getItem("umara_resend_api_key") ||
      import.meta.env.VITE_MAIL_SENDER_API_KEY ||
      import.meta.env.VITE_RESEND_API_KEY ||
      "",
  }));
  const [activities, setActivities] = useState(() =>
    JSON.parse(localStorage.getItem("umara_activity_log") ?? "[]"),
  );

  function addActivity(msg) {
    const next = [
      `${new Date().toLocaleString("id-ID")} — ${msg}`,
      ...activities,
    ].slice(0, 20);
    setActivities(next);
    localStorage.setItem("umara_activity_log", JSON.stringify(next));
  }

  function saveSettings() {
    localStorage.setItem("umara_company", settings.company);
    localStorage.setItem("umara_smtp", settings.smtp);
    localStorage.setItem("umara_email", settings.email.trim());
    localStorage.setItem("umara_mail_sender_api_key", settings.resendApiKey.trim());
    localStorage.setItem("umara_resend_api_key", settings.resendApiKey.trim());
    addActivity("Settings company, SMTP & Mail Sender disimpan");
    toast.success("Settings berhasil disimpan!");
  }

  function backup() {
    const payload = JSON.stringify(
      { generatedAt: new Date().toISOString(), data, settings },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([payload], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "umara-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    addActivity("Backup JSON dibuat");
    toast.success("Backup berhasil diunduh");
  }

  async function restore(file) {
    try {
      const content = await file.text();
      JSON.parse(content);
      addActivity(`File backup "${file.name}" dibaca`);
      toast.success(
        "File valid. Restore manual ke Supabase belum tersedia otomatis.",
      );
    } catch {
      toast.error("File tidak valid atau bukan JSON");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Pengaturan
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Profil perusahaan, SMTP, backup data, dan log aktivitas.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Company & SMTP */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Company & SMTP
            </h2>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Nama Perusahaan
              </label>
              <Input
                placeholder="UMARA TAX"
                value={settings.company}
                onChange={(e) =>
                  setSettings({ ...settings, company: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                SMTP Server
              </label>
              <div className="relative">
                <Server className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-8"
                  placeholder="smtp.umara.tax"
                  value={settings.smtp}
                  onChange={(e) =>
                    setSettings({ ...settings, smtp: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Email Pengirim (Sender Domain)
              </label>
              <Input
                type="text"
                placeholder="misal: MS_xxxx@trial-xxxx.mailersend.net atau notif@umara.tax"
                value={settings.email}
                onChange={(e) =>
                  setSettings({ ...settings, email: e.target.value })
                }
              />
              <p className="text-[11px] text-slate-400">
                Untuk <span className="font-semibold">MailerSend</span>, masukkan alamat sender / trial domain dari menu Domains di dashboard MailerSend Anda (contoh: <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-[10px]">MS_xxxx@trial-xxxx.mailersend.net</code>).
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Mail Sender API Key (MailerSend / Resend)</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {settings.resendApiKey.startsWith("mlsn.") ? "MailerSend Terdeteksi ✓" : settings.resendApiKey.startsWith("re_") ? "Resend Terdeteksi ✓" : "Aktif"}
                </span>
              </label>
              <Input
                type="password"
                placeholder="mlsn.xxxxxxxx atau re_xxxxxxxx"
                value={settings.resendApiKey}
                onChange={(e) =>
                  setSettings({ ...settings, resendApiKey: e.target.value })
                }
              />
              <p className="text-[11px] text-slate-400">
                Mendukung API Key <span className="font-semibold">MailerSend</span> (<code className="text-[10px]">mlsn...</code>) atau <span className="font-semibold">Resend</span> (<code className="text-[10px]">re_...</code>) untuk pengiriman otomatis 1-klik di latar belakang.
              </p>
            </div>
          </div>
          <Button className="mt-4" onClick={saveSettings}>
            <Save className="h-3.5 w-3.5" />
            Simpan Settings
          </Button>
        </Card>

        {/* Backup & Restore */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <DatabaseBackup className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Backup & Restore
            </h2>
          </div>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Unduh backup data sebagai JSON untuk arsip. Restore file JSON yang
            pernah dibuat sebelumnya.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={backup}>
              <DatabaseBackup className="h-3.5 w-3.5" />
              Unduh Backup
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void restore(file);
              }}
            />
          </div>
        </Card>

        {/* Activity Log */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/8">
              <History className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Log Aktivitas
            </h2>
            <span className="ml-auto text-xs text-slate-400">
              {activities.length} entri
            </span>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400">
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <div className="space-y-1.5">
              {activities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-400 odd:bg-slate-50 dark:odd:bg-white/3"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-white/20" />
                  {activity}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
