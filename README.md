# Movilidad Urbana – *Traffic Jam*
### Proyecto de Simulación de Tráfico con Sistema Multi-Agente
**Institución:** Tecnológico de Monterrey
**Curso:** TC2008B – Modelación de sistemas multiagentes con gráficas computacionales (Gpo 302)

### Equipo de Reto

| Integrante | Matrícula |
|-------------|------------|
| **Jin Sik Yoon** | A01026630 |
| **Julio César Rodríguez Figueroa** | A01029680 |

**Profesores:**  
- [@gilecheverria](https://github.com/gilecheverria)  
- [@octavio-navarro](https://github.com/octavio-navarro)

---

## Descripción del Proyecto

El reto **Traffic Jam** busca proponer una solución al problema de movilidad urbana en México, mediante la simulación gráfica del tráfico vehicular.  
El objetivo es representar, a través de un sistema multi-agente, cómo los vehículos se comportan e interactúan dentro de una ciudad, y cómo ciertas estrategias pueden reducir la congestión y mejorar la eficiencia vial.

### Objetivo principal
Desarrollar una simulación 3D que modele el flujo vehicular en entornos urbanos, mostrando cómo diferentes decisiones de los agentes (autos, semáforos, rutas, estacionamientos) influyen en la movilidad general.

---

## Contexto

La movilidad urbana es esencial para la calidad de vida y el desarrollo económico de las ciudades.  
En México, el uso excesivo del automóvil ha provocado efectos negativos: congestión, contaminación, accidentes y pérdida de tiempo.

- En 1990 se recorrían 106 millones de km-auto (VKT); en 2010 esta cifra aumentó a 339 millones, triplicando los impactos negativos.  
- Resolver la movilidad urbana implica repensar el papel del automóvil y diseñar soluciones inteligentes y sostenibles.  

Este proyecto busca contribuir a esta transformación mediante la simulación computacional de tráfico urbano, explorando estrategias de colaboración y optimización en la circulación.

> **Fuentes:**  
> 1. Handy, S. (2002). *Accessibility vs. Mobility-Enhancing Strategies*. ECMT.  
> 2. Medina Ramírez, S. (2012). *Transforming Urban Mobility in Mexico*. ITDP México.

---

## Estrategias de Simulación

El sistema permitirá experimentar con diferentes estrategias para mejorar la movilidad:

1. **Control de estacionamientos:** asignar dinámicamente los espacios disponibles para reducir autos buscando lugar.  
2. **Carpooling (viajes compartidos):** aumentar la ocupación promedio por vehículo.  
3. **Rutas inteligentes:** calcular caminos con menor congestión, no necesariamente los más cortos.  
4. **Coordinación semafórica:** ajustar los tiempos de luz verde según el flujo vehicular en tiempo real.  

Cada una de estas estrategias se podrá simular, visualizar y comparar en términos de eficiencia, consumo y contaminación.

---

## Etapas del Desarrollo

### Etapa 1.1 – Modelación de agentes
- Diseñar un agente automóvil con variables como posición, velocidad, dirección y destino.  
- Implementar reglas de movimiento (acelerar, frenar, cambiar de carril).  
- Modelar grupos de agentes que interactúan bajo diferentes condiciones de tráfico.

### Etapa 1.2 – Modelación gráfica 3D
- Crear una representación visual del entorno urbano (calles, semáforos, intersecciones).  
- Implementar una vista 3D que muestre la simulación en tiempo real.

### Etapa 2.1 – Interacción entre agentes
- Definir comportamientos sociales de los conductores mexicanos (negociación de espacio, cortes, aceleraciones).  
- Implementar reglas de prioridad y detección de colisiones.  

### Etapa 2.2 – Animación gráfica 3D
- Programar la animación continua de los agentes.  
- Agregar visualizaciones dinámicas del tráfico y estadísticas de congestión.

---

## Tecnologías Utilizadas

| Herramienta | Uso principal |
|--------------|----------------|
| **Python 3** | Lógica del sistema multi-agente y simulación de tráfico |
| **Solara** | Creación de dashboards y visualizaciones interactivas en Python |
| **HTML / CSS / JavaScript** | Interfaz visual y animación del entorno 3D |
| **Git / GitHub** | Control de versiones y colaboración |

---

## Ejecución del Programa

Sigue estos pasos para clonar y ejecutar el proyecto correctamente:

### 1. Clonar el repositorio

Abre tu terminal o cualquier pragrama de visualización de código y ejecuta el siguiente comando:

```bash
git clone git@github.com:juliordzfigueroa/TC2008B_A01026630_A01029680.git
```
### 2. Crear el entorno virtual

```bash
python -m venv .agents
```
### 3. Activar el entorno virtual

```bash
source .agents/bin/activate (En Mac o Linux)
./.agents/Scripts/activate (En Windows)
deactivate (Para desactivar)
```
### 4. Instalar dependencias

```bash
pip install -U "mesa[all]"
```
### 5. Ejecutar la simulación de Solara

```bash
solara run server.py
```
