from traffic_model.agent import *
from traffic_model.model import CityModel

from mesa.visualization import SolaraViz, make_space_component
from mesa.visualization.components import AgentPortrayalStyle
import matplotlib.pyplot as plt
import solara

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

def plot_stats(model):
        # Use datacollector to get data
    df = None
    if hasattr(model, "datacollector"):
        df = model.datacollector.get_model_vars_dataframe()
    if df is None or df.empty:
        return solara.Markdown("**No hay datos aún**")

    fig, ax = plt.subplots(figsize=(6, 4.5))
    if "Total Arrived" in df.columns:
        ax.plot(df.index, df["Total Arrived"], label="Total Arrived", color="#2ca02c")
    if "Current Cars" in df.columns:
        ax.plot(df.index, df["Current Cars"], label="Current Cars", color="#1f77b4")
    if "Total Spawned" in df.columns:
        ax.plot(df.index, df["Total Spawned"], label="Total Spawned", color="#ff7f0e")
    ax.set_xlabel("Step")
    ax.set_ylabel("Count")
    ax.legend(loc="upper left")
    ax.grid(alpha=0.2)
    return solara.FigureMatplotlib(fig)

# Markdown stats
def stats_component(model):
    total_arrived = getattr(model, "total_arrived", None)
    total_spawned = getattr(model, "total_spawned", None)
    current_cars = len(getattr(model, "cars", [])) if hasattr(model, "cars") else None
    steps = getattr(model, "steps", None)
    if steps is None:
        steps = getattr(model, "actual_step", None)
    if steps is None:
        steps = getattr(model, "currentStep", 0)
    running = getattr(model, "running", True)
    if running:
        status = "Running"
    else:
        reason = getattr(model, "stopped_reason", None)
        status = f"Stopped{f' ({reason})' if reason else ''}"

    return solara.Markdown(
        f"""### Simulation metrics:
- **Status:** `{status}`
- **Steps elapsed:** `{steps}`
- **Total arrived:** `{total_arrived}`
- **Current cars:** `{current_cars}`
- **Total spawned:** `{total_spawned}`
"""
    )

# Solara page
page = SolaraViz(
    model,
    components=[space_component, plot_stats, stats_component],
    model_params=model_params,
    name="Traffic Simulation",
)