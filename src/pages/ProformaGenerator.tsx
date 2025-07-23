import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, FileText, Download, Printer, ChevronsRight, Package, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Proforma, ProformaItem, Customer, Product } from '../types/proforma';

// Mock data remains the same...
const mockCustomers: Customer[] = [
    { id: 'cust1', name: 'BERFINI S.R.O.', address: 'Vrchlického 2120/1a, Mariánské Hory, 709 00 Ostrava, CZECHIA', taxId: 'CZ08251711', contactPerson: 'Sezen Çakır', phone: '+420 722 546 796', email: 'berfini@example.com' },
    { id: 'cust2', name: 'Global Imports', address: '123 Global Ave, New York, USA', taxId: 'US12345678', contactPerson: 'John Doe', phone: '+1 212 555 1234', email: 'john@global.com' },
];

const mockProducts: Product[] = [
    { id: 'prod1', name: "OLIVOS SELENE'S SERENITY OLIVE OIL SOAP 500ML X12- GOAT MILK", sku: 'OLV-500-GM', series: '500X12', pricePerCase: 39.24, pricePerPiece: 3.27, net_weight_kg_per_piece: 0.5, piecesPerCase: 12, packaging_weight_kg_per_case: 1.66, width_cm: 30, height_cm: 20, depth_cm: 25 },
    { id: 'prod2', name: "OLIVOS AMBROSIA NECTAR OLIVE OIL SOAP 500ML X12 - MANDARIN", sku: 'OLV-500-MAN', series: '500X12', pricePerCase: 39.24, pricePerPiece: 3.27, net_weight_kg_per_piece: 0.5, piecesPerCase: 12, packaging_weight_kg_per_case: 1.66, width_cm: 30, height_cm: 20, depth_cm: 25 },
    { id: 'prod3', name: "OLIVOS GOAT MILK SOAP 150GX24", sku: 'OLV-150-GM', series: '150X24', pricePerCase: 40.80, pricePerPiece: 1.70, net_weight_kg_per_piece: 0.15, piecesPerCase: 24, packaging_weight_kg_per_case: 1.147, width_cm: 25, height_cm: 15, depth_cm: 20 },
    { id: 'prod4', name: "OLIVOS MINI MIX 25 GX100", sku: 'OLV-25-MIX', series: 'PROMO', pricePerCase: 0, pricePerPiece: 0, net_weight_kg_per_piece: 0.025, piecesPerCase: 100, packaging_weight_kg_per_case: 0, width_cm: 0, height_cm: 0, depth_cm: 0},
];
const initialProformaItem: ProformaItem = { productId: '', description: '', quantity: 1, unitPrice: 0, total: 0, unit: 'case' };


const ProformaGenerator: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const steps = ['invoice', 'packing-calculation', 'packing-summary'];
    const stepTitles = {
        'invoice': 'Invoice Bilgileri',
        'packing-calculation': 'Packing List (Hesaplama)',
        'packing-summary': 'Packing List (Özet)'
    };

    const [calculationUnit, setCalculationUnit] = useState<'case' | 'piece'>('case');
    const [proformaData, setProformaData] = useState<Proforma>({
        id: `prof_${Date.now()}`,
        proformaNumber: 'PROF-001',
        issueDate: new Date().toISOString().split('T')[0],
        customerId: 'cust1',
        items: [
            { productId: 'prod1', description: "OLIVOS SELENE'S SERENITY OLIVE OIL SOAP 500ML X12- GOAT MILK", quantity: 5, unitPrice: 39.24, total: 196.2, unit: 'case' },
            { productId: 'prod2', description: "OLIVOS AMBROSIA NECTAR OLIVE OIL SOAP 500ML X12 - MANDARIN", quantity: 10, unitPrice: 39.24, total: 392.4, unit: 'case' },
            { productId: 'prod3', description: "OLIVOS GOAT MILK SOAP 150GX24", quantity: 3, unitPrice: 40.8, total: 122.4, unit: 'case'},
            { productId: 'prod4', description: "OLIVOS MINI MIX 25 GX100", quantity: 8, unitPrice: 0, total: 0, unit: 'case' }
        ],
        totalAmount: 711,
        paymentMethod: 'CASH IN ADVANCE',
        bankInfo: { bankName: 'İŞ BANKASI', branch: 'EDREMİT / BALIKESİR ŞUBE', swiftCode: 'ISBKTRISXXX', accountNumber: 'TR 95 0006 4000 0022 1230 7227 02' },
        notes: 'Plus/Minus 10 percent in quantity and amount will be allowed',
        departure: 'İzmir-FOB',
        delivery: 'CZECHIA',
        brand: 'DASPI',
        shipment: {
            weight_per_pallet_kg: 20,
            pallets: [{ pallet_number: 1, width_cm: 80, length_cm: 120, height_cm: 124 }, { pallet_number: 2, width_cm: 80, length_cm: 120, height_cm: 126 }]
        }
    });

    const goToNextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    const goToPrevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const selectedCustomer = useMemo(() => mockCustomers.find(c => c.id === proformaData.customerId), [proformaData.customerId]);

    const generateExcel = () => {
        if (!selectedCustomer) return;

        const wb = XLSX.utils.book_new();

        // --- 1. Invoice Sheet ---
        const invoiceData = [
            ["DASPI GIDA SAN. VE TIC. A.Ş"],
            ["DUATEPE MAH.YENİTABAKHANE CAD.OLİVOS APT NO:2"],
            ["TİRE / İZMİR"],
            ["TEL: 0266 3921356"],
            [null, null, null, "INVOICE"],
            ["Ship To:", selectedCustomer.name],
            ["Address", selectedCustomer.address],
            ["", `Tel: ${selectedCustomer.phone}`],
            ["", `IČ: ${selectedCustomer.taxId}`, `DIČ: ${selectedCustomer.taxId}`],
            [],
            ["CONTACT", "INVOICE NUMBER", "DEPARTURE", "DELIVERY", "BRAND", "ETA"],
            [selectedCustomer.contactPerson, proformaData.proformaNumber, proformaData.departure, proformaData.delivery, proformaData.brand, ""],
            [],
            [`QUANTITY / ${calculationUnit.toUpperCase()}`, "PRODUCT DESCRIPTION", "UNIT PRICE (EURO)", "TOTAL AMOUNT (EURO)"]
        ];
        proformaData.items.forEach(item => {
            invoiceData.push([item.quantity.toString(), item.description, item.unitPrice.toString(), item.total.toString()]);
        });
        invoiceData.push(["", "", "TOTAL", proformaData.totalAmount.toString()]);
        const wsInvoice = XLSX.utils.aoa_to_sheet(invoiceData);
        XLSX.utils.book_append_sheet(wb, wsInvoice, "Invoice");
        
        // --- 2. Packing List Calculation Sheet ---
        const packingCalcHeaders = ["NO", "DESCRIPTION OF GOODS", "width/cm", "height/cm", "high/cm", "M3", "TARE Kg", `WEIGHT Kg/${calculationUnit}`, `BRUT WEIGHT Kg/${calculationUnit}`, `cup/${calculationUnit.toUpperCase()}`, "TOTAL KG", "TOTAL TARE", "BRÜT KG", "ADET/PCS"];
        const packingCalcData = packingListCalculations.map(p => [p.no, p.description, "", "", "", "", p.tare_kg_per_unit, p.net_weight_kg_per_unit, p.brut_weight_kg_per_unit, p.cup_units, p.total_kg, p.total_tare, p.brut_kg, p.adet_pcs]);
        const wsPackingCalc = XLSX.utils.aoa_to_sheet([packingCalcHeaders, ...packingCalcData]);
        XLSX.utils.book_append_sheet(wb, wsPackingCalc, "Packing List Calc");
        
        // --- 3. Packing List Summary ---
        const packingSummaryData: any[][] = [];
        proformaData.items.forEach(item => {
            const product = mockProducts.find(p => p.id === item.productId);
            if (product) {
                packingSummaryData.push([`${product.name} - NO COMMERCIAL VALUE`]);
                packingSummaryData.push(["Total Number of Cases", (item.unit === 'case' ? item.quantity : 0)]);
                packingSummaryData.push([`Total number of ${product.name.toLowerCase()}`, (item.unit === 'piece' ? item.quantity : item.quantity * product.piecesPerCase)]);
                packingSummaryData.push(["Net Weight", (item.quantity * product.net_weight_kg_per_piece * (item.unit === 'case' ? product.piecesPerCase : 1)) ]);
                packingSummaryData.push(["Gross Weight", ""]); // Needs full calculation logic
                packingSummaryData.push([]);
            }
        });
        const totalCases = packingListCalculations.reduce((s, r) => s + r.cup_units, 0);
        const totalPieces = packingListCalculations.reduce((s, r) => s + r.adet_pcs, 0);
        const totalNetKg = packingListCalculations.reduce((s, r) => s + r.total_kg, 0);
        const totalGrossKg = packingListCalculations.reduce((s, r) => s + r.brut_kg, 0);
        packingSummaryData.push(...[
            [],
            ["TOTAL NUMBER OF CASES", totalCases], ["TOTAL NUMBER OF SOAPS AND PRODUCTS", totalPieces],
            ["NET KG", totalNetKg], ["GROSS KG", totalGrossKg],
            ["NUMBER OF PALLETS", proformaData.shipment.pallets.length],
        ]);
        proformaData.shipment.pallets.forEach((p, i) => {
            packingSummaryData.push([`WIDTHXLENGTHXHEIGHT`, `${p.width_cm}x${p.length_cm}x${p.height_cm}`, `PALLET - ${i+1}`])
        })
        const wsPackingSummary = XLSX.utils.aoa_to_sheet(packingSummaryData);
        XLSX.utils.book_append_sheet(wb, wsPackingSummary, "Packing List Summary");

        XLSX.writeFile(wb, `${proformaData.proformaNumber}-Styled.xlsx`);
    };

    const updateProforma = useCallback((updateFn: (draft: Proforma) => void) => {
        setProformaData(currentData => {
            const draft = JSON.parse(JSON.stringify(currentData));
            updateFn(draft);
            draft.totalAmount = draft.items.reduce((sum: number, item: ProformaItem) => sum + item.total, 0);
            return draft;
        });
    }, []);

    // Effect to update prices when calculation unit changes
    useEffect(() => {
        updateProforma(draft => {
            draft.items.forEach(item => {
                const product = mockProducts.find(p => p.id === item.productId);
                if (product) {
                    item.unit = calculationUnit;
                    item.unitPrice = calculationUnit === 'case' ? product.pricePerCase : product.pricePerPiece;
                    item.total = item.quantity * item.unitPrice;
                }
            });
        });
    }, [calculationUnit, updateProforma]);


    const handleHeaderChange = (field: keyof Proforma, value: any) => { updateProforma(draft => { (draft as any)[field] = value; }); };
    const handleCustomerChange = (customerId: string) => { updateProforma(draft => { draft.customerId = customerId; }); };
    const handleItemChange = (index: number, updatedValues: Partial<ProformaItem>) => {
        updateProforma(draft => {
            const currentItem = { ...draft.items[index], ...updatedValues };
            if ('productId' in updatedValues && updatedValues.productId) {
                const product = mockProducts.find(p => p.id === updatedValues.productId);
                if (product) {
                    currentItem.description = product.name;
                    currentItem.unitPrice = calculationUnit === 'case' ? product.pricePerCase : product.pricePerPiece;
                    currentItem.unit = calculationUnit;
                }
            }
            currentItem.total = currentItem.quantity * currentItem.unitPrice;
            draft.items[index] = currentItem;
    });
  };
    const addItem = () => { updateProforma(draft => { draft.items.push({ ...initialProformaItem, unit: calculationUnit }); }); };
    const removeItem = (index: number) => { updateProforma(draft => { draft.items.splice(index, 1); }); };
    
    // ... packingListCalculations useMemo hook remains the same
     const packingListCalculations = useMemo(() => {
        const groupedBySeries = proformaData.items.reduce((acc, item) => {
            const product = mockProducts.find(p => p.id === item.productId);
            if (!product) return acc;

            const isPromo = product.series === 'PROMO';
            const groupKey = isPromo ? product.id : product.series; // Use product ID to keep promo items separate
            const description = isPromo ? `${product.name} - FREE` : product.series;

            if (!acc[groupKey]) {
                 acc[groupKey] = { products: [], totalQuantity: 0, net_weight_kg_per_unit: 0, packaging_weight_kg_per_case: 0, description: description };
            }

            acc[groupKey].products.push(product);
            acc[groupKey].totalQuantity += item.quantity;
            acc[groupKey].net_weight_kg_per_unit = product.net_weight_kg_per_piece * (calculationUnit === 'case' ? product.piecesPerCase : 1);
            acc[groupKey].packaging_weight_kg_per_case = product.packaging_weight_kg_per_case;
            return acc;
        }, {} as Record<string, { description: string; products: Product[]; totalQuantity: number; net_weight_kg_per_unit: number; packaging_weight_kg_per_case: number; }>);

        const totalUnits = Object.values(groupedBySeries).reduce((sum, group) => sum + group.totalQuantity, 0);
        const totalPalletWeight = proformaData.shipment.pallets.length * proformaData.shipment.weight_per_pallet_kg;
        const palletWeightPerUnit = totalUnits > 0 ? totalPalletWeight / totalUnits : 0;

        return Object.keys(groupedBySeries).map((seriesKey, index) => {
            const group = groupedBySeries[seriesKey];
            const { totalQuantity, net_weight_kg_per_unit, packaging_weight_kg_per_case } = group;
            const tarePerUnit = packaging_weight_kg_per_case + palletWeightPerUnit;
            const brutWeightPerUnit = net_weight_kg_per_unit + tarePerUnit;
            const totalNetWeight = totalQuantity * net_weight_kg_per_unit;
            const totalTare = totalQuantity * tarePerUnit;
            const totalBrutWeight = totalQuantity * brutWeightPerUnit;
            const totalPieces = totalQuantity * (group.products[0]?.piecesPerCase ?? 1);
            
            return { no: index + 1, description: group.description, tare_kg_per_unit: tarePerUnit, net_weight_kg_per_unit, brut_weight_kg_per_unit: brutWeightPerUnit, cup_units: totalQuantity, total_kg: totalNetWeight, total_tare: totalTare, brut_kg: totalBrutWeight, adet_pcs: totalPieces };
        });
    }, [proformaData.items, calculationUnit, proformaData.shipment]);

    if (!selectedCustomer) {
        return <div>Loading...</div>;
    }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proforma Oluşturucu</h1>
        <div className="flex space-x-3">
                    <button onClick={generateExcel} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Download className="w-4 h-4 mr-2" /> Excel Olarak İndir</button>
                    <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"><Printer className="w-4 h-4 mr-2" /> Yazdır</button>
        </div>
      </div>

             {/* Calculation Unit Selector */}
            <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Hesaplama Birimi:</span>
                <div className="flex rounded-md">
            <button
                        onClick={() => setCalculationUnit('case')}
                        className={`px-4 py-2 rounded-l-md text-sm font-medium transition-colors ${
                            calculationUnit === 'case' 
                            ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                        }`}
                    >
                        Koli (Case)
            </button>
            <button
                        onClick={() => setCalculationUnit('piece')}
                        className={`px-4 py-2 rounded-r-md text-sm font-medium transition-colors ${
                            calculationUnit === 'piece' 
                            ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                        }`}
                    >
                        Adet (Piece)
            </button>
        </div>
      </div>

            {/* Step Indicator */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-b-2 border-blue-500">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                   Adım {currentStep + 1}: {stepTitles[steps[currentStep] as keyof typeof stepTitles]}
                </h2>
          </div>

            {/* Active Step Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm min-h-[400px]">
                {steps[currentStep] === 'invoice' && <InvoiceTab
                    proformaData={proformaData} customer={selectedCustomer}
                    onHeaderChange={handleHeaderChange} onCustomerChange={handleCustomerChange}
                    onItemChange={handleItemChange} onAddItem={addItem} onRemoveItem={removeItem}
                />}
                {steps[currentStep] === 'packing-calculation' && <PackingCalculationTab packingData={packingListCalculations} unit={calculationUnit} />}
                {steps[currentStep] === 'packing-summary' && <PackingSummaryTab proformaData={proformaData} packingData={packingListCalculations} />}
              </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
                <button
                    onClick={goToPrevStep}
                    disabled={currentStep === 0}
                    className="flex items-center px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Geri
                </button>
                
                {currentStep < steps.length - 1 ? (
                    <button
                        onClick={goToNextStep}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        İleri
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                ) : (
                    <button
                        className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Proformayı Kaydet
                    </button>
                )}
            </div>
        </div>
    );
};
// --- Child Components remain the same as the previous correct version ---
// ... (InvoiceTab, PackingCalculationTab, PackingSummaryTab, and helper components)

interface InvoiceTabProps {
    proformaData: Proforma;
    customer: Customer;
    onHeaderChange: (field: keyof Proforma, value: any) => void;
    onCustomerChange: (customerId: string) => void;
    onItemChange: (index: number, updatedValues: Partial<ProformaItem>) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
}

const InvoiceTab: React.FC<InvoiceTabProps> = ({ proformaData, customer, onHeaderChange, onCustomerChange, onItemChange, onAddItem, onRemoveItem }) => {
    return (
    <div className="p-8 space-y-8">
        <div className="text-center"><h2 className="text-3xl font-bold text-gray-900 dark:text-white">INVOICE</h2></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Müşteri Seçimi</h3>
                <select
                    value={proformaData.customerId}
                    onChange={(e) => onCustomerChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                >
                    {mockCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600">
                <p className="font-bold">{customer.name}</p>
                <p className="whitespace-pre-wrap">{customer.address}</p>
                <p>Tel: {customer.phone} | DIČ: {customer.taxId}</p>
              </div>
            </div>
            <div className="space-y-2">
                <InputRow label="Invoice #" value={proformaData.proformaNumber} onChange={(e) => onHeaderChange('proformaNumber', e.target.value)} />
                <InputRow type="date" label="Date" value={proformaData.issueDate} onChange={(e) => onHeaderChange('issueDate', e.target.value)} />
                <InputRow label="Departure" value={proformaData.departure} onChange={(e) => onHeaderChange('departure', e.target.value)} />
                <InputRow label="Delivery" value={proformaData.delivery} onChange={(e) => onHeaderChange('delivery', e.target.value)} />
                <InputRow label="Brand" value={proformaData.brand} onChange={(e) => onHeaderChange('brand', e.target.value)} />
            </div>
          </div>

        <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ürünler (Birim: {proformaData.items[0]?.unit})</h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-yellow-100 dark:bg-yellow-900/20">
                  <tr>
                            <th className="th-cell w-2/5">PRODUCT DESCRIPTION</th>
                            <th className="th-cell w-1/5">QUANTITY</th>
                            <th className="th-cell w-1/5">UNIT PRICE</th>
                            <th className="th-cell w-1/5">TOTAL</th>
                            <th className="th-cell"></th>
                  </tr>
                </thead>
                <tbody>
                        {proformaData.items.map((item, index) => (
                           <tr key={index}>
                               <td className="td-cell">
                                   <select 
                                        value={item.productId} 
                                        onChange={(e) => onItemChange(index, { productId: e.target.value })}
                                        className="w-full p-2 border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0"
                                    >
                                       <option value="">Ürün Seçiniz...</option>
                                       {mockProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                   </select>
                               </td>
                               <td className="td-cell">
                        <input
                          type="number"
                          value={item.quantity}
                                        onChange={(e) => onItemChange(index, { quantity: Number(e.target.value) || 0 })}
                                        className="w-full p-2 border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 text-right"
                        />
                      </td>
                               <td className="td-cell text-right">{item.unitPrice.toFixed(2)}</td>
                               <td className="td-cell text-right font-medium">{item.total.toFixed(2)}</td>
                               <td className="td-cell text-center">
                                   <button onClick={() => onRemoveItem(index)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-yellow-100 dark:bg-yellow-900/20 font-bold">
                            <td colSpan={3} className="td-cell text-right">TOTAL</td>
                            <td className="td-cell text-right">{proformaData.totalAmount.toFixed(2)} €</td>
                            <td className="td-cell"></td>
                  </tr>
                    </tfoot>
              </table>
            </div>
            <button onClick={onAddItem} className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Ürün Ekle</button>
              </div>
            </div>
    );
};

const PackingCalculationTab: React.FC<{ packingData: any[], unit: 'case' | 'piece' }> = ({ packingData, unit }) => {
    return (
    <div className="p-8">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PACKING LIST - HESAPLAMA</h2>
            <p className="text-gray-500">Hesaplama Birimi: <span className="font-semibold uppercase">{unit}</span></p>
        </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead className="bg-yellow-100 dark:bg-yellow-900/20">
                <tr>
                        <th className="th-cell">NO</th>
                        <th className="th-cell">DESCRIPTION OF GOODS (SERIES)</th>
                        <th className="th-cell">TARE Kg/{unit}</th>
                        <th className="th-cell">WEIGHT Kg/{unit}</th>
                        <th className="th-cell">BRUT WEIGHT Kg/{unit}</th>
                        <th className="th-cell">CUP/{unit.toUpperCase()}S</th>
                        <th className="th-cell">TOTAL KG</th>
                        <th className="th-cell">TOTAL TARE</th>
                        <th className="th-cell">BRUT KG</th>
                        <th className="th-cell">ADET/PCS</th>
                </tr>
              </thead>
              <tbody>
                    {packingData.map(row => (
                        <tr key={row.no}>
                            <td className="td-cell text-center">{row.no}</td>
                            <td className="td-cell">{row.description}</td>
                            <td className="td-cell text-right">{row.tare_kg_per_unit.toFixed(3)}</td>
                            <td className="td-cell text-right">{row.net_weight_kg_per_unit.toFixed(3)}</td>
                            <td className="td-cell text-right">{row.brut_weight_kg_per_unit.toFixed(3)}</td>
                            <td className="td-cell text-center">{row.cup_units}</td>
                            <td className="td-cell text-right">{row.total_kg.toFixed(2)}</td>
                            <td className="td-cell text-right">{row.total_tare.toFixed(2)}</td>
                            <td className="td-cell text-right">{row.brut_kg.toFixed(2)}</td>
                            <td className="td-cell text-center">{row.adet_pcs}</td>
                </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-900/50 font-bold">
                        <td colSpan={5} className="td-cell text-right">TOTAL</td>
                        <td className="td-cell text-center">{packingData.reduce((s, r) => s + r.cup_units, 0)}</td>
                        <td className="td-cell text-right">{packingData.reduce((s, r) => s + r.total_kg, 0).toFixed(2)}</td>
                        <td className="td-cell text-right">{packingData.reduce((s, r) => s + r.total_tare, 0).toFixed(2)}</td>
                        <td className="td-cell text-right">{packingData.reduce((s, r) => s + r.brut_kg, 0).toFixed(2)}</td>
                        <td className="td-cell text-center">{packingData.reduce((s, r) => s + r.adet_pcs, 0)}</td>
                </tr>
                </tfoot>
            </table>
        </div>
            </div>
    );
};

const PackingSummaryTab: React.FC<{ proformaData: Proforma, packingData: any[] }> = ({ proformaData, packingData }) => {
    const totalNetKg = packingData.reduce((s, r) => s + r.total_kg, 0);
    const totalGrossKg = packingData.reduce((s, r) => s + r.brut_kg, 0);
    const totalCases = packingData.reduce((s, r) => s + r.cup_units, 0);
    const totalPieces = packingData.reduce((s, r) => s + r.adet_pcs, 0);

    return (
        <div className="p-8">
            <div className="text-center mb-8"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">PACKING LIST - ÖZET</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                     <h3 className="text-lg font-semibold mb-4 border-b pb-2">Ürün Özetleri</h3>
                    {proformaData.items.map((item, index) => {
                        const product = mockProducts.find(p => p.id === item.productId);
                        if (!product) return null;
                        const netWeight = item.quantity * product.net_weight_kg_per_piece * (item.unit === 'case' ? product.piecesPerCase : 1);
                        return (
                             <div key={index} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                 <h4 className="font-bold">{product.name}</h4>
                                 <div className="flex justify-between"><span>Toplam Adet:</span> <span>{item.quantity * (item.unit === 'case' ? product.piecesPerCase : 1)}</span></div>
                                 <div className="flex justify-between"><span>Net Ağırlık:</span> <span>{netWeight.toFixed(2)} kg</span></div>
                    </div>
                        )
                    })}
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Genel Sevkiyat Özeti</h3>
                  <div className="space-y-2">
                        <SummaryRow label="TOTAL NUMBER OF CASES" value={totalCases} />
                        <SummaryRow label="TOTAL NUMBER OF SOAPS AND PRODUCTS" value={totalPieces} />
                        <SummaryRow label="NET KG" value={totalNetKg.toFixed(2)} />
                        <SummaryRow label="GROSS KG" value={totalGrossKg.toFixed(2)} />
                        <SummaryRow label="NUMBER OF PALLETS" value={proformaData.shipment.pallets.length} />
                        {proformaData.shipment.pallets.map(p => (
                            <SummaryRow key={p.pallet_number} label={`PALLET - ${p.pallet_number}`} value={`${p.width_cm}x${p.length_cm}x${p.height_cm}`} />
                        ))}
              </div>
            </div>
          </div>
    </div>
  );
};

const InputRow: React.FC<{ label: string } & React.InputHTMLAttributes<HTMLInputElement>> = ({ label, ...props }) => (
    <div className="flex justify-between items-center text-sm">
        <label className="font-medium text-gray-600 dark:text-gray-400">{label}:</label>
        <input {...props} className="w-2/3 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-right"/>
    </div>
);

const SummaryRow: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between font-medium">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-900 dark:text-white">{value}</span>
    </div>
);

export default ProformaGenerator;