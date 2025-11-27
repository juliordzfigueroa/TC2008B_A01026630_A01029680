from mesa.discrete_space import CellAgent, FixedAgent   # Base classes for agents
from collections import deque                           # deque needs to use BFS

# -----
# Car Agent
# -----
class Car(CellAgent):
    # Constructor
    def __init__(self, model, cell):
        super().__init__(model)
        self.cell = cell        # Current cell
        self.target = None      # Assigned destination
        self.route = []         # Planned route
        self.route_index = 0    # Next step in route

    # Verify if cell is free of cars or obstacles (apartments)
    # Returns True if free, False otherwise
    # In case of the trafficLights, they do not block the cell, it will be handled in the step()
    def freeCell(self, cell):
        from .agent import Car, Obstacle
        for a in cell.agents:
            if isinstance(a,Car): return False
            if isinstance(a,Obstacle): return False
        return True
    
    # Breadth-First Search (BFS) pathfinding algorithm considering traffic rules
    def bfs_path(self, start, goal):
        DIR = {">":(1,0), "<":(-1,0), "^":(0,1), "v":(0,-1)}    # Observe the direction signals on the roads
        ROADS = set(self.model.road_positions)                  # Set of road positions for quick lookup

        # BFS initialization
        queue = deque([start])
        visited = {start: None}

        # BFS loop
        while queue:
            x, y = queue.popleft()
            if (x, y) == goal: break

            sign = self.model.get_map_sign((x, y)) # Get the map signal at this position

            # 1) Forward neighbor according to the road sign
            neighbors = []

            if sign in DIR:
                dx, dy = DIR[sign]
                p = (x + dx, y + dy)
                if p in ROADS and p not in visited:
                    neighbors.append(p)

            # 2) Allowed lateral neighbors only if they don't contradict the neighbor's arrow
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                p = (x + dx, y + dy)
                if p not in ROADS or p in visited: 
                    continue

                # Prohibit entering against the arrow of the destination
                q = self.model.get_map_sign(p)
                if q in DIR:
                    if DIR[q] == (-dx, -dy):
                        continue

                neighbors.append(p)

            # Save the neighbors
            for p in neighbors:
                visited[p]=(x,y)
                queue.append(p)

        # If goal not reached
        if goal not in visited:
            return None

        # Reconstruction of the path
        path = [goal]
        a = goal
        while visited[a] is not None:
            a = visited[a]
            path.append(a)
        return list(reversed(path))
        # Return the path from start to goal as a list of positions

    # Agent step
    def step(self):

        # If no destination, assign a random destination
        if self.target is None:
            self.target = self.model.get_random_destination()
            return

        # If no route, compute a new route using BFS
        if not self.route:
            start = tuple(self.cell.coordinate)
            goal  = tuple(self.target.cell.coordinate)

            self.route = self.bfs_path(start,goal)
            if self.route is None: return
            self.route_index = 1

        # If there are next steps
        if self.route_index < len(self.route):

            cx, cy = self.cell.coordinate
            nx, ny = self.route[self.route_index]
            dx, dy = nx - cx, ny - cy

            # Verify traffic light control
            if    (dx, dy) == (1, 0):  facing = "Right"
            elif  (dx, dy) == (-1, 0): facing = "Left"
            elif  (dx, dy) == (0, 1):  facing = "Up"
            elif  (dx, dy) == (0, -1): facing = "Down"
            else: facing = "None"
            
            # What cells are visible in front and sides according to facing direction
            dirs={
                "Right":[(1,0),(1,1),(1,-1)],
                "Left":[(-1,0),(-1,-1),(-1,1)],
                "Up":[(0,1),(-1,1),(1,1)],
                "Down":[(0,-1),(1,-1),(-1,-1)]
            }

            # check cells in front and sides
            posibles = [(cx + dx, cy + dy) for dx, dy in dirs[facing]]
            posibles = [p for p in posibles if p in self.model.road_positions]

            # check for red traffic lights
            from .agent import Traffic_Light
            for p in posibles:
                cell = self.model.grid[p]
                lit = next((a for a in cell.agents if isinstance(a, Traffic_Light)), None)

                if lit and lit.state == False:
                    return

            # Move to next cell if free
            cell = self.model.grid[(nx,ny)]
            if self.freeCell(cell):
                self.cell = cell
                self.route_index += 1
            else:
                self.route = [] # Recalculate route next time if blocked or the cell sign is opposite
                return
            
        # If reached destination, remove the car
        if tuple(self.cell.coordinate) == tuple(self.target.cell.coordinate):
            self.remove()

# -----
# Other Agents: Traffic Light, Obstacle, Destination, Road
# -----
class Traffic_Light(FixedAgent):
    def __init__(self, model, cell, state = False, timeToChange = 10):
        super().__init__(model)
        self.cell = cell
        self.state = state
        self.timeToChange = timeToChange
    
    def step(self):
        if self.model.steps % self.timeToChange == 0:
            self.state = not self.state

class Obstacle(FixedAgent):
    def __init__(self, model, cell):
        super().__init__(model)
        self.cell = cell

class Destination(FixedAgent):
    def __init__(self, model, cell):
        super().__init__(model)
        self.cell = cell

class Road(FixedAgent):
    def __init__(self, model, cell, direction = "Left"):
        super().__init__(model)
        self.cell = cell
        self.direction = direction