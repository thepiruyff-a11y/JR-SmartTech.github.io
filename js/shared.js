/**
 * Librería compartida para JR-SmartTec
 * Maneja la carga y sincronización de productos entre Admin y Tienda
 */

class ProductManager {
    constructor(jsonPath = './data/products.json') {
        this.jsonPath = jsonPath;
        this.data = {};
        this.listeners = [];
    }

    /**
     * Cargar productos del JSON
     */
    async loadProducts() {
        try {
            const response = await fetch(this.jsonPath);
            if (!response.ok) throw new Error('Error cargando productos');
            this.data = await response.json();
            this.notifyListeners();
            return this.data;
        } catch (error) {
            console.error('Error al cargar productos:', error);
            return null;
        }
    }

    /**
     * Obtener todos los productos
     */
    getAll() {
        return this.data;
    }

    /**
     * Obtener producto por ID
     */
    getById(id) {
        return this.data[id] || null;
    }

    /**
     * Obtener productos por categoría
     */
    getByCategory(category) {
        return Object.values(this.data).filter(p => p.cat === category);
    }

    /**
     * Actualizar producto localmente (para admin)
     */
    updateProduct(id, productData) {
        this.data[id] = {
            ...productData,
            id: id
        };
        this.notifyListeners();
        return this.data[id];
    }

    /**
     * Agregar nuevo producto
     */
    addProduct(id, productData) {
        if (this.data[id]) {
            console.warn(`El producto ${id} ya existe`);
            return null;
        }
        this.data[id] = {
            ...productData,
            id: id
        };
        this.notifyListeners();
        return this.data[id];
    }

    /**
     * Eliminar producto
     */
    deleteProduct(id) {
        if (delete this.data[id]) {
            this.notifyListeners();
            return true;
        }
        return false;
    }

    /**
     * Guardar datos a localStorage como respaldo
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('jr_smarttec_products', JSON.stringify(this.data));
            return true;
        } catch (error) {
            console.error('Error guardando a localStorage:', error);
            return false;
        }
    }

    /**
     * Cargar datos de localStorage
     */
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('jr_smarttec_products');
            if (stored) {
                this.data = JSON.parse(stored);
                this.notifyListeners();
                return this.data;
            }
        } catch (error) {
            console.error('Error cargando de localStorage:', error);
        }
        return null;
    }

    /**
     * Exportar datos como JSON (para descargar)
     */
    exportAsJSON() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `products-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Importar datos desde archivo JSON
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    this.data = imported;
                    this.saveToLocalStorage();
                    this.notifyListeners();
                    resolve(this.data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsText(file);
        });
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        const products = Object.values(this.data);
        return {
            totalProducts: products.length,
            totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
            lowStockCount: products.filter(p => p.stock < 10).length,
            categories: [...new Set(products.map(p => p.cat))]
        };
    }

    /**
     * Suscribirse a cambios
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notificar a los listeners
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.data));
    }

    /**
     * Sincronizar: simula recargar desde el servidor
     */
    async sync() {
        return this.loadProducts();
    }
}

// Instancia global
window.productManager = new ProductManager('./data/products.json');

// Auto-cargar al iniciar
document.addEventListener('DOMContentLoaded', () => {
    window.productManager.loadProducts();
});
