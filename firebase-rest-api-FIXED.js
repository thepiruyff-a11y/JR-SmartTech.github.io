/**
 * Librería Firebase REST API para JR-SmartTec
 * NO REQUIERE CDN - Usa REST API directamente
 */

// ⭐ REEMPLAZA ESTO CON TUS CREDENCIALES
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "TU_MESSAGING_ID",
  appId: "TU_APP_ID"
};

console.log('📦 firebase-rest-api.js iniciando (SIN CDN)...');

/**
 * Gestor de Productos con Firebase REST API
 */
class ProductManagerRestAPI {
  constructor() {
    this.data = {};
    this.listeners = [];
    this.isOnline = true;
    this.connected = false;
    this.databaseURL = firebaseConfig.databaseURL;
    console.log('🏗️ ProductManager (REST API) inicializado');
    console.log('📡 URL de base de datos:', this.databaseURL);
    
    // Verificar conexión
    this.checkConnection();
  }

  /**
   * Verificar conexión a Firebase
   */
  async checkConnection() {
    try {
      console.log('🔗 Verificando conexión a Firebase...');
      // Agregar API Key a la URL para REST API
      const apiKey = firebaseConfig.apiKey;
      const url = `${this.databaseURL}/.json?limitToFirst=1&auth=${apiKey}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        this.connected = true;
        this.isOnline = true;
        console.log('✅ Conectado a Firebase');
        this.loadProducts();
      } else {
        console.error('❌ Error de conexión:', response.status);
        console.error('Respuesta:', response.statusText);
        setTimeout(() => this.checkConnection(), 2000);
      }
    } catch (error) {
      console.error('❌ Error conectando a Firebase:', error.message);
      this.connected = false;
      this.isOnline = false;
      setTimeout(() => this.checkConnection(), 2000);
    }
  }

  /**
   * Cargar productos de Firebase
   */
  async loadProducts() {
    try {
      console.log('📥 Cargando productos...');
      const apiKey = firebaseConfig.apiKey;
      const url = `${this.databaseURL}/products.json?auth=${apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.data = data || {};
      
      console.log('✅ Productos cargados:', Object.keys(this.data).length);
      this.notifyListeners();
      
      return this.data;
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
      throw error;
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
   * Agregar nuevo producto
   */
  async addProduct(id, productData) {
    try {
      console.log('➕ Agregando producto:', id);
      const apiKey = firebaseConfig.apiKey;
      const url = `${this.databaseURL}/products/${id}.json?auth=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...productData,
          id: id,
          createdAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      this.data[id] = result;
      this.notifyListeners();
      
      console.log('✅ Producto agregado:', id);
      return result;
    } catch (error) {
      console.error('❌ Error agregando producto:', error);
      throw error;
    }
  }

  /**
   * Actualizar producto
   */
  async updateProduct(id, productData) {
    try {
      console.log('✏️ Actualizando producto:', id);
      const apiKey = firebaseConfig.apiKey;
      const url = `${this.databaseURL}/products/${id}.json?auth=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...productData,
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      this.data[id] = { ...this.data[id], ...result };
      this.notifyListeners();
      
      console.log('✅ Producto actualizado:', id);
      return result;
    } catch (error) {
      console.error('❌ Error actualizando producto:', error);
      throw error;
    }
  }

  /**
   * Eliminar producto
   */
  async deleteProduct(id) {
    try {
      console.log('🗑️ Eliminando producto:', id);
      const apiKey = firebaseConfig.apiKey;
      const url = `${this.databaseURL}/products/${id}.json?auth=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      delete this.data[id];
      this.notifyListeners();
      
      console.log('✅ Producto eliminado:', id);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando producto:', error);
      throw error;
    }
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
  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          
          let uploaded = 0;
          const total = Object.keys(imported).length;
          
          if (total === 0) {
            resolve(imported);
            return;
          }
          
          for (const id in imported) {
            try {
              await this.addProduct(id, imported[id]);
              uploaded++;
              
              if (uploaded === total) {
                console.log('✅ Todos los productos importados');
                resolve(imported);
              }
            } catch (error) {
              console.error('Error importando producto:', id, error);
            }
          }
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
window.productManager = new ProductManagerRestAPI();
console.log('✅ window.productManager creado (REST API)');
console.log('✅ firebase-rest-api.js completamente inicializado');
