export type LabelFieldKey =
  | 'productName'
  | 'barcode'
  | 'serialNumber'
  | 'entryDate'
  | 'expiryDate'
  | 'amount'
  | 'invoiceNumber'
  | 'batchNumber'
  | 'supplier'
  | 'logo';

export interface FieldRule {
  visible: boolean;
  required: boolean;
}

export type FieldsConfig = Record<LabelFieldKey, FieldRule>;

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  label: string;
  required: boolean;
  visible: boolean;
  defaultValue?: string | number | boolean;
}

export interface LabelTypeDef {
  id?: string;
  name: string;
  fields: FieldsConfig;
  anchors?: Record<string, { x: number; y: number }>; // mm cinsinden
  custom_fields?: CustomField[];
}

export const buildDefaultFields = (overrides?: Partial<FieldsConfig>): FieldsConfig => ({
  productName: { visible: true, required: false },
  barcode: { visible: true, required: false },
  serialNumber: { visible: true, required: false },
  entryDate: { visible: true, required: false },
  expiryDate: { visible: true, required: false },
  amount: { visible: true, required: false },
  invoiceNumber: { visible: true, required: false },
  batchNumber: { visible: true, required: false },
  supplier: { visible: true, required: false },
  logo: { visible: true, required: false },
  ...(overrides || {}),
});

export const DEFAULT_LABEL_TYPES: LabelTypeDef[] = [
  {
    name: 'Koli etiketi',
    fields: buildDefaultFields({
      barcode: { visible: true, required: true },
    }),
    anchors: {
      title: { x: 6, y: 6 },
      productName: { x: 6, y: 13 },
      details: { x: 6, y: 26 },
      barcode: { x: 6, y: 34 },
    }
  },
  {
    name: 'Numune Etiketi',
    fields: buildDefaultFields({
      barcode: { visible: false, required: false },
    }),
    anchors: {
      title: { x: 6, y: 6 },
      productName: { x: 6, y: 13 },
      details: { x: 6, y: 23 },
      barcode: { x: 6, y: 34 },
    }
  },
  {
    name: 'Yarı Mamül Etiketi',
    fields: buildDefaultFields({
      barcode: { visible: true, required: false },
    }),
    anchors: {
      title: { x: 6, y: 6 },
      productName: { x: 6, y: 13 },
      details: { x: 6, y: 23 },
      barcode: { x: 6, y: 34 },
    }
  },
];

export const isFieldVisible = (fields: FieldsConfig, key: LabelFieldKey): boolean => {
  return fields[key]?.visible !== false;
};

export const isFieldRequired = (fields: FieldsConfig, key: LabelFieldKey): boolean => {
  return fields[key]?.required === true;
};


