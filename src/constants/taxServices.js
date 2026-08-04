export const taxServiceDefinitions = [
  {
    category: "Coretax",
    services: [
      { name: "Aktivasi Coretax", basePoints: 100 },
      { name: "PKP", basePoints: 97 },
      { name: "Non PKP", basePoints: 94 },
      { name: "NE (Non Efektif)", basePoints: 91 },
    ],
  },
  {
    category: "SPT Tahunan",
    services: [
      { name: "Pembentukan SPT Orang Pribadi", basePoints: 88 },
      { name: "Pembentukan SPT Badan", basePoints: 85 },
    ],
  },
  {
    category: "SPT Masa",
    services: [
      { name: "PPN", basePoints: 82 },
      { name: "PPh 21/26", basePoints: 79 },
      { name: "PPh 22/23", basePoints: 76 },
      { name: "PPh Unifikasi", basePoints: 73 },
      { name: "PPh Final", basePoints: 70 },
      { name: "PPh 25", basePoints: 67 },
    ],
  },
  {
    category: "Akuntansi",
    services: [
      { name: "Akuntan Internal", basePoints: 64 },
      { name: "Akuntan Eksternal", basePoints: 61 },
    ],
  },
  {
    category: "Perizinan",
    services: [
      { name: "Akta Pendirian", basePoints: 58 },
      { name: "NIB", basePoints: 55 },
      { name: "PBG", basePoints: 52 },
      { name: "SLF", basePoints: 49 },
      { name: "Perizinan Lainnya", basePoints: 46 },
    ],
  },
  {
    category: "Media",
    services: [
      { name: "Website", basePoints: 45 },
      { name: "Instagram", basePoints: 44 },
      { name: "TikTok", basePoints: 43 },
      { name: "YouTube", basePoints: 42 },
      { name: "Facebook", basePoints: 41 },
      { name: "WhatsApp", basePoints: 40 },
    ],
  },
];

export const taxServices = taxServiceDefinitions.flatMap((group) =>
  group.services.map((service) => ({
    ...service,
    category: group.category,
  }))
);

export function getTaxServicePoint(category, serviceName) {
  return (
    taxServices.find(
      (service) =>
        service.category === category && service.name === serviceName
    )?.basePoints ?? 0
  );
}