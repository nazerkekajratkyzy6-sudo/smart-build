// SMART BUILD — деректер моделі

export type HouseType = 'small' | 'family' | 'twostory' | 'custom';

export type MaterialId =
  | 'brick' | 'concrete' | 'cement' | 'sand' | 'roof' | 'insulation'
  | 'wallpaper' | 'linoleum' | 'galtel' | 'plinth' | 'paint' | 'glue'
  | 'plaster' | 'leveler' | 'tile';

export type ShapeMode = 'rect' | 'sections' | 'manual';

/** Тік төртбұрышты бөлік: (x, y) — сол жақ төменгі бұрыш координаттары, м */
export interface Section {
  id: string;
  x: number;
  y: number;
  length: number; // X осі бойынша, м
  width: number;  // Y осі бойынша, м
}

export interface Floor {
  id: string;
  name: string;
  shape: ShapeMode;
  length: number;  // м
  width: number;   // м
  height: number;  // қабырға биіктігі, м
  sections: Section[];
  manualArea: number;      // м² (shape = manual)
  manualPerimeter: number; // м  (shape = manual)
}

export type RoomKind = 'living' | 'bedroom' | 'kids' | 'kitchen' | 'hall' | 'bath' | 'other';
export type WallFinish = 'none' | 'wallpaper' | 'paint' | 'both' | 'tile';

export interface Room {
  id: string;
  floorId: string;
  kind: RoomKind;
  name: string;
  length: number;
  width: number;
  height: number;
  wallFinish: WallFinish;
  paintCeiling: boolean;
  linoleum: boolean;
  galtel: boolean;
  plinth: boolean;
  plaster: boolean;
  leveler: boolean;
  tileFloor?: boolean;  // еденге кафель (плитка)
  look?: RoomLook;      // визуалды таңдау (макет үшін; есептеуге әсер етпейді)
}

/** Текстураға сілтеме: дайын үлгі немесе пайдаланушы жүктеген материал */
export type TexRef = { kind: 'preset'; id: string } | { kind: 'custom'; id: string };

export interface RoomLook {
  wallColor?: string;   // бояу түсі
  wallpaper?: TexRef;   // тұсқағаз текстурасы
  floor?: TexRef;       // линолеум текстурасы
  ceilingColor?: string;
  galtelColor?: string;
  plinthColor?: string;
  tileFloor?: TexRef;   // еден кафелінің үлгісі
  tileWall?: TexRef;    // қабырға кафелінің үлгісі
}

export interface ProjectLook {
  roofColor?: string;
  facade?: 'brick' | 'plaster';
}

export type CustomCategory = MaterialId | 'other';
export type Place = 'wall' | 'floor' | 'ceiling' | 'roof' | 'foundation' | 'other';
export type CustomTarget = 'room-walls' | 'room-floor' | 'room-ceiling' | 'ext-walls' | 'roof' | 'ground' | 'manual';

/** Пайдаланушы өзі қосқан материал (телефонның жергілікті дерекқорында) */
export interface CustomMaterial {
  id: string;
  name: string;
  category: CustomCategory;
  place: Place;
  unit: string;
  price: number;
  norm: number;          // 1 м²-ге шығын (сатып алу бірлігімен); 0 — белгісіз
  photo: string;         // data:image/jpeg (кішірейтілген)
  tile?: string;         // қиылған текстура плиткасы (тек жарамды болса)
  tileSize: number;      // бір плитканың нақты өлшемі, м
  repeat: boolean;       // қайталау (true) немесе созу (false)
  textureOk: boolean;
  color?: string;        // суреттің орташа түсі (бояу үлгісі үшін)
  createdAt: number;
}

/** «Басқа» санатындағы жеке материалдың есептеу жолы */
export interface CustomLine {
  id: string;
  customId: string;
  name: string;
  unit: string;
  price: number;
  norm: number;
  waste: number;
  target: CustomTarget;
  roomIds: string[];
  manualArea: number;
  mode: 'auto' | 'manual';
  manualQty: number;
  enabled: boolean;
}

export type FoundationType = 'strip' | 'slab' | 'manual';
export type RoofType = 'gable' | 'flat' | 'manual';
export type ConcreteSource = 'ready' | 'mix';

export interface MaterialState {
  enabled: boolean;
  mode: 'auto' | 'manual';
  manualQty: number;
  price: number;        // негізгі (бастапқы таңдалған) бірлік бағасы, ₸
  waste: number;        // қор коэффициенті, %
  displayName?: string; // мысалы, «Теплород» орнына нақты өнім атауы
  tiers: { economy: number; premium: number }; // үнемді / жоғары сценарий бағалары (0 = енгізілмеген)
  customId?: string;    // «Менің материалдарым»-нан таңдалған нақты өнім
  p: Record<string, number | string | boolean>;   // техникалық параметрлер
}

export interface Supplier {
  id: string;
  name: string;
  delivery: number; // жеткізу құны, ₸ (бір тапсырысқа)
}

export interface Offer {
  supplierId: string;
  materialId: MaterialId;
  price: number;    // бірлік бағасы, ₸
  minOrder: number; // ең аз тапсырыс, сатып алу бірлігімен
}

export interface Project {
  id: string;
  name: string;
  houseType: HouseType;
  createdAt: number;
  updatedAt: number;
  wallThickness: number;       // м
  floors: Floor[];
  roomsPlanned: number;        // жоспарланған бөлмелер саны
  foundation: {
    type: FoundationType;
    stripLength: number;       // қосымша ішкі таспа ұзындығы, м (сыртқы периметрге қосылады)
    stripWidth: number;        // м
    stripHeight: number;       // м
    slabThickness: number;     // м
    manualVolume: number;      // м³
  };
  interFloorSlab: { enabled: boolean; thickness: number }; // қабат аралық жабын, м
  roof: { type: RoofType; slope: number; overhang: number; overlap: number; manualArea: number };
  concreteSource: ConcreteSource;
  rooms: Room[];
  materials: Record<MaterialId, MaterialState>;
  suppliers: Supplier[];
  offers: Offer[];
  costs: { delivery: number; labor?: number }; // labor — ескі нұсқадан қалған, есепке кірмейді
  budget: number;
  customLines: CustomLine[];
  look: ProjectLook;
}
