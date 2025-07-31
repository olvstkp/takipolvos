import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, Download, Printer, Package, ArrowLeft, ArrowRight, Check, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { Proforma, ProformaItem, Customer, Product, Pallet } from '../types/proforma';
import { useCustomers, useProducts, useProformaOperations, useProductTypes, useProformaGroups } from '../hooks/useProforma';
import { supabase } from '../lib/supabase';

const initialProformaItem: ProformaItem = { productId: '', description: '', quantity: 1, unitPrice: 0, total: 0, unit: 'case' };

interface ProformaGeneratorProps {
    onSuccess?: () => void;
}

const ProformaGenerator: React.FC<ProformaGeneratorProps> = ({ onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
    const steps = ['invoice', 'packing-calculation', 'packing-summary'];
    const stepTitles = {
        'invoice': 'Invoice Bilgileri',
        'packing-calculation': 'Packing List (Hesaplama)',
        'packing-summary': 'Packing List (Özet)'
    };

    // Supabase hooks
    const { customers, loading: customersLoading, error: customersError } = useCustomers();
    const { products, loading: productsLoading, error: productsError } = useProducts();
    const { productTypes } = useProductTypes();
    const { proformaGroups } = useProformaGroups();
    const { saveProforma, saving } = useProformaOperations();


    const [proformaData, setProformaData] = useState<Proforma>({
        id: `prof_${Date.now()}`,
        proformaNumber: 'Yükleniyor...',
        issueDate: new Date().toISOString().split('T')[0],
        validityDate: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 30);
            return date.toISOString().split('T')[0];
        })(),
        customerId: customers.length > 0 ? customers[0].id : '',
        items: [initialProformaItem],
        totalAmount: 0,
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

    // Fetch next proforma number from Supabase
    const fetchNextProformaNumber = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('proformas')
                .select('proforma_number')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error fetching last proforma number:', error);
                setProformaData(prev => ({ ...prev, proformaNumber: 'PROF-001' }));
                return;
            }

            let nextNumber = 'PROF-001';
            
            if (data && data.length > 0) {
                const lastNumber = data[0].proforma_number;
                // Extract number from format like "PROF-002"
                const match = lastNumber.match(/PROF-(\d+)/);
                if (match) {
                    const currentNum = parseInt(match[1], 10);
                    const nextNum = currentNum + 1;
                    nextNumber = `PROF-${nextNum.toString().padStart(3, '0')}`;
                }
            }

            setProformaData(prev => ({ ...prev, proformaNumber: nextNumber }));
        } catch (error) {
            console.error('Error in fetchNextProformaNumber:', error);
            setProformaData(prev => ({ ...prev, proformaNumber: 'PROF-001' }));
        }
    }, []);

    const goToNextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    const goToPrevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const selectedCustomer = useMemo(() => customers.find(c => c.id === proformaData.customerId), [customers, proformaData.customerId]);

    const updateProforma = useCallback((updateFn: (draft: Proforma) => void) => {
        setProformaData(currentData => {
            const draft = JSON.parse(JSON.stringify(currentData));
            updateFn(draft);
            draft.totalAmount = draft.items.reduce((sum: number, item: ProformaItem) => sum + item.total, 0);
            return draft;
        });
    }, []);

    // Set first customer when customers load and fetch next proforma number
    useEffect(() => {
        if (customers.length > 0 && !proformaData.customerId) {
            const firstCustomer = customers[0];
            updateProforma(draft => {
                draft.customerId = firstCustomer.id;
                draft.delivery = firstCustomer.delivery;
                
                // Set departure based on delivery country
                if (firstCustomer.delivery.toUpperCase().includes('CZECH') || 
                    firstCustomer.delivery.toUpperCase().includes('EUROPE') ||
                    firstCustomer.delivery.toUpperCase().includes('EU')) {
                    draft.departure = 'İzmir-FOB';
                } else if (firstCustomer.delivery.toUpperCase().includes('USA') ||
                          firstCustomer.delivery.toUpperCase().includes('AMERICA')) {
                    draft.departure = 'İzmir-CIF';
                } else if (firstCustomer.delivery.toUpperCase().includes('ASIA') ||
                          firstCustomer.delivery.toUpperCase().includes('CHINA') ||
                          firstCustomer.delivery.toUpperCase().includes('JAPAN')) {
                    draft.departure = 'İzmir-CIF';
                } else {
                    draft.departure = 'İzmir-FOB'; // Default
                }
            });
        }
    }, [customers, proformaData.customerId, updateProforma]);

    // Fetch next proforma number on component mount
    useEffect(() => {
        fetchNextProformaNumber();
    }, [fetchNextProformaNumber]);

    // Excel için grup hesaplamaları
    const calculateGroupedData = () => {
        const groups: Record<string, {
            groupName: string;
            totalCases: number;
            totalPieces: number;
            totalNetWeight: number;
            totalGrossWeight: number;
        }> = {};

        proformaData.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;

            const groupKey = product.proforma_group_id || `ungrouped_${product.id}`;
            const proformaGroup = proformaGroups.find(pg => pg.id === product.proforma_group_id);
            const groupName = proformaGroup?.name || product.name;
            
            const netWeight = item.quantity * product.net_weight_kg_per_piece * (item.unit === 'case' ? product.piecesPerCase : 1);
            
            // Calculate gross weight
            const totalUnits = proformaData.items.reduce((sum, i) => {
                const p = products.find(pr => pr.id === i.productId);
                return p ? sum + i.quantity : sum;
            }, 0);
            
            const totalPalletWeight = proformaData.shipment.pallets.length * proformaData.shipment.weight_per_pallet_kg;
            const palletWeightPerUnit = totalUnits > 0 ? totalPalletWeight / totalUnits : 0;
            const packaging_weight = product.packaging_weight_kg_per_case || 0;
            const tarePerUnit = packaging_weight + palletWeightPerUnit;
            const grossWeight = netWeight + (item.quantity * tarePerUnit);

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupName,
                    totalCases: 0,
                    totalPieces: 0,
                    totalNetWeight: 0,
                    totalGrossWeight: 0
                };
            }

            groups[groupKey].totalCases += item.unit === 'case' ? item.quantity : 0;
            groups[groupKey].totalPieces += item.quantity * (item.unit === 'case' ? product.piecesPerCase : 1);
            groups[groupKey].totalNetWeight += netWeight;
            groups[groupKey].totalGrossWeight += grossWeight;
        });

        return groups;
    };

    const calculateTotals = (groupedData: any) => {
        const groups = Object.values(groupedData);
        return {
            totalCases: groups.reduce((sum: number, group: any) => sum + group.totalCases, 0),
            totalPieces: groups.reduce((sum: number, group: any) => sum + group.totalPieces, 0),
            totalNetKg: groups.reduce((sum: number, group: any) => sum + group.totalNetWeight, 0),
            totalGrossKg: groups.reduce((sum: number, group: any) => sum + group.totalGrossWeight, 0)
        };
    };

    const generateExcel = async () => {
        if (!selectedCustomer) return;

        toast.loading('Excel dosyası oluşturuluyor...');

        try {
            const workbook = new ExcelJS.Workbook();
            
            // SERILERIN RENK PALETİ
            const seriesColors = [
                'FFFFE066', 'FF90EE90', 'FFADD8E6', 'FFFFC0CB', 'FFFFD700',
                'FFFF6347', 'FF98FB98', 'FFBA55D3', 'FF87CEEB', 'FFFFE4E1'
            ];

            // Seri-renk haritası oluştur
            const seriesColorMap = new Map();
            const usedSeries = new Set();
            proformaData.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product?.series) {
                    usedSeries.add(product.series);
                }
            });
            
            let colorIndex = 0;
            usedSeries.forEach(seriesId => {
                seriesColorMap.set(seriesId, seriesColors[colorIndex % seriesColors.length]);
                colorIndex++;
            });

            // Grup hesaplamaları Excel için
            const excelGroupedData = calculateGroupedData();
            const excelTotals = calculateTotals(excelGroupedData);

            await createProformaSheet(workbook, seriesColorMap);
            await createCalismaSheet(workbook, excelGroupedData, excelTotals);
            await createPackingListSheet(workbook, seriesColorMap);

            // Excel dosyasını kaydet
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${proformaData.proformaNumber}-Styled.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);

            toast.dismiss();
            toast.success('Excel dosyası başarıyla oluşturuldu!');

        } catch (error) {
            toast.dismiss();
            toast.error('Excel dosyası oluşturulurken hata oluştu: ' + error);
            console.error('Excel generation error:', error);
        }
    };

    // PROFORMA Sheet oluştur
    const createProformaSheet = async (workbook: any, seriesColorMap: Map<string, string>) => {
        const proformaSheet = workbook.addWorksheet('PROFORMA');
        
        // Sütun genişlikleri
        proformaSheet.columns = [
            { key: 'A', width: 15 }, { key: 'B', width: 20 }, { key: 'C', width: 25 },
            { key: 'D', width: 15 }, { key: 'E', width: 15 }, { key: 'F', width: 15 }, { key: 'G', width: 15 }
        ];

        // DASPI Logo ve Başlık
        proformaSheet.mergeCells('A1:C4');
        const logoCell = proformaSheet.getCell('A1');
        logoCell.value = 'daspi\nAMERİKAN GIDA TİC. A.Ş.';
        logoCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF000080' } };
        logoCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        logoCell.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };

        // Şirket Bilgileri
        proformaSheet.getCell('A5').value = 'DUATEPE MAH.YENİTABAKHANE CAD.OLİVOS APT NO:2';
        proformaSheet.getCell('A6').value = 'TİRE / İZMİR';
        proformaSheet.getCell('A7').value = 'TEL: 0266 3921356';

        // INVOICE Başlığı
        proformaSheet.mergeCells('F1:G1');
        const invoiceHeader = proformaSheet.getCell('F1');
        invoiceHeader.value = 'INVOICE';
        invoiceHeader.font = { name: 'Arial', size: 20, bold: true };
        invoiceHeader.alignment = { horizontal: 'center', vertical: 'middle' };

        // Tarih ve İnvoice No
        proformaSheet.getCell('F2').value = new Date().toLocaleDateString('tr-TR');
        proformaSheet.getCell('F3').value = `(CV.22 06.25)`;

        // Müşteri Bilgileri
        proformaSheet.getCell('A9').value = 'Ship To:';
        proformaSheet.getCell('B9').value = selectedCustomer?.name;
        proformaSheet.getCell('A10').value = 'Address';
        proformaSheet.getCell('B10').value = selectedCustomer?.address;

        // Müşteri detayları
        proformaSheet.getCell('C11').value = `BERLIN S.R.O.`;
        proformaSheet.getCell('C12').value = `Věšínova 2720/10, Mariánské Hory, 709 00 Ostrava, CZECHIA`;
        proformaSheet.getCell('C13').value = `tel.: +420 775 344 348  +420 772 548 796`;
        proformaSheet.getCell('C14').value = `IČ: 08351711`;
        proformaSheet.getCell('C15').value = `DIČ: CZ08351711`;

        // Başlık Satırı
        const headerRow = 17;
        const headers = ['CONTACT', 'INVOICE NUMBER', 'DEPARTURE', 'DELIVERY', 'BRAND', 'ETA'];
        headers.forEach((header, index) => {
            const cell = proformaSheet.getCell(headerRow, index + 1);
            cell.value = header;
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });

        // Başlık Değerleri
        const headerValues = [
            selectedCustomer?.contactPerson || 'BERLIN Č.OME',
            proformaData.proformaNumber,
            proformaData.departure,
            proformaData.delivery,
            proformaData.brand,
            ''
        ];
        headerValues.forEach((value, index) => {
            const cell = proformaSheet.getCell(headerRow + 1, index + 1);
            cell.value = value;
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });

        // Ürün Tablosu Başlıkları
        const productHeaderRow = 20;
        const productHeaders = ['QUANTITY/CASE', 'PRODUCT DESCRIPTION', 'UNIT PRICE (EURO)', 'TOTAL AMOUNT (EURO)'];
        productHeaders.forEach((header, index) => {
            const cell = proformaSheet.getCell(productHeaderRow, index + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Ürün Verileri
        let currentRow = productHeaderRow + 1;
        proformaData.items.forEach((item) => {
            const product = products.find(p => p.id === item.productId);
            const seriesColor = product?.series ? seriesColorMap.get(product.series) : 'FFFFFFFF';

            // Ürün satırı
            const row = [
                item.quantity,
                item.description,
                item.unitPrice.toFixed(2),
                item.total.toFixed(2)
            ];

            row.forEach((value, colIndex) => {
                const cell = proformaSheet.getCell(currentRow, colIndex + 1);
                cell.value = value;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: seriesColor } };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                if (colIndex > 1) {
                    cell.alignment = { horizontal: 'right' };
                }
            });
            currentRow++;
        });

        // "NO COMMERCIAL VALUE" Satırları
        for (let i = 0; i < 3; i++) {
            ['', 'NO COMMERCIAL VALUE', 'NO COMMERCIAL VALUE', 'NO COMMERCIAL VALUE'].forEach((value, colIndex) => {
                const cell = proformaSheet.getCell(currentRow, colIndex + 1);
                cell.value = value;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });
            currentRow++;
        }

        // TOTAL Satırı
        ['', '', 'TOTAL', proformaData.totalAmount.toFixed(2)].forEach((value, colIndex) => {
            const cell = proformaSheet.getCell(currentRow, colIndex + 1);
            cell.value = value;
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
            cell.border = {
                top: { style: 'thick' }, left: { style: 'thin' },
                bottom: { style: 'thick' }, right: { style: 'thin' }
            };
            if (colIndex > 1) {
                cell.alignment = { horizontal: 'right' };
            }
        });
    };

    // ÇALIŞMA Sheet oluştur
    const createCalismaSheet = async (workbook: any, groupedData: any, totals: any) => {
        const calismaSheet = workbook.addWorksheet('ÇALIŞMA');
        
        calismaSheet.columns = [
            { key: 'A', width: 40 },
            { key: 'B', width: 15 }
        ];

        let calismaRow = 1;
        Object.entries(groupedData).forEach(([, group]: [string, any]) => {
            const groupName = group.groupName;
            // Grup başlığı
            calismaSheet.getCell(calismaRow, 1).value = groupName;
            calismaSheet.getCell(calismaRow, 1).font = { bold: true, size: 12 };
            calismaSheet.getCell(calismaRow, 1).fill = { 
                type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } 
            };
            calismaRow += 2;

            // Grup detayları
            calismaSheet.getCell(calismaRow, 1).value = 'Total Number of Cases';
            calismaSheet.getCell(calismaRow, 2).value = group.totalCases;
            calismaRow++;

            calismaSheet.getCell(calismaRow, 1).value = `Total number of ${groupName.toLowerCase()}`;
            calismaSheet.getCell(calismaRow, 2).value = group.totalPieces;
            calismaRow++;

            calismaSheet.getCell(calismaRow, 1).value = 'Net Weight';
            calismaSheet.getCell(calismaRow, 2).value = group.totalNetWeight.toFixed(2);
            calismaRow++;

            calismaSheet.getCell(calismaRow, 1).value = 'Gross Weight';
            calismaSheet.getCell(calismaRow, 2).value = group.totalGrossWeight.toFixed(2);
            calismaRow += 3;
        });

        // Genel toplamlar
        calismaSheet.getCell(calismaRow, 1).value = 'TOTAL NUMBER OF CASES';
        calismaSheet.getCell(calismaRow, 2).value = totals.totalCases;
        calismaSheet.getCell(calismaRow, 1).font = { bold: true };
        calismaRow++;

        calismaSheet.getCell(calismaRow, 1).value = 'TOTAL NUMBER OF SOAPS AND PRODUCTS';
        calismaSheet.getCell(calismaRow, 2).value = totals.totalPieces;
        calismaSheet.getCell(calismaRow, 1).font = { bold: true };
        calismaRow++;

        calismaSheet.getCell(calismaRow, 1).value = 'NET KG';
        calismaSheet.getCell(calismaRow, 2).value = totals.totalNetKg.toFixed(2);
        calismaSheet.getCell(calismaRow, 1).font = { bold: true };
        calismaRow++;

        calismaSheet.getCell(calismaRow, 1).value = 'GROSS KG';
        calismaSheet.getCell(calismaRow, 2).value = totals.totalGrossKg.toFixed(2);
        calismaSheet.getCell(calismaRow, 1).font = { bold: true };
    };

    // PACKING LIST Sheet oluştur
    const createPackingListSheet = async (workbook: any, seriesColorMap: Map<string, string>) => {
        const packingSheet = workbook.addWorksheet('PACKING LIST');

        // Sütun genişlikleri
        packingSheet.columns = [
            { key: 'A', width: 5 },   // NO
            { key: 'B', width: 25 },  // DESCRIPTION
            { key: 'C', width: 12 },  // out pack
            { key: 'D', width: 8 },   // width
            { key: 'E', width: 8 },   // height
            { key: 'F', width: 8 },   // high
            { key: 'G', width: 8 },   // M3
            { key: 'H', width: 8 },   // TARE
            { key: 'I', width: 10 },  // WEIGHT
            { key: 'J', width: 10 },  // BRUT WEIGHT
            { key: 'K', width: 8 },   // cup
            { key: 'L', width: 10 },  // TOTAL KG
            { key: 'M', width: 10 },  // TOTAL TARE
            { key: 'N', width: 10 },  // BRÜT KG
            { key: 'O', width: 10 }   // ADET/PCS
        ];

        // Olivos Logo ve Başlık
        packingSheet.mergeCells('A1:D8');
        const olivosLogo = packingSheet.getCell('A1');
        olivosLogo.value = 'Olivos\nOLİVOS PAZARLAMA İÇ VE DIŞ TİCARET LTD ŞTİ.\nALİ ÇETİNKAYA BULVARI, NO:2\nKAT:5 ALSANCAK/İZMİR\nPHONE: +90 232 422 24 21\nFAX: +90 232 464 32 19';
        olivosLogo.font = { name: 'Arial', size: 10, bold: true };
        olivosLogo.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        olivosLogo.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };

        // PACKING LIST Başlığı
        packingSheet.mergeCells('F10:I10');
        const packingHeader = packingSheet.getCell('F10');
        packingHeader.value = 'PACKING LIST';
        packingHeader.font = { name: 'Arial', size: 16, bold: true };
        packingHeader.alignment = { horizontal: 'center', vertical: 'middle' };

        // Packing List Tablosu Başlıkları
        const packingHeaderRow = 12;
        const packingHeaders = [
            'NO', 'DESCRIPTION OF GOODS', 'out pack sizes (box)', 
            'width/cm', 'height/cm', 'high/cm', 'M3', 'TARE', 'WEIGHT', 'BRUT WEIGHT', 'cup', 'TOTAL KG', 'TOTAL TARE', 'BRÜT KG', 'ADET/PCS'
        ];

        // Başlık alt başlıkları
        packingSheet.getCell(packingHeaderRow + 1, 8).value = 'KG';  // TARE
        packingSheet.getCell(packingHeaderRow + 1, 9).value = 'Kg/box';  // WEIGHT
        packingSheet.getCell(packingHeaderRow + 1, 10).value = 'Kg/box';  // BRUT WEIGHT
        packingSheet.getCell(packingHeaderRow + 1, 11).value = '/CASES';  // cup

        packingHeaders.forEach((header, index) => {
            const cell = packingSheet.getCell(packingHeaderRow, index + 1);
            cell.value = header;
            cell.font = { bold: true, size: 9 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });

        // Alt başlıkları da stilize et
        [8, 9, 10, 11].forEach(colIndex => {
            const cell = packingSheet.getCell(packingHeaderRow + 1, colIndex);
            cell.font = { bold: true, size: 8 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Packing List Verileri
        let packingDataRow = packingHeaderRow + 2;
        packingListCalculations.forEach((calc) => {
            // Find the first product that matches this series/description
            const seriesProduct = proformaData.items.find(item => {
                const product = products.find(p => p.id === item.productId);
                return product && product.series === calc.description;
            });
            
            const product = seriesProduct ? products.find(p => p.id === seriesProduct.productId) : null;
            const seriesColor = product?.series ? seriesColorMap.get(product.series) : 'FFFFFFFF';

            const rowData = [
                calc.no,
                calc.description,
                '', // out pack sizes
                product?.width_cm || '',
                product?.height_cm || '',
                product?.depth_cm || '',
                '', // M3 - hesaplanacak
                calc.tare_kg_per_unit.toFixed(3),
                calc.net_weight_kg_per_unit.toFixed(3),
                calc.brut_weight_kg_per_unit.toFixed(3),
                calc.cup_units,
                calc.total_kg.toFixed(2),
                calc.total_tare.toFixed(2),
                calc.brut_kg.toFixed(2),
                calc.adet_pcs
            ];

            rowData.forEach((value, colIndex) => {
                const cell = packingSheet.getCell(packingDataRow, colIndex + 1);
                cell.value = value;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: seriesColor } };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (typeof value === 'number' && colIndex > 6) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                }
            });
            packingDataRow++;
        });

        // Toplam satırı
        const totalRowData = [
            '', '', '', '', '', '', '',
            packingListCalculations.reduce((sum, calc) => sum + calc.tare_kg_per_unit, 0).toFixed(3),
            packingListCalculations.reduce((sum, calc) => sum + calc.net_weight_kg_per_unit, 0).toFixed(3),
            '',
            packingListCalculations.reduce((sum, calc) => sum + calc.cup_units, 0),
            packingListCalculations.reduce((sum, calc) => sum + calc.total_kg, 0).toFixed(2),
            packingListCalculations.reduce((sum, calc) => sum + calc.total_tare, 0).toFixed(2),
            packingListCalculations.reduce((sum, calc) => sum + calc.brut_kg, 0).toFixed(2),
            packingListCalculations.reduce((sum, calc) => sum + calc.adet_pcs, 0)
        ];

        totalRowData.forEach((value, colIndex) => {
            const cell = packingSheet.getCell(packingDataRow, colIndex + 1);
            cell.value = value;
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
            cell.border = {
                top: { style: 'thick' }, left: { style: 'thin' },
                bottom: { style: 'thick' }, right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (typeof value === 'number' || (typeof value === 'string' && value.includes('.'))) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
            }
        });

        // Net weight ve gross weight toplam bilgileri (ekstra kısım)
        const summaryStartRow = packingDataRow + 3;
        packingSheet.getCell(summaryStartRow, 1).value = 'TOTAL NUMBER OF CASES AND PRODUCTS';
        packingSheet.getCell(summaryStartRow + 1, 1).value = 'NET WEIGHT/GROSS WEIGHT';
        packingSheet.getCell(summaryStartRow + 2, 1).value = 'NUMBER OF PALLETS';
        
        packingSheet.getCell(summaryStartRow, 2).value = totalRowData[14]; // total pieces
        packingSheet.getCell(summaryStartRow + 1, 2).value = `${totalRowData[11]}/${totalRowData[13]}`;
        packingSheet.getCell(summaryStartRow + 2, 2).value = proformaData.shipment.pallets.length;

        // Pallet bilgileri
        proformaData.shipment.pallets.forEach((pallet, index) => {
            packingSheet.getCell(summaryStartRow + 3 + index, 1).value = `WIDTHXLENGTHXHEIGHT`;
            packingSheet.getCell(summaryStartRow + 3 + index, 2).value = `${pallet.width_cm}x${pallet.length_cm}x${pallet.height_cm}`;
            packingSheet.getCell(summaryStartRow + 3 + index, 3).value = `PALLET - ${index + 1}`;
        });
    };

    // Update all item prices when currency changes
    useEffect(() => {
        updateProforma(draft => {
            draft.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    // Select price based on currency and unit
                    if (currency === 'EUR') {
                        item.unitPrice = item.unit === 'case' ? product.pricePerCase : product.pricePerPiece;
                    } else {
                        item.unitPrice = item.unit === 'case' ? (product.pricePerCaseUsd || product.pricePerCase * 1.08) : (product.pricePerPieceUsd || product.pricePerPiece * 1.08);
                    }
                    item.total = item.quantity * item.unitPrice;
                }
            });
        });
    }, [currency, products, updateProforma]);

    const handleHeaderChange = (field: keyof Proforma, value: any) => { updateProforma(draft => { (draft as any)[field] = value; }); };
    
    const handleCustomerChange = (customerId: string) => { 
        updateProforma(draft => { 
            draft.customerId = customerId;
            
            // Update delivery and departure based on selected customer
            const selectedCustomer = customers.find(c => c.id === customerId);
            if (selectedCustomer) {
                draft.delivery = selectedCustomer.delivery;
                
                // Set departure based on delivery country
                if (selectedCustomer.delivery.toUpperCase().includes('CZECH') || 
                    selectedCustomer.delivery.toUpperCase().includes('EUROPE') ||
                    selectedCustomer.delivery.toUpperCase().includes('EU')) {
                    draft.departure = 'İzmir-FOB';
                } else if (selectedCustomer.delivery.toUpperCase().includes('USA') ||
                          selectedCustomer.delivery.toUpperCase().includes('AMERICA')) {
                    draft.departure = 'İzmir-CIF';
                } else if (selectedCustomer.delivery.toUpperCase().includes('ASIA') ||
                          selectedCustomer.delivery.toUpperCase().includes('CHINA') ||
                          selectedCustomer.delivery.toUpperCase().includes('JAPAN')) {
                    draft.departure = 'İzmir-CIF';
                } else {
                    draft.departure = 'İzmir-FOB'; // Default
                }
            }
        }); 
    };
    const handleItemChange = (index: number, updatedValues: Partial<ProformaItem>) => {
        updateProforma(draft => {
            const currentItem = { ...draft.items[index], ...updatedValues };
            
            // If product changed, update description and price
            if ('productId' in updatedValues && updatedValues.productId) {
                const product = products.find(p => p.id === updatedValues.productId);
                if (product) {
                    currentItem.description = product.name;
                    // Select price based on currency and unit
                    if (currency === 'EUR') {
                        currentItem.unitPrice = currentItem.unit === 'case' ? product.pricePerCase : product.pricePerPiece;
                    } else {
                        currentItem.unitPrice = currentItem.unit === 'case' ? (product.pricePerCaseUsd || product.pricePerCase * 1.08) : (product.pricePerPieceUsd || product.pricePerPiece * 1.08);
                    }
                }
            }
            
            // If unit changed, update price
            if ('unit' in updatedValues && currentItem.productId) {
                const product = products.find(p => p.id === currentItem.productId);
                if (product) {
                    // Select price based on currency and unit
                    if (currency === 'EUR') {
                        currentItem.unitPrice = currentItem.unit === 'case' ? product.pricePerCase : product.pricePerPiece;
                    } else {
                        currentItem.unitPrice = currentItem.unit === 'case' ? (product.pricePerCaseUsd || product.pricePerCase * 1.08) : (product.pricePerPieceUsd || product.pricePerPiece * 1.08);
                }
            }
            }
            
            currentItem.total = currentItem.quantity * currentItem.unitPrice;
            draft.items[index] = currentItem;
    });
  };
    const addItem = () => { updateProforma(draft => { draft.items.push({ ...initialProformaItem, unit: 'case' }); }); };
    const removeItem = (index: number) => { updateProforma(draft => { draft.items.splice(index, 1); }); };
    
    // Pallet management functions
    const addPallet = () => {
        updateProforma(draft => {
            const newPalletNumber = draft.shipment.pallets.length + 1;
            draft.shipment.pallets.push({
                pallet_number: newPalletNumber,
                width_cm: 80,
                length_cm: 120,
                height_cm: 124
            });
        });
    };

    const removePallet = (index: number) => {
        updateProforma(draft => {
            draft.shipment.pallets.splice(index, 1);
            // Renumber remaining pallets
            draft.shipment.pallets.forEach((pallet, i) => {
                pallet.pallet_number = i + 1;
            });
        });
    };

    const updatePallet = (index: number, field: keyof Pallet, value: number) => {
        updateProforma(draft => {
            (draft.shipment.pallets[index] as any)[field] = value;
        });
    };
    
    // Packing list calculations
     const packingListCalculations = useMemo(() => {
        const groupedBySeries = proformaData.items.reduce((acc, item) => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return acc;

            const isPromo = product.series === 'PROMO';
            const groupKey = isPromo ? product.id : product.series; // Use product ID to keep promo items separate
            const description = isPromo ? `${product.name} - FREE` : product.series;

            if (!acc[groupKey]) {
                 acc[groupKey] = { products: [], totalQuantity: 0, net_weight_kg_per_unit: 0, packaging_weight_kg_per_case: 0, description: description };
            }

            acc[groupKey].products.push(product);
            acc[groupKey].totalQuantity += item.quantity;
            acc[groupKey].net_weight_kg_per_unit = product.net_weight_kg_per_piece * (item.unit === 'case' ? product.piecesPerCase : 1);
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
    }, [proformaData.items, proformaData.shipment, products]);

    const handleSaveProforma = async () => {
        const toastId = toast.loading('Proforma kaydediliyor...', {
            icon: '⏳'
        });

        try {
            await saveProforma(proformaData);
            
            toast.success('Proforma başarıyla kaydedildi!', {
                id: toastId,
                icon: '✅',
                duration: 3000
            });
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast.error('Proforma kaydedilirken hata oluştu!', {
                id: toastId,
                icon: '❌',
                duration: 5000
            });
        }
    };

    // Loading states
    if (customersLoading || productsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Veriler yükleniyor...</p>
                </div>
            </div>
        );
    }

    // Error states
    if (customersError || productsError) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proforma Oluşturucu - Hata</h1>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong className="font-bold">Veritabanı Hatası!</strong>
                    <p className="mt-2">Müşteriler: {customersError}</p>
                    <p className="mt-2">Ürünler: {productsError}</p>
                    <p className="mt-4 text-sm">Sayfayı yenileyin veya yöneticiye başvurun.</p>
                </div>
            </div>
        );
    }

    if (!selectedCustomer && customers.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proforma Oluşturucu - Müşteri Bulunamadı</h1>
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <p>Müşteri bulunamadı. Lütfen önce müşteri ekleyin.</p>
                    <p className="text-sm mt-2">Veritabanında {customers.length} müşteri var.</p>
                </div>
            </div>
        );
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

            {/* Currency Selector */}
            <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Para Birimi:</span>
                <div className="flex rounded-md">
            <button
                        onClick={() => setCurrency('EUR')}
                        className={`px-4 py-2 rounded-l-md text-sm font-medium transition-colors ${
                            currency === 'EUR' 
                            ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                        }`}
                    >
                        💶 Euro (EUR)
            </button>
            <button
                        onClick={() => setCurrency('USD')}
                        className={`px-4 py-2 rounded-r-md text-sm font-medium transition-colors ${
                            currency === 'USD' 
                            ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                        }`}
                    >
                        💵 Dolar (USD)
            </button>
        </div>
                <span className="text-sm text-gray-500">
                    Tüm fiyatlar {currency} cinsinden gösterilecek
                </span>
      </div>

            {/* Step Indicator */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-b-2 border-blue-500">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                   Adım {currentStep + 1}: {stepTitles[steps[currentStep] as keyof typeof stepTitles]}
                </h2>
          </div>

            {/* Active Step Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm min-h-[400px]">
                {steps[currentStep] === 'invoice' && selectedCustomer && <InvoiceTab
                    proformaData={proformaData} customer={selectedCustomer} customers={customers} products={products}
                    currency={currency}
                    onHeaderChange={handleHeaderChange} onCustomerChange={handleCustomerChange}
                    onItemChange={handleItemChange} onAddItem={addItem} onRemoveItem={removeItem}
                    onAddPallet={addPallet} onRemovePallet={removePallet} onUpdatePallet={updatePallet}
                />}
                {steps[currentStep] === 'packing-calculation' && <PackingCalculationTab packingData={packingListCalculations} />}
                {steps[currentStep] === 'packing-summary' && <PackingSummaryTab proformaData={proformaData} packingData={packingListCalculations} products={products} productTypes={productTypes} proformaGroups={proformaGroups} />}
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
                        onClick={handleSaveProforma}
                        disabled={saving}
                        className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        {saving ? 'Kaydediliyor...' : 'Proformayı Kaydet'}
                    </button>
                )}
            </div>
        </div>
    );
};

// Child components
interface InvoiceTabProps {
    proformaData: Proforma;
    customer: Customer;
    customers: Customer[];
    products: Product[];
    currency: 'EUR' | 'USD';
    onHeaderChange: (field: keyof Proforma, value: any) => void;
    onCustomerChange: (customerId: string) => void;
    onItemChange: (index: number, updatedValues: Partial<ProformaItem>) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    onAddPallet: () => void;
    onRemovePallet: (index: number) => void;
    onUpdatePallet: (index: number, field: keyof Pallet, value: number) => void;
}

const InvoiceTab: React.FC<InvoiceTabProps> = ({ proformaData, customer, customers, products, currency, onHeaderChange, onCustomerChange, onItemChange, onAddItem, onRemoveItem, onAddPallet, onRemovePallet, onUpdatePallet }) => {
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
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ürünler</h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-yellow-100 dark:bg-yellow-900/20">
                  <tr>
                            <th className="th-cell w-2/6">PRODUCT DESCRIPTION</th>
                            <th className="th-cell w-1/6">QUANTITY</th>
                            <th className="th-cell w-1/6">UNIT</th>
                            <th className="th-cell w-1/6">UNIT PRICE ({currency})</th>
                            <th className="th-cell w-1/6">TOTAL ({currency})</th>
                            <th className="th-cell"></th>
                  </tr>
                </thead>
                <tbody>
                        {proformaData.items.map((item, index) => (
                           <tr key={index}>
                               <td className="td-cell">
                                   <ProductSelector
                                       products={products}
                                       selectedProductId={item.productId}
                                       onProductSelect={(productId) => onItemChange(index, { productId })}
                                   />
                               </td>
                               <td className="td-cell">
                        <input
                          type="number"
                          value={item.quantity}
                                        onChange={(e) => onItemChange(index, { quantity: Number(e.target.value) || 0 })}
                                        className="w-full p-2 border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 text-right"
                        />
                      </td>
                               <td className="td-cell">
                                   <select
                                       value={item.unit}
                                       onChange={(e) => onItemChange(index, { unit: e.target.value as 'case' | 'piece' })}
                                       className="w-full p-2 border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0"
                                   >
                                       <option value="case">Koli</option>
                                       <option value="piece">Adet</option>
                                   </select>
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
                            <td colSpan={4} className="td-cell text-right">TOTAL</td>
                            <td className="td-cell text-right">{proformaData.totalAmount.toFixed(2)} {currency}</td>
                            <td className="td-cell"></td>
                  </tr>
                    </tfoot>
              </table>
            </div>
            <button onClick={onAddItem} className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Ürün Ekle</button>
              </div>

            {/* Pallet Management Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Paletler</h3>
                    <button onClick={onAddPallet} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" /> Palet Ekle
                    </button>
                </div>
                
                <div className="space-y-4">
                    {proformaData.shipment.pallets.map((pallet, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="flex items-center space-x-2">
                                <Package className="w-5 h-5 text-green-600" />
                                <span className="font-medium text-gray-900 dark:text-white">Palet {pallet.pallet_number}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400">Genişlik:</label>
                                <input
                                    type="number"
                                    value={pallet.width_cm}
                                    onChange={(e) => onUpdatePallet(index, 'width_cm', Number(e.target.value))}
                                    className="w-20 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-center"
                                />
                                <span className="text-sm text-gray-500">cm</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400">Uzunluk:</label>
                                <input
                                    type="number"
                                    value={pallet.length_cm}
                                    onChange={(e) => onUpdatePallet(index, 'length_cm', Number(e.target.value))}
                                    className="w-20 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-center"
                                />
                                <span className="text-sm text-gray-500">cm</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400">Yükseklik:</label>
                                <input
                                    type="number"
                                    value={pallet.height_cm}
                                    onChange={(e) => onUpdatePallet(index, 'height_cm', Number(e.target.value))}
                                    className="w-20 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-center"
                                />
                                <span className="text-sm text-gray-500">cm</span>
                            </div>
                            
                            <button 
                                onClick={() => onRemovePallet(index)}
                                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-md"
                                disabled={proformaData.shipment.pallets.length === 1}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Toplam Palet Sayısı:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{proformaData.shipment.pallets.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Palet Başına Ağırlık:</span>
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                step="0.1"
                                value={proformaData.shipment.weight_per_pallet_kg}
                                onChange={(e) => onHeaderChange('shipment', { ...proformaData.shipment, weight_per_pallet_kg: Number(e.target.value) })}
                                className="w-20 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-center"
                            />
                            <span className="text-gray-500">kg</span>
                        </div>
                    </div>
                </div>
              </div>
            </div>
    );
};

const PackingCalculationTab: React.FC<{ packingData: any[] }> = ({ packingData }) => {
    return (
    <div className="p-8">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PACKING LIST - HESAPLAMA</h2>
            <p className="text-gray-500">Karışık Birimler (Koli/Adet)</p>
        </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead className="bg-yellow-100 dark:bg-yellow-900/20">
                <tr>
                        <th className="th-cell">NO</th>
                        <th className="th-cell">DESCRIPTION OF GOODS (SERIES)</th>
                        <th className="th-cell">TARE Kg/unit</th>
                        <th className="th-cell">WEIGHT Kg/unit</th>
                        <th className="th-cell">BRUT WEIGHT Kg/unit</th>
                        <th className="th-cell">CUP/UNITS</th>
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

const PackingSummaryTab: React.FC<{ proformaData: Proforma, packingData: any[], products: Product[], productTypes: any[], proformaGroups: any[] }> = ({ proformaData, products, productTypes, proformaGroups }) => {

    // Format product name for packing list
    const formatProductName = (product: Product) => {
        const proformaGroup = proformaGroups.find(pg => pg.id === product.proforma_group_id);
        
        if (proformaGroup) {
            return proformaGroup.name; // Already formatted like "OLIVE OIL SHOWER GEL 750ML"
        }
        
        // Fallback to old logic for products without proforma group
        const productType = productTypes.find(pt => pt.id === product.product_type_id);
        const packingName = productType?.packing_list_name || 'SOAP';
        const size = product.size_value || 100;
        const unit = product.size_unit || 'G';
        
        return `OLIVE OIL ${packingName} ${size}${unit}`;
    };

    // Group items by proforma group for summary
    const groupedByProformaGroup = useMemo(() => {
        const groups: Record<string, {
            groupName: string;
            totalCases: number;
            totalPieces: number;
            totalNetWeight: number;
            totalGrossWeight: number;
            items: Array<{
                item: ProformaItem;
                product: Product;
                netWeight: number;
                grossWeight: number;
            }>;
        }> = {};

        proformaData.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;

            // Aynı proforma grubundaki ürünleri birleştirmek için sadece group_id kullan
            const groupKey = product.proforma_group_id || `ungrouped_${product.id}`;
            const groupName = formatProductName(product);
            

            
            const netWeight = item.quantity * product.net_weight_kg_per_piece * (item.unit === 'case' ? product.piecesPerCase : 1);
            
            // Calculate gross weight using the same logic as packing calculations
            const totalUnits = proformaData.items.reduce((sum, i) => {
                const p = products.find(pr => pr.id === i.productId);
                return p ? sum + i.quantity : sum;
            }, 0);
            
            const totalPalletWeight = proformaData.shipment.pallets.length * proformaData.shipment.weight_per_pallet_kg;
            const palletWeightPerUnit = totalUnits > 0 ? totalPalletWeight / totalUnits : 0;
            const packaging_weight = product.packaging_weight_kg_per_case || 0;
            const tarePerUnit = packaging_weight + palletWeightPerUnit;
            const grossWeight = netWeight + (item.quantity * tarePerUnit);

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupName,
                    totalCases: 0,
                    totalPieces: 0,
                    totalNetWeight: 0,
                    totalGrossWeight: 0,
                    items: []
                };
            }

            groups[groupKey].totalCases += item.unit === 'case' ? item.quantity : 0;
            groups[groupKey].totalPieces += item.quantity * (item.unit === 'case' ? product.piecesPerCase : 1);
            groups[groupKey].totalNetWeight += netWeight;
            groups[groupKey].totalGrossWeight += grossWeight;
            groups[groupKey].items.push({
                item,
                product,
                netWeight,
                grossWeight
            });
        });

        return groups;
    }, [proformaData.items, products, proformaGroups, proformaData.shipment]);

    // Calculate totals from grouped data
    const groupedTotals = useMemo(() => {
        const groups = Object.values(groupedByProformaGroup);
        return {
            totalCases: groups.reduce((sum, group) => sum + group.totalCases, 0),
            totalPieces: groups.reduce((sum, group) => sum + group.totalPieces, 0),
            totalNetKg: groups.reduce((sum, group) => sum + group.totalNetWeight, 0),
            totalGrossKg: groups.reduce((sum, group) => sum + group.totalGrossWeight, 0)
        };
    }, [groupedByProformaGroup]);

    return (
        <div className="p-8">
            <div className="text-center mb-8"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">PACKING LIST - ÖZET</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                     <h3 className="text-lg font-semibold mb-4 border-b pb-2">Ürün Özetleri</h3>
                    {Object.values(groupedByProformaGroup).map((group, index) => {
                        return (
                             <div key={index} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                 <h4 className="font-bold text-blue-600 dark:text-blue-400">{group.groupName}</h4>
                                 <div className="flex justify-between text-sm mt-2"><span>Total Number of Cases:</span> <span className="font-medium">{group.totalCases}</span></div>
                                 <div className="flex justify-between text-sm"><span>Total number of {group.groupName.toLowerCase()}:</span> <span className="font-medium">{group.totalPieces}</span></div>
                                 <div className="flex justify-between text-sm"><span>Net Weight:</span> <span className="font-medium">{group.totalNetWeight.toFixed(2)} kg</span></div>
                                 <div className="flex justify-between text-sm"><span>Gross Weight:</span> <span className="font-medium text-green-600">{group.totalGrossWeight.toFixed(2)} kg</span></div>
                    </div>
                        )
                    })}
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Genel Sevkiyat Özeti</h3>
                  <div className="space-y-2">
                        <SummaryRow label="TOTAL NUMBER OF CASES" value={groupedTotals.totalCases} />
                        <SummaryRow label="TOTAL NUMBER OF SOAPS AND PRODUCTS" value={groupedTotals.totalPieces} />
                        <SummaryRow label="NET KG" value={groupedTotals.totalNetKg.toFixed(2)} />
                        <SummaryRow label="GROSS KG" value={groupedTotals.totalGrossKg.toFixed(2)} />
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

// Product Selector Component with Modal Dialog
interface ProductSelectorProps {
    products: Product[];
    selectedProductId: string;
    onProductSelect: (productId: string) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ products, selectedProductId, onProductSelect }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        return products.filter(product => 
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const handleProductSelect = (product: Product) => {
        onProductSelect(product.id);
        setIsModalOpen(false);
        setSearchTerm('');
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setSearchTerm('');
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full p-2 border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 text-left flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors border border-gray-300 dark:border-gray-600"
            >
                <span className={selectedProduct ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                    {selectedProduct ? selectedProduct.name : 'Ürün Seçiniz...'}
                </span>
                <Search className="w-4 h-4 text-gray-400" />
            </button>

            {/* Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Ürün Seçiniz
                            </h3>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Ürün ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    autoFocus
                                />
                            </div>
                            {searchTerm && (
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {filteredProducts.length} ürün bulundu
                                </p>
                            )}
                        </div>

                        {/* Products Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {filteredProducts.map((product) => (
                                        <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => handleProductSelect(product)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                                                product.id === selectedProductId 
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                                        {product.name}
                                                    </h4>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                        <span>Koli: €{product.pricePerCase?.toFixed(2)}</span>
                                                        <span>Adet: €{product.pricePerPiece?.toFixed(2)}</span>
                                                        <span>ID: {product.id.substring(0, 8)}</span>
                                                    </div>
                                                </div>
                                                {product.id === selectedProductId && (
                                                    <Check className="w-5 h-5 text-blue-500" />
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                    <Search className="w-12 h-12 mb-4 opacity-50" />
                                    <h4 className="text-lg font-medium mb-2">Ürün bulunamadı</h4>
                                    <p className="text-sm text-center">
                                        {searchTerm 
                                            ? `"${searchTerm}" arama terimi için sonuç bulunamadı`
                                            : 'Henüz hiç ürün eklenmemiş'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-600">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                                İptal
                            </button>
                            {selectedProduct && (
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                                >
                                    Seçili Ürünü Kullan
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProformaGenerator;
