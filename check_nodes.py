import json

with open('routing_graph.json') as f:
    g = json.load(f)

test_nodes = ['1701', '3736', '2109', '1262', '5677', '4257']

print("Checking node connectivity:")
for n in test_nodes:
    has_adj = n in g['adjacency_list']
    status = "CONNECTED" if has_adj else "ISOLATED"
    print(f"  Node {n}: {status}")
    
print(f"\n📊 Summary:")
print(f"  Total nodes: {len(g['nodes'])}")
print(f"  Nodes with neighbors: {len(g['adjacency_list'])}")
print(f"  Isolated nodes: {len(g['nodes']) - len(g['adjacency_list'])}")
