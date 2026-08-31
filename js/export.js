/**
 * Gelir - Gider Takip Dışa ve İçe Aktarma Modülü (JSON, Excel/CSV, Yazdırma)
 */

class ExportManager {
    constructor() {}

    // 1. JSON Yedeğini İndir
    async exportToJSON() {
        try {
            const data = await window.budgetDB.exportDatabase();
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `gelir_gider_yedek_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.app.showToast('Veritabanı yedeği JSON olarak başarıyla indirildi!', 'success');
        } catch (error) {
            console.error('JSON dışa aktarma hatası:', error);
            window.app.showToast('Yedek indirilirken bir hata oluştu: ' + error.message, 'error');
        }
    }

    // 2. JSON Yedeğini Geri Yükle
    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    await window.budgetDB.importDatabase(data);
                    window.app.showToast('Yedek başarıyla geri yüklendi!', 'success');
                    await window.app.loadAndRenderAll();
                    resolve();
                } catch (err) {
                    console.error('İçe aktarma hatası:', err);
                    window.app.showToast('Geçersiz dosya formatı veya hata: ' + err.message, 'error');
                    reject(err);
                }
            };
            reader.onerror = () => reject('Dosya okunamadı');
            reader.readAsText(file);
        });
    }

    // 3. Excel Uyumlu CSV Olarak İndir (Fotoğraftaki Yapıyla Birebir)
    async exportToCSV() {
        try {
            const months = await window.budgetDB.getAllMonths();
            const expenses = await window.budgetDB.getAllExpenses();
            const incomes = await window.budgetDB.getAllIncomes();

            // UTF-8 BOM ekle (Excel'de Türkçe karakterlerin düzgün açılması için şarttır)
            let csv = '\uFEFF';

            // Başlık Satırı
            const monthHeaders = months.map(m => `"${m.name}"`).join(';');
            csv += `"GİDERLER / KART ÖDEMELERİ";${monthHeaders}\n`;

            // Gider Kalemleri
            const expenseSums = {};
            months.forEach(m => expenseSums[m.id] = 0);

            expenses.forEach(exp => {
                const values = months.map(m => {
                    const val = Number(exp.values?.[m.id]) || 0;
                    expenseSums[m.id] += val;
                    return val;
                }).join(';');
                csv += `"${exp.name}";${values}\n`;
            });

            // TOPLAM GİDER
            const totalExpRow = months.map(m => expenseSums[m.id]).join(';');
            csv += `\n"TOPLAM GİDER";${totalExpRow}\n\n`;

            // GELİRLER
            csv += `"GELİRLER";${monthHeaders}\n`;
            const incomeSums = {};
            months.forEach(m => incomeSums[m.id] = 0);

            incomes.forEach(inc => {
                const values = months.map(m => {
                    const val = Number(inc.values?.[m.id]) || 0;
                    incomeSums[m.id] += val;
                    return val;
                }).join(';');
                csv += `"${inc.name}";${values}\n`;
            });

            // TOPLAM GELİR
            const totalIncRow = months.map(m => incomeSums[m.id]).join(';');
            csv += `\n"TOPLAM GELİR";${totalIncRow}\n\n`;

            // ÖZET / BAKİYE
            csv += `"ÖZET / BAKİYE";${monthHeaders}\n`;
            csv += `"Toplam Gelir";${totalIncRow}\n`;
            csv += `"Toplam Gider";${totalExpRow}\n`;

            // Fark
            const diffRow = months.map(m => incomeSums[m.id] - expenseSums[m.id]).join(';');
            csv += `"Fark (Gelir - Gider)";${diffRow}\n`;

            // Ek Gelir Akışı
            const extraRow = months.map(m => Number(m.extraIncome) || 0).join(';');
            csv += `"Ek / Sonraki Gelir Akışı";${extraRow}\n`;

            // Net Bakiye
            const netRow = months.map(m => (incomeSums[m.id] - expenseSums[m.id]) + (Number(m.extraIncome) || 0)).join(';');
            csv += `"Net Bakiye";${netRow}\n`;

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `gelir_gider_tablo_${dateStr}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            window.app.showToast('Tablo Excel/CSV olarak başarıyla indirildi!', 'success');
        } catch (error) {
            console.error('CSV dışa aktarma hatası:', error);
            window.app.showToast('CSV oluşturulurken hata: ' + error.message, 'error');
        }
    }
}

window.exportManager = new ExportManager();
