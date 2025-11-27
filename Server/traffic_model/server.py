from traffic_base.agent import *
from traffic_base.model import CityModel

from mesa.visualization import Slider, SolaraViz, make_space_component
from mesa.visualization.components import AgentPortrayalStyle

# Portrayal de agentes
def agent_portrayal(agent):

    if agent is None:
        return

    portrayal = AgentPortrayalStyle(
        marker="s",     # cuadrado
        size=10,        # tamaño default
        alpha=1.0,
    )

    # Carros
    if isinstance(agent, Car):
        portrayal.color = "#1E90FF"     # azul brillante
        portrayal.size = 12             # un poco más grande
        portrayal.layer = 3
    # Calles
    if isinstance(agent, Road):
        portrayal.color = "#CCCCCC"     # gris claro
        portrayal.size = 10
        portrayal.layer = 0
    # Semáforos
    if isinstance(agent, Traffic_Light):
        portrayal.color = "green" if agent.state else "red"
        portrayal.size = 12
        portrayal.layer = 2
    # Destinos
    if isinstance(agent, Destination):
        portrayal.color = "lime"
        portrayal.size = 11
        portrayal.layer = 1
    # Obstáculos
    if isinstance(agent, Obstacle):
        portrayal.color = "#444444"     # gris oscuro
        portrayal.size = 10
        portrayal.layer = 1

    return portrayal


# Configuración del espacio
def post_process(ax):
    ax.set_aspect("equal")
    ax.set_facecolor("#F5F5F5")   # fondo gris claro

# Parámetros del modelo
model_params = {
    "N": 5,
    "seed": {
        "type": "InputText",
        "value": 42,
        "label": "Random Seed",
    },
}

# Crear el modelo
model = CityModel(model_params["N"])

# Componente del espacio
space_component = make_space_component(
    agent_portrayal,
    draw_grid=False,     # sin cuadriculado
    post_process=post_process,
)

# Página de Solara
page = SolaraViz(
    model,
    components=[space_component],
    model_params=model_params,
    name="Traffic Simulation",
)