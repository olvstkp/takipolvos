export interface Customer {
  id: string;
  name: string;
  address: string;
  taxId: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  series: string; // Gruplama için, örn: "500X12"
  pricePerCase: number;
  pricePerPiece: number;
  net_weight_kg_per_piece: number;
  piecesPerCase: number;
  packaging_weight_kg_per_case: number;
  width_cm: number;
  height_cm: number;
  depth_cm: number;
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