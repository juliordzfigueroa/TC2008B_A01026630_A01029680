from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid

from traffic_model.agent import Road, Traffic_Light, Obstacle, Destination, Car
import json, random, heapq

class CityModel(Model):
    """
    Modelo de ciudad para el reto de movilidad urbana.

    - Carga un mapa ASCII (2022_base, 2023_base, etc.)
    - Crea agentes:
        * Road: calles con dirección
        * TrafficLight: semáforos con tiempo de cambio
        * Obstacle: obstáculos / edificios
        * Destination: nodos especiales (por si luego los quieres usar)
    - Construye un grafo de carreteras
    - Usa Dijkstra para calcular rutas más cortas
    - Crea vehículos (Car) que:
        * eligen destinos aleatorios en cualquier celda de carretera
        * siguen una ruta planeada (lista de celdas)
        * respetan semáforos y obstáculos
    """
    def __init__(self, NAgents, map_name: str = "traffic_model/maps/2022_base.txt"):
        super().__init__()

        # Cargar el diccionario de datos para interpretar el mapa
        dataDictionary = json.load(open("traffic_model/mapDictionary.json", encoding="utf-8"))
        self.dictionary = dataDictionary

        self.traffic_lights = []
        self.destinations = []
        self.next_vehicle_id = 10000
        uid = 0

        # Cargar el archivo del mapa. El archivo del mapa es un archivo de texto donde cada carácter representa un agente.
        with open(map_name, encoding="utf-8") as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0].strip())
            self.height = len(lines)

            self.grid = MultiGrid(self.width, self.height, torus = False) 
            self.schedule = RandomActivation(self)

            # Recorre cada carácter en el archivo del mapa y crea el agente correspondiente.
            for r, row in enumerate(lines):
                row = row.strip()
                for c, col in enumerate(row):
                    x = c
                    y = self.height - r - 1
                    # Crear Road
                    if col in ["v", "^", ">", "<"]:
                        direction = self.dictionary[col]
                        agent = Road(uid, self, direction)
                        self.grid.place_agent(agent, (x, y))
                    # Crear semáforo
                    elif col in ["S", "s"]:
                        timeToChange = int(self.dictionary[col])
                        initial_state = True if col == "s" else False
                        agent = Traffic_Light(uid, self, initial_state, timeToChange)
                        self.grid.place_agent(agent, (x, y))
                        self.schedule.add(agent)
                        self.traffic_lights.append(agent)
                    # Crear obstáculo
                    elif col == "#":
                        agent = Obstacle(uid, self)
                        self.grid.place_agent(agent, (x, y))
                    # Crear destino
                    elif col == "D":
                        agent = Destination(uid, self)
                        self.grid.place_agent(agent, (x, y))
                        self.destinations.append((x, y))
                    uid += 1

        # Construir el grafo de carreteras
        self.road_graph()
        
        # Crear vehículos
        for _ in range(NAgents):
            self.add_vehicle()
        
        self.step_count = 0
        self.running = True

    # Método para construir el grafo de carreteras
    def road_graph(self):
        self.graph = {}

        for contents, (x, y) in self.grid.coord_iter():
            if any(isinstance(a, Road) for a in contents):
                neighbors = []

                for dx, dy in [(1,0), (-1,0), (0,1), (0,-1)]:
                    nx, ny = x + dx, y + dy
                    if self.grid.in_bounds((nx, ny)):
                        neigh = self.grid.get_cell_list_contents((nx, ny))
                        if any(isinstance(a, Road) for a in neigh):
                            neighbors.append((nx, ny))

                self.graph[(x, y)] = neighbors
    
    # Selccionar un destino aleatorio
    def random_destination(self):
        if not self.graph:
            return None
        return random.choice(list(self.graph.keys()))
    
    # Dijkstra para encontrar la ruta más corta
    def dijkstra(self, start, goal):
        if start == goal:
            return [start]

        frontier = [(0, start)]
        came_from = {start: None}
        cost = {start: 0}

        while frontier:
            curr_cost, current = heapq.heappop(frontier)

            if current == goal:
                break

            for after in self.graph.get(current, []):
                new_cost = cost[current] + 1
                if after not in cost or new_cost < cost[after]:
                    cost[after] = new_cost
                    heapq.heappush(frontier, (new_cost, after))
                    came_from[after] = current

        if goal not in came_from:
            return []

        path = []
        node = goal
        # Reconstruir el camino
        while node != start:
            path.append(node)
            node = came_from[node]
        path.append(start)
        path.reverse()
        return path
    
    # Crear un nuevo vehículo

    def new_vehicle_id(self):
        vid = self.next_vehicle_id
        self.next_vehicle_id += 1
        return vid
    
    def add_vehicle(self):
        while True:
            x = random.randrange(self.width)
            y = random.randrange(self.height)
            cell_contents = self.grid.get_cell_list_contents((x, y))
            if any(isinstance(a, Road) for a in cell_contents):
                break

        car = Car(self.new_vehicle_id(), self, (x, y))
        self.schedule.add(car)

    def step(self):
        """
        Avanza el modelo un paso.
        """
        self.schedule.step()
        self.step_count += 1