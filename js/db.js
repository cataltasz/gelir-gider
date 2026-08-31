/**
 * Gelir - Gider Takip Veritabanı Modülü (IndexedDB)
 * Kalıcı tarayıcı depolaması, CRUD işlemleri ve Excel başlangıç verisi (seed).
 */

const DB_NAME = 'GelirGiderTakipDB';
const DB_VERSION = 1;

// Başlangıç Seed Verisi (Kullanıcının paylaştığı fotoğraftaki veriler)
const DEFAULT_MONTHS = [
    { id: 'eylul', name: 'Eylül', order: 1, extraIncome: 0 },
    { id: 'ekim', name: 'Ekim', order: 2, extraIncome: 0 },
    { id: 'kasim', name: 'Kasım', order: 3, extraIncome: 0 },
    { id: 'aralik', name: 'Aralık', order: 4, extraIncome: 0 }
];

const DEFAULT_EXPENSES = [
    { id: 'exp_1', name: 'Ev', category: 'Kira / Konut', order: 1, values: { eylul: 26000, ekim: 26000, kasim: 26000, aralik: 26000 } },
    { id: 'exp_2', name: 'AK', category: 'Kredi / Borç', order: 2, values: { eylul: 17000, ekim: 0, kasim: 0, aralik: 0 } },
    { id: 'exp_3', name: 'Enpara', category: 'Kredi Kartı', order: 3, values: { eylul: 9000, ekim: 9000, kasim: 9000, aralik: 9000 } },
    { id: 'exp_4', name: 'QNB', category: 'Kredi Kartı', order: 4, values: { eylul: 10000, ekim: 10000, kasim: 0, aralik: 0 } },
    { id: 'exp_5', name: 'GRN Kart', category: 'Kredi Kartı', order: 5, values: { eylul: 24000, ekim: 1000, kasim: 1000, aralik: 1000 } },
    { id: 'exp_6', name: 'VKF Kart', category: 'Kredi Kartı', order: 6, values: { eylul: 6500, ekim: 0, kasim: 0, aralik: 0 } },
    { id: 'exp_7', name: 'AK Kart', category: 'Kredi Kartı', order: 7, values: { eylul: 10000, ekim: 3000, kasim: 0, aralik: 0 } },
    { id: 'exp_8', name: 'WRL Kart', category: 'Kredi Kartı', order: 8, values: { eylul: 6000, ekim: 6000, kasim: 0, aralik: 0 } },
    { id: 'exp_9', name: 'aidat', category: 'Fatura / Aidat', order: 9, values: { eylul: 1600, ekim: 1600, kasim: 1600, aralik: 1600 } }
];

const DEFAULT_INCOMES = [
    { id: 'inc_1', name: 'Gelir Kalemi 1', category: 'Maaş', order: 1, values: { eylul: 105000, ekim: 105000, kasim: 105000, aralik: 105000 } },
    { id: 'inc_2', name: 'Gelir Kalemi 2', category: 'Ek Gelir', order: 2, values: { eylul: 32000, ekim: 32000, kasim: 32000, aralik: 32000 } },
    { id: 'inc_3', name: 'Gelir Kalemi 3', category: 'Diğer', order: 3, values: { eylul: 0, ekim: 0, kasim: 0, aralik: 0 } },
    { id: 'inc_4', name: 'Gelir Kalemi 4', category: 'Diğer', order: 4, values: { eylul: 0, ekim: 0, kasim: 0, aralik: 0 } },
    { id: 'inc_5', name: 'Gelir Kalemi 5', category: 'Diğer', order: 5, values: { eylul: 0, ekim: 0, kasim: 0, aralik: 0 } }
];

class BudgetDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB açılırken hata:", event);
                reject("Veritabanı açılamadı");
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('months')) {
                    const monthStore = db.createObjectStore('months', { keyPath: 'id' });
                    monthStore.createIndex('order', 'order', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('expenses')) {
                    const expStore = db.createObjectStore('expenses', { keyPath: 'id' });
                    expStore.createIndex('order', 'order', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('incomes')) {
                    const incStore = db.createObjectStore('incomes', { keyPath: 'id' });
                    incStore.createIndex('order', 'order', { unique: false });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                // Veritabanı boşsa varsayılan veriyi ekle (Seed)
                await this.checkAndSeedDefaultData();
                resolve(this.db);
            };
        });
    }

    async getStore(storeName, mode = 'readonly') {
        const tx = this.db.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    async checkAndSeedDefaultData() {
        const months = await this.getAllMonths();
        if (months.length === 0) {
            console.log("Başlangıç verileri yükleniyor...");
            await this.seedData(DEFAULT_MONTHS, DEFAULT_EXPENSES, DEFAULT_INCOMES);
        }
    }

    async seedData(months, expenses, incomes) {
        const tx = this.db.transaction(['months', 'expenses', 'incomes'], 'readwrite');
        
        const monthStore = tx.objectStore('months');
        const expStore = tx.objectStore('expenses');
        const incStore = tx.objectStore('incomes');

        months.forEach(m => monthStore.put(m));
        expenses.forEach(e => expStore.put(e));
        incomes.forEach(i => incStore.put(i));

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }

    // --- AYLAR (MONTHS) ---
    async getAllMonths() {
        return new Promise(async (resolve, reject) => {
            const store = await this.getStore('months', 'readonly');
            const request = store.getAll();
            request.onsuccess = () => {
                const list = request.result || [];
                list.sort((a, b) => (a.order || 0) - (b.order || 0));
                resolve(list);
            };
            request.onerror = (e) => reject(e);
        });
    }

    async addMonth(name) {
        const months = await this.getAllMonths();
        const id = 'month_' + Date.now();
        const order = months.length + 1;
        const newMonth = { id, name: name.trim(), order, extraIncome: 0 };
        
        const store = await this.getStore('months', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.put(newMonth);
            req.onsuccess = () => resolve(newMonth);
            req.onerror = (e) => reject(e);
        });
    }

    async updateMonth(month) {
        const store = await this.getStore('months', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.put(month);
            req.onsuccess = () => resolve(month);
            req.onerror = (e) => reject(e);
        });
    }

    async deleteMonth(monthId) {
        const store = await this.getStore('months', 'readwrite');
        await new Promise((resolve, reject) => {
            const req = store.delete(monthId);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });

        // Gider ve Gelirlerden bu ayın değerlerini temizle
        const expenses = await this.getAllExpenses();
        for (const exp of expenses) {
            if (exp.values && exp.values[monthId] !== undefined) {
                delete exp.values[monthId];
                await this.updateExpenseItem(exp);
            }
        }

        const incomes = await this.getAllIncomes();
        for (const inc of incomes) {
            if (inc.values && inc.values[monthId] !== undefined) {
                delete inc.values[monthId];
                await this.updateIncomeItem(inc);
            }
        }
    }

    // --- GİDERLER (EXPENSES) ---
    async getAllExpenses() {
        return new Promise(async (resolve, reject) => {
            const store = await this.getStore('expenses', 'readonly');
            const request = store.getAll();
            request.onsuccess = () => {
                const list = request.result || [];
                list.sort((a, b) => (a.order || 0) - (b.order || 0));
                resolve(list);
            };
            request.onerror = (e) => reject(e);
        });
    }

    async addExpenseItem(name, category = 'Genel') {
        const expenses = await this.getAllExpenses();
        const id = 'exp_' + Date.now();
        const order = expenses.length + 1;
        const newExpense = {
            id,
            name: name.trim(),
            category: category.trim() || 'Genel',
            order,
            values: {}
        };

        const store = await this.getStore('expenses', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.put(newExpense);
            req.onsuccess = () => resolve(newExpense);
            req.onerror = (e) => reject(e);
        });
    }

    async updateExpenseItem(expense) {
        const store = await this.getStore('expenses', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.put(expense);
            req.onsuccess = () => resolve(expense);
            req.onerror = (e) => reject(e);
        });
    }

    async updateExpenseValue(itemId, monthId, amount) {
        const store = await this.getStore('expenses', 'readwrite');
        return new Promise((resolve, reject) => {
            const getReq = store.get(itemId);
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (!item) return reject("Gider kalemi bulunamadı");
                if (!item.values) item.values = {};
                item.values[monthId] = Number(amount) || 0;
                
                const putReq = store.put(item);
                putReq.onsuccess = () => resolve(item);
                putReq.onerror = (e) => reject(e);
            };
            getReq.onerror = (e) => reject(e);
        });
    }

    async deleteExpenseItem(itemId) {
        const store = await this.getStore('expenses', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.delete(itemId);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    // --- GELİRLER (INCOMES) ---
    async getAllIncomes() {
        return new Promise(async (resolve, reject) => {
            const store = await this.getStore('incomes', 'readonly');
            const request = store.getAll();
            request.onsuccess = () => {
                const list = request.result || [];
                list.sort((a, b) => (a.order || 0) - (b.order || 0));
                resolve(list);
            };
            request.onerror = (e) => reject(e);
        });
    }

    async addIncomeItem(name, category = 'Maaş') {
        const incomes = await this.getAllIncomes();
        const id = 'inc_' + Date.now();
        const order = incomes.length + 1;
        const newIncome = {
            id,
            name: name.trim(),
            category: category.trim() || 'Gelir',
            order,
            values: {}
        };

        const store = await this.getStore('incomes', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.put(newIncome);
            req.onsuccess = () => resolve(newIncome);
            req.onerror = (e) => reject(e);
        });
    }

    async updateIncomeItem(income) {
        const store = await this.getStore('incomes', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.put(income);
            req.onsuccess = () => resolve(income);
            req.onerror = (e) => reject(e);
        });
    }

    async updateIncomeValue(itemId, monthId, amount) {
        const store = await this.getStore('incomes', 'readwrite');
        return new Promise((resolve, reject) => {
            const getReq = store.get(itemId);
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (!item) return reject("Gelir kalemi bulunamadı");
                if (!item.values) item.values = {};
                item.values[monthId] = Number(amount) || 0;
                
                const putReq = store.put(item);
                putReq.onsuccess = () => resolve(item);
                putReq.onerror = (e) => reject(e);
            };
            getReq.onerror = (e) => reject(e);
        });
    }

    async deleteIncomeItem(itemId) {
        const store = await this.getStore('incomes', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.delete(itemId);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    // --- DIŞA VE İÇE AKTARMA (EXPORT / IMPORT / RESET) ---
    async exportDatabase() {
        const months = await this.getAllMonths();
        const expenses = await this.getAllExpenses();
        const incomes = await this.getAllIncomes();
        
        return {
            version: 1,
            exportDate: new Date().toISOString(),
            months,
            expenses,
            incomes
        };
    }

    async importDatabase(data) {
        if (!data || !Array.isArray(data.months) || !Array.isArray(data.expenses) || !Array.isArray(data.incomes)) {
            throw new Error("Geçersiz yedek dosyası formatı.");
        }

        await this.clearAllData();
        await this.seedData(data.months, data.expenses, data.incomes);
    }

    async clearAllData() {
        const tx = this.db.transaction(['months', 'expenses', 'incomes'], 'readwrite');
        tx.objectStore('months').clear();
        tx.objectStore('expenses').clear();
        tx.objectStore('incomes').clear();

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }

    async resetToDefault() {
        await this.clearAllData();
        await this.seedData(DEFAULT_MONTHS, DEFAULT_EXPENSES, DEFAULT_INCOMES);
    }
}

// Global DB nesnesi
window.budgetDB = new BudgetDB();
