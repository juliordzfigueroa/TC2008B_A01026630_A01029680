from mesa import Model
from mesa.discrete_space import OrthogonalMooreGrid
from .agent import Car, Road, Traffic_Light, Obstacle, Destination

import json, random, heapq

class CityModel(Model):
    def __init__(self, N, map_path="maps/2022_base.txt", seed=42):
        super().__init__(seed=seed)

        # Cargar diccionario
        dataDictionary = json.load(open("mapDictionary.json"))
        self.dictionary = dataDictionary

        self.traffic_lights = []
        self.destinations = []
        self.spawn_points = []
        self.steps = 0

        # Leer mapa
        with open(map_path, encoding="utf-8") as f:
            lines = f.readlines()
            self.width = len(lines[0].strip())
            self.height = len(lines)

            self.grid = OrthogonalMooreGrid(
                [self.width, self.height], capacity=100, torus=False
            )

            # Crear agentes fijos
            for r, row in enumerate(lines):
                row = row.strip()
                for c, col in enumerate(row):

                    cell = self.grid[(c, self.height - r - 1)]

                    # Road
                    if col in ["v", "^", ">", "<"]:
                        road = Road(self, cell, self.dictionary[col])

                    # Traffic Light
                    elif col in ["S", "s"]:
                        tl = Traffic_Light(
                            self, cell,
                            state=True if col == "s" else False,
                            timeToChange=int(self.dictionary[col])
                        )
                        self.traffic_lights.append(tl)

                    # Obstacle
                    elif col == "#":
                        Obstacle(self, cell)

                    # Destination
                    elif col == "D":
                        dest = Destination(self, cell)
                        self.destinations.append((c, self.height - r - 1))

        # Spawn points = roads en los bordes
        for x in range(self.width):
            for y in range(self.height):
                cell = self.grid[(x, y)]
                if any(isinstance(a, Road) for a in cell.agents):
                    if x in [0, self.width-1] or y in [0, self.height-1]:
                        self.spawn_points.append((x, y))

        # Crear grafo de carreteras
        self.build_graph()

        # Crear coches iniciales
        for _ in range(N):
            self.add_car_from_spawn()

        self.running = True

    # Buildear el grafo de carreteras
    def build_graph(self):
        self.graph = {}
        directions = {
            "Up": (0, 1),
            "Down": (0, -1),
            "Right": (1, 0),
            "Left": (-1, 0)
        }

        for x in range(self.width):
            for y in range(self.height):
                cell = self.grid[(x, y)]
                road = None
                for a in cell.agents:
                    if isinstance(a, Road):
                        road = a
                        break

                if road is None:
                    continue

                dx, dy = directions[road.direction]
                nx, ny = x + dx, y + dy

                neighs = []
                if self.grid.in_bounds((nx, ny)):
                    next_cell = self.grid[(nx, ny)]
                    if any(isinstance(a, Road) for a in next_cell.agents):
                        neighs.append((nx, ny))

                self.graph[(x, y)] = neighs

    def random_destination(self):
        return random.choice(list(self.graph.keys()))

    # Función heurística para A*
    def heuristic(self, a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    # Función de A* para encontrar la ruta más corta
    def a_star(self, start, goal):
        if start == goal:
            return [start]

        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {start: None}
        g_cost = {start: 0}

        while frontier:
            f_current, current = heapq.heappop(frontier)

            if current == goal:
                break

            for nxt in self.graph.get(current, []):
                new_g = g_cost[current] + 1
                if nxt not in g_cost or new_g < g_cost[nxt]:
                    g_cost[nxt] = new_g
                    f_cost = new_g + self.heuristic(nxt, goal)
                    heapq.heappush(frontier, (f_cost, nxt))
                    came_from[nxt] = current

        if goal not in came_from:
            return []

        # Reconstruir la ruta
        path = []
        node = goal
        while node != start:
            path.append(node)
            node = came_from[node]
        path.append(start)
        path.reverse()
        return path

    # Agregar un coche desde un punto de spawn
    def add_car_from_spawn(self):
        random.shuffle(self.spawn_points)

        for (x, y) in self.spawn_points:
            cell = self.grid[(x, y)]
            if any(isinstance(a, Car) for a in cell.agents):
                continue

            car = Car(self, cell)
            return True

        return False

    # Remover un coche del modelo
    def remove_car(self, car):
        self.grid.remove_agent(car)

    # Función de paso del modelo
    def step(self):
        self.steps += 1
        self.agents.shuffle_do("step")
        # agregar coches periódicamente
        if self.steps % 10 == 0:
            if not self.add_car_from_spawn():
                self.running = False