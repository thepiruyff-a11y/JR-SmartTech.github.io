/**
 * Librería Firebase para JR-SmartTec - VERSIÓN CORREGIDA
 * Sincronización en tiempo real entre Admin y Tienda
 */

// ⭐ REEMPLAZA ESTO CON TUS CREDENCIALES
const firebaseConfig = {
  apiKey: "AIza...",  // ← TU API KEY
  authDomain: "jr-smarttec.firebaseapp.com",  // ← TU AUTH DOMAIN
  databaseURL: "https://jr-smarttec-default-rtdb.firebaseio.com",  // ← TU DATABASE URL
  projectId: "jr-smarttec",  // ← TU PROJECT ID
  storageBucket: "jr-smarttec.appspot.com",  // ← TU STORAGE
  messagingSenderId: "123456789",  // ← TU MESSAGING ID
  appId: "1:123456789:web:abc123"  // ← TU APP ID
};

// Esperar a que Firebase esté disponible
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.database) {
            resolve();
        } else {
            setTimeout(() => waitForFirebase().then(resolve), 100);
        }
    });
}

waitForFirebase().then(() => {
    console.log('✅ Firebase cargado correctamente');
    
    // Inicializar Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const db = firebase.database();
    console.log('✅ Database inicializada');

    /**
     * Gestor de Productos con Firebase
     */
    class ProductManagerFirebase {
        constructor() {
            this.data = {};
            this.listeners = [];
            this.isOnline = true;
            this.db = db;
        }

        /**
         * Cargar productos de Firebase
         */
        loadProducts() {
            return new Promise((resolve, reject) => {
                this.db.ref('products').on('value', (snapshot) => {
                    const data = snapshot.val();
                    this.data = data || {};
                    this.notifyListeners();
                    console.log('✅ Productos cargados:', Object.keys(this.data).length);
                    resolve(this.data);
                }, (error) => {
                    console.error('❌ Error cargando productos:', error);
                    reject(error);
                });
            });
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
         * Agregar nuevo producto
         */
        addProduct(id, productData) {
            return new Promise((resolve, reject) => {
                this.db.ref('products/' + id).set({
                    ...productData,
                    id: id,
                    createdAt: new Date().toISOString()
                }).then(() => {
                    console.log('✅ Producto agregado:', id);
                    resolve(productData);
                }).catch(error => {
                    console.error('❌ Error agregando producto:', error);
                    reject(error);
                });
            });
        }

        /**
         * Actualizar producto
         */
        updateProduct(id, productData) {
            return new Promise((resolve, reject) => {
                this.db.ref('products/' + id).update({
                    ...productData,
                    updatedAt: new Date().toISOString()
                }).then(() => {
                    console.log('✅ Producto actualizado:', id);
                    resolve(productData);
                }).catch(error => {
                    console.error('❌ Error actualizando producto:', error);
                    reject(error);
                });
            });
        }

        /**
         * Eliminar producto
         */
        deleteProduct(id) {
            return new Promise((resolve, reject) => {
                this.db.ref('products/' + id).remove()
                    .then(() => {
                        console.log('✅ Producto eliminado:', id);
                        resolve(true);
                    })
                    .catch(error => {
                        console.error('❌ Error eliminando producto:', error);
                        reject(error);
                    });
            });
        }

        /**
         * Exportar datos como JSON (respaldo)
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
        importFromFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const imported = JSON.parse(e.target.result);
                        
                        // Subir cada producto a Firebase
                        let uploaded = 0;
                        let total = Object.keys(imported).length;
                        
                        if (total === 0) {
                            resolve(imported);
                            return;
                        }
                        
                        Object.keys(imported).forEach(id => {
                            this.db.ref('products/' + id).set(imported[id])
                                .then(() => {
                                    uploaded++;
                                    if (uploaded === total) {
                                        console.log('✅ Todos los productos importados');
                                        resolve(imported);
                                    }
                                })
                                .catch(reject);
                        });
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
            this.listeners.forEach(callback => {
                try {
                    callback(this.data);
                } catch (e) {
                    console.error('Error en listener:', e);
                }
            });
        }
    }

    // Instancia global
    window.productManager = new ProductManagerFirebase();
    console.log('✅ ProductManager inicializado');

    // Monitorear conexión
    db.ref('.info/connected').on('value', (snapshot) => {
        window.productManager.isOnline = snapshot.val();
        console.log('🔗 Firebase conectado:', snapshot.val());
    });

    // Auto-cargar al iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.productManager.loadProducts().catch(err => {
                console.error('❌ Error inicial cargando productos:', err);
            });
        });
    } else {
        window.productManager.loadProducts().catch(err => {
            console.error('❌ Error inicial cargando productos:', err);
        });
    }
});

console.log('✅ firebase-shared.js cargado');
