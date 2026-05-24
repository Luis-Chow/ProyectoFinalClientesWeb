# Gestor de Finanzas Personales
> **Demo en vivo:** https://luischow.github.io/gestor-finanzas-personales/

Aplicación web para el control de finanzas personales que permite registrar ingresos y gastos, organizarlos por categorías, definir presupuestos mensuales y visualizar todo en un dashboard interactivo. Funciona completamente en el navegador, sin backend, usando IndexedDB para la persistencia de datos. La interfaz está ambientada con una temática visual inspirada en el videojuego *Hollow Knight*.

## Características

### Dashboard interactivo
- Indicadores clave (KPIs): ingresos, gastos, balance y ejecución presupuestal.
- Cuatro gráficos dinámicos con Chart.js: distribución de gastos por categoría, evolución del balance mensual, comparativa presupuesto vs realidad, e ingresos vs egresos.
- Listado de las últimas transacciones.

### Gestión de transacciones
- Registro de ingresos y egresos.
- Filtros avanzados: búsqueda por texto, por tipo y por categoría de forma simultánea.
- Edición y eliminación de registros existentes.

### Sistema de categorías
- Categorías predefinidas al iniciar la aplicación (Alimentación, Transporte, Ocio, Servicios, Salud, Educación, Otros).
- Creación de categorías personalizadas.
- Borrado en cascada: al eliminar una categoría se eliminan automáticamente sus transacciones asociadas, manteniendo la integridad de los datos.

### Control presupuestal
- Asignación de límites de gasto mensual por categoría.
- Cálculo automático de desviaciones y porcentaje de ejecución.
- Alertas visuales por color según el nivel de gasto alcanzado.

## Stack tecnológico

- **HTML5** — estructura semántica.
- **CSS3** — variables CSS para theming, diseño responsivo *Mobile-first* y animaciones.
- **JavaScript (ES6+)** — lógica orientada a objetos.
- **IndexedDB** — base de datos NoSQL del navegador para persistencia sin backend.
- **Chart.js** — visualización de datos.

## Arquitectura

La aplicación está organizada en dos clases principales:

- **`FinanceDB`** — capa de acceso a datos. Encapsula toda la interacción con IndexedDB (conexión, creación de *object stores*, operaciones de lectura/escritura/borrado) y siembra las categorías iniciales en la primera ejecución.
- **`FinanceApp`** — lógica de la aplicación. Gestiona la navegación entre vistas, el renderizado de la interfaz, el manejo de formularios, los cálculos del dashboard y la generación de gráficos.

Los datos se organizan en tres *object stores*: `categories`, `transactions` (con índices por fecha y por tipo) y `budgets`.

## Uso

El proyecto no requiere instalar dependencias ni levantar un servidor backend.

### Ejecución local

1. Clona este repositorio.
2. Abre `index.html` en un navegador moderno (Chrome, Firefox o Edge).

> Para un funcionamiento óptimo de los módulos ES6 se recomienda usar la extensión *Live Server* de VS Code.

### Despliegue

Al ser un sitio estático, puede desplegarse directamente en cualquier hosting estático como Vercel, Netlify o GitHub Pages.

## Estructura del proyecto

```
.
├── index.html      # Estructura de la aplicación
├── style.css       # Estilos y temática visual
├── script.js       # Lógica (clases FinanceDB y FinanceApp)
└── assets/         # Recursos gráficos
```

## Autores

Proyecto desarrollado para la asignatura *Lenguajes de Clientes Web* (2025C) — Universidad Rafael Urdaneta.

- **Luis Fernando Chunwa Chow Cheung** — [@LuisChow](https://github.com/LuisChow)
- **Jesús Quintero**
