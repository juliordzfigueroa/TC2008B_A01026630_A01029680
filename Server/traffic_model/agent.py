from mesa.discrete_space import CellAgent, FixedAgent   # Base classes for agents
from collections import deque                           # deque needs to use BFS

# -----
# Car Agent
# -----
class Car(CellAgent):
    # Constructor
    def __init__(self, model, cell):
        super().__init__(model)
        self.cell = cell                # Current cell
        self.target = None              # Assigned destination
        self.route = []                 # Planned route
        self.route_index = 0            # Next step in route
        self.arrived = False            # Arrival status

    # Verify if cell is free of cars or obstacles (apartments)
    # Returns True if free, False otherwise
    # In case of the trafficLights, they do not block the cell, it will be handled in the step()
    def freeCell(self, cell):
        from .agent import Car, Obstacle
        for a in cell.agents:
            if isinstance(a,Car):
                return False
            if isinstance(a,Obstacle):
                return False
        return True
    
    # Breadth-First Search (BFS) pathfinding algorithm considering traffic rules
    def bfs_path(self, start, goal):
        directions = {">" : (1,0), "<" : (-1,0), "^" : (0,1), "v" : (0,-1)}    # Observe the direction signals on the roads
        roads = set(self.model.road_positions)                                 # Set of road positions for quick lookup

        # BFS initialization
        queue = deque([start])      # Positions to explore
        visited = {start: None}     # Track visited positions

        # BFS loop
        while queue:
            # Take the next more nearly position to explore, if goal reached, break
            x, y = queue.popleft()
            if (x, y) == goal:
                break

            sign = self.model.get_map_sign((x, y))
            neighbors = []

            # Check neighbors if they are road that we have not visited yet
            if sign in directions:
                dx, dy = directions[sign]
                p = (x + dx, y + dy)
                if p in roads and p not in visited:
                    if p != goal:
                        cell_agents = self.model.grid[p].agents
                        if any(isinstance(a, Destination) for a in cell_agents):
                            pass
                        else:
                            neighbors.append(p)
                    else:
                        neighbors.append(p)

            # Allowed lateral neighbors only if they do not contradict the neighbor's arrow
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                p = (x + dx, y + dy)
                if p not in roads or p in visited: 
                    continue

                # Prohibit entering against the arrow of the destination
                q = self.model.get_map_sign(p)
                if q in ("s", "S"):
                    continue
                if q in directions:
                    if directions[q] == (-dx, -dy):
                        continue
                
                # Avoid going into destination cells unless it's the goal
                if p != goal:
                    cell_agents = self.model.grid[p].agents
                    if any(isinstance(a, Destination) for a in cell_agents):
                        continue
                neighbors.append(p)

            # Save the neighbors
            for p in neighbors:
                visited[p]=(x, y)
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

        # If no target, assign a random destination
        if self.target is None:
            self.target = self.model.get_random_destination()
            return

        # If route is empty, calculate it using BFS
        if not self.route:
            # tuple helps to use coordinates as dictionary keys
            start = tuple(self.cell.coordinate)
            goal = tuple(self.target.cell.coordinate)
            self.route = self.bfs_path(start, goal)
            self.route_index = 1
            
            if self.route is None:
                return

        # Move along the route
        if self.route_index < len(self.route):
            cx, cy = self.cell.coordinate
            nx, ny = self.route[self.route_index]
            dx, dy = nx - cx, ny - cy

            # Determine facing direction
            if (dx, dy) == (1, 0):
                facing = "Right"
            elif (dx, dy) == (-1, 0):
                facing = "Left"
            elif (dx, dy) == (0, 1):
                facing = "Up"
            elif (dx, dy) == (0, -1):
                facing = "Down"
            else:
                return
            
            # Traffic light check
            from .agent import Car, Traffic_Light
            current_sign = self.model.get_map_sign(self.cell.coordinate)
            front = (cx + dx, cy + dy)
            if front in self.model.road_positions:
                next_cell = self.model.grid[front]
                light = next((a for a in next_cell.agents if isinstance(a, Traffic_Light)), None)
                if light and light.state == False:
                    return

            # Rebase to adjacent lane if front is blocked by another car
            front_blocked = False
            if front in self.model.road_positions:
                front_blocked = any(isinstance(a, Car) for a in self.model.grid[front].agents)

            if front_blocked:
                # If blocked by signal, cannot rebase
                if current_sign in ["s","S"]:
                    return
                
                # Check if front car is going in the same direction
                # To avoid cutting off cars going in different directions
                from .agent import Car
                front_cars = [a for a in self.model.grid[front].agents if isinstance(a, Car)]
                if front_cars:
                    front_car = front_cars[0]
                    
                    # If front car has no route or no next step, do not rebase
                    if not getattr(front_car, "route", None) or front_car.route_index >= len(front_car.route):
                        return
                    
                    # Get front car's movement direction
                    f_cx, f_cy = front_car.cell.coordinate
                    f_nx, f_ny = front_car.route[front_car.route_index]
                    f_dx, f_dy = f_nx - f_cx, f_ny - f_cy

                    # If the front car is not going the same direction as our desired forward (dx, dy), wait
                    if (f_dx, f_dy) != (dx, dy):
                        return

                # Check diagonal cells for rebase
                diagonal = {
                    "Right": [ (cx + 1, cy + 1), (cx + 1, cy - 1) ],
                    "Left": [ (cx - 1, cy + 1), (cx - 1, cy - 1) ],
                    "Up": [ (cx - 1, cy + 1), (cx + 1, cy + 1) ],
                    "Down": [ (cx - 1, cy - 1), (cx + 1, cy - 1) ]
                }

                for lx, ly in diagonal[facing]:
                    sx, sy = (lx - cx, ly - cy)

                    if (lx, ly) not in self.model.road_positions: # Must be a road
                        continue
                    if (sx, sy) == (-dx, -dy): # Prohibit backward rebase
                        continue
                    side_cell = self.model.grid[(lx, ly)]
                    if not self.freeCell(side_cell): # Must be freeCell
                        continue

                    # No traffic light in the side cell
                    from .agent import Traffic_Light
                    if any(isinstance(a, Traffic_Light) for a in side_cell.agents):
                        continue
                    
                    if facing in ("Right", "Left"):
                        adjacent_side_pos = (cx, cy + sy)
                    else:
                        adjacent_side_pos = (cx + sx, cy)

                    ax, ay = adjacent_side_pos
                    if 0 <= ax < self.model.grid.width and 0 <= ay < self.model.grid.height:
                        adj_cell = self.model.grid[adjacent_side_pos]
                        from .agent import Obstacle, Car
                        if any(isinstance(a, (Obstacle, Car)) for a in adj_cell.agents):
                            continue

                    # Must have same direction sign
                    side_sign = self.model.get_map_sign((lx, ly))
                    if side_sign != current_sign:
                        continue

                    # Move to the side cell and recalculate route
                    self.cell = side_cell
                    self.route = []
                    return

            # Move to next cell if free
            next_cell = self.model.grid[(nx, ny)]
            if self.freeCell(next_cell):
                self.cell = next_cell
                self.route_index += 1
            else:
                self.route = []
                return

        # Remove the car if it reached to the destination
        if getattr(self, "arrived", False):
            self.remove()
            return
        if self.cell.coordinate == self.target.cell.coordinate:
            self.arrived = True
            return

# -----
# Other Agents: Traffic Light, Obstacle, Destination, Road
# -----
class Traffic_Light(FixedAgent):
    def __init__(self, model, cell, state = False, timeToChange = 10):
        super().__init__(model)
        self.cell = cell
        self.state = state # True = Green, False = Red
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