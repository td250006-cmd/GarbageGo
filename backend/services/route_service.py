import math

from ortools.constraint_solver import pywrapcp, routing_enums_pb2


def _haversine_km(lat1, lon1, lat2, lon2):
    radius = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))


def optimize_route(truck_id, depot, bins):
    if not bins:
        raise ValueError("Empty route. Select an actionable priority bin first.")

    normalized_bins = []
    for bin_row in bins:
        if bin_row.get("latitude") is None or bin_row.get("longitude") is None:
            raise ValueError(f"Invalid coordinates for {bin_row.get('bin_id')}.")

        p_status = (bin_row.get("priority_status") or bin_row.get("status") or "Normal").strip()
        priority_score = float(bin_row.get("priority_score") or 0)
        hotspot = str(bin_row.get("waste_hotspot_level") or "").lower()
        is_actionable = p_status in ("Critical", "High") or priority_score >= 70 or hotspot == "high"
        if not is_actionable:
            continue

        row_copy = dict(bin_row)
        row_copy["priority_status"] = p_status or "High"
        normalized_bins.append(row_copy)

    if not normalized_bins:
        raise ValueError("No actionable bins available for route optimization. Priority targets must be Critical, High, or score >= 70.")

    bins = normalized_bins

    locations = [(depot["latitude"], depot["longitude"])] + [
        (float(bin_row["latitude"]), float(bin_row["longitude"])) for bin_row in bins
    ]

    size = len(locations)
    distance_matrix = [[0] * size for _ in range(size)]
    for i in range(size):
        for j in range(size):
            if i == j:
                continue
            km = _haversine_km(*locations[i], *locations[j])
            traffic = 1.0
            closure_penalty = 0
            if j > 0:
                traffic = 1 + (float(bins[j - 1].get("traffic_density") or 0) / 200)
                if int(bins[j - 1].get("road_closure_flag") or 0) == 1:
                    closure_penalty = 25
            distance_matrix[i][j] = int((km * traffic + closure_penalty) * 1000)

    manager = pywrapcp.RoutingIndexManager(size, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(3)

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        raise RuntimeError("Route optimization failure. OR-Tools could not find a feasible route.")

    index = routing.Start(0)
    order = []
    total_distance_m = 0
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        next_index = solution.Value(routing.NextVar(index))
        next_node = manager.IndexToNode(next_index)
        total_distance_m += distance_matrix[node][next_node]
        if node != 0:
            order.append(node - 1)
        index = next_index

    ordered_bins = []
    estimated_time = 0
    for sequence, bin_index in enumerate(order, start=1):
        bin_row = bins[bin_index]
        estimated_time += float(bin_row.get("travel_time_to_bin") or 8)
        ordered_bins.append(
            {
                "bin_id": bin_row["bin_id"],
                "latitude": bin_row["latitude"],
                "longitude": bin_row["longitude"],
                "priority_score": bin_row.get("priority_score", 0),
                "priority_status": bin_row["priority_status"],
                "sequence": sequence,
                "collected": False,
            }
        )

    total_distance = round(total_distance_m / 1000, 2)
    return {
        "ordered_bins": ordered_bins,
        "total_distance": total_distance,
        "estimated_time": round(estimated_time, 1),
        "truck_id": truck_id,
        "total_bins": len(ordered_bins),
        "collected_count": 0,
        "progress": 0,
    }
