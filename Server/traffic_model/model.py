from mesa import Model                                                  # Base class for models
from mesa.discrete_space import OrthogonalMooreGrid                     # Grid with Moore neighborhood
from .agent import Car, Traffic_Light, Obstacle, Destination, Road      # Import agents
import json, random                                                     # For map loading and randomness
from mesa.datacollection import DataCollector                           # For data collection
import requests

# Urban traffic model using cars, traffic lights, roads, obstacles, and destinations.
# Cars navigate the map using BFS and avoid collisions and red traffic lights.
class CityModel(Model):
    def __init__(self, N, seed=42, spawn_interval = 1):
        super().__init__(seed=seed)

        # Load map dictionary
        dataDictionary = json.load(open("traffic_model/mapDictionary.json"))
        self.map_chars = {}
        self.num_agents = N
        self.traffic_lights = []
        self.cars = []
        self.destinations = []
        self.road_positions = []
        self.last_spawn_step = -1

        # Load base map
        with open("traffic_model/maps/2025_base.txt") as baseFile:
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
        self.spawn_interval = int(spawn_interval) if int(spawn_interval) > 0 else 1

        # Statistics counters
        self.total_spawned = 0      # total cars created since simulation start
        self.total_arrived = 0      # total cars that reached a destination

        # DataCollector for visualization/stats (optional)
        self.datacollector = DataCollector(
            model_reporters={
                "Total Arrived": lambda m: m.total_arrived,
                "Current Cars": lambda m: len(m.cars),
                "Total Spawned": lambda m: m.total_spawned,
            }
        )
        # collect initial state
        self.datacollector.collect(self)

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
        # Prevent running spawn multiple times for the same model step
        if getattr(self, "last_spawn_step", None) == self.steps:
            return 0

        spawned_count = 0
        for pos in self.start_positions:
            cell = self.grid[pos]

            # Only spawn if there is a road (Road) there
            if not any(isinstance(a, Road) for a in cell.agents):
                continue

            # If there is already a car, do not spawn another
            if any(isinstance(a, Car) for a in cell.agents):
                continue

            # Create the car and register it
            new_car = Car(self, cell)
            if hasattr(cell, "agents"):
                cell.agents.append(new_car)
            new_car.cell = cell
            self.cars.append(new_car)
            self.total_spawned += 1
            spawned_count += 1

            # After spawning, assign a random destination and compute route
            dest = self.get_random_destination()
            if dest is not None and hasattr(dest, "cell") and hasattr(dest.cell, "coordinate"):
                new_car.target = dest
                if hasattr(new_car.cell, "coordinate"):
                    start_pos = tuple(new_car.cell.coordinate)
                    target_pos = tuple(dest.cell.coordinate)
                    route = new_car.bfs_path(start_pos, target_pos)
                    if route:
                        new_car.route = route
                        if start_pos in route:
                            new_car.route_index = route.index(start_pos) + 1
                        else:
                            new_car.route_index = 1
                    else:
                        new_car.route = []
                        new_car.route_index = 1
                else:
                    new_car.route = []
                    new_car.route_index = 1
            else:
                new_car.route = []
                new_car.route_index = 1

        self.last_spawn_step = self.steps
        return spawned_count
    
    # Remove cars that have arrived at their destination
    def cleanup_arrived(self):
        arrived = [c for c in list(self.cars) if getattr(c, "arrived", False)]
        for c in arrived:
            # Remove from cell agent list if present
            if hasattr(c, "cell") and getattr(c.cell, "agents", None) is not None:
                agents = c.cell.agents
                if c in agents:
                    agents.remove(c)
            
            # Remove from model list
            if c in self.cars:
                self.cars.remove(c)
            
            # Update arrived counter
            self.total_arrived += 1

    # Step the model
    def step(self):
        # Move existing agents
        self.agents.shuffle_do("step")
            
        # Attempt spawn and check result
        if self.steps == 1 or (self.steps - 1) % self.spawn_interval == 0:
            spawned = self.spawn_cars()
            print(f"Spawned {spawned} cars at step {self.steps}")

            # If there are exactly 4 start positions and none spawned, stop simulation
            if len(self.start_positions) == 4 and spawned == 0:
                self.running = False
        
        # Cleanup arrived cars
        self.cleanup_arrived()

        # Collect stats
        if hasattr(self, "datacollector"):
            self.datacollector.collect(self)

        # API connection for validation attempt
        url = "http://10.49.12.39:5000/api/"
        endpoint = "validate_attempt"

        data = {
            "year" : 2025,
            "classroom" : 302,
            "name" : "JJs",
            "current_cars": 50,
            "total_arrived": 10,
            "current_cars": len(self.cars),
            "total_arrived": self.total_arrived,
            "attempt_number": 5
        }

        headers = {
            "Content-Type": "application/json"
        }

        response = requests.post(url+endpoint, data=json.dumps(data), headers=headers)
        print(data)

        print("Request " + "successful" if response.status_code == 200 else "failed", "Status code:", response.status_code)
        print("Response:", response.json())