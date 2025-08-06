const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { zpl, printer, labelType } = req.body;

    if (!zpl) {
      return res.status(400).json({ error: 'ZPL kodu gerekli' });
    }

    // ZPL dosyasını geçici olarak kaydet
    const tempFile = path.join(process.cwd(), 'temp', `label_${Date.now()}.zpl`);
    
    // temp klasörü yoksa oluştur
    const tempDir = path.dirname(tempFile);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(tempFile, zpl);

    // Windows için yazıcıya gönderim
    const { exec } = require('child_process');
    
    // Zebra yazıcıya gönder (Windows)
    const command = `copy "${tempFile}" "Zebra Printer"`;
    
    exec(command, (error, stdout, stderr) => {
      // Geçici dosyayı sil
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      if (error) {
        console.error('Yazdırma hatası:', error);
        return res.status(500).json({ 
          error: 'Yazdırma başarısız',
          details: error.message 
        });
      }

      res.status(200).json({ 
        success: true, 
        message: `${labelType} başarıyla yazdırıldı`,
        printer: printer
      });
    });

  } catch (error) {
    console.error('API hatası:', error);
    res.status(500).json({ 
      error: 'Sunucu hatası',
      details: error.message 
    });
  }
} 