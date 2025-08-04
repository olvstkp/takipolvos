import ExcelJS from 'exceljs';
import { Proforma, ProformaItem, Customer, Product, ProformaGroup } from '../types/proforma';

export interface ProductExportData {
    products: any[];
    currency: 'EUR' | 'USD';
}

export interface ExcelExportData {
    proformaData: Proforma;
    selectedCustomer: Customer;
    products: Product[];
    proformaGroups: ProformaGroup[];
    packingListCalculations: any[];
    currency: 'EUR' | 'USD';
    selectedCompany?: string;
}

export const generateProformaExcel = async (data: ExcelExportData) => {
    const { proformaData, selectedCustomer, products, selectedCompany = 'DASPI' } = data;
    
    const workbook = new ExcelJS.Workbook();
    
    // SERILERIN RENK PALETİ - Belirgin renkler seri grupları için
    const seriesColors = [
        'FFFFFF00', // Sarı #FFFF00
        'FF90EE90', // Açık Yeşil #90EE90
        'FFADD8E6', // Açık Mavi #ADD8E6
        'FFFFC0CB', // Pembe #FFC0CB
        'FFFFE4B5', // Moccasin #FFE4B5
        'FFB0E0E6', // Powder Blue #B0E0E6
        'FFF0E68C', // Khaki #F0E68C
        'FFDDA0DD', // Plum #DDA0DD
        'FF98FB98', // Pale Green #98FB98
        'FFFFB6C1'  // Light Pink #FFB6C1
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

    await createInvoiceSheet(workbook, data, seriesColorMap);
    await createCalismaSheet(workbook, data);
    await createPackingListSheet(workbook, data);

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${proformaData.proformaNumber}-Invoice.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
};

export const generateProductsExcel = async (data: ProductExportData) => {
    const { products, currency } = data;
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ürünler');
    
    // Sütun başlıkları
    sheet.columns = [
        { key: 'A', width: 40, header: 'ÜRÜN ADI' },
        { key: 'B', width: 25, header: 'SERİ' },
        { key: 'C', width: 30, header: 'PROFORMA GRUBU' },
        { key: 'D', width: 15, header: 'KOLİ FIYATI (€)' },
        { key: 'E', width: 15, header: 'ADET FIYATI (€)' },
        { key: 'F', width: 15, header: 'KOLİ FIYATI ($)' },
        { key: 'G', width: 15, header: 'ADET FIYATI ($)' },
        { key: 'H', width: 20, header: 'BARKOD' },
        { key: 'I', width: 15, header: 'DURUM' },
        { key: 'J', width: 20, header: 'OLUŞTURULMA TARİHİ' },
        { key: 'K', width: 20, header: 'ÜRÜN TİPİ' },
        { key: 'L', width: 15, header: 'BOYUT DEĞERİ' },
        { key: 'M', width: 15, header: 'BOYUT BİRİMİ' }
    ];
    
    // Başlık satırını formatla
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
    };
    
    // Veri satırlarını ekle
    products.forEach((product: any, index) => {
        const row = sheet.getRow(index + 2);
        row.values = [
            product.name,
            product.series?.name || product.series || '',
            product.proforma_group?.name || '',
            product.price_per_case || product.pricePerCase || 0,
            product.price_per_piece || product.pricePerPiece || 0,
            product.price_per_case_usd || product.pricePerCaseUsd || 0,
            product.price_per_piece_usd || product.pricePerPieceUsd || 0,
            product.barcode || product.sku || '',
            product.is_active ? 'Aktif' : 'Pasif',
            new Date(product.created_at || Date.now()).toLocaleDateString('tr-TR'),
            product.product_type?.name || '',
            product.size_value || '',
            product.size_unit || ''
        ];
        
        // Durum sütununu renklendir
        const statusCell = row.getCell(9);
        if (product.is_active) {
            statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF90EE90' } // Açık yeşil
            };
        } else {
            statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFB6C1' } // Açık kırmızı
            };
        }
    });
    
    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ürünler_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
};

// INVOICE SHEET - Resimle birebir aynı
const createInvoiceSheet = async (workbook: ExcelJS.Workbook, data: ExcelExportData, seriesColorMap: Map<string, string>) => {
    const { proformaData, selectedCustomer, products, currency, selectedCompany = 'DASPI' } = data;
    const invoiceSheet = workbook.addWorksheet('INVOICE');
    
    // Sütun genişlikleri - resimle uyumlu (A-D ana tablo, E-F sağ taraf)
    invoiceSheet.columns = [
        { key: 'A', width: 15 }, // QUANTITY/CASE
        { key: 'B', width: 50 }, // PRODUCT DESCRIPTION  
        { key: 'C', width: 18 }, // UNIT PRICE
        { key: 'D', width: 18 }, // TOTAL AMOUNT
        { key: 'E', width: 17.5 }, // Logo için genişletildi (%250 = 5 * 3.5 = 17.5)
        { key: 'F', width: 15 }, // INVOICE başlığı için
    ];

    // Logo ekle A1 hücresine (Supabase'den çek)
    try {
        // Seçili şirketin logo ve adres bilgilerini çek
        const { supabase } = await import('../lib/supabase');
        const { data: logoData, error } = await supabase
            .from('company_logo')
            .select('logo_url, address, company_name')
            .eq('company_name', selectedCompany)
            .single();

        if (logoData && !error && logoData.logo_url) {
            let logoBuffer: ArrayBuffer;
            let logoExtension: string = 'png';
            
            try {
                if (logoData.logo_url.startsWith('data:')) {
                    // Base64 data URL
                    console.log('Base64 logo bulundu, işleniyor...');
                    const base64Data = logoData.logo_url.split(',')[1];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    logoBuffer = bytes.buffer;
                    
                    // MIME type'tan extension belirle
                    if (logoData.logo_url.includes('image/jpeg') || logoData.logo_url.includes('image/jpg')) {
                        logoExtension = 'jpeg';
                    } else if (logoData.logo_url.includes('image/png')) {
                        logoExtension = 'png';
                    }
                } else {
                    // Normal URL (Storage'dan)
                    console.log('Storage URL\'si bulundu, fetch ediliyor...');
                    const logoResponse = await fetch(logoData.logo_url);
                    if (!logoResponse.ok) {
                        throw new Error(`Logo fetch hatası: ${logoResponse.status}`);
                    }
                    
                    const logoBlob = await logoResponse.blob();
                    logoBuffer = await logoBlob.arrayBuffer();
                    
                    // URL'den extension belirle
                    logoExtension = logoData.logo_url.includes('.png') ? 'png' : 
                                  logoData.logo_url.includes('.jpg') || logoData.logo_url.includes('.jpeg') ? 'jpeg' : 'png';
                }
                
                // Excel'e resim ekle
                const imageId = workbook.addImage({
                    buffer: logoBuffer,
                    extension: logoExtension as 'png' | 'jpeg' | 'gif',
                });
                
                // Logo'yu A1 hücresine koy (2 satır yüksekliğinde)
                invoiceSheet.addImage(imageId, {
                    tl: { col: 0, row: 0 }, // A1 hücresi (col 0, row 0)
                    ext: { width: 160, height: 80 }, // Logo boyutu büyütüldü
                    editAs: 'absolute'
                });
                
                // Logo için A1 ve A2 hücresinin yüksekliğini artır (2 satır)
                invoiceSheet.getRow(1).height = 40;
                invoiceSheet.getRow(2).height = 40;
                console.log('Logo başarıyla A1 hücresine eklendi (Tip:', logoExtension, ')');
                
            } catch (logoError) {
                console.error('Logo işleme hatası:', logoError);
            }
        } else {
            console.log('Logo bulunamadı, adres bilgileri gösterilecek');
        }
    } catch (error) {
        console.error('Logo ekleme hatası:', error);
    }

    // Şirket adres bilgileri (Sol üst - Logo yoksa gösterilecek)
    // Logo varsa bu bilgiler A3'ten başlayacak
    let addressStartRow = 1;
    let companyAddress = `DUATEPE MAH.YENİTABAKHANE CAD.OLİVOS APT NO:2
TİRE / İZMİR
TEL: 0266 3921356`; // Default DASPI adresi
    
    try {
        // Seçili şirketin bilgilerini çek
        const { supabase } = await import('../lib/supabase');
        const { data: companyData } = await supabase
            .from('company_logo')
            .select('logo_url, address')
            .eq('company_name', selectedCompany)
            .single();
        
        if (companyData?.logo_url) {
            addressStartRow = 3; // Logo varsa adres A3'ten başlar (logo 2 satır)
        }
        
        if (companyData?.address) {
            companyAddress = companyData.address;
        }
    } catch (error) {
        // Hata durumunda default değerleri kullan
        console.error('Şirket bilgileri çekme hatası:', error);
    }

    // Şirket adres bilgilerini satırlara böl ve ekle
    const addressLines = companyAddress.split('\n');
    addressLines.forEach((line, index) => {
        const addressCell = invoiceSheet.getCell(`A${addressStartRow + index}`);
        addressCell.value = line.trim();
        addressCell.font = { color: { argb: 'FF808000' }, size: 10 }; // #808000 renk
    });

    // INVOICE başlığı (Sağ üst - resimde gösterildiği gibi)
    invoiceSheet.mergeCells('E1:F1');
    const invoiceHeader = invoiceSheet.getCell('E1');
    invoiceHeader.value = 'INVOICE';
    invoiceHeader.font = { name: 'Arial', size: 24, bold: true };
    invoiceHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    // Tarih bilgisi (sağ üst altında)
    invoiceSheet.getCell('E2').value = new Date().toLocaleDateString('en-GB');
    invoiceSheet.getCell('E3').value = '(CV.22 06.25)';

    // Müşteri bilgileri bölümü (Database'den gelen veriler)
    invoiceSheet.getCell('A9').value = 'Ship To:';
    invoiceSheet.getCell('A9').font = { bold: true };
    invoiceSheet.getCell('B9').value = selectedCustomer.name;

    invoiceSheet.getCell('A10').value = 'Address';
    invoiceSheet.getCell('A10').font = { bold: true };
    invoiceSheet.getCell('B10').value = selectedCustomer.address;

    // Müşteri detay bilgileri (database'den gelen müşteri bilgileri)
    let detailRow = 11;
    if (selectedCustomer.phone) {
        invoiceSheet.getCell('C' + detailRow).value = `tel.: ${selectedCustomer.phone}`;
        detailRow++;
    }
    if (selectedCustomer.phone2) {
        invoiceSheet.getCell('C' + detailRow).value = `tel2.: ${selectedCustomer.phone2}`;
        detailRow++;
    }
    if (selectedCustomer.email) {
        invoiceSheet.getCell('C' + detailRow).value = `email: ${selectedCustomer.email}`;
        detailRow++;
    }
    if (selectedCustomer.taxId) {
        invoiceSheet.getCell('C' + detailRow).value = `Tax ID: ${selectedCustomer.taxId}`;
        detailRow++;
    }
    if (selectedCustomer.delivery) {
        invoiceSheet.getCell('C' + detailRow).value = `Delivery: ${selectedCustomer.delivery}`;
        detailRow++;
    }

    // İletişim bilgileri tablosu başlığı satırı
    const contactHeaderRow = 17;
    const contactHeaders = ['CONTACT', 'INVOICE NUMBER', 'DEPARTURE', 'DELIVERY', 'BRAND', 'ETA'];
    contactHeaders.forEach((header, index) => {
        const cell = invoiceSheet.getCell(contactHeaderRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; // #ffff99 renk
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // İletişim bilgileri değerleri (database'den gelen müşteri bilgileri)
    const contactValues = [
        selectedCustomer.contactPerson || selectedCustomer.name,
        proformaData.proformaNumber,
        proformaData.departure,
        proformaData.delivery,
        proformaData.brand,
        ''
    ];
    contactValues.forEach((value, index) => {
        const cell = invoiceSheet.getCell(contactHeaderRow + 1, index + 1);
        cell.value = value;
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Ürün tablosu başlıkları - Resimle birebir aynı mavi renk
    const productHeaderRow = 20;
    const productHeaders = ['QUANTITY/CASE', 'PRODUCT DESCRIPTION', `UNIT PRICE\n(${currency})`, `TOTAL AMOUNT\n(${currency})`];
    productHeaders.forEach((header, index) => {
        const cell = invoiceSheet.getCell(productHeaderRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FF000000' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; // #ffff99 renk
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    // Ürün verileri - Seri bazlı renklendirme
    let currentRow = productHeaderRow + 1;
    proformaData.items.forEach((item) => {
        const product = products.find(p => p.id === item.productId);
        
        // Seri bazlı renk belirleme
        let cellColor = 'FFFFFFFF'; // Varsayılan beyaz
        if (product?.series) {
            cellColor = seriesColorMap.get(product.series) || 'FFFFFFFF';
        }
        
        // OLIVE OIL ürünleri için özel durum (eğer seri rengi yoksa sarı)
        const isOliveOil = item.description.toUpperCase().includes('OLIVE') || 
                          item.description.toUpperCase().includes('OIL') ||
                          product?.name.toUpperCase().includes('OLIVE');
        if (isOliveOil && cellColor === 'FFFFFFFF') {
            cellColor = 'FFFF00'; // Sarı
        }

        const rowData = [
            item.quantity,
            item.description,
            parseFloat(item.unitPrice.toFixed(2)),
            parseFloat(item.total.toFixed(2))
        ];

        rowData.forEach((value, colIndex) => {
            const cell = invoiceSheet.getCell(currentRow, colIndex + 1);
            cell.value = value;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellColor } };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            
            // Alignment - resimde gösterildiği gibi
            if (colIndex === 0) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colIndex === 1) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '#,##0.00'; // Para formatı
            }
            
            // Font styling
            cell.font = { name: 'Arial', size: 10 };
        });
        currentRow++;
    });

    // "NO COMMERCIAL VALUE" satırları sadece ücretsiz ürünlerde çıkar
    // Ücretsiz ürünleri kontrol et (unit price = 0 olanlar)
    const freeItems = proformaData.items.filter(item => item.unitPrice === 0);
    
    if (freeItems.length > 0) {
        // Ücretsiz ürünler varsa NO COMMERCIAL VALUE satırlarını ekle
        for (let i = 0; i < Math.min(freeItems.length, 3); i++) {
            const noCommercialRow = ['', 'NO COMMERCIAL VALUE', 'NO COMMERCIAL VALUE', 'NO COMMERCIAL VALUE'];
            noCommercialRow.forEach((value, colIndex) => {
                const cell = invoiceSheet.getCell(currentRow, colIndex + 1);
                cell.value = value;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = { name: 'Arial', size: 10 };
            });
            currentRow++;
        }
    }

    // TOTAL satırı - Gri renkte tüm satır
    const totalRow = ['', '', 'TOTAL', parseFloat(proformaData.totalAmount.toFixed(2))];
    totalRow.forEach((value, colIndex) => {
        const cell = invoiceSheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        cell.font = { name: 'Arial', size: 11, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } }; // Gri renk
        cell.border = {
            top: { style: 'thick' }, left: { style: 'thin' },
            bottom: { style: 'thick' }, right: { style: 'thin' }
        };
        
        if (colIndex === 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colIndex === 3) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0.00';
        } else {
            // Boş hücreler için de gri renk
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
    });

    // Ödeme bilgileri tablosu (resimde gösterildiği gibi)
    currentRow += 3;
    
    // Başlık satırları - resimde gösterildiği gibi gri background ile
    const paymentHeaders = ['PAYMENT', 'QUANTITY/PIECES'];
    paymentHeaders.forEach((header, index) => {
        const cell = invoiceSheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; // #ffff99 renk
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    currentRow++;
    
    // Toplam case ve piece hesaplama
    let totalCases = 0;
    let totalIndividualPieces = 0; // Sadece adet olarak satılan ürünler
    
    proformaData.items.forEach(item => {
        if (item.unit === 'case') {
            totalCases += item.quantity;
        } else if (item.unit === 'piece') {
            totalIndividualPieces += item.quantity;
        }
    });
    
    // Quantity/Pieces formatını oluştur
    let quantityText = '';
    if (totalCases > 0 && totalIndividualPieces > 0) {
        quantityText = `${totalCases} CASES + ${totalIndividualPieces} PIECES`;
    } else if (totalCases > 0) {
        quantityText = `${totalCases} CASES`;
    } else if (totalIndividualPieces > 0) {
        quantityText = `${totalIndividualPieces} PIECES`;
    } else {
        quantityText = '0 CASES';
    }
    
    // Ödeme bilgileri
    invoiceSheet.getCell(currentRow, 1).value = 'CASH IN ADVANCE';
    invoiceSheet.getCell(currentRow, 1).border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    
    // Quantity/Pieces bilgisi (B27 hücresi olacak şekilde)
    invoiceSheet.getCell(currentRow, 2).value = quantityText;
    invoiceSheet.getCell(currentRow, 2).border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    invoiceSheet.getCell(currentRow, 2).alignment = { horizontal: 'center', vertical: 'middle' };
    
    currentRow += 2;
    
    // Banka bilgileri tablosu (resimde gösterildiği gibi)
    const bankingHeaders = ['BANK', 'BRANCH', 'BRANCH CODE', 'SWIFT CODE', 'ACCOUNT NAME', 'ACCOUNT NUMBER'];
    bankingHeaders.forEach((header, index) => {
        const cell = invoiceSheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; // #ffff99 renk
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    currentRow++;
    
    // Banka bilgileri değerleri
    const bankingValues = [
        'İŞ BANKASI',
        'EDREMİT / BALIKESİR ŞUBE',
        'ISBTRXXX',
        'ISBKTRISXXX',
        'OLIVE VE TİCARET',
        'TR 95 0006 4000 0022 1230 7227 02'
    ];
    
    bankingValues.forEach((value, index) => {
        const cell = invoiceSheet.getCell(currentRow, index + 1);
        cell.value = value;
        cell.font = { size: 9 };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Thank you mesajı
    currentRow += 3;
    invoiceSheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const thankYouCell = invoiceSheet.getCell(currentRow, 1);
    thankYouCell.value = 'THANK YOU FOR YOUR BUSINESS!';
    thankYouCell.font = { bold: true, size: 14 };
    thankYouCell.alignment = { horizontal: 'center', vertical: 'middle' };
};

// ÇALIŞMA Sheet'i - Detaylı Packing List formatı
const createCalismaSheet = async (workbook: ExcelJS.Workbook, data: ExcelExportData) => {
    const { proformaData, selectedCustomer, products, currency, selectedCompany = 'DASPI' } = data;
    const calismaSheet = workbook.addWorksheet('ÇALIŞMA');
    
    // Sütun genişlikleri
    calismaSheet.columns = [
        { key: 'A', width: 5 },   // NO
        { key: 'B', width: 35 },  // DESCRIPTION OF GOODS
        { key: 'C', width: 8 },   // width/cm
        { key: 'D', width: 8 },   // height/cm
        { key: 'E', width: 8 },   // high/cm
        { key: 'F', width: 8 },   // M3
        { key: 'G', width: 8 },   // TARE KG
        { key: 'H', width: 12 },  // WEIGHT Kg/box
        { key: 'I', width: 12 },  // BRÜT WEIGHT Kg/box
        { key: 'J', width: 8 },   // cup/CASES
        { key: 'K', width: 10 },  // TOTAL KG
        { key: 'L', width: 10 },  // TOTAL TARE
        { key: 'M', width: 10 },  // BRÜT KG
        { key: 'N', width: 10 }   // ADET/PCS
    ];

    // Logo ve şirket bilgileri (INVOICE'takı gibi)
    try {
        const { supabase } = await import('../lib/supabase');
        const { data: logoData, error } = await supabase
            .from('company_logo')
            .select('logo_url, address, company_name')
            .eq('company_name', selectedCompany)
            .single();

        if (logoData && !error && logoData.logo_url) {
            try {
                let logoBuffer: ArrayBuffer | undefined;
                let logoExtension: string = 'png';
                
                if (logoData.logo_url.startsWith('data:')) {
                    const base64Data = logoData.logo_url.split(',')[1];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    logoBuffer = bytes.buffer;
                    
                    if (logoData.logo_url.includes('image/jpeg') || logoData.logo_url.includes('image/jpg')) {
                        logoExtension = 'jpeg';
                    } else if (logoData.logo_url.includes('image/png')) {
                        logoExtension = 'png';
                    }
                } else {
                    const logoResponse = await fetch(logoData.logo_url);
                    if (logoResponse.ok) {
                        const logoBlob = await logoResponse.blob();
                        logoBuffer = await logoBlob.arrayBuffer();
                        logoExtension = logoData.logo_url.includes('.png') ? 'png' : 
                                      logoData.logo_url.includes('.jpg') || logoData.logo_url.includes('.jpeg') ? 'jpeg' : 'png';
                    }
                }
                
                // Logo'yu ekle
                if (logoBuffer) {
                    const imageId = workbook.addImage({
                        buffer: logoBuffer,
                        extension: logoExtension as 'png' | 'jpeg' | 'gif',
                    });
                
                    calismaSheet.addImage(imageId, {
                        tl: { col: 0, row: 0 },
                        ext: { width: 120, height: 60 },
                        editAs: 'absolute'
                    });
                    
                    calismaSheet.getRow(1).height = 30;
                    calismaSheet.getRow(2).height = 30;
                }
                
            } catch (logoError) {
                console.error('Logo işleme hatası:', logoError);
            }
        }

        // Şirket adres bilgileri
        let addressStartRow = 1;
        let companyAddress = `DUATEPE MAH.YENİTABAKHANE CAD.OLİVOS APT NO:2
TİRE / İZMİR
TEL: 0266 3921356`;
        
        if (logoData?.logo_url) {
            addressStartRow = 3;
        }
        
        if (logoData?.address) {
            companyAddress = logoData.address;
        }

        const addressLines = companyAddress.split('\n');
        addressLines.forEach((line, index) => {
            const addressCell = calismaSheet.getCell(`A${addressStartRow + index}`);
            addressCell.value = line.trim();
            addressCell.font = { color: { argb: 'FF808000' }, size: 10 };
        });

    } catch (error) {
        console.error('Logo ekleme hatası:', error);
    }

    // ÇALIŞMA başlığı
    calismaSheet.mergeCells('F10:I10');
    const calismaHeader = calismaSheet.getCell('F10');
    calismaHeader.value = 'ÇALIŞMA';
    calismaHeader.font = { name: 'Arial', size: 16, bold: true };
    calismaHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    // Tablo başlıkları
    const headerRow = 12;
    const headers = [
        'NO', 'DESCRIPTION OF GOODS', 'width/cm', 'height/cm', 'high/cm', 'M3', 
        'TARE KG', 'WEIGHT Kg/box', 'BRÜT WEIGHT Kg/box', 'cup/CASES', 
        'TOTAL KG', 'TOTAL TARE', 'BRÜT KG', 'ADET/PCS'
    ];

    // İkinci satır başlıkları
    const subHeaders = [
        '', '', '', '', '', '', '', '', '', 
        '', '', '', '', ''
    ];

    // Ana başlık satırı
    headers.forEach((header, index) => {
        const cell = calismaSheet.getCell(headerRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    // Özel başlık formatlaması (out pack sizes box)
    calismaSheet.mergeCells('C11:E11');
    const outPackHeader = calismaSheet.getCell('C11');
    outPackHeader.value = 'out pack sizes ( box)';
    outPackHeader.font = { bold: true, size: 9 };
    outPackHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    outPackHeader.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    outPackHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    // Sitedeki PACKING LIST tablosunun aynı hesaplamalarını kullan
    const groupedBySeries = proformaData.items.reduce((acc: Record<string, any>, item) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return acc;

        const isPromo = product.series === 'PROMO';
        const groupKey = isPromo ? product.id : product.series || 'unknown'; // Use product ID to keep promo items separate
        const description = isPromo ? `${product.name} - FREE` : product.series || 'Unknown Series';

        if (!acc[groupKey]) {
            acc[groupKey] = { 
                products: [], 
                totalQuantity: 0, 
                net_weight_kg_per_unit: 0, 
                packaging_weight_kg_per_case: 0, 
                description: description 
            };
        }

        acc[groupKey].products.push(product);
        acc[groupKey].totalQuantity += item.quantity;
        acc[groupKey].net_weight_kg_per_unit = product.net_weight_kg_per_piece * (item.unit === 'case' ? product.piecesPerCase : 1);
        acc[groupKey].packaging_weight_kg_per_case = product.packaging_weight_kg_per_case;
        return acc;
    }, {});

    const totalUnits = Object.values(groupedBySeries).reduce((sum: number, group: any) => sum + group.totalQuantity, 0);
    const totalPalletWeight = (proformaData.shipment?.pallets?.length || 1) * (proformaData.shipment?.weight_per_pallet_kg || 20);
    const palletWeightPerUnit = totalUnits > 0 ? totalPalletWeight / totalUnits : 0;

    const packingListData = Object.keys(groupedBySeries).map((seriesKey, index) => {
        const group = groupedBySeries[seriesKey];
        const { totalQuantity, net_weight_kg_per_unit, packaging_weight_kg_per_case } = group;
        const tarePerUnit = packaging_weight_kg_per_case + palletWeightPerUnit;
        const brutWeightPerUnit = net_weight_kg_per_unit + tarePerUnit;
        const totalNetWeight = totalQuantity * net_weight_kg_per_unit;
        const totalTare = totalQuantity * tarePerUnit;
        const totalBrutWeight = totalQuantity * brutWeightPerUnit;
        const totalPieces = totalQuantity * (group.products[0]?.piecesPerCase ?? 1);
        
        return { 
            no: index + 1, 
            description: group.description, 
            tare_kg_per_unit: tarePerUnit, 
            net_weight_kg_per_unit, 
            brut_weight_kg_per_unit: brutWeightPerUnit, 
            cup_units: totalQuantity, 
            total_kg: totalNetWeight, 
            total_tare: totalTare, 
            brut_kg: totalBrutWeight, 
            adet_pcs: totalPieces 
        };
    });

    // ÇALIŞMA sayfası satırları - sitedeki tablonun aynı verisi
    let currentRow = headerRow + 1;
    let totalWeight = 0;
    let totalTare = 0;
    let totalBrut = 0;
    let totalCases = 0;
    let totalPieces = 0;

    packingListData.forEach((row) => {
        // Seri bazlı renk belirleme
        let cellColor = 'FFFFFF00'; // Sarı renk (seri ürünleri için)

        const rowData = [
            row.no, // NO
            row.description, // DESCRIPTION - sitedeki ile aynı
            '', // width - boş
            '', // height - boş
            '', // high - boş
            '', // M3 - boş
            row.tare_kg_per_unit.toFixed(3), // TARE KG/UNIT
            row.net_weight_kg_per_unit.toFixed(3), // WEIGHT KG/UNIT
            row.brut_weight_kg_per_unit.toFixed(3), // BRÜT WEIGHT KG/UNIT
            row.cup_units, // CUP/UNITS - sitedeki ile aynı
            row.total_kg.toFixed(2), // TOTAL KG
            row.total_tare.toFixed(2), // TOTAL TARE
            row.brut_kg.toFixed(2), // BRÜT KG
            row.adet_pcs // ADET/PCS
        ];

        rowData.forEach((value, colIndex) => {
            const cell = calismaSheet.getCell(currentRow, colIndex + 1);
            cell.value = value;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellColor } };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { name: 'Arial', size: 9 };
        });

        // Genel toplamları güncelle
        totalWeight += row.total_kg;
        totalTare += row.total_tare;
        totalBrut += row.brut_kg;
        totalCases += row.cup_units;
        totalPieces += row.adet_pcs;

        currentRow++;
    });

    // Toplam satırı
    const totalRowData = [
        '', '', '', '', '', '', '', '', '', 
        totalCases, 
        totalWeight.toFixed(2), 
        totalTare.toFixed(2), 
        totalBrut.toFixed(2), 
        totalPieces
    ];

    totalRowData.forEach((value, colIndex) => {
        const cell = calismaSheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
        cell.border = {
            top: { style: 'thick' }, left: { style: 'thin' },
            bottom: { style: 'thick' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
};

// PACKING LIST Sheet'i - Sitedeki "Packing List (Özet)" formatında
const createPackingListSheet = async (workbook: ExcelJS.Workbook, data: ExcelExportData) => {
    const { proformaData, products, proformaGroups, selectedCompany } = data;
    
    const packingSheet = workbook.addWorksheet('PACKING LIST');

    // Sütun genişlikleri
    packingSheet.getColumn(1).width = 30; // Ürün adları için
    packingSheet.getColumn(2).width = 20;
    packingSheet.getColumn(3).width = 15;
    packingSheet.getColumn(4).width = 15;
    packingSheet.getColumn(5).width = 30; // Özet başlıkları için
    packingSheet.getColumn(6).width = 20;
    packingSheet.getColumn(7).width = 15;

    let currentRow = 1;

    // Logo ve şirket bilgileri (INVOICE ve ÇALIŞMA sayfalarındaki gibi)
    try {
        const { supabase } = await import('../lib/supabase');
        let companyName = 'DASPI';
        
        if (typeof selectedCompany === 'string') {
            companyName = selectedCompany;
        } else if (selectedCompany && typeof selectedCompany === 'object' && 'name' in selectedCompany) {
            companyName = (selectedCompany as any).name;
        }
        
        const { data: logoData, error } = await supabase
            .from('company_logo')
            .select('logo_url, address, company_name')
            .eq('company_name', companyName)
            .single();

        if (logoData && !error && logoData.logo_url) {
            try {
                let logoBuffer: ArrayBuffer | undefined;
                let logoExtension: string = 'png';
                
                if (logoData.logo_url.startsWith('data:')) {
                    // Base64 data URL
                    const base64Data = logoData.logo_url.split(',')[1];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    logoBuffer = bytes.buffer;
                    
                    if (logoData.logo_url.includes('image/jpeg') || logoData.logo_url.includes('image/jpg')) {
                        logoExtension = 'jpeg';
                    } else if (logoData.logo_url.includes('image/png')) {
                        logoExtension = 'png';
                    }
                } else {
                    // Normal URL (Storage'dan)
                    const logoResponse = await fetch(logoData.logo_url);
                    if (logoResponse.ok) {
                        const logoBlob = await logoResponse.blob();
                        logoBuffer = await logoBlob.arrayBuffer();
                        logoExtension = logoData.logo_url.includes('.png') ? 'png' : 
                                      logoData.logo_url.includes('.jpg') || logoData.logo_url.includes('.jpeg') ? 'jpeg' : 'png';
                    }
                }
                
                // Logo'yu ekle
                if (logoBuffer) {
                    const imageId = workbook.addImage({
                        buffer: logoBuffer,
                        extension: logoExtension as 'png' | 'jpeg' | 'gif',
                    });
                
                    packingSheet.addImage(imageId, {
                        tl: { col: 0, row: 0 },
                        ext: { width: 120, height: 60 },
                        editAs: 'absolute'
                    });
                    
                    packingSheet.getRow(1).height = 30;
                    packingSheet.getRow(2).height = 30;
                    currentRow = 3; // Logo varsa satır numarasını ayarla
                }
                
            } catch (logoError) {
                console.error('Logo işleme hatası:', logoError);
            }
        }

        // Şirket adres bilgileri
        let companyAddress = `DUATEPE MAH.YENİTABAKHANE CAD.OLİVOS APT NO:2
TİRE / İZMİR
TEL: 0266 3921356`;
        
        if (logoData?.address) {
            companyAddress = logoData.address;
        }

        // Şirket adres bilgilerini satırlara böl ve ekle
        const addressLines = companyAddress.split('\n');
        addressLines.forEach((line, index) => {
            const addressCell = packingSheet.getCell(`A${currentRow + index}`);
            addressCell.value = line.trim();
            addressCell.font = { color: { argb: 'FF000000' }, size: 10 };
        });
        
        currentRow += addressLines.length + 1;

    } catch (error) {
        console.error('Logo ekleme hatası:', error);
        // Fallback: Sadece şirket adı
        const companyCell = packingSheet.getCell(`A${currentRow}`);
        if (typeof selectedCompany === 'string') {
            companyCell.value = selectedCompany;
        } else if (selectedCompany && typeof selectedCompany === 'object' && 'name' in selectedCompany) {
            companyCell.value = (selectedCompany as any).name;
        } else {
            companyCell.value = 'DASPI';
        }
        companyCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
        currentRow += 2;
    }

    // "PACKING LIST" başlığı
    const headerCell = packingSheet.getCell(`A${currentRow}`);
    headerCell.value = 'PACKING LIST';
    headerCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    currentRow += 2;

    // Sitedeki mantığı kullanarak grupla
    const groupedData = calculateGroupedData(proformaData, products, proformaGroups);
    const groups = Object.values(groupedData);

    // Ürün özetleri (alt alta düzenli format)
    groups.forEach((group) => {
        // Ürün adı (siyah ve kalın)
        const productNameCell = packingSheet.getCell(`A${currentRow}`);
        productNameCell.value = group.groupName;
        productNameCell.font = { bold: true, color: { argb: 'FF000000' }, size: 12 };
        currentRow++;

        // Detaylar tablo formatında
        const details = [
            ['Total Number of Cases', group.totalCases],
            [`Total number of ${group.groupName.toLowerCase()}`, group.totalPieces],
            ['Net Weight', `${group.totalNetWeight.toFixed(2)} kg`],
            ['Gross Weight', `${group.totalGrossWeight.toFixed(2)} kg`]
        ];

        details.forEach(([label, value]) => {
            // Label
            const labelCell = packingSheet.getCell(`A${currentRow}`);
            labelCell.value = label;
            labelCell.font = { size: 10, color: { argb: 'FF000000' } };
            
            // Value
            const valueCell = packingSheet.getCell(`C${currentRow}`);
            valueCell.value = value;
            valueCell.font = { size: 10, color: { argb: 'FF000000' } };
            
            currentRow++;
        });
        
        currentRow++; // Gruplar arası boşluk
    });

    // Alt kısımda: Genel Sevkiyat Özeti (kalın çerçeve ile)
    currentRow += 2;
    
    const summaryStartRow = currentRow;
    
    // Toplam başlıkları
    const totals = calculateTotals(groupedData);
    
    const summaryData = [
        ['TOTAL NUMBER OF CASES', totals.totalCases],
        ['TOTAL NUMBER OF SOAPS AND PRODUCTS', totals.totalPieces],
        ['NET KG', totals.totalNetKg.toFixed(2)],
        ['GROSS KG', totals.totalGrossKg.toFixed(2)],
        ['NUMBER OF PALLETS', proformaData.shipment?.pallets?.length || 1]
    ];

    summaryData.forEach(([label, value]) => {
        const labelCell = packingSheet.getCell(`A${currentRow}`);
        labelCell.value = label;
        labelCell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
        
        const valueCell = packingSheet.getCell(`C${currentRow}`);
        valueCell.value = value;
        valueCell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
        
        currentRow++;
    });

    // Palet boyutları
    if (proformaData.shipment?.pallets && proformaData.shipment.pallets.length > 0) {
        proformaData.shipment.pallets.forEach(pallet => {
            const labelCell = packingSheet.getCell(`A${currentRow}`);
            labelCell.value = `PALLET - ${pallet.pallet_number}`;
            labelCell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
            
            const valueCell = packingSheet.getCell(`C${currentRow}`);
            valueCell.value = `${pallet.width_cm}x${pallet.length_cm}x${pallet.height_cm}`;
            valueCell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
            
            currentRow++;
        });
    } else {
        // Default palet
        const labelCell = packingSheet.getCell(`A${currentRow}`);
        labelCell.value = 'PALLET - 1';
        labelCell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
        
        const valueCell = packingSheet.getCell(`C${currentRow}`);
        valueCell.value = '80x120x124';
        valueCell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
        currentRow++;
    }

    // Özet kısmının etrafına kalın çerçeve
    const summaryEndRow = currentRow - 1;
    const summaryRange = `A${summaryStartRow}:C${summaryEndRow}`;
    
    // Çerçeve uygula
    for (let row = summaryStartRow; row <= summaryEndRow; row++) {
        for (let col = 1; col <= 3; col++) {
            const cell = packingSheet.getCell(row, col);
            cell.border = {
                top: row === summaryStartRow ? { style: 'thick' } : { style: 'thin' },
                bottom: row === summaryEndRow ? { style: 'thick' } : { style: 'thin' },
                left: col === 1 ? { style: 'thick' } : { style: 'thin' },
                right: col === 3 ? { style: 'thick' } : { style: 'thin' }
            };
        }
    }
};

// Yardımcı fonksiyonlar
const calculateGroupedData = (proformaData: Proforma, products: Product[], proformaGroups: ProformaGroup[]) => {
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