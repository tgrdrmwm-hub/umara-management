import { ShieldCheck, ArrowRight } from "lucide-react";
import { Card } from "../components/ui/Card";
import { taxServiceDefinitions } from "../constants/taxServices";
import { Badge } from "../components/ui/Badge";

export function TaxPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-500" />
            Kategori & Layanan
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Katalog lengkap layanan UMARA TAX beserta poin operasionalnya.
          </p>
        </div>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {taxServiceDefinitions.map((category, index) => {
          const totalPoints = category.services.reduce((total, service) => total + service.basePoints, 0);

          return (
            <Card key={index} className="flex flex-col p-0 overflow-hidden border-slate-200 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 transition-colors">
              {/* Category Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {category.category}
                </h2>
                <Badge variant="blue" className="px-2 py-0.5 rounded-full">
                  {category.services.length} Layanan
                </Badge>
              </div>

              {/* Services List */}
              <div className="p-5 flex-1 flex flex-col gap-3">
                {category.services.map((service, sIndex) => (
                  <div key={sIndex} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {service.name}
                      </span>
                    </div>
                    <Badge variant="emerald" className="font-mono">
                      {service.basePoints} pts
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Category Footer (Total points) */}
              <div className="bg-slate-50/50 dark:bg-slate-800/20 px-5 py-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs text-slate-500">
                <span>Total Poin Kategori</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{totalPoints} pts</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
