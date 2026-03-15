import { Month, Product } from "@/lib/dataStore";

type WorkbookTargetMonth = {
  er?: number;
  en?: number;
  nn?: number;
};

export interface WorkbookTargetSeed {
  name: string;
  product: Product;
  am: string;
  csm: string;
  months: Partial<Record<Month, WorkbookTargetMonth>>;
}

export const WORKBOOK_TARGET_SEEDS: WorkbookTargetSeed[] = [
  {
    name: "Abbvie",
    product: "Nuro",
    am: "Brian",
    csm: "Rob",
    months: {
      Dec: { en: 20000 },
      Mar: { er: 221805 },
    },
  },
  {
    name: "Abbvie",
    product: "Access Hub",
    am: "Brian",
    csm: "Rob",
    months: {
      Mar: { en: 70000 },
    },
  },
  {
    name: "Arvinas",
    product: "Nuro",
    am: "Pawan",
    csm: "Hilary",
    months: {
      Apr: { er: 48722 },
    },
  },
  {
    name: "Astellas",
    product: "Access Hub",
    am: "Brian",
    csm: "Cloe",
    months: {
      Apr: { er: 82707 },
    },
  },
  {
    name: "Astellas",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Andreas",
    months: {
      Apr: { en: 120000 },
      May: { er: 82087 },
    },
  },
  {
    name: "AstraZeneca",
    product: "Access Hub",
    am: "Russ",
    csm: "Rob",
    months: {
      Oct: { er: 577500, en: 180000 },
    },
  },
  {
    name: "AstraZeneca",
    product: "Nuro",
    am: "Russ",
    csm: "Rob",
    months: {
      Oct: { er: 175802 },
    },
  },
  {
    name: "Biogen",
    product: "Access Hub",
    am: "Pawan",
    csm: "Hilary",
    months: {
      Mar: { en: 70000 },
      Jun: { er: 88947 },
    },
  },
  {
    name: "Biogen",
    product: "Nuro",
    am: "Pawan",
    csm: "Hilary",
    months: {
      Jun: { er: 146241 },
    },
  },
  {
    name: "Biogen",
    product: "Evidence Hub",
    am: "Pawan",
    csm: "Hilary",
    months: {
      Jun: { en: 80000 },
    },
  },
  {
    name: "BioNtech",
    product: "Nuro",
    am: "Pawan",
    csm: "Cloe",
    months: {
      Dec: { er: 142065 },
    },
  },
  {
    name: "BioNtech",
    product: "Access Hub",
    am: "Pawan",
    csm: "Cloe",
    months: {
      Dec: { en: 60000 },
    },
  },
  {
    name: "BMS",
    product: "Nuro",
    am: "Brian",
    csm: "Cloe",
    months: {
      Jul: { er: 139098 },
    },
  },
  {
    name: "Boehringer Ingelheim",
    product: "Access Hub",
    am: "Brian",
    csm: "Cloe",
    months: {
      Mar: { en: 120000 },
    },
  },
  {
    name: "Boehringer Ingelheim",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Andreas",
    months: {
      Jan: { en: 100000 },
      May: { er: 121739 },
    },
  },
  {
    name: "Boehringer Ingelheim",
    product: "Nuro",
    am: "Brian",
    csm: "Cloe",
    months: {
      Oct: { er: 95652 },
      Apr: { er: 95652 },
    },
  },
  {
    name: "Daaichi Sankyo",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Rob",
    months: {
      Mar: { en: 120000 },
    },
  },
  {
    name: "EMD Serono",
    product: "Nuro",
    am: "Pawan",
    csm: "Rob",
    months: {
      Mar: { er: 130435 },
    },
  },
  {
    name: "EMD Serono",
    product: "Access Hub",
    am: "Pawan",
    csm: "Rob",
    months: {
      Sep: { en: 50000 },
    },
  },
  {
    name: "Genmab",
    product: "Access Hub",
    am: "Pawan",
    csm: "Cloe",
    months: {
      Jan: { en: 56000 },
    },
  },
  {
    name: "Genmab",
    product: "Evidence Hub",
    am: "Pawan",
    csm: "Cloe",
    months: {
      Mar: { en: 64000 },
    },
  },
  {
    name: "Genmab",
    product: "Nuro",
    am: "Pawan",
    csm: "Cloe",
    months: {
      Jan: { er: 109624 },
    },
  },
  {
    name: "GSK",
    product: "Nuro",
    am: "Pawan",
    csm: "Hilary",
    months: {
      Nov: { er: 120000 },
    },
  },
  {
    name: "Ionis Pharmaceuticals, Inc.",
    product: "Nuro",
    am: "Brian",
    csm: "Rob",
    months: {
      Jun: { er: 41353 },
    },
  },
  {
    name: "Janssen",
    product: "Nuro",
    am: "Brian",
    csm: "Cloe",
    months: {
      Dec: { er: 67504, en: 100000 },
    },
  },
  {
    name: "Janssen",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Cloe",
    months: {
      Feb: { en: 80000 },
    },
  },
  {
    name: "Lilly",
    product: "Nuro",
    am: "Brian",
    csm: "Cloe",
    months: {
      Mar: { er: 293233, en: 30000 },
    },
  },
  {
    name: "Lilly",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Cloe",
    months: {
      Nov: { en: 90000 },
    },
  },
  {
    name: "Lilly",
    product: "Access Hub",
    am: "Brian",
    csm: "Cloe",
    months: {
      Jun: { en: 80000 },
    },
  },
  {
    name: "MSD",
    product: "Access Hub",
    am: "Brian",
    csm: "Cloe",
    months: {
      Aug: { er: 43478 },
      Apr: { en: 80000 },
    },
  },
  {
    name: "MSD",
    product: "Nuro",
    am: "Brian",
    csm: "Cloe",
    months: {
      Apr: { er: 160677 },
    },
  },
  {
    name: "MSD",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Cloe",
    months: {
      Jul: { en: 120000 },
    },
  },
  {
    name: "Novo Nordisk",
    product: "Access Hub",
    am: "Pawan",
    csm: "Hilary",
    months: {
      Dec: { er: 83092 },
      Apr: { en: 80000 },
    },
  },
  {
    name: "Otsuka",
    product: "Nuro",
    am: "Brian",
    csm: "Rob",
    months: {
      Jan: { er: 120000 },
    },
  },
  {
    name: "Otsuka",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Rob",
    months: {
      Jan: { en: 60000 },
    },
  },
  {
    name: "Otsuka",
    product: "Access Hub",
    am: "Brian",
    csm: "Rob",
    months: {
      May: { en: 60000 },
    },
  },
  {
    name: "Pfizer",
    product: "Access Hub",
    am: "Brian",
    csm: "Hilary",
    months: {
      Dec: { er: 900593 },
    },
  },
  {
    name: "Pfizer",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Maro",
    months: {
      Dec: { er: 918288, en: 165000 },
    },
  },
  {
    name: "Pfizer",
    product: "Nuro",
    am: "Brian",
    csm: "Hilary",
    months: {
      Feb: { en: 120000 },
    },
  },
  {
    name: "Regeneron",
    product: "Evidence Hub",
    am: "New AM",
    csm: "Andreas",
    months: {
      May: { en: 60000 },
    },
  },
  {
    name: "Regeneron",
    product: "Access Hub",
    am: "New AM",
    csm: "Andreas",
    months: {
      Jun: { en: 100000 },
    },
  },
  {
    name: "Sanofi",
    product: "Evidence Hub",
    am: "Brian",
    csm: "Andreas",
    months: {
      Oct: { en: 210000 },
    },
  },
  {
    name: "Sanofi",
    product: "Nuro",
    am: "Brian",
    csm: "Andreas",
    months: {
      Apr: { en: 120000 },
    },
  },
  {
    name: "Sanofi",
    product: "Access Hub",
    am: "Brian",
    csm: "Andreas",
    months: {
      May: { en: 80000 },
    },
  },
  {
    name: "Sobi",
    product: "Nuro",
    am: "Pawan",
    csm: "Cloe",
    months: {
      Sep: { er: 54435 },
    },
  },
  {
    name: "Teva",
    product: "Nuro",
    am: "Brian",
    csm: "Rob",
    months: {
      Jul: { er: 73684 },
    },
  },
  {
    name: "New client whitespace",
    product: "Access Hub",
    am: "New AM",
    csm: "TBC",
    months: {
      Feb: { en: 120000 },
    },
  },
  {
    name: "New client whitespace",
    product: "Evidence Hub",
    am: "Russ",
    csm: "TBC",
    months: {
      Jul: { en: 108271 },
    },
  },
  {
    name: "New client whitespace",
    product: "Nuro",
    am: "New AM",
    csm: "TBC",
    months: {
      May: { en: 120000 },
      Jun: { en: 140000 },
    },
  },
  {
    name: "UCB",
    product: "Nuro",
    am: "Pawan",
    csm: "Cloe",
    months: {
      Jan: { er: 171304 },
    },
  },
  {
    name: "UCB",
    product: "Evidence Hub",
    am: "Pawan",
    csm: "Maro",
    months: {
      Jan: { er: 34783, en: 17391 },
      Apr: { en: 70000 },
    },
  },
  {
    name: "Net New - Pawan",
    product: "Access Hub",
    am: "Pawan",
    csm: "N/A",
    months: {
      May: { nn: 60000 },
    },
  },
  {
    name: "Net New - Pawan",
    product: "Evidence Hub",
    am: "Pawan",
    csm: "N/A",
    months: {
      Dec: { nn: 70000 },
      Feb: { nn: 70000 },
    },
  },
  {
    name: "Net New - Pawan",
    product: "Nuro",
    am: "Pawan",
    csm: "N/A",
    months: {
      Oct: { nn: 60000 },
    },
  },
  {
    name: "Net New - Russ",
    product: "Access Hub",
    am: "Russ",
    csm: "N/A",
    months: {
      Sep: { nn: 100000 },
      Jul: { nn: 40000 },
    },
  },
  {
    name: "Net New - Russ",
    product: "Nuro",
    am: "Russ",
    csm: "N/A",
    months: {
      Dec: { nn: 100000 },
      Mar: { nn: 60000 },
    },
  },
  {
    name: "Net New - Rob",
    product: "Access Hub",
    am: "Rob",
    csm: "N/A",
    months: {
      Oct: { nn: 150000 },
      Jan: { nn: 150000 },
      Jun: { nn: 121585 },
    },
  },
  {
    name: "Net New - Rob",
    product: "Evidence Hub",
    am: "Rob",
    csm: "N/A",
    months: {
      Sep: { nn: 70000 },
      Dec: { nn: 70000 },
      Feb: { nn: 60585 },
      May: { nn: 140585 },
    },
  },
  {
    name: "Net New - Rob",
    product: "Nuro",
    am: "Rob",
    csm: "N/A",
    months: {
      Aug: { nn: 70000 },
      Nov: { nn: 70000 },
      Mar: { nn: 160585 },
      Apr: { nn: 140585 },
      Jul: { nn: 121565 },
    },
  },
  {
    name: "Net New - Ali",
    product: "Access Hub",
    am: "Ali",
    csm: "N/A",
    months: {
      Dec: { nn: 44445 },
      Feb: { nn: 50000 },
      Apr: { nn: 50000 },
      Jul: { nn: 44440 },
    },
  },
  {
    name: "Net New - Ali",
    product: "Evidence Hub",
    am: "Ali",
    csm: "N/A",
    months: {
      Oct: { nn: 75000 },
      Nov: { nn: 44445 },
      Mar: { nn: 50000 },
    },
  },
  {
    name: "Net New - Ali",
    product: "Nuro",
    am: "Ali",
    csm: "N/A",
    months: {
      Jan: { nn: 44445 },
      May: { nn: 50000 },
      Jun: { nn: 44445 },
    },
  },
  {
    name: "Net New - New BD",
    product: "Access Hub",
    am: "New BD",
    csm: "N/A",
    months: {
      Mar: { nn: 117142 },
      May: { nn: 67142 },
    },
  },
  {
    name: "Net New - New BD",
    product: "Evidence Hub",
    am: "New BD",
    csm: "N/A",
    months: {
      Jan: { nn: 57142 },
      Apr: { nn: 67142 },
      Jun: { nn: 87142 },
      Jul: { nn: 57142 },
    },
  },
  {
    name: "Net New - New BD",
    product: "Nuro",
    am: "New BD",
    csm: "N/A",
    months: {
      Feb: { nn: 57142 },
    },
  },
];
