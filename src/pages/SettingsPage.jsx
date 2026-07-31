import { DatabaseBackup, History, Mail, RotateCcw, Save } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";

export function SettingsPage() {
  const { data } = useAppData();
  const fileInputRef = useRef(null);
  const [settings, setSettings] = useState(() => ({
    company: localStorage.getItem("umara_company") ?? "UMARA TAX",
    smtp: localStorage.getItem("umara_smtp") ?? "smtp.umara.tax",
    email: localStorage.getItem("umara_email") ?? "finance@umara.tax",
  }));
  const [activities, setActivities] = useState(() =>
    JSON.parse(localStorage.getItem("umara_activity_log") ?? "[]"),
  );

  function addActivity(message) {
    const next = [
      `${new Date().toLocaleString("id-ID")} - ${message}`,
      ...activities,
    ].slice(0, 10);
    setActivities(next);
    localStorage.setItem("umara_activity_log", JSON.stringify(next));
  }

  function saveSettings() {
    localStorage.setItem("umara_company", settings.company);
    localStorage.setItem("umara_smtp", settings.smtp);
    localStorage.setItem("umara_email", settings.email);
    addActivity("Settings company & SMTP disimpan");
    toast.success("Settings disimpan");
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
    const link = document.createElement("a");
    link.href = url;
    link.download = "umara-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    addActivity("Backup JSON dibuat");
  }

  async function restore(file) {
    const content = await file.text();
    JSON.parse(content);
    addActivity(`File backup ${file.name} dibaca`);
    toast.success(
      "File backup valid. Restore database langsung belum dijalankan otomatis.",
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Company Profile, SMTP, Backup, Restore, Activity Log.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <Mail className="h-5 w-5 text-green-700" />
            Company & SMTP
          </h2>
          <div className="grid gap-3">
            <Input
              value={settings.company}
              onChange={(event) =>
                setSettings({ ...settings, company: event.target.value })
              }
            />
            <Input
              value={settings.smtp}
              onChange={(event) =>
                setSettings({ ...settings, smtp: event.target.value })
              }
            />
            <Input
              value={settings.email}
              onChange={(event) =>
                setSettings({ ...settings, email: event.target.value })
              }
            />
          </div>
          <Button className="mt-4" onClick={saveSettings}>
            <Save className="h-4 w-4" />
            Simpan
          </Button>
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <DatabaseBackup className="h-5 w-5 text-green-700" />
            Backup & Restore
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={backup}>
              <DatabaseBackup className="h-4 w-4" />
              Backup
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void restore(file);
              }}
            />
          </div>
        </Card>
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <History className="h-5 w-5 text-green-700" />
            Activity Log
          </h2>
          <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
            {activities.length
              ? activities.map((activity) => <p key={activity}>{activity}</p>)
              : "Belum ada aktivitas."}
          </div>
        </Card>
      </div>
    </div>
  );
}
