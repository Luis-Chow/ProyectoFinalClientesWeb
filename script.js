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
                        const defaults = ['Alimentacion', 'Transporte', 'Ocio', 'Servicios', 'Salud', 'Educacion', 'Otros'];
                        defaults.forEach(name => categoryStore.add({ name: name }));
                        console.log("Categorias por defecto insertadas.");
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
        // Definimos el mes actual
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        this.currentMonth = `${year}-${month}`;
        this.charts = {}; // Almacena instancias de graficos para poder destruirlos al actualizar
        this.editingTxId = null;
    }

    async init() {
        // 1. Conectar a la BD
        await this.db.connect();
        
        // 2. Inicializar filtro de fecha en el HTML
        const dateInput = document.getElementById('global-month');
        if(dateInput) {
            dateInput.value = this.currentMonth;
            
            dateInput.addEventListener('change', (e) => {
                this.handleDateChange(e.target.value);
            });
        }

        // Cargar categorias al iniciar
        this.updateUI();
        console.log("App Inicializada. Categorias cargadas y filtro activo.");
    }

    async updateUI() {
        // Funcion central para actualizar toda la interfaz
        await this.renderCategories();
        await this.renderTransactions();
        await this.renderBudgets();
        await this.updateDashboard();
    }

    createEl(tag, className = '', text = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text; // textContent es SEGURO contra XSS
        return el;
    }
    
    //LOGICA DE CATEGORIAS

    //1. Renderizar la tabla de categorias
    async renderCategories() {
        const categories = await this.db.getAll('categories');
        
        // Referencias a elementos del DOM
        const list = document.getElementById('cat-list');
        const selectTx = document.getElementById('tx-category');
        const selectBudget = document.getElementById('budget-category');

        // Limpieza SEGURA (reemplaza innerHTML = '')
        if (list) list.replaceChildren(); 
        
        // Resetear selects manteniendo la opcion por defecto
        if (selectTx) {
            selectTx.replaceChildren();
            selectTx.appendChild(this.createEl('option', '', 'Seleccionar Categoria...'));
        }
        if (selectBudget) {
            selectBudget.replaceChildren();
            selectBudget.appendChild(this.createEl('option', '', 'Categoria...'));
        }

        categories.forEach(cat => {
            //Llenar tabla de gestion
            if (list) {
                const row = this.createEl('tr');
                
                //Celda Nombre
                const tdName = this.createEl('td', '', cat.name);
                row.appendChild(tdName);

                //Celda Acciones
                const tdActions = this.createEl('td');
                
                //Boton Editar
                const btnEdit = this.createEl('button', 'btn btn-primary');
                btnEdit.style.marginRight = '5px';
                btnEdit.onclick = () => this.editCategory(cat.id); // Evento directo
                const iconEdit = this.createEl('i', 'fas fa-edit');
                btnEdit.appendChild(iconEdit);

                //Boton Borrar
                const btnDel = this.createEl('button', 'btn btn-danger');
                btnDel.onclick = () => this.deleteCategory(cat.id); // Evento directo
                const iconDel = this.createEl('i', 'fas fa-trash');
                btnDel.appendChild(iconDel);

                tdActions.appendChild(btnEdit);
                tdActions.appendChild(btnDel);
                row.appendChild(tdActions);

                list.appendChild(row);
            }

            //Llenar selects
            if (selectTx) {
                const opt = this.createEl('option', '', cat.name);
                opt.value = cat.name;
                selectTx.appendChild(opt);
            }
            if (selectBudget) {
                const opt = this.createEl('option', '', cat.name);
                opt.value = cat.name;
                selectBudget.appendChild(opt);
            }
        });
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
            alert('Categoria agregada correctamente');
        }
    }

    //3. Editar categoria
    async editCategory(id) {
        const categories = await this.db.getAll('categories');
        const cat = categories.find(c => c.id === id);
        if (!cat) return;

        const newName = prompt("Nuevo nombre para la categoria:", cat.name);
        if (newName && newName !== cat.name) {
            //1. Actualizar la categoria
            const txCat = this.db.db.transaction(['categories', 'transactions'], 'readwrite');
            
            //actualizar Category Store
            const catStore = txCat.objectStore('categories');
            catStore.put({ id: id, name: newName });

            //2. Actualizar Transacciones asociadas
            const txStore = txCat.objectStore('transactions');
            const allTxsRequest = txStore.getAll();
            
            allTxsRequest.onsuccess = () => {
                const transactions = allTxsRequest.result;
                transactions.forEach(t => {
                    if (t.category === cat.name) {
                        t.category = newName; // Cambiamos el nombre viejo por el nuevo
                        txStore.put(t);
                    }
                });
            };

            txCat.oncomplete = () => {
                alert('Categoria y transacciones actualizadas.');
                this.updateUI();
            };
        }
    } 

    //4. Eliminar categoria
    async deleteCategory(id) {
        if(!confirm('¿Eliminar categoria? Se borrarán todas las transacciones asociadas.')) return;

        //1. Primero obtenemos la categoria para saber su nombre
        const categories = await this.db.getAll('categories');
        const categoryToDelete = categories.find(c => c.id === id);

        if (!categoryToDelete) return;

        //2. Obtenemos todas las transacciones
        const transactions = await this.db.getAll('transactions');

        //3. Filtramos y borramos las transacciones que tengan ese nombre de categoria
        const txsToDelete = transactions.filter(t => t.category === categoryToDelete.name);
        
        //Usamos Promise.all para esperar a que todas se borren
        const deletePromises = txsToDelete.map(t => this.db.delete('transactions', t.id));
        await Promise.all(deletePromises);

        //4. Finalmente borramos la categoria
        await this.db.delete('categories', id);
        
        alert(`Categoria eliminada junto con ${txsToDelete.length} transacciones.`);
        this.updateUI();
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

        //Limpieza segura
        tbody.replaceChildren();

        filtered.forEach(tx => {
            const isIncome = tx.type === 'income';
            const row = this.createEl('tr');

            //Fecha
            row.appendChild(this.createEl('td', '', tx.date));

            //Tipo 
            const tdType = this.createEl('td');
            const spanType = this.createEl('span', isIncome ? 'tag tag-income' : 'tag tag-expense', isIncome ? 'Ingreso' : 'Egreso');
            tdType.appendChild(spanType);
            row.appendChild(tdType);

            //Categoria
            row.appendChild(this.createEl('td', '', tx.category));

            //Descripcion (SEGURIDAD CRiTICA AQUi)
            row.appendChild(this.createEl('td', '', tx.desc || '-'));

            //Monto
            const tdAmount = this.createEl('td', isIncome ? 'text-success font-bold' : 'text-danger font-bold');
            tdAmount.textContent = `${isIncome ? '+' : '-'}$${tx.amount.toFixed(2)}`;
            row.appendChild(tdAmount);

            //Acciones
            const tdActions = this.createEl('td');
            tdActions.style.display = 'flex';
            tdActions.style.gap = '5px';

            //Boton Editar
            const btnEdit = this.createEl('button', 'btn btn-primary');
            btnEdit.title = 'Editar';
            btnEdit.onclick = () => this.editTransaction(tx.id); // Vinculacion directa
            btnEdit.appendChild(this.createEl('i', 'fas fa-edit'));
            
            //Boton Borrar
            const btnDel = this.createEl('button', 'btn btn-danger');
            btnDel.title = 'Borrar';
            btnDel.onclick = () => this.deleteTransaction(tx.id); // Vinculacion directa
            btnDel.appendChild(this.createEl('i', 'fas fa-trash'));

            tdActions.appendChild(btnEdit);
            tdActions.appendChild(btnDel);
            row.appendChild(tdActions);

            // Agregar fila a la tabla
            tbody.appendChild(row);
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

        if (this.editingTxId) {
            const tx = this.db.db.transaction('transactions', 'readwrite');
            const store = tx.objectStore('transactions');
            store.put({ 
                id: this.editingTxId, // Importante: Mantener el ID
                type, amount, date, category, desc 
            });
            
            tx.oncomplete = () => {
                alert('Transaccion actualizada');
                this.editingTxId = null; // Resetear estado
                document.querySelector('#tx-form button[type="submit"]').innerText = "Guardar";
                e.target.reset();
                this.updateUI();
            };
        } else {
            // MODO CREACIoN (Codigo original)
            await this.db.add('transactions', { type, amount, date, category, desc });
            e.target.reset();
            document.getElementById('tx-date').valueAsDate = new Date();
            this.updateUI();
            alert('Transaccion guardada');
        }
    }
    
    //3. Editar Categoria
    async editCategory(id) {
        const categories = await this.db.getAll('categories');
        const cat = categories.find(c => c.id === id);
        if (!cat) return;

        const newName = prompt("Nuevo nombre para la categoria:", cat.name);
        if (newName && newName !== cat.name) {
            // 1. Actualizar la categoria
            const txCat = this.db.db.transaction(['categories', 'transactions'], 'readwrite');
            
            // Update Category Store
            const catStore = txCat.objectStore('categories');
            catStore.put({ id: id, name: newName });

            // 2. Actualizar Transacciones asociadas (Cascading Update)
            const txStore = txCat.objectStore('transactions');
            const allTxsRequest = txStore.getAll();
            
            allTxsRequest.onsuccess = () => {
                const transactions = allTxsRequest.result;
                transactions.forEach(t => {
                    if (t.category === cat.name) {
                        t.category = newName; // Cambiamos el nombre viejo por el nuevo
                        txStore.put(t);
                    }
                });
            };

            txCat.oncomplete = () => {
                alert('Categoria y transacciones actualizadas.');
                this.updateUI();
            };
        }
    }

    //4. Eliminar transaccion
    async deleteTransaction(id) {
        if(confirm('¿Eliminar transaccion?')) {
            await this.db.delete('transactions', id);
            this.updateUI();
        }
    }

    //LOGICA DE PRESUPUESTOS

    //1. Guardar presupuesto
    async saveBudget(e) {
        e.preventDefault();
        const category = document.getElementById('budget-category').value;
        const amount = parseFloat(document.getElementById('budget-amount').value);
        
        // ID unico compuesto: "2023-10-Alimentacion"
        const id = `${this.currentMonth}-${category}`;
        
        // Usamos .put en lugar de .add para sobrescribir si ya existe
        const tx = this.db.db.transaction('budgets', 'readwrite');
        tx.objectStore('budgets').put({ id, month: this.currentMonth, category, limit: amount });
        
        tx.oncomplete = () => {
            alert('Presupuesto actualizado');
            this.updateUI();
        };
    }

    //2. Renderizar presupuestos
    async renderBudgets() {
        const budgets = await this.db.getAll('budgets');
        const transactions = await this.db.getAll('transactions');
        
        const monthBudgets = budgets.filter(b => b.month === this.currentMonth);
        
        const expensesByCategory = {};
        transactions.forEach(t => {
            if (t.type === 'expense' && t.date.startsWith(this.currentMonth)) {
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
            }
        });

        const tbody = document.getElementById('budget-list');
        if(!tbody) return;
        
        //Limpieza segura
        tbody.replaceChildren();

        monthBudgets.forEach(b => {
            const real = expensesByCategory[b.category] || 0;
            const diff = b.limit - real;
            const percent = b.limit > 0 ? (real / b.limit) * 100 : 0;
            
            const row = this.createEl('tr');

            //Categoria
            row.appendChild(this.createEl('td', '', b.category));
            
            //Presupuesto
            row.appendChild(this.createEl('td', '', `$${b.limit.toFixed(2)}`));
            
            //Gasto Real
            row.appendChild(this.createEl('td', '', `$${real.toFixed(2)}`));
            
            //Diferencia
            const tdDiff = this.createEl('td', diff < 0 ? 'text-danger' : 'text-success');
            tdDiff.textContent = `$${diff.toFixed(2)}`;
            row.appendChild(tdDiff);

            //Estado (Porcentaje)
            const tdStatus = this.createEl('td');
            let statusClass = 'text-success';
            if (percent > 80) statusClass = 'text-warning';
            if (percent > 100) statusClass = 'text-danger';
            
            const spanStatus = this.createEl('span', statusClass, `${percent.toFixed(1)}%`);
            spanStatus.style.fontWeight = 'bold';
            tdStatus.appendChild(spanStatus);
            row.appendChild(tdStatus);

            // Accion (Borrar)
            const tdAction = this.createEl('td');
            const btnDel = this.createEl('button', 'btn btn-danger');
            btnDel.style.padding = '0.25rem 0.5rem';
            btnDel.style.fontSize = '0.8rem';
            btnDel.onclick = () => this.deleteBudget(b.id);
            btnDel.appendChild(this.createEl('i', 'fas fa-trash'));
            
            tdAction.appendChild(btnDel);
            row.appendChild(tdAction);

            tbody.appendChild(row);
        });
    }

    //3. Eliminar presupuesto
    async deleteBudget(id) {
        if(confirm('¿Eliminar presupuesto para esta categoria?')) {
            await this.db.delete('budgets', id);
            this.updateUI();
        }
    }

    async updateDashboard() {
        const txs = await this.db.getAll('transactions');
        const budgets = await this.db.getAll('budgets');
        const monthTxs = txs.filter(t => t.date.startsWith(this.currentMonth));
        
        let income = 0, expense = 0;
        const expensesByCat = {};
        
        monthTxs.forEach(t => {
            if(t.type === 'income') income += t.amount;
            else {
                expense += t.amount;
                expensesByCat[t.category] = (expensesByCat[t.category] || 0) + t.amount;
            }
        });

        // KPIs
        if(document.getElementById('kpi-income')) {
            document.getElementById('kpi-income').innerText = `$${income.toFixed(2)}`;
            document.getElementById('kpi-expense').innerText = `$${expense.toFixed(2)}`;
            document.getElementById('kpi-balance').innerText = `$${(income - expense).toFixed(2)}`;
            
            const monthBudgets = budgets.filter(b => b.month === this.currentMonth);
            const totalBudget = monthBudgets.reduce((acc, b) => acc + b.limit, 0);
            const budgetStatus = totalBudget > 0 ? (expense / totalBudget) * 100 : 0;
            document.getElementById('kpi-budget-status').innerText = `${budgetStatus.toFixed(1)}%`;
        }

        //Renderizar Transacciones Recientes (ultimas 5) ---
        const recentTable = document.getElementById('dashboard-recent-tx');
        if (recentTable) {
            recentTable.replaceChildren();
            //Ordenar por fecha desc y tomar 5
            const recent = [...monthTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
            
            recent.forEach(t => {
                const row = this.createEl('tr');
                row.appendChild(this.createEl('td', '', t.date));
                row.appendChild(this.createEl('td', '', t.category));
                const tdAmount = this.createEl('td', t.type === 'income' ? 'text-success' : 'text-danger');
                tdAmount.textContent = `$${t.amount.toFixed(2)}`;
                row.appendChild(tdAmount);
                recentTable.appendChild(row);
            });
        }

        this.renderCharts(monthTxs, expensesByCat, income, expense, budgets, txs);
    }

    renderCharts(monthTxs, expensesByCat, income, expense, allBudgets, allTxs) {
        if (!this.charts) this.charts = {};
        const destroyChart = (id) => { if (this.charts[id]) this.charts[id].destroy(); };

        // 1. Dona (Categorias)
        if(document.getElementById('chart-categories')) {
            destroyChart('chart-categories');
            this.charts['chart-categories'] = new Chart(document.getElementById('chart-categories'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(expensesByCat),
                    datasets: [{ data: Object.values(expensesByCat), backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] }]
                },
                options: { plugins: { title: { display: true, text: 'Gastos por Categoria' } }, maintainAspectRatio: false }
            });
        }

        // 2. Barras (Balance)
        if(document.getElementById('chart-distribution')) {
            destroyChart('chart-distribution');
            this.charts['chart-distribution'] = new Chart(document.getElementById('chart-distribution'), {
                type: 'bar',
                data: { labels: ['Ingresos', 'Egresos'], datasets: [{ label: 'Monto', data: [income, expense], backgroundColor: ['#10b981', '#ef4444'] }] },
                options: { plugins: { title: { display: true, text: 'Balance Mensual' } }, maintainAspectRatio: false }
            });
        }
        
        // 3. Linea (Tendencia)
        const history = {};
        allTxs.forEach(t => {
            const m = t.date.slice(0, 7);
            if (!history[m]) history[m] = 0;
            history[m] += (t.type === 'income' ? t.amount : -t.amount);
        });
        const sortedMonths = Object.keys(history).sort();

        if(document.getElementById('chart-balance-trend')) {
            destroyChart('chart-balance-trend');
            this.charts['chart-balance-trend'] = new Chart(document.getElementById('chart-balance-trend'), {
                type: 'line',
                data: { labels: sortedMonths, datasets: [{ label: 'Balance Historico', data: sortedMonths.map(m => history[m]), borderColor: '#3b82f6', tension: 0.1 }] },
                options: { plugins: { title: { display: true, text: 'Evolucion' } }, maintainAspectRatio: false }
            });
        }

        // 4. Barras Agrupadas (Presupuesto)
        const monthBudgets = allBudgets.filter(b => b.month === this.currentMonth);
        const labels = monthBudgets.map(b => b.category);
        
        if(document.getElementById('chart-budget-vs-real')) {
            destroyChart('chart-budget-vs-real');
            this.charts['chart-budget-vs-real'] = new Chart(document.getElementById('chart-budget-vs-real'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Presupuesto', data: monthBudgets.map(b => b.limit), backgroundColor: '#cbd5e1' },
                        { label: 'Real', data: monthBudgets.map(b => expensesByCat[b.category] || 0), backgroundColor: '#f59e0b' }
                    ]
                },
                options: { plugins: { title: { display: true, text: 'Presupuesto vs Realidad' } }, maintainAspectRatio: false }
            });
        }
    }

    // ---NAVEGACION---

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
            'categories': 'Gestion de Categorias',
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