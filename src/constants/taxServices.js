export const taxServiceDefinitions = [
  {
    category: "Coretax",
    services: [
      { name: "Aktivasi Coretax", basePoints: 0.25 },
      { name: "PKP", basePoints: 0.25 },
      { name: "Non PKP", basePoints: 0.25 },
      { name: "NE (Non Efektif)", basePoints: 0.25 },
      { name: "Pembuatan NPWP", basePoints: 0.25 },
      { name: "Pengurangan Sanksi", basePoints: 0.25 },
      { name: "Restitusi Pajak", basePoints: 0.25 },
      { name: "Administrasi Lainnya", basePoints: 0.25 },
    ],
  },
  {
    category: "SPT Tahunan",
    services: [
      { name: "SPT Orang Pribadi", basePoints: 0.25 },
      { name: "SPT Badan", basePoints: 0.25 },
      { name: "SPT Orang Pribadi Pembetulan", basePoints: 0.25 },
      { name: "SPT Badan Pembetulan", basePoints: 0.25 },
    ],
  },
  {
    category: "SPT Masa",
    services: [
      { name: "PPN", basePoints: 0.25 },
      { name: "PPh 21/26", basePoints: 0.25 },
      { name: "PPh 22/23", basePoints: 0.25 },
      { name: "PPh Unifikasi", basePoints: 0.25 },
      { name: "PPh Final", basePoints: 0.25 },
      { name: "PPh 25", basePoints: 0.25 },
    ],
  },
  {
    category: "Akuntansi",
    services: [
      { name: "Akuntan Internal", basePoints: 0.25 },
      { name: "Akuntan Eksternal", basePoints: 0.25 },
    ],
  },
  {
    category: "Perizinan",
    services: [
      { name: "Akta Pendirian", basePoints: 0.25 },
      { name: "NIB", basePoints: 0.25 },
      { name: "PBG", basePoints: 0.25 },
      { name: "SLF", basePoints: 0.25 },
      { name: "Perizinan Lainnya", basePoints: 0.25 },
    ],
  },
  {
    category: "Media",
    services: [
      { name: "Website", basePoints: 0.25 },
      { name: "Instagram", basePoints: 0.25 },
      { name: "TikTok", basePoints: 0.25 },
      { name: "YouTube", basePoints: 0.25 },
      { name: "Facebook", basePoints: 0.25 },
      { name: "WhatsApp", basePoints: 0.25 },
    ],
  },
  {
    category: "Administrasi Pajak",
    services: [
      { name: "Surat Kuasa", basePoints: 0.25 },
      { name: "Surat Kontrak", basePoints: 0.25 },
      { name: "Penawaran", basePoints: 0.25 },
    ],
  },
  {
    category: "Masenger",
    services: [
      { name: "Pengiriman Dokumen", basePoints: 0.25 },
      { name: "Tanda Tangan Dokumen", basePoints: 0.25 },
      { name: "Lainnya", basePoints: 0.25 },
      { name: "KBM", basePoints: 0.25 },
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
    )?.basePoints ?? 0.25
  );
}
