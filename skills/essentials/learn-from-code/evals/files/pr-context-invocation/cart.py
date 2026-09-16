def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
