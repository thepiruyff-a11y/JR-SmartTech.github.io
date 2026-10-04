/**
 * Librería Firebase para JR-SmartTec - VERSIÓN CORREGIDA v2
 * Con mejor manejo de CDN y fallback
 */

// ⭐ REEMPLAZA ESTO CON TUS CREDENCIALES
const firebaseConfig = {
  apiKey: "AIzaSyDeNidguZDb3mPwtv-4_M7iY3v_4I2YZ64",
  authDomain: "jr-smarttech-7a905.firebaseapp.com",
  databaseURL: "https://jr-smarttech-7a905-default-rtdb.firebaseio.com",
  projectId: "jr-smarttech-7a905",
  storageBucket: "jr-smarttech-7a905.firebasestorage.app",
  messagingSenderId: "1040964022664",
  appId: "1:1040964022664:web:f8f953a0d987ac266d0a3d"
};

console.log('📦 firebase-shared-WORKING.js iniciando...');

// Función mejorada para esperar a Firebase
function initializeProductManager() {
  // Verificar que Firebase esté disponible
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase no está disponible. Reintentando en 500ms...');
    setTimeout(initializeProductManager, 500);
    return;
  }

  if (!firebase.database) {
    console.error('❌ Firebase Database no está disponible. Reintentando en 500ms...');
    setTimeout(initializeProductManager, 500);
    return;
  }

  console.log('✅ Firebase está disponible');

  // Inicializar Firebase solo si no está ya inicializado
  if (!firebase.apps.length) {
    try {
      firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase inicializado con proyecto:', firebaseConfig.projectId);
    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error);
      return;
    }
  }

  const db = firebase.database();
  console.log('✅ Database obtenida');

  /**
   * Gestor de Productos con Firebase
   */
  class ProductManagerFirebase {
    constructor() {
      this.data = {};
      this.listeners = [];
      this.isOnline = false;
      this.db = db;
      this.connected = false;
      console.log('🏗️ ProductManager inicializado');
    }

    /**
     * Cargar productos de Firebase
     */
    loadProducts() {
      return new Promise((resolve, reject) => {
        console.log('📥 Intentando cargar productos...');
        
        this.db.ref('products').on('value', (snapshot) => {
          const data = snapshot.val();
          this.data = data || {};
          this.notifyListeners();
          console.log('✅ Productos cargados:', Object.keys(this.data).length);
          resolve(this.data);
        }, (error) => {
          console.error('❌ Error cargando productos:', error);
          console.error('Detalles:', error.code, error.message);
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
     * Exportar datos como JSON
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
      console.log('💾 Datos exportados');
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

  // Crear instancia global
  window.productManager = new ProductManagerFirebase();
  console.log('✅ window.productManager creado');

  // Monitorear conexión a Firebase
  db.ref('.info/connected').on('value', (snapshot) => {
    window.productManager.connected = snapshot.val();
    window.productManager.isOnline = snapshot.val();
    console.log('🔗 Firebase conectado:', snapshot.val());
    
    if (snapshot.val()) {
      // Auto-cargar productos cuando se conecta
      window.productManager.loadProducts().catch(err => {
        console.error('❌ Error cargando productos al conectar:', err);
      });
    }
  });

  // Auto-cargar al iniciar si el documento ya está listo
  const loadOnReady = () => {
    window.productManager.loadProducts().catch(err => {
      console.error('❌ Error inicial cargando productos:', err);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadOnReady);
  } else {
    loadOnReady();
  }

  console.log('✅ firebase-shared-WORKING.js completamente inicializado');
}

// Iniciar cuando sea posible
if (typeof firebase !== 'undefined') {
  console.log('✅ Firebase ya está disponible');
  initializeProductManager();
} else {
  console.log('⏳ Esperando a que Firebase cargue...');
  setTimeout(initializeProductManager, 1000);
}

console.log('✅ firebase-shared-WORKING.js cargado en el contexto global');
