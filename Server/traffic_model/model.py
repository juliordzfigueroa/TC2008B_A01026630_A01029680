from mesa import Model                                                  # Base class for models
from mesa.discrete_space import OrthogonalMooreGrid                     # Grid with Moore neighborhood
from .agent import Car, Traffic_Light, Obstacle, Destination, Road      # Import agents
import json, random                                                     # For map loading and randomness

class CityModel(Model):
    """
    Simulación de vehículos basada en un mapa de ciudad.
    Adaptado específicamente al mapa proporcionado.
    """

    def __init__(self, N, seed=42):
        super().__init__(seed=seed)

        # Cargar diccionario mapa
        dataDictionary = json.load(open("traffic_model/mapDictionary.json"))

        self.map_chars = {}
        self.num_agents = N
        self.traffic_lights = []
        self.cars = []
        self.destinations = []
        self.road_positions = []

        # Cargamos el mapa base
        with open("traffic_model/maps/2023_base.txt") as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0].strip())
            self.height = len(lines)

            self.grid = OrthogonalMooreGrid(
                (self.width, self.height), capacity=100, torus=False
            )

            # Agregar agentes según caracteres
            for r, row in enumerate(lines):
                for c, col in enumerate(row.strip()):
                    pos = (c, self.height - r - 1)
                    cell = self.grid[pos]
                    self.map_chars[pos] = col

                    agent = None

                    # --- Calles (flechas) ---
                    if col in ["v", "^", "<", ">"]:
                        direction = dataDictionary[col]  # Up/Down/Left/Right
                        agent = Road(self, cell, direction)
                        self.road_positions.append(pos)

                    # --- Semáforos ---
                    elif col in ["s", "S"]:
                        is_green = True if col == "s" else False
                        timeToChange = int(dataDictionary[col])
                        agent = Traffic_Light(self, cell, is_green, timeToChange)
                        self.traffic_lights.append(agent)
                        self.road_positions.append(pos)

                    # --- Destinos ---
                    elif col == "D":
                        agent = Destination(self, cell)
                        self.destinations.append(agent)
                        self.road_positions.append(pos)

                    # --- Obstáculos ---
                    elif col == "#":
                        agent = Obstacle(self, cell)

                    # Espacios u otros caracteres se ignoran
                    if agent is not None:
                        # NO llamar a grid.place_agent: FixedAgent/CellAgent
                        # ya se registran con `self.cell = cell` en __init__
                        pass

        # Spawnpoint de autos (esquinas del mapa)
        self.start_positions = [
            (0, 0),
            (0, self.height - 1),
            (self.width - 1, 0),
            (self.width - 1, self.height - 1),
        ]

        # Construir grafo de calles para A*
        self.known_graph = self.build_graph()

        self.steps = 0
        self.running = True

    # Construir grafo de calles para A*
    def build_graph(self):
        """
        Grafo dirigido de calles:
        - Si hay Road (flecha): solo conecta en la dirección de la flecha.
        - Si hay semáforo (S/s) o destino (D): conecta con todas las calles vecinas (intersección).
        """
        graph = {pos: [] for pos in self.road_positions}

        for (x, y) in self.road_positions:
            agents = self.grid[(x, y)].agents

            road = next((a for a in agents if isinstance(a, Road)), None)
            sem  = next((a for a in agents if isinstance(a, Traffic_Light)), None)
            dest = next((a for a in agents if isinstance(a, Destination)), None)

            # 1) Celda con flecha → solo se puede avanzar en esa dirección
            if road is not None:
                d = road.direction
                if d == "Up":
                    nxt = (x, y + 1)
                elif d == "Down":
                    nxt = (x, y - 1)
                elif d == "Left":
                    nxt = (x - 1, y)
                elif d == "Right":
                    nxt = (x + 1, y)
                else:
                    continue

                if nxt in graph:
                    graph[(x, y)].append(nxt)

            # 2) Semáforos o destinos → intersecciones (conectan a todas las calles vecinas)
            elif sem is not None or dest is not None:
                for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                    nxt = (x + dx, y + dy)
                    if nxt in graph:
                        graph[(x, y)].append(nxt)

            # 3) Obstáculos no aparecen en road_positions, así que no se consideran aquí

        return graph

    # Obtener el caracter del mapa en una posición
    def get_map_sign(self, pos):
        """
        Regresa el caracter original del mapa en la posición dada.
        pos puede ser una tupla (x, y) o algo tipo coordinate.
        """
        return self.map_chars.get(tuple(pos), None)
    
    # Elegir un destino aleatorio para un auto
    def get_random_destination(self):
        if len(self.destinations) == 0:
            return None
        return random.choice(self.destinations)

    # Spawnear autos en los puntos de inicio (cada 10 pasos)
    def spawn_cars(self):
        for pos in self.start_positions:
            cell = self.grid[pos]

            # Solo spawnear si ahí hay una calle (Road)
            if not any(isinstance(a, Road) for a in cell.agents):
                continue

            # Si ya hay un carro, no spawnear otro
            if any(isinstance(a, Car) for a in cell.agents):
                continue

            # Crear el carro: asignar cell lo coloca en la celda
            new_car = Car(self, cell)
            self.cars.append(new_car)

    # Paso del modelo
    def step(self):
        # Llevamos nuestro propio contador
        self.steps += 1

        # Spawnear autos cada 4 ticks
        if self.steps % 20 == 0:
            self.spawn_cars()

        # Avanzar todos los agentes
        self.agents.shuffle_do("step")

        # Limpiar la lista de coches (quitar los que ya se eliminaron)
        self.cars = [c for c in self.cars if c in self.agents]

        # Condición de parada simple
        if len(self.cars) == 0 and self.steps > 50:
            self.running = False