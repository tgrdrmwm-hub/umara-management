export const taxServiceDefinitions = [
  {
    category: "Aktivasi Coretax",
    services: [
      { name: "Pembuatan NPWP", basePoints: 20 },
      { name: "Pembuatan Akun Coretax", basePoints: 25 },
    ],
  },
  {
    category: "SP2DK/Pemeriksaan",
    services: [
      { name: "SP2DK", basePoints: 60 },
      { name: "Pemeriksaan", basePoints: 85 },
    ],
  },
  {
    category: "SPT Masa",
    services: [
      { name: "PPh Final & 25", basePoints: 30 },
      { name: "PPN", basePoints: 35 },
      { name: "PPh 21", basePoints: 30 },
      { name: "PPh 23", basePoints: 30 },
    ],
  },
  {
    category: "SPT Tahunan",
    services: [
      { name: "Orang Pribadi", basePoints: 45 },
      { name: "Badan", basePoints: 70 },
    ],
  },
  {
    category: "LAINNYA",
    services: [
      { name: "Accurate / Keuangan", basePoints: 80 },
      { name: "Media", basePoints: 50 },
      { name: "Admin Dosen", basePoints: 75 },
      { name: "Surat Keluar", basePoints: 55 },
    ],
  },
];

export const taxServices = taxServiceDefinitions.flatMap((group) =>
  group.services.map((service) => ({
    ...service,
    category: group.category,
  })),
);

export function getTaxServicePoint(category, serviceName) {
  return (
    taxServices.find(
      (service) =>
        service.category === category && service.name === serviceName,
    )?.basePoints ?? 0
  );
}
