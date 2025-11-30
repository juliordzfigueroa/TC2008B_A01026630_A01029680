from mesa import Model                                                  # Base class for models
from mesa.discrete_space import OrthogonalMooreGrid                     # Grid with Moore neighborhood
from .agent import Car, Traffic_Light, Obstacle, Destination, Road      # Import agents
import json, random                                                     # For map loading and randomness

# Urban traffic model using cars, traffic lights, roads, obstacles, and destinations.
# Cars navigate the map using BFS and avoid collisions and red traffic lights.
class CityModel(Model):
    def __init__(self, N, seed=42):
        super().__init__(seed=seed)

        # Load map dictionary
        dataDictionary = json.load(open("traffic_model/mapDictionary.json"))
        self.map_chars = {}
        self.num_agents = N
        self.traffic_lights = []
        self.cars = []
        self.destinations = []
        self.road_positions = []

        # Load base map
        with open("traffic_model/maps/2023_base.txt") as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0].strip())
            self.height = len(lines)

            self.grid = OrthogonalMooreGrid(
                (self.width, self.height), capacity=100, torus=False
            )

            # Add agents based on signals in the map
            for r, row in enumerate(lines):
                for c, col in enumerate(row.strip()):
                    pos = (c, self.height - r - 1)
                    cell = self.grid[pos]
                    self.map_chars[pos] = col

                    agent = None

                    # Roads
                    if col in ["v", "^", "<", ">"]:
                        direction = dataDictionary[col]
                        agent = Road(self, cell, direction)
                        self.road_positions.append(pos)

                    # Traffic lights
                    elif col in ["s", "S"]:
                        is_green = True if col == "s" else False
                        timeToChange = int(dataDictionary[col])
                        agent = Traffic_Light(self, cell, is_green, timeToChange)
                        self.traffic_lights.append(agent)
                        self.road_positions.append(pos)

                    # Destinations
                    elif col == "D":
                        agent = Destination(self, cell)
                        self.destinations.append(agent)
                        self.road_positions.append(pos)

                    # Obstacles
                    elif col == "#":
                        agent = Obstacle(self, cell)

                    # Spaces or other characters are ignored
                    if agent is not None:
                        pass

        # Spawnpoint for cars (corners of the map)
        self.start_positions = [
            (0, 0),
            (0, self.height - 1),
            (self.width - 1, 0),
            (self.width - 1, self.height - 1),
        ]

        self.steps = 0
        self.running = True

    # Get the map character at a position
    def get_map_sign(self, pos):
        return self.map_chars.get(tuple(pos), None)
    
    # Choose a random destination for a car
    def get_random_destination(self):
        if len(self.destinations) == 0:
            return None
        return random.choice(self.destinations)

    # Spawn cars at the start positions
    def spawn_cars(self):
        for pos in self.start_positions:
            cell = self.grid[pos]

            # Only spawn if there is a road (Road) there
            if not any(isinstance(a, Road) for a in cell.agents):
                continue

            # If there is already a car, do not spawn another
            if any(isinstance(a, Car) for a in cell.agents):
                continue

            # Create the car: assigning cell places it in the cell
            new_car = Car(self, cell)
            self.cars.append(new_car)

    # Step the model
    def step(self):
        # Modify car spawn interval
        if self.steps % 3 == 0:
            self.spawn_cars()

        # Advance all agents
        self.agents.shuffle_do("step")