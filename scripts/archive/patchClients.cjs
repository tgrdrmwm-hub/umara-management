const fs = require('fs');

const path = '/home/idk/Documents/Project Umaratax/management-umara/src/pages/ClientsPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace(
  'import { useAuth } from "../hooks/useAuth";',
  'import { useAuth } from "../hooks/useAuth";\nimport { taxServiceDefinitions } from "../constants/taxServices";\nimport { createTask } from "../services/database";'
);

// 2. Add state
const stateInjection = `  const [delegating, setDelegating] = useState(null);
  const [delegateForm, setDelegateForm] = useState({
    category: "",
    service: "",
    pic: "",
    deadline: "",
  });`;

content = content.replace(
  '  const [showForm, setShowForm] = useState(false);',
  '  const [showForm, setShowForm] = useState(false);\n' + stateInjection
);

// 3. Add function submitDelegate
const functionInjection = `
  async function submitDelegate(e) {
    e.preventDefault();
    if (!delegateForm.category || !delegateForm.service || !delegateForm.pic) {
      return toast.error("Kategori, layanan, dan PIC wajib diisi");
    }

    const catObj = taxServiceDefinitions.find((c) => c.category === delegateForm.category);
    const srvObj = catObj?.items.find((i) => i.name === delegateForm.service);
    const points = srvObj ? srvObj.basePoint : 0;

    try {
      await createTask({
        title: \`[\${delegateForm.service}] \${delegating.name}\`,
        description: \`Tugas dari Klien \${delegating.name}\`,
        pic: delegateForm.pic,
        deadline: delegateForm.deadline || null,
        status: "todo",
        points: points,
      });
      await refresh("Pekerjaan berhasil didelegasikan ke Task Board");
      setDelegating(null);
      setDelegateForm({ category: "", service: "", pic: "", deadline: "" });
    } catch (err) {
      toast.error("Gagal mendelegasikan pekerjaan");
    }
  }
`;

content = content.replace(
  '  function startEdit(client) {',
  functionInjection + '\n  function startEdit(client) {'
);

// 4. Add button in table
const buttonInjection = `                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                          onClick={() => {
                            setDelegating(client);
                            setDelegateForm({ category: "", service: "", pic: "", deadline: "" });
                          }}
                        >
                          Tugaskan
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(client)}
                        >`;

content = content.replace(
  `                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(client)}
                        >`,
  buttonInjection
);

// 5. Add Modal at the bottom
const modalInjection = `
      {/* Delegate Modal */}
      {delegating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Delegasikan Pekerjaan
              </h2>
              <button
                onClick={() => setDelegating(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 text-xs text-slate-500">
              Klien: <span className="font-semibold text-slate-700 dark:text-slate-300">{delegating.name}</span>
            </div>
            <form className="space-y-4" onSubmit={submitDelegate}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Kategori Layanan *
                </label>
                <select
                  className={selectClass}
                  value={delegateForm.category}
                  onChange={(e) =>
                    setDelegateForm({ ...delegateForm, category: e.target.value, service: "" })
                  }
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {taxServiceDefinitions.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Jenis Layanan *
                </label>
                <select
                  className={selectClass}
                  value={delegateForm.service}
                  onChange={(e) => setDelegateForm({ ...delegateForm, service: e.target.value })}
                  required
                  disabled={!delegateForm.category}
                >
                  <option value="">-- Pilih Layanan --</option>
                  {taxServiceDefinitions
                    .find((c) => c.category === delegateForm.category)
                    ?.items.map((srv) => (
                      <option key={srv.name} value={srv.name}>
                        {srv.name} ({srv.basePoint} pts)
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tugaskan Kepada (PIC) *
                </label>
                <select
                  className={selectClass}
                  value={delegateForm.pic}
                  onChange={(e) => setDelegateForm({ ...delegateForm, pic: e.target.value })}
                  required
                >
                  <option value="">-- Pilih Staf --</option>
                  {data?.users
                    ?.filter((u) => u.role === "staff" || u.role === "staff_magang" || u.role === "magang" || u.role === "owner" || u.role === "manager" || u.role === "admin")
                    .map((user) => (
                      <option key={user.id} value={user.name}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tenggat Waktu
                </label>
                <Input
                  type="date"
                  value={delegateForm.deadline}
                  onChange={(e) => setDelegateForm({ ...delegateForm, deadline: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="w-full">
                  Buat Task
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(
  `    </div>
  );
}`,
  modalInjection
);

fs.writeFileSync(path, content, 'utf8');
console.log('ClientsPage.jsx patched successfully!');
