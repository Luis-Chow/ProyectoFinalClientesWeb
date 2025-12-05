# Gestor de Finanzas Personales

Proyecto de Lenguajes de Clientes Web 2025C para el control de gastos e ingresos personales. Desarrollada con JavaScript, CSS, HTML y IndexedDB.

Hecho por:
Luis Chow 30551013
Jesus Quintero 31775209

# Características Principales

# 1. Dashboard Interactivo

Visualización de KPIs (Ingresos, Gastos, Balance, Ejecución Presupuestal).

Gráficos dinámicos con Chart.js:

Distribución de gastos por categoría.

Evolución del balance mensual.

Comparativa Presupuesto vs Realidad.

Balance Ingresos vs Egresos.

Listado de últimas transacciones.

# 2. Gestión de Transacciones

Registro de Ingresos y Egresos.

Filtros Avanzados: Búsqueda por texto, filtrado por tipo y por categoría simultáneamente.

Edición y eliminación de registros existentes.

# 3. Sistema de Categorías

Creación de categorías personalizadas.

Borrado en Cascada: Al eliminar una categoría, el sistema elimina automáticamente todas las transacciones asociadas para mantener la integridad de los datos.

Categorías predefinidas al iniciar la app (Alimentación, Transporte, etc.).

# 4. Control Presupuestal

Asignación de límites de gasto mensual por categoría.

Cálculo automático de desviaciones y porcentaje de ejecución.

Alertas visuales (colores) según el nivel de gasto.

#Tecnologías Utilizadas

HTML5: Estructura semántica.

CSS3: Variables CSS para temas, diseño responsivo (Mobile-first) y animaciones simples.

JavaScript (ES6+): Lógica orientada a objetos (Clase FinanceApp).

IndexedDB: Base de datos NoSQL integrada en el navegador para persistencia de datos sin backend.

Chart.js: Librería externa para visualización de datos.

# Instalación y Despliegue

Este proyecto no requiere instalación de dependencias de Node.js ni servidores backend.

Ejecución Local

Clona este repositorio.

Abre el archivo index.html directamente en tu navegador web moderno favorito (Chrome, Firefox, Edge).

Nota: Para un funcionamiento óptimo de los módulos ES6 en algunos navegadores, se recomienda usar una extensión como "Live Server" en VS Code.

Despliegue (Vercel/Netlify)

Simplemente sube la carpeta del proyecto a tu proveedor de hosting estático preferido.
