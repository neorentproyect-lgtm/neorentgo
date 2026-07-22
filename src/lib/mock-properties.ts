export type PropertyType = "vivienda" | "comercial" | "industrial";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  zona: string;
  address: string;
  province: string;
  priceARS: number;
  beds: number;
  baths: number;
  m2: number;
  cochera: boolean;
  image: string;
  rating: number;
  agent: string;
  brokerVerified: boolean;
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const MOCK_PROPERTIES: Property[] = [
  {
    id: "p1", title: "Departamento 2 amb. a estrenar", type: "vivienda",
    zona: "Área Centro Este", address: "Alderete 1240", province: "Neuquén",
    priceARS: 385000, beds: 1, baths: 1, m2: 48, cochera: true,
    image: IMG("photo-1502672260266-1c1ef2d93688"), rating: 4.9, agent: "Est. Álvarez", brokerVerified: true,
  },
  {
    id: "p2", title: "Casa 3 dorm. con parque", type: "vivienda",
    zona: "Rincón de Emilio", address: "Los Álamos 830", province: "Neuquén",
    priceARS: 720000, beds: 3, baths: 2, m2: 130, cochera: true,
    image: IMG("photo-1568605114967-8130f3a36994"), rating: 4.8, agent: "M. Ríos", brokerVerified: true,
  },
  {
    id: "p3", title: "Local comercial sobre avenida", type: "comercial",
    zona: "Área Centro", address: "Av. Argentina 455", province: "Neuquén",
    priceARS: 950000, beds: 0, baths: 1, m2: 85, cochera: false,
    image: IMG("photo-1441986300917-64674bd600d8"), rating: 4.7, agent: "Est. Álvarez", brokerVerified: true,
  },
  {
    id: "p4", title: "Monoambiente premium", type: "vivienda",
    zona: "Universidad", address: "Buenos Aires 670", province: "Neuquén",
    priceARS: 265000, beds: 0, baths: 1, m2: 32, cochera: false,
    image: IMG("photo-1522708323590-d24dbb6b0267"), rating: 4.6, agent: "L. Sosa", brokerVerified: false,
  },
  {
    id: "p5", title: "Galpón industrial 400 m²", type: "industrial",
    zona: "Parque Industrial", address: "Ruta 7 km 3", province: "Neuquén",
    priceARS: 2100000, beds: 0, baths: 2, m2: 400, cochera: true,
    image: IMG("photo-1553413077-190dd305871c"), rating: 4.5, agent: "M. Ríos", brokerVerified: true,
  },
  {
    id: "p6", title: "Departamento 3 amb. con balcón", type: "vivienda",
    zona: "Área Centro Oeste", address: "Córdoba 190", province: "Neuquén",
    priceARS: 510000, beds: 2, baths: 1, m2: 72, cochera: true,
    image: IMG("photo-1512917774080-9991f1c4c750"), rating: 4.9, agent: "Est. Álvarez", brokerVerified: true,
  },
  {
    id: "p7", title: "Oficina en edificio corporativo", type: "comercial",
    zona: "Área Centro", address: "Roca 320, piso 4", province: "Neuquén",
    priceARS: 640000, beds: 0, baths: 1, m2: 60, cochera: true,
    image: IMG("photo-1497366216548-37526070297c"), rating: 4.8, agent: "C. Vega", brokerVerified: true,
  },
  {
    id: "p8", title: "PH 2 dorm. reciclado", type: "vivienda",
    zona: "Barrio Bardas", address: "Chubut 1450", province: "Neuquén",
    priceARS: 430000, beds: 2, baths: 1, m2: 65, cochera: false,
    image: IMG("photo-1570129477492-45c003edd2be"), rating: 4.7, agent: "L. Sosa", brokerVerified: false,
  },
];
