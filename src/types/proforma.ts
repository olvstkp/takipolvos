export interface Customer {
  id: string;
  name: string;
  address: string;
  taxId: string;
  contactPerson: string;
  phone: string;
  phone2?: string;
  email: string;
  delivery: string;
}

export interface ProformaGroup {
  id: string; // "pg_1", "pg_2", "pg_3", etc.
  name: string; // "OLIVE OIL SHOWER GEL 750ML"
}

export interface ProductType {
  id: string;
  name: string; // "Shower Gel", "Liquid Soap", "Soap"
  packing_list_name: string; // "SHOWER GEL", "LIQUID SOAP", "SOAP"
  is_liquid: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  series: string; // Gruplama için, örn: "500X12"
  pricePerCase: number;
  pricePerPiece: number;
  pricePerCaseUsd?: number;
  pricePerPieceUsd?: number;
  net_weight_kg_per_piece: number;
  piecesPerCase: number;
  packaging_weight_kg_per_case: number;
  width_cm: number;
  height_cm: number;
  depth_cm: number;
  proforma_group_id?: string; // Ana proforma grubu referansı
  product_type_id?: string; // Backward compatibility
  size_value?: number; // 750, 450, 100, 125
  size_unit?: string; // "ML", "G"
  product_type?: ProductType;
  proforma_group?: ProformaGroup;
}

export interface ProformaItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: 'case' | 'piece';
}

export interface Pallet {
  pallet_number: number;
  width_cm: number;
  length_cm: number;
  height_cm: number;
}

export interface ShipmentInfo {
  weight_per_pallet_kg: number;
  pallets: Pallet[];
}

export interface Proforma {
  id: string;
  proformaNumber: string;
  customerId: string;
  issueDate: string;
  validityDate?: string;
  items: ProformaItem[];
  totalAmount: number;
  paymentMethod: string;
  bankInfo: {
    bankName: string;
    branch: string;
    swiftCode: string;
    accountNumber: string;
  };
  notes: string;
  departure: string;
  delivery: string;
  brand: string;
  shipment: ShipmentInfo;
} 