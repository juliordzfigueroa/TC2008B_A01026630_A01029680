from .agent import *
from .model import CityModel

from mesa.visualization import SolaraViz, make_space_component
from mesa.visualization.components import AgentPortrayalStyle

# Agent portrayal
def agent_portrayal(agent):

    if agent is None:
        return

    portrayal = AgentPortrayalStyle(
        marker="s",     # square
        size=10,        # default size
        alpha=1.0,
    )

    # Cars
    if isinstance(agent, Car):
        portrayal.color = "#1E90FF"
        portrayal.size = 12
        portrayal.layer = 3
    # Roads
    if isinstance(agent, Road):
        portrayal.color = "#CCCCCC"
        portrayal.size = 10
        portrayal.layer = 0
    # Traffic Lights
    if isinstance(agent, Traffic_Light):
        portrayal.color = "green" if agent.state else "red"
        portrayal.size = 12
        portrayal.layer = 2
    # Destinations
    if isinstance(agent, Destination):
        portrayal.color = "lime"
        portrayal.size = 11
        portrayal.layer = 1
    # Obstacles
    if isinstance(agent, Obstacle):
        portrayal.color = "#444444"
        portrayal.size = 10
        portrayal.layer = 1

    return portrayal


# Space configuration
def post_process(ax):
    ax.set_aspect("equal")
    ax.set_facecolor("#F5F5F5")

# Model parameters
model_params = {
    "N": 5,
    "seed": {
        "type": "InputText",
        "value": 42,
        "label": "Random Seed",
    },
}

# Create the model
model = CityModel(model_params["N"])

# Space component
space_component = make_space_component(
    agent_portrayal,
    draw_grid=False,
    post_process=post_process,
)

# Solara page
page = SolaraViz(
    model,
    components=[space_component],
    model_params=model_params,
    name="Traffic Simulation",
)