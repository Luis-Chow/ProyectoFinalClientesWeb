/**
 * Modulo de Base de Datos (IndexedDB Wrapper)
 * Maneja toda la persistencia de datos localmente en el navegador.
 */
class FinanceDB {
    constructor() {
        this.dbName = 'FinanceAppDB'; // Nombre de la BD en el navegador
        this.dbVersion = 1;
        this.db = null;
    }

    // Inicializa la conexion y crea las tablas si no existen
    async connect() {
        return new Promise((resolve, reject) => {
            console.log("Intentando conectar a la Base de Datos...");
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("Error al abrir la BD:", event);
                reject("Error opening DB");
            };

            // Este evento corre solo la primera vez o cuando cambiamos la version
            request.onupgradeneeded = (event) => {
                console.log("Configurando tablas (Object Stores)...");
                const db = event.target.result;
                
                // 1. Store: Categorias
                // keyPath: 'id' significa que cada categoria tendra un ID unico automatico
                if (!db.objectStoreNames.contains('categories')) {
                    const catStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                    
                    // Agregar datos iniciales (Semilla)
                    catStore.transaction.oncomplete = () => {
                        const categoryStore = db.transaction('categories', 'readwrite').objectStore('categories');
                        const defaults = ['Alimentación', 'Transporte', 'Ocio', 'Servicios', 'Salud', 'Educación', 'Otros'];
                        defaults.forEach(name => categoryStore.add({ name: name }));
                        console.log("Categorías por defecto insertadas.");
                    };
                }

                // 2. Store: Transacciones
                if (!db.objectStoreNames.contains('transactions')) {
                    const txStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    // Creamos indices para poder buscar rapido por fecha o tipo
                    txStore.createIndex('date', 'date', { unique: false });
                    txStore.createIndex('type', 'type', { unique: false });
                }

                // 3. Store: Presupuestos 
                // keyPath: 'id' manual (ej: "2023-10-Alimentacion")
                if (!db.objectStoreNames.contains('budgets')) {
                    db.createObjectStore('budgets', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("Base de Datos conectada exitosamente.");
                resolve(this.db);
            };
        });
    }

    //Metodos Genericos para leer/escribir datos

    //Obtener todos los datos de una tabla (store)
    getAll(storeName) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    //Agregar un dato a una tabla
    add(storeName, data) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.add(data);
            tx.oncomplete = () => resolve(true);
        });
    }

     //Eliminar un dato por su ID
    delete(storeName, id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.delete(id);
            tx.oncomplete = () => resolve(true);
        });
    }
}

/**
 * Logica Principal de la Aplicacion
 * Controla la interfaz y une la BD con el HTML.
 */
class FinanceApp {
    constructor() {
        this.db = new FinanceDB();
        //Definimos el mes actual usando hora LOCAL (no UTC) para evitar errores de zona horaria
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        this.currentMonth = `${year}-${month}`;
    }

    async init() {
        //1. Conectar a la BD
        await this.db.connect();
        
        // 2. Inicializar filtro de fecha en el HTML
        const dateInput = document.getElementById('global-month');
        if(dateInput) {
            dateInput.value = this.currentMonth;
        }

        //Cargar categorias al iniciar
        this.updateUI();
        
        console.log("App Inicializada. Categorias cargadas.");
    }

    async updateUI() {
        // Funcion central para actualizar toda la interfaz
        await this.renderCategories();
        await this.renderTransactions();
    }

    //LOGICA DE CATEGORIAS

    //1. Renderizar la tabla de categorias
    async renderCategories() {
        const categories = await this.db.getAll('categories');
        const list = document.getElementById('cat-list');
        const selectTx = document.getElementById('tx-category');

        //Limpiamos la lista antes de volver a pintar
        if (list) {
            list.innerHTML = '';
            if (selectTx) selectTx.innerHTML = '<option value="">Seleccionar Categoría...</option>';
            categories.forEach(cat => {
            if (list) {
                list.innerHTML += `<tr><td>${cat.name}</td><td><button class="btn btn-danger" onclick="app.deleteCategory(${cat.id})"><i class="fas fa-trash"></i></button></td></tr>`;
            }
            if (selectTx) {
                selectTx.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
            }
        });
        }
    }

    //2. Agregar nueva categoria
    async addCategory(e) {
        e.preventDefault(); // Evita que se recargue la pagina
        const nameInput = document.getElementById('cat-name');
        const name = nameInput.value;
        
        if(name) {
            await this.db.add('categories', { name });
            nameInput.value = ''; // Limpiar input
            this.updateUI(); // Recargar lista
            alert('Categoría agregada correctamente');
        }
    }

    //3. Eliminar categoria
    async deleteCategory(id) {
        if(confirm('¿Eliminar categoría? Se borrarán las transacciones asociadas.')) {
            // Nota: Mas adelante aqui borraremos tambien las transacciones asociadas
            // Por ahora, solo borramos la categoria de la BD
            await this.db.delete('categories', id);
            this.updateUI();
        }
    }

    //LOGICA DE TRANSACCIONES

    //1. Renderizar la tabla de transacciones
    async renderTransactions() {
        const allTxs = await this.db.getAll('transactions');
        const search = (document.getElementById('search-tx')?.value || '').toLowerCase();
        
        const filtered = allTxs
            .filter(t => (t.desc||'').toLowerCase().includes(search) || t.category.toLowerCase().includes(search))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const tbody = document.getElementById('tx-list');
        if(!tbody) return;
        tbody.innerHTML = '';

        filtered.forEach(tx => {
            const isIncome = tx.type === 'income';
            tbody.innerHTML += `
                <tr>
                    <td>${tx.date}</td>
                    <td><span class="tag ${isIncome ? 'tag-income' : 'tag-expense'}">${isIncome ? 'Ingreso' : 'Egreso'}</span></td>
                    <td>${tx.category}</td>
                    <td>${tx.desc || '-'}</td>
                    <td class="${isIncome ? 'text-success' : 'text-danger'} font-bold">
                        ${isIncome ? '+' : '-'}$${tx.amount.toFixed(2)}
                    </td>
                    <td><button class="btn btn-danger" onclick="app.deleteTransaction(${tx.id})"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        });
    }

    //2. Agregar nueva transaccion
    async addTransaction(e) {
        e.preventDefault();
        const type = document.getElementById('tx-type').value;
        const amount = parseFloat(document.getElementById('tx-amount').value);
        const date = document.getElementById('tx-date').value;
        const category = document.getElementById('tx-category').value;
        const desc = document.getElementById('tx-desc').value;

        await this.db.add('transactions', { type, amount, date, category, desc });
        e.target.reset();
        document.getElementById('tx-date').valueAsDate = new Date();
        this.updateUI();
        alert('Transacción guardada');
    }

    //3. Eliminar transaccion
    async deleteTransaction(id) {
        if(confirm('¿Eliminar transacción?')) {
            await this.db.delete('transactions', id);
            this.updateUI();
        }
    }

    //Maneja el cambio de pestañas (Dashboard, Transacciones, etc.)
    navigate(sectionId) {
        //Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

        //Mostrar la deseada
        document.getElementById(sectionId).classList.add('active');

        //Actualizar botones del menu
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        //Buscar el boton que llamo a esta funcion y activarlo visualmente
        const activeBtn = document.querySelector(`button[onclick="app.navigate('${sectionId}')"]`);
        if(activeBtn) activeBtn.classList.add('active');
        
        //Cambiar titulo
        const titles = {
            'dashboard': 'Dashboard Principal',
            'transactions': 'Historial de Transacciones',
            'categories': 'Gestión de Categorías',
            'budgets': 'Control de Presupuestos'
        };
        const titleEl = document.getElementById('page-title');
        if(titleEl) titleEl.innerText = titles[sectionId];
    }
    
    //Placeholder para cuando cambie la fecha
    handleDateChange(value) {
        this.currentMonth = value;
        this.updateUI();
    }
}

//Instancia global de la aplicacion
const app = new FinanceApp();

//Iniciar cuando el navegador termine de cargar
window.onload = () => app.init();